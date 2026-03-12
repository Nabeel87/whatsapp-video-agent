/**
 * messageHandler.js
 * Routes all incoming WhatsApp messages to the correct handler.
 * Handles commands: /video, /status, /cancel, /help
 * Delegates active sessions to the AI agent.
 */

const { hasSession, startSession, endSession, getSession, chat, parsePreferences } = require("../agent/videoAgent");
const { addToQueue, getUserJobs, getQueueSize } = require("../queue/videoQueue");

// ─── Command Handlers ───

async function handleVideoCommand(message, topic) {
  const from = message.from;

  startSession(from, topic);

  await message.reply(
    `🎬 *Let's create a video about* *${topic}!*\n\n` +
      `I'll ask you a few quick questions to make it perfect. 🎯`
  );

  const reply = await chat(from, `I want to create a video about: ${topic}`);
  await message.reply(reply);
}

async function handleStatusCommand(message) {
  const from = message.from;
  const jobs = getUserJobs(from);

  if (jobs.length === 0) {
    await message.reply("📭 You have no videos in the queue.");
    return;
  }

  const list = jobs
    .map((r, i) => `${i + 1}. *${r.topic}* — ${r.status}`)
    .join("\n");

  await message.reply(`📋 *Your Videos:*\n\n${list}`);
}

async function handleCancelCommand(message) {
  endSession(message.from);
  await message.reply("❌ Request cancelled. Send /video <topic> to start again.");
}

async function handleHelpCommand(message) {
  await message.reply(
    `🤖 *Video Agent Commands:*\n\n` +
      `/video <topic> — Start creating a video\n` +
      `/status — Check your video queue\n` +
      `/cancel — Cancel current request\n` +
      `/help — Show this message`
  );
}

async function handleUnknownMessage(message) {
  await message.reply(
    `👋 Hey! I didn't understand that.\n\n` +
      `Send /help to see available commands.\n` +
      `Quick start: */video your topic here*`
  );
}

// ─── Active Session Handler ───

async function handleActiveSession(message, text) {
  const from = message.from;

  if (text.toLowerCase() === "/cancel") {
    await handleCancelCommand(message);
    return;
  }

  const reply = await chat(from, text);
  const preferences = parsePreferences(reply);

  if (preferences) {
    await finalizeVideoRequest(message, preferences);
  } else {
    await message.reply(reply);
  }
}

async function finalizeVideoRequest(message, preferences) {
  const from = message.from;
  const { topic } = getSession(from);

  endSession(from);

  const request = {
    id: Date.now(),
    from,
    topic,
    preferences,
    status: "queued",
    timestamp: new Date().toISOString(),
  };

  addToQueue(request);

  const summary = Object.entries(preferences)
    .filter(([, val]) => val && val !== "None" && val !== "")
    .map(([key, val]) => `• ${key}: ${val}`)
    .join("\n");

  await message.reply(
    `✅ *Your video is queued!*\n\n` +
      `📹 *Topic:* ${topic}\n\n` +
      `📋 *Preferences:*\n${summary}\n\n` +
      `🔢 *Queue position:* #${getQueueSize()}\n` +
      `⏳ You'll receive the YouTube link once it's ready!`
  );

  // TODO: Phase 3 — trigger asset generation pipeline
  // processVideoRequest(request);
}

// ─── Main Message Router ───

async function handleMessage(message) {
  const text = message.body.trim();
  const from = message.from;

  // Ignore groups and status broadcasts
  if (message.isGroupMsg || message.isStatus) return;

  console.log(`📩 [${from}]: ${text}`);

  try {
    // 1. User is mid-session with the AI agent
    if (hasSession(from)) {
      await handleActiveSession(message, text);
      return;
    }

    // 2. Route commands
    if (text.toLowerCase().startsWith("/video ")) {
      const topic = text.slice(7).trim();
      if (!topic) {
        await message.reply("⚠️ Please provide a topic.\nExample: /video black holes");
        return;
      }
      await handleVideoCommand(message, topic);
      return;
    }

    if (text.toLowerCase() === "/status") {
      await handleStatusCommand(message);
      return;
    }

    if (text.toLowerCase() === "/cancel") {
      await message.reply("ℹ️ No active request to cancel.");
      return;
    }

    if (text.toLowerCase() === "/help") {
      await handleHelpCommand(message);
      return;
    }

    // 3. Unknown message
    await handleUnknownMessage(message);
  } catch (err) {
    console.error(`❌ [Handler] Error processing message from ${from}:`, err.message);
    await message.reply("⚠️ Something went wrong. Please try again or send /cancel.");
  }
}

module.exports = { handleMessage };
