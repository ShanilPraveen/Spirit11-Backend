const express = require('express');
const router = express.Router();
const playerController = require('../controllers/player.controller');
const authenticateToken = require('../middlewares/auth');
const requireAdmin = require('../middlewares/requireAdmin');
 
router.get('/summary',  authenticateToken, requireAdmin, playerController.getTournamentSummary);
router.get('/',         authenticateToken,               playerController.getAllPlayers);
router.get('/:id',      authenticateToken,               playerController.getPlayerById);

// Admin-only routes
router.post('/',        authenticateToken, requireAdmin, playerController.createPlayer);
router.put('/:id',      authenticateToken, requireAdmin, playerController.updatePlayer);
router.delete('/:id',   authenticateToken, requireAdmin, playerController.deletePlayer);

module.exports = router;