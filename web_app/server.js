const fs = require("fs");
const express = require("express");
const { chain } = require("stream-chain");
const { parser } = require("stream-json");
const { streamArray } = require("stream-json/streamers/stream-array.js");

const app = express();
app.use(express.json());
app.use(express.static("public"));

const CARD_FILE = "cards.txt";
const PRICE_FILE = "prices/prices_2026-01-07.json";
const RATING_FILE = "ratings.json";

// Load unique cards
function loadCards() {
  const raw = fs.readFileSync(CARD_FILE, "utf8")
    .split("\n")
    .map(x => x.trim())
    .filter(Boolean);

  const unique = [...new Set(raw)];

  let ratings = {};
  if (fs.existsSync(RATING_FILE)) {
    ratings = JSON.parse(fs.readFileSync(RATING_FILE));
  }

  for (const c of unique) {
    if (!(c in ratings)) ratings[c] = 1000; // default ELO score
  }

  fs.writeFileSync(RATING_FILE, JSON.stringify(ratings, null, 2));
  return ratings;
}

// Load card data including type, cmc, color, and images
async function loadCardData(cardSet) {
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
      if (!cardSet.has(obj.name)) return;

      let img = null;
      if (obj.image_uris) img = obj.image_uris.large;
      else if (obj.card_faces && obj.card_faces[0]?.image_uris)
        img = obj.card_faces[0].image_uris.large;

      cards[obj.name] = {
        name: obj.name,
        type: obj.type_line || "",
        cmc: obj.cmc ?? 0,
        colors: obj.colors || [],
        image: img || ""
      };

      if (Object.keys(cards).length === cardSet.size) {
        pipeline.destroy();
        resolve(cards);
      }
    });

    pipeline.on("end", () => resolve(cards));
    pipeline.on("error", reject);
  });
}

// ELO update
function updateElo(ratings, winner, loser, k = 20) {
  const Ra = ratings[winner];
  const Rb = ratings[loser];
  const Ea = 1 / (1 + Math.pow(10, (Rb - Ra) / 400));
  const Eb = 1 / (1 + Math.pow(10, (Ra - Rb) / 400));
  ratings[winner] = Ra + k * (1 - Ea);
  ratings[loser] = Rb + k * (0 - Eb);
  fs.writeFileSync(RATING_FILE, JSON.stringify(ratings, null, 2));
}

function bucketKey(card) {
  // For multiple colors, we sort alphabetically
  const colorKey = card.colors.length ? card.colors.sort().join("") : "C"; // C = colorless
  return `${card.type}|${card.cmc}|${colorKey}`;
}

function buildBuckets(cards) {
  const buckets = {};
  for (const card of Object.values(cards)) {
    const key = bucketKey(card);
    if (!buckets[key]) buckets[key] = [];
    buckets[key].push(card.name);
  }
  return buckets;
}

(async () => {
  const ratings = loadCards();
  const cardSet = new Set(Object.keys(ratings));
  const cards = await loadCardData(cardSet);
  const buckets = buildBuckets(cards);

  app.get("/cards", (req, res) => {
    res.json({ ratings, cards, buckets });
  });

  app.post("/compare", (req, res) => {
    const { winner, loser } = req.body;
    updateElo(ratings, winner, loser);
    res.json({ ok: true });
  });

  app.listen(3000, () => console.log("Server running: http://localhost:3000"));
})();