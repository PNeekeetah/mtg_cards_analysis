let cards = {};
let ratings = {};
let stats = [];
let cardList = []; // all cards
let currentIdx = 0;

const GRADE_TO_KEY = { 'S': '1', 'A': '2', 'B': '3', 'C': '4', 'D': '5', 'E': '6' };
const KEY_TO_GRADE = { '1': 'S', '2': 'A', '3': 'B', '4': 'C', '5': 'D', '6': 'E' };

function getColorKey(colors) {
  if (!colors || colors.length === 0) return "C"; // colorless
  return colors.sort().join("");
}

function sortCards(cards) {
  return Object.keys(cards).sort((a, b) => {
    const cardA = cards[a];
    const cardB = cards[b];
    
    // First by color identity
    const colorA = getColorKey(cardA.colors);
    const colorB = getColorKey(cardB.colors);
    if (colorA !== colorB) return colorA.localeCompare(colorB);
    
    // Then by type
    if (cardA.type !== cardB.type) return cardA.type.localeCompare(cardB.type);
    
    // Then by mana cost
    return cardA.cmc - cardB.cmc;
  });
}

function toTitleCase(str) {
  return str.toLowerCase().replace(/\\b\\w/g, l => l.toUpperCase());
}

async function init() {
  const res = await fetch("/cards");
  const data = await res.json();

  ratings = data.ratings;
  cards = data.cards;
  stats = data.stats;

  // Build sorted list of all cards
  cardList = sortCards(cards);
  currentIdx = 0;
  
  updateUI();
  setupKeyboardShortcuts();
}

function findNextCard() {
  if (currentIdx >= cardList.length) {
    currentIdx = 0; // loop back
  }
  return currentIdx;
}

function showCard() {
  const idx = findNextCard();
  const cardName = cardList[idx];
  const card = cards[cardName];

  document.getElementById("cardName").innerText = toTitleCase(cardName);
  document.getElementById("cardType").innerText = card.typeLine || "";
  document.getElementById("cardImg").src = card.image || "";
  
  const currentRating = ratings[cardName];
  document.getElementById("cardRating").innerText = currentRating || "U";
  
  updateProgress();
  updateRatingButtons();
}

function updateProgress() {
  const ratedCount = Object.values(ratings).filter(r => r !== null && r !== undefined).length;
  const totalCount = Object.keys(cards).length;
  document.getElementById("progress").innerText = `${ratedCount} / ${totalCount}`;
}

function updateRatingButtons() {
  const currentCardName = cardList[findNextCard()];
  const currentRating = currentCardName ? ratings[currentCardName] : null;

  ['S', 'A', 'B', 'C', 'D', 'E'].forEach(grade => {
    const btn = document.querySelector(`.rating-btn:nth-child(${grade === 'S' ? 1 : grade === 'A' ? 2 : grade === 'B' ? 3 : grade === 'C' ? 4 : grade === 'D' ? 5 : 6})`); 
    if (currentRating === grade) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

function updateStatsList() {
  const statsList = document.getElementById("statsList");
  statsList.innerHTML = "";
  stats.forEach(s => {
    const div = document.createElement("div");
    div.className = "stat-group";
    div.innerText = `${s.type} ${s.color}: ${s.rated}/${s.total}`;
    
    const progressBar = document.createElement("div");
    progressBar.className = "progress-bar";
    const progressFill = document.createElement("div");
    progressFill.className = "progress-fill";
    progressFill.style.width = `${(s.rated / s.total) * 100}%`;
    progressBar.appendChild(progressFill);
    div.appendChild(progressBar);
    
    statsList.appendChild(div);
  });
}

function updateUI() {
  showCard();
  updateStatsList();
}

async function rate(grade) {
  const idx = findNextCard();
  const cardName = cardList[idx];
  ratings[cardName] = grade;

  // Show the rating immediately
  document.getElementById("cardRating").innerText = grade;

  const res = await fetch("/rate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ card: cardName, grade })
  });
  const data = await res.json();
  stats = data.stats;

  // Move to next card after a short delay
  setTimeout(() => {
    currentIdx++;
    if (currentIdx >= cardList.length) currentIdx = 0; // loop back
    updateUI();
  }, 500);
}

function skip() {
  currentIdx++;
  updateUI();
}

function prev() {
  currentIdx--;
  if (currentIdx < 0) currentIdx = cardList.length - 1;
  updateUI();
}

function setupKeyboardShortcuts() {
  document.addEventListener("keydown", (e) => {
    if (KEY_TO_GRADE[e.key]) {
      const grade = KEY_TO_GRADE[e.key];
      rate(grade);
    }
  });
}

init();