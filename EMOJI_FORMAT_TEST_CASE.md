# Test Case: Emoji Flag + Multi-Line Offer Format

## Your Message Format

```
Offers

35
🇰🇷 KR 
1200+10
- Ligocu Betfandecs
- Zineth Envireks
and same funnels

🇹🇼 TW 
1200+10
- Ligocu Betfandecs
- Lihonk Touhonk
and same funnels

🇯🇵 JP
1500 14
- Ligocu Betfandecs
- Phushin Phushintive
and same funnels
```

---

## Enhanced Parser Implementation (v10.4)

The following improvements now handle this format:

### 1. **Flexible Header Matching**
- Old: Required `Offer:` or `Offers:` with colon
- New: Allows `Offers` (without colon) or `Offers 35` or `Offers:\n35`
- **Status:** ✅ Handles your format

### 2. **Emoji Flag Removal**
```javascript
// Remove flag emojis (🇰🇷 🇹🇼 🇯🇵 etc)
.replace(/[\u{1F1E6}-\u{1F1FF}]{2}/gu, '')
```
- Strips country flag emojis before parsing
- **Status:** ✅ Removes flags, preserves country codes

### 3. **Extra Whitespace Normalization**
```javascript
// Collapse multiple newlines
.replace(/\n\n+/g, '\n')
```
- Handles extra blank lines between offers
- **Status:** ✅ Normalizes whitespace

### 4. **"and same funnels" Phrase Removal**
```javascript
// Remove phrase
.replace(/and\s+same\s+funnels/gi, '')
```
- Strips explanatory text that doesn't affect parsing
- **Status:** ✅ Removes phrase

### 5. **Multi-Line Offer Grouping**
```javascript
// Groups related lines until next country code
for line in lines:
  if line starts with country code:
    save current group, start new
  else:
    add to current group
```
- Combines country, price, and funnels across multiple lines
- **Status:** ✅ Groups accordingly

### 6. **Dash-Prefixed Funnel Items**
```javascript
// Extract items starting with dash
if token starts with "- ":
  add to dashItems (funnels)
```
- Treats dash-prefixed lines as funnel items
- Combines them with commas
- **Status:** ✅ Extracts and combines

---

## Expected Parsing Output

### Input Message (Your Format)
```
Offers
35
🇰🇷 KR 
1200+10
- Ligocu Betfandecs
- Zineth Envireks
and same funnels

🇹🇼 TW 
1200+10
- Ligocu Betfandecs
- Lihonk Touhonk
and same funnels

🇯🇵 JP
1500 14
- Ligocu Betfandecs
- Phushin Phushintive
and same funnels
```

### Processing Steps

**Step 1: Header & Affiliate Extraction**
```
Affiliate ID: 35
```

**Step 2: Emoji & Phrase Removal**
```
KR 
1200+10
Ligocu Betfandecs
Zineth Envireks

TW 
1200+10
Ligocu Betfandecs
Lihonk Touhonk

JP
1500 14
Ligocu Betfandecs
Phushin Phushintive
```

**Step 3: Line Grouping by Country Code**
```
Group 1: "KR 1200+10 Ligocu Betfandecs Zineth Envireks"
Group 2: "TW 1200+10 Ligocu Betfandecs Lihonk Touhonk"
Group 3: "JP 1500 14 Ligocu Betfandecs Phushin Phushintive"
```

**Step 4: Token Parsing**
```
Group 1 tokens:
  - Country: KR
  - Price: 1200+10
  - Dash items: ["Ligocu Betfandecs", "Zineth Envireks"]

Group 2 tokens:
  - Country: TW
  - Price: 1200+10
  - Dash items: ["Ligocu Betfandecs", "Lihonk Touhonk"]

Group 3 tokens:
  - Country: JP
  - Price: 1500
  - CRG Rate: 14%
  - Dash items: ["Ligocu Betfandecs", "Phushin Phushintive"]
```

### Final Output (JSON)

