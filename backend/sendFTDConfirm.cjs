const FTD_CONFIRM_GROUP_CHAT_ID = "-4744920512";
const TELEGRAM_TOKEN = "8560973106:AAG6J4FRj8ShS-WKLOzs2TmhdaHlqCKevhA";  // Same token as main server

function sendFTDConfirmNotification(ftd) {
  if (!TELEGRAM_TOKEN || TELEGRAM_TOKEN === "YOUR_BOT_TOKEN_HERE") {
    console.log("📱 FTD confirmation notification skipped (no token configured)");
    return;
  }

  let message = `✅ FTD CONFIRMED\n\n`;
  message += `🌍 Country: ${ftd.country || 'Unknown'}\n`;
  message += `👥 Affiliate: ${ftd.affiliateName || ftd.affiliateId || ftd.sourceId || 'Unknown'}\n`;
  message += `🏦 Broker: ${ftd.brokerName || ftd.brokerId || ftd.destId || 'Unknown'}\n`;
  message += `📅 Date: ${ftd.depDate || ftd.date || 'N/A'}\n`;
  message += `🔥 Status: ${ftd.status || 'unknown'}\n`;

  const https = require('https');
  const postData = JSON.stringify({
    chat_id: FTD_CONFIRM_GROUP_CHAT_ID,
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
        console.log(`✅ FTD confirmation sent to ${FTD_CONFIRM_GROUP_CHAT_ID}: ${ftd.country} ${ftd.affiliateId || ftd.sourceId || 'N/A'} → ${ftd.brokerId || ftd.destId || 'N/A'}`);
      }
    });
  });

  req.on('error', err => console.error("❌ FTD confirmation notification error:", err.message));
  req.write(postData);
  req.end();
}

module.exports = sendFTDConfirmNotification;
