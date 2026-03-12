/**
 * client.js
 * WhatsApp client setup and lifecycle events.
 * Initializes the client and wires up the message handler.
 */

const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const { handleMessage } = require("./handlers/messageHandler");

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  },
});

// ─── Lifecycle Events ───

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

client.on("disconnected", (reason) => {
  console.warn("⚠️ Client disconnected:", reason);
});

// ─── Message Event ───

client.on("message", handleMessage);

// ─── Init ───

function initWhatsApp() {
  client.initialize();
  console.log("🚀 Starting WhatsApp Bot... waiting for QR code...");
}

module.exports = { initWhatsApp, client };
