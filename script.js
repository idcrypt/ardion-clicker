// --- CONFIG ---
const ARD_MINT = "4uBm5qxRZdK8XJzQGwYEn9vqDbSpzLnVuJMndnFjpump";
const MIN_HOLD = 100000; // minimal hold ARD

// --- STATE ---
let walletAddress = null;
let ardBalance = 0;
let points = 0;
let multiplier = 1;
let todayClicks = 0;
let lastMineDay = "";

// --- DOM Elements ---
const statusEl = document.getElementById("status");
const gameEl = document.getElementById("game");
const pointsEl = document.getElementById("points");
const multEl = document.getElementById("multiplier");
const claimBtn = document.getElementById("claimBtn");

// --- Init Wallet (Phantom etc) ---
async function initWallet() {
  if (!window.solana) {
    statusEl.textContent = "⚠️ Install Phantom wallet!";
    return;
  }

  try {
    const resp = await window.solana.connect();
    walletAddress = resp.publicKey.toString();
    loadGameState();
    await checkArdBalance();
    renderRefLink();
  } catch (err) {
    statusEl.textContent = "Wallet connect failed.";
  }
}

function renderRefLink() {
  if (walletAddress) {
    const refLink = `${window.location.origin}${window.location.pathname}?ref=${walletAddress}`;
    document.getElementById("refLink").innerHTML = `<a href="${refLink}" target="_blank">${refLink}</a>`;
  }
}

// --- Cek Balance ARD ---
async function checkArdBalance() {
  try {
    const connection = new solanaWeb3.Connection("https://mainnet.helius-rpc.com/?api-key=d388bfa3-773a-41a5-b14f-560f924abfbc");
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      new solanaWeb3.PublicKey(walletAddress),
      { mint: new solanaWeb3.PublicKey(ARD_MINT) }
    );
    const balance = tokenAccounts.value[0]?.account.data.parsed.info.tokenAmount.uiAmount || 0;
    ardBalance = balance;

    if (balance >= MIN_HOLD) {
      statusEl.textContent = `✅ You hold ${balance} ARD — mining enabled!`;
      gameEl.style.display = "block";
      updateClaimButton();
    } else {
      statusEl.textContent = `❌ Hold ≥${MIN_HOLD} ARD to mine!`;
      gameEl.style.display = "none";
    }
  } catch (e) {
    statusEl.textContent = "Error loading ARD balance.";
  }
}

// --- Load & Save Game State ---
function loadGameState() {
  const today = new Date().toISOString().split("T")[0];
  const saved = localStorage.getItem(`ardion_game_${walletAddress}`);
  if (saved) {
    const data = JSON.parse(saved);
    if (data.lastMineDay === today) {
      points = data.points;
      todayClicks = data.todayClicks;
    } else {
      points = data.points; // keep total
      todayClicks = 0;
    }
    multiplier = data.multiplier || 1;
  } else {
    points = 0;
    todayClicks = 0;
    multiplier = 1;
  }
  lastMineDay = today;
  updateUI();
}

function saveGameState() {
  const data = {
    points,
    todayClicks,
    multiplier,
    lastMineDay
  };
  localStorage.setItem(`ardion_game_${walletAddress}`, JSON.stringify(data));
}

function updateUI() {
  pointsEl.textContent = `${todayClicks}/50`;
  multEl.textContent = `${multiplier}x`;
  updateClaimButton();
}

function updateClaimButton() {
  claimBtn.disabled = points < 100;
}

// --- Mining ---
function mine() {
  const today = new Date().toISOString().split("T")[0];
  if (today !== lastMineDay) {
    todayClicks = 0;
    lastMineDay = today;
  }

  if (todayClicks >= 50) {
    alert("Daily limit reached (50 clicks)!");
    return;
  }

  todayClicks++;
  points += multiplier;
  saveGameState();
  updateUI();
}

// --- Boost ---
function buyBoost(level, cost) {
  if (points < cost) {
    alert("Not enough points!");
    return;
  }
  points -= cost;
  multiplier = level;
  saveGameState();
  updateUI();
  alert(`Boost ${level}x activated!`);
}

// --- Claim (User Request) ---
function claimReward() {
  if (points < 100) return;
  // Simpan request (di MVP, cukup notifikasi)
  alert(`✅ Request submitted!\nSend your wallet address to @_idcryptnews or wait for batch send.\n(We'll send 1 ARD soon!)`);
  // Optional: kirim ke Google Form/Sheet di sini
  points -= 100;
  saveGameState();
  updateUI();
}

// --- Referral (auto detect) ---
function handleReferral() {
  const urlParams = new URLSearchParams(window.location.search);
  const ref = urlParams.get("ref");
  if (ref && walletAddress && ref !== walletAddress) {
    // Simpan referrer (di MVP: cukup lokal)
    localStorage.setItem("referrer", ref);
    // Di versi lanjut: kirim ke backend
  }
}

// --- Jalankan Saat Halaman Dimuat ---
window.onload = () => {
  // Render tombol wallet
  const btn = document.createElement("button");
  btn.textContent = "🔌 Connect Wallet";
  btn.onclick = initWallet;
  document.getElementById("wallet-buttons").appendChild(btn);

  // Cek referral
  handleReferral();
};
