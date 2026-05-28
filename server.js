'use strict';

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');

const ROOT = __dirname;
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, 'data');
const PUBLIC_DIR = path.join(ROOT, 'public');
const PORT = Number(process.env.PORT || 8080);
const USER_AGENT = 'TradingNorth-MACDMTFEMA/59.0';

const DASHBOARD_PASSWORD = String(process.env.DASHBOARD_PASSWORD || '').trim();
const DASHBOARD_SESSION_SECRET = String(process.env.DASHBOARD_SESSION_SECRET || process.env.DASHBOARD_PASSWORD || crypto.randomBytes(32).toString('hex'));
const SESSION_COOKIE = 'ds_v28_session';
const SESSION_TTL_MS = Math.max(1, Number(process.env.DASHBOARD_SESSION_HOURS || 12)) * 60 * 60 * 1000;


const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

const BASE_PRICE = {
  BTCUSD: 104500,
  ETHUSD: 2310,
  SOLUSD: 85.69,
  BNBUSD: 628.3,
  AVAXUSD: 9.31,
  INJUSD: 3.54,
  XRPUSD: 1.42,
  APTUSD: 5.64,
  ADAUSD: 0.72
};

const DEFAULT_SETTINGS = {
  botEnabled: false,
  paperTrade: true,
  exchange: 'delta_exchange_india',
  executionApi: 'delta_exchange_india',
  signalSource: 'macd_divergence_mtf_ema',
  strategyMode: 'MACD_DIVERGENCE_MTF_EMA',
  deltaBaseUrl: 'https://api.india.delta.exchange',
  assets: Object.keys(BASE_PRICE),
  primaryTimeframe: '5m',
  executionTimeframe: '5m',
  macdTrendTimeframe: '1h',
  emaFastTimeframe: '15m',
  emaSlowTimeframe: '1h',
  higherTimeframes: ['15m', '1h'],
  emaPeriod: 50,
  mtfEmaPeriod: 50,
  minEmaGapPct: 0.01,
  divergencePivotLeft: 3,
  divergencePivotRight: 3,
  divergenceLookback: 60,
  minDivergenceMacdPct: 0.00001,
  entryModel: 'PRACTICAL_MTF_MACD',
  requireDivergenceForEntry: false,
  zeroLineMode: 'soft',
  entrySignalWindowCandles: 6,
  histColorLookback: 12,
  emaSlopeThresholdPct: 0.05,
  atrPeriod: 10,
  atrStopMultiplier: 2,
  supertrendMultiplier: 3,
  kdeThreshold: 55,
  kdeLookback: 200,
  relativeVolumeLookback: 50,
  htfMinimumAligned: 1,
  zoneProximityPct: 0.50,
  riskPercent: 0.5,
  totalWalletAmount: 0,
  maxTradesPerDay: 5,
  maxDailyLossUsd: 10,
  maxConsecutiveLosses: 2,
  paperMinScore: 55,
  adrUsedLimitPct: 80,
  timeFailureCandles: 8,
  pendingExpiryMinutes: 45,
  minSlAtrMult: 0.6,
  minTrendQuality: 30,
  moveSlAfterTp1MinR: 1,
  moveSlAfterTp1MinAge: 30,
  defaultLeverage: 25,
  maxLeverage: 25,
  maxConcurrentPositions: 3,
  maxOnePositionPerAsset: true,
  maxBotAllocationUsd: 500,
  liveWalletAllocationPct: 25,
  liveMaxBotAllocationUsd: 0,
  maxMarginPerCoinUsd: 25,
  majorCoinMaxMarginUsd: 40,
  majorMarginCoins: ['BTCUSD', 'ETHUSD'],
  initialMarginUsd: 10,
  majorInitialMarginUsd: 20,
  maxStopLossUsd: 2,
  minEntryMarginUsd: 1,
  tradeManagementEnabled: true,
  autoMoveSlEnabled: true,
  breakEvenTriggerR: 1,
  breakEvenBufferR: 0.03,
  autoTp1Enabled: true,
  tp1TriggerR: 1,
  profitAddOnEnabled: true,
  autoAddOnEnabled: true,
  addOnStepMarginUsd: 5,
  majorAddOnStepMarginUsd: 10,
  maxAddOnsPerCoin: 1,
  profitAddOnTriggerR: 2,
  profitAddOnSizePct: 50,
  profitAddOnMinScore: 70,
  profitAddOnRequireFreshSignal: true,
  protectedAddOnNoLossOnly: true,
  qualitySizingEnabled: true,
  qualitySizeScore1: 70,
  qualitySizeMultiplier1: 1.5,
  qualitySizeScore2: 82,
  qualitySizeMultiplier2: 2,
  maxQualitySizeMultiplier: 2,
  chandelierTradeManagementEnabled: true,
  liveAddOnsEnabled: false,
  dailyDrawdownLimitPct: -5,
  weeklyDrawdownLimitPct: -10,
  monthlyDrawdownLimitPct: -20,
  maxFundingRatePct8h: 0.1,
  extremeFundingRatePct8h: 0.2,
  newsBlackoutBeforeMin: 30,
  newsBlackoutAfterMin: 15,
  entryOrderType: 'limit',
  minRR: 2,
  rewardTargetR: 2,
  autoSizeToTargetProfit: true,
  minFullTradeProfitUsd: 1,
  minTargetProfitUsd: 1, // backward compatibility only
  targetFullTradeProfitUsd: 2,
  targetProfitUsd: 2, // backward compatibility only
  blockTinyProfitTrades: true,
  autoUseMaxLeverageForProfitTarget: true,
  highProbabilityMode: true,
  technicalSlEnabled: true,
  slSwingLookback: 24,
  slBufferAtrMult: 0.25,
  maxTechnicalSlAtrMult: 6,
  requireClosedCandle: true,
  requirePullbackForExecution: false,
  pullbackAtrMult: 0.20,
  pullbackMaxAtrMult: 1.50,
  allowMarketWhenNoPullback: false,
  tp1ClosePct: 50,
  tp2ClosePct: 100,
  tp3ClosePct: 0,
  liveOrderSize: 1,
  autoScanSeconds: 10,
  marketDataRefreshSeconds: 15,
  tradingViewWebhookToken: 'change-me',
  requireTradingViewSignalForExecution: false,
  paperLiveCompatibleSizing: true,
  paperExecutionMode: 'auto',
  paperUseDeltaWalletReference: true,
  macdConfirmationEnabled: false,
  macdFastLength: 12,
  macdSlowLength: 26,
  macdSignalLength: 9,
  tradingViewSignalFreshnessSeconds: 180,
  twoPoleModuleEnabled: false,
  twoPoleAllowLocalEntry: false,
  twoPoleFilterLength: 15,
  twoPoleBuyMaxLevel: 0,
  twoPoleSellMinLevel: 0,
  twoPoleDeltaVolumeThresholdPct: 20,
  twoPoleUseInvalidationStop: true,
  breakoutModuleEnabled: false,
  breakoutAllowLocalEntry: false,
  breakoutLookback: 36,
  breakoutConsolidationLookback: 18,
  breakoutMaxRangeAtrMult: 2.2,
  breakoutMomentumBodyAtrMult: 0.7,
  breakoutSlBufferAtrMult: 0.12,
  breakoutTp1R: 1.5,
  breakoutUseChandelierTrail: true,
  vwapModuleEnabled: false,
  vwapAllowLocalEntry: false,
  vwapLookback: 48,
  vwapBandStdMult: 1.5,
  vwapRejectionAtrMult: 0.35,
  vwapSlBufferAtrMult: 0.15,
  vwapMinTp1R: 0.8,
  vwapMinTp2R: 1.5,
  vwapBlockStrongAgainstTrend: true,
  chandelierLength: 22,
  chandelierAtrMult: 3,
  sarMacdModuleEnabled: false,
  sarMacdAllowLocalEntry: false,
  sarMacdEmaPeriod: 200,
  sarMacdSarStep: 0.02,
  sarMacdSarMax: 0.2,
  sarMacdAdxThreshold: 18,
  sarMacdPullbackLookback: 8,
  sarMacdMaxDistanceAtr: 3.2,
  sarMacdSwingLookback: 18,
  sarMacdEmaStopBufferAtr: 0.12,
  sarMacdBlockLateMomentum: true,
  sarMacdWebhookOnly: false,
  trendVotesRequired: 1,
  sdZoneHardBlock: false
};

const DEFAULT_WALLET = {
  equity: 0,
  available: 0,
  dailyPnl: 0,
  weeklyPnl: 0,
  monthlyPnl: 0,
  currency: 'USDT'
};

const DEFAULT_KEYS = {
  exchange: 'delta_exchange_india',
  apiKey: '',
  secret: '',
  liveTradingConfirmed: false,
  lastTestAt: null,
  lastTestStatus: 'not_tested',
  lastTestMessage: '',
  whitelistedIpNote: '',
  lastServerOutboundIp: '',
  lastServerOutboundIpAt: null,
  lastServerOutboundIpMessage: ''
};

const state = {
  startedAt: new Date().toISOString(),
  lastScanAt: null,
  tick: 0,
  market: {},
  priceHistory: {},
  lastRows: [],
  delta: {
    lastFetchAt: null,
    status: 'NOT_CONNECTED',
    message: 'Delta public ticker not fetched yet.',
    tickersBySymbol: {},
    productsBySymbol: {},
    productsLastFetchAt: null,
    candlesByKey: {},
    candlesLastFetchAt: {},
    candlesMessage: '',
    requestInFlight: false
  },
  walletLive: {
    lastFetchAt: null,
    status: 'NOT_FETCHED',
    message: 'Delta wallet not fetched yet.',
    summary: null,
    raw: null
  },
  deltaPositions: {
    lastFetchAt: null,
    status: 'NOT_FETCHED',
    message: 'Delta live positions not fetched yet.',
    openTrades: [],
    raw: [],
    orderRaw: [],
    source: 'LOCAL_BOT_LEDGER'
  }
};

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function readJson(file, fallback) {
  ensureDir(DATA_DIR);
  const fullPath = path.join(DATA_DIR, file);
  if (!fs.existsSync(fullPath)) {
    writeJson(file, fallback);
    return clone(fallback);
  }
  try {
    return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  } catch (error) {
    const badPath = `${fullPath}.bad-${Date.now()}`;
    fs.renameSync(fullPath, badPath);
    writeJson(file, fallback);
    return clone(fallback);
  }
}

function backupExisting(file) {
  ensureDir(DATA_DIR);
  const fullPath = path.join(DATA_DIR, file);
  if (!fs.existsSync(fullPath)) return;
  const backupPath = path.join(DATA_DIR, `${file.replace(/\.json$/, '')}.backup.json`);
  try { fs.copyFileSync(fullPath, backupPath); } catch (_) {}
}

function writeJson(file, value) {
  ensureDir(DATA_DIR);
  const fullPath = path.join(DATA_DIR, file);
  const tmpPath = `${fullPath}.tmp`;
  if (file === 'settings.json' || file === 'apiKeys.json') backupExisting(file);
  fs.writeFileSync(tmpPath, JSON.stringify(value, null, 2));
  fs.renameSync(tmpPath, fullPath);
}

function enforceTimeframePolicy(settings = {}) {
  const emaPeriod = Number(settings.mtfEmaPeriod || settings.emaPeriod || 50);
  return {
    ...settings,
    primaryTimeframe: '5m',
    executionTimeframe: '5m',
    emaFastTimeframe: '15m',
    emaSlowTimeframe: '1h',
    macdTrendTimeframe: '1h',
    higherTimeframes: ['15m', '1h'],
    htfMinimumAligned: 1,
    signalSource: 'macd_divergence_mtf_ema',
    strategyMode: 'MACD_DIVERGENCE_MTF_EMA',
    emaPeriod,
    mtfEmaPeriod: emaPeriod,
    macdFastLength: 12,
    macdSlowLength: 26,
    macdSignalLength: 9,
    minRR: 2,
    rewardTargetR: 2,
    requireClosedCandle: true,
    requirePullbackForExecution: true,
    sarMacdModuleEnabled: false,
    sarMacdAllowLocalEntry: false,
    twoPoleModuleEnabled: false,
    twoPoleAllowLocalEntry: false,
    breakoutModuleEnabled: false,
    breakoutAllowLocalEntry: false,
    vwapModuleEnabled: false,
    vwapAllowLocalEntry: false,
    exchange: 'delta_exchange_india',
    executionApi: 'delta_exchange_india'
  };
}

function loadSettings() {
  const stored = readJson('settings.json', DEFAULT_SETTINGS);
  return enforceTimeframePolicy({ ...DEFAULT_SETTINGS, ...stored });
}

function saveSettings(settings) {
  writeJson('settings.json', enforceTimeframePolicy({ ...DEFAULT_SETTINGS, ...settings }));
}

function loadWallet() {
  return { ...DEFAULT_WALLET, ...readJson('paperWallet.json', DEFAULT_WALLET) };
}

function saveWallet(wallet) {
  writeJson('paperWallet.json', { ...DEFAULT_WALLET, ...wallet });
}

function loadTrades() {
  return readJson('trades.json', { openTrades: [], closedTrades: [] });
}

function saveTrades(trades) {
  const payload = { openTrades: trades.openTrades || [], closedTrades: trades.closedTrades || [], lastSavedAt: new Date().toISOString() };
  writeJson('trades.json', payload);
}

function appendTradeJournalEvent(type, trade, meta = {}) {
  const journal = readJson('tradeJournal.json', []);
  journal.unshift({ time: new Date().toISOString(), type, tradeId: trade?.id || trade?.parentTradeId || null, coin: trade?.coin || null, side: trade?.side || null, mode: trade?.mode || null, entry: trade?.entry, exit: trade?.exit, pnl: trade?.pnl, result: trade?.result, ...meta });
  writeJson('tradeJournal.json', journal.slice(0, 2000));
}

function loadKeys() {
  const stored = readJson('apiKeys.json', DEFAULT_KEYS);
  const envKey = String(process.env.DELTA_API_KEY || '').trim();
  const envSecret = String(process.env.DELTA_API_SECRET || '').trim();
  const keys = { ...DEFAULT_KEYS, ...stored, exchange: 'delta_exchange_india' };
  if (envKey) {
    keys.apiKey = envKey;
    keys.loadedFromEnv = true;
  }
  if (envSecret) {
    keys.secret = envSecret;
    keys.loadedFromEnv = true;
  }
  if (keys.loadedFromEnv && keys.lastTestStatus === 'not_tested') {
    keys.lastTestMessage = 'Loaded from Render environment. Run Auto Setup / Test Connection.';
  }
  return keys;
}

function saveKeys(keys) {
  const safeKeys = { ...DEFAULT_KEYS, ...keys, exchange: 'delta_exchange_india' };
  writeJson('apiKeys.json', safeKeys);
}

