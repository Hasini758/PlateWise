/* =====================================================================
   data.js — PlateWise's MEMORY and RULES
   ---------------------------------------------------------------------
   This file does not draw anything on screen. It knows:
     1. the meals, their timings and cutoff times
     2. the weekly mess menu
     3. how to save / load data in the browser (localStorage)
     4. how to calculate stats (plates saved, streak, etc.)
   app.js asks this file for information and then draws the screens.
   ===================================================================== */

const STORE_KEY = 'platewise-data-v1';   // name of our "save file" in the browser

/* ---------- 1. Meals and their rules ---------- */
// serveHour: when food is served (24-hour clock, 7.5 = 7:30)
// cutoff:    when marking closes. Breakfast closes 10 PM the night before.
const MEALS = [
  { id: 'b', name: 'Breakfast', short: 'Bfast',  time: '7:30 AM',  serveHour: 7.5,
    cutoffDayOffset: -1, cutoffHour: 22, cutoffText: '7:30 AM · cutoff 10 PM prev day' },
  { id: 'l', name: 'Lunch',     short: 'Lunch',  time: '12:30 PM', serveHour: 12.5,
    cutoffDayOffset: 0,  cutoffHour: 9,  cutoffText: '12:30 PM · cutoff 9 AM' },
  { id: 'd', name: 'Dinner',    short: 'Dinner', time: '8:00 PM',  serveHour: 20,
    cutoffDayOffset: 0,  cutoffHour: 18, cutoffText: '8:00 PM · cutoff 6 PM' },
];

/* ---------- 2. Weekly menu (0 = Sunday ... 6 = Saturday) ---------- */
const MENU = [
  { b: 'Puri, aloo sabzi, tea',   l: 'Veg pulao, raita, papad',        d: 'Egg curry, rice, roti' },             // Sun
  { b: 'Idli, sambar, chutney',   l: 'Dal makhani, rice, roti',        d: 'Chole, bhature, salad' },             // Mon
  { b: 'Upma, banana, tea',       l: 'Sambar rice, cabbage poriyal',   d: 'Egg curry, rice' },                   // Tue
  { b: 'Bread omelette, tea',     l: 'Kadhi chawal',                   d: 'Mix veg, chapati, dal' },             // Wed
  { b: 'Poha, boiled egg, tea',   l: 'Rajma chawal, aloo gobi, curd',  d: 'Paneer butter masala, jeera rice, dal, roti' }, // Thu
  { b: 'Aloo paratha, curd, tea', l: 'Chole, rice, salad',             d: 'Veg biryani, raita, gulab jamun' },   // Fri
  { b: 'Dosa, sambar, coffee',    l: 'Lemon rice, curd, pickle',       d: 'Chapati, dal tadka, kheer' },         // Sat
];

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_LONG  = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS    = ['January','February','March','April','May','June','July','August','September','October','November','December'];

/* ---------- 3. Time helpers ---------- */
// "Demo clock": lets you present the app exactly like the prototype
// (Thursday 12 Nov 2026, 4:40 PM) no matter what today's date is.
const DEMO_TIME = new Date(2026, 10, 12, 16, 40);   // months start at 0, so 10 = November
const PAGE_LOADED = Date.now();

function now() {
  const p = me();
  if (p && p.settings.demo) return new Date(DEMO_TIME.getTime() + (Date.now() - PAGE_LOADED));
  return new Date();
}

function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function dateKey(d)    { // turns a date into text like "2026-11-12" (used as a label for saving)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function fromKey(key)  { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d); }
function mondayOf(d)   { const s = startOfDay(d); const shift = (s.getDay() + 6) % 7; return addDays(s, -shift); }
function weekDays(monday) { return [0, 1, 2, 3, 4, 5, 6].map(i => addDays(monday, i)); }

function mealServeTime(key, mealId) {
  const m = MEALS.find(x => x.id === mealId);
  const d = fromKey(key);
  d.setHours(Math.floor(m.serveHour), (m.serveHour % 1) * 60);
  return d;
}
function mealCutoff(key, mealId) {
  const m = MEALS.find(x => x.id === mealId);
  const d = addDays(fromKey(key), m.cutoffDayOffset);
  d.setHours(m.cutoffHour, 0);
  return d;
}
function isOpen(key, mealId) { return now() < mealCutoff(key, mealId); }
function menuFor(key, mealId) { return MENU[fromKey(key).getDay()][mealId]; }

function formatTime(d) {
  let h = d.getHours(); const m = d.getMinutes();
  const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, '0')} ${ap}`;
}
function timeLeft(until) {   // e.g. "1h 20m"
  const mins = Math.max(0, Math.round((until - now()) / 60000));
  const h = Math.floor(mins / 60), m = mins % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}
function shortDate(d) { return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`; }

