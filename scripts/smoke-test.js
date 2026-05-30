'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { performance } = require('perf_hooks');

const root = path.resolve(__dirname, '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'inst-ema-macd-test-'));
process.env.DATA_DIR = tmp;
process.env.PORT = '0';
process.env.DELTA_SYNC_DISABLED = '1';
process.env.DASHBOARD_PASSWORD = 'test-dashboard-password';

const { createServer, runScan } = require('../server');

function read(file) { return fs.readFileSync(path.join(root, file), 'utf8'); }
let authCookie = '';
async function request(base, route, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(authCookie ? { Cookie: authCookie } : {}), ...(options.headers || {}) };
  const res = await fetch(`${base}${route}`, { headers, ...options });
  const text = await res.text();
  let json = {};
  try { json = text ? JSON.parse(text) : {}; } catch (_) {}
  assert.ok(res.ok, `${route} returned ${res.status}: ${text}`);
  return json;
}
async function requestFail(base, route, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(authCookie ? { Cookie: authCookie } : {}), ...(options.headers || {}) };
  const res = await fetch(`${base}${route}`, { headers, ...options });
  assert.ok(!res.ok, `${route} was expected to fail`);
}
function validateStaticControls() {
  const html = read('public/index.html');
  const js = read('public/app.js');
  const css = read('public/styles.css');
  const requiredHtml = ['Trading Journal', 'data-page="dashboard"', 'data-page="chart"', 'data-page="strategies"', 'data-page="trades"', 'data-page="logs"', 'data-page="settings"', 'id="modeSwitch"', 'id="botSwitch"', 'data-filter="ALL"', 'data-filter="LONG"', 'data-filter="SHORT"', 'data-filter="WAIT"', 'data-filter="STRONG"', 'id="refreshBtn"'];
  const requiredJs = ['V69 5m scalp + MTF S/R', 'EMA50', 'EMA200', 'Memory Cloud', 'MACD 12/26/9', 'chartCanvas', 'Forecast / Projection', 'data-chart-tab', 'apiKeyForm', 'Market Memory cloud', 'Closed Wins Amount', 'Closed Losses Amount', 'Delta Coin Universe', 'addAssetBtn', 'data-remove-asset', '/api/chart', '/api/delta-symbols', '/api/auto-setup', '/api/emergency-stop', '/api/outbound-ip'];
  const requiredCss = ['--panel:#ffffff', '--text:#0b0f14', 'chart-layout', 'strategy-grid', 'coin-logo', 'asset-manager'];
  for (const token of requiredHtml) assert.ok(html.includes(token), `Missing HTML control ${token}`);
  for (const token of requiredJs) assert.ok(js.includes(token), `Missing JS content ${token}`);
  for (const token of requiredCss) assert.ok(css.includes(token), `Missing CSS content ${token}`);
}

