const teamService = require('../services/team.service');
const { getIO } = require('../config/socket');

/**
 * Returns the authenticated user's team
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
 * Adds a player to the user's team
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
 * Removes a player from the user's team
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
