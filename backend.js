/* =====================================================================
   backend.js — PlateWise talking to its DATABASE (Firebase)
   ---------------------------------------------------------------------
   Firebase is a free online service by Google that gives us:
     • Authentication: real accounts with passwords
     • Firestore: an online database every phone and laptop shares

   How the database is organised (like folders and files):
     users/{id}                 → name, reg no, hostel, role (student/staff), settings
     users/{id}/plans/{date}    → that student's marks for a day, e.g. { b:'eat', l:'skip' }
     ratings/{id}               → each meal rating (stars, leftovers, issues, note)
     counts/{hostel_date}       → hostel totals, e.g. { d_eat: 180, d_skip: 40 }
     notices/{hostel}           → the latest message from the mess committee

   If firebase-config.js isn't filled in, Cloud.on stays false and the
   app keeps working in offline mode (data saved on the device).
   ===================================================================== */

// Firebase logins need an email, so we quietly turn the registration
// number into one: 12401343 → 12401343@students.platewise.app
const regToEmail = reg => `${reg}@students.platewise.app`;

const DEFAULT_SETTINGS = { demo: false, repeat: true, remindCutoff: true, weeklyNudge: true, email: false };

const Cloud = {
  on: false,        // true when connected to Firebase
  ready: false,     // true once we know whether someone is signed in
  signingUp: false,
  db: null, auth: null, uid: null, unsub: null,
  onChange: null,   // app.js sets this to redraw when live data arrives

  /* Connect to Firebase (only if the config has been pasted in) */
  init() {
    const configured = typeof FIREBASE_CONFIG !== 'undefined' && !String(FIREBASE_CONFIG.apiKey).startsWith('PASTE');
    if (!configured || typeof firebase === 'undefined') return false;
    firebase.initializeApp(FIREBASE_CONFIG);
    this.auth = firebase.auth();
    this.db = firebase.firestore();
    this.on = true;
    return true;
  },

  /* ---------- Accounts ---------- */
  async signIn(reg, password, remember) {
    await this.auth.setPersistence(remember ? firebase.auth.Auth.Persistence.LOCAL : firebase.auth.Auth.Persistence.SESSION);
    await this.auth.signInWithEmailAndPassword(regToEmail(reg), password);
  },

  async signUp({ reg, password, name, hostel, remember }) {
    this.signingUp = true;   // stops the app loading a profile that isn't written yet
    try {
      await this.auth.setPersistence(remember ? firebase.auth.Auth.Persistence.LOCAL : firebase.auth.Auth.Persistence.SESSION);
      const cred = await this.auth.createUserWithEmailAndPassword(regToEmail(reg), password);
      await this.db.doc(`users/${cred.user.uid}`).set({
        reg, name, hostel, role: 'student', settings: DEFAULT_SETTINGS,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      return cred.user;
    } finally {
      this.signingUp = false;
    }
  },

  async signOut() {
    if (this.unsub) { this.unsub(); this.unsub = null; }
    await this.auth.signOut();
  },

  /* ---------- Load everything for the signed-in person ---------- */
  async loadMe(user) {
    this.uid = user.uid;
    const snap = await this.db.doc(`users/${user.uid}`).get();
    if (!snap.exists) return null;
    const u = snap.data();
    const p = {
      reg: u.reg, name: u.name, hostel: u.hostel, role: u.role || 'student',
      plans: {}, ratings: [],
      settings: Object.assign({}, DEFAULT_SETTINGS, u.settings || {}),
      since: u.createdAt ? dateKey(u.createdAt.toDate ? u.createdAt.toDate() : new Date(u.createdAt)) : null,
    };
    // Load the last ~10 weeks (counted from the earlier of today and the demo date)
    const from = dateKey(addDays(new Date(Math.min(Date.now(), DEMO_TIME.getTime())), -70));

    const [plans, ratings, counts, notice] = await Promise.all([
      this.db.collection(`users/${user.uid}/plans`).where('date', '>=', from).get(),
      this.db.collection('ratings').where('uid', '==', user.uid).get(),
      this.db.collection('counts').where('date', '>=', from).get(),
      this.db.doc(`notices/${u.hostel}`).get(),
    ]);
    plans.forEach(doc => {
      const x = doc.data();
      p.plans[x.date] = {};
      MEALS.forEach(m => { if (x[m.id]) p.plans[x.date][m.id] = x[m.id]; });
    });
    ratings.forEach(doc => p.ratings.push(doc.data()));
    MESS.counts = {};
    counts.forEach(doc => { MESS.counts[doc.id] = doc.data(); });
    MESS.notice = notice.exists ? notice.data() : null;
    MESS.loaded = true;

    if (p.role === 'staff') await this.loadStaff(p);
    return p;
  },

  /* Extra data only mess staff can see (the database rules enforce this) */
  async loadStaff(p) {
    const [students, ratings] = await Promise.all([
      this.db.collection('users').where('hostel', '==', p.hostel).where('role', '==', 'student').get(),
      this.db.collection('ratings').where('hostel', '==', p.hostel).get(),
    ]);
    MESS.students = students.size;
    MESS.ratings = [];
    ratings.forEach(doc => MESS.ratings.push(doc.data()));

    // LIVE updates: whenever any student marks a meal, the dashboard updates by itself
    if (this.unsub) this.unsub();
    const from = dateKey(addDays(new Date(Math.min(Date.now(), DEMO_TIME.getTime())), -1));
    this.unsub = this.db.collection('counts').where('date', '>=', from).onSnapshot(snap => {
      snap.forEach(doc => { MESS.counts[doc.id] = doc.data(); });
      if (this.onChange) this.onChange();
    });
  },

  /* ---------- Saving ---------- */
  // Saves meal marks AND updates the hostel totals, all in one go (a "batch")
  saveMarks(changes) {
    const p = me();
    const FV = firebase.firestore.FieldValue;
    const batch = this.db.batch();
    changes.forEach(({ key, meal, old, value }) => {
      batch.set(this.db.doc(`users/${this.uid}/plans/${key}`), { date: key, [meal]: value || FV.delete() }, { merge: true });
      const c = { hostel: p.hostel, date: key };
      if (old) c[`${meal}_${old}`] = FV.increment(-1);
      if (value) c[`${meal}_${value}`] = FV.increment(1);
      batch.set(this.db.doc(`counts/${p.hostel}_${key}`), c, { merge: true });
    });
    return batch.commit().catch(err => {
      console.error(err);
      toast('Could not save to the database. Check your internet and try again.');
    });
  },

  saveRating(r) {
    const p = me();
    const doc = { ...r, uid: this.uid, hostel: p.hostel, at: Date.now() };
    return this.db.doc(`ratings/${this.uid}_${r.key}_${r.meal}`).set(doc)
      .catch(err => { console.error(err); toast('Could not send your rating. Try again.'); });
  },

  saveSettings(settings) {
    return this.db.doc(`users/${this.uid}`).update({ settings })
      .catch(err => console.error(err));
  },

  // Mess staff only: post a message that every student in the hostel sees
  postNotice(text) {
    const p = me();
    const doc = { text, by: p.name, at: Date.now() };
    MESS.notice = doc;
    return this.db.doc(`notices/${p.hostel}`).set(doc)
      .catch(err => { console.error(err); toast('Could not post the update.'); });
  },

  async refreshStaff() { await this.loadStaff(me()); },
};

/* Turns Firebase's error codes into friendly sentences */
function authMessage(err) {
  const code = (err && err.code) || '';
  const map = {
    'auth/invalid-credential': 'Wrong registration number or password.',
    'auth/invalid-login-credentials': 'Wrong registration number or password.',
    'auth/wrong-password': 'Wrong registration number or password.',
    'auth/user-not-found': 'No account with this registration number. Tap "Create an account".',
    'auth/email-already-in-use': 'An account with this registration number already exists. Try signing in.',
    'auth/weak-password': 'Password should be at least 6 characters.',
    'auth/network-request-failed': 'No internet connection. Please try again.',
    'auth/too-many-requests': 'Too many tries. Please wait a minute and try again.',
    'auth/operation-not-allowed': 'Email/Password sign-in is not switched on in Firebase (setup step 3).',
    'local/no-account': 'No account on this device yet. Tap "Create an account".',
    'local/exists': 'This registration number already has an account here. Try signing in.',
  };
  return map[code] || 'Something went wrong. Please try again.';
}
