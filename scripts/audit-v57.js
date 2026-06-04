'use strict';
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const app = fs.readFileSync(path.join(root, 'public', 'app.js'), 'utf8');
const settings = JSON.parse(fs.readFileSync(path.join(root, 'data', 'settings.json'), 'utf8'));
const failures = [];
function ok(cond, msg){ if(!cond) failures.push(msg); }
ok(settings.requirePullbackForExecution === false, 'Default must not require a second pullback after signal.');
ok(settings.entryOrderType === 'limit', 'Default entry order type must be limit.');
ok(Number(settings.entrySignalWindowCandles) >= 5, 'MACD cross window must be wide enough for auto scanner.');
ok(Number(settings.histColorLookback) >= 10, 'Histogram color lookback must be wide enough for auto scanner.');
ok(server.includes("entryType: pullbackPlan ? 'PULLBACK_LIMIT' : (settings.entryOrderType === 'market' ? 'MARKET_OR_IMMEDIATE' : 'IMMEDIATE_LIMIT')"), 'Immediate-limit entry type not implemented.');
ok(server.includes('processTradeManagement(payload.rows, settings, trades, wallet'), 'Trade management must run during auto scan.');
ok(app.indexOf('Open / Pending Trades') < app.indexOf('Scanner Signals'), 'Open/Pending trades must render above scanner signals.');
ok(app.includes('Immediate limit at current price'), 'UI must explain immediate limit execution.');
if (failures.length) {
  console.error('V57 audit failed:\n- ' + failures.join('\n- '));
  process.exit(1);
}
console.log('V57 audit passed.');