(async () => {
  validateStaticControls();
  const server = createServer();
  await new Promise(resolve => server.listen(0, resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const lockedPage = await fetch(`${base}/`);
    assert.equal(lockedPage.status, 401, 'Dashboard should be locked before login');
    assert.ok((await lockedPage.text()).includes('DASHBOARD LOCKED'), 'Login page missing');

    const login = await fetch(`${base}/api/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: 'test-dashboard-password' }), redirect: 'manual' });
    assert.equal(login.status, 302, 'Login should redirect');
    authCookie = (login.headers.get('set-cookie') || '').split(';')[0];
    assert.ok(authCookie.includes('ds_v28_session='), 'Session cookie missing');

    const page = await fetch(`${base}/`, { headers: { Cookie: authCookie } });
    assert.equal(page.status, 200, 'Dashboard should load after login');
    assert.ok((await page.text()).includes('Trading Journal'));

    const state = await request(base, '/api/state');
    assert.equal(state.ok, true);
    assert.ok(Array.isArray(state.data.rows) && state.data.rows.length >= 5, 'Scanner rows missing');
    assert.equal(state.data.settings.exchange, 'delta_exchange_india');
    assert.equal(state.data.settings.executionApi, 'delta_exchange_india');
    assert.equal(state.data.settings.strategyMode, 'V69_5M_SCALP_MTF_SR_VOLUME');
    assert.equal(state.data.settings.signalSource, 'v69_5m_scalp_mtf_sr_volume_memory_cloud');
    assert.equal(state.data.settings.primaryTimeframe, '5m');
    assert.equal(state.data.settings.executionTimeframe, '5m');
    assert.deepEqual(state.data.settings.higherTimeframes, ['15m', '1h', '1d']);
    assert.equal(state.data.settings.mtfEmaPeriod, 50);
    assert.equal(state.data.settings.institutionalEmaEnabled, true);
    assert.equal(state.data.settings.marketMemoryEnabled, true);
    assert.equal(state.data.settings.marketMemoryRequirePullback, true);
    assert.ok(state.data.settings.marketMemoryMinSimilarityPct >= 55);
    assert.equal(state.data.settings.institutionalRequirePullback, false);
    assert.equal(state.data.settings.paperTrade, true);
    assert.equal(state.data.settings.liveReady, false);
    assert.equal(state.data.settings.entryEmaFastPeriod, 50);
    assert.equal(state.data.settings.entryEmaSlowPeriod, 200);
    assert.equal(state.data.settings.trendEmaPeriod, 50);
    assert.equal(state.data.settings.dominantEmaPeriod, 200);
    assert.equal(state.data.settings.vwapConfluenceEnabled, false);
    assert.ok(state.data.settings.minConfluenceScore >= 5);
    assert.equal(state.data.settings.institutionalRequirePriceAction, true);
    assert.equal(state.data.settings.dynamicTpEnabled, true);
    assert.equal(state.data.settings.minFullTradeProfitUsd, 2);
    assert.equal(state.data.settings.targetFullTradeProfitUsd, 5);
    assert.equal(state.data.settings.macdFastLength, 12);
    assert.equal(state.data.settings.macdSlowLength, 26);
    assert.equal(state.data.settings.macdSignalLength, 9);
    assert.equal(state.data.settings.twoPoleModuleEnabled, false);
    assert.equal(state.data.settings.breakoutModuleEnabled, false);
    assert.equal(state.data.settings.vwapModuleEnabled, false);
    assert.ok(state.data.rows.every(r => Object.prototype.hasOwnProperty.call(r, 'macdDivergenceSignal')), 'Rows need MACD divergence payload');
    assert.ok(state.data.rows.every(r => Object.prototype.hasOwnProperty.call(r, 'confluenceScore')), 'Rows need confluence score');
    assert.equal(state.data.settings.srVolumeAlignmentEnabled, true);
    assert.equal(state.data.settings.requirePreviousDayContext, true);
    assert.equal(state.data.settings.requireMtfSupportResistance, true);
    assert.equal(state.data.settings.requireVolumeFlowAlignment, true);
    assert.equal(state.data.settings.requireClosedDailyContext, true);
    assert.equal(state.data.settings.require5mVolumeFlow, true);
    assert.ok(state.data.rows.every(r => Object.prototype.hasOwnProperty.call(r, 'mtfSrVolume')), 'Rows need MTF S/R volume payload');

    const outbound = await request(base, '/api/outbound-ip', { method: 'POST', body: '{}' });
    assert.equal(outbound.data.apiStatus.serverOutboundIp, '127.0.0.1');

    const symbols = await request(base, '/api/delta-symbols');
    assert.ok(Array.isArray(symbols.data.symbols) && symbols.data.symbols.includes('BTCUSD'), 'Delta symbol manager payload missing BTCUSD');

    const chart = await request(base, '/api/chart?symbol=BTCUSD&resolution=5m');
    assert.equal(chart.data.symbol, 'BTCUSD');
    assert.equal(chart.data.resolution, '5m');
    assert.ok(Array.isArray(chart.data.candles), 'Chart candles payload missing');
    assert.ok(Array.isArray(chart.data.indicators.ema50Exec), 'Chart EMA50 payload missing');
    assert.ok(Array.isArray(chart.data.indicators.ema200Exec), 'Chart EMA200 payload missing');
    assert.ok(Array.isArray(chart.data.indicators.memoryLine), 'Chart Memory line payload missing');
    assert.ok(Array.isArray(chart.data.indicators.memoryCloudHigh), 'Chart Memory cloud high payload missing');
    assert.ok(Array.isArray(chart.data.indicators.memoryCloudLow), 'Chart Memory cloud low payload missing');
    assert.ok(chart.data.supportResistance, 'Chart support/resistance missing');
    assert.ok(chart.data.mtfSrVolume, 'Chart MTF S/R volume context missing');

    const scan = await request(base, '/api/scan', { method: 'POST', body: '{}' });
    assert.ok(scan.data.metrics, 'Scan metrics missing');
    assert.ok(Object.prototype.hasOwnProperty.call(scan.data.metrics, 'grossWinUsd'), 'Trade gross win metric missing');
    assert.ok(Object.prototype.hasOwnProperty.call(scan.data.metrics, 'grossLossUsdAbs'), 'Trade gross loss metric missing');

    const onPaper = await request(base, '/api/toggle-live', { method: 'POST', body: JSON.stringify({ enabled: true }) });
    assert.equal(onPaper.data.settings.botEnabled, true, 'BOT ON failed in paper mode');

    const emergency = await request(base, '/api/emergency-stop', { method: 'POST', body: '{}' });
    assert.equal(emergency.data.settings.botEnabled, false, 'Emergency stop did not switch bot off');
    assert.equal(emergency.data.settings.paperTrade, true, 'Emergency stop did not force paper mode');

    await requestFail(base, '/api/settings', { method: 'POST', body: JSON.stringify({ paperTrade: false }) });

    const settings = await request(base, '/api/settings', { method: 'POST', body: JSON.stringify({ divergenceLookback: 80, maxConcurrentPositions: 5, maxBotAllocationUsd: 50, assets: ['BTCUSD','ETHUSD','SOLUSD'] }) });
    assert.equal(settings.data.settings.divergenceLookback, 80);
    assert.equal(settings.data.settings.maxConcurrentPositions, 5);
    assert.equal(settings.data.settings.assets.length, 3);
    assert.deepEqual(settings.data.settings.assets, ['BTCUSD','ETHUSD','SOLUSD']);

    const webhook = await request(base, '/api/tradingview-webhook', { method: 'POST', body: JSON.stringify({ token: 'change-me', symbol: 'BTCUSD', side: 'LONG', strategy: 'Institutional EMA MACD MTF' }) });
    assert.equal(webhook.data.symbol, 'BTCUSD');
    assert.equal(webhook.data.side, 'LONG');

    const t0 = performance.now();
    for (let i = 0; i < 20; i += 1) runScan({ autoExecute: false });
    const elapsed = performance.now() - t0;
    assert.ok(elapsed < 1200, `Scan loop too slow: ${elapsed.toFixed(1)}ms`);

    const tradesFile = path.join(tmp, 'trades.json');
    assert.ok(fs.existsSync(tradesFile), 'trades.json must exist for saved trade ledger');

    console.log('PASS: V69 5m scalp MTF S/R volume Market Memory live-armed bot, chart visuals, settings, trade ledger, API routes and scanner loop validated.');
  } finally {
    await new Promise(resolve => server.close(resolve));
    fs.rmSync(tmp, { recursive: true, force: true });
  }
})().catch(error => { console.error(`FAIL: ${error.stack || error.message}`); process.exit(1); });
