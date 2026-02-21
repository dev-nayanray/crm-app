const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const https = require("https");
const http = require("http");
const TelegramBot = require("node-telegram-bot-api");

const app = express();
const PORT = 3001;
const VERSION = "1.052";
const DATA_DIR = path.join(__dirname, "data");
const BACKUP_DIR = path.join(__dirname, "backups");

// Telegram Bot Configuration
const TELEGRAM_TOKEN = "8560973106:AAG6J4FRj8ShS-WKLOzs2TmhdaHlqCKevhA";
const FINANCE_GROUP_CHAT_ID = "-4744920512";

// Free API keys (limited requests)
// TronScan API - Free tier (no key required for basic queries)
const TRONSCAN_API = "https://apilist.tronscan.org";
// Etherscan API - Free tier (you can add your own key if needed)
const ETHERSCAN_API_KEY = "2CAM7DNEFBXX2515FXGZGUF6C8SIKNR7ET"; // Add your free API key here if needed
const ETHERSCAN_API = "https://api.etherscan.io/api";
const ETHERSCAN_BASE = "https://etherscan.io";

// Regex patterns for USDT transaction hashes and addresses
// TRC20 (Tron): 64 character base58 string starting with 'T'
const TRC20_HASH_REGEX = /^T[a-zA-Z0-9]{33}$/;
// TRC20 Address: Starts with T, 34 chars
const TRC20_ADDRESS_REGEX = /^T[a-zA-Z0-9]{33}$/;
// ERC20 (Ethereum): 0x followed by 64 hex characters
const ERC20_HASH_REGEX = /^0x[a-fA-F0-9]{64}$/;
// ERC20 Address: 0x followed by 40 hex characters
const ERC20_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;
// BTC Address: Starts with 1, 3, or bc1
const BTC_ADDRESS_REGEX = /^(1|3|bc1)[a-zA-HJ-NP-Z0-9]{25,39}$/;

// USDT Contract Addresses
const TRC20_USDT_CONTRACT = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
const ERC20_USDT_CONTRACT = "0xdAC17F958D2ee523a2206206994597C13D831ec7";

// Helper function to make HTTP requests
function httpRequest(url, isHttps = true) {
  return new Promise((resolve, reject) => {
    const protocol = isHttps ? https : http;
    protocol.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => data += chunk);
      res.on("end", () => resolve(data));
    }).on("error", reject);
  });
}

// Function to check TRC20 USDT transaction on TronScan
async function checkTRC20Transaction(txHash) {
  try {
    const url = `${TRONSCAN_API}/api/transaction-info?hash=${txHash}`;
    const response = await httpRequest(url);
    const data = JSON.parse(response);
    
    if (data && data.contract_type === "TRC20" && data.token_info && data.token_info.symbol === "USDT") {
      return {
        success: true,
        amount: data.amount || data.token_info.amount,
        toAddress: data.to_address,
        fromAddress: data.from_address,
        confirmed: data.confirmed
      };
    }
    return { success: false, error: "Not a USDT TRC20 transaction" };
  } catch (err) {
    console.log("⚠️ TronScan API error:", err.message);
    return { success: false, error: err.message };
  }
}

