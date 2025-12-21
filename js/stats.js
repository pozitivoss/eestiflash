/* =====================
  Stats page logic
===================== */

const HISTORY_KEY = "ee-history";

function loadHistory() {
  return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
}

function renderStats() {
  const history = loadHistory();
  const overview = document.getElementById("statsOverview");
  const daily = document.getElementById("dailyStats");

  if (history.length === 0) {
    overview.textContent = "Поки що немає статистики 🙂";
    return;
  }

  // ---- загальна статистика
  const total = history.length;
  const correct = history.filter((h) => h.score >= 2).length;
  const accuracy = Math.round((correct / total) * 100);

  overview.innerHTML = `
    📈 Всього відповідей: ${total}<br>
    ✔️ Правильних: ${correct}<br>
    🎯 Точність: ${accuracy}%
  `;

  // ---- статистика по днях
  const days = {};

  history.forEach((h) => {
    const d = new Date(h.time).toLocaleDateString("uk-UA");
    days[d] = (days[d] || 0) + 1;
  });

  daily.innerHTML = "<b>По днях:</b><br>";

  Object.entries(days)
    .reverse()
    .forEach(([day, count]) => {
      daily.innerHTML += `📅 ${day}: ${count}<br>`;
    });
}

renderStats();
