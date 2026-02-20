const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = 3001;
const DATA_DIR = path.join(__dirname, "data");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

app.use(cors());
app.use(express.json({ limit: "10mb" }));

function readJSON(filename, fallback) {
  const filepath = path.join(DATA_DIR, filename);
  try {
    if (fs.existsSync(filepath)) return JSON.parse(fs.readFileSync(filepath, "utf8"));
  } catch (err) { console.error("Read error:", err.message); }
  return fallback;
}

function writeJSON(filename, data) {
  fs.writeFileSync(path.join(DATA_DIR, filename), JSON.stringify(data, null, 2), "utf8");
}

// ── Data endpoints ──
const endpoints = ["payments", "customer-payments", "users", "crg-deals", "daily-cap"];
endpoints.forEach(ep => {
  const file = ep + ".json";
  app.get(`/api/${ep}`, (req, res) => res.json(readJSON(file, [])));
  app.post(`/api/${ep}`, (req, res) => { writeJSON(file, req.body); res.json({ ok: true, count: req.body.length }); });
});

// ── Telegram Bot ──
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "";

async function sendTelegram(message) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    return { ok: false, error: "Telegram not configured. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID." };
  }
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message, parse_mode: "HTML" }),
    });
    return await resp.json();
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

app.get("/api/telegram/test", async (req, res) => {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    return res.json({ status: "error", error: "Telegram not configured. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID environment variables." });
  }
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe`;
    const resp = await fetch(url);
    const data = await resp.json();
    res.json(data.ok ? { status: "ok", bot: data.result.username } : { status: "error", error: data.description });
  } catch (err) {
    res.json({ status: "error", error: err.message });
  }
});

app.post("/api/telegram/notify", async (req, res) => {
  const { message } = req.body;
  if (!message) return res.json({ ok: false, error: "No message provided" });
  const result = await sendTelegram(message);
  res.json(result);
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Blitz API running on port ${PORT}`);
  console.log(`   Data: ${DATA_DIR}`);
  console.log(`   Telegram: ${TELEGRAM_BOT_TOKEN ? "configured ✅" : "NOT configured — set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID"}`);
});
