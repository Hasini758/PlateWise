/* =====================================================================
   app.js — PlateWise's SCREENS and BUTTONS
   ---------------------------------------------------------------------
   How it works, in one paragraph:
   The address bar ends with #home, #plan, #rate or #impact.
   render() looks at that word, builds the matching screen as HTML text
   and puts it inside <div id="app">. When you click something that has
   a data-action="..." label, the click handler at the bottom of this
   file decides what to do, saves the change (data.js) and redraws.
   ===================================================================== */

const app = document.getElementById('app');

/* ---------- Things the screens remember while you use them ---------- */
let planDraft = null;          // the week plan you are editing (before "Save plan")
let rateForm = null;           // what you've filled in on the Rate screen
let reminderOpen = false;      // is the reminder pop-up showing?
let menuOpen = false;          // is the profile menu showing?
let loginStep = 'signin';      // 'signin' or 'signup'
let resetArmed = false;
let autoReminderShown = memGet('sessionStorage', 'pw-reminded') === '1';

/* ---------- Icons (simple line drawings, like in Figma) ---------- */
const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  star: '<path d="m12 2.5 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5-4.8-4.6 6.6-.9z"/>',
  chart: '<path d="M6 20v-6M12 20V8M18 20V4"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  leaf: '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10Z"/><path d="M2 21c0-3 1.9-5.4 5.1-6C9.5 14.5 12 13 13 12"/>',
  utensils: '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2M7 2v20M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>',
  clock: '<circle cx="12" cy="12" r="9.5"/><path d="M12 7v5l3 2"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  left: '<path d="m15 18-6-6 6-6"/>',
  right: '<path d="m9 18 6-6-6-6"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/>',
  id: '<rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="8" cy="12" r="2"/><path d="M13 10h5M13 14h3"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  megaphone: '<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
  flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1.1-2.1-.2-4 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.2.4-2.3 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
  trend: '<path d="m22 17-8.5-8.5-5 5L2 7"/><path d="M16 17h6v-6"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  refresh: '<path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5"/>',
};
function icon(name, size = 20, extraClass = '') {
  return `<svg class="ic ${extraClass}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
}

// Stops names typed by users from breaking the page
function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove('show'), 2600);
}

const logo = (light = false) => `
  <div class="logo ${light ? 'logo-light' : ''}">
    <span class="logo-mark">${icon('leaf', 18)}</span><span>PlateWise</span>
  </div>`;

/* =====================================================================
   SCREEN 1 — LOGIN  (M1 / D1)
   ===================================================================== */
function renderLogin() {
  const hostelOptions = HOSTELS.map(h => `<option ${h === 'BH-2' ? 'selected' : ''}>${h}</option>`).join('');
  const modeNote = Cloud.on
    ? `<p class="mode-note on"><i></i>Connected to the PlateWise database</p>`
    : `<p class="mode-note"><i></i>Offline demo mode · data stays on this device</p>`;

  const form = loginStep === 'signup' ? `
      <h2 class="login-title">Create your account</h2>
      <p class="muted small">Use your university registration number.</p>
      <label class="label" for="su-name">Full name</label>
      <div class="input">${icon('user', 18)}<input id="su-name" placeholder="e.g. Hasini" autocomplete="name" maxlength="30"></div>
      <label class="label" for="reg">Registration no.</label>
      <div class="input">${icon('id', 18)}<input id="reg" inputmode="numeric" maxlength="8" placeholder="8-digit number"></div>
      <label class="label" for="hostel">Hostel</label>
      <div class="input">${icon('home', 18)}<select id="hostel">${hostelOptions}</select></div>
      <label class="label" for="pw">Password</label>
      <div class="input">${icon('lock', 18)}<input id="pw" type="password" placeholder="At least 6 characters" autocomplete="new-password"></div>
      <p class="error" id="login-error"></p>
      <button class="btn btn-primary btn-block" data-action="signup">Create account</button>
      <p class="switch small">Already have an account? <button class="link" data-action="to-signin">Sign in</button></p>
      ${modeNote}
    ` : `
      <h2 class="login-title desk-only">Welcome back</h2>
      <p class="muted small desk-only">Sign in with your university registration number.</p>
      <label class="label" for="reg">Registration no.</label>
      <div class="input">${icon('id', 18)}<input id="reg" inputmode="numeric" maxlength="8" placeholder="8-digit number" value="${esc(memGet('localStorage', 'pw-last-reg') || '')}"></div>
      <label class="label" for="pw">Password</label>
      <div class="input">${icon('lock', 18)}<input id="pw" type="password" placeholder="Password" autocomplete="current-password"></div>
      <div class="row-between small">
        <label class="check"><input type="checkbox" id="remember" checked> Remember me</label>
        <button class="link" data-action="forgot">Forgot password?</button>
      </div>
      <p class="error" id="login-error"></p>
      <button class="btn btn-primary btn-block" data-action="login">Sign in</button>
      <div class="or desk-only"><span>or</span></div>
      <button class="btn btn-outline btn-block" data-action="sso">${icon('user', 16)} Continue with University SSO</button>
      <p class="switch small">New to PlateWise? <button class="link" data-action="to-signup">Create an account</button></p>
      <p class="fine mob-only">By continuing you agree to share your meal count with your hostel mess.</p>
      ${modeNote}
    `;

  app.innerHTML = `
    <div class="login">
      <section class="login-hero desk-only">
        <div class="hero-circle"></div>
        ${logo(true)}
        <div class="hero-text">
          <h1>Mark your meal.<br>Save the food.</h1>
          <p>PlateWise lets hostel students tell the mess in advance whether they're eating — so the kitchen cooks the right amount and less food ends up in the bin.</p>
          <div class="hero-stats">
            <div><b>52.6%</b><span>of students skip planned meals every week</span></div>
            <div><b>79%</b><span>would use a meal-marking app</span></div>
            <div><b>#1</b><span>barrier: forgetting to mark meals</span></div>
          </div>
        </div>
        <p class="hero-foot">Based on a survey of 19 mess users · Sept 2026</p>
      </section>

      <section class="login-panel">
        <div class="login-box">
          <div class="mob-only">
            ${logo()}
            <div class="mob-hero">
              <span class="mob-hero-icon">${icon('utensils', 30)}</span>
              <h1>Mark your meal.<br>Save the food.</h1>
              <p>Tell the mess if you're eating, so they cook just enough.</p>
            </div>
          </div>
          ${form}
        </div>
      </section>
    </div>`;
}

/* =====================================================================
   SHARED PIECES — sidebar (laptop), bottom nav (phone), header
   ===================================================================== */
const STAFF_NAV = [{ page: 'mess', label: 'Mess dashboard', short: 'Dashboard', icon: 'chart' }];
const NAV = [
  { page: 'home',   label: 'Home',       short: 'Home',   icon: 'home' },
  { page: 'plan',   label: 'Plan week',  short: 'Plan',   icon: 'calendar' },
  { page: 'rate',   label: 'Rate meals', short: 'Rate',   icon: 'star' },
  { page: 'impact', label: 'Impact',     short: 'Impact', icon: 'chart' },
];

const navFor = p => (p.role === 'staff' ? STAFF_NAV : NAV);

function sidebar(page) {
  const p = me();
  const nc = nextCutoff();
  return `
    <nav class="sidebar">
      ${logo()}
      <p class="nav-title">MENU</p>
      ${navFor(p).map(n => `<a href="#${n.page}" class="nav-link ${n.page === page ? 'active' : ''}">${icon(n.icon, 18)} ${n.label}</a>`).join('')}
      <div class="grow"></div>
      ${nc && p.role !== 'staff' ? `<div class="cutoff-card">${icon('clock', 18)}<span>Next cutoff</span><b>${nc.meal.name} · ${formatTime(nc.at)}</b></div>` : ''}
      <div class="me-row">
        <span class="avatar sm">${esc(p.name[0].toUpperCase())}</span>
        <div><b>${esc(p.name)}</b><span>${p.role === 'staff' ? 'Mess staff' : 'Reg. ' + p.reg} · ${p.hostel}</span></div>
      </div>
    </nav>`;
}

function bottomNav(page) {
  return `<nav class="bottom-nav">
    ${navFor(me()).map(n => `<a href="#${n.page}" class="${n.page === page ? 'active' : ''}"><span>${icon(n.icon, 20)}</span>${n.short}</a>`).join('')}
  </nav>`;
}

function headerActions() {
  const p = me();
  return `
    <div class="head-actions">
      ${p.role === 'staff' ? '' : `<button class="round-btn" data-action="bell" aria-label="Reminders">${icon('bell', 18)}${nextPendingMeal() ? '<i class="dot"></i>' : ''}</button>`}
      <button class="avatar" data-action="menu" aria-label="Profile">${esc(p.name[0].toUpperCase())}</button>
      ${menuOpen ? profileMenu() : ''}
    </div>`;
}

function profileMenu() {
  const p = me();
  return `<div class="pop-menu">
    <b>${esc(p.name)}</b><span class="muted small">${p.role === 'staff' ? 'Mess staff' : 'Reg. ' + p.reg} · ${p.hostel} mess</span>
    <span class="tiny ${Cloud.on ? 'ok-text' : 'muted'}">${Cloud.on ? '● Synced with database' : '● Offline mode (this device only)'}</span>
    <hr>
    <div class="row-between"><span><b class="small">Demo clock</b><br><span class="muted tiny">Pretend it's Thu 12 Nov, 4:40 PM</span></span>${toggle('demo', p.settings.demo)}</div>
    <hr>
    ${Cloud.on ? '' : `<button class="menu-item" data-action="reset">${icon('refresh', 16)} Reset my data</button>`}
    <button class="menu-item" data-action="logout">${icon('logout', 16)} Sign out</button>
  </div>`;
}

function toggle(name, on) {
  return `<button class="toggle ${on ? 'on' : ''}" data-action="toggle" data-name="${name}" role="switch" aria-checked="${on}"><i></i></button>`;
}

// Page title area. "back" adds a back arrow on phones.
function pageHeader(sub, title, back = false, actionsOnPhone = false) {
  return `
    <header class="page-head">
      ${back ? `<a href="#home" class="round-btn mob-only" aria-label="Back">${icon('left', 18)}</a>` : ''}
      <div class="ph-text">
        <p class="eyebrow desk-only">${sub}</p>
        <h1>${title}</h1>
        <p class="sub mob-only">${sub}</p>
      </div>
      <div class="${actionsOnPhone ? '' : 'desk-only'}">${headerActions()}</div>
    </header>`;
}

// Puts all the pieces together into one screen
function shell(page, header, main, side = '') {
  app.innerHTML = `
    <div class="layout" data-page="${page}">
      ${sidebar(page)}
      <main class="main">
        ${header}
        <div class="content ${side ? 'has-side' : ''}">
          <div class="col-main">${main}</div>
          ${side ? `<aside class="col-side">${side}</aside>` : ''}
        </div>
      </main>
      ${me().role === 'staff' ? '' : bottomNav(page)}
      ${reminderOpen ? reminderPopup() : ''}
    </div>`;
}

/* ---------- small building blocks used on many screens ---------- */
function statusPill(mark, open) {
  if (mark === 'eat')  return `<span class="pill pill-eat">${icon('check', 12)} Eating</span>`;
  if (mark === 'skip') return `<span class="pill pill-skip">${icon('x', 12)} Skipped</span>`;
  return open ? `<span class="pill pill-open">Not marked</span>` : `<span class="pill pill-missed">Missed</span>`;
}
function cellIcon(mark) {
  if (mark === 'eat')  return icon('check', 18);
  if (mark === 'skip') return icon('x', 16);
  return '';
}

/* =====================================================================
   SCREEN 2 — HOME  (M2 / D2)
   ===================================================================== */
function renderHome() {
  const p = me();
  const t = now();
  const today = dateKey(t);
  const hour = t.getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 16 ? 'Good afternoon' : 'Good evening';
  const marked = MEALS.filter(m => getMark(today, m.id)).length;
  const stats = weekStats();

  // Yellow banner: next meal of today that is still unmarked
  const pending = MEALS.find(m => isOpen(today, m.id) && !getMark(today, m.id));
  const banner = pending ? `
    <div class="banner">
      <span class="banner-icon">${icon('clock', 20)}</span>
      <div class="grow">
        <b>${pending.name} marking closes at ${formatTime(mealCutoff(today, pending.id))}<span class="desk-only-inline"> — ${timeLeft(mealCutoff(today, pending.id))} left</span></b>
        <span><span class="mob-only-inline">${timeLeft(mealCutoff(today, pending.id))} left · helps the mess cook the right amount</span><span class="desk-only-inline">Marking early helps the mess cook just the right amount.</span></span>
      </div>
      <button class="btn btn-primary btn-sm desk-only" data-action="bell">Mark ${pending.name.toLowerCase()}</button>
    </div>` : `
    <div class="banner banner-ok">
      <span class="banner-icon">${icon('check', 20)}</span>
      <div class="grow"><b>You're all set for today</b><span>Plan ahead for next week so you never miss a cutoff.</span></div>
      <a href="#plan" class="btn btn-primary btn-sm desk-only">Plan week</a>
    </div>`;

  const cards = MEALS.map(m => {
    const mark = getMark(today, m.id);
    const open = isOpen(today, m.id);
    const tone = mark === 'eat' ? 'green' : mark === 'skip' ? 'red' : open ? 'amber' : 'grey';
    let actions = '';
    if (open && !mark) {
      actions = `<div class="meal-actions">
        <button class="btn btn-primary" data-action="mark" data-key="${today}" data-meal="${m.id}" data-value="eat">${icon('check', 16)} I'll eat</button>
        <button class="btn btn-outline" data-action="mark" data-key="${today}" data-meal="${m.id}" data-value="skip">${icon('x', 16)} Skip</button>
      </div>`;
    } else if (open && mark) {
      actions = `<div class="meal-actions"><button class="btn btn-soft btn-sm" data-action="mark" data-key="${today}" data-meal="${m.id}" data-value="${mark === 'eat' ? 'skip' : 'eat'}">Change to ${mark === 'eat' ? 'skip' : 'eating'}</button></div>`;
    }
    return `
      <article class="card meal-card ${open && !mark ? 'attention' : ''}">
        <div class="meal-top">
          <span class="icon-box ${tone}">${icon('utensils', 20)}</span>
          <div class="meal-info">
            <b>${m.name}<span class="mob-only-inline"> · ${m.time}</span></b>
            <span class="meal-time desk-only">${m.time}</span>
            <span class="meal-menu">${menuFor(today, m.id)}</span>
          </div>
          ${statusPill(mark, open)}
        </div>
        ${actions}
      </article>`;
  }).join('');

  const main = `
    ${banner}
    <div class="section-head"><h2>Today's meals</h2><span class="muted small">${marked} of 3 marked</span></div>
    <div class="meal-grid">${cards}</div>
    <a href="#impact" class="impact-strip">
      <span class="strip-icon">${icon('leaf', 20)}</span>
      <div class="grow">
        <b><span class="desk-only-inline">You helped save </span><span class="mob-only-inline">${stats.platesSaved} plates saved this week</span><span class="desk-only-inline">${stats.platesSaved} plates this week</span></b>
        <span>Top ${stats.onTime >= 90 ? '20' : stats.onTime >= 75 ? '40' : '60'}% of planners in ${p.hostel}<span class="desk-only-inline"> · ${p.hostel} mess wasted ${kgSavedThisMonth(p.hostel)} kg less this month</span></span>
      </div>
      <span class="btn btn-light btn-sm desk-only">View impact</span>
      <span class="mob-only">${icon('right', 20)}</span>
    </a>`;

  // Right column (laptop only): next week mini-plan + tomorrow's menu
  const nextMon = addDays(mondayOf(t), 7);
  const days = weekDays(nextMon);
  const nextStats = weekStats(nextMon);
  const tomorrow = dateKey(addDays(t, 1));
  const side = `
    <div class="card">
      <div class="row-between"><h3>Next week</h3><span class="muted tiny">${days[0].getDate()} – ${shortDate(days[6])}</span></div>
      <div class="mini-grid">
        ${days.map(d => `<span class="mini-head">${DAY_SHORT[d.getDay()][0]}</span>`).join('')}
        ${MEALS.map(m => days.map(d => `<span class="mini-cell ${getMark(dateKey(d), m.id) || ''}">${cellIcon(getMark(dateKey(d), m.id)).replace(/width="\d+" height="\d+"/, 'width="12" height="12"')}</span>`).join('')).join('')}
      </div>
      <p class="muted tiny">${nextStats.marked} of 21 marked · ${nextStats.open} still open</p>
      <a href="#plan" class="btn btn-soft btn-block">Edit plan</a>
    </div>
    <div class="card">
      <h3>Tomorrow's menu</h3>
      ${MEALS.map(m => `<div class="menu-row"><span class="icon-box green xs">${icon('utensils', 14)}</span><div><b>${m.name}</b><span>${menuFor(tomorrow, m.id)}</span></div></div>`).join('')}
    </div>`;

  const header = `
    <header class="page-head home-head">
      <div class="ph-text">
        <p class="eyebrow">${DAY_LONG[t.getDay()]}, ${t.getDate()} <span class="desk-only-inline">${MONTHS[t.getMonth()]}</span><span class="mob-only-inline">${MONTHS[t.getMonth()].slice(0, 3)}</span></p>
        <h1>${greet}, ${esc(p.name)}</h1>
      </div>
      ${headerActions()}
    </header>`;

  shell('home', header, main, side);

  // Show the reminder pop-up once per visit if a cutoff is less than 3 hours away
  const np = nextPendingMeal();
  if (!autoReminderShown && np && mealCutoff(np.key, np.meal.id) - now() < 3 * 3600 * 1000) {
    autoReminderShown = true;
    memSet('sessionStorage', 'pw-reminded', '1');
    setTimeout(() => { if (currentPage() === 'home' && !reminderOpen) { reminderOpen = true; render(); } }, 1200);
  }
}

/* =====================================================================
   REMINDER POP-UP  (M4 / D4)
   ===================================================================== */
function reminderPopup() {
  const np = nextPendingMeal();
  const tomorrow = dateKey(addDays(now(), 1));
  const tomorrowOpen = MEALS.filter(m => !getMark(tomorrow, m.id)).length;
  const main = np ? `
    <div class="notif">
      <div class="notif-top">${logo()}<span class="muted tiny">now</span></div>
      <b>${np.meal.name} ${np.dayOffset === 0 ? (np.meal.id === 'd' ? 'tonight' : 'today') : 'tomorrow'} — are you eating?</b>
      <p>${menuFor(np.key, np.meal.id)}. Marking closes at ${formatTime(mealCutoff(np.key, np.meal.id))} (${timeLeft(mealCutoff(np.key, np.meal.id))} left).</p>
      <div class="notif-actions">
        <button class="btn btn-primary" data-action="mark" data-key="${np.key}" data-meal="${np.meal.id}" data-value="eat" data-close="1">${icon('check', 16)} Yes, I'll eat</button>
        <button class="btn btn-outline" data-action="mark" data-key="${np.key}" data-meal="${np.meal.id}" data-value="skip" data-close="1">Skip ${np.meal.name.toLowerCase()}</button>
      </div>
    </div>` : `
    <div class="notif">
      <div class="notif-top">${logo()}<span class="muted tiny">now</span></div>
      <b>You're all caught up ✓</b>
      <p>Every open meal is marked. We'll remind you before the next cutoff.</p>
    </div>`;
  const second = tomorrowOpen && np && np.dayOffset === 0 ? `
    <a href="#home" class="notif notif-faded" data-action="close-reminder">
      <div class="notif-top">${logo()}<span class="muted tiny">2h ago</span></div>
      <b>${tomorrowOpen} meal${tomorrowOpen > 1 ? 's' : ''} still unmarked for tomorrow</b>
      <p>Tap to plan before the 10:00 PM cutoff.</p>
    </a>` : '';
  return `<div class="overlay" data-action="close-reminder"><div class="notif-stack" data-stop>${main}${second}</div></div>`;
}

/* =====================================================================
   SCREEN 3 — PLAN YOUR WEEK  (M3 / D3)
   ===================================================================== */
function renderPlan() {
  const p = me();
  const nextMon = addDays(mondayOf(now()), 7);
  const days = weekDays(nextMon);
  const keys = days.map(dateKey);

  // Start a draft copy of next week (so changes only count after "Save plan")
  if (!planDraft || planDraft.week !== keys[0]) {
    planDraft = { week: keys[0], cells: {}, dirty: false };
    keys.forEach(k => MEALS.forEach(m => { planDraft.cells[`${k}|${m.id}`] = getMark(k, m.id); }));
    if (p.settings.repeat) applyRepeat(keys);
  }
  const cell = (k, m) => {
    const v = planDraft.cells[`${k}|${m}`];
    const locked = !isOpen(k, m);
    return `<button class="cell ${v || 'empty'}" ${locked ? 'disabled' : ''} data-action="cycle" data-cell="${k}|${m}" aria-label="${m} ${k}: ${v || 'not marked'}">${cellIcon(v)}</button>`;
  };

  const vals = Object.values(planDraft.cells);
  const eat = vals.filter(v => v === 'eat').length, skip = vals.filter(v => v === 'skip').length;
  const marked = eat + skip, open = 21 - marked;
  const listBy = (want) => {
    const out = [];
    days.forEach((d, i) => {
      const ms = MEALS.filter(m => planDraft.cells[`${keys[i]}|${m.id}`] === want);
      if (ms.length === 3) out.push(`${DAY_SHORT[d.getDay()]} (all meals)`);
      else if (ms.length) out.push(`${DAY_SHORT[d.getDay()]} ${ms.map(m => m.name.toLowerCase()).join(' & ')}`);
    });
    return out.join(', ') || 'None';
  };
  const range = `${days[0].getDate()} – ${shortDate(days[6])}`;
  const legend = `<div class="legend"><span><i class="cell-dot eat">${icon('check', 10)}</i>Eating</span><span><i class="cell-dot skip">${icon('x', 9)}</i>Skipping</span><span><i class="cell-dot empty"></i>Not marked</span></div>`;

  const main = `
    <div class="card repeat-card mob-only">
      <span class="icon-box green">${icon('calendar', 18)}</span>
      <div class="grow"><b>Repeat my usual week</b><span class="muted tiny">Auto-fill from this week's pattern</span></div>
      ${toggle('repeat', p.settings.repeat)}
    </div>

    <div class="card plan-card">
      <div class="row-between desk-only plan-top">
        <div><b>Tap a cell to switch between Eating, Skipping and Not marked</b><p class="muted tiny">Each meal locks at its cutoff time. We'll nudge you before that.</p></div>
        <label class="row gap small"><b>Repeat usual week</b>${toggle('repeat', p.settings.repeat)}</label>
      </div>

      <!-- Laptop table: meals down the side, days across the top -->
      <table class="plan-table desk-only">
        <thead><tr><th>Meal</th>${days.map(d => `<th class="${d.getDay() === 1 ? 'today-col' : ''}">${DAY_SHORT[d.getDay()]}<span>${shortDate(d)}</span></th>`).join('')}</tr></thead>
        <tbody>${MEALS.map(m => `<tr><td><b>${m.name}</b><span>${m.cutoffText}</span></td>${keys.map(k => `<td>${cell(k, m.id)}</td>`).join('')}</tr>`).join('')}</tbody>
      </table>

      <!-- Phone table: days down the side, meals across the top -->
      <table class="plan-table plan-mobile mob-only">
        <thead><tr><th>Day</th>${MEALS.map(m => `<th>${m.short}</th>`).join('')}</tr></thead>
        <tbody>${days.map((d, i) => `<tr><td><b>${DAY_SHORT[d.getDay()]}</b> <span>${shortDate(d)}</span></td>${MEALS.map(m => `<td>${cell(keys[i], m.id)}</td>`).join('')}</tr>`).join('')}</tbody>
      </table>
      <div class="desk-only">${legend}</div>
    </div>
    <div class="mob-only">${legend}</div>

    <div class="plan-foot mob-only">
      <div><b>${marked} of 21 marked</b><span class="muted tiny">${skip} skips · ${open} still open</span></div>
      <button class="btn btn-primary" data-action="save-plan">Save plan</button>
    </div>`;

  const side = `
    <div class="card">
      <h3>Summary</h3>
      <p class="big-green">${marked} of 21 marked</p>
      <div class="progress"><i style="width:${(marked / 21) * 100}%"></i></div>
      <p class="tiny"><b>Skipping</b><br><span class="muted">${listBy('skip')}</span></p>
      <p class="tiny"><b>Not marked</b><br><span class="muted">${listBy(null)}</span></p>
    </div>
    <div class="card">
      <h3>Reminders</h3>
      <div class="row-between setting"><div><b>Before each cutoff</b><span>2 hours early, as a push alert</span></div>${toggle('remindCutoff', p.settings.remindCutoff)}</div>
      <div class="row-between setting"><div><b>Weekly plan nudge</b><span>Sundays at 8:00 PM</span></div>${toggle('weeklyNudge', p.settings.weeklyNudge)}</div>
      <div class="row-between setting"><div><b>Email summary</b><span>Every Monday morning</span></div>${toggle('email', p.settings.email)}</div>
    </div>
    <button class="btn btn-primary btn-block" data-action="save-plan">${icon('check', 16)} Save plan${planDraft.dirty ? ' •' : ''}</button>`;

  shell('plan', pageHeader(`${range}<span class="mob-only-inline"> · we'll remind you before each cutoff</span>`, 'Plan your week', true), main, side);
}

