/**
 * videoAgent.js
 * OpenAI-powered conversational agent.
 * Manages per-user sessions and conducts natural conversations
 * to gather video production preferences.
 */

const OpenAI = require("openai");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── Active Sessions ───
// sessions[from] = { topic: string, history: OpenAI message[] }
const sessions = {};

// ─── System Prompt ───
const SYSTEM_PROMPT = `You are a friendly video production assistant working inside WhatsApp.
Your job is to have a short, natural conversation to collect everything needed to produce a video.

You need to gather these parameters:
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
- hook        → e.g. Shocking Fact, Question to Viewer, Short Story, Direct Intro
- platform    → e.g. YouTube Shorts, Instagram Reels, TikTok, All Platforms
- extra       → any additional details the user wants to include

RULES:
- Keep every message short and WhatsApp-friendly (use emojis, avoid long walls of text)
- Have a NATURAL flowing conversation — never list all questions at once
- Group related questions when it feels natural (e.g. "Which platform and how long?")
- INFER multiple parameters from one answer when possible:
    "MrBeast style" → entertaining, fast paced, dynamic, young audience, strong hook
    "calm story for kids" → calm tone, slow pacing, kids audience, no aggressive CTA
- Ask follow-up questions based on prior answers
- Minimum required before finalizing: style, audience, tone, length, platform
- For anything not mentioned, pick a sensible default and include it in the JSON
- When you have gathered enough information, output EXACTLY this — nothing before or after:

READY:{"style":"...","audience":"...","tone":"...","length":"...","language":"...","music":"...","voice":"...","visualStyle":"...","colorTheme":"...","pacing":"...","cta":"...","subtitles":"...","hook":"...","platform":"...","extra":"..."}`;

// ─── Public API ───

/**
 * Check if a user has an active session.
 * @param {string} from
 * @returns {boolean}
 */
function hasSession(from) {
  return !!sessions[from];
}

/**
 * Start a new session for a user.
 * @param {string} from
 * @param {string} topic
 */
function startSession(from, topic) {
  sessions[from] = { topic, history: [] };
  console.log(`🟢 [Agent] Session started for ${from} — topic: "${topic}"`);
}

/**
 * End and clean up a user's session.
 * @param {string} from
 */
function endSession(from) {
  delete sessions[from];
  console.log(`🔴 [Agent] Session ended for ${from}`);
}

/**
 * Get the current session data for a user.
 * @param {string} from
 * @returns {{ topic: string, history: Array }}
 */
function getSession(from) {
  return sessions[from];
}

/**
 * Send a user message to the agent and get a reply.
 * Maintains full conversation history per session.
 * @param {string} from
 * @param {string} userMessage
 * @returns {Promise<string>} agent reply
 */
async function chat(from, userMessage) {
  const session = sessions[from];

  session.history.push({ role: "user", content: userMessage });

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "system", content: SYSTEM_PROMPT }, ...session.history],
    temperature: 0.7,
  });

  const reply = response.choices[0].message.content.trim();
  session.history.push({ role: "assistant", content: reply });

  console.log(`🤖 [Agent] Reply to ${from}: ${reply.substring(0, 80)}...`);
  return reply;
}

/**
 * Check if the agent reply contains the final READY JSON.
 * @param {string} reply
 * @returns {Object|null} parsed preferences or null if not done yet
 */
function parsePreferences(reply) {
  const match = reply.match(/READY:(\{.*\})/s);
  if (!match) return null;

  try {
    return JSON.parse(match[1]);
  } catch (err) {
    console.error("[Agent] Failed to parse READY JSON:", err.message);
    return null;
  }
}

module.exports = { hasSession, startSession, endSession, getSession, chat, parsePreferences };
