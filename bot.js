require("dotenv").config();
const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const OpenAI = require("openai");

// ─── OpenAI Client ───
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── WhatsApp Client ───
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  },
});

client.on("qr", (qr) => {
  console.log("📱 Scan this QR code with WhatsApp:");
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
  console.log("✅ WhatsApp Bot is ready and listening!");
});

client.on("auth_failure", (msg) => {
  console.error("❌ Authentication failed:", msg);
});

// ─── In-Memory Storage ───
const videoQueue = [];

// userSessions[from] = { topic, history: [...OpenAI messages] }
const userSessions = {};

// ─── OpenAI System Prompt ───
const SYSTEM_PROMPT = `You are a friendly video production assistant working inside WhatsApp.
Your job is to have a natural conversation to gather everything needed to create a short video.

You need to collect these parameters:
- style       → e.g. Educational, Entertaining, Documentary, Motivational
- audience    → e.g. Kids, Teens, Adults, Professionals
- tone        → e.g. Serious, Fun & Casual, Inspirational, Dramatic
- length      → e.g. 30 seconds, 60 seconds, 90 seconds, 3 minutes
- language    → e.g. English, Urdu, Hindi, Arabic
- music       → e.g. Upbeat, Calm, Epic, No Music
- voice       → e.g. Male Voice, Female Voice, AI Voice, No Narration
- visualStyle → e.g. Real Photos, Animated, AI Art, Mixed
- colorTheme  → e.g. Bright & Colorful, Dark & Moody, Minimal, Brand Colors
- pacing      → e.g. Fast Paced, Medium Paced, Slow, Dynamic
- cta         → e.g. Like & Subscribe, Visit Website, Follow Us, None
- subtitles   → e.g. Yes, No, Auto Detect
- hook        → e.g. Shocking Fact, Question, Story, Direct Intro
- platform    → e.g. YouTube Shorts, Instagram Reels, TikTok, All Platforms
- extra       → any additional details the user wants to add

RULES:
- Keep every message short and WhatsApp-friendly (use emojis, no markdown headers)
- Have a NATURAL flowing conversation — do NOT list all questions at once
- Group related questions together when it feels natural (e.g. "What platform and length?")
- INFER multiple parameters from a single answer when possible:
    "MrBeast style" → entertaining, fast-paced, dynamic, young audience, hook-heavy
    "calm bedtime story for kids" → calm tone, slow pacing, kids audience, no CTA
- Ask follow-up questions based on what the user says
- You need AT MINIMUM: style, audience, tone, length, and platform before finalizing
- For anything not mentioned, use a sensible default and note it in the JSON
- When you have collected enough information, output EXACTLY this on its own line (nothing before or after):

READY:{"style":"...","audience":"...","tone":"...","length":"...","language":"...","music":"...","voice":"...","visualStyle":"...","colorTheme":"...","pacing":"...","cta":"...","subtitles":"...","hook":"...","platform":"...","extra":"..."}

Do NOT include any other text when you output the READY line.`;

// ─── Send user message to OpenAI and get reply ───
async function chatWithAgent(session, userMessage) {
  session.history.push({ role: "user", content: userMessage });

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      ...session.history,
    ],
    temperature: 0.7,
  });

  const reply = response.choices[0].message.content.trim();
  session.history.push({ role: "assistant", content: reply });

  return reply;
}

// ─── Check if agent is done and extract preferences ───
function extractPreferences(reply) {
  const match = reply.match(/READY:(\{.*\})/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

// ─── Queue the video and notify user ───
async function finalizeVideo(message, session, preferences) {
  const from = message.from;

  const request = {
    id: Date.now(),
    from,
    topic: session.topic,
    preferences,
    status: "queued",
    timestamp: new Date().toISOString(),
  };

  videoQueue.push(request);
  delete userSessions[from];

  console.log("🎬 New video request queued:", request);
  console.log(`📋 Queue size: ${videoQueue.length}`);

  const summary = Object.entries(preferences)
    .filter(([, val]) => val && val !== "None" && val !== "")
    .map(([key, val]) => `• ${key}: ${val}`)
    .join("\n");

  await message.reply(
    `✅ *Perfect! Your video is queued!*\n\n` +
      `📹 *Topic:* ${session.topic}\n\n` +
      `📋 *Preferences:*\n${summary}\n\n` +
      `🔢 *Queue position:* #${videoQueue.length}\n` +
      `⏳ You'll receive the YouTube link once it's ready!`
  );

  // TODO: Phase 3 — trigger asset generation pipeline
  // processVideoRequest(request);
}

// ─── Message Handler ───
client.on("message", async (message) => {
  const text = message.body.trim();
  const from = message.from;

  // Ignore groups and status
  if (message.isGroupMsg || message.isStatus) return;

  console.log(`📩 Message from ${from}: ${text}`);

  // ─── Active session: continue AI conversation ───
  if (userSessions[from]) {
    const session = userSessions[from];

    // Allow user to cancel mid-session
    if (text.toLowerCase() === "/cancel") {
      delete userSessions[from];
      await message.reply("❌ Video request cancelled. Send /video <topic> to start again.");
      return;
    }

    try {
      const reply = await chatWithAgent(session, text);
      const preferences = extractPreferences(reply);

      if (preferences) {
        // Agent is done — finalize
        await finalizeVideo(message, session, preferences);
      } else {
        // Agent has more questions
        await message.reply(reply);
      }
    } catch (err) {
      console.error("OpenAI error:", err.message);
      await message.reply("⚠️ Something went wrong. Please try again or send /cancel to restart.");
    }

    return;
  }

  // ─── Command: /video <topic> ───
  if (text.toLowerCase().startsWith("/video ")) {
    const topic = text.slice(7).trim();

    if (!topic) {
      await message.reply("⚠️ Please provide a topic. Example:\n/video black holes");
      return;
    }

    // Start a new AI session
    userSessions[from] = {
      topic,
      history: [],
    };

    await message.reply(
      `🎬 *Let's create a video about* *${topic}*!\n\n` +
        `I'll ask you a few quick questions to make it perfect. 🎯`
    );

    try {
      const reply = await chatWithAgent(
        userSessions[from],
        `I want to create a video about: ${topic}`
      );
      await message.reply(reply);
    } catch (err) {
      console.error("OpenAI error:", err.message);
      delete userSessions[from];
      await message.reply("⚠️ Could not start the agent. Check your OPENAI_API_KEY and try again.");
    }

    return;
  }

  // ─── Command: /status ───
  if (text.toLowerCase() === "/status") {
    const userJobs = videoQueue.filter((r) => r.from === from);
    if (userJobs.length === 0) {
      await message.reply("📭 You have no videos in the queue.");
    } else {
      const statusList = userJobs
        .map((r, i) => `${i + 1}. *${r.topic}* — ${r.status}`)
        .join("\n");
      await message.reply(`📋 Your videos:\n\n${statusList}`);
    }
    return;
  }

  // ─── Command: /help ───
  if (text.toLowerCase() === "/help") {
    await message.reply(
      `🤖 *Video Agent Commands:*\n\n` +
        `/video <topic> — Start creating a video\n` +
        `/status — Check your queue\n` +
        `/cancel — Cancel current video request\n` +
        `/help — Show this message`
    );
    return;
  }

  // ─── Unknown message ───
  await message.reply(
    `👋 Hey! Send /help to see available commands.\n\n` +
      `Quick start: /video your topic here`
  );
});

// ─── Start the bot ───
client.initialize();
console.log("🚀 Starting WhatsApp Bot... waiting for QR code...");
