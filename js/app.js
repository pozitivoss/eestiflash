/* =====================
  Константи
===================== */
const DAY = 86400000;
const STORAGE_KEY = "ee-cards-html";
const HISTORY_KEY = "ee-history";
const NEW_WORDS_PER_DAY = 10;

/* =====================
  Глобальний стан
===================== */
let reverse = false;
let selectedTopic = null;

let cards = [];
let repeatQueue = [];
let repeatMode = false;

/* =====================
  Ініціалізація тем
===================== */
function populateTopicSelector() {
  const selector = document.getElementById("topics");
  selector.innerHTML = `<option disabled selected>📚 Оберіть тему</option>`;

  Object.keys(BASE_WORDS).forEach(topic => {
    const option = document.createElement("option");
    option.value = topic;
    option.textContent = topic;
    selector.appendChild(option);
  });
}

populateTopicSelector();

/* =====================
  Вибір теми
===================== */
function selectTopic(topic) {
  selectedTopic = topic;

  const saved =
    JSON.parse(localStorage.getItem(`${STORAGE_KEY}-${topic}`)) || [];

  const base = BASE_WORDS[topic].map(([q, a]) => ({
    q,
    a,
    interval: 1,
    ease: 2.5,
    due: Date.now(),
    seen: false,
    attempts: 0,
    correct: 0,
    lastSeen: null,
  }));

  cards = base.map(
    c => saved.find(s => s.q === c.q && s.a === c.a) || c
  );

  shuffle(cards);
  save();
  render();
}

/* =====================
  Збереження
===================== */
function save() {
  if (!selectedTopic) return;
  localStorage.setItem(
    `${STORAGE_KEY}-${selectedTopic}`,
    JSON.stringify(cards)
  );
}

/* =====================
  Утиліти
===================== */
function shuffle(arr) {
  return arr.sort(() => Math.random() - 0.5);
}

/* =====================
  Блок: Dark mode
===================== */
document.addEventListener("DOMContentLoaded", () => {
  const themeBtn = document.getElementById("themeBtn");
  if (!themeBtn) return;

  const THEME_KEY = "ee-theme";

  function loadTheme() {
    const theme = localStorage.getItem(THEME_KEY);
    if (theme === "dark") {
      document.body.classList.add("dark");
      themeBtn.textContent = "☀️";
    } else {
      document.body.classList.remove("dark");
      themeBtn.textContent = "🌙";
    }
  }

  function toggleTheme() {
    document.body.classList.toggle("dark");
    const isDark = document.body.classList.contains("dark");
    localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
    themeBtn.textContent = isDark ? "☀️" : "🌙";
  }

  themeBtn.addEventListener("click", toggleTheme);

  loadTheme();
});
/* =====================
  Черга карток
===================== */
function dueCards() {
  const now = Date.now();

  const overdue = cards.filter(c => c.due <= now);
  const fresh = cards.filter(c => !c.seen);

  return [...overdue, ...fresh.slice(0, NEW_WORDS_PER_DAY)];
}

function currentCard() {
  if (repeatMode) return repeatQueue[0] || null;
  return dueCards()[0] || null;
}

/* =====================
  Repeat Today
===================== */
function repeatToday() {
  const today = new Date().setHours(0, 0, 0, 0);

  repeatQueue = cards.filter(
    c => c.lastSeen && c.lastSeen >= today
  );

  if (!repeatQueue.length) {
    alert("Немає слів для повторення сьогодні 🙂");
    return;
  }

  repeatMode = true;
  render();
}

/* =====================
  Repeat Difficult
===================== */
function repeatDifficult() {
  repeatQueue = cards.filter(c =>
    c.attempts >= 3 && (c.correct / c.attempts) < 0.6
  );

  if (!repeatQueue.length) {
    alert("Немає складних слів 🎉");
    return;
  }

  repeatMode = true;
  render();
}

function exitRepeat() {
  repeatMode = false;
  repeatQueue = [];
  render();
}

/* =====================
  Рендер
===================== */
function render() {
  const card = currentCard();
  const q = document.getElementById("question");
  const a = document.getElementById("answer");

  if (!card) {
    q.textContent = "🎉 На сьогодні все!";
    a.classList.remove("show");
    updateStats();
    updateProgress();
    return;
  }

  q.textContent = reverse ? card.a : card.q;
  a.textContent = reverse ? card.q : card.a;
  a.classList.remove("show");

  if (isLeech(card)) q.classList.add("difficult");
  else q.classList.remove("difficult");

  updateStats();
  updateProgress();
}

/* =====================
  Flip
===================== */
function toggleAnswer() {
  const inner = document.querySelector("#flipCard .flip-inner");
  if(inner) inner.classList.toggle("flipped");
}

/* =====================
  Оцінка
===================== */
function grade(score) {
  const card = currentCard();
  if (!card) return;

  card.seen = true;
  card.lastSeen = Date.now();
  card.attempts++;
  if (score >= 2) card.correct++;

  if (score === 0) {
    card.interval = 1;
    card.ease = Math.max(1.3, card.ease - 0.2);
  }
  if (score === 1) {
    card.interval *= 1.2;
    card.ease = Math.max(1.3, card.ease - 0.15);
  }
  if (score === 2) card.interval *= card.ease;
  if (score === 3) {
    card.interval *= card.ease + 0.3;
    card.ease += 0.1;
  }

  card.interval = Math.round(card.interval);
  card.due = Date.now() + card.interval * DAY;

  saveHistory(score);

  if (repeatMode) {
    repeatQueue.shift();
    if (!repeatQueue.length) exitRepeat();
  }

  save();
  render();
}

/* =====================
  History
===================== */
function loadHistory() {
  return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
}

function saveHistory(score) {
  const history = loadHistory();
  history.push({ time: Date.now(), score });
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

/* =====================
  Stats
===================== */
function updateStats() {
  const history = loadHistory();
  const today = new Date().setHours(0, 0, 0, 0);

  const todayStats = history.filter(h => h.time >= today);
  const correct = todayStats.filter(h => h.score >= 2).length;
  const wrong = todayStats.length - correct;

  stats.textContent =
    `📅 Сьогодні: ${todayStats.length} (${correct} ✔️ / ${wrong} ❌)
🧠 Складні: ${cards.filter(isLeech).length}`;
}

/* =====================
  Progress
===================== */
function updateProgress() {
  const fill = document.getElementById("progressFill");
  const learned = cards.filter(c => c.seen).length;
  fill.style.width = Math.round((learned / cards.length) * 100) + "%";
}

/* =====================
  Leech
===================== */
function isLeech(card) {
  return card.attempts >= 3 && (card.correct / card.attempts) < 0.6;
}

/* =====================
  Keys
===================== */
document.addEventListener("keydown", e => {
  if (e.key.toLowerCase() === "r") {
    reverse = !reverse;
    render();
  }
});
document.getElementById("flipCard").classList.toggle("flipped")