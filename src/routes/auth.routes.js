const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');  
const bcrypt = require('bcryptjs');

const ACCESS_SECRET = process.env.ACCESS_TOKEN_SECRET;
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET;

const generateTokens = async(user) => {
    const accessToken = jwt.sign({ userId: user.id ,role: user.role}, ACCESS_SECRET, { expiresIn: '15m' });

    const refreshToken = jwt.sign({ userId: user.id }, REFRESH_SECRET, { expiresIn: '7d' });

    await prisma.refreshToken.create({
        data: {
            token: refreshToken,
            userId: user.id
        }
    });

    return { accessToken, refreshToken };
};


router.post("/signup", async (req, res) => {
    const { username, password, role } = req.body;

    if (!username || !password || !role) {
        return res.status(400).json({ error: "Username, password, and role are required" });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await prisma.user.create({
            data: {
                username,
                password: hashedPassword,
                role: role || 'user'  // Default role to 'user' if not provided
            },
        });
        res.status(201).json({ message: "User created successfully", userId: newUser.id });

        
    } catch (error) {
        console.error("Error signing up:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.post("/login", async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { username }
        });

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: "Invalid password" });
        }

        const tokens = await generateTokens(user);
        res.status(200).json(tokens);
        
    } catch (error) {
        console.error("Error logging in:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.post("/refresh",async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(401).json({ error: "Refresh token is required" });
    }

    try {
        const payload = jwt.verify(refreshToken, REFRESH_SECRET);
        const existingToken = await prisma.refreshToken.findUnique({
            where: { token: refreshToken }
        });

        if (!existingToken) {
            return res.status(403).json({ error: "Invalid refresh token" });
        }

        const user = await prisma.user.findUnique({
            where: { id: payload.userId }
        });

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const tokens = await generateTokens(user);
        res.status(200).json(tokens);

    } catch (error) {
        console.error("Error refreshing token:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        username: true,
        role: true,
        money: true
      }
    });

    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    console.error("Error fetching user profile:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});


router.get("/logout", async (req, res) => {
    const {token} = req.query;
    try{
        await prisma.refreshToken.delete({
            where: { token }
        });
        res.status(200).json({ message: "Logged out successfully" });
    } catch (error) {
        console.error("Error logging out:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

module.exports = router;