function maskKey(key) {
  if (!key) return '';
  if (key.length <= 8) return '********';
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

function loadLogs() {
  const logs = readJson('logs.json', []);
  return Array.isArray(logs) ? logs : [];
}

function saveLogs(logs) {
  writeJson('logs.json', logs.slice(-800));
}

function log(level, message, meta = {}) {
  const logs = loadLogs();
  const entry = { time: new Date().toISOString(), level, message, ...meta };
  logs.unshift(entry);
  saveLogs(logs);
  return entry;
}

function pct(n) {
  return Math.round(Number(n || 0) * 100) / 100;
}

function precisionForCoin(coin) {
  if (coin === 'BTCUSD') return 1;
  if (coin === 'ETHUSD' || coin === 'BNBUSD') return 2;
  if (coin === 'XRPUSD' || coin === 'ADAUSD') return 4;
  return 2;
}

function roundCoin(coin, n) {
  const p = precisionForCoin(coin);
  const m = Math.pow(10, p);
  return Math.round(Number(n || 0) * m) / m;
}

function isMajorMarginCoin(symbol, settings = loadSettings()) {
  const majors = Array.isArray(settings.majorMarginCoins) ? settings.majorMarginCoins : ['BTCUSD', 'ETHUSD'];
  return majors.map(String).map(x => x.toUpperCase()).includes(String(symbol || '').toUpperCase());
}

function marginCapForSymbol(symbol, settings = loadSettings()) {
  return Number(isMajorMarginCoin(symbol, settings) ? settings.majorCoinMaxMarginUsd : settings.maxMarginPerCoinUsd) || 10;
}

function initialMarginForSymbol(symbol, settings = loadSettings()) {
  const cap = marginCapForSymbol(symbol, settings);
  const raw = Number(isMajorMarginCoin(symbol, settings) ? settings.majorInitialMarginUsd : settings.initialMarginUsd) || Math.min(5, cap);
  return Math.min(Math.max(Number(settings.minEntryMarginUsd || 1), raw), cap);
}

function addOnStepForSymbol(symbol, settings = loadSettings()) {
  const cap = marginCapForSymbol(symbol, settings);
  const raw = Number(isMajorMarginCoin(symbol, settings) ? settings.majorAddOnStepMarginUsd : settings.addOnStepMarginUsd) || Math.min(5, cap);
  return Math.min(Math.max(Number(settings.minEntryMarginUsd || 1), raw), cap);
}

function money(n) {
  return Math.round(Number(n || 0) * 100) / 100;
}

function priceRiskPct(entry, sl) {
  const e = Number(entry || 0);
  const s = Number(sl || 0);
  if (!e || !s) return 0;
  return Math.abs(e - s) / e;
}

function plannedMarginUsedForCoin(trades, symbol) {
  return (trades.openTrades || [])
    .filter(t => t.status === 'OPEN' && String(t.coin).toUpperCase() === String(symbol).toUpperCase())
    .reduce((sum, t) => sum + Number(t.marginUsedUsd || 0), 0);
}

function totalBotMarginUsed(trades) {
  return (trades.openTrades || [])
    .filter(t => t.status === 'OPEN')
    .reduce((sum, t) => sum + Number(t.marginUsedUsd || 0), 0);
}

function isActiveTradeStatus(status) {
  const s = String(status || '').toUpperCase();
  return s === 'OPEN' || s === 'PENDING_LIMIT';
}

function activeTradeExists(trades, symbol) {
  return (trades.openTrades || []).some(t => String(t.coin).toUpperCase() === String(symbol).toUpperCase() && isActiveTradeStatus(t.status));
}

function liveWalletNumbers() {
  const summary = state.walletLive?.summary || {};
  const available = pickNumber(summary.availableForRobo, summary.availableBalance, summary.netEquity) || 0;
  const equity = pickNumber(summary.netEquity, summary.availableBalance, summary.availableForRobo) || available;
  return {
    equity: money(equity),
    available: money(available),
    asset: summary.asset || 'USD',
    blockedMargin: money(pickNumber(summary.blockedMargin) || 0),
    orderMargin: money(pickNumber(summary.orderMargin) || 0),
    positionMargin: money(pickNumber(summary.positionMargin) || 0)
  };
}

function walletPctAllocation(settings, available) {
  const pct = Math.min(Math.max(Number(settings.liveWalletAllocationPct ?? 25), 1), 100);
  let allocation = money(Number(available || 0) * pct / 100);
  const hardCap = Number(settings.liveMaxBotAllocationUsd || 0);
  if (hardCap > 0) allocation = money(Math.min(allocation, hardCap));
  return allocation;
}

function effectiveBotAllocationUsd(settings = loadSettings()) {
  // LIVE mode: real Delta wallet controls allocation. No $10,000 fallback.
  if (!settings.paperTrade) {
    if (state.walletLive.status !== 'LIVE_WALLET') return 0;
    const wallet = liveWalletNumbers();
    return walletPctAllocation(settings, wallet.available);
  }

  // PAPER mode: use real Delta wallet as a reference if available, but never send real orders.
  // If wallet sync is unavailable, do not invent a $10,000 wallet. Use only the manual paper fallback allocation.
  if (settings.paperUseDeltaWalletReference !== false && state.walletLive.status === 'LIVE_WALLET') {
    const wallet = liveWalletNumbers();
    return walletPctAllocation(settings, wallet.available);
  }
  return money(Number(settings.maxBotAllocationUsd || DEFAULT_SETTINGS.maxBotAllocationUsd || 0));
}

function effectiveWallet(settings = loadSettings(), paperWallet = loadWallet()) {
  if (state.walletLive.status === 'LIVE_WALLET' && (!settings.paperTrade || settings.paperUseDeltaWalletReference !== false)) {
    const w = liveWalletNumbers();
    return {
      equity: w.equity,
      available: w.available,
      dailyPnl: 0,
      weeklyPnl: 0,
      monthlyPnl: 0,
      currency: w.asset,
      source: settings.paperTrade ? 'DELTA_WALLET_REFERENCE_PAPER' : 'DELTA_LIVE_WALLET',
      botUsableAmount: effectiveBotAllocationUsd(settings),
      walletSynced: true
    };
  }
  const configuredPaperAllocation = money(Number(settings.maxBotAllocationUsd || DEFAULT_SETTINGS.maxBotAllocationUsd || 0));
  const rawEquity = money(Number(paperWallet.equity || 0));
  const rawAvailable = money(Number(paperWallet.available || 0));
  // Paper mode must not be blocked just because the local paper wallet file is still zero.
  // Use the user's configured bot allocation as the paper fallback bankroll until a real wallet sync or manual wallet value exists.
  const fallbackNeeded = settings.paperTrade !== false && rawEquity <= 0 && rawAvailable <= 0 && configuredPaperAllocation > 0;
  const equity = fallbackNeeded ? configuredPaperAllocation : rawEquity;
  const available = fallbackNeeded ? configuredPaperAllocation : rawAvailable;
  return {
    ...paperWallet,
    equity,
    available,
    source: fallbackNeeded ? 'CONFIGURED_PAPER_ALLOCATION' : 'WALLET_NOT_SYNCED_MANUAL_PAPER_FALLBACK',
    message: fallbackNeeded
      ? 'Paper wallet file was zero; using configured bot allocation for paper execution.'
      : 'Delta wallet not synced. Showing manual paper fallback only; no real wallet funds are assumed.',
    botUsableAmount: configuredPaperAllocation,
    walletSynced: false
  };
}

function clampMarginByStopLoss(entry, sl, leverage, desiredMargin, maxStopLossUsd) {
  const riskPct = priceRiskPct(entry, sl);
  if (!riskPct) return { marginUsd: 0, stopLossUsd: 0, reason: 'Invalid stop distance' };
  const lev = Math.min(Math.max(Number(leverage || 1), 1), 25);
  const maxLoss = Math.max(0, Number(maxStopLossUsd || 3));
  const allowedMarginBySl = maxLoss > 0 ? maxLoss / (riskPct * lev) : desiredMargin;
  const marginUsd = Math.max(0, Math.min(Number(desiredMargin || 0), allowedMarginBySl));
  const stopLossUsd = marginUsd * lev * riskPct;
  return { marginUsd, stopLossUsd, allowedMarginBySl, reason: marginUsd <= 0 ? 'Stop loss cap leaves no valid margin' : '' };
}

function normalizeAssetSymbol(value) {
  if (!value) return '';
  if (typeof value === 'string') return value.toUpperCase();
  return String(value.symbol || value.asset_symbol || value.name || value.code || '').toUpperCase();
}

function productContractValue(product) {
  const candidates = [product?.contract_value, product?.contractValue, product?.contract_unit_value, product?.lot_size];
  for (const v of candidates) {
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

function productUnitSymbol(product) {
  return normalizeAssetSymbol(product?.contract_unit_currency || product?.contract_unit || product?.underlying_asset || product?.base_currency || product?.quoting_asset);
}

function estimateContractNotionalUsd(symbol, price, product = null) {
  const p = Number(price || 0);
  if (!p) return null;
  if (product) {
    const cv = productContractValue(product);
    if (cv) {
      const unit = productUnitSymbol(product);
      if (!unit || ['USD', 'USDT', 'USDC', 'USDE'].includes(unit)) return cv;
      if (unit === 'INR') return cv / 83;
      return cv * p;
    }
  }
  const fallbackBaseUnits = { BTCUSD: 0.001, ETHUSD: 0.01, SOLUSD: 1, BNBUSD: 0.01, XRPUSD: 1, ADAUSD: 1, AVAXUSD: 1, INJUSD: 1, APTUSD: 1 };
  const baseUnits = fallbackBaseUnits[String(symbol || '').toUpperCase()];
  return baseUnits ? baseUnits * p : null;
}

function calculateMarginPlan(rowOrProfile, settings, trades = loadTrades(), product = null, existingTrade = null, opts = {}) {
  const symbol = rowOrProfile.coin || rowOrProfile.symbol;
  const entry = Number(rowOrProfile.candidate?.entry || rowOrProfile.entry || rowOrProfile.price || 0);
  const sl = Number(rowOrProfile.candidate?.sl || rowOrProfile.sl || 0);
  const maxLev = Math.min(Math.max(Number(settings.maxLeverage || 25), 1), 25);
  const baseLev = Math.min(Math.max(Number(settings.defaultLeverage || 25), 1), maxLev);
  const cap = marginCapForSymbol(symbol, settings);
  const baseInitial = opts.addOn && Number(opts.addOnDesiredMargin || 0) > 0 ? Number(opts.addOnDesiredMargin) : (opts.addOn ? addOnStepForSymbol(symbol, settings) : initialMarginForSymbol(symbol, settings));
  const rawSizingMultiplier = opts.addOn ? 1 : Number(rowOrProfile.candidate?.sizingMultiplier || rowOrProfile.sizingMultiplier || 1);
  const maxSizingMultiplier = Math.min(Math.max(Number(settings.maxQualitySizeMultiplier || 2), 1), 5);
  const sizingMultiplier = Math.min(Math.max(Number.isFinite(rawSizingMultiplier) ? rawSizingMultiplier : 1, 1), maxSizingMultiplier);
  const currentCoinMargin = existingTrade ? Number(existingTrade.marginUsedUsd || 0) : plannedMarginUsedForCoin(trades, symbol);
  const remainingCoinCap = Math.max(0, cap - currentCoinMargin);
  const totalUsed = totalBotMarginUsed(trades) - (existingTrade ? Number(existingTrade.marginUsedUsd || 0) : 0);
  const botAllocationUsd = effectiveBotAllocationUsd(settings);
  const remainingBotAllocation = Math.max(0, botAllocationUsd - totalUsed - (existingTrade ? Number(existingTrade.marginUsedUsd || 0) : 0));
  const riskPct = priceRiskPct(entry, sl);
  const maxRiskUsd = effectiveRiskCapUsd(settings, botAllocationUsd);
  const target = profitTargetSettings(settings);

  let usedLeverage = baseLev;
  if (!opts.addOn && target.autoSizeToTargetProfit && target.targetFullTradeProfitUsd > 0 && target.autoUseMaxLeverageForProfitTarget) {
    usedLeverage = maxLev;
  }

  const perTradeInitial = Math.min(cap, money(baseInitial * sizingMultiplier));
  let targetNotionalUsd = 0;
  let targetMarginUsd = 0;
  if (!opts.addOn && riskPct > 0 && target.autoSizeToTargetProfit && target.targetFullTradeProfitUsd > 0) {
    targetNotionalUsd = target.targetFullTradeProfitUsd / Math.max(riskPct * target.plannedProfitR, 0.00000001);
    targetMarginUsd = targetNotionalUsd / Math.max(usedLeverage, 1);
  }

  let desiredMargin = Math.min(perTradeInitial, remainingCoinCap, remainingBotAllocation);
  if (targetMarginUsd > 0) {
    desiredMargin = Math.min(Math.max(perTradeInitial, targetMarginUsd), remainingCoinCap, remainingBotAllocation);
  }

  let marginUsd = 0;
  let notionalUsd = 0;
  let contractNotionalUsd = estimateContractNotionalUsd(symbol, entry, product);
  let liveOrderSize = null;
  let exchangeMarginUsd = 0;
  let blockedReason = '';
  let estimatedTp1ProfitUsd = 0;
  let estimatedTp2ProfitUsd = 0;
  let estimatedFullTradeProfitUsd = 0;
  let plannedProfitR = plannedExitRMultiple(settings);
  let profitTargetStatus = 'NOT_EVALUATED';

  if (!riskPct) blockedReason = 'Invalid technical stop distance';
  if (!blockedReason && desiredMargin <= 0) blockedReason = 'No remaining bot/coin margin allocation';
  if (!blockedReason && maxRiskUsd <= 0) blockedReason = 'Risk cap is zero; set wallet/risk settings first';

  if (!blockedReason) {
    // Technical SL is never tightened to fit risk. Position size is reduced instead.
    const riskLimitedMargin = maxRiskUsd / Math.max(riskPct * usedLeverage, 0.00000001);
    marginUsd = money(Math.min(desiredMargin, riskLimitedMargin));
    notionalUsd = money(marginUsd * usedLeverage);
  }

  if (!blockedReason && opts.live && product) {
    contractNotionalUsd = estimateContractNotionalUsd(symbol, entry, product);
    if (!contractNotionalUsd || contractNotionalUsd <= 0) blockedReason = 'Cannot estimate Delta contract notional from product specs';
    else {
      let size = Math.floor(notionalUsd / contractNotionalUsd);
      if (size < 1) {
        const minMarginAtMaxLev = contractNotionalUsd / maxLev;
        if (minMarginAtMaxLev <= Math.max(marginUsd, 0.000001) || minMarginAtMaxLev <= desiredMargin) {
          usedLeverage = Math.min(maxLev, Math.max(baseLev, Math.ceil(contractNotionalUsd / Math.max(marginUsd || desiredMargin, 0.000001))));
          const riskLimitedMargin = maxRiskUsd / Math.max(riskPct * usedLeverage, 0.00000001);
          marginUsd = money(Math.min(desiredMargin, riskLimitedMargin));
          notionalUsd = money(marginUsd * usedLeverage);
          size = Math.floor(notionalUsd / contractNotionalUsd);
        }
      }
      if (size < 1) blockedReason = `Minimum 1 Delta contract needs about $${money(contractNotionalUsd / Math.max(maxLev, 1))} margin at ${maxLev}x; risk budget/margin is too small`;
      else {
        liveOrderSize = size;
        notionalUsd = money(size * contractNotionalUsd);
        exchangeMarginUsd = money(notionalUsd / usedLeverage);
        const lossAtSl = money(notionalUsd * riskPct);
        if (exchangeMarginUsd > remainingCoinCap + 0.0001) blockedReason = `Order would use $${exchangeMarginUsd} margin; cap left is $${money(remainingCoinCap)}`;
        if (!blockedReason && exchangeMarginUsd > remainingBotAllocation + 0.0001) blockedReason = `Order would use $${exchangeMarginUsd} margin; bot allocation left is $${money(remainingBotAllocation)}`;
        if (!blockedReason && lossAtSl > maxRiskUsd + 0.0001) blockedReason = `Estimated SL loss $${lossAtSl} exceeds dynamic risk cap $${maxRiskUsd}`;
      }
    }
  }

  const effectiveNotionalUsd = opts.live && liveOrderSize ? notionalUsd : money(marginUsd * usedLeverage);
  const estimatedStopLossUsd = money(effectiveNotionalUsd * riskPct);
  const exitProfit = estimatedExitPlanProfit(effectiveNotionalUsd, riskPct, settings);
  estimatedTp1ProfitUsd = exitProfit.tp1ProfitUsd;
  estimatedTp2ProfitUsd = exitProfit.tp2ProfitUsd;
  estimatedFullTradeProfitUsd = exitProfit.fullTradeProfitUsd;
  plannedProfitR = exitProfit.plannedProfitR;

  if (!blockedReason && target.blockTinyProfitTrades && target.minFullTradeProfitUsd > 0 && estimatedFullTradeProfitUsd + 0.0001 < target.minFullTradeProfitUsd) {
    profitTargetStatus = 'BLOCKED_TINY_PROFIT';
    const neededRisk = money(target.minFullTradeProfitUsd / Math.max(target.plannedProfitR, 0.000001));
    blockedReason = `Projected full-trade profit $${estimatedFullTradeProfitUsd} is below minimum $${target.minFullTradeProfitUsd}. Full plan = TP1 partial + TP2 remaining (${target.plannedProfitR}R blended). Need about $${neededRisk} SL risk; raise allocation/margin/leverage or reduce SL distance.`;
  } else if (!blockedReason && target.minFullTradeProfitUsd > 0) {
    profitTargetStatus = estimatedFullTradeProfitUsd >= target.targetFullTradeProfitUsd ? 'TARGET_MET' : 'MINIMUM_MET';
  } else if (!blockedReason) {
    profitTargetStatus = 'NO_MINIMUM_CONFIGURED';
  }

  const minMargin = Number(settings.minEntryMarginUsd || 1);
  const allowed = !blockedReason && marginUsd >= minMargin && desiredMargin > 0 && estimatedStopLossUsd <= maxRiskUsd + 0.0001;
  if (!allowed && !blockedReason) {
    if (marginUsd < minMargin) blockedReason = `Margin after technical-SL risk sizing is below minimum $${minMargin}`;
    else blockedReason = 'Sizing guard blocked trade';
  }
  return {
    allowed,
    blockedReason,
    symbol,
    marginCapUsd: cap,
    desiredMarginUsd: money(desiredMargin),
    targetMarginUsd: money(targetMarginUsd),
    targetNotionalUsd: money(targetNotionalUsd),
    marginUsd: opts.live && liveOrderSize ? exchangeMarginUsd : marginUsd,
    notionalUsd: opts.live && liveOrderSize ? notionalUsd : money(marginUsd * usedLeverage),
    leverage: usedLeverage,
    estimatedStopLossUsd,
    estimatedTp1ProfitUsd,
    estimatedTp2ProfitUsd,
    estimatedFullTradeProfitUsd,
    plannedProfitR,
    minFullTradeProfitUsd: target.minFullTradeProfitUsd,
    targetFullTradeProfitUsd: target.targetFullTradeProfitUsd,
    minTargetProfitUsd: target.minFullTradeProfitUsd,
    targetProfitUsd: target.targetFullTradeProfitUsd,
    profitTargetStatus,
    remainingCoinCap: money(remainingCoinCap),
    remainingBotAllocation: money(remainingBotAllocation),
    botAllocationUsd: money(botAllocationUsd),
    liveOrderSize,
    contractNotionalUsd: contractNotionalUsd ? money(contractNotionalUsd) : null,
    maxStopLossUsd: Number(settings.maxStopLossUsd || 3),
    dynamicRiskCapUsd: maxRiskUsd,
    riskPercent: Number(settings.riskPercent || 0.5),
    sizingMultiplier,
    baseInitialMarginUsd: money(baseInitial),
    sizingMode: 'TECHNICAL_SL_FIRST_POSITION_SIZE_SECOND_PROFIT_TARGET_AWARE'
  };
}

function numberFrom(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function percentNumberFrom(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    const cleaned = value.trim().replace('%', '');
    if (!cleaned) return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  return numberFrom(value);
}

function seededNoise(symbol, tick, salt = 0) {
  const hash = crypto.createHash('sha1').update(`${symbol}:${tick}:${salt}`).digest();
  const v = hash.readUInt32BE(0) / 0xffffffff;
  return (v - 0.5) * 2;
}

function simulatedPriceFor(symbol, tick) {
  const base = BASE_PRICE[symbol] || 10;
  const wave = Math.sin((tick + symbol.length) / 7) * 0.004;
  const jitter = seededNoise(symbol, tick, 31) * 0.0025;
  return roundCoin(symbol, base * (1 + wave + jitter));
}

function extractTickerPrice(ticker, fallback) {
  if (!ticker) return fallback;
  const candidates = [ticker.mark_price, ticker.close, ticker.spot_price, ticker.last_price, ticker.price, ticker.quotes?.best_bid, ticker.quotes?.best_ask];
  for (const value of candidates) {
    const n = numberFrom(value);
    if (n && n > 0) return n;
  }
  return fallback;
}

function initializeMarket(settings) {
  for (const symbol of settings.assets) {
    if (!state.market[symbol]) {
      const price = BASE_PRICE[symbol] || 10;
      state.market[symbol] = {
        price,
        prevPrice: price,
        atr: price * 0.006,
        relVolume: 1,
        fundingRate: seededNoise(symbol, 1, 88) * 0.05,
        source: 'SIMULATED_FALLBACK'
      };
    }
    if (!Array.isArray(state.priceHistory[symbol]) || state.priceHistory[symbol].length < 180) {
      state.priceHistory[symbol] = [];
      for (let i = -260; i <= 0; i += 1) state.priceHistory[symbol].push(simulatedPriceFor(symbol, i));
    }
  }
}

function pushPriceHistory(symbol, price) {
  if (!Array.isArray(state.priceHistory[symbol])) state.priceHistory[symbol] = [];
  const n = Number(price);
  if (!Number.isFinite(n) || n <= 0) return state.priceHistory[symbol];
  state.priceHistory[symbol].push(n);
  state.priceHistory[symbol] = state.priceHistory[symbol].slice(-900);
  return state.priceHistory[symbol];
}

function emaSeries(values, length) {
  const nums = values.map(Number).filter(n => Number.isFinite(n));
  if (!nums.length) return [];
  const k = 2 / (Number(length || 1) + 1);
  const out = [nums[0]];
  for (let i = 1; i < nums.length; i += 1) out.push(nums[i] * k + out[i - 1] * (1 - k));
  return out;
}

function calculateMacd(values, settings) {
  const fast = Math.max(2, Math.floor(Number(settings.macdFastLength || 12)));
  const slow = Math.max(fast + 1, Math.floor(Number(settings.macdSlowLength || 26)));
  const signalLength = Math.max(2, Math.floor(Number(settings.macdSignalLength || 9)));
  const nums = values.map(Number).filter(n => Number.isFinite(n) && n > 0);
  if (nums.length < slow + signalLength) {
    return { ready: false, line: 0, signal: 0, histogram: 0, previousHistogram: 0, state: 'WARMING_UP' };
  }
  const fastEma = emaSeries(nums, fast);
  const slowEma = emaSeries(nums, slow);
  const macdLine = fastEma.map((v, i) => v - slowEma[i]);
  const signal = emaSeries(macdLine, signalLength);
  const i = macdLine.length - 1;
  const lineNow = macdLine[i];
  const signalNow = signal[signal.length - 1];
  const linePrev = macdLine[i - 1] ?? lineNow;
  const signalPrev = signal[signal.length - 2] ?? signalNow;
  const histNow = lineNow - signalNow;
  const histPrev = linePrev - signalPrev;
  return {
    ready: true,
    line: pct(lineNow),
    signal: pct(signalNow),
    histogram: pct(histNow),
    previousHistogram: pct(histPrev),
    state: histNow > 0 ? 'BULLISH' : histNow < 0 ? 'BEARISH' : 'NEUTRAL'
  };
}

function parseMaybeBool(value) {
  if (value === true || value === false) return value;
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    if (['true', 'yes', '1', 'pass', 'passed'].includes(v)) return true;
    if (['false', 'no', '0', 'fail', 'failed'].includes(v)) return false;
  }
  return null;
}

function webhookMacdOverride(webhook, direction) {
  const raw = webhook?.raw || {};
  const direct = parseMaybeBool(raw.macdConfirm ?? raw.macd_confirmation ?? raw.macdPass ?? raw.macd_pass);
  if (direct !== null) return { used: true, pass: direct, source: 'TRADINGVIEW_MACD_FLAG' };
  const line = numberFrom(raw.macdLine ?? raw.macd_line ?? raw.macd);
  const signal = numberFrom(raw.macdSignal ?? raw.macd_signal ?? raw.signalLine ?? raw.signal_line);
  const hist = numberFrom(raw.macdHistogram ?? raw.macd_histogram ?? raw.histogram ?? raw.hist);
  const prevHist = numberFrom(raw.macdPreviousHistogram ?? raw.macd_prev_histogram ?? raw.prevHistogram ?? raw.prev_hist);
  if (line === null || signal === null || hist === null) return { used: false };
  const pass = direction === 'LONG'
    ? line > signal && hist > 0 && (prevHist === null || hist >= prevHist)
    : direction === 'SHORT'
      ? line < signal && hist < 0 && (prevHist === null || hist <= prevHist)
      : false;
  return { used: true, pass, source: 'TRADINGVIEW_MACD_VALUES', line, signal, histogram: hist, previousHistogram: prevHist };
}

function macdPassForDirection(macd, direction) {
  if (!macd?.ready || (direction !== 'LONG' && direction !== 'SHORT')) return false;
  if (direction === 'LONG') return macd.line > macd.signal && macd.histogram > 0 && macd.histogram >= macd.previousHistogram;
  return macd.line < macd.signal && macd.histogram < 0 && macd.histogram <= macd.previousHistogram;
}



function rmaSeries(values, length) {
  const nums = values.map(Number);
  const out = [];
  const alpha = 1 / Math.max(1, Number(length || 1));
  let prev = null;
  for (const v of nums) {
    const n = Number.isFinite(v) ? v : 0;
    prev = prev === null ? n : (prev * (1 - alpha)) + (n * alpha);
    out.push(prev);
  }
  return out;
}

function syntheticOhlcFromCloses(closes, atr = 0) {
  const a = Math.max(Number(atr || 0), Number(closes[closes.length - 1] || 0) * 0.001);
  return closes.map((c, i) => {
    const prev = i ? closes[i - 1] : c;
    const body = Math.abs(c - prev);
    const wick = Math.max(a * 0.08, body * 0.25);
    return {
      open: prev,
      high: Math.max(prev, c) + wick,
      low: Math.min(prev, c) - wick,
      close: c
    };
  });
}

function calculateAdxFromOhlc(ohlc, length = 14) {
  if (!Array.isArray(ohlc) || ohlc.length < length + 3) return { ready: false, adx: 0, plusDi: 0, minusDi: 0 };
  const tr = [0];
  const plusDM = [0];
  const minusDM = [0];
  for (let i = 1; i < ohlc.length; i += 1) {
    const cur = ohlc[i];
    const prev = ohlc[i - 1];
    const upMove = cur.high - prev.high;
    const downMove = prev.low - cur.low;
    plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
    tr.push(Math.max(cur.high - cur.low, Math.abs(cur.high - prev.close), Math.abs(cur.low - prev.close)));
  }
  const atrRma = rmaSeries(tr, length);
  const plusRma = rmaSeries(plusDM, length);
  const minusRma = rmaSeries(minusDM, length);
  const dx = atrRma.map((atr, i) => {
    if (!atr) return 0;
    const plus = 100 * plusRma[i] / atr;
    const minus = 100 * minusRma[i] / atr;
    const denom = plus + minus;
    return denom ? 100 * Math.abs(plus - minus) / denom : 0;
  });
  const adx = rmaSeries(dx, length);
  const i = ohlc.length - 1;
  const atr = atrRma[i] || 0;
  return {
    ready: true,
    adx: pct(adx[i] || 0),
    plusDi: atr ? pct(100 * plusRma[i] / atr) : 0,
    minusDi: atr ? pct(100 * minusRma[i] / atr) : 0
  };
}

function calculateParabolicSar(ohlc, step = 0.02, maxStep = 0.2) {
  if (!Array.isArray(ohlc) || ohlc.length < 5) return [];
  const inc = Math.min(Math.max(Number(step || 0.02), 0.001), 0.2);
  const maxAf = Math.min(Math.max(Number(maxStep || 0.2), inc), 1);
  const out = new Array(ohlc.length).fill(null);
  let long = ohlc[1].close >= ohlc[0].close;
  let af = inc;
  let ep = long ? Math.max(ohlc[0].high, ohlc[1].high) : Math.min(ohlc[0].low, ohlc[1].low);
  let sar = long ? Math.min(ohlc[0].low, ohlc[1].low) : Math.max(ohlc[0].high, ohlc[1].high);
  out[1] = sar;
  for (let i = 2; i < ohlc.length; i += 1) {
    sar = sar + af * (ep - sar);
    if (long) {
      sar = Math.min(sar, ohlc[i - 1].low, ohlc[i - 2].low);
      if (ohlc[i].low < sar) {
        long = false;
        sar = ep;
        ep = ohlc[i].low;
        af = inc;
      } else if (ohlc[i].high > ep) {
        ep = ohlc[i].high;
        af = Math.min(maxAf, af + inc);
      }
    } else {
      sar = Math.max(sar, ohlc[i - 1].high, ohlc[i - 2].high);
      if (ohlc[i].high > sar) {
        long = true;
        sar = ep;
        ep = ohlc[i].high;
        af = inc;
      } else if (ohlc[i].low < ep) {
        ep = ohlc[i].low;
        af = Math.min(maxAf, af + inc);
      }
    }
    out[i] = sar;
  }
  return out;
}

function calculateMacdRaw(values, settings) {
  const nums = values.map(Number).filter(n => Number.isFinite(n) && n > 0);
  const fast = Math.max(2, Math.floor(Number(settings.macdFastLength || 12)));
  const slow = Math.max(fast + 1, Math.floor(Number(settings.macdSlowLength || 26)));
  const signalLength = Math.max(2, Math.floor(Number(settings.macdSignalLength || 9)));
  if (nums.length < slow + signalLength + 3) return { ready: false, line: 0, signal: 0, hist: 0, prevHist: 0, lineSeries: [], signalSeries: [], histSeries: [] };
  const fastEma = emaSeries(nums, fast);
  const slowEma = emaSeries(nums, slow);
  const macdLine = fastEma.map((v, i) => v - slowEma[i]);
  const signal = emaSeries(macdLine, signalLength);
  const histSeries = macdLine.map((v, i) => v - signal[i]);
  const i = nums.length - 1;
  return {
    ready: true,
    line: macdLine[i],
    signal: signal[i],
    hist: histSeries[i],
    prevHist: histSeries[i - 1] ?? histSeries[i],
    lineSeries: macdLine,
    signalSeries: signal,
    histSeries
  };
}

function downsampleCloses(values, factor) {
  const f = Math.max(1, Math.floor(Number(factor || 1)));
  const nums = (values || []).map(Number).filter(n => Number.isFinite(n) && n > 0);
  if (f === 1) return nums.slice();
  const out = [];
  for (let i = f - 1; i < nums.length; i += f) out.push(nums[i]);
  if (nums.length && out[out.length - 1] !== nums[nums.length - 1]) out.push(nums[nums.length - 1]);
  return out;
}

function latestEma(values, length) {
  const series = emaSeries(values, length);
  return series.length ? series[series.length - 1] : null;
}

function findPivots(values, left = 3, right = 3, type = 'low') {
  const nums = (values || []).map(Number);
  const out = [];
  for (let i = left; i < nums.length - right; i += 1) {
    const v = nums[i];
    if (!Number.isFinite(v)) continue;
    let ok = true;
    for (let j = i - left; j <= i + right; j += 1) {
      if (j === i) continue;
      const other = nums[j];
      if (!Number.isFinite(other)) { ok = false; break; }
      if (type === 'low' && v > other) { ok = false; break; }
      if (type === 'high' && v < other) { ok = false; break; }
    }
    if (ok) out.push({ index: i, value: v });
  }
  return out;
}

function histogramChangedColor(histSeries, startIndex, endIndex) {
  const slice = (histSeries || []).slice(Math.max(0, startIndex), Math.max(startIndex + 1, endIndex + 1)).filter(Number.isFinite);
  let last = 0;
  for (const h of slice) {
    const sign = h > 0 ? 1 : h < 0 ? -1 : 0;
    if (sign && last && sign !== last) return true;
    if (sign) last = sign;
  }
  return false;
}

function zeroSideHeld(lineSeries, signalSeries, startIndex, endIndex, direction) {
  const start = Math.max(0, startIndex);
  const end = Math.min((lineSeries || []).length - 1, Math.max(start, endIndex));
  for (let i = start; i <= end; i += 1) {
    const line = lineSeries[i];
    const sig = signalSeries[i];
    if (!Number.isFinite(line) || !Number.isFinite(sig)) return false;
    if (direction === 'LONG' && !(line < 0 && sig < 0)) return false;
    if (direction === 'SHORT' && !(line > 0 && sig > 0)) return false;
  }
  return true;
}

function calculateMacdDivergenceMtfLocal(symbol, history, price, atr, settings) {
  const candles5 = getCachedCandles(symbol, '5m');
  const candles15 = getCachedCandles(symbol, '15m');
  const candles1h = getCachedCandles(symbol, '1h');
  const liveCloses = candles5.map(c => c.close).filter(n => Number.isFinite(n) && n > 0);
  const closes = liveCloses.length ? liveCloses : (history || []).map(Number).filter(n => Number.isFinite(n) && n > 0);
  const highs = candles5.length ? candles5.map(c => c.high).filter(n => Number.isFinite(n) && n > 0) : closes;
  const lows = candles5.length ? candles5.map(c => c.low).filter(n => Number.isFinite(n) && n > 0) : closes;
  const p = Number(price || closes[closes.length - 1]);
  const a = Math.max(Number(atr || 0), p * 0.002);
  const emaLen = Math.min(Math.max(Math.floor(Number(settings.mtfEmaPeriod || settings.emaPeriod || 50)), 5), 200);
  const left = Math.min(Math.max(Math.floor(Number(settings.divergencePivotLeft || 3)), 1), 10);
  const right = Math.min(Math.max(Math.floor(Number(settings.divergencePivotRight || 3)), 1), 10);
  const lookback = Math.min(Math.max(Math.floor(Number(settings.divergenceLookback || 60)), 12), 180);
  const entryWindow = Math.min(Math.max(Math.floor(Number(settings.entrySignalWindowCandles || 3)), 1), 12);
  const histLookback = Math.min(Math.max(Math.floor(Number(settings.histColorLookback || 6)), 2), 30);
  const entryModel = String(settings.entryModel || 'PRACTICAL_MTF_MACD').toUpperCase() === 'STRICT_TRANSCRIPT_DIVERGENCE'
    ? 'STRICT_TRANSCRIPT_DIVERGENCE'
    : 'PRACTICAL_MTF_MACD';
  const strictMode = entryModel === 'STRICT_TRANSCRIPT_DIVERGENCE';
  const requireDivergenceForEntry = strictMode || settings.requireDivergenceForEntry === true;
  const zeroLineModeRaw = String(settings.zeroLineMode || (strictMode ? 'hard' : 'soft')).toLowerCase();
  const zeroLineMode = strictMode ? 'hard' : (zeroLineModeRaw === 'hard' ? 'hard' : 'soft');
  const minBars = Math.max(Number(settings.macdSlowLength || 26) + Number(settings.macdSignalLength || 9) + 20, lookback + left + right + 10);
  if (closes.length < minBars) {
    return { ready: false, pass: false, entrySide: '', source: 'DELTA_OHLC_MACD_DIVERGENCE_MTF_EMA', entryModel, reason: `Need ${minBars} closed 5m candles for MACD/MTF warmup`, localApproximation: !liveCloses.length };
  }

  const ema15Source = candles15.length >= emaLen ? candles15.map(c => c.close) : downsampleCloses(closes, 3);
  const ema1hSource = candles1h.length >= emaLen ? candles1h.map(c => c.close) : downsampleCloses(closes, 12);
  const ema15 = latestEma(ema15Source, emaLen);
  const ema1h = latestEma(ema1hSource, emaLen);
  const emaGapPct = ema1h ? Math.abs(ema15 - ema1h) / ema1h * 100 : 0;
  const minGap = Math.max(0, Number(settings.minEmaGapPct || 0));
  const longTrend = Number.isFinite(ema15) && Number.isFinite(ema1h) && ema15 > ema1h && emaGapPct >= minGap;
  const shortTrend = Number.isFinite(ema15) && Number.isFinite(ema1h) && ema15 < ema1h && emaGapPct >= minGap;

  const macd = calculateMacdRaw(closes, settings);
  if (!macd.ready || !macd.lineSeries.length || !macd.signalSeries.length) {
    return { ready: false, pass: false, entrySide: '', source: 'DELTA_OHLC_MACD_DIVERGENCE_MTF_EMA', entryModel, reason: 'MACD 12/26/9 warming up' };
  }

  const i = closes.length - 1;
  const searchFrom = Math.max(0, i - lookback);
  const lowPivots = findPivots(lows, left, right, 'low').filter(x => x.index >= searchFrom);
  const highPivots = findPivots(highs, left, right, 'high').filter(x => x.index >= searchFrom);
  const lastTwoLows = lowPivots.slice(-2);
  const lastTwoHighs = highPivots.slice(-2);
  const buffer = a * Math.min(Math.max(Number(settings.slBufferAtrMult ?? 0.25), 0), 2);
  const minDistance = a * Math.min(Math.max(Number(settings.minSlAtrMult || 0.6), 0.05), 5);
  const maxDistance = a * Math.min(Math.max(Number(settings.maxTechnicalSlAtrMult || 6), 2), 20);
  const minMacdMove = Math.max(Math.abs(p) * Math.max(0, Number(settings.minDivergenceMacdPct || 0.00001)), 0);
  const swingLookback = Math.min(Math.max(Math.floor(Number(settings.slSwingLookback || 24)), 6), 120);

  function recentCrossover(direction) {
    const from = Math.max(1, i - entryWindow + 1);
    for (let idx = i; idx >= from; idx -= 1) {
      const prevLine = macd.lineSeries[idx - 1];
      const prevSig = macd.signalSeries[idx - 1];
      const line = macd.lineSeries[idx];
      const sig = macd.signalSeries[idx];
      if (![prevLine, prevSig, line, sig].every(Number.isFinite)) continue;
      if (direction === 'LONG' && prevLine <= prevSig && line > sig) return { ok: true, index: idx, barsAgo: i - idx };
      if (direction === 'SHORT' && prevLine >= prevSig && line < sig) return { ok: true, index: idx, barsAgo: i - idx };
    }
    return { ok: false, index: null, barsAgo: null };
  }

  function histChangedRecent() {
    return histogramChangedColor(macd.histSeries, Math.max(0, i - histLookback), i);
  }

  function recentSwing(direction) {
    const start = Math.max(0, (direction === 'LONG' ? lows.length : highs.length) - swingLookback);
    const slice = direction === 'LONG' ? lows.slice(start) : highs.slice(start);
    if (!slice.length) return p;
    return direction === 'LONG' ? Math.min(...slice) : Math.max(...slice);
  }

  function finishPlan(direction, rawSwing, trendOk, divergenceOk, divergence, baseConditions, detail) {
    let rawSl = direction === 'LONG' ? rawSwing - buffer : rawSwing + buffer;
    if (direction === 'LONG') {
      if (p - rawSl < minDistance) rawSl = p - minDistance;
      if (p - rawSl > maxDistance) rawSl = p - maxDistance;
    } else {
      if (rawSl - p < minDistance) rawSl = p + minDistance;
      if (rawSl - p > maxDistance) rawSl = p + maxDistance;
    }
    const sl = roundCoin(symbol, rawSl);
    const risk = Math.abs(p - sl);
    const tp2 = roundCoin(symbol, direction === 'LONG' ? p + risk * 2 : p - risk * 2);
    const tp1 = roundCoin(symbol, direction === 'LONG' ? p + risk * Math.max(1, Number(settings.tp1TriggerR || 1)) : p - risk * Math.max(1, Number(settings.tp1TriggerR || 1)));
    return { sl, tp1, tp2, invalidationLevel: sl, divergence, conditions: { ...baseConditions, [direction === 'LONG' ? 'longTrend' : 'shortTrend']: trendOk, divergenceOk }, detail };
  }

  function strictLong() {
    if (lastTwoLows.length < 2) return { pass: false, conditions: { longTrend, zeroOk: false, histColorChange: false, crossover: false, divergenceOk: false }, detail: 'waiting for two confirmed swing lows' };
    const [aLow, bLow] = lastTwoLows;
    const priceLowerLow = bLow.value < aLow.value;
    const macdHigherLow = macd.lineSeries[bLow.index] > macd.lineSeries[aLow.index] + minMacdMove;
    const zeroOk = zeroSideHeld(macd.lineSeries, macd.signalSeries, aLow.index, i, 'LONG');
    const histColorChange = histogramChangedColor(macd.histSeries, aLow.index, i);
    const cross = recentCrossover('LONG');
    const crossover = cross.ok && cross.barsAgo === 0;
    const divergenceOk = priceLowerLow && macdHigherLow;
    const pass = longTrend && divergenceOk && zeroOk && histColorChange && crossover;
    const div = { first: aLow, second: bLow, priceFirst: roundCoin(symbol, aLow.value), priceSecond: roundCoin(symbol, bLow.value), macdFirst: pct(macd.lineSeries[aLow.index]), macdSecond: pct(macd.lineSeries[bLow.index]) };
    const plan = finishPlan('LONG', Math.min(aLow.value, bLow.value), longTrend, divergenceOk, div, { priceLowerLow, macdHigherLow, zeroOk, histColorChange, crossover, recentCrossover: cross.ok, crossBarsAgo: cross.barsAgo }, `STRICT longTrend=${longTrend} priceLL=${priceLowerLow} macdHL=${macdHigherLow} zeroBelow=${zeroOk} histColorChange=${histColorChange} bullishCross=${crossover}`);
    return { pass, ...plan };
  }

  function strictShort() {
    if (lastTwoHighs.length < 2) return { pass: false, conditions: { shortTrend, zeroOk: false, histColorChange: false, crossover: false, divergenceOk: false }, detail: 'waiting for two confirmed swing highs' };
    const [aHigh, bHigh] = lastTwoHighs;
    const priceHigherHigh = bHigh.value > aHigh.value;
    const macdLowerHigh = macd.lineSeries[bHigh.index] < macd.lineSeries[aHigh.index] - minMacdMove;
    const zeroOk = zeroSideHeld(macd.lineSeries, macd.signalSeries, aHigh.index, i, 'SHORT');
    const histColorChange = histogramChangedColor(macd.histSeries, aHigh.index, i);
    const cross = recentCrossover('SHORT');
    const crossover = cross.ok && cross.barsAgo === 0;
    const divergenceOk = priceHigherHigh && macdLowerHigh;
    const pass = shortTrend && divergenceOk && zeroOk && histColorChange && crossover;
    const div = { first: aHigh, second: bHigh, priceFirst: roundCoin(symbol, aHigh.value), priceSecond: roundCoin(symbol, bHigh.value), macdFirst: pct(macd.lineSeries[aHigh.index]), macdSecond: pct(macd.lineSeries[bHigh.index]) };
    const plan = finishPlan('SHORT', Math.max(aHigh.value, bHigh.value), shortTrend, divergenceOk, div, { priceHigherHigh, macdLowerHigh, zeroOk, histColorChange, crossover, recentCrossover: cross.ok, crossBarsAgo: cross.barsAgo }, `STRICT shortTrend=${shortTrend} priceHH=${priceHigherHigh} macdLH=${macdLowerHigh} zeroAbove=${zeroOk} histColorChange=${histColorChange} bearishCross=${crossover}`);
    return { pass, ...plan };
  }

  const strictL = strictLong();
  const strictS = strictShort();

  function practicalLong() {
    const cross = recentCrossover('LONG');
    const histColorChange = histChangedRecent();
    const zeroOk = zeroSideHeld(macd.lineSeries, macd.signalSeries, Math.max(0, i - histLookback), i, 'LONG');
    const divergenceOk = Boolean(strictL.conditions?.priceLowerLow && strictL.conditions?.macdHigherLow);
    const zeroPass = zeroLineMode === 'hard' ? zeroOk : true;
    const divPass = requireDivergenceForEntry ? divergenceOk : true;
    const pass = longTrend && histColorChange && cross.ok && zeroPass && divPass;
    const plan = finishPlan('LONG', recentSwing('LONG'), longTrend, divergenceOk, strictL.divergence || null, {
      priceLowerLow: Boolean(strictL.conditions?.priceLowerLow),
      macdHigherLow: Boolean(strictL.conditions?.macdHigherLow),
      zeroOk,
      zeroPass,
      histColorChange,
      crossover: cross.ok,
      recentCrossover: cross.ok,
      crossBarsAgo: cross.barsAgo,
      practicalTrigger: true
    }, `PRACTICAL longTrend=${longTrend} histColorChange=${histColorChange} bullishCrossRecent=${cross.ok}${cross.ok ? `(${cross.barsAgo} bars ago)` : ''} zeroBelow=${zeroOk}${zeroLineMode === 'hard' ? ' hard' : ' soft'} divergence=${divergenceOk}${requireDivergenceForEntry ? ' required' : ' optional'}`);
    return { pass, ...plan };
  }

  function practicalShort() {
    const cross = recentCrossover('SHORT');
    const histColorChange = histChangedRecent();
    const zeroOk = zeroSideHeld(macd.lineSeries, macd.signalSeries, Math.max(0, i - histLookback), i, 'SHORT');
    const divergenceOk = Boolean(strictS.conditions?.priceHigherHigh && strictS.conditions?.macdLowerHigh);
    const zeroPass = zeroLineMode === 'hard' ? zeroOk : true;
    const divPass = requireDivergenceForEntry ? divergenceOk : true;
    const pass = shortTrend && histColorChange && cross.ok && zeroPass && divPass;
    const plan = finishPlan('SHORT', recentSwing('SHORT'), shortTrend, divergenceOk, strictS.divergence || null, {
      priceHigherHigh: Boolean(strictS.conditions?.priceHigherHigh),
      macdLowerHigh: Boolean(strictS.conditions?.macdLowerHigh),
      zeroOk,
      zeroPass,
      histColorChange,
      crossover: cross.ok,
      recentCrossover: cross.ok,
      crossBarsAgo: cross.barsAgo,
      practicalTrigger: true
    }, `PRACTICAL shortTrend=${shortTrend} histColorChange=${histColorChange} bearishCrossRecent=${cross.ok}${cross.ok ? `(${cross.barsAgo} bars ago)` : ''} zeroAbove=${zeroOk}${zeroLineMode === 'hard' ? ' hard' : ' soft'} divergence=${divergenceOk}${requireDivergenceForEntry ? ' required' : ' optional'}`);
    return { pass, ...plan };
  }

  const long = strictMode ? strictL : practicalLong();
  const short = strictMode ? strictS : practicalShort();
  const entrySide = long.pass ? 'LONG' : short.pass ? 'SHORT' : '';
  const chosen = entrySide === 'LONG' ? long : entrySide === 'SHORT' ? short : (longTrend ? long : shortTrend ? short : long);
  const reason = entrySide
    ? `${entryModel} ${entrySide} confirmed on closed 5m Delta OHLC; EMA50(15m)=${roundCoin(symbol, ema15)} EMA50(1h)=${roundCoin(symbol, ema1h)} gap=${pct(emaGapPct)}%; ${chosen.detail}; SL=${chosen.sl} TP=${chosen.tp2}`
    : `WAIT ${entryModel}; EMA50(15m)=${roundCoin(symbol, ema15)} EMA50(1h)=${roundCoin(symbol, ema1h)} gap=${pct(emaGapPct)}%; long: ${long.detail}; short: ${short.detail}`;

  return {
    ready: true,
    pass: Boolean(entrySide),
    entrySide,
    entryModel,
    strictMode,
    requireDivergenceForEntry,
    zeroLineMode,
    entrySignalWindowCandles: entryWindow,
    histColorLookback: histLookback,
    source: liveCloses.length ? 'DELTA_OHLC_MACD_DIVERGENCE_MTF_EMA' : 'LOCAL_FALLBACK_MACD_DIVERGENCE_MTF_EMA',
    ema15: roundCoin(symbol, ema15),
    ema1h: roundCoin(symbol, ema1h),
    emaGapPct: pct(emaGapPct),
    macdLine: pct(macd.line),
    macdSignal: pct(macd.signal),
    macdHistogram: pct(macd.hist),
    macdPreviousHistogram: pct(macd.prevHist),
    long,
    short,
    strictLong: strictL,
    strictShort: strictS,
    invalidationLevel: chosen?.sl || null,
    tp1: chosen?.tp1 || null,
    tp2: chosen?.tp2 || null,
    divergence: chosen?.divergence || null,
    conditions: chosen?.conditions || {},
    reason,
    localApproximation: !liveCloses.length
  };
}

function calculateSarMacdPullbackLocal(symbol, history, price, atr, settings) {
  if (settings.sarMacdModuleEnabled === false || settings.sarMacdAllowLocalEntry === false) return null;
  const closes = (history || []).map(Number).filter(n => Number.isFinite(n) && n > 0);
  const emaLen = Math.min(Math.max(Math.floor(Number(settings.sarMacdEmaPeriod || settings.emaPeriod || 200)), 50), 260);
  const minBars = Math.min(240, Math.max(emaLen + 20, 90));
  const p = Number(price || closes[closes.length - 1]);
  const a = Math.max(Number(atr || 0), p * 0.002);
  if (closes.length < minBars) {
    return { ready: false, pass: false, entrySide: '', source: 'LOCAL_EMA200_SAR_MACD', reason: `Need ${minBars} prices for EMA${emaLen}/SAR/MACD warmup` };
  }
  const ohlc = syntheticOhlcFromCloses(closes, a);
  const ema = emaSeries(closes, emaLen);
  const emaNow = ema[ema.length - 1];
  const emaPrev = ema[Math.max(0, ema.length - 8)] || emaNow;
  const emaSlopePct = emaPrev ? ((emaNow - emaPrev) / emaPrev) * 100 : 0;
  const adx = calculateAdxFromOhlc(ohlc, 14);
  const sar = calculateParabolicSar(ohlc, settings.sarMacdSarStep, settings.sarMacdSarMax);
  const i = closes.length - 1;
  const sarNow = sar[i];
  const sarPrev = sar[i - 1];
  const closePrev = closes[i - 1];
  const macdRaw = calculateMacdRaw(closes, settings);
  const histSeries = macdRaw.histSeries || [];
  const lookback = Math.min(Math.max(Math.floor(Number(settings.sarMacdPullbackLookback || 8)), 3), 20);
  const recentHist = histSeries.slice(-lookback).filter(Number.isFinite);
  const histAbsAvg = average(histSeries.slice(-60).map(Math.abs).filter(Number.isFinite)) || Math.max(a * 0.03, p * 0.0002);
  const neutralBand = histAbsAvg * 0.55;
  const longTrend = p > emaNow && emaSlopePct >= -0.03;
  const shortTrend = p < emaNow && emaSlopePct <= 0.03;
  const adxThreshold = Math.min(Math.max(Number(settings.sarMacdAdxThreshold || 18), 5), 60);
  const adxPass = adx.ready && adx.adx >= adxThreshold;
  const longPullback = recentHist.some(h => h <= neutralBand) && Math.abs(macdRaw.hist) <= histAbsAvg * 1.8;
  const shortPullback = recentHist.some(h => h >= -neutralBand) && Math.abs(macdRaw.hist) <= histAbsAvg * 1.8;
  const sarFlipLong = Number.isFinite(sarNow) && Number.isFinite(sarPrev) && sarPrev >= closePrev && sarNow < p;
  const sarFlipShort = Number.isFinite(sarNow) && Number.isFinite(sarPrev) && sarPrev <= closePrev && sarNow > p;
  const distanceAtr = a ? Math.abs(p - emaNow) / a : 999;
  const maxDistanceAtr = Math.min(Math.max(Number(settings.sarMacdMaxDistanceAtr || 3.2), 0.5), 12);
  const notLate = settings.sarMacdBlockLateMomentum === false || distanceAtr <= maxDistanceAtr;
  const swingLookback = Math.min(Math.max(Math.floor(Number(settings.sarMacdSwingLookback || settings.slSwingLookback || 18)), 8), 80);
  const recent = closes.slice(-swingLookback);
  const buffer = a * Math.min(Math.max(Number(settings.sarMacdEmaStopBufferAtr ?? settings.slBufferAtrMult ?? 0.12), 0), 1);
  const minDistance = a * Math.min(Math.max(Number(settings.minSlAtrMult || 0.6), 0.1), 3);
  const maxDistance = a * Math.min(Math.max(Number(settings.maxTechnicalSlAtrMult || 6), 2), 20);

  function stopFor(dir) {
    if (dir === 'LONG') {
      const swing = recent.length ? Math.min(...recent) : p - a * 2;
      let raw = Math.max(swing - buffer, emaNow - buffer);
      if (raw >= p) raw = Math.min(swing - buffer, p - minDistance);
      if (p - raw < minDistance) raw = p - minDistance;
      if (p - raw > maxDistance) raw = p - maxDistance;
      return roundCoin(symbol, raw);
    }
    const swing = recent.length ? Math.max(...recent) : p + a * 2;
    let raw = Math.min(swing + buffer, emaNow + buffer);
    if (raw <= p) raw = Math.max(swing + buffer, p + minDistance);
    if (raw - p < minDistance) raw = p + minDistance;
    if (raw - p > maxDistance) raw = p + maxDistance;
    return roundCoin(symbol, raw);
  }

  const longPass = longTrend && adxPass && longPullback && sarFlipLong && notLate;
  const shortPass = shortTrend && adxPass && shortPullback && sarFlipShort && notLate;
  const entrySide = longPass ? 'LONG' : shortPass ? 'SHORT' : '';
  const invalidationLevel = entrySide ? stopFor(entrySide) : null;
  const trendText = `EMA${emaLen}=${roundCoin(symbol, emaNow)} slope=${pct(emaSlopePct)}% ADX=${adx.adx}`;
  const reason = entrySide
    ? `EMA${emaLen} ${entrySide} trend + MACD pullback/white zone + SAR continuation flip confirmed; ${trendText}; distance=${pct(distanceAtr)}ATR; SL=${invalidationLevel}`
    : `WAIT EMA/SAR/MACD: longTrend=${longTrend} shortTrend=${shortTrend} ADX=${adx.adx}/${adxThreshold} longPullback=${longPullback} shortPullback=${shortPullback} sarFlipLong=${sarFlipLong} sarFlipShort=${sarFlipShort} notLate=${notLate} distance=${pct(distanceAtr)}ATR`;
  return {
    ready: true,
    pass: Boolean(entrySide),
    entrySide,
    source: 'LOCAL_EMA200_SAR_MACD',
    ema: roundCoin(symbol, emaNow),
    emaSlopePct: pct(emaSlopePct),
    adx: adx.adx,
    plusDi: adx.plusDi,
    minusDi: adx.minusDi,
    sar: Number.isFinite(sarNow) ? roundCoin(symbol, sarNow) : null,
    macdHistogram: pct(macdRaw.hist),
    macdPreviousHistogram: pct(macdRaw.prevHist),
    macdNeutralBand: pct(neutralBand),
    distanceAtr: pct(distanceAtr),
    invalidationLevel,
    trendText,
    reason,
    localApproximation: true
  };
}

function isSarMacdWebhook(raw = {}) {
  const keys = Object.keys(raw || {}).map(k => k.toLowerCase());
  const sourceText = String(raw.strategy || raw.module || raw.indicator || raw.signalName || raw.signal_name || raw.alertName || raw.alert_name || raw.signal || '').toLowerCase();
  if (sourceText.includes('sar') && (sourceText.includes('macd') || sourceText.includes('ema'))) return true;
  if (sourceText.includes('parabolic') || sourceText.includes('cm_macd') || sourceText.includes('ema200')) return true;
  return keys.some(k => k.includes('sar') || k.includes('ema200') || k.includes('macdzone') || k.includes('discountzone') || k === 'el' || k === 'sl_label');
}

function webhookSarMacdSignal(symbol, webhook, settings) {
  const raw = webhook?.raw || {};
  if (!webhook || !isSarMacdWebhook(raw)) return null;
  const label = String(webhookField(raw, ['entryLabel', 'entry_label', 'label', 'signalLabel', 'signal_label', 'signal']) || '').trim().toUpperCase();
  const compactLabel = label.replace(/[^A-Z]/g, '');
  // EL = Exit Long, ES = Exit Short. They must never become entries. SL is stop-loss, not short.
  const labelSide = compactLabel === 'LE' || ['ENTER LONG', 'ENTRY LONG', 'LONG ENTRY', 'LONG', 'BUY'].includes(label) ? 'LONG' : compactLabel === 'SE' || ['ENTER SHORT', 'ENTRY SHORT', 'SHORT ENTRY', 'SHORT', 'SELL'].includes(label) ? 'SHORT' : 'WAIT';
  const side = webhook.side || labelSide;
  const direction = side === 'LONG' || side === 'SHORT' ? side : 'WAIT';
  const expectedTrend = directionToTrend(direction);
  const emaTrend = normalizeTrendValue(webhookField(raw, ['emaTrend', 'ema_trend', 'ema200Trend', 'ema_200_trend', 'trend']));
  const priceAboveEma = parseMaybeBool(webhookField(raw, ['priceAboveEma200', 'price_above_ema200', 'aboveEma200', 'above_ema_200']));
  const priceBelowEma = parseMaybeBool(webhookField(raw, ['priceBelowEma200', 'price_below_ema200', 'belowEma200', 'below_ema_200']));
  const sarFlip = parseMaybeBool(webhookField(raw, ['sarFlip', 'sar_flip', 'psarFlip', 'psar_flip', 'parabolicSarFlip', 'parabolic_sar_flip']));
  const macdZone = parseMaybeBool(webhookField(raw, ['macdWhiteZone', 'macd_white_zone', 'macdDiscountZone', 'macd_discount_zone', 'discountZone', 'discount_zone', 'pullbackZone', 'pullback_zone']));
  const lateMomentum = parseMaybeBool(webhookField(raw, ['lateMomentum', 'late_momentum', 'overextended', 'overExtended']));
  const adx = numberFrom(webhookField(raw, ['adx', 'adxValue', 'adx_value']));
  const adxThreshold = Math.min(Math.max(Number(settings.sarMacdAdxThreshold || 18), 5), 60);
  const invalidation = numberFrom(webhookField(raw, ['invalidationLevel', 'invalidation_level', 'sl', 'stopLoss', 'stop_loss']));
  const tp1 = numberFrom(webhookField(raw, ['tp1', 'takeProfit1', 'take_profit_1']));
  const tp2 = numberFrom(webhookField(raw, ['tp2', 'takeProfit2', 'take_profit_2']));
  const trendPass = direction === 'LONG'
    ? (emaTrend ? emaTrend === 'BULLISH' : priceAboveEma !== false)
    : direction === 'SHORT'
      ? (emaTrend ? emaTrend === 'BEARISH' : priceBelowEma !== false)
      : false;
  const adxPass = adx === null || adx >= adxThreshold;
  const sarPass = sarFlip === null || sarFlip === true;
  const macdPass = macdZone === null || macdZone === true;
  const latePass = lateMomentum === null || lateMomentum === false;
  const pass = Boolean(direction === 'LONG' || direction === 'SHORT') && trendPass && adxPass && sarPass && macdPass && latePass;
  return {
    ready: true,
    pass,
    entrySide: pass ? direction : '',
    source: 'TRADINGVIEW_EMA200_SAR_MACD',
    suppliedByWebhook: true,
    emaTrend: emaTrend || expectedTrend,
    adx,
    sarFlip,
    macdWhiteZone: macdZone,
    lateMomentum,
    invalidationLevel: invalidation ? roundCoin(symbol, invalidation) : null,
    tp1: tp1 ? roundCoin(symbol, tp1) : null,
    tp2: tp2 ? roundCoin(symbol, tp2) : null,
    reason: `TV EMA/SAR/MACD ${pass ? 'PASS' : 'FAIL'}: side=${direction}, trend=${emaTrend || 'not supplied'}, ADX=${adx === null ? 'not supplied' : adx}, SAR=${sarFlip === null ? 'not supplied' : sarFlip}, MACD white zone=${macdZone === null ? 'not supplied' : macdZone}, late=${lateMomentum === null ? 'not supplied' : lateMomentum}`
  };
}

function sarMacdStopForDirection(symbol, direction, entry, atr, invalidationLevel, settings) {
  const p = Number(entry || 0);
  const a = Number(atr || 0);
  let raw = Number(invalidationLevel || 0);
  if (!p || !a || !raw || (direction !== 'LONG' && direction !== 'SHORT')) return null;
  if (direction === 'LONG' && raw >= p) return null;
  if (direction === 'SHORT' && raw <= p) return null;
  const minDistance = a * Math.min(Math.max(Number(settings.minSlAtrMult || 0.6), 0.1), 3);
  const maxDistance = a * Math.min(Math.max(Number(settings.maxTechnicalSlAtrMult || 6), 2), 20);
  if (direction === 'LONG') {
    if (p - raw < minDistance) raw = p - minDistance;
    if (p - raw > maxDistance) raw = p - maxDistance;
  } else {
    if (raw - p < minDistance) raw = p + minDistance;
    if (raw - p > maxDistance) raw = p + maxDistance;
  }
  const sl = roundCoin(symbol, raw);
  return { sl, riskDistance: Math.abs(p - sl), reason: `EMA200/SAR/MACD strategic SL; original=${roundCoin(symbol, invalidationLevel)}` };
}

function directionToTrend(direction) {
  if (direction === 'LONG') return 'BULLISH';
  if (direction === 'SHORT') return 'BEARISH';
  return 'SIDEWAYS';
}

function normalizeTrendValue(value) {
  if (value === null || value === undefined) return '';
  const v = String(value).trim().toUpperCase();
  if (!v) return '';
  if (['BLUE', 'BULL', 'BULLISH', 'UP', 'UPTREND', 'LONG', 'BUY', 'GREEN'].includes(v)) return 'BULLISH';
  if (['RED', 'BEAR', 'BEARISH', 'DOWN', 'DOWNTREND', 'SHORT', 'SELL'].includes(v)) return 'BEARISH';
  if (['SIDEWAYS', 'RANGE', 'RANGING', 'NEUTRAL', 'MIXED', 'WAIT', 'NO_TRADE'].includes(v)) return 'SIDEWAYS';
  return '';
}

function webhookField(raw, names) {
  for (const name of names) {
    if (Object.prototype.hasOwnProperty.call(raw, name)) return raw[name];
  }
  return undefined;
}


function average(nums) {
  const clean = nums.map(Number).filter(n => Number.isFinite(n));
  return clean.length ? clean.reduce((a, b) => a + b, 0) / clean.length : null;
}

function stdev(nums) {
  const m = average(nums);
  if (m === null) return null;
  const clean = nums.map(Number).filter(n => Number.isFinite(n));
  if (clean.length < 2) return null;
  const variance = clean.reduce((sum, n) => sum + Math.pow(n - m, 2), 0) / clean.length;
  return Math.sqrt(variance);
}

function rollingAverageAt(values, endIndex, length) {
  const start = endIndex - length + 1;
  if (start < 0) return null;
  return average(values.slice(start, endIndex + 1));
}

function calculateTwoPoleLocal(symbol, history, price, atr, settings) {
  const closes = (history || []).map(Number).filter(n => Number.isFinite(n) && n > 0);
  const length = Math.min(Math.max(Math.floor(Number(settings.twoPoleFilterLength || 15)), 1), 100);
  const minBars = 60;
  if (closes.length < minBars) {
    return { ready: false, pass: false, entrySide: '', source: 'LOCAL_TWO_POLE_PRICE_STREAM', reason: `Need ${minBars} prices for Two-Pole warmup`, oscillator: null, signalLine: null };
  }

  const deviations = new Array(closes.length).fill(null);
  const normalized = new Array(closes.length).fill(null);
  for (let i = 0; i < closes.length; i += 1) {
    const sma1 = rollingAverageAt(closes, i, 25);
    if (sma1 === null) continue;
    const deviation = closes[i] - sma1;
    deviations[i] = deviation;
    const devWindow = deviations.slice(Math.max(0, i - 24), i + 1).filter(n => Number.isFinite(n));
    if (devWindow.length < 25) continue;
    const devSma = average(devWindow);
    const devStd = stdev(devWindow);
    normalized[i] = devStd && devStd > 0 ? (deviation - devSma) / devStd : 0;
  }

  const twoP = [];
  let smooth1 = null;
  let smooth2 = null;
  const alpha = 2 / (length + 1);
  for (const v of normalized) {
    if (!Number.isFinite(v)) {
      twoP.push(null);
      continue;
    }
    smooth1 = smooth1 === null ? v : (1 - alpha) * smooth1 + alpha * v;
    smooth2 = smooth2 === null ? smooth1 : (1 - alpha) * smooth2 + alpha * smooth1;
    twoP.push(smooth2);
  }

  const i = twoP.length - 1;
  const prev = twoP[i - 1];
  const prevSig = twoP[i - 5];
  const now = twoP[i];
  const sig = twoP[i - 4];
  if (![prev, prevSig, now, sig].every(Number.isFinite)) {
    return { ready: false, pass: false, entrySide: '', source: 'LOCAL_TWO_POLE_PRICE_STREAM', reason: 'Two-Pole signal line warming up', oscillator: Number.isFinite(now) ? pct(now) : null, signalLine: Number.isFinite(sig) ? pct(sig) : null };
  }

  const buyMax = Number(settings.twoPoleBuyMaxLevel ?? 0);
  const sellMin = Number(settings.twoPoleSellMinLevel ?? 0);
  const buy = prev <= prevSig && now > sig && now < buyMax;
  const sell = prev >= prevSig && now < sig && now > sellMin;
  const absMoves = [];
  for (let j = Math.max(1, closes.length - 100); j < closes.length; j += 1) absMoves.push(Math.abs(closes[j] - closes[j - 1]));
  const area = Math.max(Number(atr || 0), Number(average(absMoves) || 0) * 2, Number(price || closes[i]) * 0.001);
  const invalidationLevel = buy ? Number(price || closes[i]) - area : sell ? Number(price || closes[i]) + area : null;
  const entrySide = buy ? 'LONG' : sell ? 'SHORT' : '';
  return {
    ready: true,
    pass: Boolean(entrySide),
    entrySide,
    source: 'LOCAL_TWO_POLE_PRICE_STREAM',
    oscillator: pct(now),
    signalLine: pct(sig),
    invalidationLevel: invalidationLevel ? roundCoin(symbol, invalidationLevel) : null,
    reason: entrySide ? `Two-Pole ${entrySide} crossover confirmed; oscillator=${pct(now)} signal=${pct(sig)}` : `No fresh Two-Pole crossover; oscillator=${pct(now)} signal=${pct(sig)}`,
    localApproximation: true
  };
}

function isTwoPoleWebhook(raw = {}) {
  const keys = Object.keys(raw || {}).map(k => k.toLowerCase());
  const sourceText = String(raw.strategy || raw.module || raw.indicator || raw.signalName || raw.signal_name || raw.alertName || raw.alert_name || raw.signal || '').toLowerCase();
  return sourceText.includes('two') && sourceText.includes('pole') || keys.some(k => k.includes('twopole') || k.includes('two_pole') || k.includes('2pole') || k.includes('2_pole'));
}

function webhookTwoPoleSignal(symbol, webhook, direction, settings) {
  const raw = webhook?.raw || {};
  const supplied = isTwoPoleWebhook(raw);
  if (!supplied) return null;
  const osc = numberFrom(webhookField(raw, ['twoPoleOscillator', 'two_pole_oscillator', 'twoPole', 'two_pole', 'oscillator', 'osc', 'twoP', 'two_p']));
  const sig = numberFrom(webhookField(raw, ['twoPoleSignalLine', 'two_pole_signal_line', 'twoPoleSignal', 'two_pole_signal', 'signalLine', 'signal_line', 'twoPP', 'two_pp']));
  const invalidation = numberFrom(webhookField(raw, ['invalidationLevel', 'invalidation_level', 'twoPoleInvalidation', 'two_pole_invalidation', 'stopLevel', 'stop_level', 'sl', 'stopLoss']));
  const closed = parseMaybeBool(webhookField(raw, ['candleClosed', 'candle_closed', 'barClosed', 'bar_closed', 'confirmedClose', 'confirmed_close']));
  const vidyaTrend = normalizeTrendValue(webhookField(raw, ['vidyaTrend', 'vidya_trend', 'vidiaTrend', 'vidia_trend', 'vidyaColor', 'vidya_color', 'vidiaColor', 'vidia_color']));
  const deltaVolume = percentNumberFrom(webhookField(raw, ['deltaVolume', 'delta_volume', 'vidyaDeltaVolume', 'vidya_delta_volume', 'deltaVol', 'delta_vol']));
  const threshold = Math.max(0, Number(settings.twoPoleDeltaVolumeThresholdPct || 20));
  const expectedTrend = directionToTrend(direction);
  const levelPass = direction === 'LONG'
    ? (osc === null || osc < Number(settings.twoPoleBuyMaxLevel ?? 0))
    : direction === 'SHORT'
      ? (osc === null || osc > Number(settings.twoPoleSellMinLevel ?? 0))
      : false;
  const vidyaPass = !vidyaTrend || vidyaTrend === expectedTrend;
  const deltaPass = deltaVolume === null || (direction === 'LONG' ? deltaVolume >= threshold : direction === 'SHORT' ? deltaVolume <= -threshold : false);
  const closedPass = closed === null || closed !== false;
  const pass = Boolean(direction === 'LONG' || direction === 'SHORT') && levelPass && vidyaPass && deltaPass && closedPass;
  return {
    ready: true,
    pass,
    entrySide: pass ? direction : '',
    source: 'TRADINGVIEW_TWO_POLE_WEBHOOK',
    oscillator: osc === null ? null : pct(osc),
    signalLine: sig === null ? null : pct(sig),
    invalidationLevel: invalidation ? roundCoin(symbol, invalidation) : null,
    vidyaTrend: vidyaTrend || null,
    deltaVolumePct: deltaVolume,
    suppliedByWebhook: true,
    reason: `Two-Pole webhook ${pass ? 'PASS' : 'FAIL'}: level=${levelPass ? 'PASS' : 'FAIL'}, VIDYA=${vidyaTrend || 'not supplied'}, deltaVol=${deltaVolume === null ? 'not supplied' : `${deltaVolume}%`}, closed=${closed === null ? 'not supplied' : String(closed)}`
  };
}

function twoPoleStopForDirection(symbol, direction, entry, atr, invalidationLevel, settings) {
  const p = Number(entry || 0);
  const a = Number(atr || 0);
  let raw = Number(invalidationLevel || 0);
  if (!p || !a || !raw || (direction !== 'LONG' && direction !== 'SHORT')) return null;
  if (direction === 'LONG' && raw >= p) return null;
  if (direction === 'SHORT' && raw <= p) return null;
  const minDistance = a * Math.min(Math.max(Number(settings.minSlAtrMult || 0.6), 0.1), 3);
  const maxDistance = a * Math.min(Math.max(Number(settings.maxTechnicalSlAtrMult || 6), 2), 20);
  if (direction === 'LONG') {
    if (p - raw < minDistance) raw = p - minDistance;
    if (p - raw > maxDistance) raw = p - maxDistance;
  } else {
    if (raw - p < minDistance) raw = p + minDistance;
    if (raw - p > maxDistance) raw = p + maxDistance;
  }
  const sl = roundCoin(symbol, raw);
  return { sl, riskDistance: Math.abs(p - sl), reason: `Two-Pole invalidation SL; original=${roundCoin(symbol, invalidationLevel)}` };
}


function calculateChandelierLevel(symbol, history, atr, direction, settings) {
  const nums = (history || []).map(Number).filter(n => Number.isFinite(n) && n > 0);
  const len = Math.min(Math.max(Math.floor(Number(settings.chandelierLength || 22)), 5), 120);
  const a = Math.max(Number(atr || 0), (nums[nums.length - 1] || 1) * 0.001);
  if (nums.length < len) return null;
  const window = nums.slice(-len);
  const mult = Math.min(Math.max(Number(settings.chandelierAtrMult || 3), 1), 8);
  if (direction === 'LONG') return roundCoin(symbol, Math.max(...window) - a * mult);
  if (direction === 'SHORT') return roundCoin(symbol, Math.min(...window) + a * mult);
  return null;
}


function calculateSupportResistanceLocal(symbol, history, price, atr, settings) {
  const closes = (history || []).map(Number).filter(n => Number.isFinite(n) && n > 0);
  const p = Number(price || closes[closes.length - 1] || 0);
  const lookback = Math.min(Math.max(Math.floor(Number(settings.breakoutLookback || 36)), 12), 160);
  const a = Math.max(Number(atr || 0), p * 0.001);
  if (!p || closes.length < Math.min(lookback, 24)) {
    return { ready: false, support: null, resistance: null, reason: 'Support/resistance warmup' };
  }
  const prior = closes.slice(Math.max(0, closes.length - lookback - 1), Math.max(0, closes.length - 1));
  if (prior.length < 12) return { ready: false, support: null, resistance: null, reason: 'Support/resistance warmup' };
  const support = Math.min(...prior);
  const resistance = Math.max(...prior);
  const range = Math.max(resistance - support, a);
  const zoneWidth = Math.max(a * 0.75, range * Math.min(Math.max(Number(settings.zoneProximityPct || 0.5), 0.1), 1) / 100);
  const nearSupport = Math.abs(p - support) <= zoneWidth;
  const nearResistance = Math.abs(p - resistance) <= zoneWidth;
  const aboveResistance = p > resistance;
  const belowSupport = p < support;
  let location = 'inside range';
  if (aboveResistance) location = 'above resistance';
  else if (belowSupport) location = 'below support';
  else if (nearResistance) location = 'near resistance';
  else if (nearSupport) location = 'near support';
  return {
    ready: true,
    support: roundCoin(symbol, support),
    resistance: roundCoin(symbol, resistance),
    rangePct: pct((range / p) * 100),
    zoneWidth: roundCoin(symbol, zoneWidth),
    nearSupport,
    nearResistance,
    aboveResistance,
    belowSupport,
    location,
    reason: `S/R ${location}; support=${roundCoin(symbol, support)} resistance=${roundCoin(symbol, resistance)} range=${pct((range / p) * 100)}%`
  };
}

function calculateBreakoutLocal(symbol, history, price, atr, settings) {
  const closes = (history || []).map(Number).filter(n => Number.isFinite(n) && n > 0);
  const lookback = Math.min(Math.max(Math.floor(Number(settings.breakoutLookback || 36)), 12), 160);
  const confirmBars = 3;
  const minBars = lookback + confirmBars + 3;
  const p = Number(price || closes[closes.length - 1] || 0);
  const a = Math.max(Number(atr || 0), p * 0.001);
  if (closes.length < minBars) {
    return { ready: false, pass: false, entrySide: '', source: 'LOCAL_BREAKOUT_CLOSE_STREAM', reason: `Need ${minBars} prices for breakout warmup` };
  }

  const i = closes.length - 1;
  const priorForOne = closes.slice(Math.max(0, i - lookback), i);
  const priorForThree = closes.slice(Math.max(0, i - confirmBars - lookback), i - confirmBars + 1);
  if (priorForOne.length < 10 || priorForThree.length < 10) {
    return { ready: false, pass: false, entrySide: '', source: 'LOCAL_BREAKOUT_CLOSE_STREAM', reason: 'Breakout support/resistance warmup' };
  }

  const resistanceOne = Math.max(...priorForOne);
  const supportOne = Math.min(...priorForOne);
  const resistanceThree = Math.max(...priorForThree);
  const supportThree = Math.min(...priorForThree);
  const prev = closes[i - 1];
  const body = p - prev;
  const bodyAbs = Math.abs(body);
  const minBody = a * Math.min(Math.max(Number(settings.breakoutMomentumBodyAtrMult || 0.7), 0.1), 5);
  const buffer = a * Math.min(Math.max(Number(settings.breakoutSlBufferAtrMult ?? 0.12), 0), 1);
  const recent3 = closes.slice(-3);
  const oneLong = prev <= resistanceOne && p > resistanceOne && body > 0 && bodyAbs >= minBody;
  const oneShort = prev >= supportOne && p < supportOne && body < 0 && bodyAbs >= minBody;
  const threeLong = recent3.length === 3 && recent3.every(c => c > resistanceThree) && recent3[0] < recent3[1] && recent3[1] < recent3[2];
  const threeShort = recent3.length === 3 && recent3.every(c => c < supportThree) && recent3[0] > recent3[1] && recent3[1] > recent3[2];

  let entrySide = '';
  let level = null;
  let confirmation = '';
  if (oneLong || threeLong) {
    entrySide = 'LONG';
    level = oneLong ? resistanceOne : resistanceThree;
    confirmation = oneLong ? 'large bullish body close above resistance' : '3 bullish closes above resistance';
  } else if (oneShort || threeShort) {
    entrySide = 'SHORT';
    level = oneShort ? supportOne : supportThree;
    confirmation = oneShort ? 'large bearish body close below support' : '3 bearish closes below support';
  }

  const invalidationLevel = entrySide === 'LONG'
    ? roundCoin(symbol, Number(level) - buffer)
    : entrySide === 'SHORT'
      ? roundCoin(symbol, Number(level) + buffer)
      : null;
  const chandelier = entrySide ? calculateChandelierLevel(symbol, closes, a, entrySide, settings) : null;
  const reason = entrySide
    ? `Breakout ${entrySide} confirmed by ${confirmation}; brokenLevel=${roundCoin(symbol, level)}; SL beyond broken level; TP1=${Number(settings.breakoutTp1R || 1.5)}R; Chandelier=${chandelier || 'warming'}`
    : `No body-confirmed breakout; resistance=${roundCoin(symbol, resistanceOne)} support=${roundCoin(symbol, supportOne)} body=${roundCoin(symbol, body)} minBody=${roundCoin(symbol, minBody)}`;

  return {
    ready: true,
    pass: Boolean(entrySide),
    entrySide,
    source: 'LOCAL_BREAKOUT_CLOSE_STREAM',
    brokenLevel: level ? roundCoin(symbol, level) : null,
    invalidationLevel,
    confirmation,
    chandelierLevel: chandelier,
    tp1R: Number(settings.breakoutTp1R || 1.5),
    reason,
    localApproximation: true
  };
}

function isBreakoutWebhook(raw = {}) {
  const keys = Object.keys(raw || {}).map(k => k.toLowerCase());
  const sourceText = String(raw.strategy || raw.module || raw.indicator || raw.signalName || raw.signal_name || raw.alertName || raw.alert_name || raw.signal || '').toLowerCase();
  return sourceText.includes('breakout') || keys.some(k => k.includes('breakout') || k.includes('chandelier') || k.includes('brokenlevel') || k.includes('broken_level'));
}

function webhookBreakoutSignal(symbol, webhook, direction, settings) {
  const raw = webhook?.raw || {};
  if (!isBreakoutWebhook(raw)) return null;
  const confirmed = parseMaybeBool(webhookField(raw, ['breakoutConfirmed', 'breakout_confirmed', 'bodyBreakout', 'body_breakout', 'confirmedClose', 'confirmed_close']));
  const wickOnly = parseMaybeBool(webhookField(raw, ['wickOnly', 'wick_only', 'wickBreak', 'wick_break']));
  const brokenLevel = numberFrom(webhookField(raw, ['brokenLevel', 'broken_level', 'resistance', 'support', 'breakoutLevel', 'breakout_level']));
  const invalidation = numberFrom(webhookField(raw, ['breakoutInvalidation', 'breakout_invalidation', 'invalidationLevel', 'invalidation_level', 'sl', 'stopLoss', 'stop_loss']));
  const chandelier = numberFrom(webhookField(raw, ['chandelier', 'chandelierLevel', 'chandelier_level', 'chandelierExit', 'chandelier_exit']));
  const confirmation = String(webhookField(raw, ['confirmationType', 'confirmation_type', 'breakoutType', 'breakout_type']) || 'webhook breakout confirmation');
  const directionOk = direction === 'LONG' || direction === 'SHORT';
  const confirmedPass = confirmed === null || confirmed === true;
  const wickPass = wickOnly === null || wickOnly === false;
  const pass = directionOk && confirmedPass && wickPass;
  return {
    ready: true,
    pass,
    entrySide: pass ? direction : '',
    source: 'TRADINGVIEW_BREAKOUT_WEBHOOK',
    suppliedByWebhook: true,
    brokenLevel: brokenLevel ? roundCoin(symbol, brokenLevel) : null,
    invalidationLevel: invalidation ? roundCoin(symbol, invalidation) : null,
    chandelierLevel: chandelier ? roundCoin(symbol, chandelier) : null,
    confirmation,
    tp1R: Number(settings.breakoutTp1R || 1.5),
    reason: `Breakout webhook ${pass ? 'PASS' : 'FAIL'}: confirmed=${confirmed === null ? 'not supplied' : confirmed}, wickOnly=${wickOnly === null ? 'not supplied' : wickOnly}, level=${brokenLevel || 'not supplied'}, chandelier=${chandelier || 'not supplied'}`
  };
}

function breakoutStopForDirection(symbol, direction, entry, atr, invalidationLevel, settings) {
  const p = Number(entry || 0);
  const a = Number(atr || 0);
  let raw = Number(invalidationLevel || 0);
  if (!p || !a || !raw || (direction !== 'LONG' && direction !== 'SHORT')) return null;
  if (direction === 'LONG' && raw >= p) return null;
  if (direction === 'SHORT' && raw <= p) return null;
  const minDistance = a * Math.min(Math.max(Number(settings.minSlAtrMult || 0.6), 0.1), 3);
  const maxDistance = a * Math.min(Math.max(Number(settings.maxTechnicalSlAtrMult || 6), 2), 20);
  if (direction === 'LONG') {
    if (p - raw < minDistance) raw = p - minDistance;
    if (p - raw > maxDistance) raw = p - maxDistance;
  } else {
    if (raw - p < minDistance) raw = p + minDistance;
    if (raw - p > maxDistance) raw = p + maxDistance;
  }
  const sl = roundCoin(symbol, raw);
  return { sl, riskDistance: Math.abs(p - sl), reason: `Breakout broken-level SL; original=${roundCoin(symbol, invalidationLevel)}` };
}


function calculateVwapBounceLocal(symbol, history, price, atr, structure, settings) {
  const closes = (history || []).map(Number).filter(n => Number.isFinite(n) && n > 0);
  const lookback = Math.min(Math.max(Math.floor(Number(settings.vwapLookback || 48)), 20), 240);
  const p = Number(price || closes[closes.length - 1] || 0);
  const a = Math.max(Number(atr || 0), p * 0.001);
  if (!p || closes.length < lookback + 3) {
    return { ready: false, pass: false, entrySide: '', source: 'LOCAL_VWAP_BOUNCE_STREAM', reason: `Need ${lookback + 3} prices for VWAP bounce warmup` };
  }

  const window = closes.slice(-lookback);
  const center = average(window);
  const sd = stdev(window) || a;
  const mult = Math.min(Math.max(Number(settings.vwapBandStdMult || 1.5), 0.5), 4);
  const upper = center + sd * mult;
  const lower = center - sd * mult;
  const bandWidth = Math.max(upper - lower, a);
  const prev = closes[closes.length - 2];
  const prev2 = closes[closes.length - 3];
  const tolerance = a * Math.min(Math.max(Number(settings.vwapRejectionAtrMult || 0.35), 0.05), 2);
  const buffer = a * Math.min(Math.max(Number(settings.vwapSlBufferAtrMult ?? 0.15), 0), 1);
  const centerDistance = Math.abs(p - center);
  const choppingAroundCenter = centerDistance < bandWidth * 0.18;

  const longReject = prev <= lower + tolerance && p > lower && p > prev && p >= prev2;
  const shortReject = prev >= upper - tolerance && p < upper && p < prev && p <= prev2;
  let entrySide = '';
  if (longReject) entrySide = 'LONG';
  else if (shortReject) entrySide = 'SHORT';

  const strongAgainst = entrySide === 'LONG'
    ? structure?.trend === 'BEARISH' && Number(structure?.confidence || 0) >= 70
    : entrySide === 'SHORT'
      ? structure?.trend === 'BULLISH' && Number(structure?.confidence || 0) >= 70
      : false;
  if (settings.vwapBlockStrongAgainstTrend !== false && strongAgainst) {
    return {
      ready: true,
      pass: false,
      entrySide: '',
      source: 'LOCAL_VWAP_BOUNCE_STREAM',
      center: roundCoin(symbol, center),
      upperBand: roundCoin(symbol, upper),
      lowerBand: roundCoin(symbol, lower),
      reason: `VWAP bounce blocked: trend strongly against setup; structure=${structure?.trend || 'UNKNOWN'} confidence=${structure?.confidence || 0}`,
      localApproximation: true
    };
  }

  if (!entrySide || choppingAroundCenter) {
    return {
      ready: true,
      pass: false,
      entrySide: '',
      source: 'LOCAL_VWAP_BOUNCE_STREAM',
      center: roundCoin(symbol, center),
      upperBand: roundCoin(symbol, upper),
      lowerBand: roundCoin(symbol, lower),
      reason: !entrySide
        ? `No VWAP band rejection; price=${roundCoin(symbol, p)} lower=${roundCoin(symbol, lower)} center=${roundCoin(symbol, center)} upper=${roundCoin(symbol, upper)}`
        : `VWAP no-trade: price chopping around center VWAP; price=${roundCoin(symbol, p)} center=${roundCoin(symbol, center)}`,
      localApproximation: true
    };
  }

  const invalidationLevel = entrySide === 'LONG' ? lower - buffer : upper + buffer;
  const tp1 = center;
  const tp2 = entrySide === 'LONG' ? upper : lower;
  const risk = Math.abs(p - invalidationLevel);
  const tp1R = risk ? Math.abs(tp1 - p) / risk : 0;
  const tp2R = risk ? Math.abs(tp2 - p) / risk : 0;
  const minTp1R = Math.min(Math.max(Number(settings.vwapMinTp1R || 0.8), 0.25), 5);
  const minTp2R = Math.min(Math.max(Number(settings.vwapMinTp2R || 1.5), 0.5), 8);
  const rrPass = tp1R >= minTp1R && tp2R >= minTp2R;

  return {
    ready: true,
    pass: rrPass,
    entrySide: rrPass ? entrySide : '',
    source: 'LOCAL_VWAP_BOUNCE_STREAM',
    center: roundCoin(symbol, center),
    upperBand: roundCoin(symbol, upper),
    lowerBand: roundCoin(symbol, lower),
    invalidationLevel: roundCoin(symbol, invalidationLevel),
    tp1: roundCoin(symbol, tp1),
    tp2: roundCoin(symbol, tp2),
    tp1R: pct(tp1R),
    tp2R: pct(tp2R),
    reason: rrPass
      ? `VWAP ${entrySide} mean-reversion bounce confirmed; band rejection valid; TP1=center ${roundCoin(symbol, tp1)}; TP2=opposite band ${roundCoin(symbol, tp2)}; TP1R=${pct(tp1R)} TP2R=${pct(tp2R)}`
      : `VWAP bounce rejected: reward too small vs SL; TP1R=${pct(tp1R)} min=${minTp1R}; TP2R=${pct(tp2R)} min=${minTp2R}`,
    localApproximation: true
  };
}

function isVwapWebhook(raw = {}) {
  const keys = Object.keys(raw || {}).map(k => k.toLowerCase());
  const sourceText = String(raw.strategy || raw.module || raw.indicator || raw.signalName || raw.signal_name || raw.alertName || raw.alert_name || raw.signal || '').toLowerCase();
  return sourceText.includes('vwap') || keys.some(k => k.includes('vwap') || k.includes('diamond') || k.includes('bandrejection') || k.includes('band_rejection'));
}

function webhookVwapSignal(symbol, webhook, direction, settings) {
  const raw = webhook?.raw || {};
  if (!isVwapWebhook(raw)) return null;
  const diamond = String(webhookField(raw, ['diamond', 'diamondColor', 'diamond_color', 'signalColor', 'signal_color']) || '').trim().toUpperCase();
  const band = String(webhookField(raw, ['rejectedBand', 'rejected_band', 'bandRejected', 'band_rejected', 'vwapBand', 'vwap_band']) || '').trim().toUpperCase();
  const center = numberFrom(webhookField(raw, ['vwapCenter', 'vwap_center', 'centerVwap', 'center_vwap', 'vwap']));
  const upper = numberFrom(webhookField(raw, ['upperBand', 'upper_band', 'vwapUpper', 'vwap_upper']));
  const lower = numberFrom(webhookField(raw, ['lowerBand', 'lower_band', 'vwapLower', 'vwap_lower']));
  const invalidation = numberFrom(webhookField(raw, ['invalidationLevel', 'invalidation_level', 'vwapInvalidation', 'vwap_invalidation', 'sl', 'stopLoss', 'stop_loss']));
  const suppliedTp1 = numberFrom(webhookField(raw, ['tp1', 'takeProfit1', 'take_profit_1']));
  const suppliedTp2 = numberFrom(webhookField(raw, ['tp2', 'takeProfit2', 'take_profit_2']));
  const rejection = parseMaybeBool(webhookField(raw, ['bandRejection', 'band_rejection', 'rejectionConfirmed', 'rejection_confirmed']));
  const chopping = parseMaybeBool(webhookField(raw, ['chopping', 'chop', 'aroundVwap', 'around_vwap']));
  const againstTrend = parseMaybeBool(webhookField(raw, ['strongAgainstTrend', 'strong_against_trend', 'trendAgainst', 'trend_against']));
  const directionOk = direction === 'LONG' || direction === 'SHORT';
  const diamondOk = direction === 'LONG'
    ? (!diamond || ['BLUE', 'LONG', 'BUY', 'BULLISH', 'GREEN'].includes(diamond))
    : direction === 'SHORT'
      ? (!diamond || ['ORANGE', 'SHORT', 'SELL', 'BEARISH', 'RED', 'PURPLE'].includes(diamond))
      : false;
  const bandOk = direction === 'LONG'
    ? (!band || band.includes('LOWER') || band === 'DEMAND')
    : direction === 'SHORT'
      ? (!band || band.includes('UPPER') || band === 'SUPPLY')
      : false;
  const rejectOk = rejection === null || rejection === true;
  const chopOk = chopping === null || chopping === false;
  const trendOk = againstTrend === null || againstTrend === false || settings.vwapBlockStrongAgainstTrend === false;
  const pass = directionOk && diamondOk && bandOk && rejectOk && chopOk && trendOk;
  const tp1 = suppliedTp1 || center || null;
  const tp2 = suppliedTp2 || (direction === 'LONG' ? upper : lower) || null;
  return {
    ready: true,
    pass,
    entrySide: pass ? direction : '',
    source: 'TRADINGVIEW_VWAP_WEBHOOK',
    suppliedByWebhook: true,
    center: center ? roundCoin(symbol, center) : null,
    upperBand: upper ? roundCoin(symbol, upper) : null,
    lowerBand: lower ? roundCoin(symbol, lower) : null,
    invalidationLevel: invalidation ? roundCoin(symbol, invalidation) : null,
    tp1: tp1 ? roundCoin(symbol, tp1) : null,
    tp2: tp2 ? roundCoin(symbol, tp2) : null,
    reason: `VWAP webhook ${pass ? 'PASS' : 'FAIL'}: diamond=${diamond || 'not supplied'}, band=${band || 'not supplied'}, rejection=${rejection === null ? 'not supplied' : rejection}, chop=${chopping === null ? 'not supplied' : chopping}, strongAgainstTrend=${againstTrend === null ? 'not supplied' : againstTrend}`
  };
}

function vwapStopForDirection(symbol, direction, entry, atr, invalidationLevel, settings) {
  const p = Number(entry || 0);
  const a = Number(atr || 0);
  let raw = Number(invalidationLevel || 0);
  if (!p || !a || !raw || (direction !== 'LONG' && direction !== 'SHORT')) return null;
  if (direction === 'LONG' && raw >= p) return null;
  if (direction === 'SHORT' && raw <= p) return null;
  const minDistance = a * Math.min(Math.max(Number(settings.minSlAtrMult || 0.6), 0.1), 3);
  const maxDistance = a * Math.min(Math.max(Number(settings.maxTechnicalSlAtrMult || 6), 2), 20);
  if (direction === 'LONG') {
    if (p - raw < minDistance) raw = p - minDistance;
    if (p - raw > maxDistance) raw = p - maxDistance;
  } else {
    if (raw - p < minDistance) raw = p + minDistance;
    if (raw - p > maxDistance) raw = p + maxDistance;
  }
  const sl = roundCoin(symbol, raw);
  return { sl, riskDistance: Math.abs(p - sl), reason: `VWAP band-rejection invalidation SL; original=${roundCoin(symbol, invalidationLevel)}` };
}

function inferMarketStructure(values, price, settings) {
  const nums = values.map(Number).filter(n => Number.isFinite(n) && n > 0);
  const minBars = 55;
  if (nums.length < minBars) return { trend: 'WARMUP', confidence: 0, reason: `Need ${minBars} prices for structure filter` };
  const ema20 = emaSeries(nums, 20);
  const ema50 = emaSeries(nums, 50);
  const fast = ema20[ema20.length - 1];
  const slow = ema50[ema50.length - 1];
  const fastPrev = ema20[Math.max(0, ema20.length - 8)] || fast;
  const slowPrev = ema50[Math.max(0, ema50.length - 8)] || slow;
  const p = Number(price || nums[nums.length - 1]);
  const recent = nums.slice(-24);
  const older = nums.slice(-48, -24);
  const recentHigh = Math.max(...recent);
  const recentLow = Math.min(...recent);
  const olderHigh = older.length ? Math.max(...older) : recentHigh;
  const olderLow = older.length ? Math.min(...older) : recentLow;
  const fastSlopePct = fastPrev ? ((fast - fastPrev) / fastPrev) * 100 : 0;
  const slowSlopePct = slowPrev ? ((slow - slowPrev) / slowPrev) * 100 : 0;
  const bullish = p > fast && fast > slow && fastSlopePct > 0 && recentHigh >= olderHigh && recentLow >= olderLow * 0.998;
  const bearish = p < fast && fast < slow && fastSlopePct < 0 && recentLow <= olderLow && recentHigh <= olderHigh * 1.002;
  const confidence = Math.min(100, Math.round(Math.abs(fastSlopePct) * 600 + Math.abs(slowSlopePct) * 400 + Math.abs((fast - slow) / Math.max(p, 0.0000001)) * 12000));
  if (bullish) return { trend: 'BULLISH', confidence, reason: 'EMA20>EMA50 with higher recent structure' };
  if (bearish) return { trend: 'BEARISH', confidence, reason: 'EMA20<EMA50 with lower recent structure' };
  return { trend: 'SIDEWAYS', confidence, reason: 'Structure not clean enough for high-probability entry' };
}

function webhookStrategyFilters(webhook, direction) {
  const raw = webhook?.raw || {};
  const expected = directionToTrend(direction);
  const filters = [];
  const pushOptional = (name, supplied, pass, detail = '') => filters.push({ name, supplied: Boolean(supplied), pass: supplied ? Boolean(pass) : true, detail });

  const closed = parseMaybeBool(webhookField(raw, ['candleClosed', 'candle_closed', 'confirmedClose', 'confirmed_close', 'barClosed', 'bar_closed']));
  pushOptional('Closed Candle', closed !== null, closed !== false, closed === null ? 'not supplied' : String(closed));

  const htfTrend = normalizeTrendValue(webhookField(raw, ['htfTrend', 'htf_trend', 'higherTimeframeTrend', 'higher_timeframe_trend', 'trend1h', 'trend_1h', 'marketStructure', 'market_structure']));
  pushOptional('HTF Trend', Boolean(htfTrend), htfTrend === expected, htfTrend || 'not supplied');

  const ps1 = normalizeTrendValue(webhookField(raw, ['profitableStrategy1', 'profitable_strategy_1', 'ps1', 'ps1Color', 'ps1_color', 'strategy1Color', 'strategy_1_color']));
  const ps2 = normalizeTrendValue(webhookField(raw, ['profitableStrategy2', 'profitable_strategy_2', 'ps2', 'ps2Color', 'ps2_color', 'strategy2Color', 'strategy_2_color']));
  pushOptional('ProfitableStrategy 1', Boolean(ps1), ps1 === expected, ps1 || 'not supplied');
  pushOptional('ProfitableStrategy 2', Boolean(ps2), ps2 === expected, ps2 || 'not supplied');

  const strongTrendSeen = parseMaybeBool(webhookField(raw, ['strongTrendSeen', 'strong_trend_seen', 'strongCandleSeen', 'strong_candle_seen', 'strongMomentum', 'strong_momentum']));
  pushOptional('Strong Momentum Seen', strongTrendSeen !== null, strongTrendSeen !== false, strongTrendSeen === null ? 'not supplied' : String(strongTrendSeen));

  const pullback = parseMaybeBool(webhookField(raw, ['pullbackConfirmed', 'pullback_confirmed', 'weakSameDirectionCandle', 'weak_same_direction_candle', 'weakTrendCandle', 'weak_trend_candle']));
  pushOptional('Pullback / Weak Same-Direction Candle', pullback !== null, pullback !== false, pullback === null ? 'not supplied' : String(pullback));

  const priceAction = parseMaybeBool(webhookField(raw, ['priceActionConfirmed', 'price_action_confirmed', 'engulfingConfirmed', 'engulfing_confirmed', 'entryConfirmation', 'entry_confirmation']));
  pushOptional('Final Price Action Confirmation', priceAction !== null, priceAction !== false, priceAction === null ? 'not supplied' : String(priceAction));

  const cci = numberFrom(webhookField(raw, ['cci', 'cci100', 'cci_100']));
  pushOptional('CCI Direction', cci !== null, direction === 'LONG' ? cci > 0 : direction === 'SHORT' ? cci < 0 : false, cci === null ? 'not supplied' : String(cci));

  const slowHist = numberFrom(webhookField(raw, ['slowMacdHistogram', 'slow_macd_histogram', 'macd10020050Histogram', 'macd_100_200_50_histogram']));
  pushOptional('Slow MACD 100/200/50 Direction', slowHist !== null, direction === 'LONG' ? slowHist > 0 : direction === 'SHORT' ? slowHist < 0 : false, slowHist === null ? 'not supplied' : String(slowHist));

  const suppliedCount = filters.filter(f => f.supplied).length;
  const suppliedPass = filters.filter(f => f.supplied).every(f => f.pass);
  return {
    suppliedCount,
    pass: suppliedPass,
    filters,
    note: suppliedCount ? 'Webhook strategy fields supplied and checked.' : 'No optional ProfitableStrategy fields supplied; webhook side is used as final manual/TradingView confirmation.'
  };
}

function technicalStopForDirection(symbol, direction, entry, atr, history, settings) {
  const p = Number(entry || 0);
  const a = Number(atr || 0);
  if (!p || !a || (direction !== 'LONG' && direction !== 'SHORT')) return { sl: 0, riskDistance: 0, reason: 'Invalid entry/ATR' };
  const lookback = Math.min(Math.max(Math.floor(Number(settings.slSwingLookback || 24)), 8), 120);
  const recent = history.map(Number).filter(n => Number.isFinite(n) && n > 0).slice(-lookback);
  const buffer = a * Math.min(Math.max(Number(settings.slBufferAtrMult ?? 0.15), 0), 1);
  const minDistance = a * Math.min(Math.max(Number(settings.minSlAtrMult || 0.6), 0.1), 3);
  const atrDistance = a * Math.min(Math.max(Number(settings.atrStopMultiplier || 2), 0.5), 10);
  const maxDistance = a * Math.min(Math.max(Number(settings.maxTechnicalSlAtrMult || 6), 2), 20);
  let raw;
  let reason;
  if (direction === 'LONG') {
    const swing = recent.length ? Math.min(...recent) : p - atrDistance;
    raw = Math.min(swing - buffer, p - atrDistance);
    if (p - raw < minDistance) raw = p - minDistance;
    if (p - raw > maxDistance) raw = p - maxDistance;
    reason = `LONG SL below swing/ATR support; lookback=${recent.length}`;
  } else {
    const swing = recent.length ? Math.max(...recent) : p + atrDistance;
    raw = Math.max(swing + buffer, p + atrDistance);
    if (raw - p < minDistance) raw = p + minDistance;
    if (raw - p > maxDistance) raw = p + maxDistance;
    reason = `SHORT SL above swing/ATR resistance; lookback=${recent.length}`;
  }
  const sl = roundCoin(symbol, raw);
  return { sl, riskDistance: Math.abs(p - sl), reason };
}

function effectiveRiskCapUsd(settings, botAllocationUsd = 0) {
  const pctRisk = Math.min(Math.max(Number(settings.riskPercent ?? 0.5), 0.05), 5);
  let walletBase = Number(settings.totalWalletAmount || 0);
  if (state.walletLive.status === 'LIVE_WALLET') walletBase = Number(liveWalletNumbers().equity || walletBase || 0);
  if (!walletBase) walletBase = Number(botAllocationUsd || settings.maxBotAllocationUsd || 0);
  const pctCap = walletBase > 0 ? walletBase * pctRisk / 100 : 0;
  const absoluteCap = Number(settings.maxStopLossUsd || 0);
  if (pctCap > 0 && absoluteCap > 0) return money(Math.min(pctCap, absoluteCap));
  if (pctCap > 0) return money(pctCap);
  if (absoluteCap > 0) return money(absoluteCap);
  return 0;
}

function plannedExitRMultiple(settings = loadSettings()) {
  const tp1R = Math.max(0, Number(settings.tp1TriggerR || 1));
  const tp2R = Math.max(tp1R, Number(settings.rewardTargetR || settings.minRR || 2));
  const tp1ClosePct = Math.min(Math.max(Number(settings.tp1ClosePct ?? 50), 0), 100);
  const tp2ClosePct = Math.min(Math.max(Number(settings.tp2ClosePct ?? 100), 0), 100);
  const tp1Fraction = tp1ClosePct / 100;
  const remainingAfterTp1 = Math.max(0, 1 - tp1Fraction);
  const tp2Fraction = remainingAfterTp1 * (tp2ClosePct / 100);
  return money((tp1Fraction * tp1R) + (tp2Fraction * tp2R));
}

function estimatedExitPlanProfit(notionalUsd, riskPct, settings = loadSettings()) {
  const n = Number(notionalUsd || 0);
  const r = Number(riskPct || 0);
  if (!n || !r) return { tp1ProfitUsd: 0, tp2ProfitUsd: 0, fullTradeProfitUsd: 0, plannedProfitR: plannedExitRMultiple(settings) };
  const tp1R = Math.max(0, Number(settings.tp1TriggerR || 1));
  const tp2R = Math.max(tp1R, Number(settings.rewardTargetR || settings.minRR || 2));
  const tp1ClosePct = Math.min(Math.max(Number(settings.tp1ClosePct ?? 50), 0), 100);
  const tp2ClosePct = Math.min(Math.max(Number(settings.tp2ClosePct ?? 100), 0), 100);
  const tp1Fraction = tp1ClosePct / 100;
  const remainingAfterTp1 = Math.max(0, 1 - tp1Fraction);
  const tp2Fraction = remainingAfterTp1 * (tp2ClosePct / 100);
  const tp1ProfitUsd = money(n * r * tp1R * tp1Fraction);
  const tp2ProfitUsd = money(n * r * tp2R * tp2Fraction);
  const plannedProfitR = money((tp1Fraction * tp1R) + (tp2Fraction * tp2R));
  return {
    tp1ProfitUsd,
    tp2ProfitUsd,
    fullTradeProfitUsd: money(tp1ProfitUsd + tp2ProfitUsd),
    plannedProfitR,
    tp1ClosePct,
    tp2ClosePct,
    tp1R,
    tp2R
  };
}

function profitTargetSettings(settings = loadSettings()) {
  const minFullTradeProfitUsd = Math.max(0, Number(settings.minFullTradeProfitUsd ?? settings.minTargetProfitUsd ?? 1));
  const rawTarget = Math.max(0, Number(settings.targetFullTradeProfitUsd ?? settings.targetProfitUsd ?? 2));
  const targetFullTradeProfitUsd = Math.max(minFullTradeProfitUsd, rawTarget);
  const rewardR = Math.max(2, Number(settings.rewardTargetR || settings.minRR || 2));
  const plannedProfitR = Math.max(0.000001, plannedExitRMultiple(settings));
  return {
    autoSizeToTargetProfit: settings.autoSizeToTargetProfit !== false,
    blockTinyProfitTrades: settings.blockTinyProfitTrades !== false,
    minFullTradeProfitUsd,
    targetFullTradeProfitUsd,
    // Backward-compatible aliases for older saved JSON and UI reads. Do not label these as TP2.
    minTargetProfitUsd: minFullTradeProfitUsd,
    targetProfitUsd: targetFullTradeProfitUsd,
    rewardR,
    plannedProfitR,
    autoUseMaxLeverageForProfitTarget: settings.autoUseMaxLeverageForProfitTarget !== false
  };
}

function requestJson(url, { method = 'GET', headers = {}, body = null, timeoutMs = 10000 } = {}) {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const payload = body === null || body === undefined ? null : (typeof body === 'string' ? body : JSON.stringify(body));
    const req = https.request({
      method,
      hostname: target.hostname,
      port: target.port || 443,
      path: `${target.pathname}${target.search}`,
      headers: {
        Accept: 'application/json',
        'User-Agent': USER_AGENT,
        ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
        ...headers
      },
      timeout: timeoutMs
    }, res => {
      let text = '';
      res.on('data', chunk => { text += chunk; });
      res.on('end', () => {
        let json = null;
        try { json = text ? JSON.parse(text) : {}; } catch (error) { return reject(new Error(`Invalid JSON from Delta: ${text.slice(0, 180)}`)); }
        if (res.statusCode < 200 || res.statusCode >= 300) {
          const msg = json?.error?.message || json?.error?.code || json?.message || `HTTP ${res.statusCode}`;
          return reject(new Error(msg));
        }
        resolve(json);
      });
    });
    req.on('timeout', () => req.destroy(new Error('Delta API request timed out')));
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}


function resolutionToSeconds(resolution = '5m') {
  const r = String(resolution || '5m').toLowerCase().trim();
  if (r === '1m') return 60;
  if (r === '3m') return 180;
  if (r === '5m') return 300;
  if (r === '15m') return 900;
  if (r === '30m') return 1800;
  if (r === '1h' || r === '60m') return 3600;
  if (r === '2h') return 7200;
  if (r === '4h') return 14400;
  if (r === '1d' || r === 'd') return 86400;
  return 300;
}

function normalizeResolution(resolution = '5m') {
  const r = String(resolution || '5m').toLowerCase().trim();
  if (['1m','3m','5m','15m','30m','1h','2h','4h','1d'].includes(r)) return r;
  if (r === '60m') return '1h';
  if (r === 'd') return '1d';
  return '5m';
}

function candleKey(symbol, resolution) {
  return `${String(symbol || '').toUpperCase()}:${normalizeResolution(resolution)}`;
}

function normalizeDeltaCandle(raw, fallbackResolution = '5m') {
  if (!raw || typeof raw !== 'object') return null;
  const start = Number(raw.time ?? raw.timestamp ?? raw.candle_start_time ?? raw.start ?? raw.t ?? 0);
  const time = start > 10_000_000_000 ? Math.floor(start / 1000) : Math.floor(start);
  const open = numberFrom(raw.open ?? raw.o);
  const high = numberFrom(raw.high ?? raw.h);
  const low = numberFrom(raw.low ?? raw.l);
  const close = numberFrom(raw.close ?? raw.c);
  const volume = numberFrom(raw.volume ?? raw.v ?? raw.turnover ?? raw.turnover_usd ?? 0) || 0;
  if (!time || !Number.isFinite(open) || !Number.isFinite(high) || !Number.isFinite(low) || !Number.isFinite(close)) return null;
  return { time, open, high, low, close, volume, resolution: normalizeResolution(fallbackResolution) };
}

function normalizeDeltaCandles(json, resolution = '5m') {
  const result = Array.isArray(json?.result) ? json.result : Array.isArray(json) ? json : [];
  const out = result.map(c => normalizeDeltaCandle(c, resolution)).filter(Boolean);
  out.sort((a, b) => a.time - b.time);
  // Delta sometimes includes duplicate candle_start_time rows; keep the latest normalized copy per timestamp.
  const dedup = [];
  for (const c of out) {
    if (dedup.length && dedup[dedup.length - 1].time === c.time) dedup[dedup.length - 1] = c;
    else dedup.push(c);
  }
  return dedup;
}

function completedCandleEndUnix(resolution = '5m') {
  const sec = resolutionToSeconds(resolution);
  const now = Math.floor(Date.now() / 1000);
  // Use the last fully closed candle. This avoids the mismatch users see between live/in-progress candles and closed-candle API data.
  return Math.floor(now / sec) * sec - 1;
}

function currentCandleStartUnix(resolution = '5m') {
  const sec = resolutionToSeconds(resolution);
  const now = Math.floor(Date.now() / 1000);
  return Math.floor(now / sec) * sec;
}

function livePreviewCandles(symbol, resolution = '5m', closedCandles = [], settings = loadSettings()) {
  const candles = Array.isArray(closedCandles) ? closedCandles.map(c => ({ ...c, live: false })) : [];
  const sym = String(symbol || '').toUpperCase();
  const ticker = state.delta.tickersBySymbol?.[sym];
  const livePrice = extractTickerPrice(ticker, null);
  if (!Number.isFinite(livePrice) || livePrice <= 0 || !candles.length) return { candles, livePrice: candles.at(-1)?.close || null, usesLivePreview: false };
  const bucketStart = currentCandleStartUnix(resolution);
  const last = candles.at(-1);
  // The Delta history call is intentionally closed-candle only. For visual comparison with the live Delta/TradingView chart,
  // append a clearly marked in-progress candle using the live ticker price. Strategy execution still uses closed candles only.
  if (Number(last.time || 0) < bucketStart) {
    candles.push({
      time: bucketStart,
      open: Number(last.close),
      high: Math.max(Number(last.close), livePrice),
      low: Math.min(Number(last.close), livePrice),
      close: livePrice,
      volume: numberFrom(ticker?.volume || ticker?.turnover_usd || 0) || 0,
      resolution: normalizeResolution(resolution),
      live: true
    });
    return { candles, livePrice, usesLivePreview: true };
  }
  // Defensive path: if an exchange ever returns an active candle, keep the body visually current but do not use it for execution.
  if (Number(last.time || 0) === bucketStart) {
    last.high = Math.max(Number(last.high), livePrice);
    last.low = Math.min(Number(last.low), livePrice);
    last.close = livePrice;
    last.live = true;
    return { candles, livePrice, usesLivePreview: true };
  }
  return { candles, livePrice, usesLivePreview: false };
}

async function fetchDeltaCandles(symbol, resolution = '5m', settings = loadSettings(), limit = 900) {
  const sym = String(symbol || '').toUpperCase();
  const res = normalizeResolution(resolution);
  const sec = resolutionToSeconds(res);
  const end = completedCandleEndUnix(res);
  const count = Math.min(Math.max(Number(limit || 900), 120), 4000);
  const start = end - (count + 5) * sec;
  const base = String(settings.deltaBaseUrl || DEFAULT_SETTINGS.deltaBaseUrl).replace(/\/+$/, '');
  const url = `${base}/v2/history/candles?resolution=${encodeURIComponent(res)}&symbol=${encodeURIComponent(sym)}&start=${start}&end=${end}`;
  const json = await requestJson(url, { timeoutMs: 15000 });
  const candles = normalizeDeltaCandles(json, res).slice(-count);
  if (!candles.length) throw new Error(`Delta returned no ${res} candles for ${sym}`);
  const key = candleKey(sym, res);
  state.delta.candlesByKey = state.delta.candlesByKey || {};
  state.delta.candlesLastFetchAt = state.delta.candlesLastFetchAt || {};
  state.delta.candlesByKey[key] = candles;
  state.delta.candlesLastFetchAt[key] = new Date().toISOString();
  return candles;
}

async function refreshDeltaCandles(symbol, resolutions = ['5m','15m','1h'], settings = loadSettings(), force = false) {
  if (process.env.DELTA_SYNC_DISABLED === '1') return false;
  const sym = String(symbol || '').toUpperCase();
  if (!sym) return false;
  state.delta.candlesByKey = state.delta.candlesByKey || {};
  state.delta.candlesLastFetchAt = state.delta.candlesLastFetchAt || {};
  const now = Date.now();
  const minMs = Math.max(5, Number(settings.marketDataRefreshSeconds || 15)) * 1000;
  let ok = false;
  for (const res of resolutions.map(normalizeResolution)) {
    const key = candleKey(sym, res);
    const last = state.delta.candlesLastFetchAt[key] ? new Date(state.delta.candlesLastFetchAt[key]).getTime() : 0;
    if (!force && last && now - last < minMs && Array.isArray(state.delta.candlesByKey[key]) && state.delta.candlesByKey[key].length) { ok = true; continue; }
    try {
      await fetchDeltaCandles(sym, res, settings, res === '1h' ? 720 : 900);
      ok = true;
    } catch (error) {
      state.delta.candlesMessage = `${sym} ${res} candles unavailable: ${error.message}`;
      log('ERROR', state.delta.candlesMessage);
    }
  }
  return ok;
}

async function refreshDeltaCandlesForAssets(settings = loadSettings(), force = false) {
  if (process.env.DELTA_SYNC_DISABLED === '1') return false;
  const assets = Array.isArray(settings.assets) ? settings.assets : [];
  for (const symbol of assets) {
    await refreshDeltaCandles(symbol, ['5m','15m','1h'], settings, force);
  }
  return true;
}

function getCachedCandles(symbol, resolution = '5m') {
  const key = candleKey(symbol, resolution);
  return (state.delta.candlesByKey && Array.isArray(state.delta.candlesByKey[key])) ? state.delta.candlesByKey[key] : [];
}

function atrFromCandles(candles = [], length = 14) {
  const rows = Array.isArray(candles) ? candles : [];
  if (rows.length < 2) return 0;
  const trs = [];
  for (let i = 1; i < rows.length; i += 1) {
    const c = rows[i], p = rows[i - 1];
    trs.push(Math.max(c.high - c.low, Math.abs(c.high - p.close), Math.abs(c.low - p.close)));
  }
  const slice = trs.slice(-Math.max(1, Number(length || 14)));
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

function alignTimeSeriesToCandles(baseCandles = [], sourceCandles = [], values = []) {
  const out = [];
  let j = 0;
  for (const c of baseCandles) {
    while (j + 1 < sourceCandles.length && sourceCandles[j + 1].time <= c.time) j += 1;
    const v = values[j];
    out.push(Number.isFinite(v) ? v : null);
  }
  return out;
}

function macdSeriesForCandles(candles = [], settings = loadSettings()) {
  const closes = candles.map(c => Number(c.close)).filter(n => Number.isFinite(n) && n > 0);
  const raw = calculateMacdRaw(closes, settings);
  return raw.ready ? raw : { ...raw, lineSeries: raw.lineSeries || [], signalSeries: raw.signalSeries || [], histSeries: raw.histSeries || [] };
}


function isValidIpText(value) {
  const text = String(value || '').trim();
  if (!text) return false;
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(text)) {
    return text.split('.').every(part => Number(part) >= 0 && Number(part) <= 255);
  }
  return /^[0-9a-fA-F:]+$/.test(text) && text.includes(':');
}

async function detectServerOutboundIp() {
  const keys = loadKeys();
  if (process.env.DELTA_SYNC_DISABLED === '1') {
    keys.lastServerOutboundIp = '127.0.0.1';
    keys.lastServerOutboundIpAt = new Date().toISOString();
    keys.lastServerOutboundIpMessage = 'Local test mode: outbound IP detection skipped.';
    saveKeys(keys);
    return { ip: keys.lastServerOutboundIp, message: keys.lastServerOutboundIpMessage };
  }
  const services = [
    { url: 'https://api.ipify.org?format=json', pick: json => json && json.ip },
    { url: 'https://ifconfig.me/all.json', pick: json => json && (json.ip_addr || json.ip) },
    { url: 'https://checkip.amazonaws.com', raw: true }
  ];
  let lastError = '';
  for (const service of services) {
    try {
      let ip = '';
      if (service.raw) {
        ip = await requestText(service.url, { timeoutMs: 8000 });
      } else {
        const json = await requestJson(service.url, { timeoutMs: 8000 });
        ip = service.pick(json);
      }
      ip = String(ip || '').trim();
      if (!isValidIpText(ip)) throw new Error(`Invalid IP returned: ${ip || 'blank'}`);
      keys.lastServerOutboundIp = ip;
      keys.lastServerOutboundIpAt = new Date().toISOString();
      keys.lastServerOutboundIpMessage = 'Detected server outbound IP. Copy this exact IP to Delta whitelist.';
      saveKeys(keys);
      log('NET', `Server outbound IP detected: ${ip}`);
      return { ip, message: keys.lastServerOutboundIpMessage, detectedAt: keys.lastServerOutboundIpAt };
    } catch (error) {
      lastError = error.message || String(error);
    }
  }
  keys.lastServerOutboundIpMessage = `Outbound IP detection failed: ${lastError || 'unknown error'}`;
  keys.lastServerOutboundIpAt = new Date().toISOString();
  saveKeys(keys);
  log('ERROR', keys.lastServerOutboundIpMessage);
  throw new Error(keys.lastServerOutboundIpMessage);
}

function requestText(url, { method = 'GET', headers = {}, timeoutMs = 10000 } = {}) {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const req = https.request({
      method,
      hostname: target.hostname,
      port: target.port || 443,
      path: `${target.pathname}${target.search}`,
      headers: { Accept: 'text/plain, application/json', 'User-Agent': USER_AGENT, ...headers },
      timeout: timeoutMs
    }, res => {
      let text = '';
      res.on('data', chunk => { text += chunk; });
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) return reject(new Error(`HTTP ${res.statusCode}: ${text.slice(0, 160)}`));
        resolve(text);
      });
    });
    req.on('timeout', () => req.destroy(new Error('Outbound IP request timed out')));
    req.on('error', reject);
    req.end();
  });
}

