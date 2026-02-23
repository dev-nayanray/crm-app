const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const https = require("https");
const http = require("http");
// WebSocket — optional dependency (graceful fallback to HTTP polling)
// Install: npm install ws
let WebSocketServer, WebSocket, WS_AVAILABLE = false;
try {
  const wsModule = require("ws");
  WebSocketServer = wsModule.WebSocketServer || wsModule.Server;
  WebSocket = wsModule.WebSocket || wsModule;
  WS_AVAILABLE = true;
} catch (e) {
  console.log("⚠️  'ws' not installed — WebSocket disabled, HTTP polling only");
  console.log("   Install: npm install ws");
}
const crypto = require("crypto");
const TelegramBot = require("node-telegram-bot-api");

const app = express();
app.disable('x-powered-by'); // Don't reveal tech stack
const PORT = 3001;
const VERSION = "3.2";
const DATA_DIR = path.join(__dirname, "data");
const BACKUP_DIR = path.join(__dirname, "backups");
const AUDIT_DIR = path.join(__dirname, "audit");

// ═══════════════════════════════════════════════════════════════
// 1. CORE INFRASTRUCTURE
// ═══════════════════════════════════════════════════════════════

// Ensure directories
[DATA_DIR, BACKUP_DIR, AUDIT_DIR].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

// ── Server-side user seed data (source of truth for passwords) ──
const INITIAL_USERS = [
  { email: "sophia@blitz-affiliates.marketing", passwordHash: "0db6b937e90449977f5daa522c82b1492aae0b1edb11f5d7a9c0fbfc6f71fdd1", name: "Sophia" },
  { email: "office1092021@gmail.com", passwordHash: "0db6b937e90449977f5daa522c82b1492aae0b1edb11f5d7a9c0fbfc6f71fdd1", name: "Office" },
  { email: "y0505300530@gmail.com", passwordHash: "0db6b937e90449977f5daa522c82b1492aae0b1edb11f5d7a9c0fbfc6f71fdd1", name: "Y Admin" },
  { email: "zack@blitz-affiliates.marketing", passwordHash: "3f21a8490cef2bfb60a9702e9d2ddb7a805c9bd1a263557dfd51a7d0e9dfa93e", name: "Zack" },
  { email: "cameron@blitz-affiliates.marketing", passwordHash: "249194fd43bdcfbb0748eebd6f45baa76c383f8579cdb3ddf9d359d44fbdd476", name: "Cameron" },
  { email: "wpnayanray@gmail.com", passwordHash: "d6a72b1098615c3354d725f4b539b7fdf91e8213cd03af08c4ae3c8729526bd0", name: "Nayan" },
  { email: "kazarian.oleksandra.v@gmail.com", passwordHash: "4531edf6d1a36b47db61e9ac2f83af8f03920c48eec79a308e89d45cb751e020", name: "Oleksandra" },
  { email: "kate@blitz-affiliates.marketing", passwordHash: "b7cb217334dc1f94c975370b003efb532b57b1b99ac81b424199f1da854cf6e8", name: "Kate" },
  { email: "alehandro@blitz-affiliates.marketing", passwordHash: "1635c8525afbae58c37bede3c9440844e9143727cc7c160bed665ec378d8a262", name: "Alehandro" },
  { email: "john.leon@blitz-affiliates.marketing", passwordHash: "77dbc78facad3377d2c8dc621e532a70e82b3931a19dfe5bc972d748ff535a90", name: "John Leon" },
];

// ── Seed / repair users.json on startup ──
// Ensures all INITIAL_USERS exist with correct password hashes
// Fixes the bug where client synced stripped (no passwordHash) users back to server
function seedUsers() {
  const usersFile = path.join(DATA_DIR, "users.json");
  let existing = [];
  try { if (fs.existsSync(usersFile)) existing = JSON.parse(fs.readFileSync(usersFile, "utf8")); } catch {}

  const existingMap = new Map(existing.map(u => [u.email, u]));
  let changed = false;

  for (const iu of INITIAL_USERS) {
    const eu = existingMap.get(iu.email);
    if (!eu) {
      // Missing user — add it
      existing.push(iu);
      changed = true;
      console.log(`👤 Added user: ${iu.email}`);
    } else if (!eu.passwordHash) {
      // User exists but passwordHash was stripped — restore it
      eu.passwordHash = iu.passwordHash;
      changed = true;
      console.log(`🔑 Restored passwordHash for: ${iu.email}`);
    }
  }

  if (changed || existing.length === 0) {
    if (existing.length === 0) existing = INITIAL_USERS;
    fs.writeFileSync(usersFile, JSON.stringify(existing, null, 2), "utf8");
    console.log(`✅ Users seeded/repaired: ${existing.length} users`);
  } else {
    console.log(`✅ Users OK: ${existing.length} users`);
  }
}
seedUsers();

// Telegram Bot Configuration
// SECURITY: Use environment variables. Fallback to hardcoded for backwards compat.
// Set these in your .env or systemd service: TELEGRAM_TOKEN, ETHERSCAN_API_KEY
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || "8560973106:AAG6J4FRj8ShS-WKLOzs2TmhdaHlqCKevhA";
const FINANCE_GROUP_CHAT_ID = process.env.FINANCE_CHAT_ID || "-1002183891044";

// Crypto verification APIs
const TRONSCAN_API = "https://apilist.tronscan.org";
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "2CAM7DNEFBXX2515FXGZGUF6C8SIKNR7ET";
const ETHERSCAN_API = "https://api.etherscan.io/api";
const ETHERSCAN_V2_API = "https://api.etherscan.io/v2/api";
const TRC20_HASH_REGEX = /^[a-zA-Z0-9]{64}$/;
const TRC20_ADDRESS_REGEX = /^T[a-zA-Z0-9]{33}$/;
const ERC20_HASH_REGEX = /^0x[a-fA-F0-9]{64}$/;
const ERC20_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;
const BTC_ADDRESS_REGEX = /^(1|3|bc1)[a-zA-HJ-NP-Z0-9]{25,39}$/;
const TRC20_USDT_CONTRACT = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
const ERC20_USDT_CONTRACT = "0xdAC17F958D2ee523a2206206994597C13D831ec7";

const COUNTRY_NAMES = { DE:"Germany",FR:"France",UK:"United Kingdom",AU:"Australia",MY:"Malaysia",SI:"Singapore",HR:"Croatia",GCC:"Gulf Countries",ES:"Spain",BE:"Belgium",IT:"Italy" };
const VALID_COUNTRIES = Object.keys(COUNTRY_NAMES);

function httpRequest(url, isHttps = true) {
  return new Promise((resolve, reject) => {
    const protocol = isHttps ? https : http;
    protocol.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => data += chunk);
      res.on("end", () => resolve(data));
    }).on("error", reject);
  });
}

// ═══════════════════════════════════════════════════════════════
// 2. ATOMIC FILE OPERATIONS WITH VERSION TRACKING
// ═══════════════════════════════════════════════════════════════

// In-memory version counters — increment on every write
const dataVersions = {};
const dataLocks = new Map(); // Prevents concurrent writes to same file

function readJSON(filename, fallback) {
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

// Atomic write: write to temp file, then rename (prevents corruption)
function writeJSONAtomic(filename, data) {
  const filepath = path.join(DATA_DIR, filename);
  const tempPath = filepath + `.tmp.${Date.now()}.${crypto.randomBytes(4).toString('hex')}`;

  try {
    // Write to temp file first
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), "utf8");

    // Verify temp file is valid JSON before replacing
    const verify = JSON.parse(fs.readFileSync(tempPath, "utf8"));
    if (!Array.isArray(verify)) throw new Error("Data is not an array");

    // Atomic rename (on same filesystem this is atomic)
    fs.renameSync(tempPath, filepath);

    // Increment version
    const key = filename.replace('.json', '');
    dataVersions[key] = (dataVersions[key] || 0) + 1;

    return true;
  } catch (err) {
    console.error(`❌ Atomic write failed for ${filename}:`, err.message);
    // Clean up temp file
    try { if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath); } catch (e) {}
    return false;
  }
}

