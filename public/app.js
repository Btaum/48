'use strict';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

const app = {
  state: null,
  page: 'dashboard',
  filter: 'ALL',
  polling: null,
  chart: { coin: 'BTCUSD', timeframe: '5m', tab: 'Long', data: null, loading: false, error: '', view: { bars: 120, start: null, yPad: 0.12, yShift: 0 }, tool: 'pan', drawings: [] },
  apiDraft: { apiKey: '', secret: '', deltaBaseUrl: '', whitelistedIpNote: '' },
  assetCatalog: { loaded: false, loading: false, symbols: [], error: '' }
};

function esc(v) { return String(v ?? '').replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch])); }
function money(v) { const n = Number(v || 0); return `${n < 0 ? '-' : ''}$${Math.abs(n).toFixed(2)}`; }
function pct(v) { const n = Number(v || 0); return `${n > 0 ? '+' : ''}${n.toFixed(2)}%`; }
function num(v) { const n = Number(v); if (!Number.isFinite(n)) return '-'; if (Math.abs(n) >= 1000) return n.toFixed(2).replace(/\.00$/, ''); if (Math.abs(n) >= 10) return n.toFixed(2).replace(/\.00$/, ''); return n.toFixed(5).replace(/0+$/, '').replace(/\.$/, ''); }
function clsSide(v) { const s = String(v || '').toUpperCase(); return s === 'LONG' ? 'side-long' : s === 'SHORT' ? 'side-short' : 'side-wait'; }
function clsPnL(v) { return Number(v || 0) >= 0 ? 'green' : 'red'; }
function coinBase(coin) { return String(coin || '').replace(/USD|USDT/g, '').toUpperCase(); }
function coinLogo(coin) { return `<span class="coin-logo logo-${esc(String(coin).toUpperCase())}">${esc(coinBase(coin).slice(0,3))}</span>`; }
function rowWhyText(r) { return r?.entryReason || r?.whyReason || r?.blockedBy || r?.nextTrigger || 'No active setup yet.'; }
function toast(msg) { const n = $('#toast'); if (!n) return; n.textContent = msg; n.classList.add('show'); clearTimeout(n._t); n._t = setTimeout(() => n.classList.remove('show'), 3000); }

async function api(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 15000);
  try {
    const res = await fetch(path, { headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, ...options, signal: controller.signal });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.ok === false) throw new Error(json.error || json.message || `HTTP ${res.status}`);
    return json.data ?? json;
  } finally { clearTimeout(timeout); }
}

function selectedRow() {
  const rows = app.state?.rows || [];
  return rows.find(r => r.coin === app.chart.coin) || rows[0] || {};
}
function selectedCoins() {
  return app.state?.settings?.assets || (app.state?.rows || []).map(r => r.coin) || ['BTCUSD','ETHUSD','SOLUSD','XRPUSD','DOGEUSD'];
}
function signalSourceLabel(r) { return r?.strategySignalSource === 'SMI_KN_PULLBACK_TPSL_LOCAL' ? 'SMI-KN' : (r?.strategySignalSource === 'SMI_EMA_CLOUD_TPSL_LOCAL' ? 'SMI-CLOUD' : 'WAIT'); }

async function loadState(opts = {}) {
  try {
    if (opts.scan) app.state = await api('/api/scan', { method: 'POST', body: '{}' });
    else if (opts.sync) app.state = await api('/api/sync-account', { method: 'POST', body: '{}' });
    else app.state = await api('/api/state');
    const coins = selectedCoins();
    if (!coins.includes(app.chart.coin)) app.chart.coin = coins[0] || 'BTCUSD';
    render();
  } catch (e) { if (!opts.silent) toast(e.message); }
}


async function loadChart(opts = {}) {
  if (app.chart.loading && !opts.force) return;
  app.chart.loading = true;
  app.chart.error = '';
  try {
    const q = new URLSearchParams({ symbol: app.chart.coin, resolution: app.chart.timeframe || '5m' });
    app.chart.data = await api(`/api/chart?${q.toString()}`, { timeoutMs: 30000 });
  } catch (e) {
    app.chart.error = e.message || 'Chart load failed';
  } finally {
    app.chart.loading = false;
    if (app.page === 'chart') render();
  }
}

function renderHeader() {
  const s = app.state.settings;
  $('#lastUpdate').textContent = new Date(app.state.lastScanAt || app.state.serverTime).toLocaleString();
  $('#coinCount').textContent = app.state.coins || 0;
  $('#sourceText').textContent = s?.marketDataSource || 'Delta Exchange India';
  $('#modeBadge').textContent = s.paperTrade ? 'PAPER' : 'LIVE';
  $('#modeBadge').className = `pill ${s.paperTrade ? 'pill-paper' : 'pill-red'}`;
  $('#dataBadge').textContent = s.deltaStatus === 'LIVE_DELTA' ? 'LIVE DATA' : 'FALLBACK DATA';
  $('#dataBadge').className = `pill ${s.deltaStatus === 'LIVE_DELTA' ? 'pill-data' : 'pill-warn'}`;
  $('#botSwitch').checked = Boolean(s.botEnabled);
  $('#botSwitchText').textContent = s.botEnabled ? 'BOT ON' : 'BOT OFF';
  const modeSwitch = $('#modeSwitch');
  if (modeSwitch) {
    modeSwitch.checked = !s.paperTrade;
    modeSwitch.disabled = false;
    modeSwitch.title = s.paperTrade ? 'Switch to LIVE only after API/wallet sync.' : 'LIVE mode armed. Real orders can be placed when BOT is ON.';
  }
}



function controlBar() {
  const s = app.state.settings;
  return `<section class="control-bar">
    <span class="pill pill-data">Strategy: V77 SMI + KN Smart TP/SL</span>
    <span class="pill ${s.botEnabled ? 'pill-data' : 'pill-warn'}">${s.botEnabled ? 'BOT ON' : 'BOT OFF'}</span>
    <span class="pill ${s.paperTrade ? 'pill-paper' : 'pill-red'}">${s.paperTrade ? 'PAPER MODE' : 'LIVE MODE — REAL ORDERS'}</span>
    <button id="scanNowBtn" class="btn-blue">Scan Now</button>
    <button id="startBotBtn" class="btn-green">Start Bot</button>
    <button id="stopBotBtn" class="btn-yellow">Stop Bot</button>
    <button id="emergencyStopBtn" class="btn-red">Emergency Stop</button>
  </section>`;
}


function kpi(label, value, klass = '') { return `<article class="kpi-card"><span>${esc(label)}</span><strong class="${klass}">${value}</strong></article>`; }
function coinSelector() {
  const coins = selectedCoins();
  return `<section class="coin-strip">${coins.map(c => `<button class="coin-tab ${c===app.chart.coin?'active':''}" data-coin="${esc(c)}">${coinLogo(c)}${esc(coinBase(c))}</button>`).join('')}</section>`;
}

function dashboardPage() {
  const m = app.state.metrics || {}, open = app.state.openTrades || [];
  const fundsUsed = app.state.risk?.totalBotMarginUsed || open.reduce((x,t)=>x+Number(t.marginUsedUsd||0),0);
  return `${controlBar()}${coinSelector()}
    <section class="kpi-grid">
      ${kpi('Total Trades', m.totalTrades || 0)}${kpi('Wins', m.wins || 0, 'green')}${kpi('Losses', m.losses || 0, 'red')}${kpi('Win Rate', `${Number(m.winRate || 0).toFixed(0)}%`, 'green')}
      ${kpi('Funds Used', money(fundsUsed), 'yellow')}${kpi('Available Allocation', money(app.state.risk?.remainingBotAllocation || 0), 'green')}${kpi('Open P/L', money(m.openPnl), clsPnL(m.openPnl))}${kpi(app.state.wallet?.walletSynced ? 'Delta Wallet Ref.' : 'Wallet', app.state.wallet?.walletSynced ? money(app.state.wallet?.equity) : 'SYNC NEEDED', app.state.wallet?.walletSynced ? '' : 'yellow')}
    </section>
    <section class="panel"><div class="panel-title"><h2>Open / Pending Trades</h2><span class="muted">Open trades stay above scanner signals.</span></div><div class="table-wrap"><table><thead><tr><th>Coin</th><th>Side</th><th>Style</th><th>Status</th><th>Mode</th><th>Entry</th><th>Price</th><th>Funds</th><th>Lots</th><th>SL</th><th>TP1</th><th>TP2</th><th>Conf.</th><th>Est full-plan $</th><th>P/L</th><th>RR</th><th>Action</th></tr></thead><tbody>${openTradesRows(open)}</tbody></table></div></section>
    <section class="panel scanner-panel"><div class="panel-title"><h2>Scanner Signals</h2><div class="legend"><b class="green">LONG</b><b class="red">SHORT</b><b class="yellow">WAIT</b><b class="strong-text">STRONG</b></div></div>
      <div class="table-wrap"><table class="scanner-table"><thead><tr><th>Coin</th><th>Dec</th><th>Trend Stack</th><th>HTF</th><th>MACD</th><th>TV</th><th>Score</th><th>Q</th><th>En</th><th>SL</th><th>TP1</th><th>TP2</th><th>TP3</th><th>RR</th></tr></thead><tbody>${scannerRows(app.state.rows || [])}</tbody></table></div></section>`;
}