// Function to check ERC20 USDT transaction on Etherscan
async function checkERC20Transaction(txHash) {
  try {
    let url = `${ETHERSCAN_API}?module=transaction&action=gettxreceiptstatus&txhash=${txHash}`;
    if (ETHERSCAN_API_KEY) {
      url += `&apikey=${ETHERSCAN_API_KEY}`;
    }
    
    const response = await httpRequest(url);
    const data = JSON.parse(response);
    
    if (data.status === "1" && data.message === "OK") {
      // Get transaction details
      let txUrl = `${ETHERSCAN_API}?module=proxy&action=eth_getTransactionByHash&txhash=${txHash}`;
      if (ETHERSCAN_API_KEY) {
        txUrl += `&apikey=${ETHERSCAN_API_KEY}`;
      }
      
      const txResponse = await httpRequest(txUrl);
      const txData = JSON.parse(txResponse);
      
      if (txData.result) {
        // Decode input data to find transfer details
        const input = txData.result.input;
        let amount = "0";
        let toAddress = txData.result.to;
        
        // USDT transfer method ID: 0xa9059cbb
        if (input && input.startsWith("0xa9059cbb")) {
          // Extract amount (last 64 chars / 2 = last 32 bytes = 16 hex = amount in wei)
          const amountHex = "0x" + input.slice(-64);
          amount = (parseInt(amountHex, 16) / 1000000).toString(); // USDT has 6 decimals
          // Extract to address (from 10 to 74)
          toAddress = "0x" + input.slice(34, 74);
        }
        
        return {
          success: true,
          amount: amount,
          toAddress: toAddress,
          fromAddress: txData.result.from,
          confirmed: data.result.status === "1"
        };
      }
    }
    return { success: false, error: "Transaction not found or not confirmed" };
  } catch (err) {
    console.log("⚠️ Etherscan API error:", err.message);
    return { success: false, error: err.message };
  }
}

// Function to get wallet addresses from admin data
function getWallets() {
  const walletsPath = path.join(DATA_DIR, "wallets.json");
  try {
    if (fs.existsSync(walletsPath)) {
      return JSON.parse(fs.readFileSync(walletsPath, "utf8"));
    }
  } catch (err) {
    console.log("⚠️ Error reading wallets:", err.message);
  }
  return [];
}

// Function to check if address matches any wallet
function verifyWalletAddress(address, wallets) {
  if (!wallets || wallets.length === 0) return { matched: false, error: "No wallets configured" };
  
  const normalizedInput = address.toLowerCase().trim();
  
  for (const wallet of wallets) {
    if (wallet.trc && wallet.trc.toLowerCase().trim() === normalizedInput) {
      return { matched: true, wallet: wallet.trc, type: "TRC20" };
    }
    if (wallet.erc && wallet.erc.toLowerCase().trim() === normalizedInput) {
      return { matched: true, wallet: wallet.erc, type: "ERC20" };
    }
    if (wallet.btc && wallet.btc.toLowerCase().trim() === normalizedInput) {
      return { matched: true, wallet: wallet.btc, type: "BTC" };
    }
  }
  
  return { matched: false, error: "Address not in our wallets" };
}

// Initialize Telegram Bot (for commands)
let bot;
let consecutiveErrors = 0;
const MAX_ERRORS_BEFORE_STOP = 10;