// Locked write — prevents concurrent writes to same table
async function lockedWrite(filename, data, meta) {
  const key = filename.replace('.json', '');

  // Simple mutex: wait if another write is in progress
  while (dataLocks.has(key)) {
    await new Promise(r => setTimeout(r, 10));
  }

  dataLocks.set(key, true);
  try {
    const success = writeJSONAtomic(filename, data);
    if (success && meta) {
      writeAuditLog(key, meta.action || "update", meta.user || "system", meta.details || `${data.length} records`);
    }
    return success;
  } finally {
    dataLocks.delete(key);
  }
}

// ═══════════════════════════════════════════════════════════════
// 3. AUDIT LOGGING — WHO changed WHAT and WHEN
// ═══════════════════════════════════════════════════════════════

function writeAuditLog(table, action, user, details) {
  try {
    const now = new Date();
    const dateKey = now.toISOString().split('T')[0]; // 2026-02-23
    const logFile = path.join(AUDIT_DIR, `audit_${dateKey}.jsonl`);

    const entry = {
      timestamp: now.toISOString(),
      table,
      action, // "create", "update", "delete", "login", "restore"
      user,   // email or "system"
      details,
      ip: null, // set by caller if available
    };

    fs.appendFileSync(logFile, JSON.stringify(entry) + "\n", "utf8");
  } catch (err) {
    console.error("⚠️ Audit log error:", err.message);
  }
}

// Clean up old audit logs (keep 30 days)
function cleanupAuditLogs() {
  try {
    const files = fs.readdirSync(AUDIT_DIR).filter(f => f.startsWith('audit_') && f.endsWith('.jsonl'));
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    files.forEach(f => {
      const date = f.replace('audit_', '').replace('.jsonl', '');
      if (date < cutoff) {
        fs.unlinkSync(path.join(AUDIT_DIR, f));
        console.log(`🗑️ Old audit log removed: ${f}`);
      }
    });
  } catch (err) {}
}
setInterval(cleanupAuditLogs, 24 * 60 * 60 * 1000); // Daily cleanup

// ═══════════════════════════════════════════════════════════════
// 4. CONFLICT RESOLUTION — Version Tracking (Last-Writer-Wins+)
// ═══════════════════════════════════════════════════════════════

// Each save includes a version number. If a client sends data with an
// older version than what's on server, we log the conflict but still
// accept (LWW) because in a CRM the latest user action is usually correct.
// The audit log captures everything for rollback if needed.

function getVersion(table) {
  if (!dataVersions[table]) {
    // Initialize from file mtime
    const filepath = path.join(DATA_DIR, table + '.json');
    try {
      if (fs.existsSync(filepath)) {
        dataVersions[table] = Math.floor(fs.statSync(filepath).mtimeMs);
      } else {
        dataVersions[table] = 0;
      }
    } catch { dataVersions[table] = 0; }
  }
  return dataVersions[table];
}

// ═══════════════════════════════════════════════════════════════
// INTERNAL DATA SYNC (reads local files directly — no HTTP self-call)
// ═══════════════════════════════════════════════════════════════
// NOTE: Previously these fetched from https://leeds-crm.com/api/* which IS this server.
// After adding auth, the server couldn't call its own endpoints. Now reads files directly.
async function syncExternalData() {
  console.log("🔄 Internal data sync check...");
  const crg = readJSON("crg-deals.json", []);
  const cap = readJSON("daily-cap.json", []);
  console.log(`📊 Data status: ${crg.length} CRG deals, ${cap.length} daily cap entries`);
  return { crgDeals: crg.length > 0, dailyCap: cap.length > 0 };
}

// ═══════════════════════════════════════════════════════════════
// 5. POINT-IN-TIME RECOVERY (PITR) — Enhanced Backup System
// ═══════════════════════════════════════════════════════════════

// Backup every 15 minutes (was 1 hour), keep 30 days of daily + 48 hours of hourly
function createBackup(label) {
  const ts = label || new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const backupPath = path.join(BACKUP_DIR, ts);
  if (!fs.existsSync(backupPath)) fs.mkdirSync(backupPath, { recursive: true });

  const endpoints = ["payments", "customer-payments", "users", "crg-deals", "daily-cap", "deals", "wallets"];
  let count = 0;
  endpoints.forEach(ep => {
    const src = path.join(DATA_DIR, ep + ".json");
    const dst = path.join(backupPath, ep + ".json");
    if (fs.existsSync(src)) { fs.copyFileSync(src, dst); count++; }
  });

  // Also backup audit log for today
  const todayAudit = path.join(AUDIT_DIR, `audit_${new Date().toISOString().split('T')[0]}.jsonl`);
  if (fs.existsSync(todayAudit)) {
    fs.copyFileSync(todayAudit, path.join(backupPath, 'audit.jsonl'));
  }

  console.log(`📦 Backup created: ${ts} (${count} data files + audit)`);
  cleanupBackups();
  return ts;
}

function cleanupBackups() {
  try {
    const dirs = fs.readdirSync(BACKUP_DIR).sort();
    const now = Date.now();
    const TWO_DAYS = 48 * 60 * 60 * 1000;
    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

    // Keep: all backups within 48 hours, one per day for 30 days
    const kept = new Set();
    const dailyKept = new Set();

    dirs.forEach(d => {
      try {
        const ts = new Date(d.replace(/(\d{4})-(\d{2})-(\d{2})T(\d{2})-(\d{2})-(\d{2})/, '$1-$2-$3T$4:$5:$6'));
        const age = now - ts.getTime();
        const dayKey = d.slice(0, 10);

        if (age < TWO_DAYS) {
          kept.add(d); // Keep all recent
        } else if (age < THIRTY_DAYS && !dailyKept.has(dayKey)) {
          kept.add(d); // Keep one per day
          dailyKept.add(dayKey);
        }
      } catch {}
    });

    dirs.forEach(d => {
      if (!kept.has(d)) {
        fs.rmSync(path.join(BACKUP_DIR, d), { recursive: true, force: true });
        console.log(`🗑️ Old backup removed: ${d}`);
      }
    });
  } catch (err) {
    console.error("⚠️ Backup cleanup error:", err.message);
  }
}

// Backup every 15 minutes
setInterval(createBackup, 15 * 60 * 1000);
// Backup on startup
setTimeout(createBackup, 5000);

// ═══════════════════════════════════════════════════════════════
// 6. EXPRESS + SECURITY MIDDLEWARE
// ═══════════════════════════════════════════════════════════════

// FIX C6: Restrict CORS to known origins (env var or defaults)
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || "").split(",").filter(Boolean);
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (server-to-server, curl, mobile apps)
    if (!origin) return callback(null, true);
    // Allow localhost in dev
    if (origin.includes("localhost") || origin.includes("127.0.0.1")) return callback(null, true);
    // Allow configured origins
    if (ALLOWED_ORIGINS.length > 0 && ALLOWED_ORIGINS.some(o => origin.includes(o))) return callback(null, true);
    // Allow same-domain (Nginx proxy setup)
    if (ALLOWED_ORIGINS.length === 0) return callback(null, true);
    callback(new Error("CORS blocked"));
  },
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));

// ── FIX C4/C5: Session token authentication ──
// On login success, server issues a random session token.
// All data/admin endpoints require valid token in Authorization header.
// activeSessions loaded above from SESSION_FILE
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days (matches client)
const SESSION_FILE = path.join(DATA_DIR, ".sessions.json");

// Load persisted sessions on startup (survive server restarts)
const activeSessions = new Map();
try {
  if (fs.existsSync(SESSION_FILE)) {
    const saved = JSON.parse(fs.readFileSync(SESSION_FILE, "utf8"));
    const now = Date.now();
    for (const [token, session] of Object.entries(saved)) {
      if (now - session.createdAt < SESSION_DURATION) activeSessions.set(token, session);
    }
    console.log(`🔑 Restored ${activeSessions.size} active sessions from disk`);
  }
} catch (e) { console.log("⚠️ Could not restore sessions:", e.message); }

function persistSessions() {
  try {
    const obj = Object.fromEntries(activeSessions);
    fs.writeFileSync(SESSION_FILE, JSON.stringify(obj), "utf8");
  } catch {}
}

function generateSessionToken() {
  return crypto.randomBytes(32).toString("hex");
}

function cleanupSessions() {
  const now = Date.now();
  let cleaned = 0;
  for (const [token, session] of activeSessions) {
    if (now - session.createdAt > SESSION_DURATION) { activeSessions.delete(token); cleaned++; }
  }
  if (cleaned > 0) { persistSessions(); console.log(`🧹 Cleaned ${cleaned} expired sessions`); }
}
setInterval(cleanupSessions, 60 * 60 * 1000); // Hourly cleanup