// "Repeat my usual week": copy this week's choices into empty cells of next week
function applyRepeat(keys) {
  keys.forEach(k => MEALS.forEach(m => {
    const id = `${k}|${m.id}`;
    if (!planDraft.cells[id]) {
      const lastWeek = dateKey(addDays(fromKey(k), -7));
      const v = getMark(lastWeek, m.id);
      if (v) { planDraft.cells[id] = v; planDraft.dirty = true; }
    }
  }));
}

/* =====================================================================
   SCREEN 4 — RATE A MEAL  (M5 / D5)
   ===================================================================== */
const STAR_WORDS = ['', 'Bad', 'Poor', 'Okay', 'Good', 'Loved it'];
const LEFT_OPTIONS = ['None', 'A little', 'Half', 'Most of it'];
const ISSUE_OPTIONS = ['Taste', 'Spice level', 'Too oily', 'Quantity', 'Served cold', 'Variety'];

// Meals that have already been served (latest first) — those are the ones you can rate
function rateableMeals() {
  const out = [];
  const t = now();
  for (let i = 0; i < 2 && out.length < 3; i++) {
    const key = dateKey(addDays(t, -i));
    [...MEALS].reverse().forEach(m => { if (out.length < 3 && mealServeTime(key, m.id) <= t) out.push({ key, meal: m, dayOffset: i }); });
  }
  return out;
}

