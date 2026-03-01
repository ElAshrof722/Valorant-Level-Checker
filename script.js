/* ═══════════════════════════════════════════════════════
   Account Tracker — Offline / localStorage edition
   script.js
═══════════════════════════════════════════════════════ */

const STORAGE_KEY = "accountTracker_accounts";
const MS_24H      = 22 * 60 * 60 * 1000;

/* ── DOM refs ──────────────────────────────────────── */
const addBtn      = document.getElementById("addBtn");
const accountList = document.getElementById("accountList");
const emptyMsg    = document.getElementById("emptyMsg");
const summary     = document.getElementById("summary");
const notifBanner = document.getElementById("notifBanner");
const notifBtn    = document.getElementById("notifBtn");
const notifDismiss= document.getElementById("notifDismiss");

/* ── In-memory data  [ { id, username, password, level, xp, xpMax, lastCompleted } ] */
let accounts = [];

/* ── Active countdown intervals  { id: intervalId } */
let timers = {};

/* ═══════════════════════════════════════════════════════
   Browser Notifications
═══════════════════════════════════════════════════════ */
function checkNotifPermission() {
  if (!("Notification" in window)) {
    if (notifBanner) notifBanner.style.display = "none";
    return;
  }
  if (Notification.permission === "granted") {
    if (notifBanner) notifBanner.style.display = "none";
  } else if (Notification.permission === "denied") {
    if (notifBanner) notifBanner.style.display = "none";
  } else {
    // "default" — show banner
    if (notifBanner) notifBanner.style.display = "flex";
  }
}

function requestNotifPermission() {
  if (!("Notification" in window)) return;
  Notification.requestPermission().then(perm => {
    checkNotifPermission();
  });
}

function sendNotification(username) {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const label = username && username.trim() ? username.trim() : "An account";
  const notif = new Notification("⬡ Account Tracker", {
    body: `${label}'s cooldown is over — daily quest is ready!`,
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><text y='26' font-size='28'>⬡</text></svg>",
    tag:  "account-tracker-" + label,
    requireInteraction: false,
  });

  // Auto close after 6 seconds
  setTimeout(() => notif.close(), 6000);
}

/* ── Notification banner events ── */
if (notifBtn) {
  notifBtn.addEventListener("click", requestNotifPermission);
}
if (notifDismiss) {
  notifDismiss.addEventListener("click", () => {
    if (notifBanner) notifBanner.style.display = "none";
  });
}

/* ═══════════════════════════════════════════════════════
   localStorage helpers
═══════════════════════════════════════════════════════ */
function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    accounts = raw ? JSON.parse(raw) : [];
  } catch (e) {
    accounts = [];
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
}

function findById(id) {
  return accounts.find(a => a.id === id);
}

function updateField(id, fields) {
  const acc = findById(id);
  if (!acc) return;
  Object.assign(acc, fields);
  save();
}

/* ═══════════════════════════════════════════════════════
   Generate a unique ID
═══════════════════════════════════════════════════════ */
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/* ═══════════════════════════════════════════════════════
   Render everything
═══════════════════════════════════════════════════════ */
function renderAll() {
  // Stop all running timers
  Object.values(timers).forEach(clearInterval);
  timers = {};

  // Remove existing rows
  accountList.querySelectorAll(".row").forEach(el => el.remove());

  emptyMsg.style.display = accounts.length === 0 ? "" : "none";

  accounts.forEach(acc => {
    accountList.appendChild(buildRow(acc));
  });

  updateSummary();
}

