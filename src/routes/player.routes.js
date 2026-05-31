const express = require('express');
const router = express.Router();
const playerController = require('../controllers/player.controller');
const authenticateToken = require('../middlewares/auth');
const requireAdmin = require('../middlewares/requireAdmin');

// ── Public-ish routes (authentication still required per spec) ────────────────
// GET /summary must be declared before GET /:id to prevent 'summary' matching as an ID param
router.get('/summary',  authenticateToken, requireAdmin, playerController.getTournamentSummary);
router.get('/',         authenticateToken,               playerController.getAllPlayers);
router.get('/:id',      authenticateToken,               playerController.getPlayerById);

// ── Admin-only mutations ──────────────────────────────────────────────────────
router.post('/',        authenticateToken, requireAdmin, playerController.createPlayer);
router.put('/:id',      authenticateToken, requireAdmin, playerController.updatePlayer);
router.delete('/:id',   authenticateToken, requireAdmin, playerController.deletePlayer);

module.exports = router;