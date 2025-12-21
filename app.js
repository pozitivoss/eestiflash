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
  Блок: Вибір теми
===================== */
function selectTopic(topic) {
  selectedTopic = topic;
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

  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
}
function shuffle(arr) {
  return arr.sort(() => Math.random() - 0.5);
}

/* =====================
  Блок: Картки для повторення (оновлений)
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
  Блок: Рендер картки
===================== */
function render() {
  const card = currentCard();
  const questionDiv = document.getElementById("question");
  const answerDiv = document.getElementById("answer");

  if (!card) {
    questionDiv.textContent = "🎉 На сьогодні все!";
    answerDiv.classList.remove("show");
    updateStats();
    updateProgress();
    return;
  }

  const isDifficult = card.ease < 1.6;
  questionDiv.innerHTML = reverse ? card.a : card.q;
  answerDiv.innerHTML = reverse ? card.q : card.a;
  answerDiv.classList.remove("show");

  if (isDifficult) questionDiv.classList.add("difficult");
  else questionDiv.classList.remove("difficult");

  updateStats();
  updateProgress();
}

/* =====================
  Блок: Показати/Сховати відповідь
===================== */
function toggleAnswer() {
  const card = currentCard();
  const answerDiv = document.getElementById("answer");
  if (!card) {
    answerDiv.classList.remove("show");
    return;
  }
  answerDiv.classList.toggle("show");
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

  save();
  render();
}

/* =====================
  Блок: Статистика з підсвіткою
===================== */
function updateStats() {
  const total = cards.length;
  const learned = cards.filter((c) => c.seen).length;
  const today = dueCards().length;
  const correct = cards.filter((c) => c.seen && c.interval > 1).length;
  const percent = total ? Math.round((correct / total) * 100) : 0;

  // Основна статистика
  stats.textContent = `📚 Всього: ${total} | ✔️ Вивчено: ${learned} | ⏱ Сьогодні: ${today} | ✅ ${percent}% правильних`;

  // Детальна статистика по словах (тільки переглянуті картки)
  let wordStatsHTML = "<br><b>Детальна статистика по словах:</b><br>";
  cards
    .filter((c) => c.seen)
    .forEach((c) => {
      const attempts = c.attempts || 0;
      const correctCount = c.correct || 0;
      const wordPercent = attempts
        ? Math.round((correctCount / attempts) * 100)
        : 0;

      // Визначаємо колір
      let color = "red";
      if (wordPercent > 70) color = "green";
      else if (wordPercent >= 40) color = "orange";

      wordStatsHTML += `<span style="color:${color}">${c.q} → ${c.a}: ${correctCount}/${attempts} ✅ (${wordPercent}%)</span><br>`;
    });

  stats.innerHTML = stats.textContent + wordStatsHTML;
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
  Блок: Керування клавішами
===================== */
document.addEventListener("keydown", (e) => {
  if (e.key.toLowerCase() === "r") {
    reverse = !reverse;
    render();
  }
});
