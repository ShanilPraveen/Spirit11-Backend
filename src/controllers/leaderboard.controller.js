const leaderboardService = require('../services/leaderboard.service');

async function getLeaderboard(req, res) {
  try {
    const leaderboard = await leaderboardService.getLeaderboard();
    res.status(200).json(leaderboard);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message || 'Internal Server Error' });
  }
}

module.exports = { getLeaderboard };
