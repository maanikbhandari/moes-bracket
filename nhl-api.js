// NHL API integration
// Fetches live playoff bracket data and determines series winners

const CURRENT_YEAR = 2026;

function getNhlApiUrl(year) {
  return "https://api-web.nhle.com/v1/playoff-bracket/" + year;
}

function getSeasonLabel(year) {
  return (year - 1) + "-" + String(year).slice(2);
}

// Map team names to NHL abbreviations (for logo URLs)
const NAME_TO_ABBREV = {
  // Current teams
  "Anaheim Ducks":         "ANA",
  "Boston Bruins":         "BOS",
  "Buffalo Sabres":        "BUF",
  "Calgary Flames":        "CGY",
  "Carolina Hurricanes":   "CAR",
  "Chicago Blackhawks":    "CHI",
  "Colorado Avalanche":    "COL",
  "Columbus Blue Jackets": "CBJ",
  "Dallas Stars":          "DAL",
  "Detroit Red Wings":     "DET",
  "Edmonton Oilers":       "EDM",
  "Florida Panthers":      "FLA",
  "Los Angeles Kings":     "LAK",
  "Minnesota Wild":        "MIN",
  "Montréal Canadiens":    "MTL",
  "Nashville Predators":   "NSH",
  "New Jersey Devils":     "NJD",
  "New York Islanders":    "NYI",
  "New York Rangers":      "NYR",
  "Ottawa Senators":       "OTT",
  "Philadelphia Flyers":   "PHI",
  "Pittsburgh Penguins":   "PIT",
  "San Jose Sharks":       "SJS",
  "Seattle Kraken":        "SEA",
  "St. Louis Blues":       "STL",
  "Tampa Bay Lightning":   "TBL",
  "Toronto Maple Leafs":   "TOR",
  "Utah Mammoth":          "UTA",
  "Vancouver Canucks":     "VAN",
  "Vegas Golden Knights":  "VGK",
  "Washington Capitals":   "WSH",
  "Winnipeg Jets":         "WPG",
  // Historical teams
  "Arizona Coyotes":       "ARI",
  "Phoenix Coyotes":       "PHX",
  "Atlanta Thrashers":     "ATL"
};

function getTeamLogo(teamName) {
  const abbrev = NAME_TO_ABBREV[teamName];
  if (!abbrev) return null;
  return "https://assets.nhle.com/logos/nhl/svg/" + abbrev + "_dark.svg";
}

// Map URL slugs to full team names
const SLUG_TO_NAME = {
  "avalanche":     "Colorado Avalanche",
  "bruins":        "Boston Bruins",
  "sabres":        "Buffalo Sabres",
  "hurricanes":    "Carolina Hurricanes",
  "stars":         "Dallas Stars",
  "redwings":      "Detroit Red Wings",
  "oilers":        "Edmonton Oilers",
  "kings":         "Los Angeles Kings",
  "wild":          "Minnesota Wild",
  "canadiens":     "Montréal Canadiens",
  "senators":      "Ottawa Senators",
  "flyers":        "Philadelphia Flyers",
  "penguins":      "Pittsburgh Penguins",
  "lightning":     "Tampa Bay Lightning",
  "mapleleafs":    "Toronto Maple Leafs",
  "goldenknights": "Vegas Golden Knights",
  "mammoth":       "Utah Mammoth",
  "ducks":         "Anaheim Ducks",
  "flames":        "Calgary Flames",
  "blackhawks":    "Chicago Blackhawks",
  "bluejackets":   "Columbus Blue Jackets",
  "panthers":      "Florida Panthers",
  "predators":     "Nashville Predators",
  "devils":        "New Jersey Devils",
  "islanders":     "New York Islanders",
  "rangers":       "New York Rangers",
  "sharks":        "San Jose Sharks",
  "kraken":        "Seattle Kraken",
  "blues":         "St. Louis Blues",
  "canucks":       "Vancouver Canucks",
  "capitals":      "Washington Capitals",
  "jets":          "Winnipeg Jets",
  "coyotes":       "Arizona Coyotes",
  "tbd":           "TBD"
};

