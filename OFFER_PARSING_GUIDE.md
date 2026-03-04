# Offer Parsing Guide (v10.4)

## Overview
The CRM backend now properly extracts **Funnel** and **Source** information from offer messages, supporting multiple message formats.

## Supported Message Formats

### Format 1: Single-Line Offer (Simple)
```
Offer: 183 ZA 950 6% InvestBTC Ai Taboola + GG
```
**Parsed as:**
- Affiliate: 183
- Country: ZA
- Price: 950
- CRG Rate: 6%
- Funnel: InvestBTC Ai Taboola
- Source: GG

---

### Format 2: Multi-Line with Explicit Labels
```
Offer:
183
ZA 950 6%
Funnel: InvestBTC Ai Taboola
Source: GG
```
**Parsed as:**
- Affiliate: 183
- Country: ZA
- Price: 950
- CRG Rate: 6%
- Funnel: InvestBTC Ai Taboola
- Source: GG

---

### Format 3: Multiple Offers in One Message
```
Offers: 35
KR 1200+10 Ligocu Betfandecs Zineth Envireks Taboola + GG
TW 1200+10 Ligocu Betfandecs Lihonk Touhonk Facebook + FB
JP 1500 14 Ligocu Betfandecs Phushin Phushintive Google + SEO
```
**Each line is parsed as a separate offer:**
1. Country: KR | Price: 1200 | CRG: 10% | Funnel: Ligocu Betfandecs Zineth Envireks | Source: GG
2. Country: TW | Price: 1200 | CRG: 10% | Funnel: Ligocu Betfandecs Lihonk Touhonk | Source: FB
3. Country: JP | Price: 1500 | CRG: 14% | Funnel: Ligocu Betfandecs Phushin Phushintive | Source: SEO

---

### Format 4: Detailed Multi-Line Format
```
Offers: 117

Country: CA
Price: 1350
CRG: 12%
Funnel: Immutable Azopt
Source: Taboola
Deductions: 5%

Country: UK
Price: 1350
CRG: 12%
Funnel: Immediate Apex
Source: Facebook
Deductions: 10%
```

---

## Source Keywords Recognized

The parser automatically detects these **source keywords**:
- **FB** / Facebook
- **GG** / Google / Google Ads
- **Taboola**
- **MSN** / Bing
- **SEO** / Search
- **Native**
- **Push**
- **TikTok** / Snap
- **Yahoo**
- **DSP** / Programmatic
- **AppLovin**
- **Apple**
- **Criteo**
- **Outbrain**
- **PPC** / CPC / SEM

---

## What Gets Captured

Each offer now includes:

| Field | Description | Example |
|-------|-------------|---------|
| **Affiliate** | Affiliate ID number | 183 |
| **Country** | Geographic location + language | ZA, DE, FR fr, DE de |
| **Price** | Offer payout amount | 950, 1200+10 (with bonus) |
| **CRG** | Commission/Conversion Rate | 6%, 10%, 14% |
| **Deal Type** | Type of offer | CRG, CPA, CPL, etc. |
| **Funnel** | Marketing/sales funnel name | InvestBTC Ai Taboola, Betfandecs |
| **Source** | Traffic source | GG, FB, Taboola, SEO |
| **Deductions** | Chargebacks/fees | 5%, 10% |
| **Date** | When offer was added | 2026-03-04 |
| **Open By** | Who added it | Telegram Bot, Admin Name |

---

## Key Improvements (v10.4)

### 1. **Enhanced Source Extraction**
- Automatically detects source keywords from inline text
- Supports separators: `+`, `-`, `/`, `|`
- Example: `InvestBTC Taboola + GG` → Funnel: InvestBTC Taboola, Source: GG

### 2. **Proper Funnel/Source Separation**
- **Before**: All text went into funnel field
- **After**: Source keywords are extracted and stored separately

### 3. **Multi-Message Support**
- Handle single offers in one line
- Process multiple offers in multi-line format
- Support both simple and detailed formats

### 4. **Better Error Messages**
- Clear error messages with format examples
- Helps users understand correct format

### 5. **Improved Telegram Notifications**
- Shows formatted Funnel and Source information
- Displays pricing and CRG rate
- Easy-to-read emoji indicators

---