function renderRate() {
  const options = rateableMeals();
  if (!rateForm || !options.some(o => o.key === rateForm.key && o.meal.id === rateForm.meal)) {
    const first = options[0];
    rateForm = { key: first.key, meal: first.meal.id, stars: 0, left: null, issues: [], note: '' };
  }
  const target = options.find(o => o.key === rateForm.key && o.meal.id === rateForm.meal);
  const m = target.meal;
  const dayWord = target.dayOffset === 0 ? "today's" : "yesterday's";
  const d = fromKey(target.key);
  const stars = [1, 2, 3, 4, 5].map(n => `<button class="star ${n <= rateForm.stars ? 'on' : ''}" data-action="stars" data-n="${n}" aria-label="${n} stars">${icon('star', 30)}</button>`).join('');
  const starText = rateForm.stars ? `${STAR_WORDS[rateForm.stars]} — ${rateForm.stars} out of 5` : 'Tap a star';
  const chip = (group, val, on) => `<button class="chip ${on ? 'on' : ''}" data-action="chip" data-group="${group}" data-val="${val}">${on ? icon('check', 14) : ''}${val}</button>`;
  const already = me().ratings.find(r => r.key === rateForm.key && r.meal === rateForm.meal);

  const main = `
    ${options.length > 1 ? `<div class="chip-row">${options.map(o => `<button class="chip ${o.key === rateForm.key && o.meal.id === rateForm.meal ? 'on' : ''}" data-action="pick-meal" data-key="${o.key}" data-meal="${o.meal.id}">${o.dayOffset ? 'Yesterday' : 'Today'} · ${o.meal.name}</button>`).join('')}</div>` : ''}
    <div class="card rate-meal">
      <span class="icon-box green">${icon('utensils', 20)}</span>
      <div class="grow"><b>${m.name} · <span class="desk-only-inline">${DAY_LONG[d.getDay()].slice(0, 8)} ${shortDate(d)}, </span>${m.time}</b><span class="muted small">${menuFor(target.key, m.id)}</span></div>
      <div class="desk-only stars-wrap">${stars}<span class="muted tiny">${starText}</span></div>
    </div>
    <div class="card center mob-only">
      <b>How was it?</b>
      <div class="stars-wrap">${stars}</div>
      <span class="muted small">${starText}</span>
    </div>
    <div class="rate-grid">
      <div class="card"><b>How much did you leave on your plate?</b><div class="chips">${LEFT_OPTIONS.map(v => chip('left', v, rateForm.left === v)).join('')}</div></div>
      <div class="card"><b>What could be better?</b><div class="chips">${ISSUE_OPTIONS.map(v => chip('issues', v, rateForm.issues.includes(v))).join('')}</div></div>
    </div>
    ${MESS.notice ? `<div class="notice-mob mob-only">${icon('megaphone', 18)}<div><b>From your mess committee</b><span>${esc(MESS.notice.text)}</span></div></div>` : ''}
    <label class="card note">${icon('message', 18)}<textarea id="note" rows="2" placeholder="Anything else for the mess committee? (optional)">${esc(rateForm.note)}</textarea></label>
    ${already ? `<p class="muted tiny">You already rated this meal (${already.stars}★). Submitting again will update it.</p>` : ''}
    <div class="rate-foot">
      <span class="muted tiny desk-only grow">Your feedback is anonymous and goes to the mess committee.</span>
      <a href="#home" class="btn btn-outline desk-only">Skip for now</a>
      <button class="btn btn-primary rate-submit" data-action="submit-rating">${icon('check', 16)} Submit feedback</button>
    </div>`;

  const recent = [...me().ratings].sort((a, b) => (b.key + b.meal).localeCompare(a.key + a.meal)).slice(0, 4);
  const side = `
    <div class="card">
      <h3>Your recent ratings</h3>
      ${recent.map(r => {
        const rd = fromKey(r.key);
        const label = r.key === dateKey(now()) ? 'Today' : DAY_SHORT[rd.getDay()];
        return `<div class="recent"><div><b>${MEALS.find(x => x.id === r.meal).name} · ${label}</b><span>${menuFor(r.key, r.meal)}</span></div><span class="mini-stars">${[1, 2, 3, 4, 5].map(n => `<i class="${n <= r.stars ? 'on' : ''}">★</i>`).join('')}</span></div>`;
      }).join('') || '<p class="muted small">No ratings yet.</p>'}
    </div>
    <div class="card dark">
      <span class="icon-box on-dark">${icon('megaphone', 18)}</span>
      <b>The mess heard you</b>
      <p>${MESS.notice ? esc(MESS.notice.text) : (live() ? 'No updates from the mess committee yet.' : 'Less oil in sabzi from 10 Nov — based on 212 "too oily" ratings last month.')}</p>
    </div>`;

  shell('rate', pageHeader('Takes 10 seconds · shared anonymously with the mess committee', `Rate ${dayWord} ${m.name.toLowerCase()}`, true), main, side);
}

