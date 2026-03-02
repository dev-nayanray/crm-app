# Telegram Bot Fix TODO

## Plan: Fix all issues in backend/server.cjs

### Tasks

- [x] Fix 1: Fix `formatBrandNewPaymentMessage` - use `p.paidDate || p.openDate` (wrong date field) - DONE line 1648
- [x] Fix 2: Fix `sendBrandPaymentNotification` - add missing `message` + `postData` + send to `BRANDS_GROUP_CHAT_ID` (critical crash bug) - DONE (was already in HEAD)
- [x] Fix 3: Fix customer-payments handler - notify Brands group on NEW payment (not just Received) - DONE lines 1082-1092
- [x] Fix 4: Fix Brands group hash detection - replace 'Payment Processed!' with `formatBrandNewPaymentMessage` format - DONE lines 2274-2276
- [x] Fix 5: Fix `handleOfferMessage` - replace verbose confirmations with `sendNewOfferNotification` (correct format) - DONE lines 2755-2756 and 2914-2917
- [x] Bonus Fix: `FINANCE_GROUP_CHAT_ID` undefined variable crash - replaced with `AFFILIte_FINANCE_GROUP_CHAT_ID` - DONE line 2329

### Requirements Reference

**A. Finance | Brands (-1002796530029)**
1. Hash detected -> create CRM customer payment -> send NEW OPEN CUSTOMER PAYMENT message to group [FIXED]
2. CRM payment marked as Received -> send PAYMENT RECEIVED message to group [FIXED]

**B. Finance | Affiliate (-1002830517753)**
1. New payment in CRM -> send NEW PAYMENT ADDED message [WAS WORKING]
2. Payment marked as Paid -> send PAYMENT MARKED AS PAID message [WAS WORKING]

**C. Offers Blitz (-1002183891044)**
1. Message starts with 'Offer:' -> add offer to CRM -> send simple confirmation [FIXED]
