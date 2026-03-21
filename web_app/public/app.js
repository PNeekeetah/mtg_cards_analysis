let cards = {};
let ratings = {};
let buckets = {};
let bucketKeys = [];
let currentBucketIdx = 0;
let pairHistory = [];

let leftIdx = 0;
let rightIdx = 1;

async function init() {
  const res = await fetch("/cards");
  const data = await res.json();

  ratings = data.ratings;
  cards = data.cards;
  buckets = data.buckets;

  bucketKeys = Object.keys(buckets);
  if (!bucketKeys.length) return;

  currentBucketIdx = 0;
  shuffleBucket(bucketKeys[currentBucketIdx]);
  showPair();
}

function shuffleBucket(bucketKey) {
  const bucket = buckets[bucketKey];
  for (let i = bucket.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bucket[i], bucket[j]] = [bucket[j], bucket[i]];
  }
  leftIdx = 0;
  rightIdx = bucket.length > 1 ? 1 : 0;
}

function showPair() {
  const bucketKey = bucketKeys[currentBucketIdx];
  const bucket = buckets[bucketKey];
  if (bucket.length < 2) return;

  document.getElementById("leftName").innerText = bucket[leftIdx];
  document.getElementById("rightName").innerText = bucket[rightIdx];
  document.getElementById("leftImg").src = cards[bucket[leftIdx]].image || "";
  document.getElementById("rightImg").src = cards[bucket[rightIdx]].image || "";
}

async function pick(winnerIdx) {
  const bucketKey = bucketKeys[currentBucketIdx];
  const bucket = buckets[bucketKey];

  const loserIdx = winnerIdx === 0 ? 1 : 0;
  const winner = bucket[winnerIdx === 0 ? leftIdx : rightIdx];
  const loser = bucket[loserIdx === 0 ? leftIdx : rightIdx];

  pairHistory.push({ winner, loser, bucketKey, leftIdx, rightIdx });

  await fetch("/compare", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ winner, loser })
  });

  nextPair();
}

function nextPair() {
  const bucketKey = bucketKeys[currentBucketIdx];
  const bucket = buckets[bucketKey];

  leftIdx += 1;
  rightIdx += 1;
  if (rightIdx >= bucket.length) {
    currentBucketIdx += 1;
    if (currentBucketIdx >= bucketKeys.length) {
      currentBucketIdx = 0; // loop over buckets
    }
    shuffleBucket(bucketKeys[currentBucketIdx]);
  }
  showPair();
}

function prev() {
  if (!pairHistory.length) return;
  const last = pairHistory.pop();
  currentBucketIdx = bucketKeys.indexOf(last.bucketKey);
  shuffleBucket(last.bucketKey);
  leftIdx = last.leftIdx;
  rightIdx = last.rightIdx;
  showPair();
}

function skip() {
  nextPair();
}

document.getElementById("leftImg").addEventListener("click", () => pick(0));
document.getElementById("rightImg").addEventListener("click", () => pick(1));

init();