/* =====================================================================
   SCREEN 5 — YOUR IMPACT  (M6 / D6)
   ===================================================================== */
function bars(data) {
  const max = Math.max(1, ...data.prepared);
  return `<div class="bars">${data.labels.map((l, i) => `
    <div class="bar-col">
      <div class="bar-pair">
        <i class="bar prep" style="height:${(data.prepared[i] / max) * 100}%" title="Prepared: ${data.prepared[i]}"></i>
        <i class="bar ate" style="height:${(data.eaten[i] / max) * 100}%" title="Eaten: ${data.eaten[i]}"></i>
      </div><span>${l}</span>
    </div>`).join('')}</div>
    <div class="legend"><span><i class="sq prep"></i>${live() ? 'Marked' : 'Prepared'}</span><span><i class="sq ate"></i>Eaten</span></div>`;
}

function renderImpact() {
  const p = me();
  const s = weekStats();
  const st = streak();
  const mon = mondayOf(now());
  const rated = p.ratings.filter(r => fromKey(r.key) >= addDays(mon, -7)).length;
  const top = s.onTime >= 90 ? 'Top 20%' : s.onTime >= 75 ? 'Top 40%' : 'Top 60%';
  const toBadge = 7 - (st % 7);
  const kg = kgSavedThisMonth(p.hostel);
  const wk = hostelDaily(p.hostel);
  const wkMarked = wk.prepared.reduce((x, y) => x + y, 0);
  const gapPct = wkMarked ? Math.round(((wkMarked - wk.eaten.reduce((x, y) => x + y, 0)) / wkMarked) * 100) : 0;
  const stat = (ic, tone, big, label, cls = '') => `<div class="card stat ${cls}"><span class="icon-box ${tone}">${icon(ic, 18)}</span><b>${big}</b><span>${label}</span></div>`;

  const main = `
    <div class="stat-grid">
      ${stat('leaf', 'green', `${s.platesSaved}<span class="desk-only-inline"> plates</span>`, '<span class="mob-only-inline">plates saved this week</span><span class="desk-only-inline">saved by you this week</span>')}
      ${stat('check', 'amber', `${s.onTime}%`, 'of your meals marked on time')}
      ${stat('trend', 'green', `${kg} kg`, `less food wasted by ${p.hostel} this month`, 'desk-only')}
      ${stat('flame', 'amber', `${st} days`, 'planning streak', 'desk-only')}
    </div>
    <div class="card chart-card">
      <div class="row-between">
        <div><b class="mob-only">${kg} kg less food wasted</b><b class="desk-only">Plates ${live() ? 'marked' : 'prepared'} vs eaten</b>
        <p class="muted tiny"><span class="mob-only-inline">${live() ? `${p.hostel} mess this week · plates per day` : 'Hostel mess this month · plates per day'}</span><span class="desk-only-inline">${live() ? `${p.hostel} mess · total plates per week, last 8 weeks` : `${p.hostel} mess · daily average per week, since PlateWise launched`}</span></p></div>
        <span class="pill pill-eat">${icon('trend', 12)} ${live() ? `${gapPct}% not cooked` : '<span class="desk-only-inline">Gap down </span>31%'}</span>
      </div>
      <div class="mob-only">${bars(hostelDaily(p.hostel))}</div>
      <div class="desk-only">${bars(hostelWeekly(p.hostel))}</div>
    </div>
    <div class="mini-stats mob-only">
      ${stat('flame', 'amber', `${st} days`, 'planning streak', 'small-stat')}
      ${stat('star', 'green', `${rated} meals`, 'rated', 'small-stat')}
      ${stat('trend', 'green', top, 'planner', 'small-stat')}
    </div>`;

  const side = `
    <div class="card">
      <h3>Hostel leaderboard</h3>
      ${leaderboard().map(([h, kg], i) => `<div class="lb-row ${h === p.hostel ? 'me' : ''}"><span class="icon-box ${h === p.hostel ? 'solid' : 'grey'} xs">${icon('leaf', 13)}</span><b>${i + 1}. ${h}${h === p.hostel ? ' (you)' : ''}</b><span>${kg} kg</span></div>`).join('')}
    </div>
    <div class="card dark">
      <span class="icon-box on-dark">${icon('flame', 18)}</span>
      <b>${toBadge} day${toBadge > 1 ? 's' : ''} to your next badge</b>
      <p>Keep marking every meal on time to unlock "Zero-Waste Week".</p>
      <div class="progress amber"><i style="width:${((7 - toBadge) / 7) * 100}%"></i></div>
    </div>`;

  const sun = addDays(mon, 6);
  shell('impact', pageHeader(`Week of ${mon.getDate()} – ${shortDate(sun)} · ${p.hostel} mess`, 'Your impact'), main, side);
}

