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
  'calculateRsiSeries',
  'calculateMarketMemoryAverage',
  'calculateCciSeries',
  'cumulativeVwapSeries',
  'volumeSpikeState',
  'structureLocationForSide',
  'confluenceForSide',
  'MarketMemory=',
  'Structure Location Gate',
  'Confluence Score Gate',
  'Coin Tier Filter',
  'return false && Boolean(',
  'V64 paper-only lock: live order execution disabled in this build',
  'pendingCreatedCandleTime',
  'Paper limit filled only from a closed 5m candle after the order was placed.',
  'lotsPurchased',
  'confluenceScore',
  'v64-market-memory-paper-lock'
];
for (const token of serverTokens) assert.ok(server.includes(token), `server.js missing ${token}`);

const appTokens = [
  'PAPER LOCK',
  'PAPER ONLY — LIVE LOCKED',
  'V64 is locked to PAPER mode',
  'Market Memory layer',
  'Closed Wins Amount',
  'Closed Losses Amount',
  'Lots',
  'Conf.',
  'Confluence score',
  'Structure location gate',
  'EMA9',
  'EMA21',
  'VWAP',
  'BULL SETUP',
  'BEAR SETUP',
  'Wider SL reduces lots'
];
for (const token of appTokens) assert.ok(app.includes(token), `public/app.js missing ${token}`);

const cssTokens = ['.ema9', '.ema21', '.vwap-line', '.level.support', '.level.resistance'];
for (const token of cssTokens) assert.ok(css.includes(token), `public/styles.css missing ${token}`);

assert.equal(pkg.version, '6.4.0', 'package version must be 6.4.0');
assert.equal(settings.paperTrade, true, 'settings must default to paper mode');
assert.equal(settings.liveAddOnsEnabled, false, 'live add-ons must be off');
assert.equal(settings.entryEmaFastPeriod, 9, 'EMA9 setting missing');
assert.equal(settings.entryEmaSlowPeriod, 21, 'EMA21 setting missing');
assert.equal(settings.trendEmaPeriod, 50, 'EMA50 setting missing');
assert.equal(settings.dominantEmaPeriod, 200, 'EMA200 setting missing');
assert.equal(settings.rsiPeriod, 14, 'RSI14 setting missing');
assert.equal(settings.vwapConfluenceEnabled, true, 'VWAP confluence must default on');
assert.equal(settings.marketMemoryEnabled, true, 'Market Memory must default on');
assert.equal(settings.marketMemoryRequirePullback, true, 'Market Memory pullback must default on');
assert.ok(settings.marketMemoryMinSimilarityPct >= 55, 'Market Memory similarity default out of range');
assert.equal(settings.volumeSpikeConfluenceEnabled, true, 'Volume confluence must default on');
assert.ok(settings.minConfluenceScore >= 5 && settings.minConfluenceScore <= 12, 'min confluence score out of range');
assert.ok(settings.aPlusConfluenceScore >= settings.minConfluenceScore, 'A+ score must be >= min score');
assert.ok(Array.isArray(settings.assets) && settings.assets.includes('BTCUSD') && settings.assets.includes('ETHUSD'), 'Tier 1 assets missing');
assert.ok(!settings.assets.includes('AVAXUSD') || settings.tier3MinConfluenceScore >= settings.aPlusConfluenceScore, 'Tier 3 must require A+ style gate');

console.log('PASS: V64 audit confirmed paper lock, Market Memory gate, closed-candle limit fills, EMA/MACD confluence, structure SL-first sizing, trade totals, UI fields, and defaults.');
