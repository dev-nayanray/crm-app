// Load environment variables
// require("dotenv").config();

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
const screenshotModule = require("./screenshot.cjs");

const app = express();
app.disable('x-powered-by'); // Don't reveal tech stack

// ═══════════════════════════════════════════════════════════════
// CRASH PROTECTION — Keep server alive no matter what
// ═══════════════════════════════════════════════════════════════
// v9.05: Enhanced crash protection with tracking
let crashCount = 0;
const CRASH_LOG = [];

process.on('uncaughtException', (err) => {
  crashCount++;
  const info = { time: new Date().toISOString(), type: 'exception', msg: err.message, stack: (err.stack || '').split('\n').slice(0, 5).join('\n') };
  CRASH_LOG.push(info);
  if (CRASH_LOG.length > 50) CRASH_LOG.shift();
  console.error(`💥 UNCAUGHT EXCEPTION #${crashCount} (server stays alive):`, err.message);
  console.error(err.stack);
  if (global.gc) { try { global.gc(); } catch {} }
});

process.on('unhandledRejection', (reason) => {
  crashCount++;
  const msg = reason instanceof Error ? reason.message : String(reason);
  const info = { time: new Date().toISOString(), type: 'rejection', msg };
  CRASH_LOG.push(info);
  if (CRASH_LOG.length > 50) CRASH_LOG.shift();
  console.error(`💥 UNHANDLED REJECTION #${crashCount} (server stays alive):`, msg);
});
const PORT = 3001;
const VERSION = "9.10";
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
  { email: "kate@blitz-affiliates.marketing", passwordHash: "b7cb217334dc1f94c975370b003efb532b57b1b99ac81b424199f1da854cf6e8", name: "Katie" },
  { email: "alehandro@blitz-affiliates.marketing", passwordHash: "1635c8525afbae58c37bede3c9440844e9143727cc7c160bed665ec378d8a262", name: "Alehandro" },
  { email: "john.leon@blitz-affiliates.marketing", passwordHash: "77dbc78facad3377d2c8dc621e532a70e82b3931a19dfe5bc972d748ff535a90", name: "John Leon" },
  { email: "joy.blitz@blitz-affiliates.marketing", passwordHash: "7c2d684615c271eddf3621808fafa0ff752e6f3b0f6dc976484ad5086afd520a", name: "Joy" },
  { email: "kristyblitz8@gmail.com", passwordHash: "1230c44d379979499b2ee538b26811e58c7351560418f917b6236fde43cdc097", name: "Oksana" },
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
// Using hardcoded token (no .env required)
const TELEGRAM_TOKEN = "8560973106:AAG6J4FRj8ShS-WKLOzs2TmhdaHlqCKevhA";

// Telegram Group Chat IDs (hardcoded)
const FINANCE_GROUP_CHAT_ID = "-1002830517753";
const BRANDS_GROUP_CHAT_ID = "-1002796530029";        // Finance | Brands group
const OFFER_GROUP_CHAT_ID = "-1002183891044";         // Offers supergroup
const OPEN_PAYMENT_GROUP_CHAT_ID = "-1002830517753";  // Same as Finance
const CRG_GROUP_CHAT_ID = "-1002560408661";           // CRG Deals Telegram Group
const MONITORING_GROUP_CHAT_ID = "-1002832299846";

// Helper function to validate and normalize chat ID for supergroups
function normalizeChatId(chatId) {
  if (!chatId) return null;
  const idStr = String(chatId).trim();
  
  // Check if it's a valid numeric ID
  if (!/^-?\d+$/.test(idStr)) {
    return null;
  }
  
  // For supergroups in Telegram, the format should be -100XXXXXXXXXX
  // If the ID starts with just - (not -100), it's likely a supergroup that needs -100 prefix
  let normalizedId = idStr;
  if (idStr.startsWith('-') && !idStr.startsWith('-100')) {
    // Extract the numeric part and add -100 prefix
    const numericPart = idStr.substring(1); // Remove the leading -
    normalizedId = `-100${numericPart}`;
    console.log(`🔧 Normalized chat ID: ${idStr} -> ${normalizedId}`);
  }
  
  return normalizedId;
}

// Get all possible chat ID formats for comparison
function getChatIdVariants(chatId) {
  const idStr = String(chatId).replace(/-/g, '');
  return [
    chatId,                           // Original
    `-100${idStr}`,                   // With -100 prefix
    `-${idStr.replace(/^100/, '')}`, // Without -100 if present
  ];
}

// Test and log all configured chat IDs on startup
function testChatIds() {
  const groups = [
    { name: 'Finance', id: FINANCE_GROUP_CHAT_ID },
    { name: 'Brands', id: BRANDS_GROUP_CHAT_ID },
    { name: 'Offer', id: OFFER_GROUP_CHAT_ID },
    { name: 'Open Payment', id: OPEN_PAYMENT_GROUP_CHAT_ID },
    { name: 'Monitoring', id: MONITORING_GROUP_CHAT_ID },
  ];
  
  console.log("\n📱 Configured Telegram Groups:");
  groups.forEach(g => {
    const variants = getChatIdVariants(g.id);
    console.log(`   ${g.name}: ${g.id} (variants: ${variants.join(', ')})`);
  });
  console.log("");
}

// Run chat ID diagnostics
testChatIds();

// Crypto verification APIs
const TRONSCAN_API = "https://apilist.tronscan.org";
const ETHERSCAN_API_KEY ="2CAM7DNEFBXX2515FXGZGUF6C8SIKNR7ET";
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

function httpRequest(url, isHttps = true, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const protocol = isHttps ? https : http;
    const req = protocol.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => data += chunk);
      res.on("end", () => resolve(data));
    });
    req.on("error", reject);
    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error(`HTTP request timed out after ${timeoutMs}ms: ${url}`));
    });
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
      const raw = fs.readFileSync(filepath, "utf8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
      console.error(`⚠️ ${filename} is not an array — treating as corrupted`);
    }
  } catch (err) {
    console.error(`❌ Error reading ${filename}:`, err.message);
  }
  // FIX C4: Try to recover from most recent backup before returning empty fallback
  try {
    const backupDirs = fs.readdirSync(BACKUP_DIR).sort().reverse();
    for (const dir of backupDirs) {
      const backupFile = path.join(BACKUP_DIR, dir, filename);
      if (fs.existsSync(backupFile)) {
        const backupRaw = fs.readFileSync(backupFile, "utf8");
        const backupData = JSON.parse(backupRaw);
        if (Array.isArray(backupData) && backupData.length > 0) {
          console.log(`🔧 AUTO-RECOVERED ${filename} from backup ${dir} (${backupData.length} records)`);
          // Restore the file from backup
          fs.writeFileSync(filepath, backupRaw, "utf8");
          return backupData;
        }
      }
    }
  } catch (recoveryErr) {
    console.error(`⚠️ Backup recovery failed for ${filename}:`, recoveryErr.message);
  }
  return fallback;
}

// v9.05: Atomic write with Write-Ahead Logging (WAL) — validates BEFORE overwriting
function writeJSONAtomic(filename, data) {
  const filepath = path.join(DATA_DIR, filename);
  const tempPath = filepath + `.tmp.${Date.now()}.${crypto.randomBytes(4).toString('hex')}`;
  const walPath = filepath + `.wal.${Date.now()}`;

  try {
    // WAL Step 1: Serialize and validate data BEFORE touching disk
    const jsonStr = JSON.stringify(data, null, 2);
    const parsed = JSON.parse(jsonStr); // Verify round-trip
    if (!Array.isArray(parsed)) throw new Error("Data is not an array after round-trip");
    if (jsonStr.length < 3) throw new Error("Suspiciously small payload");

    // WAL Step 2: Write intent log (what we WANT to write)
    fs.writeFileSync(walPath, jsonStr, "utf8");

    // WAL Step 3: Write to temp file
    fs.writeFileSync(tempPath, jsonStr, "utf8");

    // WAL Step 4: Verify temp file matches intent
    const verify = fs.readFileSync(tempPath, "utf8");
    if (verify !== jsonStr) throw new Error("Temp file content mismatch — disk corruption?");

    // WAL Step 5: Atomic rename (on same filesystem this is atomic)
    fs.renameSync(tempPath, filepath);

    // WAL Step 6: Clean up WAL file (write succeeded)
    try { fs.unlinkSync(walPath); } catch {}

    // Increment version
    const key = filename.replace('.json', '');
    dataVersions[key] = (dataVersions[key] || 0) + 1;

    return true;
  } catch (err) {
    console.error(`❌ Atomic write failed for ${filename}:`, err.message);
    // Clean up temp and WAL files
    try { if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath); } catch {}
    try { if (fs.existsSync(walPath)) fs.unlinkSync(walPath); } catch {}
    return false;
  }
}

// v9.05: Concurrency Queue — serializes writes per table
// If Telegram bot + user save at same ms, they're processed sequentially
const writeQueues = {}; // { tableName: Promise }

async function lockedWrite(filename, data, meta) {
  const key = filename.replace('.json', '');

  // Chain writes: each write waits for the previous one on same table
  const prev = writeQueues[key] || Promise.resolve();
  const current = prev.then(async () => {
    // Double-check lock (belt + suspenders)
    const maxWait = 10000;
    const start = Date.now();
    while (dataLocks.has(key)) {
      if (Date.now() - start > maxWait) {
        console.error(`💥 LOCK TIMEOUT on ${key} — forcing unlock (was held ${maxWait}ms)`);
        dataLocks.delete(key);
        break;
      }
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
  }).catch(err => {
    console.error(`❌ Queue write error for ${key}:`, err.message);
    dataLocks.delete(key);
    return false;
  });

  writeQueues[key] = current;
  return current;
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

  const endpoints = ["payments", "customer-payments", "users", "crg-deals", "daily-cap", "deals", "wallets", "offers"];
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

// Backup every 1 hour
setInterval(createBackup, 60 * 60 * 1000);
// Backup on startup — CRITICAL: creates a snapshot before any new client code can write
setTimeout(() => createBackup("startup-" + new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)), 2000);

// ═══════════════════════════════════════════════════════════════
// v9.05: DAILY SNAPSHOT SYSTEM — "The Safety Net"
// Keeps exactly 7 days of guaranteed-clean daily snapshots
// Runs at 02:00 AM server time to avoid user activity
// ═══════════════════════════════════════════════════════════════
const SNAPSHOT_DIR = path.join(__dirname, "snapshots");
if (!fs.existsSync(SNAPSHOT_DIR)) fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });

