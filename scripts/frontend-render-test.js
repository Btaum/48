'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const code = fs.readFileSync(path.join(root, 'public/app.js'), 'utf8') + '\n;globalThis.__app=app;globalThis.__chartPage=chartPage;globalThis.__chartSvg=chartSvg;';
const elems = {};
function elem(id) {
  if (!elems[id]) elems[id] = { id, innerHTML: '', textContent: '', className: '', checked: false, classList: { toggle(){}, add(){}, remove(){} }, addEventListener(){}, querySelector(){ return null; }, querySelectorAll(){ return []; } };
  return elems[id];
}
const document = {
  querySelector(selector) { return selector.startsWith('#') ? elem(selector.slice(1)) : elem(selector); },
  querySelectorAll(selector) {
    if (selector === '.tab') return [{ dataset: { page: 'dashboard' }, classList: { toggle(){} } }, { dataset: { page: 'chart' }, classList: { toggle(){} } }];
    if (selector === '.page') return ['dashboard','chart','strategies','trades','logs','settings'].map(p => ({ id: `page-${p}`, classList: { toggle(){} } }));
    return [];
  },
  body: { addEventListener(){} }
};
const context = { document, window: { addEventListener(){} }, setTimeout(){}, setInterval(){ return 0; }, clearInterval(){}, clearTimeout(){}, console, fetch: async () => ({ ok: true, json: async () => ({}) }), URLSearchParams, FormData: function(){}, confirm: () => false, Number, String, Array, Math, Date, Boolean, Object, JSON };
vm.runInNewContext(code, context);

const candles = Array.from({ length: 80 }, (_, i) => {
  const base = 73000 + Math.sin(i / 5) * 180 + i * 4;
  return { time: 1700000000 + i * 300, open: base - 20, high: base + 65, low: base - 85, close: base + (i % 2 ? 35 : -15) };
});
const series = candles.map((c, i) => c.close + Math.sin(i / 8) * 40);
context.__app.state = { lastScanAt: Date.now(), serverTime: Date.now(), coins: 1, settings: { assets: ['BTCUSD'], marketDataSource: 'Delta', liveReady: false, deltaStatus: 'LIVE_DELTA', botEnabled: true, paperTrade: true }, rows: [{ coin: 'BTCUSD', price: 73300, dec: 'WAIT' }], metrics: {}, openTrades: [], logs: [] };
context.__app.page = 'chart';
context.__app.chart = { coin: 'BTCUSD', timeframe: '5m', tab: 'Long', data: {
  symbol: 'BTCUSD', resolution: '5m', exchange: 'Delta', source: 'frontend render test', candles,
  indicators: { ema50Exec: series, ema200Exec: series.map(v => v - 220), ema15: series, ema1h: series.map(v => v - 120), memoryLine: series.map(v => v - 40), memoryCloudHigh: series.map(v => v + 80), memoryCloudLow: series.map(v => v - 160), memoryRegime: series.map((_, i) => i < 40 ? 'bull' : 'bear'), macdLine: series.map((_, i) => Math.sin(i / 7) * 120), macdSignal: series.map((_, i) => Math.sin((i - 4) / 7) * 100), macdHist: series.map((_, i) => Math.sin(i / 5) * 60) },
  plan: { active: true, side: 'LONG', entry: 73300, sl: 72900, tp1: 73700, tp2: 74100, rr: '1:2' },
  signal: { entrySide: 'LONG', ema15: 73300, ema1h: 73100, macdLine: -20, macdSignal: -25, conditions: { longTrend: true, institutionalExecStack: true, institutionalHtfStack: true, institutionalPullback: true, institutionalPriceAction: true, institutionalHtfMacd: true, momentumOk: true, zeroOk: true, priceLowerLow: true, macdHigherLow: true, histColorChange: true, crossover: true }, institutionalEma: { long: { confluence: { score: 10, structure: { pass: true, reason: 'Near support' }, rsiOk: true, vwapOk: true, volumeOk: true, reasons: ['EMA aligned','MACD aligned'] } } }, divergence: { first: { index: 30 }, second: { index: 45 } } }, supportResistance: { support: 72950, resistance: 73950 }, chartOffset: 0
}, loading: false, error: '' };
const html = context.__chartPage();
assert.ok(html.includes('chart-svg-wrap'), 'Chart SVG wrapper did not render');
assert.ok(!html.includes('EMA9'), 'EMA9 label should be removed');
assert.ok(!html.includes('EMA21'), 'EMA21 label should be removed');
assert.ok(html.includes('EMA50'), 'EMA50 trend EMA label missing');
assert.ok(html.includes('EMA200'), 'EMA200 dominant EMA label missing');
assert.ok(html.includes('Memory Cloud'), 'Memory Cloud label missing');
assert.ok(html.includes('MACD 12/26/9'), 'MACD panel missing');
assert.ok(html.includes('Entry'), 'Entry level missing');
assert.ok(html.includes('Stop-Loss'), 'Stop-loss level missing');
assert.ok(html.includes('Take-Profit'), 'Take-profit level missing');
assert.ok(html.includes('Forecast / Projection'), 'Forecast panel missing');
assert.ok(html.includes('Confluence score'), 'Confluence condition panel missing');
console.log('PASS: frontend chart page renders SVG, EMA50/200 + Memory Cloud, MACD, Entry/SL/TP and projection panel.');