// Auth middleware — checks Authorization: Bearer <token>
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required" });
  }
  const token = authHeader.slice(7);
  const session = activeSessions.get(token);
  if (!session) {
    return res.status(401).json({ error: "Invalid or expired session" });
  }
  if (Date.now() - session.createdAt > SESSION_DURATION) {
    activeSessions.delete(token);
    return res.status(401).json({ error: "Session expired" });
  }
  req.userSession = session; // Attach user info to request
  next();
}

// Admin-only middleware (checks email against admin list)
const ADMIN_EMAILS = ["office1092021@gmail.com", "y0505300530@gmail.com"];
function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (!ADMIN_EMAILS.includes(req.userSession.email)) {
      return res.status(403).json({ error: "Admin access required" });
    }
    next();
  });
}

// Rate limiting: 200 req/min per IP (increased for WebSocket fallback polling)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000;
const RATE_LIMIT_MAX = 200;

function rateLimit(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  if (!rateLimitMap.has(ip)) { rateLimitMap.set(ip, { count: 1, windowStart: now }); return next(); }
  const entry = rateLimitMap.get(ip);
  if (now - entry.windowStart > RATE_LIMIT_WINDOW) { entry.count = 1; entry.windowStart = now; return next(); }
  entry.count++;
  if (entry.count > RATE_LIMIT_MAX) return res.status(429).json({ error: "Too many requests" });
  next();
}
setInterval(() => { const now = Date.now(); for (const [ip, e] of rateLimitMap) { if (now - e.windowStart > RATE_LIMIT_WINDOW * 2) rateLimitMap.delete(ip); } }, 5 * 60 * 1000);

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  if (req.path.startsWith('/api/')) { res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate'); res.setHeader('Pragma', 'no-cache'); }
  next();
});
app.use('/api/', rateLimit);

// Block attack paths
app.use((req, res, next) => {
  const blocked = ['/wp-admin', '/wp-login', '/.env', '/phpinfo', '/admin.php', '/.git', '/config', '/xmlrpc'];
  if (blocked.some(b => req.path.toLowerCase().includes(b))) {
    writeAuditLog("security", "blocked_request", "unknown", `Path: ${req.path} IP: ${req.ip}`);
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
});

// Input sanitization middleware
app.use('/api/', (req, res, next) => {
  if (req.method === 'POST' && req.body && typeof req.body === 'object') {
    // Prevent prototype pollution — check OWN properties only (not inherited ones like 'constructor')
    const keys = Object.keys(req.body);
    if (keys.includes('__proto__') || keys.includes('prototype')) {
      return res.status(400).json({ error: "Invalid input" });
    }
  }
  next();
});

// ═══════════════════════════════════════════════════════════════
// 7. LOGIN & AUTHENTICATION
// ═══════════════════════════════════════════════════════════════

const loginAttempts = new Map();
const LOGIN_MAX_ATTEMPTS = 3;
const LOGIN_BLOCK_DURATION = 15 * 60 * 1000;
setInterval(() => { const now = Date.now(); for (const [ip, e] of loginAttempts) { if (now - e.firstAttempt > LOGIN_BLOCK_DURATION) loginAttempts.delete(ip); } }, 5 * 60 * 1000);

// ═══════════════════════════════════════════════════════════════
// LOGIN — v3.09 BULLETPROOF with INITIAL_USERS fallback + debug
// ═══════════════════════════════════════════════════════════════
app.post("/api/login", (req, res) => {
  const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
  const now = Date.now();

  // IP blocking
  const entry = loginAttempts.get(ip);
  if (entry && entry.count >= LOGIN_MAX_ATTEMPTS) {
    const unblockTime = entry.firstAttempt + LOGIN_BLOCK_DURATION;
    if (now < unblockTime) {
      const minsLeft = Math.ceil((unblockTime - now) / 60000);
      return res.status(429).json({ error: "blocked", minutes: minsLeft });
    }
    loginAttempts.delete(ip);
  }

  const { email, passwordHash } = req.body;
  if (!email || !passwordHash) {
    return res.status(400).json({ error: "Missing credentials" });
  }

  const emailClean = email.toLowerCase().trim();
  const fileUsers = readJSON("users.json", []);

  // ── TRY 1: Match against users.json file ──
  let user = fileUsers.find(u => u.email === emailClean && u.passwordHash === passwordHash);

  // ── TRY 2: If file match failed, try INITIAL_USERS (hardcoded, always has hashes) ──
  if (!user) {
    const seedMatch = INITIAL_USERS.find(u => u.email === emailClean && u.passwordHash === passwordHash);
    if (seedMatch) {
      user = seedMatch;
      // Also repair users.json while we're at it
      const existing = fileUsers.find(u => u.email === emailClean);
      if (existing && !existing.passwordHash) {
        existing.passwordHash = passwordHash;
        try { fs.writeFileSync(path.join(DATA_DIR, "users.json"), JSON.stringify(fileUsers, null, 2), "utf8"); } catch {}
        console.log("🔧 Auto-repaired passwordHash for:", emailClean);
      } else if (!existing) {
        fileUsers.push(seedMatch);
        try { fs.writeFileSync(path.join(DATA_DIR, "users.json"), JSON.stringify(fileUsers, null, 2), "utf8"); } catch {}
        console.log("👤 Auto-added missing user:", emailClean);
      }
    }
  }

  // ── Build debug info ──
  const fileMatch = fileUsers.find(u => u.email === emailClean);
  const seedMatch = INITIAL_USERS.find(u => u.email === emailClean);
  const debug = {
    v: VERSION,
    fileUsersCount: fileUsers.length,
    fileUsersWithHash: fileUsers.filter(u => !!u.passwordHash).length,
    fileUsersNoHash: fileUsers.filter(u => !u.passwordHash).map(u => u.email),
    emailInFile: !!fileMatch,
    emailInSeed: !!seedMatch,
    fileHasHash: fileMatch ? !!fileMatch.passwordHash : false,
    seedHasHash: seedMatch ? !!seedMatch.passwordHash : false,
    hashMatchFile: fileMatch ? (fileMatch.passwordHash === passwordHash) : false,
    hashMatchSeed: seedMatch ? (seedMatch.passwordHash === passwordHash) : false,
    serverHash8: fileMatch && fileMatch.passwordHash ? fileMatch.passwordHash.substring(0, 8) : "NONE",
    clientHash8: passwordHash.substring(0, 8),
    seedHash8: seedMatch ? seedMatch.passwordHash.substring(0, 8) : "NONE",
    dataDir: DATA_DIR,
    fileExists: fs.existsSync(path.join(DATA_DIR, "users.json")),
  };

  if (user) {
    loginAttempts.delete(ip);
    const token = generateSessionToken();
    activeSessions.set(token, { email: user.email, name: user.name, pageAccess: user.pageAccess, createdAt: Date.now() });
    persistSessions();
    console.log("✅ Login OK:", emailClean, "| method:", fileMatch && fileMatch.passwordHash === passwordHash ? "file" : "seed_fallback");
    writeAuditLog("auth", "login_success", emailClean, "IP: " + ip);
    res.json({ ok: true, token, user: { email: user.email, name: user.name, pageAccess: user.pageAccess } });
  } else {
    const current = loginAttempts.get(ip) || { count: 0, firstAttempt: now };
    current.count++;
    if (current.count === 1) current.firstAttempt = now;
    loginAttempts.set(ip, current);
    const remaining = LOGIN_MAX_ATTEMPTS - current.count;

    console.log("❌ Login FAILED:", emailClean, "| debug:", JSON.stringify(debug));
    writeAuditLog("auth", "login_failed", emailClean, "IP: " + ip);

    if (remaining <= 0) res.status(429).json({ error: "blocked", minutes: 15, debug });
    else res.status(401).json({ error: "invalid", remaining, debug });
  }
});

// ── Logout ──
app.post("/api/logout", (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    if (activeSessions.has(token)) {
      writeAuditLog("auth", "logout", activeSessions.get(token).email, "");
      activeSessions.delete(token);
      persistSessions();
    }
  }
  res.json({ ok: true });
});

// ── Session validation ──
app.get("/api/session", requireAuth, (req, res) => {
  res.json({ ok: true, user: { email: req.userSession.email, name: req.userSession.name, pageAccess: req.userSession.pageAccess } });
});

