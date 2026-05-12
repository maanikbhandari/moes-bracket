// Leaderboard & scoring + picks grid

function calculateScores(allPicks, results) {
  const scores = [];
  const players = getPlayersForYear(currentYear);

  for (const playerId of players) {
    const playerData = allPicks[playerId] || {};
    let total = 0;
    const roundScores = {};

    // 2020: qualifying round scoring (6.25 pts per correct winner)
    let qualScore = 0;
    let rrScore   = 0;
    if (currentYear === 2020) {
      const qualPicks = playerData.qualifying || {};
      for (const series of YEAR_2020_EXTRA.qualifying) {
        if (qualPicks[series.id] && qualPicks[series.id] === series.winner) qualScore += 6.25;
      }
      const rrPicks = playerData.roundrobin || {};
      for (const conf of ["east", "west"]) {
        const actual = YEAR_2020_EXTRA.roundrobin[conf];
        const picked = rrPicks[conf] || [];
        for (let i = 0; i < 4; i++) {
          if (picked[i] && picked[i] === actual[i]) rrScore += 6.25;
        }
      }
    }

    for (let round = 1; round <= 4; round++) {
      const roundKey = "round" + round;
      const roundPicks = playerData[roundKey] || {};
      let roundTotal = 0;

      for (const [matchup, pick] of Object.entries(roundPicks)) {
        const actual = results[matchup];
        if (actual && pick === actual) {
          roundTotal += getPointsForRound(round);
        }
      }

      roundScores[round] = roundTotal;
      total += roundTotal;
    }

    total += qualScore + rrScore;

    scores.push({
      id: playerId,
      name: PLAYER_DISPLAY[playerId],
      total: total,
      roundScores: roundScores,
      qualScore:   qualScore,
      rrScore:     rrScore
    });
  }

  scores.sort((a, b) => b.total - a.total);
  return scores;
}

function renderLeaderboard(scores) {
  const container = document.getElementById("leaderboard-container");
  const show2020  = currentYear === 2020;

  let html = '<table class="leaderboard-table">';
  html += '<thead><tr>';
  html += '<th>#</th><th>Player</th>';
  if (show2020) html += '<th>Qual</th><th>RR</th>';
  html += '<th>R1</th><th>R2</th><th>R3</th><th>R4</th><th>Total</th>';
  html += '</tr></thead><tbody>';

  let rank = 0;
  let prevTotal = null;

  scores.forEach((player, index) => {
    if (player.total !== prevTotal) { rank = index + 1; prevTotal = player.total; }
    const isLeader = rank === 1 && player.total > 0;
    const rankClass = isLeader ? ' class="leader"' : "";
    html += '<tr' + rankClass + '>';
    html += '<td>' + rank + '</td>';
    html += '<td>' + player.name + '</td>';
    if (show2020) {
      html += '<td>' + (player.qualScore || 0) + '</td>';
      html += '<td>' + (player.rrScore   || 0) + '</td>';
    }
    html += '<td>' + (player.roundScores[1] || 0) + '</td>';
    html += '<td>' + (player.roundScores[2] || 0) + '</td>';
    html += '<td>' + (player.roundScores[3] || 0) + '</td>';
    html += '<td>' + (player.roundScores[4] || 0) + '</td>';
    html += '<td class="total">' + player.total + '</td>';
    html += '</tr>';
  });

  html += '</tbody></table>';
  container.innerHTML = show2020
    ? '<div style="overflow-x:auto;">' + html + '</div>'
    : html;
}