/* ---------- 4. Saving & loading (localStorage) ---------- */
// localStorage is a small notebook inside the browser. Whatever we write there
// stays even after closing the tab — but only on THIS phone/laptop.
function loadStore() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY)) || { profiles: {}, currentReg: null };
  } catch (e) {
    return { profiles: {}, currentReg: null };
  }
}
let store = loadStore();

// Small safe helpers: some browsers block storage, so we never let that crash the app
function memGet(type, key)      { try { return window[type].getItem(key); } catch (e) { return null; } }
function memSet(type, key, val) { try { window[type].setItem(key, val); } catch (e) { /* ignore */ } }

function save() {
  if (typeof Cloud !== 'undefined' && Cloud.on) return;   // online mode: the database is the save file
  try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); }
  catch (e) { /* storage blocked (e.g. private mode): app still works until you close the tab */ }
}
function me()   { return store.currentReg ? store.profiles[store.currentReg] : null; }

function getMark(key, mealId)        { const p = me(); return (p.plans[key] || {})[mealId] || null; }
function setMark(key, mealId, value) { return setMarks([{ key, meal: mealId, value }]); }

// Change several meals at once (the Plan screen saves a whole week together)
function setMarks(list) {
  const p = me();
  const changes = [];
  list.forEach(({ key, meal, value }) => {
    const old = getMark(key, meal);
    if (old === (value || null)) return;               // nothing changed
    p.plans[key] = p.plans[key] || {};
    if (value) p.plans[key][meal] = value; else delete p.plans[key][meal];
    bumpCount(p.hostel, key, meal, old, value || null); // update hostel totals on screen right away
    changes.push({ key, meal, old, value: value || null });
  });
  save();
  if (changes.length && typeof Cloud !== 'undefined' && Cloud.on) return Cloud.saveMarks(changes);  // send to the database
  return Promise.resolve();
}

/* Create a new student on this device and give them some past history,
   so the Impact and Rate screens are not empty on day one. */
function createProfile(reg, name, hostel = 'BH-2') {
  const p = {
    reg, name, hostel, role: 'student',
    plans: {}, ratings: [],
    settings: { demo: true, repeat: true, remindCutoff: true, weeklyNudge: true, email: false },
  };
  // Past meals (before 12 Nov 4:40 PM) get a realistic pattern of eating/skipping
  const pattern = ['eat', 'eat', 'eat', 'eat', 'skip', 'eat', 'eat', 'eat', 'eat', 'eat', 'skip', 'eat'];
  let i = 0;
  for (let d = addDays(DEMO_TIME, -14); d <= DEMO_TIME; d = addDays(d, 1)) {
    const key = dateKey(d);
    MEALS.forEach(m => {
      if (mealCutoff(key, m.id) < DEMO_TIME) {
        p.plans[key] = p.plans[key] || {};
        p.plans[key][m.id] = pattern[i++ % pattern.length];
      }
    });
  }
  p.plans['2026-11-12'] = { b: 'eat', l: 'skip' };   // matches the prototype's Thursday
  p.ratings = [
    { key: '2026-11-10', meal: 'd', stars: 2, left: 'Half',     issues: ['Too oily'], note: '', at: Date.now() },
    { key: '2026-11-11', meal: 'l', stars: 5, left: 'None',     issues: [],           note: '', at: Date.now() },
    { key: '2026-11-11', meal: 'd', stars: 3, left: 'A little', issues: ['Taste'],    note: '', at: Date.now() },
    { key: '2026-11-12', meal: 'b', stars: 4, left: 'None',     issues: [],           note: '', at: Date.now() },
  ];
  store.profiles[reg] = p;
  save();
  return p;
}

/* ---------- 5. Stats for the Home and Impact screens ---------- */
function weekStats(monday = mondayOf(now())) {
  let eat = 0, skip = 0, open = 0, closedTotal = 0, closedMarked = 0;
  weekDays(monday).forEach(d => {
    const key = dateKey(d);
    MEALS.forEach(m => {
      const mark = getMark(key, m.id);
      if (mark === 'eat') eat++;
      else if (mark === 'skip') skip++;
      else open++;
      const p = me();
      const afterJoining = !p.since || key >= p.since;   // don't count meals from before you signed up
      if (!isOpen(key, m.id) && afterJoining) { closedTotal++; if (mark) closedMarked++; }
    });
  });
  return {
    eat, skip, open, marked: eat + skip,
    platesSaved: skip,   // every skip told in advance = one plate the mess didn't cook
    onTime: closedTotal ? Math.round((closedMarked / closedTotal) * 100) : 100,
  };
}

// Planning streak = how many days in a row (going backwards) every meal was marked
function streak() {
  let count = 0;
  let d = startOfDay(now());
  const allMarked = k => MEALS.every(m => getMark(k, m.id));
  if (!allMarked(dateKey(d))) d = addDays(d, -1);   // today can still be in progress
  while (allMarked(dateKey(d)) && count < 365) { count++; d = addDays(d, -1); }
  return count;
}

