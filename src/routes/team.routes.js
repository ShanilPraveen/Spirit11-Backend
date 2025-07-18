const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const authenticateToken = require('../middlewares/auth');

router.get("/", async (req, res) => {
    try {
        const players = await prisma.player.findMany({
            orderBy: {
                name: 'asc'
            }
        });
        res.status(200).json(players);
    } catch (error) {
        console.error("Error fetching players:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
})

router.post("/create",authenticateToken,async(req,res)=>{
    const {userId} = req.body;
    try {
        const existing = await prisma.team.findUnique({
            where: { userId: userId }
        });
        if (existing) {
            return res.status(400).json({ error: "Team already exists for this user" });
        }
        const newTeam = await prisma.team.create({
            data: { userId: userId }
        });
        res.status(201).json(newTeam);
    } catch (error) {
        console.error("Error creating team:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
})

router.post("/addPlayer",authenticateToken, async (req, res) => {
    const { userId, playerId } = req.body;
    const player = await prisma.player.findUnique({ where: { id: playerId } });
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (user.money < player.value) {
        return res.status(400).json({ error: "Not enough balance" });
    }

    try {
        const team = await prisma.team.findUnique({
            where: { userId },
            include: { players: true }
        });
        if (!team) {
            return res.status(404).json({ error: "Team not found for this user" });
        }

        if (team.players.length >= 11) {
            return res.status(400).json({ error: "Team already has 11 players" });
        }
        const added = await prisma.teamPlayer.create({
            data: { teamId: team.id, playerId: playerId }
        });
        await prisma.user.update({
            where: { id: userId },
            data: { money: user.money - player.value }
        });

        res.status(201).json(added);
    } catch (error) {
        console.error("Error adding player to team:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
})

router.get("/my",authenticateToken,async(req,res)=>{
    const {userId} = req.query;
    try {
        const team = await prisma.team.findUnique({
            where: { userId: userId },
            include: {
                 players: {
                    include: {
                        player: true,
                    },
                 },
            },
        });
        if (!team) {
            return res.status(404).json({ error: "Team not found for this user" });
        }
        const formatted = { ...team, players: team.players.map(tp => tp.player) };
        res.status(200).json(formatted);
    } catch (error) {
        console.error("Error fetching team:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.delete("/removePlayer/:id",authenticateToken, async (req, res) => {
    const { id: playerId } = req.params;
    const { userId } = req.body;

    const player = await prisma.player.findUnique({ where: { id: playerId } });
    const user = await prisma.user.findUnique({ where: { id: userId } });

    try {
        const team = await prisma.team.findUnique({
            where: { userId: userId },
            include: { players: true }
        })
        if (!team) {
            return res.status(404).json({ error: "Team not found for this user" });
        }
        await prisma.teamPlayer.deleteMany({
            where: {
                teamId: team.id,
                playerId: playerId
            }
        });
        await prisma.user.update({
            where: { id: userId },
            data: { money: user.money + player.value }
        });

        res.status(200).json({ message: "Player removed from team successfully" });
    } catch (error) {
        console.error("Error removing player from team:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

module.exports = router;