async function refreshDeltaPublicData(settings = loadSettings(), force = false) {
  if (process.env.DELTA_SYNC_DISABLED === '1') {
    state.delta.status = 'FALLBACK_DEMO';
    state.delta.message = 'Delta sync disabled by environment for local test.';
    state.delta.lastFetchAt = new Date().toISOString();
    return state.delta;
  }
  const now = Date.now();
  const last = state.delta.lastFetchAt ? new Date(state.delta.lastFetchAt).getTime() : 0;
  const minMs = Math.max(5, Number(settings.marketDataRefreshSeconds || 15)) * 1000;
  if (!force && last && now - last < minMs) return state.delta;
  if (state.delta.requestInFlight) return state.delta;
  state.delta.requestInFlight = true;
  try {
    const base = settings.deltaBaseUrl.replace(/\/+$/, '');
    const [tickerJson, productJson] = await Promise.allSettled([
      requestJson(`${base}/v2/tickers?contract_types=perpetual_futures`, { timeoutMs: 12000 }),
      requestJson(`${base}/v2/products?contract_types=perpetual_futures`, { timeoutMs: 12000 })
    ]);

    if (tickerJson.status !== 'fulfilled') throw tickerJson.reason;
    const result = Array.isArray(tickerJson.value.result) ? tickerJson.value.result : [];
    const tickersBySymbol = {};
    for (const t of result) {
      if (t && t.symbol) tickersBySymbol[String(t.symbol).toUpperCase()] = t;
    }
    state.delta.tickersBySymbol = tickersBySymbol;

    if (productJson.status === 'fulfilled') {
      const products = Array.isArray(productJson.value.result) ? productJson.value.result : [];
      const productsBySymbol = {};
      for (const product of products) {
        const symbol = String(product?.symbol || product?.product_symbol || '').toUpperCase();
        if (symbol) productsBySymbol[symbol] = product;
      }
      state.delta.productsBySymbol = productsBySymbol;
      state.delta.productsLastFetchAt = new Date().toISOString();
    }

    state.delta.lastFetchAt = new Date().toISOString();
    state.delta.status = 'LIVE_DELTA';
    state.delta.message = `Loaded ${Object.keys(tickersBySymbol).length} Delta India tickers and ${Object.keys(state.delta.productsBySymbol || {}).length} product specs.`;
  } catch (error) {
    state.delta.status = 'FALLBACK_DEMO';
    state.delta.message = `Delta ticker unavailable: ${error.message}`;
    if (!state.delta.lastFetchAt) state.delta.lastFetchAt = new Date().toISOString();
  } finally {
    state.delta.requestInFlight = false;
  }
  return state.delta;
}

