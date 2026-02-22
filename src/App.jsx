import React, { useState, useEffect, useRef } from "react";

/* ── Mobile Responsive CSS ── */
const mobileCSS = `
@media (max-width: 768px) {
  .blitz-header { padding: 10px 12px !important; }
  .blitz-header .nav-links { display: none !important; }
  .blitz-header .desktop-actions { display: none !important; }
  .blitz-header .mobile-menu-btn { display: flex !important; }
  .blitz-main { padding: 16px 12px !important; }
  .blitz-main h1 { font-size: 20px !important; }
  .blitz-toolbar { flex-direction: column !important; align-items: stretch !important; }
  .blitz-toolbar input { width: 100% !important; }
  .blitz-summary { grid-template-columns: 1fr 1fr !important; }
  .blitz-modal-content { width: 95vw !important; max-width: 95vw !important; margin: 10px !important; padding: 20px 16px !important; }
  .blitz-modal-content .grid-2col { grid-template-columns: 1fr !important; }
  .blitz-form-grid { grid-template-columns: 1fr !important; }
}
@media (max-width: 480px) {
  .blitz-summary { grid-template-columns: 1fr !important; }
}
`;

function useMobile() {
  const [mobile, setMobile] = useState(typeof window !== 'undefined' && window.innerWidth <= 768);
  useEffect(() => {
    const check = () => setMobile(window.innerWidth <= 768);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return mobile;
}

function MobileNav({ pages, current, userAccess, onNav, onClose }) {
  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 9998 }} onClick={onClose}>
      <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 260, background: "#FFFFFF", boxShadow: "-4px 0 30px rgba(0,0,0,0.15)", zIndex: 9999, padding: "20px 0", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "0 20px 16px", borderBottom: "1px solid #E2E8F0", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: 700, fontSize: 16 }}>Menu</span>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#64748B", padding: 4 }}>✕</button>
        </div>
        {pages.map(pg => {
          if (pg.key !== "admin" && !(userAccess || []).includes(pg.key)) return null;
          const isActive = current === pg.key;
          return (
            <button key={pg.key} onClick={() => { onNav(pg.key); onClose(); }}
              style={{ display: "block", width: "100%", padding: "14px 24px", border: "none", background: isActive ? `${pg.color}15` : "transparent", color: isActive ? pg.color : "#334155", fontSize: 15, fontWeight: isActive ? 700 : 500, cursor: "pointer", textAlign: "left", borderLeft: isActive ? `4px solid ${pg.color}` : "4px solid transparent" }}>
              {pg.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Password Hashing (SHA-256 pure JS - works on HTTP) ── */
function hashPassword(password) {
  // Pure JS SHA-256 implementation
  function sha256(ascii) {
    const mathPow = Math.pow;
    const maxWord = mathPow(2, 32);
    let result = '';
    const words = [];
    const asciiBitLength = ascii.length * 8;
    let hash = [];
    const k = [];
    let primeCounter = 0;

    const isComposite = {};
    for (let candidate = 2; primeCounter < 64; candidate++) {
      if (!isComposite[candidate]) {
        for (let i = 0; i < 313; i += candidate) isComposite[i] = candidate;
        hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
        k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
      }
    }

    ascii += '\x80';
    while ((ascii.length % 64) - 56) ascii += '\x00';
    for (let i = 0; i < ascii.length; i++) {
      const j = ascii.charCodeAt(i);
      if (j >> 8) return;
      words[i >> 2] |= j << (((3 - i) % 4) * 8);
    }
    words[words.length] = (asciiBitLength / maxWord) | 0;
    words[words.length] = asciiBitLength;

    for (let j = 0; j < words.length;) {
      const w = words.slice(j, (j += 16));
      const oldHash = hash.slice(0);
      hash = hash.slice(0, 8);
      for (let i = 0; i < 64; i++) {
        const w15 = w[i - 15], w2 = w[i - 2];
        const a = hash[0], e = hash[4];
        const temp1 = hash[7] +
          (((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7))) +
          ((e & hash[5]) ^ (~e & hash[6])) +
          k[i] +
          (w[i] = i < 16 ? w[i] : (
            w[i - 16] +
            (((w15 >>> 7) | (w15 << 25)) ^ ((w15 >>> 18) | (w15 << 14)) ^ (w15 >>> 3)) +
            w[i - 7] +
            (((w2 >>> 17) | (w2 << 15)) ^ ((w2 >>> 19) | (w2 << 13)) ^ (w2 >>> 10))
          ) | 0);
        const temp2 = (((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10))) +
          ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
        hash = [(temp1 + temp2) | 0].concat(hash);
        hash[4] = (hash[4] + temp1) | 0;
      }
      for (let i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
    }

    for (let i = 0; i < 8; i++) {
      for (let j = 3; j + 1; j--) {
        const b = (hash[i] >> (j * 8)) & 255;
        result += (b < 16 ? '0' : '') + b.toString(16);
      }
    }
    return result;
  }
  return sha256(password);
}

const INITIAL_USERS = [
  { email: "sophia@blitz-affiliates.marketing", passwordHash: "0db6b937e90449977f5daa522c82b1492aae0b1edb11f5d7a9c0fbfc6f71fdd1", name: "Sophia" },
  { email: "office1092021@gmail.com", passwordHash: "0db6b937e90449977f5daa522c82b1492aae0b1edb11f5d7a9c0fbfc6f71fdd1", name: "Office" },
  { email: "y0505300530@gmail.com", passwordHash: "0db6b937e90449977f5daa522c82b1492aae0b1edb11f5d7a9c0fbfc6f71fdd1", name: "Y Admin" },
  { email: "zack@blitz-affiliates.marketing", passwordHash: "3f21a8490cef2bfb60a9702e9d2ddb7a805c9bd1a263557dfd51a7d0e9dfa93e", name: "Zack" },
  { email: "cameron@blitz-affiliates.marketing", passwordHash: "249194fd43bdcfbb0748eebd6f45baa76c383f8579cdb3ddf9d359d44fbdd476", name: "Cameron" },
  { email: "wpnayanray@gmail.com", passwordHash: "d6a72b1098615c3354d725f4b539b7fdf91e8213cd03af08c4ae3c8729526bd0", name: "Nayan" },
];

const ADMIN_EMAILS = ["y0505300530@gmail.com", "wpnayanray@gmail.com", "office1092021@gmail.com"];
const isAdmin = (email) => ADMIN_EMAILS.includes(email);
const VERSION = "1.059";

// ── Storage Layer ──
// Priority: API (shared between all users) > localStorage (offline backup)
const LS_KEYS = { users: 'blitz_users', payments: 'blitz_payments', 'customer-payments': 'blitz_cp', 'crg-deals': 'blitz_crg', 'daily-cap': 'blitz_dc', 'deals': 'blitz_deals', 'wallets': 'blitz_wallets' };

function lsGet(key, fallback) { try { const r = localStorage.getItem(LS_KEYS[key]); return r ? JSON.parse(r) : fallback; } catch(e) { return fallback; } }
function lsSave(key, data) { try { localStorage.setItem(LS_KEYS[key], JSON.stringify(data)); } catch(e) {} }

const API_BASE = (() => {
  const h = window.location.hostname;
  if (h === 'localhost' || h === '127.0.0.1') return 'http://localhost:3001/api';
  // Use same-origin /api path — Nginx proxies to Node.js backend
  // This works with both HTTP and HTTPS, no mixed content issues
  return '/api';
})();

let serverOnline = false;

async function apiGet(endpoint) {
  try {
    const res = await fetch(`${API_BASE}/${endpoint}`, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) throw new Error('not ok');
    serverOnline = true;
    const data = await res.json();
    // Also backup to localStorage
    lsSave(endpoint, data);
    return data;
  } catch (e) { serverOnline = false; return null; }
}

async function apiSave(endpoint, data) {
  // Always save to localStorage first (instant)
  lsSave(endpoint, data);
  // Then try API
  try {
    await fetch(`${API_BASE}/${endpoint}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data), signal: AbortSignal.timeout(4000),
    });
    serverOnline = true;
  } catch (e) { serverOnline = false; }
}

// Telegram API functions
async function telegramTest() {
  try {
    const res = await fetch(`${API_BASE}/telegram/test`, { signal: AbortSignal.timeout(4000) });
    return await res.json();
  } catch (e) {
    return { status: "error", error: e.message };
  }
}

async function telegramNotify(message) {
  try {
    const res = await fetch(`${API_BASE}/telegram/notify`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }), signal: AbortSignal.timeout(4000),
    });
    return await res.json();
  } catch (e) {
    return { error: e.message };
  }
}

const STATUS_OPTIONS = ["Open", "On the way", "Approved to pay", "Paid"];
const OPEN_STATUSES = ["Open", "On the way", "Approved to pay"];
const TYPE_OPTIONS = ["Affiliate Payment", "Brand Refund"];
const STATUS_COLORS = {
  Open: { bg: "#FEF3C7", text: "#92400E", border: "#F59E0B" },
  "On the way": { bg: "#E0E7FF", text: "#3730A3", border: "#818CF8" },
  "Approved to pay": { bg: "#D1FAE5", text: "#065F46", border: "#10B981" },
  Paid: { bg: "#D1FAE5", text: "#065F46", border: "#10B981" },
};

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const genId = () => Math.random().toString(36).substr(2, 9);

// Convert 2-letter country code to flag emoji
const countryFlag = code => {
  if (!code || code.length !== 2) return "";
  const offset = 127397;
  return String.fromCodePoint(...[...code.toUpperCase()].map(c => c.charCodeAt(0) + offset));
};

const INITIAL = [
  { id: genId(), invoice: "117", paidDate: "2026-02-02", status: "Paid", amount: "2300", openBy: "Sophia", type: "Brand Payment", instructions: "USDTerc20/ USDC erc20/ eth: 0xAE63A91758600339C8e5Ae58b6473c493462B6e4  TRC20...", paymentHash: "", month: 1, year: 2026 },
  { id: genId(), invoice: "35", paidDate: "2026-02-02", status: "Paid", amount: "3000", openBy: "Sophia", type: "Brand Payment", instructions: "‼️ ONLY USDT ‼️ TRC-20: TYUWBpmzSqCcz9r5rRVGQvQzfb7qC1PphQ ERC-20: 0x5066d63E...", paymentHash: "", month: 1, year: 2026 },
  { id: genId(), invoice: "47", paidDate: "2026-02-02", status: "Paid", amount: "26990", openBy: "Sophia", type: "Brand Payment", instructions: "USDT ERC20 + FEE  0x6A8CC73BBFd9717489Ad89661aba0482d1121cc4   USDT TRC20 + F...", paymentHash: "", month: 1, year: 2026 },
  { id: genId(), invoice: "13", paidDate: "2026-02-03", status: "Paid", amount: "3200", openBy: "Sophia", type: "Brand Payment", instructions: "Pls process the payment   TRC20 - TAqtT5SP5rCqXVpF3mG9hjHD2rnqj5Yono ERC20 - ...", paymentHash: "", month: 1, year: 2026 },
  { id: genId(), invoice: "165", paidDate: "2026-02-03", status: "Paid", amount: "5000", openBy: "Sophia", type: "Brand Payment", instructions: "Our wallets: 0xA061F8742Ea82a41c8f1cccd26868Cb9Ae5E9B79 Erc  TBv35KYhJMs89qRu...", paymentHash: "", month: 1, year: 2026 },
  { id: genId(), invoice: "130", paidDate: "2026-02-03", status: "Paid", amount: "2600", openBy: "Sophia", type: "Brand Payment", instructions: "TRC TCJLAVWWPyosxq8WBGB1yYid5pRP94BAS6 +2%FEE  ERC 0xDC8eAD92DEa0D3A174fb1497...", paymentHash: "", month: 1, year: 2026 },
  { id: genId(), invoice: "137", paidDate: "2026-02-03", status: "Paid", amount: "10000", openBy: "Sophia", type: "Brand Payment", instructions: "❕‼️UPDATED NEW Wallets: ONLY USDT‼️❕  TRC20 - TKDR9q8RNq2XaxWQCYzsGGJcHef386x...", paymentHash: "", month: 1, year: 2026 },
  { id: genId(), invoice: "159", paidDate: "2026-02-03", status: "Paid", amount: "1450", openBy: "Sophia", type: "Brand Payment", instructions: "FEE 2% USDT (ERC20) 0x564a0700D9C77c8811FEE19ECc137B3A929e315c  USDC (ERC20) ...", paymentHash: "", month: 1, year: 2026 },
  { id: genId(), invoice: "33", paidDate: "2026-02-04", status: "Paid", amount: "16230", openBy: "Sophia", type: "Brand Payment", instructions: "We only accept payments in USDT. Payment wallet addresses:  USDT TRC-20  TMBF...", paymentHash: "", month: 1, year: 2026 },
  { id: genId(), invoice: "168", paidDate: "2026-02-04", status: "Paid", amount: "3000", openBy: "Sophia", type: "Brand Payment", instructions: ":  🔗 ERC20 (Ethereum) - USDT/USDC: 0x9fb3889367FC8c0C32FD890444f2c066eFDDD713...", paymentHash: "", month: 1, year: 2026 },
  { id: genId(), invoice: "211", paidDate: "2026-02-05", status: "Paid", amount: "4000", openBy: "Sophia", type: "Brand Payment", instructions: "Hi guys!   Our wallets   0x2d93167590B6951fD5A1b4aEaf984Ff155C8E25D  Erc 2%  ...", paymentHash: "", month: 1, year: 2026 },
  { id: genId(), invoice: "168", paidDate: "2026-02-05", status: "Paid", amount: "8000", openBy: "Sophia", type: "Brand Payment", instructions: "🔗 ERC20 (Ethereum) - USDT/USDC: 0x9fb3889367FC8c0C32FD890444f2c066eFDDD713  💰...", paymentHash: "", month: 1, year: 2026 },
  { id: genId(), invoice: "137", paidDate: "2026-02-05", status: "Paid", amount: "3500", openBy: "Sophia", type: "Brand Payment", instructions: "❕‼️UPDATED NEW Wallets: ONLY USDT‼️❕  TRC20 - TKDR9q8RNq2XaxWQCYzsGGJcHef386x...", paymentHash: "", month: 1, year: 2026 },
  { id: genId(), invoice: "211", paidDate: "2026-02-06", status: "Paid", amount: "10000", openBy: "Sophia", type: "Brand Payment", instructions: "Hi guys!   Our wallets   0x2d93167590B6951fD5A1b4aEaf984Ff155C8E25D  Erc 2%  ...", paymentHash: "", month: 1, year: 2026 },
  { id: genId(), invoice: "68", paidDate: "2026-02-06", status: "Paid", amount: "1800", openBy: "Sophia", type: "Brand Payment", instructions: "ELPIS  USDT TRC  TLjLRPN6FWZ44shV73fRNUj9dmAgdnjqRR  USDT ERC/USDC ERC  0xFAE...", paymentHash: "", month: 1, year: 2026 },
  { id: genId(), invoice: "13", paidDate: "2026-02-09", status: "Paid", amount: "1650", openBy: "Sophia", type: "Brand Payment", instructions: "TRC20 - TAqtT5SP5rCqXVpF3mG9hjHD2rnqj5Yono ERC20 - 0x7F0179D7Cc08fF7dc4D87857...", paymentHash: "", month: 1, year: 2026 },
  { id: genId(), invoice: "47", paidDate: "2026-02-09", status: "Paid", amount: "24550", openBy: "Sophia", type: "Brand Payment", instructions: "USDT ERC20 + FEE  0x6A8CC73BBFd9717489Ad89661aba0482d1121cc4   USDT TRC20 + F...", paymentHash: "", month: 1, year: 2026 },
  { id: genId(), invoice: "117", paidDate: "2026-02-09", status: "Paid", amount: "5130", openBy: "Sophia", type: "Brand Payment", instructions: "USDTerc20/ USDC erc20/ eth: 0xAE63A91758600339C8e5Ae58b6473c493462B6e4  TRC20...", paymentHash: "", month: 1, year: 2026 },
  { id: genId(), invoice: "211", paidDate: "2026-02-09", status: "Paid", amount: "5000", openBy: "Sophia", type: "Brand Payment", instructions: "Hi guys!   Our wallets   0x2d93167590B6951fD5A1b4aEaf984Ff155C8E25D  Erc 2%  ...", paymentHash: "", month: 1, year: 2026 },
  { id: genId(), invoice: "196", paidDate: "2026-02-10", status: "Paid", amount: "1000", openBy: "Sophia", type: "Brand Payment", instructions: "TXERqryyzQC5htUbgupp4B6pZ1oSYTHm4h  TRC 20", paymentHash: "", month: 1, year: 2026 },
  { id: genId(), invoice: "175", paidDate: "2026-02-10", status: "Paid", amount: "340", openBy: "Sophia", type: "Brand Payment", instructions: "- Wallets - USDT -   TRC-20 TPHsyQ5BVsxNFtoRfpUE6LfszkcSUPdzjm  ERC-20 0xf819...", paymentHash: "", month: 1, year: 2026 },
  { id: genId(), invoice: "12", paidDate: "2026-02-10", status: "Paid", amount: "2400", openBy: "Sophia", type: "Brand Payment", instructions: "USDT TRC-20: TQZn4ufgaD2FsSQg6aTxLVfHX9SSpg7jV2  USDT ERC-20: 0xA5F1A1b03844a...", paymentHash: "", month: 1, year: 2026 },
  { id: genId(), invoice: "137", paidDate: "2026-02-10", status: "Paid", amount: "6000", openBy: "Sophia", type: "Brand Payment", instructions: "❕‼️UPDATED NEW Wallets: ONLY USDT‼️❕  TRC20 - TKDR9q8RNq2XaxWQCYzsGGJcHef386x...", paymentHash: "", month: 1, year: 2026 },
  { id: genId(), invoice: "122", paidDate: "2026-02-10", status: "Paid", amount: "7208", openBy: "Sophia", type: "Brand Payment", instructions: "❗️NEW WALLET❗️ TZ1U7FRRv2QtaTT2aLJfDqCU95KDxQkHsK", paymentHash: "", month: 1, year: 2026 },
  { id: genId(), invoice: "134", paidDate: "2026-02-10", status: "Paid", amount: "6030", openBy: "Sophia", type: "Brand Payment", instructions: "USDT TRC20       TUuWDyvwbimGcaX3gLYYsK4zBZk3QvoKR7", paymentHash: "", month: 1, year: 2026 },
  { id: genId(), invoice: "33", paidDate: "2026-02-11", status: "Paid", amount: "22690", openBy: "Sophia", type: "Brand Payment", instructions: "USDT TRC-20  TMBFC53yfyDbBDJ5d8jcuAoKeh1ax3QdeX  USDT ERC-20 0x750654D4440D4C...", paymentHash: "", month: 1, year: 2026 },
  { id: genId(), invoice: "35", paidDate: "2026-02-11", status: "Paid", amount: "1848", openBy: "Sophia", type: "Brand Payment", instructions: "‼️ ONLY USDT ‼️ TRC-20: TYUWBpmzSqCcz9r5rRVGQvQzfb7qC1PphQ ERC-20: 0x5066d63E...", paymentHash: "", month: 1, year: 2026 },
  { id: genId(), invoice: "211", paidDate: "2026-02-11", status: "Paid", amount: "8000", openBy: "Julia", type: "Brand Payment", instructions: "", paymentHash: "", month: 1, year: 2026 },
  { id: genId(), invoice: "117", paidDate: "2026-02-12", status: "Paid", amount: "15000", openBy: "Sophia", type: "Brand Payment", instructions: "USDTerc20/ USDC erc20/ eth: 0xAE63A91758600339C8e5Ae58b6473c493462B6e4  TRC20...", paymentHash: "", month: 1, year: 2026 },
  { id: genId(), invoice: "80", paidDate: "2026-02-16", status: "Paid", amount: "825", openBy: "Sophia", type: "Brand Payment", instructions: "Hello dear, confirmed Wallets are the same: ERC – 0x6e2449206C27D6D3714801638...", paymentHash: "", month: 1, year: 2026 },
  { id: genId(), invoice: "71", paidDate: "2026-02-16", status: "Paid", amount: "2600", openBy: "Sophia", type: "Brand Payment", instructions: "0xBAaB1FEE27badEE9E85c7498A1bC4e1BF780F460", paymentHash: "", month: 1, year: 2026 },
  { id: genId(), invoice: "211", paidDate: "2026-02-16", status: "Paid", amount: "5000", openBy: "Sophia", type: "Brand Payment", instructions: "Hi guys!   Our wallets   0x2d93167590B6951fD5A1b4aEaf984Ff155C8E25D  Erc 2%  ...", paymentHash: "", month: 1, year: 2026 },
  { id: genId(), invoice: "117", paidDate: "2026-02-16", status: "Paid", amount: "5000", openBy: "Sophia", type: "Brand Payment", instructions: "USDTerc20/ USDC erc20/ eth: 0xAE63A91758600339C8e5Ae58b6473c493462B6e4  TRC20...", paymentHash: "", month: 1, year: 2026 },
  { id: genId(), invoice: "159", paidDate: "2026-02-16", status: "Paid", amount: "2652", openBy: "Sophia", type: "Brand Payment", instructions: "USDT (ERC20) 0x564a0700D9C77c8811FEE19ECc137B3A929e315c  USDC (ERC20) 0x564a0...", paymentHash: "", month: 1, year: 2026 },
  { id: genId(), invoice: "12", paidDate: "2026-02-16", status: "Paid", amount: "1950", openBy: "Sophia", type: "Brand Payment", instructions: "USDT TRC-20: TQZn4ufgaD2FsSQg6aTxLVfHX9SSpg7jV2  USDT ERC-20: 0xA5F1A1b03844a...", paymentHash: "", month: 1, year: 2026 },
  { id: genId(), invoice: "13", paidDate: "2026-02-17", status: "Paid", amount: "7750", openBy: "Sophia", type: "Brand Payment", instructions: "Pls process the payment   TRC20 - TAqtT5SP5rCqXVpF3mG9hjHD2rnqj5Yono ERC20 - ...", paymentHash: "", month: 1, year: 2026 },
  { id: genId(), invoice: "175", paidDate: "2026-02-17", status: "Paid", amount: "15600", openBy: "Sophia", type: "Brand Payment", instructions: "- Wallets - USDT -   TRC-20 TPHsyQ5BVsxNFtoRfpUE6LfszkcSUPdzjm  ERC-20 0xf819...", paymentHash: "", month: 1, year: 2026 },
  { id: genId(), invoice: "47", paidDate: "2026-02-17", status: "Paid", amount: "9600", openBy: "Sophia", type: "Brand Payment", instructions: "USDT ERC20 + FEE  0x6A8CC73BBFd9717489Ad89661aba0482d1121cc4   USDT TRC20 + F...", paymentHash: "", month: 1, year: 2026 },
  { id: genId(), invoice: "211", paidDate: "2026-02-17", status: "Paid", amount: "5000", openBy: "Sophia", type: "Brand Payment", instructions: "Hi guys!   Our wallets   0x2d93167590B6951fD5A1b4aEaf984Ff155C8E25D  Erc 2%  ...", paymentHash: "", month: 1, year: 2026 },
  { id: genId(), invoice: "171", paidDate: "2026-02-18", status: "Paid", amount: "4785", openBy: "Sophia", type: "Brand Payment", instructions: "NEW Wallets: ❗️❗️💵💸🟩  BTC - 3ApPSHdMCuTLn2Uf2AJmKW3uyWiF1voFZs  TRC - TYm8rfR...", paymentHash: "", month: 1, year: 2026 },
  { id: genId(), invoice: "134", paidDate: "2026-02-18", status: "Paid", amount: "3855", openBy: "Sophia", type: "Brand Payment", instructions: "USDT TRC20 TUuWDyvwbimGcaX3gLYYsK4zBZk3QvoKR7", paymentHash: "", month: 1, year: 2026 },
  { id: genId(), invoice: "33", paidDate: "2026-02-18", status: "Paid", amount: "5580", openBy: "Sophia", type: "Brand Payment", instructions: "USDT TRC-20  TMBFC53yfyDbBDJ5d8jcuAoKeh1ax3QdeX  USDT ERC-20 0x750654D4440D4C...", paymentHash: "", month: 1, year: 2026 },
  { id: genId(), invoice: "171", paidDate: "2026-02-18", status: "Paid", amount: "5000", openBy: "Sophia", type: "Brand Payment", instructions: "NEW Wallets: ❗️❗️💵💸🟩  BTC - 3ApPSHdMCuTLn2Uf2AJmKW3uyWiF1voFZs  TRC - TYm8rfR...", paymentHash: "", month: 1, year: 2026 },
  { id: genId(), invoice: "117", paidDate: "2026-02-18", status: "Paid", amount: "7000", openBy: "Sophia", type: "Brand Payment", instructions: "Our wallets: USDTerc20/ USDC erc20/ eth: 0xAE63A91758600339C8e5Ae58b6473c4934...", paymentHash: "", month: 1, year: 2026 },
];

/* ── Icons ── */
const I = {
  logo: <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><rect width="28" height="28" rx="8" fill="#0EA5E9"/><path d="M8 10h12M8 14h8M8 18h10" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round"/></svg>,
  plus: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 3v12M3 9h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  edit: <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M11.5 2.5l2 2L5 13H3v-2l8.5-8.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>,
  trash: <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M3 4h10M6 4V3h4v1M5 4v9h6V4" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>,
  logout: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M7 15H4a1 1 0 01-1-1V4a1 1 0 011-1h3M11 12l3-3-3-3M7 9h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  chevL: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12 4l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  chevR: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M8 4l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  search: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="8" cy="8" r="5" stroke="currentColor" strokeWidth="1.5"/><path d="M12 12l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  close: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M6 6l8 8M14 6l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  openBox: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="3" y="6" width="14" height="11" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M3 10h14M7 3l-4 7M13 3l4 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  calendar: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="3" y="4" width="14" height="13" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M3 8h14M7 2v4M13 2v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  admin: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 2a3 3 0 100 6 3 3 0 000-6zM4 15a5 5 0 0110 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M14 8l1.5 1.5M14 11V8h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  back: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M11 4L6 9l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  refresh: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 8a6 6 0 0110.89-3.48M14 2v4h-4M14 8a6 6 0 01-10.89 3.48M2 14v-4h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
};

/* ── Shared styles ── */
const inp = {
  width: "100%", padding: "10px 14px", background: "#F8FAFC",
  border: "1px solid #E2E8F0", borderRadius: 8,
  color: "#1E293B", fontSize: 14, outline: "none", boxSizing: "border-box",
};

/* ── Components ── */
const TEAM_NAMES = ["Alex", "John", "Katie", "Joy", "Oksana", "Donald"];

const PEOPLE_COLORS = {
  Alex: "#579BFC", Katie: "#E2445C", Oksana: "#A25DDC", Joy: "#00C875", John: "#7F5347", Donald: "#FDAB3D",
};
const getPersonColor = name => {
  if (PEOPLE_COLORS[name]) return PEOPLE_COLORS[name];
  let h = 0; for (let i = 0; i < (name||"").length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  const colors = ["#FF6B9D","#00BCD4","#FF9800","#9C27B0","#4CAF50","#E91E63","#3F51B5","#009688"];
  return colors[Math.abs(h) % colors.length];
};

function NameCombo({ value, onChange, placeholder }) {
  const [custom, setCustom] = useState(false);
  const [customVal, setCustomVal] = useState("");
  const isCustom = value && !TEAM_NAMES.includes(value);

  if (custom || (isCustom && value)) {
    return (
      <div style={{ display: "flex", gap: 6 }}>
        <input style={{ ...inp, flex: 1 }} value={isCustom ? value : customVal}
          onChange={e => { setCustomVal(e.target.value); onChange(e.target.value); }}
          placeholder="Type custom name..." autoFocus />
        <button onClick={() => { setCustom(false); setCustomVal(""); onChange(""); }}
          style={{ padding: "6px 10px", borderRadius: 8, background: "#F1F5F9", border: "1px solid #E2E8F0", color: "#64748B", cursor: "pointer", fontSize: 12, whiteSpace: "nowrap" }}>← Back</button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {TEAM_NAMES.map(name => (
        <button key={name} onClick={() => onChange(name)}
          style={{
            padding: "6px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
            border: value === name ? `2px solid ${getPersonColor(name)}` : "2px solid #E2E8F0",
            background: value === name ? `${getPersonColor(name)}15` : "#F8FAFC",
            color: value === name ? getPersonColor(name) : "#64748B",
            transition: "all 0.15s",
          }}
        >{name}</button>
      ))}
      <button onClick={() => setCustom(true)}
        style={{ padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: "pointer",
          border: "2px dashed #CBD5E1", background: "transparent", color: "#94A3B8", transition: "all 0.15s" }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = "#0EA5E9"; e.currentTarget.style.color = "#0EA5E9"; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = "#CBD5E1"; e.currentTarget.style.color = "#94A3B8"; }}
      >+ Other</button>
    </div>
  );
}

function SyncStatus() {
  const [online, setOnline] = useState(serverOnline);
  useEffect(() => {
    const iv = setInterval(() => setOnline(serverOnline), 3000);
    return () => clearInterval(iv);
  }, []);
  return (
    <div title={online ? "Connected to server — data syncs between all users" : "Server offline — data saved locally only. Run setup.sh on your server to enable sync."}
      style={{ display: "flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600, cursor: "default",
        background: online ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)",
        border: `1px solid ${online ? "rgba(16,185,129,0.3)" : "rgba(245,158,11,0.3)"}`,
        color: online ? "#10B981" : "#F59E0B",
      }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: online ? "#10B981" : "#F59E0B", display: "inline-block" }} />
      {online ? "Synced" : "Local"}
    </div>
  );
}

function StatusBadge({ status }) {
  const c = STATUS_COLORS[status] || { bg: "#F1F5F9", text: "#475569", border: "#94A3B8" };
  return <span style={{ display: "inline-block", padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: c.bg, color: c.text, border: `1px solid ${c.border}`, whiteSpace: "nowrap" }}>{status}</span>;
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 12 }} onClick={onClose}>
      <div className="blitz-modal-content" onClick={e => e.stopPropagation()} style={{ background: "#FFFFFF", borderRadius: 16, border: "1px solid #E2E8F0", padding: 32, width: 540, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 25px 60px rgba(0,0,0,0.12)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ margin: 0, color: "#0F172A", fontSize: 20, fontWeight: 700 }}>{title}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748B", padding: 4 }}>{I.close}</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return <div style={{ marginBottom: 18 }}><label style={{ display: "block", color: "#64748B", fontSize: 11, fontWeight: 600, marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.8 }}>{label}</label>{children}</div>;
}

function getAvailableStatuses(userEmail) {
  // Everyone can set: Open, On the way
  // y0505300530@gmail.com can also set: Approved to pay, Paid
  // office1092021@gmail.com can also set: Paid
  const base = ["Open", "On the way"];
  if (userEmail === "y0505300530@gmail.com") {
    return ["Open", "On the way", "Approved to pay", "Paid"];
  }
  if (userEmail === "office1092021@gmail.com") {
    return ["Open", "On the way", "Paid"];
  }
  return base;
}

/* ── Fee Helper ── */
// Fee can be: "2%" (percentage), "50" (flat $), or empty
function calcFee(fee, amount) {
  if (!fee) return 0;
  const f = fee.trim();
  const amt = parseFloat(amount) || 0;
  if (f.endsWith('%')) {
    const pct = parseFloat(f.replace('%', ''));
    return isNaN(pct) ? 0 : Math.round(amt * pct / 100);
  }
  const flat = parseFloat(f);
  return isNaN(flat) ? 0 : flat;
}

function fmtFee(fee, amount) {
  if (!fee) return "—";
  const val = calcFee(fee, amount);
  return fee.trim().endsWith('%') ? `${fee.trim()} (${val.toLocaleString("en-US")}$)` : `${val.toLocaleString("en-US")}$`;
}

/* ── Shared Responsive Header ── */
function BlitzHeader({ user, activePage, userAccess, onNav, onAdmin, onRefresh, onLogout, accentColor }) {
  const mobile = useMobile();
  const [menuOpen, setMenuOpen] = useState(false);
  const allNavPages = [
    { key: "dashboard", label: "Payments", color: "#0EA5E9" },
    { key: "customers", label: "Customer Payments", color: "#0EA5E9" },
    { key: "crg", label: "CRG Deals", color: "#F59E0B" },
    { key: "dailycap", label: "Daily Cap", color: "#8B5CF6" },
    { key: "deals", label: "Deals", color: "#10B981" },
  ];
  if (isAdmin(user.email)) allNavPages.push({ key: "admin", label: "⚙️ Admin", color: "#DC2626" });

  return (
    <>
      <header className="blitz-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 32px", borderBottom: "1px solid #E2E8F0", background: "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: mobile ? 8 : 12 }}>
          {I.logo}
          {!mobile && <span style={{ fontFamily: "'Space Mono',monospace", fontWeight: 700, fontSize: 18, letterSpacing: -0.3 }}>Blitz CRM</span>}
          <span style={{ fontSize: 11, color: "#64748B", fontFamily: "'Space Mono',monospace", background: "#E2E8F0", padding: "2px 8px", borderRadius: 6 }}>v{VERSION}</span>
          {!mobile && <>
            <span style={{ color: "#CBD5E1", margin: "0 4px" }}>|</span>
            <div className="nav-links" style={{ display: "flex", alignItems: "center", gap: 2 }}>
              {allNavPages.filter(pg => pg.key !== "admin" && (userAccess || []).includes(pg.key)).map(pg => (
                activePage === pg.key
                  ? <span key={pg.key} style={{ background: pg.color, color: "#FFF", padding: "4px 12px", borderRadius: 6, fontSize: 14, fontWeight: 700 }}>{pg.label}</span>
                  : <button key={pg.key} onClick={() => onNav(pg.key)} style={{ background: "none", border: "none", color: "#64748B", cursor: "pointer", fontSize: 14, fontWeight: 500, padding: "4px 8px" }}
                      onMouseEnter={e => e.currentTarget.style.color = pg.color} onMouseLeave={e => e.currentTarget.style.color = "#64748B"}>{pg.label}</button>
              ))}
            </div>
          </>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: mobile ? 6 : 12 }}>
          {!mobile && <>
            <div className="desktop-actions" style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {isAdmin(user.email) && <button onClick={onAdmin} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 20px", borderRadius: 10, background: "linear-gradient(135deg, #DC2626, #EF4444)", border: "none", color: "#FFF", cursor: "pointer", fontSize: 14, fontWeight: 700, boxShadow: "0 4px 16px rgba(239,68,68,0.4)" }}>⚙️ Admin</button>}
              <div style={{ padding: "5px 14px", borderRadius: 20, background: `${accentColor || "#0EA5E9"}12`, border: `1px solid ${accentColor || "#0EA5E9"}33`, fontSize: 13, color: accentColor || "#38BDF8", fontWeight: 500 }}>{user.name}</div>
              <button onClick={onRefresh} title="Refresh" style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "1px solid #E2E8F0", color: "#64748B", cursor: "pointer", fontSize: 13, fontWeight: 500, padding: "6px 10px", borderRadius: 8 }}>{I.refresh}<span>Refresh</span></button>
              <SyncStatus />
              <button onClick={onLogout} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "#64748B", cursor: "pointer", fontSize: 13, fontWeight: 500, padding: "6px 8px", borderRadius: 8 }}
                onMouseEnter={e => e.currentTarget.style.color = "#F87171"} onMouseLeave={e => e.currentTarget.style.color = "#64748B"}
              >{I.logout}<span>Logout</span></button>
            </div>
          </>}
          {mobile && <>
            <SyncStatus />
            <button onClick={onRefresh} title="Refresh" style={{ display: "flex", background: "none", border: "1px solid #E2E8F0", color: "#64748B", cursor: "pointer", padding: "6px 8px", borderRadius: 8 }}>{I.refresh}</button>
            <button className="mobile-menu-btn" onClick={() => setMenuOpen(true)}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "1px solid #E2E8F0", color: "#334155", cursor: "pointer", padding: "6px 10px", borderRadius: 8, fontSize: 18 }}>☰</button>
          </>}
        </div>
      </header>
      {mobile && menuOpen && (
        <MobileNav pages={allNavPages} current={activePage} userAccess={userAccess} onNav={onNav} onClose={() => setMenuOpen(false)} />
      )}
    </>
  );
}

function PaymentForm({ payment, onSave, onClose, userEmail, userName }) {
  const [f, setF] = useState(payment || { invoice: "", paidDate: "", status: "Open", amount: "", fee: "", openBy: userName || "", type: "Affiliate Payment", trcAddress: "", ercAddress: "", paymentHash: "" });
  const [error, setError] = useState("");
  const s = (k, v) => { setF(p => ({ ...p, [k]: v })); setError(""); };
  const availableStatuses = getAvailableStatuses(userEmail);

  const handleSave = () => {
    if (!f.invoice.trim() || isNaN(f.invoice) || parseInt(f.invoice) < 1 || parseInt(f.invoice) > 999) {
      setError("Invoice must be a number between 1 and 999");
      return;
    }
    if (!f.amount || parseFloat(f.amount) <= 0) {
      setError("Amount is required");
      return;
    }
    if (f.status === "Paid" && !f.paymentHash.trim()) {
      setError("Payment Hash is required when marking as Paid");
      return;
    }
    onSave(f);
  };

  return (
    <>
      <div className="blitz-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
        <Field label="Invoice #"><input style={inp} value={f.invoice} onChange={e => { const v = e.target.value.replace(/\D/g, "").slice(0, 3); s("invoice", v); }} placeholder="e.g. 100" maxLength={3} /></Field>
        <Field label="Amount ($)"><input style={inp} type="number" value={f.amount} onChange={e => s("amount", e.target.value)} placeholder="0.00" /></Field>
        <Field label="Fee (number or %)">
          <input style={inp} value={f.fee || ""} onChange={e => s("fee", e.target.value)} placeholder="e.g. 2% or 50" />
          {f.fee && f.amount && <div style={{ fontSize: 11, color: "#0EA5E9", marginTop: 4 }}>Fee: {fmtFee(f.fee, f.amount)}</div>}
        </Field>
        <Field label="Status">
          <select style={{ ...inp, cursor: "pointer" }} value={f.status} onChange={e => {
            const ns = e.target.value;
            setF(prev => ({
              ...prev,
              status: ns,
              paidDate: ns === "Paid" ? new Date().toISOString().split("T")[0] : "",
            }));
            setError("");
          }}>
            {availableStatuses.map(st => <option key={st} value={st}>{st}</option>)}
          </select>
          {!availableStatuses.includes(f.status) && f.status && (
            <div style={{ fontSize: 11, color: "#F59E0B", marginTop: 4 }}>Current status "{f.status}" — you don't have permission to change it</div>
          )}
        </Field>
        <Field label="Type">
          <select style={{ ...inp, cursor: "pointer" }} value={f.type || "Affiliate Payment"} onChange={e => s("type", e.target.value)}>
            {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Paid Date">
          <div style={{ ...inp, background: "#e8ecf0", color: f.paidDate ? "#1E293B" : "#94A3B8", cursor: "default", display: "flex", alignItems: "center" }}>
            {f.paidDate || "Auto-set when marked Paid"}
          </div>
        </Field>
        <Field label="Open By"><NameCombo value={f.openBy} onChange={v => s("openBy", v)} placeholder="Select name" /></Field>
      </div>
      <div className="blitz-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
        <Field label="TRC Address"><input style={inp} value={f.trcAddress || ""} onChange={e => s("trcAddress", e.target.value)} placeholder="e.g. TYUWBpmzSqCcz9r5rRVG..." /></Field>
        <Field label="ERC Address"><input style={inp} value={f.ercAddress || ""} onChange={e => s("ercAddress", e.target.value)} placeholder="e.g. 0x5066d63E126Cb3F893..." /></Field>
      </div>
      <Field label="Payment Hash (Crypto Wallet)">
        <input style={{ ...inp, borderColor: error && f.status === "Paid" && !f.paymentHash.trim() ? "#EF4444" : "rgba(148,163,184,0.2)" }} value={f.paymentHash} onChange={e => s("paymentHash", e.target.value)} placeholder="e.g. 0xabc123..." />
      </Field>
      {error && <div style={{ color: "#DC2626", fontSize: 13, padding: "8px 12px", background: "rgba(220,38,38,0.08)", borderRadius: 8, marginBottom: 8, border: "1px solid rgba(220,38,38,0.2)" }}>{error}</div>}
      <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8 }}>
        <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 8, background: "transparent", border: "1px solid #E2E8F0", color: "#64748B", cursor: "pointer", fontSize: 14, fontWeight: 500 }}>Cancel</button>
        <button onClick={handleSave} style={{ padding: "10px 24px", borderRadius: 8, background: "linear-gradient(135deg,#0EA5E9,#38BDF8)", border: "none", color: "#FFF", cursor: "pointer", fontSize: 14, fontWeight: 600, boxShadow: "0 4px 15px rgba(14,165,233,0.3)" }}>{payment ? "Save Changes" : "Add Payment"}</button>
      </div>
    </>
  );
}

/* ── Payment Table ── */
function PaymentTable({ payments, onEdit, onDelete, onStatusChange, emptyMsg, statusOptions, sortMode, onMove }) {
  const fmt = a => { const n = parseFloat(a) || 0; return n.toLocaleString("en-US") + "$"; };
  const sorted = sortMode === "alpha"
    ? [...payments].sort((a, b) => (a.invoice || "").localeCompare(b.invoice || "", undefined, { numeric: true }))
    : [...payments].sort((a, b) => (a.paidDate || "").localeCompare(b.paidDate || ""));
  const total = payments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);

  // Date range
  const dates = payments.filter(p => p.paidDate).map(p => new Date(p.paidDate)).sort((a, b) => a - b);
  const fmtShort = d => { const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]; return `${months[d.getMonth()]} ${d.getDate()}`; };
  const dateRange = dates.length > 0 ? (dates.length === 1 ? fmtShort(dates[0]) : `${fmtShort(dates[0])} - ${fmtShort(dates[dates.length - 1])}`) : "";

  if (payments.length === 0) return <div style={{ padding: "40px 16px", textAlign: "center", color: "#94A3B8", fontSize: 14 }}>{emptyMsg}</div>;

  const openByColors = ["#FF6B9D", "#00BCD4", "#FF9800", "#9C27B0", "#4CAF50", "#E91E63"];
  const getOpenByColor = name => { let h = 0; for (let i = 0; i < (name||"").length; i++) h = name.charCodeAt(i) + ((h << 5) - h); return openByColors[Math.abs(h) % openByColors.length]; };

  const statusStyle = status => {
    const styles = {
      Open: { background: "#FEF3C7", color: "#92400E" },
      "On the way": { background: "#818CF8", color: "#FFF" },
      "Approved to pay": { background: "#34D399", color: "#FFF" },
      Paid: { background: "#10B981", color: "#FFF" },
    };
    return styles[status] || { background: "#F1F5F9", color: "#475569" };
  };

  const mobile = useMobile();

  if (mobile) {
    return (
      <div>
        {sorted.map(p => (
          <div key={p.id} style={{ background: "#FFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: "14px 16px", marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span onClick={() => onEdit(p)} style={{ fontFamily: "'Space Mono',monospace", fontSize: 18, fontWeight: 800, color: "#0EA5E9", cursor: "pointer" }}>#{p.invoice}</span>
                <span style={{ padding: "3px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700, ...statusStyle(p.status) }}>{p.status}</span>
              </div>
              <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 18, fontWeight: 800, color: "#0F172A" }}>{fmt(p.amount)}</span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 12px", fontSize: 12, color: "#64748B", marginBottom: 8 }}>
              {p.paidDate && <span>📅 {new Date(p.paidDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>}
              <span style={{ padding: "2px 8px", borderRadius: 4, background: (p.type || "Affiliate Payment") === "Brand Refund" ? "#FEE2E2" : "#EFF6FF", color: (p.type || "Affiliate Payment") === "Brand Refund" ? "#DC2626" : "#2563EB", fontSize: 10, fontWeight: 600 }}>{p.type || "Affiliate Payment"}</span>
              {p.fee && <span>Fee: {fmtFee(p.fee, p.amount)}</span>}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ padding: "3px 10px", borderRadius: 4, background: getPersonColor(p.openBy), color: "#FFF", fontWeight: 700, fontSize: 12 }}>{p.openBy}</span>
              <div style={{ display: "flex", gap: 6 }}>
                {p.status !== "Paid" && statusOptions && onStatusChange && (
                  <select value={p.status} onChange={e => onStatusChange(p.id, e.target.value)}
                    style={{ padding: "4px 6px", borderRadius: 4, fontSize: 11, fontWeight: 700, border: "1px solid #E2E8F0", ...statusStyle(p.status) }}>
                    {statusOptions.map(st => <option key={st} value={st}>{st}</option>)}
                  </select>
                )}
                <button onClick={() => onEdit(p)} style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 6, padding: 5, cursor: "pointer", color: "#2563EB", display: "flex" }}>{I.edit}</button>
                <button onClick={() => onDelete(p.id)} style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 6, padding: 5, cursor: "pointer", color: "#DC2626", display: "flex" }}>{I.trash}</button>
              </div>
            </div>
            {(p.trcAddress || p.ercAddress || p.paymentHash) && (
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #F1F5F9", fontSize: 10, fontFamily: "'Space Mono',monospace", color: "#94A3B8", display: "flex", flexDirection: "column", gap: 2 }}>
                {p.trcAddress && <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>TRC: {p.trcAddress}</div>}
                {p.ercAddress && <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>ERC: {p.ercAddress}</div>}
                {p.paymentHash && <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Hash: {p.paymentHash}</div>}
              </div>
            )}
          </div>
        ))}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, padding: "12px", flexWrap: "wrap" }}>
          {dateRange && <span style={{ padding: "5px 14px", borderRadius: 20, background: "#F472B6", color: "#FFF", fontWeight: 700, fontSize: 12 }}>{dateRange}</span>}
          <span style={{ padding: "5px 14px", borderRadius: 20, background: "#10B981", color: "#FFF", fontWeight: 700, fontSize: 12 }}>{payments.length} invoices</span>
          <span style={{ fontFamily: "'Space Mono',monospace", fontWeight: 800, fontSize: 15, color: "#0F172A" }}>{total.toLocaleString("en-US")}$</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, tableLayout: "fixed" }}>
        <colgroup>
          <col style={{ width: "6%" }} />{/* Invoice */}
          <col style={{ width: "7%" }} />{/* Paid Date */}
          <col style={{ width: "9%" }} />{/* Type */}
          <col style={{ width: "10%" }} />{/* Status */}
          <col style={{ width: "8%" }} />{/* Amount */}
          <col style={{ width: "6%" }} />{/* Fee */}
          <col style={{ width: "8%" }} />{/* Open By */}
          <col style={{ width: "14%" }} />{/* TRC */}
          <col style={{ width: "14%" }} />{/* ERC */}
          <col style={{ width: "10%" }} />{/* Hash */}
          <col style={{ width: "8%" }} />{/* Actions */}
        </colgroup>
        <thead>
          <tr style={{ background: "#F8FAFC" }}>
            {["Invoice","Date","Type","Status","Amount","Fee","Open By","TRC Address","ERC Address","Hash","Actions"].map(h =>
              <th key={h} style={{ padding: "8px 6px", textAlign: "left", color: "#64748B", fontSize: 10, fontWeight: 700, borderBottom: "2px solid #E2E8F0", borderRight: "1px solid #F1F5F9", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{h}</th>
            )}
          </tr>
        </thead>
        <tbody>
          {sorted.map((p, i) => (
            <tr key={p.id}
              style={{ borderBottom: "1px solid #F1F5F9", transition: "background 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <td style={{ padding: "7px 6px", fontWeight: 700, fontFamily: "'Space Mono',monospace", fontSize: 13, borderRight: "1px solid #F1F5F9" }}>
                <span onClick={() => onEdit(p)} style={{ cursor: "pointer", color: "#0EA5E9", textDecoration: "underline", textDecorationColor: "rgba(14,165,233,0.3)", textUnderlineOffset: 3 }}
                  onMouseEnter={e => e.currentTarget.style.textDecorationColor = "#0EA5E9"}
                  onMouseLeave={e => e.currentTarget.style.textDecorationColor = "rgba(14,165,233,0.3)"}
                >{p.invoice}</span>
              </td>
              <td style={{ padding: "7px 6px", color: p.paidDate ? "#334155" : "#CBD5E1", fontSize: 11, borderRight: "1px solid #F1F5F9", whiteSpace: "nowrap" }}>{p.paidDate ? new Date(p.paidDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}</td>
              <td style={{ padding: "7px 6px", borderRight: "1px solid #F1F5F9" }}>
                <span style={{ padding: "2px 6px", borderRadius: 4, background: (p.type || "Affiliate Payment") === "Brand Refund" ? "#FEE2E2" : "#EFF6FF", color: (p.type || "Affiliate Payment") === "Brand Refund" ? "#DC2626" : "#2563EB", fontSize: 10, fontWeight: 600, whiteSpace: "nowrap" }}>{p.type || "Affiliate Payment"}</span>
              </td>
              <td style={{ padding: "7px 6px", borderRight: "1px solid #F1F5F9" }}>
                {p.status !== "Paid" && statusOptions && onStatusChange ? (
                  <select value={p.status} onChange={e => onStatusChange(p.id, e.target.value)}
                    style={{ padding: "3px 4px", borderRadius: 4, fontSize: 11, fontWeight: 700, border: "1px solid #E2E8F0", cursor: "pointer", ...(statusStyle(p.status)), appearance: "auto", outline: "none", maxWidth: "100%" }}>
                    {statusOptions.map(st => <option key={st} value={st}>{st}</option>)}
                  </select>
                ) : (
                  <span style={{ display: "inline-block", padding: "3px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700, letterSpacing: 0.3, ...statusStyle(p.status) }}>{p.status}</span>
                )}
              </td>
              <td style={{ padding: "7px 6px", fontWeight: 800, fontFamily: "'Space Mono',monospace", fontSize: 13, color: "#0F172A", borderRight: "1px solid #F1F5F9", whiteSpace: "nowrap" }}>{fmt(p.amount)}</td>
              <td style={{ padding: "7px 6px", fontSize: 10, color: p.fee ? "#0EA5E9" : "#CBD5E1", borderRight: "1px solid #F1F5F9", fontFamily: "'Space Mono',monospace" }}>{fmtFee(p.fee, p.amount)}</td>
              <td style={{ padding: "7px 6px", borderRight: "1px solid #F1F5F9" }}>
                <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 4, background: getPersonColor(p.openBy), color: "#FFF", fontWeight: 700, fontSize: 11 }}>{p.openBy}</span>
              </td>
              <td style={{ padding: "7px 6px", fontFamily: "'Space Mono',monospace", fontSize: 9, color: "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", borderRight: "1px solid #F1F5F9" }}>{p.trcAddress || p.instructions || "—"}</td>
              <td style={{ padding: "7px 6px", fontFamily: "'Space Mono',monospace", fontSize: 9, color: "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", borderRight: "1px solid #F1F5F9" }}>{p.ercAddress || "—"}</td>
              <td style={{ padding: "7px 6px", fontFamily: "'Space Mono',monospace", fontSize: 9, color: "#94A3B8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", borderRight: "1px solid #F1F5F9" }}>{p.paymentHash || "—"}</td>
              <td style={{ padding: "4px 4px" }}>
                <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
                  {onMove && sortMode !== "alpha" && <>
                    <button onClick={() => onMove(p.id, "up")} title="Move up" disabled={i === 0}
                      style={{ background: "none", border: "1px solid #E2E8F0", borderRadius: 3, padding: "1px 3px", cursor: i === 0 ? "default" : "pointer", color: i === 0 ? "#E2E8F0" : "#64748B", display: "flex", fontSize: 10 }}>▲</button>
                    <button onClick={() => onMove(p.id, "down")} title="Move down" disabled={i === sorted.length - 1}
                      style={{ background: "none", border: "1px solid #E2E8F0", borderRadius: 3, padding: "1px 3px", cursor: i === sorted.length - 1 ? "default" : "pointer", color: i === sorted.length - 1 ? "#E2E8F0" : "#64748B", display: "flex", fontSize: 10 }}>▼</button>
                  </>}
                  <button onClick={() => onEdit(p)} title="Edit" style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 5, padding: 4, cursor: "pointer", color: "#2563EB", display: "flex" }}>{I.edit}</button>
                  <button onClick={() => onDelete(p.id)} title="Delete" style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 5, padding: 4, cursor: "pointer", color: "#DC2626", display: "flex" }}>{I.trash}</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* Footer summary bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 24,
        padding: "12px 20px", background: "#F8FAFC", borderTop: "2px solid #E2E8F0",
        flexWrap: "wrap",
      }}>
        {dateRange && (
          <span style={{ padding: "5px 16px", borderRadius: 20, background: "#F472B6", color: "#FFF", fontWeight: 700, fontSize: 13 }}>{dateRange}</span>
        )}
        <span style={{ padding: "5px 16px", borderRadius: 20, background: "#10B981", color: "#FFF", fontWeight: 700, fontSize: 13 }}>{payments.length} invoices</span>
        <span style={{ fontFamily: "'Space Mono',monospace", fontWeight: 800, fontSize: 16, color: "#0F172A" }}>{total.toLocaleString("en-US")}$</span>
        <span style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600, textTransform: "uppercase" }}>sum</span>
      </div>
    </div>
  );
}

/* ── Group Header ── */
function GroupHeader({ icon, title, count, total, accentColor, defaultOpen, children }) {
  const [open, setOpen] = useState(defaultOpen !== false);
  const fmt = a => { const n = parseFloat(a) || 0; return n.toLocaleString("en-US") + "$"; };

  return (
    <div style={{ marginBottom: 24 }}>
      <button onClick={() => setOpen(!open)} style={{
        display: "flex", alignItems: "center", gap: 10, width: "100%",
        padding: "16px 22px", background: "#FFFFFF",
        border: "1px solid #E2E8F0", borderRadius: open ? "14px 14px 0 0" : 14,
        cursor: "pointer", color: "#0F172A", fontSize: 16, fontWeight: 800,
        transition: "all 0.2s",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}>
        <span style={{ color: accentColor, display: "flex", fontSize: 18 }}>{icon}</span>
        <span style={{ color: accentColor }}>{title}</span>
        <span style={{ background: accentColor, color: "#FFF", borderRadius: 12, padding: "3px 12px", fontSize: 13, fontWeight: 700, marginLeft: 4 }}>{count}</span>
        <span style={{ marginLeft: "auto", fontFamily: "'Space Mono',monospace", fontSize: 15, fontWeight: 800, color: "#0F172A" }}>{fmt(total)}</span>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ transform: open ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s", marginLeft: 8 }}>
          <path d="M4 6l4 4 4-4" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && (
        <div style={{
          background: "#FFFFFF",
          border: "1px solid #E2E8F0",
          borderTop: "none",
          borderRadius: "0 0 14px 14px",
          overflow: "hidden",
          boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
        }}>
          {children}
        </div>
      )}
    </div>
  );
}

/* ── Admin Panel ── */
const ALL_PAGES = [
  { key: "dashboard", label: "Payments", color: "#0EA5E9" },
  { key: "customers", label: "Customer Payments", color: "#0EA5E9" },
  { key: "crg", label: "CRG Deals", color: "#F59E0B" },
  { key: "dailycap", label: "Daily Cap", color: "#8B5CF6" },
  { key: "deals", label: "Deals", color: "#10B981" },
];

function getPageAccess(user) {
  if (isAdmin(user.email)) return ALL_PAGES.map(p => p.key);
  return user.pageAccess || ALL_PAGES.map(p => p.key);
}

function PageAccessToggles({ access, onChange }) {
  const toggle = key => {
    const current = access || ALL_PAGES.map(p => p.key);
    if (current.includes(key)) {
      if (current.length <= 1) return; // must have at least 1
      onChange(current.filter(k => k !== key));
    } else {
      onChange([...current, key]);
    }
  };
  const current = access || ALL_PAGES.map(p => p.key);

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {ALL_PAGES.map(pg => {
        const active = current.includes(pg.key);
        return (
          <button key={pg.key} onClick={() => toggle(pg.key)}
            style={{
              padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
              border: active ? `2px solid ${pg.color}` : "2px solid #E2E8F0",
              background: active ? `${pg.color}15` : "transparent",
              color: active ? pg.color : "#94A3B8",
              transition: "all 0.15s",
            }}
          >
            {active ? "✓ " : ""}{pg.label}
          </button>
        );
      })}
    </div>
  );
}

function AdminPanel({ users, setUsers, wallets, setWallets, onBack }) {
  const [addOpen, setAddOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [newUser, setNewUser] = useState({ email: "", password: "", name: "", pageAccess: ALL_PAGES.map(p => p.key) });
  const [delConfirm, setDelConfirm] = useState(null);
  const [editingWallet, setEditingWallet] = useState(null); // null or wallet id being edited
  const [walletForm, setWalletForm] = useState({ date: "", trc: "", erc: "", btc: "" });

  const handleAddUser = () => {
    if (!newUser.email || !newUser.password || !newUser.name) return;
    if (users.some(u => u.email === newUser.email)) return;
    const hashed = hashPassword(newUser.password);
    setUsers(prev => [...prev, { email: newUser.email, passwordHash: hashed, name: newUser.name, pageAccess: newUser.pageAccess }]);
    setNewUser({ email: "", password: "", name: "", pageAccess: ALL_PAGES.map(p => p.key) });
    setAddOpen(false);
  };

  const handleUpdateUser = () => {
    if (!editUser) return;
    setUsers(prev => prev.map(u => {
      if (u.email !== editUser.originalEmail) return u;
      const updated = { email: editUser.email, name: editUser.name, pageAccess: editUser.pageAccess || ALL_PAGES.map(p => p.key) };
      if (editUser.password && editUser.password.trim()) {
        updated.passwordHash = hashPassword(editUser.password);
      } else {
        updated.passwordHash = u.passwordHash;
      }
      return updated;
    }));
    setEditUser(null);
  };

  const handleDeleteUser = (email) => {
    if (isAdmin(email)) return; // can't delete admin
    setUsers(prev => prev.filter(u => u.email !== email));
    setDelConfirm(null);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F1F5F9", fontFamily: "'DM Sans','Segoe UI',sans-serif", color: "#0F172A" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />

      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 32px", borderBottom: "1px solid #E2E8F0", background: "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {I.logo}
          <span style={{ fontFamily: "'Space Mono',monospace", fontWeight: 700, fontSize: 18, letterSpacing: -0.3 }}>Blitz CRM</span>
          <span style={{ fontSize: 11, color: "#64748B", fontFamily: "'Space Mono',monospace", background: "#E2E8F0", padding: "2px 8px", borderRadius: 6 }}>v{VERSION}</span>
          <span style={{ color: "#64748B", fontSize: 14 }}>/ Admin</span>
        </div>
        <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "1px solid #E2E8F0", color: "#64748B", cursor: "pointer", fontSize: 13, fontWeight: 500, padding: "8px 16px", borderRadius: 8 }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "#38BDF8"; e.currentTarget.style.color = "#38BDF8"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "#334155"; e.currentTarget.style.color = "#94A3B8"; }}
        >{I.back}<span>Back to Dashboard</span></button>
      </header>

      <main style={{ maxWidth: 800, margin: "0 auto", padding: "36px 32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>User Management</h1>
          <button onClick={() => setAddOpen(true)}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", background: "linear-gradient(135deg,#0EA5E9,#38BDF8)", border: "none", borderRadius: 10, color: "#FFF", cursor: "pointer", fontSize: 14, fontWeight: 600, boxShadow: "0 4px 20px rgba(14,165,233,0.3)" }}
          >{I.plus} Add User</button>
        </div>

        {/* Users List */}
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 14, overflow: "hidden" }}>
          {users.map((u, i) => (
            <div key={u.email} style={{
              display: "flex", alignItems: "center", padding: "18px 24px",
              borderBottom: i < users.length - 1 ? "1px solid rgba(148,163,184,0.08)" : "none",
              transition: "background 0.15s",
            }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(56,189,248,0.03)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, fontSize: 16 }}>{u.name}</span>
                  {isAdmin(u.email) && (
                    <span style={{ padding: "2px 8px", borderRadius: 10, background: "rgba(248,113,113,0.15)", border: "1px solid rgba(248,113,113,0.3)", fontSize: 10, fontWeight: 700, color: "#F87171", textTransform: "uppercase", letterSpacing: 0.5 }}>Admin</span>
                  )}
                </div>
                <div style={{ fontSize: 13, color: "#64748B", fontFamily: "'Space Mono',monospace" }}>{u.email}</div>
                <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 4 }}>Password: <span style={{ color: "#64748B" }}>••••••••</span> <span style={{ fontSize: 10, color: "#CBD5E1" }}>(hashed)</span></div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
                  {ALL_PAGES.map(pg => {
                    const hasAccess = isAdmin(u.email) || (u.pageAccess || ALL_PAGES.map(p => p.key)).includes(pg.key);
                    return <span key={pg.key} style={{ padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 600, background: hasAccess ? `${pg.color}15` : "#F1F5F9", color: hasAccess ? pg.color : "#CBD5E1", border: `1px solid ${hasAccess ? pg.color + "30" : "#E2E8F0"}` }}>{pg.label}</span>;
                  })}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setEditUser({ ...u, originalEmail: u.email })} title="Edit"
                  style={{ background: "rgba(14,165,233,0.08)", border: "1px solid rgba(14,165,233,0.2)", borderRadius: 8, padding: "8px 14px", cursor: "pointer", color: "#38BDF8", fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}
                >{I.edit} Edit</button>
                {!isAdmin(u.email) && (
                  <button onClick={() => setDelConfirm(u.email)} title="Delete"
                    style={{ background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.15)", borderRadius: 8, padding: "8px 14px", cursor: "pointer", color: "#F87171", fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}
                  >{I.trash} Remove</button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Telegram Bot Section */}
        <div style={{ marginTop: 32 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>📬 Telegram Notifications</h2>
          <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 14, padding: "24px" }}>
            <p style={{ color: "#64748B", fontSize: 14, marginBottom: 16 }}>
              Notifications are sent to your Telegram group when payments are created, status changes, etc.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button onClick={async () => {
                const res = await telegramTest();
                alert(res.status === "ok" ? "✅ Telegram bot is connected!" : "❌ Telegram not configured: " + (res.error || "Unknown error"));
              }}
                style={{ padding: "10px 20px", background: "linear-gradient(135deg, #0088cc, #00aaff)", border: "none", borderRadius: 8, color: "#FFF", cursor: "pointer", fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}
              >🤖 Test Connection</button>
              <button onClick={async () => {
                const res = await telegramNotify("🔔 Test notification from Blitz CRM — everything is working!");
                alert(res.ok ? "✅ Test message sent!" : "❌ Failed: " + (res.error || "Unknown error"));
              }}
                style={{ padding: "10px 20px", background: "transparent", border: "2px solid #0088cc", borderRadius: 8, color: "#0088cc", cursor: "pointer", fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}
              >📤 Send Test Message</button>
            </div>
          </div>
        </div>

        {/* Wallets Section */}
        <div style={{ marginTop: 32 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>💳 Wallets</h2>
            <button onClick={() => {
              const newW = { id: genId(), date: new Date().toISOString().split("T")[0], trc: "", erc: "", btc: "" };
              setWallets(prev => [newW, ...prev]);
              setEditingWallet(newW.id);
              setWalletForm({ date: newW.date, trc: "", erc: "", btc: "" });
            }}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "linear-gradient(135deg,#0EA5E9,#38BDF8)", border: "none", borderRadius: 8, color: "#FFF", cursor: "pointer", fontSize: 13, fontWeight: 600, boxShadow: "0 2px 10px rgba(14,165,233,0.3)" }}
            >{I.plus} Add Wallet</button>
          </div>
          <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 14, overflow: "hidden" }}>
            {(!wallets || wallets.length === 0) && (
              <div style={{ padding: "30px 16px", textAlign: "center", color: "#94A3B8", fontSize: 14 }}>No wallets added yet.</div>
            )}
            {(wallets || []).map((w, wi) => {
              const isEditing = editingWallet === w.id;
              return (
                <div key={w.id} style={{ padding: "18px 24px", borderBottom: wi < wallets.length - 1 ? "1px solid #F1F5F9" : "none" }}>
                  {isEditing ? (
                    <div>
                      <div style={{ marginBottom: 12 }}>
                        <label style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.5 }}>Date</label>
                        <input type="date" value={walletForm.date} onChange={e => setWalletForm(p => ({ ...p, date: e.target.value }))}
                          style={{ ...inp, marginTop: 4, maxWidth: 200 }} />
                      </div>
                      <div style={{ marginBottom: 10 }}>
                        <label style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.5 }}>TRC</label>
                        <input value={walletForm.trc} onChange={e => setWalletForm(p => ({ ...p, trc: e.target.value }))}
                          style={{ ...inp, marginTop: 4, fontFamily: "'Space Mono',monospace", fontSize: 12 }} placeholder="TRC20 address..." />
                      </div>
                      <div style={{ marginBottom: 10 }}>
                        <label style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.5 }}>ERC USDT/USDC</label>
                        <input value={walletForm.erc} onChange={e => setWalletForm(p => ({ ...p, erc: e.target.value }))}
                          style={{ ...inp, marginTop: 4, fontFamily: "'Space Mono',monospace", fontSize: 12 }} placeholder="ERC20 address..." />
                      </div>
                      <div style={{ marginBottom: 14 }}>
                        <label style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.5 }}>BTC</label>
                        <input value={walletForm.btc} onChange={e => setWalletForm(p => ({ ...p, btc: e.target.value }))}
                          style={{ ...inp, marginTop: 4, fontFamily: "'Space Mono',monospace", fontSize: 12 }} placeholder="BTC address..." />
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => {
                          setWallets(prev => prev.map(ww => ww.id === w.id ? { ...ww, ...walletForm } : ww));
                          setEditingWallet(null);
                        }}
                          style={{ padding: "8px 18px", background: "linear-gradient(135deg,#10B981,#34D399)", border: "none", borderRadius: 8, color: "#FFF", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Save</button>
                        <button onClick={() => setEditingWallet(null)}
                          style={{ padding: "8px 18px", background: "transparent", border: "1px solid #E2E8F0", borderRadius: 8, color: "#64748B", cursor: "pointer", fontSize: 13 }}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: "#0F172A" }}>
                          Wallets ({w.date ? (() => { const d = new Date(w.date + "T00:00:00"); return `${String(d.getDate()).padStart(2,"0")}.${String(d.getMonth()+1).padStart(2,"0")}.${d.getFullYear()}`; })() : "—"})
                        </span>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => { setEditingWallet(w.id); setWalletForm({ date: w.date || "", trc: w.trc || "", erc: w.erc || "", btc: w.btc || "" }); }}
                            style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 6, padding: 5, cursor: "pointer", color: "#2563EB", display: "flex" }}>{I.edit}</button>
                          <button onClick={() => setWallets(prev => prev.filter(ww => ww.id !== w.id))}
                            style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 6, padding: 5, cursor: "pointer", color: "#DC2626", display: "flex" }}>{I.trash}</button>
                        </div>
                      </div>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        <tbody>
                          <tr style={{ borderBottom: "1px solid #F1F5F9" }}>
                            <td style={{ padding: "8px 0", fontWeight: 700, color: "#64748B", width: 120 }}>TRC:</td>
                            <td style={{ padding: "8px 0", fontFamily: "'Space Mono',monospace", fontSize: 12, color: "#0F172A", wordBreak: "break-all" }}>{w.trc || "—"}</td>
                          </tr>
                          <tr style={{ borderBottom: "1px solid #F1F5F9" }}>
                            <td style={{ padding: "8px 0", fontWeight: 700, color: "#64748B" }}>ERC USDT/USDC:</td>
                            <td style={{ padding: "8px 0", fontFamily: "'Space Mono',monospace", fontSize: 12, color: "#0F172A", wordBreak: "break-all" }}>{w.erc || "—"}</td>
                          </tr>
                          <tr>
                            <td style={{ padding: "8px 0", fontWeight: 700, color: "#64748B" }}>BTC:</td>
                            <td style={{ padding: "8px 0", fontFamily: "'Space Mono',monospace", fontSize: 12, color: "#0F172A", wordBreak: "break-all" }}>{w.btc || "—"}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </main>
      {addOpen && (
        <Modal title="Add New User" onClose={() => setAddOpen(false)}>
          <Field label="Name"><input style={inp} value={newUser.name} onChange={e => setNewUser(p => ({ ...p, name: e.target.value }))} placeholder="Display name" /></Field>
          <Field label="Email"><input style={inp} type="email" value={newUser.email} onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))} placeholder="user@email.com" /></Field>
          <Field label="Password"><input style={inp} value={newUser.password} onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))} placeholder="Password" /></Field>
          <Field label="Page Access">
            <PageAccessToggles access={newUser.pageAccess} onChange={pa => setNewUser(p => ({ ...p, pageAccess: pa }))} />
          </Field>
          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8 }}>
            <button onClick={() => setAddOpen(false)} style={{ padding: "10px 20px", borderRadius: 8, background: "transparent", border: "1px solid #E2E8F0", color: "#64748B", cursor: "pointer", fontSize: 14 }}>Cancel</button>
            <button onClick={handleAddUser} style={{ padding: "10px 24px", borderRadius: 8, background: "linear-gradient(135deg,#0EA5E9,#38BDF8)", border: "none", color: "#FFF", cursor: "pointer", fontSize: 14, fontWeight: 600, boxShadow: "0 4px 15px rgba(14,165,233,0.3)" }}>Add User</button>
          </div>
        </Modal>
      )}

      {/* Edit User Modal */}
      {editUser && (
        <Modal title="Edit User" onClose={() => setEditUser(null)}>
          <Field label="Name"><input style={inp} value={editUser.name} onChange={e => setEditUser(p => ({ ...p, name: e.target.value }))} /></Field>
          <Field label="Email"><input style={inp} type="email" value={editUser.email} onChange={e => setEditUser(p => ({ ...p, email: e.target.value }))} /></Field>
          <Field label="New Password"><input style={inp} value={editUser.password || ""} onChange={e => setEditUser(p => ({ ...p, password: e.target.value }))} placeholder="Leave blank to keep current" /></Field>
          {!isAdmin(editUser.email) && (
            <Field label="Page Access">
              <PageAccessToggles access={editUser.pageAccess || ALL_PAGES.map(p => p.key)} onChange={pa => setEditUser(p => ({ ...p, pageAccess: pa }))} />
            </Field>
          )}
          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8 }}>
            <button onClick={() => setEditUser(null)} style={{ padding: "10px 20px", borderRadius: 8, background: "transparent", border: "1px solid #E2E8F0", color: "#64748B", cursor: "pointer", fontSize: 14 }}>Cancel</button>
            <button onClick={handleUpdateUser} style={{ padding: "10px 24px", borderRadius: 8, background: "linear-gradient(135deg,#0EA5E9,#38BDF8)", border: "none", color: "#FFF", cursor: "pointer", fontSize: 14, fontWeight: 600, boxShadow: "0 4px 15px rgba(14,165,233,0.3)" }}>Save Changes</button>
          </div>
        </Modal>
      )}

      {/* Delete Confirm */}
      {delConfirm && (
        <Modal title="Remove User" onClose={() => setDelConfirm(null)}>
          <p style={{ color: "#475569", marginBottom: 24, fontSize: 15 }}>Are you sure you want to remove this user? They will no longer be able to log in.</p>
          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
            <button onClick={() => setDelConfirm(null)} style={{ padding: "10px 20px", borderRadius: 8, background: "transparent", border: "1px solid #E2E8F0", color: "#64748B", cursor: "pointer", fontSize: 14 }}>Cancel</button>
            <button onClick={() => handleDeleteUser(delConfirm)} style={{ padding: "10px 24px", borderRadius: 8, background: "linear-gradient(135deg,#EF4444,#F87171)", border: "none", color: "#FFF", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>Remove</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ── Dashboard ── */
function Dashboard({ user, onLogout, onAdmin, onNav, payments, setPayments, onRefresh, userAccess }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editPay, setEditPay] = useState(null);
  const [delConfirm, setDelConfirm] = useState(null);
  const [paySort, setPaySort] = useState("manual");
  const availStatuses = getAvailableStatuses(user.email);

  const handlePayMove = (id, direction) => {
    setPayments(prev => {
      const arr = [...prev];
      const idx = arr.findIndex(p => p.id === id);
      if (idx < 0) return prev;
      if (direction === "up" && idx > 0) [arr[idx], arr[idx - 1]] = [arr[idx - 1], arr[idx]];
      if (direction === "down" && idx < arr.length - 1) [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
      return arr;
    });
  };

  const handlePaySortAlpha = () => {
    if (paySort === "alpha") { setPaySort("manual"); return; }
    setPaySort("alpha");
    setPayments(prev => [...prev].sort((a, b) => (a.invoice || "").localeCompare(b.invoice || "", undefined, { numeric: true })));
  };

  const handleStatusChange = (id, newStatus) => {
    setPayments(prev => prev.map(p => {
      if (p.id !== id) return p;
      const updated = { ...p, status: newStatus };
      if (newStatus === "Paid") {
        updated.month = month;
        updated.year = year;
        if (!updated.paidDate) updated.paidDate = new Date().toISOString().split("T")[0];
        telegramNotify(`💰 Payment #${p.invoice} marked as PAID — ${parseFloat(p.amount).toLocaleString()}$ by ${user.name}`);
      } else {
        telegramNotify(`🔄 Payment #${p.invoice} status → ${newStatus} by ${user.name}`);
      }
      return updated;
    }));
  };

  const matchSearch = p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return [p.invoice, p.openBy, p.status, p.trcAddress, p.ercAddress, p.instructions, p.paymentHash].some(v => (v || "").toLowerCase().includes(q));
  };

  // Open payments: any payment NOT "Paid"
  const openPayments = payments.filter(p => OPEN_STATUSES.includes(p.status) && matchSearch(p));
  // Paid payments: filtered by selected month
  const paidPayments = payments.filter(p => p.status === "Paid" && p.month === month && p.year === year && matchSearch(p));

  const openTotal = openPayments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  const paidTotal = paidPayments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const handleSave = form => {
    if (editPay) {
      const updated = { ...editPay, ...form };
      if (form.status === "Paid" && editPay.status !== "Paid") {
        updated.month = month;
        updated.year = year;
        if (!updated.paidDate) {
          updated.paidDate = new Date().toISOString().split("T")[0];
        }
        telegramNotify(`💰 Payment #${updated.invoice} marked as PAID — ${parseFloat(updated.amount).toLocaleString()}$ by ${user.name}`);
      } else if (!editPay) {
        telegramNotify(`📝 Payment #${form.invoice} updated by ${user.name}`);
      }
      setPayments(prev => prev.map(p => p.id === editPay.id ? updated : p));
    } else {
      setPayments(prev => [...prev, { ...form, id: genId(), month, year }]);
      telegramNotify(`🆕 New payment #${form.invoice} — ${parseFloat(form.amount).toLocaleString()}$ opened by ${user.name}`);
    }
    setModalOpen(false);
    setEditPay(null);
  };

  const handleDelete = id => { setPayments(prev => prev.filter(p => p.id !== id)); setDelConfirm(null); };

  return (
    <div style={{ minHeight: "100vh", background: "#F1F5F9", fontFamily: "'DM Sans','Segoe UI',sans-serif", color: "#0F172A" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />
      <BlitzHeader user={user} activePage="dashboard" userAccess={userAccess} onNav={onNav} onAdmin={() => onNav("admin")} onRefresh={onRefresh} onLogout={onLogout} accentColor="#0EA5E9" />

      <main className="blitz-main" style={{ maxWidth: 1240, margin: "0 auto", padding: "28px 32px" }}>
        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={prevMonth} style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 10, padding: 8, cursor: "pointer", color: "#64748B", display: "flex" }}>{I.chevL}</button>
            <div style={{ minWidth: 200, textAlign: "center" }}>
              <span style={{ fontSize: 22, fontWeight: 700 }}>{MONTHS[month]}</span>
              <span style={{ fontSize: 22, fontWeight: 300, color: "#64748B", marginLeft: 10 }}>{year}</span>
            </div>
            <button onClick={nextMonth} style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 10, padding: 8, cursor: "pointer", color: "#64748B", display: "flex" }}>{I.chevR}</button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, maxWidth: 500, marginLeft: 24 }}>
            <div style={{ position: "relative", flex: 1 }}>
              <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94A3B8" }}>{I.search}</div>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search payments..."
                style={{ ...inp, paddingLeft: 40, background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 10, fontSize: 14 }} />
            </div>
            <button onClick={() => { setEditPay(null); setModalOpen(true); }}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", background: "linear-gradient(135deg,#0EA5E9,#38BDF8)", border: "none", borderRadius: 10, color: "#FFF", cursor: "pointer", fontSize: 14, fontWeight: 600, boxShadow: "0 4px 20px rgba(14,165,233,0.3)", whiteSpace: "nowrap" }}
            >{I.plus} New Payment</button>
            <button onClick={handlePaySortAlpha}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", background: paySort === "alpha" ? "#0EA5E9" : "transparent", border: `2px solid ${paySort === "alpha" ? "#0EA5E9" : "#94A3B8"}`, borderRadius: 10, color: paySort === "alpha" ? "#FFF" : "#64748B", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
            >{paySort === "alpha" ? "✓ A→Z" : "A→Z"}</button>
          </div>
        </div>

        {/* Summary Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 16, marginBottom: 28 }}>
          {[
            { label: "Open Payments", value: openPayments.length, accent: "#F59E0B", bg: "#FFFBEB", isMoney: false },
            { label: "Open Total", value: openTotal, accent: "#F59E0B", bg: "#FFFBEB", isMoney: true },
            { label: "Paid This Month", value: paidPayments.length, accent: "#10B981", bg: "#ECFDF5", isMoney: false },
            { label: "Paid Total", value: paidTotal, accent: "#10B981", bg: "#ECFDF5", isMoney: true },
          ].map((c, i) => (
            <div key={i} style={{ background: c.bg, border: "1px solid #E2E8F0", borderRadius: 14, padding: "20px 22px", position: "relative", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: c.accent }} />
              <div style={{ fontSize: 11, color: "#64748B", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>{c.label}</div>
              <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "'Space Mono',monospace", color: c.accent }}>
                {c.isMoney ? c.value.toLocaleString("en-US") + "$" : c.value}
              </div>
            </div>
          ))}
        </div>

        {/* Open Payments Group */}
        <GroupHeader icon={I.openBox} title="Open Payments" count={openPayments.length} total={openTotal} accentColor="#F59E0B" defaultOpen={true}>
          <PaymentTable payments={openPayments} onEdit={p => { setEditPay(p); setModalOpen(true); }} onDelete={id => setDelConfirm(id)} onStatusChange={handleStatusChange} statusOptions={availStatuses} emptyMsg="No open payments — all caught up!" sortMode={paySort} onMove={handlePayMove} />
        </GroupHeader>

        {/* Paid This Month Group */}
        <GroupHeader icon={I.calendar} title={`${MONTHS[month].toUpperCase()} ${year}`} count={paidPayments.length} total={paidTotal} accentColor="#EC4899" defaultOpen={true}>
          <PaymentTable payments={paidPayments} onEdit={p => { setEditPay(p); setModalOpen(true); }} onDelete={id => setDelConfirm(id)} emptyMsg={`No paid payments for ${MONTHS[month]} ${year}`} sortMode={paySort} onMove={handlePayMove} />
        </GroupHeader>
      </main>

      {/* Modals */}
      {modalOpen && (
        <Modal title={editPay ? "Edit Payment" : "New Payment"} onClose={() => { setModalOpen(false); setEditPay(null); }}>
          <PaymentForm payment={editPay} onSave={handleSave} onClose={() => { setModalOpen(false); setEditPay(null); }} userEmail={user.email} userName={user.name} />
        </Modal>
      )}
      {delConfirm && (
        <Modal title="Delete Payment" onClose={() => setDelConfirm(null)}>
          <p style={{ color: "#475569", marginBottom: 24, fontSize: 15 }}>Are you sure? This can't be undone.</p>
          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
            <button onClick={() => setDelConfirm(null)} style={{ padding: "10px 20px", borderRadius: 8, background: "transparent", border: "1px solid #E2E8F0", color: "#64748B", cursor: "pointer", fontSize: 14 }}>Cancel</button>
            <button onClick={() => handleDelete(delConfirm)} style={{ padding: "10px 24px", borderRadius: 8, background: "linear-gradient(135deg,#EF4444,#F87171)", border: "none", color: "#FFF", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>Delete</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ── Login ── */
function LoginScreen({ onLogin, users }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [blocked, setBlocked] = useState(0); // minutes remaining

  const submit = async (e) => {
    e.preventDefault();
    if (blocked > 0) { setError(`IP blocked. Try again in ${blocked} minute${blocked > 1 ? 's' : ''}.`); return; }
    setLoading(true); setError("");

    const hashed = hashPassword(password);

    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase().trim(), passwordHash: hashed }),
      });
      const data = await res.json();

      if (res.ok && data.ok) {
        onLogin(data.user);
      } else if (res.status === 429 && data.error === "blocked") {
        setBlocked(data.minutes || 15);
        setError(`Too many failed attempts. Your IP is blocked for ${data.minutes || 15} minutes.`);
        // Countdown timer
        const iv = setInterval(() => {
          setBlocked(prev => { if (prev <= 1) { clearInterval(iv); return 0; } return prev - 1; });
        }, 60000);
      } else if (data.remaining !== undefined) {
        setError(`Invalid email or password. ${data.remaining} attempt${data.remaining > 1 ? 's' : ''} remaining before IP block.`);
      } else {
        setError("Invalid email or password.");
      }
    } catch {
      // Server offline — fallback to local validation
      const u = users.find(u => u.email === email.toLowerCase().trim() && u.passwordHash === hashed);
      if (u) onLogin(u); else setError("Invalid email or password.");
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans','Segoe UI',sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />
      <div style={{ width: 420, maxWidth: "92vw", background: "#FFFFFF", borderRadius: 20, border: "1px solid #E2E8F0", padding: "48px 40px", boxShadow: "0 25px 60px rgba(0,0,0,0.08)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          {I.logo}
          <span style={{ fontFamily: "'Space Mono',monospace", fontWeight: 700, fontSize: 22, color: "#0F172A" }}>Blitz CRM</span>
          <span style={{ fontSize: 11, color: "#64748B", fontFamily: "'Space Mono',monospace", background: "#E2E8F0", padding: "2px 8px", borderRadius: 6 }}>v{VERSION}</span>
        </div>
        <p style={{ color: "#64748B", fontSize: 14, marginBottom: 36, marginTop: 4 }}>CRM Dashboard</p>
        <form onSubmit={submit} method="post" autoComplete="on">
          <label htmlFor="login-email" style={{ display: "block", color: "#64748B", fontSize: 12, fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>Email</label>
          <input id="login-email" name="email" type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com"
            style={{ ...inp, marginBottom: 20 }}
            onFocus={e => e.target.style.borderColor = "#38BDF8"}
            onBlur={e => e.target.style.borderColor = "#E2E8F0"} />
          <label htmlFor="login-password" style={{ display: "block", color: "#64748B", fontSize: 12, fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>Password</label>
          <input id="login-password" name="password" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
            style={{ ...inp, marginBottom: 28 }}
            onFocus={e => e.target.style.borderColor = "#38BDF8"}
            onBlur={e => e.target.style.borderColor = "#E2E8F0"} />
          {error && <div style={{ color: "#F87171", fontSize: 13, marginBottom: 16, padding: "8px 12px", background: "rgba(220,38,38,0.06)", borderRadius: 8 }}>{error}</div>}
          <button type="submit" disabled={loading} style={{ width: "100%", padding: 13, background: loading ? "#1E3A5F" : "linear-gradient(135deg,#0EA5E9,#38BDF8)", color: "#FFF", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: loading ? "wait" : "pointer", boxShadow: "0 4px 20px rgba(14,165,233,0.3)" }}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ── Customer Payments Page ── */
const CP_STATUS_OPTIONS = ["Open", "Pending", "Received", "Refund"];
const CP_STATUS_COLORS = {
  Open: { background: "#FEF3C7", color: "#92400E" },
  Pending: { background: "#818CF8", color: "#FFF" },
  Received: { background: "#10B981", color: "#FFF" },
  Refund: { background: "#EF4444", color: "#FFF" },
};

const CP_TYPE_OPTIONS = ["Brand Payment", "Affiliate Refund"];

const CP_INITIAL = [
  { id: genId(), invoice: "Swin", paidDate: "2026-02-02", status: "Received", amount: "21436", openBy: "Rose", instructions: "", month: 1, year: 2026 },
  { id: genId(), invoice: "12Mark", paidDate: "2026-02-02", status: "Received", amount: "8120", openBy: "Rose", instructions: "", month: 1, year: 2026 },
  { id: genId(), invoice: "Tdex", paidDate: "2026-02-02", status: "Received", amount: "5150", openBy: "Rose", instructions: "", month: 1, year: 2026 },
  { id: genId(), invoice: "Miltonia", paidDate: "2026-02-02", status: "Received", amount: "3537", openBy: "Rose", instructions: "", month: 1, year: 2026 },
  { id: genId(), invoice: "No limit", paidDate: "2026-02-03", status: "Received", amount: "23514", openBy: "Rose", instructions: "", month: 1, year: 2026 },
  { id: genId(), invoice: "GLB", paidDate: "2026-02-03", status: "Received", amount: "500", openBy: "Rose", instructions: "", month: 1, year: 2026 },
  { id: genId(), invoice: "Legion", paidDate: "2026-02-03", status: "Received", amount: "1760", openBy: "Rose", instructions: "", month: 1, year: 2026 },
  { id: genId(), invoice: "EMP313", paidDate: "2026-02-03", status: "Received", amount: "2500", openBy: "Rose", instructions: "", month: 1, year: 2026 },
  { id: genId(), invoice: "Bettebrandz", paidDate: "2026-02-03", status: "Received", amount: "272", openBy: "Rose", instructions: "", month: 1, year: 2026 },
  { id: genId(), invoice: "Bettebrandz", paidDate: "2026-02-03", status: "Received", amount: "2200", openBy: "Rose", instructions: "", month: 1, year: 2026 },
  { id: genId(), invoice: "Capitan", paidDate: "2026-02-04", status: "Received", amount: "25023", openBy: "Rose", instructions: "", month: 1, year: 2026 },
  { id: genId(), invoice: "Z", paidDate: "2026-02-04", status: "Received", amount: "1290", openBy: "Rose", instructions: "", month: 1, year: 2026 },
  { id: genId(), invoice: "Captain", paidDate: "2026-02-04", status: "Received", amount: "6806", openBy: "Rose", instructions: "", month: 1, year: 2026 },
  { id: genId(), invoice: "Glb", paidDate: "2026-02-04", status: "Received", amount: "2467", openBy: "Rose", instructions: "", month: 1, year: 2026 },
  { id: genId(), invoice: "Imperius", paidDate: "2026-02-04", status: "Received", amount: "1200", openBy: "Rose", instructions: "", month: 1, year: 2026 },
  { id: genId(), invoice: "Legion", paidDate: "2026-02-04", status: "Received", amount: "1465", openBy: "Rose", instructions: "", month: 1, year: 2026 },
  { id: genId(), invoice: "Legion", paidDate: "2026-02-04", status: "Received", amount: "690", openBy: "Rose", instructions: "", month: 1, year: 2026 },
  { id: genId(), invoice: "EMP", paidDate: "2026-02-04", status: "Received", amount: "3700", openBy: "Rose", instructions: "", month: 1, year: 2026 },
  { id: genId(), invoice: "Clickbait", paidDate: "2026-02-04", status: "Received", amount: "1500", openBy: "Rose", instructions: "", month: 1, year: 2026 },
  { id: genId(), invoice: "212", paidDate: "2026-02-05", status: "Refund", amount: "-650", openBy: "Rose", instructions: "", month: 1, year: 2026 },
  { id: genId(), invoice: "TRADETRADITION", paidDate: "2026-02-05", status: "Refund", amount: "-1322", openBy: "Rose", instructions: "", month: 1, year: 2026 },
  { id: genId(), invoice: "WhiteRhino", paidDate: "2026-02-05", status: "Received", amount: "2030", openBy: "Rose", instructions: "", month: 1, year: 2026 },
  { id: genId(), invoice: "GLB", paidDate: "2026-02-05", status: "Received", amount: "2102", openBy: "Rose", instructions: "", month: 1, year: 2026 },
  { id: genId(), invoice: "Medianova", paidDate: "2026-02-06", status: "Received", amount: "5300", openBy: "Rose", instructions: "", month: 1, year: 2026 },
  { id: genId(), invoice: "Media now", paidDate: "2026-02-06", status: "Received", amount: "1600", openBy: "Rose", instructions: "", month: 1, year: 2026 },
  { id: genId(), invoice: "Unit", paidDate: "2026-02-06", status: "Received", amount: "2400", openBy: "Rose", instructions: "", month: 1, year: 2026 },
  { id: genId(), invoice: "12Mark", paidDate: "2026-02-06", status: "Received", amount: "10150", openBy: "Rose", instructions: "", month: 1, year: 2026 },
  { id: genId(), invoice: "Ucases Tdex", paidDate: "2026-02-09", status: "Received", amount: "10000", openBy: "Rose", instructions: "", month: 1, year: 2026 },
  { id: genId(), invoice: "Tdex FR", paidDate: "2026-02-09", status: "Received", amount: "2935", openBy: "Rose", instructions: "", month: 1, year: 2026 },
  { id: genId(), invoice: "fintrix", paidDate: "2026-02-09", status: "Received", amount: "3000", openBy: "Rose", instructions: "", month: 1, year: 2026 },
  { id: genId(), invoice: "Swin", paidDate: "2026-02-10", status: "Received", amount: "6845", openBy: "Rose", instructions: "", month: 1, year: 2026 },
  { id: genId(), invoice: "madnet", paidDate: "2026-02-10", status: "Received", amount: "367", openBy: "Rose", instructions: "", month: 1, year: 2026 },
  { id: genId(), invoice: "Capitan", paidDate: "2026-02-10", status: "Received", amount: "33505", openBy: "Rose", instructions: "", month: 1, year: 2026 },
  { id: genId(), invoice: "capitan", paidDate: "2026-02-10", status: "Received", amount: "342", openBy: "Rose", instructions: "", month: 1, year: 2026 },
  { id: genId(), invoice: "swin", paidDate: "2026-02-10", status: "Received", amount: "11731", openBy: "Rose", instructions: "", month: 1, year: 2026 },
  { id: genId(), invoice: "Avelux", paidDate: "2026-02-10", status: "Received", amount: "3000", openBy: "Rose", instructions: "", month: 1, year: 2026 },
  { id: genId(), invoice: "celestia", paidDate: "2026-02-10", status: "Received", amount: "1863", openBy: "Rose", instructions: "", month: 1, year: 2026 },
  { id: genId(), invoice: "Z", paidDate: "2026-02-11", status: "Received", amount: "2700", openBy: "Rose", instructions: "", month: 1, year: 2026 },
  { id: genId(), invoice: "Glb", paidDate: "2026-02-11", status: "Received", amount: "527", openBy: "Rose", instructions: "", month: 1, year: 2026 },
  { id: genId(), invoice: "12Mark", paidDate: "2026-02-11", status: "Received", amount: "10150", openBy: "Rose", instructions: "", month: 1, year: 2026 },
];

function CPForm({ payment, onSave, onClose, userName }) {
  const [f, setF] = useState(payment || { invoice: "", paidDate: "", status: "Open", amount: "", fee: "", openBy: userName || "", type: "Brand Payment", trcAddress: "", ercAddress: "", paymentHash: "" });
  const [error, setError] = useState("");
  const s = (k, v) => { setF(p => ({ ...p, [k]: v })); setError(""); };

  const handleSave = () => {
    if (!f.invoice.trim()) { setError("Invoice name is required"); return; }
    if (!f.amount || parseFloat(f.amount) <= 0) { setError("Amount is required"); return; }
    onSave(f);
  };

  return (
    <>
      <div className="blitz-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
        <Field label="Invoice (Name)"><input style={inp} value={f.invoice} onChange={e => s("invoice", e.target.value)} placeholder="e.g. Swin, 12Mark" /></Field>
        <Field label="Invoice Amount ($)"><input style={inp} type="number" value={f.amount} onChange={e => s("amount", e.target.value)} placeholder="0.00" /></Field>
        <Field label="Fee (number or %)">
          <input style={inp} value={f.fee || ""} onChange={e => s("fee", e.target.value)} placeholder="e.g. 2% or 50" />
          {f.fee && f.amount && <div style={{ fontSize: 11, color: "#0EA5E9", marginTop: 4 }}>Fee: {fmtFee(f.fee, f.amount)}</div>}
        </Field>
        <Field label="Status">
          <select style={{ ...inp, cursor: "pointer" }} value={f.status} onChange={e => {
            const ns = e.target.value;
            setF(prev => ({ ...prev, status: ns, paidDate: ns === "Received" ? new Date().toISOString().split("T")[0] : "" }));
            setError("");
          }}>
            {CP_STATUS_OPTIONS.map(st => <option key={st} value={st}>{st}</option>)}
          </select>
        </Field>
        <Field label="Type">
          <select style={{ ...inp, cursor: "pointer" }} value={f.type || "Brand Payment"} onChange={e => s("type", e.target.value)}>
            {CP_TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Paid Date">
          <div style={{ ...inp, background: "#E2E8F0", color: f.paidDate ? "#1E293B" : "#94A3B8", cursor: "default", display: "flex", alignItems: "center" }}>
            {f.paidDate ? new Date(f.paidDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Auto-set when Received"}
          </div>
        </Field>
        <Field label="Open By"><NameCombo value={f.openBy} onChange={v => s("openBy", v)} /></Field>
      </div>
      <div className="blitz-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
        <Field label="TRC Address"><input style={inp} value={f.trcAddress || ""} onChange={e => s("trcAddress", e.target.value)} placeholder="e.g. TYUWBpmzSqCcz9r5rRVG..." /></Field>
        <Field label="ERC Address"><input style={inp} value={f.ercAddress || ""} onChange={e => s("ercAddress", e.target.value)} placeholder="e.g. 0x5066d63E126Cb3F893..." /></Field>
        <Field label="Payment Hash"><input style={inp} value={f.paymentHash || ""} onChange={e => s("paymentHash", e.target.value)} placeholder="Transaction hash..." /></Field>
      </div>
      {error && <div style={{ color: "#DC2626", fontSize: 13, padding: "8px 12px", background: "rgba(220,38,38,0.08)", borderRadius: 8, marginBottom: 8, border: "1px solid rgba(220,38,38,0.2)" }}>{error}</div>}
      <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8 }}>
        <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 8, background: "transparent", border: "1px solid #E2E8F0", color: "#64748B", cursor: "pointer", fontSize: 14, fontWeight: 500 }}>Cancel</button>
        <button onClick={handleSave} style={{ padding: "10px 24px", borderRadius: 8, background: "linear-gradient(135deg,#0EA5E9,#38BDF8)", border: "none", color: "#FFF", cursor: "pointer", fontSize: 14, fontWeight: 600, boxShadow: "0 4px 15px rgba(14,165,233,0.3)" }}>{payment ? "Save Changes" : "Add Payment"}</button>
      </div>
    </>
  );
}

function CPTable({ payments, onEdit, onDelete, onStatusChange, statusOptions, emptyMsg, sortMode, onMove }) {
  const fmt = a => { const n = parseFloat(a) || 0; return n.toLocaleString("en-US") + "$"; };
  const sorted = sortMode === "alpha"
    ? [...payments].sort((a, b) => (a.invoice || "").localeCompare(b.invoice || "", undefined, { numeric: true }))
    : [...payments].sort((a, b) => (a.paidDate || "").localeCompare(b.paidDate || ""));
  const total = payments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  const dates = payments.filter(p => p.paidDate).map(p => new Date(p.paidDate)).sort((a, b) => a - b);
  const fmtShort = d => { const m = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]; return `${m[d.getMonth()]} ${d.getDate()}`; };
  const dateRange = dates.length > 0 ? (dates.length === 1 ? fmtShort(dates[0]) : `${fmtShort(dates[0])} - ${fmtShort(dates[dates.length - 1])}`) : "";

  const openByColors = ["#FF6B9D", "#00BCD4", "#FF9800", "#9C27B0", "#4CAF50", "#E91E63"];
  const getColor = name => { let h = 0; for (let i = 0; i < (name||"").length; i++) h = name.charCodeAt(i) + ((h << 5) - h); return openByColors[Math.abs(h) % openByColors.length]; };

  if (payments.length === 0) return <div style={{ padding: "40px 16px", textAlign: "center", color: "#94A3B8", fontSize: 14 }}>{emptyMsg}</div>;

  const mobile = useMobile();

  if (mobile) {
    return (
      <div>
        {sorted.map(p => (
          <div key={p.id} style={{ background: "#FFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: "14px 16px", marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span onClick={() => onEdit(p)} style={{ fontFamily: "'Space Mono',monospace", fontSize: 18, fontWeight: 800, color: "#0EA5E9", cursor: "pointer" }}>#{p.invoice}</span>
                <span style={{ padding: "3px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700, ...(CP_STATUS_COLORS[p.status] || { background: "#F1F5F9", color: "#475569" }) }}>{p.status}</span>
              </div>
              <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 18, fontWeight: 800, color: "#0F172A" }}>{fmt(p.amount)}</span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 12px", fontSize: 12, color: "#64748B", marginBottom: 8 }}>
              {p.paidDate && <span>📅 {new Date(p.paidDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>}
              <span style={{ padding: "2px 8px", borderRadius: 4, background: (p.type || "Brand Payment") === "Affiliate Refund" ? "#FEE2E2" : "#EFF6FF", color: (p.type || "Brand Payment") === "Affiliate Refund" ? "#DC2626" : "#2563EB", fontSize: 10, fontWeight: 600 }}>{p.type || "Brand Payment"}</span>
              {p.fee && <span>Fee: {fmtFee(p.fee, p.amount)}</span>}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ padding: "3px 10px", borderRadius: 4, background: getPersonColor(p.openBy), color: "#FFF", fontWeight: 700, fontSize: 12 }}>{p.openBy}</span>
              <div style={{ display: "flex", gap: 6 }}>
                {!["Received", "Refund"].includes(p.status) && statusOptions && onStatusChange && (
                  <select value={p.status} onChange={e => onStatusChange(p.id, e.target.value)}
                    style={{ padding: "4px 6px", borderRadius: 4, fontSize: 11, fontWeight: 700, border: "1px solid #E2E8F0", ...(CP_STATUS_COLORS[p.status] || {}) }}>
                    {statusOptions.map(st => <option key={st} value={st}>{st}</option>)}
                  </select>
                )}
                <button onClick={() => onEdit(p)} style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 6, padding: 5, cursor: "pointer", color: "#2563EB", display: "flex" }}>{I.edit}</button>
                <button onClick={() => onDelete(p.id)} style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 6, padding: 5, cursor: "pointer", color: "#DC2626", display: "flex" }}>{I.trash}</button>
              </div>
            </div>
            {(p.trcAddress || p.ercAddress || p.paymentHash) && (
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #F1F5F9", fontSize: 10, fontFamily: "'Space Mono',monospace", color: "#94A3B8", display: "flex", flexDirection: "column", gap: 2 }}>
                {p.trcAddress && <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>TRC: {p.trcAddress}</div>}
                {p.ercAddress && <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>ERC: {p.ercAddress}</div>}
                {p.paymentHash && <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Hash: {p.paymentHash}</div>}
              </div>
            )}
          </div>
        ))}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, padding: "12px", flexWrap: "wrap" }}>
          {dateRange && <span style={{ padding: "5px 14px", borderRadius: 20, background: "#F472B6", color: "#FFF", fontWeight: 700, fontSize: 12 }}>{dateRange}</span>}
          <span style={{ padding: "5px 14px", borderRadius: 20, background: "#10B981", color: "#FFF", fontWeight: 700, fontSize: 12 }}>{payments.length} invoices</span>
          <span style={{ fontFamily: "'Space Mono',monospace", fontWeight: 800, fontSize: 15, color: "#0F172A" }}>{total.toLocaleString("en-US")}$</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, tableLayout: "fixed" }}>
        <colgroup>
          <col style={{ width: "6%" }} />
          <col style={{ width: "7%" }} />
          <col style={{ width: "9%" }} />
          <col style={{ width: "10%" }} />
          <col style={{ width: "8%" }} />
          <col style={{ width: "6%" }} />
          <col style={{ width: "8%" }} />
          <col style={{ width: "14%" }} />
          <col style={{ width: "14%" }} />
          <col style={{ width: "10%" }} />
          <col style={{ width: "8%" }} />
        </colgroup>
        <thead>
          <tr style={{ background: "#F8FAFC" }}>
            {["Invoice","Date","Type","Status","Amount","Fee","Open By","TRC Address","ERC Address","Hash","Actions"].map(h =>
              <th key={h} style={{ padding: "8px 6px", textAlign: "left", color: "#64748B", fontSize: 10, fontWeight: 700, borderBottom: "2px solid #E2E8F0", borderRight: "1px solid #F1F5F9", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{h}</th>
            )}
          </tr>
        </thead>
        <tbody>
          {sorted.map((p, i) => (
            <tr key={p.id} style={{ borderBottom: "1px solid #F1F5F9", transition: "background 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <td style={{ padding: "7px 6px", fontWeight: 700, fontSize: 13, borderRight: "1px solid #F1F5F9" }}>
                <span onClick={() => onEdit(p)} style={{ cursor: "pointer", color: "#0EA5E9", textDecoration: "underline", textDecorationColor: "rgba(14,165,233,0.3)", textUnderlineOffset: 3 }}
                  onMouseEnter={e => e.currentTarget.style.textDecorationColor = "#0EA5E9"}
                  onMouseLeave={e => e.currentTarget.style.textDecorationColor = "rgba(14,165,233,0.3)"}
                >{p.invoice}</span>
              </td>
              <td style={{ padding: "7px 6px", color: p.paidDate ? "#334155" : "#CBD5E1", fontSize: 11, borderRight: "1px solid #F1F5F9", whiteSpace: "nowrap" }}>{p.paidDate ? new Date(p.paidDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}</td>
              <td style={{ padding: "7px 6px", borderRight: "1px solid #F1F5F9" }}>
                <span style={{ padding: "2px 6px", borderRadius: 4, background: (p.type || "Brand Payment") === "Affiliate Refund" ? "#FEE2E2" : "#EFF6FF", color: (p.type || "Brand Payment") === "Affiliate Refund" ? "#DC2626" : "#2563EB", fontSize: 10, fontWeight: 600, whiteSpace: "nowrap" }}>{p.type || "Brand Payment"}</span>
              </td>
              <td style={{ padding: "7px 6px", borderRight: "1px solid #F1F5F9" }}>
                {!["Received", "Refund"].includes(p.status) && statusOptions && onStatusChange ? (
                  <select value={p.status} onChange={e => onStatusChange(p.id, e.target.value)}
                    style={{ padding: "3px 4px", borderRadius: 4, fontSize: 11, fontWeight: 700, border: "1px solid #E2E8F0", cursor: "pointer", ...(CP_STATUS_COLORS[p.status] || {}), appearance: "auto", outline: "none", maxWidth: "100%" }}>
                    {statusOptions.map(st => <option key={st} value={st}>{st}</option>)}
                  </select>
                ) : (
                  <span style={{ display: "inline-block", padding: "3px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700, ...(CP_STATUS_COLORS[p.status] || { background: "#F1F5F9", color: "#475569" }) }}>{p.status}</span>
                )}
              </td>
              <td style={{ padding: "7px 6px", fontWeight: 800, fontFamily: "'Space Mono',monospace", fontSize: 13, color: "#0F172A", borderRight: "1px solid #F1F5F9", whiteSpace: "nowrap" }}>{fmt(p.amount)}</td>
              <td style={{ padding: "7px 6px", fontSize: 10, color: p.fee ? "#0EA5E9" : "#CBD5E1", borderRight: "1px solid #F1F5F9", fontFamily: "'Space Mono',monospace" }}>{fmtFee(p.fee, p.amount)}</td>
              <td style={{ padding: "7px 6px", borderRight: "1px solid #F1F5F9" }}>
                <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 4, background: getPersonColor(p.openBy), color: "#FFF", fontWeight: 700, fontSize: 11 }}>{p.openBy}</span>
              </td>
              <td style={{ padding: "7px 6px", fontFamily: "'Space Mono',monospace", fontSize: 9, color: "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", borderRight: "1px solid #F1F5F9" }}>{p.trcAddress || p.instructions || "—"}</td>
              <td style={{ padding: "7px 6px", fontFamily: "'Space Mono',monospace", fontSize: 9, color: "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", borderRight: "1px solid #F1F5F9" }}>{p.ercAddress || "—"}</td>
              <td style={{ padding: "7px 6px", fontFamily: "'Space Mono',monospace", fontSize: 9, color: "#94A3B8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", borderRight: "1px solid #F1F5F9" }}>{p.paymentHash || "—"}</td>
              <td style={{ padding: "4px 4px" }}>
                <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
                  {onMove && sortMode !== "alpha" && <>
                    <button onClick={() => onMove(p.id, "up")} title="Move up" disabled={i === 0}
                      style={{ background: "none", border: "1px solid #E2E8F0", borderRadius: 3, padding: "1px 3px", cursor: i === 0 ? "default" : "pointer", color: i === 0 ? "#E2E8F0" : "#64748B", display: "flex", fontSize: 10 }}>▲</button>
                    <button onClick={() => onMove(p.id, "down")} title="Move down" disabled={i === sorted.length - 1}
                      style={{ background: "none", border: "1px solid #E2E8F0", borderRadius: 3, padding: "1px 3px", cursor: i === sorted.length - 1 ? "default" : "pointer", color: i === sorted.length - 1 ? "#E2E8F0" : "#64748B", display: "flex", fontSize: 10 }}>▼</button>
                  </>}
                  <button onClick={() => onEdit(p)} title="Edit" style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 5, padding: 4, cursor: "pointer", color: "#2563EB", display: "flex" }}>{I.edit}</button>
                  <button onClick={() => onDelete(p.id)} title="Delete" style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 5, padding: 4, cursor: "pointer", color: "#DC2626", display: "flex" }}>{I.trash}</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 24, padding: "12px 20px", background: "#F8FAFC", borderTop: "2px solid #E2E8F0", flexWrap: "wrap" }}>
        {dateRange && <span style={{ padding: "5px 16px", borderRadius: 20, background: "#F472B6", color: "#FFF", fontWeight: 700, fontSize: 13 }}>{dateRange}</span>}
        <span style={{ padding: "5px 16px", borderRadius: 20, background: "#10B981", color: "#FFF", fontWeight: 700, fontSize: 13 }}>{payments.length} invoices</span>
        <span style={{ fontFamily: "'Space Mono',monospace", fontWeight: 800, fontSize: 16, color: "#0F172A" }}>{total.toLocaleString("en-US")}$</span>
        <span style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600, textTransform: "uppercase" }}>sum</span>
      </div>
    </div>
  );
}

function CustomerPayments({ user, onLogout, onNav, onAdmin, payments, setPayments, onRefresh, userAccess }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editPay, setEditPay] = useState(null);
  const [delConfirm, setDelConfirm] = useState(null);
  const [cpSort, setCpSort] = useState("manual");

  const handleCpMove = (id, direction) => {
    setPayments(prev => {
      const arr = [...prev];
      const idx = arr.findIndex(p => p.id === id);
      if (idx < 0) return prev;
      if (direction === "up" && idx > 0) [arr[idx], arr[idx - 1]] = [arr[idx - 1], arr[idx]];
      if (direction === "down" && idx < arr.length - 1) [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
      return arr;
    });
  };

  const handleCpSortAlpha = () => {
    if (cpSort === "alpha") { setCpSort("manual"); return; }
    setCpSort("alpha");
    setPayments(prev => [...prev].sort((a, b) => (a.invoice || "").localeCompare(b.invoice || "", undefined, { numeric: true })));
  };

  const matchSearch = p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return [p.invoice, p.openBy, p.status, p.trcAddress, p.ercAddress].some(v => (v || "").toLowerCase().includes(q));
  };

  const openPayments = payments.filter(p => ["Open", "Pending"].includes(p.status) && matchSearch(p));
  const receivedPayments = payments.filter(p => ["Received", "Refund"].includes(p.status) && p.month === month && p.year === year && matchSearch(p));

  const openTotal = openPayments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  const receivedTotal = receivedPayments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const handleSave = form => {
    if (editPay) {
      const updated = { ...editPay, ...form };
      if (["Received", "Refund"].includes(form.status) && !["Received", "Refund"].includes(editPay.status)) {
        updated.month = month;
        updated.year = year;
        if (!updated.paidDate) updated.paidDate = new Date().toISOString().split("T")[0];
      }
      setPayments(prev => prev.map(p => p.id === editPay.id ? updated : p));
    } else {
      setPayments(prev => [...prev, { ...form, id: genId(), month, year }]);
    }
    setModalOpen(false);
    setEditPay(null);
  };

  const handleDelete = id => { setPayments(prev => prev.filter(p => p.id !== id)); setDelConfirm(null); };

  const handleCpStatusChange = (id, newStatus) => {
    setPayments(prev => prev.map(p => {
      if (p.id !== id) return p;
      const updated = { ...p, status: newStatus };
      if (["Received", "Refund"].includes(newStatus)) {
        updated.month = month;
        updated.year = year;
        if (!updated.paidDate) updated.paidDate = new Date().toISOString().split("T")[0];
      }
      return updated;
    }));
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F1F5F9", fontFamily: "'DM Sans','Segoe UI',sans-serif", color: "#0F172A" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />
      <BlitzHeader user={user} activePage="customers" userAccess={userAccess} onNav={onNav} onAdmin={() => onNav("admin")} onRefresh={onRefresh} onLogout={onLogout} accentColor="#0EA5E9" />

      <main className="blitz-main" style={{ maxWidth: 1240, margin: "0 auto", padding: "28px 32px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={prevMonth} style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 10, padding: 8, cursor: "pointer", color: "#64748B", display: "flex" }}>{I.chevL}</button>
            <div style={{ minWidth: 200, textAlign: "center" }}>
              <span style={{ fontSize: 22, fontWeight: 700 }}>{MONTHS[month]}</span>
              <span style={{ fontSize: 22, fontWeight: 300, color: "#64748B", marginLeft: 10 }}>{year}</span>
            </div>
            <button onClick={nextMonth} style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 10, padding: 8, cursor: "pointer", color: "#64748B", display: "flex" }}>{I.chevR}</button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, maxWidth: 500, marginLeft: 24 }}>
            <div style={{ position: "relative", flex: 1 }}>
              <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94A3B8" }}>{I.search}</div>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
                style={{ ...inp, paddingLeft: 40, background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 10, fontSize: 14 }} />
            </div>
            <button onClick={() => { setEditPay(null); setModalOpen(true); }}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", background: "linear-gradient(135deg,#0EA5E9,#38BDF8)", border: "none", borderRadius: 10, color: "#FFF", cursor: "pointer", fontSize: 14, fontWeight: 600, boxShadow: "0 4px 20px rgba(14,165,233,0.3)", whiteSpace: "nowrap" }}
            >{I.plus} New Invoice</button>
            <button onClick={handleCpSortAlpha}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", background: cpSort === "alpha" ? "#0EA5E9" : "transparent", border: `2px solid ${cpSort === "alpha" ? "#0EA5E9" : "#94A3B8"}`, borderRadius: 10, color: cpSort === "alpha" ? "#FFF" : "#64748B", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
            >{cpSort === "alpha" ? "✓ A→Z" : "A→Z"}</button>
          </div>
        </div>

        {/* Summary */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 16, marginBottom: 28 }}>
          {[
            { label: "Open Invoices", value: openPayments.length, accent: "#F59E0B", bg: "#FFFBEB", isMoney: false },
            { label: "Open Total", value: openTotal, accent: "#F59E0B", bg: "#FFFBEB", isMoney: true },
            { label: "Received This Month", value: receivedPayments.length, accent: "#10B981", bg: "#ECFDF5", isMoney: false },
            { label: "Received Total", value: receivedTotal, accent: "#10B981", bg: "#ECFDF5", isMoney: true },
          ].map((c, i) => (
            <div key={i} style={{ background: c.bg, border: "1px solid #E2E8F0", borderRadius: 14, padding: "20px 22px", position: "relative", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: c.accent }} />
              <div style={{ fontSize: 11, color: "#64748B", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>{c.label}</div>
              <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "'Space Mono',monospace", color: c.accent }}>
                {c.isMoney ? c.value.toLocaleString("en-US") + "$" : c.value}
              </div>
            </div>
          ))}
        </div>

        <GroupHeader icon={I.openBox} title="Open Invoices" count={openPayments.length} total={openTotal} accentColor="#F59E0B" defaultOpen={true}>
          <CPTable payments={openPayments} onEdit={p => { setEditPay(p); setModalOpen(true); }} onDelete={id => setDelConfirm(id)} onStatusChange={handleCpStatusChange} statusOptions={CP_STATUS_OPTIONS} emptyMsg="No open invoices — all caught up!" sortMode={cpSort} onMove={handleCpMove} />
        </GroupHeader>

        <GroupHeader icon={I.calendar} title={`${MONTHS[month].toUpperCase()} ${year}`} count={receivedPayments.length} total={receivedTotal} accentColor="#EC4899" defaultOpen={true}>
          <CPTable payments={receivedPayments} onEdit={p => { setEditPay(p); setModalOpen(true); }} onDelete={id => setDelConfirm(id)} emptyMsg={`No received payments for ${MONTHS[month]} ${year}`} sortMode={cpSort} onMove={handleCpMove} />
        </GroupHeader>
      </main>

      {modalOpen && (
        <Modal title={editPay ? "Edit Invoice" : "New Customer Invoice"} onClose={() => { setModalOpen(false); setEditPay(null); }}>
          <CPForm payment={editPay} onSave={handleSave} onClose={() => { setModalOpen(false); setEditPay(null); }} userName={user.name} />
        </Modal>
      )}
      {delConfirm && (
        <Modal title="Delete Invoice" onClose={() => setDelConfirm(null)}>
          <p style={{ color: "#475569", marginBottom: 24, fontSize: 15 }}>Are you sure? This can't be undone.</p>
          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
            <button onClick={() => setDelConfirm(null)} style={{ padding: "10px 20px", borderRadius: 8, background: "transparent", border: "1px solid #E2E8F0", color: "#64748B", cursor: "pointer", fontSize: 14 }}>Cancel</button>
            <button onClick={() => handleDelete(delConfirm)} style={{ padding: "10px 24px", borderRadius: 8, background: "linear-gradient(135deg,#EF4444,#F87171)", border: "none", color: "#FFF", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>Delete</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ── CRG Deals Page ── */
const CRG_INITIAL = [
  // 13/02 Friday
  { id: genId(), affiliate: "122 DE", brokerCap: "Ave 15", manageAff: "Katie", cap: "15", madeSale: "Katie", started: true, capReceived: "5", ftd: "", hours: "10-19 gmt+2", deal: "", funnel: "", date: "2026-02-13" },
  { id: genId(), affiliate: "123 DE", brokerCap: "Ave 15", manageAff: "Katie", cap: "15", madeSale: "Katie", started: true, capReceived: "4", ftd: "", hours: "10-19 gmt+3", deal: "", funnel: "", date: "2026-02-13" },
  { id: genId(), affiliate: "134 GCC", brokerCap: "Capex 8", manageAff: "Katie", cap: "8", madeSale: "Katie", started: true, capReceived: "8", ftd: "", hours: "10-19 gmt+3", deal: "", funnel: "", date: "2026-02-13" },
  { id: genId(), affiliate: "168 SI", brokerCap: "Nexus 10", manageAff: "Joy", cap: "10", madeSale: "Oksana", started: true, capReceived: "3", ftd: "", hours: "10-20 gmt+2", deal: "", funnel: "", date: "2026-02-13" },
  { id: genId(), affiliate: "168 SI", brokerCap: "Unit 10", manageAff: "Joy", cap: "10", madeSale: "John", started: false, capReceived: "", ftd: "", hours: "10-19 gmt+2", deal: "", funnel: "", date: "2026-02-13" },
  { id: genId(), affiliate: "168 SI", brokerCap: "EMP 20", manageAff: "Joy", cap: "20", madeSale: "Oksana", started: false, capReceived: "", ftd: "", hours: "10-22 gmt+2", deal: "", funnel: "", date: "2026-02-13" },
  { id: genId(), affiliate: "175 FR", brokerCap: "Avelux 15", manageAff: "Alex", cap: "15", madeSale: "Oksana", started: true, capReceived: "15", ftd: "2", hours: "11-19 gmt+2", deal: "", funnel: "", date: "2026-02-13" },
  { id: genId(), affiliate: "175 FR", brokerCap: "GLB 15", manageAff: "Alex", cap: "15", madeSale: "John", started: true, capReceived: "15", ftd: "1", hours: "12-18 gmt+2", deal: "", funnel: "", date: "2026-02-13" },
  { id: genId(), affiliate: "175 FR", brokerCap: "Leadstream 10", manageAff: "Alex", cap: "10", madeSale: "Joy", started: true, capReceived: "10", ftd: "", hours: "11-20 gmt+2", deal: "", funnel: "", date: "2026-02-13" },
  { id: genId(), affiliate: "175 FR", brokerCap: "MN FR 20", manageAff: "Alex", cap: "20", madeSale: "Katie", started: true, capReceived: "20", ftd: "1", hours: "11-20 gmt+2", deal: "", funnel: "", date: "2026-02-13" },
  { id: genId(), affiliate: "211 UK", brokerCap: "Capitan 10", manageAff: "Katie", cap: "10", madeSale: "Alex", started: true, capReceived: "10", ftd: "1", hours: "10-16 gmt+2", deal: "", funnel: "", date: "2026-02-13" },
  { id: genId(), affiliate: "175 FR", brokerCap: "", manageAff: "", cap: "", madeSale: "", started: false, capReceived: "", ftd: "", hours: "", deal: "", funnel: "", date: "2026-02-13" },
  // 19/02 Thursday
  { id: genId(), affiliate: "33 AU", brokerCap: "Swin 15", manageAff: "Alex", cap: "15", madeSale: "John", started: true, capReceived: "5", ftd: "", hours: "04-13 gmt+2", deal: "", funnel: "", date: "2026-02-19" },
  { id: genId(), affiliate: "47 DE", brokerCap: "Capitan 20", manageAff: "Katie", cap: "20", madeSale: "Alex", started: true, capReceived: "1", ftd: "", hours: "11-17 gmt+2", deal: "", funnel: "", date: "2026-02-19" },
  { id: genId(), affiliate: "64 MY", brokerCap: "12Mark 10", manageAff: "Oksana", cap: "10", madeSale: "Oksana", started: true, capReceived: "8", ftd: "1", hours: "03-14 gmt+2", deal: "", funnel: "", date: "2026-02-19" },
  { id: genId(), affiliate: "168 SI", brokerCap: "EMP 15", manageAff: "Joy", cap: "15", madeSale: "Oksana", started: false, capReceived: "", ftd: "", hours: "10-22 gmt+2", deal: "", funnel: "", date: "2026-02-19" },
  { id: genId(), affiliate: "168 SI", brokerCap: "Nexus 11", manageAff: "Joy", cap: "11", madeSale: "Oksana", started: false, capReceived: "", ftd: "", hours: "10-20 gmt+2", deal: "", funnel: "", date: "2026-02-19" },
  { id: genId(), affiliate: "168 SI", brokerCap: "Unit 20", manageAff: "Joy", cap: "20", madeSale: "John", started: false, capReceived: "", ftd: "", hours: "10-19 gmt+2", deal: "", funnel: "", date: "2026-02-19" },
  { id: genId(), affiliate: "171 AU", brokerCap: "Swin 5", manageAff: "Joy", cap: "10", madeSale: "Alex", started: true, capReceived: "10", ftd: "1", hours: "04-11:30 gmt+2", deal: "", funnel: "", date: "2026-02-19" },
  { id: genId(), affiliate: "175 AU", brokerCap: "Swin 10", manageAff: "Alex", cap: "15", madeSale: "John", started: true, capReceived: "1", ftd: "", hours: "04-13 gmt+2", deal: "", funnel: "", date: "2026-02-19" },
  { id: genId(), affiliate: "175 FR", brokerCap: "Avelux 20", manageAff: "Alex", cap: "20", madeSale: "Oksana", started: true, capReceived: "3", ftd: "", hours: "11-20 gmt+2", deal: "", funnel: "", date: "2026-02-19" },
  { id: genId(), affiliate: "196 HR", brokerCap: "EMP 15", manageAff: "Oksana", cap: "15", madeSale: "Oksana", started: true, capReceived: "8", ftd: "", hours: "10-19 gmt+2", deal: "", funnel: "", date: "2026-02-19" },
  { id: genId(), affiliate: "196 HR", brokerCap: "Imperious 10", manageAff: "Oksana", cap: "10", madeSale: "John", started: true, capReceived: "3", ftd: "", hours: "10-19 gmt+2", deal: "", funnel: "", date: "2026-02-19" },
  { id: genId(), affiliate: "211 FR", brokerCap: "Avelux 10", manageAff: "Katie", cap: "10", madeSale: "Oksana", started: true, capReceived: "10", ftd: "", hours: "10-19 gmt+2", deal: "", funnel: "", date: "2026-02-19" },
  { id: genId(), affiliate: "211 UK", brokerCap: "Swin 10", manageAff: "Katie", cap: "10", madeSale: "John", started: true, capReceived: "3", ftd: "", hours: "10-18 gmt+2", deal: "", funnel: "", date: "2026-02-19" },
  { id: genId(), affiliate: "175 FR", brokerCap: "FPmarket 9", manageAff: "Alex", cap: "9", madeSale: "Oksana", started: true, capReceived: "1", ftd: "", hours: "11-20 gmt+2", deal: "", funnel: "", date: "2026-02-19" },
];


function CRGForm({ deal, onSave, onClose, defaultDate }) {
  const [f, setF] = useState(deal || { affiliate: "", deal: "", brokerCap: "", manageAff: "", cap: "", madeSale: "", started: false, capReceived: "", ftd: "", hours: "", funnel: "", date: defaultDate || new Date().toISOString().split("T")[0] });
  const [error, setError] = useState("");
  const s = (k, v) => { setF(p => ({ ...p, [k]: v })); setError(""); };

  const handleSave = () => {
    if (!f.affiliate.trim()) { setError("Affiliate is required"); return; }
    onSave(f);
  };

  return (
    <>
      {/* Date selector - prominent at top */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "linear-gradient(135deg, #FFFBEB, #FEF3C7)", borderRadius: 10, marginBottom: 16, border: "1px solid #F59E0B40" }}>
        <span style={{ fontSize: 20 }}>📅</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: "#92400E", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Date</div>
          <input style={{ ...inp, background: "#FFF", border: "2px solid #F59E0B", fontWeight: 700, fontSize: 15 }} type="date" value={f.date} onChange={e => s("date", e.target.value)} />
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#92400E" }}>
            {(() => { const d = new Date(f.date + "T00:00:00"); const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]; return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")} ${days[d.getDay()]}`; })()}
          </div>
        </div>
      </div>
      <div className="blitz-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
        <Field label="Affiliate"><input style={inp} value={f.affiliate} onChange={e => s("affiliate", e.target.value)} placeholder="e.g. 33 AU, 47 DE" /></Field>
        <Field label="Deal"><input style={inp} value={f.deal || ""} onChange={e => s("deal", e.target.value)} placeholder="Deal info" /></Field>
        <Field label="Broker / Cap"><input style={inp} value={f.brokerCap} onChange={e => s("brokerCap", e.target.value)} placeholder="e.g. Swin 15" /></Field>
        <Field label="Manage the AFF"><NameCombo value={f.manageAff} onChange={v => s("manageAff", v)} /></Field>
        <Field label="CAP"><input style={inp} type="number" value={f.cap} onChange={e => s("cap", e.target.value)} placeholder="0" /></Field>
        <Field label="Made the SALE"><NameCombo value={f.madeSale} onChange={v => s("madeSale", v)} /></Field>
        <Field label="Started">
          <div onClick={() => s("started", !f.started)} style={{ ...inp, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 20, height: 20, borderRadius: 4, border: f.started ? "none" : "2px solid #CBD5E1", background: f.started ? "#10B981" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", color: "#FFF", fontSize: 14, fontWeight: 700 }}>{f.started ? "✓" : ""}</span>
            <span style={{ color: f.started ? "#10B981" : "#94A3B8", fontWeight: 500 }}>{f.started ? "Yes" : "No"}</span>
          </div>
        </Field>
        <Field label="CAP Received"><input style={inp} type="number" value={f.capReceived} onChange={e => s("capReceived", e.target.value)} placeholder="0" /></Field>
        <Field label="FTD"><input style={inp} type="number" value={f.ftd} onChange={e => s("ftd", e.target.value)} placeholder="0" /></Field>
        <Field label="Hours"><input style={inp} value={f.hours} onChange={e => s("hours", e.target.value)} placeholder="e.g. 04-13 gmt+2" /></Field>
      </div>
      <Field label="Funnel"><textarea style={{ ...inp, minHeight: 50, resize: "vertical" }} value={f.funnel || ""} onChange={e => s("funnel", e.target.value)} placeholder="Funnel info..." /></Field>
      {error && <div style={{ color: "#DC2626", fontSize: 13, padding: "8px 12px", background: "rgba(220,38,38,0.08)", borderRadius: 8, marginBottom: 8, border: "1px solid rgba(220,38,38,0.2)" }}>{error}</div>}
      <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8 }}>
        <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 8, background: "transparent", border: "1px solid #E2E8F0", color: "#64748B", cursor: "pointer", fontSize: 14, fontWeight: 500 }}>Cancel</button>
        <button onClick={handleSave} style={{ padding: "10px 24px", borderRadius: 8, background: "linear-gradient(135deg,#F59E0B,#FBBF24)", border: "none", color: "#FFF", cursor: "pointer", fontSize: 14, fontWeight: 600, boxShadow: "0 4px 15px rgba(245,158,11,0.3)" }}>{deal ? "Save Changes" : "Add Affiliate"}</button>
      </div>
    </>
  );
}

function CRGDeals({ user, onLogout, onNav, onAdmin, deals, setDeals, onRefresh, userAccess }) {
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editDeal, setEditDeal] = useState(null);
  const [delConfirm, setDelConfirm] = useState(null);
  const [newDayDate, setNewDayDate] = useState(null);
  const [crgSort, setCrgSort] = useState("manual"); // "manual" | "alpha"

  // Get the latest date in deals
  const allDates = [...new Set(deals.map(d => d.date).filter(Boolean))].sort();
  const latestDate = allDates[allDates.length - 1] || new Date().toISOString().split("T")[0];
  const today = new Date().toISOString().split("T")[0];
  const tomorrow = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split("T")[0]; })();

  const handleCopyPrevDay = (targetDate) => {
    const prevDayEntries = deals.filter(d => d.date === latestDate);
    if (prevDayEntries.length === 0) return;
    const newEntries = prevDayEntries.map(d => ({
      ...d, id: genId(), date: targetDate,
      started: false, capReceived: "", ftd: "", funnel: "",
    }));
    setDeals(prev => [...prev, ...newEntries]);
  };

  // Move a deal up or down within its date group
  const handleMove = (dealId, direction) => {
    setDeals(prev => {
      const arr = [...prev];
      const idx = arr.findIndex(d => d.id === dealId);
      if (idx < 0) return prev;
      const item = arr[idx];
      const dateKey = item.date;
      // Find all indices for this date
      const dateIndices = arr.map((d, i) => d.date === dateKey ? i : -1).filter(i => i >= 0);
      const posInDate = dateIndices.indexOf(idx);
      if (direction === "up" && posInDate > 0) {
        const swapIdx = dateIndices[posInDate - 1];
        [arr[idx], arr[swapIdx]] = [arr[swapIdx], arr[idx]];
      } else if (direction === "down" && posInDate < dateIndices.length - 1) {
        const swapIdx = dateIndices[posInDate + 1];
        [arr[idx], arr[swapIdx]] = [arr[swapIdx], arr[idx]];
      }
      return arr;
    });
  };

  // Sort all deals alphabetically by affiliate within each date group
  const handleSortAlpha = () => {
    if (crgSort === "alpha") {
      setCrgSort("manual");
      return;
    }
    setCrgSort("alpha");
    setDeals(prev => {
      const arr = [...prev];
      // Group by date, sort each group, reassemble
      const groups = {};
      const order = [];
      arr.forEach((d, i) => {
        const key = d.date || "Unknown";
        if (!groups[key]) { groups[key] = []; order.push(key); }
        groups[key].push(d);
      });
      const sorted = [];
      // Keep date order, sort items within each date
      const dateOrder = [...new Set(arr.map(d => d.date || "Unknown"))];
      dateOrder.forEach(dk => {
        const items = arr.filter(d => (d.date || "Unknown") === dk);
        items.sort((a, b) => (a.affiliate || "").localeCompare(b.affiliate || "", undefined, { numeric: true }));
        sorted.push(...items);
      });
      return sorted;
    });
  };

  const matchSearch = d => {
    if (!search) return true;
    const q = search.toLowerCase();
    return [d.affiliate, d.deal, d.brokerCap, d.manageAff, d.madeSale, d.hours, d.funnel].some(v => (v || "").toLowerCase().includes(q));
  };

  const filtered = deals.filter(matchSearch);

  // Group by date
  const grouped = {};
  filtered.forEach(d => {
    const key = d.date || "Unknown";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(d);
  });
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a)); // newest first

  const fmtDate = ds => {
    if (!ds || ds === "Unknown") return "Unknown";
    const d = new Date(ds + "T00:00:00");
    const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")} ${days[d.getDay()]}`;
  };

  const handleSave = form => {
    if (editDeal) {
      setDeals(prev => prev.map(d => d.id === editDeal.id ? { ...editDeal, ...form } : d));
    } else {
      setDeals(prev => [...prev, { ...form, id: genId() }]);
    }
    setModalOpen(false);
    setEditDeal(null);
    setNewDayDate(null);
  };

  const handleDelete = id => { setDeals(prev => prev.filter(d => d.id !== id)); setDelConfirm(null); };

  // Summary totals
  const totalCap = filtered.reduce((s, d) => s + (parseInt(d.cap) || 0), 0);
  const totalCapRec = filtered.reduce((s, d) => s + (parseInt(d.capReceived) || 0), 0);
  const totalFtd = filtered.reduce((s, d) => s + (parseInt(d.ftd) || 0), 0);
  const startedCount = filtered.filter(d => d.started).length;

  const personBadge = (name) => {
    if (!name) return <span style={{ color: "#CBD5E1", fontSize: 13 }}>—</span>;
    return <span style={{ display: "inline-block", padding: "6px 0", borderRadius: 0, background: getPersonColor(name), color: "#FFF", fontWeight: 700, fontSize: 13, textAlign: "center", width: "100%", letterSpacing: 0.3 }}>{name}</span>;
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F1F5F9", fontFamily: "'DM Sans','Segoe UI',sans-serif", color: "#0F172A" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />
      <BlitzHeader user={user} activePage="crg" userAccess={userAccess} onNav={onNav} onAdmin={() => onNav("admin")} onRefresh={onRefresh} onLogout={onLogout} accentColor="#F59E0B" />

      <main className="blitz-main" style={{ maxWidth: 1400, margin: "0 auto", padding: "28px 32px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>CRG Deals</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, maxWidth: 500, marginLeft: 24 }}>
            <div style={{ position: "relative", flex: 1 }}>
              <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94A3B8" }}>{I.search}</div>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
                style={{ ...inp, paddingLeft: 40, background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 10, fontSize: 14 }} />
            </div>
            <button onClick={() => { setEditDeal(null); setNewDayDate(today); setModalOpen(true); }}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", background: "linear-gradient(135deg,#F59E0B,#FBBF24)", border: "none", borderRadius: 10, color: "#FFF", cursor: "pointer", fontSize: 14, fontWeight: 600, boxShadow: "0 4px 20px rgba(245,158,11,0.3)", whiteSpace: "nowrap" }}
            >{I.plus} New Affiliate</button>
          </div>
        </div>

        {/* Day action buttons */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
          <button onClick={() => { setEditDeal(null); setNewDayDate(today); setModalOpen(true); }}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "#10B981", border: "none", borderRadius: 8, color: "#FFF", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
          >📅 New Entry (Today)</button>
          <button onClick={() => { setEditDeal(null); setNewDayDate(tomorrow); setModalOpen(true); }}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "#6366F1", border: "none", borderRadius: 8, color: "#FFF", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
          >📅 New Entry (Tomorrow)</button>
          <button onClick={() => handleCopyPrevDay(today)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "transparent", border: "2px solid #F59E0B", borderRadius: 8, color: "#F59E0B", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
          >📋 Copy Last Day → Today</button>
          <button onClick={() => handleCopyPrevDay(tomorrow)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "transparent", border: "2px solid #6366F1", borderRadius: 8, color: "#6366F1", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
          >📋 Copy Last Day → Tomorrow</button>
          <button onClick={handleSortAlpha}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: crgSort === "alpha" ? "#0EA5E9" : "transparent", border: `2px solid ${crgSort === "alpha" ? "#0EA5E9" : "#94A3B8"}`, borderRadius: 8, color: crgSort === "alpha" ? "#FFF" : "#64748B", cursor: "pointer", fontSize: 13, fontWeight: 600, marginLeft: "auto" }}
          >{crgSort === "alpha" ? "✓ A→Z Sorted" : "A→Z Sort"}</button>
        </div>

        {/* Summary cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 16, marginBottom: 28 }}>
          {[
            { label: "Total Affiliates", value: filtered.length, accent: "#F59E0B", bg: "#FFFBEB" },
            { label: "CAP Sum", value: totalCap, accent: "#6366F1", bg: "#EEF2FF" },
            { label: "Started", value: `${startedCount} / ${filtered.length}`, accent: "#10B981", bg: "#ECFDF5" },
            { label: "FTD Sum", value: totalFtd, accent: "#EC4899", bg: "#FDF2F8" },
          ].map((c, i) => (
            <div key={i} style={{ background: c.bg, border: "1px solid #E2E8F0", borderRadius: 14, padding: "20px 22px", position: "relative", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: c.accent }} />
              <div style={{ fontSize: 11, color: "#64748B", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>{c.label}</div>
              <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "'Space Mono',monospace", color: c.accent }}>{c.value}</div>
            </div>
          ))}
        </div>

        {/* Grouped by date */}
        {sortedDates.map(dateKey => {
          const items = grouped[dateKey];
          const sortedItems = crgSort === "alpha"
            ? [...items].sort((a, b) => (a.affiliate || "").localeCompare(b.affiliate || "", undefined, { numeric: true }))
            : items;
          const dayCap = sortedItems.reduce((s, d) => s + (parseInt(d.cap) || 0), 0);
          const dayCapRec = sortedItems.reduce((s, d) => s + (parseInt(d.capReceived) || 0), 0);
          const dayFtd = sortedItems.reduce((s, d) => s + (parseInt(d.ftd) || 0), 0);
          const dayStarted = sortedItems.filter(d => d.started).length;

          return (
            <GroupHeader key={dateKey} icon={I.calendar} title={fmtDate(dateKey)} count={sortedItems.length} total={dayCap} accentColor="#F59E0B" defaultOpen={true}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#FFFFFF" }}>
                      {["Affiliate","Deal","Broker / Cap","Manage AFF","CAP","Made SALE","Started","CAP Rec.","FTD","Hours","Funnel","Actions"].map(h =>
                        <th key={h} style={{ padding: "8px 12px", textAlign: "center", color: "#676879", fontSize: 12, fontWeight: 600, borderBottom: "1px solid #E6E9EF", borderRight: "1px solid #E6E9EF", whiteSpace: "nowrap", ...(h === "Affiliate" ? { textAlign: "left", paddingLeft: 14 } : {}) }}>{h}</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedItems.map((d, rowIdx) => (
                      <tr key={d.id} style={{ borderBottom: "1px solid #E6E9EF", transition: "background 0.15s", height: 37 }}
                        onMouseEnter={e => e.currentTarget.style.background = "#F5F6F8"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        <td style={{ padding: "0 14px", fontWeight: 600, fontSize: 14, borderRight: "1px solid #E6E9EF", color: "#323338" }}>
                          <span onClick={() => { setEditDeal(d); setModalOpen(true); }} style={{ cursor: "pointer", color: "#0073EA", textDecoration: "none" }}
                            onMouseEnter={e => e.currentTarget.style.textDecoration = "underline"}
                            onMouseLeave={e => e.currentTarget.style.textDecoration = "none"}
                          >{d.affiliate}</span>
                        </td>
                        <td style={{ padding: "0 12px", borderRight: "1px solid #E6E9EF", fontSize: 13, color: "#323338" }}>{d.deal || ""}</td>
                        <td style={{ padding: "0 14px", borderRight: "1px solid #E6E9EF", fontSize: 13, color: "#323338", textAlign: "center" }}>{d.brokerCap || ""}</td>
                        <td style={{ padding: 0, borderRight: "1px solid #E6E9EF", background: d.manageAff ? getPersonColor(d.manageAff) : "transparent", textAlign: "center" }}>
                          <span style={{ color: "#FFF", fontWeight: 600, fontSize: 13, letterSpacing: 0.2 }}>{d.manageAff || ""}</span>
                        </td>
                        <td style={{ padding: "0 10px", fontFamily: "'Space Mono',monospace", fontWeight: 600, fontSize: 14, borderRight: "1px solid #E6E9EF", textAlign: "center", color: "#323338" }}>{d.cap || ""}</td>
                        <td style={{ padding: 0, borderRight: "1px solid #E6E9EF", background: d.madeSale ? getPersonColor(d.madeSale) : "transparent", textAlign: "center" }}>
                          <span style={{ color: "#FFF", fontWeight: 600, fontSize: 13, letterSpacing: 0.2 }}>{d.madeSale || ""}</span>
                        </td>
                        <td style={{ padding: "0 10px", borderRight: "1px solid #E6E9EF", textAlign: "center" }}>
                          {d.started ? <span style={{ color: "#00C875", fontSize: 18, fontWeight: 700 }}>✓</span> : ""}
                        </td>
                        <td style={{ padding: "0 10px", fontFamily: "'Space Mono',monospace", fontWeight: 600, fontSize: 13, borderRight: "1px solid #E6E9EF", textAlign: "center", color: d.capReceived ? "#323338" : "#C5C7D0" }}>{d.capReceived || ""}</td>
                        <td style={{ padding: "0 10px", fontFamily: "'Space Mono',monospace", fontWeight: 600, fontSize: 13, borderRight: "1px solid #E6E9EF", textAlign: "center", color: d.ftd ? "#323338" : "#C5C7D0" }}>{d.ftd || ""}</td>
                        <td style={{ padding: "0 12px", fontSize: 13, color: "#676879", borderRight: "1px solid #E6E9EF", whiteSpace: "nowrap" }}>{d.hours || ""}</td>
                        <td style={{ padding: "0 12px", fontSize: 13, color: "#676879", borderRight: "1px solid #E6E9EF", maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.funnel || ""}</td>
                        <td style={{ padding: "4px 8px" }}>
                          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                            {crgSort === "manual" && <>
                              <button onClick={() => handleMove(d.id, "up")} title="Move up" disabled={rowIdx === 0}
                                style={{ background: "none", border: "1px solid #E2E8F0", borderRadius: 4, padding: "2px 4px", cursor: rowIdx === 0 ? "default" : "pointer", color: rowIdx === 0 ? "#E2E8F0" : "#64748B", display: "flex", fontSize: 11 }}>▲</button>
                              <button onClick={() => handleMove(d.id, "down")} title="Move down" disabled={rowIdx === sortedItems.length - 1}
                                style={{ background: "none", border: "1px solid #E2E8F0", borderRadius: 4, padding: "2px 4px", cursor: rowIdx === sortedItems.length - 1 ? "default" : "pointer", color: rowIdx === sortedItems.length - 1 ? "#E2E8F0" : "#64748B", display: "flex", fontSize: 11 }}>▼</button>
                            </>}
                            <button onClick={() => { setEditDeal(d); setModalOpen(true); }} title="Edit" style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 6, padding: 5, cursor: "pointer", color: "#2563EB", display: "flex" }}>{I.edit}</button>
                            <button onClick={() => setDelConfirm(d.id)} title="Delete" style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 6, padding: 5, cursor: "pointer", color: "#DC2626", display: "flex" }}>{I.trash}</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {/* Quick add inside the group */}
                <button onClick={() => { setEditDeal(null); setNewDayDate(dateKey); setModalOpen(true); }}
                  style={{ width: "100%", padding: "8px 16px", background: "transparent", border: "none", borderTop: "1px dashed #E6E9EF", color: "#F59E0B", cursor: "pointer", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, transition: "background 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#FFFBEB"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >{I.plus} Add Affiliate</button>
                {/* Day footer */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20, padding: "8px 16px", background: "#FFFFFF", borderTop: "1px solid #E6E9EF", flexWrap: "wrap" }}>
                  {/* Color bars for Manage AFF */}
                  <div style={{ display: "flex", height: 18, borderRadius: 4, overflow: "hidden", minWidth: 80 }}>
                    {Object.entries(sortedItems.reduce((acc, d) => { if (d.manageAff) acc[d.manageAff] = (acc[d.manageAff] || 0) + 1; return acc; }, {})).map(([name, count]) =>
                      <div key={name} style={{ width: count * 20, background: getPersonColor(name), minWidth: 12 }} title={`${name}: ${count}`} />
                    )}
                  </div>
                  <span style={{ fontWeight: 600, fontSize: 13, color: "#323338" }}>{dayCap} <span style={{ color: "#C5C7D0", fontWeight: 400 }}>sum</span></span>
                  {/* Color bars for Made SALE */}
                  <div style={{ display: "flex", height: 18, borderRadius: 4, overflow: "hidden", minWidth: 80 }}>
                    {Object.entries(sortedItems.reduce((acc, d) => { if (d.madeSale) acc[d.madeSale] = (acc[d.madeSale] || 0) + 1; return acc; }, {})).map(([name, count]) =>
                      <div key={name} style={{ width: count * 20, background: getPersonColor(name), minWidth: 12 }} title={`${name}: ${count}`} />
                    )}
                  </div>
                  <span style={{ fontWeight: 600, fontSize: 13, color: "#323338" }}>{dayStarted}/{sortedItems.length}</span>
                  <span style={{ fontWeight: 600, fontSize: 13, color: "#323338" }}>{dayCapRec} <span style={{ color: "#C5C7D0", fontWeight: 400 }}>sum</span></span>
                  <span style={{ fontWeight: 600, fontSize: 13, color: "#323338" }}>{dayFtd} <span style={{ color: "#C5C7D0", fontWeight: 400 }}>sum</span></span>
                </div>
              </div>
            </GroupHeader>
          );
        })}

        {sortedDates.length === 0 && <div style={{ padding: "60px 16px", textAlign: "center", color: "#94A3B8", fontSize: 15 }}>No deals yet. Click "New Affiliate" to add one.</div>}
      </main>

      {modalOpen && (
        <Modal title={editDeal ? "Edit Affiliate" : "New Affiliate"} onClose={() => { setModalOpen(false); setEditDeal(null); }}>
          <CRGForm deal={editDeal} onSave={handleSave} onClose={() => { setModalOpen(false); setEditDeal(null); setNewDayDate(null); }} defaultDate={newDayDate} />
        </Modal>
      )}
      {delConfirm && (
        <Modal title="Delete Affiliate" onClose={() => setDelConfirm(null)}>
          <p style={{ color: "#475569", marginBottom: 24, fontSize: 15 }}>Are you sure? This can't be undone.</p>
          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
            <button onClick={() => setDelConfirm(null)} style={{ padding: "10px 20px", borderRadius: 8, background: "transparent", border: "1px solid #E2E8F0", color: "#64748B", cursor: "pointer", fontSize: 14 }}>Cancel</button>
            <button onClick={() => handleDelete(delConfirm)} style={{ padding: "10px 24px", borderRadius: 8, background: "linear-gradient(135deg,#EF4444,#F87171)", border: "none", color: "#FFF", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>Delete</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ── Daily Cap Page ── */
const DC_INITIAL = [];

function DCForm({ entry, onSave, onClose, defaultDate }) {
  const [f, setF] = useState(entry || { agent: "", affiliates: "", brands: "", date: defaultDate || new Date().toISOString().split("T")[0] });
  const [error, setError] = useState("");
  const s = (k, v) => { setF(p => ({ ...p, [k]: v })); setError(""); };
  const total = (parseInt(f.affiliates) || 0) + (parseInt(f.brands) || 0);

  const handleSave = () => {
    if (!f.agent.trim()) { setError("Agent name is required"); return; }
    onSave(f);
  };

  return (
    <>
      {/* Date selector - prominent at top */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "linear-gradient(135deg, #F5F3FF, #EDE9FE)", borderRadius: 10, marginBottom: 16, border: "1px solid #8B5CF640" }}>
        <span style={{ fontSize: 20 }}>📅</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: "#5B21B6", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Date</div>
          <input style={{ ...inp, background: "#FFF", border: "2px solid #8B5CF6", fontWeight: 700, fontSize: 15 }} type="date" value={f.date} onChange={e => s("date", e.target.value)} />
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#5B21B6" }}>
            {(() => { const d = new Date(f.date + "T00:00:00"); const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]; return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")} ${days[d.getDay()]}`; })()}
          </div>
        </div>
      </div>
      <div className="blitz-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
        <Field label="Agent"><NameCombo value={f.agent} onChange={v => s("agent", v)} /></Field>
        <div />
        <Field label="Affiliates"><input style={inp} type="number" value={f.affiliates} onChange={e => s("affiliates", e.target.value)} placeholder="0" /></Field>
        <Field label="Brands"><input style={inp} type="number" value={f.brands} onChange={e => s("brands", e.target.value)} placeholder="0" /></Field>
      </div>
      <div style={{ padding: "12px 16px", background: "#F8FAFC", borderRadius: 10, marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ color: "#64748B", fontSize: 13, fontWeight: 600 }}>Total:</span>
        <span style={{ fontFamily: "'Space Mono',monospace", fontWeight: 800, fontSize: 18, color: "#0F172A" }}>{total}</span>
      </div>
      {error && <div style={{ color: "#DC2626", fontSize: 13, padding: "8px 12px", background: "rgba(220,38,38,0.08)", borderRadius: 8, marginBottom: 8, border: "1px solid rgba(220,38,38,0.2)" }}>{error}</div>}
      <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8 }}>
        <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 8, background: "transparent", border: "1px solid #E2E8F0", color: "#64748B", cursor: "pointer", fontSize: 14, fontWeight: 500 }}>Cancel</button>
        <button onClick={handleSave} style={{ padding: "10px 24px", borderRadius: 8, background: "linear-gradient(135deg,#8B5CF6,#A78BFA)", border: "none", color: "#FFF", cursor: "pointer", fontSize: 14, fontWeight: 600, boxShadow: "0 4px 15px rgba(139,92,246,0.3)" }}>{entry ? "Save Changes" : "Add Agent"}</button>
      </div>
    </>
  );
}

function DailyCap({ user, onLogout, onNav, onAdmin, entries, setEntries, crgDeals, onRefresh, userAccess }) {
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [delConfirm, setDelConfirm] = useState(null);
  const [newDayDate, setNewDayDate] = useState(null);
  const [dcSort, setDcSort] = useState("manual");

  // Auto-sync Daily Cap from CRG Deals
  // manageAff + cap → agent Affiliates
  // madeSale + cap → agent Brands
  const syncFromCRG = () => {
    if (!crgDeals || crgDeals.length === 0) return;

    // Build a map: { date: { agentName: { affiliates: sum, brands: sum } } }
    const capMap = {};
    crgDeals.forEach(deal => {
      const date = deal.date;
      if (!date) return;
      const capVal = parseInt(deal.cap) || 0;
      if (capVal === 0) return;

      if (!capMap[date]) capMap[date] = {};

      // manageAff → affiliates
      const mAff = (deal.manageAff || "").trim();
      if (mAff) {
        if (!capMap[date][mAff]) capMap[date][mAff] = { affiliates: 0, brands: 0 };
        capMap[date][mAff].affiliates += capVal;
      }

      // madeSale → brands
      const mSale = (deal.madeSale || "").trim();
      if (mSale) {
        if (!capMap[date][mSale]) capMap[date][mSale] = { affiliates: 0, brands: 0 };
        capMap[date][mSale].brands += capVal;
      }
    });

    // Now update/create entries
    setEntries(prev => {
      const updated = [...prev];
      const existingMap = {};
      updated.forEach((e, i) => {
        const key = `${e.date}__${(e.agent || "").trim()}`;
        existingMap[key] = i;
      });

      Object.keys(capMap).forEach(date => {
        Object.keys(capMap[date]).forEach(agent => {
          const { affiliates, brands } = capMap[date][agent];
          const key = `${date}__${agent}`;
          if (existingMap[key] !== undefined) {
            // Update existing
            const idx = existingMap[key];
            updated[idx] = { ...updated[idx], affiliates: String(affiliates), brands: String(brands) };
          } else {
            // Create new
            updated.push({ id: genId(), agent, affiliates: String(affiliates), brands: String(brands), date });
            existingMap[key] = updated.length - 1;
          }
        });
      });

      return updated;
    });
  };

  // Auto-sync when crgDeals change
  useEffect(() => {
    syncFromCRG();
  }, [crgDeals]);

  const allDates = [...new Set(entries.map(d => d.date).filter(Boolean))].sort();
  const latestDate = allDates[allDates.length - 1] || new Date().toISOString().split("T")[0];
  const today = new Date().toISOString().split("T")[0];
  const tomorrow = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split("T")[0]; })();

  const handleCopyPrevDay = (targetDate) => {
    const prevDayEntries = entries.filter(d => d.date === latestDate);
    if (prevDayEntries.length === 0) return;
    const newEntries = prevDayEntries.map(d => ({
      ...d, id: genId(), date: targetDate,
      affiliates: "", brands: "",
    }));
    setEntries(prev => [...prev, ...newEntries]);
  };

  const handleDcMove = (id, direction) => {
    setEntries(prev => {
      const arr = [...prev];
      const idx = arr.findIndex(d => d.id === id);
      if (idx < 0) return prev;
      const item = arr[idx];
      const dateKey = item.date;
      const dateIndices = arr.map((d, i) => d.date === dateKey ? i : -1).filter(i => i >= 0);
      const posInDate = dateIndices.indexOf(idx);
      if (direction === "up" && posInDate > 0) {
        const swapIdx = dateIndices[posInDate - 1];
        [arr[idx], arr[swapIdx]] = [arr[swapIdx], arr[idx]];
      } else if (direction === "down" && posInDate < dateIndices.length - 1) {
        const swapIdx = dateIndices[posInDate + 1];
        [arr[idx], arr[swapIdx]] = [arr[swapIdx], arr[idx]];
      }
      return arr;
    });
  };

  const handleDcSortAlpha = () => {
    if (dcSort === "alpha") { setDcSort("manual"); return; }
    setDcSort("alpha");
    setEntries(prev => {
      const dateOrder = [...new Set(prev.map(d => d.date || "Unknown"))];
      const sorted = [];
      dateOrder.forEach(dk => {
        const items = prev.filter(d => (d.date || "Unknown") === dk);
        items.sort((a, b) => (a.agent || "").localeCompare(b.agent || "", undefined, { numeric: true }));
        sorted.push(...items);
      });
      return sorted;
    });
  };

  const matchSearch = d => {
    if (!search) return true;
    return (d.agent || "").toLowerCase().includes(search.toLowerCase());
  };

  const filtered = entries.filter(matchSearch);

  // Group by date
  const grouped = {};
  filtered.forEach(d => {
    const key = d.date || "Unknown";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(d);
  });
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a)); // newest first

  const fmtDate = ds => {
    if (!ds || ds === "Unknown") return "Unknown";
    const d = new Date(ds + "T00:00:00");
    return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}`;
  };

  const handleSave = form => {
    if (editEntry) {
      setEntries(prev => prev.map(d => d.id === editEntry.id ? { ...editEntry, ...form } : d));
    } else {
      setEntries(prev => [...prev, { ...form, id: genId() }]);
    }
    setModalOpen(false);
    setEditEntry(null);
    setNewDayDate(null);
  };

  const handleDelete = id => { setEntries(prev => prev.filter(d => d.id !== id)); setDelConfirm(null); };

  const grandAff = filtered.reduce((s, d) => s + (parseInt(d.affiliates) || 0), 0);
  const grandBrands = filtered.reduce((s, d) => s + (parseInt(d.brands) || 0), 0);

  return (
    <div style={{ minHeight: "100vh", background: "#F1F5F9", fontFamily: "'DM Sans','Segoe UI',sans-serif", color: "#0F172A" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />
      <BlitzHeader user={user} activePage="dailycap" userAccess={userAccess} onNav={onNav} onAdmin={() => onNav("admin")} onRefresh={onRefresh} onLogout={onLogout} accentColor="#8B5CF6" />

      <main className="blitz-main" style={{ maxWidth: 900, margin: "0 auto", padding: "28px 32px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Daily Cap</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ position: "relative" }}>
              <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94A3B8" }}>{I.search}</div>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search agent..."
                style={{ ...inp, paddingLeft: 40, background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 10, fontSize: 14, width: 220 }} />
            </div>
            <button onClick={syncFromCRG} title="Recalculate from CRG Deals"
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", background: "transparent", border: "2px solid #F59E0B", borderRadius: 10, color: "#F59E0B", cursor: "pointer", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}
              onMouseEnter={e => { e.currentTarget.style.background = "#F59E0B"; e.currentTarget.style.color = "#FFF"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#F59E0B"; }}
            >🔄 Sync CRG</button>
            <button onClick={() => { setEditEntry(null); setNewDayDate(today); setModalOpen(true); }}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", background: "linear-gradient(135deg,#8B5CF6,#A78BFA)", border: "none", borderRadius: 10, color: "#FFF", cursor: "pointer", fontSize: 14, fontWeight: 600, boxShadow: "0 4px 20px rgba(139,92,246,0.3)", whiteSpace: "nowrap" }}
            >{I.plus} New Agent</button>
          </div>
        </div>

        {/* Day action buttons */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
          <button onClick={() => { setEditEntry(null); setNewDayDate(today); setModalOpen(true); }}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "#10B981", border: "none", borderRadius: 8, color: "#FFF", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
          >📅 New Entry (Today)</button>
          <button onClick={() => { setEditEntry(null); setNewDayDate(tomorrow); setModalOpen(true); }}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "#6366F1", border: "none", borderRadius: 8, color: "#FFF", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
          >📅 New Entry (Tomorrow)</button>
          <button onClick={() => handleCopyPrevDay(today)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "transparent", border: "2px solid #8B5CF6", borderRadius: 8, color: "#8B5CF6", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
          >📋 Copy Last Day → Today</button>
          <button onClick={() => handleCopyPrevDay(tomorrow)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "transparent", border: "2px solid #6366F1", borderRadius: 8, color: "#6366F1", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
          >📋 Copy Last Day → Tomorrow</button>
          <button onClick={handleDcSortAlpha}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: dcSort === "alpha" ? "#0EA5E9" : "transparent", border: `2px solid ${dcSort === "alpha" ? "#0EA5E9" : "#94A3B8"}`, borderRadius: 8, color: dcSort === "alpha" ? "#FFF" : "#64748B", cursor: "pointer", fontSize: 13, fontWeight: 600, marginLeft: "auto" }}
          >{dcSort === "alpha" ? "✓ A→Z Sorted" : "A→Z Sort"}</button>
        </div>

        {/* Summary cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 16, marginBottom: 28 }}>
          {[
            { label: "Affiliates", value: grandAff, accent: "#8B5CF6", bg: "#F5F3FF" },
            { label: "Brands", value: grandBrands, accent: "#0EA5E9", bg: "#EFF6FF" },
            { label: "Total", value: grandAff + grandBrands, accent: "#10B981", bg: "#ECFDF5" },
          ].map((c, i) => (
            <div key={i} style={{ background: c.bg, border: "1px solid #E2E8F0", borderRadius: 14, padding: "20px 22px", position: "relative", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: c.accent }} />
              <div style={{ fontSize: 11, color: "#64748B", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>{c.label}</div>
              <div style={{ fontSize: 28, fontWeight: 800, fontFamily: "'Space Mono',monospace", color: c.accent }}>{c.value}</div>
            </div>
          ))}
        </div>

        {sortedDates.map(dateKey => {
          const items = grouped[dateKey];
          const sortedItems = dcSort === "alpha"
            ? [...items].sort((a, b) => (a.agent || "").localeCompare(b.agent || "", undefined, { numeric: true }))
            : items;
          const dayAff = sortedItems.reduce((s, d) => s + (parseInt(d.affiliates) || 0), 0);
          const dayBrands = sortedItems.reduce((s, d) => s + (parseInt(d.brands) || 0), 0);
          const dayTotal = dayAff + dayBrands;

          return (
            <GroupHeader key={dateKey} icon={I.calendar} title={fmtDate(dateKey)} count={sortedItems.length} total={dayTotal} accentColor="#8B5CF6" defaultOpen={true}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                  <thead>
                    <tr style={{ background: "#F8FAFC" }}>
                      {["Agent","Affiliates","Brands","Total","Actions"].map(h =>
                        <th key={h} style={{ padding: "12px 16px", textAlign: h === "Agent" ? "left" : "center", color: "#64748B", fontSize: 12, fontWeight: 700, borderBottom: "2px solid #E2E8F0", borderRight: "1px solid #F1F5F9", whiteSpace: "nowrap" }}>{h}</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedItems.map((d, rowIdx) => {
                      const t = (parseInt(d.affiliates) || 0) + (parseInt(d.brands) || 0);
                      return (
                        <tr key={d.id} style={{ borderBottom: "1px solid #F1F5F9", transition: "background 0.15s" }}
                          onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                          <td style={{ padding: "12px 16px", borderRight: "1px solid #F1F5F9" }}>
                            <span onClick={() => { setEditEntry(d); setModalOpen(true); }} style={{ cursor: "pointer", color: "#0EA5E9", textDecoration: "underline", textDecorationColor: "rgba(14,165,233,0.3)", textUnderlineOffset: 3, fontWeight: 700, fontSize: 15 }}
                              onMouseEnter={e => e.currentTarget.style.textDecorationColor = "#0EA5E9"}
                              onMouseLeave={e => e.currentTarget.style.textDecorationColor = "rgba(14,165,233,0.3)"}
                            >{d.agent}</span>
                          </td>
                          <td style={{ padding: "12px 16px", textAlign: "center", fontFamily: "'Space Mono',monospace", fontWeight: 700, fontSize: 16, color: d.affiliates ? "#8B5CF6" : "#CBD5E1", borderRight: "1px solid #F1F5F9" }}>{d.affiliates || ""}</td>
                          <td style={{ padding: "12px 16px", textAlign: "center", fontFamily: "'Space Mono',monospace", fontWeight: 700, fontSize: 16, color: d.brands ? "#0EA5E9" : "#CBD5E1", borderRight: "1px solid #F1F5F9" }}>{d.brands || ""}</td>
                          <td style={{ padding: "12px 16px", textAlign: "center", fontFamily: "'Space Mono',monospace", fontWeight: 800, fontSize: 16, color: "#0F172A", borderRight: "1px solid #F1F5F9" }}>{t || ""}</td>
                          <td style={{ padding: "8px 8px", textAlign: "center" }}>
                            <div style={{ display: "flex", gap: 4, justifyContent: "center", alignItems: "center" }}>
                              {dcSort !== "alpha" && <>
                                <button onClick={() => handleDcMove(d.id, "up")} title="Move up" disabled={rowIdx === 0}
                                  style={{ background: "none", border: "1px solid #E2E8F0", borderRadius: 4, padding: "2px 4px", cursor: rowIdx === 0 ? "default" : "pointer", color: rowIdx === 0 ? "#E2E8F0" : "#64748B", display: "flex", fontSize: 11 }}>▲</button>
                                <button onClick={() => handleDcMove(d.id, "down")} title="Move down" disabled={rowIdx === sortedItems.length - 1}
                                  style={{ background: "none", border: "1px solid #E2E8F0", borderRadius: 4, padding: "2px 4px", cursor: rowIdx === sortedItems.length - 1 ? "default" : "pointer", color: rowIdx === sortedItems.length - 1 ? "#E2E8F0" : "#64748B", display: "flex", fontSize: 11 }}>▼</button>
                              </>}
                              <button onClick={() => { setEditEntry(d); setModalOpen(true); }} title="Edit" style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 6, padding: 5, cursor: "pointer", color: "#2563EB", display: "flex" }}>{I.edit}</button>
                              <button onClick={() => setDelConfirm(d.id)} title="Delete" style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 6, padding: 5, cursor: "pointer", color: "#DC2626", display: "flex" }}>{I.trash}</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 24, padding: "12px 16px", background: "#F8FAFC", borderTop: "2px solid #E2E8F0" }}>
                  <span style={{ fontFamily: "'Space Mono',monospace", fontWeight: 700, fontSize: 14 }}><span style={{ color: "#64748B" }}>Affiliates:</span> <span style={{ color: "#8B5CF6" }}>{dayAff}</span></span>
                  <span style={{ fontFamily: "'Space Mono',monospace", fontWeight: 700, fontSize: 14 }}><span style={{ color: "#64748B" }}>Brands:</span> <span style={{ color: "#0EA5E9" }}>{dayBrands}</span></span>
                  <span style={{ fontFamily: "'Space Mono',monospace", fontWeight: 800, fontSize: 14 }}><span style={{ color: "#64748B" }}>Total:</span> {dayTotal}</span>
                </div>
              </div>
            </GroupHeader>
          );
        })}

        {sortedDates.length === 0 && <div style={{ padding: "60px 16px", textAlign: "center", color: "#94A3B8", fontSize: 15 }}>No entries yet. Click "New Agent" to add one.</div>}
      </main>

      {modalOpen && (
        <Modal title={editEntry ? "Edit Agent" : "New Agent"} onClose={() => { setModalOpen(false); setEditEntry(null); setNewDayDate(null); }}>
          <DCForm entry={editEntry} onSave={handleSave} onClose={() => { setModalOpen(false); setEditEntry(null); setNewDayDate(null); }} defaultDate={newDayDate} />
        </Modal>
      )}
      {delConfirm && (
        <Modal title="Delete Agent" onClose={() => setDelConfirm(null)}>
          <p style={{ color: "#475569", marginBottom: 24, fontSize: 15 }}>Are you sure? This can't be undone.</p>
          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
            <button onClick={() => setDelConfirm(null)} style={{ padding: "10px 20px", borderRadius: 8, background: "transparent", border: "1px solid #E2E8F0", color: "#64748B", cursor: "pointer", fontSize: 14 }}>Cancel</button>
            <button onClick={() => handleDelete(delConfirm)} style={{ padding: "10px 24px", borderRadius: 8, background: "linear-gradient(135deg,#EF4444,#F87171)", border: "none", color: "#FFF", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>Delete</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ── Deals Page ── */
const DEALS_INITIAL = [
  { id: genId(), affiliate: "17", country: "DE", price: "1800", crg: "15", dealType: "CRG", deduction: "Upto 5%", funnels: "Immediate mix", source: "Google", date: "2026-02-22" },
  { id: genId(), affiliate: "17", country: "JP", price: "1450", crg: "112", dealType: "CRG", deduction: "Upto 10%", funnels: "Quantum", source: "Twitter", date: "2026-02-22" },
  { id: genId(), affiliate: "14", country: "BR", price: "750", crg: "4", dealType: "CRG", deduction: "Upto 5%", funnels: "Trade Pro Air", source: "Google", date: "2026-02-22" },
  { id: genId(), affiliate: "71", country: "FR", price: "1250", crg: "10", dealType: "CRG", deduction: "Upto 10%", funnels: "Bitradeproai", source: "Google", date: "2026-02-22" },
  { id: genId(), affiliate: "71", country: "KR", price: "1300", crg: "8", dealType: "CRG", deduction: "", funnels: "Immediaterise", source: "Google", date: "2026-02-22" },
  { id: genId(), affiliate: "86", country: "PL", price: "1350", crg: "12", dealType: "CRG", deduction: "", funnels: "Google Finance AI", source: "", date: "2026-02-22" },
  { id: genId(), affiliate: "86", country: "DK", price: "1450", crg: "13", dealType: "CRG", deduction: "", funnels: "Google Finance AI", source: "", date: "2026-02-22" },
  { id: genId(), affiliate: "28", country: "IT", price: "1450", crg: "12", dealType: "CRG", deduction: "", funnels: "Passive income", source: "Google", date: "2026-02-22" },
  { id: genId(), affiliate: "28", country: "AU", price: "1350", crg: "12", dealType: "CRG", deduction: "", funnels: "Passive income", source: "Google", date: "2026-02-22" },
  { id: genId(), affiliate: "28", country: "SE", price: "1450", crg: "12", dealType: "CRG", deduction: "", funnels: "Passive income", source: "Google", date: "2026-02-22" },
  { id: genId(), affiliate: "28", country: "NL", price: "1450", crg: "12", dealType: "CRG", deduction: "", funnels: "Passive income", source: "Google", date: "2026-02-22" },
  { id: genId(), affiliate: "28", country: "FI", price: "1450", crg: "12", dealType: "CRG", deduction: "", funnels: "Passive income", source: "Google", date: "2026-02-22" },
];

function DealsForm({ deal, onSave, onClose }) {
  const [f, setF] = useState(deal || { affiliate: "", country: "", price: "", crg: "", dealType: "CRG", funnels: "", source: "", deduction: "", date: new Date().toISOString().split("T")[0] });
  const [error, setError] = useState("");
  const s = (k, v) => { setF(p => ({ ...p, [k]: v })); setError(""); };

  const handleSave = () => {
    if (!f.affiliate.trim()) { setError("Affiliate is required"); return; }
    if (!f.price) { setError("Price is required"); return; }
    onSave(f);
  };

  return (
    <>
      <div className="blitz-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
        <Field label="Affiliate (number)">
          <input style={inp} value={f.affiliate} onChange={e => { const v = e.target.value.replace(/\D/g, "").slice(0, 3); s("affiliate", v); }} placeholder="e.g. 17" maxLength={3} />
        </Field>
        <Field label="Country">
          <input style={inp} value={f.country} onChange={e => { const v = e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 2); s("country", v); }} placeholder="e.g. DE" maxLength={2} />
        </Field>
        <Field label="Price ($)">
          <input style={inp} type="number" value={f.price} onChange={e => s("price", e.target.value)} placeholder="e.g. 1800" />
        </Field>
        <Field label="CRG">
          <input style={inp} type="number" value={f.crg} onChange={e => s("crg", e.target.value)} placeholder="e.g. 15" />
        </Field>
        <Field label="Deal Type">
          <select style={{ ...inp, cursor: "pointer" }} value={f.dealType || "CRG"} onChange={e => s("dealType", e.target.value)}>
            <option value="CRG">CRG</option>
            <option value="CPA">CPA</option>
            <option value="Hybrid">Hybrid</option>
          </select>
        </Field>
        <Field label="Deduction">
          <input style={inp} value={f.deduction || ""} onChange={e => s("deduction", e.target.value)} placeholder="e.g. Upto 5% or leave empty" />
        </Field>
        <Field label="Funnels">
          <input style={inp} value={f.funnels || ""} onChange={e => s("funnels", e.target.value)} placeholder="e.g. Immediate mix, Quantum" />
        </Field>
        <Field label="Source">
          <input style={inp} value={f.source || ""} onChange={e => s("source", e.target.value)} placeholder="e.g. Google, Twitter" />
        </Field>
        <Field label="Date">
          <input style={inp} type="date" value={f.date || ""} onChange={e => s("date", e.target.value)} />
        </Field>
      </div>
      {error && <div style={{ color: "#DC2626", fontSize: 13, padding: "8px 12px", background: "rgba(220,38,38,0.08)", borderRadius: 8, marginBottom: 8, border: "1px solid rgba(220,38,38,0.2)" }}>{error}</div>}
      <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8 }}>
        <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 8, background: "transparent", border: "1px solid #E2E8F0", color: "#64748B", cursor: "pointer", fontSize: 14, fontWeight: 500 }}>Cancel</button>
        <button onClick={handleSave} style={{ padding: "10px 24px", borderRadius: 8, background: "linear-gradient(135deg,#10B981,#34D399)", border: "none", color: "#FFF", cursor: "pointer", fontSize: 14, fontWeight: 600, boxShadow: "0 4px 15px rgba(16,185,129,0.3)" }}>{deal ? "Save Changes" : "Add Deal"}</button>
      </div>
    </>
  );
}

function DealsPage({ user, onLogout, onNav, onAdmin, deals, setDeals, onRefresh, userAccess }) {
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editDeal, setEditDeal] = useState(null);
  const [delConfirm, setDelConfirm] = useState(null);
  const [sortCol, setSortCol] = useState(null); // null | "affiliate" | "country" | "price" | "crg" | "funnels" | "source" | "deduction"
  const [sortDir, setSortDir] = useState("asc"); // "asc" | "desc"

  const handleColumnSort = col => {
    if (sortCol === col) {
      if (sortDir === "asc") setSortDir("desc");
      else { setSortCol(null); setSortDir("asc"); } // third click = clear sort
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  };

  const handleMove = (dealId, direction) => {
    setDeals(prev => {
      const arr = [...prev];
      const idx = arr.findIndex(d => d.id === dealId);
      if (idx < 0) return prev;
      if (direction === "up" && idx > 0) [arr[idx], arr[idx - 1]] = [arr[idx - 1], arr[idx]];
      if (direction === "down" && idx < arr.length - 1) [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
      return arr;
    });
  };

  const handleSave = form => {
    if (editDeal) {
      setDeals(prev => prev.map(d => d.id === editDeal.id ? { ...editDeal, ...form } : d));
    } else {
      setDeals(prev => [...prev, { ...form, id: genId() }]);
    }
    setModalOpen(false);
    setEditDeal(null);
  };

  const handleDelete = id => { setDeals(prev => prev.filter(d => d.id !== id)); setDelConfirm(null); };

  const matchSearch = d => {
    if (!search) return true;
    const q = search.toLowerCase();
    return [d.affiliate, d.country, d.funnels, d.source, d.dealType, d.deduction].some(v => (v || "").toLowerCase().includes(q));
  };

  const filtered = deals.filter(matchSearch);
  const sorted = (() => {
    if (!sortCol) return filtered;
    const arr = [...filtered];
    const numCols = ["price", "crg", "affiliate"];
    const isNum = numCols.includes(sortCol);
    arr.sort((a, b) => {
      const va = a[sortCol] || "";
      const vb = b[sortCol] || "";
      let cmp;
      if (isNum) cmp = (parseFloat(va) || 0) - (parseFloat(vb) || 0);
      else cmp = va.localeCompare(vb, undefined, { numeric: true, sensitivity: "base" });
      return sortDir === "desc" ? -cmp : cmp;
    });
    return arr;
  })();

  return (
    <div style={{ minHeight: "100vh", background: "#F1F5F9", fontFamily: "'DM Sans','Segoe UI',sans-serif", color: "#0F172A" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />
      <BlitzHeader user={user} activePage="deals" userAccess={userAccess} onNav={onNav} onAdmin={() => onNav("admin")} onRefresh={onRefresh} onLogout={onLogout} accentColor="#10B981" />

      <main className="blitz-main" style={{ maxWidth: 1400, margin: "0 auto", padding: "28px 32px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Deals</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, maxWidth: 600, marginLeft: 24 }}>
            <div style={{ position: "relative", flex: 1 }}>
              <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94A3B8" }}>{I.search}</div>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search deals..."
                style={{ ...inp, paddingLeft: 40, background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 10, fontSize: 14 }} />
            </div>
            {sortCol && <button onClick={() => { setSortCol(null); setSortDir("asc"); }}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", background: "#10B981", border: "none", borderRadius: 10, color: "#FFF", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
            >↕ Sort: {sortCol} {sortDir === "asc" ? "↑" : "↓"} ✕</button>}
            <button onClick={() => { setEditDeal(null); setModalOpen(true); }}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", background: "linear-gradient(135deg,#10B981,#34D399)", border: "none", borderRadius: 10, color: "#FFF", cursor: "pointer", fontSize: 14, fontWeight: 600, boxShadow: "0 4px 20px rgba(16,185,129,0.3)", whiteSpace: "nowrap" }}
            >{I.plus} New Deal</button>
          </div>
        </div>

        {/* Summary */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16, marginBottom: 28, maxWidth: 300 }}>
          <div style={{ background: "#ECFDF5", border: "1px solid #E2E8F0", borderRadius: 14, padding: "20px 22px", position: "relative", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: "#10B981" }} />
            <div style={{ fontSize: 11, color: "#64748B", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Total Deals</div>
            <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "'Space Mono',monospace", color: "#10B981" }}>{filtered.length}</div>
          </div>
        </div>

        {/* Table */}
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ background: "#F8FAFC" }}>
                  {[
                    { key: "affiliate", label: "Client" },
                    { key: "country", label: "Country" },
                    { key: "price", label: "Price" },
                    { key: "crg", label: "CRG" },
                    { key: "dealType", label: "Deal Type" },
                    { key: "deduction", label: "Deductions" },
                    { key: "funnels", label: "Funnels" },
                    { key: "source", label: "Source" },
                    { key: "date", label: "Date" },
                    { key: null, label: "Actions" },
                  ].map(h =>
                    <th key={h.label} onClick={h.key ? () => handleColumnSort(h.key) : undefined}
                      style={{ padding: "12px 14px", textAlign: h.label === "Funnels" || h.label === "Source" ? "left" : "center", color: sortCol === h.key ? "#0F172A" : "#64748B", fontSize: 12, fontWeight: 700, borderBottom: "2px solid #E2E8F0", borderRight: "1px solid #F1F5F9", whiteSpace: "nowrap", cursor: h.key ? "pointer" : "default", userSelect: "none", background: sortCol === h.key ? "#E2E8F0" : "transparent", transition: "background 0.15s" }}
                      onMouseEnter={e => { if (h.key) e.currentTarget.style.background = "#E2E8F0"; }}
                      onMouseLeave={e => { if (h.key) e.currentTarget.style.background = sortCol === h.key ? "#E2E8F0" : "transparent"; }}
                    >
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        {h.label}
                        {h.key && sortCol === h.key && <span style={{ fontSize: 14, color: "#0EA5E9" }}>{sortDir === "asc" ? "▲" : "▼"}</span>}
                        {h.key && sortCol !== h.key && <span style={{ fontSize: 10, color: "#CBD5E1", marginLeft: 2 }}>↕</span>}
                      </span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 && (
                  <tr><td colSpan={10} style={{ padding: "40px 16px", textAlign: "center", color: "#94A3B8", fontSize: 14 }}>No deals yet. Click "New Deal" to add one.</td></tr>
                )}
                {sorted.map((d, i) => (
                  <tr key={d.id} style={{ borderBottom: "1px solid #F1F5F9", transition: "background 0.15s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    {/* Client: affiliate + country */}
                    <td style={{ padding: "12px 14px", textAlign: "center", fontWeight: 700, fontSize: 15, borderRight: "1px solid #F1F5F9" }}>
                      <span onClick={() => { setEditDeal(d); setModalOpen(true); }} style={{ cursor: "pointer", color: "#0EA5E9", textDecoration: "underline", textDecorationColor: "rgba(14,165,233,0.3)", textUnderlineOffset: 3 }}
                        onMouseEnter={e => e.currentTarget.style.textDecorationColor = "#0EA5E9"}
                        onMouseLeave={e => e.currentTarget.style.textDecorationColor = "rgba(14,165,233,0.3)"}
                      >{d.affiliate}</span>
                    </td>
                    {/* Country badge */}
                    <td style={{ padding: "12px 14px", textAlign: "center", borderRight: "1px solid #F1F5F9" }}>
                      {d.country ? <span style={{ background: "#EFF6FF", color: "#2563EB", padding: "3px 10px", borderRadius: 4, fontSize: 13, fontWeight: 700 }}>{d.country}</span> : ""}
                    </td>
                    {/* Price */}
                    <td style={{ padding: "12px 14px", textAlign: "center", fontFamily: "'Space Mono',monospace", fontWeight: 800, fontSize: 15, color: "#0F172A", borderRight: "1px solid #F1F5F9" }}>
                      {d.price ? `${parseFloat(d.price).toLocaleString("en-US")}` : ""}
                    </td>
                    {/* CRG */}
                    <td style={{ padding: "12px 14px", textAlign: "center", fontFamily: "'Space Mono',monospace", fontWeight: 700, fontSize: 14, borderRight: "1px solid #F1F5F9" }}>
                      {d.crg || ""}
                    </td>
                    {/* Deal Type */}
                    <td style={{ padding: "12px 14px", textAlign: "center", borderRight: "1px solid #F1F5F9" }}>
                      <span style={{ background: "#0EA5E9", color: "#FFF", padding: "4px 14px", borderRadius: 4, fontSize: 13, fontWeight: 700, letterSpacing: 0.5 }}>{d.dealType || "CRG"}</span>
                    </td>
                    {/* Deductions */}
                    <td style={{ padding: "12px 14px", textAlign: "center", fontSize: 13, fontWeight: 600, borderRight: "1px solid #F1F5F9" }}>
                      {d.deduction ? <span style={{ background: "#FEF3C7", color: "#92400E", padding: "4px 12px", borderRadius: 4 }}>{d.deduction}</span> : <span style={{ color: "#CBD5E1" }}>Not specified</span>}
                    </td>
                    {/* Funnels */}
                    <td style={{ padding: "12px 14px", fontSize: 13, color: "#334155", borderRight: "1px solid #F1F5F9", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.funnels || ""}</td>
                    {/* Source */}
                    <td style={{ padding: "12px 14px", fontSize: 13, color: "#334155", borderRight: "1px solid #F1F5F9", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.source || ""}</td>
                    {/* Date */}
                    <td style={{ padding: "12px 14px", textAlign: "center", fontSize: 12, color: "#64748B", borderRight: "1px solid #F1F5F9", whiteSpace: "nowrap" }}>
                      {d.date ? (() => { const dt = new Date(d.date + "T00:00:00"); return `${String(dt.getDate()).padStart(2,"0")}/${String(dt.getMonth()+1).padStart(2,"0")}/${dt.getFullYear()}`; })() : ""}
                    </td>
                    {/* Actions */}
                    <td style={{ padding: "8px 8px" }}>
                      <div style={{ display: "flex", gap: 4, alignItems: "center", justifyContent: "center" }}>
                        {!sortCol && <>
                          <button onClick={() => handleMove(d.id, "up")} title="Move up" disabled={i === 0}
                            style={{ background: "none", border: "1px solid #E2E8F0", borderRadius: 4, padding: "2px 4px", cursor: i === 0 ? "default" : "pointer", color: i === 0 ? "#E2E8F0" : "#64748B", display: "flex", fontSize: 11 }}>▲</button>
                          <button onClick={() => handleMove(d.id, "down")} title="Move down" disabled={i === sorted.length - 1}
                            style={{ background: "none", border: "1px solid #E2E8F0", borderRadius: 4, padding: "2px 4px", cursor: i === sorted.length - 1 ? "default" : "pointer", color: i === sorted.length - 1 ? "#E2E8F0" : "#64748B", display: "flex", fontSize: 11 }}>▼</button>
                        </>}
                        <button onClick={() => { setEditDeal(d); setModalOpen(true); }} title="Edit" style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 6, padding: 5, cursor: "pointer", color: "#2563EB", display: "flex" }}>{I.edit}</button>
                        <button onClick={() => setDelConfirm(d.id)} title="Delete" style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 6, padding: 5, cursor: "pointer", color: "#DC2626", display: "flex" }}>{I.trash}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Footer */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 24, padding: "12px 20px", background: "#F8FAFC", borderTop: "2px solid #E2E8F0", flexWrap: "wrap" }}>
            <span style={{ padding: "5px 16px", borderRadius: 20, background: "#10B981", color: "#FFF", fontWeight: 700, fontSize: 13 }}>{filtered.length} deals</span>
          </div>
        </div>
      </main>

      {modalOpen && (
        <Modal title={editDeal ? "Edit Deal" : "New Deal"} onClose={() => { setModalOpen(false); setEditDeal(null); }}>
          <DealsForm deal={editDeal} onSave={handleSave} onClose={() => { setModalOpen(false); setEditDeal(null); }} />
        </Modal>
      )}
      {delConfirm && (
        <Modal title="Delete Deal" onClose={() => setDelConfirm(null)}>
          <p style={{ color: "#475569", marginBottom: 24, fontSize: 15 }}>Are you sure? This can't be undone.</p>
          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
            <button onClick={() => setDelConfirm(null)} style={{ padding: "10px 20px", borderRadius: 8, background: "transparent", border: "1px solid #E2E8F0", color: "#64748B", cursor: "pointer", fontSize: 14 }}>Cancel</button>
            <button onClick={() => handleDelete(delConfirm)} style={{ padding: "10px 24px", borderRadius: 8, background: "linear-gradient(135deg,#EF4444,#F87171)", border: "none", color: "#FFF", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>Delete</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ── App ── */

// Session management with token
function generateSessionToken() {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
}

function getSession() {
  try {
    const s = localStorage.getItem('blitz_session');
    if (!s) return null;
    const session = JSON.parse(s);
    // Session expires after 7 days
    if (Date.now() - session.loginTime > 7 * 24 * 60 * 60 * 1000) {
      localStorage.removeItem('blitz_session');
      return null;
    }
    return session;
  } catch { return null; }
}

function saveSession(user) {
  const session = {
    email: user.email,
    name: user.name,
    token: generateSessionToken(),
    loginTime: Date.now(),
  };
  localStorage.setItem('blitz_session', JSON.stringify(session));
  return session;
}

function clearSession() {
  localStorage.removeItem('blitz_session');
}

export default function App() {
  const [user, setUser] = useState(() => {
    const session = getSession();
    return session ? { email: session.email, name: session.name } : null;
  });
  const [users, setUsers] = useState(() => lsGet('users', INITIAL_USERS));
  const [payments, setPayments] = useState(() => lsGet('payments', INITIAL));
  const [cpPayments, setCpPayments] = useState(() => lsGet('customer-payments', CP_INITIAL));
  const [crgDeals, setCrgDeals] = useState(() => lsGet('crg-deals', CRG_INITIAL));
  const [dcEntries, setDcEntries] = useState(() => lsGet('daily-cap', DC_INITIAL));
  const [dealsData, setDealsData] = useState(() => lsGet('deals', DEALS_INITIAL));
  const [walletsData, setWalletsData] = useState(() => lsGet('wallets', [{ id: genId(), date: "2026-02-19", trc: "TAXupFc6A9Svhy22bJn7QQzPaLtZ6tGQ15", erc: "0xbF7178Bd7526C25387df412cbe12927b593E31E5", btc: "bc1qqhtk4fhlnkf7sv768jdss5da7ce0wnpue6ltwd" }]));
  const [page, setPage] = useState("dashboard");
  const [loaded, setLoaded] = useState(false);
  const [syncBanner, setSyncBanner] = useState(null); // null | "pushing" | "synced" | "offline"
  const skipSave = useRef(true);

  // On startup: connect to server and sync
  // PRIORITY: Server data > localStorage > hardcoded defaults
  // NEVER overwrite real data with hardcoded defaults
  useEffect(() => {
    (async () => {
      skipSave.current = true;

      // Step 1: Try to reach the server
      const [u, p, cp, crg, dc, dl, wl] = await Promise.all([
        apiGet('users'), apiGet('payments'), apiGet('customer-payments'), apiGet('crg-deals'), apiGet('daily-cap'), apiGet('deals'), apiGet('wallets'),
      ]);

      // Step 2: Get localStorage data
      const lu = lsGet('users', null);
      const lp = lsGet('payments', null);
      const lcp = lsGet('customer-payments', null);
      const lcrg = lsGet('crg-deals', null);
      const ldc = lsGet('daily-cap', null);
      const ldl = lsGet('deals', null);
      const lwl = lsGet('wallets', null);

      if (serverOnline) {
        const serverHasData = [u, p, cp, crg, dc, dl, wl].some(d => d !== null && d.length > 0);
        const localHasData = [lu, lp, lcp, lcrg, ldc, ldl, lwl].some(d => d !== null && d.length > 0);

        if (serverHasData) {
          // Server has data — use it as truth for tables that have data
          if (u !== null && u.length > 0) setUsers(u);
          if (p !== null && p.length > 0) setPayments(p);
          if (cp !== null && cp.length > 0) setCpPayments(cp);
          if (crg !== null && crg.length > 0) setCrgDeals(crg);
          if (dc !== null && dc.length > 0) setDcEntries(dc);
          if (dl !== null && dl.length > 0) setDealsData(dl);
          if (wl !== null && wl.length > 0) setWalletsData(wl);

          // For any tables empty on server but we have local/initial data — push them up
          const pushTasks = [];
          if ((!u || u.length === 0) && lu && lu.length > 0) { setUsers(lu); pushTasks.push(apiSave('users', lu)); }
          if ((!p || p.length === 0) && lp && lp.length > 0) { setPayments(lp); pushTasks.push(apiSave('payments', lp)); }
          if ((!cp || cp.length === 0) && lcp && lcp.length > 0) { setCpPayments(lcp); pushTasks.push(apiSave('customer-payments', lcp)); }
          if ((!crg || crg.length === 0) && lcrg && lcrg.length > 0) { setCrgDeals(lcrg); pushTasks.push(apiSave('crg-deals', lcrg)); }
          if ((!dc || dc.length === 0) && ldc && ldc.length > 0) { setDcEntries(ldc); pushTasks.push(apiSave('daily-cap', ldc)); }
          if ((!dl || dl.length === 0)) {
            const localDeals = ldl && ldl.length > 0 ? ldl : DEALS_INITIAL;
            setDealsData(localDeals);
            pushTasks.push(apiSave('deals', localDeals));
          }
          if ((!wl || wl.length === 0) && lwl && lwl.length > 0) { setWalletsData(lwl); pushTasks.push(apiSave('wallets', lwl)); }
          if (pushTasks.length > 0) await Promise.all(pushTasks);
          setSyncBanner("synced");
        } else if (localHasData) {
          // Server is empty but localStorage has data — push local up
          setSyncBanner("pushing");
          const pushU = lu || INITIAL_USERS;
          const pushP = lp || INITIAL;
          const pushCp = lcp || CP_INITIAL;
          const pushCrg = lcrg || CRG_INITIAL;
          const pushDc = ldc || DC_INITIAL;
          const pushDl = ldl || DEALS_INITIAL;
          const pushWl = lwl || walletsData;
          setUsers(pushU); setPayments(pushP); setCpPayments(pushCp); setCrgDeals(pushCrg); setDcEntries(pushDc); setDealsData(pushDl); setWalletsData(pushWl);
          await Promise.all([
            apiSave('users', pushU), apiSave('payments', pushP), apiSave('customer-payments', pushCp),
            apiSave('crg-deals', pushCrg), apiSave('daily-cap', pushDc), apiSave('deals', pushDl), apiSave('wallets', pushWl),
          ]);
          setSyncBanner("synced");
        } else {
          // Both empty — first time setup, push defaults
          await Promise.all([
            apiSave('users', INITIAL_USERS), apiSave('payments', INITIAL),
            apiSave('customer-payments', CP_INITIAL), apiSave('crg-deals', CRG_INITIAL),
            apiSave('daily-cap', DC_INITIAL), apiSave('deals', DEALS_INITIAL), apiSave('wallets', walletsData),
          ]);
          setSyncBanner("synced");
        }
      } else {
        // Server offline — use localStorage if available (already loaded as defaults)
        if (lu && lu.length > 0) setUsers(lu);
        if (lp && lp.length > 0) setPayments(lp);
        if (lcp && lcp.length > 0) setCpPayments(lcp);
        if (lcrg && lcrg.length > 0) setCrgDeals(lcrg);
        if (ldc && ldc.length > 0) setDcEntries(ldc);
        if (ldl && ldl.length > 0) setDealsData(ldl);
        if (lwl && lwl.length > 0) setWalletsData(lwl);
        setSyncBanner("offline");
      }

      setLoaded(true);
      setTimeout(() => { skipSave.current = false; }, 800);
      setTimeout(() => setSyncBanner(null), 5000);
    })();
  }, []);

  // Poll server every 8 seconds for changes from other users
  useEffect(() => {
    if (!loaded) return;
    const poll = async () => {
      // If server was offline, try to reconnect
      if (!serverOnline) {
        try { await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(3000) }); serverOnline = true; } catch(e) {}
      }
      if (!serverOnline) return;
      const [u, p, cp, crg, dc, dl, wl] = await Promise.all([
        apiGet('users'), apiGet('payments'), apiGet('customer-payments'), apiGet('crg-deals'), apiGet('daily-cap'), apiGet('deals'), apiGet('wallets'),
      ]);
      skipSave.current = true;
      if (u !== null && u.length > 0) setUsers(prev => JSON.stringify(prev) !== JSON.stringify(u) ? u : prev);
      if (p !== null && p.length > 0) setPayments(prev => JSON.stringify(prev) !== JSON.stringify(p) ? p : prev);
      if (cp !== null && cp.length > 0) setCpPayments(prev => JSON.stringify(prev) !== JSON.stringify(cp) ? cp : prev);
      if (crg !== null && crg.length > 0) setCrgDeals(prev => JSON.stringify(prev) !== JSON.stringify(crg) ? crg : prev);
      if (dc !== null && dc.length > 0) setDcEntries(prev => JSON.stringify(prev) !== JSON.stringify(dc) ? dc : prev);
      if (dl !== null && dl.length > 0) setDealsData(prev => JSON.stringify(prev) !== JSON.stringify(dl) ? dl : prev);
      if (wl !== null && wl.length > 0) setWalletsData(prev => JSON.stringify(prev) !== JSON.stringify(wl) ? wl : prev);
      setTimeout(() => { skipSave.current = false; }, 500);
    };
    const interval = setInterval(poll, 8000);
    return () => clearInterval(interval);
  }, [loaded]);

  // Save on every change: localStorage (instant) + API (shared)
  useEffect(() => { if (!skipSave.current && loaded) apiSave('users', users); }, [users]);
  useEffect(() => { if (!skipSave.current && loaded) apiSave('payments', payments); }, [payments]);
  useEffect(() => { if (!skipSave.current && loaded) apiSave('customer-payments', cpPayments); }, [cpPayments]);
  useEffect(() => { if (!skipSave.current && loaded) apiSave('crg-deals', crgDeals); }, [crgDeals]);
  useEffect(() => { if (!skipSave.current && loaded) apiSave('daily-cap', dcEntries); }, [dcEntries]);
  useEffect(() => { if (!skipSave.current && loaded) apiSave('deals', dealsData); }, [dealsData]);
  useEffect(() => { if (!skipSave.current && loaded) apiSave('wallets', walletsData); }, [walletsData]);

  const handleLogout = () => { clearSession(); setUser(null); setPage("dashboard"); };

  const handleRefresh = async () => {
    skipSave.current = true;
    serverOnline = false; // force re-check
    const [u, p, cp, crg, dc, dl, wl] = await Promise.all([
      apiGet('users'), apiGet('payments'), apiGet('customer-payments'), apiGet('crg-deals'), apiGet('daily-cap'), apiGet('deals'), apiGet('wallets'),
    ]);
    if (u !== null && u.length > 0) setUsers(u);
    if (p !== null && p.length > 0) setPayments(p);
    if (cp !== null && cp.length > 0) setCpPayments(cp);
    if (crg !== null && crg.length > 0) setCrgDeals(crg);
    if (dc !== null && dc.length > 0) setDcEntries(dc);
    if (dl !== null && dl.length > 0) setDealsData(dl);
    if (wl !== null && wl.length > 0) setWalletsData(wl);
    setTimeout(() => { skipSave.current = false; }, 500);
  };

  if (!loaded) return (
    <div style={{ minHeight: "100vh", background: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans',sans-serif" }}>
      <style>{mobileCSS}</style>
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 24, fontWeight: 700, color: "#0F172A", marginBottom: 8 }}>Blitz CRM</div>
        <div style={{ color: "#64748B" }}>Connecting to server...</div>
      </div>
    </div>
  );

  // Sync banner component
  const SyncBanner = () => {
    return (
      <>
        <style>{mobileCSS}</style>
        {syncBanner && (() => {
          const msgs = {
            pushing: { bg: "#FEF3C7", border: "#F59E0B", color: "#92400E", text: "⬆️ Uploading local data to server..." },
            offline: { bg: "#FEF2F2", border: "#EF4444", color: "#991B1B", text: "⚠️ Server offline — data saved locally only." },
          };
          const m = msgs[syncBanner];
          if (!m) return null;
          return (
            <div style={{ position: "fixed", top: 0, left: 0, right: 0, padding: "8px 16px", background: m.bg, borderBottom: `2px solid ${m.border}`, color: m.color, fontSize: 12, fontWeight: 600, textAlign: "center", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              {m.text}
              <button onClick={() => setSyncBanner(null)} style={{ background: "none", border: "none", color: m.color, cursor: "pointer", fontSize: 16, fontWeight: 700, marginLeft: 12 }}>×</button>
            </div>
          );
        })()}
      </>
    );
  };

  if (!user) return (<><SyncBanner /><LoginScreen onLogin={u => { saveSession(u); setUser(u); }} users={users} /></>);

  const userAccess = getPageAccess(user);
  const canAccess = pg => userAccess.includes(pg);
  const firstPage = userAccess[0] || "dashboard";

  // Redirect to first allowed page if current page is blocked
  if (page !== "admin" && !canAccess(page)) {
    setPage(firstPage);
    return null;
  }

  if (page === "admin" && isAdmin(user.email)) return (<><SyncBanner /><AdminPanel users={users} setUsers={setUsers} wallets={walletsData} setWallets={setWalletsData} onBack={() => setPage(firstPage)} /></>);
  if (page === "customers" && canAccess("customers")) return (<><SyncBanner /><CustomerPayments user={user} onLogout={handleLogout} onNav={setPage} onAdmin={() => setPage("admin")} payments={cpPayments} setPayments={setCpPayments} onRefresh={handleRefresh} userAccess={userAccess} /></>);
  if (page === "crg" && canAccess("crg")) return (<><SyncBanner /><CRGDeals user={user} onLogout={handleLogout} onNav={setPage} onAdmin={() => setPage("admin")} deals={crgDeals} setDeals={setCrgDeals} onRefresh={handleRefresh} userAccess={userAccess} /></>);
  if (page === "dailycap" && canAccess("dailycap")) return (<><SyncBanner /><DailyCap user={user} onLogout={handleLogout} onNav={setPage} onAdmin={() => setPage("admin")} entries={dcEntries} setEntries={setDcEntries} crgDeals={crgDeals} onRefresh={handleRefresh} userAccess={userAccess} /></>);
  if (page === "deals" && canAccess("deals")) return (<><SyncBanner /><DealsPage user={user} onLogout={handleLogout} onNav={setPage} onAdmin={() => setPage("admin")} deals={dealsData} setDeals={setDealsData} onRefresh={handleRefresh} userAccess={userAccess} /></>);
  return (<><SyncBanner /><Dashboard user={user} onLogout={handleLogout} onNav={setPage} onAdmin={() => setPage("admin")} payments={payments} setPayments={setPayments} onRefresh={handleRefresh} userAccess={userAccess} /></>);
}
