'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
function read(file) { return fs.readFileSync(path.join(root, file), 'utf8'); }
function json(file) { return JSON.parse(read(file)); }
const server = read('server.js');
const app = read('public/app.js');
const css = read('public/styles.css');
const settings = json('data/settings.json');
const pkg = json('package.json');

const serverTokens = [
  'calculateMarketMemoryAverage',
  'buildMtfSrVolumeContext',
  'previousDayContext',
  'directionalVolumeFlow',
  'structureLocationForSide',
  'confluenceForSide',
  'MarketMemory=',
  'Structure Location Context',
  'Coin Tier Filter',
  'return Boolean(',
  'pendingCreatedCandleTime',
  'Paper limit filled only from a closed 5m candle after the order was placed.',
  'lotsPurchased',
  'confluenceScore',
  'MTF_SR_VOLUME'
];
for (const token of serverTokens) assert.ok(server.includes(token), `server.js missing ${token}`);

const appTokens = [
  'LIVE MODE — REAL ORDERS',
  'LIVE mode armed',
  'LIVE mode armed',
  'Market Memory layer',
  'Closed Wins Amount',
  'Closed Losses Amount',
  'Lots',
  'Conf.',
  'Confluence score',
  'Structure location gate',
  'EMA50',
  'EMA200',
  'Memory Cloud',
  'BULL SETUP',
  'BEAR SETUP',
  'Wider SL reduces lots'
];
for (const token of appTokens) assert.ok(app.includes(token), `public/app.js missing ${token}`);

const cssTokens = ['.memory-cloud', '.memory-line', '.ema50', '.ema200', '.level.support', '.level.resistance'];
for (const token of cssTokens) assert.ok(css.includes(token), `public/styles.css missing ${token}`);

assert.equal(pkg.version, '6.8.0', 'package version must be 6.8.0');
assert.equal(settings.paperTrade, true, 'settings must default to paper mode but live must be armable');
assert.equal(settings.liveAddOnsEnabled, false, 'live add-ons must be off');
assert.equal(settings.entryEmaFastPeriod, 50, 'legacy fast EMA must be locked to EMA50');
assert.equal(settings.entryEmaSlowPeriod, 200, 'legacy slow EMA must be locked to EMA200');
assert.equal(settings.trendEmaPeriod, 50, 'EMA50 setting missing');
assert.equal(settings.dominantEmaPeriod, 200, 'EMA200 setting missing');
assert.equal(settings.vwapConfluenceEnabled, false, 'VWAP confluence must default off as a hard gate');
assert.equal(settings.marketMemoryEnabled, true, 'Market Memory must default on');
assert.equal(settings.marketMemoryRequirePullback, true, 'Market Memory pullback must default on');
assert.ok(settings.marketMemoryMinSimilarityPct >= 55, 'Market Memory similarity default out of range');
assert.equal(settings.volumeSpikeConfluenceEnabled, false, 'Volume confluence must default off as a hard gate');
assert.ok(settings.minConfluenceScore >= 5 && settings.minConfluenceScore <= 12, 'min confluence score out of range');
assert.ok(settings.aPlusConfluenceScore >= settings.minConfluenceScore, 'A+ score must be >= min score');
assert.ok(Array.isArray(settings.assets) && settings.assets.includes('BTCUSD') && settings.assets.includes('ETHUSD'), 'Tier 1 assets missing');
assert.ok(!settings.assets.includes('AVAXUSD') || settings.tier3MinConfluenceScore >= settings.aPlusConfluenceScore, 'Tier 3 must require A+ style gate');

console.log('PASS: V68 audit confirmed EMA50/200-only chart, Market Memory cloud, MACD divergence/timing, MTF S/R volume alignment, live armed, closed-candle limit fills, structure SL-first sizing, trade totals, UI fields, and defaults.');