function generateSignalProfile(symbol, settings) {
  const tick = state.tick;
  const liveTicker = state.delta.tickersBySymbol[symbol];
  const candles5 = getCachedCandles(symbol, '5m');
  const fallback = state.market[symbol]?.price || BASE_PRICE[symbol] || 10;
  const candleClose = candles5.length ? candles5[candles5.length - 1].close : null;
  const price = roundCoin(symbol, candleClose || extractTickerPrice(liveTicker, simulatedPriceFor(symbol, tick)) || fallback);
  const base = BASE_PRICE[symbol] || price;
  const previous = state.market[symbol]?.price || base;
  const movePct = previous ? ((price - previous) / previous) * 100 : 0;
  const source = candles5.length ? 'DELTA_INDIA_OHLC_5M' : liveTicker ? 'DELTA_INDIA_PUBLIC_TICKER' : 'SIMULATED_FALLBACK';
  const volumeSeed = seededNoise(symbol, tick, 13);
  const zoneSeed = seededNoise(symbol, tick, 23);

  const webhook = latestWebhookSignal(symbol);
  const history = candles5.length ? candles5.map(c => c.close) : pushPriceHistory(symbol, price);
  if (candles5.length) state.priceHistory[symbol] = history.slice(-900);
  const structure = inferMarketStructure(history, price, settings);
  const raw = webhook?.raw || {};
  const atrPreview = candles5.length ? Math.max(atrFromCandles(candles5, Number(settings.atrPeriod || 14)), base * 0.001) : (state.market[symbol]?.atr || base * 0.006);
  const supportResistance = calculateSupportResistanceLocal(symbol, history, price, atrPreview, settings);
  const macdDivergenceSignal = calculateMacdDivergenceMtfLocal(symbol, history, price, atrPreview, settings);
  const webhookSarMacd = null;
  const localSarMacd = null;
  const twoPoleSignal = null;
  const breakoutSignal = null;
  const vwapSignal = null;
  const sarMacdSignal = null;
  let decision = macdDivergenceSignal?.pass && macdDivergenceSignal.entrySide ? macdDivergenceSignal.entrySide : 'WAIT';

  const expectedTrend = directionToTrend(decision);
  const hasStrategySignal = Boolean(macdDivergenceSignal?.pass && macdDivergenceSignal.entrySide === decision);
  const strategySignalSource = hasStrategySignal ? 'MACD_DIVERGENCE_MTF_EMA_LOCAL' : 'NONE';
  const webhookTrend = normalizeTrendValue(webhookField(raw, ['htfTrend', 'htf_trend', 'higherTimeframeTrend', 'higher_timeframe_trend', 'trend1h', 'trend_1h', 'marketStructure', 'market_structure']));
  const htfBias = webhookTrend || structure.trend;
  const aligned = decision === 'WAIT' ? 0 : (hasStrategySignal ? 2 : (htfBias === expectedTrend ? 1 : 0));
  const volume24h = numberFrom(liveTicker?.volume) || numberFrom(liveTicker?.turnover_usd) || 0;
  const volumeBoost = volume24h > 0 ? Math.min(18, Math.log10(Math.max(10, volume24h)) * 2) : Math.abs(volumeSeed) * 18;
  const hasDirection = decision === 'LONG' || decision === 'SHORT';
  const kdeScore = !hasDirection
    ? Math.max(20, Math.round(20 + Math.abs(volumeSeed) * 20))
    : Math.min(100, Math.round(82 + volumeBoost + Math.abs(movePct) * 8 + (hasStrategySignal ? 8 : 0)));

  const emaSlopePct = htfBias === 'BULLISH'
    ? Math.max(0.06, structure.confidence / 1000)
    : htfBias === 'BEARISH'
      ? -Math.max(0.06, structure.confidence / 1000)
      : 0;
  const emaOverride = parseMaybeBool(webhookField(raw, ['emaConfirm', 'ema_confirm', 'emaPass', 'ema_pass']));
  const supertrendOverrideBool = parseMaybeBool(webhookField(raw, ['supertrendConfirm', 'supertrend_confirm', 'supertrendPass', 'supertrend_pass']));
  const supertrendTrend = normalizeTrendValue(webhookField(raw, ['supertrend', 'superTrend', 'pivotSupertrend', 'pivot_supertrend', 'supertrendColor', 'supertrend_color']));
  const emaGatePass = emaOverride !== null ? emaOverride : Boolean(macdDivergenceSignal?.pass);
  const supertrendGatePass = supertrendOverrideBool !== null ? supertrendOverrideBool : Boolean(macdDivergenceSignal?.pass);
  const aboveEma = decision === 'LONG' && emaGatePass;
  const belowEma = decision === 'SHORT' && emaGatePass;
  const supertrendFlip = hasDirection && supertrendGatePass;
  const webhookZoneDistancePct = percentNumberFrom(webhookField(raw, ['zoneDistancePct', 'zone_distance_pct', 'sdZoneDistancePct', 'sd_zone_distance_pct', 'zoneDistance', 'zone_distance']));
  const fallbackZoneDistancePct = pct(0.05 + Math.abs(zoneSeed) * 0.95);
  const zoneDistancePct = hasDirection ? Math.max(0, webhookZoneDistancePct ?? fallbackZoneDistancePct) : 1 + Math.abs(zoneSeed);
  const fundingRate = pct(seededNoise(symbol, tick, 41) * 0.08);
  const newsBlackout = false;
  const atr = Math.max(base * 0.004, Math.abs(price * (0.004 + Math.abs(movePct) / 500)));
  const strategyFilters = webhookStrategyFilters(webhook, decision);

  const macdRaw = calculateMacd(history, settings);
  const macdOverride = webhookMacdOverride(webhook, decision);
  const macdPass = macdOverride.used ? macdOverride.pass : macdPassForDirection(macdRaw, decision);
  const macd = {
    ...macdRaw,
    pass: Boolean(macdPass),
    source: macdOverride.used ? macdOverride.source : 'LOCAL_PRICE_HISTORY'
  };
  if (macdOverride.used) {
    if (typeof macdOverride.line === 'number') macd.line = pct(macdOverride.line);
    if (typeof macdOverride.signal === 'number') macd.signal = pct(macdOverride.signal);
    if (typeof macdOverride.histogram === 'number') macd.histogram = pct(macdOverride.histogram);
    if (typeof macdOverride.previousHistogram === 'number') macd.previousHistogram = pct(macdOverride.previousHistogram);
    macd.ready = true;
    macd.state = decision === 'LONG' ? 'BULLISH' : decision === 'SHORT' ? 'BEARISH' : 'NEUTRAL';
  }

  let technicalStop = hasDirection ? technicalStopForDirection(symbol, decision, price, atr, history, settings) : null;
  if (hasDirection && settings.twoPoleModuleEnabled !== false && settings.twoPoleUseInvalidationStop !== false && twoPoleSignal?.invalidationLevel && (strategySignalSource === '2POLE_LOCAL' || strategySignalSource === 'TV_2POLE')) {
    technicalStop = twoPoleStopForDirection(symbol, decision, price, atr, twoPoleSignal.invalidationLevel, settings) || technicalStop;
  }
  if (hasDirection && settings.breakoutModuleEnabled !== false && breakoutSignal?.invalidationLevel && (strategySignalSource === 'BREAKOUT_LOCAL' || strategySignalSource === 'TV_BREAKOUT')) {
    technicalStop = breakoutStopForDirection(symbol, decision, price, atr, breakoutSignal.invalidationLevel, settings) || technicalStop;
  }
  if (hasDirection && settings.vwapModuleEnabled !== false && vwapSignal?.invalidationLevel && (strategySignalSource === 'VWAP_LOCAL' || strategySignalSource === 'TV_VWAP')) {
    technicalStop = vwapStopForDirection(symbol, decision, price, atr, vwapSignal.invalidationLevel, settings) || technicalStop;
  }
  if (hasDirection && macdDivergenceSignal?.invalidationLevel && strategySignalSource === 'MACD_DIVERGENCE_MTF_EMA_LOCAL') {
    technicalStop = technicalStopForDirection(symbol, decision, price, atr, history, settings);
    technicalStop = { ...technicalStop, sl: macdDivergenceSignal.invalidationLevel, reason: `MACD divergence swing SL with ATR buffer: ${macdDivergenceSignal.reason}` };
  }

  state.market[symbol] = { price, prevPrice: previous, atr, relVolume: 1 + Math.abs(volumeSeed), fundingRate, source, macd, structure, supportResistance, macdDivergenceSignal, sarMacdSignal, twoPoleSignal, breakoutSignal, vwapSignal };

  return {
    symbol,
    decision,
    hasWebhookSignal: Boolean(webhook),
    hasStrategySignal,
    strategySignalSource,
    webhookReceivedAt: webhook?.receivedAt || null,
    macdDivergenceSignal,
    sarMacdSignal,
    twoPoleSignal,
    breakoutSignal,
    vwapSignal,
    price,
    atr,
    emaSlopePct,
    aboveEma,
    belowEma,
    emaGatePass,
    supertrendFlip,
    supertrendGatePass,
    kdeScore,
    aligned,
    htfBias,
    marketStructure: structure,
    supportResistance,
    strategyFilters,
    zoneDistancePct,
    fundingRate,
    newsBlackout,
    source,
    macd,
    technicalStop,
    tickerTimestamp: liveTicker?.timestamp || null
  };
}

function passFail(profile, settings, wallet, trades) {
  const gates = [];
  const direction = profile.decision;
  const hasDirection = direction === 'LONG' || direction === 'SHORT';
  const oneAssetOpen = activeTradeExists(trades, profile.symbol);
  const equityForRiskGuard = Number(wallet.equity || 0);
  const dailyPnlForRiskGuard = Number(wallet.dailyPnl || 0);
  const dailyLimitBreached = equityForRiskGuard > 0
    && dailyPnlForRiskGuard < 0
    && dailyPnlForRiskGuard <= equityForRiskGuard * (Number(settings.dailyDrawdownLimitPct || -5) / 100);
  const concurrentLimitBreached = (trades.openTrades || []).filter(t => t.status === 'OPEN').length >= settings.maxConcurrentPositions;
  const fundingBad = hasDirection && Math.abs(profile.fundingRate) > settings.maxFundingRatePct8h;
  const hard = (name, pass, detail = '') => gates.push({ name, pass: Boolean(pass), hard: true, detail });
  const soft = (name, pass, detail = '') => gates.push({ name, pass: Boolean(pass), hard: false, detail });

  const sig = profile.macdDivergenceSignal || {};
  const sigModel = String(sig.entryModel || settings.entryModel || 'PRACTICAL_MTF_MACD').toUpperCase();
  const practicalModel = sigModel !== 'STRICT_TRANSCRIPT_DIVERGENCE';
  hard('MACD + MTF EMA Signal', hasDirection && Boolean(sig.pass) && sig.entrySide === direction, sig.reason || 'No valid closed-candle MACD/MTF trigger yet');
  hard('EMA50 15m vs 1h Trend Filter', hasDirection && Boolean(sig.conditions?.longTrend || sig.conditions?.shortTrend), `EMA15=${sig.ema15 || '-'} EMA1H=${sig.ema1h || '-'} gap=${sig.emaGapPct || '-'}%`);
  const divOk = direction === 'LONG'
    ? Boolean(sig.conditions?.priceLowerLow && sig.conditions?.macdHigherLow)
    : direction === 'SHORT'
      ? Boolean(sig.conditions?.priceHigherHigh && sig.conditions?.macdLowerHigh)
      : false;
  if (practicalModel && sig.zeroLineMode !== 'hard') soft('MACD Zero-Line Side Context', Boolean(sig.conditions?.zeroOk), `Soft filter in Practical mode. MACD=${sig.macdLine ?? '-'} Signal=${sig.macdSignal ?? '-'}`);
  else hard('MACD Zero-Line Side Held', hasDirection && Boolean(sig.conditions?.zeroOk), `MACD=${sig.macdLine ?? '-'} Signal=${sig.macdSignal ?? '-'}`);
  if (practicalModel && !sig.requireDivergenceForEntry) soft('Divergence Context', Boolean(divOk), sig.divergence ? `Optional in Practical mode. Price ${sig.divergence.priceFirst} -> ${sig.divergence.priceSecond}; MACD ${sig.divergence.macdFirst} -> ${sig.divergence.macdSecond}` : 'Optional in Practical mode; no clean confirmed divergence yet');
  else hard('Divergence Confirmed', hasDirection && divOk, sig.divergence ? `Price ${sig.divergence.priceFirst} -> ${sig.divergence.priceSecond}; MACD ${sig.divergence.macdFirst} -> ${sig.divergence.macdSecond}` : 'Need two confirmed pivots');
  hard('Histogram Color Change', hasDirection && Boolean(sig.conditions?.histColorChange), `Histogram color change required within ${sig.histColorLookback || settings.histColorLookback || 6} closed 5m candles`);
  hard('Confirmed MACD Crossover', hasDirection && Boolean(sig.conditions?.crossover), `Closed-candle MACD crossover required within ${sig.entrySignalWindowCandles || settings.entrySignalWindowCandles || 3} candle(s)`);
  if (settings.entryOrderType !== 'market' && settings.requirePullbackForExecution !== false) {
    soft('Limit Pullback Entry', Boolean(profile.decision === 'LONG' || profile.decision === 'SHORT'), 'Execution uses pullback limit order near support/resistance/MTF EMA. It is not a transcript filter; it improves entry price and avoids market chasing.');
  }

  soft('Support / Resistance Context', true, profile.supportResistance?.reason || 'Context only; not an entry engine');
  soft('Market Structure Context', true, profile.marketStructure?.reason || 'Context only; not an entry engine');

  const technicalSlOk = hasDirection && Boolean(profile.technicalStop?.sl && profile.technicalStop?.riskDistance > 0);
  hard('Technical SL Available', technicalSlOk, profile.technicalStop?.reason || 'Divergence swing SL with ATR buffer required');
  hard('Risk Guard', hasDirection && !dailyLimitBreached && !concurrentLimitBreached && !fundingBad && !profile.newsBlackout && !(settings.maxOnePositionPerAsset && oneAssetOpen), [
    dailyLimitBreached ? 'daily drawdown breached' : '',
    concurrentLimitBreached ? 'max concurrent positions reached' : '',
    fundingBad ? 'funding rate too high' : '',
    profile.newsBlackout ? 'news blackout' : '',
    settings.maxOnePositionPerAsset && oneAssetOpen ? 'one open position already exists for this asset' : ''
  ].filter(Boolean).join('; '));

  const hardGates = gates.filter(g => g.hard !== false);
  const passedCount = hardGates.filter(g => g.pass).length;
  return {
    gates,
    allPass: hardGates.every(g => g.pass),
    blockedBy: hardGates.find(g => !g.pass)?.name || null,
    trendVotes: passedCount,
    trendVotesRequired: hardGates.length,
    trendVoteText: `MACD-DIV-MTF ${passedCount}/${hardGates.length}`
  };
}



function compactGateAudit(gates = []) {
  const failed = gates.filter(g => !g.pass && g.hard !== false).map(g => g.name);
  const passed = gates.filter(g => g.pass && g.hard !== false).map(g => g.name);
  const softFailed = gates.filter(g => !g.pass && g.hard === false).map(g => `${g.name} (soft)`);
  const softPassed = gates.filter(g => g.pass && g.hard === false).map(g => `${g.name} (soft)`);
  return {
    failed,
    passed,
    softFailed,
    softPassed,
    failedText: failed.length ? failed.join(', ') : 'none',
    passedText: passed.length ? passed.join(', ') : 'none',
    softFailedText: softFailed.length ? softFailed.join(', ') : 'none',
    softPassedText: softPassed.length ? softPassed.join(', ') : 'none'
  };
}



function nextTriggerText(profile, result, candidate, settings) {
  const direction = profile?.decision || 'WAIT';
  const sig = profile?.macdDivergenceSignal || {};
  if (candidate && result?.allPass) return `READY: ${direction} setup passed; ${candidate.entryType === 'PULLBACK_LIMIT' ? 'place pullback limit order' : 'entry ready'} at ${candidate.entry}; SL ${candidate.sl}; TP2 ${candidate.tp2}.`;
  if (direction === 'WAIT') return sig.reason || 'WAIT: need EMA50(15m/1h) alignment + MACD divergence + histogram color change + confirmed crossover.';
  const failedHard = (result?.gates || []).filter(g => !g.pass && g.hard !== false).map(g => `${g.name}${g.detail ? ` (${g.detail})` : ''}`);
  return failedHard.length ? `WAIT: ${failedHard.slice(0, 3).join(' / ')}` : 'WAIT: setup is not clean enough yet.';
}

function displayPlanValue(value, fallback) {
  if (value === null || value === undefined || value === '' || value === '-') return fallback;
  return value;
}

function buildDecisionReason(profile, result, candidate, settings) {
  const audit = compactGateAudit(result?.gates || []);
  const direction = profile?.decision || 'WAIT';
  const status = result?.allPass ? 'ENTRY APPROVED' : 'ENTRY BLOCKED';
  const parts = [
    `${status}: ${direction}`,
    `Blocked by: ${result?.blockedBy || 'none'}`,
    `Passed gates: ${audit.passedText}`,
    `Failed hard gates: ${audit.failedText}`,
    `Soft context not blocking: ${audit.softFailedText}`,
    `HTF=${profile?.htfBias || '-'}`,
    `TrendVotes=${result?.trendVoteText || '-'}`,
    `Aligned=${profile?.aligned ?? '-'}`,
    `KDE=${profile?.kdeScore ?? '-'}`,
    `MACD=${settings?.macdConfirmationEnabled ? (profile?.macd?.pass ? 'PASS' : profile?.macd?.ready ? 'FAIL' : 'WARMUP') : 'OFF'}`,
    `SignalSource=${profile?.strategySignalSource || (profile?.hasWebhookSignal ? 'TV' : 'NONE')}`,
    `TV=${profile?.hasWebhookSignal ? 'YES' : 'NO'}`,
    `SupportResistance=${profile?.supportResistance?.reason || '-'}`,
    `Structure=${profile?.marketStructure?.reason || '-'}`,
    `NextAction=${nextTriggerText(profile, result, candidate, settings)}`
  ];
  if (profile?.macdDivergenceSignal) {
    const sig = profile.macdDivergenceSignal;
    parts.push(`MACD_MTF_SIGNAL=${sig.pass ? 'PASS' : sig.ready ? 'WAIT' : 'WARMUP'} (${sig.entryModel || 'PRACTICAL_MTF_MACD'})`);
    parts.push(`MACD_DIVERGENCE_Reason=${sig.reason || '-'}`);
    parts.push(`EMA50_15m=${sig.ema15 ?? '-'}`);
    parts.push(`EMA50_1h=${sig.ema1h ?? '-'}`);
    parts.push(`MACD_Line=${sig.macdLine ?? '-'}`);
    parts.push(`MACD_Signal=${sig.macdSignal ?? '-'}`);
    if (sig.invalidationLevel) parts.push(`StrategicSL=${sig.invalidationLevel}`);
    if (sig.tp2) parts.push(`StrategicTP=${sig.tp2}`);
  }
  if (profile?.sarMacdSignal) {
    parts.push(`EMA_SAR_MACD=${profile.sarMacdSignal.pass ? 'PASS' : profile.sarMacdSignal.ready ? 'WAIT' : 'WARMUP'}`);
    parts.push(`EMA_SAR_MACD_Reason=${profile.sarMacdSignal.reason || '-'}`);
    if (profile.sarMacdSignal.ema) parts.push(`EMA200=${profile.sarMacdSignal.ema}`);
    if (profile.sarMacdSignal.adx !== null && profile.sarMacdSignal.adx !== undefined) parts.push(`ADX=${profile.sarMacdSignal.adx}`);
    if (profile.sarMacdSignal.sar) parts.push(`SAR=${profile.sarMacdSignal.sar}`);
    if (profile.sarMacdSignal.macdHistogram !== null && profile.sarMacdSignal.macdHistogram !== undefined) parts.push(`CM_MACD_Hist=${profile.sarMacdSignal.macdHistogram}`);
    if (profile.sarMacdSignal.invalidationLevel) parts.push(`StrategicSL=${profile.sarMacdSignal.invalidationLevel}`);
  }
  if (profile?.twoPoleSignal) {
    parts.push(`TwoPole=${profile.twoPoleSignal.pass ? 'PASS' : profile.twoPoleSignal.ready ? 'NO_SIGNAL' : 'WARMUP'}`);
    parts.push(`TwoPoleReason=${profile.twoPoleSignal.reason || '-'}`);
    if (profile.twoPoleSignal.invalidationLevel) parts.push(`TwoPoleInvalidation=${profile.twoPoleSignal.invalidationLevel}`);
  }
  if (profile?.breakoutSignal) {
    parts.push(`Breakout=${profile.breakoutSignal.pass ? 'PASS' : profile.breakoutSignal.ready ? 'NO_SIGNAL' : 'WARMUP'}`);
    parts.push(`BreakoutReason=${profile.breakoutSignal.reason || '-'}`);
    if (profile.breakoutSignal.brokenLevel) parts.push(`BrokenLevel=${profile.breakoutSignal.brokenLevel}`);
    if (profile.breakoutSignal.invalidationLevel) parts.push(`BreakoutInvalidation=${profile.breakoutSignal.invalidationLevel}`);
    if (profile.breakoutSignal.chandelierLevel) parts.push(`Chandelier=${profile.breakoutSignal.chandelierLevel}`);
  }
  if (profile?.vwapSignal) {
    parts.push(`VWAP=${profile.vwapSignal.pass ? 'PASS' : profile.vwapSignal.ready ? 'NO_SIGNAL' : 'WARMUP'}`);
    parts.push(`VWAPReason=${profile.vwapSignal.reason || '-'}`);
    if (profile.vwapSignal.center) parts.push(`VWAPCenter=${profile.vwapSignal.center}`);
    if (profile.vwapSignal.lowerBand) parts.push(`VWAPLower=${profile.vwapSignal.lowerBand}`);
    if (profile.vwapSignal.upperBand) parts.push(`VWAPUpper=${profile.vwapSignal.upperBand}`);
    if (profile.vwapSignal.invalidationLevel) parts.push(`VWAPInvalidation=${profile.vwapSignal.invalidationLevel}`);
  }
  if (candidate) {
    parts.push(
      `Entry=${candidate.entry}`,
      `SL=${candidate.sl}`,
      `SL reason=${candidate.slReason || '-'}`,
      `TP1=${candidate.tp1}`,
      `TP1=${candidate.tp1} TP2=${candidate.tp2} FullPlan=${candidate.estimatedFullTradeProfitUsd ? '$'+candidate.estimatedFullTradeProfitUsd : '-'}`,
      `TP3=${candidate.tp3}`,
      `RR=${candidate.rr}`,
      `Margin=${candidate.marginUsedUsd || 0}`,
      `SizingMultiplier=${candidate.sizingMultiplier || 1}x`,
      `SizingReason=${candidate.sizingReason || '-'}`,
      `Leverage=${candidate.leverage || settings?.defaultLeverage || '-'}`,
      `Sizing=${candidate.marginPlan?.allowed ? 'PASS' : (candidate.marginPlan?.blockedReason || 'UNKNOWN')}`,
      `OrderType=${candidate.orderType || settings?.entryOrderType || '-'}`,
      `EntryType=${candidate.entryType || '-'}`,
      `Pullback=${candidate.entryReasonExtra || '-'}`
    );
  }
  if (profile?.strategyFilters) {
    parts.push(`Strategy filter=${profile.strategyFilters.pass ? 'PASS' : 'FAIL'} supplied=${profile.strategyFilters.suppliedCount || 0}`);
  }
  return parts.join(' | ');
}