// 2019-20 COVID bubble: qualifying play-in round and round robin seeding data
const YEAR_2020_EXTRA = {
  qualifying: [
    { id: "east1", label: "East Q1", topTeam: "Pittsburgh Penguins",  topWins: 1, bottomTeam: "Montréal Canadiens",    bottomWins: 3, winner: "Montréal Canadiens"    },
    { id: "east2", label: "East Q2", topTeam: "Toronto Maple Leafs",  topWins: 2, bottomTeam: "Columbus Blue Jackets", bottomWins: 3, winner: "Columbus Blue Jackets" },
    { id: "east3", label: "East Q3", topTeam: "Carolina Hurricanes",  topWins: 3, bottomTeam: "New York Rangers",      bottomWins: 0, winner: "Carolina Hurricanes"   },
    { id: "east4", label: "East Q4", topTeam: "New York Islanders",   topWins: 3, bottomTeam: "Florida Panthers",      bottomWins: 1, winner: "New York Islanders"    },
    { id: "west1", label: "West Q1", topTeam: "Edmonton Oilers",      topWins: 1, bottomTeam: "Chicago Blackhawks",    bottomWins: 3, winner: "Chicago Blackhawks"    },
    { id: "west2", label: "West Q2", topTeam: "Calgary Flames",       topWins: 3, bottomTeam: "Winnipeg Jets",         bottomWins: 1, winner: "Calgary Flames"        },
    { id: "west3", label: "West Q3", topTeam: "Vancouver Canucks",    topWins: 3, bottomTeam: "Minnesota Wild",        bottomWins: 1, winner: "Vancouver Canucks"     },
    { id: "west4", label: "West Q4", topTeam: "Nashville Predators",  topWins: 1, bottomTeam: "Arizona Coyotes",       bottomWins: 3, winner: "Arizona Coyotes"       },
  ],
  roundrobin: {
    east: ["Philadelphia Flyers", "Tampa Bay Lightning", "Washington Capitals", "Boston Bruins"],
    west: ["Vegas Golden Knights", "Colorado Avalanche", "Dallas Stars", "St. Louis Blues"]
  }
};

// 2020-21: pre-playoff North division seeding game
const YEAR_2021_EXTRA = {
  round0: [
    { id: "north_pre", label: "kiddy korner", topTeam: "Calgary Flames", topWins: 2, bottomTeam: "Vancouver Canucks", bottomWins: 1, winner: "Calgary Flames" }
  ]
};

// Map series letters to our internal matchup IDs
const SERIES_MAP = {
  // Round 1
  A: { round: 1, matchup: "atlantic1" },
  B: { round: 1, matchup: "atlantic2" },
  C: { round: 1, matchup: "metro1" },
  D: { round: 1, matchup: "metro2" },
  E: { round: 1, matchup: "central1" },
  F: { round: 1, matchup: "central2" },
  G: { round: 1, matchup: "pacific1" },
  H: { round: 1, matchup: "pacific2" },
  // Round 2
  I: { round: 2, matchup: "east1" },
  J: { round: 2, matchup: "east2" },
  K: { round: 2, matchup: "west1" },
  L: { round: 2, matchup: "west2" },
  // Round 3 (Conference Finals)
  M: { round: 3, matchup: "east" },
  N: { round: 3, matchup: "west" },
  // Round 4 (Stanley Cup Final)
  O: { round: 4, matchup: "champion" }
};

const BRACKET_CACHE_FRESH_TTL = 5 * 60 * 1000;   // background refresh after 5 min

function getBracketCacheKey(year) {
  return "nhl_bracket_cache_" + year;
}

function getBracketFirestoreId(year) {
  return String(year);
}
const BRACKET_CACHE_VERSION = 3;
const BRACKET_FIRESTORE_FRESH_TTL = 10 * 60 * 1000; // background refresh after 10 min

function getBracketCache(year) {
  try {
    const raw = localStorage.getItem(getBracketCacheKey(year));
    if (!raw) return null;
    const { ts, data, v } = JSON.parse(raw);
    if (v !== BRACKET_CACHE_VERSION) return null;
    return { data, stale: Date.now() - ts > BRACKET_CACHE_FRESH_TTL };
  } catch { return null; }
}

function setBracketCache(year, data) {
  try {
    localStorage.setItem(getBracketCacheKey(year), JSON.stringify({ ts: Date.now(), data, v: BRACKET_CACHE_VERSION }));
  } catch {}
}

async function loadBracketFromFirestore(year) {
  try {
    const doc = await db.collection("bracket").doc(getBracketFirestoreId(year)).get();
    if (!doc.exists) return null;
    const { data, updatedAt } = doc.data();
    const stale = updatedAt ? Date.now() - updatedAt.toMillis() > BRACKET_FIRESTORE_FRESH_TTL : true;
    return { data: JSON.parse(data), stale };
  } catch (e) {
    console.warn("Firestore bracket read failed:", e.message);
    return null;
  }
}