## Examples with Parsing Details

### Example 1: Simple Format
```
Input: Offer: 183 ZA 950 6% InvestBTC Ai Taboola + GG

Parsing Steps:
1. Extract Affiliate ID: 183
2. Parse token line: "ZA 950 6% InvestBTC Ai Taboola + GG"
3. Extract Country: ZA
4. Extract Price: 950
5. Extract CRG Rate: 6%
6. Extract Funnels: InvestBTC Ai Taboola
7. Extract Source: GG

Result:
{
  "affiliate": "183",
  "country": "ZA",
  "price": "950",
  "crRate": "6%",
  "funnel": "InvestBTC Ai Taboola",
  "source": "GG",
  "dealType": "CRG"
}
```

### Example 2: Multi-Line Format
```
Input:
Offers: 35
Funnel: Ligocu Betfandecs - Zineth Envireks
Source: GG
Country: KR
Price: 1200+10
CRG: -

Parsing Steps:
1. Extract Affiliate ID: 35
2. Check for explicit labels: Found "Funnel:" and "Source:"
3. Extract Funnel: Ligocu Betfandecs - Zineth Envireks
4. Extract Source: GG
5. Extract Country: KR
6. Extract Price: 1200+10 (Price + Bonus)
7. Extract CRG Rate: (from price bonus) 10%

Result:
{
  "affiliate": "35",
  "country": "KR",
  "price": "1200+10",
  "crRate": "10%",
  "funnel": "Ligocu Betfandecs - Zineth Envireks",
  "source": "GG",
  "dealType": "CRG"
}
```

---

## Database Fields

### offers.json
```json
{
  "id": "abc123",
  "affiliateId": "183",
  "country": "ZA",
  "price": "950",
  "crRate": "6%",
  "funnel": "InvestBTC Ai Taboola",
  "source": "GG",
  "dealType": "CRG",
  "deduction": "",
  "date": "2026-03-04",
  "createdDate": "2026-03-04",
  "time": "14:30",
  "status": "Open",
  "openBy": "Telegram"
}
```

### deals.json
Uses the same structure with additional fields for CRM tracking.

---

## CRM Table Display

The Offers table now displays:

| Affiliate | Country | Price | CRG | Deal Type | Deductions | **Funnels** | **Source** | Date | Open By |
|-----------|---------|-------|-----|-----------|------------|------------|-----------|------|---------|
| 183 | ZA | 950 | 6% | CRG | - | InvestBTC Ai Taboola | GG | 03/04 | Telegram |
| 35 | KR | 1200+10 | 10% | CRG | - | Ligocu Betfandecs | GG | 03/04 | Telegram |
| 117 | CA | 1350 | 12% | CRG | 5% | Immutable Azopt | Taboola | 03/04 | Telegram |

---

## Tips for Best Results

1. **Use Separators**: Use `+` to separate funnel from source
   - ✅ `InvestBTC Ai Taboola + GG`
   - ❌ `InvestBTC Ai Taboola GG`

2. **Include Country**: Always include a valid country code
   - ✅ `ZA`, `DE`, `FR`, `UK`, etc.

3. **Include Price**: Either as fixed amount or with bonus
   - ✅ `950` or `1200+10`

4. **Include Source**: Either via keyword or explicit label
   - ✅ `Taboola`, `GG`, or `Source: GG`

5. **Multi-Line Format**: Use explicit labels for clarity
   - ✅ `Funnel: Name` and `Source: GG`

---

## Troubleshooting

### Issue: Source not captured
**Solution**: Make sure source keyword is recognized or use explicit `Source:` label

### Issue: Funnel contains source keyword
**Solution**: Use separator `+` between funnel and source: `Funnel + GG`

### Issue: Country not recognized
**Solution**: Use 2-letter country code (ZA, DE, FR, etc.) or country+language combo (ZAen, DEde)

### Issue: Multiple offers not parsed
**Solution**: Ensure each offer is on a new line with proper formatting

---

## Support

For issues with offer parsing, check:
1. Affiliate ID is present
2. Country code is valid
3. At least one offer line is present
4. Prices are numbers (with optional + bonus)
5. CRG rates have % symbol

---

**Version**: v10.4
**Updated**: March 4, 2026
**Status**: Production Ready ✅
