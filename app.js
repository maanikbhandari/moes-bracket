// Main app — routing, state, initialization

let currentView = "leaderboard";
let currentPlayer = localStorage.getItem("poolPlayer") || "";
let currentYear = parseInt(localStorage.getItem("poolYear") || CURRENT_YEAR);
let bracketData = null;
let allPicks = {};
let playerPicks = {};
let picksUnsubscribe = null;
let initGen = 0; // incremented on each reinit; stale completions are discarded

// Navigation
document.querySelectorAll(".nav-btn").forEach(btn => {
  btn.addEventListener("click", function () {
    switchView(this.dataset.view);
  });
});

function switchView(view) {
  currentView = view;
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
  document.querySelector('.nav-btn[data-view="' + view + '"]').classList.add("active");
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.getElementById("view-" + view).classList.add("active");
  refreshCurrentView();
}

// Player selection
const playerSelect = document.getElementById("current-player");
playerSelect.value = currentPlayer;

function updateLambsLair(player) {
  const btn = document.querySelector(".lambs-lair-btn");
  if (!btn) return;
  btn.style.display = player === "bryan" ? "" : "none";
  // If Lamb's Lair is active but player switched away, go to leaderboard
  if (player !== "bryan" && currentView === "lambslair") {
    switchView("leaderboard");
  }
}

updateLambsLair(currentPlayer);

playerSelect.addEventListener("change", function () {
  currentPlayer = this.value;
  localStorage.setItem("poolPlayer", currentPlayer);
  updateLambsLair(currentPlayer);
  if (currentPlayer) switchView("picks");
  loadPlayerData();
});

// Year selection
const yearSelect = document.getElementById("current-year");
yearSelect.value = currentYear;
document.getElementById("season-label").textContent = getSeasonLabel(currentYear);

function updateTammyVisibility(year) {
  const tammyOption = document.querySelector(".tammy-option");
  if (!tammyOption) return;
  const show = year === 2015;
  tammyOption.style.display = show ? "" : "none";
  // If Tammy is selected but we're switching away from 2015, reset player
  if (!show && currentPlayer === "tammy") {
    currentPlayer = "";
    localStorage.setItem("poolPlayer", "");
    playerSelect.value = "";
  }
}

updateTammyVisibility(currentYear);

yearSelect.addEventListener("change", function () {
  currentYear = parseInt(this.value);
  localStorage.setItem("poolYear", currentYear);
  document.getElementById("season-label").textContent = getSeasonLabel(currentYear);
  updateTammyVisibility(currentYear);
  reinit();
});

async function loadPlayerData() {
  if (currentPlayer) {
    playerPicks = await loadPlayerPicks(currentPlayer);
  } else {
    playerPicks = {};
  }
  refreshCurrentView();
}

function refreshCurrentView() {
  if (!bracketData) return;

  switch (currentView) {
    case "leaderboard":
      const scores = calculateScores(allPicks, bracketData.results);
      renderLeaderboard(scores);
      break;
    case "picks":
      renderPicksView(bracketData, playerPicks, currentPlayer);
      break;
    case "grid":
      renderPicksGrid(allPicks, bracketData);
      break;
    case "results":
      renderResults(bracketData);
      break;
    case "lambslair":
      renderLambsLair();
      break;
  }
}

function setStatus(msg, isError) {
  const bar = document.getElementById("status-bar");
  bar.style.display = msg ? "block" : "none";
  bar.style.color = isError ? "#f85149" : "#8b949e";
  bar.textContent = msg;
}

function setError(msg) {
  const banner = document.getElementById("error-banner");
  if (msg) {
    banner.style.display = "block";
    banner.innerHTML = '<p style="color:#f85149; margin:0; font-size:0.9rem;">\u26a0\ufe0f ' + msg + '</p>';
  } else {
    banner.style.display = "none";
    banner.innerHTML = "";
  }
}

// Initialize
async function init() {
  const gen = ++initGen;
  const yearForThisLoad = currentYear;
  setStatus("Loading bracket data...");
  try {
    const bracket = await fetchBracketData(yearForThisLoad, fresh => {
      if (initGen !== gen) return; // stale — user switched years
      bracketData = fresh;
      refreshCurrentView();
    });
    if (initGen !== gen) return; // stale — discard result
    bracketData = bracket;
    setStatus("");
    setError("");

    // Clean up any existing listener before creating a new one
    if (picksUnsubscribe) { picksUnsubscribe(); picksUnsubscribe = null; }

    // Real-time listener — fires immediately with current data, then on every change
    picksUnsubscribe = subscribeAllPicks(picks => {
      if (initGen !== gen) return; // stale
      allPicks = picks;
      if (currentPlayer) {
        playerPicks = allPicks[currentPlayer] || {};
      }
      refreshCurrentView();
    });
  } catch (error) {
    if (initGen !== gen) return; // stale
    console.error("Initialization failed:", error);
    setStatus("");
    const isApiError = error.message.includes("all proxies failed");
    if (isApiError) {
      setError("Could not load bracket data for " + getSeasonLabel(yearForThisLoad) + ". The NHL API may not have data for this season, or all proxies failed. Try refreshing.");
    } else {
      setError(error.message);
    }
  }
}

async function reinit() {
  if (picksUnsubscribe) { picksUnsubscribe(); picksUnsubscribe = null; }
  bracketData = null;
  allPicks = {};
  playerPicks = {};
  await init();
}

function renderLambsLair() {
  const container = document.getElementById("lambslair-container");
  if (currentYear > 2019) {
    container.innerHTML = '<div style="text-align:center; padding:4rem 1rem;"><h2 style="font-size:2rem; color:#8b949e;">lambs lair is kill<br>no</h2></div>';
    return;
  }
  container.innerHTML =
    '<div style="text-align:center; padding:2rem 1rem;">' +
    '<h2 style="font-size:2rem; letter-spacing:0.05em; margin-bottom:1.5rem;">WELCOME TO THE LAMBS LAIR</h2>' +
    '<img src="images/lambs-lair.png" alt="Lambs Lair" style="max-width:100%; border-radius:8px;">' +
    '</div>';
}

init();