if (TELEGRAM_TOKEN && TELEGRAM_TOKEN !== "YOUR_BOT_TOKEN_HERE") {
  try {
    // Use polling with better error handling
    bot = new TelegramBot(TELEGRAM_TOKEN, { 
      polling: true,
      filepath: false,
    });
    console.log("🤖 Telegram bot initialized - polling for commands...");
    
    // Handle polling errors gracefully - stop after too many failures
    bot.on('polling_error', (error) => {
      consecutiveErrors++;
      if (consecutiveErrors >= MAX_ERRORS_BEFORE_STOP) {
        console.log("🛑 Stopping bot polling - network issues detected. Commands won't work until network is fixed.");
        bot.stopPolling().catch(() => {});
        return;
      }
      // Only log every few errors to reduce spam
      if (consecutiveErrors % 5 === 0) {
        console.log(`⚠️ Polling error (${consecutiveErrors}/${MAX_ERRORS_BEFORE_STOP}):`, error.code || error.message);
      }
    });
    
    // Reset error count on successful message
    bot.on('message', () => { consecutiveErrors = 0; });
    
    // Register bot commands with Telegram (shows in command suggestions)
    bot.setMyCommands([
      { command: "/start", description: "Show welcome message and help" },
      { command: "/wallets", description: "Get current wallet addresses" }
    ]).then(() => {
      console.log("✅ Bot commands registered with Telegram");
    }).catch((err) => {
      console.log("⚠️ Failed to register commands:", err.message);
    });
    
    // ── Bot Commands ──
    
    // /start command - Show welcome message with available commands
    bot.onText(/\/start/, (msg) => {
      const chatId = msg.chat.id;
      const welcomeMessage = `👋 <b>Welcome to Blitz Finance Bot!</b>

I can help you manage payments and get wallet information.

<b>Available Commands:</b>
/wallets - Get current wallet addresses
/start - Show this help message

<i>More commands coming soon!</i>`;
      
      bot.sendMessage(chatId, welcomeMessage, { parse_mode: "HTML" });
    });
    
    // /wallets command - Send current wallet addresses
    bot.onText(/\/wallets/, (msg) => {
      const chatId = msg.chat.id;
      
      // Read wallets from data file
      const wallets = readJSON("wallets.json", []);
      
      if (!wallets || wallets.length === 0) {
        bot.sendMessage(chatId, "❌ No wallets found. Please add wallets in the admin panel first.", { parse_mode: "HTML" });
        return;
      }
      
      // Get the most recent wallet (first one)
      const latestWallet = wallets[0];
      const dateStr = latestWallet.date ? (() => { 
        const d = new Date(latestWallet.date + "T00:00:00"); 
        return `${String(d.getDate()).padStart(2,"0")}.${String(d.getMonth()+1).padStart(2,"0")}.${d.getFullYear()}`; 
      })() : "N/A";
      
const walletMessage = `💳 Current Wallets (${dateStr})

TRC-20:
${latestWallet.trc || "—"}

ERC-20 (USDT/USDC):
${latestWallet.erc || "—"}

BTC:
${latestWallet.btc || "—"}

Last updated: ${dateStr}
*3% fee`;
      
      bot.sendMessage(chatId, walletMessage);
      console.log("📱 /wallets command responded to chat:", chatId);
    });
    
    console.log("✅ Bot command handlers ready: /start, /wallets");
    
    // ── USDT Hash Detection - Auto-create Customer Payment ──
    
    // Helper to generate unique ID for customer payments
    function genCustomerPaymentId() {
      return Math.random().toString(36).substr(2, 9);
    }
    
    // Function to extract USDT hash from message text
    function extractUsdtHash(text) {
      if (!text) return null;
      
      // Find all potential hashes in the text
      const words = text.split(/\s+/);
      
      for (const word of words) {
        const trimmed = word.trim();
        // Check for ERC20 hash (0x + 64 hex chars)
        if (ERC20_HASH_REGEX.test(trimmed)) {
          return { hash: trimmed, type: 'ERC20' };
        }
        // Check for TRC20 hash (T + 33 base58 chars)
        if (TRC20_HASH_REGEX.test(trimmed)) {
          return { hash: trimmed, type: 'TRC20' };
        }
      }
      
      return null;
    }
    
    // Function to extract amount from message (looks for patterns like $500, 500 USD, etc.)
    function extractAmount(text) {
      if (!text) return '';
      
      // Try various patterns
      const patterns = [
        /\$(\d+(?:,\d{3})*(?:\.\d{2})?)/,           // $500 or $1,234.56
        /(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:USD|USDT)/i, // 500 USD or 500 USDT
        /(?:amount|total|sum|received)[:\s]*\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/i, // amount: $500
      ];
      
      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
          return match[1].replace(/,/g, '');
        }
      }
      
      return '';
    }
    
    // Function to extract invoice/customer name from message
    function extractInvoice(text) {
      if (!text) return '';
      
      // Try to find common patterns like "Invoice #123", "from ClientName", etc.
      const patterns = [
        /(?:invoice|inv|client|customer|from)[:\s]*([a-zA-Z0-9_-]+)/i,
        /([a-zA-Z][a-zA-Z0-9_-]{2,20})/i,  // Generic name-like text
      ];
      
      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match && match[1] && match[1].length > 2) {
          // Filter out common words
          const exclude = ['usdt', 'usdc', 'eth', 'btc', 'trc20', 'erc20', 'hash', 'tx', 'transaction'];
          if (!exclude.includes(match[1].toLowerCase())) {
            return match[1];
          }
        }
      }
      
      return 'USDT Payment';
    }
    
    // Handle incoming messages - detect USDT hashes with blockchain verification
    bot.on('message', async (msg) => {
      // Ignore commands (they have their own handlers)
      if (msg.text && msg.text.startsWith('/')) return;
      
      // Only process messages from the finance group
      if (msg.chat.id.toString() !== FINANCE_GROUP_CHAT_ID) return;
      
      const messageText = msg.text || '';
      const messageId = msg.message_id;
      
      // Check for USDT hash (can be multiple - handle 1 name + 2 links OR 1 link + 2 names)
      const words = messageText.split(/\s+/);
      const hashes = [];
      const amounts = [];
      const names = [];
      
      // Find all hashes in message
      for (const word of words) {
        const trimmed = word.trim();
        if (ERC20_HASH_REGEX.test(trimmed)) {
          hashes.push({ hash: trimmed, type: 'ERC20' });
        } else if (TRC20_HASH_REGEX.test(trimmed)) {
          hashes.push({ hash: trimmed, type: 'TRC20' });
        }
      }
      
      // Find all amounts ($pattern)
      const amountPattern = /\$(\d+(?:,\d{3})*(?:\.\d{2})?)/g;
      let amountMatch;
      while ((amountMatch = amountPattern.exec(messageText)) !== null) {
        amounts.push(amountMatch[1].replace(/,/g, ''));
      }
      
      // Extract customer names (look for capitalized words that aren't common words)
      const namePatterns = [
        /(?:from|client|customer|invoice|inv)[:\s]*([A-Z][a-zA-Z0-9_-]{2,20})/gi,
        /(?:emp|forge|brand|partner|affiliate)[s]?[:\s]*([A-Z][a-zA-Z0-9_-]{2,20})/gi,
      ];
      
      for (const pattern of namePatterns) {
        let match;
        const regex = new RegExp(pattern.source, pattern.flags);
        while ((match = regex.exec(messageText)) !== null) {
          if (match[1] && match[1].length > 2) {
            const exclude = ['usdt', 'usdc', 'eth', 'btc', 'trc20', 'erc20', 'hash', 'tx', 'transaction', 'http', 'https', 'www', 'com', 'org', 'io'];
            if (!exclude.includes(match[1].toLowerCase())) {
              names.push(match[1]);
            }
          }
        }
      }
      
      // Also try to get names from text that look like names (capitalized words)
      const capitalWords = messageText.match(/\b[A-Z][a-zA-Z0-9_-]{2,20}\b/g) || [];
      for (const word of capitalWords) {
        const exclude = ['USD', 'USDT', 'USDC', 'ETH', 'BTC', 'TRC', 'ERC', 'FROM', 'HTTP', 'HTTPS', 'COM', 'ORG', 'NET', 'IO'];
        if (!exclude.includes(word.toUpperCase()) && word.length > 2 && !names.includes(word)) {
          names.push(word);
        }
      }
      
      if (hashes.length === 0) return; // No hash found
      
      console.log(`🔍 Found ${hashes.length} hash(es), ${amounts.length} amount(s), ${names.length} name(s)`);
      
      // Get wallets for verification
      const wallets = getWallets();
      
      // Process each hash found
      for (let i = 0; i < hashes.length; i++) {
        const { hash, type } = hashes[i];
        const amount = amounts[i] || amounts[0] || '0'; // Use corresponding amount or first
        const invoice = names[i] || names[0] || 'Payment';
        
        console.log(`🔍 Processing ${type} hash: ${hash.substring(0, 10)}... for ${invoice} - $${amount}`);
        
        // Verify transaction on blockchain
        let txResult = { success: false, error: "Could not verify" };
        if (type === 'TRC20') {
          txResult = await checkTRC20Transaction(hash);
        } else if (type === 'ERC20') {
          txResult = await checkERC20Transaction(hash);
        }
        
        // Verify wallet address
        const walletVerify = txResult.success ? verifyWalletAddress(txResult.toAddress, wallets) : { matched: false, error: "Transaction not verified" };
        
        const now = new Date();
        const paidDate = now.toISOString().split('T')[0];
        
        // Determine status based on verification
        let status = "Open";
        let statusNote = "";
        
        if (txResult.success && walletVerify.matched) {
          // Transaction verified - check amount
          const txAmount = parseFloat(txResult.amount);
          const declaredAmount = parseFloat(amount);
          
          // Allow 5% tolerance for amount difference
          if (isNaN(txAmount) || isNaN(declaredAmount) || Math.abs(txAmount - declaredAmount) / txAmount < 0.05) {
            status = "Received";
            statusNote = "✅ Verified on blockchain - wallet matches!";
          } else {
            status = "Open";
            statusNote = `⚠️ Amount mismatch: blockchain $${txAmount} vs declared $${declaredAmount}`;
          }
        } else if (txResult.success && !walletVerify.matched) {
          status = "Open";
          statusNote = `❌ Address mismatch! Sent to: ${txResult.toAddress.substring(0, 8)}... Not in our wallets!`;
        } else {
          status = "Open";
          statusNote = `⚠️ Could not verify: ${txResult.error || "Unknown error"}`;
        }
        
        // Create new customer payment
        const newPayment = {
          id: genCustomerPaymentId(),
          invoice: invoice,
          paidDate: paidDate,
          status: status,
          amount: amount,
          openBy: "Telegram Bot",
          instructions: statusNote,
          paymentHash: hash,
          blockchainType: type,
          blockchainVerified: txResult.success,
          toAddress: txResult.toAddress || "",
          month: now.getMonth() + 1,
          year: now.getFullYear()
        };
        
        // Read existing customer payments
        const customerPayments = readJSON("customer-payments.json", []);
        
        // Add new payment
        customerPayments.unshift(newPayment);
        writeJSON("customer-payments.json", customerPayments);
        
        console.log(`✅ Customer payment created: ${invoice} - $${amount} - Status: ${status}`);
        
        // Send confirmation to group
        let confirmMessage = `📨 <b>Payment Processed!</b>\n\n`;
        confirmMessage += `📋 Invoice: <b>${invoice}</b>\n`;
        confirmMessage += `💵 Amount: <b>$${amount}</b>\n`;
        confirmMessage += `🔗 Hash (${type}): <code>${hash}</code>\n`;
        
        if (txResult.success) {
          confirmMessage += `✅ Blockchain: <b>Verified</b>\n`;
          confirmMessage += `📍 To: <code>${(txResult.toAddress || '').substring(0, 12)}...</code>\n`;
          confirmMessage += `💰 Tx Amount: $${txResult.amount || 'N/A'}\n`;
        } else {
          confirmMessage += `⚠️ Blockchain: <b>Could not verify</b>\n`;
        }
        
        if (walletVerify.matched) {
          confirmMessage += `✅ Wallet: <b>MATCHED</b> (${walletVerify.type})\n`;
        } else {
          confirmMessage += `❌ Wallet: <b>${walletVerify.error}</b>\n`;
        }
        
        confirmMessage += `\n📊 Status: <b>${status}</b>`;
        
        bot.sendMessage(FINANCE_GROUP_CHAT_ID, confirmMessage, { parse_mode: "HTML" });
      }
    });
    
    console.log("✅ USDT hash detection enabled - will auto-create customer payments");
    
  } catch (err) {
    console.log("⚠️ Failed to initialize Telegram bot:", err.message);
  }
}