function highProbabilitySizing(profile, settings) {
  if (settings.qualitySizingEnabled === false) return { multiplier: 1, reason: 'Quality sizing disabled' };
  if (!profile?.hasStrategySignal || !['LONG', 'SHORT'].includes(profile.decision)) return { multiplier: 1, reason: 'No valid strategy trigger' };
  const score = Number(profile.kdeScore || 0);
  const aligned = Number(profile.aligned || 0);
  const trendOk = profile.htfBias === directionToTrend(profile.decision) || aligned > 0;
  const sourceOk = String(profile.strategySignalSource || 'NONE') !== 'NONE';
  let multiplier = 1;
  const s1 = Number(settings.qualitySizeScore1 || 70);
  const s2 = Number(settings.qualitySizeScore2 || 82);
  if (sourceOk && trendOk && score >= s2) multiplier = Number(settings.qualitySizeMultiplier2 || 2);
  else if (sourceOk && score >= s1) multiplier = Number(settings.qualitySizeMultiplier1 || 1.5);
  multiplier = Math.min(Math.max(multiplier, 1), Math.min(Math.max(Number(settings.maxQualitySizeMultiplier || 2), 1), 5));
  const reason = multiplier > 1
    ? `High-probability sizing ${multiplier}x: score=${score}, source=${profile.strategySignalSource}, trend=${profile.htfBias}`
    : `Base sizing: score=${score}, source=${profile.strategySignalSource}, trend=${profile.htfBias}`;
  return { multiplier, reason };
}

function nearestPullbackEntry(profile, direction, settings) {
  const symbol = profile.symbol;
  const current = Number(profile.price || 0);
  const atr = Math.max(Number(profile.atr || 0), current * 0.001);
  const tick = Math.pow(10, -precisionForCoin(symbol));
  const minGap = Math.max(tick, atr * Math.min(Math.max(Number(settings.pullbackAtrMult || 0.20), 0.02), 1.5));
  const maxGap = atr * Math.min(Math.max(Number(settings.pullbackMaxAtrMult || 1.50), 0.2), 5);
  const sig = profile.macdDivergenceSignal || {};
  const sr = profile.supportResistance || {};
  const values = [Number(sig.ema15), Number(sig.ema1h)];
  if (direction === 'LONG') values.push(Number(sr.support));
  else values.push(Number(sr.resistance));
  const filtered = values.filter(v => Number.isFinite(v) && v > 0);
  let chosen = null;
  let source = 'ATR pullback';
  if (direction === 'LONG') {
    const below = filtered.filter(v => v < current - tick && current - v <= maxGap).sort((a, b) => b - a);
    if (below.length) { chosen = below[0]; source = chosen === Number(sr.support) ? 'support pullback' : chosen === Number(sig.ema15) ? 'EMA50 15m pullback' : 'EMA50 1h pullback'; }
    if (!chosen) chosen = current - minGap;
    chosen = Math.min(chosen, current - tick);
  } else if (direction === 'SHORT') {
    const above = filtered.filter(v => v > current + tick && v - current <= maxGap).sort((a, b) => a - b);
    if (above.length) { chosen = above[0]; source = chosen === Number(sr.resistance) ? 'resistance pullback' : chosen === Number(sig.ema15) ? 'EMA50 15m pullback' : 'EMA50 1h pullback'; }
    if (!chosen) chosen = current + minGap;
    chosen = Math.max(chosen, current + tick);
  }
  return {
    entry: roundCoin(symbol, chosen),
    source,
    current: roundCoin(symbol, current),
    gap: roundCoin(symbol, Math.abs(current - chosen)),
    gapAtr: atr ? pct(Math.abs(current - chosen) / atr) : 0,
    limitSide: direction === 'LONG' ? 'buy-limit below current price' : 'sell-limit above current price',
    support: sr.support || null,
    resistance: sr.resistance || null
  };
}

function entryFillableNow(direction, marketPrice, entry) {
  const p = Number(marketPrice || 0);
  const e = Number(entry || 0);
  if (!p || !e) return false;
  return direction === 'LONG' ? p <= e : p >= e;
}

function buildTradeCandidate(profile, settings, wallet, trades = loadTrades()) {
  if (profile.decision !== 'LONG' && profile.decision !== 'SHORT') return null;
  const direction = profile.decision;
  const currentPrice = Number(profile.price || 0);
  // V59: pullback is an execution preference, not a second mandatory signal after the MACD trigger.
  // Default behavior: enter with a limit order at the current closed-candle/ticker price.
  // If Require Pullback is enabled, place a pending pullback limit instead.
  const pullbackPlan = settings.entryOrderType !== 'market' && settings.requirePullbackForExecution === true
    ? nearestPullbackEntry(profile, direction, settings)
    : null;
  const entry = pullbackPlan?.entry || currentPrice;
  const stopPlan = settings.technicalSlEnabled !== false && profile.technicalStop?.sl
    ? profile.technicalStop
    : technicalStopForDirection(profile.symbol, direction, entry, profile.atr, state.priceHistory[profile.symbol] || [], settings);
  const sl = Number(stopPlan.sl || 0);
  const riskDistance = Math.abs(entry - sl);
  if (!entry || !sl || !riskDistance) return null;
  const isBreakoutEntry = false;
  const isVwapEntry = false;
  const isSarMacdEntry = false;
  const isMacdDivergenceEntry = profile.strategySignalSource === 'MACD_DIVERGENCE_MTF_EMA_LOCAL';
  const sizing = highProbabilitySizing(profile, settings);
  const tp1R = Math.min(Math.max(Number(settings.tp1TriggerR || 1.5), 1), 5);
  let tp1 = direction === 'LONG' ? entry + riskDistance * tp1R : entry - riskDistance * tp1R;
  let tp2 = direction === 'LONG' ? entry + riskDistance * 2 : entry - riskDistance * 2;
  let rewardR = 2;
  let tp3 = direction === 'LONG' ? entry + riskDistance * rewardR : entry - riskDistance * rewardR;
  if (isVwapEntry && profile.vwapSignal) {
    if (Number(profile.vwapSignal.tp1)) tp1 = Number(profile.vwapSignal.tp1);
    if (Number(profile.vwapSignal.tp2)) tp2 = Number(profile.vwapSignal.tp2);
    const vwapR = riskDistance ? Math.abs(tp2 - entry) / riskDistance : rewardR;
    rewardR = Math.max(1, pct(vwapR));
    tp3 = tp2;
  }
  if (isMacdDivergenceEntry && profile.macdDivergenceSignal) {
    if (Number(profile.macdDivergenceSignal.tp1)) tp1 = Number(profile.macdDivergenceSignal.tp1);
    if (Number(profile.macdDivergenceSignal.tp2)) tp2 = Number(profile.macdDivergenceSignal.tp2);
    rewardR = 2;
    tp3 = tp2;
  }
  const base = {
    entry: roundCoin(profile.symbol, entry),
    sl: roundCoin(profile.symbol, sl),
    tp1: roundCoin(profile.symbol, tp1),
    tp2: roundCoin(profile.symbol, tp2),
    tp3: roundCoin(profile.symbol, tp3),
    qty: 0,
    liveOrderSize: 0,
    rr: rewardR,
    minRR: Math.max(2, Number(settings.minRR || 2)),
    slMode: 'TECHNICAL_SL_FIRST_POSITION_SIZE_SECOND',
    slReason: stopPlan.reason || 'Technical stop',
    tp1R,
    sizingMultiplier: sizing.multiplier,
    sizingReason: sizing.reason,
    exitPlan: 'MACD Divergence + MTF EMA Plan: TP1 partial at 1R, move SL to breakeven/profit, TP2 closes remaining position at 2R. No other strategy modules are used.',
    entryType: pullbackPlan ? 'PULLBACK_LIMIT' : (settings.entryOrderType === 'market' ? 'MARKET_OR_IMMEDIATE' : 'IMMEDIATE_LIMIT'),
    orderType: settings.entryOrderType === 'market' ? 'market' : 'limit',
    currentPrice: roundCoin(profile.symbol, currentPrice),
    pullbackPlan,
    limitFillableNow: pullbackPlan ? entryFillableNow(direction, currentPrice, entry) : true,
    entryReasonExtra: pullbackPlan ? `${pullbackPlan.limitSide}; source=${pullbackPlan.source}; gap=${pullbackPlan.gap} (${pullbackPlan.gapAtr} ATR); support=${pullbackPlan.support || '-'} resistance=${pullbackPlan.resistance || '-'}` : (settings.entryOrderType === 'market' ? 'Immediate market execution allowed by settings' : 'Immediate limit execution at current price; no extra pullback wait'),
    chandelierLevel: isBreakoutEntry ? (profile.breakoutSignal?.chandelierLevel || null) : null
  };
  const rowLike = { coin: profile.symbol, price: entry, candidate: base };
  const product = state.delta.productsBySymbol?.[String(profile.symbol).toUpperCase()] || null;
  const useExchangeCompatibleSizing = Boolean(
    product && (
      (!settings.paperTrade && liveReady(settings, loadKeys())) ||
      (settings.paperTrade && settings.paperLiveCompatibleSizing !== false)
    )
  );
  const plan = calculateMarginPlan(rowLike, settings, trades, product, null, { live: useExchangeCompatibleSizing });
  base.marginPlan = plan;
  base.marginUsedUsd = plan.marginUsd;
  base.notionalUsd = plan.notionalUsd;
  base.leverage = plan.leverage;
  base.estimatedStopLossUsd = plan.estimatedStopLossUsd;
  base.dynamicRiskCapUsd = plan.dynamicRiskCapUsd;
  base.estimatedTp1ProfitUsd = plan.estimatedTp1ProfitUsd;
  base.estimatedTp2ProfitUsd = plan.estimatedTp2ProfitUsd;
  base.estimatedFullTradeProfitUsd = plan.estimatedFullTradeProfitUsd;
  base.plannedProfitR = plan.plannedProfitR;
  base.minFullTradeProfitUsd = plan.minFullTradeProfitUsd;
  base.targetFullTradeProfitUsd = plan.targetFullTradeProfitUsd;
  base.minTargetProfitUsd = plan.minTargetProfitUsd;
  base.targetProfitUsd = plan.targetProfitUsd;
  base.profitTargetStatus = plan.profitTargetStatus;
  base.maxMarginCapUsd = plan.marginCapUsd;
  base.liveOrderSize = plan.liveOrderSize || Math.max(1, Math.floor(Number(settings.liveOrderSize || 1)));
  base.qty = plan.notionalUsd > 0 && entry > 0 ? Math.round((plan.notionalUsd / entry) * 1000000) / 1000000 : 0;
  return base;
}

function evaluateSymbol(symbol, settings, wallet, trades) {
  const profile = generateSignalProfile(symbol, settings);
  const candidate = buildTradeCandidate(profile, settings, wallet, trades);
  const result = passFail(profile, settings, wallet, trades);
  if (candidate?.marginPlan) {
    const sizingPass = Boolean(candidate.marginPlan.allowed);
    result.gates.push({ name: 'Sizing', pass: sizingPass });
    if (!sizingPass) {
      result.allPass = false;
      result.blockedBy = `Sizing: ${candidate.marginPlan.blockedReason}`;
    }
  }
  const q = result.allPass ? 'STRONG' : (profile.hasStrategySignal && profile.kdeScore >= Math.max(45, Number(settings.kdeThreshold || 55) - 10) ? 'WATCH' : 'WEAK');

  return {
    coin: symbol,
    tier: ['BTCUSD', 'ETHUSD', 'SOLUSD', 'BNBUSD'].includes(symbol) ? 'TIER 1 — MAJOR COINS' : 'TIER 2 — MID CAP / INTRADAY',
    dec: profile.decision,
    t15m: result.trendVoteText || (profile.decision === 'WAIT' ? 'Votes 0/4' : (profile.decision === 'LONG' ? 'Bull' : 'Bear')),
    trendStack: result.trendVoteText || '-',
    htf: profile.htfBias,
    support: profile.supportResistance?.support || '-',
    resistance: profile.supportResistance?.resistance || '-',
    nextTrigger: nextTriggerText(profile, result, candidate, settings),
    score: profile.decision === 'WAIT' ? Math.min(profile.kdeScore, 45) : (!settings.macdConfirmationEnabled || profile.macd?.pass ? profile.kdeScore : Math.min(profile.kdeScore, 70)),
    q,
    en: displayPlanValue(candidate ? candidate.entry : '-', 'NO ENTRY'),
    sl: displayPlanValue(candidate ? candidate.sl : '-', 'NO SL'),
    t1: displayPlanValue(candidate ? candidate.tp1 : '-', 'NO TP'),
    t2: displayPlanValue(candidate ? candidate.tp2 : '-', 'NO TP'),
    t3: displayPlanValue(candidate ? candidate.tp3 : '-', 'NO TP'),
    rr: displayPlanValue(candidate ? candidate.rr : '-', 'NO RR'),
    price: profile.price,
    fundingRate: profile.fundingRate,
    zoneDistancePct: pct(profile.zoneDistancePct),
    gates: result.gates,
    pass: result.allPass,
    blockedBy: result.blockedBy,
    entryReason: buildDecisionReason(profile, result, candidate, settings),
    whyReason: buildDecisionReason(profile, result, candidate, settings),
    source: profile.source,
    macd: profile.macd,
    marketStructure: profile.marketStructure,
    supportResistance: profile.supportResistance,
    strategyFilters: profile.strategyFilters,
    technicalStop: profile.technicalStop,
    hasWebhookSignal: Boolean(profile.hasWebhookSignal),
    hasStrategySignal: Boolean(profile.hasStrategySignal),
    strategySignalSource: profile.strategySignalSource || 'NONE',
    macdDivergenceSignal: profile.macdDivergenceSignal,
    sarMacdSignal: profile.sarMacdSignal,
    twoPoleSignal: profile.twoPoleSignal,
    breakoutSignal: profile.breakoutSignal,
    vwapSignal: profile.vwapSignal,
    webhookReceivedAt: profile.webhookReceivedAt || null,
    macdStatus: profile.macdDivergenceSignal?.pass ? 'PASS' : profile.macdDivergenceSignal?.ready ? 'WAIT' : 'WARMUP',
    marginUsd: candidate?.marginUsedUsd || 0,
    maxMarginCapUsd: candidate?.maxMarginCapUsd || marginCapForSymbol(symbol, settings),
    estimatedStopLossUsd: candidate?.estimatedStopLossUsd || 0,
    dynamicRiskCapUsd: candidate?.dynamicRiskCapUsd || 0,
    notionalUsd: candidate?.notionalUsd || 0,
    leverage: candidate?.leverage || settings.defaultLeverage,
    estimatedTp1ProfitUsd: candidate?.estimatedTp1ProfitUsd || 0,
    estimatedTp2ProfitUsd: candidate?.estimatedTp2ProfitUsd || 0,
    estimatedFullTradeProfitUsd: candidate?.estimatedFullTradeProfitUsd || 0,
    plannedProfitR: candidate?.plannedProfitR || 0,
    minFullTradeProfitUsd: candidate?.minFullTradeProfitUsd || 0,
    targetFullTradeProfitUsd: candidate?.targetFullTradeProfitUsd || 0,
    minTargetProfitUsd: candidate?.minTargetProfitUsd || 0,
    targetProfitUsd: candidate?.targetProfitUsd || 0,
    profitTargetStatus: candidate?.profitTargetStatus || '',
    candidate
  };
}

function latestWebhookSignal(symbol) {
  const signals = readJson('webhookSignals.json', []);
  const freshness = Math.max(30, Number(loadSettings().tradingViewSignalFreshnessSeconds || 90));
  const cutoff = Date.now() - freshness * 1000;
  const sig = signals.find(s => s.symbol === symbol && new Date(s.receivedAt).getTime() >= cutoff);
  if (!sig) return null;
  if (sig.side !== 'LONG' && sig.side !== 'SHORT') return null;
  return sig;
}

function refreshOpenTradePrices(trades) {
  for (const trade of trades.openTrades || []) {
    const m = state.market[trade.coin];
    if (m?.price) trade.price = roundCoin(trade.coin, m.price);
    trade.marketSource = m?.source || trade.marketSource || 'UNKNOWN';
    if (String(trade.status || '').toUpperCase() === 'PENDING_LIMIT') {
      trade.pnl = 0;
      trade.pnlPct = 0;
      trade.profitR = 0;
      const filled = entryFillableNow(trade.side, trade.price, trade.entry);
      if (filled) {
        trade.status = 'OPEN';
        trade.filledAt = new Date().toISOString();
        trade.fillPrice = trade.entry;
        appendTradeJournalEvent('FILL', trade, { entry: trade.entry, marketPrice: trade.price, note: 'Paper/live limit marked filled when price touched entry.' });
        log('ORDER', `${trade.coin} ${trade.side} pullback limit filled at ${trade.entry}.`);
      } else {
        continue;
      }
    }
    const sideMult = trade.side === 'LONG' ? 1 : -1;
    const priceMovePct = trade.entry ? ((trade.price - trade.entry) / trade.entry) : 0;
    const notional = Number(trade.notionalUsd || 0);
    trade.pnl = pct(notional ? notional * priceMovePct * sideMult : (trade.price - trade.entry) * (trade.qty || 1) * sideMult);
    trade.pnlPct = pct(priceMovePct * 100 * sideMult);
    trade.estimatedLossAtSlUsd = money((Number(trade.notionalUsd || 0)) * priceRiskPct(trade.entry, trade.sl));
    trade.lossProgressPct = lossProgressPct(trade);
    trade.profitR = pct(profitRForTrade(trade));
  }
}

function lossProgressPct(trade) {
  const entry = Number(trade.entry || 0);
  const price = Number(trade.price || 0);
  const sl = Number(trade.sl || 0);
  if (!entry || !price || !sl) return 0;
  let progress = 0;
  if (trade.side === 'LONG') progress = (entry - price) / Math.max(entry - sl, 0.00000001);
  else progress = (price - entry) / Math.max(sl - entry, 0.00000001);
  return pct(Math.max(0, Math.min(200, progress * 100)));
}

function tradeSideMult(tradeOrSide) {
  const side = typeof tradeOrSide === 'string' ? tradeOrSide : tradeOrSide?.side;
  return String(side || '').toUpperCase() === 'LONG' ? 1 : -1;
}

function tradeInitialEntry(trade) {
  return Number(trade.initialEntry || trade.entry || 0);
}

function tradeInitialRiskDistance(trade) {
  const stored = Number(trade.initialRiskDistance || 0);
  if (stored > 0) return stored;
  const entry = tradeInitialEntry(trade);
  const initialSl = Number(trade.initialSl || trade.sl || 0);
  return entry && initialSl ? Math.abs(entry - initialSl) : 0;
}

function profitRForTrade(trade) {
  const entry = tradeInitialEntry(trade);
  const price = Number(trade.price || 0);
  const risk = tradeInitialRiskDistance(trade);
  if (!entry || !price || !risk) return 0;
  return ((price - entry) * tradeSideMult(trade)) / risk;
}

function isProtectiveStopBetter(side, nextSl, currentSl) {
  const n = Number(nextSl || 0);
  const c = Number(currentSl || 0);
  if (!n) return false;
  if (!c) return true;
  return side === 'LONG' ? n > c : n < c;
}

function clampProtectiveStop(symbol, side, nextSl, currentSl, price) {
  const n = Number(nextSl || 0);
  const p = Number(price || 0);
  if (!n || !p) return null;
  if (side === 'LONG' && n >= p) return null;
  if (side === 'SHORT' && n <= p) return null;
  if (!isProtectiveStopBetter(side, n, currentSl)) return null;
  return roundCoin(symbol, n);
}

function stopHit(trade) {
  const price = Number(trade.price || 0);
  const sl = Number(trade.sl || 0);
  if (!price || !sl) return false;
  return trade.side === 'LONG' ? price <= sl : price >= sl;
}

function targetRPrice(trade, r) {
  const entry = tradeInitialEntry(trade);
  const risk = tradeInitialRiskDistance(trade);
  if (!entry || !risk) return 0;
  return trade.side === 'LONG' ? entry + risk * Number(r || 0) : entry - risk * Number(r || 0);
}

function targetPriceHit(trade, targetPrice) {
  const target = Number(targetPrice || 0);
  const price = Number(trade.price || 0);
  if (!target || !price) return false;
  return trade.side === 'LONG' ? price >= target : price <= target;
}

function tp1ReachedForTrade(trade, settings) {
  const triggerR = Number(settings.tp1TriggerR || 1.5);
  const r = profitRForTrade(trade);
  const tp1 = Number(trade.tp1 || 0);
  const priceHit = targetPriceHit(trade, tp1);
  const rHit = r >= triggerR;
  return {
    hit: Boolean(priceHit || rHit),
    priceHit,
    rHit,
    r,
    triggerR,
    tp1,
    reason: priceHit ? `TP1 price ${tp1} reached at ${trade.price}` : rHit ? `${pct(r)}R reached TP1 trigger ${triggerR}R` : `TP1 not reached; price=${trade.price} tp1=${tp1 || '-'} r=${pct(r)}R`
  };
}

function tp2ReachedForTrade(trade, settings) {
  const triggerR = 2;
  const r = profitRForTrade(trade);
  const tp2 = Number(trade.tp2 || 0);
  const priceHit = targetPriceHit(trade, tp2);
  const rHit = r >= triggerR;
  return {
    hit: Boolean(priceHit || rHit),
    priceHit,
    rHit,
    r,
    triggerR,
    tp2,
    reason: priceHit ? `TP2 price ${tp2} reached at ${trade.price}` : rHit ? `${pct(r)}R reached TP2 trigger ${triggerR}R` : `TP2 not reached; price=${trade.price} tp2=${tp2 || '-'} r=${pct(r)}R`
  };
}

function pnlForNotional(side, entry, exit, notional) {
  const e = Number(entry || 0);
  const x = Number(exit || 0);
  const n = Number(notional || 0);
  if (!e || !x || !n) return 0;
  return n * ((x - e) / e) * tradeSideMult(side);
}

function managementKey(trade) {
  return String(trade.id || `${trade.mode || 'paper'}:${trade.coin}:${trade.side}:${trade.entry}`).replace(/[^A-Za-z0-9:_-]/g, '_');
}

function loadManagementState() {
  return readJson('tradeManagement.json', {});
}

function saveManagementState(data) {
  writeJson('tradeManagement.json', data || {});
}

function tradeManagementStateFor(trade, store) {
  const key = managementKey(trade);
  store[key] = store[key] || {};
  return store[key];
}

function pushManagementEvent(trade, message, meta = {}) {
  trade.managementEvents = Array.isArray(trade.managementEvents) ? trade.managementEvents : [];
  const event = { time: new Date().toISOString(), message, ...meta };
  trade.managementEvents.unshift(event);
  trade.managementEvents = trade.managementEvents.slice(0, 20);
  trade.lastManagedAt = event.time;
  return event;
}

function runScan({ autoExecute = false } = {}) {
  const settings = loadSettings();
  const paperWallet = loadWallet();
  const wallet = effectiveWallet(settings, paperWallet);
  const localTrades = loadTrades();
  const trades = authoritativeTrades(settings, localTrades);
  initializeMarket(settings);
  state.tick += 1;

  const rows = settings.assets.map(symbol => evaluateSymbol(symbol, settings, wallet, trades));
  state.lastRows = rows;
  state.lastScanAt = new Date().toISOString();

  refreshOpenTradePrices(trades);

  if (settings.botEnabled && autoExecute) {
    for (const row of rows) {
      if (!row.pass || !row.candidate) continue;
      if ((trades.openTrades || []).length >= settings.maxConcurrentPositions) break;
      const exists = trades.openTrades.some(t => t.coin === row.coin && isActiveTradeStatus(t.status));
      if (exists) continue;
      if (!liveReady(settings, loadKeys())) {
        const order = openPaperTrade(row, settings, trades, wallet);
        if (order) log('PAPER', `${row.coin} ${row.dec} ${order.status === 'PENDING_LIMIT' ? 'pending pullback limit placed' : 'paper trade opened'} by scanner.`, { tradeId: order.id, status: order.status });
      }
    }
  }

  if (settings.paperTrade) saveTrades(localTrades);
  return getStatePayload(settings, paperWallet, trades, rows);
}

async function runScanAsync({ autoExecute = false, forceDelta = false } = {}) {
  let settings = loadSettings();
  const keys = loadKeys();
  await refreshDeltaPublicData(settings, forceDelta);
  await refreshDeltaCandlesForAssets(settings, forceDelta);
  await syncLiveAccountIfReady(settings, keys, { force: forceDelta });
  settings = loadSettings();
  const payload = runScan({ autoExecute: false });
  if (settings.botEnabled && autoExecute) {
    const localTrades = loadTrades();
    const paperWallet = loadWallet();
    const wallet = effectiveWallet(settings, paperWallet);
    const usingLiveAccount = liveReady(settings, loadKeys());
    const liveModeRequested = !settings.paperTrade;
    const trades = usingLiveAccount ? authoritativeTrades(settings, localTrades) : localTrades;
    refreshOpenTradePrices(trades);
    await processTradeManagement(payload.rows, settings, trades, wallet, { live: usingLiveAccount });
    for (const row of payload.rows) {
      if (!row.pass || !row.candidate) continue;
      if ((trades.openTrades || []).length >= settings.maxConcurrentPositions) break;
      const exists = trades.openTrades.some(t => t.coin === row.coin && isActiveTradeStatus(t.status));
      if (exists) continue;
      if (usingLiveAccount) {
        try {
          const order = await openLiveTrade(row, settings, trades, wallet);
          if (order) log('LIVE', `${row.coin} ${row.dec} LIVE Delta order sent by the same scanner engine used for paper.`, { tradeId: order.id, exchangeOrderId: order.exchangeOrderId || null, marginUsd: order.marginUsedUsd });
        } catch (error) {
          log('ERROR', `Live order blocked/failed for ${row.coin}: ${error.message}`);
        }
      } else if (liveModeRequested) {
        log('SAFE', `${row.coin} ${row.dec} signal passed, but LIVE order was not sent because live readiness failed: ${liveBlockReason(settings, loadKeys(), { ignorePaper: true }) || 'unknown live readiness failure'}`);
      } else {
        const order = openPaperTrade(row, settings, trades, wallet);
        if (order) log('PAPER', `${row.coin} ${row.dec} ${order.status === 'PENDING_LIMIT' ? 'pending pullback limit placed' : 'paper trade opened'} by the same scanner engine used for live.`, { tradeId: order.id, status: order.status, marginUsd: order.marginUsedUsd });
      }
    }
    if (!usingLiveAccount) saveTrades(trades);
    if (!usingLiveAccount && wallet.source !== 'DELTA_WALLET_REFERENCE_PAPER') saveWallet(wallet);
    if (usingLiveAccount) await syncLiveAccountIfReady(settings, loadKeys(), { force: true });
  }
  return getStatePayload();
}


function shouldAddOnTrade(trade, row, settings, managementState = {}) {
  if (settings.tradeManagementEnabled === false) return { ok: false, reason: 'Trade management disabled' };
  if (settings.profitAddOnEnabled === false || settings.autoAddOnEnabled === false) return { ok: false, reason: 'Profit add-on disabled' };
  if (!row || row.dec !== trade.side) return { ok: false, reason: 'No same-side chart signal active' };
  if (settings.profitAddOnRequireFreshSignal !== false && !row.pass) return { ok: false, reason: 'Same-side signal is not currently passing' };
  if (Number(row.score || 0) < Number(settings.profitAddOnMinScore || 70)) return { ok: false, reason: `Score ${row.score || 0} below add-on minimum ${settings.profitAddOnMinScore || 70}` };
  const usedAddOns = Math.max(Number(trade.addOnCount || 0), Number(managementState.addOnCount || 0));
  if (usedAddOns >= Number(settings.maxAddOnsPerCoin || 1)) return { ok: false, reason: 'Max protected add-ons already used' };
  const r = profitRForTrade(trade);
  if (r < Number(settings.profitAddOnTriggerR || 2)) return { ok: false, reason: `Profit ${pct(r)}R has not reached add-on trigger ${settings.profitAddOnTriggerR || 2}R` };
  const entry = tradeInitialEntry(trade);
  const sl = Number(trade.sl || 0);
  const slProtected = trade.side === 'LONG' ? sl >= entry : sl <= entry;
  if (settings.protectedAddOnNoLossOnly !== false && !slProtected) return { ok: false, reason: 'SL is not yet at breakeven/profit; add-on refused' };
  const remaining = marginCapForSymbol(trade.coin, settings) - Number(trade.marginUsedUsd || 0);
  if (remaining < Number(settings.minEntryMarginUsd || 1)) return { ok: false, reason: 'No remaining margin cap for this coin' };
  return { ok: true, reason: `Protected add-on allowed at ${pct(r)}R with score ${row.score}` };
}

function addOnTargetMargin(trade, settings) {
  const cap = addOnStepForSymbol(trade.coin, settings);
  const pctOfCurrent = Number(trade.marginUsedUsd || 0) * Math.min(Math.max(Number(settings.profitAddOnSizePct || 50), 1), 100) / 100;
  return money(Math.min(cap, Math.max(Number(settings.minEntryMarginUsd || 1), pctOfCurrent || cap)));
}

function proposedNoLossStopAfterAddOn(trade, addEntry, addNotional, settings) {
  const currentNotional = Number(trade.notionalUsd || 0);
  const currentEntry = Number(trade.entry || trade.initialEntry || addEntry);
  const combinedNotional = currentNotional + Number(addNotional || 0);
  if (!combinedNotional) return null;
  const avgEntry = ((currentEntry * currentNotional) + (Number(addEntry) * Number(addNotional || 0))) / combinedNotional;
  const risk = tradeInitialRiskDistance(trade);
  const buffer = risk * Math.max(0, Number(settings.breakEvenBufferR || 0.03));
  return trade.side === 'LONG' ? avgEntry + buffer : avgEntry - buffer;
}

function buildAddOnPlan(trade, row, settings, opts = {}) {
  const product = state.delta.productsBySymbol?.[String(trade.coin).toUpperCase()] || null;
  const addEntry = Number(row.price || trade.price || trade.entry);
  const targetMargin = addOnTargetMargin(trade, settings);
  const leverage = Math.min(Math.max(Number(trade.leverage || settings.defaultLeverage || 3), 1), Math.min(Math.max(Number(settings.maxLeverage || 25), 1), 25));
  const preliminaryNotional = targetMargin * leverage;
  const proposedSlRaw = proposedNoLossStopAfterAddOn(trade, addEntry, preliminaryNotional, settings);
  const proposedSl = clampProtectiveStop(trade.coin, trade.side, proposedSlRaw, trade.sl, addEntry);
  if (!proposedSl) return { allowed: false, blockedReason: 'Not enough open profit to place no-loss combined SL after add-on' };

  const rowLike = {
    coin: trade.coin,
    price: addEntry,
    candidate: {
      entry: addEntry,
      sl: proposedSl,
      tp1: Number(trade.tp1),
      tp2: Number(trade.tp2)
    }
  };
  const plan = calculateMarginPlan(rowLike, settings, loadTrades(), product, trade, { addOn: true, live: opts.live, addOnDesiredMargin: targetMargin });
  if (!plan.allowed) return { allowed: false, blockedReason: plan.blockedReason, plan };
  const currentNotional = Number(trade.notionalUsd || 0);
  const combinedNotional = currentNotional + Number(plan.notionalUsd || 0);
  const projectedAvgEntry = combinedNotional > 0 ? ((Number(trade.entry || addEntry) * currentNotional) + (addEntry * Number(plan.notionalUsd || 0))) / combinedNotional : addEntry;
  const pnlAtProposedSl = money(pnlForNotional(trade.side, projectedAvgEntry, proposedSl, combinedNotional));
  if (settings.protectedAddOnNoLossOnly !== false && pnlAtProposedSl < -0.01) {
    return { allowed: false, blockedReason: `Protected add-on refused; projected SL P/L would be $${pnlAtProposedSl}`, plan };
  }
  return {
    allowed: true,
    entry: addEntry,
    marginUsd: plan.marginUsd,
    notionalUsd: plan.notionalUsd,
    leverage: plan.leverage,
    liveOrderSize: plan.liveOrderSize || 0,
    estimatedStopLossUsd: 0,
    proposedSl,
    projectedAvgEntry: roundCoin(trade.coin, projectedAvgEntry),
    pnlAtProposedSl,
    plan
  };
}

function applyAddOnToTrade(trade, addon, settings) {
  const oldNotional = Number(trade.notionalUsd || 0);
  const oldEntry = Number(trade.entry || addon.entry);
  const addNotional = Number(addon.notionalUsd || 0);
  const newNotional = oldNotional + addNotional;
  if (newNotional > 0) trade.entry = roundCoin(trade.coin, ((oldEntry * oldNotional) + (addon.entry * addNotional)) / newNotional);
  trade.marginUsedUsd = money(Number(trade.marginUsedUsd || 0) + Number(addon.marginUsd || 0));
  trade.notionalUsd = money(newNotional);
  trade.leverage = addon.leverage || trade.leverage || settings.defaultLeverage;
  trade.qty = trade.notionalUsd && trade.entry ? Math.round((trade.notionalUsd / trade.entry) * 1000000) / 1000000 : trade.qty;
  trade.liveOrderSize = Number(trade.liveOrderSize || 0) + Number(addon.liveOrderSize || 0);
  if (addon.proposedSl) trade.sl = roundCoin(trade.coin, addon.proposedSl);
  trade.addOnCount = Number(trade.addOnCount || 0) + 1;
  trade.addOns = Array.isArray(trade.addOns) ? trade.addOns : [];
  trade.addOns.push({
    time: new Date().toISOString(),
    entry: addon.entry,
    marginUsd: addon.marginUsd,
    notionalUsd: addon.notionalUsd,
    liveOrderSize: addon.liveOrderSize || null,
    exchangeOrderId: addon.exchangeOrderId || null,
    protectedSl: addon.proposedSl || null,
    projectedAvgEntry: addon.projectedAvgEntry || null
  });
  pushManagementEvent(trade, `Protected add-on applied; SL moved to ${trade.sl}`, { marginUsd: addon.marginUsd, notionalUsd: addon.notionalUsd });
  trade.estimatedLossAtSlUsd = money(Math.max(0, trade.notionalUsd * priceRiskPct(trade.entry, trade.sl)));
  return trade;
}

function closeTradePortionInMemory(trades, wallet, trade, closePct, reason, priceOverride = null) {
  const pctToClose = Math.min(Math.max(Number(closePct || 0), 0), 100);
  if (pctToClose <= 0) return null;
  const price = Number(priceOverride || state.market[trade.coin]?.price || trade.price || trade.entry);
  const notionalBefore = Number(trade.notionalUsd || 0);
  const marginBefore = Number(trade.marginUsedUsd || 0);
  const liveSizeBefore = Number(trade.liveOrderSize || 0);
  const closeNotional = money(notionalBefore * pctToClose / 100);
  const closeMargin = money(marginBefore * pctToClose / 100);
  const pnl = money(pnlForNotional(trade.side, trade.entry, price, closeNotional));
  const closed = {
    id: `${String(trade.id).replace(/^T-/, 'C-')}-${Date.now().toString(36).toUpperCase()}`,
    parentTradeId: trade.id,
    coin: trade.coin,
    side: trade.side,
    entry: trade.entry,
    exit: roundCoin(trade.coin, price),
    pnl,
    result: pnl > 0 ? 'WIN' : pnl < 0 ? 'LOSS' : 'BREAKEVEN',
    closedAt: new Date().toISOString(),
    mode: trade.mode || 'paper',
    closePct: pctToClose,
    closeReason: reason,
    marketSource: state.market[trade.coin]?.source || trade.marketSource || 'UNKNOWN'
  };
  trades.closedTrades.unshift(closed);
  appendTradeJournalEvent(pctToClose >= 99.999 ? 'CLOSE' : 'PARTIAL_CLOSE', closed, { closeReason: reason, closePct: pctToClose });
  if (pctToClose >= 99.999) {
    const idx = trades.openTrades.findIndex(t => t.id === trade.id);
    if (idx >= 0) trades.openTrades.splice(idx, 1);
  } else {
    trade.notionalUsd = money(Math.max(0, notionalBefore - closeNotional));
    trade.marginUsedUsd = money(Math.max(0, marginBefore - closeMargin));
    trade.liveOrderSize = Math.max(0, liveSizeBefore - Math.floor(liveSizeBefore * pctToClose / 100));
    trade.qty = trade.notionalUsd && trade.entry ? Math.round((trade.notionalUsd / trade.entry) * 1000000) / 1000000 : trade.qty;
    trade.remainingPct = money(Math.max(0, Number(trade.remainingPct || 100) - pctToClose));
    pushManagementEvent(trade, `${reason}: closed ${pctToClose}% at ${closed.exit}`, { pnl });
  }
  if (wallet && wallet.source !== 'DELTA_WALLET_REFERENCE_PAPER') {
    wallet.dailyPnl = pct((wallet.dailyPnl || 0) + pnl);
    wallet.weeklyPnl = pct((wallet.weeklyPnl || 0) + pnl);
    wallet.monthlyPnl = pct((wallet.monthlyPnl || 0) + pnl);
    wallet.equity = pct((wallet.equity || DEFAULT_WALLET.equity) + pnl);
    wallet.available = pct(Math.min(wallet.equity, (wallet.available || wallet.equity) + closeMargin + Math.max(0, pnl)));
  }
  return closed;
}

function moveTradeStop(trade, nextSl, reason) {
  const adjusted = clampProtectiveStop(trade.coin, trade.side, nextSl, trade.sl, trade.price);
  if (!adjusted) return false;
  trade.sl = adjusted;
  trade.trailActive = true;
  pushManagementEvent(trade, `${reason}: SL moved to ${adjusted}`);
  return true;
}

function liveCloseSizeForPct(trade, settings, closePct) {
  const rawSize = Math.abs(Number(trade.liveOrderSize || trade.rawSize || trade.qty || settings.liveOrderSize || 1));
  const pctToClose = Math.min(Math.max(Number(closePct || 0), 0), 100);
  if (!rawSize || !pctToClose) return 0;
  const desired = rawSize * pctToClose / 100;
  if (rawSize >= 1) return Math.min(rawSize, Math.max(1, Math.floor(desired)));
  return Math.min(rawSize, Math.floor(desired * 1000000) / 1000000);
}

async function sendLivePartialCloseOrder(trade, settings, closePct) {
  const closeSize = liveCloseSizeForPct(trade, settings, closePct);
  if (!closeSize || closeSize <= 0) throw new Error('Live partial close refused: calculated close size is zero. Use manual close if needed.');
  const order = buildCloseOrderForTrade(trade, settings, closeSize);
  const response = await deltaSignedRequest(settings, loadKeys(), 'POST', '/v2/orders', order);
  return { response, closeSize, order };
}

