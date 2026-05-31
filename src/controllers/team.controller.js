const teamService = require('../services/team.service');
const { getIO } = require('../config/socket');

/**
 * GET /api/teams/my
 * Returns the authenticated user's team (null if they have none yet).
 * userId is always taken from the verified JWT — never from the request body.
 */
async function getMyTeam(req, res) {
  try {
    const team = await teamService.getMyTeam(req.user.userId);
    res.status(200).json(team); // null is a valid response (no team yet)
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message || 'Internal Server Error' });
  }
}

/**
 * POST /api/teams/addPlayer
 * Body: { playerId: string }
 * userId comes from JWT — body only needs the playerId.
 */
async function addPlayerToTeam(req, res) {
  const { playerId } = req.body;
  if (!playerId) {
    return res.status(400).json({ error: 'playerId is required in request body' });
  }
  try {
    const team = await teamService.addPlayerToTeam(req.user.userId, playerId);
    // Notify this user's personal room + all clients watching the leaderboard
    getIO().to(`user:${req.user.userId}`).emit('team:updated', team);
    getIO().emit('leaderboard:updated');
    res.status(201).json(team);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message || 'Internal Server Error' });
  }
}

/**
 * DELETE /api/teams/removePlayer/:id
 * :id = playerId to remove
 * userId comes from JWT.
 */
async function removePlayerFromTeam(req, res) {
  const playerId = req.params.id;
  try {
    const team = await teamService.removePlayerFromTeam(req.user.userId, playerId);
    getIO().to(`user:${req.user.userId}`).emit('team:updated', team);
    getIO().emit('leaderboard:updated');
    res.status(200).json(team);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message || 'Internal Server Error' });
  }
}

module.exports = { getMyTeam, addPlayerToTeam, removePlayerFromTeam };
