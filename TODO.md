# Fix: Duplicate Telegram Payment Notification

## Steps

- [x] Analyze root cause of duplicate messages
- [x] Fix `formatAffiliateNewPaymentMessage` — changed "Invoice: #X" → "Affiliate ID: X"
- [x] Remove duplicate `sendOpenPaymentNotification(p)` call from re-opening case
- [ ] Restart backend server to apply changes