function scannerRows(rows) {
  let list = rows.slice();
  if (app.filter === 'LONG' || app.filter === 'SHORT' || app.filter === 'WAIT') list = list.filter(r => r.dec === app.filter);
  if (app.filter === 'STRONG') list = list.filter(r => r.q === 'STRONG');
  const major = new Set(['BTCUSD','ETHUSD','SOLUSD','BNBUSD']);
  const tier1 = list.filter(r => major.has(String(r.coin).toUpperCase()));
  const tier2 = list.filter(r => !major.has(String(r.coin).toUpperCase()));
  const rowHtml = r => {
    const candidate = r.candidate || {};
    const conf = r.confluenceScore ?? candidate.confluenceScore ?? r.confluence?.score ?? r.score;
    const trendStack = r.trendStack || r.trendStackStatus || r.stack || '-';
    const htf = r.htf || r.htfTrend || r.higherTimeframeTrend || r.trend || '-';
    const macd = r.macdStatus || r.macd || (r.macdOk ? 'ON' : 'OFF');
    const tv = r.tvSignal || r.tradingViewSignal || r.tv || '-';
    const q = r.q || r.quality || (Number(conf) >= 70 ? 'STRONG' : 'WEAK');
    return `<tr class="signal-row ${String(r.dec).toLowerCase()}"><td>${coinLogo(r.coin)}<b>${esc(r.coin)}</b></td><td class="${clsSide(r.dec)}"><b>${esc(r.dec)}</b></td><td>${esc(trendStack)}</td><td class="${String(htf).toUpperCase().includes('BULL') ? 'green' : String(htf).toUpperCase().includes('BEAR') ? 'red' : ''}"><b>${esc(htf)}</b></td><td><b>${esc(macd)}</b></td><td>${esc(tv)}</td><td><b>${Number.isFinite(Number(conf)) ? Number(conf).toFixed(0) : '-'}</b></td><td class="${String(q).toUpperCase()==='STRONG'?'strong-text':''}"><b>${esc(q)}</b></td><td>${num(r.en)}</td><td>${num(r.sl)}</td><td>${num(r.t1)}</td><td>${num(r.t2)}</td><td>${num(r.t3 ?? r.tp3)}</td><td>${esc(r.rr || '-')}</td></tr>`;
  };
  const section = (title, arr) => arr.length ? `<tr class="tier-row"><td colspan="14">${esc(title)}</td></tr>${arr.map(rowHtml).join('')}` : '';
  const html = section('TIER 1 — MAJOR COINS', tier1) + section('TIER 2 — MID CAP / INTRADAY', tier2);
  return html || '<tr><td colspan="14" class="empty">No scanner rows.</td></tr>';
}


function statusClass(status) { const s = String(status || '').toUpperCase(); return s === 'PENDING_LIMIT' ? 'yellow' : s === 'OPEN' ? 'green' : ''; }
function openTradesRows(open) {
  return open.map(t => {
    const lots = t.lotsPurchased ?? t.liveOrderSize ?? t.qty;
    const conf = t.confluenceScore ?? t.confluence?.score;
    return `<tr><td>${coinLogo(t.coin)}<b>${esc(t.coin)}</b></td><td class="${clsSide(t.side)}">${esc(t.side)}</td><td><span class="pill pill-data">${esc(t.tradeStyle || '-')}</span></td><td class="${statusClass(t.status)}"><b>${esc(t.status || 'OPEN')}</b>${t.entryType ? `<small class="row-note">${esc(t.entryType)}</small>` : ''}</td><td>${esc(t.mode || 'paper')}</td><td>${num(t.entry)}</td><td>${num(t.price)}</td><td>${money(t.marginUsedUsd)}</td><td>${num(lots)}</td><td>${num(t.sl)}</td><td>${num(t.tp1)}</td><td>${num(t.tp2)}</td><td>${Number.isFinite(Number(conf)) ? Number(conf).toFixed(0) : '-'}</td><td class="green">${money(t.estimatedFullTradeProfitUsd)}</td><td class="${clsPnL(t.pnl)}">${money(t.pnl)}</td><td>${num(t.rr)}</td><td><button class="action-close" data-close="${esc(t.id)}">Close</button></td></tr>`;
  }).join('') || '<tr><td colspan="17" class="empty">No open or pending trades.</td></tr>';
}



function chartDirectionForTab(row) {
  const tab = String(app.chart.tab || 'Long');
  if (tab === 'Short') return 'SHORT';
  if (tab === 'Long') return 'LONG';
  const planSide = app.chart.data?.plan?.side;
  if (planSide === 'LONG' || planSide === 'SHORT') return planSide;
  return row?.dec === 'SHORT' ? 'SHORT' : 'LONG';
}

function tradePlanFor(row, side) {
  const p = app.chart.data?.plan || app.chart.data?.knVisualPlan || {};
  if (p.active && (!side || p.side === side)) return { ...p, active: true, side: p.side || side, price: p.entry, entry: p.entry, sl: p.sl, tp1: p.tp1, tp2: p.tp2, tp3: p.tp3, rr: p.rr || '1:3' };
  const v = app.chart.data?.knVisualPlan || {};
  if (v.active && (!side || v.side === side)) return { ...v, active: true, price: v.entry };
  return { active: false, side, price: app.chart.data?.currentPrice || app.chart.data?.candles?.at(-1)?.close || row?.price || 0, entry: null, sl: null, tp1: null, tp2: null, tp3: null, rr: '1:3' };
}

function conditionFromSignal(sig, side) {
  const chosen = side === 'LONG' ? (sig?.long || {}) : (sig?.short || {});
  return chosen.conditions || sig?.conditions || {};
}


function checkItem(ok, title, sub = '') {
  return `<li class="check-row ${ok ? 'pass' : 'wait'}"><span>${ok ? '✓' : '•'}</span><div><b>${esc(title)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</div></li>`;
}