/* =====================================================================
   SCREEN 6 — MESS DASHBOARD  (new: only for accounts with role "staff")
   Live meal counts so the kitchen knows how much to cook.
   ===================================================================== */
function renderMess() {
  const p = me();
  const t = now();
  const today = dateKey(t);
  const total = MESS.students;

  const mealCard = m => {
    const eat = countFor(p.hostel, today, m.id, 'eat');
    const skip = countFor(p.hostel, today, m.id, 'skip');
    const unmarked = Math.max(0, total - eat - skip);
    const cook = eat + Math.round(unmarked * 0.5);   // estimate: about half of unmarked students turn up
    const open = isOpen(today, m.id);
    return `<article class="card staff-meal">
      <div class="row-between"><b>${m.name} · ${m.time}</b>${open ? `<span class="pill pill-open">Open till ${formatTime(mealCutoff(today, m.id))}</span>` : '<span class="pill pill-eat">Final</span>'}</div>
      <p class="muted tiny">${menuFor(today, m.id)}</p>
      <div class="staff-cook"><span>Cook for about</span><b>${cook}</b><span>plate${cook === 1 ? '' : 's'}</span></div>
      <div class="staff-split"><span><i class="sq ate"></i>${eat} eating</span><span><i class="sq skip"></i>${skip} skipping</span><span><i class="sq none"></i>${unmarked} not marked</span></div>
    </article>`;
  };

  const days = [0, 1, 2, 3, 4, 5, 6].map(i => addDays(startOfDay(t), i));
  const table = `<table class="staff-table">
    <thead><tr><th>Day</th>${MEALS.map(m => `<th>${m.name}</th>`).join('')}</tr></thead>
    <tbody>${days.map(d => { const k = dateKey(d); return `<tr><td><b>${DAY_SHORT[d.getDay()]}</b> <span>${shortDate(d)}</span></td>${MEALS.map(m => `<td><b>${countFor(p.hostel, k, m.id, 'eat')}</b><span> eating · ${countFor(p.hostel, k, m.id, 'skip')} skip</span></td>`).join('')}</tr>`; }).join('')}</tbody>
  </table>`;

  // Ratings from the last 7 days (names are never shown — feedback is anonymous)
  const since = dateKey(addDays(t, -7));
  const recent = (MESS.ratings || []).filter(r => r.key >= since);
  const perMeal = MEALS.map(m => {
    const rs = recent.filter(r => r.meal === m.id);
    return { m, n: rs.length, avg: rs.length ? (rs.reduce((s, r) => s + r.stars, 0) / rs.length).toFixed(1) : '–' };
  });
  const issueCounts = {};
  recent.forEach(r => (r.issues || []).forEach(i => { issueCounts[i] = (issueCounts[i] || 0) + 1; }));
  const issues = Object.entries(issueCounts).sort((x, y) => y[1] - x[1]);
  const notes = recent.filter(r => r.note).sort((x, y) => y.at - x.at).slice(0, 5);

  const main = `
    <div class="section-head"><h2>Today · ${DAY_LONG[t.getDay()]} ${shortDate(t)}</h2><span class="muted small">${total} students registered</span></div>
    <div class="meal-grid">${MEALS.map(mealCard).join('')}</div>
    <div class="card"><h3>Next 7 days</h3><div class="table-scroll">${table}</div></div>
    <div class="card">
      <h3>Ratings this week</h3>
      <div class="rating-sum">${perMeal.map(x => `<div><span class="muted tiny">${x.m.name}</span><b>${x.avg}<i>★</i></b><span class="muted tiny">${x.n} rating${x.n === 1 ? '' : 's'}</span></div>`).join('')}</div>
      <p class="tiny"><b>Top complaints</b></p>
      <div class="chips">${issues.length ? issues.map(([i, n]) => `<span class="chip">${i} · ${n}</span>`).join('') : '<span class="muted small">None yet</span>'}</div>
      ${notes.length ? `<p class="tiny" style="margin-top:16px"><b>Latest comments</b></p>${notes.map(r => `<p class="staff-note">“${esc(r.note)}” <span class="muted tiny">— ${MEALS.find(m => m.id === r.meal).name}, ${shortDate(fromKey(r.key))}</span></p>`).join('')}` : ''}
    </div>`;

  const side = `
    <div class="card">
      <h3>Post an update to students</h3>
      <p class="muted tiny">Shows on every student's Rate screen in ${p.hostel}.</p>
      <textarea id="notice" class="notice-box" rows="3" maxlength="200" placeholder="e.g. Less oil in sabzi from Monday, thanks to your ratings!"></textarea>
      <button class="btn btn-primary btn-block" data-action="post-notice">Post update</button>
      ${MESS.notice ? `<p class="tiny muted" style="margin-top:10px">Now showing: “${esc(MESS.notice.text)}”</p>` : ''}
    </div>
    <div class="card dark">
      <span class="icon-box on-dark">${icon('leaf', 18)}</span>
      <b>${kgSavedThisMonth(p.hostel)} kg saved this month</b>
      <p>Plates skipped in advance × ${KG_PER_PLATE} kg per plate.</p>
    </div>
    <button class="btn btn-outline btn-block" data-action="refresh-staff">${icon('refresh', 16)} Refresh ratings</button>`;

  shell('mess', pageHeader(`${p.hostel} mess · counts update live`, 'Mess dashboard', false, true), main, side);
}

