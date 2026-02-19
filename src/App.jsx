import React, { useState, useEffect, useRef } from "react";

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
];

const ADMIN_EMAIL = "y0505300530@gmail.com";
const VERSION = "1.021";

// ── API Configuration ──
const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:3001/api'
  : `http://${window.location.hostname}:3001/api`;

async function apiGet(endpoint) {
  try {
    const res = await fetch(`${API_BASE}/${endpoint}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) { console.error(`API GET ${endpoint}:`, e); return null; }
}

async function apiSave(endpoint, data) {
  try {
    return await fetch(`${API_BASE}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  } catch (e) { console.error(`API POST ${endpoint}:`, e); }
}

const STATUS_OPTIONS = ["Open", "On the way", "Approved to pay", "Paid"];
const OPEN_STATUSES = ["Open", "On the way", "Approved to pay"];
const TYPE_OPTIONS = ["Brand Payment", "Refund Affiliate"];
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
function StatusBadge({ status }) {
  const c = STATUS_COLORS[status] || { bg: "#F1F5F9", text: "#475569", border: "#94A3B8" };
  return <span style={{ display: "inline-block", padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: c.bg, color: c.text, border: `1px solid ${c.border}`, whiteSpace: "nowrap" }}>{status}</span>;
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#FFFFFF", borderRadius: 16, border: "1px solid #E2E8F0", padding: 32, width: 540, maxHeight: "85vh", overflowY: "auto", boxShadow: "0 25px 60px rgba(0,0,0,0.12)" }}>
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

function PaymentForm({ payment, onSave, onClose, userEmail, userName }) {
  const [f, setF] = useState(payment || { invoice: "", paidDate: "", status: "Open", amount: "", fee: "", openBy: userName || "", type: "Brand Payment", trcAddress: "", ercAddress: "", paymentHash: "" });
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
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
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
          <select style={{ ...inp, cursor: "pointer" }} value={f.type || "Brand Payment"} onChange={e => s("type", e.target.value)}>
            {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Paid Date">
          <div style={{ ...inp, background: "#e8ecf0", color: f.paidDate ? "#1E293B" : "#94A3B8", cursor: "default", display: "flex", alignItems: "center" }}>
            {f.paidDate || "Auto-set when marked Paid"}
          </div>
        </Field>
        <Field label="Open By"><input style={inp} value={f.openBy} onChange={e => s("openBy", e.target.value)} placeholder="Name" /></Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
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
function PaymentTable({ payments, onEdit, onDelete, emptyMsg }) {
  const fmt = a => { const n = parseFloat(a) || 0; return n.toLocaleString("en-US") + "$"; };
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

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr style={{ background: "#F8FAFC" }}>
            {["Invoice","Paid Date","Type","Status","Amount","Fee","Open By","TRC Address","ERC Address","Payment Hash","Actions"].map(h =>
              <th key={h} style={{ padding: "12px 14px", textAlign: "left", color: "#64748B", fontSize: 12, fontWeight: 700, borderBottom: "2px solid #E2E8F0", borderRight: "1px solid #F1F5F9", whiteSpace: "nowrap" }}>{h}</th>
            )}
          </tr>
        </thead>
        <tbody>
          {payments.map((p, i) => (
            <tr key={p.id}
              style={{ borderBottom: "1px solid #F1F5F9", transition: "background 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <td style={{ padding: "11px 14px", fontWeight: 700, fontFamily: "'Space Mono',monospace", fontSize: 15, borderRight: "1px solid #F1F5F9" }}>{p.invoice}</td>
              <td style={{ padding: "11px 14px", color: p.paidDate ? "#334155" : "#CBD5E1", fontSize: 13, borderRight: "1px solid #F1F5F9" }}>{p.paidDate ? new Date(p.paidDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}</td>
              <td style={{ padding: "11px 14px", borderRight: "1px solid #F1F5F9" }}>
                <span style={{ padding: "4px 10px", borderRadius: 6, background: (p.type || "Brand Payment") === "Refund Affiliate" ? "#FEE2E2" : "#EFF6FF", color: (p.type || "Brand Payment") === "Refund Affiliate" ? "#DC2626" : "#2563EB", fontSize: 12, fontWeight: 600 }}>{p.type || "Brand Payment"}</span>
              </td>
              <td style={{ padding: "11px 14px", borderRight: "1px solid #F1F5F9" }}>
                <span style={{ display: "inline-block", padding: "5px 16px", borderRadius: 4, fontSize: 13, fontWeight: 700, letterSpacing: 0.3, ...statusStyle(p.status) }}>{p.status}</span>
              </td>
              <td style={{ padding: "11px 14px", fontWeight: 800, fontFamily: "'Space Mono',monospace", fontSize: 15, color: "#0F172A", borderRight: "1px solid #F1F5F9" }}>{fmt(p.amount)}</td>
              <td style={{ padding: "11px 14px", fontSize: 12, color: p.fee ? "#0EA5E9" : "#CBD5E1", borderRight: "1px solid #F1F5F9", fontFamily: "'Space Mono',monospace" }}>{fmtFee(p.fee, p.amount)}</td>
              <td style={{ padding: "11px 14px", borderRight: "1px solid #F1F5F9" }}>
                <span style={{ display: "inline-block", padding: "4px 14px", borderRadius: 4, background: getOpenByColor(p.openBy), color: "#FFF", fontWeight: 700, fontSize: 13 }}>{p.openBy}</span>
              </td>
              <td style={{ padding: "11px 14px", fontFamily: "'Space Mono',monospace", fontSize: 11, color: "#475569", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", borderRight: "1px solid #F1F5F9" }}>{p.trcAddress || p.instructions || "—"}</td>
              <td style={{ padding: "11px 14px", fontFamily: "'Space Mono',monospace", fontSize: 11, color: "#475569", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", borderRight: "1px solid #F1F5F9" }}>{p.ercAddress || "—"}</td>
              <td style={{ padding: "11px 14px", fontFamily: "'Space Mono',monospace", fontSize: 11, color: "#94A3B8", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", borderRight: "1px solid #F1F5F9" }}>{p.paymentHash || "—"}</td>
              <td style={{ padding: "11px 14px" }}>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => onEdit(p)} title="Edit" style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 6, padding: 6, cursor: "pointer", color: "#2563EB", display: "flex" }}>{I.edit}</button>
                  <button onClick={() => onDelete(p.id)} title="Delete" style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 6, padding: 6, cursor: "pointer", color: "#DC2626", display: "flex" }}>{I.trash}</button>
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
function AdminPanel({ users, setUsers, onBack }) {
  const [addOpen, setAddOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [newUser, setNewUser] = useState({ email: "", password: "", name: "" });
  const [delConfirm, setDelConfirm] = useState(null);

  const handleAddUser = () => {
    if (!newUser.email || !newUser.password || !newUser.name) return;
    if (users.some(u => u.email === newUser.email)) return;
    const hashed = hashPassword(newUser.password);
    setUsers(prev => [...prev, { email: newUser.email, passwordHash: hashed, name: newUser.name }]);
    setNewUser({ email: "", password: "", name: "" });
    setAddOpen(false);
  };

  const handleUpdateUser = () => {
    if (!editUser) return;
    const hashed = hashPassword(editUser.password);
    setUsers(prev => prev.map(u => u.email === editUser.originalEmail ? { email: editUser.email, passwordHash: hashed, name: editUser.name } : u));
    setEditUser(null);
  };

  const handleDeleteUser = (email) => {
    if (email === ADMIN_EMAIL) return; // can't delete admin
    setUsers(prev => prev.filter(u => u.email !== email));
    setDelConfirm(null);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F1F5F9", fontFamily: "'DM Sans','Segoe UI',sans-serif", color: "#0F172A" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />

      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 32px", borderBottom: "1px solid #E2E8F0", background: "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {I.logo}
          <span style={{ fontFamily: "'Space Mono',monospace", fontWeight: 700, fontSize: 18, letterSpacing: -0.3 }}>Blitz Payments</span>
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
                  {u.email === ADMIN_EMAIL && (
                    <span style={{ padding: "2px 8px", borderRadius: 10, background: "rgba(248,113,113,0.15)", border: "1px solid rgba(248,113,113,0.3)", fontSize: 10, fontWeight: 700, color: "#F87171", textTransform: "uppercase", letterSpacing: 0.5 }}>Admin</span>
                  )}
                </div>
                <div style={{ fontSize: 13, color: "#64748B", fontFamily: "'Space Mono',monospace" }}>{u.email}</div>
                <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 4 }}>Password: <span style={{ color: "#64748B" }}>••••••••</span> <span style={{ fontSize: 10, color: "#CBD5E1" }}>(hashed)</span></div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setEditUser({ ...u, originalEmail: u.email })} title="Edit"
                  style={{ background: "rgba(14,165,233,0.08)", border: "1px solid rgba(14,165,233,0.2)", borderRadius: 8, padding: "8px 14px", cursor: "pointer", color: "#38BDF8", fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}
                >{I.edit} Edit</button>
                {u.email !== ADMIN_EMAIL && (
                  <button onClick={() => setDelConfirm(u.email)} title="Delete"
                    style={{ background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.15)", borderRadius: 8, padding: "8px 14px", cursor: "pointer", color: "#F87171", fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}
                  >{I.trash} Remove</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Add User Modal */}
      {addOpen && (
        <Modal title="Add New User" onClose={() => setAddOpen(false)}>
          <Field label="Name"><input style={inp} value={newUser.name} onChange={e => setNewUser(p => ({ ...p, name: e.target.value }))} placeholder="Display name" /></Field>
          <Field label="Email"><input style={inp} type="email" value={newUser.email} onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))} placeholder="user@email.com" /></Field>
          <Field label="Password"><input style={inp} value={newUser.password} onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))} placeholder="Password" /></Field>
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
          <Field label="New Password"><input style={inp} value={editUser.password} onChange={e => setEditUser(p => ({ ...p, password: e.target.value }))} placeholder="Enter new password" /></Field>
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
function Dashboard({ user, onLogout, onAdmin, onCustomers, payments, setPayments, onRefresh }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editPay, setEditPay] = useState(null);
  const [delConfirm, setDelConfirm] = useState(null);

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
      // If status changed to Paid, set the month/year to current selected month
      const updated = { ...editPay, ...form };
      if (form.status === "Paid" && editPay.status !== "Paid") {
        updated.month = month;
        updated.year = year;
        if (!updated.paidDate) {
          updated.paidDate = new Date().toISOString().split("T")[0];
        }
      }
      setPayments(prev => prev.map(p => p.id === editPay.id ? updated : p));
    } else {
      setPayments(prev => [...prev, { ...form, id: genId(), month, year }]);
    }
    setModalOpen(false);
    setEditPay(null);
  };

  const handleDelete = id => { setPayments(prev => prev.filter(p => p.id !== id)); setDelConfirm(null); };

  return (
    <div style={{ minHeight: "100vh", background: "#F1F5F9", fontFamily: "'DM Sans','Segoe UI',sans-serif", color: "#0F172A" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 32px", borderBottom: "1px solid #E2E8F0", background: "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {I.logo}
          <span style={{ fontFamily: "'Space Mono',monospace", fontWeight: 700, fontSize: 18, letterSpacing: -0.3 }}>Blitz Payments</span>
          <span style={{ fontSize: 11, color: "#64748B", fontFamily: "'Space Mono',monospace", background: "#E2E8F0", padding: "2px 8px", borderRadius: 6 }}>v{VERSION}</span>
          <span style={{ color: "#CBD5E1", margin: "0 4px" }}>|</span>
          <span style={{ background: "#0EA5E9", color: "#FFF", padding: "4px 12px", borderRadius: 6, fontSize: 14, fontWeight: 700 }}>Payments</span>
          <button onClick={onCustomers} style={{ background: "none", border: "none", color: "#64748B", cursor: "pointer", fontSize: 14, fontWeight: 500, padding: "4px 8px" }}
            onMouseEnter={e => e.currentTarget.style.color = "#0EA5E9"}
            onMouseLeave={e => e.currentTarget.style.color = "#64748B"}
          >Customer Payments</button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={onAdmin} style={{ display: user.email === ADMIN_EMAIL ? "flex" : "none", alignItems: "center", gap: 8, padding: "8px 20px", borderRadius: 10, background: "linear-gradient(135deg, #DC2626, #EF4444)", border: "none", color: "#FFF", cursor: "pointer", fontSize: 14, fontWeight: 700, boxShadow: "0 4px 16px rgba(239,68,68,0.4)", letterSpacing: 0.3, transition: "transform 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.05)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
          >⚙️ Admin Panel</button>
          <div style={{ padding: "5px 14px", borderRadius: 20, background: "rgba(14,165,233,0.08)", border: "1px solid rgba(14,165,233,0.2)", fontSize: 13, color: "#38BDF8", fontWeight: 500 }}>{user.name}</div>
          <button onClick={onRefresh} title="Refresh data" style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "1px solid #E2E8F0", color: "#64748B", cursor: "pointer", fontSize: 13, fontWeight: 500, padding: "6px 10px", borderRadius: 8, transition: "all 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.color = "#0EA5E9"; e.currentTarget.style.borderColor = "#0EA5E9"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "#64748B"; e.currentTarget.style.borderColor = "#E2E8F0"; }}
          >{I.refresh}<span>Refresh</span></button>
          <button onClick={onLogout} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "#64748B", cursor: "pointer", fontSize: 13, fontWeight: 500, padding: "6px 8px", borderRadius: 8 }}
            onMouseEnter={e => e.currentTarget.style.color = "#F87171"}
            onMouseLeave={e => e.currentTarget.style.color = "#64748B"}
          >{I.logout}<span>Logout</span></button>
        </div>
      </header>

      <main style={{ maxWidth: 1240, margin: "0 auto", padding: "28px 32px" }}>
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
          </div>
        </div>

        {/* Summary Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
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
          <PaymentTable payments={openPayments} onEdit={p => { setEditPay(p); setModalOpen(true); }} onDelete={id => setDelConfirm(id)} emptyMsg="No open payments — all caught up!" />
        </GroupHeader>

        {/* Paid This Month Group */}
        <GroupHeader icon={I.calendar} title={`${MONTHS[month].toUpperCase()} ${year}`} count={paidPayments.length} total={paidTotal} accentColor="#EC4899" defaultOpen={true}>
          <PaymentTable payments={paidPayments} onEdit={p => { setEditPay(p); setModalOpen(true); }} onDelete={id => setDelConfirm(id)} emptyMsg={`No paid payments for ${MONTHS[month]} ${year}`} />
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

  const submit = (e) => {
    e.preventDefault(); setLoading(true); setError("");
    setTimeout(() => {
      try {
        const hashed = hashPassword(password);
        const u = users.find(u => u.email === email && u.passwordHash === hashed);
        if (u) onLogin(u); else setError("Invalid email or password");
      } catch { setError("Login error"); }
      setLoading(false);
    }, 300);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans','Segoe UI',sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />
      <div style={{ width: 420, background: "#FFFFFF", borderRadius: 20, border: "1px solid #E2E8F0", padding: "48px 40px", boxShadow: "0 25px 60px rgba(0,0,0,0.08)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          {I.logo}
          <span style={{ fontFamily: "'Space Mono',monospace", fontWeight: 700, fontSize: 22, color: "#0F172A" }}>Blitz Payments</span>
          <span style={{ fontSize: 11, color: "#64748B", fontFamily: "'Space Mono',monospace", background: "#E2E8F0", padding: "2px 8px", borderRadius: 6 }}>v{VERSION}</span>
        </div>
        <p style={{ color: "#64748B", fontSize: 14, marginBottom: 36, marginTop: 4 }}>Payment Management</p>
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
  const [f, setF] = useState(payment || { invoice: "", paidDate: "", status: "Open", amount: "", fee: "", openBy: userName || "", trcAddress: "", ercAddress: "" });
  const [error, setError] = useState("");
  const s = (k, v) => { setF(p => ({ ...p, [k]: v })); setError(""); };

  const handleSave = () => {
    if (!f.invoice.trim()) { setError("Invoice name is required"); return; }
    if (!f.amount || parseFloat(f.amount) <= 0) { setError("Amount is required"); return; }
    onSave(f);
  };

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
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
        <Field label="Paid Date">
          <div style={{ ...inp, background: "#E2E8F0", color: f.paidDate ? "#1E293B" : "#94A3B8", cursor: "default", display: "flex", alignItems: "center" }}>
            {f.paidDate ? new Date(f.paidDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Auto-set when Received"}
          </div>
        </Field>
        <Field label="Open By"><input style={inp} value={f.openBy} onChange={e => s("openBy", e.target.value)} placeholder="Name" /></Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
        <Field label="TRC Address"><input style={inp} value={f.trcAddress || ""} onChange={e => s("trcAddress", e.target.value)} placeholder="e.g. TYUWBpmzSqCcz9r5rRVG..." /></Field>
        <Field label="ERC Address"><input style={inp} value={f.ercAddress || ""} onChange={e => s("ercAddress", e.target.value)} placeholder="e.g. 0x5066d63E126Cb3F893..." /></Field>
      </div>
      {error && <div style={{ color: "#DC2626", fontSize: 13, padding: "8px 12px", background: "rgba(220,38,38,0.08)", borderRadius: 8, marginBottom: 8, border: "1px solid rgba(220,38,38,0.2)" }}>{error}</div>}
      <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8 }}>
        <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 8, background: "transparent", border: "1px solid #E2E8F0", color: "#64748B", cursor: "pointer", fontSize: 14, fontWeight: 500 }}>Cancel</button>
        <button onClick={handleSave} style={{ padding: "10px 24px", borderRadius: 8, background: "linear-gradient(135deg,#0EA5E9,#38BDF8)", border: "none", color: "#FFF", cursor: "pointer", fontSize: 14, fontWeight: 600, boxShadow: "0 4px 15px rgba(14,165,233,0.3)" }}>{payment ? "Save Changes" : "Add Payment"}</button>
      </div>
    </>
  );
}

function CPTable({ payments, onEdit, onDelete, emptyMsg }) {
  const fmt = a => { const n = parseFloat(a) || 0; return n.toLocaleString("en-US") + "$"; };
  const total = payments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  const dates = payments.filter(p => p.paidDate).map(p => new Date(p.paidDate)).sort((a, b) => a - b);
  const fmtShort = d => { const m = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]; return `${m[d.getMonth()]} ${d.getDate()}`; };
  const dateRange = dates.length > 0 ? (dates.length === 1 ? fmtShort(dates[0]) : `${fmtShort(dates[0])} - ${fmtShort(dates[dates.length - 1])}`) : "";

  const openByColors = ["#FF6B9D", "#00BCD4", "#FF9800", "#9C27B0", "#4CAF50", "#E91E63"];
  const getColor = name => { let h = 0; for (let i = 0; i < (name||"").length; i++) h = name.charCodeAt(i) + ((h << 5) - h); return openByColors[Math.abs(h) % openByColors.length]; };

  if (payments.length === 0) return <div style={{ padding: "40px 16px", textAlign: "center", color: "#94A3B8", fontSize: 14 }}>{emptyMsg}</div>;

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr style={{ background: "#F8FAFC" }}>
            {["Invoice","Paid Date","Status","Invoice Amount","Fee","Open By","TRC Address","ERC Address","Actions"].map(h =>
              <th key={h} style={{ padding: "12px 14px", textAlign: "left", color: "#64748B", fontSize: 12, fontWeight: 700, borderBottom: "2px solid #E2E8F0", borderRight: "1px solid #F1F5F9", whiteSpace: "nowrap" }}>{h}</th>
            )}
          </tr>
        </thead>
        <tbody>
          {payments.map((p, i) => (
            <tr key={p.id} style={{ borderBottom: "1px solid #F1F5F9", transition: "background 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <td style={{ padding: "11px 14px", fontWeight: 700, fontSize: 15, borderRight: "1px solid #F1F5F9" }}>{p.invoice}</td>
              <td style={{ padding: "11px 14px", color: p.paidDate ? "#334155" : "#CBD5E1", fontSize: 13, borderRight: "1px solid #F1F5F9" }}>{p.paidDate ? new Date(p.paidDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}</td>
              <td style={{ padding: "11px 14px", borderRight: "1px solid #F1F5F9" }}>
                <span style={{ display: "inline-block", padding: "5px 16px", borderRadius: 4, fontSize: 13, fontWeight: 700, ...(CP_STATUS_COLORS[p.status] || { background: "#F1F5F9", color: "#475569" }) }}>{p.status}</span>
              </td>
              <td style={{ padding: "11px 14px", fontWeight: 800, fontFamily: "'Space Mono',monospace", fontSize: 15, color: "#0F172A", borderRight: "1px solid #F1F5F9" }}>{fmt(p.amount)}</td>
              <td style={{ padding: "11px 14px", fontSize: 12, color: p.fee ? "#0EA5E9" : "#CBD5E1", borderRight: "1px solid #F1F5F9", fontFamily: "'Space Mono',monospace" }}>{fmtFee(p.fee, p.amount)}</td>
              <td style={{ padding: "11px 14px", borderRight: "1px solid #F1F5F9" }}>
                <span style={{ display: "inline-block", padding: "4px 14px", borderRadius: 4, background: getColor(p.openBy), color: "#FFF", fontWeight: 700, fontSize: 13 }}>{p.openBy}</span>
              </td>
              <td style={{ padding: "11px 14px", fontFamily: "'Space Mono',monospace", fontSize: 11, color: "#475569", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", borderRight: "1px solid #F1F5F9" }}>{p.trcAddress || p.instructions || "—"}</td>
              <td style={{ padding: "11px 14px", fontFamily: "'Space Mono',monospace", fontSize: 11, color: "#475569", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", borderRight: "1px solid #F1F5F9" }}>{p.ercAddress || "—"}</td>
              <td style={{ padding: "11px 14px" }}>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => onEdit(p)} title="Edit" style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 6, padding: 6, cursor: "pointer", color: "#2563EB", display: "flex" }}>{I.edit}</button>
                  <button onClick={() => onDelete(p.id)} title="Delete" style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 6, padding: 6, cursor: "pointer", color: "#DC2626", display: "flex" }}>{I.trash}</button>
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

function CustomerPayments({ user, onLogout, onBack, onAdmin, payments, setPayments, onRefresh }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editPay, setEditPay] = useState(null);
  const [delConfirm, setDelConfirm] = useState(null);

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

  return (
    <div style={{ minHeight: "100vh", background: "#F1F5F9", fontFamily: "'DM Sans','Segoe UI',sans-serif", color: "#0F172A" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />

      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 32px", borderBottom: "1px solid #E2E8F0", background: "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {I.logo}
          <span style={{ fontFamily: "'Space Mono',monospace", fontWeight: 700, fontSize: 18, letterSpacing: -0.3 }}>Blitz Payments</span>
          <span style={{ fontSize: 11, color: "#64748B", fontFamily: "'Space Mono',monospace", background: "#E2E8F0", padding: "2px 8px", borderRadius: 6 }}>v{VERSION}</span>
          <span style={{ color: "#CBD5E1", margin: "0 4px" }}>|</span>
          <button onClick={onBack} style={{ background: "none", border: "none", color: "#64748B", cursor: "pointer", fontSize: 14, fontWeight: 500, padding: "4px 8px" }}
            onMouseEnter={e => e.currentTarget.style.color = "#0EA5E9"}
            onMouseLeave={e => e.currentTarget.style.color = "#64748B"}
          >Payments</button>
          <span style={{ background: "#0EA5E9", color: "#FFF", padding: "4px 12px", borderRadius: 6, fontSize: 14, fontWeight: 700 }}>Customer Payments</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={onAdmin} style={{ display: user.email === ADMIN_EMAIL ? "flex" : "none", alignItems: "center", gap: 8, padding: "8px 20px", borderRadius: 10, background: "linear-gradient(135deg, #DC2626, #EF4444)", border: "none", color: "#FFF", cursor: "pointer", fontSize: 14, fontWeight: 700, boxShadow: "0 4px 16px rgba(239,68,68,0.4)" }}>⚙️ Admin</button>
          <div style={{ padding: "5px 14px", borderRadius: 20, background: "rgba(14,165,233,0.08)", border: "1px solid rgba(14,165,233,0.2)", fontSize: 13, color: "#38BDF8", fontWeight: 500 }}>{user.name}</div>
          <button onClick={onRefresh} title="Refresh data" style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "1px solid #E2E8F0", color: "#64748B", cursor: "pointer", fontSize: 13, fontWeight: 500, padding: "6px 10px", borderRadius: 8, transition: "all 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.color = "#0EA5E9"; e.currentTarget.style.borderColor = "#0EA5E9"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "#64748B"; e.currentTarget.style.borderColor = "#E2E8F0"; }}
          >{I.refresh}<span>Refresh</span></button>
          <button onClick={onLogout} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "#64748B", cursor: "pointer", fontSize: 13, fontWeight: 500, padding: "6px 8px", borderRadius: 8 }}
            onMouseEnter={e => e.currentTarget.style.color = "#F87171"}
            onMouseLeave={e => e.currentTarget.style.color = "#64748B"}
          >{I.logout}<span>Logout</span></button>
        </div>
      </header>

      <main style={{ maxWidth: 1240, margin: "0 auto", padding: "28px 32px" }}>
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
          </div>
        </div>

        {/* Summary */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
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
          <CPTable payments={openPayments} onEdit={p => { setEditPay(p); setModalOpen(true); }} onDelete={id => setDelConfirm(id)} emptyMsg="No open invoices — all caught up!" />
        </GroupHeader>

        <GroupHeader icon={I.calendar} title={`${MONTHS[month].toUpperCase()} ${year}`} count={receivedPayments.length} total={receivedTotal} accentColor="#EC4899" defaultOpen={true}>
          <CPTable payments={receivedPayments} onEdit={p => { setEditPay(p); setModalOpen(true); }} onDelete={id => setDelConfirm(id)} emptyMsg={`No received payments for ${MONTHS[month]} ${year}`} />
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

/* ── App ── */
export default function App() {
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState(INITIAL_USERS);
  const [payments, setPayments] = useState(INITIAL);
  const [cpPayments, setCpPayments] = useState(CP_INITIAL);
  const [page, setPage] = useState("dashboard");
  const [loaded, setLoaded] = useState(false);
  const skipSave = useRef(true);
  const isSaving = useRef(false);

  // Load from API on startup
  useEffect(() => {
    (async () => {
      const [u, p, cp] = await Promise.all([
        apiGet('users'),
        apiGet('payments'),
        apiGet('customer-payments'),
      ]);
      if (u !== null && u.length > 0) setUsers(u);
      if (p !== null && p.length > 0) setPayments(p);
      if (cp !== null && cp.length > 0) setCpPayments(cp);
      setLoaded(true);
      setTimeout(() => { skipSave.current = false; }, 1000);
    })();
  }, []);

  // Auto-poll every 12 seconds to pick up changes from other users
  useEffect(() => {
    if (!loaded) return;
    const interval = setInterval(async () => {
      if (isSaving.current) return; // Don't poll while saving
      try {
        const [u, p, cp] = await Promise.all([
          apiGet('users'),
          apiGet('payments'),
          apiGet('customer-payments'),
        ]);
        // Only update if server returned data and it's different
        skipSave.current = true; // Prevent save loop
        if (u !== null && u.length > 0) setUsers(prev => JSON.stringify(prev) !== JSON.stringify(u) ? u : prev);
        if (p !== null) setPayments(prev => JSON.stringify(prev) !== JSON.stringify(p) ? p : prev);
        if (cp !== null) setCpPayments(prev => JSON.stringify(prev) !== JSON.stringify(cp) ? cp : prev);
        setTimeout(() => { skipSave.current = false; }, 500);
      } catch (e) { /* silent fail on poll */ }
    }, 12000);
    return () => clearInterval(interval);
  }, [loaded]);

  // Auto-save to API whenever data changes (skip during initial load and polling)
  useEffect(() => {
    if (!skipSave.current && loaded) { isSaving.current = true; apiSave('users', users).finally(() => { isSaving.current = false; }); }
  }, [users]);
  useEffect(() => {
    if (!skipSave.current && loaded) { isSaving.current = true; apiSave('payments', payments).finally(() => { isSaving.current = false; }); }
  }, [payments]);
  useEffect(() => {
    if (!skipSave.current && loaded) { isSaving.current = true; apiSave('customer-payments', cpPayments).finally(() => { isSaving.current = false; }); }
  }, [cpPayments]);

  const handleLogout = () => { setUser(null); setPage("dashboard"); };

  const handleRefresh = async () => {
    skipSave.current = true;
    const [u, p, cp] = await Promise.all([
      apiGet('users'),
      apiGet('payments'),
      apiGet('customer-payments'),
    ]);
    if (u !== null && u.length > 0) setUsers(u);
    if (p !== null) setPayments(p);
    if (cp !== null) setCpPayments(cp);
    setTimeout(() => { skipSave.current = false; }, 500);
  };

  if (!loaded) return (
    <div style={{ minHeight: "100vh", background: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans',sans-serif" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 24, fontWeight: 700, color: "#0F172A", marginBottom: 8 }}>Blitz Payments</div>
        <div style={{ color: "#64748B" }}>Loading...</div>
      </div>
    </div>
  );

  if (!user) return <LoginScreen onLogin={setUser} users={users} />;
  if (page === "admin" && user.email === ADMIN_EMAIL) return <AdminPanel users={users} setUsers={setUsers} onBack={() => setPage("dashboard")} />;
  if (page === "customers") return <CustomerPayments user={user} onLogout={handleLogout} onBack={() => setPage("dashboard")} onAdmin={() => setPage("admin")} payments={cpPayments} setPayments={setCpPayments} onRefresh={handleRefresh} />;
  return <Dashboard user={user} onLogout={handleLogout} onAdmin={() => setPage("admin")} onCustomers={() => setPage("customers")} payments={payments} setPayments={setPayments} onRefresh={handleRefresh} />;
}
