/* =====================
  Блок: Константи та змінні
===================== */
const DAY = 86400000;
const STORAGE_KEY = "ee-cards-html";
const NEW_WORDS_PER_DAY = 10;

let reverse = false;
let selectedTopic = null;
let cards = [];

/* =====================
  Блок: Заповнення списку тем
===================== */
function populateTopicSelector() {
  const selector = document.getElementById("topics");
  Object.keys(BASE_WORDS).forEach((topic) => {
    const option = document.createElement("option");
    option.value = topic;
    option.textContent = topic;
    selector.appendChild(option);
  });
}

// Виклик при завантаженні сторінки
populateTopicSelector();
/* =====================
  Блок: Dark mode
===================== */
const THEME_KEY = "ee-theme";

function loadTheme() {
  const theme = localStorage.getItem(THEME_KEY);
  if (theme === "dark") {
    document.body.classList.add("dark");
    themeBtn.textContent = "☀️";
  }
}

function toggleTheme() {
  document.body.classList.toggle("dark");
  const isDark = document.body.classList.contains("dark");
  localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
  themeBtn.textContent = isDark ? "☀️" : "🌙";
}

loadTheme();

/* =====================
  Блок: Вибір теми та завантаження карток
===================== */
function selectTopic(topic) {
  selectedTopic = topic;

  // Завантажуємо збережені дані для цієї теми
  const saved =
    JSON.parse(localStorage.getItem(`${STORAGE_KEY}-${topic}`)) || [];

  // Створюємо нові картки з BASE_WORDS
  const topicCards = BASE_WORDS[topic].map(([q, a]) => ({
    q,
    a,
    interval: 1,
    ease: 2.5,
    due: Date.now() + 1, // щоб нові картки не були відразу overdue
    seen: false,
    attempts: 0,
    correct: 0,
  }));

  // Об’єднуємо збережене і нові картки
  cards = topicCards.map(
    (tc) => saved.find((c) => c.q === tc.q && c.a === tc.a) || tc
  );

  cards = shuffle(cards);
  save();
  render();
}

/* =====================
  Блок: Збереження та тасування
===================== */
function save() {
  if (!selectedTopic) return;
  localStorage.setItem(
    `${STORAGE_KEY}-${selectedTopic}`,
    JSON.stringify(cards)
  );
}
function shuffle(arr) {
  return arr.sort(() => Math.random() - 0.5);
}

/* =====================
  Блок: Картки для повторення
===================== */
function dueCards() {
  const now = Date.now();
  const overdue = cards.filter((c) => c.due <= now);
  const newCards = cards.filter((c) => !c.seen && c.due > now);
  return [...overdue, ...newCards.slice(0, NEW_WORDS_PER_DAY)];
}
function currentCard() {
  return dueCards()[0];
}
/* =====================
  Блок: Leech detection
===================== */
function isLeech(card) {
  return card.ease < 1.6;
}

/* =====================
  Блок: Рендер картки
===================== */
function render() {
  const card = currentCard();
  const questionDiv = document.getElementById("question");
  const answerDiv = document.getElementById("answer");

  // скидаємо переворот при новій картці
  const flip = document.getElementById("flipCard");
  if (flip) flip.classList.remove("flipped");

  if (!card) {
    questionDiv.textContent = "🎉 На сьогодні все!";

    answerDiv.classList.remove("show");
    updateStats();
    updateProgress();
    return;
  }

  const isDifficult = card.ease < 1.6;
  questionDiv.innerHTML = reverse ? card.a : card.q;
  /* =====================
  Блок: Leech highlight
  ===================== */
  if (isLeech(card)) {
    questionDiv.classList.add("difficult");
  } else {
    questionDiv.classList.remove("difficult");
  }

  answerDiv.innerHTML = reverse ? card.q : card.a;
  answerDiv.classList.remove("show");

  if (isDifficult) questionDiv.classList.add("difficult");
  else questionDiv.classList.remove("difficult");

  updateStats();
  updateProgress();
}

/* =====================
  Блок: Flip card
===================== */
function toggleAnswer() {
  const flip = document.getElementById("flipCard");
  flip.classList.toggle("flipped");
}

/* =====================
  Блок: Оцінка картки (повторення)
===================== */
function grade(score) {
  const card = currentCard();
  if (!card) return;

  card.seen = true;
  card.attempts = (card.attempts || 0) + 1;
  if (score >= 2) card.correct = (card.correct || 0) + 1;

  if (score === 0)
    (card.interval = 1), (card.ease = Math.max(1.3, card.ease - 0.2));
  if (score === 1)
    (card.interval *= 1.2), (card.ease = Math.max(1.3, card.ease - 0.15));
  if (score === 2) card.interval *= card.ease;
  if (score === 3) (card.interval *= card.ease + 0.3), (card.ease += 0.1);

  card.interval = Math.round(card.interval);
  card.due = Date.now() + card.interval * DAY;
  const history = loadHistory();

  history.push({
    time: Date.now(),
    score,
  });

  saveHistory(history);
  save();
  render();
}

/* =====================
  Блок: Статистика по днях
===================== */
function updateStats() {
  const history = loadHistory();
  const now = new Date();

  // допоміжна функція: чи один і той самий день
  function isSameDay(d1, d2) {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  }

  let today = 0;
  let yesterday = 0;
  let last7 = 0;

  let todayCorrect = 0;
  let todayWrong = 0;

  history.forEach((entry) => {
    const d = new Date(entry.time);

    // сьогодні
    if (isSameDay(d, now)) {
      today++;

      if (entry.score >= 2) todayCorrect++;
      else todayWrong++;
    }

    // вчора
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    if (isSameDay(d, y)) {
      yesterday++;
    }

    // останні 7 днів
    const diffDays = (now - d) / 86400000;
    if (diffDays <= 7) {
      last7++;
    }
  });
  const leechCount = leechTodayCount();
  stats.textContent = `🧠 Складні сьогодні: ${leechCount}
📅 Сьогодні: ${today} (${todayCorrect} ✔️ / ${todayWrong} ❌)
Вчора: ${yesterday}
7 днів: ${last7}`;
}

/* =====================
  Блок: Прогресбар
===================== */
function updateProgress() {
  const progressFill = document.getElementById("progressFill");
  const total = cards.length;
  const learned = cards.filter((c) => c.seen).length;
  const percent = total ? Math.round((learned / total) * 100) : 0;
  progressFill.style.width = percent + "%";
}

/* =====================
  Блок: Експорт/Імпорт прогресу
===================== */
function exportProgress() {
  const data = { exportedAt: new Date().toISOString(), cards };
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${selectedTopic || "progress"}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importProgress(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const imported = JSON.parse(e.target.result);
    if (imported.cards) {
      cards = imported.cards;
      save();
      render();
    }
  };
  reader.readAsText(file);
}
/* =====================
  Блок: Історія відповідей
===================== */
const HISTORY_KEY = "ee-history";

function loadHistory() {
  return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
}

function saveHistory(history) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}
/* =====================
  Блок: Leech detection
===================== */
function isLeech(card) {
  return card.ease < 1.6;
}
/* =====================
  Блок: Leech stats
===================== */
function leechTodayCount() {
  const history = loadHistory();
  const today = new Date();

  return history.filter((h) => {
    const d = new Date(h.time);
    return (
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate() &&
      h.score < 2
    );
  }).length;
}

/* =====================
  Блок: Керування клавішами
===================== */
document.addEventListener("keydown", (e) => {
  if (e.key.toLowerCase() === "r") {
    reverse = !reverse;
    render();
  }
});