function forecastTabContent(row, side, plan) {
  const data = app.chart.data || {};
  const sig = data.signal || row?.macdDivergenceSignal || {};
  const chosen = side === 'LONG' ? (sig.long || {}) : (sig.short || {});
  const c = chosen.conditions || sig.conditions || {};
  const setup = chosen.setup || sig.setup || {};
  const active = Boolean(plan.active);
  const executionReady = active && row && row.pass !== false && (!side || row.dec === side);
  const blockedBy = row?.blockedBy || '';
  const reason = sig.reason || rowWhyText(row);
  const executionLabel = app.state?.settings?.paperTrade ? 'READY FOR PAPER ENTRY' : (app.state?.settings?.liveReady ? 'READY FOR LIVE ENTRY' : 'LIVE NOT READY');
  const modeLabel = app.state?.settings?.liveReady ? 'LIVE armed' : (app.state?.settings?.paperTrade ? 'paper mode' : 'live not ready');
  const entryText = active ? `${plan.entryType || 'LIMIT'} at ${num(plan.entry)}` : 'WAIT for SMI pullback + KN confirmation';
  const conditionList = `<ul class="check-list">
    ${checkItem(Boolean(c.trendCloud), 'EMA50/200 trend cloud', side === 'LONG' ? 'Fast cloud above slow and price above cloud' : 'Fast cloud below slow and price below cloud')}
    ${checkItem(Boolean(c.smiPullback), 'SMI pullback beyond band', side === 'LONG' ? 'SMI first went below -40 in bullish trend' : 'SMI first went above +40 in bearish trend')}
    ${checkItem(Boolean(c.cloudTouch), 'Pullback touched trend cloud', 'Skip if pullback does not touch the cloud')}
    ${checkItem(Boolean(c.cloudNotBroken), 'Cloud not broken by close', 'Pullback must reject the cloud, not close through it')}
    ${checkItem(Boolean(c.smiRecoveryCross), 'SMI recovery cross', 'SMI must cross its red EMA after the pullback')}
    ${checkItem(Boolean(c.knSignal), 'KN EMA5/12 crossover', side === 'LONG' ? `EMA fast ${num(chosen.fast || sig.knFast || sig.emaFast)} above slow ${num(chosen.slow || sig.knSlow || sig.emaSlow)}` : `EMA fast ${num(chosen.fast || sig.knFast || sig.emaFast)} below slow ${num(chosen.slow || sig.knSlow || sig.emaSlow)}`)}
    ${checkItem(Boolean(c.entryCandle), side === 'LONG' ? 'Bullish close above KN entry line' : 'Bearish close below KN entry line', setup.signalEntry ? `KN signal entry line ${num(setup.signalEntry)}` : 'Waiting for candle confirmation')}
    ${checkItem(Boolean(c.candleSizeOk), 'Golden candle size filter', 'Avoid oversized candles so SL/TP are practical')}
    ${checkItem(active, 'Entry / SL / TP plotted before order', active ? `Entry ${num(plan.entry)} · SL ${num(plan.sl)} · TP1 ${num(plan.tp1)} · TP2 ${num(plan.tp2)} · TP3 ${num(plan.tp3)} · RR ${plan.rr}` : 'No order until all hard gates pass')}
  </ul>`;
  if (app.chart.tab === 'Forecast') {
    return `<div class="projection-card ${side === 'LONG' ? 'long' : 'short'}"><h3>${side} Forecast</h3>
      <p><b>Status:</b> ${active ? '<span class="green">ACTIVE SETUP</span>' : '<span class="yellow">WAIT — no confirmed SMI + KN entry</span>'}</p>
      <p><b>Execution:</b> ${executionReady ? `<span class="pill pill-data">${esc(executionLabel)}</span>` : `<span class="pill pill-warn">${active ? 'SETUP ACTIVE, EXECUTION BLOCKED' : 'WAIT'}</span>`} <span class="pill pill-paper">${esc(modeLabel)}</span></p>
      ${active && !executionReady ? `<p class="warning-box"><b>Why not opened:</b> ${esc(blockedBy || rowWhyText(row) || 'Risk/sizing guard blocked execution.')}</p>` : ''}
      <p><b>Entry style:</b> ${esc(entryText)}</p>
      <p><b>Forecast:</b> ${active ? 'Entry, SL, TP1, TP2 and TP3 are plotted from the KN Smart TP/SL plan. Bot execution still requires sizing and risk guards.' : 'No TP/SL projection until KN EMA crossover and valid candle confirmation appear. SMI remains visible as momentum confirmation.'}</p>
      <p><b>Reason:</b> ${esc(reason).slice(0, 420)}</p>${data.warning ? `<p class="warning-box">${esc(data.warning)}</p>` : ''}
    </div>${conditionList}`;
  }
  if (app.chart.tab === 'Projection') {
    return `<div class="projection-card ${side === 'LONG' ? 'long' : 'short'}"><h3>${side} Projection</h3>
      ${active ? `<div class="plan-grid"><span>Entry</span><b>${num(plan.entry)}</b><span>Entry style</span><b>${esc(plan.entryType || 'LIMIT')}</b><span>Stop-Loss</span><b class="red">${num(plan.sl)}</b><span>TP1</span><b class="green">${num(plan.tp1)}</b><span>TP2</span><b class="green">${num(plan.tp2)}</b><span>TP3</span><b class="green">${num(plan.tp3)}</b><span>Risk/Reward</span><b>${esc(plan.rr)}</b><span>Est. full-plan profit</span><b class="green">${money(plan.estimatedFullTradeProfitUsd)}</b><span>Minimum full-plan</span><b>${money(plan.minFullTradeProfitUsd ?? plan.minTargetProfitUsd)}</b></div>${!executionReady ? `<p class="warning-box"><b>Projection is visual until execution guard passes:</b> ${esc(blockedBy || 'Check scanner WHY column.')}</p>` : ''}` : `<p class="yellow"><b>No active projection.</b></p><p>Projection waits for SMI pullback continuation + KN EMA crossover + valid entry candle.</p>`}
      <p class="muted">SL follows KN Smart ATR logic by default. After TP1, SL moves to entry/breakeven while TP2/TP3 remain active.</p>
    </div>${conditionList}`;
  }
  return `<div class="projection-card ${side === 'LONG' ? 'long' : 'short'}"><h3>${side} Setup</h3>
    <p><b>Bias:</b> <span class="${clsSide(side)}">${side}</span></p>
    <p><b>Entry:</b> ${active ? num(plan.entry) : 'WAIT'}</p><p><b>Stop-Loss:</b> <span class="red">${active ? num(plan.sl) : 'WAIT'}</span></p>
    <p><b>TP1:</b> <span class="green">${active ? num(plan.tp1) : 'WAIT'}</span> <span class="muted">1R partial</span></p>
    <p><b>TP2:</b> <span class="green">${active ? num(plan.tp2) : 'WAIT'}</span> <span class="muted">2R</span></p>
    <p><b>TP3:</b> <span class="green">${active ? num(plan.tp3) : 'WAIT'}</span> <span class="muted">2.5R default</span></p>
    <p><b>Risk/Reward:</b> ${esc(plan.rr)}</p><p><b>Estimated full-plan profit:</b> <span class="green">${active ? money(plan.estimatedFullTradeProfitUsd) : 'WAIT'}</span></p>
    ${!active ? `<p class="warning-box">No trade: need EMA cloud trend, SMI band pullback, cloud touch, SMI recovery cross, candle color, and valid SL/RR.</p>` : ''}
  </div>${conditionList}`;
}


