// Blitz CRM Server — v12.00 (2026-03-12)
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

// ═══════════════════════════════════════════════════════════════
// STRUCTURED LOGGING — module / event / result / timestamp
// ═══════════════════════════════════════════════════════════════
// Q1: Centralised log helper used across all Telegram modules
function structuredLog(module, event, result, details = {}) {
  const entry = {
    ts: new Date().toISOString(),
    module,
    event,
    result, // "ok" | "error" | "skip" | "warn"
    ...details,
  };
  const icon = result === 'ok' ? '✅' : result === 'error' ? '❌' : result === 'skip' ? '⏭️' : '⚠️';
  console.log(`${icon} [${module}] ${event}`, JSON.stringify(entry));
  return entry;
}
const PORT = 3001;
const VERSION = "12.00";
const DATA_DIR = path.join(__dirname, "data");
const BACKUP_DIR = path.join(__dirname, "backups");
const AUDIT_DIR = path.join(__dirname, "audit");
const TOMBSTONE_DIR = path.join(__dirname, "tombstones");

// ═══════════════════════════════════════════════════════════════
// 1. CORE INFRASTRUCTURE
// ═══════════════════════════════════════════════════════════════

// Ensure directories
[DATA_DIR, BACKUP_DIR, AUDIT_DIR, TOMBSTONE_DIR].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

// ═══════════════════════════════════════════════════════════════
// v10.0: TOMBSTONE SYSTEM — prevents deleted records from resurrecting
// ═══════════════════════════════════════════════════════════════
// When a user deletes a record, we store its ID in a per-table tombstone file.
// Any client that later tries to re-add that ID will have it silently filtered out.
// Tombstones expire after 7 days to prevent unbounded growth.
const TOMBSTONE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function getTombstoneFile(table) {
  return path.join(TOMBSTONE_DIR, `${table}.json`);
}

function readTombstones(table) {
  const file = getTombstoneFile(table);
  try {
    if (fs.existsSync(file)) {
      const data = JSON.parse(fs.readFileSync(file, "utf8"));
      if (typeof data === "object" && !Array.isArray(data)) return data;
    }
  } catch (err) {
    console.error(`⚠️ Error reading tombstones for ${table}:`, err.message);
  }
  return {}; // { recordId: timestamp }
}

function writeTombstones(table, tombstones) {
  const file = getTombstoneFile(table);
  try {
    fs.writeFileSync(file, JSON.stringify(tombstones, null, 2), "utf8");
  } catch (err) {
    console.error(`❌ Error writing tombstones for ${table}:`, err.message);
  }
}

function addTombstones(table, ids) {
  if (!ids || ids.length === 0) return;
  const tombstones = readTombstones(table);
  const now = Date.now();
  ids.forEach(id => { tombstones[id] = now; });
  // Prune expired tombstones while we're at it
  const cutoff = now - TOMBSTONE_TTL_MS;
  for (const [id, ts] of Object.entries(tombstones)) {
    if (ts < cutoff) delete tombstones[id];
  }
  writeTombstones(table, tombstones);
}

function isTombstoned(table, id) {
  const tombstones = readTombstones(table);
  const ts = tombstones[id];
  if (!ts) return false;
  if (Date.now() - ts > TOMBSTONE_TTL_MS) return false; // expired
  return true;
}

function getTombstonedIds(table) {
  const tombstones = readTombstones(table);
  const now = Date.now();
  const active = new Set();
  for (const [id, ts] of Object.entries(tombstones)) {
    if (now - ts <= TOMBSTONE_TTL_MS) active.add(id);
  }
  return active;
}