// Helper function to send Telegram notifications using direct API
function sendTelegramNotification(message) {
  if (TELEGRAM_TOKEN === "YOUR_BOT_TOKEN_HERE" || !TELEGRAM_TOKEN) {
    console.log("📱 Telegram notification (no token configured):", message);
    return;
  }
  
  const postData = JSON.stringify({
    chat_id: FINANCE_GROUP_CHAT_ID,
    text: message,
    parse_mode: "HTML"
  });

  const options = {
    hostname: 'api.telegram.org',
    port: 443,
    path: `/bot${TELEGRAM_TOKEN}/sendMessage`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      if (res.statusCode === 200) {
        console.log("✅ Telegram notification sent");
      } else {
        console.log("❌ Telegram error:", res.statusCode, data);
      }
    });
  });

  req.on('error', (err) => {
    console.error("❌ Telegram request error:", err.message);
  });

  req.write(postData);
  req.end();
  
  console.log("📱 Sending Telegram notification:", message.substring(0, 50) + "...");
}

// Format message for open payment
function formatOpenPaymentMessage(payment) {
  return `💰 <b>NEW OPEN PAYMENT</b>

📋 Invoice: <b>#${payment.invoice}</b>
💵 Amount: <b>$${parseFloat(payment.amount).toLocaleString("en-US")}</b>
👤 Opened by: ${payment.openBy || "Unknown"}`;
}