async function processTradeManagement(rows, settings, trades, wallet, opts = {}) {
  if (settings.tradeManagementEnabled === false) return;
  const byCoin = Object.fromEntries((rows || []).map(r => [String(r.coin).toUpperCase(), r]));
  const managementStore = loadManagementState();
  for (const trade of [...(trades.openTrades || [])]) {
    if (trade.status !== 'OPEN') continue;
    const row = byCoin[String(trade.coin).toUpperCase()];
    const ms = tradeManagementStateFor(trade, managementStore);
    if (ms.tp1Done) trade.tp1Done = true;
    if (ms.tp2Done) trade.tp2Done = true;
    if (ms.breakEvenMoved) trade.breakEvenMoved = true;
    if (typeof ms.addOnCount === 'number') trade.addOnCount = Math.max(Number(trade.addOnCount || 0), ms.addOnCount);
    const r = profitRForTrade(trade);
    trade.profitR = pct(r);

    if (stopHit(trade) && !ms.closedByManagement) {
      if (opts.live && trade.mode === 'live') {
        try {
          await sendLivePartialCloseOrder(trade, settings, 100);
          ms.closedByManagement = true;
          log('LIVE', `${trade.coin} ${trade.side} management SL close sent at ${trade.price}.`, { tradeId: trade.id, sl: trade.sl });
        } catch (error) {
          log('ERROR', `Live SL close failed for ${trade.coin}: ${error.message}`);
        }
      } else {
        const closed = closeTradePortionInMemory(trades, wallet, trade, 100, 'Management SL hit', trade.sl);
        if (closed) log('TRADE', `${closed.coin} ${closed.side} closed by management SL at ${closed.exit}.`, { tradeId: closed.parentTradeId, pnl: closed.pnl });
      }
      continue;
    }

    if (settings.autoMoveSlEnabled !== false && !trade.breakEvenMoved && r >= Number(settings.breakEvenTriggerR || 1)) {
      const risk = tradeInitialRiskDistance(trade);
      const nextSl = tradeInitialEntry(trade) + (tradeSideMult(trade) * risk * Math.max(0, Number(settings.breakEvenBufferR || 0.03)));
      if (moveTradeStop(trade, nextSl, 'Breakeven/profit lock')) {
        trade.breakEvenMoved = true;
        ms.breakEvenMoved = true;
        log('SAFE', `${trade.coin} ${trade.side} SL moved to breakeven/profit after ${pct(r)}R.`, { tradeId: trade.id, sl: trade.sl });
      }
    }

    if (settings.chandelierTradeManagementEnabled !== false && r >= Number(settings.breakEvenTriggerR || 1)) {
      const history = state.priceHistory[trade.coin] || [];
      const atr = state.market[trade.coin]?.atr || 0;
      const chand = calculateChandelierLevel(trade.coin, history, atr, trade.side, settings);
      if (chand && moveTradeStop(trade, chand, 'Chandelier trail')) {
        trade.chandelierLevel = chand;
        ms.lastChandelier = chand;
      }
    }

    const tp1Check = tp1ReachedForTrade(trade, settings);
    if (settings.autoTp1Enabled !== false && !trade.tp1Done && tp1Check.hit) {
      const closePct = Math.min(Math.max(Number(settings.tp1ClosePct || 50), 1), 90);
      if (opts.live && trade.mode === 'live') {
        try {
          const result = await sendLivePartialCloseOrder(trade, settings, closePct);
          trade.tp1Done = true;
          ms.tp1Done = true;
          ms.tp1Reason = tp1Check.reason;
          ms.tp1At = new Date().toISOString();
          log('LIVE', `${trade.coin} ${trade.side} TP1 partial close sent (${closePct}%).`, { tradeId: trade.id, closeSize: result.closeSize, trigger: tp1Check.reason });
        } catch (error) {
          log('ERROR', `Live TP1 partial close failed for ${trade.coin}: ${error.message}`, { tradeId: trade.id, trigger: tp1Check.reason });
        }
      } else {
        const closed = closeTradePortionInMemory(trades, wallet, trade, closePct, `TP1 partial: ${tp1Check.reason}`, trade.price);
        if (closed) {
          trade.tp1Done = true;
          ms.tp1Done = true;
          ms.tp1Reason = tp1Check.reason;
          ms.tp1At = new Date().toISOString();
          log('TRADE', `${trade.coin} ${trade.side} TP1 partial closed ${closePct}% at ${closed.exit}.`, { tradeId: trade.id, pnl: closed.pnl, trigger: tp1Check.reason });
        }
      }
      const risk = tradeInitialRiskDistance(trade);
      const nextSl = tradeInitialEntry(trade) + (tradeSideMult(trade) * risk * Math.max(0, Number(settings.breakEvenBufferR || 0.03)));
      if (moveTradeStop(trade, nextSl, 'Post-TP1 lock')) {
        trade.breakEvenMoved = true;
        ms.breakEvenMoved = true;
      }
    }

    const tp2Check = tp2ReachedForTrade(trade, settings);
    if (settings.autoTp1Enabled !== false && !trade.tp2Done && trade.tp1Done && tp2Check.hit) {
      const closePct = Math.min(Math.max(Number(settings.tp2ClosePct || 100), 1), 100);
      if (opts.live && trade.mode === 'live') {
        try {
          const result = await sendLivePartialCloseOrder(trade, settings, closePct);
          trade.tp2Done = true;
          ms.tp2Done = true;
          ms.tp2Reason = tp2Check.reason;
          ms.tp2At = new Date().toISOString();
          log('LIVE', `${trade.coin} ${trade.side} TP2 partial close sent (${closePct}%).`, { tradeId: trade.id, closeSize: result.closeSize, trigger: tp2Check.reason });
        } catch (error) {
          log('ERROR', `Live TP2 partial close failed for ${trade.coin}: ${error.message}`, { tradeId: trade.id, trigger: tp2Check.reason });
        }
      } else {
        const closed = closeTradePortionInMemory(trades, wallet, trade, closePct, `TP2 partial: ${tp2Check.reason}`, trade.price);
        if (closed) {
          trade.tp2Done = true;
          ms.tp2Done = true;
          ms.tp2Reason = tp2Check.reason;
          ms.tp2At = new Date().toISOString();
          log('TRADE', `${trade.coin} ${trade.side} TP2 partial closed ${closePct}% at ${closed.exit}.`, { tradeId: trade.id, pnl: closed.pnl, trigger: tp2Check.reason });
        }
      }
    }

    const check = shouldAddOnTrade(trade, row, settings, ms);
    if (check.ok) {
      if (opts.live && trade.mode === 'live') {
        if (!settings.liveAddOnsEnabled) {
          log('SAFE', `${trade.coin} live protected add-on skipped: live add-ons disabled.`);
        } else {
          try {
            const addon = await sendLiveAddOnOrder(trade, row, settings);
            applyAddOnToTrade(trade, addon, settings);
            ms.addOnCount = Number(ms.addOnCount || 0) + 1;
            log('LIVE', `${trade.coin} ${trade.side} protected live add-on sent.`, { tradeId: trade.id, marginUsd: addon.marginUsd, protectedSl: addon.proposedSl });
          } catch (error) {
            log('ERROR', `Live protected add-on blocked for ${trade.coin}: ${error.message}`);
          }
        }
      } else {
        const addon = buildAddOnPlan(trade, row, settings, { live: false });
        if (!addon.allowed) {
          log('SAFE', `Protected add-on blocked for ${trade.coin}: ${addon.blockedReason}`);
        } else {
          applyAddOnToTrade(trade, addon, settings);
          ms.addOnCount = Number(ms.addOnCount || 0) + 1;
          if (wallet && wallet.source !== 'DELTA_WALLET_REFERENCE_PAPER') wallet.available = money(Math.max(0, Number(wallet.available || 0) - Number(addon.marginUsd || 0)));
          log('PAPER', `${trade.coin} ${trade.side} protected paper add-on opened.`, { tradeId: trade.id, marginUsd: addon.marginUsd, protectedSl: addon.proposedSl });
        }
      }
    }
  }
  saveManagementState(managementStore);
}

async function processAutoAddOns(rows, settings, trades, wallet) {
  return processTradeManagement(rows, settings, trades, wallet, { live: false });
}

async function sendLiveAddOnOrder(trade, row, settings) {
  const keys = loadKeys();
  if (!liveReady(settings, keys)) throw new Error('Live add-on refused: live mode is not fully confirmed.');
  if (state.delta.status !== 'LIVE_DELTA') throw new Error('Delta public market data is not live.');
  if (state.deltaPositions.status !== 'LIVE_POSITIONS') throw new Error('Delta account positions are not synced.');
  const addon = buildAddOnPlan(trade, row, settings, { live: true });
  if (!addon.allowed) throw new Error(addon.blockedReason || 'Add-on sizing blocked.');
  const side = trade.side === 'LONG' ? 'buy' : 'sell';
  const order = {
    product_symbol: trade.coin,
    size: Math.max(1, Math.floor(Number(addon.liveOrderSize || 1))),
    side,
    order_type: 'market_order',
    time_in_force: 'ioc',
    reduce_only: false,
    client_order_id: `DS_V28_ADD_${trade.coin}_${Date.now().toString(36).toUpperCase()}`.slice(0, 32),
    bracket_stop_trigger_method: 'last_traded_price',
    bracket_stop_loss_price: String(addon.proposedSl || trade.sl),
    bracket_take_profit_price: String(trade.tp3 || trade.tp2 || trade.tp1)
  };
  const response = await deltaSignedRequest(settings, keys, 'POST', '/v2/orders', order);
  addon.exchangeOrderId = response?.result?.id || response?.result?.order_id || null;
  addon.exchangeResponse = response?.result || response;
  return addon;
}

function liveReady(settings, keys) {
  return Boolean(
    !settings.paperTrade &&
    keys.apiKey &&
    keys.secret &&
    keys.lastTestStatus === 'pass' &&
    keys.liveTradingConfirmed &&
    settings.exchange === 'delta_exchange_india' &&
    settings.executionApi === 'delta_exchange_india' &&
    state.delta.status === 'LIVE_DELTA' &&
    state.walletLive.status === 'LIVE_WALLET' &&
    state.deltaPositions.status === 'LIVE_POSITIONS'
  );
}

function liveReadinessFailures(settings = loadSettings(), keys = loadKeys(), { ignorePaper = false } = {}) {
  const failures = [];
  if (!ignorePaper && settings.paperTrade) failures.push('PAPER mode is active');
  if (!keys.apiKey || !keys.secret) failures.push('API key/secret not saved');
  if (keys.lastTestStatus !== 'pass') failures.push('API test not passed');
  if (!keys.liveTradingConfirmed) failures.push('Live authorization not enabled');
  if (state.delta.status !== 'LIVE_DELTA') failures.push('Delta market data not live');
  if (state.walletLive.status !== 'LIVE_WALLET') failures.push('Wallet sync not passed');
  if (state.deltaPositions.status !== 'LIVE_POSITIONS') failures.push('Account/positions sync not passed');
  return failures;
}

function liveBlockReason(settings = loadSettings(), keys = loadKeys(), opts = {}) {
  const failures = liveReadinessFailures(settings, keys, opts);
  return failures.length ? failures.join('; ') : '';
}

function buildTradeRecord(row, settings, mode) {
  const id = `T-${row.coin}-${Date.now().toString(36).toUpperCase()}`;
  const plan = row.candidate.marginPlan || {};
  return {
    id,
    coin: row.coin,
    side: row.dec,
    initialEntry: row.candidate.entry,
    entry: row.candidate.entry,
    price: row.price,
    marketPriceAtSignal: row.price,
    sl: row.candidate.sl,
    tp1: row.candidate.tp1,
    tp2: row.candidate.tp2,
    tp3: row.candidate.tp3,
    tp1R: row.candidate.tp1R || 1,
    tpPlan: { tp1Pct: Number(settings.tp1ClosePct || 50), tp2Pct: Number(settings.tp2ClosePct || 25), tp3Pct: Number(settings.tp3ClosePct || 25) },
    exitPlan: row.candidate.exitPlan || '',
    chandelierLevel: row.candidate.chandelierLevel || null,
    qty: row.candidate.qty,
    liveOrderSize: row.candidate.liveOrderSize,
    marginUsedUsd: money(row.candidate.marginUsedUsd || plan.marginUsd || 0),
    maxMarginCapUsd: money(row.candidate.maxMarginCapUsd || plan.marginCapUsd || marginCapForSymbol(row.coin, settings)),
    notionalUsd: money(row.candidate.notionalUsd || plan.notionalUsd || 0),
    leverage: Number(row.candidate.leverage || plan.leverage || settings.defaultLeverage),
    estimatedLossAtSlUsd: money(row.candidate.estimatedStopLossUsd || plan.estimatedStopLossUsd || 0),
    estimatedTp1ProfitUsd: money(row.candidate.estimatedTp1ProfitUsd || plan.estimatedTp1ProfitUsd || 0),
    estimatedTp2ProfitUsd: money(row.candidate.estimatedTp2ProfitUsd || plan.estimatedTp2ProfitUsd || 0),
    estimatedFullTradeProfitUsd: money(row.candidate.estimatedFullTradeProfitUsd || plan.estimatedFullTradeProfitUsd || 0),
    plannedProfitR: money(row.candidate.plannedProfitR || plan.plannedProfitR || plannedExitRMultiple(settings)),
    minFullTradeProfitUsd: money(row.candidate.minFullTradeProfitUsd || plan.minFullTradeProfitUsd || 0),
    targetFullTradeProfitUsd: money(row.candidate.targetFullTradeProfitUsd || plan.targetFullTradeProfitUsd || 0),
    minTargetProfitUsd: money(row.candidate.minTargetProfitUsd || plan.minTargetProfitUsd || 0),
    targetProfitUsd: money(row.candidate.targetProfitUsd || plan.targetProfitUsd || 0),
    profitTargetStatus: row.candidate.profitTargetStatus || plan.profitTargetStatus || '',
    initialSl: row.candidate.sl,
    initialRiskDistance: Math.abs(Number(row.candidate.entry || 0) - Number(row.candidate.sl || 0)),
    remainingPct: 100,
    tp1Done: false,
    tp2Done: false,
    breakEvenMoved: false,
    trailActive: false,
    lastManagedAt: null,
    sizingMultiplier: row.candidate.sizingMultiplier || plan.sizingMultiplier || 1,
    sizingReason: row.candidate.sizingReason || '',
    addOnCount: 0,
    addOns: [],
    managementEvents: [],
    openedAt: new Date().toISOString(),
    rr: row.candidate.rr,
    score: row.score,
    entryReason: [row.entryReason || row.whyReason || row.blockedBy || row.candidate.slReason || 'Entry conditions passed', row.candidate.entryReasonExtra].filter(Boolean).join(' | '),
    whyReason: [row.entryReason || row.whyReason || row.blockedBy || row.candidate.slReason || 'Entry conditions passed', row.candidate.entryReasonExtra].filter(Boolean).join(' | '),
    mode,
    orderType: row.candidate.orderType || (settings.entryOrderType === 'market' ? 'market' : 'limit'),
    entryType: row.candidate.entryType || 'MARKET_OR_IMMEDIATE',
    status: row.candidate.entryType === 'PULLBACK_LIMIT' && row.candidate.limitFillableNow === false ? 'PENDING_LIMIT' : 'OPEN',
    marketSource: row.source || 'UNKNOWN',
    slMode: row.candidate.slMode || 'TECHNICAL_SL_FIRST_POSITION_SIZE_SECOND',
    slReason: row.candidate.slReason || '',
    dynamicRiskCapUsd: row.candidate.dynamicRiskCapUsd || 0
  };
}

function openPaperTrade(row, settings, trades, wallet) {
  if (!row.candidate?.marginPlan?.allowed) {
    log('SAFE', `${row.coin} paper entry blocked by sizing: ${row.candidate?.marginPlan?.blockedReason || 'unknown'}`);
    return null;
  }
  const trade = buildTradeRecord(row, settings, 'paper');
  trades.openTrades.push(trade);
  appendTradeJournalEvent(trade.status === 'PENDING_LIMIT' ? 'PENDING_LIMIT' : 'OPEN', trade, { entryReason: trade.entryReason, sl: trade.sl, tp1: trade.tp1, tp2: trade.tp2, tp3: trade.tp3, orderType: trade.orderType, entryType: trade.entryType });
  if (trade.status === 'PENDING_LIMIT') log('ORDER', `${trade.coin} ${trade.side} pending pullback limit placed at ${trade.entry}; current=${trade.marketPriceAtSignal}; SL=${trade.sl}; TP2=${trade.tp2}.`);
  // If paper mode is using Delta wallet as a reference, never persist changes back as if they were real wallet funds.
  // Paper usage is tracked through the paper trade ledger and Funds Used, not by mutating the real wallet reference.
  if (wallet.source !== 'DELTA_WALLET_REFERENCE_PAPER') {
    wallet.available = money(Math.max(0, Number(wallet.available || 0) - Number(trade.marginUsedUsd || 0)));
    saveWallet(wallet);
  }
  return trade;
}

function deltaSignature(keys, method, pathOnly, queryString, payload) {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signatureData = method.toUpperCase() + timestamp + pathOnly + queryString + payload;
  const signature = crypto.createHmac('sha256', keys.secret).update(signatureData).digest('hex');
  return { timestamp, signature };
}

async function deltaSignedRequest(settings, keys, method, apiPath, body = null, queryString = '') {
  const base = settings.deltaBaseUrl.replace(/\/+$/, '');
  const payload = body ? JSON.stringify(body) : '';
  const { timestamp, signature } = deltaSignature(keys, method, apiPath, queryString, payload);
  const headers = {
    'api-key': keys.apiKey,
    signature,
    timestamp,
    'User-Agent': USER_AGENT,
    'Content-Type': 'application/json'
  };
  return requestJson(`${base}${apiPath}${queryString}`, { method, headers, body: payload || null, timeoutMs: 12000 });
}


function pickNumber(...values) {
  for (const value of values) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function normalizeWalletBalances(result) {
  const list = Array.isArray(result) ? result : Array.isArray(result?.balances) ? result.balances : Array.isArray(result?.wallet_balances) ? result.wallet_balances : [];
  const preferred = list.find(b => ['USDT', 'USD', 'USDC'].includes(normalizeAssetSymbol(b.asset_symbol || b.asset || b.currency || b.asset_id))) || list[0] || {};
  return {
    asset: normalizeAssetSymbol(preferred.asset_symbol || preferred.asset || preferred.currency || preferred.asset_id) || 'UNKNOWN',
    netEquity: money(pickNumber(preferred.net_equity, preferred.equity, preferred.balance, preferred.wallet_balance, preferred.total_balance) || 0),
    availableBalance: money(pickNumber(preferred.available_balance, preferred.available, preferred.free_balance) || 0),
    availableForRobo: money(pickNumber(preferred.available_balance_for_robo, preferred.robo_available_balance, preferred.available_balance) || 0),
    blockedMargin: money(pickNumber(preferred.blocked_margin, preferred.blocked_balance) || 0),
    orderMargin: money(pickNumber(preferred.order_margin) || 0),
    positionMargin: money(pickNumber(preferred.position_margin) || 0),
    rawCount: list.length
  };
}

async function fetchDeltaWallet(settings = loadSettings(), keys = loadKeys()) {
  if (!keys.apiKey || !keys.secret) throw new Error('API key and secret are required to fetch wallet.');
  const json = await deltaSignedRequest(settings, keys, 'GET', '/v2/wallet/balances');
  const summary = normalizeWalletBalances(json?.result || json);
  state.walletLive = {
    lastFetchAt: new Date().toISOString(),
    status: 'LIVE_WALLET',
    message: `Wallet loaded. Asset: ${summary.asset}. Available: $${summary.availableBalance}`,
    summary,
    raw: json?.result || json
  };
  log('WALLET', 'Delta wallet balances fetched.', { asset: summary.asset, available: summary.availableBalance, allocationPct: settings.liveWalletAllocationPct, botAllocationUsd: effectiveBotAllocationUsd(settings) });
  return state.walletLive;
}


function productByIdMap() {
  const out = {};
  for (const product of Object.values(state.delta.productsBySymbol || {})) {
    const id = Number(product?.id || product?.product_id);
    if (id) out[id] = product;
  }
  return out;
}

function productByPosition(pos) {
  const symbol = String(pos.product_symbol || pos.symbol || '').toUpperCase();
  const bySymbol = state.delta.productsBySymbol || {};
  if (symbol && bySymbol[symbol]) return bySymbol[symbol];
  const byId = productByIdMap();
  const id = Number(pos.product_id || pos.id);
  return byId[id] || null;
}

function positionSymbol(pos) {
  const product = productByPosition(pos);
  return String(pos.product_symbol || pos.symbol || product?.symbol || product?.product_symbol || '').toUpperCase();
}

function positionSignedSize(pos) {
  const candidates = [pos.size, pos.position_size, pos.open_size, pos.contracts, pos.quantity];
  for (const value of candidates) {
    const n = Number(value);
    if (Number.isFinite(n) && n !== 0) return n;
  }
  return 0;
}

function productBaseQtyPerContract(product) {
  const cv = productContractValue(product);
  const unit = productUnitSymbol(product);
  if (cv && unit && !['USD', 'USDT', 'USDC', 'INR'].includes(unit)) return cv;
  return null;
}

function estimatePositionNotionalUsd(pos, symbol, price, product) {
  const rawNotional = pickNumber(pos.notional, pos.notional_value, pos.position_value, pos.value, pos.notional_usd);
  if (rawNotional !== null && rawNotional > 0) return Math.abs(rawNotional);
  const signedSize = positionSignedSize(pos);
  const absSize = Math.abs(signedSize);
  const p = Number(price || 0);
  if (!absSize || !p) return 0;
  const perContractNotional = estimateContractNotionalUsd(symbol, p, product);
  const baseQtyPerContract = productBaseQtyPerContract(product);
  // If Delta returns base size like 0.001 BTC or 0.01 ETH, size*price is the correct notional.
  if (absSize < 1) return absSize * p;
  // If Delta returns contract count, contract_count * contract_value * price is the correct notional.
  if (baseQtyPerContract && Number.isInteger(absSize)) return absSize * perContractNotional;
  return absSize * p;
}

function pickPositionPnl(pos, entry, price, side, notional) {
  const raw = pickNumber(pos.unrealized_pnl, pos.upl, pos.pnl, pos.open_pnl, pos.mark_to_market_pnl);
  if (raw !== null) return raw;
  if (!entry || !price || !notional) return 0;
  const sideMult = side === 'LONG' ? 1 : -1;
  return notional * ((price - entry) / entry) * sideMult;
}

function stopOrTakeProfitForSymbol(symbol, openOrders, kind) {
  const orders = Array.isArray(openOrders) ? openOrders : [];
  const sym = String(symbol || '').toUpperCase();
  const matches = orders.filter(o => String(o.product_symbol || o.symbol || '').toUpperCase() === sym && String(o.state || '').toLowerCase() === 'open');
  const stopLike = matches.find(o => String(o.stop_order_type || '').includes(kind) || String(o.order_type || '').includes(kind));
  if (!stopLike) return null;
  return pickNumber(stopLike.stop_price, stopLike.limit_price, stopLike.trigger_price);
}

function mapDeltaPositionToTrade(pos, idx = 0, openOrders = []) {
  const symbol = positionSymbol(pos);
  if (!symbol) return null;
  const product = productByPosition(pos);
  const signedSize = positionSignedSize(pos);
  if (!signedSize) return null;
  const side = signedSize > 0 ? 'LONG' : 'SHORT';
  const entry = pickNumber(pos.entry_price, pos.average_entry_price, pos.avg_entry_price) || 0;
  const market = state.market[symbol] || {};
  const price = Number(market.price || extractTickerPrice(state.delta.tickersBySymbol?.[symbol], entry));
  const notional = estimatePositionNotionalUsd(pos, symbol, price, product);
  const margin = Math.abs(pickNumber(pos.margin, pos.position_margin, pos.initial_margin, pos.order_margin) || 0);
  const pnl = pickPositionPnl(pos, entry, price, side, notional);
  const pnlPct = margin > 0 ? (pnl / margin) * 100 : 0;
  const exchangeSl = stopOrTakeProfitForSymbol(symbol, openOrders, 'stop_loss') || pickNumber(pos.stop_loss_price, pos.sl_price) || null;
  const exchangeTp1 = stopOrTakeProfitForSymbol(symbol, openOrders, 'take_profit') || pickNumber(pos.take_profit_price, pos.tp_price) || null;
  const settings = loadSettings();
  const cap = marginCapForSymbol(symbol, settings);
  const entryForPlan = Number(entry || price || 0);
  const history = state.priceHistory[symbol] || [];
  const atr = Math.max(Number(market.atr || 0), entryForPlan * 0.004);
  const fallbackStop = !exchangeSl && entryForPlan ? technicalStopForDirection(symbol, side, entryForPlan, atr, history, settings) : null;
  const sl = exchangeSl || fallbackStop?.sl || null;
  const riskDistance = sl && entryForPlan ? Math.abs(entryForPlan - Number(sl)) : 0;
  const tp1Plan = exchangeTp1 || (riskDistance ? (side === 'LONG' ? entryForPlan + riskDistance * Number(settings.tp1TriggerR || 1.5) : entryForPlan - riskDistance * Number(settings.tp1TriggerR || 1.5)) : null);
  const tp2Plan = riskDistance ? (side === 'LONG' ? entryForPlan + riskDistance * 2 : entryForPlan - riskDistance * 2) : null;
  const tp3Plan = riskDistance ? (side === 'LONG' ? entryForPlan + riskDistance * Math.max(2, Number(settings.rewardTargetR || 3)) : entryForPlan - riskDistance * Math.max(2, Number(settings.rewardTargetR || 3))) : null;
  const inferredPlan = !exchangeSl && Boolean(fallbackStop?.sl);
  return {
    id: `delta-${symbol}-${pos.product_id || idx}`,
    coin: symbol,
    side,
    initialEntry: roundCoin(symbol, entryForPlan),
    entry: roundCoin(symbol, entryForPlan),
    price: roundCoin(symbol, price),
    sl: sl ? roundCoin(symbol, sl) : '-',
    tp1: tp1Plan ? roundCoin(symbol, tp1Plan) : '-',
    tp2: tp2Plan ? roundCoin(symbol, tp2Plan) : '-',
    tp3: tp3Plan ? roundCoin(symbol, tp3Plan) : '-',
    qty: Math.abs(signedSize),
    rawSize: signedSize,
    productId: pos.product_id || product?.id || null,
    marginUsedUsd: money(margin),
    maxMarginCapUsd: cap,
    notionalUsd: money(notional),
    leverage: margin > 0 ? money(notional / margin) : null,
    pnl: money(pnl),
    pnlPct: pct(pnlPct),
    estimatedLossAtSlUsd: sl && entryForPlan && notional ? money(notional * priceRiskPct(entryForPlan, sl)) : 0,
    initialSl: sl ? roundCoin(symbol, sl) : null,
    initialRiskDistance: riskDistance,
    remainingPct: 100,
    tp1Done: false,
    tp2Done: false,
    breakEvenMoved: false,
    trailActive: false,
    addOnCount: 0,
    openedAt: pos.created_at || pos.updated_at || new Date().toISOString(),
    rr: riskDistance ? Math.max(2, Number(settings.rewardTargetR || 3)) : '-',
    score: '-',
    entryReason: inferredPlan ? `Synced live position: Delta did not return bracket SL/TP; dashboard inferred technical SL/TP from current chart. SL reason=${fallbackStop?.reason || '-'}` : 'Synced live Delta position with exchange SL/TP where available',
    whyReason: inferredPlan ? `Synced live position: Delta did not return bracket SL/TP; dashboard inferred technical SL/TP from current chart. SL reason=${fallbackStop?.reason || '-'}` : 'Synced live Delta position with exchange SL/TP where available',
    mode: 'live',
    status: 'OPEN',
    marketSource: 'DELTA_ACCOUNT_POSITIONS',
    sourceType: 'DELTA_ACCOUNT_SYNC',
    slMode: inferredPlan ? 'INFERRED_TECHNICAL_SL_FOR_SYNCED_LIVE_POSITION' : 'EXCHANGE_BRACKET_OR_POSITION_SL',
    slReason: inferredPlan ? (fallbackStop?.reason || 'Inferred technical SL') : 'Exchange synced SL/TP',
    liquidationPrice: pickNumber(pos.liquidation_price),
    realizedPnl: pickNumber(pos.realized_pnl),
    raw: pos
  };
}

async function fetchDeltaOpenOrders(settings = loadSettings(), keys = loadKeys()) {
  const queryString = '?state=open&contract_types=perpetual_futures&page_size=100';
  const json = await deltaSignedRequest(settings, keys, 'GET', '/v2/orders', null, queryString);
  const result = Array.isArray(json?.result) ? json.result : [];
  return result;
}

async function fetchDeltaPositions(settings = loadSettings(), keys = loadKeys()) {
  if (!keys.apiKey || !keys.secret) throw new Error('API key and secret are required to fetch Delta positions.');
  const queryString = '?contract_types=perpetual_futures';
  const [positionsJson, ordersResult] = await Promise.allSettled([
    deltaSignedRequest(settings, keys, 'GET', '/v2/positions/margined', null, queryString),
    fetchDeltaOpenOrders(settings, keys)
  ]);
  if (positionsJson.status !== 'fulfilled') throw positionsJson.reason;
  const rawPositions = Array.isArray(positionsJson.value?.result) ? positionsJson.value.result : [];
  const openOrders = ordersResult.status === 'fulfilled' ? ordersResult.value : [];
  const openTrades = rawPositions.map((p, i) => mapDeltaPositionToTrade(p, i, openOrders)).filter(Boolean);
  state.deltaPositions = {
    lastFetchAt: new Date().toISOString(),
    status: 'LIVE_POSITIONS',
    message: `Synced ${openTrades.length} live Delta position${openTrades.length === 1 ? '' : 's'}.`,
    openTrades,
    raw: rawPositions,
    orderRaw: openOrders,
    source: 'DELTA_ACCOUNT_POSITIONS'
  };
  log('SYNC', state.deltaPositions.message);
  return state.deltaPositions;
}

async function syncLiveAccountIfReady(settings = loadSettings(), keys = loadKeys(), { force = false } = {}) {
  const wantsPaperWalletReference = Boolean(settings.paperTrade && settings.paperUseDeltaWalletReference !== false);
  const shouldSync = Boolean(keys.apiKey && keys.secret && keys.lastTestStatus === 'pass' && (force || !settings.paperTrade || wantsPaperWalletReference));
  if (!shouldSync) return state.deltaPositions;
  const now = Date.now();
  const last = state.deltaPositions.lastFetchAt ? new Date(state.deltaPositions.lastFetchAt).getTime() : 0;
  if (!force && last && now - last < 7000) return state.deltaPositions;
  try {
    await fetchDeltaWallet(settings, keys);
    return await fetchDeltaPositions(settings, keys);
  } catch (error) {
    if (String(error.message || '').toLowerCase().includes('wallet') || state.walletLive.status !== 'LIVE_WALLET') {
      state.walletLive = {
        ...state.walletLive,
        lastFetchAt: new Date().toISOString(),
        status: 'FETCH_FAILED',
        message: error.message,
        summary: null
      };
    }
    state.deltaPositions = {
      ...state.deltaPositions,
      lastFetchAt: new Date().toISOString(),
      status: 'SYNC_FAILED',
      message: error.message,
      source: 'SYNC_FAILED'
    };
    const safeSettings = loadSettings();
    if (!safeSettings.paperTrade) {
      safeSettings.botEnabled = false;
      safeSettings.paperTrade = true;
      saveSettings(safeSettings);
      log('SAFE', 'Live sync failed. Bot auto-switched to PAPER and BOT OFF.', { error: error.message });
    }
    log('ERROR', `Delta account position sync failed: ${error.message}`);
    return state.deltaPositions;
  }
}

function authoritativeOpenTrades(settings, localTrades = loadTrades()) {
  const keys = loadKeys();
  if (!settings.paperTrade && keys.apiKey && keys.secret && keys.lastTestStatus === 'pass') {
    return Array.isArray(state.deltaPositions.openTrades) ? state.deltaPositions.openTrades : [];
  }
  return localTrades.openTrades || [];
}

function authoritativeTrades(settings, localTrades = loadTrades()) {
  return {
    openTrades: authoritativeOpenTrades(settings, localTrades),
    closedTrades: localTrades.closedTrades || []
  };
}

async function openLiveTrade(row, settings, trades, wallet) {
  const keys = loadKeys();
  if (!liveReady(settings, keys)) throw new Error('Live mode is not fully confirmed. Keep paper mode ON until API test passes.');
  if (state.delta.status !== 'LIVE_DELTA') throw new Error('Delta public market data is not live. Refusing live order.');
  if (state.deltaPositions.status !== 'LIVE_POSITIONS') throw new Error('Delta account positions are not synced. Click Sync Account Now before live orders.');
  const product = state.delta.productsBySymbol?.[String(row.coin).toUpperCase()];
  if (!product) throw new Error('Delta product specs not loaded. Sync Delta first.');
  const plan = calculateMarginPlan(row, settings, trades, product, null, { live: true });
  if (!plan.allowed) throw new Error(plan.blockedReason || 'Live sizing guard blocked order.');
  row.candidate.marginPlan = plan;
  row.candidate.marginUsedUsd = plan.marginUsd;
  row.candidate.notionalUsd = plan.notionalUsd;
  row.candidate.leverage = plan.leverage;
  row.candidate.estimatedStopLossUsd = plan.estimatedStopLossUsd;
  row.candidate.estimatedTp1ProfitUsd = plan.estimatedTp1ProfitUsd;
  row.candidate.estimatedTp2ProfitUsd = plan.estimatedTp2ProfitUsd;
  row.candidate.estimatedFullTradeProfitUsd = plan.estimatedFullTradeProfitUsd;
  row.candidate.plannedProfitR = plan.plannedProfitR;
  row.candidate.minFullTradeProfitUsd = plan.minFullTradeProfitUsd;
  row.candidate.targetFullTradeProfitUsd = plan.targetFullTradeProfitUsd;
  row.candidate.minTargetProfitUsd = plan.minTargetProfitUsd;
  row.candidate.targetProfitUsd = plan.targetProfitUsd;
  row.candidate.profitTargetStatus = plan.profitTargetStatus;
  row.candidate.liveOrderSize = plan.liveOrderSize;

  const trade = buildTradeRecord(row, settings, 'live');
  const side = row.dec === 'LONG' ? 'buy' : 'sell';
  const orderType = settings.entryOrderType === 'market' ? 'market_order' : 'limit_order';
  const clientOrderId = `DS_V28_${row.coin}_${Date.now().toString(36).toUpperCase()}`.slice(0, 32);
  const order = {
    product_symbol: row.coin,
    size: Math.max(1, Math.floor(Number(plan.liveOrderSize || 1))),
    side,
    order_type: orderType,
    time_in_force: orderType === 'market_order' ? 'ioc' : 'gtc',
    reduce_only: false,
    client_order_id: clientOrderId,
    bracket_stop_trigger_method: 'last_traded_price',
    bracket_stop_loss_price: String(row.candidate.sl),
    bracket_take_profit_price: String(row.candidate.tp3 || row.candidate.tp2 || row.candidate.tp1)
  };
  if (orderType === 'limit_order') order.limit_price = String(row.candidate.entry);
  const response = await deltaSignedRequest(settings, keys, 'POST', '/v2/orders', order);
  trade.status = orderType === 'limit_order' ? 'PENDING_LIMIT' : 'OPEN';
  trade.exchangeOrderId = response?.result?.id || response?.result?.order_id || null;
  trade.exchangeResponse = response?.result || response;
  trade.liveOrderSize = order.size;
  trade.clientOrderId = clientOrderId;
  trades.openTrades.push(trade);
  appendTradeJournalEvent(trade.status === 'PENDING_LIMIT' ? 'PENDING_LIMIT' : 'OPEN', trade, { entryReason: trade.entryReason, sl: trade.sl, tp1: trade.tp1, tp2: trade.tp2, tp3: trade.tp3, orderType: trade.orderType, entryType: trade.entryType });
  try {
    await syncLiveAccountIfReady(settings, keys, { force: true });
    log('VERIFY', `Post-order sync completed for ${row.coin}. Check Delta UI for bracket SL/TP before leaving trade unattended.`, { clientOrderId });
  } catch (error) {
    log('ERROR', `Post-order verification failed for ${row.coin}: ${error.message}`);
  }
  return trade;
}

function closePaperTradeById(id) {
  const trades = loadTrades();
  const wallet = loadWallet();
  const idx = trades.openTrades.findIndex(t => t.id === id);
  if (idx < 0) return null;
  const [trade] = trades.openTrades.splice(idx, 1);
  const price = state.market[trade.coin]?.price || trade.price || trade.entry;
  const sideMult = trade.side === 'LONG' ? 1 : -1;
  const priceMovePct = trade.entry ? ((price - trade.entry) / trade.entry) : 0;
  const pnl = pct(Number(trade.notionalUsd || 0) ? Number(trade.notionalUsd || 0) * priceMovePct * sideMult : (price - trade.entry) * (trade.qty || 1) * sideMult);
  const closed = {
    id: trade.id.replace(/^T-/, 'C-'),
    coin: trade.coin,
    side: trade.side,
    entry: trade.entry,
    exit: roundCoin(trade.coin, price),
    pnl,
    result: pnl > 0 ? 'WIN' : pnl < 0 ? 'LOSS' : 'BREAKEVEN',
    closedAt: new Date().toISOString(),
    mode: trade.mode || 'paper',
    marketSource: state.market[trade.coin]?.source || trade.marketSource || 'UNKNOWN'
  };
  trades.closedTrades.unshift(closed);
  appendTradeJournalEvent('CLOSE', closed, { closeReason: 'Manual close' });
  wallet.dailyPnl = pct((wallet.dailyPnl || 0) + pnl);
  wallet.weeklyPnl = pct((wallet.weeklyPnl || 0) + pnl);
  wallet.monthlyPnl = pct((wallet.monthlyPnl || 0) + pnl);
  wallet.equity = pct((wallet.equity || DEFAULT_WALLET.equity) + pnl);
  wallet.available = pct(Math.min(wallet.equity, (wallet.available || wallet.equity) + Number(trade.marginUsedUsd || 0) + Math.max(0, pnl)));
  saveTrades(trades);
  saveWallet(wallet);
  log(trade.mode === 'live' ? 'LIVE' : 'TRADE', `${closed.coin} ${closed.side} closed manually at ${closed.exit}.`, { tradeId: closed.id, pnl: closed.pnl });
  return closed;
}

function normalizeDeltaCloseSize(size) {
  const raw = Math.abs(Number(size || 0));
  if (!raw) return 0;
  if (raw >= 1) return Math.max(1, Math.floor(raw));
  return Math.max(0, Math.floor(raw * 1000000) / 1000000);
}

function buildCloseOrderForTrade(trade, settings, sizeOverride = null) {
  if (!trade || !trade.coin) throw new Error('Close refused: trade has no coin/product symbol.');
  const closeSide = String(trade.side || '').toUpperCase() === 'LONG' ? 'sell' : 'buy';
  const rawSize = Math.abs(Number(sizeOverride || trade.liveOrderSize || trade.rawSize || trade.qty || settings.liveOrderSize || 1));
  const normalizedSize = normalizeDeltaCloseSize(rawSize);
  if (!normalizedSize) throw new Error('Close refused: calculated Delta close size is zero.');
  return {
    product_symbol: trade.coin,
    size: normalizedSize,
    side: closeSide,
    order_type: 'market_order',
    time_in_force: 'ioc',
    reduce_only: true,
    client_order_id: `DS_CLOSE_${String(trade.coin).replace(/[^A-Z0-9]/gi, '').slice(0, 10)}_${Date.now().toString(36).toUpperCase()}`.slice(0, 32)
  };
}

function recordSyncedLiveClose(trade, response) {
  const saved = loadTrades();
  const price = state.market[trade.coin]?.price || trade.price || trade.entry;
  const pnl = Number(trade.pnl || 0) || 0;
  const closed = {
    id: `C-${String(trade.id || trade.coin || Date.now()).replace(/^delta-/, 'delta-close-')}`,
    coin: trade.coin,
    side: trade.side,
    entry: trade.entry,
    exit: roundCoin(trade.coin, price),
    pnl: money(pnl),
    result: pnl > 0 ? 'WIN' : pnl < 0 ? 'LOSS' : 'BREAKEVEN',
    closedAt: new Date().toISOString(),
    mode: 'live',
    marketSource: 'DELTA_ACCOUNT_POSITIONS',
    sourceType: 'MANUAL_LIVE_CLOSE',
    exchangeCloseResponse: response?.result || response
  };
  saved.closedTrades.unshift(closed);
  appendTradeJournalEvent('LIVE_CLOSE', closed, { sourceType: 'MANUAL_LIVE_CLOSE' });
  saveTrades(saved);
  log('LIVE', `${closed.coin} ${closed.side} synced live position close sent manually at ${closed.exit}.`, { tradeId: closed.id, pnl: closed.pnl });
  return closed;
}

async function closeSyncedLiveTradeByIdAsync(id, settings, keys) {
  const synced = (state.deltaPositions.openTrades || []).find(t => t.id === id);
  if (!synced) return null;
  if (!liveReady(settings, keys)) throw new Error('Live close refused: Delta API keys are not confirmed.');
  const response = await deltaSignedRequest(settings, keys, 'POST', '/v2/orders', buildCloseOrderForTrade(synced, settings));
  const closed = recordSyncedLiveClose(synced, response);
  await syncLiveAccountIfReady(settings, keys, { force: true });
  return closed;
}

async function closeTradeByIdAsync(id) {
  const trades = loadTrades();
  const trade = trades.openTrades.find(t => t.id === id);
  const settings = loadSettings();
  const keys = loadKeys();

  if (!trade) return await closeSyncedLiveTradeByIdAsync(id, settings, keys);

  if (trade.mode === 'live') {
    if (!liveReady(settings, keys)) throw new Error('Live close refused: Delta API keys are not confirmed.');
    const response = await deltaSignedRequest(settings, keys, 'POST', '/v2/orders', buildCloseOrderForTrade(trade, settings));
    const closed = closePaperTradeById(id);
    if (closed) closed.exchangeCloseResponse = response?.result || response;
    const saved = loadTrades();
    const cidx = saved.closedTrades.findIndex(t => t.id === closed.id);
    if (cidx >= 0) saved.closedTrades[cidx] = closed;
    saveTrades(saved);
    await syncLiveAccountIfReady(settings, keys, { force: true });
    return closed;
  }
  return closePaperTradeById(id);
}

function closeTradeById(id) {
  return closePaperTradeById(id);
}

function metricsFromTrades(trades, wallet) {
  const closed = trades.closedTrades || [];
  const open = trades.openTrades || [];
  const wins = closed.filter(t => t.result === 'WIN').length;
  const losses = closed.filter(t => t.result === 'LOSS').length;
  const breakeven = closed.filter(t => t.result === 'BREAKEVEN').length;
  const totalTrades = closed.length + open.length;
  const decisive = wins + losses;
  const winRate = decisive ? (wins / decisive) * 100 : 0;
  const openPnl = pct(open.reduce((s, t) => s + (Number(t.pnl) || 0), 0));
  const closedPnl = pct(closed.reduce((s, t) => s + (Number(t.pnl) || 0), 0));
  const best = closed.length ? Math.max(...closed.map(t => Number(t.pnl) || 0)) : 0;
  const worst = closed.length ? Math.min(...closed.map(t => Number(t.pnl) || 0)) : 0;
  return {
    totalTrades,
    wins,
    losses,
    breakeven,
    winRate: pct(winRate),
    openPnl,
    closedPnl,
    totalPnl: pct(openPnl + closedPnl),
    best: pct(best),
    worst: pct(worst),
    equity: pct(wallet.equity || 0),
    available: pct(wallet.available || 0)
  };
}

function getStatePayload(settings = loadSettings(), wallet = loadWallet(), trades = loadTrades(), rows = state.lastRows) {
  initializeMarket(settings);
  const paperWallet = wallet || loadWallet();
  const displayWallet = effectiveWallet(settings, paperWallet);
  const localTrades = trades;
  const displayTrades = authoritativeTrades(settings, localTrades);
  if (!rows || !rows.length) rows = settings.assets.map(symbol => evaluateSymbol(symbol, settings, displayWallet, displayTrades));
  refreshOpenTradePrices(displayTrades);
  const keys = loadKeys();
  const live = liveReady(settings, keys);
  const safeSettings = {
    ...settings,
    liveReady: live,
    keysConfigured: Boolean(keys.apiKey && keys.secret),
    keyPreview: maskKey(keys.apiKey),
    liveTradingConfirmed: Boolean(keys.liveTradingConfirmed),
    deltaStatus: state.delta.status,
    deltaMessage: state.delta.message,
    deltaLastFetchAt: state.delta.lastFetchAt,
    marketDataSource: state.delta.status === 'LIVE_DELTA' ? 'Delta Exchange India public API + OHLC candles' : 'Fallback demo feed'
  };
  return {
    serverTime: new Date().toISOString(),
    startedAt: state.startedAt,
    lastScanAt: state.lastScanAt,
    coins: settings.assets.length,
    settings: safeSettings,
    apiStatus: {
      keysConfigured: Boolean(keys.apiKey && keys.secret),
      keyPreview: maskKey(keys.apiKey),
      loadedFromEnv: Boolean(keys.loadedFromEnv),
      liveTradingConfirmed: Boolean(keys.liveTradingConfirmed),
      lastTestAt: keys.lastTestAt,
      lastTestStatus: keys.lastTestStatus,
      lastTestMessage: keys.lastTestMessage,
      whitelistedIpNote: keys.whitelistedIpNote || '',
      serverOutboundIp: keys.lastServerOutboundIp || '',
      serverOutboundIpAt: keys.lastServerOutboundIpAt,
      serverOutboundIpMessage: keys.lastServerOutboundIpMessage || ''
    },
    delta: { ...state.delta, tickersBySymbol: undefined, productsBySymbol: undefined },
    deltaWallet: state.walletLive,
    deltaPositions: state.deltaPositions,
    accountSync: state.deltaPositions,
    wallet: displayWallet,
    paperWallet,
    risk: {
      maxBotAllocationUsd: effectiveBotAllocationUsd(settings),
      paperBotAllocationUsd: settings.maxBotAllocationUsd,
      liveWalletAllocationPct: settings.liveWalletAllocationPct,
      liveMaxBotAllocationUsd: settings.liveMaxBotAllocationUsd,
      liveWalletAvailableUsd: liveWalletNumbers().available,
      liveWalletEquityUsd: liveWalletNumbers().equity,
      maxMarginPerCoinUsd: settings.maxMarginPerCoinUsd,
      majorCoinMaxMarginUsd: settings.majorCoinMaxMarginUsd,
      maxStopLossUsd: settings.maxStopLossUsd,
      minFullTradeProfitUsd: settings.minFullTradeProfitUsd ?? settings.minTargetProfitUsd,
      targetFullTradeProfitUsd: settings.targetFullTradeProfitUsd ?? settings.targetProfitUsd,
      minTargetProfitUsd: settings.minFullTradeProfitUsd ?? settings.minTargetProfitUsd,
      targetProfitUsd: settings.targetFullTradeProfitUsd ?? settings.targetProfitUsd,
      autoSizeToTargetProfit: settings.autoSizeToTargetProfit,
      blockTinyProfitTrades: settings.blockTinyProfitTrades,
      totalBotMarginUsed: money(totalBotMarginUsed(displayTrades)),
      remainingBotAllocation: money(Math.max(0, effectiveBotAllocationUsd(settings) - totalBotMarginUsed(displayTrades)))
    },
    liveBlockReason: liveBlockReason(settings, keys),
    liveReadinessFailures: liveReadinessFailures(settings, keys, { ignorePaper: true }),
    metrics: metricsFromTrades(displayTrades, displayWallet),
    rows,
    openTrades: displayTrades.openTrades || [],
    closedTrades: displayTrades.closedTrades || [],
    logs: loadLogs().slice(0, 150)
  };
}


function parseCookies(req) {
  const header = String(req.headers.cookie || '');
  const out = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(value);
  }
  return out;
}

