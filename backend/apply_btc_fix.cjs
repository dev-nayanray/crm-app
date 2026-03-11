#!/usr/bin/env node
/**
 * Blitz CRM Server — BTC Amount Fix Patcher (v10.22 → v10.23)
 * 
 * Usage: node apply_btc_fix.js [path/to/server.cjs]
 * Default: ./server.cjs
 * 
 * Creates a backup at server.cjs.backup-v10.22 before patching.
 */

const fs = require('fs');
const path = require('path');

const serverPath = process.argv[2] || path.join(__dirname, 'server.cjs');

if (!fs.existsSync(serverPath)) {
  console.error(`❌ File not found: ${serverPath}`);
  process.exit(1);
}

let code = fs.readFileSync(serverPath, 'utf8');
console.log(`📄 Read ${serverPath} (${code.length} bytes)`);

// Create backup
const backupPath = serverPath + '.backup-v10.22';
fs.writeFileSync(backupPath, code, 'utf8');
console.log(`💾 Backup saved: ${backupPath}`);

let patchCount = 0;

// ═══════════════════════════════════════════════════════════════
// PATCH 1: Update VERSION
// ═══════════════════════════════════════════════════════════════
if (code.includes('const VERSION = "10.22"')) {
  code = code.replace('const VERSION = "10.22"', 'const VERSION = "10.23"');
  patchCount++;
  console.log('✅ PATCH 1: VERSION → 10.23');
} else {
  console.log('⚠️  PATCH 1: VERSION not found (may already be patched)');
}

// ═══════════════════════════════════════════════════════════════
// PATCH 2: Replace checkBTCTransaction + add getBTCPriceUSD
// ═══════════════════════════════════════════════════════════════
const btcFuncStart = '// v10.1: BTC transaction verification via blockchain.com API\nasync function checkBTCTransaction(txHash) {';
const startIdx = code.indexOf(btcFuncStart);