function createDailySnapshot() {
  const dateKey = new Date().toISOString().split('T')[0]; // 2026-03-01
  const snapPath = path.join(SNAPSHOT_DIR, dateKey);
  if (fs.existsSync(snapPath)) { console.log(`📸 Daily snapshot ${dateKey} already exists — skipping`); return; }
  fs.mkdirSync(snapPath, { recursive: true });

  const endpoints = ["payments", "customer-payments", "users", "crg-deals", "daily-cap", "deals", "wallets", "offers", "partners"];
  let count = 0;
  endpoints.forEach(ep => {
    const src = path.join(DATA_DIR, ep + ".json");
    if (fs.existsSync(src)) { fs.copyFileSync(src, path.join(snapPath, ep + ".json")); count++; }
  });
  console.log(`📸 Daily snapshot created: ${dateKey} (${count} files)`);

  // Cleanup: keep only last 7 days
  try {
    const dirs = fs.readdirSync(SNAPSHOT_DIR).sort();
    while (dirs.length > 7) {
      const old = dirs.shift();
      fs.rmSync(path.join(SNAPSHOT_DIR, old), { recursive: true, force: true });
      console.log(`🗑️ Old snapshot removed: ${old}`);
    }
  } catch (err) { console.error("⚠️ Snapshot cleanup error:", err.message); }
}

// v9.05: Nightly auto-dedup at 03:00 AM — keeps database clean
async function nightlyDedup() {
  console.log("🧹 Nightly auto-dedup starting...");
  let totalRemoved = 0;

  // Dedup daily-cap
  try {
    const dc = readJSON("daily-cap.json", []);
    const seen = new Map();
    dc.forEach(r => {
      const key = `${(r.date || '').trim()}|${(r.affiliate || '').trim().toLowerCase()}|${(r.brokerCap || '').trim().toLowerCase()}`;
      const existing = seen.get(key);
      if (!existing || Object.keys(r).length > Object.keys(existing).length) seen.set(key, r);
    });
    const deduped = Array.from(seen.values());
    if (deduped.length < dc.length) {
      const removed = dc.length - deduped.length;
      await lockedWrite("daily-cap.json", deduped, { action: "auto-dedup", user: "system", details: `Nightly cleanup: removed ${removed} duplicates` });
      totalRemoved += removed;
    }
  } catch (err) { console.error("⚠️ Dedup daily-cap error:", err.message); }

  // Dedup crg-deals
  try {
    const crg = readJSON("crg-deals.json", []);
    const seen = new Map();
    crg.forEach(r => {
      const key = `${(r.date || '').trim()}|${(r.affiliate || '').trim().toLowerCase()}|${(r.brokerCap || '').trim().toLowerCase()}`;
      const existing = seen.get(key);
      if (!existing || Object.keys(r).length > Object.keys(existing).length) seen.set(key, r);
    });
    const deduped = Array.from(seen.values());
    if (deduped.length < crg.length) {
      const removed = crg.length - deduped.length;
      await lockedWrite("crg-deals.json", deduped, { action: "auto-dedup", user: "system", details: `Nightly cleanup: removed ${removed} duplicates` });
      totalRemoved += removed;
    }
  } catch (err) { console.error("⚠️ Dedup crg-deals error:", err.message); }

  if (totalRemoved > 0) console.log(`🧹 Nightly dedup complete: removed ${totalRemoved} duplicates`);
  else console.log("🧹 Nightly dedup: database is clean");
}

// Schedule daily snapshot at 02:00 and dedup at 03:00
function scheduleNightlyTasks() {
  const now = new Date();
  const next2am = new Date(now);
  next2am.setHours(2, 0, 0, 0);
  if (next2am <= now) next2am.setDate(next2am.getDate() + 1);
  const delay2 = next2am - now;

  setTimeout(() => {
    createDailySnapshot();
    setInterval(createDailySnapshot, 24 * 60 * 60 * 1000);
  }, delay2);

  const next3am = new Date(now);
  next3am.setHours(3, 0, 0, 0);
  if (next3am <= now) next3am.setDate(next3am.getDate() + 1);
  const delay3 = next3am - now;

  setTimeout(() => {
    nightlyDedup();
    setInterval(nightlyDedup, 24 * 60 * 60 * 1000);
  }, delay3);

  console.log(`⏰ Nightly tasks scheduled: snapshot at 02:00 (in ${Math.round(delay2/60000)}min), dedup at 03:00`);
}

// Also create snapshot on startup if none exists for today
setTimeout(createDailySnapshot, 5000);
scheduleNightlyTasks();

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

// v9.05: Input Sanitization Middleware — strips XSS/injection from all POST bodies
function sanitizeValue(val) {
  if (typeof val === 'string') {
    return val
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Strip script tags
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '') // Strip event handlers
      .replace(/javascript\s*:/gi, '') // Strip javascript: URIs
      .replace(/data\s*:\s*text\/html/gi, '') // Strip data:text/html
      .trim();
  }
  if (Array.isArray(val)) return val.map(sanitizeValue);
  if (val && typeof val === 'object') {
    const clean = {};
    for (const [k, v] of Object.entries(val)) {
      // Block prototype pollution
      if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
      clean[k] = sanitizeValue(v);
    }
    return clean;
  }
  return val;
}

app.use((req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeValue(req.body);
  }
  next();
});

// Catch JSON parse errors (malformed body) — return proper JSON, not HTML
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed' || err instanceof SyntaxError) {
    return res.status(400).json({ error: "Invalid JSON in request body" });
  }
  next(err);
});

// ── FIX C4/C5: Session token authentication ──
// On login success, server issues a random session token.
// All data/admin endpoints require valid token in Authorization header.
// activeSessions loaded above from SESSION_FILE
const SESSION_DURATION = 14 * 24 * 60 * 60 * 1000; // v9.05: 14 days (was 7)
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
  } catch (err) {
    console.error("❌ Failed to persist sessions:", err.message);
  }
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
const ADMIN_EMAILS = ["office1092021@gmail.com", "y0505300530@gmail.com", "wpnayanray@gmail.com"];
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
const RATE_LIMIT_MAX = 300; // v9.05: was 200

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
const LOGIN_MAX_ATTEMPTS = 5; // v9.05: was 3
const LOGIN_BLOCK_DURATION = 10 * 60 * 1000; // v9.05: 10 min (was 15)
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
    // ── Record lastLogin timestamp in users.json ──
    try {
      const allUsers = readJSON("users.json", []);
      const idx = allUsers.findIndex(u => u.email === emailClean);
      if (idx !== -1) { allUsers[idx].lastLogin = new Date().toISOString(); }
      else { allUsers.push({ email: emailClean, lastLogin: new Date().toISOString() }); }
      fs.writeFileSync(path.join(DATA_DIR, "users.json"), JSON.stringify(allUsers, null, 2), "utf8");
    } catch (e) { console.error("⚠️ Failed to update lastLogin:", e.message); }
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

    if (remaining <= 0) res.status(429).json({ error: "blocked", minutes: 15 });
    else res.status(401).json({ error: "invalid", remaining });
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

const endpoints = ["payments", "customer-payments", "users", "crg-deals", "daily-cap", "deals", "wallets", "offers"];

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
  const { data: newPayments, version: clientVersion, user: userEmail, deleted: deletedIDs } = req.body;
  // Support legacy format (raw array)
  const payments = Array.isArray(req.body) ? req.body : newPayments;
  if (!Array.isArray(payments)) return res.status(400).json({ error: "Invalid data format" });
  if (payments.length > 10000) return res.status(400).json({ error: "Too many records" });

  // Empty array protection
  if (payments.length === 0) {
    const existing = readJSON("payments.json", []);
    const deleteSet = new Set(Array.isArray(deletedIDs) ? deletedIDs : []);
    if (existing.length > 0 && deleteSet.size === 0) {
      console.log(`⚠️ BLOCKED empty save to payments — ${existing.length} records protected (no delete IDs)`);
      return res.status(400).json({ error: "Cannot overwrite existing data with empty array" });
    }
    if (deleteSet.size > 0) {
      console.log(`🗑️ [payments]: Intentional bulk delete of ${deleteSet.size} records, allowing empty save`);
      createBackup(`pre-bulk-delete-payments-${Date.now()}`);
    }
  }

  // Detect status changes for Telegram notifications
  const oldPayments = readJSON("payments.json", []);
  const oldMap = new Map(oldPayments.map(p => [p.id, p]));
  payments.forEach(p => {
    const oldP = oldMap.get(p.id);
    if (!oldP) {
      // New payment - notify based on status
      if (p.status === "Paid") {
        // Send to Affiliate group ONLY -1002830517753
        // Removed: send to Brands group for Paid status
        sendAffiliatePaymentNotification(p, true);
      } else if (["Open", "On the way", "Approved to pay"].includes(p.status)) {
        // Send to Customer Payment group (Brands) only - removed Affiliate group notification
        sendBrandPaymentNotification(p, false);
        // Send Approved to pay notification with tag to Open Payment group
        if (p.status === "Approved to pay") {
          sendApprovedToPayNotification(p);
        }
      }
    } else if (oldP.status !== p.status) {
      if (p.status === "Paid" && oldP.status !== "Paid") {
        // Send to Affiliate group ONLY -1002830517753
        // Removed: send to Brands group for Paid status
        sendAffiliatePaymentNotification(p, true);
      }
      // Re-opening a previously paid payment notification
      else if (["Open", "On the way", "Approved to pay"].includes(p.status) && oldP.status === "Paid") {
        sendOpenPaymentNotification(p);
        // Also notify brands group
        sendBrandPaymentNotification(p, false);
        // Send Approved to pay notification with tag if status is Approved to pay
        if (p.status === "Approved to pay") {
          sendApprovedToPayNotification(p);
        }
      }
      // Handle status change to Approved to pay from any other status
      else if (p.status === "Approved to pay" && oldP.status !== "Approved to pay") {
        sendApprovedToPayNotification(p);
      }
    }
  });

  // ═══════════════════════════════════════════════════════════
  // SERVER-SIDE MERGE — NEVER blindly replace the file
  // ═══════════════════════════════════════════════════════════
  const serverData = readJSON("payments.json", []);
  const mergedMap = new Map();
  serverData.forEach(r => { if (r && r.id) mergedMap.set(r.id, r); });
  
  let clientNew = 0, clientUpdated = 0;
  const clientIDs = new Set();
  payments.forEach(r => {
    if (!r || !r.id) return;
    clientIDs.add(r.id);
    const srv = mergedMap.get(r.id);
    if (!srv) { mergedMap.set(r.id, r); clientNew++; }
    else { mergedMap.set(r.id, r); clientUpdated++; }
  });
  
  const serverOnly = serverData.filter(r => r && r.id && !clientIDs.has(r.id));
  
  // Remove explicitly deleted records
  const deleteSet = new Set(Array.isArray(deletedIDs) ? deletedIDs : []);
  if (deleteSet.size > 0) {
    deleteSet.forEach(id => mergedMap.delete(id));
    console.log(`🗑️ [payments]: ${deleteSet.size} record(s) explicitly deleted`);
  }
  
  const merged = Array.from(mergedMap.values());
  
  if (clientNew > 0 || serverOnly.length > 0) {
    console.log(`🔀 MERGE [payments]: client_sent=${payments.length} server_had=${serverData.length} → merged=${merged.length} (new=${clientNew}, preserved=${serverOnly.length})`);
  }

  // Atomic write
  const success = await lockedWrite("payments.json", merged, {
    action: "update", user: userEmail || "unknown", details: `[payments] ${merged.length} records (merge: +${clientNew} new, ${serverOnly.length} preserved)`
  });

  if (success) {
    broadcastUpdate("payments", merged);
    res.json({ ok: true, count: merged.length, version: getVersion("payments"), merged: true });
  } else {
    res.status(500).json({ error: "Write failed — data not saved" });
  }
});

