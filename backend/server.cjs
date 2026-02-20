const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const https = require("https");

const app = express();
const PORT = 3001;
const VERSION = "1.044";
const DATA_DIR = path.join(__dirname, "data");
const BACKUP_DIR = path.join(__dirname, "backups");

// Telegram Bot Configuration
const TELEGRAM_TOKEN = "8560973106:AAG6J4FRj8ShS-WKLOzs2TmhdaHlqCKevhA";
const FINANCE_GROUP_CHAT_ID = "-4744920512";

// Helper function to send Telegram notifications using direct API
function sendTelegramNotification(message) {
  if (TELEGRAM_TOKEN === "YOUR_BOT_TOKEN_HERE" || !TELEGRAM_TOKEN) {
    console.log("📱 Telegram notification (no token configured):", message);
    return;
  }
  
  const postData = JSON.stringify({
    chat_id: FINANCE_GROUP_CHAT_ID,
    text: message,
    parse_mode: "HTML"
  });

  const options = {
    hostname: 'api.telegram.org',
    port: 443,
    path: `/bot${TELEGRAM_TOKEN}/sendMessage`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      if (res.statusCode === 200) {
        console.log("✅ Telegram notification sent");
      } else {
        console.log("❌ Telegram error:", res.statusCode, data);
      }
    });
  });

  req.on('error', (err) => {
    console.error("❌ Telegram request error:", err.message);
  });

  req.write(postData);
  req.end();
  
  console.log("📱 Sending Telegram notification:", message.substring(0, 50) + "...");
}

// Format message for open payment
function formatOpenPaymentMessage(payment) {
  return `💰 <b>NEW OPEN PAYMENT</b>

📋 Invoice: <b>#${payment.invoice}</b>
💵 Amount: <b>$${parseFloat(payment.amount).toLocaleString("en-US")}</b>
👤 Opened by: ${payment.openBy || "Unknown"}`;
}

// Format message for paid payment
function formatPaidPaymentMessage(payment) {
  return `💰 <b>PAYMENT DONE</b>

📋 Invoice: <b>#${payment.invoice}</b>
💵 Amount: <b>$${parseFloat(payment.amount).toLocaleString("en-US")}</b>
👤 Paid by: ${payment.openBy || "Unknown"}
Payment Hash: <code>${payment.paymentHash || "N/A"}</code>`;
}

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Helper: read/write JSON files
function readJSON(filename, fallback) {
  const filepath = path.join(DATA_DIR, filename);
  try {
    if (fs.existsSync(filepath)) {
      return JSON.parse(fs.readFileSync(filepath, "utf8"));
    }
  } catch (err) {
    console.error(`Error reading ${filename}:`, err.message);
  }
  return fallback;
}

function writeJSON(filename, data) {
  const filepath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), "utf8");
}

// ── Data Endpoints ──
const endpoints = ["payments", "customer-payments", "users", "crg-deals", "daily-cap", "deals"];

// GET /api/payments — load payments
app.get("/api/payments", (req, res) => {
  const data = readJSON("payments.json", []);
  res.json(data);
});

// POST /api/payments — save all payments (with Telegram notifications)
app.post("/api/payments", (req, res) => {
  const newPayments = req.body;
  const oldPayments = readJSON("payments.json", []);
  
  // Track payments by ID for easy lookup
  const oldPaymentsMap = new Map(oldPayments.map(p => [p.id, p]));
  
  console.log("📊 Processing payments update:", newPayments.length, "items");
  
  // Check for each payment
  newPayments.forEach(p => {
    const oldP = oldPaymentsMap.get(p.id);
    
    if (!oldP) {
      // NEW payment - notify based on status
      console.log("📋 NEW Payment:", p.invoice, "| Status:", p.status);
      if (p.status === "Open" || p.status === "On the way" || p.status === "Approved to pay") {
        const message = formatOpenPaymentMessage(p);
        console.log("📱 → Sending NEW OPEN notification:", p.invoice);
        sendTelegramNotification(message);
      } else if (p.status === "Paid") {
        const message = formatPaidPaymentMessage(p);
        console.log("📱 → Sending NEW PAID notification:", p.invoice);
        sendTelegramNotification(message);
      }
    } else if (oldP.status !== p.status) {
      // EXISTING payment - status changed
      console.log("📋 Payment:", p.invoice, "| Old:", oldP.status, "| New:", p.status);
      
      if (p.status === "Paid" && oldP.status !== "Paid") {
        // Changed TO Paid
        console.log("📱 → Sending PAID status change notification:", p.invoice);
        const message = formatPaidPaymentMessage(p);
        sendTelegramNotification(message);
      } else if ((p.status === "Open" || p.status === "On the way" || p.status === "Approved to pay") && oldP.status === "Paid") {
        // Changed FROM Paid back to Open - send as new open
        console.log("📱 → Sending RE-OPENED notification:", p.invoice);
        const message = formatOpenPaymentMessage(p);
        sendTelegramNotification(message);
      }
    }
  });
  
  writeJSON("payments.json", newPayments);
  res.json({ ok: true, count: newPayments.length });
});

