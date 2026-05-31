const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const authenticateToken = require('../middlewares/auth');

router.post('/signup',  authController.signup);
router.post('/login',   authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout',  authController.logout);
router.get('/me', authenticateToken, authController.getMe);

module.exports = router;