// Generic POST for other tables — SERVER-SIDE MERGE (never destructive replace)
["customer-payments", "crg-deals", "daily-cap", "deals", "wallets", "offers"].forEach(ep => {
  const file = ep + ".json";
  app.post(`/api/${ep}`, requireAuth, async (req, res) => {
    const { data: newData, version: clientVersion, user: userEmail, deleted: deletedIDs } = req.body;
    const records = Array.isArray(req.body) ? req.body : newData;
    if (!Array.isArray(records)) return res.status(400).json({ error: "Invalid data format" });
    if (records.length > 10000) return res.status(400).json({ error: "Too many records" });

    if (records.length === 0) {
      const existing = readJSON(file, []);
      const deleteSet = new Set(Array.isArray(deletedIDs) ? deletedIDs : []);
      if (existing.length > 0 && deleteSet.size === 0) {
        console.log(`⚠️ BLOCKED empty save to ${ep} — ${existing.length} records protected (no delete IDs)`);
        return res.status(400).json({ error: "Cannot overwrite existing data with empty array" });
      }
      // If deletedIDs present, this is an intentional bulk delete — allow it
      if (deleteSet.size > 0) {
        console.log(`🗑️ [${ep}]: Intentional bulk delete of ${deleteSet.size} records, allowing empty save`);
        createBackup(`pre-bulk-delete-${ep}-${Date.now()}`);
      }
    }

    // ═══ DATA SHRINKAGE PROTECTION ═══
    // If client sends significantly fewer records than server has, it likely has stale/demo data.
    // Create a safety backup BEFORE merging so we can always recover.
    const existingBeforeMerge = readJSON(file, []);
    if (existingBeforeMerge.length > 10 && records.length < existingBeforeMerge.length * 0.3) {
      console.log(`🛡️ SHRINKAGE WARNING [${ep}]: client sending ${records.length} records, server has ${existingBeforeMerge.length}. Creating safety backup.`);
      createBackup(`safety-${ep}-${Date.now()}`);
    }
    // v9.09: Hard block if client sends less than 20% of server data (almost certainly a bug)
    if (existingBeforeMerge.length > 5 && records.length === 0 && deleteSet.size === 0) {
      console.log(`🛑 HARD BLOCK [${ep}]: client sending 0 records, server has ${existingBeforeMerge.length}. Rejected.`);
      return res.status(400).json({ error: "Cannot replace existing data with empty payload", serverCount: existingBeforeMerge.length });
    }

    // SPECIAL HANDLING: customer-payments status change notifications
    if (ep === "customer-payments") {
      const oldRecords = readJSON("customer-payments.json", []);
      const oldMap = new Map(oldRecords.map(p => [p.id, p]));
      records.forEach(cp => {
        const oldCp = oldMap.get(cp.id);
        if (!oldCp) {
          if (cp.status === "Received") sendBrandPaymentNotification(cp, true);
        } else if (oldCp.status !== cp.status) {
          if (cp.status === "Received" && oldCp.status !== "Received") sendBrandPaymentNotification(cp, true);
        }
      });
    }

    // ═══════════════════════════════════════════════════════════
    // SERVER-SIDE MERGE — NEVER blindly replace the file
    // ═══════════════════════════════════════════════════════════
    // Read current server data
    const serverData = readJSON(file, []);
    
    // Build merged result: start with all server records, layer client on top
    const mergedMap = new Map();
    serverData.forEach(r => { if (r && r.id) mergedMap.set(r.id, r); });
    
    let clientNew = 0, clientUpdated = 0, clientDeleted = 0;
    const clientIDs = new Set();
    records.forEach(r => {
      if (!r || !r.id) return;
      clientIDs.add(r.id);
      const srv = mergedMap.get(r.id);
      if (!srv) {
        // New record from client — KEEP
        mergedMap.set(r.id, r);
        clientNew++;
      } else {
        // Both have it — client version wins (last-write-wins)
        mergedMap.set(r.id, r);
        clientUpdated++;
      }
    });
    
    // Records on server but NOT in client payload:
    // These could be records added by OTHER users that this client hasn't seen yet.
    // KEEP THEM — never delete other users' work.
    const serverOnly = serverData.filter(r => r && r.id && !clientIDs.has(r.id));
    // Note: serverOnly records are already in mergedMap from the initial forEach above.
    
    // Remove explicitly deleted records
    const deleteSet = new Set(Array.isArray(deletedIDs) ? deletedIDs : []);
    if (deleteSet.size > 0) {
      deleteSet.forEach(id => mergedMap.delete(id));
      console.log(`🗑️ [${ep}]: ${deleteSet.size} record(s) explicitly deleted`);
    }
    
    const merged = Array.from(mergedMap.values());
    
    // DEDUPLICATION: For daily-cap and crg-deals, remove duplicate entries per agent/affiliate per date
    let deduped = merged;
    if (ep === "daily-cap") {
      const seen = new Map();
      deduped = [];
      for (const r of merged) {
        const key = `${r.date}__${(r.agent || "").trim().toLowerCase()}`;
        if (seen.has(key)) {
          // Merge: keep the one with more data (higher cap values)
          const existing = seen.get(key);
          const existTotal = (parseInt(existing.affiliates) || 0) + (parseInt(existing.brands) || 0);
          const newTotal = (parseInt(r.affiliates) || 0) + (parseInt(r.brands) || 0);
          if (newTotal > existTotal) { seen.set(key, r); }
        } else {
          seen.set(key, r);
        }
      }
      deduped = Array.from(seen.values());
      if (deduped.length < merged.length) console.log(`🧹 DEDUP [daily-cap]: ${merged.length} → ${deduped.length} (removed ${merged.length - deduped.length} duplicates)`);
    }
    if (ep === "crg-deals") {
      const seen = new Map();
      deduped = [];
      for (const r of merged) {
        const key = `${r.date}__${(r.affiliate || "").trim().toLowerCase()}`;
        if (seen.has(key)) {
          // Keep the one with more data (has capReceived, started, etc.)
          const existing = seen.get(key);
          const existScore = (existing.started ? 1 : 0) + (parseInt(existing.capReceived) || 0) + (parseInt(existing.ftd) || 0);
          const newScore = (r.started ? 1 : 0) + (parseInt(r.capReceived) || 0) + (parseInt(r.ftd) || 0);
          if (newScore > existScore) { seen.set(key, r); }
        } else {
          seen.set(key, r);
        }
      }
      deduped = Array.from(seen.values());
      if (deduped.length < merged.length) console.log(`🧹 DEDUP [crg-deals]: ${merged.length} → ${deduped.length} (removed ${merged.length - deduped.length} duplicates)`);
    }
    
    // CRG DEALS NOTIFICATIONS: Detect new deals and send Telegram notification
    if (ep === "crg-deals" && clientNew > 0) {
      // Find new deals (those that were added in this request)
      const oldRecords = readJSON("crg-deals.json", []);
      const oldMap = new Map(oldRecords.map(r => [r.id, r]));
      
      records.forEach(newDeal => {
        // Check if this is a new deal (not in old records)
        if (!oldMap.has(newDeal.id) && newDeal.affiliate && newDeal.cap) {
          // Send notification to CRG group
          sendNewCRGDealNotification(newDeal);
          console.log(`📱 New CRG deal notification queued for affiliate: ${newDeal.affiliate}`);
        }
      });
    }
    
    if (clientNew > 0 || serverOnly.length > 0) {
      console.log(`🔀 MERGE [${ep}]: client_sent=${records.length} server_had=${serverData.length} → merged=${deduped.length} (new=${clientNew}, updated=${clientUpdated}, server_preserved=${serverOnly.length})`);
    }

    // v8: Skip write entirely if merged result is identical to what's on disk
    if (clientNew === 0 && deleteSet.size === 0 && deduped.length === serverData.length && clientUpdated === 0) {
      return res.json({ ok: true, count: deduped.length, version: getVersion(ep), unchanged: true });
    }

    const success = await lockedWrite(file, deduped, {
      action: "update", user: userEmail || "unknown", details: `[${ep}] ${deduped.length} records (merge: +${clientNew} new, ${serverOnly.length} preserved)`
    });

    if (success) {
      broadcastUpdate(ep, deduped);
      res.json({ ok: true, count: deduped.length, version: getVersion(ep), merged: true });
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

  // SERVER-SIDE MERGE for users — preserve users from other clients
  const mergedMap = new Map();
  existing.forEach(u => { if (u && u.email) mergedMap.set(u.email, u); });
  users.forEach(u => { if (u && u.email) {
    const ex = mergedMap.get(u.email);
    // Preserve lastLogin from server — client doesn't track this
    if (ex && ex.lastLogin && !u.lastLogin) u.lastLogin = ex.lastLogin;
    mergedMap.set(u.email, u);
  } });
  const mergedUsers = Array.from(mergedMap.values());

  // Skip write if data hasn't actually changed (prevents save loops)
  const existingStr = JSON.stringify(existing.map(u => ({ ...u })).sort((a,b) => (a.email||'').localeCompare(b.email||'')));
  const mergedStr = JSON.stringify(mergedUsers.map(u => ({ ...u })).sort((a,b) => (a.email||'').localeCompare(b.email||'')));
  if (existingStr === mergedStr) {
    return res.json({ ok: true, count: mergedUsers.length, version: getVersion("users"), unchanged: true });
  }

  const success = await lockedWrite("users.json", mergedUsers, {
    action: "update", user: userEmail || "system", details: `[users] ${mergedUsers.length} users saved (merged)`
  });

  if (success) {
    broadcastUpdate("users", mergedUsers);
    console.log(`👥 Users updated: ${mergedUsers.length} users saved`);
    res.json({ ok: true, count: mergedUsers.length, version: getVersion("users") });
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
  console.log("🔌 WebSocket server listening on /ws");

  // v9.09: Log upgrade requests for debugging connection issues
  server.on('upgrade', (req, socket, head) => {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
    console.log(`🔌 WebSocket upgrade request from ${ip} — path: ${req.url}`);
  });

  wss.on('connection', (ws, req) => {
    // FIX H1: Require auth token for WebSocket connections
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get("token");
    if (!token || !activeSessions.has(token)) {
      console.log(`🔌 WebSocket rejected — invalid token`);
      ws.close(4001, "Authentication required");
      return;
    }
    wsClients.add(ws);
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
    console.log(`🔌 WebSocket connected: ${ip} (${wsClients.size} total)`);

    // Send current versions on connect
    const versions = {};
    endpoints.forEach(ep => { versions[ep] = getVersion(ep); });
    try { ws.send(JSON.stringify({ type: "versions", versions, timestamp: Date.now() })); } catch {}

    // Handle messages from client
    ws.on('message', (msg) => {
      try {
        const data = JSON.parse(msg);
        if (data.type === "ping") {
          try { ws.send(JSON.stringify({ type: "pong", timestamp: Date.now() })); } catch {}
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
      try {
        ws.send(JSON.stringify({ type: "heartbeat", timestamp: Date.now(), clients: wsClients.size, v: VERSION }));
      } catch (err) {
        console.error("⚠️ Heartbeat send failed:", err.message);
        wsClients.delete(ws);
      }
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
    try {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
        sent++;
      } else {
        wsClients.delete(ws);
      }
    } catch (err) {
      console.error("⚠️ WS broadcast send error:", err.message);
      wsClients.delete(ws);
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
// ═══════════════════════════════════════════════════════════════
// 13. TELEGRAM BOT (preserved from v2.03)
// ═══════════════════════════════════════════════════════════════

function sendTelegramNotification(message, chatId = FINANCE_GROUP_CHAT_ID) {
  if (TELEGRAM_TOKEN === "YOUR_BOT_TOKEN_HERE" || !TELEGRAM_TOKEN) {
    console.log("📱 Telegram notification skipped (no token configured)");
    return;
  }

  const postData = JSON.stringify({
    chat_id: chatId,
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
  const amount = Number(p.amount || 0).toLocaleString("en-US");
  return `🆕 NEW PAYMENT ADDED 💰

📋 Invoice: #${p.invoice}
💵 Amount: $${amount}
👤 Opened by: ${p.openBy || "Unknown"}
Status: ${p.status || "Open"}`;
}

function formatApprovedToPayMessage(p) {
  const amount = Number(p.amount || 0).toLocaleString("en-US");
  return `🔄 Payment #${p.invoice} status → Approved to pay by ${p.openBy || "Y Admin"}

@Rose14329`;
}

function sendApprovedToPayNotification(p) {
  if (TELEGRAM_TOKEN === "YOUR_BOT_TOKEN_HERE" || !TELEGRAM_TOKEN) {
    console.log("📱 Approved to pay notification skipped (no token configured)");
    return;
  }

  const message = formatApprovedToPayMessage(p);
  
  const postData = JSON.stringify({
    chat_id: OPEN_PAYMENT_GROUP_CHAT_ID,
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
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
      if (res.statusCode !== 200) console.log("❌ Approved to pay notification error:", d);
      else console.log("✅ Approved to pay notification sent for invoice:", p.invoice);
    });
  });

  req.on('error', err => console.error("❌ Approved to pay notification error:", err.message));
  req.write(postData);
  req.end();
}

function sendOpenPaymentNotification(p) {
  if (TELEGRAM_TOKEN === "YOUR_BOT_TOKEN_HERE" || !TELEGRAM_TOKEN) {
    console.log("📱 Open payment notification skipped (no token configured)");
    return;
  }

  const message = formatOpenPaymentMessage(p);
  
  const postData = JSON.stringify({
    chat_id: OPEN_PAYMENT_GROUP_CHAT_ID,
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
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
      if (res.statusCode !== 200) console.log("❌ Open payment notification error:", d);
      else console.log("✅ Open payment notification sent for invoice:", p.invoice);
    });
  });

  req.on('error', err => console.error("❌ Open payment notification error:", err.message));
  req.write(postData);
  req.end();
}


function formatPaidPaymentMessage(p) {
  const amount = Number(p.amount || 0).toLocaleString("en-US");

  return `💰 PAYMENT ${p.invoice} marked as PAID 💰

📋 Invoice: #${p.invoice}
💵 Amount: $${amount}
👤 Paid by: ${p.openBy || "Unknown"}
Payment Hash: ${p.paymentHash || "N/A"}`;
}

// ═══════════════════════════════════════════════════════════════
// FINANCE | BRANDS GROUP NOTIFICATIONS (-1002796530029)
// ═══════════════════════════════════════════════════════════════

function formatBrandNewPaymentMessage(p) {
  const amount = Number(p.amount || 0).toLocaleString("en-US");
  return `💰 NEW CUSTOMER PAYMENT 💰

📋 Invoice: #${p.invoice}
💵 Amount: $${amount}
🏷️ Brand: ${p.brand || "N/A"}
👤 Opened by: ${p.openBy || "Unknown"}
📅 Date: ${p.openDate || "N/A"}
🔖 Status: ${p.status || "Open"}`;
}

function formatBrandPaymentReceivedMessage(p) {
  const amount = Number(p.amount || 0).toLocaleString("en-US");
  return `✅ PAYMENT RECEIVED ✅

📋 Invoice: #${p.invoice}
💵 Amount: $${amount}
🏷️ Brand: ${p.brand || "N/A"}
👤 Paid by: ${p.openBy || "Unknown"}
🔗 Payment Hash: ${p.paymentHash || "N/A"}`;
}

function sendBrandPaymentNotification(p, isReceived = false) {
  if (TELEGRAM_TOKEN === "YOUR_BOT_TOKEN_HERE" || !TELEGRAM_TOKEN) {
    console.log("📱 Brand payment notification skipped (no token configured)");
    return;
  }

  const message = isReceived ? formatBrandPaymentReceivedMessage(p) : formatBrandNewPaymentMessage(p);
  
  const postData = JSON.stringify({
    chat_id: BRANDS_GROUP_CHAT_ID,
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
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
      if (res.statusCode !== 200) console.log("❌ Brand payment notification error:", d);
      else console.log(`✅ Brand payment notification sent for invoice: ${p.invoice} (${isReceived ? 'received' : 'new'})`);
    });
  });

  req.on('error', err => console.error("❌ Brand payment notification error:", err.message));
  req.write(postData);
  req.end();
}

// ═══════════════════════════════════════════════════════════════
// FINANCE | AFFILIATE GROUP NOTIFICATIONS (-1002830517753)
// ═══════════════════════════════════════════════════════════════

function formatAffiliateNewPaymentMessage(p) {
  const amount = Number(p.amount || 0).toLocaleString("en-US");
  return `🆕 NEW PAYMENT ADDED 💰

📋 Invoice: #${p.invoice}
💵 Amount: $${amount}
👤 Opened by: ${p.openBy || "Unknown"}
Status: ${p.status || "Open"}`;
}

function formatAffiliatePaidPaymentMessage(p) {
  const amount = Number(p.amount || 0).toLocaleString("en-US");
  return `💰 PAYMENT ${p.invoice} marked as PAID 💰

📋 Invoice: #${p.invoice}
💵 Amount: $${amount}
👤 Paid by: ${p.openBy || "Unknown"}
Payment Hash: ${p.paymentHash || "N/A"}`;
}

function sendAffiliatePaymentNotification(p, isPaid = false) {
  if (TELEGRAM_TOKEN === "YOUR_BOT_TOKEN_HERE" || !TELEGRAM_TOKEN) {
    console.log("📱 Affiliate payment notification skipped (no token configured)");
    return;
  }

  const message = isPaid ? formatAffiliatePaidPaymentMessage(p) : formatAffiliateNewPaymentMessage(p);
  
  const postData = JSON.stringify({
    chat_id: OPEN_PAYMENT_GROUP_CHAT_ID,
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
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
      if (res.statusCode !== 200) console.log("❌ Affiliate payment notification error:", d);
      else console.log(`✅ Affiliate payment notification sent for invoice: ${p.invoice} (${isPaid ? 'paid' : 'new'})`);
    });
  });

  req.on('error', err => console.error("❌ Affiliate payment notification error:", err.message));
  req.write(postData);
  req.end();
}

// ═══════════════════════════════════════════════════════════════
// OFFERS BLITZ GROUP NOTIFICATIONS (-1002183891044)
// ═══════════════════════════════════════════════════════════════

function formatNewOfferMessage(affiliateId, country, brand) {
  let msg = `📋 Added a new offer:
Affiliate ${affiliateId}
Country ${country}`;
  if (brand) {
    msg += `\nBrand: ${brand}`;
  }
  return msg;
}

function sendNewOfferNotification(affiliateId, country, brand) {
  if (TELEGRAM_TOKEN === "YOUR_BOT_TOKEN_HERE" || !TELEGRAM_TOKEN) {
    console.log("📱 New offer notification skipped (no token configured)");
    return;
  }

  const message = formatNewOfferMessage(affiliateId, country, brand);
  
  const postData = JSON.stringify({
    chat_id: OFFER_GROUP_CHAT_ID,
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
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
      if (res.statusCode !== 200) {
        console.log("❌ New offer notification error:", d);
      } else {
        console.log(`✅ New offer notification sent for affiliate: ${affiliateId}`);
      }
    });
  });

  req.on('error', err => console.error("❌ New offer notification error:", err.message));
  req.write(postData);
  req.end();
}

// ═══════════════════════════════════════════════════════════════
// CRG DEALS NOTIFICATIONS (-1002560408661)
// ═══════════════════════════════════════════════════════════════

function formatNewCRGDealMessage(deal) {
  const affiliate = deal.affiliate || "Unknown";
  const cap = deal.cap || "N/A";
  const brokerCap = deal.brokerCap || "N/A";
  const date = deal.date || new Date().toISOString().split("T")[0];
  const manageAff = deal.manageAff || "";
  
  let msg = `📋 <b>NEW CRG DEAL</b>\n\n`;
  msg += `🏷️ Affiliate: <b>${affiliate}</b>\n`;
  msg += `💰 Cap: <b>${cap}</b>\n`;
  msg += `🏦 Broker: ${brokerCap}\n`;
  msg += `📅 Date: ${date}\n`;
  if (manageAff) msg += `👤 Manager: ${manageAff}\n`;
  
  return msg;
}

function sendNewCRGDealNotification(deal) {
  if (TELEGRAM_TOKEN === "YOUR_BOT_TOKEN_HERE" || !TELEGRAM_TOKEN) {
    console.log("📱 New CRG deal notification skipped (no token configured)");
    return;
  }

  const message = formatNewCRGDealMessage(deal);
  
  const postData = JSON.stringify({
    chat_id: CRG_GROUP_CHAT_ID,
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
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
      if (res.statusCode !== 200) {
        console.log("❌ New CRG deal notification error:", d);
      } else {
        console.log(`✅ New CRG deal notification sent for affiliate: ${deal.affiliate}`);
      }
    });
  });

  req.on('error', err => console.error("❌ New CRG deal notification error:", err.message));
  req.write(postData);
  req.end();
}

// ── Telegram Bot Commands & Hash Detection ──
let bot;
const userStates = {};

// Track processed message IDs to prevent duplicates (30 second window)
const processedMessageIds = new Map();
const MESSAGE_ID_CLEANUP_INTERVAL = 30000; // 30 seconds

// Cleanup old message IDs periodically
setInterval(() => {
  const now = Date.now();
  for (const [msgId, timestamp] of processedMessageIds) {
    if (now - timestamp > MESSAGE_ID_CLEANUP_INTERVAL) {
      processedMessageIds.delete(msgId);
    }
  }
}, MESSAGE_ID_CLEANUP_INTERVAL);

// Helper to check and mark message as processed
function isMessageProcessed(msgId) {
  if (!msgId) return false;
  return processedMessageIds.has(msgId.toString());
}

function markMessageProcessed(msgId) {
  if (!msgId) return;
  processedMessageIds.set(msgId.toString(), Date.now());
}

if (TELEGRAM_TOKEN && TELEGRAM_TOKEN !== "YOUR_BOT_TOKEN_HERE") {
  try {
    bot = new TelegramBot(TELEGRAM_TOKEN, { 
      polling: { 
        interval: 2000,        // 2s between polls (default 300ms causes connection churn)
        autoStart: true,
        params: { timeout: 30 } // Telegram long-poll: hold connection 30s
      }, 
      filepath: false,
      request: { timeout: 30000 } // HTTP timeout: 30s
    });
    console.log("🤖 Telegram bot initialized (polling: 2s interval, 30s timeout)");
    
    // Test bot access to offer group on startup - silent check only (no message sent)
    setTimeout(() => {
      bot.getMe()
        .then(() => console.log("✅ Bot has access to Telegram API"))
        .catch(err => {
          console.log("❌ Bot cannot access Telegram:", err.message);
        });
    }, 5000); // Wait 5 seconds after startup
    
    let pollingErrorCount = 0;
    let lastPollingRestart = 0;
    const POLLING_RESTART_COOLDOWN = 30000; // 30 seconds between restarts
    
    bot.on('polling_error', (error) => { 
      pollingErrorCount++;
      const now = Date.now();
      console.log(`⚠️ Telegram polling error #${pollingErrorCount}: ${error.code || error.message}`);
      
      // ETELEGRAM means bot was removed and re-added to group - need to restart polling
      if (error.code === 'ETELEGRAM' || error.message.includes('Forbidden')) {
        // Check cooldown to prevent constant restarts
        if (now - lastPollingRestart < POLLING_RESTART_COOLDOWN) {
          return;
        }
        
        lastPollingRestart = now;
        
        // Stop polling and restart to get fresh updates
        bot.stopPolling().then(() => {
          console.log("⏹️ Polling stopped, restarting...");
          return bot.startPolling();
        }).then(() => {
          console.log("✅ Telegram polling restarted - bot should now receive messages");
        }).catch(err => {
          console.error("❌ Failed to restart polling:", err.message);
        });
        
        // Also try to send a message to verify access
        // bot.sendMessage(OFFER_GROUP_CHAT_ID, "")
        //   .then(() => console.log("✅ Bot has access to offer group"))
        //   .catch(err => {
        //     console.log(`❌ Bot cannot access offer group: ${err.message}`);
        //     console.log("⚠️ Please check:");
        //     console.log("   1. Bot is an admin in the group");
        //     console.log("   2. Bot has permission to read messages");
        //     console.log("   3. Group is not a private supergroup");
        //   });
        
        // Reset error count after handling ETELEGRAM
        pollingErrorCount = 0;
        return;
      }
      
      if (pollingErrorCount >= 10) {
        // Only restart if cooldown has passed
        if (now - lastPollingRestart < POLLING_RESTART_COOLDOWN) {
          console.log("⏳ Too many errors but on cooldown, waiting...");
          pollingErrorCount = 0;
          return;
        }
        
        // console.log("🔄 Too many polling errors — restarting bot polling...");
        lastPollingRestart = now;
        pollingErrorCount = 0;
        bot.stopPolling().then(() => {
          setTimeout(() => {
            bot.startPolling().then(() => console.log("✅ Telegram polling restarted"))
              .catch(e => console.error("❌ Polling restart failed:", e.message));
          }, 5000);
        }).catch(() => {});
      }
    });

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

      // Handle Offer: / Offers: messages from the offer group FIRST (before state checks)
      // This ensures Offer: messages are processed even if user is in a waiting state
      const offerMessageText = msg.text || '';
      const offerLower = offerMessageText.toLowerCase();
      const chatIdStr = chatId.toString();
      
      // Debug: show chat ID
      console.log("💬 Message from chat ID:", chatIdStr, "| OFFER_GROUP_CHAT_ID:", OFFER_GROUP_CHAT_ID);
      
      // Check if message is from offer group (handle both -100 prefix and without)
      const isOfferGroup = chatIdStr === OFFER_GROUP_CHAT_ID || 
                          chatIdStr === OFFER_GROUP_CHAT_ID.replace('-100', '-') ||
                          chatIdStr === OFFER_GROUP_CHAT_ID.replace('-', '-100');
      
      // Check if message is from offer group and contains offer data
      // Format 1: "Offer: 191 AU ..." (with Offer: prefix)
      // Format 2: "191\nAU 1400+14..." (first line is just affiliate ID number)
      const isOfferFormat = offerLower.startsWith('offer:') || offerLower.startsWith('offers:') ||
                           (/^\d+$/.test(offerMessageText.trim().split('\n')[0] || ''));
      
      if (isOfferGroup && isOfferFormat) {
        console.log("✅ Detected offer message in group!");
        try {
          await handleOfferMessage(bot, msg, offerMessageText);
        } catch (err) {
          console.error("❌ Error in handleOfferMessage:", err);
          bot.sendMessage(msg.chat.id, `❌ Error processing offer: ${err.message}`);
        }
        return;
      }

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

      // Prevent duplicate processing: check recently processed hashes (last 30 seconds)
      const now = Date.now();
      if (!bot._processedHashes) bot._processedHashes = new Map();
      // Clean old entries (older than 30 seconds)
      for (const [hash, timestamp] of bot._processedHashes) {
        if (now - timestamp > 30000) bot._processedHashes.delete(hash);
      }

      // USDT hash detection (Brands group)
      const isBrandsGroup = chatId.toString() === BRANDS_GROUP_CHAT_ID;
      const isFinanceGroup = chatId.toString() === FINANCE_GROUP_CHAT_ID;
      
      // Handle payment messages from Brands group with payment links
      if (isBrandsGroup) {
        const messageText = msg.text || '';
        
        // Try to extract brand name from message (look for brand name patterns)
        const brandMatch = messageText.match(/(?:brand|Brand)[:\s]+([A-Za-z0-9]+)/i);
        const extractedBrand = brandMatch ? brandMatch[1] : null;
        
        // Extract any payment hashes (erc/trc/btc)
        const hashes = extractAllUsdtHashes(messageText);
        
        // DEDUPLICATION: Remove duplicate hashes - use a Map to keep only unique hashes
        // If same hash appears multiple times, keep only the first occurrence
        const uniqueHashesMap = new Map();
        for (const h of hashes) {
          if (h.type === 'TRC20' || h.type === 'ERC20' || h.type === 'BTC') {
            if (!uniqueHashesMap.has(h.hash)) {
              uniqueHashesMap.set(h.hash, h);
            }
          }
        }
        const uniqueTxHashes = Array.from(uniqueHashesMap.values());
        
        // Filter out recently processed hashes to prevent duplicate processing
        const newTxHashes = uniqueTxHashes.filter(h => !bot._processedHashes.has(h.hash));
        
        if (newTxHashes.length > 0) {
          // Process payment hashes from Brands group
          const messageText = msg.text || '';
          
          // Extract ALL dollar amounts from the message - improved regex to handle more formats
          const amounts = [];
          // Pattern 1: $500, $1,000, $1,000.00
          const p1 = /\$(\d+(?:,\d{3})*(?:\.\d{2})?)/g;
          let m;
          while ((m = p1.exec(messageText)) !== null) {
            amounts.push(m[1].replace(/,/g, ''));
          }
          // Pattern 2: 500$, 1000$, 1000.50$ (amount before $)
          const p2 = /(\d+(?:,\d{3})*(?:\.\d{2})?)\$/g;
          while ((m = p2.exec(messageText)) !== null) {
            amounts.push(m[1].replace(/,/g, ''));
          }
          // Pattern 3: Just numbers that look like amounts (standalone numbers that could be dollars)
          // This helps when the $ sign is on a different line
          const p3 = /(?:^|\n)\s*(\d{3,})\s*(?:\n|$)/gm;
          while ((m = p3.exec(messageText)) !== null) {
            // Only add if it's not already in amounts and looks like a dollar amount
            const val = m[1].replace(/,/g, '');
            if (!amounts.includes(val) && parseInt(val) > 0) {
              amounts.push(val);
            }
          }
          
          console.log("💰 Found amounts:", amounts);
          
          const wallets = readJSON("wallets.json", []);

          for (let i = 0; i < newTxHashes.length; i++) {
            const { hash, type } = newTxHashes[i];
            let txResult = { success: false };
            if (type === 'TRC20') txResult = await checkTRC20Transaction(hash);
            else if (type === 'ERC20') txResult = await checkERC20Transaction(hash);
            // BTC doesn't have verification yet, just record it

            // Use amounts[i] if available, otherwise fallback to blockchain amount, then to "0"
            const amount = (amounts[i] || txResult.amount || "0").toString();
            const walletVerify = verifyWalletAddress(txResult.toAddress || "", wallets);
            const status = walletVerify.matched ? "Received" : "Pending";
            const invoice = `CP-${Date.now().toString(36).toUpperCase()}`;

            const newPayment = {
              id: crypto.randomBytes(5).toString('hex'),
              invoice, amount, fee: "", status, type: "Customer Payment",
              openBy: "Telegram Bot", paidDate: new Date().toISOString().split("T")[0],
              paymentHash: hash, 
              trcAddress: type === 'TRC20' ? (txResult.toAddress || "") : "",
              ercAddress: type === 'ERC20' ? (txResult.toAddress || "") : "",
              brand: extractedBrand || "",  // Store extracted brand name
              month: new Date().getMonth(), year: new Date().getFullYear()
            };

            const cp = readJSON("customer-payments.json", []);
            cp.unshift(newPayment);
            await lockedWrite("customer-payments.json", cp, { action: "create", user: "telegram-bot", details: `Auto-created ${invoice} from hash (Brands group)` });
            broadcastUpdate("customer-payments", cp);
            
            // Mark hash as processed to prevent duplicates
            bot._processedHashes.set(hash, Date.now());

            // Send notification to both groups
            let confirmMsg = `📨 <b>Payment Processed!</b>\n\n📋 Invoice: <b>${invoice}</b>\n💵 Amount: <b>$${amount}</b>\n🔗 Hash (${type}): <code>${hash}</code>\n`;
            if (extractedBrand) confirmMsg += `🏷️ Brand: <b>${extractedBrand}</b>\n`;
            confirmMsg += txResult.success ? `✅ Blockchain: <b>Verified</b>\n` : `⚠️ Blockchain: <b>Could not verify</b>\n`;
            confirmMsg += walletVerify.matched ? `✅ Wallet: <b>MATCHED</b>\n` : `❌ Wallet: <b>${walletVerify.error}</b>\n`;
            confirmMsg += `\n📊 Status: <b>${status}</b>`;
            
            bot.sendMessage(BRANDS_GROUP_CHAT_ID, confirmMsg, { parse_mode: "HTML" });
            
            
            console.log(`✅ Payment from Brands group: Invoice ${invoice}, Brand: ${extractedBrand || 'N/A'}, Amount: $${amount}`);
          }
          return;
        }
      }
      
      // USDT hash detection (finance group only)
      if (isFinanceGroup) {
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
      } // close if (isFinanceGroup)
    }); // <-- FIX: Added missing closing brace and parenthesis for bot.on('message') handler

    console.log("✅ USDT hash detection enabled");
    
    // ═══════════════════════════════════════════════════════════════
    // 15. SCREENSHOT FUNCTIONALITY FOR MONITORING
    // ═══════════════════════════════════════════════════════════════
    
    // /todaycrgcap - Send CRG Deals report
    bot.onText(/\/todaycrgcap/, async (msg) => {
      bot.sendMessage(msg.chat.id, "📸 Generating CRG report...");
      try {
        const result = await screenshotModule.sendReport(bot, msg.chat.id, 'crg', readJSON);
        console.log(`CRG report sent via ${result.method}`);
      } catch (err) {
        console.error('Report error:', err);
        bot.sendMessage(msg.chat.id, `❌ Error: ${err.message}`);
      }
    });
    
    // /todayagentscap - Send Daily Cap report
    bot.onText(/\/todayagentscap/, async (msg) => {
      bot.sendMessage(msg.chat.id, "📸 Generating Agents report...");
      try {
        const result = await screenshotModule.sendReport(bot, msg.chat.id, 'agents', readJSON);
        console.log(`Agents report sent via ${result.method}`);
      } catch (err) {
        console.error('Report error:', err);
        bot.sendMessage(msg.chat.id, `❌ Error: ${err.message}`);
      }
    });
    
    // Initialize scheduled reports
    console.log("📸 Screenshot functionality enabled (manual commands only)");
  } catch (err) {
    console.log("⚠️ Failed to init Telegram bot:", err.message);
  }
}

