# Offer Parser Rewrite — v9.19

## Completed Steps

- [x] **Step 1**: Rewrite `handleOfferMessage` with robust multi-format parser
  - Supports labeled format (`Geo:`, `Funnel:`, `Price:`, `Source:`)
  - Supports compact format (`ES\n1600*14\nDynamic crypto mix\nGoogle`)
  - Supports mixed format (`AT 1600+10\nAustriQunt\nFB+SEO\n10% deduct`)
  - Handles extra fields: `CR 12%`, `10% deduct`, `no autologin`
  - Splits message into blocks by blank lines
  - Extracts affiliate ID from header or first standalone number

- [x] **Step 2**: Update `formatNewOfferMessage` and add `formatBatchOfferConfirmation`
  - New consolidated confirmation message listing ALL parsed offers
  - Shows: country | funnel | price | source | deduction | CR rate | notes

- [x] **Step 3**: Add `sendBatchOfferNotification` function
  - Sends ONE message to Telegram with all offers listed
  - Uses numbered emoji list (1️⃣ 2️⃣ 3️⃣ etc.)

- [x] **Step 4**: Updated offer data schema in `offers.json`
  - New fields: `funnel`, `price`, `source`, `deduction`, `crRate`, `notes`
  - All offers saved with `affiliateId` and complete data

## Testing
- [ ] Restart server and send test offer message in Telegram group
- [ ] Verify all 7 offers are parsed and saved to `offers.json`
- [ ] Verify consolidated confirmation message is sent back
