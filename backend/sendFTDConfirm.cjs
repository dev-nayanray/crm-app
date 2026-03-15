const FTD_CONFIRM_GROUP_CHAT_ID = "-4744920512";
const FTD_GROUP_CHAT_ID = "-5195790399";
const BLITZ_FINANCE_BOT = "@blitzfinance_bot";
const TELEGRAM_TOKEN = "8560973106:AAG6J4FRj8ShS-WKLOzs2TmhdaHlqCKevhA";  // Same token as main server

function sendFTDConfirmNotification(ftd, chatId = FTD_CONFIRM_GROUP_CHAT_ID) {
  if (!TELEGRAM_TOKEN || TELEGRAM_TOKEN === "YOUR_BOT_TOKEN_HERE") {
    console.log("📱 FTD confirmation notification skipped (no token configured)");
    return;
  }

  let message = `✅ <b>FTD CONFIRMED</b>\n\n`;
  message += `🌍 <b>Country:</b> ${ftd.country || 'Unknown'}\n`;
  if (ftd.regDate) message += `📅 <b>Reg Date:</b> ${ftd.regDate}\n`;
  message += `💎 <b>Deposit Date:</b> ${ftd.depDate || ftd.date || 'N/A'}\n`;
  message += `👥 <b>Affiliate:</b> ${ftd.affiliateName || ftd.affiliateId || ftd.sourceId || 'Unknown'}\n`;
  message += `🏦 <b>Broker:</b> ${ftd.brokerName || ftd.brokerId || ftd.destId || 'Unknown'}\n`;
  message += `🔥 <b>Status:</b> ${ftd.status || ftd.emoji || 'unknown'}\n`;
  message += `\n<small>via Blitz CRM</small>`;

  const https = require('https');
  const postData = JSON.stringify({
    chat_id: chatId,
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
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
      if (res.statusCode !== 200) {
        console.error("❌ FTD confirmation notification error:", d);
      } else {
        console.log(`✅ FTD confirmation sent to ${chatId}: ${ftd.country} ${ftd.affiliateId || ftd.sourceId || 'N/A'} → ${ftd.brokerId || ftd.destId || 'N/A'}`);
      }
    });
  });

  req.on('error', err => console.error("❌ FTD confirmation notification error:", err.message));
  req.write(postData);
  req.end();
}

module.exports = sendFTDConfirmNotification;