// Hash extraction helpers (preserved)
function extractAllUsdtHashes(text) {
  if (!text) return [];
  const hashes = [];
  const seenHashes = new Set(); // Track unique hashes to prevent duplicates
  
  const tronMatches = text.matchAll(/tronscan\.org\/[^\/]*\/transaction\/([a-zA-Z0-9]{33,64})/gi);
  for (const match of tronMatches) {
    const h = match[1];
    if (seenHashes.has(h)) continue; // Skip duplicates
    if (TRC20_ADDRESS_REGEX.test(h)) { hashes.push({ hash: h, type: 'TRC20_ADDRESS' }); seenHashes.add(h); }
    else if (h.length === 64) { hashes.push({ hash: h, type: 'TRC20' }); seenHashes.add(h); }
  }
  const ethMatches = text.matchAll(/etherscan\.io\/tx\/(0x[a-fA-F0-9]{64})/gi);
  for (const match of ethMatches) {
    const h = match[1];
    if (seenHashes.has(h)) continue; // Skip duplicates
    hashes.push({ hash: h, type: 'ERC20' });
    seenHashes.add(h);
  }
  text.split(/\s+/).forEach(w => {
    const t = w.trim();
    if (seenHashes.has(t)) return; // Already have this hash
    if (ERC20_HASH_REGEX.test(t)) { hashes.push({ hash: t, type: 'ERC20' }); seenHashes.add(t); }
    else if (TRC20_HASH_REGEX.test(t)) { hashes.push({ hash: t, type: 'TRC20' }); seenHashes.add(t); }
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

// API endpoint to send CRG screenshot on demand
app.post("/api/telegram/screenshot/crg", requireAdmin, async (req, res) => {
  if (!bot) return res.json({ ok: false, error: "Bot not initialized" });
  try {
    const result = await screenshotModule.sendReport(bot, MONITORING_GROUP_CHAT_ID, 'crg', readJSON);
    await screenshotModule.sendReport(bot, FINANCE_GROUP_CHAT_ID, 'crg', readJSON);
    res.json({ ok: true, message: `CRG report sent (${result.method})` });
  } catch (err) {
    console.error('CRG report error:', err);
    res.json({ ok: false, error: err.message });
  }
});

// API endpoint to send Agents screenshot on demand
app.post("/api/telegram/screenshot/agents", requireAdmin, async (req, res) => {
  if (!bot) return res.json({ ok: false, error: "Bot not initialized" });
  try {
    const result = await screenshotModule.sendReport(bot, MONITORING_GROUP_CHAT_ID, 'agents', readJSON);
    await screenshotModule.sendReport(bot, FINANCE_GROUP_CHAT_ID, 'agents', readJSON);
    res.json({ ok: true, message: `Agents report sent (${result.method})` });
  } catch (err) {
    console.error('Agents report error:', err);
    res.json({ ok: false, error: err.message });
  }
});

// API endpoint to send both screenshots on demand
app.post("/api/telegram/screenshot/all", requireAdmin, async (req, res) => {
  if (!bot) return res.json({ ok: false, error: "Bot not initialized" });
  try {
    const r1 = await screenshotModule.sendReport(bot, MONITORING_GROUP_CHAT_ID, 'crg', readJSON);
    await screenshotModule.sendReport(bot, FINANCE_GROUP_CHAT_ID, 'crg', readJSON);
    const r2 = await screenshotModule.sendReport(bot, MONITORING_GROUP_CHAT_ID, 'agents', readJSON);
    await screenshotModule.sendReport(bot, FINANCE_GROUP_CHAT_ID, 'agents', readJSON);
    res.json({ ok: true, message: `Reports sent: CRG (${r1.method}), Agents (${r2.method})` });
  } catch (err) {
    console.error('Report error:', err);
    res.json({ ok: false, error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// OFFER MESSAGE PARSER — Handles "Offer:" messages from Telegram
// ═══════════════════════════════════════════════════════════════

async function handleOfferMessage(bot, msg, messageText) {
  try {
    // Check for duplicate message using message ID
    if (msg.message_id) {
      if (isMessageProcessed(msg.message_id)) {
        console.log("⏭️ Skipping duplicate offer message:", msg.message_id);
        return;
      }
      markMessageProcessed(msg.message_id);
    }
    
    console.log("📝 Received offer message:", messageText);
    
    // Parse the BLITZ offer format:
    // Offer:
    // 51
    // FR Polynesia 
    // Crg 900$+8%
    // Finzeratix, Plantorixio
    // Gg/Fb
    
    const lines = messageText.split('\n').map(l => l.trim()).filter(l => l);
    
    // Declare existingOffers at the top to avoid initialization errors
    let existingOffers = [];

    // Check for simple single-line format: "Offer: 196 BEnl BitcoinApex 1500+12"
    const simpleMatch = messageText.match(/^Offer:\s*(\d+)\s+(\w+)\s+(\S+)\s+(\d+[\+\%]\d+)/i);
    if (simpleMatch) {
      const affiliateId = simpleMatch[1];
      const country = simpleMatch[2];
      const brand = simpleMatch[3];
      const crg = simpleMatch[4];
      
      // Get existing offers
      const offersFile = path.join(DATA_DIR, "offers.json");
      try {
        if (fs.existsSync(offersFile)) {
          existingOffers = JSON.parse(fs.readFileSync(offersFile, "utf8"));
        }
      } catch (e) {}
      
      // Remove existing offers for this affiliate
      existingOffers = existingOffers.filter(o => o.affiliateId !== affiliateId);
      
      // Add new offer
      const timestamp = new Date().toISOString().split("T")[0];
      existingOffers.push({
        id: crypto.randomBytes(4).toString('hex'),
        affiliateId: affiliateId,
        country: country,
        crg: crg,
        crgAmount: crg.split('+')[0],
        crgPercentage: crg.split('+')[1] || '',
        brands: brand,
        traffic: '',
        status: "Open",
        createdDate: timestamp,
        rawMessage: messageText
      });
      
      // Save to file
      await lockedWrite("offers.json", existingOffers, {
        action: "create",
        user: "telegram-bot",
        details: `Added offer for affiliate ${affiliateId}`
      });
      
      // Broadcast to connected clients
      broadcastUpdate("offers", existingOffers);
      
      // Send notification to offer group
      sendNewOfferNotification(affiliateId, country, brand);
      
      return;
    }
    
// Check for multi-line format:
    // Offer:
    // 196 BEnl
    // BitcoinApex
    // 1500+12
    if (lines.length >= 4 && lines[0].toLowerCase() === 'offer:') {
      // Second line should be "196 BEnl" (affiliate + country)
      // Fix: Make regex case-insensitive for country code part
      const line2Match = lines[1].match(/^(\d+)\s+([A-Za-z0-9]+)$/);
      if (line2Match) {
        const affiliateId = line2Match[1];
        const country = line2Match[2]; // Keep original case (e.g., "BEnl")
        const brand = lines[2] || '';
        const crg = lines[3] || '';
        
        // Validate we have at least affiliate and country
        if (affiliateId && country) {
          // Get existing offers
          const offersFile = path.join(DATA_DIR, "offers.json");
          existingOffers = [];
          try {
            if (fs.existsSync(offersFile)) {
              existingOffers = JSON.parse(fs.readFileSync(offersFile, "utf8"));
            }
          } catch (e) {}
          
          // Remove existing offers for this affiliate
          existingOffers = existingOffers.filter(o => o.affiliateId !== affiliateId);
          
          // Add new offer
          const timestamp = new Date().toISOString().split("T")[0];
          existingOffers.push({
            id: crypto.randomBytes(4).toString('hex'),
            affiliateId: affiliateId,
            country: country,
            crg: crg,
            crgAmount: crg.split('+')[0] || '',
            crgPercentage: crg.split('+')[1] || '',
            brands: brand,
            traffic: '',
            status: "Open",
            createdDate: timestamp,
            rawMessage: messageText
          });
          
          // Save to file
          await lockedWrite("offers.json", existingOffers, {
            action: "create",
            user: "telegram-bot",
            details: `Added offer for affiliate ${affiliateId}`
          });
          
          // Broadcast to connected clients
          broadcastUpdate("offers", existingOffers);
          
          // Send notification to offer group
          sendNewOfferNotification(affiliateId, country, brand);
          
          return;
        }
      }
      
      // NEW FORMAT: Check for format like:
      // Offer:
      // 80
      // HR native Quantumcroatia 1250+11%
      // deduction 10%
      
      // Line 2 is affiliate ID only (just a number)
      const line2NumberOnly = lines[1].match(/^(\d+)$/);
      if (line2NumberOnly) {
        const affiliateId = line2NumberOnly[1];
        
        // Line 3 contains: country brand crg (e.g., "HR native Quantumcroatia 1250+11%")
        const line3 = lines[2] || '';
        
        // Parse line3: first 2 chars is country code, rest is brand and CRG
        // Format: "HR native Quantumcroatia 1250+11%"
        let country = '';
        let brand = '';
        let crg = '';
        
        // Try to extract country code (first 2 letters)
        const countryMatch = line3.match(/^([A-Za-z]{2})\s+(.+)$/);
        if (countryMatch) {
          country = countryMatch[1].toUpperCase();
          const rest = countryMatch[2];
          // Try to extract CRG from rest (e.g., "1250+11%" or "1250+11")
          const crgMatch = rest.match(/(\d+[\+\%]\d+%)/);
          if (crgMatch) {
            crg = crgMatch[1];
            brand = rest.replace(crgMatch[0], '').trim();
          } else {
            brand = rest;
          }
        }
        
        // Parse deduction from line 4 (e.g., "deduction 10%")
        let deduction = '';
        if (lines[3]) {
          const deductionMatch = lines[3].match(/deduction\s+(\d+%)/i);
          if (deductionMatch) {
            deduction = deductionMatch[1];
          }
        }
        
        if (affiliateId && country) {
          // FIX: Save to deals.json (not offers.json) - this is what the CRM Offers tab reads
          const dealsFile = path.join(DATA_DIR, "deals.json");
          let existingDeals = [];
          try {
            if (fs.existsSync(dealsFile)) {
              existingDeals = JSON.parse(fs.readFileSync(dealsFile, "utf8"));
            }
          } catch (e) {}
          
          // Remove existing deals for this affiliate and country
          existingDeals = existingDeals.filter(d => 
            String(d.affiliate) !== String(affiliateId) || 
            (d.country && d.country.toUpperCase()) !== country
          );
          
          // Add new deal in deals.json format
          existingDeals.push({
            id: crypto.randomBytes(4).toString('hex'),
            affiliate: affiliateId,
            country: country,
            price: '',
            crg: crg,
            dealType: "CRG",
            funnels: brand,
            source: '',
            deduction: deduction || '',
            date: new Date().toISOString().split("T")[0],
            openBy: 'telegram-bot'
          });
          
          // Save to deals.json
          await lockedWrite("deals.json", existingDeals, {
            action: "create",
            user: "telegram-bot",
            details: `Added offer for affiliate ${affiliateId}`
          });
          
          // Broadcast to connected clients
          broadcastUpdate("deals", existingDeals);

          // Send confirmation to offer group
          let confirmMsg = `✅ <b>Added offer for affiliate ${affiliateId}</b>\n\n`;
          confirmMsg += `🌍 Country: <b>${country}</b>\n`;
          confirmMsg += `🏷️ Brand: <b>${brand}</b>\n`;
          if (crg) confirmMsg += `💰 CRG: <b>${crg}</b>\n`;
          if (deduction) confirmMsg += `📉 Deduction: <b>${deduction}</b>\n`;
          confirmMsg += `\n💾 Saved to deals`;

          bot.sendMessage(OFFER_GROUP_CHAT_ID, confirmMsg, { parse_mode: "HTML" });
          
          return;
        }
      }
    }
    
    // Find affiliate ID
    let affiliateId = null;
    let startIndex = 0;
    
    // Skip "Offer:" header
    if (lines[0] && lines[0].toLowerCase().startsWith('offer:')) {
      startIndex = 1;
    }
    
    // Find affiliate ID (standalone number)
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      if (/^\d+$/.test(line)) {
        affiliateId = line;
        startIndex = i + 1;
        break;
      }
    }
    
    if (!affiliateId) {
      bot.sendMessage(msg.chat.id, "❌ Could not find affiliate ID. Format: Offer:\\n51\\nFR\\nCrg 900$+8%");
      return;
    }
    
    // Parse country blocks
    const offers = [];
    let currentCountry = '';
    let currentCRG = '';
    let currentBrands = '';
    let currentTraffic = '';
    
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      const lowerLine = line.toLowerCase();
      
      // Empty line separates country blocks
      if (!line) {
        if (currentCountry && currentCRG) {
          offers.push({
            country: currentCountry,
            crg: currentCRG,
            brands: currentBrands,
            traffic: currentTraffic
          });
        }
        currentCountry = '';
        currentCRG = '';
        currentBrands = '';
        currentTraffic = '';
        continue;
      }
      
      // Check if CRG line
      if (lowerLine.startsWith('crg ') || /^\$?\d+[\+\$]/.test(line)) {
        currentCRG = line;
        continue;
      }
      
      // Check if traffic line (contains /, fb, gg)
      if (line.includes('/') || lowerLine.includes('fb') || lowerLine.includes('gg')) {
        currentTraffic = line;
        continue;
      }
      
      // Check if country line
      if (/^[A-Z]{2}[\s]/.test(line) || /^[A-Z]{2}$/.test(line) || 
          lowerLine.includes('polynesia') || lowerLine.includes('native') || 
          lowerLine.includes('mix')) {
        if (currentCountry && currentCRG) {
          offers.push({
            country: currentCountry,
            crg: currentCRG,
            brands: currentBrands,
            traffic: currentTraffic
          });
        }
        currentCountry = line;
        currentCRG = '';
        currentBrands = '';
        currentTraffic = '';
        continue;
      }
      
      // Otherwise, it's brands
      currentBrands = line;
    }
    
    // Don't forget last offer
    if (currentCountry && currentCRG) {
      offers.push({
        country: currentCountry,
        crg: currentCRG,
        brands: currentBrands,
        traffic: currentTraffic
      });
    }
    
    if (offers.length === 0) {
      bot.sendMessage(msg.chat.id, "❌ Could not parse any offers.");
      return;
    }
    
    // Get existing offers
    const offersFile = path.join(DATA_DIR, "offers.json");
    existingOffers = [];
    try {
      if (fs.existsSync(offersFile)) {
        existingOffers = JSON.parse(fs.readFileSync(offersFile, "utf8"));
      }
    } catch (e) {}
    
    // Remove existing offers for this affiliate
    existingOffers = existingOffers.filter(o => o.affiliateId !== affiliateId);
    
    // Add new offers
    const timestamp = new Date().toISOString().split("T")[0];
    offers.forEach(o => {
      // Parse CRG amount and percentage
      let crgAmount = '';
      let crgPercentage = '';
      const crgMatch = o.crg.match(/(\d+)\$?\+(\d+)/);
      if (crgMatch) {
        crgAmount = crgMatch[1];
        crgPercentage = crgMatch[2] + '%';
      }
      
      existingOffers.push({
        id: crypto.randomBytes(4).toString('hex'),
        affiliateId: affiliateId,
        country: o.country,
        crg: o.crg,
        crgAmount: crgAmount,
        crgPercentage: crgPercentage,
        brands: o.brands,
        traffic: o.traffic,
        status: "Open",
        createdDate: timestamp,
        rawMessage: messageText
      });
    });
    
    // Save to file
    await lockedWrite("offers.json", existingOffers, {
      action: "create",
      user: "telegram-bot",
      details: `Added ${offers.length} offers for affiliate ${affiliateId}`
    });
    
    // Broadcast to connected clients
    broadcastUpdate("offers", existingOffers);
    
    // Send confirmation
    let confirmMsg = `✅ <b>Updated offer for affiliate ${affiliateId}</b>\n\n`;
    confirmMsg += `📝 Parsed ${offers.length} offer(s):\n\n`;
    offers.forEach((o, i) => {
      confirmMsg += `${i + 1}. <b>${o.country}</b>\n`;
      confirmMsg += `   💰 CRG: ${o.crg}\n`;
      if (o.brands) confirmMsg += `   🏷️ Brands: ${o.brands}\n`;
      if (o.traffic) confirmMsg += `   📊 Traffic: ${o.traffic}\n`;
      confirmMsg += '\n';
    });
    confirmMsg += `💾 Saved to offers.json`;
    
    bot.sendMessage(OFFER_GROUP_CHAT_ID, confirmMsg, { parse_mode: "HTML" });
    
  } catch (err) {
    console.error("❌ Error handling offer message:", err.message);
    bot.sendMessage(msg.chat.id, `❌ Error processing offer: ${err.message}`);
  }
}



// ═══════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
// MANUAL BACKUP — trigger from Admin panel before deploying new version
// ═══════════════════════════════════════════════════════════════
app.post("/api/admin/backup", requireAdmin, async (req, res) => {
  const label = "manual-" + new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const ts = createBackup(label);
  console.log(`📦 Manual backup triggered by ${req.userSession.email}: ${ts}`);
  res.json({ ok: true, backup: ts, message: "Backup created successfully" });
});

// DATA DEDUPLICATION — clean existing duplicates (admin only)
// ═══════════════════════════════════════════════════════════════
app.post("/api/admin/dedup", requireAdmin, async (req, res) => {
  const results = {};
  
  // Deduplicate daily-cap: one record per agent per date
  const dc = readJSON("daily-cap.json", []);
  const dcSeen = new Map();
  for (const r of dc) {
    const key = `${r.date}__${(r.agent || "").trim().toLowerCase()}`;
    if (dcSeen.has(key)) {
      const existing = dcSeen.get(key);
      const existTotal = (parseInt(existing.affiliates) || 0) + (parseInt(existing.brands) || 0);
      const newTotal = (parseInt(r.affiliates) || 0) + (parseInt(r.brands) || 0);
      if (newTotal > existTotal) dcSeen.set(key, r);
    } else { dcSeen.set(key, r); }
  }
  const dcDeduped = Array.from(dcSeen.values());
  if (dcDeduped.length < dc.length) {
    await lockedWrite("daily-cap.json", dcDeduped, { action: "dedup", user: req.userSession.email, details: `Removed ${dc.length - dcDeduped.length} duplicates` });
    broadcastUpdate("daily-cap", dcDeduped);
  }
  results["daily-cap"] = { before: dc.length, after: dcDeduped.length, removed: dc.length - dcDeduped.length };

  // Deduplicate crg-deals: one record per affiliate per date
  const crg = readJSON("crg-deals.json", []);
  const crgSeen = new Map();
  for (const r of crg) {
    const key = `${r.date}__${(r.affiliate || "").trim().toLowerCase()}`;
    if (crgSeen.has(key)) {
      const existing = crgSeen.get(key);
      const existScore = (existing.started ? 1 : 0) + (parseInt(existing.capReceived) || 0) + (parseInt(existing.ftd) || 0);
      const newScore = (r.started ? 1 : 0) + (parseInt(r.capReceived) || 0) + (parseInt(r.ftd) || 0);
      if (newScore > existScore) crgSeen.set(key, r);
    } else { crgSeen.set(key, r); }
  }
  const crgDeduped = Array.from(crgSeen.values());
  if (crgDeduped.length < crg.length) {
    await lockedWrite("crg-deals.json", crgDeduped, { action: "dedup", user: req.userSession.email, details: `Removed ${crg.length - crgDeduped.length} duplicates` });
    broadcastUpdate("crg-deals", crgDeduped);
  }
  results["crg-deals"] = { before: crg.length, after: crgDeduped.length, removed: crg.length - crgDeduped.length };

  console.log("🧹 DEDUP results:", JSON.stringify(results));
  res.json({ ok: true, results });
});

// DATA RECONCILIATION — recover orphaned local records
// ═══════════════════════════════════════════════════════════════
app.post("/api/reconcile", requireAuth, async (req, res) => {
  const { table, localData } = req.body;
  if (!table || !Array.isArray(localData)) return res.status(400).json({ error: "Need table name and localData array" });
  const file = table + ".json";
  const serverData = readJSON(file, []);
  const serverIDs = new Set(serverData.map(r => r.id).filter(Boolean));
  const orphans = localData.filter(r => r.id && !serverIDs.has(r.id));
  if (orphans.length === 0) return res.json({ ok: true, message: "No orphaned records", serverCount: serverData.length });
  const merged = [...serverData, ...orphans];
  const success = await lockedWrite(file, merged, { action: "reconcile", user: req.userSession.email, details: `Recovered ${orphans.length} orphans` });
  if (success) {
    broadcastUpdate(table, merged);
    res.json({ ok: true, recovered: orphans.length, total: merged.length });
  } else {
    res.status(500).json({ error: "Write failed" });
  }
});

// GLOBAL ERROR HANDLER — catch-all, always returns JSON
// ═══════════════════════════════════════════════════════════════
app.use((err, req, res, next) => {
  console.error('💥 Express error:', err.message);
  if (!res.headersSent) res.status(500).json({ error: "Internal server error" });
});

// ═══════════════════════════════════════════════════════════════
// MEMORY MONITORING — detect leaks before they crash
// ═══════════════════════════════════════════════════════════════
const memoryLog = [];
const MAX_MEMORY_LOG = 120;

function getMemorySnapshot() {
  const mem = process.memoryUsage();
  return {
    timestamp: new Date().toISOString(),
    rss: Math.round(mem.rss / 1024 / 1024),
    heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
    heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
    external: Math.round(mem.external / 1024 / 1024),
    wsClients: wsClients.size,
    sessions: activeSessions.size,
    uptime: Math.round(process.uptime()),
  };
}

setInterval(() => {
  const snap = getMemorySnapshot();
  memoryLog.push(snap);
  if (memoryLog.length > MAX_MEMORY_LOG) memoryLog.shift();
  if (snap.heapUsed > 400) {
    console.error(`🚨 HIGH MEMORY: heap=${snap.heapUsed}MB rss=${snap.rss}MB ws=${snap.wsClients}`);
  }
  // v9.05: Force GC at 500MB to prevent OOM
  if (snap.heapUsed > 500 && global.gc) {
    console.warn(`🧹 Forcing GC at ${snap.heapUsed}MB heap...`);
    try { global.gc(); } catch {}
  }
  if (memoryLog.length >= 10) {
    const tenAgo = memoryLog[memoryLog.length - 10];
    const growth = snap.heapUsed - tenAgo.heapUsed;
    if (growth > 50) console.error(`🚨 MEMORY LEAK: heap grew ${growth}MB in 10min (${tenAgo.heapUsed}→${snap.heapUsed}MB)`);
  }
}, 60000);

// ═══════════════════════════════════════════════════════════════
// ADMIN DIAGNOSTICS — live health + downloadable logs
// ═══════════════════════════════════════════════════════════════
app.get("/api/admin/diagnostics", requireAdmin, (req, res) => {
  const snap = getMemorySnapshot();
  let recentAudit = [];
  try {
    const files = fs.readdirSync(AUDIT_DIR).sort().reverse().slice(0, 3);
    for (const f of files) {
      const lines = fs.readFileSync(path.join(AUDIT_DIR, f), "utf8").trim().split("\n").slice(-50);
      recentAudit.push({ file: f, entries: lines.map(l => { try { return JSON.parse(l); } catch { return l; } }) });
    }
  } catch {}
  // Backup status
  let backupInfo = { count: 0, latest: null, oldest: null };
  try {
    if (fs.existsSync(BACKUP_DIR)) {
      const dirs = fs.readdirSync(BACKUP_DIR).sort().reverse();
      backupInfo.count = dirs.length;
      if (dirs.length > 0) backupInfo.latest = dirs[0];
      if (dirs.length > 1) backupInfo.oldest = dirs[dirs.length - 1];
    }
  } catch {}
  // v9.06: Snapshot info
  let snapshotInfo = { count: 0, latest: null };
  try {
    if (fs.existsSync(SNAPSHOT_DIR)) {
      const sdirs = fs.readdirSync(SNAPSHOT_DIR).sort().reverse();
      snapshotInfo.count = sdirs.length;
      if (sdirs.length > 0) snapshotInfo.latest = sdirs[0];
    }
  } catch {}

  res.json({
    server: { version: VERSION, uptime: Math.round(process.uptime()), uptimeFormatted: `${Math.floor(process.uptime()/3600)}h ${Math.floor((process.uptime()%3600)/60)}m`, startedAt: new Date(Date.now()-process.uptime()*1000).toISOString(), nodeVersion: process.version, pid: process.pid, crashes: crashCount, recentCrashes: CRASH_LOG.slice(-10) },
    memory: snap, memoryHistory: memoryLog.slice(-30),
    connections: { webSocketClients: wsClients.size, activeSessions: activeSessions.size, rateLimitEntries: rateLimitMap.size, loginAttempts: loginAttempts.size },
    telegram: { botActive: !!bot, pollingErrors: typeof pollingErrorCount !== 'undefined' ? pollingErrorCount : 'N/A' },
    backups: backupInfo,
    snapshots: snapshotInfo,
    data: { payments: readJSON("payments.json",[]).length, customerPayments: readJSON("customer-payments.json",[]).length, crgDeals: readJSON("crg-deals.json",[]).length, dailyCap: readJSON("daily-cap.json",[]).length, offers: readJSON("deals.json",[]).length, telegramOffers: readJSON("offers.json",[]).length, wallets: readJSON("wallets.json",[]).length },
    recentAudit,
  });
});

app.get("/api/admin/logs/download", requireAdmin, (req, res) => {
  const report = {
    generatedAt: new Date().toISOString(),
    server: { version: VERSION, uptime: process.uptime(), pid: process.pid, node: process.version },
    memoryNow: getMemorySnapshot(), memoryHistory: memoryLog,
    connections: { wsClients: wsClients.size, sessions: activeSessions.size },
    telegram: { active: !!bot, pollingErrors: typeof pollingErrorCount !== 'undefined' ? pollingErrorCount : 0 },
  };
  try {
    const files = fs.readdirSync(AUDIT_DIR).sort().reverse().slice(0, 7);
    report.auditLogs = {};
    for (const f of files) {
      report.auditLogs[f] = fs.readFileSync(path.join(AUDIT_DIR, f), "utf8").trim().split("\n").map(l => { try { return JSON.parse(l); } catch { return l; } });
    }
  } catch {}
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="blitz-diagnostics-${new Date().toISOString().split('T')[0]}.json"`);
  res.send(JSON.stringify(report, null, 2));
});

// ═══════════════════════════════════════════════════════════════
// GRACEFUL SHUTDOWN — flush data before dying
// ═══════════════════════════════════════════════════════════════
function gracefulShutdown(signal) {
  console.log(`\n🛑 ${signal} — graceful shutdown...`);
  server.close(() => console.log("✅ HTTP closed"));
  wsClients.forEach(ws => { try { ws.close(1001, "Server shutting down"); } catch {} });
  if (bot) { try { bot.stopPolling(); console.log("✅ Telegram stopped"); } catch {} }
  persistSessions();
  try { createBackup("shutdown-" + new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)); console.log("✅ Emergency backup"); } catch {}
  writeAuditLog("system", "shutdown", "system", `${signal} — uptime: ${Math.round(process.uptime())}s, heap: ${Math.round(process.memoryUsage().heapUsed/1024/1024)}MB`);
  setTimeout(() => process.exit(0), 2000);
}
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ═══════════════════════════════════════════════════════════════
// 14. START SERVER (HTTP + WebSocket on same port)
// ═══════════════════════════════════════════════════════════════

server.listen(PORT, "0.0.0.0", () => {
  console.log(`\n╔══════════════════════════════════════════════╗`);
  console.log(`║  🚀 Blitz CRM Server v${VERSION}                  ║`);
  console.log(`║  📡 HTTP + WebSocket on port ${PORT}            ║`);
  console.log(`║  💾 Data: ${DATA_DIR.slice(-30).padEnd(30)}    ║`);
  console.log(`║  📦 Hourly backups + daily snapshots (7-day)  ║`);
  console.log(`║  📋 Audit: 30-day rolling log                ║`);
  console.log(`║  🔒 WAL atomic writes + concurrency queue     ║`);
  console.log(`║  🛡️  Input sanitization + XSS protection      ║`);
  console.log(`║  🧹 Nightly auto-dedup at 03:00              ║`);
  console.log(`║  🤖 Telegram: @blitzfinance_bot              ║`);
  console.log(`╚══════════════════════════════════════════════╝\n`);

  // Initial external sync on startup
  setTimeout(() => syncExternalData(), 3000);
  // Sync every 15 minutes
  setInterval(() => syncExternalData(), 15 * 60 * 1000);
});
