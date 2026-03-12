const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");

// ─── Initialize WhatsApp Client ───
const client = new Client({
  authStrategy: new LocalAuth(), // saves session so you don't scan QR every time
  puppeteer: {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  },
});

// ─── QR Code Event ───
client.on("qr", (qr) => {
  console.log("📱 Scan this QR code with WhatsApp:");
  qrcode.generate(qr, { small: true });
});

// ─── Ready Event ───
client.on("ready", () => {
  console.log("✅ WhatsApp Bot is ready and listening!");
});

// ─── Auth Failure ───
client.on("auth_failure", (msg) => {
  console.error("❌ Authentication failed:", msg);
});

// ─── Simple Queue (in-memory for now) ───
const videoQueue = [];

// ─── Message Handler ───
client.on("message", async (message) => {
  const text = message.body.trim();
  const from = message.from;

  // Ignore group messages and status updates
  if (message.isGroupMsg || message.isStatus) return;

  console.log(`📩 Message from ${from}: ${text}`);

  // ─── Command: /video <topic> ───
  if (text.toLowerCase().startsWith("/video ")) {
    const topic = text.slice(7).trim();

    if (!topic) {
      await message.reply("⚠️ Please provide a topic. Example:\n/video black holes");
      return;
    }

    // Add to queue
    const request = {
      id: Date.now(),
      from,
      topic,
      status: "queued",
      timestamp: new Date().toISOString(),
    };
    videoQueue.push(request);

    console.log(`🎬 New video request queued:`, request);
    console.log(`📋 Queue size: ${videoQueue.length}`);

    await message.reply(
      `✅ Got it! Making your video about *${topic}*...\n\n` +
        `📋 Queue position: #${videoQueue.length}\n` +
        `⏳ You'll receive the YouTube link once it's ready.`
    );

    // TODO: Phase 2 — trigger the video generation pipeline here
    // processVideoRequest(request);
  }

  // ─── Command: /status ───
  else if (text.toLowerCase() === "/status") {
    const userJobs = videoQueue.filter((r) => r.from === from);
    if (userJobs.length === 0) {
      await message.reply("📭 You have no videos in the queue.");
    } else {
      const statusList = userJobs
        .map((r, i) => `${i + 1}. *${r.topic}* — ${r.status}`)
        .join("\n");
      await message.reply(`📋 Your videos:\n\n${statusList}`);
    }
  }

  // ─── Command: /help ───
  else if (text.toLowerCase() === "/help") {
    await message.reply(
      `🤖 *Video Agent Commands:*\n\n` +
        `/video <topic> — Generate & publish a video\n` +
        `/status — Check your queue\n` +
        `/help — Show this message`
    );
  }

  // ─── Unknown message ───
  else {
    await message.reply(
      `👋 Hey! Send /help to see available commands.\n\n` +
        `Quick start: /video your topic here`
    );
  }
});

// ─── Start the bot ───
client.initialize();
console.log("🚀 Starting WhatsApp Bot... waiting for QR code...");