// Format message for paid payment
function formatPaidPaymentMessage(payment) {
  return `💰 <b>PAYMENT DONE</b>

📋 Invoice: <b>#${payment.invoice}</b>
💵 Amount: <b>$${parseFloat(payment.amount).toLocaleString("en-US")}</b>
👤 Paid by: ${payment.openBy || "Unknown"}
Payment Hash: <code>${payment.paymentHash || "N/A"}</code>`;
}

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Helper: read/write JSON files
function readJSON(filename, fallback) {
  const filepath = path.join(DATA_DIR, filename);
  try {
    if (fs.existsSync(filepath)) {
      return JSON.parse(fs.readFileSync(filepath, "utf8"));
    }
  } catch (err) {
    console.error(`Error reading ${filename}:`, err.message);
  }
  return fallback;
}

function writeJSON(filename, data) {
  const filepath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), "utf8");
}

// ── Data Endpoints ──
const endpoints = ["payments", "customer-payments", "users", "crg-deals", "daily-cap", "deals", "wallets"];

// GET /api/payments — load payments
app.get("/api/payments", (req, res) => {
  const data = readJSON("payments.json", []);
  res.json(data);
});

// POST /api/payments — save all payments (with Telegram notifications)
app.post("/api/payments", (req, res) => {
  const newPayments = req.body;
  const oldPayments = readJSON("payments.json", []);
  
  // Track payments by ID for easy lookup
  const oldPaymentsMap = new Map(oldPayments.map(p => [p.id, p]));
  
  console.log("📊 Processing payments update:", newPayments.length, "items");
  
  // Check for each payment
  newPayments.forEach(p => {
    const oldP = oldPaymentsMap.get(p.id);
    
    if (!oldP) {
      // NEW payment - notify based on status
      console.log("📋 NEW Payment:", p.invoice, "| Status:", p.status);
      if (p.status === "Open" || p.status === "On the way" || p.status === "Approved to pay") {
        const message = formatOpenPaymentMessage(p);
        console.log("📱 → Sending NEW OPEN notification:", p.invoice);
        sendTelegramNotification(message);
      } else if (p.status === "Paid") {
        const message = formatPaidPaymentMessage(p);
        console.log("📱 → Sending NEW PAID notification:", p.invoice);
        sendTelegramNotification(message);
      }
    } else if (oldP.status !== p.status) {
      // EXISTING payment - status changed
      console.log("📋 Payment:", p.invoice, "| Old:", oldP.status, "| New:", p.status);
      
      if (p.status === "Paid" && oldP.status !== "Paid") {
        // Changed TO Paid
        console.log("📱 → Sending PAID status change notification:", p.invoice);
        const message = formatPaidPaymentMessage(p);
        sendTelegramNotification(message);
      } else if ((p.status === "Open" || p.status === "On the way" || p.status === "Approved to pay") && oldP.status === "Paid") {
        // Changed FROM Paid back to Open - send as new open
        console.log("📱 → Sending RE-OPENED notification:", p.invoice);
        const message = formatOpenPaymentMessage(p);
        sendTelegramNotification(message);
      }
    }
  });
  
  writeJSON("payments.json", newPayments);
  res.json({ ok: true, count: newPayments.length });
});

