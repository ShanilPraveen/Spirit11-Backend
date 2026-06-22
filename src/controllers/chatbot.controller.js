const chatbotService = require('../services/chatbot.service');

/**
 * Handles SSE streaming for the chatbot response.
 */
async function streamChat(req, res, next) {
  const { message, budget, rosterCount } = req.body;
  const userId = req.user.userId;

  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  const abortController = new AbortController();
  
  // Clean up and abort underlying request if client closes connection
  req.on('close', () => {
    console.log("🔌 SSE connection closed by client, aborting model stream...");
    abortController.abort();
  });

  try {
    // Set headers for SSE streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders(); 

    const stream = await chatbotService.getChatStream({
      message,
      budget: typeof budget === 'number' ? budget : 10000000,
      rosterCount: typeof rosterCount === 'number' ? rosterCount : 0,
      userId,
      signal: abortController.signal,
    });

    for await (const event of stream) {
      if (event.event === "on_chat_model_stream" && event.data.chunk) {
        const text = event.data.chunk.content;
        if (text) {
          res.write(`data: ${JSON.stringify({ text })}\n\n`);
        }
      }
    }

    // Signal connection termination to the client
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    if (error.name === 'AbortError' || abortController.signal.aborted) {
      console.log("Chat stream aborted successfully.");
      if (!res.writableEnded) {
        res.end();
      }
      return;
    }

    console.error("Error in streamChat controller:", error);
    
    // If response headers have already been sent, stream the error token
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: error.message || "Internal server stream error" })}\n\n`);
      res.end();
    } else {
      next(error);
    }
  }
}

/**
 * Clears the chat history checkpointer state for the user.
 */
async function clearHistory(req, res, next) {
  const userId = req.user.userId;
  try {
    await chatbotService.clearChatHistory(userId);
    res.status(200).json({ status: "success", message: "Conversation history cleared." });
  } catch (error) {
    console.error("Error in clearHistory controller:", error);
    next(error);
  }
}

module.exports = {
  streamChat,
  clearHistory,
};
