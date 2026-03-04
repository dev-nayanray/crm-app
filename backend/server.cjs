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
function structuredLog(module, event, result, details = {}) {
  const entry = {
    ts: new Date().toISOString(),
    module,
    event,
    result,
    ...details,
  };
  const icon = result === 'ok' ? '✅' : result === 'error' ? '❌' : result === 'skip' ? '⏭️' : '⚠️';
  console.log(`${icon} [${module}] ${event}`, JSON.stringify(entry));
  return entry;
}
const PORT = 3001;
const VERSION = "10.3";
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
  return {};
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
  if (Date.now() - ts > TOMBSTONE_TTL_MS) return false;
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
function seedUsers() {
  const usersFile = path.join(DATA_DIR, "users.json");
  let existing = [];
  try { if (fs.existsSync(usersFile)) existing = JSON.parse(fs.readFileSync(usersFile, "utf8")); } catch {}

  const existingMap = new Map(existing.map(u => [u.email, u]));
  let changed = false;

  for (const iu of INITIAL_USERS) {
    const eu = existingMap.get(iu.email);
    if (!eu) {
      existing.push(iu);
      changed = true;
      console.log(`👤 Added user: ${iu.email}`);
    } else if (!eu.passwordHash) {
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
const TELEGRAM_TOKEN = "8560973106:AAG6J4FRj8ShS-WKLOzs2TmhdaHlqCKevhA";

// Telegram Group Chat IDs (hardcoded)
const AFFILIte_FINANCE_GROUP_CHAT_ID = "-1002830517753";
const BRANDS_GROUP_CHAT_ID = "-1002796530029";
const OFFER_GROUP_CHAT_ID = "-1002183891044";
const OPEN_PAYMENT_GROUP_CHAT_ID = "-1002830517753";
const CRG_GROUP_CHAT_ID = "-1002560408661";
const MONITORING_GROUP_CHAT_ID = "-1002832299846";

function normalizeChatId(chatId) {
  if (!chatId) return null;
  const idStr = String(chatId).trim();
  if (!/^-?\d+$/.test(idStr)) return null;
  let normalizedId = idStr;
  if (idStr.startsWith('-') && !idStr.startsWith('-100')) {
    const numericPart = idStr.substring(1);
    normalizedId = `-100${numericPart}`;
    console.log(`🔧 Normalized chat ID: ${idStr} -> ${normalizedId}`);
  }
  return normalizedId;
}

function getChatIdVariants(chatId) {
  const idStr = String(chatId).replace(/-/g, '');
  return [
    chatId,
    `-100${idStr}`,
    `-${idStr.replace(/^100/, '')}`,
  ];
}

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
// v10.3: OFFER MESSAGE PARSER — Full LatAm GEO support +
//        CR rate normalization (2,5% / 3%+ / 2-3% / 2-4%+)
// ═══════════════════════════════════════════════════════════════

// FIX 1: Extended GEO codes — added LatAm countries missing in v10.2
const OFFER_GEO_CODES = new Set([
  'NL','BE','DE','FR','UK','AU','MY','SI','HR','ES','IT','GR','RO','IN','CA','AE',
  'AT','CH','CZ','PL','PT','SE','NO','DK','FI','IE','IL','ZA','NZ','SG','HK','JP',
  'KR','TW','BR','MX','AR','CL','CO','PE','TH','VN','ID','PH','TR','EG','SA','QA',
  'KW','BH','OM','US','UAE','GCC',
  // LatAm additions (v10.3):
  'DO','EC','UY','GT','PA','CR','HN','SV','BO','PY','VE','CU','PR',
]);

const OFFER_LANG_CODES = new Set(['nl','fr','en','eng','de','es','it','pt','ar','ru','zh','ja','ko','pl','tr','el','sv','da','no','fi','native']);
const OFFER_SOURCE_KEYWORDS = /^(fb|gg|google|seo|taboola|msn|sms|nativ|native|push|tiktok|snap|bing|yahoo|dsp|programmatic)/i;

const DEAL_TYPE_KEYWORDS = new Set([
  'CPA', 'CPL', 'CPS', 'CPC', 'CPM', 'CPI', 'CPO', 'CPR',
  'REVSHARE', 'REV', 'HYBRID', 'FLAT', 'FTD', 'SOI', 'DOI',
  'PPL', 'PPS', 'PPC', 'CRG',
]);

// FIX 2: CR rate normalizer — handles European decimals, ranges, trailing +
// Examples: "3%+" → "3%", "2,5%" → "2.5%", "2-3%" → "3%", "2-4%+" → "4%"
function normalizeCRToken(t) {
  if (!t) return t;
  // Strip trailing +
  let s = t.replace(/\+$/, '');
  // European decimal comma → dot
  s = s.replace(/(\d),(\d)/g, '$1.$2');
  // Range "2-3%" → take the higher value
  const rangeMatch = s.match(/^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)(%?)$/);
  if (rangeMatch) s = rangeMatch[2] + rangeMatch[3];
  return s;
}

// FIX 3: CR rate token detector — recognizes all variant formats
// Matches: "14%", "15%", "3%+", "2,5%", "2-3%", "2-4%+", "2.5%"
function isCRRateToken(t) {
  return /^\d[\d,.-]*%\+?$/.test(t);
}

function parseOfferMessageV2(messageText) {
  if (!messageText) return { affiliateId: null, offers: [] };
  const fullText = messageText.trim();

  const headerMatch = fullText.match(/^offers?\s*:\s*(\d+)?/i);
  if (!headerMatch) return { affiliateId: null, offers: [] };

  let affiliateId = headerMatch[1] || null;
  let remaining = fullText.slice(headerMatch[0].length).trim();

  if (!affiliateId) {
    const lines = remaining.split('\n');
    const firstLine = lines[0].trim();
    if (/^\d+$/.test(firstLine)) {
      affiliateId = firstLine;
      remaining = lines.slice(1).join('\n').trim();
    }
  }

  if (/(?:^|\n)\s*(?:geo|country)\s*:/im.test(remaining)) {
    const result = parseOfferLabeledFormat(remaining);
    if (result.affiliateId) affiliateId = affiliateId || result.affiliateId;
    return { affiliateId, offers: result.offers };
  }

  const affLineMatch = remaining.match(/^(?:affiliate\s*(?:id)?)\s*:\s*(\d+)$/im);
  if (affLineMatch && !affiliateId) {
    affiliateId = affLineMatch[1];
    remaining = remaining.replace(affLineMatch[0], '').trim();
  }

  let sharedFunnels = '', sharedSource = '', sharedDeduction = '';

  // ── Label extraction helpers ──────────────────────────────────────────────
  // LABEL_STOP matches any label keyword that should terminate a value:
  //   Source:  Funnels:  Funnel:  Deduction:  Deductions:  Geo:  Country:
  // Used to split same-line multi-label text like "Deductions : 15% Funnels:Brand"
  const LABEL_STOP = /(?:Source|Funnels?|Deductions?|Geo|Country)\s*:/i;

  // extractLabel(text, labelRegex) → { value, cleaned }
  // Finds `Label: VALUE` and stops value at the next label OR newline OR end
  function extractLabel(text, labelRe) {
    // labelRe must capture the label + colon, e.g. /\bDeductions?\s*:/i
    const labelMatch = labelRe.exec(text);
    if (!labelMatch) return null;
    const afterLabel = text.slice(labelMatch.index + labelMatch[0].length);
    // Value ends at: next label keyword OR newline OR end-of-string
    const stopMatch = LABEL_STOP.exec(afterLabel);
    const valueRaw = stopMatch
      ? afterLabel.slice(0, stopMatch.index)
      : afterLabel.split('\n')[0];
    const value = valueRaw.replace(/^\s*,?\s*/, '').replace(/\s*,?\s*$/, '').trim();
    // Remove the matched label+value from the original text
    const fullMatch = text.slice(labelMatch.index, labelMatch.index + labelMatch[0].length + valueRaw.length);
    const cleaned = text.replace(fullMatch, ' ').trim();
    return { value, cleaned };
  }

  // 1. Extract Deductions first (so "Deductions: 15% Funnels:..." splits correctly)
  const dedResult = extractLabel(remaining, /\bDeductions?\s*:/i);
  if (dedResult && dedResult.value) {
    sharedDeduction = dedResult.value;
    remaining = dedResult.cleaned;
  }

  // 2. Extract Source
  const srcResult = extractLabel(remaining, /\bSource\s*:/i);
  if (srcResult && srcResult.value) {
    sharedSource = srcResult.value;
    remaining = srcResult.cleaned;
  }

  // 3. Extract Funnels (last, so its value can contain commas freely)
  const funResult = extractLabel(remaining, /\bFunnels?\s*:/i);
  if (funResult && funResult.value) {
    sharedFunnels = funResult.value.replace(/__/g, '').replace(/\s*\/\s*/g, ' / ');
    remaining = funResult.cleaned;
  }
  // ─────────────────────────────────────────────────────────────────────────

  // Drop any leftover bare label lines (shouldn't be any, safety net)
  const lines = remaining.split('\n').map(l => l.trim()).filter(l => l && !/^(funnels?|source|deductions?|affiliate)\s*:/i.test(l));

  // hasExplicitLabels = true when Funnels:/Source:/Deductions: label lines were present.
  // When true:
  //   1. offerParseTokens will NOT auto-extract source keywords (Taboola, FB, etc.) from
  //      the inline offer line — they stay in funnel tokens.
  //   2. sharedFunnels/sharedSource/sharedDeduction OVERRIDE whatever inline parsing found,
  //      because the explicit labels are the authoritative values.
  const hasExplicitLabels = !!(sharedFunnels || sharedSource || sharedDeduction);

  const offers = [];
  for (const line of lines) offers.push(...offerSplitLine(line, hasExplicitLabels));

  for (const o of offers) {
    if (hasExplicitLabels) {
      // Labels win — always overwrite what inline token parsing extracted
      if (sharedFunnels)   o.funnel     = sharedFunnels;
      if (sharedSource)    o.source     = sharedSource;
      if (sharedDeduction) o.deduction  = sharedDeduction;
    } else {
      // No labels — only fill blanks (don't overwrite inline extraction)
      if (!o.funnel     && sharedFunnels)   o.funnel     = sharedFunnels;
      if (!o.source     && sharedSource)    o.source     = sharedSource;
      if (!o.deduction  && sharedDeduction) o.deduction  = sharedDeduction;
    }
  }

  return { affiliateId, offers };
}

function parseOfferLabeledFormat(text) {
  const offers = [];
  let currentOffer = { country:'', dealType:'', funnel:'', price:'', source:'', deduction:'', crRate:'', notes:'' };
  let affiliateId = null;

  for (const line of text.split('\n').map(l => l.trim()).filter(l => l)) {
    const affM = line.match(/^affiliate\s*(?:id)?\s*:\s*(\d+)$/i);
    if (affM) { affiliateId = affM[1]; continue; }

    const gM = line.match(/^(?:geo|country)\s*:\s*(.+)$/i);
    if (gM) {
      if (currentOffer.country) {
        offers.push(currentOffer);
        currentOffer = { country:'', dealType:'', funnel:'', price:'', source:'', deduction:'', crRate:'', notes:'' };
      }
      currentOffer.country = offerExpandGeo(gM[1].trim());
      continue;
    }

    const fM = line.match(/^funnels?\s*:\s*(.+)$/i);
    if (fM) { currentOffer.funnel = fM[1].trim().replace(/__/g,''); continue; }

    const pM = line.match(/^price\s*:\s*(.+)$/i);
    if (pM) {
      const priceLine = pM[1].trim();
      const crgMatch = priceLine.match(/CRG\s*:?\s*(\d[\d,.-]*%?\+?)/i);
      if (crgMatch) {
        currentOffer.crRate = normalizeCRToken(crgMatch[1]);
        if (!currentOffer.dealType) currentOffer.dealType = 'CRG';
      }
      const priceMatch = priceLine.match(/^\$?([\d,]+)/);
      if (priceMatch) currentOffer.price = priceMatch[1].replace(/,/g, '');
      continue;
    }

    const crgM = line.match(/^crg\s*:?\s*(\d[\d,.-]*%?\+?)$/i);
    if (crgM) {
      currentOffer.crRate = normalizeCRToken(crgM[1]);
      if (!currentOffer.dealType) currentOffer.dealType = 'CRG';
      continue;
    }

    const sM = line.match(/^source\s*:\s*(.+)$/i);
    if (sM) { currentOffer.source = sM[1].trim(); continue; }

    const dtM = line.match(/^(?:deal\s*type|type)\s*:\s*(.+)$/i);
    if (dtM) { currentOffer.dealType = dtM[1].trim(); continue; }

    const dM = line.match(/^deductions?\s*:\s*([^,\n]+)/i);
    if (dM) { currentOffer.deduction = dM[1].trim(); continue; }

    if (line && !line.match(/^[\s]*$/)) {
      currentOffer.notes = currentOffer.notes ? currentOffer.notes + '; ' + line : line;
    }
  }

  if (currentOffer.country) offers.push(currentOffer);
  return { offers, affiliateId };
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

// FIX 4: offerIsGeoBoundary — ONLY triggers for known GEO codes
// Prevents brand names like YPF, BCP, UTE, PEMEX from being treated as geo boundaries
// Also prevents "CR" being treated as Costa Rica when it appears in "CR 3%+" context —
// that ambiguity is resolved in offerSplitLine by passing nextWord for lookahead.
function offerIsGeoBoundary(word, nextWord) {
  if (!word || !/^[A-Z]/.test(word)) return false;
  const upper = word.toUpperCase();
  if (DEAL_TYPE_KEYWORDS.has(upper)) return false;
  // "CR" is ambiguous: Costa Rica (GEO) vs CR-rate keyword.
  // If the next word looks like a percentage/number, treat as rate keyword not GEO boundary.
  if (upper === 'CR' && nextWord && /^\d[\d,.-]*%?\+?$/.test(nextWord)) return false;
  // Must be ALL-CAPS and exist in known GEO codes set
  if (OFFER_GEO_CODES.has(upper) && word === upper) return true;
  // Compound geo+lang (e.g. "NLnl", "FRfr") — first part must be in GEO codes
  if (word.length >= 4 && word.length <= 6) {
    const p2 = word.slice(0,2).toUpperCase(), s2 = word.slice(2).toLowerCase();
    if (OFFER_GEO_CODES.has(p2) && OFFER_LANG_CODES.has(s2) && word.slice(0,2) === p2) return true;
    const p3 = word.slice(0,3).toUpperCase(), s3 = word.slice(3).toLowerCase();
    if (OFFER_GEO_CODES.has(p3) && OFFER_LANG_CODES.has(s3) && word.slice(0,3) === p3) return true;
  }
  return false;
}

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

function offerSplitLine(line, hasExplicitLabels) {
  if (!line.trim()) return [];

  const words = line.split(/\s+/).filter(w => w);
  if (words.length === 0) return [];

  const cleanWords = words.map(w => w.replace(/,+$/, ''));

  const offers = [];
  let currentTokens = [];
  let currentOrigTokens = [];

  for (let wi = 0; wi < cleanWords.length; wi++) {
    const word = cleanWords[wi];
    const origWord = words[wi];

    if (offerIsGeoBoundary(word, cleanWords[wi + 1]) && currentTokens.length > 0) {
      const hasGeoInCurrent = currentTokens.some(t => offerExtractGeo(t) !== null);
      if (hasGeoInCurrent) {
        offers.push(offerParseTokens(currentTokens, currentOrigTokens, hasExplicitLabels));
        currentTokens = [word];
        currentOrigTokens = [origWord];
      } else {
        currentTokens.push(word);
        currentOrigTokens.push(origWord);
      }
    } else {
      currentTokens.push(word);
      currentOrigTokens.push(origWord);
    }
  }
  if (currentTokens.length > 0) offers.push(offerParseTokens(currentTokens, currentOrigTokens, hasExplicitLabels));

  // Handle comma-separated geos sharing one offer
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

function offerParseTokens(tokens, origTokens, hasExplicitLabels) {
  const o = { country:'', dealType:'', funnel:'', price:'', source:'', deduction:'', crRate:'', notes:'' };
  if (!tokens || tokens.length === 0) return o;

  const cleaned = tokens.map(t => t.replace(/^,+|,+$/g, ''));
  const orig = origTokens || tokens;
  let idx = 0;

  // Phase 1: Collect deal type words BEFORE the geo code
  const dealTypeParts = [];
  while (idx < cleaned.length) {
    const geoInfo = offerExtractGeo(cleaned[idx]);
    if (geoInfo) break;
    if (/^\$?\d/.test(cleaned[idx]) && !DEAL_TYPE_KEYWORDS.has(cleaned[idx].toUpperCase())) break;
    // FIX: Don't consume CR rate tokens as deal type parts
    if (isCRRateToken(cleaned[idx])) break;
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

  // Phase 3: Parse remaining tokens
  const funnelParts = [];
  let foundDealTypeAfterGeo = false;

  for (let i = idx; i < cleaned.length; i++) {
    const t = cleaned[i], tl = t.toLowerCase(), tu = t.toUpperCase();
    const origToken = orig[i];

    // Deal type keyword
    if (DEAL_TYPE_KEYWORDS.has(tu)) {
      if (!o.dealType) {
        o.dealType = tu;
      } else if (o.price && !foundDealTypeAfterGeo) {
        const remaining = tokens.slice(i).join(' ');
        o.notes = o.notes ? o.notes + '; ' + remaining : remaining;
        break;
      }
      foundDealTypeAfterGeo = true;
      continue;
    }

    // Skip dashes and pipes used as separators
    if (t === '-' || t === '–' || t === '|') continue;

    // FIX 5: CR rate — standalone percentage with all variant formats
    // MUST CHECK BEFORE PRICE (both start with digit)
    // Handles: "14%", "3%+", "2,5%", "2-3%", "2-4%+", "2.5%"
    if (isCRRateToken(t) && !o.crRate) {
      o.crRate = normalizeCRToken(t);
      if (!o.dealType) o.dealType = 'CRG';
      continue;
    }

    // Price — $N or plain N (but NOT a CR rate token)
    if (!o.price && /^\$?\d/.test(t) && !isCRRateToken(t)) {
      // FIX 6: Normalize European decimal commas in price before processing
      let ps = t.replace(/^\$/, '').replace(/,(?=\d{3})/g, ''); // strip thousands commas
      // Note: decimal commas like "700+2,5%" handled after extraction

      // Continue collecting tokens that are part of the price expression
      while (i+1 < cleaned.length) {
        const nx = cleaned[i+1];
        if (/^[\+\*]$/.test(nx)) { ps += nx; i++; }
        else if (/^[\+\*]\d/.test(nx)) { ps += nx; i++; }
        else if (/^\d+[\d,.-]*%?\+?$/.test(nx) && /[\+\*]$/.test(ps)) { ps += nx; i++; }
        else break;
      }

      // FIX 7: Normalize European commas in the full price string (e.g. "700+2,5%")
      ps = ps.replace(/(\d),(\d)/g, '$1.$2');
      o.price = ps;

      // Extract CRG rate from price if it has +N% pattern (e.g., "600+3%", "700+2.5%")
      const crgMatch = o.price.match(/\+(\d[\d.]*%?\+?)$/);
      if (crgMatch && !o.crRate) {
        o.crRate = normalizeCRToken(crgMatch[1]);
        if (!o.dealType) o.dealType = 'CRG';
      }
      continue;
    }

    // Price continuation with +N%
    if (/^\+\d[\d,.-]*%?\+?$/.test(t)) {
      if (o.price) {
        // Normalize comma decimals
        const normalized = t.replace(/(\d),(\d)/g, '$1.$2');
        o.price += normalized;
        const crgMatch = normalized.match(/^\+(\d[\d.]*%?\+?)$/);
        if (crgMatch && !o.crRate) {
          o.crRate = normalizeCRToken(crgMatch[1]);
          if (!o.dealType) o.dealType = 'CRG';
        }
      } else {
        o.price = t.replace(/(\d),(\d)/g, '$1.$2');
      }
      continue;
    }

    // Deductions
    if (/deduct/i.test(t)) { const nx = cleaned[i+1]; if (nx && /^\d+%?$/.test(nx)) { o.deduction = nx; i++; } continue; }
    if (/^\d+%$/.test(t) && i+1 < cleaned.length && /deduct/i.test(cleaned[i+1])) { o.deduction = t; i++; continue; }

    // CR keyword — "CR 3%+" or "CR 2-4%+" or "CR 10"
    if (/^cr$/i.test(t) && i+1 < cleaned.length && /^\d/.test(cleaned[i+1])) {
      o.crRate = normalizeCRToken(cleaned[i+1]);
      if (!o.dealType) o.dealType = 'CRG';
      i++;
      continue;
    }

    // "Funnel" or "Funnels" keyword as inline label
    if (/^funnels?$/i.test(t)) {
      const funnelRest = [];
      for (let j = i+1; j < cleaned.length; j++) {
        const ft = cleaned[j];
        if (offerIsGeoBoundary(ft)) break;
        funnelRest.push(orig[j]);
      }
      if (funnelRest.length > 0) {
        const funnelStr = funnelRest.join(' ').replace(/__/g, '').trim();
        o.funnel = o.funnel ? o.funnel + ', ' + funnelStr : funnelStr;
        i += funnelRest.length;
      }
      continue;
    }

    // Source keywords (GG, FB, SEO, Taboola, etc.)
    // Source is ONLY set via an explicit "Source: ..." label line.
    // If source keywords appear inline on the offer line (e.g. "...MalpeVest Taboola"),
    // they are part of the funnel — the user intentionally put them there.
    // Do NOT auto-detect source from inline tokens.

    // Everything else goes to funnels
    funnelParts.push(origToken);
  }

  if (funnelParts.length > 0) {
    const funnelStr = funnelParts.join(' ').replace(/__/g, '').replace(/\s*,\s*/g, ', ').trim();
    o.funnel = o.funnel ? funnelStr + ', ' + o.funnel : funnelStr;
  }

  // Auto-set deal type if we have CR rate but no deal type
  if (o.crRate && !o.dealType) o.dealType = 'CRG';

  // Auto-detect CRG from price pattern (e.g., "600+3%")
  if (!o.dealType && o.price && /\+\d[\d.]*%/.test(o.price)) {
    o.dealType = 'CRG';
    if (!o.crRate) {
      const crgMatch = o.price.match(/\+(\d[\d.]*%?)$/);
      if (crgMatch) o.crRate = normalizeCRToken(crgMatch[1]);
    }
  }

  return o;
}

// ═══════════════════════════════════════════════════════════════
// TELEGRAM NOTIFICATION HELPERS
// ═══════════════════════════════════════════════════════════════

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

function sendBatchOfferNotification(affiliateId, offers) {
  if (!TELEGRAM_TOKEN || TELEGRAM_TOKEN === "YOUR_BOT_TOKEN_HERE") {
    console.log("📱 Batch offer notification skipped (no token configured)");
    return;
  }

  if (typeof bot !== 'undefined' && bot && bot.sendMessage) {
    const message = formatBatchOfferConfirmation(affiliateId, offers);
    if (typeof OFFER_GROUP_CHAT_ID !== 'undefined') {
      bot.sendMessage(OFFER_GROUP_CHAT_ID, message, { parse_mode: "HTML" })
        .then(() => console.log(`✅ Batch offer notification sent to Telegram for affiliate ${affiliateId}`))
        .catch(err => console.error("❌ Batch offer notification error:", err.message));
    }
  } else {
    const message = formatBatchOfferConfirmation(affiliateId, offers);
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
        if (res.statusCode !== 200) console.log("❌ Batch offer notification error:", d);
        else console.log(`✅ Batch offer notification sent: ${offers.length} offers for affiliate ${affiliateId}`);
      });
    });
    req.on('error', err => console.error("❌ Batch offer notification error:", err.message));
    req.write(postData);
    req.end();
  }
}

// ═══════════════════════════════════════════════════════════════
// MAIN OFFER HANDLER
// ═══════════════════════════════════════════════════════════════

async function handleOfferMessage(bot, msg, messageText) {
  try {
    if (msg.message_id) {
      if (isMessageProcessed(msg.message_id)) {
        console.log("⏭️ Skipping duplicate offer message:", msg.message_id);
        return;
      }
      markMessageProcessed(msg.message_id);
    }

    console.log("📝 [v10.3] Received offer message:", messageText);

    const { affiliateId, offers: parsedOffers } = parseOfferMessageV2(messageText);

    if (!affiliateId) {
      bot.sendMessage(msg.chat.id, "❌ Could not find affiliate ID in the message.\nExpected format: Offer: <ID> <GEO> <Price> <CRG%> <Source> <Funnel>");
      return;
    }

    console.log(`📦 Affiliate: ${affiliateId}, Offers parsed: ${parsedOffers.length}`);
    parsedOffers.forEach((o, i) => console.log(`  ${i+1}. type=${o.dealType} country=${o.country} price=${o.price} crg=${o.crRate} source=${o.source} funnel=${o.funnel}`));

    if (parsedOffers.length === 0) {
      bot.sendMessage(msg.chat.id, `❌ Could not parse any offers from the message.\nAffiliate ID: ${affiliateId}`);
      return;
    }

    let existingOffers = readJSON("offers.json", []);
    existingOffers = existingOffers.filter(o => String(o.affiliateId) !== String(affiliateId));

    const timestamp = new Date().toISOString().split("T")[0];
    const senderName = msg.from ? (msg.from.first_name || msg.from.username || "Telegram") : "Telegram";

    // Build records with ALL field name variants so both offers.json and deals.json tables work
    const newOfferRecords = parsedOffers.map(o => ({
      id: crypto.randomBytes(4).toString('hex'),

      // ── Affiliate ID — stored under BOTH names ──
      affiliate:   affiliateId,   // deals.json / CRM main table field
      affiliateId: affiliateId,   // offers.json legacy field

      // ── GEO ──
      country: o.country || '',

      // ── Pricing ──
      price:    o.price   || '',
      crg:      o.crRate  || '',   // deals table reads d.crg
      crRate:   o.crRate  || '',   // offers table reads crRate

      // ── Deal type ──
      dealType: o.dealType || (o.crRate ? 'CRG' : ''),

      // ── Deduction — deals table reads d.deduction ──
      deduction: o.deduction || '',

      // ── Funnels — deals table reads d.funnels ──
      funnel:  o.funnel || '',    // offers table
      funnels: o.funnel || '',    // deals table reads d.funnels

      // ── Source — deals table reads d.source ──
      source: o.source || '',

      // ── Date + Time — CRM table reads both ──
      date:        timestamp,     // YYYY-MM-DD
      createdDate: timestamp,
      time:        new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }), // HH:MM

      notes:   o.notes || '',
      status:  "Open",
      openBy:  senderName,
      rawMessage: messageText,
      updatedAt: Date.now(),
    }));

    // Save to offers.json (Telegram offers view)
    existingOffers.push(...newOfferRecords);
    await lockedWrite("offers.json", existingOffers, {
      action: "create",
      user: "telegram-bot",
      details: `Added ${parsedOffers.length} offers for affiliate ${affiliateId} (by ${senderName})`
    });
    broadcastUpdate("offers", existingOffers);

    // ALSO save to deals.json (CRM main table) — this is what the frontend reads
    let existingDeals = readJSON("deals.json", []);
    // Remove old Telegram offers from this affiliate to avoid stale duplicates
    existingDeals = existingDeals.filter(d =>
      !(String(d.affiliate) === String(affiliateId) && d._fromTelegram === true)
    );
    const dealsRecords = newOfferRecords.map(r => ({ ...r, _fromTelegram: true }));
    existingDeals.push(...dealsRecords);
    await lockedWrite("deals.json", existingDeals, {
      action: "create",
      user: "telegram-bot",
      details: `Added ${parsedOffers.length} deals for affiliate ${affiliateId} from Telegram`
    });
    broadcastUpdate("deals", existingDeals);

    console.log(`✅ Saved ${parsedOffers.length} offers for affiliate ${affiliateId} → offers.json + deals.json`);

    sendBatchOfferNotification(affiliateId, parsedOffers);

  } catch (err) {
    console.error("❌ Error handling offer message:", err.message, err.stack);
    bot.sendMessage(msg.chat.id, `❌ Error processing offer: ${err.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════
// 2. ATOMIC FILE OPERATIONS WITH VERSION TRACKING
// ═══════════════════════════════════════════════════════════════

const dataVersions = {};
const dataLocks = new Map();

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
  try {
    const backupDirs = fs.readdirSync(BACKUP_DIR).sort().reverse();
    for (const dir of backupDirs) {
      const backupFile = path.join(BACKUP_DIR, dir, filename);
      if (fs.existsSync(backupFile)) {
        const backupRaw = fs.readFileSync(backupFile, "utf8");
        const backupData = JSON.parse(backupRaw);
        if (Array.isArray(backupData) && backupData.length > 0) {
          console.log(`🔧 AUTO-RECOVERED ${filename} from backup ${dir} (${backupData.length} records)`);
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

function writeJSONAtomic(filename, data) {
  const filepath = path.join(DATA_DIR, filename);
  const tempPath = filepath + `.tmp.${Date.now()}.${crypto.randomBytes(4).toString('hex')}`;
  const walPath = filepath + `.wal.${Date.now()}`;

  try {
    const jsonStr = JSON.stringify(data, null, 2);
    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed)) throw new Error("Data is not an array after round-trip");
    if (jsonStr.length < 3) throw new Error("Suspiciously small payload");

    fs.writeFileSync(walPath, jsonStr, "utf8");
    fs.writeFileSync(tempPath, jsonStr, "utf8");

    const verify = fs.readFileSync(tempPath, "utf8");
    if (verify !== jsonStr) throw new Error("Temp file content mismatch — disk corruption?");

    fs.renameSync(tempPath, filepath);
    try { fs.unlinkSync(walPath); } catch {}

    const key = filename.replace('.json', '');
    dataVersions[key] = (dataVersions[key] || 0) + 1;

    return true;
  } catch (err) {
    console.error(`❌ Atomic write failed for ${filename}:`, err.message);
    try { if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath); } catch {}
    try { if (fs.existsSync(walPath)) fs.unlinkSync(walPath); } catch {}
    return false;
  }
}

const writeQueues = {};

async function lockedWrite(filename, data, meta) {
  const key = filename.replace('.json', '');

  const prev = writeQueues[key] || Promise.resolve();
  const current = prev.then(async () => {
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
// 3. AUDIT LOGGING
// ═══════════════════════════════════════════════════════════════

function writeAuditLog(table, action, user, details) {
  try {
    const now = new Date();
    const dateKey = now.toISOString().split('T')[0];
    const logFile = path.join(AUDIT_DIR, `audit_${dateKey}.jsonl`);

    const entry = {
      timestamp: now.toISOString(),
      table,
      action,
      user,
      details,
      ip: null,
    };

    fs.appendFileSync(logFile, JSON.stringify(entry) + "\n", "utf8");
  } catch (err) {
    console.error("⚠️ Audit log error:", err.message);
  }
}

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
setInterval(cleanupAuditLogs, 24 * 60 * 60 * 1000);

// ═══════════════════════════════════════════════════════════════
// 4. CONFLICT RESOLUTION — Version Tracking
// ═══════════════════════════════════════════════════════════════

function getVersion(table) {
  if (!dataVersions[table]) {
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
// INTERNAL DATA SYNC
// ═══════════════════════════════════════════════════════════════
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

function createBackup(label) {
  const ts = label || new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const backupPath = path.join(BACKUP_DIR, ts);
  if (!fs.existsSync(backupPath)) fs.mkdirSync(backupPath, { recursive: true });

  const endpoints = ["payments", "customer-payments", "users", "crg-deals", "daily-cap", "deals", "wallets", "offers", "ftd-entries"];
  let count = 0;
  endpoints.forEach(ep => {
    const src = path.join(DATA_DIR, ep + ".json");
    const dst = path.join(backupPath, ep + ".json");
    if (fs.existsSync(src)) { fs.copyFileSync(src, dst); count++; }
  });

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

    const kept = new Set();
    const dailyKept = new Set();

    dirs.forEach(d => {
      try {
        const ts = new Date(d.replace(/(\d{4})-(\d{2})-(\d{2})T(\d{2})-(\d{2})-(\d{2})/, '$1-$2-$3T$4:$5:$6'));
        const age = now - ts.getTime();
        const dayKey = d.slice(0, 10);

        if (age < TWO_DAYS) {
          kept.add(d);
        } else if (age < THIRTY_DAYS && !dailyKept.has(dayKey)) {
          kept.add(d);
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

setInterval(createBackup, 60 * 60 * 1000);
setTimeout(() => createBackup("startup-" + new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)), 2000);

(function startupIntegrityCheck() {
  try {
    const endpoints = ["payments", "customer-payments", "crg-deals", "daily-cap", "deals", "offers", "partners", "ftd-entries"];

    const backupSources = [];

    try {
      const shutdownDirs = fs.readdirSync(BACKUP_DIR).filter(d => d.startsWith("shutdown-")).sort().reverse();
      shutdownDirs.forEach(d => backupSources.push({ path: path.join(BACKUP_DIR, d), label: `shutdown/${d}` }));
    } catch {}

    try {
      const allBackups = fs.readdirSync(BACKUP_DIR).filter(d => !d.startsWith("shutdown-") && !d.startsWith("safety-")).sort().reverse();
      allBackups.forEach(d => backupSources.push({ path: path.join(BACKUP_DIR, d), label: `backup/${d}` }));
    } catch {}

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

      for (const source of backupSources) {
        const backupFile = path.join(source.path, ep + ".json");
        if (!fs.existsSync(backupFile)) continue;
        try {
          const backupData = JSON.parse(fs.readFileSync(backupFile, "utf8"));
          if (!Array.isArray(backupData) || backupData.length === 0) continue;

          if (currentData.length < backupData.length * 0.5 && backupData.length > 3) {
            console.log(`🔧 STARTUP RESTORE [${ep}]: current=${currentData.length}, backup=${backupData.length} (from ${source.label}). Restoring.`);
            fs.writeFileSync(dataFile, JSON.stringify(backupData, null, 2), "utf8");
            currentData = backupData;
            restored++;
            break;
          } else {
            break;
          }
        } catch {}
      }
    });
    if (restored > 0) console.log(`🔧 STARTUP: Restored ${restored} data files from backups`);
    else console.log(`✅ STARTUP: All data files pass integrity check`);
  } catch (e) { console.error("⚠️ Startup integrity check error:", e.message); }
})();

// ═══════════════════════════════════════════════════════════════
// DAILY SNAPSHOT SYSTEM
// ═══════════════════════════════════════════════════════════════
const SNAPSHOT_DIR = path.join(__dirname, "snapshots");
if (!fs.existsSync(SNAPSHOT_DIR)) fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });

function createDailySnapshot() {
  const dateKey = new Date().toISOString().split('T')[0];
  const snapPath = path.join(SNAPSHOT_DIR, dateKey);
  if (fs.existsSync(snapPath)) { console.log(`📸 Daily snapshot ${dateKey} already exists — skipping`); return; }
  fs.mkdirSync(snapPath, { recursive: true });

  const endpoints = ["payments", "customer-payments", "users", "crg-deals", "daily-cap", "deals", "wallets", "offers", "ftd-entries", "partners"];
  let count = 0;
  endpoints.forEach(ep => {
    const src = path.join(DATA_DIR, ep + ".json");
    if (fs.existsSync(src)) { fs.copyFileSync(src, path.join(snapPath, ep + ".json")); count++; }
  });
  console.log(`📸 Daily snapshot created: ${dateKey} (${count} files)`);

  try {
    const dirs = fs.readdirSync(SNAPSHOT_DIR).sort();
    while (dirs.length > 7) {
      const old = dirs.shift();
      fs.rmSync(path.join(SNAPSHOT_DIR, old), { recursive: true, force: true });
      console.log(`🗑️ Old snapshot removed: ${old}`);
    }
  } catch (err) { console.error("⚠️ Snapshot cleanup error:", err.message); }
}

async function nightlyDedup() {
  console.log("🧹 Nightly auto-dedup starting...");
  let totalRemoved = 0;

  try {
    const dc = readJSON("daily-cap.json", []);
    const seen = new Map();
    dc.forEach(r => {
      if (r.id && seen.has(r.id)) {
        const existing = seen.get(r.id);
        if (Object.keys(r).length > Object.keys(existing).length) seen.set(r.id, r);
      } else if (r.id) {
        seen.set(r.id, r);
      } else {
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

  try {
    const crg = readJSON("crg-deals.json", []);
    const seen = new Map();
    crg.forEach(r => {
      if (r.id && seen.has(r.id)) {
        const existing = seen.get(r.id);
        if (Object.keys(r).length > Object.keys(existing).length) seen.set(r.id, r);
      } else if (r.id) {
        seen.set(r.id, r);
      } else {
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
    cleanupTombstones();
    setInterval(nightlyDedup, 24 * 60 * 60 * 1000);
    setInterval(cleanupTombstones, 24 * 60 * 60 * 1000);
  }, delay3);

  console.log(`⏰ Nightly tasks scheduled: snapshot at 02:00 (in ${Math.round(delay2/60000)}min), dedup+tombstone cleanup at 03:00`);
}

setTimeout(createDailySnapshot, 5000);
scheduleNightlyTasks();

// ═══════════════════════════════════════════════════════════════
// 6. EXPRESS + SECURITY MIDDLEWARE
// ═══════════════════════════════════════════════════════════════

const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || "").split(",").filter(Boolean);
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (origin.includes("localhost") || origin.includes("127.0.0.1")) return callback(null, true);
    if (ALLOWED_ORIGINS.length > 0 && ALLOWED_ORIGINS.some(o => origin.includes(o))) return callback(null, true);
    if (ALLOWED_ORIGINS.length === 0) return callback(null, true);
    callback(new Error("CORS blocked"));
  },
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));

function sanitizeValue(val) {
  if (typeof val === 'string') {
    return val
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
      .replace(/javascript\s*:/gi, '')
      .replace(/data\s*:\s*text\/html/gi, '')
      .trim();
  }
  if (Array.isArray(val)) return val.map(sanitizeValue);
  if (val && typeof val === 'object') {
    const clean = {};
    for (const [k, v] of Object.entries(val)) {
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

app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed' || err instanceof SyntaxError) {
    return res.status(400).json({ error: "Invalid JSON in request body" });
  }
  next(err);
});

const SESSION_DURATION = 14 * 24 * 60 * 60 * 1000;
const SESSION_FILE = path.join(DATA_DIR, ".sessions.json");

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
setInterval(cleanupSessions, 60 * 60 * 1000);

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
  req.userSession = session;
  next();
}

const ADMIN_EMAILS = ["office1092021@gmail.com", "y0505300530@gmail.com", "wpnayanray@gmail.com"];
function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (!ADMIN_EMAILS.includes(req.userSession.email)) {
      return res.status(403).json({ error: "Admin access required" });
    }
    next();
  });
}

const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000;
const RATE_LIMIT_MAX = 300;

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

const ipBanMap = new Map();
const IP_BAN_THRESHOLD = 15;
const IP_BAN_DURATION = 24 * 60 * 60 * 1000;
const IP_BAN_WINDOW = 60 * 60 * 1000;

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

const blockedRequestLog = new Map();
const BLOCKED_LOG_COOLDOWN = 3600000;

app.use((req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';

  const banEntry = ipBanMap.get(ip);
  if (banEntry && banEntry.banned) {
    if (Date.now() - banEntry.bannedAt < IP_BAN_DURATION) {
      return res.status(403).json({ error: "Forbidden" });
    }
    ipBanMap.delete(ip);
  }

  const blocked = ['/wp-admin', '/wp-login', '/.env', '/phpinfo', '/admin.php', '/.git', '/config', '/xmlrpc', '/@fs/', '/../', '/..%2f', '/.htaccess', '/web.config', '/composer.json', '/package.json'];
  if (blocked.some(b => req.path.toLowerCase().includes(b))) {
    const logKey = `${ip}|${req.path}`;
    const now = Date.now();
    const lastLogged = blockedRequestLog.get(logKey) || 0;
    if (now - lastLogged > BLOCKED_LOG_COOLDOWN) {
      writeAuditLog("security", "blocked_request", "unknown", `Path: ${req.path} IP: ${ip}`);
      blockedRequestLog.set(logKey, now);
    }
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
    if (blockedRequestLog.size > 500) {
      for (const [k, t] of blockedRequestLog) {
        if (now - t > BLOCKED_LOG_COOLDOWN * 2) blockedRequestLog.delete(k);
      }
    }
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
});

app.use('/api/', (req, res, next) => {
  if (req.method === 'POST' && req.body && typeof req.body === 'object') {
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
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_BLOCK_DURATION = 10 * 60 * 1000;
setInterval(() => { const now = Date.now(); for (const [ip, e] of loginAttempts) { if (now - e.firstAttempt > LOGIN_BLOCK_DURATION) loginAttempts.delete(ip); } }, 5 * 60 * 1000);

app.post("/api/login", (req, res) => {
  const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
  const now = Date.now();

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

  let user = fileUsers.find(u => u.email === emailClean && u.passwordHash === passwordHash);

  if (!user) {
    const seedMatch = INITIAL_USERS.find(u => u.email === emailClean && u.passwordHash === passwordHash);
    if (seedMatch) {
      user = seedMatch;
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

app.get("/api/session", requireAuth, (req, res) => {
  res.json({ ok: true, user: { email: req.userSession.email, name: req.userSession.name, pageAccess: req.userSession.pageAccess } });
});

// ═══════════════════════════════════════════════════════════════
// 8. DATA ENDPOINTS
// ═══════════════════════════════════════════════════════════════

const endpoints = ["payments", "customer-payments", "users", "crg-deals", "daily-cap", "deals", "wallets", "offers", "ftd-entries"];

const notifiedHashes = new Set();
setInterval(() => { if (notifiedHashes.size > 5000) notifiedHashes.clear(); }, 30 * 60 * 1000);

const notifiedPaymentIds = new Set();
const notifiedTransitions = new Set();
try {
  const existingPayments = readJSON("payments.json", []);
  existingPayments.forEach(p => { if (p && p.id) notifiedPaymentIds.add(p.id); });
  const existingCP = readJSON("customer-payments.json", []);
  existingCP.forEach(p => { if (p && p.id) notifiedPaymentIds.add(p.id); });
  console.log(`🔔 Notification dedup: ${notifiedPaymentIds.size} existing payment IDs pre-loaded`);
} catch (e) {}
setInterval(() => { if (notifiedPaymentIds.size > 10000) notifiedPaymentIds.clear(); }, 10 * 60 * 1000);

const lastKnownServerCounts = {};
endpoints.forEach(ep => {
  const file = ep + ".json";
  app.get(`/api/${ep}`, requireAuth, (req, res) => {
    let data = readJSON(file, []);
    if (ep === "users") {
      data = data.map(u => ({ email: u.email, name: u.name, pageAccess: u.pageAccess }));
    }
    const prevCount = lastKnownServerCounts[ep] || 0;
    if (data.length === 0 && prevCount > 5) {
      console.error(`🔴 DATA LOSS DETECTED [${ep}]: returning 0 records, last known count was ${prevCount}. Attempting backup recovery.`);
      writeAuditLog(ep, "data_loss_detected", req.user?.email || "unknown", `[${ep}] GET returned 0 records, last known=${prevCount}. Triggering recovery.`);
      const recovered = readJSON(file, []);
      if (recovered.length > 0) {
        data = recovered;
        console.log(`🔧 RECOVERED [${ep}]: ${recovered.length} records from backup`);
      }
    }
    if (data.length > 0) lastKnownServerCounts[ep] = data.length;
    const tombstoned = [...getTombstonedIds(ep)];
    res.json({ data, version: getVersion(ep), timestamp: Date.now(), tombstoned });
  });
});

// POST payments
app.post("/api/payments", requireAuth, async (req, res) => {
  const { data: newPayments, version: clientVersion, user: userEmail, deleted: deletedIDs } = req.body;
  const payments = Array.isArray(req.body) ? req.body : newPayments;
  if (!Array.isArray(payments)) return res.status(400).json({ error: "Invalid data format" });
  if (payments.length > 10000) return res.status(400).json({ error: "Too many records" });

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

  const oldPayments = readJSON("payments.json", []);
  const oldMap = new Map(oldPayments.map(p => [p.id, p]));

  payments.forEach(p => {
    if (!p || !p.id) return;
    const oldP = oldMap.get(p.id);

    if (!oldP) {
      if (notifiedPaymentIds.has(p.id)) return;
      notifiedPaymentIds.add(p.id);
      if (p.paymentHash && notifiedHashes.has(p.paymentHash)) return;
      if (p.paymentHash) notifiedHashes.add(p.paymentHash);

      if (p.status === "Paid") {
        sendAffiliatePaymentNotification(p, true);
      } else if (p.status === "Approved to pay") {
        sendApprovedToPayNotification(p);
      } else if (["Open", "On the way"].includes(p.status)) {
        sendAffiliatePaymentNotification(p, false);
      }

    } else if (oldP.status !== p.status) {
      const transKey = `${p.id}:${oldP.status}->${p.status}`;
      if (notifiedTransitions.has(transKey)) return;
      notifiedTransitions.add(transKey);
      setTimeout(() => notifiedTransitions.delete(transKey), 60000);
      if (p.paymentHash && notifiedHashes.has(p.paymentHash)) return;
      if (p.paymentHash) notifiedHashes.add(p.paymentHash);

      if (p.status === "Paid") {
        sendAffiliatePaymentNotification(p, true);
      } else if (p.status === "Approved to pay") {
        sendApprovedToPayNotification(p);
      } else if (["Open", "On the way"].includes(p.status) && oldP.status === "Paid") {
        sendAffiliatePaymentNotification(p, false);
      }
    }
  });

  const serverData = readJSON("payments.json", []);
  const mergedMap = new Map();
  serverData.forEach(r => { if (r && r.id) mergedMap.set(r.id, r); });

  const tombstonedIds = getTombstonedIds("payments");

  let clientNew = 0, clientUpdated = 0, clientResurrectionBlocked = 0;
  const clientIDs = new Set();
  payments.forEach(r => {
    if (!r || !r.id) return;
    clientIDs.add(r.id);

    if (tombstonedIds.has(r.id) && !mergedMap.has(r.id)) {
      clientResurrectionBlocked++;
      return;
    }

    const srv = mergedMap.get(r.id);
    if (!srv) {
      r.updatedAt = r.updatedAt || Date.now();
      mergedMap.set(r.id, r);
      clientNew++;
    } else {
      const clientTime = r.updatedAt || 0;
      const serverTime = srv.updatedAt || 0;
      if (clientTime >= serverTime) {
        r.updatedAt = r.updatedAt || Date.now();
        mergedMap.set(r.id, r);
      }
      clientUpdated++;
    }
  });

  if (clientResurrectionBlocked > 0) {
    console.log(`🪦 [payments]: Blocked ${clientResurrectionBlocked} tombstoned records from resurrecting`);
  }

  const serverOnly = serverData.filter(r => r && r.id && !clientIDs.has(r.id));

  const deleteSet = new Set(Array.isArray(deletedIDs) ? deletedIDs : []);
  if (deleteSet.size > 0) {
    deleteSet.forEach(id => mergedMap.delete(id));
    addTombstones("payments", [...deleteSet]);
    console.log(`🗑️ [payments]: ${deleteSet.size} record(s) explicitly deleted + tombstoned`);
  }

  const merged = Array.from(mergedMap.values());

  if (clientNew > 0 || serverOnly.length > 0) {
    console.log(`🔀 MERGE [payments]: client_sent=${payments.length} server_had=${serverData.length} → merged=${merged.length} (new=${clientNew}, preserved=${serverOnly.length}${clientResurrectionBlocked > 0 ? `, resurrection_blocked=${clientResurrectionBlocked}` : ''})`);
  }

  const success = await lockedWrite("payments.json", merged, {
    action: "update", user: userEmail || "unknown", details: `[payments] ${merged.length} records (merge: +${clientNew} new, ${serverOnly.length} preserved)`
  });

  if (success) {
    broadcastUpdate("payments", merged, [...deleteSet]);
    res.json({ ok: true, count: merged.length, version: getVersion("payments"), merged: true, deletedAcknowledged: [...deleteSet] });
  } else {
    res.status(500).json({ error: "Write failed — data not saved" });
  }
});

// Generic POST for other tables
["customer-payments", "crg-deals", "daily-cap", "deals", "wallets", "offers", "ftd-entries"].forEach(ep => {
  const file = ep + ".json";
  app.post(`/api/${ep}`, requireAuth, async (req, res) => {
    const { data: newData, version: clientVersion, user: userEmail, deleted: deletedIDs } = req.body;
    const records = Array.isArray(req.body) ? req.body : newData;
    if (!Array.isArray(records)) return res.status(400).json({ error: "Invalid data format" });
    if (records.length > 10000) return res.status(400).json({ error: "Too many records" });

    const deleteSet = new Set(Array.isArray(deletedIDs) ? deletedIDs : []);

    if (records.length === 0) {
      const existing = readJSON(file, []);
      if (existing.length > 0 && deleteSet.size === 0) {
        console.log(`⚠️ BLOCKED empty save to ${ep} — ${existing.length} records protected (no delete IDs)`);
        return res.status(400).json({ error: "Cannot overwrite existing data with empty array" });
      }
      if (deleteSet.size > 0) {
        console.log(`🗑️ [${ep}]: Intentional bulk delete of ${deleteSet.size} records, allowing empty save`);
        createBackup(`pre-bulk-delete-${ep}-${Date.now()}`);
      }
    }

    const existingBeforeMerge = readJSON(file, []);
    if (existingBeforeMerge.length > 10 && records.length < existingBeforeMerge.length * 0.3) {
      console.log(`🛡️ SHRINKAGE WARNING [${ep}]: client sending ${records.length} records, server has ${existingBeforeMerge.length}. Creating safety backup.`);
      createBackup(`safety-${ep}-${Date.now()}`);
    }
    if (existingBeforeMerge.length > 5 && records.length === 0 && deleteSet.size === 0) {
      console.log(`🛑 HARD BLOCK [${ep}]: client sending 0 records, server has ${existingBeforeMerge.length}. Rejected.`);
      writeAuditLog(ep, "hard_block", userEmail || "unknown", `[${ep}] REJECTED: client=0 server=${existingBeforeMerge.length} — empty payload`);
      return res.status(400).json({ error: "Cannot replace existing data with empty payload", serverCount: existingBeforeMerge.length });
    }
    if (existingBeforeMerge.length > 10 && records.length < existingBeforeMerge.length * 0.5 && deleteSet.size === 0) {
      console.log(`🛑 STALE BLOCK [${ep}]: client sending ${records.length} records, server has ${existingBeforeMerge.length}. Client likely has stale data. Rejected.`);
      writeAuditLog(ep, "stale_block", userEmail || "unknown", `[${ep}] REJECTED: client=${records.length} server=${existingBeforeMerge.length} — stale data`);
      return res.status(409).json({
        error: "stale_data",
        message: `Server has ${existingBeforeMerge.length} records, you sent ${records.length}. Please refresh to get latest data.`,
        serverCount: existingBeforeMerge.length,
        clientCount: records.length
      });
    }

    if (ep === "customer-payments") {
      const oldRecords = readJSON("customer-payments.json", []);
      const oldMap = new Map(oldRecords.map(p => [p.id, p]));
      records.forEach(cp => {
        if (!cp || !cp.id) return;
        const oldCp = oldMap.get(cp.id);
        if (!oldCp) {
          if (notifiedPaymentIds.has(cp.id)) return;
          notifiedPaymentIds.add(cp.id);
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

    const serverData = readJSON(file, []);
    const tombstonedIds = getTombstonedIds(ep);

    const mergedMap = new Map();
    serverData.forEach(r => { if (r && r.id) mergedMap.set(r.id, r); });

    let clientNew = 0, clientUpdated = 0, clientDeleted = 0, clientResurrectionBlocked = 0;
    const clientIDs = new Set();
    records.forEach(r => {
      if (!r || !r.id) return;
      clientIDs.add(r.id);

      if (tombstonedIds.has(r.id) && !mergedMap.has(r.id)) {
        clientResurrectionBlocked++;
        return;
      }

      const srv = mergedMap.get(r.id);
      if (!srv) {
        r.updatedAt = r.updatedAt || Date.now();
        mergedMap.set(r.id, r);
        clientNew++;
      } else {
        const clientTime = r.updatedAt || 0;
        const serverTime = srv.updatedAt || 0;
        if (clientTime >= serverTime) {
          r.updatedAt = r.updatedAt || Date.now();
          mergedMap.set(r.id, r);
        }
        clientUpdated++;
      }
    });

    if (clientResurrectionBlocked > 0) {
      console.log(`🪦 [${ep}]: Blocked ${clientResurrectionBlocked} tombstoned records from resurrecting`);
    }

    const serverOnly = serverData.filter(r => r && r.id && !clientIDs.has(r.id));

    if (deleteSet.size > 0) {
      deleteSet.forEach(id => mergedMap.delete(id));
      addTombstones(ep, [...deleteSet]);
      console.log(`🗑️ [${ep}]: ${deleteSet.size} record(s) explicitly deleted + tombstoned`);
      writeAuditLog(ep, "delete", userEmail || "unknown", `[${ep}] ${deleteSet.size} record(s) deleted by user | IDs: ${[...deleteSet].slice(0, 5).join(', ')}${deleteSet.size > 5 ? '...' : ''}`);
    }

    const merged = Array.from(mergedMap.values());

    let deduped = merged;
    if (ep === "daily-cap") {
      const seen = new Map();
      for (const r of merged) {
        if (r.id && seen.has(r.id)) {
          const existing = seen.get(r.id);
          const existTotal = (parseInt(existing.affiliates) || 0) + (parseInt(existing.brands) || 0);
          const newTotal = (parseInt(r.affiliates) || 0) + (parseInt(r.brands) || 0);
          if (newTotal > existTotal) { seen.set(r.id, r); }
        } else if (r.id) {
          seen.set(r.id, r);
        } else {
          const fallbackKey = `${(r.date || '').trim()}|${(r.agent || "").trim().toLowerCase()}|${(r.affiliate || "").trim().toLowerCase()}|${(r.brokerCap || "").trim().toLowerCase()}`;
          if (!seen.has(fallbackKey)) seen.set(fallbackKey, r);
        }
      }
      deduped = Array.from(seen.values());
      if (deduped.length < merged.length) console.log(`🧹 DEDUP [daily-cap]: ${merged.length} → ${deduped.length} (removed ${merged.length - deduped.length} exact duplicates)`);
    }
    if (ep === "crg-deals") {
      const seen = new Map();
      for (const r of merged) {
        if (r.id && seen.has(r.id)) {
          const existing = seen.get(r.id);
          const existScore = (existing.started ? 1 : 0) + (parseInt(existing.capReceived) || 0) + (parseInt(existing.ftd) || 0);
          const newScore = (r.started ? 1 : 0) + (parseInt(r.capReceived) || 0) + (parseInt(r.ftd) || 0);
          if (newScore > existScore) { seen.set(r.id, r); }
        } else if (r.id) {
          seen.set(r.id, r);
        } else {
          const fallbackKey = `${(r.date || '').trim()}|${(r.affiliate || "").trim().toLowerCase()}|${(r.brokerCap || "").trim().toLowerCase()}|${(r.cap || "").toString().trim()}`;
          if (!seen.has(fallbackKey)) seen.set(fallbackKey, r);
        }
      }
      deduped = Array.from(seen.values());
      if (deduped.length < merged.length) console.log(`🧹 DEDUP [crg-deals]: ${merged.length} → ${deduped.length} (removed ${merged.length - deduped.length} exact duplicates)`);
    }

    if (ep === "crg-deals" && clientNew > 0) {
      const oldRecords = readJSON("crg-deals.json", []);
      const oldMap = new Map(oldRecords.map(r => [r.id, r]));

      records.forEach(newDeal => {
        if (!oldMap.has(newDeal.id) && newDeal.affiliate && newDeal.cap) {
          sendNewCRGDealNotification(newDeal);
          console.log(`📱 New CRG deal notification queued for affiliate: ${newDeal.affiliate}`);
        }
      });
    }

    if (clientNew > 0 || serverOnly.length > 0 || clientResurrectionBlocked > 0) {
      console.log(`🔀 MERGE [${ep}]: client_sent=${records.length} server_had=${serverData.length} → merged=${deduped.length} (new=${clientNew}, updated=${clientUpdated}, server_preserved=${serverOnly.length}${clientResurrectionBlocked > 0 ? `, resurrection_blocked=${clientResurrectionBlocked}` : ''})`);
    }

    if (clientNew === 0 && deleteSet.size === 0 && deduped.length === serverData.length && clientUpdated === 0) {
      return res.json({ ok: true, count: deduped.length, version: getVersion(ep), unchanged: true });
    }

    const success = await lockedWrite(file, deduped, {
      action: "update", user: userEmail || "unknown",
      details: `[${ep}] ${deduped.length} records (merge: +${clientNew} new, ${serverOnly.length} preserved, ${deleteSet.size} deleted${clientResurrectionBlocked > 0 ? `, ${clientResurrectionBlocked} resurrection_blocked` : ''}) | before: server=${serverData.length} client=${records.length} → after: ${deduped.length}${deduped.length < serverData.length && deduped.length < serverData.length - deleteSet.size ? ' ⚠️SHRUNK' : ''}`
    });

    if (success) {
      broadcastUpdate(ep, deduped, [...deleteSet]);
      res.json({ ok: true, count: deduped.length, version: getVersion(ep), merged: true, deletedAcknowledged: [...deleteSet] });
    } else {
      res.status(500).json({ error: "Write failed" });
    }
  });
});

// Users endpoint
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

  const existing = readJSON("users.json", []);
  const existingMap = new Map(existing.map(u => [u.email, u]));
  const seedMap = new Map(INITIAL_USERS.map(u => [u.email, u]));
  users = users.map(u => {
    if (!u.passwordHash) {
      const ex = existingMap.get(u.email);
      const seed = seedMap.get(u.email);
      if (ex && ex.passwordHash) return { ...u, passwordHash: ex.passwordHash };
      if (seed && seed.passwordHash) return { ...u, passwordHash: seed.passwordHash };
    }
    return u;
  });

  const mergedMap = new Map();
  existing.forEach(u => { if (u && u.email) mergedMap.set(u.email, u); });
  users.forEach(u => { if (u && u.email) {
    const ex = mergedMap.get(u.email);
    if (ex && ex.lastLogin && !u.lastLogin) u.lastLogin = ex.lastLogin;
    mergedMap.set(u.email, u);
  } });
  const mergedUsers = Array.from(mergedMap.values());

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

  wss.on('connection', (ws, req) => {
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

    const versions = {};
    endpoints.forEach(ep => { versions[ep] = getVersion(ep); });
    try { ws.send(JSON.stringify({ type: "versions", versions, timestamp: Date.now() })); } catch {}

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

function broadcastUpdate(table, data, deletedIds) {
  if (!WS_AVAILABLE || wsClients.size === 0) return;
  const message = JSON.stringify({
    type: "update",
    table,
    version: getVersion(table),
    data,
    tombstoned: deletedIds && deletedIds.length > 0 ? deletedIds : undefined,
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
  res.json(logs.slice(0, 500));
});

// ═══════════════════════════════════════════════════════════════
// 11. BACKUP & RESTORE ENDPOINTS
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
  const backupName = req.params.backup.replace(/[^a-zA-Z0-9\-T]/g, "");
  if (backupName !== req.params.backup || backupName.length < 5) {
    return res.status(400).json({ ok: false, error: "Invalid backup name" });
  }
  const bp = path.join(BACKUP_DIR, backupName);
  if (!path.resolve(bp).startsWith(path.resolve(BACKUP_DIR))) {
    return res.status(400).json({ ok: false, error: "Invalid backup path" });
  }
  if (!fs.existsSync(bp)) return res.json({ ok: false, error: "Backup not found" });

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

app.post("/api/backup", requireAdmin, (req, res) => {
  const label = createBackup();
  writeAuditLog("system", "manual_backup", req.body?.user || "admin", `Manual backup: ${label}`);
  res.json({ ok: true, backup: label });
});

// ═══════════════════════════════════════════════════════════════
// 12. HEALTH & MONITORING
// ═══════════════════════════════════════════════════════════════

app.get("/api/health", (req, res) => {
  const basic = { status: "ok", version: VERSION, time: new Date().toISOString() };

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

// ═══════════════════════════════════════════════════════════════
// 13. TELEGRAM BOT
// ═══════════════════════════════════════════════════════════════

function sendTelegramNotification(message, chatId = AFFILIte_FINANCE_GROUP_CHAT_ID) {
  if (TELEGRAM_TOKEN === "YOUR_BOT_TOKEN_HERE" || !TELEGRAM_TOKEN) {
    console.log("📱 Telegram notification skipped (no token configured)");
    return;
  }

  const postData = JSON.stringify({ chat_id: chatId, text: message });

  const options = {
    hostname: 'api.telegram.org',
    port: 443,
    path: `/bot${TELEGRAM_TOKEN}/sendMessage`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }
  };

  const req = https.request(options, (res) => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => { if (res.statusCode !== 200) console.log("❌ Telegram error:", d); });
  });

  req.on('error', err => console.error("❌ Telegram error:", err.message));
  req.write(postData);
  req.end();
}

function formatOpenPaymentMessage(p) {
  const amount = Number(p.amount || 0).toLocaleString("en-US");
  return `🆕 NEW PAYMENT ADDED 💰\n\n📋 Invoice: #${p.invoice}\n💵 Amount: $${amount}\n👤 Opened by: ${p.openBy || "Unknown"}\nStatus: ${p.status || "Open"}`;
}

function formatApprovedToPayMessage(p) {
  return `🔄 Payment (Aff ${p.invoice}) status → Approved to pay by ${p.openBy || "Y Admin"}`;
}

function sendApprovedToPayNotification(p) {
  if (TELEGRAM_TOKEN === "YOUR_BOT_TOKEN_HERE" || !TELEGRAM_TOKEN) return;
  const message = formatApprovedToPayMessage(p);
  const postData = JSON.stringify({ chat_id: OPEN_PAYMENT_GROUP_CHAT_ID, text: message, parse_mode: "HTML" });
  const options = {
    hostname: 'api.telegram.org', port: 443,
    path: `/bot${TELEGRAM_TOKEN}/sendMessage`, method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }
  };
  const req = https.request(options, (res) => {
    let d = ''; res.on('data', c => d += c);
    res.on('end', () => { if (res.statusCode !== 200) console.log("❌ Approved to pay notification error:", d); else console.log("✅ Approved to pay notification sent for invoice:", p.invoice); });
  });
  req.on('error', err => console.error("❌ Approved to pay notification error:", err.message));
  req.write(postData); req.end();
}

