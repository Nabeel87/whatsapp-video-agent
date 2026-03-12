# 🤖 WhatsApp Video Agent

WhatsApp-powered AI agent that generates 8-second videos from text prompts and auto-publishes them to YouTube.

## How It Works

1. Send `/video <topic>` on WhatsApp
2. Agent generates script, visuals, voiceover
3. FFmpeg assembles an 8-second video
4. Auto-uploads to YouTube as a Short
5. Sends you the link back on WhatsApp

## Commands

| Command | Description |
|---------|-------------|
| `/video <topic>` | Generate & publish a video |
| `/status` | Check your video queue |
| `/help` | Show available commands |

## Setup

```bash
git clone https://github.com/YOUR_USERNAME/whatsapp-video-agent.git
cd whatsapp-video-agent
npm install
npm start
```

Scan the QR code with WhatsApp when prompted.

## Tech Stack

- **WhatsApp**: whatsapp-web.js
- **Video**: FFmpeg
- **AI**: Free-tier APIs (TTS, Image Gen)
- **Upload**: YouTube Data API v3

## Project Status

- [x] Phase 1 — WhatsApp Bot (input layer)
- [ ] Phase 2 — Agent Brain (orchestration)
- [ ] Phase 3 — Asset Generation (AI APIs)
- [ ] Phase 4 — Video Assembly (FFmpeg)
- [ ] Phase 5 — YouTube Publishing
- [ ] Phase 6 — Feedback Loop

## License

MIT