if (startIdx === -1) {
  console.log('⚠️  PATCH 2: checkBTCTransaction start marker not found');
} else {
  // Find matching closing brace by tracking depth
  const funcBodyStart = code.indexOf('{', startIdx + btcFuncStart.indexOf('{'));
  let depth = 1;
  let pos = funcBodyStart + 1;
  while (depth > 0 && pos < code.length) {
    if (code[pos] === '{') depth++;
    else if (code[pos] === '}') depth--;
    pos++;
  }
  const funcEnd = pos;
  
  const newBTCCode = `// ═══ NEW: BTC Price Cache — fetch BTC/USD price for dollar conversion ═══
// v10.23: Required because BTC transaction APIs return amounts in BTC (satoshis),
// not in USD like ERC20/TRC20 stablecoin APIs do.
let btcPriceCache = { price: 0, fetchedAt: 0 };
const BTC_PRICE_CACHE_TTL = 5 * 60 * 1000; // Cache for 5 minutes

async function getBTCPriceUSD() {
  const now = Date.now();
  if (btcPriceCache.price > 0 && (now - btcPriceCache.fetchedAt) < BTC_PRICE_CACHE_TTL) {
    return btcPriceCache.price;
  }
  
  // Method 1: CoinGecko API (free, no key needed)
  try {
    const raw = await httpRequest("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd");
    const data = JSON.parse(raw);
    if (data && data.bitcoin && data.bitcoin.usd) {
      btcPriceCache = { price: data.bitcoin.usd, fetchedAt: now };
      console.log(\`💰 [BTC] Price updated: $\${data.bitcoin.usd}\`);
      return data.bitcoin.usd;
    }
  } catch (err) {
    console.log(\`⚠️ [BTC] CoinGecko price error: \${err.message}\`);
  }
  
  // Method 2: Blockchain.info ticker
  try {
    const raw = await httpRequest("https://blockchain.info/ticker");
    const data = JSON.parse(raw);
    if (data && data.USD && data.USD.last) {
      btcPriceCache = { price: data.USD.last, fetchedAt: now };
      console.log(\`💰 [BTC] Price updated (blockchain.info): $\${data.USD.last}\`);
      return data.USD.last;
    }
  } catch (err) {
    console.log(\`⚠️ [BTC] blockchain.info price error: \${err.message}\`);
  }
  
  // Method 3: Mempool.space price API
  try {
    const raw = await httpRequest("https://mempool.space/api/v1/prices");
    const data = JSON.parse(raw);
    if (data && data.USD) {
      btcPriceCache = { price: data.USD, fetchedAt: now };
      console.log(\`💰 [BTC] Price updated (mempool): $\${data.USD}\`);
      return data.USD;
    }
  } catch (err) {
    console.log(\`⚠️ [BTC] mempool price error: \${err.message}\`);
  }
  
  if (btcPriceCache.price > 0) {
    console.log(\`⚠️ [BTC] Using stale cached price: $\${btcPriceCache.price}\`);
    return btcPriceCache.price;
  }
  
  console.log(\`❌ [BTC] Could not fetch BTC price from any source\`);
  return 0;
}

// v10.23: BTC transaction verification — REWRITTEN
// Primary: mempool.space API (most reliable, no rate limits, no API key)
// Fallback 1: blockchain.info  |  Fallback 2: blockchair.com
// KEY FIX: Returns USD amount (converted from BTC using live price)
async function checkBTCTransaction(txHash) {
  try {
    console.log(\`🔍 [BTC] Checking transaction: \${txHash}\`);
    
    let btcAmount = 0;
    let toAddress = "";
    let fromAddress = "";
    let confirmed = false;
    let found = false;
    
    // ═══ METHOD 1: mempool.space API (primary) ═══
    try {
      const url = \`https://mempool.space/api/tx/\${txHash}\`;
      const raw = await httpRequest(url);
      const data = JSON.parse(raw);
      
      if (data && (data.txid || data.vout)) {
        found = true;
        confirmed = data.status && data.status.confirmed === true;
        
        let largestOutput = 0;
        if (data.vout && Array.isArray(data.vout)) {
          for (const out of data.vout) {
            const valueSats = out.value || 0;
            if (valueSats > largestOutput) {
              largestOutput = valueSats;
              toAddress = out.scriptpubkey_address || "";
            }
          }
        }
        
        if (data.vin && Array.isArray(data.vin) && data.vin.length > 0) {
          const firstInput = data.vin[0];
          if (firstInput.prevout) {
            fromAddress = firstInput.prevout.scriptpubkey_address || "";
          }
        }
        
        btcAmount = largestOutput / 100000000;
        console.log(\`✅ [BTC] mempool.space: \${btcAmount.toFixed(8)} BTC to \${toAddress} (confirmed: \${confirmed})\`);
      }
    } catch (err) {
      console.log(\`⚠️ [BTC] mempool.space API error: \${err.message}\`);
    }
    
    // ═══ METHOD 2: blockchain.info API (fallback) ═══
    if (!found) {
      try {
        const url = \`https://blockchain.info/rawtx/\${txHash}\`;
        const raw = await httpRequest(url);
        const data = JSON.parse(raw);
        
        if (data && data.hash) {
          found = true;
          confirmed = data.block_height > 0;
          
          let largestOutput = 0;
          if (data.out && Array.isArray(data.out)) {
            for (const out of data.out) {
              if ((out.value || 0) > largestOutput) {
                largestOutput = out.value || 0;
                toAddress = out.addr || "";
              }
            }
          }
          
          if (data.inputs && Array.isArray(data.inputs) && data.inputs.length > 0) {
            fromAddress = data.inputs[0].prev_out ? data.inputs[0].prev_out.addr || "" : "";
          }
          
          btcAmount = largestOutput / 100000000;
          console.log(\`✅ [BTC] blockchain.info: \${btcAmount.toFixed(8)} BTC to \${toAddress} (confirmed: \${confirmed})\`);
        }
      } catch (err) {
        console.log(\`⚠️ [BTC] blockchain.info API error: \${err.message}\`);
      }
    }
    
    // ═══ METHOD 3: Blockchair API (last resort) ═══
    if (!found) {
      try {
        const url = \`https://api.blockchair.com/bitcoin/dashboards/transaction/\${txHash}\`;
        const raw = await httpRequest(url);
        const data = JSON.parse(raw);
        
        if (data && data.data && data.data[txHash]) {
          found = true;
          const tx = data.data[txHash].transaction;
          const outputs = data.data[txHash].outputs || [];
          
          let largestOutput = 0;
          for (const out of outputs) {
            if ((out.value || 0) > largestOutput) {
              largestOutput = out.value || 0;
              toAddress = out.recipient || "";
            }
          }
          
          const inputs = data.data[txHash].inputs || [];
          if (inputs.length > 0) {
            fromAddress = inputs[0].recipient || "";
          }
          
          btcAmount = largestOutput / 100000000;
          confirmed = tx && tx.block_id > 0;
          console.log(\`✅ [BTC] Blockchair: \${btcAmount.toFixed(8)} BTC\`);
        }
      } catch (err) {
        console.log(\`⚠️ [BTC] Blockchair API error: \${err.message}\`);
      }
    }
    
    if (!found || btcAmount <= 0) {
      console.log(\`❌ [BTC] All methods failed for \${txHash.slice(0,12)}...\`);
      return { success: false, error: "Could not verify BTC transaction" };
    }
    
    // ═══ KEY FIX: Convert BTC → USD ═══
    const btcPrice = await getBTCPriceUSD();
    let usdAmount = "0";
    let amountDisplay = \`\${btcAmount.toFixed(8)} BTC\`;
    
    if (btcPrice > 0) {
      const usdValue = btcAmount * btcPrice;
      usdAmount = usdValue.toFixed(2);
      amountDisplay = \`\${btcAmount.toFixed(8)} BTC (~$\${usdAmount})\`;
      console.log(\`💰 [BTC] Converted: \${btcAmount.toFixed(8)} BTC × $\${btcPrice} = $\${usdAmount}\`);
    } else {
      console.log(\`⚠️ [BTC] Could not get BTC price — returning BTC amount as string\`);
      usdAmount = btcAmount.toFixed(8);
    }
    
    return { 
      success: true, 
      amount: usdAmount,
      amountBTC: btcAmount.toFixed(8),
      amountDisplay: amountDisplay,
      btcPriceUsed: btcPrice,
      toAddress, 
      fromAddress, 
      confirmed, 
      isBTC: true 
    };
  } catch (err) {
    console.error(\`❌ [BTC] Fatal error: \${err.message}\`);
    return { success: false, error: err.message };
  }
}`;

  code = code.slice(0, startIdx) + newBTCCode + code.slice(funcEnd);
  patchCount++;
  console.log('✅ PATCH 2: Replaced checkBTCTransaction + added getBTCPriceUSD');
}