function hmac(value) {
  return crypto.createHmac('sha256', DASHBOARD_SESSION_SECRET).update(String(value)).digest('hex');
}

function safeEqual(a, b) {
  const aa = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}

function makeSessionToken() {
  const created = Date.now().toString(36);
  return `${created}.${hmac(created)}`;
}

function verifySessionToken(token) {
  if (!DASHBOARD_PASSWORD) return true;
  const parts = String(token || '').split('.');
  if (parts.length !== 2) return false;
  const [created, sig] = parts;
  if (!safeEqual(sig, hmac(created))) return false;
  const ms = parseInt(created, 36);
  return Number.isFinite(ms) && Date.now() - ms <= SESSION_TTL_MS;
}

function isDashboardAuthenticated(req) {
  if (!DASHBOARD_PASSWORD) return true;
  const cookies = parseCookies(req);
  return verifySessionToken(cookies[SESSION_COOKIE]);
}

function passwordMatches(input) {
  if (!DASHBOARD_PASSWORD) return false;
  const a = crypto.createHash('sha256').update(String(input || '')).digest('hex');
  const b = crypto.createHash('sha256').update(DASHBOARD_PASSWORD).digest('hex');
  return safeEqual(a, b);
}

function isSecureRequest(req) {
  return req.socket.encrypted || String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim() === 'https';
}

function sessionCookie(req) {
  const secure = isSecureRequest(req) ? '; Secure' : '';
  return `${SESSION_COOKIE}=${encodeURIComponent(makeSessionToken())}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}${secure}`;
}

