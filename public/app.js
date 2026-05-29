'use strict';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

const app = {
  state: null,
  page: 'dashboard',
  filter: 'ALL',
  polling: null,
  chart: { coin: 'BTCUSD', timeframe: '5m', tab: 'Long', data: null, loading: false, error: '' },
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
function signalSourceLabel(r) { return r?.strategySignalSource === 'INSTITUTIONAL_EMA_MACD_MTF_LOCAL' ? 'INST-EMA+MACD' : 'WAIT'; }

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
  $('#sourceText').textContent = s.marketDataSource || 'Delta Exchange India';
  $('#modeBadge').textContent = 'PAPER LOCK';
  $('#modeBadge').className = 'pill pill-paper';
  $('#dataBadge').textContent = s.deltaStatus === 'LIVE_DELTA' ? 'LIVE DATA' : 'FALLBACK DATA';
  $('#dataBadge').className = `pill ${s.deltaStatus === 'LIVE_DELTA' ? 'pill-data' : 'pill-warn'}`;
  $('#botSwitch').checked = Boolean(s.botEnabled);
  $('#botSwitchText').textContent = s.botEnabled ? 'BOT ON' : 'BOT OFF';
  const modeSwitch = $('#modeSwitch');
  if (modeSwitch) {
    modeSwitch.checked = false;
    modeSwitch.disabled = true;
    modeSwitch.title = 'V64 is paper-only. Live execution is disabled.';
  }
}



