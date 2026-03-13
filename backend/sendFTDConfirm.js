function sendFTDConfirmNotification(ftd, TELEGRAM_TOKEN, FTD_CONFIRM_GROUP_CHAT_ID) {
  if (TELEGRAM_TOKEN === "YOUR_BOT_TOKEN_HERE" || !TELEGRAM_TOKEN) {
    console.log("📱 FTD confirmation notification skipped (no token configured)");
    return;
  }

  let message = `✅ FTD CONFIRMED\n\n`;
  message += `🌍 Country: ${ftd.country || 'Unknown'}\n`;
  message += `👥 Affiliate: ${ftd.affiliateName || ftd.affiliateId || ftd.sourceId || 'Unknown'}\n`;
  message += `🏦 Broker: ${ftd.brokerName || ftd.brokerId || ftd.destId || 'Unknown'}\n`;
  message += `📅 Date: ${ftd.depDate || ftd.regDate || ftd.date || 'N/A'}\n`;
  message += `🔥 Status: ${ftd.status || ftd.emoji || 'unknown'}\n`;

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
        console.log(`✅ FTD confirmation sent to ${FTD_CONFIRM_GROUP_CHAT_ID}`);
      }
    });
  });

  req.on('error', err => console.error("❌ FTD confirmation notification error:", err.message));
  req.write(postData);
  req.end();
}

module.exports = sendFTDConfirmNotification;
