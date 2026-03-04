# Offer Message Format - Quick Reference Card

## 🚀 Fastest Way to Send Offers

### Format 1: Single-Line (Simple & Fast)
```
Offer: AFFILIATE_ID COUNTRY PRICE CRG% FUNNEL + SOURCE
```

**Example:**
```
Offer: 183 ZA 950 6% InvestBTC Ai Taboola + GG
```

✅ Parsed as:
- Affiliate: 183
- Country: ZA  
- Price: 950
- CRG: 6%
- Funnel: InvestBTC Ai Taboola
- Source: GG

---

## 📋 Message Format Templates

### Multi-Line Format (Most Reliable)
```
Offer: AFFILIATE_ID
COUNTRY PRICE CRG%
Funnel: FUNNEL_NAME
Source: SOURCE_KEYWORD
Deductions: optional%
```

**Example:**
```
Offer: 117
CA 1350 12%
Funnel: Immutable Azopt
Source: Taboola
Deductions: 5%
```

---

### Multiple Offers at Once
```
Offers: AFFILIATE_ID
COUNTRY1 PRICE1 CRG1% FUNNEL1 + SOURCE1
COUNTRY2 PRICE2 CRG2% FUNNEL2 + SOURCE2
COUNTRY3 PRICE3 CRG3% FUNNEL3 + SOURCE3
```

**Example:**
```
Offers: 35
KR 1200+10 Ligocu Betfandecs Zineth + GG
TW 1200+10 Ligocu Betfandecs Lihonk + FB
JP 1500 14 Ligocu Betfandecs Phushin + SEO
```

---

## 🎯 Essential Fields

| Field | Required | Format | Example |
|-------|----------|--------|---------|
| **Affiliate ID** | ✅ Yes | Numbers only | 183, 35, 117 |
| **Country** | ✅ Yes | 2-letter code | ZA, DE, FR, UK, CA |
| **Price** | ✅ Yes | Number or N+N | 950, 1200+10 |
| **CRG %** | ⚠️ Recommended | Number% | 6%, 10%, 14% |
| **Funnel** | ⚠️ Recommended | Text/Brand | InvestBTC Ai Taboola |
| **Source** | ⚠️ Recommended | Keyword | GG, FB, Taboola |
| **Deductions** | ❌ Optional | Number% | 5%, 10% |

---

## 📡 Source Keywords (Traffic Sources)

### Most Common
- **GG** or **Google** - Google Ads/Search
- **FB** or **Facebook** - Facebook/Instagram
- **Taboola** - Content Discovery
- **SEO** or **Search** - Organic/SEM
- **MSN** - Microsoft/Bing

### Other Sources  
- **Native** - Native Ads
- **Push** - Push Notifications
- **TikTok** - TikTok Ads
- **Snap** - Snapchat Ads
- **Yahoo** - Yahoo Search
- **DSP** - Programmatic Ads
- **AppLovin** - Mobile Ads
- **Criteo** - Retargeting
- **Outbrain** - Native Content
- **CPC/PPC** - Cost Per Click

**💡 Tip:** If your source isn't listed, use explicit label: `Source: CustomName`

---

## 🌍 Country Codes Supported

**Europe:**
NL, BE, DE, FR, UK, AT, CH, CZ, PL, PT, SE, NO, DK, FI, IE, ES, IT, GR, RO, IL

**Americas:**
US, CA, BR, MX, AR, CL, CO, PE, CR, DO, EC, UY, GT, PA, HN, SV, BO, PY, VE, CU, PR

**Asia-Pacific:**
AU, JP, KR, TW, SG, HK, IN, MY, TH, VN, ID, PH, CN (adding more...)

**Middle East & Africa:**
AE, SA, ZA, EG, TR, Iran variants

**Optional:** Add language code: ZAen (ZA+English), DEde (DE+German), FRfr (FR+French)

---

## 💰 Price Formats

| Format | Example | Result |
|--------|---------|--------|
| Fixed Price | 950 | $950 |
| With Bonus | 1200+10 | $1200 + $10 bonus |
| With CRG% | 700+3% | $700 + 3% commission |
| European Decimal | 950,50 | $950.50 |
| Large Numbers | 1,500 | $1500 |

---

## 📊 CRG Rate Formats

| Format | Example | Normalized |
|--------|---------|-----------|
| Simple | 6% | 6% |
| Trailing Plus | 3%+ | 3% |
| Range | 2-4% | 4% (takes max) |
| European | 2,5% | 2.5% |
| Complex | 2-4%+ | 4% |

---

## ⚡ Quick Tips

### ✅ DO:
- ✅ Use separator `+` between funnel and source
- ✅ Put affiliate ID at start
- ✅ Include country code
- ✅ Use recognized source keywords
- ✅ One offer per line for multiple
- ✅ Use explicit labels for clarity
- ✅ Include CRG rate if available
- ✅ Use proper formatting