// ═══════════════════════════════════════════════════════════════
// 8. DATA ENDPOINTS — With Atomic Writes + Audit + Versioning
// ═══════════════════════════════════════════════════════════════

const endpoints = ["payments", "customer-payments", "users", "crg-deals", "daily-cap", "deals", "wallets"];

// GET — returns data + version number (REQUIRES AUTH)
endpoints.forEach(ep => {
  const file = ep + ".json";
  app.get(`/api/${ep}`, requireAuth, (req, res) => {
    let data = readJSON(file, []);
    // FIX C2: Strip password hashes from user data — NEVER expose to client
    if (ep === "users") {
      data = data.map(u => ({ email: u.email, name: u.name, pageAccess: u.pageAccess }));
    }
    res.json({ data, version: getVersion(ep), timestamp: Date.now() });
  });
});

// POST — atomic save with conflict detection, audit log, broadcast
app.post("/api/payments", requireAuth, async (req, res) => {
  const { data: newPayments, version: clientVersion, user: userEmail } = req.body;
  // Support legacy format (raw array)
  const payments = Array.isArray(req.body) ? req.body : newPayments;
  if (!Array.isArray(payments)) return res.status(400).json({ error: "Invalid data format" });
  if (payments.length > 10000) return res.status(400).json({ error: "Too many records" });

  // Empty array protection
  if (payments.length === 0) {
    const existing = readJSON("payments.json", []);
    if (existing.length > 0) {
      console.log(`⚠️ BLOCKED empty save to payments — ${existing.length} records protected`);
      return res.status(400).json({ error: "Cannot overwrite existing data with empty array" });
    }
  }

  // Detect status changes for Telegram notifications
  const oldPayments = readJSON("payments.json", []);
  const oldMap = new Map(oldPayments.map(p => [p.id, p]));
  payments.forEach(p => {
    const oldP = oldMap.get(p.id);
    if (!oldP) {
      // New payment - no notification (only notify when paid)
      // Removed: if (["Open", "On the way", "Approved to pay"].includes(p.status)) sendTelegramNotification(formatOpenPaymentMessage(p));
      if (p.status === "Paid") sendTelegramNotification(formatPaidPaymentMessage(p));
    } else if (oldP.status !== p.status) {
      if (p.status === "Paid" && oldP.status !== "Paid") sendTelegramNotification(formatPaidPaymentMessage(p));
      // Removed: Re-opening a previously paid payment notification
      // else if (["Open", "On the way", "Approved to pay"].includes(p.status) && oldP.status === "Paid") sendTelegramNotification(formatOpenPaymentMessage(p));
    }
  });

  // Conflict detection
  const serverVersion = getVersion("payments");
  if (clientVersion && clientVersion < serverVersion) {
    writeAuditLog("payments", "conflict_lww", userEmail || "unknown", `Client v${clientVersion} < Server v${serverVersion}. Last-writer-wins applied.`);
    console.log(`⚠️ Conflict on payments: client v${clientVersion} < server v${serverVersion} — LWW applied`);
  }

  // Atomic write
  const success = await lockedWrite("payments.json", payments, {
    action: "update", user: userEmail || "unknown", details: `${payments.length} records`
  });

  if (success) {
    broadcastUpdate("payments", payments);
    res.json({ ok: true, count: payments.length, version: getVersion("payments") });
  } else {
    res.status(500).json({ error: "Write failed — data not saved" });
  }
});

// Generic POST for other tables
["customer-payments", "crg-deals", "daily-cap", "deals", "wallets"].forEach(ep => {
  const file = ep + ".json";
  app.post(`/api/${ep}`, requireAuth, async (req, res) => {
    const { data: newData, version: clientVersion, user: userEmail } = req.body;
    const records = Array.isArray(req.body) ? req.body : newData;
    if (!Array.isArray(records)) return res.status(400).json({ error: "Invalid data format" });
    if (records.length > 10000) return res.status(400).json({ error: "Too many records" });

    if (records.length === 0) {
      const existing = readJSON(file, []);
      if (existing.length > 0) {
        console.log(`⚠️ BLOCKED empty save to ${ep} — ${existing.length} records protected`);
        return res.status(400).json({ error: "Cannot overwrite existing data with empty array" });
      }
    }

    const serverVersion = getVersion(ep);
    if (clientVersion && clientVersion < serverVersion) {
      writeAuditLog(ep, "conflict_lww", userEmail || "unknown", `Client v${clientVersion} < Server v${serverVersion}`);
      console.log(`⚠️ Conflict on ${ep}: client v${clientVersion} < server v${serverVersion} — LWW applied`);
    }

    const success = await lockedWrite(file, records, {
      action: "update", user: userEmail || "unknown", details: `${records.length} records`
    });

    if (success) {
      broadcastUpdate(ep, records);
      res.json({ ok: true, count: records.length, version: getVersion(ep) });
    } else {
      res.status(500).json({ error: "Write failed" });
    }
  });
});

// Users — separate endpoint to preserve full data + audit
app.post("/api/users", requireAuth, async (req, res) => {
  const { data: newUsers, user: userEmail } = req.body;
  let users = Array.isArray(req.body) ? req.body : newUsers;
  if (!Array.isArray(users)) return res.status(400).json({ error: "Invalid data" });

  if (users.length === 0) {
    const existing = readJSON("users.json", []);
    if (existing.length > 0) {
      console.log(`⚠️ BLOCKED empty save to users — ${existing.length} users protected`);
      return res.status(400).json({ error: "Cannot overwrite existing users with empty array" });
    }
  }

  // CRITICAL: Prevent client from stripping passwordHash
  // Client receives users WITHOUT passwordHash (security fix C2).
  // If client sends them back, we must preserve the existing passwordHash.
  const existing = readJSON("users.json", []);
  const existingMap = new Map(existing.map(u => [u.email, u]));
  const seedMap = new Map(INITIAL_USERS.map(u => [u.email, u]));
  users = users.map(u => {
    if (!u.passwordHash) {
      // Restore from existing file or from seed
      const ex = existingMap.get(u.email);
      const seed = seedMap.get(u.email);
      if (ex && ex.passwordHash) return { ...u, passwordHash: ex.passwordHash };
      if (seed && seed.passwordHash) return { ...u, passwordHash: seed.passwordHash };
    }
    return u;
  });

  const success = await lockedWrite("users.json", users, {
    action: "update", user: userEmail || "system", details: `${users.length} users saved`
  });

  if (success) {
    broadcastUpdate("users", users);
    console.log(`👥 Users updated: ${users.length} users saved`);
    res.json({ ok: true, count: users.length, version: getVersion("users") });
  } else {
    res.status(500).json({ error: "Write failed" });
  }
});

// ── Version endpoint — clients check this to know if they need to re-fetch
app.get("/api/versions", requireAuth, (req, res) => {
  const versions = {};
  endpoints.forEach(ep => { versions[ep] = getVersion(ep); });
  res.json({ versions, timestamp: Date.now() });
});

// ═══════════════════════════════════════════════════════════════
// 9. WEBSOCKET — Real-Time Sync
// ═══════════════════════════════════════════════════════════════

const server = http.createServer(app);
const wsClients = new Set();
let wss = null;

if (WS_AVAILABLE) {
  wss = new WebSocketServer({ server, path: "/ws" });

  wss.on('connection', (ws, req) => {
    // FIX H1: Require auth token for WebSocket connections
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get("token");
    if (!token || !activeSessions.has(token)) {
      ws.close(4001, "Authentication required");
      return;
    }
    wsClients.add(ws);
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    console.log(`🔌 WebSocket connected: ${ip} (${wsClients.size} total)`);

    // Send current versions on connect
    const versions = {};
    endpoints.forEach(ep => { versions[ep] = getVersion(ep); });
    ws.send(JSON.stringify({ type: "versions", versions, timestamp: Date.now() }));

    // Handle messages from client
    ws.on('message', (msg) => {
      try {
        const data = JSON.parse(msg);
        if (data.type === "ping") {
          ws.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
        }
      } catch {}
    });

    ws.on('close', () => {
      wsClients.delete(ws);
      console.log(`🔌 WebSocket disconnected (${wsClients.size} remaining)`);
    });

    ws.on('error', () => {
      wsClients.delete(ws);
    });
  });

  // Heartbeat — keep connections alive + detect dead clients
  setInterval(() => {
    wsClients.forEach(ws => {
      if (ws.readyState !== WebSocket.OPEN) { wsClients.delete(ws); return; }
      ws.send(JSON.stringify({ type: "heartbeat", timestamp: Date.now(), clients: wsClients.size }));
    });
  }, 30000);
}

