# PlateWise setup guide

A responsive website (phone and laptop) built from the PlateWise Figma prototype, with a real online backend (Firebase).

## The files

| File | What it does |
|---|---|
| `index.html` | Skeleton: an empty box the screens are drawn into, plus links to the other files |
| `style.css` | Looks: Design System colours, phone layout, and laptop layout (960px and wider) |
| `data.js` | Rules and memory: meals, cutoffs, menu, stats, hostel totals |
| `backend.js` | Talks to the database: accounts, saving marks and ratings, live counts |
| `app.js` | Screens and buttons: Login/Sign-up, Home, Plan, Rate, Impact, Mess dashboard |
| `firebase-config.js` | The only file you edit: your Firebase keys go here |
| `firestore.rules` | Security: who can read or change what (you paste this into Firebase) |

While `firebase-config.js` still says `PASTE_...`, the site runs in **offline demo mode**: it works, but data stays on one device. The login screen tells you which mode you're in.

---

## Set up the backend (about 15 minutes, free, no coding)

### 1. Create a Firebase project

1. Go to **https://console.firebase.google.com** and sign in with your Google account.
2. Click **Create a project** (or "Add project") and name it `platewise`.
3. Turn **Google Analytics off** when asked, then click **Create project**.

### 2. Register the website and copy your keys

1. On the project home page, click the **web icon `</>`** (it's under "Get started by adding Firebase to your app").
2. Type the nickname `PlateWise`. Leave "Firebase Hosting" unticked, then click **Register app**.
3. You'll see code containing `const firebaseConfig = { apiKey: "...", ... }`.
4. Open `firebase-config.js` in Notepad (Windows) or TextEdit (Mac).
5. Replace each `PASTE_...` value with the matching value from Firebase. Keep the quote marks, then save.

### 3. Turn on logins

Go to **Build → Authentication → Get started → Sign-in method → Email/Password**. Switch on the first toggle, then click **Save**.

(Students never type an email. The site quietly turns `12401343` into `12401343@students.platewise.app`.)

### 4. Create the database

1. Go to **Build → Firestore Database → Create database**.
2. For location, choose **asia-south1 (Mumbai)**, which is closest to you.
3. Choose **Start in production mode**, then click **Create**.

### 5. Add the security rules

1. In Firestore Database, open the **Rules** tab.
2. Delete everything in the box.
3. Open `firestore.rules`, copy all of it, paste it into the box, then click **Publish**.

### 6. Put the website online

1. Go to **https://app.netlify.com/drop** and sign up for free.
2. Drag the whole `platewise` folder onto the page. You'll get a link like `https://something.netlify.app`.
3. Open the link on your phone and laptop. The login screen should say **"Connected to the PlateWise database"**.
4. To update the site later: Netlify → your site → **Deploys** → drag the folder again.

### 7. Make a mess-staff account

1. On the website, create a normal account, for example: name `BH-2 Mess`, reg no. `90000002`, hostel `BH-2`.
2. In Firebase, go to **Firestore Database → Data → users**. Click the document whose `reg` is `90000002`.
3. Click the `role` field, change `student` to `staff`, then click **Update**.
4. Sign out and sign in again with that account. You'll now see the **Mess dashboard**.

---

## How to demo it

1. Sign up two or three students on different phones and mark some meals.
2. Open the mess-staff account on the laptop. The counts change **live** when a student taps "I'll eat" or "Skip".
3. As staff, post an update ("Less oil from Monday"). Students see it on their Rate screen.
4. The **Demo clock** (avatar menu on Home) pretends it's Thu 12 Nov, 4:40 PM, like the prototype.

## Honest limits (good to mention in a viva)

- **Hostel totals can be edited by any signed-in student.** They're kept simple so any student can add their own +1 or −1. A production version would add these up on a server (Cloud Functions).
- **Phone push notifications** need Firebase Cloud Messaging and are not included. Reminders show inside the site.
- **"Forgot password"** can't email a reset link, because accounts use registration numbers rather than real emails.
- **"University SSO"** isn't connected to a real university system.
