const prisma = require('../config/prisma');
const { calculatePlayerPoints } = require('../utils/points');

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Finds a user's team or creates one if it doesn't exist yet.
 * This allows the first addPlayer call to work without a separate "create team" step.
 */
async function findOrCreateTeam(userId) {
  let team = await prisma.team.findUnique({ where: { userId } });
  if (!team) {
    team = await prisma.team.create({ data: { userId } });
  }
  return team;
}

/**
 * Builds the full team response object.
 * Players include computed points (for team total points calculation).
 */
async function buildTeamResponse(userId) {
  const team = await prisma.team.findUnique({
    where: { userId },
    include: {
      players: {
        include: { player: true },
        orderBy: { addedAt: 'asc' },
      },
    },
  });

  if (!team) return null;

  // Attach computed points to each player
  const players = team.players.map((tp) => ({
    ...tp.player,
    points: calculatePlayerPoints(tp.player),
  }));

  return { ...team, players };
}

// ── Team service functions ───────────────────────────────────────────────────

/**
 * Returns the authenticated user's team.
 * Returns null if the user has no team yet.
 */
async function getMyTeam(userId) {
  return buildTeamResponse(userId);
}

/**
 * Adds a player to the user's team.
 * - Auto-creates the team if it doesn't exist.
 * - Validates budget, team size (max 11), and duplicate membership.
 * - Deducts player value from user's money atomically.
 */
async function addPlayerToTeam(userId, playerId) {
  const [player, user] = await Promise.all([
    prisma.player.findUnique({ where: { id: playerId } }),
    prisma.user.findUnique({ where: { id: userId } }),
  ]);

  if (!player) {
    const err = new Error('Player not found');
    err.status = 404;
    throw err;
  }
  if (!user) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }
  if (user.money < player.value) {
    const err = new Error('Insufficient budget to add this player');
    err.status = 400;
    throw err;
  }

  const team = await findOrCreateTeam(userId);

  const playerCount = await prisma.teamPlayer.count({ where: { teamId: team.id } });
  if (playerCount >= 11) {
    const err = new Error('Team already has 11 players');
    err.status = 400;
    throw err;
  }

  const alreadyInTeam = await prisma.teamPlayer.findUnique({
    where: { teamId_playerId: { teamId: team.id, playerId } },
  });
  if (alreadyInTeam) {
    const err = new Error('Player is already in your team');
    err.status = 400;
    throw err;
  }

  // Atomic: add player + deduct budget
  await prisma.$transaction([
    prisma.teamPlayer.create({ data: { teamId: team.id, playerId } }),
    prisma.user.update({ where: { id: userId }, data: { money: user.money - player.value } }),
  ]);

  return buildTeamResponse(userId);
}

/**
 * Removes a player from the user's team.
 * Refunds the player's value to the user's budget atomically.
 */
async function removePlayerFromTeam(userId, playerId) {
  const [player, user] = await Promise.all([
    prisma.player.findUnique({ where: { id: playerId } }),
    prisma.user.findUnique({ where: { id: userId } }),
  ]);

  if (!player) {
    const err = new Error('Player not found');
    err.status = 404;
    throw err;
  }
  if (!user) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }

  const team = await prisma.team.findUnique({ where: { userId } });
  if (!team) {
    const err = new Error('You do not have a team yet');
    err.status = 404;
    throw err;
  }

  const teamPlayer = await prisma.teamPlayer.findUnique({
    where: { teamId_playerId: { teamId: team.id, playerId } },
  });
  if (!teamPlayer) {
    const err = new Error('Player is not in your team');
    err.status = 400;
    throw err;
  }

  // Atomic: remove player + refund budget
  await prisma.$transaction([
    prisma.teamPlayer.delete({ where: { teamId_playerId: { teamId: team.id, playerId } } }),
    prisma.user.update({ where: { id: userId }, data: { money: user.money + player.value } }),
  ]);

  return buildTeamResponse(userId);
}

module.exports = { getMyTeam, addPlayerToTeam, removePlayerFromTeam };