function sendOpenPaymentNotification(p) {
  if (TELEGRAM_TOKEN === "YOUR_BOT_TOKEN_HERE" || !TELEGRAM_TOKEN) return;
  const message = formatOpenPaymentMessage(p);
  const postData = JSON.stringify({ chat_id: OPEN_PAYMENT_GROUP_CHAT_ID, text: message, parse_mode: "HTML" });
  const options = {
    hostname: 'api.telegram.org', port: 443,
    path: `/bot${TELEGRAM_TOKEN}/sendMessage`, method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }
  };
  const req = https.request(options, (res) => {
    let d = ''; res.on('data', c => d += c);
    res.on('end', () => { if (res.statusCode !== 200) console.log("❌ Open payment notification error:", d); else console.log("✅ Open payment notification sent for invoice:", p.invoice); });
  });
  req.on('error', err => console.error("❌ Open payment notification error:", err.message));
  req.write(postData); req.end();
}

// ── Brands group notifications ──
function formatBrandNewOpenPaymentMessage(p) {
  const amount = Number(p.amount || 0).toLocaleString("en-US");
  const invoiceName = p.customerName || p.invoice || "Unknown";
  let walletCheck = "❓ Wallet check: Wallet unknown";
  if (p.walletMatched && p.walletType) {
    walletCheck = `✅ Wallet check: It's our ${p.walletType} wallet`;
  } else if (p.walletMatched) {
    const wType = p.blockchainType || "Unknown";
    walletCheck = `✅ Wallet check: It's our ${wType} wallet`;
  }
  return `💰 NEW CUSTOMER PAYMENT 💰\n\n📋 Invoice: #${invoiceName}\n💵 Amount: $${amount}\n🔗 Hash: ${p.paymentHash || "N/A"}\n\n${walletCheck}`;
}