/* =====================================================================
   ROUTER — decides which screen to draw
   ===================================================================== */
function currentPage() { return (location.hash || '#home').slice(1); }

function render() {
  if (Cloud.on && !Cloud.ready) return renderLoading();
  if (!me()) return renderLogin();
  const page = currentPage();
  if (me().role === 'staff') return renderMess();
  if (page === 'plan') renderPlan();
  else if (page === 'rate') renderRate();
  else if (page === 'impact') renderImpact();
  else renderHome();
}
window.addEventListener('hashchange', () => { reminderOpen = false; menuOpen = false; render(); window.scrollTo(0, 0); });

/* =====================================================================
   CLICK HANDLER — one listener for every button in the app
   ===================================================================== */
document.addEventListener('click', async (e) => {
  const el = e.target.closest('[data-action]');
  // Clicking outside the profile menu closes it
  if (menuOpen && !e.target.closest('.pop-menu') && !(el && el.dataset.action === 'menu')) { menuOpen = false; resetArmed = false; render(); }
  if (!el) return;
  // Clicks inside the reminder card shouldn't close the dark overlay behind it
  if (el.dataset.action === 'close-reminder' && e.target.closest('[data-stop]') && el.classList.contains('overlay')) return;
  const a = el.dataset.action;

  switch (a) {
    /* ----- login & sign-up ----- */
    case 'login': {
      const reg = document.getElementById('reg').value.trim();
      const pw = document.getElementById('pw').value;
      const remember = document.getElementById('remember').checked;
      const err = document.getElementById('login-error');
      if (!/^\d{8}$/.test(reg)) { err.textContent = 'Registration number should be 8 digits.'; return; }
      if (pw.length < 6)         { err.textContent = 'Password should be at least 6 characters.'; return; }
      busy(el, true);
      try {
        if (Cloud.on) {
          await Cloud.signIn(reg, pw, remember);   // Firebase checks the password; onAuthStateChanged does the rest
          memSet('localStorage', 'pw-last-reg', reg);
        } else {
          if (!store.profiles[reg]) throw { code: 'local/no-account' };
          finishLocalLogin(reg, remember);
        }
      } catch (ex) {
        console.error(ex);
        err.textContent = authMessage(ex);
        busy(el, false);
      }
      break;
    }
    case 'signup': {
      const name = document.getElementById('su-name').value.trim();
      const reg = document.getElementById('reg').value.trim();
      const hostel = document.getElementById('hostel').value;
      const pw = document.getElementById('pw').value;
      const err = document.getElementById('login-error');
      if (!name)                 { err.textContent = 'Please type your name.'; return; }
      if (!/^\d{8}$/.test(reg)) { err.textContent = 'Registration number should be 8 digits.'; return; }
      if (pw.length < 6)         { err.textContent = 'Password should be at least 6 characters.'; return; }
      busy(el, true);
      try {
        if (Cloud.on) {
          const user = await Cloud.signUp({ reg, password: pw, name, hostel, remember: true });
          memSet('localStorage', 'pw-last-reg', reg);
          await handleUser(user);
        } else {
          if (store.profiles[reg]) throw { code: 'local/exists' };
          createProfile(reg, name, hostel);
          finishLocalLogin(reg, true);
        }
      } catch (ex) {
        console.error(ex);
        err.textContent = authMessage(ex);
        busy(el, false);
      }
      break;
    }
    case 'to-signup': loginStep = 'signup'; renderLogin(); break;
    case 'to-signin': loginStep = 'signin'; renderLogin(); break;
    case 'sso': {
      if (Cloud.on) { toast('University SSO is not connected yet. Please use your registration number.'); break; }
      // Offline demo: signs in as the prototype's student
      if (!store.profiles['12401343']) createProfile('12401343', 'Hasini', 'BH-2');
      finishLocalLogin('12401343', true);
      break;
    }
    case 'forgot': toast('Please contact your hostel office to reset your password.'); break;

    /* ----- header ----- */
    case 'bell': reminderOpen = !reminderOpen; render(); break;
    case 'close-reminder': reminderOpen = false; render(); break;
    case 'menu': menuOpen = !menuOpen; render(); break;
    case 'logout':
      menuOpen = false; loginStep = 'signin'; planDraft = null; rateForm = null;
      history.replaceState(null, '', location.pathname);
      if (Cloud.on) { await Cloud.signOut(); break; }   // onAuthStateChanged shows the login screen
      store.currentReg = null; save(); render(); break;
    case 'reset':
      // Ask twice instead of a browser pop-up: first tap arms it, second tap resets
      if (!resetArmed) { resetArmed = true; el.innerHTML = 'Tap again to reset everything'; el.classList.add('danger'); return; }
      resetArmed = false;
      {
        const p = me(); createProfile(p.reg, p.name, p.hostel); store.currentReg = p.reg; save();
        planDraft = null; rateForm = null; menuOpen = false; render(); toast('Your data has been reset');
      }
      break;

    /* ----- marking meals (Home + reminder) ----- */
    case 'mark': {
      const { key, meal, value } = el.dataset;
      if (!isOpen(key, meal)) return toast('Marking for this meal has closed.');
      setMark(key, meal, value);
      planDraft = null;
      if (el.dataset.close) reminderOpen = false;
      const name = MEALS.find(m => m.id === meal).name;
      toast(value === 'eat' ? `${name} marked — enjoy your meal!` : `${name} skipped — thanks for saving a plate 🌱`);
      render();
      break;
    }

    /* ----- toggles (repeat week, reminders, demo clock) ----- */
    case 'toggle': {
      const p = me(); const n = el.dataset.name;
      p.settings[n] = !p.settings[n]; save();
      if (Cloud.on) Cloud.saveSettings(p.settings);
      if (n === 'repeat' && p.settings.repeat && planDraft) applyRepeat(Object.keys(planDraft.cells).map(c => c.split('|')[0]));
      if (n === 'demo') { planDraft = null; rateForm = null; toast(p.settings.demo ? 'Demo clock on: Thu 12 Nov, 4:40 PM' : 'Using the real date and time'); }
      render();
      break;
    }

    /* ----- plan week ----- */
    case 'cycle': {   // Not marked → Eating → Skipping → Not marked
      const id = el.dataset.cell;
      const cur = planDraft.cells[id];
      planDraft.cells[id] = cur === null || cur === undefined ? 'eat' : cur === 'eat' ? 'skip' : null;
      planDraft.dirty = true;
      render();
      break;
    }
    case 'save-plan': {
      const list = Object.entries(planDraft.cells)
        .map(([id, v]) => { const [key, meal] = id.split('|'); return { key, meal, value: v }; })
        .filter(c => isOpen(c.key, c.meal));
      setMarks(list);   // saves on the device or in the database
      planDraft.dirty = false;
      toast('Plan saved ✓ The mess will see your meal count.');
      render();
      break;
    }

    /* ----- mess staff ----- */
    case 'post-notice': {
      const text = document.getElementById('notice').value.trim();
      if (!text) return toast('Type an update first');
      busy(el, true);
      await Cloud.postNotice(text.slice(0, 200));
      toast('Posted! Students will see it on the Rate screen.');
      render();
      break;
    }
    case 'refresh-staff':
      busy(el, true);
      await Cloud.refreshStaff();
      render(); toast('Dashboard updated');
      break;

    /* ----- rate ----- */
    case 'pick-meal': rateForm = { key: el.dataset.key, meal: el.dataset.meal, stars: 0, left: null, issues: [], note: '' }; render(); break;
    case 'stars': rateForm.stars = Number(el.dataset.n); render(); break;
    case 'chip': {
      const v = el.dataset.val;
      if (el.dataset.group === 'left') rateForm.left = rateForm.left === v ? null : v;
      else rateForm.issues = rateForm.issues.includes(v) ? rateForm.issues.filter(x => x !== v) : [...rateForm.issues, v];
      render();
      break;
    }
    case 'submit-rating': {
      if (!rateForm.stars) return toast('Tap the stars to rate first');
      const p = me();
      p.ratings = p.ratings.filter(r => !(r.key === rateForm.key && r.meal === rateForm.meal));
      p.ratings.push({ ...rateForm, at: Date.now() });
      save();
      if (Cloud.on) Cloud.saveRating({ ...rateForm });
      toast('Thanks! Your feedback was sent to the mess committee.');
      rateForm = null;
      location.hash = '#home';
      break;
    }
  }
});

