// Picks management — Firestore read/write + inline pick UI

const PLAYERS = ["brandon", "brian", "bryan", "ivan", "nam", "maanik", "vince"];
const PLAYER_DISPLAY = {
  brandon: "Brandon", brian: "Brian", bryan: "Bryan",
  ivan: "Ivan", nam: "Nam", maanik: "Maanik", vince: "Vince",
  tammy: "Tammy"
};

// Returns the player list for a given year (Tammy only played in 2014-15)
function getPlayersForYear(year) {
  return year === 2015 ? [...PLAYERS, "tammy"] : PLAYERS;
}

// Returns the Firestore collection name for the given year
function picksCollectionName(year) {
  return "picks_" + year;
}

function getOrdinalSuffix(n) {
  return ["th","st","nd","rd"][(n > 3 && n < 21) || n % 10 > 3 ? 0 : n % 10];
}

// Delete a single pick from Firestore
async function deletePick(playerId, round, matchup) {
  const docRef = db.collection(picksCollectionName(currentYear)).doc(playerId);
  const roundKey = "round" + round;
  await docRef.set({
    [roundKey]: { [matchup]: firebase.firestore.FieldValue.delete() }
  }, { merge: true });
}

// Save a single pick to Firestore using a proper nested object
async function savePick(playerId, round, matchup, teamName) {
  const docRef = db.collection(picksCollectionName(currentYear)).doc(playerId);
  const roundKey = "round" + round;
  await docRef.set({
    name: PLAYER_DISPLAY[playerId],
    [roundKey]: { [matchup]: teamName }
  }, { merge: true });
}

// Normalize picks data — handles both old flat "round1.matchup" keys and new nested format
function normalizePicks(data) {
  const result = {};
  for (const [key, value] of Object.entries(data)) {
    if (key.includes(".")) {
      const [roundKey, matchup] = key.split(".");
      if (!result[roundKey]) result[roundKey] = {};
      result[roundKey][matchup] = value;
    } else {
      result[key] = value;
    }
  }
  return result;
}

// Subscribe to all picks in real time; calls onUpdate(picks) whenever data changes
function subscribeAllPicks(onUpdate) {
  return db.collection(picksCollectionName(currentYear)).onSnapshot(snapshot => {
    const picks = {};
    snapshot.forEach(doc => {
      picks[doc.id] = normalizePicks(doc.data());
    });
    onUpdate(picks);
  });
}

// Load picks for a single player
async function loadPlayerPicks(playerId) {
  const doc = await db.collection(picksCollectionName(currentYear)).doc(playerId).get();
  return doc.exists ? normalizePicks(doc.data()) : {};
}

// Save a single round0 pick (2021 only)
async function saveRound0Pick(playerId, seriesId, teamName) {
  const docRef = db.collection(picksCollectionName(currentYear)).doc(playerId);
  await docRef.set({ round0: { [seriesId]: teamName } }, { merge: true });
}

// Delete a single round0 pick (2021 only)
async function deleteRound0Pick(playerId, seriesId) {
  const docRef = db.collection(picksCollectionName(currentYear)).doc(playerId);
  await docRef.set({ round0: { [seriesId]: firebase.firestore.FieldValue.delete() } }, { merge: true });
}

// Save a single qualifying pick (2020 only)
async function saveQualifyingPick(playerId, seriesId, teamName) {
  const docRef = db.collection(picksCollectionName(currentYear)).doc(playerId);
  await docRef.set({ qualifying: { [seriesId]: teamName } }, { merge: true });
}

// Delete a single qualifying pick (2020 only)
async function deleteQualifyingPick(playerId, seriesId) {
  const docRef = db.collection(picksCollectionName(currentYear)).doc(playerId);
  await docRef.set({ qualifying: { [seriesId]: firebase.firestore.FieldValue.delete() } }, { merge: true });
}

// Save full round robin ranking for one conference (2020 only)
// rankedTeams = array of 4 team names, index 0 = predicted 1st place
async function saveRoundRobinPick(playerId, conference, rankedTeams) {
  const docRef = db.collection(picksCollectionName(currentYear)).doc(playerId);
  await docRef.set({ roundrobin: { [conference]: rankedTeams } }, { merge: true });
}