function renderPicksGrid(allPicks, bracketData) {
  const container = document.getElementById("grid-container");
  const players   = getPlayersForYear(currentYear);
  let html = "";

  // 2021: round 0 grid section
  if (currentYear === 2021) {
    html += '<div class="grid-round">';
    html += '<h3>Round 0 (0 pts)</h3>';
    html += '<table class="grid-table"><thead><tr><th>Series</th>';
    for (const p of players) html += '<th>' + PLAYER_DISPLAY[p] + '</th>';
    html += '<th>Winner</th></tr></thead><tbody>';
    for (const series of YEAR_2021_EXTRA.round0) {
      html += '<tr>';
      html += '<td class="matchup-cell">' + series.label + '<br><small>' + series.topTeam + ' vs ' + series.bottomTeam + '</small></td>';
      for (const p of players) {
        const pick = (allPicks[p] && allPicks[p].round0) ? (allPicks[p].round0[series.id] || "—") : "—";
        let cls = "pick-cell";
        if (pick !== "—") cls += pick === series.winner ? " correct" : " incorrect";
        html += '<td class="' + cls + '">' + (pick !== "—" ? pick.split(" ").pop() : "—") + '</td>';
      }
      html += '<td class="result-cell">' + series.winner.split(" ").pop() + '</td>';
      html += '</tr>';
    }
    html += '</tbody></table></div>';
  }

  // 2020: qualifying and round robin grid sections
  if (currentYear === 2020) {
    // Qualifying grid
    html += '<div class="grid-round">';
    html += '<h3>Qualifying Round</h3>';
    html += '<table class="grid-table"><thead><tr><th>Series</th>';
    for (const p of players) html += '<th>' + PLAYER_DISPLAY[p] + '</th>';
    html += '<th>Winner</th></tr></thead><tbody>';
    for (const series of YEAR_2020_EXTRA.qualifying) {
      html += '<tr>';
      html += '<td class="matchup-cell">' + series.label + '<br><small>' + series.topTeam + ' vs ' + series.bottomTeam + '</small></td>';
      for (const p of players) {
        const pick = (allPicks[p] && allPicks[p].qualifying) ? (allPicks[p].qualifying[series.id] || "—") : "—";
        let cls = "pick-cell";
        if (pick !== "—") cls += pick === series.winner ? " correct" : " incorrect";
        html += '<td class="' + cls + '">' + (pick !== "—" ? pick.split(" ").pop() : "—") + '</td>';
      }
      html += '<td class="result-cell">' + series.winner.split(" ").pop() + '</td>';
      html += '</tr>';
    }
    html += '</tbody></table></div>';

    // Round robin grid
    html += '<div class="grid-round">';
    html += '<h3>Round Robin Seeding</h3>';
    html += '<table class="grid-table"><thead><tr><th>Seed</th>';
    for (const p of players) html += '<th>' + PLAYER_DISPLAY[p] + '</th>';
    html += '<th>Actual</th></tr></thead><tbody>';
    for (const conf of ["east", "west"]) {
      const actual = YEAR_2020_EXTRA.roundrobin[conf];
      const confLabel = conf === "east" ? "East" : "West";
      for (let pos = 0; pos < 4; pos++) {
        html += '<tr>';
        html += '<td class="matchup-cell">' + confLabel + ' ' + (pos + 1) + getOrdinalSuffix(pos + 1) + '</td>';
        for (const p of players) {
          const rrPicks = (allPicks[p] && allPicks[p].roundrobin && allPicks[p].roundrobin[conf]) || [];
          const pick    = rrPicks[pos] || "—";
          let cls = "pick-cell";
          if (pick !== "—") cls += pick === actual[pos] ? " correct" : " incorrect";
          html += '<td class="' + cls + '">' + (pick !== "—" ? pick.split(" ").pop() : "—") + '</td>';
        }
        html += '<td class="result-cell">' + actual[pos].split(" ").pop() + '</td>';
        html += '</tr>';
      }
    }
    html += '</tbody></table></div>';
  }

  for (let round = 1; round <= 4; round++) {
    const seriesList = bracketData.rounds[round];
    if (!seriesList || seriesList.length === 0) continue;

    const hasTeams = seriesList.some(s => s.topTeam || s.bottomTeam);
    if (!hasTeams) continue;

    html += '<div class="grid-round">';
    html += '<h3>' + getRoundLabel(round) + '</h3>';
    html += '<table class="grid-table">';
    html += '<thead><tr><th>Series</th>';
    for (const p of players) {
      html += '<th>' + PLAYER_DISPLAY[p] + '</th>';
    }
    html += '<th>Result</th></tr></thead><tbody>';

    for (const series of seriesList) {
      if (!series.topTeam && !series.bottomTeam) continue;

      const roundKey = "round" + round;
      const result = bracketData.results[series.matchup];
      const topName    = series.topTeam    || "TBD";
      const bottomName = series.bottomTeam || "TBD";

      html += '<tr>';
      html += '<td class="matchup-cell">' + getMatchupLabel(series.matchup) + '<br><small>' + topName + ' vs ' + bottomName + '</small></td>';

      for (const p of players) {
        const playerData = allPicks[p] || {};
        const roundPicks = playerData[roundKey] || {};
        const pick = roundPicks[series.matchup] || "—";

        let cellClass = "pick-cell";
        if (result && pick !== "—") {
          cellClass += pick === result ? " correct" : " incorrect";
        }

        // Show abbreviated team name
        let displayPick = pick;
        if (pick !== "—") {
          // Use last word of team name for compact display
          const parts = pick.split(" ");
          displayPick = parts[parts.length - 1];
        }

        html += '<td class="' + cellClass + '">' + displayPick + '</td>';
      }

      html += '<td class="result-cell">' + (result || series.status) + '</td>';
      html += '</tr>';
    }

    html += '</tbody></table></div>';
  }

  container.innerHTML = html;
}