// Keep the note text while typing (so redraws don't erase it)
document.addEventListener('input', (e) => { if (e.target.id === 'note' && rateForm) rateForm.note = e.target.value; });
// Pressing Enter on the login form = clicking Sign in
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' || me()) return;
  const btn = document.querySelector(loginStep === 'signup' ? '[data-action="signup"]' : '[data-action="login"]');
  if (btn && e.target.tagName === 'INPUT') btn.click();
});

// Offline mode: sign in using the profile saved on this device
function finishLocalLogin(reg, remember) {
  store.currentReg = reg;
  memSet('localStorage', 'pw-last-reg', reg);
  if (!remember) memSet('sessionStorage', 'pw-session', '1');
  store.rememberMe = remember;
  save();
  loginStep = 'signin';
  location.hash = '#home';
  render();
  toast(`Welcome, ${me().name}!`);
}

// Online mode: Firebase tells us who signed in (or out); we load their data
async function handleUser(user) {
  if (!user) {
    store.profiles = {}; store.currentReg = null; MESS.loaded = false;
    Cloud.ready = true; render();
    return;
  }
  try {
    const p = await Cloud.loadMe(user);
    if (!p) { Cloud.ready = true; return; }   // sign-up still saving the profile
    store.profiles = { [p.reg]: p };
    store.currentReg = p.reg;
    Cloud.ready = true;
    loginStep = 'signin';
    const page = currentPage();
    if (p.role === 'staff') location.hash = '#mess';
    else if (!['home', 'plan', 'rate', 'impact'].includes(page)) location.hash = '#home';
    render();
    toast(`Welcome, ${p.name}!`);
  } catch (err) {
    console.error(err);
    Cloud.ready = true;
    app.innerHTML = `<div class="loading"><b>Couldn't load your data</b>
      <p>Check your internet, and that the database rules from the setup guide (step 5) are published.</p>
      <p class="tiny muted">${esc(err.code || err.message || '')}</p>
      <button class="btn btn-primary" onclick="location.reload()">Try again</button></div>`;
  }
}