### ❌ DON'T:
- ❌ Mix funnel and source without separator
- ❌ Use long text without country code
- ❌ Forget source completely
- ❌ Use unsupported country codes
- ❌ Put multiple offers on one line
- ❌ Mix different format styles
- ❌ Use unclear funnel names
- ❌ Omit affiliate ID

---

## 🔄 Message Examples

### ✅ GOOD Examples

**Simple:**
```
Offer: 183 ZA 950 6% InvestBTC Ai Taboola + GG
```

**Clear:**
```
Offer: 183
ZA 950 6%
Funnel: InvestBTC Ai Taboola
Source: GG
```

**Multiple:**
```
Offers: 35
KR 1200+10 Ligocu + GG
TW 1200+10 Ligocu + FB
```

**Detailed:**
```
Offer: 117
Country: CA
Price: 1350
CRG: 12%
Funnel: Immutable Azopt
Source: Taboola
Deductions: 5%
```

---

### ❌ AVOID Examples

```
Offer: 183 ZA 950 6% InvestBTC GG Taboola
         ↑ No separator between funnel and source
```

```
Offers: 35
1200+10 Ligocu Betfandecs Taboola
↑ Missing country code
```

```
Offer: ZA 950 6% InvestBTC Taboola + GG
↑ Missing affiliate ID
```

```
Offer: 183 950 6% InvestBTC Taboola + GG
↑ Missing country code
```

---

## 🎯 Real-World Examples

### Example 1: From Your Message
**Your input:**
```
Offer: 183 ZA en 950 6% InvestBTC Ai Taboola + GG
```

**Parsed as:**
```
✅ Affiliate: 183
✅ Country: ZA en
✅ Price: 950
✅ CRG: 6%
✅ Funnel: InvestBTC Ai Taboola
✅ Source: GG
```

---

### Example 2: Multi-Format Message
**Your input:**
```
Offers 35 KR 1200+10 - Ligocu Betfandecs - Zineth Envireks and same funnels TW 1200+10 - Ligocu Betfandecs - Lihonk Touhonk and same funnels JP 1500 14 - Ligocu Betfandecs - Phushin Phushintive and same funnels
```

**Improved format:**
```
Offers: 35
KR 1200+10 Ligocu Betfandecs Zineth Envireks + GG
TW 1200+10 Ligocu Betfandecs Lihonk Touhonk + FB
JP 1500 14 Ligocu Betfandecs Phushin Phushintive + SEO
```

**All three offers parsed correctly:**
- Offer 1: KR | $1200+10 | Funnel: Ligocu Betfandecs Zineth Envireks | Source: GG
- Offer 2: TW | $1200+10 | Funnel: Ligocu Betfandecs Lihonk Touhonk | Source: FB
- Offer 3: JP | $1500 | 14% | Funnel: Ligocu Betfandecs Phushin Phushintive | Source: SEO

---

## 💬 Copy-Paste Templates

### Template 1: Single Offer (Fastest)
```
Offer: [ID] [COUNTRY] [PRICE] [CRG%] [FUNNEL NAME] + [SOURCE]
```

### Template 2: Multiple Offers (Best Practice)
```
Offers: [ID]
[COUNTRY1] [PRICE1] [CRG1%] [FUNNEL1] + [SOURCE1]
[COUNTRY2] [PRICE2] [CRG2%] [FUNNEL2] + [SOURCE2]
[COUNTRY3] [PRICE3] [CRG3%] [FUNNEL3] + [SOURCE3]
```

### Template 3: Detailed (Most Clear)
```
Offer: [ID]
Country: [COUNTRY]
Price: [PRICE]
CRG: [CRG%]
Funnel: [FUNNEL NAME]
Source: [SOURCE]
Deductions: [OPTIONAL%]
```

---

## 🆘 Troubleshooting

| Problem | Solution |
|---------|----------|
| Source not captured | Use separator: `funnel + source` |
| Funnel has source in it | Move source outside funnel |
| Multiple offers not split | Put each on separate line |
| Country not recognized | Use 2-letter code (ZA not ZAR) |
| Price not found | Use numbers: 950 or 1200+10 |
| CRG not recognized | Add % symbol: 6% not 6 |

---

## 📞 Support

**Common Issues:**
- Source keyword not found? → Check SOURCES list above
- Country not valid? → Use 2-letter code from COUNTRIES list
- Format rejected? → Follow template examples
- Still having issues? → Use explicit labels format

---

**Last Updated:** March 4, 2026  
**Version:** v10.4  
**Status:** ✅ Production Ready

Keep this card handy when sending offers! 😊