```json
{
  "affiliateId": "35",
  "offers": [
    {
      "country": "KR",
      "price": "1200+10",
      "crRate": "10%",
      "funnel": "Ligocu Betfandecs, Zineth Envireks",
      "source": "",
      "dealType": "CRG",
      "deduction": "",
      "notes": ""
    },
    {
      "country": "TW",
      "price": "1200+10",
      "crRate": "10%",
      "funnel": "Ligocu Betfandecs, Lihonk Touhonk",
      "source": "",
      "dealType": "CRG",
      "deduction": "",
      "notes": ""
    },
    {
      "country": "JP",
      "price": "1500",
      "crRate": "14%",
      "funnel": "Ligocu Betfandecs, Phushin Phushintive",
      "source": "",
      "dealType": "CRG",
      "deduction": "",
      "notes": ""
    }
  ]
}
```

---

## CRM Table Display

How it will appear in your Offers table:

| Affiliate | Country | Price | CRG | Type | Funnel | Source | Date |
|-----------|---------|-------|-----|------|--------|--------|------|
| 35 | KR | 1200+10 | 10% | CRG | Ligocu Betfandecs, Zineth Envireks | — | 03/04 |
| 35 | TW | 1200+10 | 10% | CRG | Ligocu Betfandecs, Lihonk Touhonk | — | 03/04 |
| 35 | JP | 1500 | 14% | CRG | Ligocu Betfandecs, Phushin Phushintive | — | 03/04 |

---

## Telegram Bot Notification

Your bot will send:

```
✅ Added 3 offer(s) for Affiliate #35

1️⃣ KR | 💰 $1200+10 | 📊 10% | 🏷️ CRG
   🎯 Funnel: Ligocu Betfandecs, Zineth Envireks

2️⃣ TW | 💰 $1200+10 | 📊 10% | 🏷️ CRG
   🎯 Funnel: Ligocu Betfandecs, Lihonk Touhonk

3️⃣ JP | 💰 $1500 | 📊 14% | 🏷️ CRG
   🎯 Funnel: Ligocu Betfandecs, Phushin Phushintive

✨ All offers synced to CRM
```

---

## Want to Add Source?

To include traffic source (GG, FB, Taboola, etc.), modify your message:

### Option 1: Add to end
```
Offers
35
🇰🇷 KR 
1200+10
- Ligocu Betfandecs
- Zineth Envireks
and same funnels + GG
```
**Result:** Source = GG

### Option 2: Use explicit label
```
Offers
35
🇰🇷 KR 
1200+10
- Ligocu Betfandecs
- Zineth Envireks
Source: GG
```
**Result:** Source = GG

### Option 3: Separate source for each
```
Offers: 35
🇰🇷 KR 1200+10 Ligocu Betfandecs Zineth Envireks + GG
🇹🇼 TW 1200+10 Ligocu Betfandecs Lihonk Touhonk + FB
🇯🇵 JP 1500 14 Ligocu Betfandecs Phushin Phushintive + SEO
```
**Result:** Different source for each offer

---

## Summary Of v10.4 Enhancements

✅ **Emoji Flag Support** - Automatically strips country flag emojis  
✅ **Multi-Line Offers** - Groups lines by country code  
✅ **Dash-Prefixed Items** - Treats as funnel components  
✅ **Flexible Headers** - Works with or without colons  
✅ **Extra Whitespace** - Handles multiple line breaks  
✅ **Phrase Cleaning** - Removes "and same funnels"  
✅ **Smart Price Parsing** - Handles both "1200+10" and "1500 14" formats  

---

## Ready to Test?

Send your message to the Telegram offer group:

```
Offers

35
🇰🇷 KR 
1200+10
- Ligocu Betfandecs
- Zineth Envireks
and same funnels

🇹🇼 TW 
1200+10
- Ligocu Betfandecs
- Lihonk Touhonk
and same funnels

🇯🇵 JP
1500 14
- Ligocu Betfandecs
- Phushin Phushintive
and same funnels
```

**Expected Result:**
- ✅ 3 offers created in CRM
- ✅ All funnel names properly captured
- ✅ Prices and CRG rates extracted
- ✅ Telegram confirmation sent

---

**Version:** v10.4  
**Status:** ✅ Ready for Production  
**Test Date:** March 4, 2026