function renderResults(bracketData) {
  const container = document.getElementById("results-container");
  let html = "";

  // 2021: round 0 result section
  if (currentYear === 2021) {
    html += '<div class="results-round">';
    html += '<h3>Round 0 (0 pts)</h3>';
    html += '<div class="results-grid">';
    for (const series of YEAR_2021_EXTRA.round0) {
      const topWin    = series.winner === series.topTeam;
      const bottomWin = series.winner === series.bottomTeam;
      html += '<div class="result-row">';
      html += '  <span class="matchup-label">' + series.label + '</span>';
      html += '  <div class="result-matchup">';
      html += '    <span class="result-team' + (topWin    ? " series-winner" : "") + '">' + series.topTeam    + ' <span class="wins-count">' + series.topWins    + '</span></span>';
      html += '    <span class="result-team' + (bottomWin ? " series-winner" : "") + '">' + series.bottomTeam + ' <span class="wins-count">' + series.bottomWins + '</span></span>';
      html += '  </div>';
      html += '</div>';
    }
    html += '</div></div>';
  }

  // 2020: qualifying and round robin result sections
  if (currentYear === 2020) {
    html += '<div class="results-round">';
    html += '<h3>Qualifying Round</h3>';
    html += '<div class="results-grid">';
    for (const series of YEAR_2020_EXTRA.qualifying) {
      const topWin    = series.winner === series.topTeam;
      const bottomWin = series.winner === series.bottomTeam;
      html += '<div class="result-row">';
      html += '  <span class="matchup-label">' + series.label + '</span>';
      html += '  <div class="result-matchup">';
      html += '    <span class="result-team' + (topWin    ? " series-winner" : "") + '">' + series.topTeam    + ' <span class="wins-count">' + series.topWins    + '</span></span>';
      html += '    <span class="result-team' + (bottomWin ? " series-winner" : "") + '">' + series.bottomTeam + ' <span class="wins-count">' + series.bottomWins + '</span></span>';
      html += '  </div>';
      html += '</div>';
    }
    html += '</div></div>';

    html += '<div class="results-round">';
    html += '<h3>Round Robin Final Standings</h3>';
    html += '<div class="results-grid">';
    for (const conf of ["east", "west"]) {
      const label  = conf === "east" ? "East" : "West";
      const teams  = YEAR_2020_EXTRA.roundrobin[conf];
      html += '<div class="result-row">';
      html += '  <span class="matchup-label">' + label + '</span>';
      html += '  <div class="result-matchup">';
      teams.forEach((team, i) => {
        html += '<span class="result-team series-winner">' + (i + 1) + '. ' + team + '</span>';
      });
      html += '  </div>';
      html += '</div>';
    }
    html += '</div></div>';
  }

  for (let round = 1; round <= 4; round++) {
    const seriesList = bracketData.rounds[round];
    if (!seriesList || seriesList.length === 0) continue;

    const hasTeams = seriesList.some(s => s.topTeam || s.bottomTeam);
    if (!hasTeams) continue;

    html += '<div class="results-round">';
    html += '<h3>' + getRoundLabel(round) + '</h3>';
    html += '<div class="results-grid">';

    for (const series of seriesList) {
      if (!series.topTeam && !series.bottomTeam) continue;

      const topName    = series.topTeam    || "TBD";
      const bottomName = series.bottomTeam || "TBD";
      const topWinClass    = series.winner && series.winner === series.topTeam    ? " series-winner" : "";
      const bottomWinClass = series.winner && series.winner === series.bottomTeam ? " series-winner" : "";

      html += '<div class="result-row">';
      html += '  <span class="matchup-label">' + getMatchupLabel(series.matchup) + '</span>';
      html += '  <div class="result-matchup">';
      html += '    <span class="result-team' + topWinClass + '">';
      html += '      <span class="seed">' + (series.topSeedRank || '') + '</span> ' + topName;
      if (series.topTeam) html += '      <span class="wins-count">' + series.topWins + '</span>';
      html += '    </span>';
      html += '    <span class="result-team' + bottomWinClass + '">';
      html += '      <span class="seed">' + (series.bottomSeedRank || '') + '</span> ' + bottomName;
      if (series.bottomTeam) html += '      <span class="wins-count">' + series.bottomWins + '</span>';
      html += '    </span>';
      html += '  </div>';
      html += '</div>';
    }

    html += '</div>';
    html += '</div>';
  }

  container.innerHTML = html;
}