// Broadcast data update to all connected WebSocket clients
function broadcastUpdate(table, data) {
  if (!WS_AVAILABLE || wsClients.size === 0) return;
  const message = JSON.stringify({
    type: "update",
    table,
    version: getVersion(table),
    data,
    timestamp: Date.now(),
  });

  let sent = 0;
  wsClients.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
      sent++;
    }
  });
  if (sent > 0) console.log(`📡 Broadcast ${table} update to ${sent} clients`);
}

// ═══════════════════════════════════════════════════════════════
// 10. AUDIT LOG ENDPOINTS
// ═══════════════════════════════════════════════════════════════

// GET audit logs for a specific date or range
app.get("/api/audit", requireAdmin, (req, res) => {
  const { date, days } = req.query;
  const targetDate = date || new Date().toISOString().split('T')[0];
  const numDays = parseInt(days) || 1;

  const logs = [];
  for (let i = 0; i < numDays; i++) {
    const d = new Date(targetDate);
    d.setDate(d.getDate() - i);
    const dateKey = d.toISOString().split('T')[0];
    const logFile = path.join(AUDIT_DIR, `audit_${dateKey}.jsonl`);
    try {
      if (fs.existsSync(logFile)) {
        const lines = fs.readFileSync(logFile, 'utf8').trim().split('\n');
        lines.forEach(line => {
          try { logs.push(JSON.parse(line)); } catch {}
        });
      }
    } catch {}
  }

  logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  res.json(logs.slice(0, 500)); // Max 500 entries
});

// ═══════════════════════════════════════════════════════════════
// 11. BACKUP & RESTORE ENDPOINTS (PITR)
// ═══════════════════════════════════════════════════════════════

app.get("/api/backups", requireAdmin, (req, res) => {
  if (!fs.existsSync(BACKUP_DIR)) return res.json([]);
  const backups = fs.readdirSync(BACKUP_DIR).sort().reverse().map(name => {
    const bp = path.join(BACKUP_DIR, name);
    const files = fs.readdirSync(bp).length;
    return { name, files, timestamp: name };
  });
  res.json(backups);
});

app.post("/api/restore/:backup", requireAdmin, async (req, res) => {
  // FIX H2: Sanitize backup name — alphanumeric, dashes, T only (no ../  or path separators)
  const backupName = req.params.backup.replace(/[^a-zA-Z0-9\-T]/g, "");
  if (backupName !== req.params.backup || backupName.length < 5) {
    return res.status(400).json({ ok: false, error: "Invalid backup name" });
  }
  const bp = path.join(BACKUP_DIR, backupName);
  // Double-check resolved path is inside BACKUP_DIR
  if (!path.resolve(bp).startsWith(path.resolve(BACKUP_DIR))) {
    return res.status(400).json({ ok: false, error: "Invalid backup path" });
  }
  if (!fs.existsSync(bp)) return res.json({ ok: false, error: "Backup not found" });

  // Create a pre-restore backup first
  const preRestore = createBackup(`pre-restore-${Date.now()}`);

  const ip = req.ip || 'unknown';
  writeAuditLog("system", "restore", req.body?.user || "admin", `Restored from ${req.params.backup}, pre-restore saved as ${preRestore}. IP: ${ip}`);

  let count = 0;
  for (const ep of endpoints) {
    const src = path.join(bp, ep + ".json");
    if (fs.existsSync(src)) {
      const data = JSON.parse(fs.readFileSync(src, "utf8"));
      await lockedWrite(ep + ".json", data, { action: "restore", user: "admin", details: `Restored from ${req.params.backup}` });
      broadcastUpdate(ep, data);
      count++;
    }
  }

  console.log(`♻️ Restored backup: ${req.params.backup} (${count} files)`);
  res.json({ ok: true, restored: req.params.backup, preRestoreBackup: preRestore, files: count });
});

// Manual backup trigger
app.post("/api/backup", requireAdmin, (req, res) => {
  const label = createBackup();
  writeAuditLog("system", "manual_backup", req.body?.user || "admin", `Manual backup: ${label}`);
  res.json({ ok: true, backup: label });
});

// ═══════════════════════════════════════════════════════════════
// 12. HEALTH & MONITORING
// ═══════════════════════════════════════════════════════════════

// ── TEMPORARY DEBUG ENDPOINT — remove after login is fixed! ──
app.get("/api/debug/users", (req, res) => {
  const users = readJSON("users.json", []);
  const safe = users.map(u => ({
    email: u.email,
    name: u.name,
    hasPasswordHash: !!u.passwordHash,
    hashLength: u.passwordHash ? u.passwordHash.length : 0,
    hashPrefix: u.passwordHash ? u.passwordHash.substring(0, 12) + "..." : "MISSING",
    pageAccess: u.pageAccess,
  }));
  res.json({
    totalUsers: users.length,
    withHash: users.filter(u => !!u.passwordHash).length,
    withoutHash: users.filter(u => !u.passwordHash).length,
    seedRanOnStartup: true,
    users: safe,
  });
});

app.get("/api/health", (req, res) => {
  // Public: basic status only. No sensitive info.
  const basic = { status: "ok", version: VERSION, time: new Date().toISOString() };

  // If authenticated as admin, include extended info
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const session = activeSessions.get(authHeader.slice(7));
    if (session && ADMIN_EMAILS.includes(session.email)) {
      const dataFiles = endpoints.map(ep => {
        const file = path.join(DATA_DIR, ep + ".json");
        const exists = fs.existsSync(file);
        let size = 0, records = 0;
        if (exists) { size = fs.statSync(file).size; try { records = JSON.parse(fs.readFileSync(file, "utf8")).length; } catch {} }
        return { table: ep, exists, size, records, version: getVersion(ep) };
      });
      return res.json({ ...basic, uptime: process.uptime(), websockets: wsClients.size, sessions: activeSessions.size, tables: dataFiles });
    }
  }
  res.json(basic);
});

// ── Debug: check users.json state (no passwords exposed, just diagnostic info) ──
app.get("/api/debug/users", (req, res) => {
  const users = readJSON("users.json", []);
  const diag = users.map(u => ({
    email: u.email,
    name: u.name || "?",
    hasPasswordHash: !!u.passwordHash,
    hashPrefix: u.passwordHash ? u.passwordHash.substring(0, 8) + "..." : "MISSING",
    hasPageAccess: !!u.pageAccess,
  }));
  res.json({ count: users.length, users: diag, seedCount: INITIAL_USERS.length });
});

// ═══════════════════════════════════════════════════════════════
// 13. TELEGRAM BOT (preserved from v2.03)
// ═══════════════════════════════════════════════════════════════

function sendTelegramNotification(message) {
  if (TELEGRAM_TOKEN === "YOUR_BOT_TOKEN_HERE" || !TELEGRAM_TOKEN) {
    console.log("📱 Telegram notification skipped (no token configured)");
    return;
  }

  const postData = JSON.stringify({
    chat_id: FINANCE_GROUP_CHAT_ID,
    text: message
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
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
      if (res.statusCode !== 200) console.log("❌ Telegram error:", d);
    });
  });

  req.on('error', err => console.error("❌ Telegram error:", err.message));
  req.write(postData);
  req.end();
}


function formatOpenPaymentMessage(p) {
  return `💰 NEW PAYMENT`;
}


function formatPaidPaymentMessage(p) {
  const amount = Number(p.amount || 0).toLocaleString("en-US");

  return `💰 PAYMENT ${p.invoice} marked as PAID 💰
<<<<<<< HEAD
=======

>>>>>>> 229d8186 (aniter)

💵 Amount: $${amount}
👤 Paid by: ${p.openBy || "Unknown"}
Payment Hash: ${p.paymentHash || "N/A"}`;
}

// ── Telegram Bot Commands & Hash Detection ──
let bot;
const userStates = {};