// Nightly tombstone cleanup (called from scheduleNightlyTasks)
function cleanupTombstones() {
  try {
    const files = fs.readdirSync(TOMBSTONE_DIR);
    let totalCleaned = 0;
    const cutoff = Date.now() - TOMBSTONE_TTL_MS;
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const table = file.replace('.json', '');
      const tombstones = readTombstones(table);
      let cleaned = 0;
      for (const [id, ts] of Object.entries(tombstones)) {
        if (ts < cutoff) { delete tombstones[id]; cleaned++; }
      }
      if (cleaned > 0) {
        writeTombstones(table, tombstones);
        totalCleaned += cleaned;
      }
    }
    if (totalCleaned > 0) console.log(`🪦 Tombstone cleanup: removed ${totalCleaned} expired entries`);
  } catch (err) {
    console.error("⚠️ Tombstone cleanup error:", err.message);
  }
}

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

  const ALL_PAGES_KEYS = ["overview","payments","customer-payments","crg-deals","daily-cap","offers","partners","blitz-report","ftd-info","daily-calcs","admin"];
  for (const iu of INITIAL_USERS) {
    const eu = existingMap.get(iu.email);
    if (!eu) {
      // Missing user — add it with full pageAccess (v11.01)
      existing.push({ ...iu, pageAccess: ALL_PAGES_KEYS });
      changed = true;
      console.log(`👤 Added user: ${iu.email}`);
    } else {
      let userChanged = false;
      if (!eu.passwordHash) {
        // User exists but passwordHash was stripped — restore it
        eu.passwordHash = iu.passwordHash;
        userChanged = true;
        console.log(`🔑 Restored passwordHash for: ${iu.email}`);
      }
      // v11.01: If user has no pageAccess at all, give them full access
      if (!Array.isArray(eu.pageAccess)) {
        eu.pageAccess = ALL_PAGES_KEYS;
        userChanged = true;
        console.log(`🔓 Restored pageAccess for: ${iu.email}`);
      }
      if (userChanged) changed = true;
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
const AFFILIte_FINANCE_GROUP_CHAT_ID = "-1002830517753";
const LEADS_GROUP_CHAT_ID = "-5195790399";  // Leadgreed FTD bot group
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
    { name: 'Finance', id: AFFILIte_FINANCE_GROUP_CHAT_ID },
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

// ═══════════════════════════════════════════════════════════════
// v9.21: Robust customer name extraction from Telegram messages
// ═══════════════════════════════════════════════════════════════
function extractCustomerName(messageText) {
  if (!messageText) return "";
  const custMatch = messageText.match(/(?:customer|name|client)[:\s]+([A-Za-z][A-Za-z0-9 ]{0,98})(?:\n|$|https?:)/i);
  if (custMatch) return custMatch[1].trim();
  const lines = messageText.split('\n').map(l => l.trim()).filter(l => l);
  for (const line of lines) {
    let cleaned = line
      .replace(/https?:\/\/\S+/g, '')
      .replace(/\b0x[a-fA-F0-9]{40,66}\b/g, '')
      .replace(/\b[a-fA-F0-9]{64}\b/g, '')
      .replace(/\bT[a-zA-Z0-9]{33}\b/g, '')
      .replace(/\b(1|3|bc1)[a-zA-HJ-NP-Z0-9]{25,39}\b/g, '')
      .replace(/\$[\d,.]+|[\d,.]+\$/g, '')
      .replace(/\b\d{3,}\b/g, '')
      .replace(/[_*`~]/g, '')
      .trim();
    if (cleaned && cleaned.length >= 2 && cleaned.length < 100 && /[a-zA-Z]/.test(cleaned)) {
      const hexChars = (cleaned.match(/[0-9a-fA-F]/g) || []).length;
      if (hexChars / cleaned.length > 0.5 && cleaned.length > 10) continue;
      if (/^(brand|status|type|hash|invoice|date|amount)[:\s]/i.test(cleaned)) continue;
      return cleaned;
    }
  }
  return "";
}

// ═══════════════════════════════════════════════════════════════
// v9.51: OFFER MESSAGE PARSER — handles all Telegram offer formats
// Supports: compact ("NL nl Funnel 1500+15 gg"), multi-geo single-line
// ("IN 700+4% GR 1250+10% ..."), labeled ("Geo: BEfr / Funnel: X")
// v9.51 FIX: Deal Type awareness — CPA/CPL/CPS etc are NOT geo codes
// v10.09: Affiliate & Brand name resolution for Telegram bot
const AFFILIATE_NAMES = {
  "137": "Tokomedia", "225": "ExTraffic", "211": "ExTraffic", "123": "MeeseeksMedia",
  "165": "BUFU", "168": "PLASH", "83": "Leading Media", "194": "Q16",
  "226": "Affilihub", "49": "Matar", "60": "Traffic Lab", "134": "Traffic Lab",
  "183": "PandaAds", "159": "Farah", "171": "MediaPro", "139": "20C",
  "133": "Whitefly", "64": "Punch", "12": "Punch", "51": "Liquid Group",
  "28": "Bugle", "131": "Bugle", "33": "RVG", "167": "RVG",
};
function getAffiliateName(id) { return AFFILIATE_NAMES[String(id)] || ""; }

// v9.51 FIX: All CRM table fields populated (Deal Type, Funnels, Open By, Date)
// ═══════════════════════════════════════════════════════════════
const OFFER_GEO_CODES = new Set([
  'NL','BE','DE','FR','UK','AU','MY','SI','HR','ES','IT','GR','RO','IN','CA','AE',
  'AT','CH','CZ','PL','PT','SE','NO','DK','FI','IE','IL','ZA','NZ','SG','HK','JP',
  'KR','TW','BR','MX','AR','CL','CO','PE','TH','VN','ID','PH','TR','EG','SA','QA',
  'KW','BH','OM','US','UAE','GCC',
]);
const OFFER_LANG_CODES = new Set(['nl','fr','en','eng','de','es','it','pt','ar','ru','zh','ja','ko','pl','tr','el','sv','da','no','fi','native']);
const OFFER_SOURCE_KEYWORDS = /^(fb|gg|google|seo|taboola|msn|sms|nativ|native|push|tiktok|snap|bing|yahoo|dsp|programmatic)/i;

// v9.51: Deal type keywords — these are NOT geo codes
const DEAL_TYPE_KEYWORDS = new Set([
  'CPA', 'CPL', 'CPS', 'CPC', 'CPM', 'CPI', 'CPO', 'CPR',
  'REVSHARE', 'REV', 'HYBRID', 'FLAT', 'FTD', 'SOI', 'DOI',
  'PPL', 'PPS', 'PPC', 'CRG',
]);

function parseOfferMessageV2(messageText) {
  if (!messageText) return { affiliateId: null, offers: [] };
  const fullText = messageText.trim();
  const headerMatch = fullText.match(/^offers?\s*:\s*(\d+)/i);
  if (!headerMatch) return { affiliateId: null, offers: [] };
  const affiliateId = headerMatch[1];
  let remaining = fullText.slice(headerMatch[0].length).trim();
  if (/(?:^|\n)\s*Geo\s*:/im.test(remaining)) return { affiliateId, offers: parseOfferLabeledFormat(remaining) };
  let sharedFunnels = '', sharedSource = '';
  const sourceMatch = remaining.match(/\bSource\s*:\s*([^\n]+?)(?=\s{2,}Funnels?\s*:|$)/i) || remaining.match(/\bSource\s*:\s*(.+?)$/im);
  if (sourceMatch) { sharedSource = sourceMatch[1].trim(); remaining = remaining.replace(sourceMatch[0], ' ').trim(); }
  const funnelMatch = remaining.match(/\bFunnels?\s*:\s*(.+?)(?=\s{2,}Source\s*:|$)/i) || remaining.match(/\bFunnels?\s*:\s*(.+?)$/im);
  if (funnelMatch) { sharedFunnels = funnelMatch[1].trim().replace(/__/g, '').replace(/\s*\/\s*/g, ' / '); remaining = remaining.replace(funnelMatch[0], ' ').trim(); }
  const lines = remaining.split('\n').map(l => l.trim()).filter(l => l && !/^(funnels?|source)\s*:/i.test(l));
  const offers = [];
  for (const line of lines) offers.push(...offerSplitLine(line));
  for (const o of offers) {
    if (!o.funnel && sharedFunnels) o.funnel = sharedFunnels;
    if (!o.source && sharedSource) o.source = sharedSource;
  }
  return { affiliateId, offers };
}

function parseOfferLabeledFormat(text) {
  const offers = [];
  const blocks = text.split(/\n\s*\n/).map(b => b.trim()).filter(b => b);
  for (const block of blocks) {
    const o = { country:'', dealType:'', funnel:'', price:'', source:'', deduction:'', crRate:'', notes:'' };
    const extra = [];
    for (const line of block.split('\n').map(l => l.trim()).filter(l => l)) {
      const gM = line.match(/^geo\s*:\s*(.+)$/i); if (gM) { o.country = offerExpandGeo(gM[1].trim()); continue; }
      const fM = line.match(/^funnel\s*:\s*(.+)$/i); if (fM) { o.funnel = fM[1].trim().replace(/__/g,''); continue; }
      const pM = line.match(/^price\s*:\s*(.+)$/i); if (pM) { o.price = pM[1].trim(); continue; }
      const sM = line.match(/^source\s*:\s*(.+)$/i); if (sM) { o.source = sM[1].trim(); continue; }
      const cM = line.match(/^cr\s*:?\s*(\d+%?)$/i); if (cM) { o.crRate = cM[1]; continue; }
      const dtM = line.match(/^(?:deal\s*type|type)\s*:\s*(.+)$/i); if (dtM) { o.dealType = dtM[1].trim(); continue; }
      const dM = line.match(/(\d+%)\s*deduct/i) || line.match(/deduct(?:ion)?\s*(\d+%?)/i); if (dM) { o.deduction = dM[1]; continue; }
      extra.push(line);
    }
    if (extra.length) o.notes = extra.join('; ');
    if (o.country) offers.push(o);
  }
  return offers;
}

function offerExpandGeo(t) {
  if (t.length >= 4 && t.length <= 6) {
    const p2 = t.slice(0,2).toUpperCase(), s2 = t.slice(2).toLowerCase();
    if (OFFER_GEO_CODES.has(p2) && OFFER_LANG_CODES.has(s2)) return p2+' '+s2;
    const p3 = t.slice(0,3).toUpperCase(), s3 = t.slice(3).toLowerCase();
    if (OFFER_GEO_CODES.has(p3) && OFFER_LANG_CODES.has(s3)) return p3+' '+s3;
  }
  return t;
}

// v9.51 FIX: Deal type keywords are NOT geo boundaries
function offerIsGeoBoundary(word) {
  if (!word || !/^[A-Z]/.test(word)) return false;
  const upper = word.toUpperCase();
  if (DEAL_TYPE_KEYWORDS.has(upper)) return false;
  if (OFFER_GEO_CODES.has(upper) && word === upper) return true;
  if (word.length >= 4 && word.length <= 6) {
    const p2 = word.slice(0,2).toUpperCase(), s2 = word.slice(2).toLowerCase();
    if (OFFER_GEO_CODES.has(p2) && OFFER_LANG_CODES.has(s2) && word.slice(0,2) === p2) return true;
    const p3 = word.slice(0,3).toUpperCase(), s3 = word.slice(3).toLowerCase();
    if (OFFER_GEO_CODES.has(p3) && OFFER_LANG_CODES.has(s3) && word.slice(0,3) === p3) return true;
  }
  return false;
}

// v9.51 FIX: Deal type keywords are NOT geo codes
function offerExtractGeo(word) {
  if (!word) return null;
  const upper = word.toUpperCase();
  if (DEAL_TYPE_KEYWORDS.has(upper)) return null;
  if (OFFER_GEO_CODES.has(upper)) return { geo: upper, lang: '' };
  if (word.length >= 4 && word.length <= 6) {
    const p2 = word.slice(0,2).toUpperCase(), s2 = word.slice(2).toLowerCase();
    if (OFFER_GEO_CODES.has(p2) && OFFER_LANG_CODES.has(s2)) return { geo: p2, lang: s2 };
    const p3 = word.slice(0,3).toUpperCase(), s3 = word.slice(3).toLowerCase();
    if (OFFER_GEO_CODES.has(p3) && OFFER_LANG_CODES.has(s3)) return { geo: p3, lang: s3 };
  }
  return null;
}

// v10.0: Strip commas from words and handle comma-separated geos like "NL, SE"
function offerSplitLine(line) {
  if (!line.trim()) return [];
  
  const words = line.split(/\s+/).filter(w => w);
  if (words.length === 0) return [];
  
  // Strip trailing commas from words for geo matching
  const cleanWords = words.map(w => w.replace(/,+$/, ''));
  
  const offers = []; let currentTokens = []; let currentOrigTokens = [];
  for (let wi = 0; wi < cleanWords.length; wi++) {
    const word = cleanWords[wi];
    const origWord = words[wi];
    if (offerIsGeoBoundary(word) && currentTokens.length > 0) {
      const hasGeoInCurrent = currentTokens.some(t => offerExtractGeo(t) !== null);
      if (hasGeoInCurrent) {
        offers.push(offerParseTokens(currentTokens, currentOrigTokens));
        currentTokens = [word];
        currentOrigTokens = [origWord];
      } else {
        currentTokens.push(word);
        currentOrigTokens.push(origWord);
      }
    } else { currentTokens.push(word); currentOrigTokens.push(origWord); }
  }
  if (currentTokens.length > 0) offers.push(offerParseTokens(currentTokens, currentOrigTokens));
  
  // v10.0: Handle comma-separated geos sharing one offer (e.g. "NL, SE eng funnels CRG 1200$")
  // If an offer has country but no price/funnel/dealType, it's a bare geo from comma-split
  // Duplicate the next offer for this bare geo
  const finalOffers = [];
  for (let i = 0; i < offers.length; i++) {
    const o = offers[i];
    if (o.country && !o.price && !o.funnel && !o.dealType && i + 1 < offers.length) {
      const nextOffer = offers[i + 1];
      if (nextOffer.country) {
        finalOffers.push({ ...nextOffer, country: o.country });
      }
    } else if (o.country) {
      finalOffers.push(o);
    }
  }
  
  return finalOffers;
}

// v10.0: Rewritten token parser — properly extracts dealType (CRG/CPA/CPL), crRate, funnels, source
// origTokens = original words with commas preserved (for funnel names like "Senvix, Btc Apex")
function offerParseTokens(tokens, origTokens) {
  const o = { country:'', dealType:'', funnel:'', price:'', source:'', deduction:'', crRate:'', notes:'' };
  if (!tokens || tokens.length === 0) return o;
  
  // Use clean tokens for matching, origTokens for funnel name output
  const cleaned = tokens.map(t => t.replace(/^,+|,+$/g, ''));
  const orig = origTokens || tokens; // fallback if no origTokens provided
  let idx = 0;

  // Phase 1: Collect deal type words BEFORE the geo code
  const dealTypeParts = [];
  while (idx < cleaned.length) {
    const geoInfo = offerExtractGeo(cleaned[idx]);
    if (geoInfo) break;
    // v10.1: Also break on $-prefixed prices
    if (/^\d+/.test(cleaned[idx]) && !DEAL_TYPE_KEYWORDS.has(cleaned[idx].toUpperCase())) break;
    if (/^\$\d+/.test(cleaned[idx])) break;
    dealTypeParts.push(cleaned[idx]);
    idx++;
  }
  if (dealTypeParts.length > 0) o.dealType = dealTypeParts.join(' ');

  // Phase 2: Extract geo code
  if (idx < cleaned.length) {
    const geoInfo = offerExtractGeo(cleaned[idx]);
    if (geoInfo) {
      o.country = geoInfo.lang ? geoInfo.geo+' '+geoInfo.lang : geoInfo.geo;
      idx++;
      // Check for language code after geo (e.g. "AT de", "BE fr", "GCC eng")
      if (idx < cleaned.length) {
        const nxt = cleaned[idx].toLowerCase();
        if (OFFER_LANG_CODES.has(nxt) && !/^\d/.test(cleaned[idx]) && !/^[A-Z]{2,3}$/.test(cleaned[idx])) {
          o.country += ' ' + nxt; idx++;
        }
      }
    } else if (dealTypeParts.length === 0) {
      o.country = cleaned[0]; idx = 1;
    }
  }

  // Phase 3: Parse remaining tokens — extract funnels, price, deal type (CRG/CPA after geo), source, crRate
  const funnelParts = [];
  let foundDealTypeAfterGeo = false;
  
  // v10.1 HELPER: Normalize a token that might be a price (strip $ prefix/suffix, handle €)
  function normalizePrice(t) {
    // "$1450" → "1450", "1450$" → "1450", "€1450" → "1450"
    return t.replace(/^[$€£]/, '').replace(/[$€£]$/, '');
  }
  function isPriceToken(t) {
    // Matches: "$1450", "1450$", "1450", "€900", "$1,450", "1400+15%"
    const n = normalizePrice(t);
    return /^\d/.test(n);
  }
  
  for (let i = idx; i < cleaned.length; i++) {
    const t = cleaned[i], tl = t.toLowerCase(), tu = t.toUpperCase();
    const origToken = orig[i]; // Use original (with commas) for funnel names
    
    // Deal type keyword (CRG, CPA, CPL etc) — can appear before or after price
    // Pattern: "Crg 1200$+12%" or "1200$ CRG" or "CRG - 900$+8%"
    if (DEAL_TYPE_KEYWORDS.has(tu)) {
      if (!o.dealType) {
        o.dealType = tu;
      } else if (o.price && !foundDealTypeAfterGeo) {
        // Second deal type after price = notes (e.g. "1250$ CPA 20 Leads Test after that 65$ CPL")
        const remaining = tokens.slice(i).join(' ');
        o.notes = o.notes ? o.notes + '; ' + remaining : remaining;
        break;
      }
      foundDealTypeAfterGeo = true;
      continue;
    }
    
    // Skip dashes (e.g. "CRG - 900$")
    if (t === '-' || t === '–') continue;
    
    // v10.1 FIX: After price is set, a percentage token (N%) is ALWAYS crRate
    // Example: "1450 14%" → price=1450, crRate=14%
    // Example: "$1450 14% Taboola" → price=1450, crRate=14%, source=Taboola
    if (o.price && /^\d+%$/.test(t) && !o.crRate) {
      o.crRate = t;
      continue;
    }
    
    // v10.0: After price is set, small numbers (<=30) are CRG rate if followed by deal type keyword
    // Example: "1450 10 CRG" → price=1450, crRate=10, dealType=CRG
    if (o.price && /^\d+$/.test(t) && !o.crRate) {
      const numVal = parseInt(t);
      if (numVal <= 30) {
        // Check if next token is a deal type keyword
        if (i + 1 < cleaned.length && DEAL_TYPE_KEYWORDS.has(cleaned[i+1].toUpperCase())) {
          o.crRate = t;
          continue;
        }
      }
    }
    
    // Price: number optionally with $/€ prefix and +percentage
    // v10.1 FIX: Handle "$1450", "€900", "1450$" as price tokens
    if (!o.price && isPriceToken(t)) {
      const normalized = normalizePrice(t);
      const numVal = parseInt(normalized);
      // Look ahead — if next token is a deal type keyword, this small number is the CRG rate
      if (numVal <= 30 && i + 1 < cleaned.length && DEAL_TYPE_KEYWORDS.has(cleaned[i+1].toUpperCase())) {
        o.crRate = t;
        continue;
      }
      // Otherwise treat as price
      let ps = normalized;
      while (i+1 < cleaned.length) {
        const nx = cleaned[i+1];
        const nxn = normalizePrice(nx);
        if (/^[\+\*]$/.test(nx)) { ps += nx; i++; }
        else if (/^[\+\*]\d+/.test(nx)) { ps += nx; i++; }
        else if (/^\d+%?$/.test(nxn) && /[\+\*]$/.test(ps)) { ps += nxn; i++; }
        else break;
      }
      o.price = ps.replace(/\s+/g, '');
      // Extract CRG rate from price if it has +N% pattern (e.g. "1200$+12%")
      const crgMatch = o.price.match(/\+(\d+%?)$/);
      if (crgMatch) {
        o.crRate = crgMatch[1];
      }
      continue;
    }
    if (/^\+\d+%?$/.test(t)) { 
      if (o.price) { 
        o.price += t; 
        // Extract CRG rate
        const crgMatch = t.match(/^\+(\d+%?)$/);
        if (crgMatch) {
          o.crRate = crgMatch[1];
        }
      } else o.price = t; 
      continue; 
    }
    
    // Deductions
    if (/deduct/i.test(t)) { const nx = cleaned[i+1]; if (nx && /^\d+%?$/.test(nx)) { o.deduction = nx; i++; } continue; }
    if (/^\d+%$/.test(t) && i+1 < cleaned.length && /deduct/i.test(cleaned[i+1])) { o.deduction = t; i++; continue; }
    
    // CR rate standalone
    if (/^cr$/i.test(t) && i+1 < cleaned.length && /^\d/.test(cleaned[i+1])) { o.crRate = cleaned[i+1]; i++; continue; }
    
    // "Funnel" or "Funnels" keyword as inline label — next tokens are funnel names
    if (/^funnels?$/i.test(t)) {
      // Collect everything after "Funnel" keyword as funnel name (until next geo or end)
      const funnelRest = [];
      for (let j = i+1; j < cleaned.length; j++) {
        const ft = cleaned[j];
        if (offerIsGeoBoundary(ft)) break;
        funnelRest.push(orig[j]); // Use original tokens to preserve commas
      }
      if (funnelRest.length > 0) {
        const funnelStr = funnelRest.join(' ').replace(/__/g, '').trim();
        o.funnel = o.funnel ? o.funnel + ', ' + funnelStr : funnelStr;
        i += funnelRest.length;
      }
      continue;
    }
    
    // Source keywords (GG, FB, SEO, Taboola, etc.)
    if (!o.source && OFFER_SOURCE_KEYWORDS.test(tl)) { o.source = t; continue; }
    
    // Everything else goes to funnels — use original token to preserve commas
    funnelParts.push(origToken);
  }
  
  if (funnelParts.length > 0) {
    const funnelStr = funnelParts.join(' ').replace(/__/g, '').replace(/\s*,\s*/g, ', ').trim();
    o.funnel = o.funnel ? funnelStr + ', ' + o.funnel : funnelStr;
  }
  
  // v10.1 FIX: Auto-detect CRG deal type whenever crRate% is present (not just from +N% price pattern)
  if (!o.dealType && o.crRate) {
    o.dealType = 'CRG';
  }
  // v10.0: Auto-detect CRG deal type from price pattern (e.g. "1000$+8%" implies CRG)
  if (!o.dealType && o.price && /\+\d+%/.test(o.price)) {
    o.dealType = 'CRG';
    const crgMatch = o.price.match(/\+(\d+%?)$/);
    if (crgMatch && !o.crRate) o.crRate = crgMatch[1];
  }
  
  return o;
}

// v9.51: Consolidated batch offer confirmation message
function formatBatchOfferConfirmation(affiliateId, offers) {
  const numEmojis = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
  let msg = `✅ Added ${offers.length} offer(s) for Affiliate #${affiliateId}:\n`;
  offers.forEach((o, i) => {
    const num = i < numEmojis.length ? numEmojis[i] : `${i+1}.`;
    const parts = [];
    if (o.dealType) parts.push(`Type: ${o.dealType}`);
    parts.push(o.country || '?');
    if (o.funnel) parts.push(o.funnel);
    if (o.price) parts.push(o.price);
    if (o.source) parts.push(o.source);
    if (o.deduction) parts.push(`deduct ${o.deduction}`);
    if (o.crRate) parts.push(`CR ${o.crRate}`);
    if (o.notes) parts.push(o.notes);
    msg += `${num} ${parts.join(' | ')}\n`;
  });
  return msg;
}

// v9.51: Send batch offer confirmation to Telegram
function sendBatchOfferNotification(affiliateId, offers) {
  if (TELEGRAM_TOKEN === "YOUR_BOT_TOKEN_HERE" || !TELEGRAM_TOKEN) {
    console.log("📱 Batch offer notification skipped (no token configured)");
    return;
  }
  const message = formatBatchOfferConfirmation(affiliateId, offers);
  const postData = JSON.stringify({ chat_id: OFFER_GROUP_CHAT_ID, text: message, parse_mode: "HTML" });
  const options = { hostname: 'api.telegram.org', port: 443, path: `/bot${TELEGRAM_TOKEN}/sendMessage`, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) } };
  const req = https.request(options, (res) => { let d = ''; res.on('data', c => d += c); res.on('end', () => { if (res.statusCode !== 200) console.log("❌ Batch offer notification error:", d); else console.log(`✅ Batch offer notification sent: ${offers.length} offers for affiliate ${affiliateId}`); }); });
  req.on('error', err => console.error("❌ Batch offer notification error:", err.message));
  req.write(postData); req.end();
}

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
  // v11.02 M5: wrapped in try/catch — disk full or permission errors should not crash the server
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

  const endpoints = ["payments", "customer-payments", "users", "crg-deals", "daily-cap", "deals", "wallets", "offers", "ftd-entries", "daily-calcs-data"];
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

// v9.16: STARTUP INTEGRITY CHECK — restore from best available backup
// Cascades: shutdown backups → hourly backups → daily snapshots
(function startupIntegrityCheck() {
  try {
    const endpoints = ["payments", "customer-payments", "crg-deals", "daily-cap", "deals", "offers", "partners", "ftd-entries", "daily-calcs-data"];
    
    // Collect ALL backup sources in priority order
    const backupSources = [];
    
    // 1. Shutdown backups (highest priority)
    try {
      const shutdownDirs = fs.readdirSync(BACKUP_DIR).filter(d => d.startsWith("shutdown-")).sort().reverse();
      shutdownDirs.forEach(d => backupSources.push({ path: path.join(BACKUP_DIR, d), label: `shutdown/${d}` }));
    } catch {}
    
    // 2. Hourly/startup backups
    try {
      const allBackups = fs.readdirSync(BACKUP_DIR).filter(d => !d.startsWith("shutdown-") && !d.startsWith("safety-")).sort().reverse();
      allBackups.forEach(d => backupSources.push({ path: path.join(BACKUP_DIR, d), label: `backup/${d}` }));
    } catch {}
    
    // 3. Daily snapshots (last resort)
    const SNAPSHOT_DIR = path.join(__dirname, "snapshots");
    try {
      if (fs.existsSync(SNAPSHOT_DIR)) {
        const snapDirs = fs.readdirSync(SNAPSHOT_DIR).sort().reverse();
        snapDirs.forEach(d => backupSources.push({ path: path.join(SNAPSHOT_DIR, d), label: `snapshot/${d}` }));
      }
    } catch {}
    
    if (backupSources.length === 0) { console.log("📋 No backups found — skipping integrity check"); return; }
    
    let restored = 0;
    endpoints.forEach(ep => {
      const dataFile = path.join(DATA_DIR, ep + ".json");
      let currentData = [];
      if (fs.existsSync(dataFile)) {
        try { currentData = JSON.parse(fs.readFileSync(dataFile, "utf8")); } catch { currentData = []; }
      }
      if (!Array.isArray(currentData)) currentData = [];
      
      // Find the best backup for this endpoint
      for (const source of backupSources) {
        const backupFile = path.join(source.path, ep + ".json");
        if (!fs.existsSync(backupFile)) continue;
        try {
          const backupData = JSON.parse(fs.readFileSync(backupFile, "utf8"));
          if (!Array.isArray(backupData) || backupData.length === 0) continue;
          
          // Restore if current data is significantly smaller (or empty)
          if (currentData.length < backupData.length * 0.5 && backupData.length > 3) {
            console.log(`🔧 STARTUP RESTORE [${ep}]: current=${currentData.length}, backup=${backupData.length} (from ${source.label}). Restoring.`);
            fs.writeFileSync(dataFile, JSON.stringify(backupData, null, 2), "utf8");
            currentData = backupData; // Update so we don't try lower-priority sources
            restored++;
            break; // Found good backup, stop looking
          } else {
            break; // Current data is fine relative to this backup, stop looking
          }
        } catch {}
      }
    });
    if (restored > 0) console.log(`🔧 STARTUP: Restored ${restored} data files from backups`);
    else console.log(`✅ STARTUP: All data files pass integrity check`);
  } catch (e) { console.error("⚠️ Startup integrity check error:", e.message); }
})();

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

  const endpoints = ["payments", "customer-payments", "users", "crg-deals", "daily-cap", "deals", "wallets", "offers", "ftd-entries", "daily-calcs-data", "partners"];
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
      // v10.1 FIX: Use record ID as primary dedup key
      if (r.id && seen.has(r.id)) {
        const existing = seen.get(r.id);
        if (Object.keys(r).length > Object.keys(existing).length) seen.set(r.id, r);
      } else if (r.id) {
        seen.set(r.id, r);
      } else {
        // Legacy record without ID — use composite key
        const fallbackKey = `noid|${(r.date || '').trim()}|${(r.agent || '').trim().toLowerCase()}|${(r.affiliate || '').trim().toLowerCase()}|${(r.brokerCap || '').trim().toLowerCase()}`;
        if (!seen.has(fallbackKey)) seen.set(fallbackKey, r);
      }
    });
    const deduped = Array.from(seen.values());
    if (deduped.length < dc.length) {
      const removed = dc.length - deduped.length;
      await lockedWrite("daily-cap.json", deduped, { action: "auto-dedup", user: "system", details: `Nightly cleanup: removed ${removed} exact duplicates` });
      totalRemoved += removed;
    }
  } catch (err) { console.error("⚠️ Dedup daily-cap error:", err.message); }

  // Dedup crg-deals
  try {
    const crg = readJSON("crg-deals.json", []);
    const seen = new Map();
    crg.forEach(r => {
      // v10.1 FIX: Use record ID as primary dedup key — composite keys collapsed different legitimate deals
      if (r.id && seen.has(r.id)) {
        const existing = seen.get(r.id);
        if (Object.keys(r).length > Object.keys(existing).length) seen.set(r.id, r);
      } else if (r.id) {
        seen.set(r.id, r);
      } else {
        // Legacy record without ID — use composite key
        const fallbackKey = `noid|${(r.date || '').trim()}|${(r.affiliate || '').trim().toLowerCase()}|${(r.brokerCap || '').trim().toLowerCase()}`;
        if (!seen.has(fallbackKey)) seen.set(fallbackKey, r);
      }
    });
    const deduped = Array.from(seen.values());
    if (deduped.length < crg.length) {
      const removed = crg.length - deduped.length;
      await lockedWrite("crg-deals.json", deduped, { action: "auto-dedup", user: "system", details: `Nightly cleanup: removed ${removed} exact duplicates` });
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
    cleanupTombstones(); // v10.0: prune expired tombstones
    setInterval(nightlyDedup, 24 * 60 * 60 * 1000);
    setInterval(cleanupTombstones, 24 * 60 * 60 * 1000);
  }, delay3);

  console.log(`⏰ Nightly tasks scheduled: snapshot at 02:00 (in ${Math.round(delay2/60000)}min), dedup+tombstone cleanup at 03:00`);
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