function controlBar() {
  const s = app.state.settings;
  return `<section class="control-bar">
    <span class="pill pill-data">Strategy: V64 EMA + MACD + Market Memory + RSI/CCI/VWAP</span>
    <span class="pill ${s.botEnabled ? 'pill-data' : 'pill-warn'}">${s.botEnabled ? 'BOT ON' : 'BOT OFF'}</span>
    <span class="pill pill-paper">PAPER ONLY — LIVE LOCKED</span>
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
<<<<<<< HEAD
    <section class="panel"><div class="panel-title"><h2>Open / Pending Trades</h2><span class="muted">Open trades stay above scanner signals. V64 paper-only live-mimic.</span></div><div class="table-wrap"><table><thead><tr><th>Coin</th><th>Side</th><th>Style</th><th>Status</th><th>Mode</th><th>Entry</th><th>Price</th><th>Funds</th><th>Lots</th><th>SL</th><th>TP1</th><th>TP2</th><th>Conf.</th><th>Est full-plan $</th><th>P/L</th><th>RR</th><th>Action</th></tr></thead><tbody>${openTradesRows(open)}</tbody></table></div></section>
    <section class="panel"><div class="panel-title"><h2>Scanner Signals</h2><div class="legend"><b class="green">LONG</b><b class="red">SHORT</b><b class="yellow">WAIT</b></div></div>
      <div class="table-wrap"><table><thead><tr><th>Coin</th><th>Decision</th><th>Style</th><th>Signal</th><th>Entry</th><th>SL</th><th>TP1</th><th>TP2</th><th>Funds</th><th>Lots</th><th>Conf.</th><th>Est full-plan $</th><th>RR</th><th>MACD</th><th>Reason</th></tr></thead><tbody>${scannerRows(app.state.rows || [])}</tbody></table></div></section>`;
=======
    <section class="panel"><div class="panel-title"><h2>Open / Pending Trades</h2><span class="muted">Open trades and pending pullback limit orders appear here first.</span></div><div class="table-wrap"><table><thead><tr><th>Coin</th><th>Side</th><th>Status</th><th>Mode</th><th>Entry</th><th>Price</th><th>Funds</th><th>SL</th><th>TP1</th><th>TP2</th><th>Est full-plan $</th><th>P/L</th><th>RR</th><th>Action</th></tr></thead><tbody>${openTradesRows(open)}</tbody></table></div></section>
    <section class="panel"><div class="panel-title"><h2>Scanner Signals</h2><div class="legend"><b class="green">LONG</b><b class="red">SHORT</b><b class="yellow">WAIT</b></div></div>
      <div class="table-wrap"><table><thead><tr><th>Coin</th><th>Decision</th><th>Signal</th><th>Entry</th><th>SL</th><th>TP1</th><th>TP2</th><th>Est full-plan $</th><th>RR</th><th>MACD</th><th>Reason</th></tr></thead><tbody>${scannerRows(app.state.rows || [])}</tbody></table></div></section>`;
>>>>>>> a27d754590c85a16cd9e1218b83f7ecd177f9072
}


function scannerRows(rows) {
  let list = rows.slice();
  if (app.filter === 'LONG' || app.filter === 'SHORT' || app.filter === 'WAIT') list = list.filter(r => r.dec === app.filter);
  if (app.filter === 'STRONG') list = list.filter(r => r.q === 'STRONG');
<<<<<<< HEAD
  return list.map(r => {
    const candidate = r.candidate || {};
    const lots = candidate.lotsPurchased ?? candidate.liveOrderSize ?? candidate.qty;
    const conf = r.confluenceScore ?? candidate.confluenceScore ?? r.confluence?.score;
    return `<tr class="signal-row ${String(r.dec).toLowerCase()}"><td>${coinLogo(r.coin)}<b>${esc(r.coin)}</b></td><td class="${clsSide(r.dec)}">${esc(r.dec)}</td><td><span class="pill pill-data">${esc(r.tradeStyle || '-')}</span></td><td>${signalSourceLabel(r)}</td><td>${num(r.en)}</td><td>${num(r.sl)}</td><td>${num(r.t1)}</td><td>${num(r.t2)}</td><td>${money(candidate.marginUsd ?? r.marginUsd)}</td><td>${num(lots)}</td><td>${Number.isFinite(Number(conf)) ? Number(conf).toFixed(0) : '-'}</td><td class="green">${money(r.estimatedFullTradeProfitUsd)}</td><td>${esc(r.rr || '-')}</td><td>${esc(r.macdStatus || '-')}</td><td class="wide-cell">${esc(rowWhyText(r)).slice(0, 300)}</td></tr>`;
  }).join('') || '<tr><td colspan="15" class="empty">No scanner rows.</td></tr>';
=======
  return list.map(r => `<tr class="signal-row ${String(r.dec).toLowerCase()}"><td>${coinLogo(r.coin)}<b>${esc(r.coin)}</b></td><td class="${clsSide(r.dec)}">${esc(r.dec)}</td><td>${signalSourceLabel(r)}</td><td>${num(r.en)}</td><td>${num(r.sl)}</td><td>${num(r.t1)}</td><td>${num(r.t2)}</td><td class="green">${money(r.estimatedFullTradeProfitUsd)}</td><td>${esc(r.rr || '-')}</td><td>${esc(r.macdStatus || '-')}</td><td class="wide-cell">${esc(rowWhyText(r)).slice(0, 260)}</td></tr>`).join('') || '<tr><td colspan="11" class="empty">No scanner rows.</td></tr>';
>>>>>>> a27d754590c85a16cd9e1218b83f7ecd177f9072
}


function statusClass(status) { const s = String(status || '').toUpperCase(); return s === 'PENDING_LIMIT' ? 'yellow' : s === 'OPEN' ? 'green' : ''; }
function openTradesRows(open) {
<<<<<<< HEAD
  return open.map(t => {
    const lots = t.lotsPurchased ?? t.liveOrderSize ?? t.qty;
    const conf = t.confluenceScore ?? t.confluence?.score;
    return `<tr><td>${coinLogo(t.coin)}<b>${esc(t.coin)}</b></td><td class="${clsSide(t.side)}">${esc(t.side)}</td><td><span class="pill pill-data">${esc(t.tradeStyle || '-')}</span></td><td class="${statusClass(t.status)}"><b>${esc(t.status || 'OPEN')}</b>${t.entryType ? `<small class="row-note">${esc(t.entryType)}</small>` : ''}</td><td>${esc(t.mode || 'paper')}</td><td>${num(t.entry)}</td><td>${num(t.price)}</td><td>${money(t.marginUsedUsd)}</td><td>${num(lots)}</td><td>${num(t.sl)}</td><td>${num(t.tp1)}</td><td>${num(t.tp2)}</td><td>${Number.isFinite(Number(conf)) ? Number(conf).toFixed(0) : '-'}</td><td class="green">${money(t.estimatedFullTradeProfitUsd)}</td><td class="${clsPnL(t.pnl)}">${money(t.pnl)}</td><td>${num(t.rr)}</td><td><button class="action-close" data-close="${esc(t.id)}">Close</button></td></tr>`;
  }).join('') || '<tr><td colspan="17" class="empty">No open or pending trades.</td></tr>';
=======
  return open.map(t => `<tr><td>${coinLogo(t.coin)}<b>${esc(t.coin)}</b></td><td class="${clsSide(t.side)}">${esc(t.side)}</td><td class="${statusClass(t.status)}"><b>${esc(t.status || 'OPEN')}</b>${t.entryType ? `<small class="row-note">${esc(t.entryType)}</small>` : ''}</td><td>${esc(t.mode || 'paper')}</td><td>${num(t.entry)}</td><td>${num(t.price)}</td><td>${money(t.marginUsedUsd)}</td><td>${num(t.sl)}</td><td>${num(t.tp1)}</td><td>${num(t.tp2)}</td><td class="green">${money(t.estimatedFullTradeProfitUsd)}</td><td class="${clsPnL(t.pnl)}">${money(t.pnl)}</td><td>${num(t.rr)}</td><td><button class="action-close" data-close="${esc(t.id)}">Close</button></td></tr>`).join('') || '<tr><td colspan="14" class="empty">No open or pending trades.</td></tr>';
>>>>>>> a27d754590c85a16cd9e1218b83f7ecd177f9072
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
  const p = app.chart.data?.plan || {};
  if (p.active && (!side || p.side === side)) return { ...p, active: true, side: p.side || side, price: p.entry, entry: p.entry, sl: p.sl, tp1: p.tp1, tp2: p.tp2, rr: p.rr || '1:2' };
  return { active: false, side, price: app.chart.data?.currentPrice || app.chart.data?.candles?.at(-1)?.close || row?.price || 0, entry: null, sl: null, tp1: null, tp2: null, rr: '1:2' };
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
  const c = conditionFromSignal(sig, side);
  const trendOk = side === 'LONG' ? Boolean(c.longTrend) : Boolean(c.shortTrend);
  const inst = sig.institutionalEma || {};
  const instSide = side === 'LONG' ? inst.long || {} : inst.short || {};
  const conf = instSide.confluence || row?.confluence || data.confluence || {};
  const structure = conf.structure || {};
  const score = Number(conf.score ?? row?.confluenceScore ?? 0);
  const instTrendOk = Boolean(c.institutionalExecStack || c.institutionalHtfStack);
  const instPullbackOk = Boolean(c.institutionalPullback || structure.pass);
  const instPriceActionOk = Boolean(c.institutionalPriceAction);
  const instMacdOk = Boolean(c.institutionalHtfMacd || c.momentumOk);
  const zeroOk = Boolean(c.zeroOk);
  const divOk = side === 'LONG' ? Boolean(c.priceLowerLow && c.macdHigherLow) : Boolean(c.priceHigherHigh && c.macdLowerHigh);
  const histOk = Boolean(c.histColorChange);
  const crossOk = Boolean(c.crossover);
  const active = Boolean(plan.active);
  const executionReady = active && row && row.pass !== false && (!side || row.dec === side);
  const blockedBy = row?.blockedBy || '';
  const reason = sig.reason || rowWhyText(row);
  const pullbackText = plan?.entryType === 'PULLBACK_LIMIT' || plan?.pullbackPlan ? `Pullback limit: ${plan?.pullbackPlan?.source || 'ATR/EMA/VWAP/SR'}; current ${num(plan?.currentPrice || data.currentPrice)} → entry ${num(plan?.entry)}` : (plan?.entryType === 'IMMEDIATE_LIMIT' ? 'Immediate limit after signal — allowed only after confluence passes' : 'No chase: wait for structure + trigger candle');
  const conditionList = `<ul class="check-list">
    ${checkItem(score >= Number(app.state?.settings?.minConfluenceScore || 7), `Confluence score ${Number.isFinite(score) ? score.toFixed(0) : '-'}`, `Need flexible structure + 3 confirmations. Notes: ${(conf.reasons || []).join(' | ').slice(0, 160)}`)}
    ${checkItem(Boolean(structure.pass), 'Structure location gate', structure.reason || 'Need one valid location: support/resistance, range edge, sweep, VWAP or EMA50 pullback')}
    ${checkItem(instTrendOk, 'EMA trend context', `EMA9/21 timing + EMA50 trend + EMA200 protection. EMA13 ${num(sig.ema13)} / EMA50 ${num(sig.ema50)} / EMA200 ${num(sig.ema200)}`)}
    ${checkItem(instPullbackOk, 'EMA/VWAP/SR pullback context', instSide.pullback ? `touched=${instSide.pullback.touched} reclaimed=${instSide.pullback.reclaimed} extension=${instSide.pullback.extensionAtr} ATR` : 'Controlled location required; middle-of-range is rejected')}
    ${checkItem(instPriceActionOk, 'Execution candle trigger', instSide.priceAction?.reason || 'Engulfing / wick rejection / continuation close')}
    ${checkItem(instMacdOk, 'MACD momentum confirmation', `5m=${instSide.macd5Ok || false} 15m=${instSide.macd15Ok || false} 1h=${instSide.macd1hOk || false}`)}
    ${checkItem(Boolean(conf.rsiOk), 'RSI/CCI control or divergence', side === 'LONG' ? 'Bull: RSI reclaim 50 / CCI recovery / bullish divergence' : 'Bear: RSI lose 50 / CCI weakness / bearish divergence')}
    ${checkItem(Boolean(conf.vwapOk), 'VWAP institutional bias', 'Above/reclaim VWAP for long; below/reject VWAP for short')}
    ${checkItem(Boolean(conf.volumeOk), 'Volume participation', 'Reject breakout/retest if volume does not support move')}
    ${checkItem(histOk || crossOk, 'Closed-candle MACD timing', 'Histogram flip/contraction or confirmed cross; cross alone is never enough')}
  </ul>`;

  if (app.chart.tab === 'Forecast') {
    return `<div class="projection-card ${side === 'LONG' ? 'long' : 'short'}"><h3>${side} Forecast</h3>
      <p><b>Status:</b> ${active ? '<span class="green">ACTIVE SETUP</span>' : '<span class="yellow">WAIT — no confirmed entry</span>'}</p>
      <p><b>Execution:</b> ${executionReady ? '<span class="pill pill-data">READY FOR PAPER ENTRY</span>' : `<span class="pill pill-warn">${active ? 'SETUP ACTIVE, EXECUTION BLOCKED' : 'WAIT'}</span>`} <span class="pill pill-paper">paper-only locked</span></p>
      ${active && !executionReady ? `<p class="warning-box"><b>Why not opened:</b> ${esc(blockedBy || rowWhyText(row) || 'Risk/sizing guard blocked execution. Check scanner row WHY column.')}</p>` : ''}
      <p><b>Entry style:</b> ${esc(pullbackText)}</p>
      <p><b>Forecast:</b> ${active ? 'Entry, SL, TP1, dynamic TP2, structure, EMA, VWAP and MACD are plotted. Bot execution still requires SL/RR sizing guards.' : 'No TP/SL projection until structure + confluence + trigger + risk pass.'}</p>
      <p><b>Reason:</b> ${esc(reason).slice(0, 340)}</p>
      ${data.warning ? `<p class="warning-box">${esc(data.warning)}</p>` : ''}
    </div>${conditionList}`;
  }
  if (app.chart.tab === 'Projection') {
    return `<div class="projection-card ${side === 'LONG' ? 'long' : 'short'}"><h3>${side} Projection</h3>
<<<<<<< HEAD
      ${active ? `<div class="plan-grid"><span>Entry</span><b>${num(plan.entry)}</b><span>Entry style</span><b>${esc(plan.entryType || 'LIMIT')}</b><span>Stop-Loss</span><b class="red">${num(plan.sl)}</b><span>TP1</span><b class="green">${num(plan.tp1)}</b><span>TP2 / dynamic target</span><b class="green">${num(plan.tp2)}</b><span>Risk/Reward</span><b>${esc(plan.rr)}</b><span>Est. full-plan profit</span><b class="green">${money(plan.estimatedFullTradeProfitUsd)}</b><span>Minimum full-plan</span><b>${money(plan.minFullTradeProfitUsd ?? plan.minTargetProfitUsd)}</b></div>${!executionReady ? `<p class="warning-box"><b>Projection is visual until execution guard passes:</b> ${esc(blockedBy || 'Check scanner row WHY column.')}</p>` : ''}` : `<p class="yellow"><b>No active projection.</b></p><p>Projection is blocked until the selected confluence entry model passes on closed candles.</p>`}
      <p class="muted">SL is structure-first. If the structural SL is wide, lots reduce; SL is not tightened inside normal crypto noise.</p>
=======
      ${active ? `<div class="plan-grid"><span>Entry</span><b>${num(plan.entry)}</b><span>Entry style</span><b>${esc(plan.entryType || 'LIMIT')}</b><span>Stop-Loss</span><b class="red">${num(plan.sl)}</b><span>TP1</span><b class="green">${num(plan.tp1)}</b><span>TP2</span><b class="green">${num(plan.tp2)}</b><span>Risk/Reward</span><b>${esc(plan.rr)}</b><span>Est. full-plan profit</span><b class="green">${money(plan.estimatedFullTradeProfitUsd)}</b><span>Minimum full-plan</span><b>${money(plan.minFullTradeProfitUsd ?? plan.minTargetProfitUsd)}</b></div>${!executionReady ? `<p class="warning-box"><b>Projection is visual only until execution guard passes:</b> ${esc(blockedBy || 'Check scanner row WHY column.')}</p>` : ''}` : `<p class="yellow"><b>No active projection.</b></p><p>Projection is blocked until the selected MACD + MTF EMA entry model passes on a closed 5m candle.</p>`}
      <p class="muted">The chart uses real Delta OHLC candles, not synthetic demo candles.</p>
>>>>>>> a27d754590c85a16cd9e1218b83f7ecd177f9072
    </div>${conditionList}`;
  }
  return `<div class="projection-card ${side === 'LONG' ? 'long' : 'short'}"><h3>${side} Setup</h3>
    <p><b>Bias:</b> <span class="${clsSide(side)}">${side}</span></p>
    <p><b>Entry:</b> ${active ? num(plan.entry) : 'WAIT'}</p>
    <p><b>Entry style:</b> ${active ? esc(pullbackText) : 'WAIT'}</p>
<<<<<<< HEAD
    <p><b>Stop-Loss:</b> <span class="red">${active ? num(plan.sl) : 'WAIT'}</span> <span class="muted">beyond structure + ATR buffer</span></p>
    <p><b>Take-Profit 1:</b> <span class="green">${active ? num(plan.tp1) : 'WAIT'}</span> <span class="muted">partial profit</span></p>
    <p><b>Take-Profit 2:</b> <span class="green">${active ? num(plan.tp2) : 'WAIT'}</span> <span class="muted">extends only when trend remains strong</span></p>
    <p><b>Risk/Reward:</b> ${esc(plan.rr)}</p><p><b>Estimated full-plan profit:</b> <span class="green">${active ? money(plan.estimatedFullTradeProfitUsd) : 'WAIT'}</span></p>
    ${!active ? `<p class="warning-box">No trade: need one valid structure location, directional bias, 3 confirmations, trigger candle, and valid SL/RR.</p>` : ''}
=======
    <p><b>Stop-Loss:</b> <span class="red">${active ? num(plan.sl) : 'WAIT'}</span></p>
    <p><b>Take-Profit 1:</b> <span class="green">${active ? num(plan.tp1) : 'WAIT'}</span> <span class="muted">1R partial</span></p>
    <p><b>Take-Profit 2:</b> <span class="green">${active ? num(plan.tp2) : 'WAIT'}</span> <span class="muted">2R final</span></p>
    <p><b>Risk/Reward:</b> ${esc(plan.rr)}</p><p><b>Estimated full-plan profit:</b> <span class="green">${active ? money(plan.estimatedFullTradeProfitUsd) : 'WAIT'}</span></p><p><b>Minimum full-trade profit:</b> ${active ? money(plan.minFullTradeProfitUsd ?? plan.minTargetProfitUsd) : 'WAIT'}</p>
    ${!active ? `<p class="warning-box">No trade yet: the selected entry model must pass with MTF EMA bias, MACD histogram change, closed-candle crossover, technical SL, and risk checks.</p>` : ''}
>>>>>>> a27d754590c85a16cd9e1218b83f7ecd177f9072
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

function formatTime(sec) {
  if (!sec) return '--';
  return new Date(sec * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function chartSvg(row, side) {
  const data = app.chart.data;
  if (app.chart.loading && !data) return `<div class="chart-loading">Loading live Delta candles…</div>`;
  if (app.chart.error) return `<div class="chart-loading red">${esc(app.chart.error)}</div>`;
  if (!data || !Array.isArray(data.candles) || !data.candles.length) return `<div class="chart-loading">No chart candles loaded yet. Click Reload Chart.</div>`;
  const candles = data.candles;
  const ind = data.indicators || {};
  const sr = data.supportResistance || row?.supportResistance || {};
  const plan = tradePlanFor(row, side);
  const W = 1120, priceH = 452, macdTop = 480, macdH = 220, H = 748;
  const leftPad = 26, rightPad = 82;
  const x = i => leftPad + i * ((W - leftPad - rightPad) / Math.max(1, candles.length - 1));
  const candleW = Math.max(3, Math.min(9, (W - leftPad - rightPad) / candles.length * 0.62));

  const emaVals = [...(ind.ema9Exec || []), ...(ind.ema21Exec || []), ...(ind.ema13Exec || []), ...(ind.ema50Exec || []), ...(ind.ema200Exec || []), ...(ind.ema15 || []), ...(ind.ema1h || []), ...(ind.vwap || [])].filter(Number.isFinite);
  const planVals = plan.active ? [plan.entry, plan.sl, plan.tp1, plan.tp2] : [];
  const srVals = [sr.support, sr.resistance].filter(v => Number.isFinite(Number(v))).map(Number);
  const lows = candles.map(c => c.low), highs = candles.map(c => c.high);
  let minP = Math.min(...lows, ...emaVals, ...planVals, ...srVals), maxP = Math.max(...highs, ...emaVals, ...planVals, ...srVals);
  if (!Number.isFinite(minP) || !Number.isFinite(maxP) || minP === maxP) { minP = candles.at(-1).close * 0.99; maxP = candles.at(-1).close * 1.01; }
  const pad = (maxP - minP) * 0.12;
  minP -= pad; maxP += pad;
  const y = v => 38 + (maxP - v) / (maxP - minP) * (priceH - 72);

  const grid = [];
  for (let i = 0; i <= 7; i += 1) {
    const val = minP + (maxP - minP) * (i / 7);
    const yy = y(val);
    grid.push(`<line x1="0" y1="${yy.toFixed(1)}" x2="${W}" y2="${yy.toFixed(1)}" class="grid"/><text x="${W-76}" y="${(yy-4).toFixed(1)}" class="axis-label">${num(val)}</text>`);
  }
  for (let i = 0; i < 8; i += 1) {
    const idx = Math.round(i * (candles.length - 1) / 7);
    const xx = x(idx);
    grid.push(`<line x1="${xx.toFixed(1)}" y1="30" x2="${xx.toFixed(1)}" y2="${H-32}" class="grid faint"/><text x="${(xx-14).toFixed(1)}" y="${H-12}" class="axis-label">${formatTime(candles[idx]?.time)}</text>`);
  }

  const candleEls = candles.map((c, i) => {
    const up = c.close >= c.open;
    const cx = x(i);
    const top = Math.min(y(c.open), y(c.close));
    const h = Math.max(2, Math.abs(y(c.open) - y(c.close)));
    const liveCls = c.live ? ' live-candle' : '';
    return `<line x1="${cx.toFixed(1)}" y1="${y(c.high).toFixed(1)}" x2="${cx.toFixed(1)}" y2="${y(c.low).toFixed(1)}" class="wick ${up ? 'up' : 'down'}${liveCls}"/><rect x="${(cx-candleW/2).toFixed(1)}" y="${top.toFixed(1)}" width="${candleW.toFixed(1)}" height="${h.toFixed(1)}" rx="1" class="candle ${up ? 'up' : 'down'}${liveCls}"/>`;
  }).join('');

  const ema9Path = svgPathFromSeries(ind.ema9Exec || [], x, y);
  const ema21Path = svgPathFromSeries(ind.ema21Exec || [], x, y);
  const ema13Path = svgPathFromSeries(ind.ema13Exec || [], x, y);
  const ema50Path = svgPathFromSeries(ind.ema50Exec || [], x, y);
  const ema200Path = svgPathFromSeries(ind.ema200Exec || [], x, y);
  const ema15Path = svgPathFromSeries(ind.ema15 || [], x, y);
  const ema1hPath = svgPathFromSeries(ind.ema1h || [], x, y);
  const vwapPath = svgPathFromSeries(ind.vwap || [], x, y);
  const level = (v, klass, label) => !Number.isFinite(Number(v)) ? '' : `<line x1="0" y1="${y(v).toFixed(1)}" x2="${W-rightPad}" y2="${y(v).toFixed(1)}" class="level ${klass}"/><text x="${W-220}" y="${(y(v)-7).toFixed(1)}" class="label ${klass}">${label} ${num(v)}</text>`;
  const zones = plan.active ? (() => {
    const gy = Math.min(y(plan.entry), y(plan.tp2)), gh = Math.abs(y(plan.entry)-y(plan.tp2));
    const ry = Math.min(y(plan.entry), y(plan.sl)), rh = Math.abs(y(plan.entry)-y(plan.sl));
    return `<rect x="${W*0.62}" y="${gy.toFixed(1)}" width="${W*0.26}" height="${gh.toFixed(1)}" class="target-zone"/><rect x="${W*0.62}" y="${ry.toFixed(1)}" width="${W*0.26}" height="${rh.toFixed(1)}" class="stop-zone"/>`;
  })() : '';
  const proj = plan.active ? (plan.side === 'LONG'
    ? `<path d="M ${W*0.64} ${y(plan.entry)} Q ${W*0.74} ${y((plan.entry+plan.tp2)/2)} ${W*0.86} ${y(plan.tp2)}" class="projection long" marker-end="url(#arrowGreen)"/>`
    : `<path d="M ${W*0.64} ${y(plan.entry)} Q ${W*0.74} ${y((plan.entry+plan.tp2)/2)} ${W*0.86} ${y(plan.tp2)}" class="projection short" marker-end="url(#arrowRed)"/>`) : '';

  const macdLine = ind.macdLine || [], macdSig = ind.macdSignal || [], hist = ind.macdHist || [];
  const macdVals = [...macdLine, ...macdSig, ...hist].filter(Number.isFinite);
  const maxAbs = Math.max(1e-9, ...macdVals.map(v => Math.abs(v))) * 1.2;
  const zeroY = macdTop + macdH / 2;
  const ym = v => zeroY - (v / maxAbs) * (macdH * 0.42);
  const macdPath = svgPathFromSeries(macdLine, x, ym);
  const signalPath = svgPathFromSeries(macdSig, x, ym);
  const histEls = hist.map((h, i) => {
    if (!Number.isFinite(h)) return '';
    const yy = h >= 0 ? ym(h) : zeroY;
    return `<rect x="${(x(i)-3).toFixed(1)}" y="${yy.toFixed(1)}" width="6" height="${Math.max(1, Math.abs(ym(h)-zeroY)).toFixed(1)}" class="hist ${h >= 0 ? 'pos' : 'neg'}"/>`;
  }).join('');
  const macdGrid = [-maxAbs, 0, maxAbs].map(v => `<line x1="0" y1="${ym(v).toFixed(1)}" x2="${W}" y2="${ym(v).toFixed(1)}" class="grid"/><text x="${W-76}" y="${(ym(v)-4).toFixed(1)}" class="axis-label">${num(v)}</text>`).join('');

  const sig = data.signal || {};
  const offset = Number(data.chartOffset || 0);
  let divPrice = '', divMacd = '';
  if (data.resolution === '5m' && sig.divergence?.first && sig.divergence?.second) {
    const i1 = sig.divergence.first.index - offset;
    const i2 = sig.divergence.second.index - offset;
    if (i1 >= 0 && i2 >= 0 && i1 < candles.length && i2 < candles.length) {
      const isLong = sig.entrySide === 'LONG' || (sig.conditions?.longTrend && !sig.conditions?.shortTrend);
      divPrice = isLong
        ? `<line x1="${x(i1)}" y1="${y(candles[i1].low)}" x2="${x(i2)}" y2="${y(candles[i2].low)}" class="div-price"/><text x="${x(i1)}" y="${y(candles[i2].low)+20}" class="tag">Price Lower Low</text>`
        : `<line x1="${x(i1)}" y1="${y(candles[i1].high)}" x2="${x(i2)}" y2="${y(candles[i2].high)}" class="div-price"/><text x="${x(i1)}" y="${y(candles[i2].high)-12}" class="tag">Price Higher High</text>`;
      if (Number.isFinite(macdLine[i1]) && Number.isFinite(macdLine[i2])) {
        divMacd = isLong
          ? `<line x1="${x(i1)}" y1="${ym(macdLine[i1])}" x2="${x(i2)}" y2="${ym(macdLine[i2])}" class="div-macd"/><text x="${x(i2)+10}" y="${ym(macdLine[i2])+20}" class="macd-note">MACD Higher Low</text>`
          : `<line x1="${x(i1)}" y1="${ym(macdLine[i1])}" x2="${x(i2)}" y2="${ym(macdLine[i2])}" class="div-macd"/><text x="${x(i2)+10}" y="${ym(macdLine[i2])-12}" class="macd-note">MACD Lower High</text>`;
      }
    }
  }

  const last = candles.at(-1);
  const currentPrice = Number(data.currentPrice || last?.close || 0);
  const livePriceLine = Number.isFinite(currentPrice) && currentPrice > 0 ? `<line x1="0" y1="${y(currentPrice).toFixed(1)}" x2="${W-rightPad}" y2="${y(currentPrice).toFixed(1)}" class="live-price-line"/><rect x="${W-rightPad+4}" y="${(y(currentPrice)-11).toFixed(1)}" width="74" height="22" rx="4" class="live-price-box"/><text x="${W-rightPad+10}" y="${(y(currentPrice)+4).toFixed(1)}" class="live-price-text">${num(currentPrice)}</text>` : '';
  const liveFlag = data.usesLivePreview ? ' LIVE PREVIEW' : ' CLOSED';
  const ohlc = last ? `O${num(last.open)} H${num(last.high)} L${num(last.low)} C${num(last.close)}${liveFlag}` : '';
  const tvLink = data.tradingViewUrl ? `<a class="tv-link" href="${esc(data.tradingViewUrl)}" target="_blank" rel="noreferrer">Open TradingView Reference</a>` : '';
  return `<div id="chartCanvas" class="chart-svg-wrap"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(data.symbol)} live Delta chart">
    <defs><marker id="arrowGreen" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#00a63e"/></marker><marker id="arrowRed" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#e00000"/></marker></defs>
    <rect x="0" y="0" width="${W}" height="${H}" fill="#fff"/>${grid.join('')}
    <text x="18" y="24" class="chart-title">${esc(data.symbol.replace('USD','/USD'))} · ${esc(data.resolution)} closed-candle chart · ${esc(data.exchange || 'Delta')}</text>
    <text x="430" y="24" class="chart-ohlc">${esc(ohlc)}</text>
    <text x="18" y="48" class="legend-cyan">EMA9</text><text x="88" y="48" class="legend-gold">EMA21</text><text x="166" y="48" class="legend-mid">EMA50</text><text x="250" y="48" class="legend-slow">EMA200</text><text x="350" y="48" class="legend-pink">VWAP</text><text x="432" y="48" class="legend-blue">15m</text><text x="488" y="48" class="legend-orange">1h</text>
    ${zones}${candleEls}<path d="${ema9Path}" class="ema ema9"/><path d="${ema21Path}" class="ema ema21"/><path d="${ema13Path}" class="ema ema13 muted-ema"/><path d="${ema50Path}" class="ema ema50"/><path d="${ema200Path}" class="ema ema200"/><path d="${ema15Path}" class="ema ema15"/><path d="${ema1hPath}" class="ema ema1h"/><path d="${vwapPath}" class="vwap-line"/>${level(sr.support, 'support', 'Support')}${level(sr.resistance, 'resistance', 'Resistance')}${livePriceLine}${divPrice}${level(plan.entry, 'entry', 'Entry')}${level(plan.sl, 'sl', 'Stop-Loss')}${level(plan.tp1, 'tp1', 'TP1')}${level(plan.tp2, 'tp2', 'Take-Profit')}${proj}
    <line x1="0" y1="${priceH}" x2="${W}" y2="${priceH}" class="divider"/>
    <text x="18" y="${macdTop-10}" class="chart-title">MACD 12/26/9 · histogram expansion/contraction · CCI/RSI/VWAP checked in score${data.usesLivePreview ? ' · live preview' : ''}</text>${macdGrid}${histEls}<path d="${macdPath}" class="macd-line"/><path d="${signalPath}" class="signal-line"/>${divMacd}
  </svg><div class="chart-foot"><span>${esc(data.source || '')}</span><span>${data.lastFetchAt ? `Last candle fetch: ${esc(new Date(data.lastFetchAt).toLocaleString())}` : ''}</span>${tvLink}</div></div>`;
}


function drawChart() { /* SVG chart is rendered directly by chartSvg(). */ }

function chartPage() {
  const coins = selectedCoins(); if (!coins.includes(app.chart.coin)) app.chart.coin = coins[0] || 'BTCUSD';
  const r = selectedRow(); const direction = chartDirectionForTab(r); const plan = tradePlanFor(r, direction);
  return `${coinSelector()}<section class="chart-layout"><div class="panel chart-panel"><div class="panel-title"><h2>${coinLogo(app.chart.coin)} ${esc(app.chart.coin)} Chart</h2><div class="chart-actions"><select id="chartTf"><option ${app.chart.timeframe==='5m'?'selected':''}>5m</option><option ${app.chart.timeframe==='15m'?'selected':''}>15m</option><option ${app.chart.timeframe==='30m'?'selected':''}>30m</option><option ${app.chart.timeframe==='1h'?'selected':''}>1h</option></select><button id="loadChartBtn">Reload Chart</button></div></div>${chartSvg(r, direction)}</div>
    <aside class="panel forecast-panel"><div class="panel-title"><h2>Forecast / Projection</h2><span class="muted">${esc(app.chart.coin)} · ${direction}</span></div><div class="seg-tabs">${['Forecast','Projection','Long','Short'].map(x=>`<button class="seg ${app.chart.tab===x?'active':''}" data-chart-tab="${x}">${x}</button>`).join('')}</div>
    <div class="forecast-body">${forecastTabContent(r, direction, plan)}</div></aside></section>`;
}

function strategiesPage() {
  return `${coinSelector()}<section class="strategy-grid"><article class="rule-card long"><h2>BULL SETUP</h2><ol><li>One valid location required: support, previous low sweep, range low, demand zone, VWAP reclaim, or EMA50 pullback.</li><li>EMA9/21 handles execution timing; EMA50 controls trend; EMA200 protects dominant bias.</li><li>Bull reversal: sweep/reject low + bullish trigger candle + RSI/CCI recovery or divergence + MACD red bars contract or flip green.</li><li>Bull continuation: price above EMA50, EMA9 &gt; EMA21, pullback respects EMA/VWAP/SR, MACD expands green, RSI stays above 50 or CCI above 0.</li><li>Entry only above trigger candle/minor high. No buy just because CCI/RSI is low.</li><li>SL goes below structure/sweep/engulfing low with ATR buffer. Wider SL reduces lots; it does not get tightened randomly.</li><li>TP1 books partial at nearest resistance or 1R–1.5R. TP2 targets next liquidity/resistance or 2R–3R.</li><li>If trend-strength score remains high, TP2 extends and SL trails below EMA21/new higher low.</li></ol></article><article class="rule-card short"><h2>BEAR SETUP</h2><ol><li>One valid location required: resistance, previous high sweep, range high, supply zone, VWAP rejection, or EMA50 pullback rejection.</li><li>EMA9/21 handles execution timing; EMA50 controls trend; EMA200 protects dominant bias.</li><li>Bear reversal: sweep/reject high + bearish trigger candle + RSI/CCI weakness or divergence + MACD green bars contract or flip red.</li><li>Bear continuation: price below EMA50, EMA9 &lt; EMA21, pullback rejects EMA/VWAP/SR, MACD expands red, RSI stays below 50 or CCI below 0.</li><li>Entry only below trigger candle/minor low. No short just because price is overbought.</li><li>SL goes above structure/sweep/engulfing high with ATR buffer. Wider SL reduces lots; it does not get tightened into wick noise.</li><li>TP1 books partial at nearest support or 1R–1.5R. TP2 targets next liquidity/support or 2R–3R.</li><li>If trend-strength score remains high, TP2 extends and SL trails above EMA21/new lower high.</li></ol></article><aside class="rule-card params"><h2>V64 Execution DNA</h2><p><b>Required:</b> Market Memory similar-history pullback + directional bias + trigger candle + valid SL/RR.</p><p><b>Confirmations:</b> EMA trend, Market Memory cloud retest, MACD 12/26/9, RSI14, CCI20, VWAP, volume spike, ATR extension.</p><p><b>Coins:</b> Tier 1 and Tier 2 preferred. Tier 3 needs A+ score only.</p><p><b>Profit target:</b> normal plan aims for $2–$5; A+ setups may extend TP if wallet risk stays controlled.</p><p><b>Paper lock:</b> live execution is disabled in this build. API keys can be used only for data/wallet reference.</p><p><b>Rejected:</b> middle-of-range entries, chased candles, tight SL inside retest zone, poor R:R, low participation breakouts.</p></aside></section>`;
}



function tradesPage() {
  const closed = app.state.closedTrades || [];
<<<<<<< HEAD
  const m = app.state.metrics || {};
  const grossWins = Number.isFinite(Number(m.grossWinUsd)) ? Number(m.grossWinUsd) : closed.filter(t=>Number(t.pnl||0)>0).reduce((a,t)=>a+Number(t.pnl||0),0);
  const grossLosses = Number.isFinite(Number(m.grossLossUsdAbs)) ? Number(m.grossLossUsdAbs) : Math.abs(closed.filter(t=>Number(t.pnl||0)<0).reduce((a,t)=>a+Number(t.pnl||0),0));
  const netClosed = Number.isFinite(Number(m.netClosedPnl ?? m.closedPnl)) ? Number(m.netClosedPnl ?? m.closedPnl) : grossWins - grossLosses;
  const openPnl = Number(m.openPnl || 0);
  const tradesStats = `<section class="kpi-grid trades-kpi"><div class="kpi-card"><span>Closed Wins Amount</span><strong class="green">${money(grossWins)}</strong><small>${esc(m.wins ?? 0)} wins</small></div><div class="kpi-card"><span>Closed Losses Amount</span><strong class="red">-${money(grossLosses)}</strong><small>${esc(m.losses ?? 0)} losses</small></div><div class="kpi-card"><span>Net Closed P/L</span><strong class="${clsPnL(netClosed)}">${money(netClosed)}</strong><small>Win rate ${Number(m.winRate || 0).toFixed(1)}%</small></div><div class="kpi-card"><span>Open / Unrealized P/L</span><strong class="${clsPnL(openPnl)}">${money(openPnl)}</strong><small>Total P/L ${money(m.totalPnl || 0)}</small></div></section>`;
  return `${tradesStats}<section class="panel"><div class="panel-title"><h2>Open / Pending Trades</h2></div><div class="table-wrap"><table><thead><tr><th>Coin</th><th>Side</th><th>Style</th><th>Status</th><th>Mode</th><th>Entry</th><th>Price</th><th>Funds</th><th>Lots</th><th>SL</th><th>TP1</th><th>TP2</th><th>Conf.</th><th>Est full-plan $</th><th>P/L</th><th>Why</th><th>Action</th></tr></thead><tbody>${(app.state.openTrades||[]).map(t=>{ const lots=t.lotsPurchased??t.liveOrderSize??t.qty; const conf=t.confluenceScore??t.confluence?.score; return `<tr><td>${coinLogo(t.coin)}${esc(t.coin)}</td><td class="${clsSide(t.side)}">${esc(t.side)}</td><td><span class="pill pill-data">${esc(t.tradeStyle || '-')}</span></td><td class="${statusClass(t.status)}"><b>${esc(t.status||'OPEN')}</b>${t.entryType ? `<small class="row-note">${esc(t.entryType)}</small>` : ''}</td><td>${esc(t.mode||'paper')}</td><td>${num(t.entry)}</td><td>${num(t.price)}</td><td>${money(t.marginUsedUsd)}</td><td>${num(lots)}</td><td>${num(t.sl)}</td><td>${num(t.tp1)}</td><td>${num(t.tp2)}</td><td>${Number.isFinite(Number(conf)) ? Number(conf).toFixed(0) : '-'}</td><td class="green">${money(t.estimatedFullTradeProfitUsd)}</td><td class="${clsPnL(t.pnl)}">${money(t.pnl)}</td><td class="wide-cell">${esc(t.entryReason||'-').slice(0,300)}</td><td><button class="action-close" data-close="${esc(t.id)}">Close</button></td></tr>`; }).join('') || '<tr><td colspan="17" class="empty">No open or pending trades.</td></tr>'}</tbody></table></div></section>
=======
  return `<section class="panel"><div class="panel-title"><h2>Open / Pending Trades</h2></div><div class="table-wrap"><table><thead><tr><th>Coin</th><th>Side</th><th>Status</th><th>Mode</th><th>Entry</th><th>Price</th><th>Funds</th><th>SL</th><th>TP1</th><th>TP2</th><th>Est full-plan $</th><th>P/L</th><th>Why</th><th>Action</th></tr></thead><tbody>${(app.state.openTrades||[]).map(t=>`<tr><td>${coinLogo(t.coin)}${esc(t.coin)}</td><td class="${clsSide(t.side)}">${esc(t.side)}</td><td class="${statusClass(t.status)}"><b>${esc(t.status||'OPEN')}</b></td><td>${esc(t.mode||'paper')}</td><td>${num(t.entry)}</td><td>${num(t.price)}</td><td>${money(t.marginUsedUsd)}</td><td>${num(t.sl)}</td><td>${num(t.tp1)}</td><td>${num(t.tp2)}</td><td class="green">${money(t.estimatedFullTradeProfitUsd)}</td><td class="${clsPnL(t.pnl)}">${money(t.pnl)}</td><td class="wide-cell">${esc(t.entryReason||'-').slice(0,300)}</td><td><button class="action-close" data-close="${esc(t.id)}">Close</button></td></tr>`).join('') || '<tr><td colspan="14" class="empty">No open or pending trades.</td></tr>'}</tbody></table></div></section>
>>>>>>> a27d754590c85a16cd9e1218b83f7ecd177f9072
  <section class="panel"><div class="panel-title"><h2>Saved Closed Trades</h2><span class="muted">Saved in data/trades.json and journaled in data/tradeJournal.json</span></div><div class="table-wrap"><table><thead><tr><th>Coin</th><th>Side</th><th>Entry</th><th>Exit</th><th>P/L</th><th>Result</th><th>Reason</th><th>Closed</th></tr></thead><tbody>${closed.map(t=>`<tr><td>${coinLogo(t.coin)}${esc(t.coin)}</td><td class="${clsSide(t.side)}">${esc(t.side)}</td><td>${num(t.entry)}</td><td>${num(t.exit)}</td><td class="${clsPnL(t.pnl)}">${money(t.pnl)}</td><td>${esc(t.result)}</td><td>${esc(t.closeReason||'-')}</td><td>${t.closedAt?new Date(t.closedAt).toLocaleString():'-'}</td></tr>`).join('') || '<tr><td colspan="8" class="empty">No closed trades saved yet.</td></tr>'}</tbody></table></div></section>`;
}



function logsPage() { return `<section class="panel"><div class="panel-title"><h2>Logs</h2><button id="refreshLogsBtn">Refresh</button></div><div class="logs-list">${(app.state.logs||[]).map(l=>`<div class="log-line"><span>${new Date(l.time).toLocaleString()}</span><b class="${l.level==='ERROR'?'red':l.level==='SAFE'?'yellow':'green'}">${esc(l.level)}</b><span>${esc(l.message)}</span></div>`).join('') || '<p class="empty">No logs yet.</p>'}</div></section>`; }


function assetManagerHtml() {
  const s = app.state.settings || {};
  const assets = Array.isArray(s.assets) ? s.assets : [];
  const catalog = app.assetCatalog || { symbols: [], loaded: false, loading: false, error: '' };
  const symbols = catalog.symbols || [];
  const options = symbols.map(sym => `<option value="${esc(sym)}">${esc(sym)}</option>`).join('');
  return `<section class="panel asset-panel"><div class="panel-title"><h2>Delta Coin Universe</h2><button type="button" id="loadDeltaSymbolsBtn" class="btn-blue">${catalog.loading ? 'Loading…' : 'Load Delta Coins'}</button></div>
    <div class="asset-manager">
      <p class="muted">Add or remove Delta Exchange India symbols scanned by this Institutional EMA + MACD MTF bot. This affects Dashboard, Chart coin selector, scanner, Forecast/Projection, and paper/live trade candidates.</p>
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

function settingsPage() {
  const s = app.state.settings, a = app.state.apiStatus || {};
<<<<<<< HEAD
  return `${assetManagerHtml()}<section class="settings-layout"><section class="panel"><div class="panel-title"><h2>Strategy Settings</h2><span class="pill pill-data">EMA + MACD + Market Memory</span></div><p class="warning-box"><b>V64:</b> Paper-only live-mimic build. Closed-candle only, Market Memory similar-history pullback, limit-first execution, then structure SL/TP before entry. SL is structure-first; lots reduce when SL is wide.</p><form id="strategySettingsForm" class="settings-grid">
=======
  return `${assetManagerHtml()}<section class="settings-layout"><section class="panel"><div class="panel-title"><h2>Strategy Settings</h2><span class="pill pill-data">5m MACD + MTF EMA</span></div><p class="warning-box"><b>V59:</b> Practical mode matches your manual trigger: 15m/1h MTF EMA bias + closed 5m MACD crossover + histogram color change. Default execution uses an immediate limit order at the current price after the closed-candle trigger and auto-sizes from the full TP1+TP2 exit plan, not TP2 alone. Optional pullback-limit mode is available, but it can miss fast winning moves.</p><form id="strategySettingsForm" class="settings-grid">
>>>>>>> a27d754590c85a16cd9e1218b83f7ecd177f9072
    <div class="field"><label>Entry model</label><select name="entryModel"><option value="PRACTICAL_MTF_MACD" ${s.entryModel !== 'STRICT_TRANSCRIPT_DIVERGENCE' ? 'selected' : ''}>Practical: MTF EMA + MACD cross + histogram change</option><option value="STRICT_TRANSCRIPT_DIVERGENCE" ${s.entryModel === 'STRICT_TRANSCRIPT_DIVERGENCE' ? 'selected' : ''}>Strict transcript: divergence + zero-line hard</option></select></div>
    <div class="field"><label>Zero-line mode</label><select name="zeroLineMode"><option value="soft" ${s.zeroLineMode !== 'hard' ? 'selected' : ''}>Soft context</option><option value="hard" ${s.zeroLineMode === 'hard' ? 'selected' : ''}>Hard blocker</option></select></div>
    <div class="field"><label>Require divergence for entry</label><select name="requireDivergenceForEntry"><option value="false" ${!s.requireDivergenceForEntry ? 'selected' : ''}>No — show as context</option><option value="true" ${s.requireDivergenceForEntry ? 'selected' : ''}>Yes — hard blocker</option></select></div>
    <div class="field"><label>Institutional EMA layer</label><select name="institutionalEmaEnabled"><option value="true" ${s.institutionalEmaEnabled !== false ? 'selected' : ''}>On — hard gate</option><option value="false" ${s.institutionalEmaEnabled === false ? 'selected' : ''}>Off</option></select></div>
    <div class="field"><label>Market Memory layer</label><select name="marketMemoryEnabled"><option value="true" ${s.marketMemoryEnabled !== false ? 'selected' : ''}>On — hard pullback/match gate</option><option value="false" ${s.marketMemoryEnabled === false ? 'selected' : ''}>Off</option></select></div>
    <div class="field"><label>Require Memory pullback</label><select name="marketMemoryRequirePullback"><option value="true" ${s.marketMemoryRequirePullback !== false ? 'selected' : ''}>Yes — wait for cloud retest</option><option value="false" ${s.marketMemoryRequirePullback === false ? 'selected' : ''}>No — regime only</option></select></div>
    <div class="field"><label>Require top match outcome</label><select name="marketMemoryRequireTopMatchOutcome"><option value="true" ${s.marketMemoryRequireTopMatchOutcome !== false ? 'selected' : ''}>Yes — #1 match must continue same direction</option><option value="false" ${s.marketMemoryRequireTopMatchOutcome === false ? 'selected' : ''}>No — similarity only</option></select></div>
    <div class="field"><label>Memory scan depth</label><input name="marketMemoryScanDepth" type="number" min="120" max="900" value="${esc(s.marketMemoryScanDepth || 300)}"></div>
    <div class="field"><label>Top similar matches</label><input name="marketMemoryTopMatches" type="number" min="1" max="10" value="${esc(s.marketMemoryTopMatches || 5)}"></div>
    <div class="field"><label>Pattern length candles</label><input name="marketMemoryPatternLength" type="number" min="5" max="30" value="${esc(s.marketMemoryPatternLength || 10)}"></div>
    <div class="field"><label>Min similarity %</label><input name="marketMemoryMinSimilarityPct" type="number" min="55" max="98" step="1" value="${esc(s.marketMemoryMinSimilarityPct || 80)}"></div>
    <div class="field"><label>Memory sensitivity</label><input name="marketMemorySensitivity" type="number" min="0.3" max="5" step="0.1" value="${esc(s.marketMemorySensitivity || 1.5)}"></div>
    <div class="field"><label>Memory cloud ATR width</label><input name="marketMemoryCloudAtrMult" type="number" min="0.2" max="3" step="0.05" value="${esc(s.marketMemoryCloudAtrMult || 0.75)}"></div>
    <div class="field"><label>Memory max extension ATR</label><input name="marketMemoryMaxExtensionAtr" type="number" min="0.5" max="5" step="0.1" value="${esc(s.marketMemoryMaxExtensionAtr || 1.6)}"></div>
    <div class="field"><label>Require EMA stack</label><select name="institutionalRequireEmaStack"><option value="true" ${s.institutionalRequireEmaStack !== false ? 'selected' : ''}>Yes</option><option value="false" ${s.institutionalRequireEmaStack === false ? 'selected' : ''}>No</option></select></div>
    <div class="field"><label>Require EMA50 pullback</label><select name="institutionalRequirePullback"><option value="true" ${s.institutionalRequirePullback !== false ? 'selected' : ''}>Yes</option><option value="false" ${s.institutionalRequirePullback === false ? 'selected' : ''}>No</option></select></div>
    <div class="field"><label>Require price action</label><select name="institutionalRequirePriceAction"><option value="true" ${s.institutionalRequirePriceAction !== false ? 'selected' : ''}>Yes</option><option value="false" ${s.institutionalRequirePriceAction === false ? 'selected' : ''}>No</option></select></div>
    <div class="field"><label>Require HTF MACD</label><select name="institutionalRequireHtfMacd"><option value="true" ${s.institutionalRequireHtfMacd !== false ? 'selected' : ''}>Yes</option><option value="false" ${s.institutionalRequireHtfMacd === false ? 'selected' : ''}>No</option></select></div>
    <div class="field"><label>Execution EMA 9 / 21</label><input disabled value="${esc(s.entryEmaFastPeriod || 9)} / ${esc(s.entryEmaSlowPeriod || 21)}"></div><div class="field"><label>Trend EMA 50 / 200</label><input disabled value="${esc(s.trendEmaPeriod || 50)} / ${esc(s.dominantEmaPeriod || 200)}"></div>
    <div class="field"><label>EMA50 pullback lookback</label><input name="institutionalPullbackLookback" type="number" min="3" max="30" value="${esc(s.institutionalPullbackLookback || 10)}"></div>
    <div class="field"><label>EMA50 pullback ATR tolerance</label><input name="institutionalPullbackAtrMult" type="number" step="0.05" value="${esc(s.institutionalPullbackAtrMult || 0.85)}"></div>
    <div class="field"><label>Max extension from EMA50 ATR</label><input name="institutionalMaxExtensionAtr" type="number" step="0.1" value="${esc(s.institutionalMaxExtensionAtr || 2.2)}"></div>
    <div class="field"><label>MACD cross window candles</label><input name="entrySignalWindowCandles" type="number" min="1" max="12" value="${esc(s.entrySignalWindowCandles || 2)}"></div>
    <div class="field"><label>Histogram color lookback</label><input name="histColorLookback" type="number" min="2" max="30" value="${esc(s.histColorLookback || 6)}"></div>
    <div class="field"><label>Min confluence score</label><input name="minConfluenceScore" type="number" min="5" max="12" value="${esc(s.minConfluenceScore || 7)}"></div><div class="field"><label>A+ confluence score</label><input name="aPlusConfluenceScore" type="number" min="7" max="13" value="${esc(s.aPlusConfluenceScore || 10)}"></div><div class="field"><label>Tier 3 min score</label><input name="tier3MinConfluenceScore" type="number" min="7" max="13" value="${esc(s.tier3MinConfluenceScore || 10)}"></div><div class="field"><label>Structure proximity ATR</label><input name="structureProximityAtr" type="number" min="0.25" max="4" step="0.05" value="${esc(s.structureProximityAtr || 1.35)}"></div><div class="field"><label>VWAP filter</label><select name="vwapConfluenceEnabled"><option value="true" ${s.vwapConfluenceEnabled !== false ? 'selected' : ''}>On</option><option value="false" ${s.vwapConfluenceEnabled === false ? 'selected' : ''}>Off</option></select></div><div class="field"><label>Volume spike filter</label><select name="volumeSpikeConfluenceEnabled"><option value="true" ${s.volumeSpikeConfluenceEnabled !== false ? 'selected' : ''}>On</option><option value="false" ${s.volumeSpikeConfluenceEnabled === false ? 'selected' : ''}>Off</option></select></div><div class="field"><label>Max concurrent positions</label><input name="maxConcurrentPositions" type="number" min="1" max="5" value="${esc(s.maxConcurrentPositions)}"></div>
    <div class="field"><label>Risk %</label><input name="riskPercent" type="number" step="0.1" value="${esc(s.riskPercent)}"></div>
    <div class="field"><label>Default leverage</label><input name="defaultLeverage" type="number" min="1" max="25" value="${esc(s.defaultLeverage)}"></div>
    <div class="field"><label>Max leverage</label><input name="maxLeverage" type="number" min="1" max="25" value="${esc(s.maxLeverage)}"></div>
    <div class="field"><label>Auto-size to target profit</label><select name="autoSizeToTargetProfit"><option value="true" ${s.autoSizeToTargetProfit !== false ? 'selected' : ''}>Yes — adjust margin/leverage</option><option value="false" ${s.autoSizeToTargetProfit === false ? 'selected' : ''}>No</option></select></div>
    <div class="field"><label>Target full-trade profit $</label><input name="targetFullTradeProfitUsd" type="number" min="0" step="0.25" value="${esc(s.targetFullTradeProfitUsd ?? s.targetProfitUsd ?? 2)}"></div>
    <div class="field"><label>Minimum full-trade profit $</label><input name="minFullTradeProfitUsd" type="number" min="0" step="0.25" value="${esc(s.minFullTradeProfitUsd ?? s.minTargetProfitUsd ?? 1)}"></div>
    <div class="field"><label>Block tiny-profit trades</label><select name="blockTinyProfitTrades"><option value="true" ${s.blockTinyProfitTrades !== false ? 'selected' : ''}>Yes — skip if below minimum</option><option value="false" ${s.blockTinyProfitTrades === false ? 'selected' : ''}>No</option></select></div>
    <div class="field"><label>Use max leverage for target sizing</label><select name="autoUseMaxLeverageForProfitTarget"><option value="true" ${s.autoUseMaxLeverageForProfitTarget !== false ? 'selected' : ''}>Yes</option><option value="false" ${s.autoUseMaxLeverageForProfitTarget === false ? 'selected' : ''}>No</option></select></div>
    <div class="field"><label>Pivot left</label><input name="divergencePivotLeft" type="number" min="1" max="10" value="${esc(s.divergencePivotLeft || 3)}"></div>
    <div class="field"><label>Pivot right</label><input name="divergencePivotRight" type="number" min="1" max="10" value="${esc(s.divergencePivotRight || 3)}"></div>
    <div class="field"><label>Divergence lookback</label><input name="divergenceLookback" type="number" min="20" max="180" value="${esc(s.divergenceLookback || 60)}"></div>
    <div class="field"><label>SL ATR buffer</label><input name="slBufferAtrMult" type="number" step="0.01" value="${esc(s.slBufferAtrMult || 0.25)}"></div>
    <div class="field"><label>TP1 close %</label><input name="tp1ClosePct" type="number" min="0" max="100" value="${esc(s.tp1ClosePct || 50)}"></div>
    <div class="field"><label>TP2 close remaining %</label><input name="tp2ClosePct" type="number" min="0" max="100" value="${esc(s.tp2ClosePct || 100)}"></div>
<<<<<<< HEAD
    <div class="field"><label>Dynamic TP extension</label><select name="dynamicTpEnabled"><option value="true" ${s.dynamicTpEnabled !== false ? 'selected' : ''}>On — MACD strength extends TP</option><option value="false" ${s.dynamicTpEnabled === false ? 'selected' : ''}>Off</option></select></div>
    <div class="field"><label>Strong MACD TP2 target R</label><input name="dynamicTpStrongR" type="number" min="2" max="8" step="0.5" value="${esc(s.dynamicTpStrongR || 3)}"></div>
    <div class="field"><label>Max dynamic TP R</label><input name="dynamicTpMaxR" type="number" min="2" max="8" step="0.5" value="${esc(s.dynamicTpMaxR || 5)}"></div>
    <div class="field"><label>Shift TP1 to R</label><input name="dynamicTp1ShiftR" type="number" min="1" max="5" step="0.25" value="${esc(s.dynamicTp1ShiftR || 1.5)}"></div>
    <div class="field"><label>Strong MACD TP1 close %</label><input name="dynamicTp1StrongClosePct" type="number" min="1" max="90" value="${esc(s.dynamicTp1StrongClosePct || 25)}"></div>
    <div class="field"><label>EMA trail period</label><input name="trailingStopEmaPeriod" type="number" min="3" max="50" value="${esc(s.trailingStopEmaPeriod || 13)}"></div>
    <div class="field"><label>EMA trail ATR buffer</label><input name="trailingStopAtrBuffer" type="number" min="0" max="2" step="0.05" value="${esc(s.trailingStopAtrBuffer || 0.20)}"></div>
=======
>>>>>>> a27d754590c85a16cd9e1218b83f7ecd177f9072
    <div class="field"><label>Max margin / coin</label><input name="maxMarginPerCoinUsd" type="number" value="${esc(s.maxMarginPerCoinUsd)}"></div>
    <div class="field"><label>Bot allocation</label><input name="maxBotAllocationUsd" type="number" value="${esc(s.maxBotAllocationUsd)}"></div>
    <div class="field"><label>Entry order type</label><select name="entryOrderType"><option value="limit" ${s.entryOrderType !== 'market' ? 'selected' : ''}>Limit / pullback preferred</option><option value="market" ${s.entryOrderType === 'market' ? 'selected' : ''}>Market only if allowed</option></select></div>
    <div class="field"><label>Require pullback execution</label><select name="requirePullbackForExecution"><option value="false" ${s.requirePullbackForExecution === false ? 'selected' : ''}>No — immediate limit after signal (not recommended)</option><option value="true" ${s.requirePullbackForExecution !== false ? 'selected' : ''}>Yes — wait/place pullback limit (recommended)</option></select></div>
    <div class="field"><label>Pullback ATR gap</label><input name="pullbackAtrMult" type="number" step="0.01" value="${esc(s.pullbackAtrMult ?? 0.20)}"></div>
    <div class="field"><label>Max pullback ATR gap</label><input name="pullbackMaxAtrMult" type="number" step="0.05" value="${esc(s.pullbackMaxAtrMult ?? 1.50)}"></div>
    <div class="field"><label>Allow market fallback</label><select name="allowMarketWhenNoPullback"><option value="false" ${!s.allowMarketWhenNoPullback ? 'selected' : ''}>No — safer</option><option value="true" ${s.allowMarketWhenNoPullback ? 'selected' : ''}>Yes — only if explicitly selected</option></select></div>
    <button class="btn-green" type="submit">Save Strategy Settings</button>
  </form></section>
  <section class="panel"><div class="panel-title"><h2>Delta India API</h2></div><form id="apiKeyForm" class="settings-grid"><div class="field"><label>Base URL</label><input name="deltaBaseUrl" value="${esc(s.deltaBaseUrl)}"></div><div class="field"><label>API key</label><input name="apiKey" value="${esc(app.apiDraft.apiKey)}" placeholder="${a.keysConfigured ? esc(a.keyPreview) : 'Paste key'}"></div><div class="field"><label>API secret</label><input name="secret" type="password" value="${esc(app.apiDraft.secret)}" placeholder="Paste secret"></div><div class="field"><label>Whitelist IP</label><input name="whitelistedIpNote" value="${esc(app.apiDraft.whitelistedIpNote || a.whitelistedIpNote || a.serverOutboundIp || '')}"></div><button type="button" id="detectAndTestBtn" class="btn-blue">Detect IP + Test</button><button type="submit" class="btn-green">Save + Auto Setup</button><button type="button" id="clearKeysBtn" class="btn-red">Delete API Key</button></form><p class="warning-box">V64 paper-only lock: API keys may sync wallet/data reference, but live order execution is disabled from UI and backend.</p></section></section>`;
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
<<<<<<< HEAD
  ['maxConcurrentPositions','riskPercent','defaultLeverage','maxLeverage','divergencePivotLeft','divergencePivotRight','divergenceLookback','slBufferAtrMult','tp1ClosePct','tp2ClosePct','maxMarginPerCoinUsd','maxBotAllocationUsd','entrySignalWindowCandles','histColorLookback','pullbackAtrMult','pullbackMaxAtrMult','targetFullTradeProfitUsd','minFullTradeProfitUsd','institutionalEmaFastPeriod','institutionalEmaMidPeriod','institutionalEmaSlowPeriod','institutionalPullbackLookback','institutionalPullbackAtrMult','institutionalMaxExtensionAtr','institutionalPatternLookback','marketMemoryScanDepth','marketMemoryTopMatches','marketMemoryPatternLength','marketMemoryFutureLookahead','marketMemorySensitivity','marketMemoryMinSimilarityPct','marketMemoryCloudAtrMult','marketMemoryNearCloudAtrMult','marketMemoryMaxExtensionAtr','marketMemoryMinForwardMoveAtr','dynamicTpStrongR','dynamicTpMaxR','dynamicTp1ShiftR','dynamicTp1StrongClosePct','trailingStopEmaPeriod','trailingStopAtrBuffer','minConfluenceScore','aPlusConfluenceScore','tier3MinConfluenceScore','minMomentumConfirmations','structureProximityAtr','volumeSpikeMultiplier','vwapLookback'].forEach(k => { if (fd.has(k)) out[k] = Number(fd.get(k)); });
  ['institutionalEmaEnabled','institutionalRequireEmaStack','institutionalRequirePullback','institutionalRequirePriceAction','institutionalRequireHtfMacd','marketMemoryEnabled','marketMemoryRequirePullback','marketMemoryRequireTopMatchOutcome','dynamicTpEnabled','vwapConfluenceEnabled','volumeSpikeConfluenceEnabled'].forEach(k => { if (fd.has(k)) out[k] = String(fd.get(k)) === 'true'; });
=======
  ['maxConcurrentPositions','riskPercent','defaultLeverage','maxLeverage','divergencePivotLeft','divergencePivotRight','divergenceLookback','slBufferAtrMult','tp1ClosePct','tp2ClosePct','maxMarginPerCoinUsd','maxBotAllocationUsd','entrySignalWindowCandles','histColorLookback','pullbackAtrMult','pullbackMaxAtrMult','targetFullTradeProfitUsd','minFullTradeProfitUsd'].forEach(k => { if (fd.has(k)) out[k] = Number(fd.get(k)); });
>>>>>>> a27d754590c85a16cd9e1218b83f7ecd177f9072
  if (fd.has('entryModel')) out.entryModel = String(fd.get('entryModel') || 'PRACTICAL_MTF_MACD');
  if (fd.has('zeroLineMode')) out.zeroLineMode = String(fd.get('zeroLineMode') || 'soft');
  if (fd.has('requireDivergenceForEntry')) out.requireDivergenceForEntry = String(fd.get('requireDivergenceForEntry')) === 'true';
  if (fd.has('entryOrderType')) out.entryOrderType = String(fd.get('entryOrderType') || 'limit');
  if (fd.has('requirePullbackForExecution')) out.requirePullbackForExecution = String(fd.get('requirePullbackForExecution')) === 'true';
  if (fd.has('allowMarketWhenNoPullback')) out.allowMarketWhenNoPullback = String(fd.get('allowMarketWhenNoPullback')) === 'true';
  if (fd.has('autoSizeToTargetProfit')) out.autoSizeToTargetProfit = String(fd.get('autoSizeToTargetProfit')) === 'true';
  if (fd.has('blockTinyProfitTrades')) out.blockTinyProfitTrades = String(fd.get('blockTinyProfitTrades')) === 'true';
  if (fd.has('autoUseMaxLeverageForProfitTarget')) out.autoUseMaxLeverageForProfitTarget = String(fd.get('autoUseMaxLeverageForProfitTarget')) === 'true';
<<<<<<< HEAD
  out.paperTrade = true;
=======
>>>>>>> a27d754590c85a16cd9e1218b83f7ecd177f9072
  return out;
}


async function saveSettings(form) { app.state = await api('/api/settings', { method:'POST', body: JSON.stringify(payloadFromForm(form)) }); render(); toast('Settings saved.'); }
async function setBot(on) { try { app.state = await api('/api/toggle-live', { method:'POST', body: JSON.stringify({ enabled: Boolean(on) }) }); render(); toast(on ? 'Bot ON.' : 'Bot OFF.'); } catch(e) { await loadState({silent:true}); toast(e.message); } }
async function setMode(live) {
  try {
    app.state = await api('/api/settings', { method:'POST', body: JSON.stringify({ paperTrade: true }) });
    render();
    toast('V64 is locked to PAPER mode. Live execution is disabled.');
  } catch(e) { await loadState({silent:true}); toast(e.message); }
}


async function emergencyStop() { app.state = await api('/api/emergency-stop', { method:'POST', body:'{}' }); render(); toast('Emergency stop: BOT OFF and PAPER mode enforced.'); }
async function saveApi() { const f=$('#apiKeyForm'), fd=new FormData(f); const payload={ apiKey:String(fd.get('apiKey')||'').trim(), secret:String(fd.get('secret')||'').trim(), deltaBaseUrl:String(fd.get('deltaBaseUrl')||'').trim(), whitelistedIpNote:String(fd.get('whitelistedIpNote')||'').trim(), liveTradingConfirmed:Boolean(app.state.apiStatus?.liveTradingConfirmed) }; const result = await api('/api/auto-setup', { method:'POST', body: JSON.stringify(payload), timeoutMs: 25000 }); app.state = result.state || app.state; render(); toast(result.completed ? 'API saved and synced.' : 'API setup incomplete. Check readiness.'); }
async function detectAndTest() { app.state = await api('/api/outbound-ip', { method:'POST', body:'{}' }); render(); try { app.state = await api('/api/test-keys', { method:'POST', body:'{}' }); render(); toast('Connection test passed.'); } catch(e) { toast(e.message); } }
async function closeTrade(id) { const data = await api('/api/close-trade', { method:'POST', body: JSON.stringify({ id }) }); app.state = data.state; render(); toast(`Closed ${data.closed.coin} ${data.closed.side || ''}.`); }

function bind() {
  $('.filterbar').addEventListener('click', e => { const f=e.target.closest('[data-filter]'), s=e.target.closest('[data-sort]'); if (f) { app.filter=f.dataset.filter; $$('[data-filter]').forEach(b=>b.classList.toggle('active', b===f)); render(); } if (s) { app.filter='ALL'; render(); } });
  $('.tabbar').addEventListener('click', e => { const b=e.target.closest('[data-page]'); if (b) { app.page=b.dataset.page; render(); } });
  $('#refreshBtn').addEventListener('click', () => loadState({ scan:true }));
  $('#botSwitch').addEventListener('change', e => setBot(e.target.checked));
  $('#modeSwitch').addEventListener('change', e => setMode(e.target.checked));
  document.body.addEventListener('input', e => { if (!e.target.name) return; if (e.target.name === 'apiKey') app.apiDraft.apiKey = e.target.value; if (e.target.name === 'secret') app.apiDraft.secret = e.target.value; if (e.target.name === 'deltaBaseUrl') app.apiDraft.deltaBaseUrl = e.target.value; if (e.target.name === 'whitelistedIpNote') app.apiDraft.whitelistedIpNote = e.target.value; });
  document.body.addEventListener('change', e => { if (e.target.id === 'chartTf') { app.chart.timeframe = e.target.value; app.chart.data = null; loadChart({force:true}); } });
  document.body.addEventListener('submit', e => { if (e.target.id === 'strategySettingsForm') { e.preventDefault(); saveSettings(e.target).catch(err=>toast(err.message)); } if (e.target.id === 'apiKeyForm') { e.preventDefault(); saveApi().catch(err=>toast(err.message)); } });
  document.body.addEventListener('click', e => {
    const coin = e.target.closest('[data-coin]'); if (coin) { app.chart.coin = coin.dataset.coin; app.chart.data = null; render(); if (app.page === 'chart') loadChart({force:true}); return; }
    const tab = e.target.closest('[data-chart-tab]'); if (tab) { app.chart.tab = tab.dataset.chartTab; render(); return; }
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
    if (e.target.id === 'detectAndTestBtn') detectAndTest().catch(err=>toast(err.message));
    if (e.target.id === 'clearKeysBtn') api('/api/keys', { method:'POST', body: JSON.stringify({ clearKeys:true }) }).then(d=>{app.state=d; render(); toast('Keys deleted.');}).catch(err=>toast(err.message));
    const c = e.target.closest('[data-close]'); if (c && confirm('Close this trade now?')) closeTrade(c.dataset.close).catch(err=>toast(err.message));
  });
}
function startPolling() { clearInterval(app.polling); app.polling = setInterval(() => loadState({ silent:true }), 5000); }
window.addEventListener('resize', () => { if (app.page === 'chart') drawChart(); });
window.addEventListener('DOMContentLoaded', () => { bind(); loadState(); startPolling(); });
