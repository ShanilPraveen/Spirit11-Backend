const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

router.get('/', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        team: {
          include: {
            players: {
              include: {
                player: true
              }
            }
          }
        }
      }
    });

    const leaderboard = users
      .map(user => {
        const teamPlayers = user.team?.players || [];
        const totalValue = teamPlayers.reduce((sum, tp) => sum + tp.player.value, 0);
        const totalRuns = teamPlayers.reduce((sum, tp) => sum + tp.player.runs, 0);

        return {
          username: user.username,
          role: user.role,
          totalValue,
          totalRuns
        };
      })
      .sort((a, b) => b.totalValue - a.totalValue); 

    res.json(leaderboard);
  } catch (err) {
    console.error("Error building leaderboard:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