// Render the pick selection UI for the current player
function renderPicksView(bracketData, playerPicks, playerId) {
  const container = document.getElementById("picks-container");
  const noPlayerMsg = document.getElementById("no-player-msg");
  if (!playerId) {
    noPlayerMsg.style.display = "block";
    container.innerHTML = "";
    return;
  }
  noPlayerMsg.style.display = "none";
  const isReadOnly = currentYear !== CURRENT_YEAR;

  let html = "";

  // 2021: round 0 (North division seeding game, 0 pts)
  if (currentYear === 2021) {
    const r0Picks = (playerPicks.round0) || {};
    html += '<div class="round-section">';
    html += '<h3>Round 0 <span class="points-badge">0 pts</span></h3>';
    for (const series of YEAR_2021_EXTRA.round0) {
      const pick = r0Picks[series.id] || null;
      let topClass = "team-btn";
      let bottomClass = "team-btn";
      if (pick === series.topTeam)    topClass    += " selected";
      if (pick === series.bottomTeam) bottomClass += " selected";
      if (pick) {
        if (pick === series.winner)  {
          if (pick === series.topTeam) topClass += " correct";
          else                         bottomClass += " correct";
        } else {
          if (pick === series.topTeam) topClass += " incorrect";
          else                         bottomClass += " incorrect";
        }
      }
      const topLogo    = getTeamLogo(series.topTeam)    ? '<img class="team-logo" src="' + getTeamLogo(series.topTeam)    + '" alt="">' : '';
      const bottomLogo = getTeamLogo(series.bottomTeam) ? '<img class="team-logo" src="' + getTeamLogo(series.bottomTeam) + '" alt="">' : '';
      html += '<div class="series-row">';
      html += '  <span class="matchup-label">' + series.label + '</span>';
      html += '  <div class="matchup-picks">';
      html += '    <button class="' + topClass    + '" data-round0="1" data-series="' + series.id + '" data-team="' + series.topTeam    + '"' + (isReadOnly ? ' disabled' : '') + '>' + topLogo    + '<span class="team-name">' + series.topTeam    + '</span><span class="wins">' + series.topWins    + '</span></button>';
      html += '    <span class="vs">vs</span>';
      html += '    <button class="' + bottomClass + '" data-round0="1" data-series="' + series.id + '" data-team="' + series.bottomTeam + '"' + (isReadOnly ? ' disabled' : '') + '>' + bottomLogo + '<span class="team-name">' + series.bottomTeam + '</span><span class="wins">' + series.bottomWins + '</span></button>';
      html += '  </div>';
      html += '</div>';
    }
    html += '</div>';
  }

  // 2020 COVID bubble: qualifying round + round robin sections
  if (currentYear === 2020) {
    const qualPicks = (playerPicks.qualifying) || {};
    const rrPicks = (playerPicks.roundrobin) || {};

    // --- Qualifying round ---
    html += '<div class="round-section">';
    html += '<h3>Qualifying Round <span class="points-badge">6.25 pts each</span></h3>';
    for (const series of YEAR_2020_EXTRA.qualifying) {
      const pick = qualPicks[series.id] || null;
      let topClass = "team-btn";
      let bottomClass = "team-btn";
      if (pick === series.topTeam)    topClass    += " selected";
      if (pick === series.bottomTeam) bottomClass += " selected";
      if (pick) {
        if (series.winner === series.topTeam) {
          if (pick === series.topTeam)    topClass    += " correct";
          else                            bottomClass += " incorrect";
        } else {
          if (pick === series.bottomTeam) bottomClass += " correct";
          else                            topClass    += " incorrect";
        }
      }
      const topLogo    = getTeamLogo(series.topTeam)    ? '<img class="team-logo" src="' + getTeamLogo(series.topTeam)    + '" alt="">' : '';
      const bottomLogo = getTeamLogo(series.bottomTeam) ? '<img class="team-logo" src="' + getTeamLogo(series.bottomTeam) + '" alt="">' : '';
      html += '<div class="series-row">';
      html += '  <span class="matchup-label">' + series.label + '</span>';
      html += '  <div class="matchup-picks">';
      html += '    <button class="' + topClass    + '" data-qual="1" data-series="' + series.id + '" data-team="' + series.topTeam    + '"' + (isReadOnly ? ' disabled' : '') + '>' + topLogo    + '<span class="team-name">' + series.topTeam    + '</span><span class="wins">' + series.topWins    + '</span></button>';
      html += '    <span class="vs">vs</span>';
      html += '    <button class="' + bottomClass + '" data-qual="1" data-series="' + series.id + '" data-team="' + series.bottomTeam + '"' + (isReadOnly ? ' disabled' : '') + '>' + bottomLogo + '<span class="team-name">' + series.bottomTeam + '</span><span class="wins">' + series.bottomWins + '</span></button>';;
      html += '  </div>';
      html += '</div>';
    }
    html += '</div>';

    // --- Round robin ---
    html += '<div class="round-section">';
    html += '<h3>Round Robin Seeding <span class="points-badge">6.25 pts each correct seed</span></h3>';
    for (const conf of ["east", "west"]) {
      const label = conf === "east" ? "East" : "West";
      const actual = YEAR_2020_EXTRA.roundrobin[conf];       // ["Philadelphia Flyers", ...]
      const teams  = [...actual];                             // the 4 teams in this conference
      const picked = rrPicks[conf] || [];                     // player's predicted order

      html += '<div class="rr-conference">';
      html += '<h4>' + label + ' Conference</h4>';
      html += '<div class="rr-grid">';
      for (let pos = 0; pos < 4; pos++) {
        html += '<div class="rr-row">';
        html += '<span class="rr-pos">' + (pos + 1) + getOrdinalSuffix(pos + 1) + '</span>';
        html += '<div class="rr-team-btns">';
        for (const team of teams) {
          const isSelected = picked[pos] === team;
          const isActual   = actual[pos]  === team;
          const isCorrect  = isSelected && isActual;
          const isWrong    = isSelected && !isActual;
          let cls = "team-btn rr-btn";
          if (isSelected) cls += " selected";
          if (isCorrect)  cls += " correct";
          if (isWrong)    cls += " incorrect";
          const logo = getTeamLogo(team) ? '<img class="team-logo" src="' + getTeamLogo(team) + '" alt="">' : '';
          html += '<button class="' + cls + '" data-rr="1" data-conf="' + conf + '" data-pos="' + pos + '" data-team="' + team + '"' + (isReadOnly ? ' disabled' : '') + '>' + logo + '<span class="team-name">' + team.split(" ").pop() + '</span></button>';
        }
        html += '</div>';
        html += '<span class="rr-actual">Actual: ' + actual[pos].split(" ").pop() + '</span>';
        html += '</div>';
      }
      html += '</div>';
      html += '</div>';
    }
    html += '</div>';
  }

  for (let round = 1; round <= 4; round++) {
    const seriesList = bracketData.rounds[round];
    if (!seriesList || seriesList.length === 0) continue;

    // Check if any series in this round has teams assigned
    const hasTeams = seriesList.some(s => s.topTeam || s.bottomTeam);
    if (!hasTeams) continue;

    html += '<div class="round-section">';
    html += '<h3>' + getRoundLabel(round) + ' <span class="points-badge">' + getPointsForRound(round) + ' pts each</span></h3>';

    for (const series of seriesList) {
      if (!series.topTeam && !series.bottomTeam) continue;

      const roundKey = "round" + round;
      const currentPick = playerPicks[roundKey] ? playerPicks[roundKey][series.matchup] : null;
      const result = bracketData.results[series.matchup];

      let topClass = "team-btn";
      let bottomClass = "team-btn";

      if (series.topTeam && currentPick === series.topTeam) topClass += " selected";
      if (series.bottomTeam && currentPick === series.bottomTeam) bottomClass += " selected";
      if (!series.topTeam) topClass += " tbd-btn";
      if (!series.bottomTeam) bottomClass += " tbd-btn";

      // If series is decided, show correct/incorrect
      if (result) {
        if (currentPick === result) {
          if (currentPick === series.topTeam) topClass += " correct";
          else bottomClass += " correct";
        } else if (currentPick) {
          if (currentPick === series.topTeam) topClass += " incorrect";
          else bottomClass += " incorrect";
        }
      }

      const topTeamName = series.topTeam || "TBD";
      const bottomTeamName = series.bottomTeam || "TBD";

      html += '<div class="series-row">';
      html += '  <span class="matchup-label">' + getMatchupLabel(series.matchup) + '</span>';
      html += '  <div class="matchup-picks">';
      const topLogo = series.topLogo ? '<img class="team-logo" src="' + series.topLogo + '" alt="">' : '';
      const bottomLogo = series.bottomLogo ? '<img class="team-logo" src="' + series.bottomLogo + '" alt="">' : '';

      const topDisabled    = !series.topTeam    ? ' disabled' : '';
      const bottomDisabled = !series.bottomTeam ? ' disabled' : '';
      if (isReadOnly) { topClass += ' no-interact'; bottomClass += ' no-interact'; }

      html += '    <button class="' + topClass + '" data-round="' + round + '" data-matchup="' + series.matchup + '" data-team="' + topTeamName + '"' + topDisabled + '>';
      html += topLogo + '<span class="team-name">' + topTeamName + '</span>';
      if (result) html += '<span class="wins">' + series.topWins + '</span>';
      html += '    </button>';
      html += '    <span class="vs">vs</span>';
      html += '    <button class="' + bottomClass + '" data-round="' + round + '" data-matchup="' + series.matchup + '" data-team="' + bottomTeamName + '"' + bottomDisabled + '>';
      html += bottomLogo + '<span class="team-name">' + bottomTeamName + '</span>';
      if (result) html += '<span class="wins">' + series.bottomWins + '</span>';
      html += '    </button>';
      html += '  </div>';
      html += '  <span class="series-status">' + series.status + '</span>';
      html += '</div>';
    }

    html += '</div>';
  }

  container.innerHTML = html;

  // Attach click handlers
  container.querySelectorAll(".team-btn").forEach(btn => {
    btn.addEventListener("click", async function () {
      if (this.disabled || this.dataset.team === "TBD" || this.classList.contains("no-interact")) return;

      // --- Round 0 pick (2021) ---
      if (this.dataset.round0) {
        const seriesId = this.dataset.series;
        const team     = this.dataset.team;
        const current  = (playerPicks.round0 || {})[seriesId];
        const deselect = current === team;
        if (!playerPicks.round0) playerPicks.round0 = {};
        if (deselect) {
          delete playerPicks.round0[seriesId];
          await deleteRound0Pick(playerId, seriesId).catch(e => console.error(e));
        } else {
          playerPicks.round0[seriesId] = team;
          await saveRound0Pick(playerId, seriesId, team).catch(e => console.error(e));
        }
        renderPicksView(bracketData, playerPicks, playerId);
        return;
      }

      // --- Qualifying round pick ---
      if (this.dataset.qual) {
        const seriesId = this.dataset.series;
        const team     = this.dataset.team;
        const current  = (playerPicks.qualifying || {})[seriesId];
        const deselect = current === team;
        if (!playerPicks.qualifying) playerPicks.qualifying = {};
        if (deselect) {
          delete playerPicks.qualifying[seriesId];
          await deleteQualifyingPick(playerId, seriesId).catch(e => console.error(e));
        } else {
          playerPicks.qualifying[seriesId] = team;
          await saveQualifyingPick(playerId, seriesId, team).catch(e => console.error(e));
        }
        renderPicksView(bracketData, playerPicks, playerId);
        return;
      }

      // --- Round robin pick ---
      if (this.dataset.rr) {
        const conf = this.dataset.conf;
        const pos  = parseInt(this.dataset.pos);
        const team = this.dataset.team;
        if (!playerPicks.roundrobin) playerPicks.roundrobin = {};
        const current = playerPicks.roundrobin[conf] ? [...playerPicks.roundrobin[conf]] : Array(4).fill(null);
        // If this team is already placed elsewhere, remove it from that slot
        const existing = current.indexOf(team);
        if (existing !== -1 && existing !== pos) current[existing] = null;
        current[pos] = team;
        playerPicks.roundrobin[conf] = current;
        await saveRoundRobinPick(playerId, conf, current).catch(e => console.error(e));
        renderPicksView(bracketData, playerPicks, playerId);
        return;
      }

      // --- Regular bracket pick ---
      const round   = parseInt(this.dataset.round);
      const matchup = this.dataset.matchup;
      const team    = this.dataset.team;

      const roundKey = "round" + round;
      const currentPick = playerPicks[roundKey] ? playerPicks[roundKey][matchup] : null;
      const isDeselect = currentPick === team;

      // Update local state
      if (!playerPicks[roundKey]) playerPicks[roundKey] = {};
      if (isDeselect) {
        delete playerPicks[roundKey][matchup];
      } else {
        playerPicks[roundKey][matchup] = team;
      }

      // Save to Firestore
      try {
        if (isDeselect) {
          await deletePick(playerId, round, matchup);
        } else {
          await savePick(playerId, round, matchup, team);
        }
        renderPicksView(bracketData, playerPicks, playerId);
      } catch (err) {
        console.error("Failed to save pick:", err);
        alert("Failed to save pick. Check your Firebase config.");
      }
    });
  });
}