function formatBrandPaymentReceivedMessage(p) {
  const amount = Number(p.amount || 0).toLocaleString("en-US");
  return `✅ PAYMENT RECEIVED ✅\n\n📋 Invoice: #${p.invoice}\n💵 Amount: $${amount}\n🏷️ Brand: ${p.brand || "N/A"}\n👤 Paid by: ${p.openBy || "Unknown"}\n🔗 Payment Hash: ${p.paymentHash || "N/A"}`;
}

function sendBrandPaymentNotification(p) {
  if (TELEGRAM_TOKEN === "YOUR_BOT_TOKEN_HERE" || !TELEGRAM_TOKEN) return;
  const message = formatBrandPaymentReceivedMessage(p);
  const postData = JSON.stringify({ chat_id: BRANDS_GROUP_CHAT_ID, text: message, parse_mode: "HTML" });
  const options = {
    hostname: 'api.telegram.org', port: 443,
    path: `/bot${TELEGRAM_TOKEN}/sendMessage`, method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }
  };
  const req = https.request(options, (res) => {
    let d = ''; res.on('data', c => d += c);
    res.on('end', () => { if (res.statusCode !== 200) console.log("❌ Brand payment received notification error:", d); else console.log(`✅ Brand payment RECEIVED notification sent for invoice: ${p.invoice}`); });
  });
  req.on('error', err => console.error("❌ Brand payment notification error:", err.message));
  req.write(postData); req.end();
}

