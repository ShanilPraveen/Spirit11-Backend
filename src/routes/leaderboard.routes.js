const express = require('express');
const router = express.Router();
const leaderboardController = require('../controllers/leaderboard.controller');
const authenticateToken = require('../middlewares/auth');

// Leaderboard is only accessible to authenticated users
router.get('/', authenticateToken, leaderboardController.getLeaderboard);

module.exports = router;
