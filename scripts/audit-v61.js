'use strict';
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const app = fs.readFileSync(path.join(root, 'public', 'app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public', 'styles.css'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const settings = JSON.parse(fs.readFileSync(path.join(root, 'data', 'settings.json'), 'utf8'));
const failures = [];
function ok(cond, msg){ if(!cond) failures.push(msg); }

ok(pkg.version === '6.1.0', 'Package must be version 6.1.0.');
ok(settings.signalSource === 'institutional_ema_macd_mtf', 'Settings must use institutional EMA + MACD signal source.');
ok(settings.strategyMode === 'INSTITUTIONAL_EMA_MACD_MTF', 'Settings must use institutional EMA + MACD strategy mode.');
ok(settings.institutionalEmaEnabled === true, 'Institutional EMA layer must be enabled by default.');
ok(settings.institutionalRequireEmaStack === true, 'EMA13/50/200 stack must be required by default.');
ok(settings.institutionalRequirePullback === true, 'EMA50 pullback must be required by default.');
ok(settings.institutionalRequirePriceAction === true, 'Price-action trigger must be required by default.');
ok(settings.institutionalRequireHtfMacd === true, 'HTF MACD must be required by default.');
ok(Number(settings.institutionalEmaFastPeriod) === 13, 'EMA fast period must be 13.');
ok(Number(settings.institutionalEmaMidPeriod) === 50, 'EMA mid/pullback period must be 50.');
ok(Number(settings.institutionalEmaSlowPeriod) === 200, 'EMA slow trend period must be 200.');
ok(Number(settings.minFullTradeProfitUsd) >= 2, 'Minimum full-trade profit must default to at least $2.');
ok(Number(settings.targetFullTradeProfitUsd) >= 5, 'Target full-trade profit must default to at least $5.');
ok(settings.dynamicTpEnabled === true, 'Dynamic TP/SL management must be enabled by default.');
ok(Number(settings.dynamicTpStrongR) >= 3, 'Strong MACD dynamic TP target should be at least 3R.');
ok(Number(settings.dynamicTpMaxR) >= Number(settings.dynamicTpStrongR), 'Dynamic max R must be >= strong target R.');
ok(Number(settings.tp1TriggerR) === 1, 'TP1 trigger must remain 1R.');
ok(Number(settings.tp1ClosePct) > 0 && Number(settings.tp1ClosePct) < 100, 'TP1 must be partial close.');
ok(Number(settings.tp2ClosePct) === 100, 'TP2 must close remaining size when dynamic extension is not active.');
ok(settings.requirePullbackForExecution === true, 'Execution must wait for a second pullback limit; do not chase confirmation candles.');
ok(settings.autoSizeToTargetProfit === true, 'Auto-size to target full-trade profit must remain enabled.');
ok(settings.blockTinyProfitTrades === true, 'Tiny full-trade profit setups must remain blocked.');
ok(Number(settings.defaultLeverage) === 25, 'Default leverage should stay capped at 25x.');
ok(settings.entryOrderType === 'limit', 'Default entry order type must remain limit.');
ok(settings.zeroLineMode === 'hard', 'MACD zero-line context must be a hard filter in v61.');
ok(Number(settings.entrySignalWindowCandles) <= 2, 'MACD cross window must be tight to avoid late entries.');
ok(Number(settings.histColorLookback) <= 6, 'Histogram lookback must be tight to avoid stale momentum signals.');

ok(server.includes('function calculateInstitutionalEmaMtfLocal'), 'Server must calculate institutional EMA strategy locally.');
ok(server.includes('priceActionConfirmation'), 'Server must require/detect institutional price-action confirmation.');
ok(server.includes('macdMomentumOk'), 'Server must check MACD momentum strength.');
ok(server.includes('institutionalPullback'), 'Server must expose institutional EMA50 pullback condition.');
ok(server.includes('dynamicTpContinuationStrong'), 'Server must include dynamic TP continuation logic.');
ok(server.includes('emaTrailStopForTrade'), 'Server must include EMA13 trailing SL logic.');
ok(server.includes('tradeStyleFromSettings'), 'Server must label trade style.');
ok(server.includes('closedOhlcQualityForExecution'), 'Server must block auto-entry without live Delta closed OHLC warmup.');
ok(server.includes('Delta Closed OHLC Data Quality'), 'Pass/fail gates must show Delta OHLC data quality.');
ok(server.includes("signalSource: 'institutional_ema_macd_mtf'"), 'Default signal source must be institutional.');
ok(server.includes("strategyMode: 'INSTITUTIONAL_EMA_MACD_MTF'"), 'Default strategy mode must be institutional.');
ok(!server.includes("out.signalSource = 'macd_divergence_mtf_ema'"), 'Validation must not force old MACD-only signal source.');
ok(!server.includes("out.strategyMode = 'MACD_DIVERGENCE_MTF_EMA'"), 'Validation must not force old MACD-only strategy mode.');

ok(app.includes('Institutional EMA + MACD MTF'), 'UI must show institutional strategy name.');
ok(app.includes('EMA13 exec') && app.includes('EMA50 exec') && app.includes('EMA200 exec'), 'Chart legend must show execution EMA13/50/200.');
ok(app.includes('EMA50 15m') && app.includes('EMA50 1h'), 'Chart legend must show MTF EMA confirmation.');
ok(app.includes('Institutional EMA13/50/200 + HTF trend'), 'Forecast panel must show institutional trend condition.');
ok(app.includes('EMA50 pullback zone'), 'Forecast panel must show EMA50 pullback condition.');
ok(app.includes('Price-action confirmation candle'), 'Forecast panel must show price-action condition.');
ok(app.includes('Higher-timeframe MACD strength'), 'Forecast panel must show HTF MACD condition.');
ok(app.includes('SCALP') && app.includes('INTRA') && app.includes('SWING'), 'UI must expose trade style labels.');
ok(app.includes('Dynamic TP'), 'Strategies/settings UI must describe dynamic TP.');
ok(css.includes('.ema13') && css.includes('.ema50') && css.includes('.ema200'), 'CSS must style institutional EMA lines.');
ok(app.indexOf('Open / Pending Trades') < app.indexOf('Scanner Signals'), 'Open/Pending trades must render above scanner signals.');

const { DEFAULT_SETTINGS, calculateMarginPlan, plannedExitRMultiple, estimatedExitPlanProfit, validateSettingsPatch } = require('../server');
ok(DEFAULT_SETTINGS.signalSource === 'institutional_ema_macd_mtf', 'Exported defaults must use institutional signal source.');
ok(DEFAULT_SETTINGS.strategyMode === 'INSTITUTIONAL_EMA_MACD_MTF', 'Exported defaults must use institutional strategy mode.');
ok(DEFAULT_SETTINGS.institutionalEmaEnabled === true, 'Exported defaults must enable institutional layer.');
const validated = validateSettingsPatch({ institutionalEmaEnabled: false, dynamicTpEnabled: false, minFullTradeProfitUsd: 2, targetFullTradeProfitUsd: 5 });
ok(validated.signalSource === 'institutional_ema_macd_mtf', 'Validated settings must keep institutional signal source.');
ok(validated.strategyMode === 'INSTITUTIONAL_EMA_MACD_MTF', 'Validated settings must keep institutional strategy mode.');
const plannedR = plannedExitRMultiple(DEFAULT_SETTINGS);
ok(plannedR >= 1.5, `Default blended TP plan should stay >= 1.5R, got ${plannedR}R.`);
const samplePlan = calculateMarginPlan({ coin: 'BTCUSD', candidate: { entry: 73247.5, sl: 73522.6 } }, DEFAULT_SETTINGS, { openTrades: [], closedTrades: [] }, null, null, { live: false });
ok(samplePlan.allowed, `Sample BTC short sizing plan should be allowed under V60 defaults: ${samplePlan.blockedReason || 'blocked'}`);
ok(Number(samplePlan.estimatedFullTradeProfitUsd) >= 2, `Sample BTC full-trade profit should be >= $2, got $${samplePlan.estimatedFullTradeProfitUsd}`);
const exitProfit = estimatedExitPlanProfit(1000, 0.001, DEFAULT_SETTINGS);
ok(exitProfit.fullTradeProfitUsd > 0, `Exit plan math should produce positive profit: ${JSON.stringify(exitProfit)}`);

if (failures.length) {
  console.error('V61 audit failed:\n- ' + failures.join('\n- '));
  process.exit(1);
}
console.log('V61 audit passed: institutional EMA/MACD gates, chart visuals, style labels, dynamic TP/SL, and profit guards are consistent.');
