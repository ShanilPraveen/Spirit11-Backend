const prisma = require('../config/prisma');
const { calculatePlayerPoints } = require('../utils/points');

/**
 * Builds the leaderboard by computing each user's total team points.
 *
 * Total team points = sum of calculatePlayerPoints(player) for all players in the team.
 * Only users with role 'user' appear on the leaderboard (admin is excluded).
 * Sorted by totalPoints descending; rank is 1-indexed.
 */
async function getLeaderboard() {
  const users = await prisma.user.findMany({
    where: { role: 'user' },
    select: {
      username: true,
      team: {
        select: {
          players: {
            select: { player: true },
          },
        },
      },
    },
  });

  const leaderboard = users
    .map((user) => {
      const teamPlayers = user.team?.players ?? [];
      const totalPoints = teamPlayers.reduce(
        (sum, tp) => sum + calculatePlayerPoints(tp.player),
        0,
      );
      return {
        username:    user.username,
        totalPoints: parseFloat(totalPoints.toFixed(2)),
        playerCount: teamPlayers.length,
      };
    })
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));

  return leaderboard;
}

module.exports = { getLeaderboard };
