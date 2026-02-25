// Screenshot functionality for Telegram bot
// This module handles capturing and sending screenshots to Telegram

let puppeteer = null;
let PUPPETEER_AVAILABLE = false;

// Try to load puppeteer
try {
  puppeteer = require('puppeteer');
  PUPPETEER_AVAILABLE = true;
  console.log("📸 Puppeteer loaded successfully");
} catch (e) {
  console.log("⚠️  Puppeteer not installed — screenshot functionality disabled");
  console.log("   Install: npm install puppeteer");
}

async function captureDataScreenshot(type, readJSON) {
  if (!PUPPETEER_AVAILABLE || !puppeteer) {
    console.error("❌ Screenshot failed: Puppeteer not available");
    return null;
  }
  
  let htmlContent = '';
  let title = '';
  
  if (type === 'crg') {
    const all = readJSON("crg-deals.json", []);
    const dates = [...new Set(all.map(d => d.date))].sort().reverse();
    const ld = dates[0] || new Date().toISOString().split("T")[0];
    const td = all.filter(d => d.date === ld);
    
    const tCap = td.reduce((s, d) => s + (parseInt(d.cap) || 0), 0);
    const tRec = td.reduce((s, d) => s + (parseInt(d.capReceived) || 0), 0);
    const tFTD = td.reduce((s, d) => s + (parseInt(d.ftd) || 0), 0);
    
    title = 'CRG Deals - ' + ld;
    
    htmlContent = '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:Segoe UI,Arial,sans-serif;background:linear-gradient(135deg,#1a1a2e,#16213e);color:#fff;padding:30px;margin:0}h1{color:#f59e0b;margin-bottom:20px;font-size:24px}.stat{background:rgba(255,255,255,0.1);padding:15px 25px;border-radius:10px;display:inline-block;margin-right:15px;margin-bottom:15px}.stat-label{font-size:11px;color:#94a3b8;text-transform:uppercase}.stat-value{font-size:22px;font-weight:bold}.stat-value.green{color:#10b981}.stat-value.yellow{color:#f59e0b}.stat-value.blue{color:#38bdf8}table{width:100%;border-collapse:collapse;background:rgba(255,255,255,0.05);border-radius:10px}th{background:rgba(15,52,96,0.8);padding:12px;text-align:left;font-size:11px;color:#94a3b8;text-transform:uppercase}td{padding:10px 12px;border-bottom:1px solid rgba(255,255,255,0.05);font-size:12px}tr:last-child td{border-bottom:none}.affiliate{font-weight:bold;color:#38bdf8}.started{color:#10b981}.not-started{color:#ef4444}.total-row{background:rgba(15,52,96,0.8);font-weight:bold}</style></head><body><h1>' + title + '</h1><div><div class="stat"><div class="stat-label">TOTAL CAP</div><div class="stat-value blue">' + tCap + '</div></div><div class="stat"><div class="stat-label">RECEIVED</div><div class="stat-value green">' + tRec + '</div></div><div class="stat"><div class="stat-label">FTD</div><div class="stat-value yellow">' + tFTD + '</div></div><div class="stat"><div class="stat-label">REMAINING</div><div class="stat-value">' + (tCap - tRec) + '</div></div></div><table><thead><tr><th>Affiliate</th><th>CAP</th><th>Rec</th><th>FTD</th><th>Started</th></tr></thead><tbody>';
    
    td.slice(0,15).forEach(function(d) {
      htmlContent += '<tr><td class="affiliate">' + (d.affiliate || '-') + '</td><td>' + (d.cap || '0') + '</td><td>' + (d.capReceived || '0') + '</td><td>' + (d.ftd || '0') + '</td><td class="' + (d.started ? 'started' : 'not-started') + '">' + (d.started ? '✓' : '✗') + '</td></tr>';
    });
    
    htmlContent += '<tr class="total-row"><td>TOTAL</td><td>' + tCap + '</td><td>' + tRec + '</td><td>' + tFTD + '</td><td></td></tr></tbody></table></body></html>';
    
  } else if (type === 'agents') {
    const all = readJSON("daily-cap.json", []);
    const dates = [...new Set(all.map(c => c.date))].sort().reverse();
    const ld = dates[0] || new Date().toISOString().split("T")[0];
    const tc = all.filter(c => c.date === ld);
    
    const tAff = tc.reduce((s, c) => s + (parseInt(c.affiliates) || 0), 0);
    const tBr = tc.reduce((s, c) => s + (parseInt(c.brands) || 0), 0);
    
    title = 'Daily Agents Cap - ' + ld;
    
    htmlContent = '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:Segoe UI,Arial,sans-serif;background:linear-gradient(135deg,#1a1a2e,#16213e);color:#fff;padding:30px;margin:0}h1{color:#8b5cf6;margin-bottom:20px;font-size:24px}.stat{background:rgba(255,255,255,0.1);padding:15px 25px;border-radius:10px;display:inline-block;margin-right:15px;margin-bottom:15px}.stat-label{font-size:11px;color:#94a3b8;text-transform:uppercase}.stat-value{font-size:22px;font-weight:bold}.stat-value.purple{color:#8b5cf6}.stat-value.green{color:#10b981}table{width:100%;border-collapse:collapse;background:rgba(255,255,255,0.05);border-radius:10px}th{background:rgba(15,52,96,0.8);padding:12px;text-align:left;font-size:11px;color:#94a3b8;text-transform:uppercase}td{padding:10px 12px;border-bottom:1px solid rgba(255,255,255,0.05);font-size:12px}tr:last-child td{border-bottom:none}.agent{font-weight:bold;color:#38bdf8}.total-row{background:rgba(15,52,96,0.8);font-weight:bold}</style></head><body><h1>' + title + '</h1><div><div class="stat"><div class="stat-label">AGENTS</div><div class="stat-value">' + tc.length + '</div></div><div class="stat"><div class="stat-label">TOTAL AFF</div><div class="stat-value purple">' + tAff + '</div></div><div class="stat"><div class="stat-label">TOTAL BRANDS</div><div class="stat-value green">' + tBr + '</div></div></div><table><thead><tr><th>Agent</th><th>Affiliates</th><th>Brands</th></tr></thead><tbody>';
    
    tc.forEach(function(c) {
      htmlContent += '<tr><td class="agent">' + (c.agent || '-') + '</td><td>' + (c.affiliates || '0') + '</td><td>' + (c.brands || '0') + '</td></tr>';
    });
    
    htmlContent += '<tr class="total-row"><td>TOTAL</td><td>' + tAff + '</td><td>' + tBr + '</td></tr></tbody></table></body></html>';
  }
  
  let browser;
  try {
    browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 800, height: 600 });
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve, 800));
    const screenshot = await page.screenshot({ type: 'png' });
    await browser.close();
    return screenshot;
  } catch (err) {
    console.error('Screenshot error:', err.message);
    if (browser) await browser.close().catch(function() {});
    return null;
  }
}