// v10.05: Save throttle — prevent excessive saves from same user+table
// Diagnostics showed 74 crg-deals saves/day from one user (autosave loop)
const saveThrottleMap = new Map(); // key="user|table" → lastSaveAt
const SAVE_THROTTLE_MS = 3000; // Minimum 3 seconds between saves per user+table
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

// v10.1: Auto-ban IPs that hit blocked paths repeatedly
const ipBanMap = new Map(); // ip → { count, firstSeen, banned }
const IP_BAN_THRESHOLD = 15; // 15 blocked requests = auto-ban
const IP_BAN_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const IP_BAN_WINDOW = 60 * 60 * 1000; // Count within 1 hour

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
// v10.1: Rate-limit audit logging for repeated blocked requests (same IP+path)
const blockedRequestLog = new Map(); // key="ip|path" → lastLoggedAt
const BLOCKED_LOG_COOLDOWN = 3600000; // Only log same IP+path combo once per hour

app.use((req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  
  // v10.1: Check if IP is auto-banned
  const banEntry = ipBanMap.get(ip);
  if (banEntry && banEntry.banned) {
    if (Date.now() - banEntry.bannedAt < IP_BAN_DURATION) {
      return res.status(403).json({ error: "Forbidden" });
    }
    ipBanMap.delete(ip); // Ban expired
  }
  
  const blocked = ['/wp-admin', '/wp-login', '/.env', '/phpinfo', '/admin.php', '/.git', '/config', '/xmlrpc', '/@fs/', '/../', '/..%2f', '/.htaccess', '/web.config', '/composer.json', '/package.json'];
  if (blocked.some(b => req.path.toLowerCase().includes(b))) {
    const logKey = `${ip}|${req.path}`;
    const now = Date.now();
    const lastLogged = blockedRequestLog.get(logKey) || 0;
    if (now - lastLogged > BLOCKED_LOG_COOLDOWN) {
      // v10.05: Skip audit logging for localhost — Nginx/health checks create noise (50+/day)
      if (ip !== '127.0.0.1' && ip !== '::1' && ip !== '::ffff:127.0.0.1') {
        writeAuditLog("security", "blocked_request", "unknown", `Path: ${req.path} IP: ${ip}`);
      }
      blockedRequestLog.set(logKey, now);
    }
    // v10.1: Track and auto-ban aggressive scanners (not localhost)
    if (ip !== '127.0.0.1' && ip !== '::1') {
      const entry = ipBanMap.get(ip) || { count: 0, firstSeen: now };
      if (now - entry.firstSeen > IP_BAN_WINDOW) { entry.count = 0; entry.firstSeen = now; }
      entry.count++;
      if (entry.count >= IP_BAN_THRESHOLD) {
        entry.banned = true; entry.bannedAt = now;
        writeAuditLog("security", "ip_auto_banned", "system", `IP ${ip} banned for 24h after ${entry.count} blocked requests`);
        console.log(`🛡️ AUTO-BAN: ${ip} (${entry.count} blocked requests in ${Math.round((now - entry.firstSeen)/1000)}s)`);
      }
      ipBanMap.set(ip, entry);
    }
    // Cleanup old entries every so often
    if (blockedRequestLog.size > 500) {
      for (const [k, t] of blockedRequestLog) {
        if (now - t > BLOCKED_LOG_COOLDOWN * 2) blockedRequestLog.delete(k);
      }
    }
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

const endpoints = ["payments", "customer-payments", "users", "crg-deals", "daily-cap", "deals", "wallets", "offers", "ftd-entries", "daily-calcs-data", "partners"];

// ═══════════════════════════════════════════════════════════════
// v9.18: NOTIFICATION DEDUP — prevent looping Telegram messages
// ═══════════════════════════════════════════════════════════════
// When client saves ALL payments, server compares vs file on disk.
// v10.1: Hash-based notification dedup — prevents duplicate messages when same payment hash
// exists in both payments and customer-payments tables
const notifiedHashes = new Set();
setInterval(() => { if (notifiedHashes.size > 5000) notifiedHashes.clear(); }, 30 * 60 * 1000);

// If server file was reset/restored, every old payment looks "new" → notification flood.
// Fix: Track which payment IDs already got a "new" notification.
const notifiedPaymentIds = new Set();
const notifiedTransitions = new Set();
// v10.05: Pre-load BOTH IDs and hashes from existing data — prevents notification flood after restart
try {
  const existingPayments = readJSON("payments.json", []);
  existingPayments.forEach(p => {
    if (p && p.id) notifiedPaymentIds.add(p.id);
    if (p && p.paymentHash) notifiedHashes.add(p.paymentHash);
  });
  const existingCP = readJSON("customer-payments.json", []);
  existingCP.forEach(p => {
    if (p && p.id) notifiedPaymentIds.add(p.id);
    if (p && p.paymentHash) notifiedHashes.add(p.paymentHash);
  });
  console.log(`🔔 Notification dedup: ${notifiedPaymentIds.size} IDs + ${notifiedHashes.size} hashes pre-loaded`);
} catch (e) {}
// Cleanup every 10 min
setInterval(() => { if (notifiedPaymentIds.size > 10000) notifiedPaymentIds.clear(); }, 10 * 60 * 1000);

// GET — returns data + version number (REQUIRES AUTH)
// v9.16: Track last known record counts to detect data loss on GET
const lastKnownServerCounts = {};
endpoints.forEach(ep => {
  const file = ep + ".json";
  app.get(`/api/${ep}`, requireAuth, (req, res) => {
    let data = readJSON(file, []);
    // FIX C2: Strip password hashes from user data — NEVER expose to client
    // v11.01: Always include pageAccess + lastLogin; never return undefined pageAccess (would wipe permissions on client)
    if (ep === "users") {
      const ALL_PAGES_KEYS = ["overview","payments","customer-payments","crg-deals","daily-cap","offers","partners","blitz-report","ftd-info","daily-calcs","admin"];
      data = data.map(u => ({
        email: u.email,
        name: u.name,
        pageAccess: Array.isArray(u.pageAccess) ? u.pageAccess : ALL_PAGES_KEYS,
        lastLogin: u.lastLogin || null,
        updatedAt: u.updatedAt || null,
      }));
    }
    // v9.16: Detect and log if a table went empty unexpectedly
    const prevCount = lastKnownServerCounts[ep] || 0;
    if (data.length === 0 && prevCount > 5) {
      console.error(`🔴 DATA LOSS DETECTED [${ep}]: returning 0 records, last known count was ${prevCount}. Attempting backup recovery.`);
      writeAuditLog(ep, "data_loss_detected", req.user?.email || "unknown", `[${ep}] GET returned 0 records, last known=${prevCount}. Triggering recovery.`);
      // Try to recover from any backup
      const recovered = readJSON(file, []); // readJSON already tries backups
      if (recovered.length > 0) {
        data = recovered;
        console.log(`🔧 RECOVERED [${ep}]: ${recovered.length} records from backup`);
      }
    }
    if (data.length > 0) lastKnownServerCounts[ep] = data.length;
    // v10.06: Include tombstoned IDs AND filter them from response data
    // This ensures clients never receive zombie records, even if their localStorage has them
    const tombstonedSet = getTombstonedIds(ep);
    const tombstoned = [...tombstonedSet];
    if (tombstonedSet.size > 0 && ep !== 'users') {
      const before = data.length;
      data = data.filter(r => !r || !r.id || !tombstonedSet.has(r.id));
      if (data.length < before) {
        console.log(`🪦 GET [${ep}]: Filtered ${before - data.length} tombstoned records from response`);
      }
    }
    res.json({ data, version: getVersion(ep), timestamp: Date.now(), tombstoned });
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

  // ═══════════════════════════════════════════════════════════
  // NOTIFICATION LOGIC — v9.18: Prevent looping + duplicate messages
  // ═══════════════════════════════════════════════════════════
  // ROOT CAUSE of loops: Client sends ALL payments on every save.
  // If server file was reset/restored, every old payment looks "new" → flood.
  // FIX: Track notified payment IDs in memory. Only notify truly new ones.
  // FIX2: For "Approved to pay" — send ONLY the approved message, not "NEW PAYMENT ADDED" too.
  
  const oldPayments = readJSON("payments.json", []);
  const oldMap = new Map(oldPayments.map(p => [p.id, p]));
  
  payments.forEach(p => {
    if (!p || !p.id) return;
    const oldP = oldMap.get(p.id);
    
    if (!oldP) {
      // ── NEW PAYMENT ──
      // Guard: skip if already notified (prevents loop when client re-sends all payments)
      if (notifiedPaymentIds.has(p.id)) return;
      notifiedPaymentIds.add(p.id);
      // v10.1: Hash-based dedup — skip if this payment hash already triggered a notification
      if (p.paymentHash && notifiedHashes.has(p.paymentHash)) return;
      if (p.paymentHash) notifiedHashes.add(p.paymentHash);
      
      if (p.status === "Paid") {
        sendAffiliatePaymentNotification(p, true);
      } else if (p.status === "Approved to pay") {
        // ONLY send approved notification — NOT "new payment added" (was sending both)
        sendApprovedToPayNotification(p);
      } else if (["Open", "On the way"].includes(p.status)) {
        sendAffiliatePaymentNotification(p, false);
      }
      
    } else if (oldP.status !== p.status) {
      // ── STATUS CHANGED ──
      // Guard: prevent duplicate notifications for same transition
      const transKey = `${p.id}:${oldP.status}->${p.status}`;
      if (notifiedTransitions.has(transKey)) return;
      notifiedTransitions.add(transKey);
      setTimeout(() => notifiedTransitions.delete(transKey), 60000);
      // v10.1: Hash-based dedup
      if (p.paymentHash && notifiedHashes.has(p.paymentHash)) return;
      if (p.paymentHash) notifiedHashes.add(p.paymentHash);
      
      if (p.status === "Paid") {
        sendAffiliatePaymentNotification(p, true);
      }
      else if (p.status === "Approved to pay") {
        // ONLY "Approved to pay" message — no "NEW PAYMENT ADDED" alongside it
        sendApprovedToPayNotification(p);
      }
      else if (["Open", "On the way"].includes(p.status) && oldP.status === "Paid") {
        // Re-opened from Paid
        sendAffiliatePaymentNotification(p, false);
      }
    }
  });

  // ═══════════════════════════════════════════════════════════
  // SERVER-SIDE MERGE — v10.05: Fixed phantom record save loop
  // ═══════════════════════════════════════════════════════════
  const serverData = readJSON("payments.json", []);
  
  // v10.05: Process deletes FIRST — tombstone before merge
  const deleteSet = new Set(Array.isArray(deletedIDs) ? deletedIDs : []);
  if (deleteSet.size > 0) {
    addTombstones("payments", [...deleteSet]);
  }
  
  // Load ALL tombstones (including freshly added ones)
  const tombstonedIds = getTombstonedIds("payments");
  
  // Build merged result: server records EXCLUDING tombstoned
  const mergedMap = new Map();
  let serverTombstoneFiltered = 0;
  serverData.forEach(r => {
    if (!r || !r.id) return;
    if (tombstonedIds.has(r.id)) { serverTombstoneFiltered++; return; }
    mergedMap.set(r.id, r);
  });
  
  let clientNew = 0, clientUpdated = 0, clientResurrectionBlocked = 0;
  const clientIDs = new Set();
  payments.forEach(r => {
    if (!r || !r.id) return;
    clientIDs.add(r.id);
    
    // v10.05: Block ANY tombstoned record from client
    if (tombstonedIds.has(r.id)) {
      clientResurrectionBlocked++;
      return;
    }
    
    const srv = mergedMap.get(r.id);
    if (!srv) {
      r.updatedAt = r.updatedAt || Date.now();
      mergedMap.set(r.id, r);
      clientNew++;
    } else {
      // v10.07: STATUS-AWARE MERGE for payments
      // Prevent status regression: if server has "Paid"/"Archived" and client has "Open",
      // server wins on status regardless of timestamps. This prevents stale clients
      // from reverting confirmed payments back to Open.
      const STATUS_PRIORITY = { 'Open': 0, 'Pending': 1, 'Processing': 2, 'Paid': 3, 'Archived': 4 };
      const srvPriority = STATUS_PRIORITY[srv.status] ?? 0;
      const clientPriority = STATUS_PRIORITY[r.status] ?? 0;
      
      if (clientPriority < srvPriority) {
        // Client is trying to regress status (e.g. Paid → Open) — BLOCK
        // Keep server version entirely, but merge non-status fields if client is newer
        const clientTime = r.updatedAt || 0;
        const serverTime = srv.updatedAt || 0;
        if (clientTime > serverTime) {
          // Client has other edits — merge them but preserve server status
          mergedMap.set(r.id, { ...r, status: srv.status, updatedAt: srv.updatedAt || Date.now() });
        }
        // else: server version is newer overall, keep it entirely
        clientUpdated++;
      } else {
        // Normal LWW merge — client status is same or higher priority
        const clientTime = r.updatedAt || 0;
        const serverTime = srv.updatedAt || 0;
        if (clientTime >= serverTime) {
          r.updatedAt = r.updatedAt || Date.now();
          mergedMap.set(r.id, r);
        }
        // else: server version is newer, keep it
        clientUpdated++;
      }
    }
  });
  
  if (clientResurrectionBlocked > 0) {
    console.log(`🪦 [payments]: Blocked ${clientResurrectionBlocked} tombstoned records`);
  }
  
  const serverOnly = serverData.filter(r => r && r.id && !clientIDs.has(r.id) && !tombstonedIds.has(r.id));
  
  if (deleteSet.size > 0) {
    console.log(`🗑️ [payments]: ${deleteSet.size} record(s) deleted + tombstoned`);
  }
  
  const merged = Array.from(mergedMap.values());
  
  if (clientNew > 0 || serverOnly.length > 0) {
    console.log(`🔀 MERGE [payments]: client_sent=${payments.length} server_had=${serverData.length} → merged=${merged.length} (new=${clientNew}, preserved=${serverOnly.length}${clientResurrectionBlocked > 0 ? `, resurrection_blocked=${clientResurrectionBlocked}` : ''})`);
  }

  // Atomic write
  const success = await lockedWrite("payments.json", merged, {
    action: "update", user: userEmail || "unknown", details: `[payments] ${merged.length} records (merge: +${clientNew} new, ${serverOnly.length} preserved)`
  });

  if (success) {
    broadcastUpdate("payments", merged, [...deleteSet]);
    res.json({ ok: true, count: merged.length, version: getVersion("payments"), merged: true, deletedAcknowledged: [...deleteSet], tombstoned: [...tombstonedIds] });
  } else {
    res.status(500).json({ error: "Write failed — data not saved" });
  }
});

// Generic POST for other tables — SERVER-SIDE MERGE (never destructive replace)
["customer-payments", "crg-deals", "daily-cap", "deals", "wallets", "offers", "ftd-entries", "daily-calcs-data"].forEach(ep => {
  const file = ep + ".json";
  app.post(`/api/${ep}`, requireAuth, async (req, res) => {
    const { data: newData, version: clientVersion, user: userEmail, deleted: deletedIDs } = req.body;
    const records = Array.isArray(req.body) ? req.body : newData;
    if (!Array.isArray(records)) return res.status(400).json({ error: "Invalid data format" });
    if (records.length > 10000) return res.status(400).json({ error: "Too many records" });

    // v10.05: Save throttle — reject rapid-fire saves from same user+table
    const throttleKey = `${userEmail || 'unknown'}|${ep}`;
    const lastSave = saveThrottleMap.get(throttleKey) || 0;
    const now = Date.now();
    if (now - lastSave < SAVE_THROTTLE_MS) {
      return res.json({ ok: true, count: readJSON(file, []).length, version: getVersion(ep), throttled: true });
    }
    saveThrottleMap.set(throttleKey, now);
    // Cleanup old entries periodically
    if (saveThrottleMap.size > 200) {
      for (const [k, t] of saveThrottleMap) { if (now - t > 60000) saveThrottleMap.delete(k); }
    }

    // C3 FIX: Declare deleteSet at outer scope — was inside if block, causing ReferenceError below
    const deleteSet = new Set(Array.isArray(deletedIDs) ? deletedIDs : []);

    if (records.length === 0) {
      const existing = readJSON(file, []);
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
    // v10.05: Removed hard_block and stale_block — server-side merge is non-destructive,
    // so stale clients can't cause data loss. The old 50% threshold was causing deadlocks
    // where users couldn't save at all (74+ failed saves/day in diagnostics).
    // The merge logic below preserves ALL server records regardless of what client sends.

    // v10.28: DEALS HARD GUARD — if client sends < 20% of server records AND no explicit deletes,
    // the client is almost certainly stale (e.g. fresh browser, cleared localStorage).
    // Return server data so the client syncs up without performing any merge.
    // This prevents the "4 records" collapse observed on 2026-03-12 in diagnostics.
    if (ep === 'deals' && existingBeforeMerge.length > 20 && records.length < existingBeforeMerge.length * 0.2 && deleteSet.size === 0) {
      console.warn(`🛑 DEALS GUARD [deals]: client sent ${records.length} records but server has ${existingBeforeMerge.length}. Client appears stale — returning server data without merge.`);
      writeAuditLog('deals', 'stale_client_blocked', userEmail || 'unknown', `[deals] Stale client blocked: client=${records.length} server=${existingBeforeMerge.length} — no merge performed`);
      const tombstonedNow = getTombstonedIds('deals');
      const serverFiltered = existingBeforeMerge.filter(r => !r || !r.id || !tombstonedNow.has(r.id));
      return res.json({ ok: true, count: serverFiltered.length, version: getVersion(ep), unchanged: true, data: serverFiltered, tombstoned: [...tombstonedNow] });
    }

    // SPECIAL HANDLING: customer-payments status change notifications
    if (ep === "customer-payments") {
      const oldRecords = readJSON("customer-payments.json", []);
      const oldMap = new Map(oldRecords.map(p => [p.id, p]));
      records.forEach(cp => {
        if (!cp || !cp.id) return;
        const oldCp = oldMap.get(cp.id);
        if (!oldCp) {
          // v9.18: Skip if already notified (prevents loop)
          if (notifiedPaymentIds.has(cp.id)) return;
          notifiedPaymentIds.add(cp.id);
          // v10.1: Hash-based dedup — skip if this hash already sent a notification from payments table
          if (cp.paymentHash && notifiedHashes.has(cp.paymentHash)) return;
          if (cp.paymentHash) notifiedHashes.add(cp.paymentHash);
          
          if (cp.status === "Received") {
            sendBrandPaymentNotification(cp);
          } else {
            sendAffiliatePaymentNotification(cp, false);
          }
        } else if (oldCp.status !== cp.status) {
          if (cp.status === "Received" && oldCp.status !== "Received") {
            sendBrandPaymentNotification(cp);
          }
        }
      });
    }

    // ═══════════════════════════════════════════════════════════
    // SERVER-SIDE MERGE — v10.05: Fixed phantom record save loop
    // ═══════════════════════════════════════════════════════════
    // v10.05 FIX: Process deletes FIRST, THEN merge. Old order was:
    //   1. Build mergedMap from server  2. Layer client on top  3. Delete from mergedMap
    // This caused "phantom records": server-only records that were in deleteSet
    // got added to mergedMap in step 1, survived step 2 (client didn't send them),
    // and were only removed in step 3 — but the "serverOnly" count in logs showed
    // them as "preserved", confusing the client into re-saving.
    // New order: 1. Tombstone deletes  2. Build mergedMap (excluding tombstoned)  3. Layer client

    const serverData = readJSON(file, []);
    
    // v10.05: Process explicit deletes FIRST — tombstone before merge
    if (deleteSet.size > 0) {
      addTombstones(ep, [...deleteSet]);
      writeAuditLog(ep, "delete", userEmail || "unknown", `[${ep}] ${deleteSet.size} record(s) deleted by user | IDs: ${[...deleteSet].slice(0, 5).join(', ')}${deleteSet.size > 5 ? '...' : ''}`);
    }
    
    // v10.05: Load ALL tombstones (including freshly added ones from deleteSet above)
    const tombstonedIds = getTombstonedIds(ep);
    
    // Build merged result: start with server records, EXCLUDING tombstoned ones
    const mergedMap = new Map();
    let serverTombstoneFiltered = 0;
    serverData.forEach(r => {
      if (!r || !r.id) return;
      if (tombstonedIds.has(r.id)) { serverTombstoneFiltered++; return; } // v10.05: Don't add tombstoned server records
      mergedMap.set(r.id, r);
    });
    
    let clientNew = 0, clientUpdated = 0, clientResurrectionBlocked = 0;
    const clientIDs = new Set();
    records.forEach(r => {
      if (!r || !r.id) return;
      clientIDs.add(r.id);
      
      // v10.05: Block ANY tombstoned record from client — whether or not it's on server
      if (tombstonedIds.has(r.id)) {
        clientResurrectionBlocked++;
        return;
      }
      
      const srv = mergedMap.get(r.id);
      if (!srv) {
        // New record from client — KEEP (stamp updatedAt if not present)
        r.updatedAt = r.updatedAt || Date.now();
        mergedMap.set(r.id, r);
        clientNew++;
      } else {
        // v10.07: Status-aware merge — prevent status regression on tables with status field
        // Applies to: payments, customer-payments, deals (any table with a status field)
        const STATUS_PRIORITY = { 'Open': 0, 'Pending': 1, 'Processing': 2, 'Confirmed': 3, 'Received': 3, 'Paid': 3, 'Archived': 4 };
        const srvStatus = srv.status;
        const clientStatus = r.status;
        const srvPri = STATUS_PRIORITY[srvStatus] ?? -1;
        const clientPri = STATUS_PRIORITY[clientStatus] ?? -1;
        
        const clientTime = r.updatedAt || 0;
        const serverTime = srv.updatedAt || 0;
        
        if (srvPri >= 0 && clientPri >= 0 && clientPri < srvPri) {
          // Client is regressing status — protect server status
          if (clientTime > serverTime) {
            // Client has other field edits — merge them but keep server status
            mergedMap.set(r.id, { ...r, status: srvStatus, updatedAt: srv.updatedAt || Date.now() });
          }
          // else: server is newer overall, keep it entirely
        } else {
          // Normal LWW merge
          if (clientTime >= serverTime) {
            r.updatedAt = r.updatedAt || Date.now();
            mergedMap.set(r.id, r);
          }
        }
        clientUpdated++;
      }
    });
    
    if (clientResurrectionBlocked > 0) {
      console.log(`🪦 [${ep}]: Blocked ${clientResurrectionBlocked} tombstoned records from client`);
    }
    if (serverTombstoneFiltered > 0) {
      console.log(`🪦 [${ep}]: Filtered ${serverTombstoneFiltered} tombstoned records from server data`);
    }
    
    // Records on server but NOT in client payload (and not tombstoned — already filtered above):
    // These could be records added by OTHER users that this client hasn't seen yet.
    // KEEP THEM — never delete other users' work.
    const serverOnly = serverData.filter(r => r && r.id && !clientIDs.has(r.id) && !tombstonedIds.has(r.id));
    
    if (deleteSet.size > 0) {
      console.log(`🗑️ [${ep}]: ${deleteSet.size} record(s) deleted + tombstoned (server_filtered=${serverTombstoneFiltered})`);
    }
    
    const merged = Array.from(mergedMap.values());
    
    // ═══════════════════════════════════════════════════════════
    // DEDUPLICATION — v10.0 FIX: Use record ID (unique) not date+affiliate
    // ═══════════════════════════════════════════════════════════
    // Previous bug: dedup key was `date__affiliate` which silently deleted
    // different deals for the same affiliate on the same date.
    // Now: dedup only uses the composite key that matches nightly dedup,
    // including brokerCap, so different broker deals are preserved.
    let deduped = merged;
    if (ep === "daily-cap") {
      // v10.1 FIX: Use record ID as primary dedup key — composite keys were too aggressive
      const seen = new Map();
      for (const r of merged) {
        if (r.id && seen.has(r.id)) {
          // Same ID appeared twice — keep the one with more data
          const existing = seen.get(r.id);
          const existTotal = (parseInt(existing.affiliates) || 0) + (parseInt(existing.brands) || 0);
          const newTotal = (parseInt(r.affiliates) || 0) + (parseInt(r.brands) || 0);
          if (newTotal > existTotal) { seen.set(r.id, r); }
        } else if (r.id) {
          seen.set(r.id, r);
        } else {
          // Record has no ID — use composite key as fallback
          const fallbackKey = `${(r.date || '').trim()}|${(r.agent || "").trim().toLowerCase()}|${(r.affiliate || "").trim().toLowerCase()}|${(r.brokerCap || "").trim().toLowerCase()}`;
          if (!seen.has(fallbackKey)) seen.set(fallbackKey, r);
        }
      }
      deduped = Array.from(seen.values());
      if (deduped.length < merged.length) console.log(`🧹 DEDUP [daily-cap]: ${merged.length} → ${deduped.length} (removed ${merged.length - deduped.length} exact duplicates)`);
    }
    if (ep === "crg-deals") {
      // v10.1 FIX: Use record ID as primary dedup key — composite keys were collapsing
      // different legitimate deals (same affiliate+broker+date but different caps/funnels).
      // Now: only dedup truly identical records (same ID), never merge different records.
      const seen = new Map();
      for (const r of merged) {
        if (r.id && seen.has(r.id)) {
          // Same ID appeared twice — keep the one with more data
          const existing = seen.get(r.id);
          const existScore = (existing.started ? 1 : 0) + (parseInt(existing.capReceived) || 0) + (parseInt(existing.ftd) || 0);
          const newScore = (r.started ? 1 : 0) + (parseInt(r.capReceived) || 0) + (parseInt(r.ftd) || 0);
          if (newScore > existScore) { seen.set(r.id, r); }
        } else if (r.id) {
          seen.set(r.id, r);
        } else {
          // Record has no ID — use composite key as fallback
          const fallbackKey = `${(r.date || '').trim()}|${(r.affiliate || "").trim().toLowerCase()}|${(r.brokerCap || "").trim().toLowerCase()}|${(r.cap || "").toString().trim()}`;
          if (!seen.has(fallbackKey)) seen.set(fallbackKey, r);
        }
      }
      deduped = Array.from(seen.values());
      if (deduped.length < merged.length) console.log(`🧹 DEDUP [crg-deals]: ${merged.length} → ${deduped.length} (removed ${merged.length - deduped.length} exact duplicates)`);
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
    
    if (clientNew > 0 || serverOnly.length > 0 || clientResurrectionBlocked > 0) {
      console.log(`🔀 MERGE [${ep}]: client_sent=${records.length} server_had=${serverData.length} → merged=${deduped.length} (new=${clientNew}, updated=${clientUpdated}, preserved=${serverOnly.length}${deleteSet.size > 0 ? `, deleted=${deleteSet.size}` : ''}${clientResurrectionBlocked > 0 ? `, blocked=${clientResurrectionBlocked}` : ''}${serverTombstoneFiltered > 0 ? `, tomb_filtered=${serverTombstoneFiltered}` : ''})`);
    }

    // v10.06: Skip write entirely if nothing actually changed
    // This catches: no new records, no deletes, no updates, and only resurrection blocks
    if (clientNew === 0 && deleteSet.size === 0 && deduped.length === serverData.length && clientUpdated === 0) {
      // v10.06: Still return tombstoned so client can purge, but skip disk write + audit
      if (clientResurrectionBlocked > 0) {
        console.log(`🪦 [${ep}]: ${clientResurrectionBlocked} resurrection(s) blocked, no write needed`);
      }
      return res.json({ ok: true, count: deduped.length, version: getVersion(ep), unchanged: true, tombstoned: [...tombstonedIds] });
    }

    const success = await lockedWrite(file, deduped, {
      action: "update", user: userEmail || "unknown", 
      details: `[${ep}] ${deduped.length} records (merge: +${clientNew} new, ${serverOnly.length} preserved, ${deleteSet.size} deleted${clientResurrectionBlocked > 0 ? `, ${clientResurrectionBlocked} resurrection_blocked` : ''}${serverTombstoneFiltered > 0 ? `, ${serverTombstoneFiltered} tombstone_filtered` : ''}) | before: server=${serverData.length} client=${records.length} → after: ${deduped.length}${deduped.length < serverData.length - deleteSet.size - serverTombstoneFiltered ? ' ⚠️SHRUNK' : ''}`
    });

    if (success) {
      broadcastUpdate(ep, deduped, [...deleteSet]);
      res.json({ ok: true, count: deduped.length, version: getVersion(ep), merged: true, deletedAcknowledged: [...deleteSet], tombstoned: [...tombstonedIds] });
    } else {
      res.status(500).json({ error: "Write failed" });
    }
  });
});

// Users — separate endpoint to preserve full data + audit
app.post("/api/users", requireAdmin, async (req, res) => { // v11.02 H2: admin-only
  const { data: newUsers, user: userEmail } = req.body;
  let users = Array.isArray(req.body) ? req.body : newUsers;
  if (!Array.isArray(users)) return res.status(400).json({ error: "Invalid data" });

  // v11.02 H2: Validate pageAccess is always an array of strings (never a string/object)
  for (const u of users) {
    if (u.pageAccess !== undefined && !Array.isArray(u.pageAccess)) {
      console.warn(`⚠️ Rejected malformed pageAccess for ${u.email}: ${JSON.stringify(u.pageAccess)}`);
      return res.status(400).json({ error: `pageAccess must be an array (got ${typeof u.pageAccess} for ${u.email})` });
    }
  }

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

  // SERVER-SIDE MERGE for users — v10.07: Protect admin-managed fields
  const mergedMap = new Map();
  existing.forEach(u => { if (u && u.email) mergedMap.set(u.email, u); });
  users.forEach(u => { if (u && u.email) {
    const ex = mergedMap.get(u.email);
    if (!ex) {
      // New user from client
      mergedMap.set(u.email, u);
    } else {
      // v10.16: ALWAYS preserve server pageAccess unless client has explicit newer updatedAt
      // This is the #1 rule: pageAccess can ONLY change via admin edit (which stamps updatedAt)
      const clientTime = u.updatedAt || 0;
      const serverTime = ex.updatedAt || 0;
      
      // Preserve lastLogin from server
      if (ex.lastLogin && !u.lastLogin) u.lastLogin = ex.lastLogin;
      
      if (clientTime > serverTime) {
        // Client is explicitly newer (admin just clicked Save) — accept ALL fields including pageAccess
        mergedMap.set(u.email, u);
      } else {
        // Server wins on pageAccess — ALWAYS. Client can update name/email but NOT permissions.
        const merged = { ...u, 
          pageAccess: ex.pageAccess || u.pageAccess,
          updatedAt: ex.updatedAt || u.updatedAt,
          lastLogin: ex.lastLogin || u.lastLogin,
        };
        mergedMap.set(u.email, merged);
      }
    }
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
// v10.28: ZIP DATA EXPORT & IMPORT
// ═══════════════════════════════════════════════════════════════

let archiver;
try { archiver = require('archiver'); } catch (e) { console.warn('⚠️ archiver not installed — ZIP download disabled'); }

let multer;
try { multer = require('multer'); } catch (e) { console.warn('⚠️ multer not installed — ZIP upload disabled'); }

// GET /api/data/download-zip — streams all data tables as individual JSON files inside a ZIP
app.get('/api/data/download-zip', requireAuth, (req, res) => {
  if (!archiver) return res.status(503).json({ error: 'ZIP support not available (archiver not installed)' });
  try {
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `blitz-data-${dateStr}.zip`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/zip');

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', err => { console.error('ZIP archive error:', err); });
    archive.pipe(res);

    // Add each data table as its own JSON file
    endpoints.forEach(ep => {
      const data = readJSON(ep + '.json', []);
      const json = JSON.stringify(data, null, 2);
      archive.append(json, { name: `${ep}.json` });
    });

    // Add a manifest file with metadata
    const manifest = {
      version: VERSION,
      exportedAt: new Date().toISOString(),
      exportedBy: req.user?.email || 'unknown',
      tables: endpoints,
      recordCounts: Object.fromEntries(endpoints.map(ep => [ep, readJSON(ep + '.json', []).length])),
    };
    archive.append(JSON.stringify(manifest, null, 2), { name: '_manifest.json' });

    archive.finalize();
    writeAuditLog('system', 'zip_download', req.user?.email || 'unknown', `ZIP data export: ${endpoints.length} tables`);
    console.log(`📦 ZIP data export by ${req.user?.email}`);
  } catch (e) {
    console.error('ZIP download error:', e);
    if (!res.headersSent) res.status(500).json({ error: 'ZIP export failed' });
  }
});

// POST /api/data/upload-zip — accepts a ZIP of JSON files, restores each matching table
// Uses multer for multipart upload, max 50MB
const zipUploadMiddleware = multer
  ? multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } }).single('file')
  : (req, res, next) => res.status(503).json({ error: 'ZIP upload not available (multer not installed)' });

app.post('/api/data/upload-zip', requireAuth, zipUploadMiddleware, async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const AdmZip = (() => { try { return require('adm-zip'); } catch { return null; } })();
  if (!AdmZip) {
    // Fallback: try to parse as JSON backup if not a ZIP
    return res.status(503).json({ error: 'adm-zip not installed — use JSON restore instead' });
  }
  try {
    const zip = new AdmZip(req.file.buffer);
    const entries = zip.getEntries();
    const restored = [];
    const skipped = [];
    const errors = [];

    for (const entry of entries) {
      const name = entry.entryName;
      if (!name.endsWith('.json') || name === '_manifest.json') continue;
      const ep = name.replace('.json', '');
      if (!endpoints.includes(ep)) { skipped.push(ep); continue; }
      if (ep === 'users') { skipped.push('users (protected)'); continue; }
      try {
        const data = JSON.parse(entry.getData().toString('utf8'));
        if (!Array.isArray(data)) { errors.push(`${ep}: not an array`); continue; }
        // Skip empty arrays — server's WAL guard rejects payloads < 3 chars ("[]");
        // an empty table in the ZIP means no data to restore, so we just skip it.
        if (data.length === 0) { skipped.push(`${ep} (empty)`); continue; }
        const success = await lockedWrite(ep + '.json', data, {
          action: 'zip_restore', user: req.user?.email || 'unknown',
          details: `[${ep}] Restored ${data.length} records from ZIP upload`,
        });
        if (success) restored.push({ table: ep, count: data.length });
        else errors.push(`${ep}: write failed`);
      } catch (parseErr) {
        errors.push(`${ep}: ${parseErr.message}`);
      }
    }

    writeAuditLog('system', 'zip_upload_restore', req.user?.email || 'unknown',
      `ZIP restore: ${restored.length} tables restored, ${skipped.length} skipped, ${errors.length} errors`);
    console.log(`📦 ZIP restore by ${req.user?.email}: ${restored.map(r => `${r.table}(${r.count})`).join(', ')}`);

    // Broadcast version bump to all WS clients so they re-fetch
    if (wss) {
      const versions = {};
      endpoints.forEach(ep => { versions[ep] = getVersion(ep); });
      const msg = JSON.stringify({ type: 'versions', versions, timestamp: Date.now() });
      wss.clients.forEach(ws => { try { ws.send(msg); } catch {} });
    }

    res.json({ ok: true, restored, skipped, errors });
  } catch (e) {
    console.error('ZIP upload error:', e);
    res.status(500).json({ error: 'ZIP restore failed: ' + e.message });
  }
});

// v10.23: BACKUP DOWNLOAD & RESTORE
// ═══════════════════════════════════════════════════════════════

// Download full backup — all tables as a single JSON file
app.get("/api/backup/download", requireAuth, (req, res) => {
  try {
    const backup = { version: VERSION, timestamp: Date.now(), date: new Date().toISOString(), tables: {} };
    endpoints.forEach(ep => {
      backup.tables[ep] = readJSON(ep + ".json", []);
    });
    // Include users with passwordHash stripped
    backup.tables["users"] = (backup.tables["users"] || []).map(u => ({ email: u.email, name: u.name, pageAccess: u.pageAccess, lastLogin: u.lastLogin }));
    res.setHeader("Content-Disposition", `attachment; filename="blitz-backup-${new Date().toISOString().slice(0,10)}.json"`);
    res.setHeader("Content-Type", "application/json");
    res.json(backup);
    writeAuditLog("system", "backup_download", req.user?.email || "unknown", `Full backup downloaded (${endpoints.length} tables)`);
    console.log(`📦 Backup downloaded by ${req.user?.email}`);
  } catch (e) {
    console.error("Backup download error:", e);
    res.status(500).json({ error: "Backup failed" });
  }
});

// Restore from backup file — replaces all table data
app.post("/api/backup/restore", requireAuth, async (req, res) => {
  try {
    const { tables, version: backupVersion, date: backupDate } = req.body;
    if (!tables || typeof tables !== "object") return res.status(400).json({ error: "Invalid backup format" });
    
    const restored = [];
    for (const [ep, data] of Object.entries(tables)) {
      if (!endpoints.includes(ep)) continue; // skip unknown tables
      if (!Array.isArray(data)) continue;
      // Skip users table restore to preserve local passwords/access
      if (ep === "users") continue;
      const file = ep + ".json";
      const success = await lockedWrite(file, data, {
        action: "restore", user: req.user?.email || "unknown",
        details: `[${ep}] Restored ${data.length} records from backup (${backupDate || backupVersion || "unknown"})`
      });
      if (success) restored.push({ table: ep, count: data.length });
    }
    
    writeAuditLog("system", "backup_restore", req.user?.email || "unknown", `Restored ${restored.length} tables from backup (${backupDate || "unknown"})`);
    console.log(`📦 Backup restored by ${req.user?.email}: ${restored.map(r => `${r.table}(${r.count})`).join(", ")}`);
    res.json({ ok: true, restored });
  } catch (e) {
    console.error("Backup restore error:", e);
    res.status(500).json({ error: "Restore failed" });
  }
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

  wss.on('connection', (ws, req) => {
    // FIX H1: Require auth token for WebSocket connections
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get("token");
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
    console.log(`🔌 WebSocket upgrade from ${ip} — path: ${req.url}`);
    if (!token || !activeSessions.has(token)) {
      console.log(`🔌 WebSocket rejected — invalid token`);
      ws.close(4001, "Authentication required");
      return;
    }
    wsClients.add(ws);
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
function broadcastUpdate(table, data, deletedIds) {
  if (!WS_AVAILABLE || wsClients.size === 0) return;
  // v10.06: Send full tombstone list so newly-connecting clients get purged
  const allTombstoned = [...getTombstonedIds(table)];
  const message = JSON.stringify({
    type: "update",
    table,
    version: getVersion(table),
    data,
    // v10.06: Include full tombstone list + current deletes
    deleted: deletedIds && deletedIds.length > 0 ? deletedIds : undefined,
    tombstoned: allTombstoned.length > 0 ? allTombstoned : undefined,
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

function sendTelegramNotification(message, chatId = AFFILIte_FINANCE_GROUP_CHAT_ID) {
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
  return `🔄 Payment (Aff ${p.invoice}) status → Approved to pay by ${p.openBy || "Y Admin"}`;
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


// Q2 FIX: Removed unused formatPaidPaymentMessage — was shadowed by formatAffiliatePaidPaymentMessage

// ═══════════════════════════════════════════════════════════════
// FINANCE | BRANDS GROUP NOTIFICATIONS (-1002796530029)
// ═══════════════════════════════════════════════════════════════

// formatBrandNewPaymentMessage removed — replaced by formatBrandNewOpenPaymentMessage below

// A1: Sent to Brands group when a crypto hash is detected in the group chat
// v9.52: Updated format — Invoice shows customer name, wallet check line added
function formatBrandNewOpenPaymentMessage(p) {
  const amount = Number(p.amount || 0).toLocaleString("en-US", { minimumFractionDigits: p.amount && String(p.amount).includes('.') ? String(p.amount).split('.')[1].length : 0 });
  const invoiceName = p.customerName || p.invoice || "Unknown";
  
  // Wallet check line
  let walletCheck = "❓ Wallet check: Wallet unknown";
  if (p.walletMatched && p.walletType) {
    walletCheck = `✅ Wallet check: It's our ${p.walletType} wallet`;
  } else if (p.walletMatched) {
    // Determine type from blockchainType
    const wType = p.blockchainType || "Unknown";
    walletCheck = `✅ Wallet check: It's our ${wType} wallet`;
  }
  
  return `💰 NEW CUSTOMER PAYMENT 💰

📋 Invoice: #${invoiceName}
💵 Amount: $${amount}
🔗 Hash: ${p.paymentHash || "N/A"}

${walletCheck}`;
}

// A2: Sent to Brands group when customer payment is marked as Received in CRM
function formatBrandPaymentReceivedMessage(p) {
  const amount = Number(p.amount || 0).toLocaleString("en-US");
  return `✅ PAYMENT RECEIVED ✅

📋 Invoice: #${p.invoice}
💵 Amount: $${amount}
🏷️ Brand: ${p.brand || "N/A"}
👤 Paid by: ${p.openBy || "Unknown"}
🔗 Payment Hash: ${p.paymentHash || "N/A"}`;
}

// sendBrandPaymentNotification — only fires for RECEIVED status now
function sendBrandPaymentNotification(p) {
  if (TELEGRAM_TOKEN === "YOUR_BOT_TOKEN_HERE" || !TELEGRAM_TOKEN) {
    console.log("📱 Brand payment notification skipped (no token configured)");
    return;
  }

  const message = formatBrandPaymentReceivedMessage(p);

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
      if (res.statusCode !== 200) console.log("❌ Brand payment received notification error:", d);
      else console.log(`✅ Brand payment RECEIVED notification sent for invoice: ${p.invoice}`);
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

📋 Affiliate ID: ${p.invoice}
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
  let msg = `📋 Added a new offer:\nAffiliate ${affiliateId}\nCountry ${country}`;
  if (brand) msg += `\nBrand: ${brand}`;
  return msg;
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

// Track processed message IDs to prevent duplicates
// L5 FIX: Increased TTL from 30s → 5 minutes to prevent re-processing on bot restart
const processedMessageIds = new Map();
const MESSAGE_ID_TTL = 300000; // 5 minutes
const MESSAGE_ID_CLEANUP_INTERVAL = 60000; // cleanup every 60s

// Cleanup old message IDs periodically
setInterval(() => {
  const now = Date.now();
  for (const [msgId, timestamp] of processedMessageIds) {
    if (now - timestamp > MESSAGE_ID_TTL) {
      processedMessageIds.delete(msgId);
    }
  }
}, MESSAGE_ID_CLEANUP_INTERVAL);

// L4 FIX: processedHashes at module level — was lazily init'd inside handler causing race conditions
const processedHashes = new Map();
const HASH_TTL = 300000; // 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [hash, ts] of processedHashes) {
    if (now - ts > HASH_TTL) processedHashes.delete(hash);
  }
}, 60000);

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

    // M3 FIX: Added /help, /ping, /status to registered command list
    bot.setMyCommands([
      { command:"/start", description:"Welcome message" },
      { command:"/help", description:"Command list" },
      { command:"/wallets", description:"Current wallet addresses" },
      { command:"/crgdeals", description:"Today's CRG deals by country" },
      { command:"/deals", description:"All deals by country" },
      { command:"/todaycrgcap", description:"Today's CRG cap summary" },
      { command:"/todayagentscap", description:"Today's agents cap" },
      { command:"/payments", description:"Open payments summary" },
      { command:"/ping", description:"Latency test" },
      { command:"/status", description:"Server health" },
    ]).catch(e => console.log("⚠️ Register commands:", e.message));

    // M4 FIX: Separated /start and /help into distinct handlers
    bot.onText(/\/start/, (msg) => {
      structuredLog("cmd", "/start", "ok", { chat: msg.chat.id });
      bot.sendMessage(msg.chat.id, `👋 <b>Welcome to Blitz CRM Bot v${VERSION}</b>\n\nType /help for the full command list.`, { parse_mode: "HTML" });
    });

    bot.onText(/\/help/, (msg) => {
      structuredLog("cmd", "/help", "ok", { chat: msg.chat.id });
      bot.sendMessage(msg.chat.id,
        `📋 <b>Blitz CRM Bot v${VERSION} — Commands</b>\n\n` +
        `/wallets — Wallet addresses\n` +
        `/crgdeals — Today's CRG deals by country\n` +
        `/deals — All deals by country\n` +
        `/todaycrgcap — CRG cap summary\n` +
        `/todayagentscap — Agents cap\n` +
        `/payments — Open payments\n` +
        `/ping — Latency test\n` +
        `/status — Server health`,
        { parse_mode: "HTML" }
      );
    });

    // M1 FIX: /ping command — latency test
    bot.onText(/\/ping/, (msg) => {
      const start = Date.now();
      structuredLog("cmd", "/ping", "ok", { chat: msg.chat.id });
      bot.sendMessage(msg.chat.id, `🏓 Pong! Response: ${Date.now() - start}ms | Uptime: ${Math.round(process.uptime())}s`);
    });

    // M2 FIX: /status command — server health
    bot.onText(/\/status/, (msg) => {
      try {
        const mem = process.memoryUsage();
        const heapMB = Math.round(mem.heapUsed / 1024 / 1024);
        const rssMB = Math.round(mem.rss / 1024 / 1024);
        const uptime = Math.round(process.uptime());
        const h = Math.floor(uptime / 3600), m = Math.floor((uptime % 3600) / 60), s = uptime % 60;
        structuredLog("cmd", "/status", "ok", { chat: msg.chat.id, heap: heapMB });
        bot.sendMessage(msg.chat.id,
          `🖥️ <b>Server Status</b>\n\n` +
          `✅ Online\n` +
          `⏱ Uptime: ${h}h ${m}m ${s}s\n` +
          `💾 Heap: ${heapMB}MB / RSS: ${rssMB}MB\n` +
          `🔌 WS clients: ${wsClients.size}\n` +
          `📦 v${VERSION}`,
          { parse_mode: "HTML" }
        );
      } catch (err) {
        bot.sendMessage(msg.chat.id, `❌ Status error: ${err.message}`);
      }
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
  // Leadgreed FTD Parser + Saver (functions moved here to avoid duplication)
  function parseLeadgreedFTD(text) {
    const lines = text.trim().split('\n').map(l => l.trim());
    if (lines.length < 2 || !lines[0].startsWith('🏦')) return null;
    
    const countryMatch = lines[0].match(/🏦\s*(.+)/);
    if (!countryMatch) return null;
    const country = countryMatch[1].trim();
    
    const ftdLine = lines[1];
    const ftdMatch = ftdLine.match(/(\d+)\s*-\s*([^→-]+?)\s*→\s*(\d+)\s*-\s*(.+?)\s*(🟩|🟥|🟨)?$/);
    if (!ftdMatch) return null;
    
    const [, sourceId, sourceName, destId, destName, emoji] = ftdMatch;
    return {
      id: crypto.randomBytes(6).toString('hex'),
      timestamp: new Date().toISOString(),
      country: country.trim(),
      sourceId: sourceId.trim(),
      sourceName: sourceName.trim(),
      destId: destId.trim(),
      destName: destName.trim(),
      status: emoji === '🟩' ? 'success' : emoji === '🟥' ? 'failed' : 'pending',
      emoji: emoji || '',
      rawMessage: text,
      date: new Date().toISOString().split('T')[0]
    };
  }

  async function saveFTD(ftd, msg) {
    const ftds = readJSON("ftd-entries.json", []);
    ftds.unshift(ftd);
    
    // Dedup: remove duplicates by sourceId-destId-country combo within last 24h
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const uniqueKey = `${ftd.sourceId}-${ftd.destId}-${ftd.country}`;
    const deduped = ftds.filter(f => {
      const key = `${f.sourceId}-${f.destId}-${f.country}`;
      return key !== uniqueKey || new Date(f.timestamp).getTime() < cutoff;
    });
    
    const success = await lockedWrite("ftd-entries.json", deduped.slice(0, 10000), {
      action: "ftd_create",
      user: "leadgreed-bot",
      details: `Leadgreed FTD: ${ftd.country} ${ftd.sourceId}-${ftd.sourceName} → ${ftd.destId}-${ftd.destName}`
    });
    
    if (success) {
      broadcastUpdate("ftd-entries", deduped);
      // Optional: Confirm in group
      if (msg) {
        bot.sendMessage(msg.chat.id, `✅ FTD saved to CRM table\n${ftd.country}\n${ftd.sourceId}-${ftd.sourceName} → ${ftd.destId}-${ftd.destName}`);
      }
    }
  }

  // Leadgreed FTD Parser + Saver (functions moved here to avoid duplication)
  function parseLeadgreedFTD(text) {
    const lines = text.trim().split('\n').map(l => l.trim());
    if (lines.length < 2 || !lines[0].startsWith('🏦')) return null;
    
    const countryMatch = lines[0].match(/🏦\s*(.+)/);
    if (!countryMatch) return null;
    const country = countryMatch[1].trim();
    
    const ftdLine = lines[1];
    const ftdMatch = ftdLine.match(/(\d+)\s*-\s*([^→-]+?)\s*→\s*(\d+)\s*-\s*(.+?)\s*(🟩|🟥|🟨)?$/);
    if (!ftdMatch) return null;
    
    const [, sourceId, sourceName, destId, destName, emoji] = ftdMatch;
    return {
      id: crypto.randomBytes(6).toString('hex'),
      timestamp: new Date().toISOString(),
      country: country.trim(),
      sourceId: sourceId.trim(),
      sourceName: sourceName.trim(),
      destId: destId.trim(),
      destName: destName.trim(),
      status: emoji === '🟩' ? 'success' : emoji === '🟥' ? 'failed' : 'pending',
      emoji: emoji || '',
      rawMessage: text,
      date: new Date().toISOString().split('T')[0]
    };
  }

  async function saveFTD(ftd, msg) {
    const ftds = readJSON("ftd-entries.json", []);
    ftds.unshift(ftd);
    
    // Dedup: remove duplicates by sourceId-destId-country combo within last 24h
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const uniqueKey = `${ftd.sourceId}-${ftd.destId}-${ftd.country}`;
    const deduped = ftds.filter(f => {
      const key = `${f.sourceId}-${f.destId}-${f.country}`;
      return key !== uniqueKey || new Date(f.timestamp).getTime() < cutoff;
    });
    
    const success = await lockedWrite("ftd-entries.json", deduped.slice(0, 10000), {
      action: "ftd_create",
      user: "leadgreed-bot",
      details: `Leadgreed FTD: ${ftd.country} ${ftd.sourceId}-${ftd.sourceName} → ${ftd.destId}-${ftd.destName}`
    });
    
    if (success) {
      broadcastUpdate("ftd-entries", deduped);
      // Optional: Confirm in group
      if (msg) {
        bot.sendMessage(msg.chat.id, `✅ FTD saved to CRM table\n${ftd.country}\n${ftd.sourceId} → ${ftd.destId}`);
      }
    }
  }

  // NEW: Leadgreed FTD listener (-5195790399)
  const leadsChatIdStr = String(msg.chat.id);
  if (leadsChatIdStr === LEADS_GROUP_CHAT_ID && msg.text?.startsWith('🏦')) {
    try {
      const ftd = parseLeadgreedFTD(msg.text);
      if (ftd) {
        await saveFTD(ftd, msg);
        structuredLog("ftd_leadgreed", "new", "ok", { chatId: leadsChatIdStr, country: ftd.country, source: `${ftd.sourceId}-${ftd.sourceName}`, dest: `${ftd.destId}-${ftd.destName}` });
        console.log(`✅ FTD saved: ${ftd.country} ${ftd.sourceId}-${ftd.sourceName} → ${ftd.destId}-${ftd.destName} 🟩`);
      }
    } catch (err) {
      console.error("❌ FTD parse error:", err.message);
    }
    return;  // Don't process as offer/hash
  }
// Leadgreed FTD listener (-5195790399) — supports BOTH 🏦 format AND "Deposit from..." format
  const chatIdStr = String(msg.chat.id);
  console.log(`💬 Leadgreed Deposit test: "${msg.text.substring(0,50)}..."`);
  if (chatIdStr === LEADS_GROUP_CHAT_ID && msg.text && msg.text.includes('Deposit from')) {
    try {
      console.log('🔍 Parsing Leadgreed Deposit...');
      const parseLeadgreedDeposit = require('./parseLeadgreedDeposit.js');
      let ftd = parseLeadgreedDeposit(msg.text);
      if (ftd) {
        // Generate ID (parser doesn't have crypto access)
        ftd.id = crypto.randomBytes(6).toString('hex');
        console.log('✅ Deposit parsed:', JSON.stringify(ftd, null, 1));
        await saveFTD(ftd, msg);
        structuredLog("ftd_leadgreed", "new", "deposit", "ok", { chatId: chatIdStr, country: ftd.country, affiliateId: ftd.affiliateId });
        bot.sendMessage(msg.chat.id, `✅ Deposit FTD saved!\n${ftd.country}\n${ftd.affiliateName} → ${ftd.brokerName}`);
      } else {
        console.log('❌ Deposit parse failed - no FTD object');
      }
    } catch (err) {
      console.error("❌ Deposit FTD parse error:", err.message, err.stack);
    }
    return;
  }
  if (chatIdStr === LEADS_GROUP_CHAT_ID && msg.text?.startsWith('🏦')) {
    try {
      const ftd = parseLeadgreedFTD(msg.text);
      if (ftd) {
        await saveFTD(ftd, msg);
        structuredLog("ftd_leadgreed", "new", "classic", "ok", { chatId: chatIdStr, country: ftd.country, source: `${ftd.sourceId}-${ftd.sourceName}`, dest: `${ftd.destId}-${ftd.destName}` });
        console.log(`✅ Classic FTD saved: ${ftd.country} ${ftd.sourceId}-${ftd.sourceName} → ${ftd.destId}-${ftd.destName} 🟩`);
      }
    } catch (err) {
      console.error("❌ Classic FTD parse error:", err.message);
    }
    return;  // Don't process as offer/hash
  }


  // Leadgreed FTD Parser
  function parseLeadgreedFTD(text) {
    const lines = text.trim().split('\n').map(l => l.trim());
    if (lines.length < 2 || !lines[0].startsWith('🏦')) return null;
    
    const countryMatch = lines[0].match(/🏦\s*(.+)/);
    if (!countryMatch) return null;
    const country = countryMatch[1].trim();
    
    const ftdLine = lines[1];
    const ftdMatch = ftdLine.match(/(\d+)\s*-\s*([^→-]+?)\s*→\s*(\d+)\s*-\s*(.+?)\s*(🟩|🟥|🟨)?$/);
    if (!ftdMatch) return null;
    
    const [, sourceId, sourceName, destId, destName, emoji] = ftdMatch;
    return {
      id: crypto.randomBytes(6).toString('hex'),
      timestamp: new Date().toISOString(),
      country: country.trim(),
      sourceId: sourceId.trim(),
      sourceName: sourceName.trim(),
      destId: destId.trim(),
      destName: destName.trim(),
      status: emoji === '🟩' ? 'success' : emoji === '🟥' ? 'failed' : 'pending',
      emoji: emoji || '',
      rawMessage: text,
      date: new Date().toISOString().split('T')[0]
    };
  }

  // Save FTD to ftd-entries.json
  async function saveFTD(ftd, msg) {
    const ftds = readJSON("ftd-entries.json", []);
    ftds.unshift(ftd);
    
    // Dedup: remove duplicates by sourceId-destId-country combo within last 24h
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const uniqueKey = `${ftd.sourceId}-${ftd.destId}-${ftd.country}`;
    const deduped = ftds.filter(f => {
      const key = `${f.sourceId}-${f.destId}-${f.country}`;
      return key !== uniqueKey || new Date(f.timestamp).getTime() < cutoff;
    });
    
    const success = await lockedWrite("ftd-entries.json", deduped.slice(0, 10000), {
      action: "ftd_create",
      user: "leadgreed-bot",
      details: `Leadgreed FTD: ${ftd.country} ${ftd.sourceId}-${ftd.sourceName} → ${ftd.destId}-${ftd.destName}`
    });
    
    if (success) {
      broadcastUpdate("ftd-entries", deduped);
      // Optional: Confirm in group
      if (msg) {
        bot.sendMessage(msg.chat.id, `✅ FTD saved to CRM table\n${ftd.country}\n${ftd.sourceId} → ${ftd.destId}`);
      }
    }
  }

  if (msg.text && msg.text.startsWith("/")) return;
      const chatId = msg.chat.id; const userText = msg.text ? msg.text.trim().toUpperCase() : "";
      const st = userStates[chatId];

      // Handle Offer: / Offers: messages from the offer group FIRST (before state checks)
      // This ensures Offer: messages are processed even if user is in a waiting state
      const offerMessageText = msg.text || '';
      const offerLower = offerMessageText.toLowerCase();
      // const chatIdStr = chatId.toString(); // FIXED: duplicate declaration removed, reuse chatIdStr from above
      
      // Debug: show chat ID
      console.log("💬 Message from chat ID:", chatIdStr, "| OFFER_GROUP_CHAT_ID:", OFFER_GROUP_CHAT_ID);
      
      // L1 FIX: Direct string comparison — old .replace('-100','-') chain was fragile
      // and could accidentally match wrong groups with similar numeric suffixes
      const isOfferGroup = chatIdStr === OFFER_GROUP_CHAT_ID;
      
      // L2 FIX: Removed overly broad /^\d+$/ check — it matched ANY message whose
      // first line was a standalone number (e.g. "500" in a payment message).
      // Now only explicit "Offer:" / "Offers:" prefix triggers offer parsing.
      const isOfferFormat = offerLower.startsWith('offer:') || offerLower.startsWith('offers:');
      
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
      // C1 FIX: was FINANCE_GROUP_CHAT_ID (undefined) — caused ReferenceError crash
      const isFinanceGroup = chatId.toString() === AFFILIte_FINANCE_GROUP_CHAT_ID;
      
      // Handle payment messages from Brands group with payment links
      if (isBrandsGroup) {
        const messageText = msg.text || '';
        
        // Try to extract brand name from message (look for brand name patterns)
        const brandMatch = messageText.match(/(?:brand|Brand)[:\s]+([A-Za-z0-9]+)/i);
        const extractedBrand = brandMatch ? brandMatch[1] : null;
        
        // v9.51: Extract customer name using robust helper
        const extractedCustomer = extractCustomerName(messageText);
        
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
          // Pattern 1: $500, $1,000, $1,000.00, $11,315.754
          const p1 = /\$(\d+(?:,\d{3})*(?:\.\d+)?)/g;
          let m;
          while ((m = p1.exec(messageText)) !== null) {
            amounts.push(m[1].replace(/,/g, ''));
          }
          // Pattern 2: 500$, 1000$, 1000.50$, 11315.754$ (amount before $)
          const p2 = /(\d+(?:,\d{3})*(?:\.\d+)?)\$/g;
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
            else if (type === 'BTC') txResult = await checkBTCTransaction(hash);

            // v9.19 FIX: Prefer blockchain amount when available and non-zero
            // Previously: (amounts[i] || txResult.amount || "0") — blockchain "0" was ignored
            const blockchainAmount = txResult.amount && txResult.amount !== "0" && parseFloat(txResult.amount) > 0 ? txResult.amount : null;
            const messageAmount = amounts[i] || null;
            const amount = (blockchainAmount || messageAmount || "0").toString();
            console.log(`💰 [Brands] Hash ${hash.slice(0,10)}... → blockchain=$${blockchainAmount || 'N/A'}, message=$${messageAmount || 'N/A'}, final=$${amount}`);
            const walletVerify = verifyWalletAddress(txResult.toAddress || "", wallets);
            // A1: Always create as "Open" — CRM user will manually mark as Received
            const status = "Open";
            const invoice = `CP-${Date.now().toString(36).toUpperCase()}`;

            const newPayment = {
              id: crypto.randomBytes(5).toString('hex'),
              invoice, amount, fee: "", status, type: "Customer Payment",
              openBy: "Telegram Bot", paidDate: new Date().toISOString().split("T")[0],
              paymentHash: hash,
              trcAddress: type === 'TRC20' ? (txResult.toAddress || "") : "",
              ercAddress: type === 'ERC20' ? (txResult.toAddress || "") : "",
              btcAddress: type === 'BTC' ? (txResult.toAddress || "") : "",
              brand: extractedBrand || "",
              customerName: extractedCustomer || "",
              walletMatched: walletVerify.matched,
              walletType: walletVerify.type || "",
              blockchainType: type,
              blockchainVerified: txResult.success,
              toAddress: txResult.toAddress || "",
              instructions: "",
              month: new Date().getMonth(), year: new Date().getFullYear()
            };

            const cp = readJSON("customer-payments.json", []);
            cp.unshift(newPayment);
            await lockedWrite("customer-payments.json", cp, { action: "create", user: "telegram-bot", details: `Auto-created ${invoice} from hash (Brands group)` });
            broadcastUpdate("customer-payments", cp);

            // Mark hash as processed to prevent duplicates
            bot._processedHashes.set(hash, Date.now());

            // A1: Always notify Brands group with "NEW CUSTOMER PAYMENT" when hash detected
            bot.sendMessage(BRANDS_GROUP_CHAT_ID, formatBrandNewOpenPaymentMessage(newPayment));
            
            
            console.log(`✅ Payment from Brands group: Invoice ${invoice}, Brand: ${extractedBrand || 'N/A'}, Amount: $${amount}`);
          }
          return;
        }
      }
      
      // USDT hash detection (finance group only)
      if (isFinanceGroup) {
      const messageText = msg.text || '';
      // v9.51: Extract customer name
      const extractedCustomerFinance = extractCustomerName(messageText);
      const hashes = extractAllUsdtHashes(messageText);
      const txHashes = hashes.filter(h => h.type === 'TRC20' || h.type === 'ERC20' || h.type === 'BTC');
      if (txHashes.length === 0) return;

      const amounts = [];
      const p1 = /\$(\d+(?:,\d{3})*(?:\.\d+)?)/g;
      let m; while ((m = p1.exec(messageText)) !== null) amounts.push(m[1].replace(/,/g, ''));
      const p2 = /(\d+(?:,\d{3})*(?:\.\d+)?)\$/g;
      while ((m = p2.exec(messageText)) !== null) amounts.push(m[1].replace(/,/g, ''));

      const wallets = readJSON("wallets.json", []);

      for (let i = 0; i < txHashes.length; i++) {
        const { hash, type } = txHashes[i];
        let txResult = { success: false };
        if (type === 'TRC20') txResult = await checkTRC20Transaction(hash);
        else if (type === 'ERC20') txResult = await checkERC20Transaction(hash);
        else if (type === 'BTC') txResult = await checkBTCTransaction(hash);

        // v9.19 FIX: Prefer blockchain amount when available and non-zero
        const blockchainAmount = txResult.amount && txResult.amount !== "0" && parseFloat(txResult.amount) > 0 ? txResult.amount : null;
        const messageAmount = amounts[i] || null;
        const amount = (blockchainAmount || messageAmount || "0").toString();
        console.log(`💰 [Finance] Hash ${hash.slice(0,10)}... → blockchain=$${blockchainAmount || 'N/A'}, message=$${messageAmount || 'N/A'}, final=$${amount}`);
        const walletVerify = verifyWalletAddress(txResult.toAddress || "", wallets);
        const status = walletVerify.matched ? "Received" : "Pending";
        const invoice = `CP-${Date.now().toString(36).toUpperCase()}`;

        const newPayment = {
          id: crypto.randomBytes(5).toString('hex'),
          invoice, amount, fee: "", status, type: "Customer Payment",
          openBy: "Telegram Bot", paidDate: new Date().toISOString().split("T")[0],
          paymentHash: hash, trcAddress: type === 'TRC20' ? (txResult.toAddress || "") : "",
          ercAddress: type === 'ERC20' ? (txResult.toAddress || "") : "",
          btcAddress: type === 'BTC' ? (txResult.toAddress || "") : "",
          customerName: extractedCustomerFinance || "",
          blockchainType: type,
          blockchainVerified: txResult.success,
          toAddress: txResult.toAddress || "",
          month: new Date().getMonth(), year: new Date().getFullYear()
        };

        const cp = readJSON("customer-payments.json", []);
        cp.unshift(newPayment);
        await lockedWrite("customer-payments.json", cp, { action: "create", user: "telegram-bot", details: `Auto-created ${invoice} from hash` });
        broadcastUpdate("customer-payments", cp);

        let confirmMsg = `📨 <b>Payment Processed!</b>\n\n📋 Invoice: <b>${invoice}</b>\n`;
        if (extractedCustomerFinance) confirmMsg += `👤 Customer: <b>${extractedCustomerFinance}</b>\n`;
        confirmMsg += `💵 Amount: <b>$${amount}</b>\n🔗 Hash (${type}): <code>${hash}</code>\n`;
        confirmMsg += txResult.success ? `✅ Blockchain: <b>Verified</b>\n` : `⚠️ Blockchain: <b>Could not verify</b>\n`;
        confirmMsg += walletVerify.matched ? `✅ Wallet: <b>MATCHED</b>\n` : `❌ Wallet: <b>${walletVerify.error}</b>\n`;
        confirmMsg += `\n📊 Status: <b>${status}</b>`;
        bot.sendMessage(AFFILIte_FINANCE_GROUP_CHAT_ID, confirmMsg, { parse_mode: "HTML" });
      }
      } // close if (isFinanceGroup)
    }); // <-- FIX: Added missing closing brace and parenthesis for bot.on('message') handler

    console.log("✅ USDT hash detection enabled");
    
    // ═══════════════════════════════════════════════════════════════
    // 15. SCREENSHOT + TEXT FALLBACK COMMANDS
    // C4 FIX: Removed duplicate text-only /todaycrgcap and /todayagentscap handlers.
    // These screenshot handlers now include text fallback if Puppeteer unavailable.
    // ═══════════════════════════════════════════════════════════════

    // /todaycrgcap — screenshot with text fallback
    bot.onText(/\/todaycrgcap/, async (msg) => {
      structuredLog("cmd", "/todaycrgcap", "ok", { chat: msg.chat.id });
      try {
        bot.sendMessage(msg.chat.id, "📸 Generating CRG report...");
        const result = await screenshotModule.sendReport(bot, msg.chat.id, 'crg', readJSON);
        structuredLog("cmd", "/todaycrgcap", "ok", { method: result.method });
      } catch (err) {
        structuredLog("cmd", "/todaycrgcap", "warn", { error: err.message, fallback: "text" });
        // Text fallback
        try {
          const all = readJSON("crg-deals.json", []);
          const dates = [...new Set(all.map(d => d.date))].sort().reverse();
          const ld = dates[0] || new Date().toISOString().split("T")[0];
          const td = all.filter(d => d.date === ld);
          if (!td.length) { bot.sendMessage(msg.chat.id, "📭 No CRG cap data.", { parse_mode: "HTML" }); return; }
          const tCap = td.reduce((s, d) => s + (parseInt(d.cap) || 0), 0);
          const tRec = td.reduce((s, d) => s + (parseInt(d.capReceived) || 0), 0);
          const tFTD = td.reduce((s, d) => s + (parseInt(d.ftd) || 0), 0);
          let t = `📊 <b>Today CRG Cap</b>\n📅 ${ld} | ${td.length} deals\n\n<code>Affiliate    | Cap | Rec | FTD\n-------------|-----|-----|-----\n`;
          td.slice(0, 15).forEach(d => { t += `${(d.affiliate || "").padEnd(12).substring(0, 12)}| ${(d.cap || "0").padStart(3)} | ${(d.capReceived || "0").padStart(3)} | ${(d.ftd || "0").padStart(3)}\n`; });
          if (td.length > 15) t += `... ${td.length - 15} more\n`;
          t += `-------------|-----|-----|-----\nTOTAL        | ${String(tCap).padStart(3)} | ${String(tRec).padStart(3)} | ${String(tFTD).padStart(3)}</code>\n\nRemaining: ${tCap - tRec}`;
          bot.sendMessage(msg.chat.id, t, { parse_mode: "HTML" });
        } catch (fallbackErr) {
          bot.sendMessage(msg.chat.id, `❌ Error: ${err.message}`);
        }
      }
    });

    // /todayagentscap — screenshot with text fallback
    bot.onText(/\/todayagentscap/, async (msg) => {
      structuredLog("cmd", "/todayagentscap", "ok", { chat: msg.chat.id });
      try {
        bot.sendMessage(msg.chat.id, "📸 Generating Agents report...");
        const result = await screenshotModule.sendReport(bot, msg.chat.id, 'agents', readJSON);
        structuredLog("cmd", "/todayagentscap", "ok", { method: result.method });
      } catch (err) {
        structuredLog("cmd", "/todayagentscap", "warn", { error: err.message, fallback: "text" });
        // Text fallback
        try {
          const all = readJSON("daily-cap.json", []);
          const dates = [...new Set(all.map(c => c.date))].sort().reverse();
          const ld = dates[0] || new Date().toISOString().split("T")[0];
          const tc = all.filter(c => c.date === ld);
          if (!tc.length) { bot.sendMessage(msg.chat.id, "📭 No agents cap data.", { parse_mode: "HTML" }); return; }
          const tAff = tc.reduce((s, c) => s + (parseInt(c.affiliates) || 0), 0);
          const tBr = tc.reduce((s, c) => s + (parseInt(c.brands) || 0), 0);
          let t = `📊 <b>Today Agents Cap</b>\n📅 ${ld}\n\n<code>Agent      | Aff | Brands\n-----------|-----|-------\n`;
          tc.forEach(c => { t += `${(c.agent || "").padEnd(10).substring(0, 10)}| ${(c.affiliates || "0").padStart(3)} | ${(c.brands || "0").padStart(6)}\n`; });
          t += `-----------|-----|-------\nTOTAL      | ${String(tAff).padStart(3)} | ${String(tBr).padStart(6)}</code>\n\nAgents: ${tc.length} | Aff: ${tAff} | Brands: ${tBr}`;
          bot.sendMessage(msg.chat.id, t, { parse_mode: "HTML" });
        } catch (fallbackErr) {
          bot.sendMessage(msg.chat.id, `❌ Error: ${err.message}`);
        }
      }
    });

    console.log("📸 Screenshot functionality enabled (with text fallback)");
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
  
  // v10.1: Extract BTC transaction hashes from blockchain explorer URLs
  const btcPatterns = [
    /blockchain\.com\/(?:btc\/)?tx\/([a-fA-F0-9]{64})/gi,
    /blockchair\.com\/bitcoin\/transaction\/([a-fA-F0-9]{64})/gi,
    /btc\.com\/([a-fA-F0-9]{64})/gi,
    /mempool\.space\/tx\/([a-fA-F0-9]{64})/gi,
    /live\.blockcypher\.com\/btc\/tx\/([a-fA-F0-9]{64})/gi,
  ];
  for (const pattern of btcPatterns) {
    for (const match of text.matchAll(pattern)) {
      const h = match[1];
      if (!seenHashes.has(h)) {
        hashes.push({ hash: h, type: 'BTC' });
        seenHashes.add(h);
      }
    }
  }
  
  return hashes;
}

async function checkTRC20Transaction(txHash) {
  try {
    console.log(`🔍 [TRC20] Checking transaction: ${txHash}`);
    
    // Known TRC20 stablecoin contracts
    const TRC20_STABLECOINS = {
      [TRC20_USDT_CONTRACT]: { symbol: "USDT", decimals: 6 },
      "TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8": { symbol: "USDC", decimals: 6 },
    };
    
    // ═══ METHOD 1: Tronscan API — transaction-info endpoint ═══
    try {
      const url = `${TRONSCAN_API}/api/transaction-info?hash=${txHash}`;
      const raw = await httpRequest(url);
      const data = JSON.parse(raw);
      
      if (!data || data.error || (!data.hash && !data.contractData)) {
        console.log(`⚠️ [TRC20] Tronscan returned no data for ${txHash.slice(0,12)}...`);
      } else {
        console.log(`📋 [TRC20] Tronscan response keys: ${Object.keys(data).join(', ')}`);
        
        // Method 1a: trc20TransferInfo (newer Tronscan API field)
        if (data.trc20TransferInfo && Array.isArray(data.trc20TransferInfo) && data.trc20TransferInfo.length > 0) {
          const transfer = data.trc20TransferInfo.find(t => {
            const addr = (t.contract_address || "").trim();
            return TRC20_STABLECOINS[addr] || (t.icon_url && t.icon_url.includes("USDT")) || t.symbol === "USDT" || t.symbol === "USDC";
          });
          if (transfer) {
            const contract = TRC20_STABLECOINS[transfer.contract_address] || { symbol: transfer.symbol || "USDT", decimals: parseInt(transfer.decimals || "6") };
            const raw = transfer.amount_str || transfer.amount || "0";
            const dec = parseInt(transfer.decimals || contract.decimals || "6");
            const amount = (parseFloat(raw) / Math.pow(10, dec)).toString();
            console.log(`✅ [TRC20] Found via trc20TransferInfo: $${amount} ${contract.symbol}`);
            return { success: true, amount, toAddress: transfer.to_address || data.toAddress || "", fromAddress: transfer.from_address || data.ownerAddress || "", confirmed: data.confirmed !== false };
          }
        }
        
        // Method 1b: tokenTransferInfo (original field)
        if (data.tokenTransferInfo && Array.isArray(data.tokenTransferInfo) && data.tokenTransferInfo.length > 0) {
          const transfer = data.tokenTransferInfo.find(t => {
            const addr = (t.contract_address || "").trim();
            return TRC20_STABLECOINS[addr] || (t.tokenInfo && (t.tokenInfo.symbol === "USDT" || t.tokenInfo.symbol === "USDC"));
          });
          if (transfer) {
            const raw = transfer.amount_str || transfer.amount || "0";
            const dec = transfer.tokenInfo && transfer.tokenInfo.decimals ? parseInt(transfer.tokenInfo.decimals) : 6;
            const amount = (parseFloat(raw) / Math.pow(10, dec)).toString();
            console.log(`✅ [TRC20] Found via tokenTransferInfo: $${amount}`);
            return { success: true, amount, toAddress: transfer.to_address || data.toAddress || "", fromAddress: transfer.from_address || data.ownerAddress || "", confirmed: data.confirmed !== false };
          }
        }
        
        // Method 1c: trigger_info (smart contract call data)
        if (data.trigger_info && data.trigger_info.parameter) {
          const param = data.trigger_info.parameter;
          const contractAddr = data.trigger_info.contract_address || data.toAddress || "";
          const stablecoin = TRC20_STABLECOINS[contractAddr];
          if (stablecoin || data.trigger_info.methodName === "transfer") {
            const rawValue = param._value || param.value || param.amount || "0";
            const dec = stablecoin ? stablecoin.decimals : 6;
            const amount = (parseFloat(rawValue) / Math.pow(10, dec)).toString();
            const toAddr = param._to || param.to || "";
            if (parseFloat(amount) > 0) {
              console.log(`✅ [TRC20] Found via trigger_info: $${amount}`);
              return { success: true, amount, toAddress: toAddr, fromAddress: data.ownerAddress || "", confirmed: data.confirmed !== false };
            }
          }
        }
        
        // Method 1d: contractData (for TriggerSmartContract calls)
        if (data.contractData && data.contractData.amount) {
          const contractAddr = data.contractData.contract_address || data.toAddress || "";
          const stablecoin = TRC20_STABLECOINS[contractAddr];
          if (stablecoin) {
            const rawAmount = data.contractData.amount;
            const dec = stablecoin.decimals;
            const amount = (parseFloat(rawAmount) / Math.pow(10, dec)).toString();
            console.log(`✅ [TRC20] Found via contractData: $${amount}`);
            return { success: true, amount, toAddress: data.contractData.owner_address || data.toAddress || "", fromAddress: data.ownerAddress || "", confirmed: data.confirmed !== false };
          }
        }
        
        // Method 1e: token_info fallback
        if (data.token_info && (data.token_info.symbol === "USDT" || data.token_info.symbol === "USDC")) {
          const raw = data.amount || data.token_info.amount || "0";
          const dec = data.token_info.decimals ? parseInt(data.token_info.decimals) : 6;
          const amount = (parseFloat(raw) / Math.pow(10, dec)).toString();
          console.log(`✅ [TRC20] Found via token_info: $${amount}`);
          return { success: true, amount, toAddress: data.to_address || data.toAddress || "", fromAddress: data.from_address || data.ownerAddress || "", confirmed: data.confirmed !== false };
        }
        
        console.log(`⚠️ [TRC20] No USDT/USDC transfer found in Tronscan response. contractType=${data.contractType}, contractRet=${data.contractRet}`);
      }
    } catch (err) {
      console.log(`⚠️ [TRC20] Tronscan API error: ${err.message}`);
    }
    
    // ═══ METHOD 2: TronGrid API fallback ═══
    try {
      const tgUrl = `https://api.trongrid.io/v1/transactions/${txHash}/events`;
      const tgRaw = await httpRequest(tgUrl);
      const tgData = JSON.parse(tgRaw);
      
      if (tgData && tgData.data && Array.isArray(tgData.data)) {
        const transferEvent = tgData.data.find(e => 
          e.event_name === "Transfer" && TRC20_STABLECOINS[e.contract_address]
        );
        if (transferEvent && transferEvent.result) {
          const contract = TRC20_STABLECOINS[transferEvent.contract_address];
          const rawAmount = transferEvent.result.value || transferEvent.result._value || "0";
          const amount = (parseFloat(rawAmount) / Math.pow(10, contract.decimals)).toString();
          console.log(`✅ [TRC20] Found via TronGrid events: $${amount} ${contract.symbol}`);
          return { success: true, amount, toAddress: transferEvent.result.to || transferEvent.result._to || "", fromAddress: transferEvent.result.from || transferEvent.result._from || "", confirmed: true };
        }
      }
    } catch (err) {
      console.log(`⚠️ [TRC20] TronGrid fallback error: ${err.message}`);
    }
    
    console.log(`❌ [TRC20] All methods failed for ${txHash.slice(0,12)}...`);
    return { success: false, error: "Could not verify TRC20 transaction" };
  } catch (err) { 
    console.error(`❌ [TRC20] Fatal error: ${err.message}`);
    return { success: false, error: err.message }; 
  }
}

async function checkERC20Transaction(txHash) {
  try {
    console.log(`🔍 [ERC20] Checking transaction: ${txHash}`);
    
    // Known stablecoin contracts (lowercase for comparison)
    const STABLECOINS = {
      "0xdac17f958d2ee523a2206206994597c13d831ec7": { symbol: "USDT", decimals: 6 },
      "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": { symbol: "USDC", decimals: 6 },
      "0x6b175474e89094c44da98b954eedeac495271d0f": { symbol: "DAI", decimals: 18 },
    };
    // Transfer event topic: keccak256("Transfer(address,address,uint256)")
    const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
    
    let amount = "0";
    let fromAddress = "";
    let toAddress = "";
    let confirmed = false;
    
    // ═══ METHOD 1: Transaction Receipt (most reliable — has Transfer event logs) ═══
    try {
      const receiptUrl = `${ETHERSCAN_V2_API}?chainid=1&module=proxy&action=eth_getTransactionReceipt&txhash=${txHash}&apikey=${ETHERSCAN_API_KEY}`;
      const receiptRaw = await httpRequest(receiptUrl);
      const receiptData = JSON.parse(receiptRaw);
      
      if (receiptData.result && typeof receiptData.result === 'object') {
        const receipt = receiptData.result;
        confirmed = receipt.status === "0x1";
        fromAddress = receipt.from || "";
        toAddress = receipt.to || "";
        
        // Parse Transfer event logs to find stablecoin transfers
        if (receipt.logs && Array.isArray(receipt.logs)) {
          for (const log of receipt.logs) {
            if (log.topics && log.topics.length >= 3 && log.topics[0] === TRANSFER_TOPIC) {
              const contractAddr = (log.address || "").toLowerCase();
              const stablecoin = STABLECOINS[contractAddr];
              
              if (stablecoin) {
                // Decode amount from log data field
                const rawAmount = BigInt(log.data);
                const divisor = 10n ** BigInt(stablecoin.decimals);
                // Use Number for final result (safe for amounts up to ~9 quadrillion with 6 decimals)
                const parsedAmount = Number(rawAmount) / Number(divisor);
                amount = parsedAmount.toString();
                
                // Decode from/to addresses from indexed topics
                if (log.topics[1]) {
                  fromAddress = "0x" + log.topics[1].slice(26); // Remove 24 chars of zero-padding
                }
                if (log.topics[2]) {
                  toAddress = "0x" + log.topics[2].slice(26);
                }
                
                console.log(`✅ [ERC20] ${stablecoin.symbol} Transfer found via receipt logs: $${amount} from ${fromAddress} to ${toAddress}`);
                break; // Use the first stablecoin transfer found
              }
            }
          }
        }
        
        if (amount !== "0") {
          return { success: true, amount, toAddress, fromAddress, confirmed, hash: txHash };
        }
        console.log(`⚠️ [ERC20] No stablecoin Transfer event in receipt logs, trying input data...`);
      } else {
        console.log(`⚠️ [ERC20] Receipt API returned no result, trying transaction data...`);
      }
    } catch (receiptErr) {
      console.log(`⚠️ [ERC20] Receipt API error: ${receiptErr.message}, trying transaction data...`);
    }
    
    // ═══ METHOD 2: Transaction data (input field parsing) ═══
    try {
      const txUrl = `${ETHERSCAN_V2_API}?chainid=1&module=proxy&action=eth_getTransactionByHash&txhash=${txHash}&apikey=${ETHERSCAN_API_KEY}`;
      const txRaw = await httpRequest(txUrl);
      const txData = JSON.parse(txRaw);
      
      if (txData.result && typeof txData.result === 'object') {
        const tx = txData.result;
        if (!fromAddress) fromAddress = tx.from || "";
        const contractAddress = (tx.to || "").toLowerCase();
        const input = tx.input || "";
        
        // ERC20 transfer(address,uint256) selector = 0xa9059cbb
        // Full input: 0xa9059cbb (10 chars) + address (64 chars) + amount (64 chars) = 138 chars
        if (input.startsWith("0xa9059cbb") && input.length >= 138) {
          const recipientAddr = "0x" + input.slice(34, 74); // Extract 40-char address
          const rawAmountHex = "0x" + input.slice(74, 138); // Extract 64-char amount
          const rawAmount = BigInt(rawAmountHex);
          
          // Check if the contract is a known stablecoin
          const stablecoin = STABLECOINS[contractAddress];
          const decimals = stablecoin ? stablecoin.decimals : 6; // Default to 6 (USDT standard)
          const divisor = BigInt(Math.pow(10, decimals));
          const parsedAmount = Number(rawAmount) / Number(divisor);
          amount = parsedAmount.toString();
          toAddress = recipientAddr;
          
          const symbol = stablecoin ? stablecoin.symbol : "ERC20";
          console.log(`✅ [ERC20] ${symbol} Transfer found via input data: $${amount} to ${toAddress}`);
        } else if (tx.value && tx.value !== "0x0" && tx.value !== "0x") {
          // Native ETH transfer
          const ethAmount = Number(BigInt(tx.value)) / 1e18;
          amount = ethAmount.toString();
          toAddress = tx.to || toAddress;
          console.log(`✅ [ERC20] Native ETH transfer: ${amount} ETH to ${toAddress}`);
        }
        
        // Get confirmation status if we don't have it yet
        if (!confirmed) {
          try {
            const statusUrl = `${ETHERSCAN_V2_API}?chainid=1&module=transaction&action=gettxreceiptstatus&txhash=${txHash}&apikey=${ETHERSCAN_API_KEY}`;
            const statusRaw = await httpRequest(statusUrl);
            const statusData = JSON.parse(statusRaw);
            confirmed = statusData.status === "1" && statusData.result && statusData.result.status === "1";
          } catch {}
        }
      }
    } catch (txErr) {
      console.log(`⚠️ [ERC20] Transaction data API error: ${txErr.message}`);
    }
    
    console.log(`📊 [ERC20] Final result: amount=$${amount}, to=${toAddress}, confirmed=${confirmed}`);
    return { success: amount !== "0", amount, toAddress, fromAddress, confirmed, hash: txHash };
  } catch (err) {
    console.error(`❌ [ERC20] checkERC20Transaction error for ${txHash}:`, err.message);
    return { success: false, error: err.message };
  }
}

// v10.1: BTC transaction verification via blockchain.com API
async function checkBTCTransaction(txHash) {
  try {
    console.log(`🔍 [BTC] Checking transaction: ${txHash}`);
    
    // Method 1: blockchain.com API
    try {
      const url = `https://blockchain.info/rawtx/${txHash}`;
      const raw = await httpRequest(url);
      const data = JSON.parse(raw);
      
      if (data && data.hash) {
        let toAddress = "";
        let largestOutput = 0;
        
        if (data.out && Array.isArray(data.out)) {
          for (const out of data.out) {
            if ((out.value || 0) > largestOutput) {
              largestOutput = out.value || 0;
              toAddress = out.addr || "";
            }
          }
        }
        
        let fromAddress = "";
        if (data.inputs && Array.isArray(data.inputs) && data.inputs.length > 0) {
          fromAddress = data.inputs[0].prev_out ? data.inputs[0].prev_out.addr || "" : "";
        }
        
        const amountBTC = (largestOutput / 100000000).toFixed(8);
        const confirmed = data.block_height > 0;
        
        console.log(`✅ [BTC] Found: ${amountBTC} BTC to ${toAddress} (confirmed: ${confirmed})`);
        return { success: true, amount: `${amountBTC} BTC`, toAddress, fromAddress, confirmed, isBTC: true };
      }
    } catch (err) {
      console.log(`⚠️ [BTC] blockchain.com API error: ${err.message}`);
    }
    
    // Method 2: Blockchair API fallback
    try {
      const url = `https://api.blockchair.com/bitcoin/dashboards/transaction/${txHash}`;
      const raw = await httpRequest(url);
      const data = JSON.parse(raw);
      
      if (data && data.data && data.data[txHash]) {
        const tx = data.data[txHash].transaction;
        const outputs = data.data[txHash].outputs || [];
        
        let toAddress = "";
        let largestOutput = 0;
        for (const out of outputs) {
          if ((out.value || 0) > largestOutput) {
            largestOutput = out.value || 0;
            toAddress = out.recipient || "";
          }
        }
        
        const amountBTC = (largestOutput / 100000000).toFixed(8);
        const confirmed = tx.block_id > 0;
        
        console.log(`✅ [BTC] Found via Blockchair: ${amountBTC} BTC`);
        return { success: true, amount: `${amountBTC} BTC`, toAddress, fromAddress: "", confirmed, isBTC: true };
      }
    } catch (err) {
      console.log(`⚠️ [BTC] Blockchair API error: ${err.message}`);
    }
    
    console.log(`❌ [BTC] All methods failed for ${txHash.slice(0,12)}...`);
    return { success: false, error: "Could not verify BTC transaction" };
  } catch (err) {
    console.error(`❌ [BTC] Fatal error: ${err.message}`);
    return { success: false, error: err.message };
  }
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
app.post("/api/telegram/notify", requireAuth, (req, res) => { // v11.02 H4: auth required
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
// C2 FIX: was FINANCE_GROUP_CHAT_ID (undefined) — replaced with AFFILIte_FINANCE_GROUP_CHAT_ID
app.post("/api/telegram/screenshot/crg", requireAdmin, async (req, res) => {
  if (!bot) return res.json({ ok: false, error: "Bot not initialized" });
  try {
    const result = await screenshotModule.sendReport(bot, MONITORING_GROUP_CHAT_ID, 'crg', readJSON);
    await screenshotModule.sendReport(bot, AFFILIte_FINANCE_GROUP_CHAT_ID, 'crg', readJSON);
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
    await screenshotModule.sendReport(bot, AFFILIte_FINANCE_GROUP_CHAT_ID, 'agents', readJSON);
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
    await screenshotModule.sendReport(bot, AFFILIte_FINANCE_GROUP_CHAT_ID, 'crg', readJSON);
    const r2 = await screenshotModule.sendReport(bot, MONITORING_GROUP_CHAT_ID, 'agents', readJSON);
    await screenshotModule.sendReport(bot, AFFILIte_FINANCE_GROUP_CHAT_ID, 'agents', readJSON);
    res.json({ ok: true, message: `Reports sent: CRG (${r1.method}), Agents (${r2.method})` });
  } catch (err) {
    console.error('Report error:', err);
    res.json({ ok: false, error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// OFFER MESSAGE PARSER — Handles "Offer:" messages from Telegram
// ═══════════════════════════════════════════════════════════════

// v9.19: COMPLETELY REWRITTEN — robust multi-format offer parser
// Supports: Labeled (Geo:/Funnel:/Price:/Source:), Compact, Mixed formats
async function handleOfferMessage(bot, msg, messageText) {
  try {
    // Dedup by message ID
    if (msg.message_id) {
      if (isMessageProcessed(msg.message_id)) {
        console.log("\u23ed\ufe0f Skipping duplicate offer message:", msg.message_id);
        return;
      }
      markMessageProcessed(msg.message_id);
    }

    console.log("\ud83d\udcdd [v9.51] Received offer message:", messageText);

    // ── STEP 1: Parse using the v9.51 multi-format parser ──
    const { affiliateId, offers: parsedOffers } = parseOfferMessageV2(messageText);

    if (!affiliateId) {
      bot.sendMessage(msg.chat.id, "\u274c Could not find affiliate ID in the message.\nExpected format: Offers: <ID> [DealType] <GEO> <Price> [Source] [Funnels: X]");
      return;
    }

    console.log(`\ud83d\udce6 Affiliate: ${affiliateId}, Offers parsed: ${parsedOffers.length}`);
    parsedOffers.forEach((o, i) => console.log(`  ${i+1}. type=${o.dealType} country=${o.country} price=${o.price} funnel=${o.funnel} source=${o.source} notes=${o.notes}`));

    if (parsedOffers.length === 0) {
      bot.sendMessage(msg.chat.id, `\u274c Could not parse any offers from the message.\nAffiliate ID: ${affiliateId}`);
      return;
    }

    // ── STEP 2: Save ALL offers to offers.json ──
    // v9.51: All CRM table fields are mapped:
    //   affiliateId  → "Affiliate ID"
    //   country      → "Country"
    //   price        → "Price"
    //   crg/crRate   → "CRG"
    //   dealType     → "Deal Type"
    //   deduction    → "Deductions"
    //   funnel/funnels → "Funnels"
    //   source       → "Source"
    //   createdDate  → "Date"
    //   openBy       → "Open By"
    let existingOffers = readJSON("offers.json", []);

    // Keep offers from OTHER affiliates, remove old ones for THIS affiliate
    existingOffers = existingOffers.filter(o => String(o.affiliateId) !== String(affiliateId));

    const timestamp = new Date().toISOString().split("T")[0];
    const senderName = msg.from ? (msg.from.first_name || msg.from.username || "Telegram") : "Telegram";

    const newOfferRecords = parsedOffers.map(o => ({
      id: crypto.randomBytes(4).toString('hex'),
      affiliateId: affiliateId,
      country: o.country,
      price: o.price,
      crg: o.crRate || "",
      crRate: o.crRate || "",
      dealType: o.dealType || "",
      deduction: o.deduction || "",
      funnel: o.funnel || "",
      funnels: o.funnel || "",
      source: o.source || "",
      notes: o.notes || "",
      status: "Open",
      createdDate: timestamp,
      openBy: senderName,
      rawMessage: messageText
    }));

    existingOffers.push(...newOfferRecords);

    await lockedWrite("offers.json", existingOffers, {
      action: "create",
      user: "telegram-bot",
      details: `Added ${parsedOffers.length} offers for affiliate ${affiliateId} (by ${senderName})`
    });
    broadcastUpdate("offers", existingOffers);

    console.log(`\u2705 Saved ${parsedOffers.length} offers for affiliate ${affiliateId}`);

    // ── STEP 3: Send consolidated confirmation ──
    sendBatchOfferNotification(affiliateId, parsedOffers);

  } catch (err) {
    console.error("\u274c Error handling offer message:", err.message, err.stack);
    bot.sendMessage(msg.chat.id, `\u274c Error processing offer: ${err.message}`);
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
  
  // Deduplicate daily-cap: use record ID as primary key
  const dc = readJSON("daily-cap.json", []);
  const dcSeen = new Map();
  for (const r of dc) {
    // v10.1 FIX: Use record ID — composite keys were too aggressive
    if (r.id && dcSeen.has(r.id)) {
      const existing = dcSeen.get(r.id);
      const existTotal = (parseInt(existing.affiliates) || 0) + (parseInt(existing.brands) || 0);
      const newTotal = (parseInt(r.affiliates) || 0) + (parseInt(r.brands) || 0);
      if (newTotal > existTotal) dcSeen.set(r.id, r);
    } else if (r.id) {
      dcSeen.set(r.id, r);
    } else {
      const fallbackKey = `noid|${(r.date || '').trim()}|${(r.agent || "").trim().toLowerCase()}|${(r.affiliate || "").trim().toLowerCase()}|${(r.brokerCap || "").trim().toLowerCase()}`;
      if (!dcSeen.has(fallbackKey)) dcSeen.set(fallbackKey, r);
    }
  }
  const dcDeduped = Array.from(dcSeen.values());
  if (dcDeduped.length < dc.length) {
    await lockedWrite("daily-cap.json", dcDeduped, { action: "dedup", user: req.userSession.email, details: `Removed ${dc.length - dcDeduped.length} duplicates` });
    broadcastUpdate("daily-cap", dcDeduped);
  }
  results["daily-cap"] = { before: dc.length, after: dcDeduped.length, removed: dc.length - dcDeduped.length };

  // Deduplicate crg-deals: use record ID as primary key
  const crg = readJSON("crg-deals.json", []);
  const crgSeen = new Map();
  for (const r of crg) {
    // v10.1 FIX: Use record ID — composite keys were collapsing different legitimate deals
    if (r.id && crgSeen.has(r.id)) {
      const existing = crgSeen.get(r.id);
      const existScore = (existing.started ? 1 : 0) + (parseInt(existing.capReceived) || 0) + (parseInt(existing.ftd) || 0);
      const newScore = (r.started ? 1 : 0) + (parseInt(r.capReceived) || 0) + (parseInt(r.ftd) || 0);
      if (newScore > existScore) crgSeen.set(r.id, r);
    } else if (r.id) {
      crgSeen.set(r.id, r);
    } else {
      const fallbackKey = `noid|${(r.date || '').trim()}|${(r.affiliate || "").trim().toLowerCase()}|${(r.brokerCap || "").trim().toLowerCase()}`;
      if (!crgSeen.has(fallbackKey)) crgSeen.set(fallbackKey, r);
    }
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
app.post("/api/reconcile", requireAdmin, async (req, res) => { // v11.02 H3: admin-only
  const { table, localData } = req.body;
  if (!table || !Array.isArray(localData)) return res.status(400).json({ error: "Need table name and localData array" });
  // v11.02 H3: Limit size to prevent abuse
  if (localData.length > 5000) return res.status(400).json({ error: "localData too large (max 5000 records)" });
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
    security: { bannedIPs: [...ipBanMap.entries()].filter(([,v]) => v.banned).map(([ip, v]) => ({ ip, bannedAt: new Date(v.bannedAt).toISOString(), count: v.count })), blockedLogEntries: blockedRequestLog.size },
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
let shutdownInProgress = false; // v11.02 M3: prevent double-shutdown on SIGTERM+SIGINT
function gracefulShutdown(signal) {
  if (shutdownInProgress) return;
  shutdownInProgress = true;
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

// ── Serve built React frontend (lab/production) ──
const PUBLIC_DIR = path.join(__dirname, "public");
if (fs.existsSync(PUBLIC_DIR)) {
  app.use(express.static(PUBLIC_DIR));
  // SPA fallback — serve index.html for all non-API routes
  app.get(/^(?!\/api|\/ws).*/, (req, res) => {
    const indexFile = path.join(PUBLIC_DIR, "index.html");
    if (fs.existsSync(indexFile)) res.sendFile(indexFile);
    else res.status(404).send("Frontend not built");
  });
  console.log(`📦 Serving static frontend from ${PUBLIC_DIR}`);
}

server.listen(PORT, "0.0.0.0", () => {
  console.log(`\n╔══════════════════════════════════════════════╗`);
  console.log(`║  🚀 Blitz CRM Server v${VERSION}               ║`);
  console.log(`║  📡 HTTP + WebSocket on port ${PORT}            ║`);
  console.log(`║  💾 Data: ${DATA_DIR.slice(-30).padEnd(30)}    ║`);
  console.log(`║  📦 Hourly backups + daily snapshots (7-day)  ║`);
  console.log(`║  📋 Audit: 30-day rolling log                ║`);
  console.log(`║  🔒 WAL atomic writes + concurrency queue     ║`);
  console.log(`║  🛡️  Auto-ban attackers + path traversal block ║`);
  console.log(`║  🧹 ID-based dedup (no more record collapse)  ║`);
  console.log(`║  🪦 Tombstone system (7-day anti-resurrect)   ║`);
  console.log(`║  🔧 v10.06: GET filters tombstoned records    ║`);
  console.log(`║  🔧 v10.06: No-op save skip (reduces I/O)     ║`);
  console.log(`║  🔧 v10.06: WS broadcasts full tombstone list ║`);
  console.log(`║  🤖 Telegram: @blitzfinance_bot              ║`);
  console.log(`╚══════════════════════════════════════════════╝\n`);

  // Initial external sync on startup
  setTimeout(() => syncExternalData(), 3000);
  // Sync every 15 minutes
  setInterval(() => syncExternalData(), 15 * 60 * 1000);
});