// ── Affiliate group notifications ──
function formatAffiliateNewPaymentMessage(p) {
  const amount = Number(p.amount || 0).toLocaleString("en-US");
  return `🆕 NEW PAYMENT ADDED 💰\n\n📋 Affiliate ID: ${p.invoice}\n💵 Amount: $${amount}\n👤 Opened by: ${p.openBy || "Unknown"}\nStatus: ${p.status || "Open"}`;
}

function formatAffiliatePaidPaymentMessage(p) {
  const amount = Number(p.amount || 0).toLocaleString("en-US");
  return `💰 PAYMENT ${p.invoice} marked as PAID 💰\n\n📋 Invoice: #${p.invoice}\n💵 Amount: $${amount}\n👤 Paid by: ${p.openBy || "Unknown"}\nPayment Hash: ${p.paymentHash || "N/A"}`;
}

function sendAffiliatePaymentNotification(p, isPaid = false) {
  if (TELEGRAM_TOKEN === "YOUR_BOT_TOKEN_HERE" || !TELEGRAM_TOKEN) return;
  const message = isPaid ? formatAffiliatePaidPaymentMessage(p) : formatAffiliateNewPaymentMessage(p);
  const postData = JSON.stringify({ chat_id: OPEN_PAYMENT_GROUP_CHAT_ID, text: message, parse_mode: "HTML" });
  const options = {
    hostname: 'api.telegram.org', port: 443,
    path: `/bot${TELEGRAM_TOKEN}/sendMessage`, method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }
  };
  const req = https.request(options, (res) => {
    let d = ''; res.on('data', c => d += c);
    res.on('end', () => { if (res.statusCode !== 200) console.log("❌ Affiliate payment notification error:", d); else console.log(`✅ Affiliate payment notification sent for invoice: ${p.invoice} (${isPaid ? 'paid' : 'new'})`); });
  });
  req.on('error', err => console.error("❌ Affiliate payment notification error:", err.message));
  req.write(postData); req.end();
}

