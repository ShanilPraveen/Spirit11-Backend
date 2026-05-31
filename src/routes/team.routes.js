const express = require('express');
const router = express.Router();
const teamController = require('../controllers/team.controller');
const authenticateToken = require('../middlewares/auth');

// All team routes require a valid access token.
// userId is always derived from req.user.userId (set by authenticateToken) — never from the body.
router.get('/my',                authenticateToken, teamController.getMyTeam);
router.post('/addPlayer',        authenticateToken, teamController.addPlayerToTeam);
router.delete('/removePlayer/:id', authenticateToken, teamController.removePlayerFromTeam);

module.exports = router;
