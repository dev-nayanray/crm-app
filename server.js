const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = 3001;
const DATA_DIR = path.join(__dirname, "data");

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// ── Helper: read/write JSON files ──
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

// ── API Routes ──

// GET /api/payments — load payments
app.get("/api/payments", (req, res) => {
  const data = readJSON("payments.json", []);
  res.json(data);
});

// POST /api/payments — save all payments
app.post("/api/payments", (req, res) => {
  writeJSON("payments.json", req.body);
  res.json({ ok: true, count: req.body.length });
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

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Blitz Payments API running on port ${PORT}`);
  console.log(`   Data stored in: ${DATA_DIR}`);
});