// Shows "Please wait..." on a button while something is loading
function busy(btn, on) {
  if (!btn) return;
  btn.disabled = on;
  if (on) { btn.dataset.label = btn.innerHTML; btn.innerHTML = 'Please wait…'; }
  else if (btn.dataset.label) btn.innerHTML = btn.dataset.label;
}

function renderLoading() {
  app.innerHTML = `<div class="loading">${logo()}<span class="spinner"></span><p class="muted small">Loading PlateWise…</p></div>`;
}

/* =====================================================================
   START THE APP
   ===================================================================== */
if (Cloud.init()) {
  // ONLINE MODE — the browser's own saved copy isn't used
  store = { profiles: {}, currentReg: null };
  renderLoading();
  Cloud.onChange = () => {   // live data arrived (mess dashboard)
    const typing = document.activeElement && ['notice'].includes(document.activeElement.id);
    if (me() && currentPage() === 'mess' && !typing) render();
  };
  Cloud.auth.onAuthStateChanged(user => { if (!Cloud.signingUp) handleUser(user); });
} else {
  // OFFLINE MODE — "Remember me" unticked → sign out when the browser is closed
  if (store.currentReg && store.rememberMe === false && !memGet('sessionStorage', 'pw-session')) {
    store.currentReg = null; save();
  }
  render();
}
// Refresh the Home screen every 30 seconds so countdowns stay correct
setInterval(() => { if (me() && currentPage() === 'home' && !menuOpen) render(); }, 30000);