/* ═══════════════════════════════════════════════════════
   Build one row DOM element
═══════════════════════════════════════════════════════ */
function buildRow(acc) {
  const { id, username, password, level, xp, xpMax, lastCompleted } = acc;

  const done   = isActivelyDone(acc);
  const xpSafe = xpMax > 0 ? xpMax : 1;
  const pct    = Math.min(100, Math.round((xp / xpSafe) * 100));

  /* ── outer wrapper ── */
  const row = document.createElement("div");
  row.className = "row" + (done ? " is-done" : "");
  row.dataset.id = id;

  const inner = document.createElement("div");
  inner.className = "row-inner";

  /* ── Username ── */
  const userCell = document.createElement("div");
  userCell.className = "cell-user";
  const userInput = el("input", { type: "text", value: username, placeholder: "username…" }, "field-input");
  debounceInput(userInput, val => updateField(id, { username: val }));
  userCell.appendChild(userInput);

  /* ── Password ── */
  const passCell = document.createElement("div");
  passCell.className = "cell-pass";
  const passInput = el("input", { type: "text", value: password, placeholder: "password…" }, "field-input");
  debounceInput(passInput, val => updateField(id, { password: val }));
  passCell.appendChild(passInput);

  /* ── Level / XP ── */
  const levelCell = document.createElement("div");
  levelCell.className = "cell-level";

  const labelRow = document.createElement("div");
  labelRow.className = "level-label";
  labelRow.innerHTML = `<span class="lv-val">Lv ${level}</span><span class="xp-val">${xp} / ${xpMax} XP</span>`;

  const track = document.createElement("div");
  track.className = "xp-track";
  const fill = document.createElement("div");
  fill.className = "xp-fill";
  fill.style.width = pct + "%";
  track.appendChild(fill);

  const inputsRow = document.createElement("div");
  inputsRow.className = "level-inputs";

  const lvInput = el("input", { type: "number", value: level, min: 1, max: 9999, placeholder: "Lv" }, "field-input");
  const sep1    = span("xp-sep", "XP:");
  const xpInput = el("input", { type: "number", value: xp,    min: 0,           placeholder: "XP" }, "field-input");
  const sep2    = span("xp-sep", "/");
  const mxInput = el("input", { type: "number", value: xpMax, min: 1,           placeholder: "Max" }, "field-input");

  function refreshLevel() {
    const lv = parseInt(lvInput.value) || 1;
    const cx = parseInt(xpInput.value) || 0;
    const mx = parseInt(mxInput.value) || 1;
    labelRow.innerHTML = `<span class="lv-val">Lv ${lv}</span><span class="xp-val">${cx} / ${mx} XP</span>`;
    fill.style.width = Math.min(100, Math.round((cx / mx) * 100)) + "%";
    updateField(id, { level: lv, xp: cx, xpMax: mx });
  }

  lvInput.addEventListener("input", refreshLevel);
  xpInput.addEventListener("input", refreshLevel);
  mxInput.addEventListener("input", refreshLevel);

  inputsRow.append(lvInput, sep1, xpInput, sep2, mxInput);
  levelCell.append(labelRow, track, inputsRow);

  /* ── Done checkbox ── */
  const doneCell = document.createElement("div");
  doneCell.className = "cell-done";
  const cb = document.createElement("input");
  cb.type = "checkbox";
  cb.className = "done-cb";
  cb.checked = done;
  cb.addEventListener("change", () => handleDone(id, cb.checked, row, timerCell));
  doneCell.appendChild(cb);

  /* ── Timer ── */
  const timerCell = document.createElement("div");
  timerCell.className = "cell-timer";

  if (done) {
    startTimer(id, lastCompleted, timerCell, row, cb);
  } else {
    timerCell.textContent = "—";
  }

  /* ── Delete button ── */
  const delCell = document.createElement("div");
  delCell.className = "cell-del";
  const delBtn = document.createElement("button");
  delBtn.className = "btn btn-remove";
  delBtn.textContent = "✕";
  delBtn.title = "Remove account";
  delBtn.addEventListener("click", () => removeAccount(id));
  delCell.appendChild(delBtn);

  inner.append(userCell, passCell, levelCell, doneCell, timerCell, delCell);
  row.appendChild(inner);
  return row;
}

/* ═══════════════════════════════════════════════════════
   Done toggle
═══════════════════════════════════════════════════════ */
function handleDone(id, checked, rowEl, timerEl) {
  if (checked) {
    const now = Date.now();
    updateField(id, { lastCompleted: now });
    rowEl.classList.add("is-done");
    startTimer(id, now, timerEl, rowEl, rowEl.querySelector(".done-cb"));
  } else {
    clearInterval(timers[id]);
    delete timers[id];
    updateField(id, { lastCompleted: null });
    rowEl.classList.remove("is-done");
    timerEl.textContent = "—";
    timerEl.className = "cell-timer";
  }
  updateSummary();
}

