const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const chatbotController = require('../controllers/chatbot.controller');
const authenticateToken = require('../middlewares/auth');

// Protect chat streaming from high token consumption
const chatLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window
  max: 20, // max 20 requests per IP per minute
  message: { error: "Too many chat messages. Please wait a minute before trying again." },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/message/stream', authenticateToken, chatLimiter, chatbotController.streamChat);
router.post('/clear',          authenticateToken,              chatbotController.clearHistory);

module.exports = router;
