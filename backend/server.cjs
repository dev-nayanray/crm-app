const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const https = require("https");
const http = require("http");
const TelegramBot = require("node-telegram-bot-api");

const app = express();
const PORT = 3001;
const VERSION = "1.055";
const DATA_DIR = path.join(__dirname, "data");
const BACKUP_DIR = path.join(__dirname, "backups");

// Telegram Bot Configuration
const TELEGRAM_TOKEN = "8560973106:AAG6J4FRj8ShS-WKLOzs2TmhdaHlqCKevhA";
const FINANCE_GROUP_CHAT_ID = "-4744920512";

// Free API keys (limited requests)
// TronScan API - Free tier (no key required for basic queries)
const TRONSCAN_API = "https://apilist.tronscan.org";
// Etherscan API - Free tier (you can add your own key if needed)
const ETHERSCAN_API_KEY = "2CAM7DNEFBXX2515FXGZGUF6C8SIKNR7ET";
const ETHERSCAN_API = "https://api.etherscan.io/api";
const ETHERSCAN_BASE = "https://etherscan.io";

// Regex patterns for USDT transaction hashes and addresses
// TRC20 Transaction Hash: 64 character base58 string (like 208c664be9271f8e1ac3bf993501b05b90674f93b963966bf81a2da9708cf121)
const TRC20_HASH_REGEX = /^[a-zA-Z0-9]{64}$/;
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

