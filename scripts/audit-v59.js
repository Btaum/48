'use strict';
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const app = fs.readFileSync(path.join(root, 'public', 'app.js'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const settings = JSON.parse(fs.readFileSync(path.join(root, 'data', 'settings.json'), 'utf8'));
const failures = [];
function ok(cond, msg){ if(!cond) failures.push(msg); }

ok(pkg.version === '5.9.0', 'Package must be version 5.9.0.');
ok(settings.requirePullbackForExecution === false, 'Default must not require a second pullback after signal.');
ok(Number(settings.tp1TriggerR) === 1, 'TP1 trigger must be 1R.');
ok(Number(settings.rewardTargetR) === 2, 'TP2/final target must be 2R.');
ok(Number(settings.tp1ClosePct) > 0 && Number(settings.tp1ClosePct) < 100, 'TP1 must be a partial close, not a full close.');
ok(Number(settings.tp2ClosePct) === 100, 'TP2 must close 100% of the remaining position.');
ok(Number(settings.minFullTradeProfitUsd) >= 1, 'Minimum full-trade profit must default to at least $1.');
ok(Number(settings.targetFullTradeProfitUsd) >= 2, 'Target full-trade profit must default to at least $2.');
ok(settings.autoSizeToTargetProfit === true, 'Auto-size to target full-trade profit must be enabled.');
ok(settings.blockTinyProfitTrades === true, 'Tiny full-trade profit setups must be blocked by default.');
ok(Number(settings.defaultLeverage) === 25, 'Default leverage should use the configured 25x cap for target sizing.');
ok(Number(settings.maxBotAllocationUsd) >= 500, 'Default paper allocation should support $1-$2 target-profit trades.');
ok(settings.entryOrderType === 'limit', 'Default entry order type must be limit.');
ok(Number(settings.entrySignalWindowCandles) >= 5, 'MACD cross window must be wide enough for auto scanner.');
ok(Number(settings.histColorLookback) >= 10, 'Histogram color lookback must be wide enough for auto scanner.');
ok(!app.includes('Target TP' + '2 profit $'), 'Settings must not label target profit as TP2-only.');
ok(!app.includes('Minimum TP' + '2 profit $'), 'Settings must not label minimum profit as TP2-only.');
ok(!app.includes('Estimated TP' + '2 Profit'), 'Chart panel must not label full-plan estimate as TP2-only.');
ok(app.includes('Target full-trade profit $'), 'Settings must expose target full-trade profit dollars.');
ok(app.includes('Minimum full-trade profit $'), 'Settings must expose minimum full-trade profit dollars.');
ok(app.includes('TP2 close remaining %'), 'Settings must clarify TP2 closes the remaining position.');
ok(app.indexOf('Open / Pending Trades') < app.indexOf('Scanner Signals'), 'Open/Pending trades must render above scanner signals.');
ok(server.includes('plannedExitRMultiple'), 'Server must calculate blended TP1+TP2 planned R.');
ok(server.includes('estimatedFullTradeProfitUsd'), 'Server must calculate full-trade profit dollars.');
ok(server.includes('Projected full-trade profit'), 'Server must block tiny-profit trades with a full-trade reason.');
ok(server.includes("entryType: pullbackPlan ? 'PULLBACK_LIMIT' : (settings.entryOrderType === 'market' ? 'MARKET_OR_IMMEDIATE' : 'IMMEDIATE_LIMIT')"), 'Immediate-limit entry type not implemented.');
ok(server.includes('processTradeManagement(payload.rows, settings, trades, wallet'), 'Trade management must run during auto scan.');
ok(server.includes("signalSource: 'macd_divergence_mtf_ema'"), 'Signal source must remain MACD Divergence + MTF EMA.');
ok(server.includes("strategyMode: 'MACD_DIVERGENCE_MTF_EMA'"), 'Strategy mode must remain MACD Divergence + MTF EMA.');

const { DEFAULT_SETTINGS, calculateMarginPlan, plannedExitRMultiple, estimatedExitPlanProfit } = require('../server');
const plannedR = plannedExitRMultiple(DEFAULT_SETTINGS);
ok(Math.abs(plannedR - 1.5) < 0.000001, `Default blended TP1+TP2 plan should be 1.5R with 50/50 exits, got ${plannedR}R.`);
const samplePlan = calculateMarginPlan({ coin: 'BTCUSD', candidate: { entry: 73247.5, sl: 73522.6 } }, DEFAULT_SETTINGS, { openTrades: [], closedTrades: [] }, null, null, { live: false });
ok(samplePlan.allowed, `Sample BTC short sizing plan should be allowed under V59 defaults: ${samplePlan.blockedReason || 'blocked'}`);
ok(Number(samplePlan.estimatedFullTradeProfitUsd) >= 1, `Sample BTC full-trade profit should be >= $1, got $${samplePlan.estimatedFullTradeProfitUsd}`);
ok(Number(samplePlan.estimatedStopLossUsd) <= Number(DEFAULT_SETTINGS.maxStopLossUsd), 'Sample BTC SL loss should stay within max stop-loss cap.');
const exitProfit = estimatedExitPlanProfit(1000, 0.001, DEFAULT_SETTINGS);
ok(exitProfit.tp1ProfitUsd === 0.5 && exitProfit.tp2ProfitUsd === 1 && exitProfit.fullTradeProfitUsd === 1.5, `Exit plan math incorrect: ${JSON.stringify(exitProfit)}`);

if (failures.length) {
  console.error('V59 audit failed:\n- ' + failures.join('\n- '));
  process.exit(1);
}
console.log('V59 audit passed: TP1/TP2 labels, full-trade profit sizing, UI order, and scanner execution checks are consistent.');
