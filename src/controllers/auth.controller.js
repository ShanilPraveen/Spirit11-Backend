const authService = require('../services/auth.service');

async function signup(req, res) {
  const { username, password, role } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  try {
    // role defaults to 'user' — the admin is pre-seeded, never signed up via this endpoint
    const result = await authService.signup(username, password, role || 'user', res);
    res.status(201).json(result);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message || 'Internal Server Error' });
  }
}

async function login(req, res) {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  try {
    const result = await authService.login(username, password, res);
    res.status(200).json(result);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message || 'Internal Server Error' });
  }
}

async function refresh(req, res) {
  const token = req.cookies.refreshToken;
  if (!token) {
    return res.status(401).json({ error: 'Refresh token is required' });
  }
  try {
    const result = await authService.refresh(token, res);
    res.status(200).json(result);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message || 'Internal Server Error' });
  }
}

async function logout(req, res) {
  const token = req.cookies.refreshToken;
  try {
    await authService.logout(token);
    res.clearCookie('refreshToken');
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message || 'Internal Server Error' });
  }
}

async function getMe(req, res) {
  try {
    const user = await authService.getMe(req.user.userId);
    res.json(user);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message || 'Internal Server Error' });
  }
}

module.exports = { signup, login, refresh, logout, getMe };
