const playerService = require('../services/player.service');
const { getIO } = require('../config/socket');

async function getAllPlayers(req, res) {
  try {
    const result = await playerService.getAllPlayers(req.query);
    res.status(200).json(result);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message || 'Internal Server Error' });
  }
}

async function getPlayerById(req, res) {
  try {
    const player = await playerService.getPlayerById(req.params.id);
    res.status(200).json(player);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message || 'Internal Server Error' });
  }
}

async function createPlayer(req, res) {
  try {
    const player = await playerService.createPlayer(req.body);
    // Notify all connected clients that the player list has changed
    getIO().emit('players:updated');
    res.status(201).json(player);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message || 'Internal Server Error' });
  }
}

async function updatePlayer(req, res) {
  try {
    const player = await playerService.updatePlayer(req.params.id, req.body);
    getIO().emit('players:updated');
    // Also refresh leaderboard in case value/stats changed
    getIO().emit('leaderboard:updated');
    res.status(200).json(player);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message || 'Internal Server Error' });
  }
}

async function deletePlayer(req, res) {
  try {
    await playerService.deletePlayer(req.params.id);
    getIO().emit('players:updated');
    getIO().emit('leaderboard:updated');
    res.status(204).send();
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message || 'Internal Server Error' });
  }
}

async function getTournamentSummary(req, res) {
  try {
    const summary = await playerService.getTournamentSummary();
    res.status(200).json(summary);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message || 'Internal Server Error' });
  }
}

module.exports = { getAllPlayers, getPlayerById, createPlayer, updatePlayer, deletePlayer, getTournamentSummary };