async function saveBracketToFirestore(year, data) {
  try {
    await db.collection("bracket").doc(getBracketFirestoreId(year)).set({
      data: JSON.stringify(data),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (e) {
    console.warn("Firestore bracket write failed:", e.message);
  }
}

// Fetch with a timeout (ms); resolves with Response or rejects on timeout/error
function fetchWithTimeout(url, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timer));
}

function backgroundRefresh(year, onFresh, attempt) {
  attempt = attempt || 1;
  fetchFreshBracket(year).then(fresh => {
    if (fresh) {
      setBracketCache(year, fresh);
      saveBracketToFirestore(year, fresh);
      if (onFresh) onFresh(fresh);
    } else if (attempt < 3) {
      // Retry after 90s, then 3 min — gives cold-started Netlify function time to warm up
      const delay = attempt === 1 ? 90000 : 180000;
      setTimeout(() => backgroundRefresh(year, onFresh, attempt + 1), delay);
    }
  }).catch(() => {
    if (attempt < 3) {
      const delay = attempt === 1 ? 90000 : 180000;
      setTimeout(() => backgroundRefresh(year, onFresh, attempt + 1), delay);
    }
  });
}

// Fetches and parses the NHL bracket data for a given year
// Priority: Firestore → localStorage cache → NHL API (all proxies in parallel)
// onFresh(data) is called when a background refresh returns newer data
async function fetchBracketData(year, onFresh) {
  // 1. Firestore — shared across all users, always try first
  const fromFirestore = await loadBracketFromFirestore(year);
  if (fromFirestore) {
    console.log("Bracket loaded from Firestore", fromFirestore.stale ? "(stale)" : "(fresh)");
    setBracketCache(year, fromFirestore.data);
    backgroundRefresh(year, onFresh);
    return fromFirestore.data;
  }

  // 2. localStorage — same device fallback
  const cached = getBracketCache(year);
  if (cached) {
    console.log("Bracket loaded from localStorage", cached.stale ? "(stale)" : "(fresh)");
    backgroundRefresh(year, onFresh);
    return cached.data;
  }

  // 3. NHL API — all proxies in parallel (first-time visitor, no cache anywhere)
  const fresh = await fetchFreshBracket(year);
  if (fresh) {
    setBracketCache(year, fresh);
    saveBracketToFirestore(year, fresh);
    return fresh;
  }
  throw new Error("Could not load NHL bracket data — all proxies failed. Try refreshing.");
}

async function fetchFreshBracket(year) {
  // Try the Netlify function first — it's on the same infrastructure and most reliable,
  // but can cold-start slowly so we give it a longer timeout
  const netlifyUrl = "/.netlify/functions/bracket?year=" + year;
  try {
    const response = await fetchWithTimeout(netlifyUrl, 20000);
    if (response.ok) {
      const data = await response.json();
      if (data.series) {
        console.log("Bracket loaded from Netlify function");
        return parseBracketData(data);
      }
    }
  } catch (e) {
    console.warn("Netlify function failed:", e.message);
  }

  // Fall back: race all public proxies in parallel
  const apiUrl = getNhlApiUrl(year);
  const fallbacks = [
    () => apiUrl,
    () => "https://api.allorigins.win/raw?url=" + encodeURIComponent(apiUrl),
    () => "https://corsproxy.org/?" + encodeURIComponent(apiUrl),
    () => "https://thingproxy.freeboard.io/fetch/" + apiUrl,
  ];

  const attempts = fallbacks.map(proxyFn => {
    const url = proxyFn();
    return fetchWithTimeout(url, 10000)
      .then(response => {
        if (!response.ok) throw new Error("HTTP " + response.status);
        return response.json();
      })
      .then(data => {
        if (!data.series) throw new Error("No series data");
        console.log("Bracket loaded from fallback:", url);
        return parseBracketData(data);
      });
  });

  try {
    return await Promise.any(attempts);
  } catch (err) {
    console.warn("All fallback proxies failed:", err);
    return null;
  }
}

function parseBracketData(data) {
  const rounds = { 1: [], 2: [], 3: [], 4: [] };
  const results = {};

  for (const series of data.series) {
    const mapping = SERIES_MAP[series.seriesLetter];
    if (!mapping) continue;

    // Prefer team objects (always present for historical/completed series)
    // Fall back to slug parsing when objects are missing (current season in-progress)
    let topTeam = null;
    let bottomTeam = null;
    let topLogo = null;
    let bottomLogo = null;

    if (series.topSeedTeam && series.topSeedTeam.name) {
      topTeam = series.topSeedTeam.name["default"] || null;
      if (topTeam === "TBD") topTeam = null;
      topLogo = series.topSeedTeam.darkLogo || getTeamLogo(topTeam);
    }
    if (series.bottomSeedTeam && series.bottomSeedTeam.name) {
      bottomTeam = series.bottomSeedTeam.name["default"] || null;
      if (bottomTeam === "TBD") bottomTeam = null;
      bottomLogo = series.bottomSeedTeam.darkLogo || getTeamLogo(bottomTeam);
    }

    // For current season: team objects may be stripped from completed series,
    // so fall back to parsing the seriesUrl slug
    if (!topTeam || !bottomTeam) {
      if (series.seriesUrl) {
        const slug = series.seriesUrl.split("/").pop(); // e.g. "bruins-vs-sabres"
        const parts = slug.split("-vs-");
        if (parts.length === 2) {
          if (!bottomTeam) {
            const name = SLUG_TO_NAME[parts[0]];
            bottomTeam = (name && name !== "TBD") ? name : null;
            if (bottomTeam) bottomLogo = getTeamLogo(bottomTeam);
          }
          if (!topTeam) {
            const name = SLUG_TO_NAME[parts[1]];
            topTeam = (name && name !== "TBD") ? name : null;
            if (topTeam) topLogo = getTeamLogo(topTeam);
          }
        }
      }
    }

    const topWins    = series.topSeedWins    || 0;
    const bottomWins = series.bottomSeedWins || 0;

    let winner = null;
    let status = "Not started";

    if (topTeam && bottomTeam) {
      if (topWins === 4) {
        winner = topTeam;
        status = topTeam + " wins (4-" + bottomWins + ")";
      } else if (bottomWins === 4) {
        winner = bottomTeam;
        status = bottomTeam + " wins (4-" + topWins + ")";
      } else if (topWins > 0 || bottomWins > 0) {
        status = topWins + "-" + bottomWins;
      }
    } else if (topTeam || bottomTeam) {
      status = "TBD";
    }

    const seriesInfo = {
      letter:          series.seriesLetter,
      round:           mapping.round,
      matchup:         mapping.matchup,
      title:           series.seriesTitle,
      topTeam:         topTeam,
      topLogo:         topLogo,
      topSeedRank:     series.topSeedRankAbbrev,
      topWins:         topWins,
      bottomTeam:      bottomTeam,
      bottomLogo:      bottomLogo,
      bottomSeedRank:  series.bottomSeedRankAbbrev,
      bottomWins:      bottomWins,
      winner:          winner,
      status:          status
    };

    rounds[mapping.round].push(seriesInfo);
    results[mapping.matchup] = winner;
  }

  return { rounds, results };
}

// Get label for a matchup ID
function getMatchupLabel(matchup) {
  if (currentYear === 2021) {
    const labels2021 = {
      atlantic1: "East 1",    atlantic2: "East 2",
      metro1:    "Central 1", metro2:    "Central 2",
      central1:  "West 1",   central2:  "West 2",
      pacific1:  "North 1",  pacific2:  "North 2",
      east1: "East",   east2: "Central",
      west1: "West",   west2: "North",
      east: "Semifinal 1",  west: "Semifinal 2",
      champion: "Stanley Cup Final"
    };
    return labels2021[matchup] || matchup;
  }
  const labels = {
    central1: "Central 1",
    central2: "Central 2",
    pacific1: "Pacific 1",
    pacific2: "Pacific 2",
    metro1: "Metro 1",
    metro2: "Metro 2",
    atlantic1: "Atlantic 1",
    atlantic2: "Atlantic 2",
    east1: "East 1",
    east2: "East 2",
    west1: "West 1",
    west2: "West 2",
    east: "East Final",
    west: "West Final",
    champion: "Stanley Cup Final"
  };
  return labels[matchup] || matchup;
}

// Get round label
function getRoundLabel(round) {
  if (currentYear === 2021) {
    const labels2021 = { 1: "Round 1", 2: "Round 2", 3: "Semifinals", 4: "Stanley Cup Final" };
    return labels2021[round] || "Round " + round;
  }
  const labels = {
    1: "Round 1",
    2: "Round 2",
    3: "Conference Finals",
    4: "Stanley Cup Final"
  };
  return labels[round] || "Round " + round;
}

// Points per correct pick by round
function getPointsForRound(round) {
  const points = { 1: 12.5, 2: 25, 3: 50, 4: 100 };
  return points[round] || 0;
}
