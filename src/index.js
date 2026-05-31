require('dotenv').config();
const express    = require('express');
const http       = require('http');
const cors       = require('cors');
const cookieParser = require('cookie-parser');

const { initSocket } = require('./config/socket');
const playerRoutes     = require('./routes/player.routes');
const teamRoutes       = require('./routes/team.routes');
const authRoutes       = require('./routes/auth.routes');
const leaderboardRoutes = require('./routes/leaderboard.routes');

const app        = express();
const httpServer = http.createServer(app);

// ── WebSocket (Socket.IO) ────────────────────────────────────────────────────
// Must be initialised before routes so controllers can call getIO() safely.
initSocket(httpServer);

// ── Global middleware ────────────────────────────────────────────────────────
app.use(cors({
  origin:      process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── API routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',        authRoutes);
app.use('/api/players',     playerRoutes);
app.use('/api/teams',       teamRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Spirit11 backend is running!' });
});

// ── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`🚀 HTTP server   → http://localhost:${PORT}`);
  console.log(`🔌 WebSocket     → ws://localhost:${PORT}`);
});