function clearSessionCookie(req) {
  const secure = isSecureRequest(req) ? '; Secure' : '';
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

function loginPage(message = '') {
  const msg = message ? `<div class="msg">${String(message).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))}</div>` : '';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Delta Scanner Login</title>
<style>
:root{--bg:#04111d;--panel:#071b2a;--line:#1e5a84;--green:#02f0a2;--txt:#f4fbff;--muted:#9fd2ef;--red:#ff4266}
*{box-sizing:border-box} body{margin:0;min-height:100vh;display:grid;place-items:center;background:radial-gradient(circle at top right,#063b32,#04111d 52%,#02080d);font-family:Arial,Helvetica,sans-serif;color:var(--txt);font-weight:800}
.card{width:min(440px,calc(100vw - 28px));background:rgba(7,27,42,.96);border:1px solid var(--line);border-radius:10px;padding:24px;box-shadow:0 18px 60px rgba(0,0,0,.35)}
h1{margin:0 0 6px;font-size:28px;letter-spacing:.2px}.sub{color:var(--muted);font-size:14px;line-height:1.45;margin-bottom:20px}
label{display:block;font-size:13px;margin:0 0 8px;color:#dff6ff}input{width:100%;height:46px;border:1px solid #3c7ba4;background:#03101b;color:#fff;border-radius:6px;padding:0 12px;font-size:16px;font-weight:800;outline:none}input:focus{border-color:var(--green)}
button{margin-top:14px;width:100%;height:46px;border:0;border-radius:6px;background:var(--green);color:#001511;font-size:15px;font-weight:900;cursor:pointer}.msg{background:rgba(255,66,102,.12);border:1px solid var(--red);padding:10px;border-radius:6px;margin-bottom:14px;color:#ffd7df;font-size:13px}
.note{margin-top:16px;color:var(--muted);font-size:12px;line-height:1.45}.lock{display:inline-block;background:#003d30;border:1px solid var(--green);border-radius:999px;padding:4px 9px;color:var(--green);font-size:12px;margin-bottom:12px}
</style>
</head>
<body>
<form class="card" method="post" action="/api/login">
  <div class="lock">DASHBOARD LOCKED</div>
  <h1>Delta Scanner</h1>
  <div class="sub">Enter the dashboard password to access controls, API keys, wallet sync, and live trading switches.</div>
  ${msg}
  <label for="password">Password</label>
  <input id="password" name="password" type="password" autocomplete="current-password" autofocus />
  <button type="submit">Unlock Dashboard</button>
  <div class="note">Set or change this password on Render using the <b>DASHBOARD_PASSWORD</b> environment variable.</div>
</form>
</body>
</html>`;
}

async function loginRoute(req, res) {
  let password = '';
  let contentType = String(req.headers['content-type'] || '');
  if (contentType.includes('application/json')) {
    const body = await readBody(req);
    password = body.password || '';
  } else {
    const raw = await new Promise((resolve, reject) => {
      let data = '';
      req.on('data', chunk => { data += chunk; if (data.length > 10000) req.destroy(); });
      req.on('end', () => resolve(data));
      req.on('error', reject);
    });
    password = new URLSearchParams(raw).get('password') || '';
  }
  if (!DASHBOARD_PASSWORD) return send(res, 500, loginPage('Dashboard password is not configured. Set DASHBOARD_PASSWORD on Render.'), 'text/html; charset=utf-8');
  if (!passwordMatches(password)) return send(res, 401, loginPage('Wrong password.'), 'text/html; charset=utf-8');
  res.writeHead(302, {
    'Set-Cookie': sessionCookie(req),
    'Location': '/',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end();
}

function logoutRoute(req, res) {
  res.writeHead(302, {
    'Set-Cookie': clearSessionCookie(req),
    'Location': '/',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end();
}

function requireDashboardAuth(req, res, pathname) {
  if (pathname === '/api/tradingview-webhook') return true;
  if (!DASHBOARD_PASSWORD) return true;
  if (isDashboardAuthenticated(req)) return true;
  if (pathname.startsWith('/api/')) {
    sendError(res, 401, 'Dashboard locked. Login required.');
    return false;
  }
  send(res, 401, loginPage(), 'text/html; charset=utf-8');
  return false;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1_000_000) {
        req.destroy();
        reject(new Error('Body too large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try { resolve(JSON.parse(body)); }
      catch (error) { reject(new Error('Invalid JSON body')); }
    });
    req.on('error', reject);
  });
}

function send(res, statusCode, body, contentType = 'application/json; charset=utf-8') {
  const data = typeof body === 'string' ? body : JSON.stringify(body);
  res.writeHead(statusCode, {
    'Content-Type': contentType,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(data);
}

function sendError(res, statusCode, message) {
  send(res, statusCode, { ok: false, error: message });
}

function staticFile(req, res, pathname) {
  const filePath = pathname === '/' ? path.join(PUBLIC_DIR, 'index.html') : path.join(PUBLIC_DIR, pathname.replace(/^\/+/, ''));
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(path.resolve(PUBLIC_DIR))) return sendError(res, 403, 'Forbidden');
  if (!fs.existsSync(resolved) || fs.statSync(resolved).isDirectory()) return sendError(res, 404, 'Not found');
  const ext = path.extname(resolved).toLowerCase();
  res.writeHead(200, {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Cache-Control': ext === '.html' ? 'no-store' : 'public, max-age=300',
    'X-Content-Type-Options': 'nosniff'
  });
  fs.createReadStream(resolved).pipe(res);
}

function validateSettingsPatch(patch) {
  const out = {};
  const numericFields = [
    'emaPeriod', 'emaSlopeThresholdPct', 'atrPeriod', 'atrStopMultiplier', 'supertrendMultiplier', 'kdeThreshold',
    'kdeLookback', 'relativeVolumeLookback', 'htfMinimumAligned', 'trendVotesRequired', 'zoneProximityPct', 'riskPercent', 'defaultLeverage',
    'maxLeverage', 'maxConcurrentPositions', 'maxBotAllocationUsd', 'liveWalletAllocationPct', 'liveMaxBotAllocationUsd', 'maxMarginPerCoinUsd', 'majorCoinMaxMarginUsd',
    'initialMarginUsd', 'majorInitialMarginUsd', 'maxStopLossUsd', 'minEntryMarginUsd', 'addOnStepMarginUsd',
    'majorAddOnStepMarginUsd', 'maxAddOnsPerCoin', 'profitAddOnTriggerR', 'profitAddOnSizePct', 'profitAddOnMinScore',
    'breakEvenTriggerR', 'breakEvenBufferR', 'tp1TriggerR', 'qualitySizeScore1', 'qualitySizeMultiplier1', 'qualitySizeScore2', 'qualitySizeMultiplier2', 'maxQualitySizeMultiplier',
    'dailyDrawdownLimitPct', 'weeklyDrawdownLimitPct', 'monthlyDrawdownLimitPct',
    'maxFundingRatePct8h', 'extremeFundingRatePct8h', 'newsBlackoutBeforeMin', 'newsBlackoutAfterMin', 'minRR', 'autoScanSeconds',
    'marketDataRefreshSeconds', 'liveOrderSize', 'macdFastLength', 'macdSlowLength', 'macdSignalLength', 'mtfEmaPeriod', 'minEmaGapPct', 'divergencePivotLeft', 'divergencePivotRight', 'divergenceLookback', 'minDivergenceMacdPct', 'entrySignalWindowCandles', 'histColorLookback', 'tradingViewSignalFreshnessSeconds', 'sarMacdEmaPeriod', 'sarMacdSarStep', 'sarMacdSarMax', 'sarMacdAdxThreshold', 'sarMacdPullbackLookback', 'sarMacdMaxDistanceAtr', 'sarMacdSwingLookback', 'sarMacdEmaStopBufferAtr', 'twoPoleFilterLength', 'twoPoleBuyMaxLevel', 'twoPoleSellMinLevel', 'twoPoleDeltaVolumeThresholdPct', 'breakoutLookback', 'breakoutConsolidationLookback', 'breakoutMaxRangeAtrMult', 'breakoutMomentumBodyAtrMult', 'breakoutSlBufferAtrMult', 'breakoutTp1R', 'chandelierLength', 'chandelierAtrMult', 'totalWalletAmount', 'maxTradesPerDay', 'maxDailyLossUsd', 'maxConsecutiveLosses', 'paperMinScore', 'adrUsedLimitPct', 'timeFailureCandles', 'pendingExpiryMinutes', 'minSlAtrMult', 'minTrendQuality', 'moveSlAfterTp1MinR', 'moveSlAfterTp1MinAge', 'rewardTargetR', 'targetFullTradeProfitUsd', 'minFullTradeProfitUsd', 'targetProfitUsd', 'minTargetProfitUsd', 'slSwingLookback', 'slBufferAtrMult', 'maxTechnicalSlAtrMult', 'pullbackAtrMult', 'pullbackMaxAtrMult', 'tp1ClosePct', 'tp2ClosePct', 'tp3ClosePct'
  ];
  for (const field of numericFields) {
    if (Object.prototype.hasOwnProperty.call(patch, field)) {
      const n = Number(patch[field]);
      if (Number.isFinite(n)) out[field] = n;
    }
  }
  if (Array.isArray(patch.assets)) out.assets = patch.assets.map(String).map(s => s.trim().toUpperCase()).filter(Boolean).slice(0, 50);
  if (Array.isArray(patch.majorMarginCoins)) out.majorMarginCoins = patch.majorMarginCoins.map(String).map(s => s.trim().toUpperCase()).filter(Boolean).slice(0, 20);
  if (typeof patch.deltaBaseUrl === 'string' && patch.deltaBaseUrl.includes('delta')) out.deltaBaseUrl = patch.deltaBaseUrl.trim().replace(/\/+$/, '');
  if (typeof patch.signalSource === 'string') out.signalSource = patch.signalSource.trim() || DEFAULT_SETTINGS.signalSource;
  if (typeof patch.entryModel === 'string') out.entryModel = patch.entryModel.trim().toUpperCase();
  if (typeof patch.zeroLineMode === 'string') out.zeroLineMode = patch.zeroLineMode.trim().toLowerCase();
  if (typeof patch.requireDivergenceForEntry === 'boolean') out.requireDivergenceForEntry = patch.requireDivergenceForEntry;
  if (typeof patch.tradingViewWebhookToken === 'string') out.tradingViewWebhookToken = patch.tradingViewWebhookToken.trim() || DEFAULT_SETTINGS.tradingViewWebhookToken;
  if (typeof patch.entryOrderType === 'string') out.entryOrderType = patch.entryOrderType === 'market' ? 'market' : 'limit';
  if (typeof patch.paperTrade === 'boolean') out.paperTrade = patch.paperTrade;
  if (typeof patch.maxOnePositionPerAsset === 'boolean') out.maxOnePositionPerAsset = patch.maxOnePositionPerAsset;
  if (typeof patch.tradeManagementEnabled === 'boolean') out.tradeManagementEnabled = patch.tradeManagementEnabled;
  if (typeof patch.autoMoveSlEnabled === 'boolean') out.autoMoveSlEnabled = patch.autoMoveSlEnabled;
  if (typeof patch.autoTp1Enabled === 'boolean') out.autoTp1Enabled = patch.autoTp1Enabled;
  if (typeof patch.profitAddOnEnabled === 'boolean') out.profitAddOnEnabled = patch.profitAddOnEnabled;
  if (typeof patch.autoAddOnEnabled === 'boolean') out.autoAddOnEnabled = patch.autoAddOnEnabled;
  if (typeof patch.profitAddOnRequireFreshSignal === 'boolean') out.profitAddOnRequireFreshSignal = patch.profitAddOnRequireFreshSignal;
  if (typeof patch.protectedAddOnNoLossOnly === 'boolean') out.protectedAddOnNoLossOnly = patch.protectedAddOnNoLossOnly;
  if (typeof patch.qualitySizingEnabled === 'boolean') out.qualitySizingEnabled = patch.qualitySizingEnabled;
  if (typeof patch.chandelierTradeManagementEnabled === 'boolean') out.chandelierTradeManagementEnabled = patch.chandelierTradeManagementEnabled;
  if (typeof patch.liveAddOnsEnabled === 'boolean') out.liveAddOnsEnabled = patch.liveAddOnsEnabled;
  if (typeof patch.macdConfirmationEnabled === 'boolean') out.macdConfirmationEnabled = patch.macdConfirmationEnabled;
  if (typeof patch.sarMacdModuleEnabled === 'boolean') out.sarMacdModuleEnabled = patch.sarMacdModuleEnabled;
  if (typeof patch.sarMacdAllowLocalEntry === 'boolean') out.sarMacdAllowLocalEntry = patch.sarMacdAllowLocalEntry;
  if (typeof patch.sarMacdBlockLateMomentum === 'boolean') out.sarMacdBlockLateMomentum = patch.sarMacdBlockLateMomentum;
  if (typeof patch.sarMacdWebhookOnly === 'boolean') out.sarMacdWebhookOnly = patch.sarMacdWebhookOnly;
  if (typeof patch.twoPoleModuleEnabled === 'boolean') out.twoPoleModuleEnabled = patch.twoPoleModuleEnabled;
  if (typeof patch.twoPoleAllowLocalEntry === 'boolean') out.twoPoleAllowLocalEntry = patch.twoPoleAllowLocalEntry;
  if (typeof patch.twoPoleUseInvalidationStop === 'boolean') out.twoPoleUseInvalidationStop = patch.twoPoleUseInvalidationStop;
  if (typeof patch.breakoutModuleEnabled === 'boolean') out.breakoutModuleEnabled = patch.breakoutModuleEnabled;
  if (typeof patch.breakoutAllowLocalEntry === 'boolean') out.breakoutAllowLocalEntry = patch.breakoutAllowLocalEntry;
  if (typeof patch.breakoutUseChandelierTrail === 'boolean') out.breakoutUseChandelierTrail = patch.breakoutUseChandelierTrail;
  if (typeof patch.sdZoneHardBlock === 'boolean') out.sdZoneHardBlock = patch.sdZoneHardBlock;
  if (typeof patch.highProbabilityMode === 'boolean') out.highProbabilityMode = patch.highProbabilityMode;
  if (typeof patch.technicalSlEnabled === 'boolean') out.technicalSlEnabled = patch.technicalSlEnabled;
  if (typeof patch.requireClosedCandle === 'boolean') out.requireClosedCandle = patch.requireClosedCandle;
  if (typeof patch.requirePullbackForExecution === 'boolean') out.requirePullbackForExecution = patch.requirePullbackForExecution;
  if (typeof patch.allowMarketWhenNoPullback === 'boolean') out.allowMarketWhenNoPullback = patch.allowMarketWhenNoPullback;
  if (typeof patch.autoSizeToTargetProfit === 'boolean') out.autoSizeToTargetProfit = patch.autoSizeToTargetProfit;
  if (typeof patch.blockTinyProfitTrades === 'boolean') out.blockTinyProfitTrades = patch.blockTinyProfitTrades;
  if (typeof patch.autoUseMaxLeverageForProfitTarget === 'boolean') out.autoUseMaxLeverageForProfitTarget = patch.autoUseMaxLeverageForProfitTarget;
  if (typeof patch.paperUseDeltaWalletReference === 'boolean') out.paperUseDeltaWalletReference = patch.paperUseDeltaWalletReference;
  if (typeof patch.paperLiveCompatibleSizing === 'boolean') out.paperLiveCompatibleSizing = patch.paperLiveCompatibleSizing;
  if (typeof patch.paperExecutionMode === 'string') out.paperExecutionMode = patch.paperExecutionMode === 'review' ? 'review' : 'auto';
  if (typeof patch.botEnabled === 'boolean') out.botEnabled = patch.botEnabled;

  out.riskPercent = Math.min(Math.max(out.riskPercent ?? DEFAULT_SETTINGS.riskPercent, 0.1), 2);
  out.defaultLeverage = Math.min(Math.max(out.defaultLeverage ?? DEFAULT_SETTINGS.defaultLeverage, 1), 25);
  out.maxLeverage = Math.min(Math.max(out.maxLeverage ?? DEFAULT_SETTINGS.maxLeverage, 1), 25);
  out.maxConcurrentPositions = Math.min(Math.max(Math.floor(out.maxConcurrentPositions ?? DEFAULT_SETTINGS.maxConcurrentPositions), 1), 5);
  out.maxBotAllocationUsd = Math.min(Math.max(out.maxBotAllocationUsd ?? DEFAULT_SETTINGS.maxBotAllocationUsd, 1), 100000);
  const rawTargetFull = out.targetFullTradeProfitUsd ?? out.targetProfitUsd ?? DEFAULT_SETTINGS.targetFullTradeProfitUsd ?? DEFAULT_SETTINGS.targetProfitUsd;
  const rawMinFull = out.minFullTradeProfitUsd ?? out.minTargetProfitUsd ?? DEFAULT_SETTINGS.minFullTradeProfitUsd ?? DEFAULT_SETTINGS.minTargetProfitUsd;
  out.targetFullTradeProfitUsd = Math.min(Math.max(rawTargetFull, 0), 1000);
  out.minFullTradeProfitUsd = Math.min(Math.max(rawMinFull, 0), Math.max(out.targetFullTradeProfitUsd || DEFAULT_SETTINGS.targetFullTradeProfitUsd, 0));
  // Backward-compatible aliases only. UI and sizing use full-trade fields.
  out.targetProfitUsd = out.targetFullTradeProfitUsd;
  out.minTargetProfitUsd = out.minFullTradeProfitUsd;
  out.liveWalletAllocationPct = Math.min(Math.max(out.liveWalletAllocationPct ?? DEFAULT_SETTINGS.liveWalletAllocationPct, 1), 100);
  out.liveMaxBotAllocationUsd = Math.min(Math.max(out.liveMaxBotAllocationUsd ?? DEFAULT_SETTINGS.liveMaxBotAllocationUsd, 0), 1000000);
  out.maxMarginPerCoinUsd = Math.min(Math.max(out.maxMarginPerCoinUsd ?? DEFAULT_SETTINGS.maxMarginPerCoinUsd, 1), 10000);
  out.majorCoinMaxMarginUsd = Math.min(Math.max(out.majorCoinMaxMarginUsd ?? DEFAULT_SETTINGS.majorCoinMaxMarginUsd, 1), 10000);
  out.initialMarginUsd = Math.min(Math.max(out.initialMarginUsd ?? DEFAULT_SETTINGS.initialMarginUsd, 1), out.maxMarginPerCoinUsd);
  out.majorInitialMarginUsd = Math.min(Math.max(out.majorInitialMarginUsd ?? DEFAULT_SETTINGS.majorInitialMarginUsd, 1), out.majorCoinMaxMarginUsd);
  out.addOnStepMarginUsd = Math.min(Math.max(out.addOnStepMarginUsd ?? DEFAULT_SETTINGS.addOnStepMarginUsd, 1), out.maxMarginPerCoinUsd);
  out.majorAddOnStepMarginUsd = Math.min(Math.max(out.majorAddOnStepMarginUsd ?? DEFAULT_SETTINGS.majorAddOnStepMarginUsd, 1), out.majorCoinMaxMarginUsd);
  out.maxStopLossUsd = Math.min(Math.max(out.maxStopLossUsd ?? DEFAULT_SETTINGS.maxStopLossUsd, 0.1), 3);
  out.minEntryMarginUsd = Math.min(Math.max(out.minEntryMarginUsd ?? DEFAULT_SETTINGS.minEntryMarginUsd, 1), 1000);
  out.maxAddOnsPerCoin = Math.min(Math.max(Math.floor(out.maxAddOnsPerCoin ?? DEFAULT_SETTINGS.maxAddOnsPerCoin), 0), 5);
  out.breakEvenTriggerR = Math.min(Math.max(Number(out.breakEvenTriggerR ?? DEFAULT_SETTINGS.breakEvenTriggerR), 0.25), 5);
  out.breakEvenBufferR = Math.min(Math.max(Number(out.breakEvenBufferR ?? DEFAULT_SETTINGS.breakEvenBufferR), 0), 0.5);
  out.tp1TriggerR = Math.min(Math.max(Number(out.tp1TriggerR ?? DEFAULT_SETTINGS.tp1TriggerR), 0.5), 5);
  out.profitAddOnTriggerR = Math.min(Math.max(Number(out.profitAddOnTriggerR ?? DEFAULT_SETTINGS.profitAddOnTriggerR), 1), 10);
  out.profitAddOnSizePct = Math.min(Math.max(Number(out.profitAddOnSizePct ?? DEFAULT_SETTINGS.profitAddOnSizePct), 1), 100);
  out.profitAddOnMinScore = Math.min(Math.max(Number(out.profitAddOnMinScore ?? DEFAULT_SETTINGS.profitAddOnMinScore), 45), 95);
  out.qualitySizeScore1 = Math.min(Math.max(Number(out.qualitySizeScore1 ?? DEFAULT_SETTINGS.qualitySizeScore1), 45), 95);
  out.qualitySizeMultiplier1 = Math.min(Math.max(Number(out.qualitySizeMultiplier1 ?? DEFAULT_SETTINGS.qualitySizeMultiplier1), 1), 5);
  out.qualitySizeScore2 = Math.min(Math.max(Number(out.qualitySizeScore2 ?? DEFAULT_SETTINGS.qualitySizeScore2), out.qualitySizeScore1), 99);
  out.qualitySizeMultiplier2 = Math.min(Math.max(Number(out.qualitySizeMultiplier2 ?? DEFAULT_SETTINGS.qualitySizeMultiplier2), out.qualitySizeMultiplier1), 5);
  out.maxQualitySizeMultiplier = Math.min(Math.max(Number(out.maxQualitySizeMultiplier ?? DEFAULT_SETTINGS.maxQualitySizeMultiplier), 1), 5);
  out.tradeManagementEnabled = typeof out.tradeManagementEnabled === 'boolean' ? out.tradeManagementEnabled : DEFAULT_SETTINGS.tradeManagementEnabled;
  out.autoMoveSlEnabled = typeof out.autoMoveSlEnabled === 'boolean' ? out.autoMoveSlEnabled : DEFAULT_SETTINGS.autoMoveSlEnabled;
  out.autoTp1Enabled = typeof out.autoTp1Enabled === 'boolean' ? out.autoTp1Enabled : DEFAULT_SETTINGS.autoTp1Enabled;
  out.profitAddOnEnabled = typeof out.profitAddOnEnabled === 'boolean' ? out.profitAddOnEnabled : DEFAULT_SETTINGS.profitAddOnEnabled;
  out.autoAddOnEnabled = typeof out.autoAddOnEnabled === 'boolean' ? out.autoAddOnEnabled : DEFAULT_SETTINGS.autoAddOnEnabled;
  out.profitAddOnRequireFreshSignal = typeof out.profitAddOnRequireFreshSignal === 'boolean' ? out.profitAddOnRequireFreshSignal : DEFAULT_SETTINGS.profitAddOnRequireFreshSignal;
  out.protectedAddOnNoLossOnly = typeof out.protectedAddOnNoLossOnly === 'boolean' ? out.protectedAddOnNoLossOnly : DEFAULT_SETTINGS.protectedAddOnNoLossOnly;
  out.qualitySizingEnabled = typeof out.qualitySizingEnabled === 'boolean' ? out.qualitySizingEnabled : DEFAULT_SETTINGS.qualitySizingEnabled;
  out.chandelierTradeManagementEnabled = typeof out.chandelierTradeManagementEnabled === 'boolean' ? out.chandelierTradeManagementEnabled : DEFAULT_SETTINGS.chandelierTradeManagementEnabled;
  out.requireTradingViewSignalForExecution = Object.prototype.hasOwnProperty.call(patch, 'requireTradingViewSignalForExecution') ? Boolean(patch.requireTradingViewSignalForExecution) : Boolean(out.requireTradingViewSignalForExecution);
  out.rewardTargetR = Math.min(Math.max(Number(out.rewardTargetR ?? DEFAULT_SETTINGS.rewardTargetR ?? 3), 2), 5);
  out.slSwingLookback = Math.min(Math.max(Math.floor(out.slSwingLookback ?? DEFAULT_SETTINGS.slSwingLookback ?? 24), 8), 120);
  out.slBufferAtrMult = Math.min(Math.max(Number(out.slBufferAtrMult ?? DEFAULT_SETTINGS.slBufferAtrMult ?? 0.15), 0), 1);
  out.maxTechnicalSlAtrMult = Math.min(Math.max(Number(out.maxTechnicalSlAtrMult ?? DEFAULT_SETTINGS.maxTechnicalSlAtrMult ?? 6), 2), 20);
  out.tp1ClosePct = Math.min(Math.max(Number(out.tp1ClosePct ?? DEFAULT_SETTINGS.tp1ClosePct ?? 50), 0), 100);
  out.tp2ClosePct = Math.min(Math.max(Number(out.tp2ClosePct ?? DEFAULT_SETTINGS.tp2ClosePct ?? 25), 0), 100);
  out.tp3ClosePct = Math.min(Math.max(Number(out.tp3ClosePct ?? DEFAULT_SETTINGS.tp3ClosePct ?? 25), 0), 100);
  out.kdeThreshold = Math.min(Math.max(out.kdeThreshold ?? DEFAULT_SETTINGS.kdeThreshold, 45), 95);
  out.paperMinScore = Math.min(Math.max(out.paperMinScore ?? out.kdeThreshold, 45), 95);
  out.trendVotesRequired = Math.min(Math.max(Math.floor(out.trendVotesRequired ?? DEFAULT_SETTINGS.trendVotesRequired ?? 2), 1), 4);
  out.zoneProximityPct = Math.min(Math.max(out.zoneProximityPct ?? DEFAULT_SETTINGS.zoneProximityPct, 0.1), 1);
  out.liveOrderSize = Math.max(1, Math.floor(out.liveOrderSize ?? DEFAULT_SETTINGS.liveOrderSize));
  out.macdFastLength = Math.min(Math.max(Math.floor(out.macdFastLength ?? DEFAULT_SETTINGS.macdFastLength), 2), 50);
  out.macdSlowLength = Math.min(Math.max(Math.floor(out.macdSlowLength ?? DEFAULT_SETTINGS.macdSlowLength), out.macdFastLength + 1), 100);
  out.macdSignalLength = Math.min(Math.max(Math.floor(out.macdSignalLength ?? DEFAULT_SETTINGS.macdSignalLength), 2), 50);
  out.sarMacdModuleEnabled = typeof out.sarMacdModuleEnabled === 'boolean' ? out.sarMacdModuleEnabled : DEFAULT_SETTINGS.sarMacdModuleEnabled;
  out.sarMacdAllowLocalEntry = typeof out.sarMacdAllowLocalEntry === 'boolean' ? out.sarMacdAllowLocalEntry : DEFAULT_SETTINGS.sarMacdAllowLocalEntry;
  out.sarMacdBlockLateMomentum = typeof out.sarMacdBlockLateMomentum === 'boolean' ? out.sarMacdBlockLateMomentum : DEFAULT_SETTINGS.sarMacdBlockLateMomentum;
  out.sarMacdWebhookOnly = typeof out.sarMacdWebhookOnly === 'boolean' ? out.sarMacdWebhookOnly : DEFAULT_SETTINGS.sarMacdWebhookOnly;
  out.sarMacdEmaPeriod = Math.min(Math.max(Math.floor(out.sarMacdEmaPeriod ?? DEFAULT_SETTINGS.sarMacdEmaPeriod), 50), 260);
  out.sarMacdSarStep = Math.min(Math.max(Number(out.sarMacdSarStep ?? DEFAULT_SETTINGS.sarMacdSarStep), 0.001), 0.2);
  out.sarMacdSarMax = Math.min(Math.max(Number(out.sarMacdSarMax ?? DEFAULT_SETTINGS.sarMacdSarMax), out.sarMacdSarStep), 1);
  out.sarMacdAdxThreshold = Math.min(Math.max(Number(out.sarMacdAdxThreshold ?? DEFAULT_SETTINGS.sarMacdAdxThreshold), 5), 60);
  out.sarMacdPullbackLookback = Math.min(Math.max(Math.floor(out.sarMacdPullbackLookback ?? DEFAULT_SETTINGS.sarMacdPullbackLookback), 3), 20);
  out.sarMacdMaxDistanceAtr = Math.min(Math.max(Number(out.sarMacdMaxDistanceAtr ?? DEFAULT_SETTINGS.sarMacdMaxDistanceAtr), 0.5), 12);
  out.sarMacdSwingLookback = Math.min(Math.max(Math.floor(out.sarMacdSwingLookback ?? DEFAULT_SETTINGS.sarMacdSwingLookback), 8), 80);
  out.sarMacdEmaStopBufferAtr = Math.min(Math.max(Number(out.sarMacdEmaStopBufferAtr ?? DEFAULT_SETTINGS.sarMacdEmaStopBufferAtr), 0), 1);
  out.twoPoleFilterLength = Math.min(Math.max(Math.floor(out.twoPoleFilterLength ?? DEFAULT_SETTINGS.twoPoleFilterLength), 1), 100);
  out.twoPoleBuyMaxLevel = Math.min(Math.max(Number(out.twoPoleBuyMaxLevel ?? DEFAULT_SETTINGS.twoPoleBuyMaxLevel), -2), 1);
  out.twoPoleSellMinLevel = Math.min(Math.max(Number(out.twoPoleSellMinLevel ?? DEFAULT_SETTINGS.twoPoleSellMinLevel), -1), 2);
  out.twoPoleDeltaVolumeThresholdPct = Math.min(Math.max(Number(out.twoPoleDeltaVolumeThresholdPct ?? DEFAULT_SETTINGS.twoPoleDeltaVolumeThresholdPct), 0), 100);
  out.twoPoleModuleEnabled = typeof out.twoPoleModuleEnabled === 'boolean' ? out.twoPoleModuleEnabled : DEFAULT_SETTINGS.twoPoleModuleEnabled;
  out.twoPoleAllowLocalEntry = typeof out.twoPoleAllowLocalEntry === 'boolean' ? out.twoPoleAllowLocalEntry : DEFAULT_SETTINGS.twoPoleAllowLocalEntry;
  out.twoPoleUseInvalidationStop = typeof out.twoPoleUseInvalidationStop === 'boolean' ? out.twoPoleUseInvalidationStop : DEFAULT_SETTINGS.twoPoleUseInvalidationStop;
  out.breakoutLookback = Math.min(Math.max(Math.floor(out.breakoutLookback ?? DEFAULT_SETTINGS.breakoutLookback), 12), 160);
  out.breakoutConsolidationLookback = Math.min(Math.max(Math.floor(out.breakoutConsolidationLookback ?? DEFAULT_SETTINGS.breakoutConsolidationLookback), 5), 80);
  out.breakoutMaxRangeAtrMult = Math.min(Math.max(Number(out.breakoutMaxRangeAtrMult ?? DEFAULT_SETTINGS.breakoutMaxRangeAtrMult), 0.5), 8);
  out.breakoutMomentumBodyAtrMult = Math.min(Math.max(Number(out.breakoutMomentumBodyAtrMult ?? DEFAULT_SETTINGS.breakoutMomentumBodyAtrMult), 0.1), 5);
  out.breakoutSlBufferAtrMult = Math.min(Math.max(Number(out.breakoutSlBufferAtrMult ?? DEFAULT_SETTINGS.breakoutSlBufferAtrMult), 0), 1);
  out.breakoutTp1R = Math.min(Math.max(Number(out.breakoutTp1R ?? DEFAULT_SETTINGS.breakoutTp1R), 1), 5);
  out.chandelierLength = Math.min(Math.max(Math.floor(out.chandelierLength ?? DEFAULT_SETTINGS.chandelierLength), 5), 120);
  out.chandelierAtrMult = Math.min(Math.max(Number(out.chandelierAtrMult ?? DEFAULT_SETTINGS.chandelierAtrMult), 1), 8);
  out.breakoutModuleEnabled = typeof out.breakoutModuleEnabled === 'boolean' ? out.breakoutModuleEnabled : DEFAULT_SETTINGS.breakoutModuleEnabled;
  out.breakoutAllowLocalEntry = typeof out.breakoutAllowLocalEntry === 'boolean' ? out.breakoutAllowLocalEntry : DEFAULT_SETTINGS.breakoutAllowLocalEntry;
  out.breakoutUseChandelierTrail = typeof out.breakoutUseChandelierTrail === 'boolean' ? out.breakoutUseChandelierTrail : DEFAULT_SETTINGS.breakoutUseChandelierTrail;
  // V56 execution-mode controls. Practical mode matches manual entries: MTF EMA + MACD crossover + histogram change.
  // Strict mode keeps the transcript divergence + zero-line rules as hard blockers. Pullback limit is an execution layer.
  out.entryModel = String(out.entryModel || DEFAULT_SETTINGS.entryModel).toUpperCase() === 'STRICT_TRANSCRIPT_DIVERGENCE' ? 'STRICT_TRANSCRIPT_DIVERGENCE' : 'PRACTICAL_MTF_MACD';
  out.requireDivergenceForEntry = out.entryModel === 'STRICT_TRANSCRIPT_DIVERGENCE' ? true : Boolean(out.requireDivergenceForEntry);
  out.zeroLineMode = out.entryModel === 'STRICT_TRANSCRIPT_DIVERGENCE' ? 'hard' : (String(out.zeroLineMode || DEFAULT_SETTINGS.zeroLineMode).toLowerCase() === 'hard' ? 'hard' : 'soft');
  out.entrySignalWindowCandles = Math.min(Math.max(Math.floor(Number(out.entrySignalWindowCandles || DEFAULT_SETTINGS.entrySignalWindowCandles || 3)), 1), 12);
  out.histColorLookback = Math.min(Math.max(Math.floor(Number(out.histColorLookback || DEFAULT_SETTINGS.histColorLookback || 6)), 2), 30);
  // Hard lock the cleaned build to the requested strategy and 5m execution.
  out.primaryTimeframe = '5m';
  out.executionTimeframe = '5m';
  out.emaFastTimeframe = '15m';
  out.emaSlowTimeframe = '1h';
  out.macdTrendTimeframe = '5m';
  out.higherTimeframes = ['15m', '1h'];
  out.htfMinimumAligned = 1;
  out.twoPoleModuleEnabled = false;
  out.twoPoleAllowLocalEntry = false;
  out.breakoutModuleEnabled = false;
  out.breakoutAllowLocalEntry = false;
  out.vwapModuleEnabled = false;
  out.vwapAllowLocalEntry = false;
  out.sarMacdModuleEnabled = false;
  out.sarMacdAllowLocalEntry = false;
  out.emaPeriod = Math.min(Math.max(Math.floor(Number(out.mtfEmaPeriod || out.emaPeriod || 50)), 5), 200);
  out.mtfEmaPeriod = out.emaPeriod;
  out.pullbackAtrMult = Math.min(Math.max(Number(out.pullbackAtrMult ?? DEFAULT_SETTINGS.pullbackAtrMult ?? 0.20), 0.02), 1.5);
  out.pullbackMaxAtrMult = Math.min(Math.max(Number(out.pullbackMaxAtrMult ?? DEFAULT_SETTINGS.pullbackMaxAtrMult ?? 1.50), 0.2), 5);
  out.requirePullbackForExecution = typeof out.requirePullbackForExecution === 'boolean' ? out.requirePullbackForExecution : DEFAULT_SETTINGS.requirePullbackForExecution;
  out.allowMarketWhenNoPullback = typeof out.allowMarketWhenNoPullback === 'boolean' ? out.allowMarketWhenNoPullback : DEFAULT_SETTINGS.allowMarketWhenNoPullback;
  out.entryOrderType = out.entryOrderType === 'market' && out.allowMarketWhenNoPullback ? 'market' : 'limit';
  out.signalSource = 'macd_divergence_mtf_ema';
  out.strategyMode = 'MACD_DIVERGENCE_MTF_EMA';
  out.exchange = 'delta_exchange_india';
  out.executionApi = 'delta_exchange_india';
  return out;
}

async function testDeltaKeys(settings, keys) {
  const result = await deltaSignedRequest(settings, keys, 'GET', '/v2/profile');
  keys.lastTestAt = new Date().toISOString();
  keys.lastTestStatus = 'pass';
  keys.lastTestMessage = 'Delta India profile endpoint authenticated successfully.';
  saveKeys(keys);
  log('CONFIG', 'Delta API key test passed.');
  return result;
}

async function runApiAutoSetup(body = {}) {
  const steps = [];
  const pushStep = (name, status, message = '') => steps.push({ name, status, message });

  let settings = loadSettings();
  if (typeof body.deltaBaseUrl === 'string' && body.deltaBaseUrl.includes('delta')) {
    settings.deltaBaseUrl = body.deltaBaseUrl.trim().replace(/\/+$/, '');
    saveSettings(settings);
    pushStep('Save Delta API base URL', 'pass', settings.deltaBaseUrl);
  }

  const current = loadKeys();
  const nextApiKey = typeof body.apiKey === 'string' && body.apiKey.trim() ? body.apiKey.trim() : current.apiKey;
  const nextSecret = typeof body.secret === 'string' && body.secret.trim() ? body.secret.trim() : current.secret;
  if (!nextApiKey || !nextSecret) throw new Error('API key and secret are required for Auto Setup.');

  const keys = {
    ...current,
    apiKey: nextApiKey,
    secret: nextSecret,
    liveTradingConfirmed: Boolean(body.liveTradingConfirmed ?? current.liveTradingConfirmed)
  };
  const keysChanged = nextApiKey !== current.apiKey || nextSecret !== current.secret;
  if (keysChanged) {
    keys.lastTestAt = null;
    keys.lastTestStatus = 'not_tested';
    keys.lastTestMessage = 'Keys changed. Auto Setup started.';
  }
  saveKeys(keys);
  pushStep('Save API key + secret', 'pass', `Saved ${maskKey(nextApiKey)}`);

  try {
    const ipData = await detectServerOutboundIp();
    pushStep('Detect server outbound IP', 'pass', ipData.ip || 'Detected');
    const saved = loadKeys();
    saved.whitelistedIpNote = ipData.ip || saved.whitelistedIpNote || '';
    saveKeys(saved);
    pushStep('Save server IP note', 'pass', saved.whitelistedIpNote || 'Saved');
  } catch (error) {
    pushStep('Detect server outbound IP', 'fail', error.message);
  }

  settings = loadSettings();
  const testKeys = loadKeys();
  try {
    await testDeltaKeys(settings, testKeys);
    pushStep('Test Delta API connection', 'pass', 'Profile endpoint authenticated.');
  } catch (error) {
    const failed = loadKeys();
    failed.lastTestAt = new Date().toISOString();
    failed.lastTestStatus = 'fail';
    failed.lastTestMessage = error.message;
    failed.liveTradingConfirmed = false;
    saveKeys(failed);
    const safeSettings = loadSettings();
    safeSettings.paperTrade = true;
    safeSettings.botEnabled = false;
    saveSettings(safeSettings);
    pushStep('Test Delta API connection', 'fail', error.message);
    log('ERROR', `Auto Setup API test failed: ${error.message}`);
    return { completed: false, needsManualWhitelist: String(error.message || '').includes('ip_not_whitelisted'), steps, state: getStatePayload() };
  }

  try {
    await refreshDeltaPublicData(settings, true);
    pushStep('Sync Delta market data', state.delta.status === 'LIVE_DELTA' ? 'pass' : 'fail', state.delta.message);
    await syncLiveAccountIfReady(settings, loadKeys(), { force: true });
    pushStep('Sync Delta wallet', state.walletLive.status === 'LIVE_WALLET' ? 'pass' : 'fail', state.walletLive.message);
    pushStep('Sync Delta account positions', state.deltaPositions.status === 'LIVE_POSITIONS' ? 'pass' : 'fail', state.deltaPositions.message);
  } catch (error) {
    pushStep('Sync Delta wallet/account', 'fail', error.message);
  }

  const complete = loadKeys().lastTestStatus === 'pass' && state.delta.status === 'LIVE_DELTA' && state.walletLive.status === 'LIVE_WALLET' && state.deltaPositions.status === 'LIVE_POSITIONS';
  log(complete ? 'CONFIG' : 'SAFE', `Auto Setup ${complete ? 'completed' : 'incomplete'}.`);
  return { completed: complete, needsManualWhitelist: false, steps, state: getStatePayload() };
}

function signalLabelFromBody(body = {}) {
  return String(
    body.signal || body.label || body.signalLabel || body.signal_label || body.entryLabel || body.entry_label || body.action || body.side || ''
  ).trim().toUpperCase().replace(/[\s_-]+/g, ' ');
}

function parseTradingViewInstruction(body = {}) {
  const label = signalLabelFromBody(body);
  const compact = label.replace(/[^A-Z]/g, '');
  const rawText = [body.side, body.action, body.signal, body.label, body.signalLabel, body.entryLabel]
    .filter(v => v !== undefined && v !== null)
    .map(v => String(v).toUpperCase())
    .join(' | ');

  const isExitLong = compact === 'EL' || /\b(EXIT|CLOSE)\s+LONG\b/.test(label) || /\bLONG\s+(EXIT|CLOSE)\b/.test(label);
  const isExitShort = compact === 'ES' || /\b(EXIT|CLOSE)\s+SHORT\b/.test(label) || /\bSHORT\s+(EXIT|CLOSE)\b/.test(label);
  if (isExitLong) return { type: 'EXIT', side: 'LONG', label };
  if (isExitShort) return { type: 'EXIT', side: 'SHORT', label };

  // Important: EL means Exit Long and ES means Exit Short when webhook labels are used.
  // Entry labels are explicit words or LE/SE, not EL/ES.
  const isEnterLong = compact === 'LE' || /\b(ENTER|ENTRY|BUY)\s+LONG\b/.test(label) || /\bLONG\s+(ENTRY|ENTER)\b/.test(label) || /\bBUY\b/.test(label) || label === 'LONG';
  const isEnterShort = compact === 'SE' || /\b(ENTER|ENTRY|SELL)\s+SHORT\b/.test(label) || /\bSHORT\s+(ENTRY|ENTER)\b/.test(label) || /\bSELL\b/.test(label) || label === 'SHORT';
  if (isEnterLong) return { type: 'ENTRY', side: 'LONG', label };
  if (isEnterShort) return { type: 'ENTRY', side: 'SHORT', label };

  // Fallback for generic webhooks where side/action is supplied but no label exists.
  if (/\b(LONG|BUY)\b/.test(rawText) && !/\b(EXIT|CLOSE)\b/.test(rawText)) return { type: 'ENTRY', side: 'LONG', label };
  if (/\b(SHORT|SELL)\b/.test(rawText) && !/\b(EXIT|CLOSE)\b/.test(rawText)) return { type: 'ENTRY', side: 'SHORT', label };
  return { type: 'UNKNOWN', side: '', label };
}

async function closeOpenTradesBySymbolSideAsync(symbol, side) {
  const normalizedSymbol = String(symbol || '').toUpperCase();
  const normalizedSide = String(side || '').toUpperCase();
  const saved = loadTrades();
  const localMatches = (saved.openTrades || []).filter(t => String(t.coin || '').toUpperCase() === normalizedSymbol && String(t.side || '').toUpperCase() === normalizedSide && t.status !== 'CLOSED');
  const syncedMatches = (state.deltaPositions.openTrades || []).filter(t => String(t.coin || '').toUpperCase() === normalizedSymbol && String(t.side || '').toUpperCase() === normalizedSide);
  const seen = new Set();
  const matches = [...localMatches, ...syncedMatches].filter(t => {
    const id = String(t.id || '');
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
  const closed = [];
  for (const trade of matches) {
    const result = await closeTradeByIdAsync(trade.id);
    if (result) closed.push(result);
  }
  return closed;
}

async function saveWebhookSignal(body, settings) {
  const token = String(body.token || body.secret || body.webhookToken || '').trim();
  if (settings.tradingViewWebhookToken && settings.tradingViewWebhookToken !== 'change-me' && token !== settings.tradingViewWebhookToken) {
    throw new Error('Invalid TradingView webhook token');
  }
  const symbol = String(body.symbol || body.ticker || body.coin || '').trim().toUpperCase();
  if (!symbol) throw new Error('Webhook requires symbol');
  const instruction = parseTradingViewInstruction(body);

  if (instruction.type === 'EXIT') {
    const closed = await closeOpenTradesBySymbolSideAsync(symbol, instruction.side);
    log('TV', `TradingView webhook exit received: ${symbol} ${instruction.side} (${instruction.label || 'exit'}). Closed ${closed.length}.`);
    return { symbol, action: `EXIT_${instruction.side}`, side: instruction.side, closedCount: closed.length, closed };
  }

  const side = instruction.type === 'ENTRY' ? instruction.side : '';
  if (!side) throw new Error('Webhook requires ENTER LONG/ENTER SHORT or LONG/SHORT/BUY/SELL entry signal. EL/ES are treated as exits.');
  const signals = readJson('webhookSignals.json', []);
  signals.unshift({ symbol, side, receivedAt: new Date().toISOString(), raw: { ...body, parsedSignalType: 'ENTRY', parsedSide: side } });
  writeJson('webhookSignals.json', signals.slice(0, 100));
  log('TV', `TradingView webhook entry received: ${symbol} ${side}.`);
  return { symbol, action: `ENTRY_${side}`, side };
}


function latestClosedChartSignal(symbol, candles, settings) {
  const closes = candles.map(c => c.close).filter(n => Number.isFinite(n) && n > 0);
  const signal = calculateMacdDivergenceMtfLocal(symbol, closes, closes[closes.length - 1], atrFromCandles(candles, Number(settings.atrPeriod || 14)), settings);
  return signal;
}

function buildChartPayload(symbol, resolution = '5m', settings = loadSettings()) {
  const sym = String(symbol || settings.assets?.[0] || 'BTCUSD').toUpperCase();
  const res = normalizeResolution(resolution || settings.executionTimeframe || '5m');
  const fullClosedCandles = getCachedCandles(sym, res);
  const closedSlice = fullClosedCandles.slice(-180);
  const closedChartOffset = Math.max(0, fullClosedCandles.length - closedSlice.length);

  const visual = livePreviewCandles(sym, res, fullClosedCandles, settings);
  const visualFullCandles = visual.candles;
  const candles = visualFullCandles.slice(-(visual.usesLivePreview ? 181 : 180));

  const ema15Closed = getCachedCandles(sym, '15m');
  const ema1hClosed = getCachedCandles(sym, '1h');
  const ema15Visual = livePreviewCandles(sym, '15m', ema15Closed, settings).candles;
  const ema1hVisual = livePreviewCandles(sym, '1h', ema1hClosed, settings).candles;
  const emaLen = Math.min(Math.max(Math.floor(Number(settings.mtfEmaPeriod || settings.emaPeriod || 50)), 5), 200);
  const ema15SeriesRaw = emaSeries(ema15Visual.map(c => c.close), emaLen);
  const ema1hSeriesRaw = emaSeries(ema1hVisual.map(c => c.close), emaLen);
  const ema15 = alignTimeSeriesToCandles(candles, ema15Visual, ema15SeriesRaw);
  const ema1h = alignTimeSeriesToCandles(candles, ema1hVisual, ema1hSeriesRaw);

  // Chart MACD is computed from the full visible/live-preview series and then sliced, so it matches the plotted candles.
  // The scanner signal below still uses closed 5m candles only.
  const macdFull = macdSeriesForCandles(visualFullCandles, settings);
  const macdSliceStart = Math.max(0, visualFullCandles.length - candles.length);
  const macd = {
    lineSeries: (macdFull.lineSeries || []).slice(macdSliceStart),
    signalSeries: (macdFull.signalSeries || []).slice(macdSliceStart),
    histSeries: (macdFull.histSeries || []).slice(macdSliceStart)
  };

  const signal = res === '5m' ? latestClosedChartSignal(sym, fullClosedCandles, settings) : latestClosedChartSignal(sym, getCachedCandles(sym, '5m'), settings);
  const currentPrice = Number(visual.livePrice || candles.at(-1)?.close || state.market[sym]?.price || BASE_PRICE[sym] || 0);
  const side = signal?.pass ? signal.entrySide : (signal?.conditions?.shortTrend || signal?.short?.conditions?.shortTrend ? 'SHORT' : 'LONG');
  const chartAtr = atrFromCandles(fullClosedCandles, Number(settings.atrPeriod || 14));
  const chartSr = calculateSupportResistanceLocal(sym, fullClosedCandles.map(c => c.close), currentPrice, chartAtr, settings);
  const chartPullback = signal?.pass && settings.entryOrderType !== 'market' && settings.requirePullbackForExecution !== false
    ? nearestPullbackEntry({ symbol: sym, price: currentPrice, atr: chartAtr, macdDivergenceSignal: signal, supportResistance: chartSr }, side, settings)
    : null;
  const plannedEntry = chartPullback?.entry || currentPrice;
  const sl = signal?.pass ? signal.invalidationLevel : null;
  const risk = sl ? Math.abs(plannedEntry - sl) : 0;
  const tp1 = signal?.pass ? (side === 'LONG' ? plannedEntry + risk : plannedEntry - risk) : null;
  const tp2 = signal?.pass ? (side === 'LONG' ? plannedEntry + risk * 2 : plannedEntry - risk * 2) : null;
  let plan = signal?.pass ? { side, entry: roundCoin(sym, plannedEntry), currentPrice: roundCoin(sym, currentPrice), sl, tp1: roundCoin(sym, tp1), tp2: roundCoin(sym, tp2), rr: '1:2', active: true, entryType: chartPullback ? 'PULLBACK_LIMIT' : 'IMMEDIATE', pullbackPlan: chartPullback } : { side, entry: null, sl: null, tp1: null, tp2: null, rr: '1:2', active: false };
  if (plan.active && plan.entry && plan.sl) {
    const product = state.delta.productsBySymbol?.[sym] || null;
    const useExchangeCompatibleSizing = Boolean(product && (settings.paperLiveCompatibleSizing !== false || (!settings.paperTrade && liveReady(settings, loadKeys()))));
    const sizingPlan = calculateMarginPlan({ coin: sym, price: plan.entry, candidate: { entry: plan.entry, sl: plan.sl } }, settings, loadTrades(), product, null, { live: useExchangeCompatibleSizing });
    plan = {
      ...plan,
      marginUsedUsd: sizingPlan.marginUsd,
      notionalUsd: sizingPlan.notionalUsd,
      leverage: sizingPlan.leverage,
      estimatedStopLossUsd: sizingPlan.estimatedStopLossUsd,
      estimatedTp1ProfitUsd: sizingPlan.estimatedTp1ProfitUsd,
      estimatedTp2ProfitUsd: sizingPlan.estimatedTp2ProfitUsd,
      estimatedFullTradeProfitUsd: sizingPlan.estimatedFullTradeProfitUsd,
      plannedProfitR: sizingPlan.plannedProfitR,
      minFullTradeProfitUsd: sizingPlan.minFullTradeProfitUsd,
      targetFullTradeProfitUsd: sizingPlan.targetFullTradeProfitUsd,
      minTargetProfitUsd: sizingPlan.minTargetProfitUsd,
      targetProfitUsd: sizingPlan.targetProfitUsd,
      profitTargetStatus: sizingPlan.profitTargetStatus,
      sizingAllowed: sizingPlan.allowed,
      sizingBlockedReason: sizingPlan.blockedReason
    };
  }
  return {
    symbol: sym,
    resolution: res,
    exchange: 'Delta Exchange India',
    source: candles.length
      ? (visual.usesLivePreview ? 'Delta closed candles + live ticker preview. Bot entries still use closed 5m candles only.' : 'Delta /v2/history/candles closed candles')
      : 'No candle data loaded',
    lastFetchAt: state.delta.candlesLastFetchAt?.[candleKey(sym, res)] || null,
    chartOffset: closedChartOffset,
    candles,
    currentPrice: roundCoin(sym, currentPrice),
    usesLivePreview: Boolean(visual.usesLivePreview),
    indicators: {
      ema15,
      ema1h,
      macdLine: macd.lineSeries || [],
      macdSignal: macd.signalSeries || [],
      macdHist: macd.histSeries || []
    },
    signal,
    plan,
    tradingViewUrl: `https://www.tradingview.com/chart/?symbol=DELTA:${encodeURIComponent(sym)}`,
    warning: res !== '5m' ? 'Reference view only. Strategy entries are evaluated on closed 5m candles.' : (visual.usesLivePreview ? 'Live candle is visual only. Orders trigger after the 5m candle closes.' : '')
  };
}


function publicDeltaSymbols() {
  const products = Object.values(state.delta.productsBySymbol || {});
  const fromProducts = products
    .filter(product => {
      const stateText = String(product?.state || product?.status || product?.product_state || '').toLowerCase();
      const contractType = String(product?.contract_type || product?.contractType || '').toLowerCase();
      const symbol = String(product?.symbol || product?.product_symbol || '').toUpperCase();
      if (!symbol) return false;
      if (stateText && !['live', 'active', 'enabled', 'trading'].some(x => stateText.includes(x))) return false;
      if (contractType && !contractType.includes('perpetual')) return false;
      return /USD|USDT/.test(symbol);
    })
    .map(product => String(product?.symbol || product?.product_symbol || '').toUpperCase());
  const fromTickers = Object.keys(state.delta.tickersBySymbol || {}).filter(s => /USD|USDT/.test(String(s).toUpperCase()));
  return Array.from(new Set([...fromProducts, ...fromTickers, ...Object.keys(BASE_PRICE)]))
    .map(s => String(s).toUpperCase().trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}

async function apiRoute(req, res, pathname) {
  try {
    if (req.method === 'GET' && pathname === '/api/state') {
      const settings = loadSettings();
      await refreshDeltaPublicData(settings, false);
      await refreshDeltaCandlesForAssets(settings, false);
      await syncLiveAccountIfReady(settings, loadKeys(), { force: false });
      return send(res, 200, { ok: true, data: getStatePayload(settings) });
    }

    if (req.method === 'POST' && pathname === '/api/sync-delta') {
      const settings = loadSettings();
      await refreshDeltaPublicData(settings, true);
      await syncLiveAccountIfReady(settings, loadKeys(), { force: true });
      return send(res, 200, { ok: true, data: getStatePayload(settings) });
    }

    if (req.method === 'POST' && pathname === '/api/sync-account') {
      const settings = loadSettings();
      await refreshDeltaPublicData(settings, true);
      await syncLiveAccountIfReady(settings, loadKeys(), { force: true });
      return send(res, 200, { ok: true, data: getStatePayload(settings) });
    }


    if (req.method === 'GET' && pathname === '/api/delta-symbols') {
      const settings = loadSettings();
      await refreshDeltaPublicData(settings, false);
      return send(res, 200, { ok: true, data: { symbols: publicDeltaSymbols(), selected: settings.assets || [], status: state.delta.status, message: state.delta.message } });
    }

    if (req.method === 'GET' && pathname === '/api/chart') {
      const settings = loadSettings();
      const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      const symbol = String(parsedUrl.searchParams.get('symbol') || settings.assets?.[0] || 'BTCUSD').toUpperCase();
      const resolution = normalizeResolution(parsedUrl.searchParams.get('resolution') || settings.executionTimeframe || '5m');
      await refreshDeltaPublicData(settings, false);
      await refreshDeltaCandles(symbol, [resolution, '5m', '15m', '1h'], settings, true);
      return send(res, 200, { ok: true, data: buildChartPayload(symbol, resolution, settings) });
    }

    if (req.method === 'POST' && pathname === '/api/scan') {
      const payload = await runScanAsync({ autoExecute: true, forceDelta: true });
      return send(res, 200, { ok: true, data: payload });
    }

    if (req.method === 'POST' && pathname === '/api/toggle-live') {
      const body = await readBody(req);
      const settings = loadSettings();
      const enabling = Boolean(body.enabled);
      if (enabling && !settings.paperTrade) {
        const keys = loadKeys();
        if (!liveReady(settings, keys)) return sendError(res, 400, `BOT ON blocked: ${liveBlockReason(settings, keys) || 'live mode is not fully confirmed.'}`);
        await syncLiveAccountIfReady(settings, keys, { force: true });
        const refreshed = loadSettings();
        if (refreshed.paperTrade || state.deltaPositions.status !== 'LIVE_POSITIONS') {
          return sendError(res, 400, `BOT ON blocked: Delta account sync failed (${state.deltaPositions.message || state.deltaPositions.status}).`);
        }
      }
      const finalSettings = loadSettings();
      finalSettings.botEnabled = enabling;
      saveSettings(finalSettings);
      log(finalSettings.botEnabled ? 'BOT' : 'SAFE', `Bot master switch set to ${finalSettings.botEnabled ? 'ON' : 'OFF'}.`, { paperTrade: finalSettings.paperTrade });
      return send(res, 200, { ok: true, data: getStatePayload(finalSettings) });
    }

    if (req.method === 'POST' && pathname === '/api/settings') {
      const body = await readBody(req);
      const currentSettings = loadSettings();
      // Validate against current settings, not DEFAULT_SETTINGS.
      // Previous builds validated partial patches alone; a partial save such as {deltaBaseUrl}
      // unintentionally reset numeric controls like maxConcurrentPositions back to defaults.
      const patch = validateSettingsPatch({ ...currentSettings, ...body });
      const settings = { ...currentSettings, ...patch };
      if (!settings.assets.length) settings.assets = DEFAULT_SETTINGS.assets;
      const keys = loadKeys();
      const wantsLiveMode = Object.prototype.hasOwnProperty.call(body, 'paperTrade') && body.paperTrade === false;
      if (wantsLiveMode) {
        const preFailures = liveReadinessFailures({ ...settings, paperTrade: false }, keys, { ignorePaper: true })
          .filter(x => !['Wallet sync not passed', 'Account/positions sync not passed', 'Delta market data not live'].includes(x));
        if (preFailures.length) {
          return sendError(res, 400, `LIVE blocked: ${preFailures.join('; ')}.`);
        }
        await refreshDeltaPublicData(settings, true);
        await syncLiveAccountIfReady(settings, keys, { force: true });
        const syncFailures = liveReadinessFailures({ ...settings, paperTrade: false }, keys, { ignorePaper: true });
        if (syncFailures.length) {
          settings.paperTrade = true;
          settings.botEnabled = false;
          saveSettings(settings);
          return sendError(res, 400, `LIVE blocked: ${syncFailures.join('; ')}. ${state.deltaPositions.message || state.walletLive.message || ''}`.trim());
        }
      }
      // Selecting PAPER should not delete saved API authorization. Keys/test state are reset only when keys are changed, deleted, or test fails.
      saveSettings(settings);
      if (Object.prototype.hasOwnProperty.call(body, 'totalWalletAmount') && settings.paperTrade) {
        const wallet = loadWallet();
        const oldEquity = Number(wallet.equity || 0);
        const newEquity = Number(settings.totalWalletAmount || oldEquity || DEFAULT_WALLET.equity);
        const delta = newEquity - oldEquity;
        wallet.equity = money(newEquity);
        wallet.available = money(Math.max(0, Number(wallet.available || 0) + delta));
        saveWallet(wallet);
      }
      log('CONFIG', 'Strategy/mode settings updated from dashboard.');
      return send(res, 200, { ok: true, data: getStatePayload(settings) });
    }

    if (req.method === 'POST' && pathname === '/api/keys') {
      const body = await readBody(req);
      const current = loadKeys();
      const nextApiKey = typeof body.apiKey === 'string' && body.apiKey.trim() ? body.apiKey.trim() : current.apiKey;
      const nextSecret = typeof body.secret === 'string' && body.secret.trim() ? body.secret.trim() : current.secret;
      const keysChanged = nextApiKey !== current.apiKey || nextSecret !== current.secret;
      const keys = {
        ...current,
        apiKey: nextApiKey,
        secret: nextSecret,
        liveTradingConfirmed: Object.prototype.hasOwnProperty.call(body, 'liveTradingConfirmed') ? Boolean(body.liveTradingConfirmed) : Boolean(current.liveTradingConfirmed)
      };
      if (keysChanged) {
        keys.lastTestAt = null;
        keys.lastTestStatus = 'not_tested';
        keys.lastTestMessage = 'Keys changed. Run Save & Test API again.';
        const settings = loadSettings();
        settings.paperTrade = true;
        settings.botEnabled = false;
        saveSettings(settings);
      }
      if (body.clearKeys) {
        keys.apiKey = '';
        keys.secret = '';
        keys.liveTradingConfirmed = false;
        keys.lastTestAt = null;
        keys.lastTestStatus = 'not_tested';
        keys.lastTestMessage = 'Keys cleared. Enter Delta India API key and secret, then test again.';
        const settings = loadSettings();
        settings.paperTrade = true;
        settings.botEnabled = false;
        saveSettings(settings);
      }
      saveKeys(keys);
      log('CONFIG', 'Delta API key settings updated. Secrets are stored locally in data/apiKeys.json.');
      return send(res, 200, { ok: true, data: getStatePayload() });
    }

    if (req.method === 'POST' && pathname === '/api/auto-setup') {
      const body = await readBody(req);
      const result = await runApiAutoSetup(body);
      return send(res, 200, { ok: true, data: result });
    }

    if (req.method === 'POST' && pathname === '/api/fetch-wallet') {
      const settings = loadSettings();
      const keys = loadKeys();
      try {
        await fetchDeltaWallet(settings, keys);
        await syncLiveAccountIfReady(settings, keys, { force: true });
        return send(res, 200, { ok: true, data: getStatePayload(settings) });
      } catch (error) {
        state.walletLive = {
          lastFetchAt: new Date().toISOString(),
          status: 'FETCH_FAILED',
          message: error.message,
          summary: null,
          raw: null
        };
        log('ERROR', `Delta wallet fetch failed: ${error.message}`);
        return sendError(res, 400, error.message);
      }
    }

    if (req.method === 'POST' && pathname === '/api/test-keys') {
      const settings = loadSettings();
      const keys = loadKeys();
      if (!keys.apiKey || !keys.secret) return sendError(res, 400, 'API key and secret are required.');
      try {
        await testDeltaKeys(settings, keys);
        return send(res, 200, { ok: true, data: getStatePayload() });
      } catch (error) {
        keys.lastTestAt = new Date().toISOString();
        keys.lastTestStatus = 'fail';
        keys.lastTestMessage = error.message;
        keys.liveTradingConfirmed = false;
        saveKeys(keys);
        const safeSettings = loadSettings();
        safeSettings.paperTrade = true;
        safeSettings.botEnabled = false;
        saveSettings(safeSettings);
        log('ERROR', `Delta API key test failed: ${error.message}`);
        return sendError(res, 400, error.message);
      }
    }

    if ((req.method === 'POST' || req.method === 'GET') && pathname === '/api/outbound-ip') {
      try {
        await detectServerOutboundIp();
        return send(res, 200, { ok: true, data: getStatePayload() });
      } catch (error) {
        return sendError(res, 400, error.message || 'Failed to detect server outbound IP');
      }
    }

    if (req.method === 'POST' && pathname === '/api/ip-note') {
      const body = await readBody(req);
      const keys = loadKeys();
      const ip = String(body.ip || body.whitelistedIpNote || '').trim();
      keys.whitelistedIpNote = ip;
      saveKeys(keys);
      log('CONFIG', `Saved Delta whitelist IP note: ${ip || 'blank'}`);
      return send(res, 200, { ok: true, data: getStatePayload() });
    }

    if (req.method === 'POST' && pathname === '/api/tradingview-webhook') {
      const body = await readBody(req);
      const settings = loadSettings();
      const sig = await saveWebhookSignal(body, settings);
      return send(res, 200, { ok: true, data: sig });
    }

    if (req.method === 'POST' && pathname === '/api/close-trade') {
      const body = await readBody(req);
      if (!body.id) return sendError(res, 400, 'Missing trade id');
      const closed = await closeTradeByIdAsync(String(body.id));
      if (!closed) return sendError(res, 404, 'Trade not found');
      return send(res, 200, { ok: true, data: { closed, state: getStatePayload() } });
    }

    if (req.method === 'POST' && pathname === '/api/emergency-stop') {
      const settings = loadSettings();
      settings.botEnabled = false;
      settings.paperTrade = true;
      saveSettings(settings);
      log('SAFE', 'Emergency stop pressed. BOT OFF and PAPER mode enforced. No new live orders allowed.');
      return send(res, 200, { ok: true, data: getStatePayload(settings) });
    }

    if (req.method === 'POST' && pathname === '/api/reset-paper') {
      const settings = loadSettings();
      const wallet = state.walletLive.status === 'LIVE_WALLET' && settings.paperUseDeltaWalletReference !== false
        ? { ...DEFAULT_WALLET, equity: liveWalletNumbers().equity, available: liveWalletNumbers().available, currency: liveWalletNumbers().asset }
        : DEFAULT_WALLET;
      writeJson('paperWallet.json', wallet);
      writeJson('trades.json', { openTrades: [], closedTrades: [] });
      log('SAFE', 'Paper wallet and trades reset.');
      return send(res, 200, { ok: true, data: getStatePayload() });
    }

    return sendError(res, 404, 'API route not found');
  } catch (error) {
    return sendError(res, 500, error.message || 'Server error');
  }
}

function enforcePaperModeOnBoot() {
  const settings = loadSettings();
  let changed = false;
  if (!settings.paperTrade) {
    settings.paperTrade = true;
    changed = true;
    log('SAFE', 'Server boot forced PAPER mode. LIVE must be enabled manually from the dashboard.');
  }
  // Remove old demo defaults from prior builds. Live/paper wallet display should come from Delta sync, not a fake $10,000 wallet.
  if (Number(settings.totalWalletAmount) === 10000) {
    settings.totalWalletAmount = 0;
    changed = true;
  }
  // Default to high-probability + webhook/manual confirmation on first install, but do not overwrite saved UI choices on restart.
  if (typeof settings.requireTradingViewSignalForExecution !== 'boolean') {
    settings.requireTradingViewSignalForExecution = true;
    changed = true;
    log('CONFIG', 'Defaulted TradingView/manual webhook confirmation to enabled.');
  }
  if (typeof settings.highProbabilityMode !== 'boolean') {
    settings.highProbabilityMode = true;
    changed = true;
  }
  if (typeof settings.tradeManagementEnabled !== 'boolean') {
    settings.tradeManagementEnabled = true;
    changed = true;
  }
  if (typeof settings.autoAddOnEnabled !== 'boolean') {
    settings.autoAddOnEnabled = true;
    changed = true;
  }
  if (typeof settings.liveAddOnsEnabled !== 'boolean') {
    settings.liveAddOnsEnabled = false;
    changed = true;
  }
  if (settings.paperLiveCompatibleSizing !== true) {
    settings.paperLiveCompatibleSizing = true;
    changed = true;
  }

  // V28 does not auto-enable the bot on restart. User must start it manually.
  if (settings.botEnabled !== true && settings.botEnabled !== false) {
    settings.botEnabled = false;
    changed = true;
  }
  if (changed) saveSettings(settings);

  try {
    const wallet = loadWallet();
    if (Number(wallet.equity) === 10000 && Number(wallet.available) === 10000) {
      saveWallet({ ...wallet, equity: 0, available: 0, source: 'RESET_OLD_DEMO_DEFAULT' });
      log('SAFE', 'Old $10,000 paper demo wallet reset to $0. Delta wallet sync is now the preferred paper reference.');
    }
  } catch (_) {}

  return settings;
}

function createServer() {
  ensureDir(DATA_DIR);
  const settings = enforcePaperModeOnBoot();
  initializeMarket(settings);
  if (!state.lastRows.length) runScan({ autoExecute: false });
  refreshDeltaPublicData(settings, true).catch(error => log('ERROR', `Initial Delta sync failed: ${error.message}`));

  return http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    if (url.pathname === '/health') return send(res, 200, { ok: true, status: 'healthy', version: 'v59-macd-mtf-ema-full-plan-profit-audited', mode: loadSettings().paperTrade ? 'paper' : 'live' });
    if (url.pathname === '/api/login' && req.method === 'POST') return loginRoute(req, res);
    if (url.pathname === '/api/logout') return logoutRoute(req, res);
    if (!requireDashboardAuth(req, res, url.pathname)) return;
    if (url.pathname.startsWith('/api/')) return apiRoute(req, res, url.pathname);
    return staticFile(req, res, url.pathname);
  });
}

let autoTimer = null;
function startAutoScan() {
  const settings = loadSettings();
  const seconds = Math.max(5, Number(settings.autoScanSeconds || 10));
  autoTimer = setInterval(() => {
    runScanAsync({ autoExecute: true, forceDelta: false }).catch(error => log('ERROR', `Auto scan failed: ${error.message}`));
  }, seconds * 1000);
}

if (require.main === module) {
  const server = createServer();
  server.listen(PORT, () => {
    console.log(`Trading Journal MACD Divergence MTF EMA Bot V59 running at http://localhost:${PORT}`);
    console.log(`Execution venue: Delta Exchange India only`);
    console.log(`Data directory: ${DATA_DIR}`);
  });
  startAutoScan();
  process.on('SIGINT', () => {
    if (autoTimer) clearInterval(autoTimer);
    server.close(() => process.exit(0));
  });
}

module.exports = {
  createServer,
  runScan,
  runScanAsync,
  getStatePayload,
  validateSettingsPatch,
  closeTradeById,
  closeTradeByIdAsync,
  liveReady,
  refreshDeltaPublicData,
  DEFAULT_SETTINGS,
  DEFAULT_WALLET,
  calculateMarginPlan,
  profitTargetSettings,
  plannedExitRMultiple,
  estimatedExitPlanProfit
};