if (TELEGRAM_TOKEN && TELEGRAM_TOKEN !== "YOUR_BOT_TOKEN_HERE") {
  try {
    bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true, filepath: false });
    console.log("🤖 Telegram bot initialized");
    bot.on('polling_error', (error) => { console.log(`⚠️ Polling error:`, error.code || error.message); });

    bot.setMyCommands([
      { command:"/start", description:"Welcome & help" },
      { command:"/wallets", description:"Current wallet addresses" },
      { command:"/crgdeals", description:"Today's CRG deals by country" },
      { command:"/deals", description:"All deals by country" },
      { command:"/todaycrgcap", description:"Today's CRG cap summary" },
      { command:"/todayagentscap", description:"Today's agents cap" },
      { command:"/payments", description:"Open payments summary" },
    ]).catch(e => console.log("⚠️ Register commands:", e.message));

    bot.onText(/\/start|\/help/, (msg) => {
      bot.sendMessage(msg.chat.id, `👋 <b>Blitz CRM Bot v${VERSION}</b>\n\n/wallets - Wallet addresses\n/crgdeals - Today's CRG deals\n/deals - All deals by country\n/todaycrgcap - CRG cap summary\n/todayagentscap - Agents cap\n/payments - Open payments\n/help - This help`, { parse_mode: "HTML" });
    });

    // /wallets
    bot.onText(/\/wallets/, (msg) => {
      const wallets = readJSON("wallets.json", []); if (!wallets.length) { bot.sendMessage(msg.chat.id, "❌ No wallets found."); return; }
      const w = wallets[0];
      const ds = w.date ? (() => { const d = new Date(w.date + "T00:00:00"); return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`; })() : "N/A";
      bot.sendMessage(msg.chat.id, `💳 Current Wallets (${ds})\n\nTRC-20:\n${w.trc || "—"}\n\nERC-20 (USDT/USDC):\n${w.erc || "—"}\n\nBTC:\n${w.btc || "—"}\n\nLast updated: ${ds}\n*3% fee`);
    });

    bot.onText(/\/payments/, (msg) => {
      const payments = readJSON("payments.json", []); const open = payments.filter(p => p.status !== "Paid");
      const total = open.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
      let t = `📊 <b>Open Payments: ${open.length}</b>\n💰 Total: <b>$${total.toLocaleString("en-US")}</b>\n\n`;
      open.slice(0, 10).forEach(p => { t += `#${p.invoice} — $${parseFloat(p.amount).toLocaleString("en-US")} [${p.status}]\n`; });
      if (open.length > 10) t += `\n... and ${open.length - 10} more`;
      bot.sendMessage(msg.chat.id, t, { parse_mode: "HTML" });
    });

    // /deals — all-time with inline keyboard
    bot.onText(/\/deals/, (msg) => {
      delete userStates[msg.chat.id];
      userStates[msg.chat.id] = { state: "waiting_for_country_deals", command: "/deals" };
      bot.sendMessage(msg.chat.id, `📊 <b>Deals - Leeds CRM</b>\n\nSelect country or type code:`, {
        parse_mode: "HTML", reply_markup: { inline_keyboard: [
          [{ text: "🇩🇪 DE", callback_data: "all_DE" }, { text: "🇫🇷 FR", callback_data: "all_FR" }, { text: "🇬🇧 UK", callback_data: "all_UK" }],
          [{ text: "🇪🇸 ES", callback_data: "all_ES" }, { text: "🇧🇪 BE", callback_data: "all_BE" }, { text: "🇮🇹 IT", callback_data: "all_IT" }],
          [{ text: "🇦🇺 AU", callback_data: "all_AU" }, { text: "🇲🇾 MY", callback_data: "all_MY" }, { text: "🇸🇬 SI", callback_data: "all_SI" }],
          [{ text: "🇭🇷 HR", callback_data: "all_HR" }, { text: "🇸🇦 GCC", callback_data: "all_GCC" }],
        ] }
      });
    });

    // /crgdeals — today's deals with inline keyboard
    bot.onText(/\/crgdeals/, (msg) => {
      delete userStates[msg.chat.id];
      userStates[msg.chat.id] = { state: "waiting_for_country_crg", command: "/crgdeals" };
      bot.sendMessage(msg.chat.id, `📊 <b>CRG Deals - Today</b>\n\nSelect country or type code:`, {
        parse_mode: "HTML", reply_markup: { inline_keyboard: [
          [{ text: "🇩🇪 DE", callback_data: "DE" }, { text: "🇫🇷 FR", callback_data: "FR" }, { text: "🇬🇧 UK", callback_data: "UK" }],
          [{ text: "🇦🇺 AU", callback_data: "AU" }, { text: "🇲🇾 MY", callback_data: "MY" }, { text: "🇸🇬 SI", callback_data: "SI" }],
          [{ text: "🇭🇷 HR", callback_data: "HR" }, { text: "🇸🇦 GCC", callback_data: "GCC" }],
        ] }
      });
    });

    // /todaycrgcap
    bot.onText(/\/todaycrgcap/, (msg) => {
      const all = readJSON("crg-deals.json", []); const dates = [...new Set(all.map(d => d.date))].sort().reverse(); const ld = dates[0] || new Date().toISOString().split("T")[0];
      const td = all.filter(d => d.date === ld); if (!td.length) { bot.sendMessage(msg.chat.id, "📭 No CRG cap data.\n<i>Syncs every 15min.</i>", { parse_mode: "HTML" }); return; }
      const tCap = td.reduce((s, d) => s + (parseInt(d.cap) || 0), 0), tRec = td.reduce((s, d) => s + (parseInt(d.capReceived) || 0), 0), tFTD = td.reduce((s, d) => s + (parseInt(d.ftd) || 0), 0);
      let t = `📊 <b>Today CRG Cap</b>\n📅 ${ld} | ${td.length} deals\n\n<code>Affiliate    | Cap | Rec | FTD\n-------------|-----|-----|-----\n`;
      td.slice(0, 15).forEach(d => { t += `${(d.affiliate || "").padEnd(12).substring(0, 12)}| ${(d.cap || "0").padStart(3)} | ${(d.capReceived || "0").padStart(3)} | ${(d.ftd || "0").padStart(3)}\n`; });
      if (td.length > 15) t += `... ${td.length - 15} more\n`;
      t += `-------------|-----|-----|-----\nTOTAL        | ${String(tCap).padStart(3)} | ${String(tRec).padStart(3)} | ${String(tFTD).padStart(3)}</code>\n\nRemaining: ${tCap - tRec}`;
      bot.sendMessage(msg.chat.id, t, { parse_mode: "HTML" });
    });

    // /todayagentscap
    bot.onText(/\/todayagentscap/, (msg) => {
      const all = readJSON("daily-cap.json", []); const dates = [...new Set(all.map(c => c.date))].sort().reverse(); const ld = dates[0] || new Date().toISOString().split("T")[0];
      const tc = all.filter(c => c.date === ld); if (!tc.length) { bot.sendMessage(msg.chat.id, "📭 No agents cap data.\n<i>Syncs every 15min.</i>", { parse_mode: "HTML" }); return; }
      const tAff = tc.reduce((s, c) => s + (parseInt(c.affiliates) || 0), 0), tBr = tc.reduce((s, c) => s + (parseInt(c.brands) || 0), 0);
      let t = `📊 <b>Today Agents Cap</b>\n📅 ${ld}\n\n<code>Agent      | Aff | Brands\n-----------|-----|-------\n`;
      tc.forEach(c => { t += `${(c.agent || "").padEnd(10).substring(0, 10)}| ${(c.affiliates || "0").padStart(3)} | ${(c.brands || "0").padStart(6)}\n`; });
      t += `-----------|-----|-------\nTOTAL      | ${String(tAff).padStart(3)} | ${String(tBr).padStart(6)}</code>\n\nAgents: ${tc.length} | Aff: ${tAff} | Brands: ${tBr}`;
      bot.sendMessage(msg.chat.id, t, { parse_mode: "HTML" });
    });

    // ── Inline keyboard callback handler ──
    bot.on("callback_query", async (cq) => {
      const chatId = cq.message.chat.id; bot.answerCallbackQuery(cq.id);
      const isAll = cq.data.startsWith("all_"); const cc = isAll ? cq.data.substring(4) : cq.data;
      if (!VALID_COUNTRIES.includes(cc)) { bot.sendMessage(chatId, `❌ Invalid: ${cc}`, { parse_mode: "HTML" }); return; }
      const cn = COUNTRY_NAMES[cc] || cc; let deals = [];
      if (isAll) { deals = readJSON("deals.json", []).filter(d => d.country && d.country.toUpperCase() === cc); }
      else { const all = readJSON("crg-deals.json", []); const ld = [...new Set(all.map(d => d.date))].sort().reverse()[0]; deals = all.filter(d => d.affiliate && d.affiliate.toUpperCase().endsWith(" " + cc) && d.date === ld); }
      if (!deals.length) { bot.sendMessage(chatId, `📭 No deals for <b>${cn}</b>`, { parse_mode: "HTML" }); return; }
      let t;
      if (isAll) {
        t = `📊 <b>${cn} - Deals</b> (${deals.length})\n\n`;
        deals.slice(0, 20).forEach((d, i) => { t += `<b>${i + 1}. #${d.affiliate}</b>\n   💰 €${d.price || "-"} | CRG:${d.crg || "-"}% | Src:${d.source || "-"}\n   Funnels:${d.funnels || "-"} | Ded:${d.deduction || "-"}%\n\n`; });
        if (deals.length > 20) t += `... and ${deals.length - 20} more`;
      } else {
        const ld = [...new Set(readJSON("crg-deals.json", []).map(d => d.date))].sort().reverse()[0];
        const totalCap = deals.reduce((s, d) => s + (parseInt(d.cap) || 0), 0), totalRec = deals.reduce((s, d) => s + (parseInt(d.capReceived) || 0), 0);
        t = `📊 <b>${cn} - Today</b> (${deals.length})\n📅 ${ld}\n\nCap: ${totalCap} | Rec: ${totalRec} | Left: ${totalCap - totalRec}\n\n`;
        deals.slice(0, 20).forEach((d, i) => { t += `<b>${i + 1}. ${d.affiliate}</b>\n   Broker:${d.brokerCap || "-"} | Cap:${d.cap || "-"} | Rec:${d.capReceived || "0"}\n   ${d.started ? "✅" : "❌"} | ${d.date || "-"}\n\n`; });
      }
      bot.sendMessage(chatId, t, { parse_mode: "HTML" });
    });

    // ── Text input handler — FIXED: handles BOTH state types + USDT hash detection ──
    // BUG FIX from v1.055: /deals set state to 'waiting_for_country_deals' but
    // text handler only checked 'waiting_for_country' → typing country code did NOTHING
    bot.on("message", async (msg) => {
      if (msg.text && msg.text.startsWith("/")) return;
      const chatId = msg.chat.id; const userText = msg.text ? msg.text.trim().toUpperCase() : "";
      const st = userStates[chatId];

      // Handle /deals country text input
      if (st && st.state === "waiting_for_country_deals") {
        delete userStates[chatId];
        if (!VALID_COUNTRIES.includes(userText)) { bot.sendMessage(chatId, `❌ Invalid: ${userText}\n\nValid: ${VALID_COUNTRIES.join(", ")}`, { parse_mode: "HTML" }); return; }
        const deals = readJSON("deals.json", []).filter(d => d.country && d.country.toUpperCase() === userText);
        const cn = COUNTRY_NAMES[userText] || userText;
        if (!deals.length) { bot.sendMessage(chatId, `📭 No deals for <b>${cn}</b>`, { parse_mode: "HTML" }); return; }
        let t = `📊 <b>${cn} - Deals</b> (${deals.length})\n\n`;
        deals.slice(0, 20).forEach((d, i) => { t += `<b>${i + 1}. #${d.affiliate}</b> — €${d.price || "-"} CRG:${d.crg || "-"}% Src:${d.source || "-"}\n`; });
        if (deals.length > 20) t += `\n... and ${deals.length - 20} more`;
        bot.sendMessage(chatId, t, { parse_mode: "HTML" }); return;
      }

      // Handle /crgdeals country text input
      if (st && st.state === "waiting_for_country_crg") {
        delete userStates[chatId];
        if (!VALID_COUNTRIES.includes(userText)) { bot.sendMessage(chatId, `❌ Invalid: ${userText}\n\nValid: ${VALID_COUNTRIES.join(", ")}`, { parse_mode: "HTML" }); return; }
        const all = readJSON("crg-deals.json", []); const ld = [...new Set(all.map(d => d.date))].sort().reverse()[0] || new Date().toISOString().split("T")[0];
        const deals = all.filter(d => d.affiliate && d.affiliate.toUpperCase().endsWith(" " + userText) && d.date === ld);
        const cn = COUNTRY_NAMES[userText] || userText;
        if (!deals.length) { bot.sendMessage(chatId, `📭 No CRG deals for <b>${cn}</b>`, { parse_mode: "HTML" }); return; }
        const tCap = deals.reduce((s, d) => s + (parseInt(d.cap) || 0), 0), tRec = deals.reduce((s, d) => s + (parseInt(d.capReceived) || 0), 0);
        let t = `📊 <b>${cn} - Today</b> (${deals.length})\n📅 ${ld}\n\nCap:${tCap} | Rec:${tRec} | Left:${tCap - tRec}\n\n`;
        deals.slice(0, 20).forEach((d, i) => { t += `<b>${i + 1}. ${d.affiliate}</b> | Cap:${d.cap || "-"} Rec:${d.capReceived || "0"} ${d.started ? "✅" : "❌"}\n`; });
        bot.sendMessage(chatId, t, { parse_mode: "HTML" }); return;
      }

      // Skip hash detection if in ANY waiting state
      if (st) return;

      // USDT hash detection (finance group only)
      if (chatId.toString() !== FINANCE_GROUP_CHAT_ID) return;
      const messageText = msg.text || '';
      const hashes = extractAllUsdtHashes(messageText);
      const txHashes = hashes.filter(h => h.type === 'TRC20' || h.type === 'ERC20');
      if (txHashes.length === 0) return;

      const amounts = [];
      const p1 = /\$(\d+(?:,\d{3})*(?:\.\d{2})?)/g;
      let m; while ((m = p1.exec(messageText)) !== null) amounts.push(m[1].replace(/,/g, ''));
      const p2 = /(\d+(?:,\d{3})*(?:\.\d{2})?)\$/g;
      while ((m = p2.exec(messageText)) !== null) amounts.push(m[1].replace(/,/g, ''));

      const wallets = readJSON("wallets.json", []);

      for (let i = 0; i < txHashes.length; i++) {
        const { hash, type } = txHashes[i];
        let txResult = { success: false };
        if (type === 'TRC20') txResult = await checkTRC20Transaction(hash);
        else if (type === 'ERC20') txResult = await checkERC20Transaction(hash);

        const amount = (amounts[i] || txResult.amount || "0").toString();
        const walletVerify = verifyWalletAddress(txResult.toAddress || "", wallets);
        const status = walletVerify.matched ? "Received" : "Pending";
        const invoice = `CP-${Date.now().toString(36).toUpperCase()}`;

        const newPayment = {
          id: crypto.randomBytes(5).toString('hex'),
          invoice, amount, fee: "", status, type: "Customer Payment",
          openBy: "Telegram Bot", paidDate: new Date().toISOString().split("T")[0],
          paymentHash: hash, trcAddress: type === 'TRC20' ? (txResult.toAddress || "") : "",
          ercAddress: type === 'ERC20' ? (txResult.toAddress || "") : "",
          month: new Date().getMonth(), year: new Date().getFullYear()
        };

        const cp = readJSON("customer-payments.json", []);
        cp.unshift(newPayment);
        await lockedWrite("customer-payments.json", cp, { action: "create", user: "telegram-bot", details: `Auto-created ${invoice} from hash` });
        broadcastUpdate("customer-payments", cp);

        let confirmMsg = `📨 <b>Payment Processed!</b>\n\n📋 Invoice: <b>${invoice}</b>\n💵 Amount: <b>$${amount}</b>\n🔗 Hash (${type}): <code>${hash}</code>\n`;
        confirmMsg += txResult.success ? `✅ Blockchain: <b>Verified</b>\n` : `⚠️ Blockchain: <b>Could not verify</b>\n`;
        confirmMsg += walletVerify.matched ? `✅ Wallet: <b>MATCHED</b>\n` : `❌ Wallet: <b>${walletVerify.error}</b>\n`;
        confirmMsg += `\n📊 Status: <b>${status}</b>`;
        bot.sendMessage(FINANCE_GROUP_CHAT_ID, confirmMsg, { parse_mode: "HTML" });
      }
    });

    console.log("✅ USDT hash detection enabled");
  } catch (err) {
    console.log("⚠️ Failed to init Telegram bot:", err.message);
  }
}