// Other data endpoints (generic GET/POST)
["customer-payments", "users", "crg-deals", "daily-cap", "deals", "wallets"].forEach(ep => {
  const file = ep + ".json";
  app.get(`/api/${ep}`, (req, res) => res.json(readJSON(file, [])));
  app.post(`/api/${ep}`, (req, res) => { writeJSON(file, req.body); res.json({ ok: true, count: req.body.length }); });
});

// ── Health check ──
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", version: VERSION, time: new Date().toISOString() });
});

// ── Telegram Endpoints ──

// POST /api/telegram/notify - Send custom notification
app.post("/api/telegram/notify", (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }
  sendTelegramNotification(message);
  res.json({ ok: true });
});

// GET /api/telegram/test - Test bot connection
app.get("/api/telegram/test", (req, res) => {
  if (TELEGRAM_TOKEN === "YOUR_BOT_TOKEN_HERE" || !TELEGRAM_TOKEN) {
    return res.json({ status: "no_token", message: "Please configure your Telegram bot token in server.cjs" });
  }
  
  const options = {
    hostname: 'api.telegram.org',
    port: 443,
    path: `/bot${TELEGRAM_TOKEN}/getMe`,
    method: 'GET'
  };

  const botReq = https.request(options, (response) => {
    let data = '';
    response.on('data', (chunk) => { data += chunk; });
    response.on('end', () => {
      if (response.statusCode === 200) {
        const botInfo = JSON.parse(data).result;
        res.json({ 
          status: "connected", 
          bot: botInfo.username,
          name: botInfo.first_name 
        });
      } else {
        res.json({ status: "error", error: data });
      }
    });
  });

  botReq.on('error', (err) => {
    res.json({ status: "error", error: err.message });
  });

  botReq.end();
});

