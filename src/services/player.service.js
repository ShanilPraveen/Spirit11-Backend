const prisma = require('../config/prisma');
const { calculatePlayerPoints } = require('../utils/points');

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Attaches computed points to a player object (does not mutate DB). */
function withPoints(player) {
  return { ...player, points: calculatePlayerPoints(player) };
}

// ── Player service functions ─────────────────────────────────────────────────

/**
 * Returns a paginated, optionally filtered list of players.
 * Default limit is 100 to return the full roster in one call for the user UI.
 */
async function getAllPlayers({ position, university, page = 1, limit = 100 } = {}) {
  const filters = {};
  if (position   && position   !== 'all') filters.position   = position;
  if (university && university !== 'all') filters.university = university;

  const pageNum  = parseInt(page);
  const limitNum = parseInt(limit);

  const [players, total] = await Promise.all([
    prisma.player.findMany({
      where: filters,
      skip:  (pageNum - 1) * limitNum,
      take:  limitNum,
      orderBy: { name: 'asc' },
    }),
    prisma.player.count({ where: filters }),
  ]);

  return {
    data: players, // points NOT included here — user-facing lists must not show points
    page: pageNum,
    totalPages: Math.ceil(total / limitNum),
    totalPlayers: total,
  };
}

/**
 * Returns a single player by ID.
 * Always includes computed points (admin uses this; user UI must not render points).
 */
async function getPlayerById(id) {
  const player = await prisma.player.findUnique({ where: { id } });

  if (!player) {
    const err = new Error('Player not found');
    err.status = 404;
    throw err;
  }

  return withPoints(player);
}

/** Creates a new player (admin only). Returns the player with computed points. */
async function createPlayer(data) {
  const player = await prisma.player.create({ data });
  return withPoints(player);
}

/** Updates an existing player (admin only). Returns the updated player with computed points. */
async function updatePlayer(id, data) {
  let player;
  try {
    player = await prisma.player.update({ where: { id }, data });
  } catch (error) {
    if (error.code === 'P2025') {
      const err = new Error('Player not found');
      err.status = 404;
      throw err;
    }
    throw error;
  }
  return withPoints(player);
}

/** Deletes a player (admin only). */
async function deletePlayer(id) {
  try {
    await prisma.player.delete({ where: { id } });
  } catch (error) {
    if (error.code === 'P2025') {
      const err = new Error('Player not found');
      err.status = 404;
      throw err;
    }
    throw error;
  }
}

/**
 * Aggregates tournament-level statistics across all players.
 * Returns overall runs, overall wickets, highest run scorer, highest wicket taker.
 */
async function getTournamentSummary() {
  const players = await prisma.player.findMany();

  if (!players.length) {
    return { overallRuns: 0, overallWickets: 0, highestRunScorer: null, highestWicketTaker: null };
  }

  const overallRuns    = players.reduce((sum, p) => sum + p.runs, 0);
  const overallWickets = players.reduce((sum, p) => sum + p.wickets, 0);

  const highestRunScorer = players.reduce((best, p) => (p.runs > best.runs ? p : best));
  const highestWicketTaker = players.reduce((best, p) => (p.wickets > best.wickets ? p : best));

  return {
    overallRuns,
    overallWickets,
    highestRunScorer:    { name: highestRunScorer.name,    university: highestRunScorer.university,    runs:    highestRunScorer.runs },
    highestWicketTaker:  { name: highestWicketTaker.name,  university: highestWicketTaker.university,  wickets: highestWicketTaker.wickets },
  };
}

module.exports = { getAllPlayers, getPlayerById, createPlayer, updatePlayer, deletePlayer, getTournamentSummary };