// Hash extraction helpers (preserved)
function extractAllUsdtHashes(text) {
  if (!text) return [];
  const hashes = [];
  const tronMatches = text.matchAll(/tronscan\.org\/[^\/]*\/transaction\/([a-zA-Z0-9]{33,64})/gi);
  for (const match of tronMatches) {
    const h = match[1];
    if (TRC20_ADDRESS_REGEX.test(h)) hashes.push({ hash: h, type: 'TRC20_ADDRESS' });
    else if (h.length === 64) hashes.push({ hash: h, type: 'TRC20' });
  }
  const ethMatches = text.matchAll(/etherscan\.io\/tx\/(0x[a-fA-F0-9]{64})/gi);
  for (const match of ethMatches) hashes.push({ hash: match[1], type: 'ERC20' });
  text.split(/\s+/).forEach(w => {
    const t = w.trim();
    if (hashes.some(h => h.hash === t)) return;
    if (ERC20_HASH_REGEX.test(t)) hashes.push({ hash: t, type: 'ERC20' });
    else if (TRC20_HASH_REGEX.test(t)) hashes.push({ hash: t, type: 'TRC20' });
  });
  return hashes;
}

async function checkTRC20Transaction(txHash) {
  try {
    const url = `${TRONSCAN_API}/api/transaction-info?hash=${txHash}`;
    const data = JSON.parse(await httpRequest(url));
    // Method 1: tokenTransferInfo (most reliable for TRC20)
    if (data && data.tokenTransferInfo && Array.isArray(data.tokenTransferInfo) && data.tokenTransferInfo.length > 0) {
      const usdtTransfer = data.tokenTransferInfo.find(t => t.contract_address === TRC20_USDT_CONTRACT || (t.tokenInfo && t.tokenInfo.symbol === "USDT"));
      if (usdtTransfer) {
        const raw = usdtTransfer.amount_str || usdtTransfer.amount || "0";
        const dec = usdtTransfer.tokenInfo && usdtTransfer.tokenInfo.decimals ? parseInt(usdtTransfer.tokenInfo.decimals) : 6;
        return { success:true, amount:(parseInt(raw)/Math.pow(10,dec)).toString(), toAddress:usdtTransfer.to_address||data.to_address, fromAddress:usdtTransfer.from_address||data.from_address, confirmed:data.confirmed||(data.revert===0) };
      }
    }
    // Method 2: token_info fallback
    if (data && data.token_info && data.token_info.symbol === "USDT") {
      const raw = data.amount || data.token_info.amount || "0";
      const dec = data.token_info.decimals ? parseInt(data.token_info.decimals) : 6;
      return { success:true, amount:(parseInt(raw)/Math.pow(10,dec)).toString(), toAddress:data.to_address, fromAddress:data.from_address, confirmed:data.confirmed||(data.revert===0) };
    }
    return { success: false, error: "Not a USDT TRC20 transaction" };
  } catch (err) { return { success: false, error: err.message }; }
}

