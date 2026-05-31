const { Prisma } = require('@prisma/client');
const prisma = require('../config/prisma');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const ACCESS_SECRET  = process.env.ACCESS_TOKEN_SECRET;
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET;

// ── Token helper ─────────────────────────────────────────────────────────────

/**
 * Generates a new access token and rotates the refresh token.
 * The refresh token is stored in the DB and sent as an HttpOnly cookie.
 *
 * @param {{ id: string, role: string }} user
 * @param {import('express').Response} res
 * @returns {Promise<string>} new access token
 */
async function generateTokens(user, res) {
  const accessToken = jwt.sign(
    { userId: user.id, role: user.role },
    ACCESS_SECRET,
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    { userId: user.id },
    REFRESH_SECRET,
    { expiresIn: '7d' }
  );

  // Rotate: delete old refresh tokens for this user, insert the new one
  await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
  await prisma.refreshToken.create({ data: { token: refreshToken, userId: user.id } });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  return accessToken;
}

// ── Auth service functions ───────────────────────────────────────────────────

async function signup(username, password, role, res) {
  const hashedPassword = await bcrypt.hash(password, 10);

  let newUser;
  try {
    newUser = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        role: role || 'user',
        money: 10000000,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const err = new Error('Username already exists');
      err.status = 409;
      throw err;
    }
    throw error;
  }

  const accessToken = await generateTokens(newUser, res);
  return {
    user: { id: newUser.id, username: newUser.username, role: newUser.role, money: newUser.money },
    accessToken,
  };
}

async function login(username, password, res) {
  const user = await prisma.user.findUnique({ where: { username } });

  if (!user) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    const err = new Error('Invalid password');
    err.status = 401;
    throw err;
  }

  const accessToken = await generateTokens(user, res);
  return {
    user: { id: user.id, username: user.username, role: user.role, money: user.money },
    accessToken,
  };
}

async function refresh(refreshTokenValue, res) {
  let payload;
  try {
    payload = jwt.verify(refreshTokenValue, REFRESH_SECRET);
  } catch {
    const err = new Error('Invalid or expired refresh token');
    err.status = 403;
    throw err;
  }

  const existing = await prisma.refreshToken.findUnique({ where: { token: refreshTokenValue } });
  if (!existing) {
    const err = new Error('Refresh token not recognised');
    err.status = 403;
    throw err;
  }

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }

  const accessToken = await generateTokens(user, res);
  return { accessToken };
}

async function logout(refreshTokenValue) {
  if (refreshTokenValue) {
    // Ignore errors — token may already be gone
    await prisma.refreshToken.deleteMany({ where: { token: refreshTokenValue } });
  }
}

async function getMe(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, role: true, money: true },
  });

  if (!user) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }

  return user;
}

module.exports = { signup, login, refresh, logout, getMe };