// ═══════════════════════════════════════════════════════════════
// PATCH 3: Fix Brands group BTC amount handling
// ═══════════════════════════════════════════════════════════════
const oldBrandsMarker = `// v9.19 FIX: Prefer blockchain amount when available and non-zero
            // FIX: Handle BTC amount format (e.g., "0.00500000 BTC") - parseFloat alone returns 0 for such strings
            let blockchainAmount = null;
            if (txResult.amount) {
              // Extract numeric part from amount string (handles "0.00500000 BTC" format)
              const numericAmount = txResult.amount.replace(/[^\\d.]/g, '');
              if (numericAmount && numericAmount !== "0" && parseFloat(numericAmount) > 0) {
                blockchainAmount = numericAmount;
              }
            }
            const messageAmount = amounts[i] || null;
            const amount = (blockchainAmount || messageAmount || "0").toString();
            console.log(\`💰 [Brands] Hash \${hash.slice(0,10)}... → blockchain=$\${blockchainAmount || 'N/A'}, message=$\${messageAmount || 'N/A'}, final=$\${amount}\`);`;

const newBrandsBlock = `// v10.23 FIX: BTC now returns USD amount directly from checkBTCTransaction
            // For ERC20/TRC20: amount is already USD (USDT/USDC value)
            // For BTC: amount is now USD (converted using live BTC price)
            let blockchainAmount = null;
            if (txResult.amount) {
              const numericAmount = txResult.amount.replace(/[^\\d.]/g, '');
              if (numericAmount && numericAmount !== "0" && parseFloat(numericAmount) > 0) {
                blockchainAmount = numericAmount;
              }
            }
            const messageAmount = amounts[i] || null;
            const amount = (blockchainAmount || messageAmount || "0").toString();
            // v10.23: Enhanced BTC logging with conversion details
            if (txResult.isBTC && txResult.amountBTC) {
              console.log(\`💰 [Brands] BTC Hash \${hash.slice(0,10)}... → \${txResult.amountBTC} BTC ≈ $\${amount} (price: $\${txResult.btcPriceUsed || 'N/A'})\`);
            } else {
              console.log(\`💰 [Brands] Hash \${hash.slice(0,10)}... → blockchain=$\${blockchainAmount || 'N/A'}, message=$\${messageAmount || 'N/A'}, final=$\${amount}\`);
            }`;

