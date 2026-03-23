let cards = {};
let ratings = {};
let stats = [];
let cardList = []; // all cards
let currentIdx = 0;

const GRADE_TO_KEY = { 'S': '1', 'A': '2', 'B': '3', 'C': '4', 'D': '5', 'E': '6' };
const KEY_TO_GRADE = { '1': 'S', '2': 'A', '3': 'B', '4': 'C', '5': 'D', '6': 'E' };

const manaIcons = {
  W: "https://svgs.scryfall.io/card-symbols/W.svg",
  U: "https://svgs.scryfall.io/card-symbols/U.svg",
  B: "https://svgs.scryfall.io/card-symbols/B.svg",
  R: "https://svgs.scryfall.io/card-symbols/R.svg",
  G: "https://svgs.scryfall.io/card-symbols/G.svg",
  C: "https://svgs.scryfall.io/card-symbols/C.svg"
};

function getManaHTML(colorString) {
  if (!colorString) return "";

  return colorString.split("").map(c => {
    return `<img class="mana-icon" src="${manaIcons[c]}" />`;
  }).join("");
}

const colorOrder = {
  W: 0,
  U: 1,
  B: 2,
  R: 3,
  G: 4,
  C: 5,

  WU: 6,
  WB: 7,
  WR: 8,
  WG: 9,
  UB: 10,
  UR: 11,
  UG: 12,
  BR: 13,
  BG: 14,
  RG: 15,

  WUB: 16,
  UBR: 17,
  BRG: 18,
  RGW: 19,
  GWU: 20,

  WBG: 21,
  WRG: 22,
  WUR: 23,
  UBG: 24,
  URG: 25,

  WUBR: 26,
  UBRG: 27,
  BRGW: 28,
  RGWU: 29,
  GWUB: 30,

  WUBRG: 31
};

function getColorKey(colors) {
  if (!colors || colors.length === 0) return "C";

  return colors
    .slice()
    .sort((a, b) => {
      const orderA = colorOrder[a] ?? 99;
      const orderB = colorOrder[b] ?? 99;
      return orderA - orderB;
    })
    .join("");
}

function sortCards(cards) {
  return Object.keys(cards).sort((a, b) => {
    const cardA = cards[a];
    const cardB = cards[b];
    
    const colorA = getColorKey(cardA.colors);
    const colorB = getColorKey(cardB.colors);

    if (colorA !== colorB) {
      return (colorOrder[colorA] ?? 99) - (colorOrder[colorB] ?? 99);
    }

    if (cardA.type !== cardB.type) {
      return cardA.type.localeCompare(cardB.type);
    }

    return cardA.cmc - cardB.cmc;
  });
}

function toTitleCase(str) {
  return str.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
}

async function init() {
  const res = await fetch("/cards");
  const data = await res.json();

  ratings = data.ratings;
  cards = data.cards;
  stats = data.stats;

  cardList = sortCards(cards);
  currentIdx = 0;
  
  updateUI();
  setupKeyboardShortcuts();
}

function findNextCard() {
  if (currentIdx >= cardList.length) {
    currentIdx = 0;
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
  
  stats.sort((a, b) => {
    const keyA = getColorKey(a.color.split(""));
    const keyB = getColorKey(b.color.split(""));

    const colorA = colorOrder[keyA] ?? 99;
    const colorB = colorOrder[keyB] ?? 99;

    if (colorA !== colorB) return colorA - colorB;
    return a.type.localeCompare(b.type);
  });
  
  stats.forEach(s => {
    const div = document.createElement("div");
    div.className = "stat-group";

    const manaHTML = getManaHTML(s.color);

    div.innerHTML = `
      ${manaHTML}
      ${s.type}: ${s.rated}/${s.total}
    `;
    
    div.style.cursor = "pointer";

    div.addEventListener("click", () => {
      jumpToUnratedCard(s.type, s.color);
    });
    
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

  document.getElementById("cardRating").innerText = grade;

  const res = await fetch("/rate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ card: cardName, grade })
  });

  const data = await res.json();
  stats = data.stats;

  setTimeout(() => {
    currentIdx++;
    if (currentIdx >= cardList.length) currentIdx = 0;
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

function jumpToUnratedCard(type, color) {

  const normalizedColor = getColorKey(color.split(""));

  for (let i = 0; i < cardList.length; i++) {
    const cardName = cardList[i];
    const card = cards[cardName];
    const cardColor = getColorKey(card.colors);

    if (
      card.type === type &&
      cardColor === normalizedColor &&
      (ratings[cardName] === null || ratings[cardName] === undefined)
    ) {
      currentIdx = i;
      updateUI();
      return;
    }
  }

  for (let i = 0; i < cardList.length; i++) {
    const cardName = cardList[i];
    const card = cards[cardName];
    const cardColor = getColorKey(card.colors);

    if (card.type === type && cardColor === normalizedColor) {
      currentIdx = i;
      updateUI();
      return;
    }
  }
}

init();