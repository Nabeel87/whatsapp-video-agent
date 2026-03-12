/**
 * index.js
 * Application entry point.
 * Loads environment variables and starts the WhatsApp bot.
 */

require("dotenv").config();

const { initWhatsApp } = require("./src/client");

initWhatsApp();