// Function to fetch deals from external Leeds CRM API
async function fetchExternalDeals() {
  try {
    const response = await httpRequest("https://leeds-crm.com/api/deals", true);
    const data = JSON.parse(response);
    return { success: true, data: data };
  } catch (err) {
    console.log("⚠️ External Deals API error:", err.message);
    return { success: false, error: err.message };
  }
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
    // Using Etherscan V2 API endpoints
    const ETHERSCAN_V2_API = "https://api.etherscan.io/v2/api";
    const CHAIN_ID = "1"; // Ethereum mainnet
    
    // First, get transaction receipt for confirmation and more details
    let receiptUrl = `${ETHERSCAN_V2_API}?action=txlist&module=account&address=${txHash}&startblock=0&endblock=99999999&page=1&offset=1&sort=desc&apikey=${ETHERSCAN_API_KEY}`;
    
    // Try V2 API first - get transaction receipt
    let receiptUrl2 = `${ETHERSCAN_V2_API}?action=get_txreceipt_status&module=transaction&chainid=${CHAIN_ID}&txhash=${txHash}&apikey=${ETHERSCAN_API_KEY}`;
    
    const receiptResponse2 = await httpRequest(receiptUrl2);
    const receiptData2 = JSON.parse(receiptResponse2);
    
    // Get transaction details using V2 API
    let txUrl = `${ETHERSCAN_V2_API}?action=get_txinfo&module=transaction&chainid=${CHAIN_ID}&txhash=${txHash}&apikey=${ETHERSCAN_API_KEY}`;
    
    const txResponse = await httpRequest(txUrl);
    const txData = JSON.parse(txResponse);
    
    // Check if we got valid responses
    let txResult = null;
    
    // Handle txData.result - could be object or string (error message)
    if (txData.status === "1" && txData.message === "OK" && txData.result) {
      txResult = txData.result;
    } else if (txData.message) {
      // API returned error message
      console.log("⚠️ Etherscan V2 API error:", txData.message, txData.result);
    }
    
    // If V2 fails, try V1 as fallback
    if (!txResult) {
      console.log("⚠️ V2 API failed, trying V1...");
      
      // Try V1 proxy endpoint
      let v1TxUrl = `${ETHERSCAN_API}?module=proxy&action=eth_getTransactionByHash&txhash=${txHash}`;
      if (ETHERSCAN_API_KEY) {
        v1TxUrl += `&apikey=${ETHERSCAN_API_KEY}`;
      }
      
      const v1TxResponse = await httpRequest(v1TxUrl);
      const v1TxData = JSON.parse(v1TxResponse);
      
      if (v1TxData.status === "1" && typeof v1TxData.result === "object" && v1TxData.result !== null) {
        txResult = v1TxData.result;
      }
    }
    
    // If we still don't have data, return failure
    if (!txResult) {
      return { success: false, error: "Could not fetch transaction data from Etherscan" };
    }
    
    // Extract transaction details
    const input = txResult.input || "";
    let amount = "0";
    let toAddress = "";
    let fromAddress = "";
    
    // Get from and to addresses
    fromAddress = txResult.from || "";
    toAddress = txResult.to || "";
    
    // Decode input data to find transfer details for USDT
    // USDT transfer method ID: 0xa9059cbb
    if (input && input.startsWith("0xa9059cbb") && input.length >= 74) {
      // Extract amount (last 64 chars / 2 = last 32 bytes = 16 hex = amount in wei)
      const amountHex = "0x" + input.slice(-64);
      amount = (parseInt(amountHex, 16) / 1000000).toString(); // USDT has 6 decimals
      // Extract to address (from 34 to 74 - 40 hex chars = 20 bytes)
      toAddress = "0x" + input.slice(34, 74);
    } else if (txResult.value && txResult.value !== "0x0") {
      // If no method ID or not a standard transfer, try to get value from tx
      // Note: This is for ETH transfers, not ERC20
      amount = (parseInt(txResult.value, 16) / 1000000000000000000).toString(); // ETH has 18 decimals
    }
    
    // Check if transaction is confirmed (receipt status = 1)
    const confirmed = receiptData2.status === "1" && receiptData2.result && receiptData2.result.status === "1";
    
    return {
      success: true,
      amount: amount,
      toAddress: toAddress,
      fromAddress: fromAddress,
      confirmed: confirmed,
      hash: txHash
    };
    
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
  if (!address) return { matched: false, error: "No address in transaction" };
  
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

// User state tracking for multi-step commands
// Format: { chatId: { state: 'waiting_for_country', command: '/deals' } }
const userStates = {};

if (TELEGRAM_TOKEN && TELEGRAM_TOKEN !== "YOUR_BOT_TOKEN_HERE") {
  try {
    // Use polling with better error handling
    bot = new TelegramBot(TELEGRAM_TOKEN, { 
      polling: true,
      filepath: false,
    });
    console.log("🤖 Telegram bot initialized - polling for commands...");
    
    // Handle polling errors gracefully - don't stop on errors
    bot.on('polling_error', (error) => {
      // Just log the error and continue - don't stop polling
      console.log(`⚠️ Polling error:`, error.code || error.message);
    });
    
    // Register bot commands with Telegram (shows in command suggestions)
    bot.setMyCommands([
      { command: "/start", description: "Show welcome message and help" },
      { command: "/wallets", description: "Get current wallet addresses" },
      { command: "/crgdeals", description: "View today's CRG deals by country" },
      { command: "/deals", description: "View all time CRG deals by country (historical)" }
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
/deals - Get current wallet addresses
/crgdeals - Get current wallet addresses
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
    
    console.log("✅ Bot command handlers ready: /start, /wallets, /crgdeals, /deals");
    
    // ── /deals command - Ask for country code with buttons (ALL TIME deals) ──
    bot.onText(/\/deals/, (msg) => {
      const chatId = msg.chat.id;
      
      // Clear any previous state for this user
      delete userStates[chatId];
      
      // Set user state to waiting for country code
      userStates[chatId] = { state: 'waiting_for_country_deals', command: '/deals' };
      
      // Create inline keyboard with country buttons (using 'all_' prefix for callback)
      const countryKeyboard = [
        [
          { text: '🇩🇪 DE', callback_data: 'all_DE' },
          { text: '🇫🇷 FR', callback_data: 'all_FR' },
          { text: '🇬🇧 UK', callback_data: 'all_UK' }
        ],
        [
          { text: '🇪🇸 ES', callback_data: 'all_ES' },
          { text: '🇧🇪 BE', callback_data: 'all_BE' },
          { text: '🇮🇹 IT', callback_data: 'all_IT' }
        ],
        [
          { text: '🇦🇺 AU', callback_data: 'all_AU' },
          { text: '🇲🇾 MY', callback_data: 'all_MY' },
          { text: '🇸🇬 SI', callback_data: 'all_SI' }
        ],
        [
          { text: '🇭🇷 HR', callback_data: 'all_HR' },
          { text: '🇸🇦 GCC', callback_data: 'all_GCC' }
        ]
      ];
      
      const dealsMessage = `📊 <b>Deals - Leeds CRM</b>

Select a country to view deals from Leeds CRM API:

<i>Or type the country code (e.g., DE, FR, UK, ES, BE, IT)</i>`;
      
      bot.sendMessage(chatId, dealsMessage, { 
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: countryKeyboard
        }
      });
      console.log("📱 /deals command responded to chat:", chatId);
    });
    
    // ── /crgdeals command - Ask for country code with buttons ──
    bot.onText(/\/crgdeals/, (msg) => {
      const chatId = msg.chat.id;
      
      // Clear any previous state for this user
      delete userStates[chatId];
      
      // Set user state to waiting for country code
      userStates[chatId] = { state: 'waiting_for_country', command: '/crgdeals' };
      
      // Create inline keyboard with country buttons
      const countryKeyboard = [
        [
          { text: '🇩🇪 DE', callback_data: 'DE' },
          { text: '🇫🇷 FR', callback_data: 'FR' },
          { text: '🇬🇧 UK', callback_data: 'UK' }
        ],
        [
          { text: '🇦🇺 AU', callback_data: 'AU' },
          { text: '🇲🇾 MY', callback_data: 'MY' },
          { text: '🇸🇬 SI', callback_data: 'SI' }
        ],
        [
          { text: '🇭🇷 HR', callback_data: 'HR' },
          { text: '🇸🇦 GCC', callback_data: 'GCC' }
        ]
      ];
      
      const dealsMessage = `📊 <b>CRG Deals - Today's Deals</b>

Select a country to view today's deals:

<i>Or type the country code (e.g., DE, FR, UK)</i>`;
      
      bot.sendMessage(chatId, dealsMessage, { 
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: countryKeyboard
        }
      });
      console.log("📱 /crgdeals command responded to chat:", chatId);
    });
    
    // ── Handle callback queries from inline keyboard ──
    bot.on('callback_query', async (callbackQuery) => {
      const msg = callbackQuery.message;
      const chatId = msg.chat.id;
      const callbackData = callbackQuery.data;
      // Check if this is an "all time" request (prefixed with "all_")
      const isAllTime = callbackData.startsWith('all_');
      const countryCode = isAllTime ? callbackData.substring(4) : callbackData;
      
      // Answer the callback to remove loading state
      bot.answerCallbackQuery(callbackQuery.id);
      
      // Valid country codes (including ones from external API)
      const validCountries = ['DE', 'FR', 'UK', 'AU', 'MY', 'SI', 'HR', 'GCC', 'ES', 'BE', 'IT'];
      
      if (!validCountries.includes(countryCode)) {
        bot.sendMessage(chatId, `❌ Invalid country code: <b>${countryCode}</b>`, { parse_mode: "HTML" });
        return;
      }
      
      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split('T')[0];
      
      // For /deals command (isAllTime=true), use local data directly
      // (External API at leeds-crm.com is returning old/cached data)
      let countryDeals = [];
      
      if (isAllTime) {
        // Use local data file directly (fresh data from manual sync)
        const allDeals = readJSON("deals.json", []);
        countryDeals = allDeals.filter(deal => {
          if (!deal.country) return false;
          return deal.country.toUpperCase() === countryCode;
        });
        console.log("📱 /deals - Using local data:", countryDeals.length, "deals for", countryCode);
      } else {
        // For /crgdeals: read from crg-deals.json, filtered by today's date
        const allDeals = readJSON("crg-deals.json", []);
        countryDeals = allDeals.filter(deal => {
          if (!deal.affiliate) return false;
          // Check country code match (affiliate ends with country code)
          const hasCountry = deal.affiliate.toUpperCase().endsWith(' ' + countryCode);
          // Check date is today
          const isToday = deal.date === today;
          return hasCountry && isToday;
        });
      }
      
      // Country name mapping (extended for external API countries)
      const countryNames = {
        'DE': 'Germany',
        'FR': 'France',
        'UK': 'United Kingdom',
        'AU': 'Australia',
        'MY': 'Malaysia',
        'SI': 'Singapore',
        'HR': 'Croatia',
        'GCC': 'Gulf Countries',
        'ES': 'Spain',
        'BE': 'Belgium',
        'IT': 'Italy'
      };
      
      const countryName = countryNames[countryCode] || countryCode;
      
      if (countryDeals.length === 0) {
        const noteText = isAllTime ? 'Showing ALL historical deals (no date filter)' : 'Note: Only showing deals with date: ' + today;
        bot.sendMessage(chatId, `📭 No deals found for <b>${countryName}</b> (${countryCode})\n\n<i>${noteText}</i>`, { parse_mode: "HTML" });
        console.log("📱 /deals (button) - No deals found for:", countryCode, isAllTime ? "(all time)" : "(today)");
        return;
      }
      
      // Format deals message based on isAllTime
      let dealsMessage;
      if (isAllTime) {
        // NEW compact format (no summary, bullet points)
        dealsMessage = `<b>${countryName} - Deals</b> (${countryDeals.length} found)\n\n`;
        
        // Show each deal (limit to 20 to avoid message too long)
        const displayDeals = countryDeals.slice(0, 20);
        
        displayDeals.forEach((deal) => {
          dealsMessage += `• Affiliate #${deal.affiliate}\n`;
          dealsMessage += `• 💰 Total Price: €${parseInt(deal.price || 0).toLocaleString()} | CRG: ${deal.crg || '-'}%\n`;
          dealsMessage += `• Funnels: ${deal.funnels || '-'} | Source: ${deal.source || '-'}\n`;
          dealsMessage += `• Deduction: ${deal.deduction || '-'}%\n\n`;
        });
        
        if (countryDeals.length > 20) {
          dealsMessage += `... and ${countryDeals.length - 20} more deals.`;
        }
      } else {
        // Format for CRG deals (original format)
        dealsMessage = `📊 <b>${countryName} - Today's Deals</b> (${countryDeals.length} found)\n📅 Date: ${today}\n\n`;
        
        // Show summary
        const totalCap = countryDeals.reduce((sum, d) => sum + (parseInt(d.cap) || 0), 0);
        const totalReceived = countryDeals.reduce((sum, d) => sum + (parseInt(d.capReceived) || 0), 0);
        
        dealsMessage += `📈 <b>Summary:</b>\n`;
        dealsMessage += `• Total Caps: ${totalCap}\n`;
        dealsMessage += `• Received: ${totalReceived}\n`;
        dealsMessage += `• Remaining: ${totalCap - totalReceived}\n\n`;
        
        // Show each deal (limit to 20 to avoid message too long)
        const displayDeals = countryDeals.slice(0, 20);
        
        displayDeals.forEach((deal, index) => {
          dealsMessage += `<b>${index + 1}. ${deal.affiliate}</b>\n`;
          dealsMessage += `   Broker: ${deal.brokerCap || '-'}\n`;
          dealsMessage += `   Cap: ${deal.cap || '-'} | Received: ${deal.capReceived || '0'}\n`;
          dealsMessage += `   Manager: ${deal.manageAff || '-'} | Sales: ${deal.madeSale || '-'}\n`;
          dealsMessage += `   Started: ${deal.started ? '✅' : '❌'} | Date: ${deal.date || '-'}\n\n`;
        });
        
        if (countryDeals.length > 20) {
          dealsMessage += `... and ${countryDeals.length - 20} more deals.`;
        }
      }
      
      bot.sendMessage(chatId, dealsMessage, { parse_mode: "HTML" });
      console.log("📱 /deals (button) - Sent", countryDeals.length, isAllTime ? "deals data" : "today's", "deals for", countryCode);
    });
    
    // ── Handle country code input for deals (text input) ──
    bot.on('message', async (msg) => {
      // Skip commands
      if (msg.text && msg.text.startsWith('/')) return;
      
      const chatId = msg.chat.id;
      const userText = msg.text ? msg.text.trim().toUpperCase() : '';
      
      // Check if user is in a waiting state
      const userState = userStates[chatId];
      if (!userState || userState.state !== 'waiting_for_country') return;
      
      // Valid country codes
      const validCountries = ['DE', 'FR', 'UK', 'AU', 'MY', 'SI', 'HR', 'GCC'];
      
      if (!validCountries.includes(userText)) {
        bot.sendMessage(chatId, `❌ Invalid country code: <b>${userText}</b>\n\nPlease enter a valid country code:\nDE, FR, UK, AU, MY, SI, HR, GCC`, { parse_mode: "HTML" });
        return;
      }
      
      // Clear user state
      delete userStates[chatId];
      
      // Read deals from crg-deals.json
      const allDeals = readJSON("crg-deals.json", []);
      
      // Filter deals by country code AND today's date
      const countryDeals = allDeals.filter(deal => {
        if (!deal.affiliate) return false;
        const hasCountry = deal.affiliate.toUpperCase().endsWith(' ' + userText);
        const today = new Date().toISOString().split('T')[0];
        const isToday = deal.date === today;
        return hasCountry && isToday;
      });
      
      // Country name mapping
      const countryNames = {
        'DE': 'Germany',
        'FR': 'France',
        'UK': 'United Kingdom',
        'AU': 'Australia',
        'MY': 'Malaysia',
        'SI': 'Singapore',
        'HR': 'Croatia',
        'GCC': 'Gulf Countries'
      };
      
      const countryName = countryNames[userText] || userText;
      
      if (countryDeals.length === 0) {
        bot.sendMessage(chatId, `📭 No deals found for <b>${countryName}</b> (${userText})`, { parse_mode: "HTML" });
        console.log("📱 /deals - No deals found for:", userText);
        return;
      }
      
      // Format deals message
      let dealsMessage = `📊 <b>Deals for ${countryName}</b> (${countryDeals.length} found)\n\n`;
      
      // Show summary
      const totalCap = countryDeals.reduce((sum, d) => sum + (parseInt(d.cap) || 0), 0);
      const totalReceived = countryDeals.reduce((sum, d) => sum + (parseInt(d.capReceived) || 0), 0);
      
      dealsMessage += `📈 <b>Summary:</b>\n`;
      dealsMessage += `• Total Caps: ${totalCap}\n`;
      dealsMessage += `• Received: ${totalReceived}\n`;
      dealsMessage += `• Remaining: ${totalCap - totalReceived}\n\n`;
      
      // Show each deal (limit to 20 to avoid message too long)
      const displayDeals = countryDeals.slice(0, 20);
      
      displayDeals.forEach((deal, index) => {
        dealsMessage += `<b>${index + 1}. ${deal.affiliate}</b>\n`;
        dealsMessage += `   Broker: ${deal.brokerCap || '-'}\n`;
        dealsMessage += `   Cap: ${deal.cap || '-'} | Received: ${deal.capReceived || '0'}\n`;
        dealsMessage += `   Manager: ${deal.manageAff || '-'} | Sales: ${deal.madeSale || '-'}\n`;
        dealsMessage += `   Started: ${deal.started ? '✅' : '❌'} | Date: ${deal.date || '-'}\n\n`;
      });
      
      if (countryDeals.length > 20) {
        dealsMessage += `... and ${countryDeals.length - 20} more deals.`;
      }
      
      bot.sendMessage(chatId, dealsMessage, { parse_mode: "HTML" });
      console.log("📱 /deals - Sent", countryDeals.length, "deals for", userText);
    });
    
    // ── USDT Hash Detection - Auto-create Customer Payment ──
    
    // Helper to generate unique ID for customer payments
    function genCustomerPaymentId() {
      return Math.random().toString(36).substr(2, 9);
    }
    
    // Function to extract ALL USDT hashes from message (including from URLs)
    function extractAllUsdtHashes(text) {
      if (!text) return [];
      
      const hashes = [];
      
      // Extract from TronScan URLs - handles both:
      // https://tronscan.org/#/transaction/208c664be9271f8e1ac3bf993501b05b90674f93b963966bf81a2da9708cf121
      // https://tronscan.org/#/transaction/T...
      const tronScanMatches = text.matchAll(/tronscan\.org\/[^\/]*\/transaction\/([a-zA-Z0-9]{33,64})/gi);
      for (const match of tronScanMatches) {
        const hash = match[1];
        // Determine if it's a TRC20 address (34 chars starting with T) or transaction hash (64 chars)
        if (TRC20_ADDRESS_REGEX.test(hash)) {
          hashes.push({ hash: hash, type: 'TRC20_ADDRESS' });
        } else if (hash.length === 64) {
          hashes.push({ hash: hash, type: 'TRC20' });
        }
      }
      
      // Extract from Etherscan URLs
      const ethScanMatches = text.matchAll(/etherscan\.io\/tx\/(0x[a-fA-F0-9]{64})/gi);
      for (const match of ethScanMatches) {
        hashes.push({ hash: match[1], type: 'ERC20' });
      }
      
      // Also find plain hashes (not in URLs)
      const words = text.split(/\s+/);
      for (const word of words) {
        const trimmed = word.trim();
        
        // Skip if already found
        const alreadyFound = hashes.some(h => h.hash === trimmed);
        if (alreadyFound) continue;
        
        if (ERC20_HASH_REGEX.test(trimmed)) {
          hashes.push({ hash: trimmed, type: 'ERC20' });
        } else if (TRC20_HASH_REGEX.test(trimmed)) {
          hashes.push({ hash: trimmed, type: 'TRC20' });
        }
      }
      
      return hashes;
    }
    
    // Handle incoming messages - detect USDT hashes with blockchain verification
    bot.on('message', async (msg) => {
      // Ignore commands (they have their own handlers)
      if (msg.text && msg.text.startsWith('/')) return;
      
      // Check if user is in a waiting state for /deals command - if so, skip finance group processing
      const chatId = msg.chat.id;
      if (userStates[chatId] && userStates[chatId].state === 'waiting_for_country') return;
      
      // Only process messages from the finance group
      if (msg.chat.id.toString() !== FINANCE_GROUP_CHAT_ID) return;
      
      const messageText = msg.text || '';
      const messageId = msg.message_id;
      
      console.log(`📩 New message in finance group: ${messageText.substring(0, 60)}...`);
      
      // Use the improved hash extraction function (handles URLs and plain hashes)
      const hashes = extractAllUsdtHashes(messageText);
      
      // Filter to only transaction hashes (not wallet addresses)
      const txHashes = hashes.filter(h => h.type === 'TRC20' || h.type === 'ERC20');
      
      if (txHashes.length === 0) {
        console.log("🔍 No USDT transaction hashes found in message");
        return;
      }
      
      // Find all amounts ($pattern) - handles both $120 and 120$
      const amounts = [];
      // Pattern 1: $120 or $1,200
      const amountPattern1 = /\$(\d+(?:,\d{3})*(?:\.\d{2})?)/g;
      let amountMatch;
      while ((amountMatch = amountPattern1.exec(messageText)) !== null) {
        amounts.push(amountMatch[1].replace(/,/g, ''));
      }
      // Pattern 2: 120$ (amount before $)
      const amountPattern2 = /(\d+(?:,\d{3})*(?:\.\d{2})?)\$/g;
      while ((amountMatch = amountPattern2.exec(messageText)) !== null) {
        amounts.push(amountMatch[1].replace(/,/g, ''));
      }
      
      // Extract customer names - improved extraction for patterns like "EMP Forge"
      const names = [];
      
      // Pattern 1: "EMP Forge" or "EMP: Forge" - the name after EMP
      const empNameMatch = messageText.match(/(?:EMP|emp)\s*[:\-]?\s*([A-Z][a-zA-Z0-9_-]{2,20})/i);
      if (empNameMatch && empNameMatch[1]) {
        names.push(empNameMatch[1]);
      }
      
      // Pattern 2: "Forge" as standalone customer name
      const forgeMatch = messageText.match(/\b(Forge|Brand|Partner|Affiliate|Client)\b/gi);
      if (forgeMatch) {
        for (const m of forgeMatch) {
          if (!names.includes(m)) names.push(m);
        }
      }
      
      // Pattern 3: Look for capitalized words after common prefixes
      const namePatterns = [
        /(?:from|client|customer|invoice|inv)[:\s]*([A-Z][a-zA-Z0-9_-]{2,20})/gi,
      ];
      
      for (const pattern of namePatterns) {
        let match;
        const regex = new RegExp(pattern.source, pattern.flags);
        while ((match = regex.exec(messageText)) !== null) {
          if (match[1] && match[1].length > 2) {
            const exclude = ['usdt', 'usdc', 'eth', 'btc', 'trc20', 'erc20', 'hash', 'tx', 'transaction', 'http', 'https', 'www', 'com', 'org', 'io'];
            if (!exclude.includes(match[1].toLowerCase()) && !names.includes(match[1])) {
              names.push(match[1]);
            }
          }
        }
      }
      
      // Pattern 4: Also try to get names from text that look like names (capitalized words not in URLs)
      const capitalWords = messageText.match(/\b[A-Z][a-zA-Z0-9_-]{2,20}\b/g) || [];
      for (const word of capitalWords) {
        const exclude = ['USD', 'USDT', 'USDC', 'ETH', 'BTC', 'TRC', 'ERC', 'FROM', 'HTTP', 'HTTPS', 'COM', 'ORG', 'NET', 'IO', 'TX', 'TRANSACTION'];
        if (!exclude.includes(word.toUpperCase()) && word.length > 2 && !names.includes(word)) {
          // Filter out words that are likely part of URLs
          if (!messageText.includes('http') && !word.includes('.')) {
            names.push(word);
          }
        }
      }
      
      console.log(`🔍 Found ${txHashes.length} hash(es), ${amounts.length} amount(s), ${names.length} name(s):`, names);
      
      // Get wallets for verification
      const wallets = getWallets();
      
      // Process each hash found
      for (let i = 0; i < txHashes.length; i++) {
        const { hash, type } = txHashes[i];
        
        // Match amounts and names by index, fallback to first available
        const amount = amounts[i] || amounts[0] || '0';
        const invoice = names[i] || names[0] || 'Payment';
        
        console.log(`🔍 Processing ${type} hash: ${hash.substring(0, 10)}... for "${invoice}" - $${amount}`);
        
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
          
          // Allow 10% tolerance for amount difference
          if (isNaN(txAmount) || isNaN(declaredAmount) || declaredAmount === 0 || Math.abs(txAmount - declaredAmount) / declaredAmount < 0.10) {
            status = "Received";
            statusNote = "✅ Verified on blockchain - wallet matches!";
          } else {
            status = "Open";
            statusNote = `⚠️ Amount mismatch: blockchain $${txAmount} vs declared $${declaredAmount}`;
          }
        } else if (txResult.success && !walletVerify.matched) {
          status = "Open";
          statusNote = `❌ Address mismatch! Sent to: ${(txResult.toAddress || '').substring(0, 8)}... Not in our wallets!`;
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
        
        // console.log(`✅ Customer payment created: ${invoice} - $${amount} - Status: ${status}`);
        
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