async function checkERC20Transaction(txHash) {
  try {
    const CHAIN_ID = "1";
    const receiptData = JSON.parse(await httpRequest(`${ETHERSCAN_V2_API}?action=get_txreceipt_status&module=transaction&chainid=${CHAIN_ID}&txhash=${txHash}&apikey=${ETHERSCAN_API_KEY}`));
    let txResult = null;
    const txData = JSON.parse(await httpRequest(`${ETHERSCAN_V2_API}?action=get_txinfo&module=transaction&chainid=${CHAIN_ID}&txhash=${txHash}&apikey=${ETHERSCAN_API_KEY}`));
    if (txData.status === "1" && txData.message === "OK" && txData.result) txResult = txData.result;
    if (!txResult) {
      console.log("⚠️ V2 failed, trying V1...");
      const v1 = JSON.parse(await httpRequest(`${ETHERSCAN_API}?module=proxy&action=eth_getTransactionByHash&txhash=${txHash}&apikey=${ETHERSCAN_API_KEY}`));
      if (v1.result && typeof v1.result === "object") txResult = v1.result;
    }
    if (!txResult) return { success:false, error:"Could not fetch from Etherscan" };
    const input = txResult.input || "";
    let amount="0", fromAddress=txResult.from||"", toAddress=txResult.to||"";
    if (input.startsWith("0xa9059cbb") && input.length >= 74) { amount=(parseInt("0x"+input.slice(-64),16)/1e6).toString(); toAddress="0x"+input.slice(34,74); }
    else if (txResult.value && txResult.value !== "0x0") { amount=(parseInt(txResult.value,16)/1e18).toString(); }
    const confirmed = receiptData.status==="1" && receiptData.result && receiptData.result.status==="1";
    return { success:true, amount, toAddress, fromAddress, confirmed, hash:txHash };
  } catch (err) { return { success:false, error:err.message }; }
}

function verifyWalletAddress(address, wallets) {
  if (!wallets || wallets.length === 0) return { matched: false, error: "No wallets configured" };
  if (!address) return { matched: false, error: "No address" };
  const n = address.toLowerCase().trim();
  for (const w of wallets) {
    if (w.trc && w.trc.toLowerCase().trim() === n) return { matched: true, wallet: w.trc, type: "TRC20" };
    if (w.erc && w.erc.toLowerCase().trim() === n) return { matched: true, wallet: w.erc, type: "ERC20" };
    if (w.btc && w.btc.toLowerCase().trim() === n) return { matched: true, wallet: w.btc, type: "BTC" };
  }
  return { matched: false, error: "Address not in our wallets" };
}

// Sync endpoints
app.post("/api/sync", requireAdmin, async (req, res) => { const r = await syncExternalData(); res.json({ ok: true, results: r }); });
app.get("/api/sync/status", (req, res) => {
  const crg = readJSON("crg-deals.json", []), dc = readJSON("daily-cap.json", []);
  res.json({ crgDeals: { count: crg.length, latestDates: [...new Set(crg.map(d => d.date))].sort().reverse().slice(0, 5) }, dailyCap: { count: dc.length, latestDates: [...new Set(dc.map(d => d.date))].sort().reverse().slice(0, 5) }, lastCheck: new Date().toISOString() });
});

// ── Telegram test endpoint
app.post("/api/telegram/notify", (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "Message required" });
  sendTelegramNotification(message);
  res.json({ ok: true });
});

app.get("/api/telegram/test", (req, res) => {
  if (!TELEGRAM_TOKEN || TELEGRAM_TOKEN === "YOUR_BOT_TOKEN_HERE") return res.json({ status: "no_token" });
  const options = { hostname: 'api.telegram.org', port: 443, path: `/bot${TELEGRAM_TOKEN}/getMe`, method: 'GET' };
  const r = https.request(options, (response) => {
    let d = ''; response.on('data', c => d += c);
    response.on('end', () => {
      if (response.statusCode === 200) { const info = JSON.parse(d).result; res.json({ status: "connected", bot: info.username, name: info.first_name }); }
      else res.json({ status: "error", error: d });
    });
  });
  r.on('error', err => { console.error("TG test error:", err.message); res.json({ status: "error", error: "Connection failed" }); });
  r.end();
});

// ═══════════════════════════════════════════════════════════════
// 14. START SERVER (HTTP + WebSocket on same port)
// ═══════════════════════════════════════════════════════════════

server.listen(PORT, "0.0.0.0", () => {
  console.log(`\n╔══════════════════════════════════════════════╗`);
  console.log(`║  🚀 Blitz CRM Server v${VERSION}                  ║`);
  console.log(`║  📡 HTTP + WebSocket on port ${PORT}            ║`);
  console.log(`║  💾 Data: ${DATA_DIR.slice(-30).padEnd(30)}    ║`);
  console.log(`║  📦 Backups: every 15min, 30-day PITR        ║`);
  console.log(`║  📋 Audit: 30-day rolling log                ║`);
  console.log(`║  🔒 Atomic writes + version tracking         ║`);
  console.log(`║  🤖 Telegram: @blitzfinance_bot              ║`);
  console.log(`║  🔄 External sync: every 15 minutes          ║`);
  console.log(`╚══════════════════════════════════════════════╝\n`);

  // Initial external sync on startup
  setTimeout(() => syncExternalData(), 3000);
  // Sync every 15 minutes
  setInterval(() => syncExternalData(), 15 * 60 * 1000);
});