// Other data endpoints (generic GET/POST)
["customer-payments", "users", "crg-deals", "daily-cap", "deals"].forEach(ep => {
  const file = ep + ".json";
  app.get(`/api/${ep}`, (req, res) => res.json(readJSON(file, [])));
  app.post(`/api/${ep}`, (req, res) => { writeJSON(file, req.body); res.json({ ok: true, count: req.body.length }); });
});

// ── Health check ──
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", version: VERSION, time: new Date().toISOString() });
});

// ── Telegram Endpoints ──

// POST /api/telegram/notify - Send custom notification
app.post("/api/telegram/notify", (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }
  sendTelegramNotification(message);
  res.json({ ok: true });
});

// GET /api/telegram/test - Test bot connection
app.get("/api/telegram/test", (req, res) => {
  if (TELEGRAM_TOKEN === "YOUR_BOT_TOKEN_HERE" || !TELEGRAM_TOKEN) {
    return res.json({ status: "no_token", message: "Please configure your Telegram bot token in server.cjs" });
  }
  
  const options = {
    hostname: 'api.telegram.org',
    port: 443,
    path: `/bot${TELEGRAM_TOKEN}/getMe`,
    method: 'GET'
  };

  const botReq = https.request(options, (response) => {
    let data = '';
    response.on('data', (chunk) => { data += chunk; });
    response.on('end', () => {
      if (response.statusCode === 200) {
        const botInfo = JSON.parse(data).result;
        res.json({ 
          status: "connected", 
          bot: botInfo.username,
          name: botInfo.first_name 
        });
      } else {
        res.json({ status: "error", error: data });
      }
    });
  });

  botReq.on('error', (err) => {
    res.json({ status: "error", error: err.message });
  });

  botReq.end();
});

// ── Hourly Backup System ──
function createBackup() {
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const backupPath = path.join(BACKUP_DIR, ts);
  if (!fs.existsSync(backupPath)) fs.mkdirSync(backupPath, { recursive: true });

  let count = 0;
  endpoints.forEach(ep => {
    const src = path.join(DATA_DIR, ep + ".json");
    const dst = path.join(backupPath, ep + ".json");
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dst);
      count++;
    }
  });
  console.log(`📦 Backup created: ${ts} (${count} files)`);

  // Keep only last 48 backups (2 days)
  const dirs = fs.readdirSync(BACKUP_DIR).sort();
  while (dirs.length > 48) {
    const old = dirs.shift();
    fs.rmSync(path.join(BACKUP_DIR, old), { recursive: true, force: true });
    console.log(`🗑️  Old backup removed: ${old}`);
  }
}

// Backup every hour
setInterval(createBackup, 60 * 60 * 1000);
// Also backup 5 seconds after startup
setTimeout(createBackup, 5000);

// List available backups
app.get("/api/backups", (req, res) => {
  if (!fs.existsSync(BACKUP_DIR)) return res.json([]);
  res.json(fs.readdirSync(BACKUP_DIR).sort().reverse());
});

// Restore from a specific backup
app.post("/api/restore/:backup", (req, res) => {
  const bp = path.join(BACKUP_DIR, req.params.backup);
  if (!fs.existsSync(bp)) return res.json({ ok: false, error: "Backup not found" });
  
  let count = 0;
  endpoints.forEach(ep => {
    const src = path.join(bp, ep + ".json");
    const dst = path.join(DATA_DIR, ep + ".json");
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dst);
      count++;
    }
  });
  console.log(`♻️ Restored backup: ${req.params.backup} (${count} files)`);
  res.json({ ok: true, restored: req.params.backup, files: count });
});

// ── Start Server ──
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Blitz API v${VERSION} running on port ${PORT}`);
  console.log(`   Data: ${DATA_DIR}`);
  console.log(`   Backups: ${BACKUP_DIR} (every hour, keep 48)`);
  console.log(`   Telegram bot: @blitzfinance_bot`);
});