// The next meal that is still open but not marked (used for reminders)
function nextPendingMeal() {
  const today = startOfDay(now());
  for (let i = 0; i < 2; i++) {
    const key = dateKey(addDays(today, i));
    for (const m of MEALS) {
      if (isOpen(key, m.id) && !getMark(key, m.id)) return { key, meal: m, dayOffset: i };
    }
  }
  return null;
}

// The very next cutoff (shown in the sidebar)
function nextCutoff() {
  const today = startOfDay(now());
  for (let i = 0; i < 3; i++) {
    const key = dateKey(addDays(today, i));
    for (const m of MEALS) if (isOpen(key, m.id)) return { key, meal: m, at: mealCutoff(key, m.id) };
  }
  return null;
}

/* ---------- 6. Hostel-wide numbers ---------- */
const HOSTELS = ['BH-1', 'BH-2', 'BH-3', 'BH-4', 'GH-1', 'GH-2', 'GH-3'];
const KG_PER_PLATE = 0.4;   // rough weight of one plate of mess food

// MESS holds totals for every hostel and day, e.g. MESS.counts['BH-2_2026-11-12'] = { d_eat: 180, d_skip: 40, ... }
// Online mode fills it from the database. Offline mode uses the sample numbers below.
const MESS = { counts: {}, notice: null, students: 0, loaded: false };

function bumpCount(hostel, key, meal, oldVal, newVal) {
  const id = `${hostel}_${key}`;
  const c = MESS.counts[id] = MESS.counts[id] || { hostel, date: key };
  if (oldVal) c[`${meal}_${oldVal}`] = (c[`${meal}_${oldVal}`] || 0) - 1;
  if (newVal) c[`${meal}_${newVal}`] = (c[`${meal}_${newVal}`] || 0) + 1;
}
function countFor(hostel, key, meal, kind) { const c = MESS.counts[`${hostel}_${key}`]; return c ? Math.max(0, c[`${meal}_${kind}`] || 0) : 0; }
function dayTotals(hostel, key) {
  let eat = 0, skip = 0;
  MEALS.forEach(m => { eat += countFor(hostel, key, m.id, 'eat'); skip += countFor(hostel, key, m.id, 'skip'); });
  return { eat, skip };
}
const live = () => typeof Cloud !== 'undefined' && Cloud.on && MESS.loaded;

// Chart data: light bar = meals marked, dark bar = meals eaten. The gap = plates not cooked.
function hostelDaily(hostel) {
  if (!live()) return MESS_DAILY;
  const mon = mondayOf(now()); const out = { labels: [], prepared: [], eaten: [] };
  weekDays(mon).forEach(d => { const t = dayTotals(hostel, dateKey(d)); out.labels.push(DAY_SHORT[d.getDay()][0]); out.prepared.push(t.eat + t.skip); out.eaten.push(t.eat); });
  return out;
}
function hostelWeekly(hostel) {
  if (!live()) return MESS_WEEKLY;
  const out = { labels: [], prepared: [], eaten: [] };
  const mon = mondayOf(now());
  for (let w = 7; w >= 0; w--) {
    let eat = 0, skip = 0;
    weekDays(addDays(mon, -7 * w)).forEach(d => { const t = dayTotals(hostel, dateKey(d)); eat += t.eat; skip += t.skip; });
    out.labels.push(w === 0 ? 'This wk' : `W-${w}`); out.prepared.push(eat + skip); out.eaten.push(eat);
  }
  return out;
}
// kg of food saved this month = plates skipped in advance × 0.4 kg
function kgSavedThisMonth(hostel) {
  if (!live()) return hostel === 'BH-2' ? 128 : (LEADERBOARD.find(l => l[0] === hostel) || [0, 0])[1];
  const t = now(); let skips = 0;
  for (let d = new Date(t.getFullYear(), t.getMonth(), 1); d <= t; d = addDays(d, 1)) skips += dayTotals(hostel, dateKey(d)).skip;
  return Math.round(skips * KG_PER_PLATE);
}
function leaderboard() {
  if (!live()) return LEADERBOARD;
  const seen = new Set(Object.values(MESS.counts).map(c => c.hostel));
  seen.add(me().hostel);
  return [...seen].map(h => [h, kgSavedThisMonth(h)]).sort((a, b) => b[1] - a[1]).slice(0, 5);
}

/* Sample numbers, used only in offline mode (no database connected) */
const MESS_DAILY  = { labels: ['M', 'T', 'W', 'T', 'F', 'S', 'S'], prepared: [96, 90, 94, 86, 90, 74, 70], eaten: [76, 78, 77, 72, 79, 51, 49] };
const MESS_WEEKLY = { labels: ['W1','W2','W3','W4','W5','W6','W7','W8'], prepared: [100, 96, 92, 87, 82, 79, 76, 72], eaten: [55, 58, 59, 60, 61, 62, 63, 63] };
const LEADERBOARD = [ ['BH-2', 128], ['GH-1', 112], ['BH-4', 96], ['GH-3', 71] ];
