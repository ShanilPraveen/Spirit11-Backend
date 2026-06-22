const { Server } = require('socket.io');

/** @type {import('socket.io').Server} */
let io;

/**
 * Initializes the Socket.IO server and attaches it to the given HTTP server.
 * called once at application startup.
 *
 * Events emitted by the server:
 *   - 'players:updated'      → any player was created, updated, or deleted
 *   - 'leaderboard:updated'  → team composition changed
 *   - 'team:updated'         → emitted to a user-specific room when their team changes
 *
 * Clients should join their personal room by emitting 'join:user' with their userId
 * after authenticating, so they receive targeted 'team:updated' events.
 */
function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // Client joins its own room to receive team-specific updates
    socket.on('join:user', (userId) => {
      socket.join(`user:${userId}`);
      console.log(`   ↳ Socket ${socket.id} joined room user:${userId}`);
    });

    socket.on('disconnect', () => {
      console.log(`❌ Socket disconnected: ${socket.id}`);
    });
  });

  return io;
}

/**
 * Returns the initialized Socket.IO instance.
 * Called this from controllers or services that need to emit events.
 */
function getIO() {
  if (!io) throw new Error('Socket.IO has not been initialized. Call initSocket() first.');
  return io;
}

module.exports = { initSocket, getIO };
