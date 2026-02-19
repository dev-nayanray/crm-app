const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_DIR = path.join(__dirname, "data");

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  console.log(`✅ Created data directory: ${DATA_DIR}`);
}

// CORS - allow all for development; restrict for production
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Helper: read/write JSON files
function readJSON(filename, fallback = []) {
  const filepath = path.join(DATA_DIR, filename);
  try {
    if (fs.existsSync(filepath)) {
      return JSON.parse(fs.readFileSync(filepath, "utf8"));
    }
  } catch (err) {
    console.error(`❌ Error reading ${filename}:`, err.message);
  }
  return fallback;
}

function writeJSON(filename, data) {
  const filepath = path.join(DATA_DIR, filename);
  try {
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error(`❌ Error writing ${filename}:`, err.message);
  }
}

// ── API Routes ──
const routes = [
  "payments",
  "customer-payments",
  "users",
  "crg-deals",
  "daily-cap"
];

routes.forEach((route) => {
  app.get(`/api/${route}`, (req, res) => {
    const data = readJSON(`${route}.json`, []);
    res.json(data);
  });

  app.post(`/api/${route}`, (req, res) => {
    writeJSON(`${route}.json`, req.body);
    res.json({ ok: true, count: Array.isArray(req.body) ? req.body.length : 1 });
  });
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Blitz Payments API running on port ${PORT}`);
  console.log(`   Data stored in: ${DATA_DIR}`);
});