/* ═══════════════════════════════════════════════════════
   Countdown timer
═══════════════════════════════════════════════════════ */
function startTimer(id, compTime, timerEl, rowEl, cb) {
  function tick() {
    const remaining = MS_24H - (Date.now() - compTime);
    if (remaining <= 0) {
      clearInterval(timers[id]);
      delete timers[id];
      updateField(id, { lastCompleted: null });
      timerEl.textContent = "READY";
      timerEl.className = "cell-timer ready";
      cb.checked = false;
      rowEl.classList.remove("is-done");
      rowEl.classList.add("is-ready");
      updateSummary();

      // 🔔 Fire notification
      const acc = findById(id);
      sendNotification(acc ? acc.username : "");

      // Flash row
      rowEl.classList.add("notify-flash");
      setTimeout(() => rowEl.classList.remove("notify-flash"), 2000);

      return;
    }
    const h = Math.floor(remaining / 3_600_000);
    const m = Math.floor((remaining % 3_600_000) / 60_000);
    const s = Math.floor((remaining % 60_000) / 1_000);
    timerEl.textContent = `${pad(h)}:${pad(m)}:${pad(s)}`;
    timerEl.className = "cell-timer active" + (remaining < 3_600_000 ? " urgent" : "");
  }
  tick();
  timers[id] = setInterval(tick, 1000);
}

/* ═══════════════════════════════════════════════════════
   Add / Remove
═══════════════════════════════════════════════════════ */
addBtn.addEventListener("click", () => {
  const acc = {
    id:            uid(),
    username:      "",
    password:      "",
    level:         1,
    xp:            0,
    xpMax:         5000,
    lastCompleted: null
  };
  accounts.push(acc);
  save();

  // Append just the new row (avoid full re-render / timer reset)
  emptyMsg.style.display = "none";
  accountList.appendChild(buildRow(acc));
  updateSummary();

  // Auto-focus the username field of the new row
  const newRow = accountList.lastElementChild;
  const firstInput = newRow && newRow.querySelector("input[type=text]");
  if (firstInput) firstInput.focus();
});

function removeAccount(id) {
  clearInterval(timers[id]);
  delete timers[id];
  accounts = accounts.filter(a => a.id !== id);
  save();
  const rowEl = accountList.querySelector(`.row[data-id="${id}"]`);
  if (rowEl) rowEl.remove();
  emptyMsg.style.display = accounts.length === 0 ? "" : "none";
  updateSummary();
}

/* ═══════════════════════════════════════════════════════
   Summary counter
═══════════════════════════════════════════════════════ */
function updateSummary() {
  const done  = accounts.filter(isActivelyDone).length;
  const total = accounts.length;
  summary.textContent = `${done} / ${total} done`;
}

/* ═══════════════════════════════════════════════════════
   Helpers
═══════════════════════════════════════════════════════ */
function isActivelyDone(acc) {
  return acc.lastCompleted !== null &&
         acc.lastCompleted !== undefined &&
         (Date.now() - acc.lastCompleted) < MS_24H;
}

function pad(n) { return String(n).padStart(2, "0"); }

function el(tag, attrs = {}, className = "") {
  const node = document.createElement(tag);
  if (className) node.className = className;
  Object.entries(attrs).forEach(([k, v]) => {
    if (v !== undefined && v !== null) node[k] = v;
  });
  return node;
}

function span(className, text) {
  const s = document.createElement("span");
  s.className = className;
  s.textContent = text;
  return s;
}

// Debounce input → save after 500 ms of inactivity
function debounceInput(inputEl, callback) {
  let t;
  inputEl.addEventListener("input", () => {
    clearTimeout(t);
    t = setTimeout(() => callback(inputEl.value), 500);
  });
}

/* ═══════════════════════════════════════════════════════
   Boot
═══════════════════════════════════════════════════════ */
load();
renderAll();
checkNotifPermission();