// ── Hourly Backup System ──
function createBackup() {
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const backupPath = path.join(BACKUP_DIR, ts);
  if (!fs.existsSync(backupPath)) fs.mkdirSync(backupPath, { recursive: true });

  let count = 0;
  endpoints.forEach(ep => {
    const src = path.join(DATA_DIR, ep + ".json");
    const dst = path.join(backupPath, ep + ".json");
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dst);
      count++;
    }
  });
  console.log(`📦 Backup created: ${ts} (${count} files)`);

  // Keep only last 48 backups (2 days)
  const dirs = fs.readdirSync(BACKUP_DIR).sort();
  while (dirs.length > 48) {
    const old = dirs.shift();
    fs.rmSync(path.join(BACKUP_DIR, old), { recursive: true, force: true });
    console.log(`🗑️  Old backup removed: ${old}`);
  }
}

// Backup every hour
setInterval(createBackup, 60 * 60 * 1000);
// Also backup 5 seconds after startup
setTimeout(createBackup, 5000);

// List available backups
app.get("/api/backups", (req, res) => {
  if (!fs.existsSync(BACKUP_DIR)) return res.json([]);
  res.json(fs.readdirSync(BACKUP_DIR).sort().reverse());
});

// Restore from a specific backup
app.post("/api/restore/:backup", (req, res) => {
  const bp = path.join(BACKUP_DIR, req.params.backup);
  if (!fs.existsSync(bp)) return res.json({ ok: false, error: "Backup not found" });
  
  let count = 0;
  endpoints.forEach(ep => {
    const src = path.join(bp, ep + ".json");
    const dst = path.join(DATA_DIR, ep + ".json");
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dst);
      count++;
    }
  });
  console.log(`♻️ Restored backup: ${req.params.backup} (${count} files)`);
  res.json({ ok: true, restored: req.params.backup, files: count });
});

// ── Start Server ──
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Blitz API v${VERSION} running on port ${PORT}`);
  console.log(`   Data: ${DATA_DIR}`);
  console.log(`   Backups: ${BACKUP_DIR} (every hour, keep 48)`);
  console.log(`   Telegram bot: @blitzfinance_bot`);
});
