/**
 * points & value calculation formulas
 *
 * Formulas:
 *   Batting Strike Rate  = (Total Runs / Total Balls Faced) * 100
 *   Batting Average      = Total Runs / Innings Played
 *   Bowling Strike Rate  = Total Balls Bowled / Total Wickets Taken
 *   Economy Rate         = (Total Runs Conceded / Total Balls Bowled) * 6
 *
 *   Player Points =
 *     (Batting Strike Rate / 5)
 *     + (Batting Average * 0.8)
 *     + (500 / Bowling Strike Rate)   [only when wickets > 0 and balls bowled > 0]
 *     + (140 / Economy Rate)          [only when balls bowled > 0]
 *
 *   Player Value = round(((9 * Points) + 100) * 1000) to nearest 50,000
 */

/**
 * Calculates fantasy points from raw performance stats.
 *
 * @param {number} runs
 * @param {number} ballsFaced
 * @param {number} inningsPlayed
 * @param {number} wickets
 * @param {number} oversBowled
 * @param {number} runsConceded
 * @returns {number}
 */
function calculatePoints(runs, ballsFaced, inningsPlayed, wickets, oversBowled, runsConceded) {
  const ballsBowled = Math.round(oversBowled * 6);

  const battingStrikeRate = ballsFaced > 0 ? (runs / ballsFaced) * 100 : 0;
  const battingAverage    = inningsPlayed > 0 ? runs / inningsPlayed : 0;
  const bowlingStrikeRate = wickets > 0 && ballsBowled > 0 ? ballsBowled / wickets : null;
  const economyRate       = ballsBowled > 0 ? (runsConceded / ballsBowled) * 6 : null;

  let points = 0;
  points += battingStrikeRate / 5;
  points += battingAverage * 0.8;
  if (bowlingStrikeRate !== null) points += 500 / bowlingStrikeRate;
  if (economyRate !== null)       points += 140 / economyRate;

  return points;
}

/**
 * Calculates player monetary value from points.
 * Rounds to nearest multiple of 50,000.
 *
 * @param {number} points
 * @returns {number}
 */
function calculateValue(points) {
  const raw = ((9 * points) + 100) * 1000;
  return Math.round(raw / 50000) * 50000;
}

/**
 * wrapper to accept a Prisma Player object directly.
 *
 * @param {{ runs: number, ballsFaced: number, inningsPlayed: number, wickets: number, oversBowled: number, runsConceded: number }} player
 * @returns {number}
 */
function calculatePlayerPoints(player) {
  return calculatePoints(
    player.runs,
    player.ballsFaced,
    player.inningsPlayed,
    player.wickets,
    player.oversBowled,
    player.runsConceded,
  );
}

module.exports = { calculatePoints, calculateValue, calculatePlayerPoints };