// ── CRG Deals notifications ──
function formatNewCRGDealMessage(deal) {
  const affiliate = deal.affiliate || "Unknown";
  const cap = deal.cap || "N/A";
  const brokerCap = deal.brokerCap || "N/A";
  const date = deal.date || new Date().toISOString().split("T")[0];
  const manageAff = deal.manageAff || "";
  let msg = `📋 <b>NEW CRG DEAL</b>\n\n🏷️ Affiliate: <b>${affiliate}</b>\n💰 Cap: <b>${cap}</b>\n🏦 Broker: ${brokerCap}\n📅 Date: ${date}\n`;
  if (manageAff) msg += `👤 Manager: ${manageAff}\n`;
  return msg;
}

function sendNewCRGDealNotification(deal) {
  if (TELEGRAM_TOKEN === "YOUR_BOT_TOKEN_HERE" || !TELEGRAM_TOKEN) return;
  const message = formatNewCRGDealMessage(deal);
  const postData = JSON.stringify({ chat_id: CRG_GROUP_CHAT_ID, text: message, parse_mode: "HTML" });
  const options = {
    hostname: 'api.telegram.org', port: 443,
    path: `/bot${TELEGRAM_TOKEN}/sendMessage`, method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }
  };
  const req = https.request(options, (res) => {
    let d = ''; res.on('data', c => d += c);
    res.on('end', () => { if (res.statusCode !== 200) console.log("❌ New CRG deal notification error:", d); else console.log(`✅ New CRG deal notification sent for affiliate: ${deal.affiliate}`); });
  });
  req.on('error', err => console.error("❌ New CRG deal notification error:", err.message));
  req.write(postData); req.end();
}

