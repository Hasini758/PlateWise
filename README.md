# PlateWise 🍽️

**Mark your meal, save the food.** PlateWise is a responsive web app that cuts food wastage in university hostel messes. Students mark whether they'll eat each meal before a cutoff, and mess staff see live head counts so they can cook the right amount.

Built as a UI/UX course project: field research (survey and mess visits) → Figma prototype → working website with a real backend.

## The problem

Hostel messes cook for every enrolled student whether or not they turn up, so a large share of food is thrown away every day. Staff have no reliable way to know how many people will actually eat a given meal.

## What it does

**For students**
- Sign up and log in with a university registration number
- **Plan** the week's meals: tap "I'll eat" or "Skip" for breakfast, lunch, snacks and dinner before each cutoff
- See the day's menu and reminders for upcoming cutoffs
- **Rate** meals and read updates posted by the mess
- **Impact** page showing plates and food saved

**For mess staff**
- **Mess dashboard** with live meal counts that update as students mark meals
- A "cook for about N plates" estimate for each meal
- A 7-day table of counts and a ratings summary
- Post notices to students in their hostel

The layout adapts from phone to laptop (two-column view at 960px and wider).

## Tech stack

- HTML, CSS and vanilla JavaScript, with no frameworks or build tools
- **Firebase Authentication** for accounts (email/password, mapped from registration numbers)
- **Cloud Firestore** for meal plans, ratings, live counts and notices, protected by custom security rules
- Offline demo mode: if no Firebase config is set, the app runs entirely in the browser with sample data

## Project structure

| File | Purpose |
|---|---|
| `index.html` | Page skeleton |
| `style.css` | Design-system colours, phone and laptop layouts |
| `data.js` | Meals, cutoffs, menu, stats and hostel totals |
| `backend.js` | Firebase accounts, saving plans and ratings, live counts |
| `app.js` | All screens: Login/Sign-up, Home, Plan, Rate, Impact, Mess dashboard |
| `firebase-config.js` | Firebase project settings |
| `firestore.rules` | Firestore security rules |

### Firestore data model

```
users/{uid}                  profile and role (student | staff)
users/{uid}/plans/{date}     a student's meal choices for a day
ratings/{uid_date_meal}      meal ratings
counts/{hostel_date}         live meal counts per hostel
notices/{hostel}             updates posted by mess staff
```

## Run it locally

```bash
git clone https://github.com/Hasini758/PlateWise.git
cd PlateWise
python -m http.server 8000
```

Then open http://localhost:8000. To connect your own Firebase project, follow [SETUP.md](SETUP.md).

## Known limitations

- Hostel totals can be changed by any signed-in user. A production version would aggregate them on a server (Cloud Functions).
- No push notifications. Reminders appear inside the app.
- No password-reset email, because accounts use registration numbers rather than real email addresses.
- "University SSO" is a placeholder, not a real integration.

## Author

**Hasini** · [GitHub](https://github.com/Hasini758)
