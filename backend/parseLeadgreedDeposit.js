/**
 * Parse Leadgreed "Deposit from" FTD format
 * Example:
 * Deposit from France
 * Registration date: 2026-03-13 10:04:29
 * Deposit date: 2026-03-13 10:42:11
 * Affiliate id: 225
 * Affiliate name: 225 - ExTraffic 🟢
 * Broker id: 2232
 * Broker name: 2232 - Swinftd CRG FR 🟩
 * Distribution name: France - 225
 */

module.exports = function parseLeadgreedDeposit(text) {
  const lines = text.trim().split('\n').map(l => l.trim()).filter(l => l);
  if (lines.length < 7 || !lines[0].startsWith('Deposit from')) return null;

  const countryMatch = lines[0].match(/^Deposit from\s+(.+)$/i);
  if (!countryMatch) return null;
  const country = countryMatch[1].trim();

  const regDateMatch = lines.find(l => l.startsWith('Registration date:'))?.match(/^Registration date:\s+(.+)$/i);
  const regDate = regDateMatch ? regDateMatch[1].trim() : null;

  const depDateMatch = lines.find(l => l.startsWith('Deposit date:'))?.match(/^Deposit date:\s+(.+)$/i);
  const depDate = depDateMatch ? depDateMatch[1].trim() : null;

  const affIdMatch = lines.find(l => l.startsWith('Affiliate id:'))?.match(/^Affiliate id:\s+(\d+)$/i);
  const affiliateId = affIdMatch ? affIdMatch[1].trim() : null;

  const affNameMatch = lines.find(l => l.startsWith('Affiliate name:'))?.match(/^Affiliate name:\s+(.+?)(🟢|\s*\|)?$/i);
  const affiliateName = affNameMatch ? affNameMatch[1].trim() : null;

  const brokerIdMatch = lines.find(l => l.startsWith('Broker id:'))?.match(/^Broker id:\s+(\d+)$/i);
  const brokerId = brokerIdMatch ? brokerIdMatch[1].trim() : null;

  const brokerNameMatch = lines.find(l => l.startsWith('Broker name:'))?.match(/^Broker name:\s+(.+?)(🟩|🟨|\s*\|)?$/i);
  const brokerName = brokerNameMatch ? brokerNameMatch[1].trim() : null;

  // Validate we have core fields
  if (!affiliateId || !brokerId || !affiliateName || !brokerName) {
    console.log('Missing core FTD fields:', { affiliateId, brokerId, affiliateName, brokerName });
    return null;
  }

  const emoji = affNameMatch?.[2] || brokerNameMatch?.[2] || '';
  const status = emoji === '🟩' ? 'success' : emoji === '🟨' ? 'pending' : 'unknown';

  return {
    id: null, // Generated in server.cjs to avoid crypto dependency
    timestamp: new Date().toISOString(),
    country,
    regDate,
    depDate,
    affiliateId,
    affiliateName,
    brokerId,
    brokerName,
    status,
    emoji,
    rawMessage: text,
    date: new Date().toISOString().split('T')[0],
    type: 'deposit'  // Distinguish from classic format
  };

};

