const fs = require("fs");
const express = require("express");
const { chain } = require("stream-chain");
const { parser } = require("stream-json");
const { streamArray } = require("stream-json/streamers/stream-array.js");

const app = express();
app.use(express.json());
app.use(express.static("public"));

const PRICE_FILE = "prices/reduced_card_index.json";
const RATING_FILE = "ratings.json";

// Parse type_line to extract main card type
function parseCardType(typeLine) {
  if (!typeLine) return "Other";
  
  // Get the part before the em-dash (the type part)
  const typePartOnly = typeLine.split('—')[0].trim();
  
  // Remove "Legendary" prefix as it doesn't change the type
  const normalized = typePartOnly.replace(/^Legendary\s+/, '');
  
  // Check for types - note: Artifact Creature should be treated as Creature
  if (normalized.includes("Artifact") && normalized.includes("Creature")) return "Creature";
  if (normalized.includes("Battle")) return "Battle";
  if (normalized.includes("Sorcery")) return "Sorcery";
  if (normalized.includes("Instant")) return "Instant";
  if (normalized.includes("Planeswalker")) return "Planeswalker";
  if (normalized.includes("Enchantment")) return "Enchantment";
  if (normalized.includes("Artifact")) return "Artifact";
  if (normalized.includes("Creature")) return "Creature";
  if (normalized.includes("Land")) return "Land";
  if (normalized.includes("Dungeon")) return "Dungeon";
  if (normalized.includes("Conspiracy")) return "Conspiracy";
  
  return "Other";
}

// Load ratings from file, ensuring all cards have an entry
function loadRatings(cardNames) {
  let ratings = {};
  if (fs.existsSync(RATING_FILE)) {
    ratings = JSON.parse(fs.readFileSync(RATING_FILE));
  }

  // Initialize missing ratings
  for (const cardName of cardNames) {
    if (!(cardName in ratings)) ratings[cardName] = null; // default unrated
  }

  fs.writeFileSync(RATING_FILE, JSON.stringify(ratings, null, 2));
  return ratings;
}

// Load card data from reduced index
async function loadCardData() {
  return new Promise((resolve, reject) => {
    const cards = {};
    const pipeline = chain([
      fs.createReadStream(PRICE_FILE),
      parser(),
      streamArray()
    ]);

    pipeline.on("data", ({ value }) => {
      const obj = value;
      if (!obj.name) return;

      let img = null;
      if (obj.image_uris) img = obj.image_uris.large;
      else if (obj.card_faces && obj.card_faces[0]?.image_uris)
        img = obj.card_faces[0].image_uris.large;

      cards[obj.name] = {
        name: obj.name,
        type: parseCardType(obj.type_line || ""),
        typeLine: obj.type_line || "",
        cmc: obj.cmc ?? 0,
        colors: obj.colors || [],
        image: img || ""
      };
    });

    pipeline.on("end", () => resolve(cards));
    pipeline.on("error", reject);
  });
}

// Update card rating with letter grade
function updateRating(ratings, cardName, grade) {
  if (["S", "A", "B", "C", "D", "E"].includes(grade)) {
    ratings[cardName] = grade;
    fs.writeFileSync(RATING_FILE, JSON.stringify(ratings, null, 2));
  }
}

// Build statistics of cards per type and color
function buildCardStats(cards, ratings) {
  const stats = {};
  
  for (const card of Object.values(cards)) {
    const typeKey = card.type;
    const colorKey = card.colors.length ? card.colors.sort().join("") : "C"; // C = colorless
    const key = `${typeKey}|${colorKey}`;
    
    if (!stats[key]) {
      stats[key] = {
        type: typeKey,
        color: colorKey,
        total: 0,
        rated: 0
      };
    }
    
    stats[key].total++;
    
    if (ratings[card.name] !== null && ratings[card.name] !== undefined) {
      stats[key].rated++;
    }
  }
  
  return Object.values(stats).map(s => ({
    ...s,
    remaining: s.total - s.rated
  }));
}

(async () => {
  console.log("Starting server...");
  let cards = {};
  let ratings = {};
  let stats = [];
  try {
    cards = await loadCardData();
    console.log("Loaded", Object.keys(cards).length, "cards");
    const cardNames = Object.keys(cards);
    ratings = loadRatings(cardNames);
    console.log("Loaded ratings for", Object.keys(ratings).length, "cards");
    stats = buildCardStats(cards, ratings);
    console.log("Built stats");
  } catch (error) {
    console.error("Error loading data:", error);
    return;
  }

  app.get("/cards", (req, res) => {
    res.json({ ratings, cards, stats });
  });

  app.post("/rate", (req, res) => {
    const { card, grade } = req.body;
    updateRating(ratings, card, grade);
    // Rebuild stats after rating update
    const updatedStats = buildCardStats(cards, ratings);
    res.json({ ok: true, stats: updatedStats });
  });

  console.log("Server starting on port 3000");
  app.listen(3000, () => console.log("Server running: http://localhost:3000"));
})();