if (code.includes(oldBrandsMarker)) {
  code = code.replace(oldBrandsMarker, newBrandsBlock);
  patchCount++;
  console.log('✅ PATCH 3: Fixed Brands group BTC amount handling');
} else {
  console.log('⚠️  PATCH 3: Brands amount block not found');
}

// ═══════════════════════════════════════════════════════════════
// PATCH 4: Fix Finance group BTC amount handling
// ═══════════════════════════════════════════════════════════════
const oldFinanceMarker = `// v9.19 FIX: Prefer blockchain amount when available and non-zero
        // FIX: Handle BTC amount format (e.g., "0.00500000 BTC") - parseFloat alone returns 0 for such strings
        let blockchainAmount = null;
        if (txResult.amount) {
          // Extract numeric part from amount string (handles "0.00500000 BTC" format)
          const numericAmount = txResult.amount.replace(/[^\\d.]/g, '');
          if (numericAmount && numericAmount !== "0" && parseFloat(numericAmount) > 0) {
            blockchainAmount = numericAmount;
          }
        }
        const messageAmount = amounts[i] || null;
        const amount = (blockchainAmount || messageAmount || "0").toString();
        console.log(\`💰 [Finance] Hash \${hash.slice(0,10)}... → blockchain=$\${blockchainAmount || 'N/A'}, message=$\${messageAmount || 'N/A'}, final=$\${amount}\`);`;

const newFinanceBlock = `// v10.23 FIX: BTC now returns USD amount directly from checkBTCTransaction
        let blockchainAmount = null;
        if (txResult.amount) {
          const numericAmount = txResult.amount.replace(/[^\\d.]/g, '');
          if (numericAmount && numericAmount !== "0" && parseFloat(numericAmount) > 0) {
            blockchainAmount = numericAmount;
          }
        }
        const messageAmount = amounts[i] || null;
        const amount = (blockchainAmount || messageAmount || "0").toString();
        // v10.23: Enhanced BTC logging with conversion details
        if (txResult.isBTC && txResult.amountBTC) {
          console.log(\`💰 [Finance] BTC Hash \${hash.slice(0,10)}... → \${txResult.amountBTC} BTC ≈ $\${amount} (price: $\${txResult.btcPriceUsed || 'N/A'})\`);
        } else {
          console.log(\`💰 [Finance] Hash \${hash.slice(0,10)}... → blockchain=$\${blockchainAmount || 'N/A'}, message=$\${messageAmount || 'N/A'}, final=$\${amount}\`);
        }`;

if (code.includes(oldFinanceMarker)) {
  code = code.replace(oldFinanceMarker, newFinanceBlock);
  patchCount++;
  console.log('✅ PATCH 4: Fixed Finance group BTC amount handling');
} else {
  console.log('⚠️  PATCH 4: Finance amount block not found');
}

// ═══════════════════════════════════════════════════════════════
// PATCH 5: Update startup banner
// ═══════════════════════════════════════════════════════════════
const bannerMarker = `  console.log(\`║  🔧 v10.06: WS broadcasts full tombstone list ║\`);`;
const bannerReplacement = `  console.log(\`║  🔧 v10.06: WS broadcasts full tombstone list ║\`);
  console.log(\`║  💰 v10.23: BTC amount fix (USD conversion)   ║\`);`;

if (code.includes(bannerMarker) && !code.includes('v10.23: BTC amount fix')) {
  code = code.replace(bannerMarker, bannerReplacement);
  patchCount++;
  console.log('✅ PATCH 5: Updated startup banner');
}

// ═══════════════════════════════════════════════════════════════
// Write patched file
// ═══════════════════════════════════════════════════════════════
fs.writeFileSync(serverPath, code, 'utf8');
console.log(`\n✅ ${patchCount} patches applied successfully!`);
console.log(`📄 Patched: ${serverPath} (${code.length} bytes)`);
console.log(`💾 Backup: ${backupPath}`);
console.log(`\n🔄 Restart your server: pm2 restart blitz-crm`);
