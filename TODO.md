# Telegram Bot Fix TODO

## Plan: Fix all issues in backend/server.cjs

### Previously Completed Tasks

- [x] Fix 1: Fix `formatBrandNewPaymentMessage` - use `p.paidDate || p.openDate` (wrong date field)
- [x] Fix 2: Fix `sendBrandPaymentNotification` - add missing `message` + `postData` + send to `BRANDS_GROUP_CHAT_ID`
- [x] Fix 3: Fix customer-payments handler - notify Brands group on NEW payment (not just Received)
- [x] Fix 4: Fix Brands group hash detection - replace 'Payment Processed!' with `formatBrandNewPaymentMessage` format
- [x] Fix 5: Fix `handleOfferMessage` - replace verbose confirmations with `sendNewOfferNotification`
- [x] Bonus Fix: `FINANCE_GROUP_CHAT_ID` undefined variable crash - replaced with `AFFILIte_FINANCE_GROUP_CHAT_ID`

### New Tasks (v9.12 Audit)

#### 🔴 CRITICAL — Will crash/break the bot

- [x] **C1**: Fix `FINANCE_GROUP_CHAT_ID` undefined in `bot.on("message")` handler (`isFinanceGroup` check) — ReferenceError crash
- [x] **C2**: Fix `FINANCE_GROUP_CHAT_ID` undefined in 3 screenshot API endpoints — ReferenceError crash
- [x] **C3**: Fix `deleteSet` scoping bug in generic POST handler — declared inside `if` block, used outside — ReferenceError on every POST to crg-deals, daily-cap, etc.
- [x] **C4**: Remove duplicate `bot.onText(/\/todaycrgcap/)` and `bot.onText(/\/todayagentscap/)` — both handlers fire simultaneously, sending double responses

#### 🟠 LOGIC BUGS

- [x] **L1**: Fix offer group chat ID comparison — `.replace('-100', '-')` and `.replace('-', '-100')` produce wrong IDs
- [x] **L2**: Fix offer detection condition — `/^\d+$/.test(firstLine)` too broad, matches any number in offer group
- [x] **L3**: Fix Brands hash detection notification — always sends `formatBrandNewPaymentMessage` even when status is "Received"
- [x] **L4**: Fix `processedHashes` Map — initialized lazily inside handler with `if (!bot._processedHashes)`, move to module level
- [x] **L5**: Increase `processedMessageIds` TTL from 30s → 5 minutes to prevent reprocessing on polling restart

#### 🟡 MISSING FEATURES

- [x] **M1**: Add `/ping` command — bot latency test
- [x] **M2**: Add `/status` command — server health status
- [x] **M3**: Add `/help`, `/ping`, `/status` to `setMyCommands`
- [x] **M4**: Separate `/start` and `/help` handlers — `/help` shows full command list

#### 🔵 CODE QUALITY

- [x] **Q1**: Add `structuredLog()` helper — module, event, result, error, timestamp
- [x] **Q2**: Remove unused `formatPaidPaymentMessage` function (dead code)
- [x] **Q3**: Add `parse_mode` parameter to `sendTelegramNotification`
- [x] **Q4**: Update screenshot handlers to fall back to text response if Puppeteer not available

---

## ✅ ALL TASKS COMPLETE — v9.12 Audit Final Status

| Fix | ID | Status | Description |
|-----|----|--------|-------------|
| Critical | C1 | ✅ | `FINANCE_GROUP_CHAT_ID` → `AFFILIte_FINANCE_GROUP_CHAT_ID` in `isFinanceGroup` |
| Critical | C2 | ✅ | `FINANCE_GROUP_CHAT_ID` → `AFFILIte_FINANCE_GROUP_CHAT_ID` in 3 screenshot API endpoints |
| Critical | C3 | ✅ | `deleteSet` moved outside `if` block — was ReferenceError on every POST |
| Critical | C4 | ✅ | Removed duplicate text-only `/todaycrgcap` + `/todayagentscap` handlers |
| Logic   | L1 | ✅ | Offer group detection: direct `===` comparison, removed fragile `.replace()` chain |
| Logic   | L2 | ✅ | Offer format check: removed overly broad `/^\d+$/` condition |
| Logic   | L3 | ✅ | Brand notification: uses `formatBrandPaymentReceivedMessage` when status=Received |
| Logic   | L4 | ✅ | `processedHashes` Map moved to module level with 5-min TTL cleanup |
| Logic   | L5 | ✅ | `processedMessageIds` TTL: 30s → 300s; cleanup interval: 60s |
| Feature | M1 | ✅ | `/ping` command added — latency test |
| Feature | M2 | ✅ | `/status` command added — heap, uptime, WS clients |
| Feature | M3 | ✅ | `setMyCommands` updated with /help, /ping, /status |
| Feature | M4 | ✅ | `/start` and `/help` separated into distinct handlers |
| Quality | Q1 | ✅ | `structuredLog(module, event, result, details)` helper added |
| Quality | Q2 | ✅ | Removed unused `formatPaidPaymentMessage` dead code |
| Quality | Q3 | ✅ | `parse_mode` parameter added to `sendTelegramNotification` |
| Quality | Q4 | ✅ | Screenshot handlers fall back to text if Puppeteer unavailable |

---

## Requirements Reference

**A. Finance | Brands (-1002796530029)**
1. Hash detected → create CRM customer payment → send NEW OPEN CUSTOMER PAYMENT message to group [FIXED]
2. CRM payment marked as Received → send PAYMENT RECEIVED message to group [FIXED]

**B. Finance | Affiliate (-1002830517753)**
1. New payment in CRM → send NEW PAYMENT ADDED message [WORKING]
2. Payment marked as Paid → send PAYMENT MARKED AS PAID message [WORKING]

**C. Offers Blitz (-1002183891044)**
1. Message starts with 'Offer:' → add offer to CRM → send simple confirmation [FIXED]