function setupScheduledScreenshots(bot, TELEGRAM_TOKEN, MONITORING_GROUP_CHAT_ID, readJSON, captureFn) {
  // Run every minute to check if it's time for scheduled screenshots
  // Working hours: 10:00 - 22:00 every hour
  setInterval(function() {
    var now = new Date();
    var hour = now.getHours();
    var minute = now.getMinutes();
    
    // Only run at the start of each hour (between minute 0 and 2)
    if (hour < 10 || hour >= 22 || minute > 2) return;
    
    console.log('📸 Scheduled screenshot triggered at ' + hour + ':' + minute);
    
    // Capture and send CRG screenshot
    captureFn('crg', readJSON).then(function(s) {
      if (s && bot) {
        bot.sendPhoto(MONITORING_GROUP_CHAT_ID, s, { caption: '📊 CRG Report - ' + new Date().toLocaleDateString() }).catch(function(e) { 
          console.error('Failed to send CRG screenshot:', e.message); 
        });
      }
    }).catch(function(e) { 
      console.error('Failed to capture CRG screenshot:', e.message); 
    });
    
    // Capture and send Agents screenshot
    captureFn('agents', readJSON).then(function(s) {
      if (s && bot) {
        bot.sendPhoto(MONITORING_GROUP_CHAT_ID, s, { caption: '📊 Daily Agents Cap - ' + new Date().toLocaleDateString() }).catch(function(e) { 
          console.error('Failed to send Agents screenshot:', e.message); 
        });
      }
    }).catch(function(e) { 
      console.error('Failed to capture Agents screenshot:', e.message); 
    });
    
  }, 60000); // Check every minute
  
  console.log('⏰ Scheduled screenshots enabled: 10:00 - 22:00 every hour');
}

module.exports = {
  captureDataScreenshot: captureDataScreenshot,
  setupScheduledScreenshots: setupScheduledScreenshots
};