function svgPathFromSeries(series, x, y) {
  let d = '';
  series.forEach((v, i) => {
    if (!Number.isFinite(v)) return;
    d += `${d ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
  });
  return d;
}

function svgBandAreas(high = [], low = [], regime = [], x, y) {
  const n = Math.min(high.length, low.length);
  let out = '';
  let start = null;
  let side = '';
  function flush(end) {
    if (start === null || end <= start) return;
    const top = [];
    const bottom = [];
    for (let i = start; i <= end; i += 1) {
      if (!Number.isFinite(high[i]) || !Number.isFinite(low[i])) continue;
      top.push(`${x(i).toFixed(1)},${y(high[i]).toFixed(1)}`);
      bottom.unshift(`${x(i).toFixed(1)},${y(low[i]).toFixed(1)}`);
    }
    if (top.length > 1 && bottom.length > 1) out += `<polygon points="${top.concat(bottom).join(' ')}" class="ema-cloud ${side === 'bear' ? 'bear' : 'bull'}"/>`;
  }
  for (let i = 0; i < n; i += 1) {
    const ok = Number.isFinite(high[i]) && Number.isFinite(low[i]);
    const r = String(regime[i] || 'bull') === 'bear' ? 'bear' : 'bull';
    if (!ok) { flush(i - 1); start = null; side = ''; continue; }
    if (start === null) { start = i; side = r; continue; }
    if (r !== side) { flush(i - 1); start = i; side = r; }
  }
  flush(n - 1);
  return out;
}

function formatTime(sec) {
  if (!sec) return '--';
  return new Date(sec * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function chartSvg(row, side) {
  const data = app.chart.data;
  if (app.chart.loading && !data) return `<div class="chart-loading">Loading live Delta candles…</div>`;
  if (app.chart.error) return `<div class="chart-loading red">${esc(app.chart.error)}</div>`;
  if (!data || !Array.isArray(data.candles) || !data.candles.length) return `<div class="chart-loading">No chart candles loaded yet. Click Reload Chart.</div>`;
  const allCandles = data.candles;
  const indAll = data.indicators || {};
  const view = app.chart.view || (app.chart.view = { bars: 120, start: null, yPad: 0.12, yShift: 0 });
  const bars = Math.max(40, Math.min(Number(view.bars || 120), allCandles.length));
  if (view.start === null || view.start === undefined) view.start = Math.max(0, allCandles.length - bars);
  view.start = Math.max(0, Math.min(Number(view.start || 0), Math.max(0, allCandles.length - bars)));
  const startIdx = view.start;
  const candles = allCandles.slice(startIdx, startIdx + bars);
  const slice = arr => Array.isArray(arr) ? arr.slice(startIdx, startIdx + bars) : [];
  const ind = { ...indAll, emaFast: slice(indAll.emaFast), emaSlow: slice(indAll.emaSlow), smiLine: slice(indAll.smiLine), smiSignal: slice(indAll.smiSignal) };
  const plan = tradePlanFor(row, side);
  const W = 1120, priceH = 480, smiTop = 520, smiH = 180, H = 748;
  const leftPad = 42, rightPad = 92;
  const x = i => leftPad + i * ((W - leftPad - rightPad) / Math.max(1, candles.length - 1));
  const candleW = Math.max(3, Math.min(12, (W - leftPad - rightPad) / candles.length * 0.62));
  const cloudVals = [...(ind.emaFast || []), ...(ind.emaSlow || [])].filter(Number.isFinite);
  const planVals = plan.active ? [plan.entry, plan.sl, plan.tp1, plan.tp2, plan.tp3].filter(Number.isFinite) : [];
  const lows = candles.map(c => Number(c.low)), highs = candles.map(c => Number(c.high));
  let minP = Math.min(...lows, ...cloudVals, ...planVals), maxP = Math.max(...highs, ...cloudVals, ...planVals);
  if (!Number.isFinite(minP) || !Number.isFinite(maxP) || minP === maxP) { minP = candles.at(-1).close * 0.99; maxP = candles.at(-1).close * 1.01; }
  const rawRange = Math.max(0.00000001, maxP - minP);
  const pad = rawRange * Math.max(0.02, Math.min(Number(view.yPad || 0.12), 0.6));
  minP = minP - pad + rawRange * Number(view.yShift || 0);
  maxP = maxP + pad + rawRange * Number(view.yShift || 0);
  const y = v => 38 + (maxP - v) / (maxP - minP) * (priceH - 72);
  const grid = [];
  for (let i = 0; i <= 7; i += 1) { const val = minP + (maxP - minP) * (i / 7); const yy = y(val); grid.push(`<line x1="0" y1="${yy.toFixed(1)}" x2="${W}" y2="${yy.toFixed(1)}" class="grid"/><text x="${W-86}" y="${(yy-4).toFixed(1)}" class="axis-label">${num(val)}</text>`); }
  for (let i = 0; i < 8; i += 1) { const idx = Math.round(i * (candles.length - 1) / 7); const xx = x(idx); grid.push(`<line x1="${xx.toFixed(1)}" y1="30" x2="${xx.toFixed(1)}" y2="${H-32}" class="grid faint"/><text x="${(xx-14).toFixed(1)}" y="${H-12}" class="axis-label">${formatTime(candles[idx]?.time)}</text>`); }
  const candleEls = candles.map((c, i) => { const up = c.close >= c.open; const cx = x(i); const top = Math.min(y(c.open), y(c.close)); const h = Math.max(2, Math.abs(y(c.open) - y(c.close))); const liveCls = c.live ? ' live-candle' : ''; return `<line x1="${cx.toFixed(1)}" y1="${y(c.high).toFixed(1)}" x2="${cx.toFixed(1)}" y2="${y(c.low).toFixed(1)}" class="wick ${up ? 'up' : 'down'}${liveCls}"/><rect x="${(cx-candleW/2).toFixed(1)}" y="${top.toFixed(1)}" width="${candleW.toFixed(1)}" height="${h.toFixed(1)}" rx="1" class="candle ${up ? 'up' : 'down'}${liveCls}"/>`; }).join('');
  const emaFastPath = svgPathFromSeries(ind.emaFast || [], x, y);
  const emaSlowPath = svgPathFromSeries(ind.emaSlow || [], x, y);
  const level = (v, klass, label) => !Number.isFinite(Number(v)) ? '' : `<line x1="0" y1="${y(v).toFixed(1)}" x2="${W-rightPad}" y2="${y(v).toFixed(1)}" class="level ${klass}"/><rect x="${W-250}" y="${(y(v)-18).toFixed(1)}" width="155" height="22" rx="5" class="label-bg ${klass}"/><text x="${W-242}" y="${(y(v)-3).toFixed(1)}" class="label ${klass}">${label} ${num(v)}</text>`;
  const zones = plan.active ? (() => { const gy = Math.min(y(plan.entry), y(plan.tp3 || plan.tp2)), gh = Math.abs(y(plan.entry)-y(plan.tp3 || plan.tp2)); const ry = Math.min(y(plan.entry), y(plan.sl)), rh = Math.abs(y(plan.entry)-y(plan.sl)); return `<rect x="${W*0.58}" y="${gy.toFixed(1)}" width="${W*0.30}" height="${gh.toFixed(1)}" class="target-zone"/><rect x="${W*0.58}" y="${ry.toFixed(1)}" width="${W*0.30}" height="${rh.toFixed(1)}" class="stop-zone"/>`; })() : '';
  const last = candles.at(-1); const currentPrice = Number(data.currentPrice || last?.close || 0);
  const livePriceLine = Number.isFinite(currentPrice) && currentPrice > 0 ? `<line x1="0" y1="${y(currentPrice).toFixed(1)}" x2="${W-rightPad}" y2="${y(currentPrice).toFixed(1)}" class="live-price-line"/><rect x="${W-rightPad+4}" y="${(y(currentPrice)-11).toFixed(1)}" width="82" height="22" rx="4" class="live-price-box"/><text x="${W-rightPad+10}" y="${(y(currentPrice)+4).toFixed(1)}" class="live-price-text">${num(currentPrice)}</text>` : '';
  const setup = (side === 'LONG' ? data.signal?.long : data.signal?.short)?.setup || data.signal?.setup || data.knVisualPlan || {};
  const marker = (idx, klass, label) => { let j = Number(idx); if (!Number.isFinite(j)) return ''; if (j >= candles.length) j = j - startIdx; if (j < 0 || j >= candles.length) return ''; return `<line x1="${x(j).toFixed(1)}" y1="34" x2="${x(j).toFixed(1)}" y2="${priceH}" class="smi-vline ${klass}"/><text x="${(x(j)+5).toFixed(1)}" y="${klass === 'entrymark' ? 96 : 74}" class="smi-label ${klass}">${label}</text>`; };
  const signalIdx = Number.isFinite(Number(setup.signalIndex)) ? setup.signalIndex : data.knVisualPlan?.chartIndex;
  const entryIdx = Number.isFinite(Number(setup.entryIndex)) ? setup.entryIndex : data.knVisualPlan?.chartIndex;
  const smiMarkers = `${marker(signalIdx, plan.side === 'SHORT' ? 'knsell' : 'knbuy', plan.side === 'SHORT' ? 'KN SELL' : 'KN BUY')}${marker(entryIdx, 'entrymark', plan.visualOnly ? 'KN ENTRY' : 'ENTRY')}`;
  const smiLine = ind.smiLine || [], smiSig = ind.smiSignal || []; const ob = Number(ind.smiOverbought ?? 40), os = Number(ind.smiOversold ?? -40);
  const smiVals = [...smiLine, ...smiSig, os, 0, ob].filter(Number.isFinite); const minS = Math.min(-100, ...smiVals), maxS = Math.max(100, ...smiVals); const ys = v => smiTop + (maxS - v) / (maxS - minS) * smiH;
  const smiPath = svgPathFromSeries(smiLine, x, ys); const smiSigPath = svgPathFromSeries(smiSig, x, ys);
  const smiGrid = [ob, 0, os].map(v => `<line x1="0" y1="${ys(v).toFixed(1)}" x2="${W}" y2="${ys(v).toFixed(1)}" class="grid ${v === 0 ? '' : 'faint'}"/><text x="${W-76}" y="${(ys(v)-4).toFixed(1)}" class="axis-label">${v}</text>`).join('');
  const drawingEls = (app.chart.drawings || []).filter(d => d.symbol === data.symbol).map(d => { const cls = d.tool || 'line'; return `<line x1="${d.x1}" y1="${d.y1}" x2="${d.x2}" y2="${d.y2}" class="draw-line ${cls}"/><text x="${Math.min(d.x1,d.x2)+4}" y="${Math.min(d.y1,d.y2)-6}" class="draw-label">${esc(d.label || '')}</text>`; }).join('');
  const liveFlag = data.usesLivePreview ? ' LIVE PREVIEW' : ' CLOSED'; const ohlc = last ? `O${num(last.open)} H${num(last.high)} L${num(last.low)} C${num(last.close)}${liveFlag}` : ''; const tvLink = data.tradingViewUrl ? `<a class="tv-link" href="${esc(data.tradingViewUrl)}" target="_blank" rel="noreferrer">Open TradingView Reference</a>` : '';
  return `<div id="chartCanvas" class="chart-svg-wrap"><svg id="mainChartSvg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(data.symbol)} live Delta chart"><defs><marker id="arrowGreen" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#00a63e"/></marker><marker id="arrowRed" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#e00000"/></marker></defs><rect x="0" y="0" width="${W}" height="${H}" fill="#fff"/>${grid.join('')}<text x="18" y="24" class="chart-title">${esc(data.symbol.replace('USD','/USD'))} · ${esc(data.resolution)} · drag chart to pan · wheel to zoom</text><text x="520" y="24" class="chart-ohlc">${esc(ohlc)}</text><text x="18" y="48" class="legend-fast">EMA${esc(ind.emaFastLength || 5)}</text><text x="100" y="48" class="legend-slow">EMA${esc(ind.emaSlowLength || 12)}</text><text x="194" y="48" class="legend-memory">KN Smart Entry / SL / TP1 / TP2 / TP3 + SMI</text>${zones}${candleEls}<path d="${emaFastPath}" class="kn-fast"/><path d="${emaSlowPath}" class="kn-slow"/>${livePriceLine}${smiMarkers}${level(plan.entry, 'entry', 'ENTRY')}${level(plan.sl, 'sl', 'SL')}${level(plan.tp1, 'tp1', 'TP1')}${level(plan.tp2, 'tp2', 'TP2')}${level(plan.tp3, 'tp3', 'TP3')}${drawingEls}<line x1="0" y1="${priceH}" x2="${W}" y2="${priceH}" class="divider"/><text x="18" y="${smiTop-12}" class="chart-title">Stochastic Momentum Index · black SMI + red signal EMA</text>${smiGrid}<path d="${smiPath}" class="smi-line"/><path d="${smiSigPath}" class="smi-signal"/></svg><div class="chart-foot"><span>${plan.visualOnly ? 'Showing latest KN Smart visual levels even before bot execution confirmation.' : esc(data.source || '')}</span><span>${data.lastFetchAt ? `Last candle fetch: ${esc(new Date(data.lastFetchAt).toLocaleString())}` : ''}</span>${tvLink}</div></div>`;
}

function drawChart() { /* SVG chart is rendered directly by chartSvg(). */ }

function chartPage() {
  const coins = selectedCoins(); if (!coins.includes(app.chart.coin)) app.chart.coin = coins[0] || 'BTCUSD';
  const r = selectedRow(); const direction = chartDirectionForTab(r); const plan = tradePlanFor(r, direction);
  return `${coinSelector()}<section class="chart-layout"><div class="panel chart-panel"><div class="panel-title"><h2>${coinLogo(app.chart.coin)} ${esc(app.chart.coin)} Chart</h2><div class="chart-actions"><select id="chartTf"><option ${app.chart.timeframe==='5m'?'selected':''}>5m</option><option ${app.chart.timeframe==='15m'?'selected':''}>15m</option><option ${app.chart.timeframe==='30m'?'selected':''}>30m</option><option ${app.chart.timeframe==='1h'?'selected':''}>1h</option></select><button id="loadChartBtn">Reload Chart</button></div></div><div class="tv-toolbar"><button data-chart-tool="pan" class="${app.chart.tool==='pan'?'active':''}">Pan</button><button data-chart-tool="line" class="${app.chart.tool==='line'?'active':''}">Line</button><button data-chart-tool="long" class="${app.chart.tool==='long'?'active':''}">Long</button><button data-chart-tool="short" class="${app.chart.tool==='short'?'active':''}">Short</button><button data-chart-tool="measure" class="${app.chart.tool==='measure'?'active':''}">Measure</button><button data-chart-action="zoomIn">+</button><button data-chart-action="zoomOut">−</button><button data-chart-action="resetView">Reset</button><button data-chart-action="clearDrawings">Clear tools</button></div><div class="tv-chart-shell"><div class="tv-leftbar"><button data-chart-tool="pan">↕</button><button data-chart-tool="line">╱</button><button data-chart-tool="long">L</button><button data-chart-tool="short">S</button><button data-chart-tool="measure">⌁</button><button data-chart-action="resetView">⌂</button></div><div class="tv-chart-main">${chartSvg(r, direction)}</div><div class="tv-rightbar"><button title="Watchlist">☰</button><button title="Alerts">⏰</button><button title="Objects">◇</button><button title="Comments">☷</button><button title="Settings">⚙</button></div></div><div class="indicator-settings-mini"><b>Indicator settings:</b> KN EMA ${esc(app.state.settings?.knFastEmaLength || 5)} / ${esc(app.state.settings?.knSlowEmaLength || 12)}, ATR ${esc(app.state.settings?.knAtrPeriod || 14)} × ${esc(app.state.settings?.knSlAtrMultiplier ?? 1.5)}, SMI ${esc(app.state.settings?.smiPercentKLength || 10)} ${esc(app.state.settings?.smiPercentDLength || 3)} ${esc(app.state.settings?.smiSmoothingPeriod || 5)} ${esc(app.state.settings?.smiOverbought ?? 40)} ${esc(app.state.settings?.smiOversold ?? -40)}. Change them on Strategy page.</div></div>
    <aside class="panel forecast-panel"><div class="panel-title"><h2>Forecast / Projection</h2><span class="muted">${esc(app.chart.coin)} · ${direction}</span></div><div class="seg-tabs">${['Forecast','Projection','Long','Short'].map(x=>`<button class="seg ${app.chart.tab===x?'active':''}" data-chart-tab="${x}">${x}</button>`).join('')}</div>
    <div class="forecast-body">${forecastTabContent(r, direction, plan)}</div></aside></section>`;
}

function strategySettingsPanel() {
  const s = app.state.settings || {};
  return `<section class="panel"><div class="panel-title"><h2>Strategy Engine Settings</h2><span class="pill pill-data">Clean Bot Strategy</span></div>
  <p class="info-note"><b>Kept only relevant:</b> EMA Cloud trend, SMI pullback, MACD momentum, KN Smart entry/SL/TP and risk filters.</p>
  <form id="strategySettingsForm" class="settings-grid compact-settings">
    <div class="field"><label>Entry model</label><input disabled value="Step 1 + SMI + MACD + KN Smart"></div>
    <div class="field"><label>Timeframes</label><input disabled value="1H trend · 15M validation · 5M entry"></div>
    <div class="field"><label>EMA cloud fast</label><input name="emaCloudFastLength" type="number" min="1" max="200" value="${esc(s.emaCloudFastLength || 50)}"></div>
    <div class="field"><label>EMA cloud slow</label><input name="emaCloudSlowLength" type="number" min="2" max="400" value="${esc(s.emaCloudSlowLength || 200)}"></div>
    <div class="field"><label>KN fast EMA</label><input name="knFastEmaLength" type="number" min="1" max="100" value="${esc(s.knFastEmaLength || 5)}"></div>
    <div class="field"><label>KN slow EMA</label><input name="knSlowEmaLength" type="number" min="2" max="200" value="${esc(s.knSlowEmaLength || 12)}"></div>
    <div class="field"><label>ATR period</label><input name="knAtrPeriod" type="number" min="1" max="100" value="${esc(s.knAtrPeriod || 14)}"></div>
    <div class="field"><label>SL ATR multiplier</label><input name="knSlAtrMultiplier" type="number" min="0.2" max="10" step="0.1" value="${esc(s.knSlAtrMultiplier ?? 1.5)}"></div>
    <div class="field"><label>SMI overbought</label><input name="smiOverbought" type="number" min="10" max="90" step="1" value="${esc(s.smiOverbought ?? 40)}"></div>
    <div class="field"><label>SMI oversold</label><input name="smiOversold" type="number" min="-90" max="-10" step="1" value="${esc(s.smiOversold ?? -40)}"></div>
    <div class="field"><label>Max entry candle ATR</label><input name="knMaxEntryCandleAtrMult" type="number" min="0.5" max="10" step="0.1" value="${esc(s.knMaxEntryCandleAtrMult ?? 2.2)}"></div>
    <div class="field"><label>Minimum RR</label><input name="minRR" type="number" min="1" max="10" step="0.1" value="${esc(s.minRR || 2)}"></div>
    <div class="field"><label>TP1 R</label><input name="tp1TriggerR" type="number" min="0.5" max="5" step="0.1" value="${esc(s.tp1TriggerR || 1)}"></div>
    <div class="field"><label>TP2 R</label><input name="tp2TriggerR" type="number" min="1" max="8" step="0.1" value="${esc(s.tp2TriggerR || 2)}"></div>
    <div class="field"><label>TP3 R</label><input name="tp3TriggerR" type="number" min="1" max="10" step="0.1" value="${esc(s.tp3TriggerR || 3)}"></div>
    <div class="field"><label>Require SMI pullback</label><select name="knRequireSmiDirection"><option value="true" ${s.knRequireSmiDirection !== false ? 'selected' : ''}>Yes</option><option value="false" ${s.knRequireSmiDirection === false ? 'selected' : ''}>No</option></select></div>
    <button class="btn-green" type="submit">Save Strategy Settings</button>
  </form></section>`;
}

function strategiesPage() {
  return `${coinSelector()}${assetManagerHtml()}${strategySettingsPanel()}<section class="strategy-grid clean-rules"><article class="rule-card long"><h2>LONG Rules</h2><ol><li>Step 1 confirms bullish structure and HTF trend.</li><li>EMA50 above EMA200 and price above cloud.</li><li>SMI shows pullback, then recovery cross.</li><li>MACD momentum supports long side.</li><li>KN Smart gives bullish entry candle, SL and TP levels.</li></ol></article><article class="rule-card short"><h2>SHORT Rules</h2><ol><li>Step 1 confirms bearish structure and HTF trend.</li><li>EMA50 below EMA200 and price below cloud.</li><li>SMI shows pullback, then recovery cross.</li><li>MACD momentum supports short side.</li><li>KN Smart gives bearish entry candle, SL and TP levels.</li></ol></article><aside class="rule-card params"><h2>Trade Management</h2><p><b>TP1:</b> close 33% and move SL to breakeven.</p><p><b>TP2:</b> close 33% and keep SL at breakeven.</p><p><b>TP3:</b> close remaining position.</p><p><b>Reject:</b> oversized candles, poor RR, incomplete candles, bad HTF alignment.</p></aside></section>`;
}


function tradeLogXlsButton() {
  return `<button type="button" id="downloadTradeLogBtn" class="btn-blue">Download Trade Log XLS</button>`;
}

function tradesPage() {
  const closed = app.state.closedTrades || [];
  const m = app.state.metrics || {};
  const grossWins = Number.isFinite(Number(m.grossWinUsd)) ? Number(m.grossWinUsd) : closed.filter(t=>Number(t.pnl||0)>0).reduce((a,t)=>a+Number(t.pnl||0),0);
  const grossLosses = Number.isFinite(Number(m.grossLossUsdAbs)) ? Number(m.grossLossUsdAbs) : Math.abs(closed.filter(t=>Number(t.pnl||0)<0).reduce((a,t)=>a+Number(t.pnl||0),0));
  const netClosed = Number.isFinite(Number(m.netClosedPnl ?? m.closedPnl)) ? Number(m.netClosedPnl ?? m.closedPnl) : grossWins - grossLosses;
  const openPnl = Number(m.openPnl || 0);
  const tradesStats = `<section class="kpi-grid trades-kpi"><div class="kpi-card"><span>Closed Wins Amount</span><strong class="green">${money(grossWins)}</strong><small>${esc(m.wins ?? 0)} wins</small></div><div class="kpi-card"><span>Closed Loss Amount</span><strong class="red">${money(grossLosses)}</strong><small>${esc(m.losses ?? 0)} losses</small></div><div class="kpi-card"><span>Net Closed P/L</span><strong class="${clsPnL(netClosed)}">${money(netClosed)}</strong><small>Closed trades only</small></div><div class="kpi-card"><span>Open / Unrealized P/L</span><strong class="${clsPnL(openPnl)}">${money(openPnl)}</strong><small>Total P/L ${money(m.totalPnl || 0)}</small></div></section>`;
  const openRows = (app.state.openTrades||[]).map(t=>{ const lots=t.lotsPurchased??t.liveOrderSize??t.qty; const conf=t.confluenceScore??t.confluence?.score; return `<tr><td>${coinLogo(t.coin)}${esc(t.coin)}</td><td class="${clsSide(t.side)}">${esc(t.side)}</td><td><span class="pill pill-data">${esc(t.tradeStyle || '-')}</span></td><td class="${statusClass(t.status)}"><b>${esc(t.status||'OPEN')}</b>${t.entryType ? `<small class="row-note">${esc(t.entryType)}</small>` : ''}</td><td>${esc(t.mode||'paper')}</td><td>${num(t.entry)}</td><td>${num(t.price)}</td><td>${money(t.marginUsedUsd)}</td><td>${num(lots)}</td><td>${num(t.sl)}</td><td>${num(t.tp1)}</td><td>${num(t.tp2)}</td><td>${Number.isFinite(Number(conf)) ? Number(conf).toFixed(0) : '-'}</td><td class="green">${money(t.estimatedFullTradeProfitUsd)}</td><td class="${clsPnL(t.pnl)}">${money(t.pnl)}</td><td><button class="action-close" data-close="${esc(t.id)}">Close</button></td></tr>`; }).join('') || '<tr><td colspan="16" class="empty">No open or pending trades.</td></tr>';
  const closedRows = closed.map(t=>`<tr><td>${coinLogo(t.coin)}${esc(t.coin)}</td><td class="${clsSide(t.side)}">${esc(t.side)}</td><td>${num(t.entry)}</td><td>${num(t.exit)}</td><td class="${clsPnL(t.pnl)}">${money(t.pnl)}</td><td>${esc(t.result)}</td><td>${esc(t.closeReason||'-')}</td><td>${t.closedAt?new Date(t.closedAt).toLocaleString():'-'}</td></tr>`).join('') || '<tr><td colspan="8" class="empty">No closed trades saved yet.</td></tr>';
  return `${tradesStats}<section class="panel"><div class="panel-title"><h2>Open / Pending Trades</h2></div><div class="table-wrap"><table><thead><tr><th>Coin</th><th>Side</th><th>Style</th><th>Status</th><th>Mode</th><th>Entry</th><th>Price</th><th>Funds</th><th>Lots</th><th>SL</th><th>TP1</th><th>TP2</th><th>Conf.</th><th>Est full-plan $</th><th>P/L</th><th>Action</th></tr></thead><tbody>${openRows}</tbody></table></div></section>
  <section class="panel"><details class="trade-details"><summary><span><b>Saved Closed Trades</b> <small>${closed.length} saved</small></span>${tradeLogXlsButton()}</summary><div class="table-wrap"><table><thead><tr><th>Coin</th><th>Side</th><th>Entry</th><th>Exit</th><th>P/L</th><th>Result</th><th>Reason</th><th>Closed</th></tr></thead><tbody>${closedRows}</tbody></table></div></details></section>`;
}



function logsPage() {
  const important = (app.state.logs || []).filter(l => /ERROR|SAFE|WARN|ORDER|TRADE|ENTRY|EXIT|CLOSE|LIVE|PAPER|BOT|SYNC/i.test(`${l.level || ''} ${l.message || ''}`)).slice(-50).reverse();
  return `<section class="panel"><details class="logs-details"><summary><span><b>Advanced Logs</b> <small>${important.length} important recent logs</small></span><button id="refreshLogsBtn" type="button">Refresh</button></summary><div class="logs-list compact-logs">${important.map(l=>`<div class="log-line"><span>${new Date(l.time).toLocaleString()}</span><b class="${l.level==='ERROR'?'red':l.level==='SAFE'?'yellow':'green'}">${esc(l.level)}</b><span>${esc(l.message)}</span></div>`).join('') || '<p class="empty">No important logs yet.</p>'}</div></details></section>`;
}


function assetManagerHtml() {
  const s = app.state.settings || {};
  const assets = Array.isArray(s.assets) ? s.assets : [];
  const catalog = app.assetCatalog || { symbols: [], loaded: false, loading: false, error: '' };
  const symbols = catalog.symbols || [];
  const options = symbols.map(sym => `<option value="${esc(sym)}">${esc(sym)}</option>`).join('');
  return `<section class="panel asset-panel"><div class="panel-title"><h2>Delta Coin Universe</h2><button type="button" id="loadDeltaSymbolsBtn" class="btn-blue">${catalog.loading ? 'Loading…' : 'Load Delta Coins'}</button></div>
    <div class="asset-manager">
      <p class="muted">Add or remove Delta Exchange India symbols scanned by this V77 practical multi-horizon SMI + KN Smart TP/SL bot. This affects Dashboard, Chart coin selector, scanner, Forecast/Projection, and paper/live trade candidates.</p>
      <div class="asset-chips">${assets.map(sym => `<span class="asset-chip">${coinLogo(sym)}<b>${esc(sym)}</b><button type="button" title="Remove ${esc(sym)}" data-remove-asset="${esc(sym)}">×</button></span>`).join('') || '<span class="empty-inline">No coins selected.</span>'}</div>
      <div class="asset-add-row">
        <input id="assetSymbolInput" list="deltaSymbolList" placeholder="Example: LINKUSD, MATICUSD, BTCUSD" autocomplete="off">
        <datalist id="deltaSymbolList">${options}</datalist>
        <button type="button" id="addAssetBtn" class="btn-green">Add Coin</button>
        <button type="button" id="resetAssetsBtn" class="btn-yellow">Reset Defaults</button>
      </div>
      <p class="muted">${catalog.loaded ? `${symbols.length} Delta symbols available from public products/tickers.` : 'Manual entry works even before loading the Delta symbol list.'}</p>
      ${catalog.error ? `<p class="warning-box">${esc(catalog.error)}</p>` : ''}
    </div></section>`;
}

function normalizeAssetInput(value) {
  return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

async function saveAssetUniverse(assets) {
  const clean = Array.from(new Set((assets || []).map(normalizeAssetInput).filter(Boolean))).slice(0, 50);
  if (!clean.length) throw new Error('At least one coin must remain selected.');
  app.state = await api('/api/settings', { method: 'POST', body: JSON.stringify({ assets: clean }) });
  const coins = selectedCoins();
  if (!coins.includes(app.chart.coin)) app.chart.coin = coins[0] || 'BTCUSD';
  app.chart.data = null;
  render();
  toast(`Coin universe saved: ${clean.length} selected.`);
  loadState({ scan: true, silent: true });
}

async function loadDeltaSymbols() {
  if (app.assetCatalog.loading) return;
  app.assetCatalog.loading = true;
  app.assetCatalog.error = '';
  render();
  try {
    const payload = await api('/api/delta-symbols', { timeoutMs: 25000 });
    app.assetCatalog.symbols = Array.isArray(payload.symbols) ? payload.symbols : [];
    app.assetCatalog.loaded = true;
    toast(`Loaded ${app.assetCatalog.symbols.length} Delta symbols.`);
  } catch (e) {
    app.assetCatalog.error = e.message || 'Could not load Delta symbols.';
    toast(app.assetCatalog.error);
  } finally {
    app.assetCatalog.loading = false;
    render();
  }
}

function walletSettingsPanel() {
  const s = app.state.settings || {};
  const m = app.state.metrics || {};
  const open = app.state.openTrades || [];
  const fundsUsed = app.state.risk?.totalBotMarginUsed || open.reduce((x,t)=>x+Number(t.marginUsedUsd||0),0);
  return `<section class="panel"><div class="panel-title"><h2>Wallet & Risk</h2><span class="pill ${s.paperTrade ? 'pill-paper' : 'pill-red'}">${s.paperTrade ? 'PAPER' : 'LIVE ARMED'}</span></div>
    <div class="kpi-grid settings-kpi">
      ${kpi('Delta Wallet', app.state.wallet?.walletSynced ? money(app.state.wallet?.equity) : 'SYNC NEEDED', app.state.wallet?.walletSynced ? '' : 'yellow')}
      ${kpi('Funds Used', money(fundsUsed), 'yellow')}
      ${kpi('Available Allocation', money(app.state.risk?.remainingBotAllocation || 0), 'green')}
      ${kpi('Open P/L', money(m.openPnl), clsPnL(m.openPnl))}
    </div>
    <form id="walletSettingsForm" class="settings-grid compact-settings">
      <div class="field"><label>Max positions</label><input name="maxConcurrentPositions" type="number" min="1" max="5" value="${esc(s.maxConcurrentPositions)}"></div>
      <div class="field"><label>Risk %</label><input name="riskPercent" type="number" min="0.1" max="5" step="0.1" value="${esc(s.riskPercent)}"></div>
      <div class="field"><label>Default leverage</label><input name="defaultLeverage" type="number" min="1" max="25" value="${esc(s.defaultLeverage)}"></div>
      <div class="field"><label>Max leverage</label><input name="maxLeverage" type="number" min="1" max="25" value="${esc(s.maxLeverage)}"></div>
      <div class="field"><label>Max SL loss $</label><input name="maxStopLossUsd" type="number" min="0.1" step="0.1" value="${esc(s.maxStopLossUsd)}"></div>
      <div class="field"><label>Max margin / coin $</label><input name="maxMarginPerCoinUsd" type="number" min="1" step="1" value="${esc(s.maxMarginPerCoinUsd)}"></div>
      <div class="field"><label>Paper allocation $</label><input name="maxBotAllocationUsd" type="number" min="1" step="1" value="${esc(s.maxBotAllocationUsd)}"></div>
      <div class="field"><label>Live allocation %</label><input name="liveWalletAllocationPct" type="number" min="1" max="100" step="1" value="${esc(s.liveWalletAllocationPct)}"></div>
      <button class="btn-green" type="submit">Save Wallet Settings</button>
    </form>
  </section>`;
}

function settingsPage() {
  const s = app.state.settings, a = app.state.apiStatus || {};
  return `${walletSettingsPanel()}<section class="settings-layout"><section class="panel"><div class="panel-title"><h2>Delta India API</h2><span class="pill ${s.paperTrade ? 'pill-paper' : 'pill-red'}">${s.paperTrade ? 'PAPER' : 'LIVE ARMED'}</span></div><form id="apiKeyForm" class="settings-grid compact-settings"><div class="field"><label>Base URL</label><input name="deltaBaseUrl" value="${esc(s.deltaBaseUrl)}"></div><div class="field"><label>API key</label><input name="apiKey" value="${esc(app.apiDraft.apiKey)}" placeholder="${a.keysConfigured ? esc(a.keyPreview) : 'Paste key'}"></div><div class="field"><label>API secret</label><input name="secret" type="password" value="${esc(app.apiDraft.secret)}" placeholder="Paste secret"></div><div class="field"><label>Whitelist IP</label><input name="whitelistedIpNote" value="${esc(app.apiDraft.whitelistedIpNote || a.whitelistedIpNote || a.serverOutboundIp || '')}"></div><div class="field wide"><label><input name="liveTradingConfirmed" type="checkbox" ${a.liveTradingConfirmed ? 'checked' : ''}> I understand LIVE mode sends real Delta orders</label></div><button type="button" id="detectAndTestBtn" class="btn-blue">Detect IP + Test</button><button type="submit" class="btn-green">Save + Auto Setup</button><button type="button" id="forceSyncPositionsBtn" class="btn-blue">Sync Positions</button><button type="button" id="clearKeysBtn" class="btn-red">Delete API Key</button></form><p class="warning-box">LIVE mode remains blocked until API test, wallet sync, position sync, and live confirmation pass.</p></section></section>`;
}


function render() {
  if (!app.state) return;
  renderHeader();
  $$('.tab').forEach(t => t.classList.toggle('active', t.dataset.page === app.page));
  $$('.page').forEach(p => p.classList.toggle('active', p.id === `page-${app.page}`));
  $('#page-dashboard').innerHTML = app.page === 'dashboard' ? dashboardPage() : '';
  $('#page-chart').innerHTML = app.page === 'chart' ? chartPage() : '';
  if (app.page === 'chart' && (!app.chart.data || app.chart.data.symbol !== app.chart.coin || app.chart.data.resolution !== app.chart.timeframe) && !app.chart.loading) setTimeout(() => loadChart(), 0);
  $('#page-strategies').innerHTML = app.page === 'strategies' ? strategiesPage() : '';
  $('#page-trades').innerHTML = app.page === 'trades' ? tradesPage() : '';
  $('#page-logs').innerHTML = app.page === 'logs' ? logsPage() : '';
  $('#page-settings').innerHTML = app.page === 'settings' ? settingsPage() : '';
}

function payloadFromForm(formEl) {
  const fd = new FormData(formEl), out = {};
  ['maxConcurrentPositions','riskPercent','defaultLeverage','maxLeverage','initialMarginUsd','majorInitialMarginUsd','majorCoinMaxMarginUsd','maxStopLossUsd','liveWalletAllocationPct','liveMaxBotAllocationUsd','slBufferAtrMult','tp1TriggerR','maxMarginPerCoinUsd','maxBotAllocationUsd','targetFullTradeProfitUsd','minFullTradeProfitUsd','smiPercentKLength','smiPercentDLength','smiSmoothingPeriod','smiSignalLength','smiOverbought','smiOversold','smiPullbackWindowCandles','smiRecoveryLookbackCandles','emaCloudFastLength','emaCloudSlowLength','cloudTouchToleranceAtrMult','cloudBreakToleranceAtrMult','rewardTargetR','minRR','slSwingLookback','knFastEmaLength','knSlowEmaLength','knAtrPeriod','knSlAtrMultiplier','knSignalLookbackCandles','knEntryConfirmLookbackCandles','knMaxEntryCandleAtrMult','knMaxEntryCandlePct','tp2TriggerR','tp3TriggerR'].forEach(k => { if (fd.has(k)) out[k] = Number(fd.get(k)); });
  ['autoSizeToTargetProfit','blockTinyProfitTrades','autoUseMaxLeverageForProfitTarget','knRequireSmiDirection'].forEach(k => { if (fd.has(k)) out[k] = String(fd.get(k)) === 'true'; });
  if (fd.has('ma1Type')) out.ma1Type = String(fd.get('ma1Type') || 'SMA');
  if (fd.has('ma1VisualColor')) out.ma1VisualColor = String(fd.get('ma1VisualColor') || '#111827');
  out.entryModel = 'SMI_KN_PULLBACK_TPSL';
  out.zeroLineMode = 'off';
  out.requireDivergenceForEntry = false;
  out.institutionalEmaEnabled = false;
  out.marketMemoryEnabled = false;
  out.dynamicTpEnabled = true;
  out.multiHorizonScanEnabled = true;
  out.horizonUpgradeEnabled = true;
  out.strategyTimeframes = ['5m','15m','1h'];
  out.requirePullbackForExecution = false;
  out.allowMarketWhenNoPullback = false;
  // Mode is controlled by the PAPER/LIVE switch, not by this strategy form.
  return out;
}


async function saveSettings(form) { app.state = await api('/api/settings', { method:'POST', body: JSON.stringify(payloadFromForm(form)) }); render(); toast('Settings saved.'); }
async function setBot(on) { try { app.state = await api('/api/toggle-live', { method:'POST', body: JSON.stringify({ enabled: Boolean(on) }) }); render(); toast(on ? 'Bot ON.' : 'Bot OFF.'); } catch(e) { await loadState({silent:true}); toast(e.message); } }
async function setMode(live) {
  try {
    if (live && !confirm('Switch to LIVE mode? This can place REAL Delta Exchange orders after BOT is turned ON. Continue?')) {
      render();
      return;
    }
    app.state = await api('/api/settings', { method:'POST', body: JSON.stringify({ paperTrade: !live }) });
    render();
    toast(live ? 'LIVE mode armed. BOT is OFF; start manually only after checking settings.' : 'PAPER mode selected. BOT OFF.');
  } catch(e) { await loadState({silent:true}); toast(e.message); }
}


async function emergencyStop() { app.state = await api('/api/emergency-stop', { method:'POST', body:'{}' }); render(); toast('Emergency stop: BOT OFF and PAPER mode enforced.'); }
async function saveApi() { const f=$('#apiKeyForm'), fd=new FormData(f); const payload={ apiKey:String(fd.get('apiKey')||'').trim(), secret:String(fd.get('secret')||'').trim(), deltaBaseUrl:String(fd.get('deltaBaseUrl')||'').trim(), whitelistedIpNote:String(fd.get('whitelistedIpNote')||'').trim(), liveTradingConfirmed:Boolean(fd.get('liveTradingConfirmed')) }; const result = await api('/api/auto-setup', { method:'POST', body: JSON.stringify(payload), timeoutMs: 25000 }); app.state = result.state || app.state; render(); toast(result.completed ? 'API saved and synced.' : 'API setup incomplete. Check readiness.'); }
async function detectAndTest() { app.state = await api('/api/outbound-ip', { method:'POST', body:'{}' }); render(); try { app.state = await api('/api/test-keys', { method:'POST', body:'{}' }); render(); toast('Connection test passed.'); } catch(e) { toast(e.message); } }
async function forceSyncPositions() { app.state = await api('/api/force-sync-positions', { method:'POST', body:'{}', timeoutMs: 30000 }); render(); toast('Delta positions/wallet/candles synced.'); }
async function clearStaleTrades() { if (!confirm('Clear local LIVE trade rows that are not present in the latest Delta position sync? Use only after manually closing on Delta.')) return; const data = await api('/api/clear-stale-local-trades', { method:'POST', body:'{}', timeoutMs: 30000 }); app.state = data.state || data; render(); toast(`Cleared ${data.cleared?.removedCount || 0} stale trade(s).`); }
async function closeTrade(id) { const data = await api('/api/close-trade', { method:'POST', body: JSON.stringify({ id }) }); app.state = data.state; render(); toast(`Closed ${data.closed.coin} ${data.closed.side || ''}.`); }

function downloadTradeLogXls() {
  const closed = app.state?.closedTrades || [];
  const headers = ['Coin','Side','Entry','Exit','PnL','Result','Reason','Closed At'];
  const rows = closed.map(t => [t.coin, t.side, t.entry, t.exit, t.pnl, t.result, t.closeReason || '', t.closedAt ? new Date(t.closedAt).toLocaleString() : '']);
  const html = `<table><thead><tr>${headers.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `trade-log-${new Date().toISOString().slice(0,10)}.xls`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  toast('Trade log downloaded.');
}

function bind() {
  $('.filterbar').addEventListener('click', e => { const f=e.target.closest('[data-filter]'), s=e.target.closest('[data-sort]'); if (f) { app.filter=f.dataset.filter; $$('[data-filter]').forEach(b=>b.classList.toggle('active', b===f)); render(); } if (s) { app.filter='ALL'; render(); } });
  $('.tabbar').addEventListener('click', e => { const b=e.target.closest('[data-page]'); if (b) { app.page=b.dataset.page; render(); } });
  $('#refreshBtn').addEventListener('click', () => loadState({ scan:true }));
  $('#botSwitch').addEventListener('change', e => setBot(e.target.checked));
  $('#modeSwitch').addEventListener('change', e => setMode(e.target.checked));
  document.body.addEventListener('input', e => { if (!e.target.name) return; if (e.target.name === 'apiKey') app.apiDraft.apiKey = e.target.value; if (e.target.name === 'secret') app.apiDraft.secret = e.target.value; if (e.target.name === 'deltaBaseUrl') app.apiDraft.deltaBaseUrl = e.target.value; if (e.target.name === 'whitelistedIpNote') app.apiDraft.whitelistedIpNote = e.target.value; });
  document.body.addEventListener('change', e => { if (e.target.id === 'chartTf') { app.chart.timeframe = e.target.value; app.chart.data = null; loadChart({force:true}); } });
  document.body.addEventListener('submit', e => { if (e.target.id === 'strategySettingsForm' || e.target.id === 'walletSettingsForm') { e.preventDefault(); saveSettings(e.target).catch(err=>toast(err.message)); } if (e.target.id === 'apiKeyForm') { e.preventDefault(); saveApi().catch(err=>toast(err.message)); } });
  document.body.addEventListener('click', e => {
    const coin = e.target.closest('[data-coin]'); if (coin) { app.chart.coin = coin.dataset.coin; app.chart.data = null; render(); if (app.page === 'chart') loadChart({force:true}); return; }
    const tab = e.target.closest('[data-chart-tab]'); if (tab) { app.chart.tab = tab.dataset.chartTab; render(); return; }
    const chartTool = e.target.closest('[data-chart-tool]'); if (chartTool) { app.chart.tool = chartTool.dataset.chartTool; render(); return; }
    const chartAction = e.target.closest('[data-chart-action]'); if (chartAction) { handleChartAction(chartAction.dataset.chartAction); return; }
    const removeAsset = e.target.closest('[data-remove-asset]'); if (removeAsset) { const sym = removeAsset.dataset.removeAsset; saveAssetUniverse(selectedCoins().filter(x => x !== sym)).catch(err => toast(err.message)); return; }
    if (e.target.id === 'loadDeltaSymbolsBtn') { loadDeltaSymbols(); return; }
    if (e.target.id === 'addAssetBtn') { const input = $('#assetSymbolInput'); const sym = normalizeAssetInput(input?.value); if (!sym) { toast('Enter a Delta symbol first.'); return; } saveAssetUniverse([...selectedCoins(), sym]).then(() => { if (input) input.value = ''; }).catch(err => toast(err.message)); return; }
    if (e.target.id === 'resetAssetsBtn') { saveAssetUniverse(['BTCUSD','ETHUSD','SOLUSD','XRPUSD','BNBUSD','DOGEUSD','ADAUSD']).catch(err => toast(err.message)); return; }
    if (e.target.id === 'scanNowBtn') loadState({ scan:true });
    if (e.target.id === 'loadChartBtn') loadChart({ force:true });
    if (e.target.id === 'startBotBtn') setBot(true);
    if (e.target.id === 'stopBotBtn') setBot(false);
    if (e.target.id === 'emergencyStopBtn') emergencyStop().catch(err=>toast(err.message));
    if (e.target.id === 'refreshLogsBtn') loadState();
    if (e.target.id === 'downloadTradeLogBtn') downloadTradeLogXls();
    if (e.target.id === 'detectAndTestBtn') detectAndTest().catch(err=>toast(err.message));
    if (e.target.id === 'forceSyncPositionsBtn') forceSyncPositions().catch(err=>toast(err.message));
    if (e.target.id === 'clearStaleTradesBtn') clearStaleTrades().catch(err=>toast(err.message));
    if (e.target.id === 'clearKeysBtn') api('/api/keys', { method:'POST', body: JSON.stringify({ clearKeys:true }) }).then(d=>{app.state=d; render(); toast('Keys deleted.');}).catch(err=>toast(err.message));
    const c = e.target.closest('[data-close]'); if (c && confirm('Close this trade now?')) closeTrade(c.dataset.close).catch(err=>toast(err.message));
  });
}
function startPolling() { clearInterval(app.polling); app.polling = setInterval(() => loadState({ silent:true }), 5000); }

let chartDrag = null;
function svgPoint(evt) {
  const svg = $('#mainChartSvg'); if (!svg) return null;
  const r = svg.getBoundingClientRect();
  return { x: (evt.clientX - r.left) * 1120 / Math.max(1, r.width), y: (evt.clientY - r.top) * 748 / Math.max(1, r.height) };
}
function handleChartAction(action) {
  const v = app.chart.view || (app.chart.view = { bars: 120, start: null, yPad: 0.12, yShift: 0 });
  const total = app.chart.data?.candles?.length || 180;
  if (action === 'zoomIn') v.bars = Math.max(40, Math.round((v.bars || 120) * 0.82));
  if (action === 'zoomOut') v.bars = Math.min(total, Math.round((v.bars || 120) * 1.22));
  if (action === 'resetView') { v.bars = Math.min(120, total); v.start = Math.max(0, total - v.bars); v.yPad = 0.12; v.yShift = 0; }
  if (action === 'clearDrawings') app.chart.drawings = [];
  render();
}
document.body.addEventListener('pointerdown', e => {
  const svg = e.target.closest && e.target.closest('#mainChartSvg'); if (!svg) return;
  const pt = svgPoint(e); if (!pt) return;
  chartDrag = { x: e.clientX, y: e.clientY, pt, tool: app.chart.tool || 'pan' };
  svg.setPointerCapture?.(e.pointerId);
});
document.body.addEventListener('pointermove', e => {
  if (!chartDrag || app.page !== 'chart') return;
  const v = app.chart.view || (app.chart.view = { bars: 120, start: null, yPad: 0.12, yShift: 0 });
  if (chartDrag.tool === 'pan') {
    const total = app.chart.data?.candles?.length || 0;
    const bars = Math.max(40, Math.min(Number(v.bars || 120), total || 120));
    const dx = e.clientX - chartDrag.x, dy = e.clientY - chartDrag.y;
    const pxPerBar = Math.max(4, ($('#mainChartSvg')?.getBoundingClientRect().width || 1000) / bars);
    v.start = Math.max(0, Math.min(Math.max(0, total - bars), Number(v.start || Math.max(0,total-bars)) - Math.round(dx / pxPerBar)));
    v.yShift = Math.max(-1.5, Math.min(1.5, Number(v.yShift || 0) - dy / 450));
    chartDrag.x = e.clientX; chartDrag.y = e.clientY;
    render();
  }
});
document.body.addEventListener('pointerup', e => {
  if (!chartDrag) return;
  const tool = chartDrag.tool;
  const pt2 = svgPoint(e);
  if (pt2 && tool !== 'pan') {
    const dx = Math.abs(pt2.x - chartDrag.pt.x), dy = Math.abs(pt2.y - chartDrag.pt.y);
    if (dx + dy > 8) app.chart.drawings.push({ symbol: app.chart.data?.symbol || app.chart.coin, tool, x1: chartDrag.pt.x.toFixed(1), y1: chartDrag.pt.y.toFixed(1), x2: pt2.x.toFixed(1), y2: pt2.y.toFixed(1), label: tool === 'measure' ? 'Measure' : tool.toUpperCase() });
    render();
  }
  chartDrag = null;
});
document.body.addEventListener('wheel', e => {
  if (!e.target.closest || !e.target.closest('#mainChartSvg')) return;
  e.preventDefault();
  const v = app.chart.view || (app.chart.view = { bars: 120, start: null, yPad: 0.12, yShift: 0 });
  const total = app.chart.data?.candles?.length || 180;
  v.bars = Math.max(40, Math.min(total, Math.round((v.bars || 120) * (e.deltaY < 0 ? 0.88 : 1.12))));
  render();
}, { passive: false });

window.addEventListener('resize', () => { if (app.page === 'chart') drawChart(); });
window.addEventListener('DOMContentLoaded', () => { bind(); loadState(); startPolling(); });
