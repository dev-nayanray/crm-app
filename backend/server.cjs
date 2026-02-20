const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const https = require("https");

const app = express();
const PORT = 3001;
const DATA_DIR = path.join(__dirname, "data");

// Telegram Bot Configuration - REPLACE WITH YOUR VALID TOKEN
const TELEGRAM_TOKEN = "8560973106:AAG6J4FRj8ShS-WKLOzs2TmhdaHlqCKevhA";  // Get from @BotFather
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

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

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

// API Routes

// GET /api/payments — load payments
app.get("/api/payments", (req, res) => {
  const data = readJSON("payments.json", []);
  res.json(data);
});

// POST /api/payments — save all payments
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

// GET /api/customer-payments — load customer payments
app.get("/api/customer-payments", (req, res) => {
  const data = readJSON("customer-payments.json", []);
  res.json(data);
});

// POST /api/customer-payments — save all customer payments
app.post("/api/customer-payments", (req, res) => {
  writeJSON("customer-payments.json", req.body);
  res.json({ ok: true, count: req.body.length });
});

// GET /api/users — load users
app.get("/api/users", (req, res) => {
  const data = readJSON("users.json", []);
  res.json(data);
});

// POST /api/users — save all users
app.post("/api/users", (req, res) => {
  writeJSON("users.json", req.body);
  res.json({ ok: true, count: req.body.length });
});

// GET /api/crg-deals — load CRG deals
app.get("/api/crg-deals", (req, res) => {
  const data = readJSON("crg-deals.json", []);
  res.json(data);
});

// POST /api/crg-deals — save all CRG deals
app.post("/api/crg-deals", (req, res) => {
  writeJSON("crg-deals.json", req.body);
  res.json({ ok: true, count: req.body.length });
});

// GET /api/daily-cap — load daily cap entries
app.get("/api/daily-cap", (req, res) => {
  const data = readJSON("daily-cap.json", []);
  res.json(data);
});

// POST /api/daily-cap — save all daily cap entries
app.post("/api/daily-cap", (req, res) => {
  writeJSON("daily-cap.json", req.body);
  res.json({ ok: true, count: req.body.length });
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Telegram Notification Endpoints

// POST /api/telegram/notify - Send custom notification (for testing)
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
  
  // Test the token by making a getMe request
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

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Blitz Payments API running on port ${PORT}`);
  console.log(`   Data stored in: ${DATA_DIR}`);
  console.log(`   Telegram bot: @blitzfinance_bot`);
});
