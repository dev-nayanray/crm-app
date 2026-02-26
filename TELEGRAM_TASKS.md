# Telegram Bot Task List & Test Report

## Group Chat Configuration

| Group | Chat ID | Purpose |
|-------|---------|---------|
| Finance \| Brands | `-1002796530029` | Customer payments, brand payments |
| Finance \| Affiliate | `-1002830517753` | Affiliate payments, new payments |
| Offers Blitz | `-1002183891044` | New offers parsing |
| CRG Deals | `-1002560408661` | New CRG deals notifications |
| Monitoring | `-1002832299846` | System monitoring reports |

---

## TASK LIST

### A. Finance | Brands Group (`-1002796530029`)

- [ ] **A1. Payment Hash Detection (Receive)**
  - Monitor chat for ERC/TRC/BTC transaction links
  - Extract payment amount from message
  - Extract brand name from message
  - Create customer payment record in CRM
  - Send confirmation message to group

- [ ] **A2. Customer Payment Received Notification (Send)**
  - When CRM payment marked as "Received"
  - Send notification to group with invoice + amount

### B. Finance | Affiliate Group (`-1002830517753`)

- [ ] **B1. New Payment Notification (Send)**
  - When new payment created in CRM
  - Send format: NEW PAYMENT ADDED 💰 with invoice, amount, opened by, status

- [ ] **B2. Payment Paid Notification (Send)**
  - When payment marked as "Paid" in CRM
  - Send format: PAYMENT marked as PAID with invoice, amount, paid by, payment hash

### C. Offers Blitz Group (`-1002183891044`)

- [ ] **C1. Offer Message Parsing (Receive)**
  - Detect messages starting with "Offer:"
  - Parse format:
    ```
    Offer:
    196 BEnl
    BitcoinApex
    1500+12
    ```
  - Extract: affiliate ID, country, brand, CRG
  - Save to CRM offers table
  - Send confirmation to group

- [ ] **C2. New Offer Notification (Send)**
  - Send notification with affiliate, country, brand

### D. CRG Deals Group (`-1002560408661`)

- [ ] **D1. New CRG Deal Notification (Send)**
  - When new CRG deal created in CRM
  - Send notification to CRG Deals group

### E. General Commands

- [ ] **E1. /start** - Welcome message with command list
- [ ] **E2. /help** - Full help information
- [ ] **E3. /wallets** - Current wallet addresses
- [ ] **E4. /crgdeals** - Today's CRG deals by country
- [ ] **E5. /deals** - All deals by country
- [ ] **E6. /todaycrgcap** - Today's CRG cap summary
- [ ] **E7. /todayagentscap** - Today's agents cap
- [ ] **E8. /payments** - Open payments summary
- [ ] **E9. /ping** - Bot ping test
- [ ] **E10. /status** - Server status

### F. Screenshot Reports

- [ ] **F1. Manual Screenshot Report** - Generate and send CRG/Agents reports via API

---

## TEST CASES

### Test A1: Payment Hash Detection (Brands Group)

**Input**: Send message to Brands group with:
```
Brand: TestBrand
$500
0x1234567890abcdef1234567890abcdef12345678
```

**Expected**:
1. Bot detects ERC20 hash
2. Creates customer payment record
3. Sends confirmation: "📨 Payment Processed! Invoice: CP-XXXXX Amount: $500"

### Test A2: Customer Payment Received (Brands Group)

**Input**: Mark customer payment as "Received" in CRM

**Expected**: Send to Brands group:
```
✅ PAYMENT RECEIVED ✅

📋 Invoice: #CP-XXXXX
💵 Amount: $500
🏷️ Brand: TestBrand
👤 Paid by: Admin
🔗 Payment Hash: 0x...
```

### Test B1: New Payment Notification (Affiliate Group)

**Input**: Create new payment in CRM

**Expected**: Send to Affiliate group:
```
🆕 NEW PAYMENT ADDED 💰

📋 Invoice: #200
💵 Amount: $2,000
👤 Opened by: Y Admin
Status: Open
```

### Test B2: Payment Paid Notification (Affiliate Group)

**Input**: Mark payment as "Paid" in CRM

**Expected**: Send to Affiliate group:
```
💰 PAYMENT 200 marked as PAID 💰

📋 Invoice: #200
💵 Amount: $2,000
👤 Paid by: Y Admin
Payment Hash: 123abc...
```

### Test C1: Offer Message Parsing

**Input**: Send to Offers group:
```
Offer:
196 BEnl
BitcoinApex
1500+12
```

**Expected**:
1. Parse affiliate: 196
2. Parse country: BEnl
3. Parse brand: BitcoinApex
4. Parse CRG: 1500+12
5. Save to CRM
6. Send confirmation:
```
📋 Added a new offer:
Affiliate 196
Country BEnl
```

### Test C2: Offer Notification

**Input**: New offer added via CRM

**Expected**: Send to Offers group:
```
📋 Added a new offer:
Affiliate 196
Country BEnl
Brand: BitcoinApex
```

### Test D1: New CRG Deal Notification

**Input**: New CRG deal created in CRM

**Expected**: Send to CRG Deals group:
```
📋 NEW CRG DEAL

🏷️ Affiliate: 196
💰 Cap: 1500
🏦 Broker: 100
📅 Date: 2024-01-15
```

### Test Commands

| Command | Expected Response |
|---------|-------------------|
| /start | Welcome message with command list |
| /help | Full help information |
| /wallets | Current wallet addresses |
| /crgdeals | Today's CRG deals by country (inline keyboard) |
| /deals | All deals by country (inline keyboard) |
| /todaycrgcap | Today's CRG cap summary |
| /todayagentscap | Today's agents cap |
| /payments | Open payments summary |

---

## VERIFICATION CHECKLIST

- [ ] Bot is running and polling messages
- [ ] Bot has admin access in all groups
- [ ] Token is valid and working
- [ ] All commands are registered
- [ ] Payment hash detection works for ERC20
- [ ] Payment hash detection works for TRC20
- [ ] Customer payment notifications sent to Brands
- [ ] Affiliate payment notifications sent to Affiliate
- [ ] Offer parsing works correctly
- [ ] CRG deal notifications sent to CRG group

