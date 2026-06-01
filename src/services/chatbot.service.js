const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
const { createReactAgent } = require("@langchain/langgraph/prebuilt");
const { MemorySaver } = require("@langchain/langgraph");
const { tool } = require("@langchain/core/tools");
const { HumanMessage, SystemMessage } = require("@langchain/core/messages");
const { z } = require("zod");
const prisma = require("../config/prisma");

// ── Rate limiter/API configuration ──────────────────────────────────────────
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// ── Tool definitions ─────────────────────────────────────────────────────────

/**
 * Fetches players from the database with filtering capability.
 * CRITICAL: Strips point values from results.
 */
const getPlayersTool = tool(
  async ({ position, university, maxPrice, search }) => {
    try {
      const filters = {};
      if (position) filters.position = position;
      if (university) filters.university = { contains: university, mode: "insensitive" };
      if (search) filters.name = { contains: search, mode: "insensitive" };
      if (maxPrice) filters.value = { lte: maxPrice };

      const players = await prisma.player.findMany({
        where: filters,
        orderBy: { name: "asc" },
        take: 30, // Cap at 30 to prevent token bloat
      });

      // Map details and strictly omit points
      const formatted = players.map(p => ({
        name: p.name,
        university: p.university,
        position: p.position,
        value: p.value,
        runs: p.runs,
        ballsFaced: p.ballsFaced,
        inningsPlayed: p.inningsPlayed,
        wickets: p.wickets,
        oversBowled: p.oversBowled,
        runsConceded: p.runsConceded,
      }));

      return JSON.stringify(formatted);
    } catch (err) {
      return `Error retrieving players: ${err.message}`;
    }
  },
  {
    name: "get_players",
    description: "Get detailed information about players (name, university, category/position, runs, wickets, innings, value in Rupees). Use this to recommend players, list categories, find budget options, etc. This does NOT return player points.",
    schema: z.object({
      position: z.enum(["Batsman", "Bowler", "All-Rounder"]).optional().describe("Filter by position/category"),
      university: z.string().optional().describe("Filter by university name"),
      maxPrice: z.number().optional().describe("Filter by maximum budget value in Rupees"),
      search: z.string().optional().describe("Search keyword for player name"),
    }),
  }
);

/**
 * Compares two players side-by-side.
 * CRITICAL: Strips point values.
 */
const comparePlayersTool = tool(
  async ({ player1Name, player2Name }) => {
    try {
      const players = await prisma.player.findMany({
        where: {
          name: {
            in: [player1Name, player2Name],
            mode: "insensitive",
          },
        },
      });

      if (players.length === 0) {
        return `No matches found for either "${player1Name}" or "${player2Name}".`;
      }

      // Map details and strictly omit points
      const formatted = players.map(p => ({
        name: p.name,
        university: p.university,
        position: p.position,
        value: p.value,
        runs: p.runs,
        ballsFaced: p.ballsFaced,
        inningsPlayed: p.inningsPlayed,
        wickets: p.wickets,
        oversBowled: p.oversBowled,
        runsConceded: p.runsConceded,
      }));

      return JSON.stringify(formatted);
    } catch (err) {
      return `Error comparing players: ${err.message}`;
    }
  },
  {
    name: "compare_players",
    description: "Compare side-by-side statistics (runs, wickets, innings, university, value) of two specific players. You must provide the exact or partial names of both players.",
    schema: z.object({
      player1Name: z.string().describe("Name of the first player to compare"),
      player2Name: z.string().describe("Name of the second player to compare"),
    }),
  }
);

const tools = [getPlayersTool, comparePlayersTool];

// ── Agent Setup ──────────────────────────────────────────────────────────────

// In-memory memory checkpointer
const memorySaver = new MemorySaver();

// Initialise the Gemini LLM
const chatModel = new ChatGoogleGenerativeAI({
  apiKey: GEMINI_API_KEY || "dummy-key",
  model: "gemini-2.5-flash",
  temperature: 0.3,
});

// System message describing the ReAct agent's persona and constraints
const systemPrompt = `You are Spiriter, the dedicated AI Cricket Assistant for Spirit11.
Your goal is to help users manage their fantasy cricket teams, compare player performance, and make strategic purchase decisions within their budget constraints.

Guidelines:
1. Under no circumstances should you ever reveal, mention, or display individual player "points". You do not have access to individual player points. Always decline queries about individual player points politely, redirecting the user to focus on the player's value (in Rupees) and raw performance metrics (runs, wickets, overs, etc.).
2. You can recommend players, filter players, or perform comparison tasks using the provided tools.
3. Be professional, friendly, helpful, and concise.

Context parameters will be prepended to user messages to give you current team state (budget, team size, selected players). Use this context to answer questions like "Who should I buy next?" or "Suggest a player within my remaining budget".`;

// Define the ReAct agent
const agent = createReactAgent({
  llm: chatModel,
  tools,
  checkpointSaver: memorySaver,
  messageModifier: new SystemMessage(systemPrompt),
});

/**
 * Returns an event stream for a chat message.
 *
 * @param {object} params
 * @param {string} params.message
 * @param {number} params.budget
 * @param {number} params.rosterCount
 * @param {string} params.userId
 * @returns {Promise<AsyncIterable>}
 */
async function getChatStream({ message, budget, rosterCount, userId, signal }) {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured in backend environment variables.");
  }

  // Fetch the user's current team players to inject as context
  const team = await prisma.team.findUnique({
    where: { userId },
    include: {
      players: {
        include: { player: true },
      },
    },
  });

  const currentTeamList = team && team.players.length > 0
    ? team.players.map(tp => `${tp.player.name} (${tp.player.position}, ₹${tp.player.value.toLocaleString()})`).join(", ")
    : "None (empty team)";

  // Format user input with prepended state context
  const formattedInput = `[Context: Remaining Budget: ₹${budget.toLocaleString()}, Selected Players Count: ${rosterCount}/11, Current Team Members: ${currentTeamList}]
User Message: ${message}`;

  // Call the agent's streamEvents
  return agent.streamEvents(
    {
      messages: [new HumanMessage(formattedInput)],
    },
    {
      version: "v2",
      configurable: { thread_id: `user_${userId}` },
      signal,
    }
  );
}

/**
 * Clears the chat history checkpoint for a specific user.
 *
 * @param {string} userId
 */
async function clearChatHistory(userId) {
  const config = { configurable: { thread_id: `user_${userId}` } };
  // Overwrite state to empty array
  await agent.updateState(config, { messages: [] });
}

module.exports = {
  getChatStream,
  clearChatHistory,
};