// ── Telegram Bot Commands & Hash Detection ──
let bot;
const userStates = {};

const processedMessageIds = new Map();
const MESSAGE_ID_TTL = 300000;
const MESSAGE_ID_CLEANUP_INTERVAL = 60000;

setInterval(() => {
  const now = Date.now();
  for (const [msgId, timestamp] of processedMessageIds) {
    if (now - timestamp > MESSAGE_ID_TTL) processedMessageIds.delete(msgId);
  }
}, MESSAGE_ID_CLEANUP_INTERVAL);

const processedHashes = new Map();
const HASH_TTL = 300000;
setInterval(() => {
  const now = Date.now();
  for (const [hash, ts] of processedHashes) {
    if (now - ts > HASH_TTL) processedHashes.delete(hash);
  }
}, 60000);

function isMessageProcessed(msgId) {
  if (!msgId) return false;
  return processedMessageIds.has(msgId.toString());
}

function markMessageProcessed(msgId) {
  if (!msgId) return;
  processedMessageIds.set(msgId.toString(), Date.now());
}

let pollingErrorCount = 0;

if (TELEGRAM_TOKEN && TELEGRAM_TOKEN !== "YOUR_BOT_TOKEN_HERE") {
  try {
    bot = new TelegramBot(TELEGRAM_TOKEN, {
      polling: {
        interval: 2000,
        autoStart: true,
        params: { timeout: 30 }
      },
      filepath: false,
      request: { timeout: 30000 }
    });
    console.log("🤖 Telegram bot initialized (polling: 2s interval, 30s timeout)");

    setTimeout(() => {
      bot.getMe()
        .then(() => console.log("✅ Bot has access to Telegram API"))
        .catch(err => console.log("❌ Bot cannot access Telegram:", err.message));
    }, 5000);

    let lastPollingRestart = 0;
    const POLLING_RESTART_COOLDOWN = 30000;

    bot.on('polling_error', (error) => {
      pollingErrorCount++;
      const now = Date.now();
      console.log(`⚠️ Telegram polling error #${pollingErrorCount}: ${error.code || error.message}`);

      if (error.code === 'ETELEGRAM' || error.message.includes('Forbidden')) {
        if (now - lastPollingRestart < POLLING_RESTART_COOLDOWN) return;
        lastPollingRestart = now;
        bot.stopPolling().then(() => {
          console.log("⏹️ Polling stopped, restarting...");
          return bot.startPolling();
        }).then(() => console.log("✅ Telegram polling restarted"))
          .catch(err => console.error("❌ Failed to restart polling:", err.message));
        pollingErrorCount = 0;
        return;
      }

      if (pollingErrorCount >= 10) {
        if (now - lastPollingRestart < POLLING_RESTART_COOLDOWN) { pollingErrorCount = 0; return; }
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

    bot.onText(/\/ping/, (msg) => {
      const start = Date.now();
      structuredLog("cmd", "/ping", "ok", { chat: msg.chat.id });
      bot.sendMessage(msg.chat.id, `🏓 Pong! Response: ${Date.now() - start}ms | Uptime: ${Math.round(process.uptime())}s`);
    });

    bot.onText(/\/status/, (msg) => {
      try {
        const mem = process.memoryUsage();
        const heapMB = Math.round(mem.heapUsed / 1024 / 1024);
        const rssMB = Math.round(mem.rss / 1024 / 1024);
        const uptime = Math.round(process.uptime());
        const h = Math.floor(uptime / 3600), m = Math.floor((uptime % 3600) / 60), s = uptime % 60;
        structuredLog("cmd", "/status", "ok", { chat: msg.chat.id, heap: heapMB });
        bot.sendMessage(msg.chat.id,
          `🖥️ <b>Server Status</b>\n\n✅ Online\n⏱ Uptime: ${h}h ${m}m ${s}s\n💾 Heap: ${heapMB}MB / RSS: ${rssMB}MB\n🔌 WS clients: ${wsClients.size}\n📦 v${VERSION}`,
          { parse_mode: "HTML" }
        );
      } catch (err) {
        bot.sendMessage(msg.chat.id, `❌ Status error: ${err.message}`);
      }
    });

    bot.onText(/\/wallets/, (msg) => {
      const wallets = readJSON("wallets.json", []);
      if (!wallets.length) { bot.sendMessage(msg.chat.id, "❌ No wallets found."); return; }
      const w = wallets[0];
      const ds = w.date ? (() => { const d = new Date(w.date + "T00:00:00"); return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`; })() : "N/A";
      bot.sendMessage(msg.chat.id, `💳 Current Wallets (${ds})\n\nTRC-20:\n${w.trc || "—"}\n\nERC-20 (USDT/USDC):\n${w.erc || "—"}\n\nBTC:\n${w.btc || "—"}\n\nLast updated: ${ds}\n*3% fee`);
    });

    bot.onText(/\/payments/, (msg) => {
      const payments = readJSON("payments.json", []);
      const open = payments.filter(p => p.status !== "Paid");
      const total = open.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
      let t = `📊 <b>Open Payments: ${open.length}</b>\n💰 Total: <b>$${total.toLocaleString("en-US")}</b>\n\n`;
      open.slice(0, 10).forEach(p => { t += `#${p.invoice} — $${parseFloat(p.amount).toLocaleString("en-US")} [${p.status}]\n`; });
      if (open.length > 10) t += `\n... and ${open.length - 10} more`;
      bot.sendMessage(msg.chat.id, t, { parse_mode: "HTML" });
    });

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

    bot.on("message", async (msg) => {
      if (msg.text && msg.text.startsWith("/")) return;
      const chatId = msg.chat.id;
      const userText = msg.text ? msg.text.trim().toUpperCase() : "";
      const st = userStates[chatId];

      const offerMessageText = msg.text || '';
      const offerLower = offerMessageText.toLowerCase();
      const chatIdStr = chatId.toString();

      console.log("💬 Message from chat ID:", chatIdStr, "| OFFER_GROUP_CHAT_ID:", OFFER_GROUP_CHAT_ID);

      const isOfferGroup = chatIdStr === OFFER_GROUP_CHAT_ID;
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

      if (st) return;

      const now = Date.now();
      if (!bot._processedHashes) bot._processedHashes = new Map();
      for (const [hash, timestamp] of bot._processedHashes) {
        if (now - timestamp > 30000) bot._processedHashes.delete(hash);
      }

      const isBrandsGroup = chatId.toString() === BRANDS_GROUP_CHAT_ID;
      const isFinanceGroup = chatId.toString() === AFFILIte_FINANCE_GROUP_CHAT_ID;

      if (isBrandsGroup) {
        const messageText = msg.text || '';
        const brandMatch = messageText.match(/(?:brand|Brand)[:\s]+([A-Za-z0-9]+)/i);
        const extractedBrand = brandMatch ? brandMatch[1] : null;
        const extractedCustomer = extractCustomerName(messageText);
        const hashes = extractAllUsdtHashes(messageText);

        const uniqueHashesMap = new Map();
        for (const h of hashes) {
          if (h.type === 'TRC20' || h.type === 'ERC20' || h.type === 'BTC') {
            if (!uniqueHashesMap.has(h.hash)) uniqueHashesMap.set(h.hash, h);
          }
        }
        const uniqueTxHashes = Array.from(uniqueHashesMap.values());
        const newTxHashes = uniqueTxHashes.filter(h => !bot._processedHashes.has(h.hash));

        if (newTxHashes.length > 0) {
          const amounts = [];
          const p1 = /\$(\d+(?:,\d{3})*(?:\.\d+)?)/g;
          let m;
          while ((m = p1.exec(messageText)) !== null) amounts.push(m[1].replace(/,/g, ''));
          const p2 = /(\d+(?:,\d{3})*(?:\.\d+)?)\$/g;
          while ((m = p2.exec(messageText)) !== null) amounts.push(m[1].replace(/,/g, ''));
          const p3 = /(?:^|\n)\s*(\d{3,})\s*(?:\n|$)/gm;
          while ((m = p3.exec(messageText)) !== null) {
            const val = m[1].replace(/,/g, '');
            if (!amounts.includes(val) && parseInt(val) > 0) amounts.push(val);
          }

          console.log("💰 Found amounts:", amounts);
          const wallets = readJSON("wallets.json", []);

          for (let i = 0; i < newTxHashes.length; i++) {
            const { hash, type } = newTxHashes[i];
            let txResult = { success: false };
            if (type === 'TRC20') txResult = await checkTRC20Transaction(hash);
            else if (type === 'ERC20') txResult = await checkERC20Transaction(hash);
            else if (type === 'BTC') txResult = await checkBTCTransaction(hash);

            const blockchainAmount = txResult.amount && txResult.amount !== "0" && parseFloat(txResult.amount) > 0 ? txResult.amount : null;
            const messageAmount = amounts[i] || null;
            const amount = (blockchainAmount || messageAmount || "0").toString();
            console.log(`💰 [Brands] Hash ${hash.slice(0,10)}... → blockchain=$${blockchainAmount || 'N/A'}, message=$${messageAmount || 'N/A'}, final=$${amount}`);
            const walletVerify = verifyWalletAddress(txResult.toAddress || "", wallets);
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

            bot._processedHashes.set(hash, Date.now());
            bot.sendMessage(BRANDS_GROUP_CHAT_ID, formatBrandNewOpenPaymentMessage(newPayment));
            console.log(`✅ Payment from Brands group: Invoice ${invoice}, Brand: ${extractedBrand || 'N/A'}, Amount: $${amount}`);
          }
          return;
        }
      }

      if (isFinanceGroup) {
        const messageText = msg.text || '';
        const extractedCustomerFinance = extractCustomerName(messageText);
        const hashes = extractAllUsdtHashes(messageText);
        const txHashes = hashes.filter(h => h.type === 'TRC20' || h.type === 'ERC20' || h.type === 'BTC');
        if (txHashes.length === 0) return;

        const amounts = [];
        const p1 = /\$(\d+(?:,\d{3})*(?:\.\d+)?)/g;
        let m;
        while ((m = p1.exec(messageText)) !== null) amounts.push(m[1].replace(/,/g, ''));
        const p2 = /(\d+(?:,\d{3})*(?:\.\d+)?)\$/g;
        while ((m = p2.exec(messageText)) !== null) amounts.push(m[1].replace(/,/g, ''));

        const wallets = readJSON("wallets.json", []);

        for (let i = 0; i < txHashes.length; i++) {
          const { hash, type } = txHashes[i];
          let txResult = { success: false };
          if (type === 'TRC20') txResult = await checkTRC20Transaction(hash);
          else if (type === 'ERC20') txResult = await checkERC20Transaction(hash);
          else if (type === 'BTC') txResult = await checkBTCTransaction(hash);

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
            paymentHash: hash,
            trcAddress: type === 'TRC20' ? (txResult.toAddress || "") : "",
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
      }
    });

    console.log("✅ USDT hash detection enabled");

    // ═══════════════════════════════════════════════════════════════
    // 15. SCREENSHOT + TEXT FALLBACK COMMANDS
    // ═══════════════════════════════════════════════════════════════

    bot.onText(/\/todaycrgcap/, async (msg) => {
      structuredLog("cmd", "/todaycrgcap", "ok", { chat: msg.chat.id });
      try {
        bot.sendMessage(msg.chat.id, "📸 Generating CRG report...");
        const result = await screenshotModule.sendReport(bot, msg.chat.id, 'crg', readJSON);
        structuredLog("cmd", "/todaycrgcap", "ok", { method: result.method });
      } catch (err) {
        structuredLog("cmd", "/todaycrgcap", "warn", { error: err.message, fallback: "text" });
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

    bot.onText(/\/todayagentscap/, async (msg) => {
      structuredLog("cmd", "/todayagentscap", "ok", { chat: msg.chat.id });
      try {
        bot.sendMessage(msg.chat.id, "📸 Generating Agents report...");
        const result = await screenshotModule.sendReport(bot, msg.chat.id, 'agents', readJSON);
        structuredLog("cmd", "/todayagentscap", "ok", { method: result.method });
      } catch (err) {
        structuredLog("cmd", "/todayagentscap", "warn", { error: err.message, fallback: "text" });
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

// ═══════════════════════════════════════════════════════════════
// HASH EXTRACTION HELPERS
// ═══════════════════════════════════════════════════════════════

function extractAllUsdtHashes(text) {
  if (!text) return [];
  const hashes = [];
  const seenHashes = new Set();

  const tronMatches = text.matchAll(/tronscan\.org\/[^\/]*\/transaction\/([a-zA-Z0-9]{33,64})/gi);
  for (const match of tronMatches) {
    const h = match[1];
    if (seenHashes.has(h)) continue;
    if (TRC20_ADDRESS_REGEX.test(h)) { hashes.push({ hash: h, type: 'TRC20_ADDRESS' }); seenHashes.add(h); }
    else if (h.length === 64) { hashes.push({ hash: h, type: 'TRC20' }); seenHashes.add(h); }
  }
  const ethMatches = text.matchAll(/etherscan\.io\/tx\/(0x[a-fA-F0-9]{64})/gi);
  for (const match of ethMatches) {
    const h = match[1];
    if (seenHashes.has(h)) continue;
    hashes.push({ hash: h, type: 'ERC20' });
    seenHashes.add(h);
  }
  text.split(/\s+/).forEach(w => {
    const t = w.trim();
    if (seenHashes.has(t)) return;
    if (ERC20_HASH_REGEX.test(t)) { hashes.push({ hash: t, type: 'ERC20' }); seenHashes.add(t); }
    else if (TRC20_HASH_REGEX.test(t)) { hashes.push({ hash: t, type: 'TRC20' }); seenHashes.add(t); }
  });

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

    const TRC20_STABLECOINS = {
      [TRC20_USDT_CONTRACT]: { symbol: "USDT", decimals: 6 },
      "TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8": { symbol: "USDC", decimals: 6 },
    };

    try {
      const url = `${TRONSCAN_API}/api/transaction-info?hash=${txHash}`;
      const raw = await httpRequest(url);
      const data = JSON.parse(raw);

      if (!data || data.error || (!data.hash && !data.contractData)) {
        console.log(`⚠️ [TRC20] Tronscan returned no data for ${txHash.slice(0,12)}...`);
      } else {
        console.log(`📋 [TRC20] Tronscan response keys: ${Object.keys(data).join(', ')}`);

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

        if (data.token_info && (data.token_info.symbol === "USDT" || data.token_info.symbol === "USDC")) {
          const raw = data.amount || data.token_info.amount || "0";
          const dec = data.token_info.decimals ? parseInt(data.token_info.decimals) : 6;
          const amount = (parseFloat(raw) / Math.pow(10, dec)).toString();
          console.log(`✅ [TRC20] Found via token_info: $${amount}`);
          return { success: true, amount, toAddress: data.to_address || data.toAddress || "", fromAddress: data.from_address || data.ownerAddress || "", confirmed: data.confirmed !== false };
        }

        console.log(`⚠️ [TRC20] No USDT/USDC transfer found in Tronscan response.`);
      }
    } catch (err) {
      console.log(`⚠️ [TRC20] Tronscan API error: ${err.message}`);
    }

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

    const STABLECOINS = {
      "0xdac17f958d2ee523a2206206994597c13d831ec7": { symbol: "USDT", decimals: 6 },
      "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": { symbol: "USDC", decimals: 6 },
      "0x6b175474e89094c44da98b954eedeac495271d0f": { symbol: "DAI", decimals: 18 },
    };
    const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

    let amount = "0";
    let fromAddress = "";
    let toAddress = "";
    let confirmed = false;

    try {
      const receiptUrl = `${ETHERSCAN_V2_API}?chainid=1&module=proxy&action=eth_getTransactionReceipt&txhash=${txHash}&apikey=${ETHERSCAN_API_KEY}`;
      const receiptRaw = await httpRequest(receiptUrl);
      const receiptData = JSON.parse(receiptRaw);

      if (receiptData.result && typeof receiptData.result === 'object') {
        const receipt = receiptData.result;
        confirmed = receipt.status === "0x1";
        fromAddress = receipt.from || "";
        toAddress = receipt.to || "";

        if (receipt.logs && Array.isArray(receipt.logs)) {
          for (const log of receipt.logs) {
            if (log.topics && log.topics.length >= 3 && log.topics[0] === TRANSFER_TOPIC) {
              const contractAddr = (log.address || "").toLowerCase();
              const stablecoin = STABLECOINS[contractAddr];

              if (stablecoin) {
                const rawAmount = BigInt(log.data);
                const divisor = 10n ** BigInt(stablecoin.decimals);
                const parsedAmount = Number(rawAmount) / Number(divisor);
                amount = parsedAmount.toString();

                if (log.topics[1]) fromAddress = "0x" + log.topics[1].slice(26);
                if (log.topics[2]) toAddress = "0x" + log.topics[2].slice(26);

                console.log(`✅ [ERC20] ${stablecoin.symbol} Transfer found via receipt logs: $${amount}`);
                break;
              }
            }
          }
        }

        if (amount !== "0") {
          return { success: true, amount, toAddress, fromAddress, confirmed, hash: txHash };
        }
      }
    } catch (receiptErr) {
      console.log(`⚠️ [ERC20] Receipt API error: ${receiptErr.message}`);
    }

    try {
      const txUrl = `${ETHERSCAN_V2_API}?chainid=1&module=proxy&action=eth_getTransactionByHash&txhash=${txHash}&apikey=${ETHERSCAN_API_KEY}`;
      const txRaw = await httpRequest(txUrl);
      const txData = JSON.parse(txRaw);

      if (txData.result && typeof txData.result === 'object') {
        const tx = txData.result;
        if (!fromAddress) fromAddress = tx.from || "";
        const contractAddress = (tx.to || "").toLowerCase();
        const input = tx.input || "";

        if (input.startsWith("0xa9059cbb") && input.length >= 138) {
          const recipientAddr = "0x" + input.slice(34, 74);
          const rawAmountHex = "0x" + input.slice(74, 138);
          const rawAmount = BigInt(rawAmountHex);
          const stablecoin = STABLECOINS[contractAddress];
          const decimals = stablecoin ? stablecoin.decimals : 6;
          const divisor = BigInt(Math.pow(10, decimals));
          const parsedAmount = Number(rawAmount) / Number(divisor);
          amount = parsedAmount.toString();
          toAddress = recipientAddr;
          const symbol = stablecoin ? stablecoin.symbol : "ERC20";
          console.log(`✅ [ERC20] ${symbol} Transfer found via input data: $${amount}`);
        } else if (tx.value && tx.value !== "0x0" && tx.value !== "0x") {
          const ethAmount = Number(BigInt(tx.value)) / 1e18;
          amount = ethAmount.toString();
          toAddress = tx.to || toAddress;
          console.log(`✅ [ERC20] Native ETH transfer: ${amount} ETH`);
        }
      }
    } catch (txErr) {
      console.log(`⚠️ [ERC20] Transaction data API error: ${txErr.message}`);
    }

    console.log(`📊 [ERC20] Final result: amount=$${amount}, to=${toAddress}, confirmed=${confirmed}`);
    return { success: amount !== "0", amount, toAddress, fromAddress, confirmed, hash: txHash };
  } catch (err) {
    console.error(`❌ [ERC20] checkERC20Transaction error:`, err.message);
    return { success: false, error: err.message };
  }
}

async function checkBTCTransaction(txHash) {
  try {
    console.log(`🔍 [BTC] Checking transaction: ${txHash}`);

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
        console.log(`✅ [BTC] Found: ${amountBTC} BTC to ${toAddress}`);
        return { success: true, amount: `${amountBTC} BTC`, toAddress, fromAddress, confirmed, isBTC: true };
      }
    } catch (err) {
      console.log(`⚠️ [BTC] blockchain.com API error: ${err.message}`);
    }

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

// HTTP request helper (used by blockchain verification functions)
function httpRequest(url) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https');
    const lib = isHttps ? https : http;
    const req = lib.get(url, { timeout: 10000, headers: { 'User-Agent': 'BlitzCRM/10.3' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
  });
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
// ADMIN ENDPOINTS
// ═══════════════════════════════════════════════════════════════

app.post("/api/admin/backup", requireAdmin, async (req, res) => {
  const label = "manual-" + new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const ts = createBackup(label);
  console.log(`📦 Manual backup triggered by ${req.userSession.email}: ${ts}`);
  res.json({ ok: true, backup: ts, message: "Backup created successfully" });
});

app.post("/api/admin/dedup", requireAdmin, async (req, res) => {
  const results = {};

  const dc = readJSON("daily-cap.json", []);
  const dcSeen = new Map();
  for (const r of dc) {
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

  const crg = readJSON("crg-deals.json", []);
  const crgSeen = new Map();
  for (const r of crg) {
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

// ═══════════════════════════════════════════════════════════════
// GLOBAL ERROR HANDLER
// ═══════════════════════════════════════════════════════════════
app.use((err, req, res, next) => {
  console.error('💥 Express error:', err.message);
  if (!res.headersSent) res.status(500).json({ error: "Internal server error" });
});

// ═══════════════════════════════════════════════════════════════
// MEMORY MONITORING
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
// ADMIN DIAGNOSTICS
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

  let backupInfo = { count: 0, latest: null, oldest: null };
  try {
    if (fs.existsSync(BACKUP_DIR)) {
      const dirs = fs.readdirSync(BACKUP_DIR).sort().reverse();
      backupInfo.count = dirs.length;
      if (dirs.length > 0) backupInfo.latest = dirs[0];
      if (dirs.length > 1) backupInfo.oldest = dirs[dirs.length - 1];
    }
  } catch {}

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
    telegram: { botActive: !!bot, pollingErrors: pollingErrorCount },
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
    telegram: { active: !!bot, pollingErrors: pollingErrorCount },
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
// GRACEFUL SHUTDOWN
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
// 14. START SERVER
// ═══════════════════════════════════════════════════════════════

server.listen(PORT, "0.0.0.0", () => {
  console.log(`\n╔══════════════════════════════════════════════╗`);
  console.log(`║  🚀 Blitz CRM Server v${VERSION}                ║`);
  console.log(`║  📡 HTTP + WebSocket on port ${PORT}            ║`);
  console.log(`║  💾 Data: ${DATA_DIR.slice(-30).padEnd(30)}    ║`);
  console.log(`║  📦 Hourly backups + daily snapshots (7-day)  ║`);
  console.log(`║  📋 Audit: 30-day rolling log                ║`);
  console.log(`║  🔒 WAL atomic writes + concurrency queue     ║`);
  console.log(`║  🛡️  Auto-ban attackers + path traversal block ║`);
  console.log(`║  🧹 ID-based dedup (no more record collapse)  ║`);
  console.log(`║  🪦 Tombstone system (7-day anti-resurrect)   ║`);
  console.log(`║  🤖 Telegram: @blitzfinance_bot              ║`);
  console.log(`╚══════════════════════════════════════════════╝\n`);

  setTimeout(() => syncExternalData(), 3000);
  setInterval(() => syncExternalData(), 15 * 60 * 1000);
});
