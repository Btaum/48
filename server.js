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
const USER_AGENT = 'TradingNorth-BOT11-Strategy-Spec-V3/1.0-PAPER-LIVE-DATA';

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
  signalSource: 'bot11_strategy_spec_v3',
  strategyMode: 'BOT11_STRATEGY_SPEC_V3',
  deltaBaseUrl: 'https://api.india.delta.exchange',
  assets: ['BTCUSD','ETHUSD','SOLUSD','XRPUSD','BNBUSD','DOGEUSD','ADAUSD','AVAXUSD','LINKUSD','LTCUSD','BCHUSD','TRXUSD','DOTUSD','MATICUSD','UNIUSD','APTUSD','INJUSD','NEARUSD','FILUSD','ARBUSD'],
  primaryTimeframe: '5m',
  executionTimeframe: '5m',
  macdTrendTimeframe: '1h',
  trendTimeframe: '1h',
  validationTimeframe: '15m',
  emaFastTimeframe: '15m',
  emaSlowTimeframe: '1h',
  higherTimeframes: ['15m', '1h', '1d', '1w'],
  entryEmaFastPeriod: 50, // legacy compatibility only; not used as a fast EMA gate
  entryEmaSlowPeriod: 200, // legacy compatibility only; not used as a fast EMA gate
  trendEmaPeriod: 100,
  dominantEmaPeriod: 200,
  rsiPeriod: 14,
  cciPeriod: 20,
  vwapConfluenceEnabled: false,
  volumeSpikeConfluenceEnabled: false,
  volumeSpikeMultiplier: 1.25,
  minConfluenceScore: 1,
  aPlusConfluenceScore: 3,
  tier3MinConfluenceScore: 3,
  minMomentumConfirmations: 2,
  structureProximityAtr: 1.35,
  emaPeriod: 100,
  mtfEmaPeriod: 100,
  minEmaGapPct: 0.01,
  divergencePivotLeft: 3,
  divergencePivotRight: 3,
  divergenceLookback: 60,
  minDivergenceMacdPct: 0.00001,
  entryModel: 'SMI_KN_PULLBACK_TPSL',
  institutionalEmaEnabled: false,
  institutionalRequireEmaStack: false,
  institutionalRequirePullback: false, // V71: removed as a hard gate; Break/Retest is the structure gate
  institutionalRequirePriceAction: false,
  institutionalRequireHtfMacd: false,
  institutionalEmaFastPeriod: 50, // legacy compatibility only; EMA fast/mid stack removed
  institutionalEmaMidPeriod: 50,
  institutionalEmaSlowPeriod: 200,
  institutionalPullbackLookback: 10,
  institutionalPullbackAtrMult: 0.85,
  institutionalMaxExtensionAtr: 3.0,
  institutionalPatternLookback: 24,
  marketMemoryEnabled: false,
  marketMemoryRequirePullback: false,
  marketMemoryRequireTopMatchOutcome: false,
  marketMemoryScanDepth: 300,
  marketMemoryTopMatches: 5,
  marketMemoryPatternLength: 10,
  marketMemoryFutureLookahead: 8,
  marketMemorySensitivity: 1.5,
  marketMemoryMinSimilarityPct: 72,
  marketMemoryCloudAtrMult: 0.75,
  marketMemoryNearCloudAtrMult: 0.50,
  marketMemoryMaxExtensionAtr: 2.4,
  marketMemoryMinForwardMoveAtr: 0.25,
  srVolumeAlignmentEnabled: false,
  requireClosedDailyContext: false,
  minDailyCandlesForContext: 3,
  requirePreviousDayContext: false,
  requireMtfSupportResistance: false,
  requireVolumeFlowAlignment: false,
  previousDayMidTolerancePct: 0.35,
  srProximityAtrMult: 1.15,
  srBreakoutRetestAtrMult: 0.65,
  volumeFlowLookback: 24,
  volumeFlowMinBiasPct: 5,
  require5mVolumeFlow: false,
  dynamicTpEnabled: true,
  dynamicTpStrongR: 3.5,
  dynamicTpMaxR: 6,
  dynamicTp1ShiftR: 1.5,
  dynamicTp1StrongClosePct: 25,
  trailingStopEmaPeriod: 50,
  trailingStopAtrBuffer: 0.20,
  requireDivergenceForEntry: false,
  zeroLineMode: 'transcript', // V2: MACD zero-line confirmation used
  entrySignalWindowCandles: 3,
  histColorLookback: 8,
  emaSlopeThresholdPct: 0.05,
  atrPeriod: 10,
  atrStopMultiplier: 2,
  supertrendMultiplier: 3,
  kdeThreshold: 55,
  kdeLookback: 200,
  relativeVolumeLookback: 50,
  htfMinimumAligned: 1,
  zoneProximityPct: 0.50,
  riskPercent: 1.0,
  totalWalletAmount: 0,
  maxTradesPerDay: 5,
  maxDailyLossUsd: 10,
  maxConsecutiveLosses: 2,
  paperMinScore: 70,
  preferredScore: 80,
  exceptionalScore: 90,
  adrUsedLimitPct: 80,
  timeFailureCandles: 8,
  pendingExpiryMinutes: 45,
  minSlAtrMult: 0.6,
  minTrendQuality: 30,
  moveSlAfterTp1MinR: 1,
  moveSlAfterTp1MinAge: 30,
  defaultLeverage: 25,
  maxLeverage: 25,
  maxConcurrentPositions: 5,
  maxOneTradePerCorrelationCluster: true,
  maxOnePositionPerAsset: true,
  maxBotAllocationUsd: 500,
  liveWalletAllocationPct: 25,
  liveMaxBotAllocationUsd: 0,
  maxMarginPerCoinUsd: 25,
  majorCoinMaxMarginUsd: 40,
  majorMarginCoins: ['BTCUSD', 'ETHUSD'],
  initialMarginUsd: 10,
  majorInitialMarginUsd: 20,
  maxStopLossUsd: 10,
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
  minRR: 2.0,
  rewardTargetR: 2.5,
  autoSizeToTargetProfit: true,
  minFullTradeProfitUsd: 0.25,
  minTargetProfitUsd: 0.25, // backward compatibility only
  targetFullTradeProfitUsd: 1,
  targetProfitUsd: 1, // backward compatibility only
  blockTinyProfitTrades: true,
  autoUseMaxLeverageForProfitTarget: true,
  highProbabilityMode: true,
  technicalSlEnabled: true,
  slSwingLookback: 24,
  slBufferAtrMult: 0.25,
  maxTechnicalSlAtrMult: 6,
  requireClosedCandle: true,
  requirePullbackForExecution: true,
  pullbackAtrMult: 0.35,
  pullbackMaxAtrMult: 1.20,
  smartEntryEnabled: true,
  smartEntryWaitCandles: 8,
  smartEntryMinGapAtr: 0.12,
  smartEntryMaxGapAtr: 1.20,
  smartEntryUseEma5: true,
  smartEntryUseEma12: true,
  smartEntryUseCandleMidpoint: true,
  smartEntryUseFib382: true,
  smartEntryUseFib50: true,
  allowMarketWhenNoPullback: false,
  tp1ClosePct: 25,
  tp2ClosePct: 25,
  tp3ClosePct: 25,
  runnerClosePct: 25,
  liveOrderSize: 1,
  autoScanSeconds: 10,
  marketDataRefreshSeconds: 15,
  tradingViewWebhookToken: 'change-me',
  requireTradingViewSignalForExecution: false,
  paperLiveCompatibleSizing: true,
  strategyTimeframes: ['5m', '15m', '1h'],
  weeklyMacroBiasEnabled: true,
  weeklyMacroTimeframe: '1w',
  weeklyMacroMinScore: 2,
  weeklyCounterTrendPullbackOnly: true,
  counterTrendRiskMultiplier: 0.5,
  counterTrendQualityDowngrade: true,
  smartRunnerEnabled: true,
  runnerRequireTrendStrength: true,
  runnerTrailAfterTp3: true,
  multiHorizonScanEnabled: true,
  horizonUpgradeEnabled: true,
  horizonUpgradeRequireSameSideSignal: true,
  horizonUpgradeMinR: 1.0,
  scalpToIntradayTargetR: 2.5,
  intradayToSwingTargetR: 3.5,
  paperExecutionMode: 'auto',
  liveDataPaperTradingOnly: true,
  paperUseDeltaWalletReference: true,
  macdConfirmationEnabled: true,
  smiPercentKLength: 10,
  smiPercentDLength: 3,
  smiSignalLength: 10,
  smiSmoothingPeriod: 5,
  smiOverbought: 40,
  smiOversold: -40,
  smiPullbackWindowCandles: 80,
  smiRecoveryLookbackCandles: 8,
  smiAllowRecentRecoveryCross: true,
  requireMacdTranscriptConfirmation: true,
  macdRequireZeroLine: true,
  macdTranscriptLookbackCandles: 8,
  practicalCloudTouchFallback: true,
  practicalCandleColorSoft: true,
  emaCloudFastLength: 50,
  emaCloudSlowLength: 200,
  cloudTouchToleranceAtrMult: 0.60,
  cloudBreakToleranceAtrMult: 0.12,
  requireCloudTouch: true,
  requireSmiCandleColor: false,
  tp2TriggerR: 2.0,
  tp3TriggerR: 3.0,
  emaCloudBullColor: '#dcfce7',
  emaCloudBearColor: '#fee2e2',
  smiVisualColor: '#111827',
  smiSignalColor: '#dc2626',
  knFastEmaLength: 5,
  knSlowEmaLength: 12,
  knAtrPeriod: 14,
  knSlAtrMultiplier: 1.5,
  knSignalLookbackCandles: 8,
  knEntryConfirmLookbackCandles: 5,
  knMaxEntryCandleAtrMult: 2.2,
  knMaxEntryCandlePct: 1.0,
  knMaxRejectionWickBodyMult: 1.2,
  knRequireSmiDirection: true,
  waveTrendChannelLength: 10,
  waveTrendAverageLength: 21,
  waveTrendSignalLength: 4,
  waveTrendReversionThreshold: 100,
  waveTrendSetupWindowCandles: 180,
  waveTrendPracticalRecovery: true,
  breakRetestPivotLookback: 20,
  breakRetestMinBarsAfterBreak: 1,
  breakRetestEntryWindowCandles: 18,
  breakRetestToleranceAtrMult: 1.00,
  breakRetestTolerancePct: 0.45,
  breakRetestLevelSearchCount: 12,
  breakRetestLevelMaxAgeCandles: 360,
  ma1Length: 100,
  ma1Type: 'SMA',
  ma1VisualColor: '#111827',
  trendMaType: 'SMA',
  trendMaToleranceAtrMult: 0.15,
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
  },
  lastBlockLog: {}
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
  trendTimeframe: '1h',
  validationTimeframe: '15m',
    higherTimeframes: ['15m', '1h', '1d', '1w'],
    htfMinimumAligned: 1,
    paperTrade: settings.liveDataPaperTradingOnly === false ? (typeof settings.paperTrade === 'boolean' ? settings.paperTrade : true) : true,
    liveDataPaperTradingOnly: settings.liveDataPaperTradingOnly !== false,
    paperMinScore: Math.min(Math.max(Number(settings.paperMinScore || 70), 70), 95),
    preferredScore: 80,
    exceptionalScore: 90,
    maxOneTradePerCorrelationCluster: settings.maxOneTradePerCorrelationCluster !== false,
    signalSource: 'bot11_strategy_spec_v3',
    strategyMode: 'BOT11_STRATEGY_SPEC_V3',
    emaPeriod,
    mtfEmaPeriod: emaPeriod,
    macdFastLength: 12,
    macdSlowLength: 26,
    macdSignalLength: 9,
    entryEmaFastPeriod: 50,
    entryEmaSlowPeriod: 200,
    trendEmaPeriod: 100,
    dominantEmaPeriod: 200,
    rsiPeriod: Math.min(Math.max(Math.floor(Number(settings.rsiPeriod || 14)), 5), 50),
    cciPeriod: Math.min(Math.max(Math.floor(Number(settings.cciPeriod || 20)), 5), 60),
    vwapConfluenceEnabled: settings.vwapConfluenceEnabled === true,
    volumeSpikeConfluenceEnabled: settings.volumeSpikeConfluenceEnabled === true,
    minConfluenceScore: Math.min(Math.max(Number(settings.minConfluenceScore || 6), 5), 12),
    aPlusConfluenceScore: Math.min(Math.max(Number(settings.aPlusConfluenceScore || 9), 8), 12),
    tier3MinConfluenceScore: Math.min(Math.max(Number(settings.tier3MinConfluenceScore || 9), 8), 12),
    minMomentumConfirmations: Math.min(Math.max(Math.floor(Number(settings.minMomentumConfirmations || 2)), 2), 5),
    minRR: 2.0,
    rewardTargetR: 2.5,
    requireClosedCandle: true,
    requirePullbackForExecution: true,
    smartEntryEnabled: settings.smartEntryEnabled !== false,
    smartEntryWaitCandles: Math.min(Math.max(Math.floor(Number(settings.smartEntryWaitCandles || 8)), 1), 30),
    smartEntryMinGapAtr: Math.min(Math.max(Number(settings.smartEntryMinGapAtr || 0.12), 0.02), 1.5),
    smartEntryMaxGapAtr: Math.min(Math.max(Number(settings.smartEntryMaxGapAtr || 1.20), 0.2), 5),
    smartEntryUseEma5: settings.smartEntryUseEma5 !== false,
    smartEntryUseEma12: settings.smartEntryUseEma12 !== false,
    smartEntryUseCandleMidpoint: settings.smartEntryUseCandleMidpoint !== false,
    smartEntryUseFib382: settings.smartEntryUseFib382 !== false,
    smartEntryUseFib50: settings.smartEntryUseFib50 !== false,
    sarMacdModuleEnabled: false,
    sarMacdAllowLocalEntry: false,
    twoPoleModuleEnabled: false,
    twoPoleAllowLocalEntry: false,
    breakoutModuleEnabled: false,
    breakoutAllowLocalEntry: false,
    vwapModuleEnabled: false,
    vwapAllowLocalEntry: false,
    marketMemoryEnabled: false,
    marketMemoryRequirePullback: false,
    marketMemoryRequireTopMatchOutcome: false,
    marketMemoryScanDepth: Math.min(Math.max(Math.floor(Number(settings.marketMemoryScanDepth || 300)), 120), 900),
    marketMemoryTopMatches: Math.min(Math.max(Math.floor(Number(settings.marketMemoryTopMatches || 5)), 1), 10),
    marketMemoryPatternLength: Math.min(Math.max(Math.floor(Number(settings.marketMemoryPatternLength || 10)), 5), 30),
    marketMemoryFutureLookahead: Math.min(Math.max(Math.floor(Number(settings.marketMemoryFutureLookahead || 8)), 3), 30),
    marketMemorySensitivity: Math.min(Math.max(Number(settings.marketMemorySensitivity || 1.5), 0.3), 5),
    marketMemoryMinSimilarityPct: Math.min(Math.max(Number(settings.marketMemoryMinSimilarityPct || 80), 55), 98),
    marketMemoryCloudAtrMult: Math.min(Math.max(Number(settings.marketMemoryCloudAtrMult || 0.75), 0.2), 3),
    marketMemoryNearCloudAtrMult: Math.min(Math.max(Number(settings.marketMemoryNearCloudAtrMult || 0.25), 0), 2),
    marketMemoryMaxExtensionAtr: Math.min(Math.max(Number(settings.marketMemoryMaxExtensionAtr || 1.6), 0.5), 5),
    marketMemoryMinForwardMoveAtr: Math.min(Math.max(Number(settings.marketMemoryMinForwardMoveAtr || 0.25), 0), 3),
    srVolumeAlignmentEnabled: false,
    requireClosedDailyContext: false,
    minDailyCandlesForContext: Math.min(Math.max(Math.floor(Number(settings.minDailyCandlesForContext || 9)), 2), 60),
    requirePreviousDayContext: false,
    requireMtfSupportResistance: false,
    requireVolumeFlowAlignment: false,
    require5mVolumeFlow: false,
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


function correlationClusterForSymbol(symbol) {
  const s = String(symbol || '').toUpperCase();
  if (['BTCUSD','ETHUSD','BNBUSD','SOLUSD','XRPUSD','ADAUSD','LTCUSD','BCHUSD','DOTUSD','LINKUSD','AVAXUSD','MATICUSD','TRXUSD'].includes(s)) return 'Majors';
  if (['FETUSD','AGIXUSD','OCEANUSD','TAOUSD','WLDUSD','RNDRUSD','NEARUSD','INJUSD'].includes(s)) return 'AI';
  if (['DOGEUSD','SHIBUSD','PEPEUSD','BONKUSD','FLOKIUSD','WIFUSD'].includes(s)) return 'Meme';
  if (['ONDOUSD','LINKUSD','PENDLEUSD','POLYXUSD','MKRUSD'].includes(s)) return 'RWA';
  return 'New Listings';
}

function activeClusterExists(trades, symbol) {
  const cluster = correlationClusterForSymbol(symbol);
  return (trades.openTrades || []).some(t => isActiveTradeStatus(t.status) && correlationClusterForSymbol(t.coin) === cluster);
}

function classifyOpportunityScore(score) {
  const n = Number(score || 0);
  if (n < 70) return 'Ignore';
  if (n < 80) return 'Tradeable';
  if (n < 90) return 'Preferred';
  return 'Exceptional';
}

function riskUsdForScore(score) {
  const n = Number(score || 0);
  if (n >= 90) return 10;
  if (n >= 80) return 7;
  if (n >= 70) return 5;
  return 0;
}

function averageCandleValue(rows, key, len = 20) {
  const vals = (rows || []).slice(-len).map(r => Number(r?.[key] || 0)).filter(Number.isFinite);
  if (!vals.length) return 0;
  return vals.reduce((a,b)=>a+b,0) / vals.length;
}

function bot11RankingBreakdown(symbol, profile, signal, settings = loadSettings()) {
  const rows1h = getCachedCandles(symbol, '1h');
  const rows15 = getCachedCandles(symbol, '15m');
  const rows5 = getCachedCandles(symbol, '5m');
  const p = Number(profile?.price || rows5.at(-1)?.close || 0);
  const cloud1h = emaCloudFromCandles(rows1h.length ? rows1h : rows5, settings);
  const last1h = Math.max(0, (rows1h.length ? rows1h : rows5).length - 1);
  const fast = Number(cloud1h.fast?.[last1h] || 0);
  const slow = Number(cloud1h.slow?.[last1h] || 0);
  const prevFast = Number(cloud1h.fast?.[Math.max(0,last1h-5)] || fast);
  const trendDirOk = signal?.entrySide === 'LONG' ? fast > slow : signal?.entrySide === 'SHORT' ? fast < slow : false;
  const slopeOk = signal?.entrySide === 'LONG' ? fast >= prevFast : signal?.entrySide === 'SHORT' ? fast <= prevFast : false;
  const trendPersistence = trendDirOk ? 10 : 0;
  const trendScore = Math.min(30, (trendDirOk ? 12 : 0) + (slopeOk ? 8 : 0) + trendPersistence);
  const lastVol = Number(rows5.at(-1)?.volume || rows15.at(-1)?.volume || 0);
  const avgVol = averageCandleValue(rows5.length ? rows5 : rows15, 'volume', 20);
  const volumeRatio = avgVol > 0 ? lastVol / avgVol : 1;
  const oiRatio = Number(profile?.openInterestRatio || 1);
  const momentumRising = Boolean(signal?.conditions?.smiRecoveryCross || profile?.hasStrategySignal);
  const momentumScore = Math.min(20, (momentumRising ? 8 : 0) + Math.min(7, Math.max(0, (volumeRatio - 1) * 5)) + Math.min(5, Math.max(0, (oiRatio - 1) * 5)));
  const ticker = state.delta.tickersBySymbol?.[String(symbol).toUpperCase()] || {};
  const bid = Number(ticker.best_bid || ticker.bid || ticker.mark_price || p || 0);
  const ask = Number(ticker.best_ask || ticker.ask || ticker.mark_price || p || 0);
  const spreadPct = bid && ask ? Math.abs(ask - bid) / p : 0.001;
  const volume24h = Number(profile?.volume24h || ticker.volume || ticker.turnover_usd || 0);
  const liquidityScore = Math.max(0, Math.min(15, 15 - (spreadPct * 10000) + Math.min(5, Math.log10(Math.max(1, volume24h)) - 4)));
  const rr = Number(signal?.dynamicTargetR || settings.tp3TriggerR || 3);
  const structureQuality = signal?.conditions?.cloudTouch && signal?.conditions?.cloudNotBroken ? 8 : 0;
  const rewardScore = Math.min(20, (rr >= 3 ? 8 : rr >= 2 ? 5 : 0) + structureQuality + (signal?.invalidationLevel ? 4 : 0));
  const isNewListing = correlationClusterForSymbol(symbol) === 'New Listings';
  const bonusScore = Math.min(20, (isNewListing ? 5 : 0) + (volumeRatio >= 2 ? 7 : volumeRatio >= 1.5 ? 4 : 0) + (oiRatio >= 2 ? 6 : oiRatio >= 1.5 ? 3 : 0) + (trendDirOk && momentumRising ? 2 : 0));
  let penaltyScore = 0;
  if (spreadPct > 0.002) penaltyScore += 10;
  if (volumeRatio < 0.75) penaltyScore += 6;
  if (!signal?.conditions?.smiPullback) penaltyScore += 12;
  if (!signal?.invalidationLevel) penaltyScore += 8;
  const finalScore = Math.max(0, Math.min(100, Math.round(trendScore + momentumScore + liquidityScore + rewardScore + bonusScore - penaltyScore)));
  return { trendScore: Math.round(trendScore), momentumScore: Math.round(momentumScore), liquidityScore: Math.round(liquidityScore), rewardScore: Math.round(rewardScore), bonusScore: Math.round(bonusScore), penaltyScore: Math.round(penaltyScore), finalScore, classification: classifyOpportunityScore(finalScore), volumeRatio: pct(volumeRatio), oiRatio: pct(oiRatio), spreadPct: pct(spreadPct * 100), cluster: correlationClusterForSymbol(symbol) };
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
  const scoreForRisk = Number(rowOrProfile.score || rowOrProfile.kdeScore || rowOrProfile.candidate?.opportunityScore || rowOrProfile.candidate?.score || 0);
  settings = { ...settings, __currentOpportunityScore: scoreForRisk };

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

function calculateRsiSeries(values, length = 14) {
  const nums = values.map(Number).filter(n => Number.isFinite(n) && n > 0);
  if (nums.length < length + 2) return [];
  const gains = [0];
  const losses = [0];
  for (let i = 1; i < nums.length; i += 1) {
    const diff = nums[i] - nums[i - 1];
    gains.push(Math.max(diff, 0));
    losses.push(Math.max(-diff, 0));
  }
  const avgG = rmaSeries(gains, length);
  const avgL = rmaSeries(losses, length);
  return nums.map((_, i) => {
    if (i < length) return null;
    if (!avgL[i]) return 100;
    const rs = avgG[i] / avgL[i];
    return 100 - (100 / (1 + rs));
  });
}

function calculateCciSeries(candles = [], length = 20) {
  const rows = (candles || []).filter(c => c && Number.isFinite(c.high) && Number.isFinite(c.low) && Number.isFinite(c.close));
  const tp = rows.map(c => (Number(c.high) + Number(c.low) + Number(c.close)) / 3);
  const out = [];
  for (let i = 0; i < tp.length; i += 1) {
    if (i < length - 1) { out.push(null); continue; }
    const slice = tp.slice(i - length + 1, i + 1);
    const ma = average(slice);
    const dev = average(slice.map(x => Math.abs(x - ma))) || 0;
    out.push(dev ? (tp[i] - ma) / (0.015 * dev) : 0);
  }
  return out;
}

function cumulativeVwapSeries(candles = [], lookback = 96) {
  const rows = (candles || []).filter(c => c && Number.isFinite(c.high) && Number.isFinite(c.low) && Number.isFinite(c.close));
  const out = [];
  for (let i = 0; i < rows.length; i += 1) {
    const start = Math.max(0, i - Math.max(5, lookback) + 1);
    let pv = 0;
    let vol = 0;
    for (let j = start; j <= i; j += 1) {
      const c = rows[j];
      const v = Math.max(0, Number(c.volume || 0));
      const typical = (Number(c.high) + Number(c.low) + Number(c.close)) / 3;
      // If exchange volume is missing, equal-weight typical price still gives a useful intraday anchor.
      const w = v > 0 ? v : 1;
      pv += typical * w;
      vol += w;
    }
    out.push(vol ? pv / vol : null);
  }
  return out;
}

function volumeSpikeState(candles = [], length = 30, mult = 1.25) {
  const vols = (candles || []).map(c => Number(c.volume || 0)).filter(n => Number.isFinite(n) && n >= 0);
  if (vols.length < Math.max(6, length / 2)) return { ready: false, pass: true, current: 0, average: 0, ratio: 1, reason: 'Volume unavailable or warming up; not blocking.' };
  const current = vols[vols.length - 1] || 0;
  const baseline = average(vols.slice(-Math.max(5, length), -1).filter(n => n > 0)) || 0;
  if (!baseline) return { ready: false, pass: true, current, average: 0, ratio: 1, reason: 'No reliable volume baseline; not blocking.' };
  const ratio = current / baseline;
  return { ready: true, pass: ratio >= mult, current: pct(current), average: pct(baseline), ratio: pct(ratio), reason: `Volume ratio ${pct(ratio)}x vs ${length}-bar average.` };
}

function coinTier(symbol) {
  const s = String(symbol || '').toUpperCase();
  if (['BTCUSD', 'BTCUSDT', 'ETHUSD', 'ETHUSDT', 'SOLUSD', 'SOLUSDT', 'BNBUSD', 'BNBUSDT'].includes(s)) return 1;
  if (['XRPUSD', 'XRPUSDT', 'ADAUSD', 'ADAUSDT', 'AVAXUSD', 'AVAXUSDT', 'INJUSD', 'INJUSDT', 'APTUSD', 'APTUSDT', 'DOGEUSD', 'DOGEUSDT'].includes(s)) return 2;
  return 3;
}

function coinTierLabel(symbol) {
  const t = coinTier(symbol);
  if (t === 1) return 'TIER 1 — MAJOR LIQUID';
  if (t === 2) return 'TIER 2 — LIQUID ALT';
  return 'TIER 3 — ONLY A+ CONFLUENCE';
}

function structureLocationForSide(symbol, direction, candles = [], p = 0, atr = 0, emaMid = null, vwap = null, settings = loadSettings()) {
  const rows = (candles || []).filter(c => c && Number.isFinite(c.high) && Number.isFinite(c.low) && Number.isFinite(c.close));
  const a = Math.max(Number(atr || 0), Number(p || 0) * 0.001, 0.00000001);
  const prox = a * Math.min(Math.max(Number(settings.structureProximityAtr || 1.35), 0.25), 4);
  const recent = rows.slice(-Math.min(Math.max(Number(settings.slSwingLookback || 24), 12), 80));
  if (!recent.length || !p) return { pass: false, source: 'NO_STRUCTURE_DATA', reason: 'Structure warmup' };
  const support = Math.min(...recent.map(c => Number(c.low)).filter(Number.isFinite));
  const resistance = Math.max(...recent.map(c => Number(c.high)).filter(Number.isFinite));
  const prev = rows.length > 1 ? rows[rows.length - 2] : null;
  const last = rows[rows.length - 1];
  const longSweep = direction === 'LONG' && prev && last.low <= support + prox && last.close > support;
  const shortSweep = direction === 'SHORT' && prev && last.high >= resistance - prox && last.close < resistance;
  const nearSupport = direction === 'LONG' && Math.abs(p - support) <= prox * 1.4;
  const nearResistance = direction === 'SHORT' && Math.abs(p - resistance) <= prox * 1.4;
  const nearEma = Number.isFinite(emaMid) && Math.abs(p - emaMid) <= prox * 1.1;
  const nearVwap = Number.isFinite(vwap) && Math.abs(p - vwap) <= prox * 1.1;
  const rangeEdge = direction === 'LONG' ? p <= support + (resistance - support) * 0.32 : p >= resistance - (resistance - support) * 0.32;
  const pass = Boolean(longSweep || shortSweep || nearSupport || nearResistance || nearEma || nearVwap || rangeEdge);
  const parts = [];
  if (longSweep || shortSweep) parts.push('liquidity sweep');
  if (nearSupport) parts.push('support');
  if (nearResistance) parts.push('resistance');
  if (nearEma) parts.push('EMA50 zone');
  if (nearVwap) parts.push('VWAP zone');
  if (rangeEdge) parts.push('range edge');
  return {
    pass,
    source: parts.join(' + ') || 'MIDDLE_OF_RANGE',
    support: roundCoin(symbol, support),
    resistance: roundCoin(symbol, resistance),
    distanceAtr: pct(direction === 'LONG' ? Math.abs(p - support) / a : Math.abs(resistance - p) / a),
    reason: pass ? `Valid location: ${parts.join(', ')}.` : 'Rejected: price is not near support/resistance, range edge, EMA50, VWAP, or sweep zone.'
  };
}

function confluenceForSide(symbol, direction, candles = [], context = {}, settings = loadSettings()) {
  const rows = (candles || []).filter(c => c && Number.isFinite(c.close));
  const closes = rows.map(c => Number(c.close)).filter(n => Number.isFinite(n) && n > 0);
  const p = Number(context.price || closes[closes.length - 1] || 0);
  const atr = Math.max(Number(context.atr || 0), p * 0.001, 0.00000001);
  const emaMid = Number(context.emaMid || latestEma(closes, Number(settings.trendEmaPeriod || 50)) || 0);
  const emaDominant = latestEma(closes, Number(settings.dominantEmaPeriod || 200));
  const vwapSeries = settings.vwapConfluenceEnabled !== false ? cumulativeVwapSeries(rows, Math.min(Math.max(Number(settings.vwapLookback || 96), 20), 300)) : [];
  const vwap = settings.vwapConfluenceEnabled !== false ? lastFinite(vwapSeries) : null;
  const volume = settings.volumeSpikeConfluenceEnabled !== false ? volumeSpikeState(rows, Number(settings.relativeVolumeLookback || 30), Number(settings.volumeSpikeMultiplier || 1.25)) : { pass: true, ratio: 1, reason: 'Volume filter disabled.' };
  const long = direction === 'LONG';
  const ema50Ok = Number.isFinite(emaMid) ? (long ? p >= emaMid : p <= emaMid) : true;
  const ema200Ok = Number.isFinite(emaDominant) ? (long ? p >= emaDominant || emaMid >= emaDominant : p <= emaDominant || emaMid <= emaDominant) : true;
  const vwapOk = Number.isFinite(vwap) ? (long ? p >= vwap || Math.abs(p - vwap) <= atr * 0.35 : p <= vwap || Math.abs(p - vwap) <= atr * 0.35) : true;
  const structure = structureLocationForSide(symbol, direction, rows, p, atr, emaMid, vwap, settings);
  const macd5Ok = Boolean(context.macd5Ok);
  const macdHtfOk = Boolean(context.macd15Ok || context.macd1hOk || context.htfMacd);
  const priceActionOk = Boolean(context.priceActionOk);
  const htfTrendOk = Boolean(context.htfStack || context.longTrend || context.shortTrend);
  let score = 0;
  const details = [];
  function add(name, ok, pts, detail='') { if (ok) score += pts; details.push({ name, pass: Boolean(ok), points: ok ? pts : 0, detail }); }
  add('validLocation', structure.pass, 2, structure.reason);
  add('ema50_200Trend', htfTrendOk && (ema50Ok || ema200Ok), 3, `KN_FAST=${roundCoin(symbol, emaMid)} KN_SLOW=${roundCoin(symbol, emaDominant)}; MTF EMA50 direction=${htfTrendOk}`);
  add('macd5', macd5Ok, 2, '5m MACD 12/26/9 confirms timing');
  add('macdHtfSoft', macdHtfOk || settings.institutionalRequireHtfMacd === false, 1, settings.institutionalRequireHtfMacd === false ? 'Higher-timeframe MACD is advisory, not a blocker.' : '15m/1h MACD confirms.');
  add('candleTrigger', priceActionOk, 2, 'closed-candle rejection / engulfing / continuation trigger');
  if (settings.vwapConfluenceEnabled !== false) add('vwapSoft', vwapOk, 0, `VWAP=${roundCoin(symbol, vwap)}`);
  if (settings.volumeSpikeConfluenceEnabled !== false) add('volumeSoft', volume.pass, 0, volume.reason);
  const confirmations = details.filter(d => d.pass && !['validLocation'].includes(d.name)).length;
  const maxScore = 10;
  return {
    pass: score >= Number(settings.minConfluenceScore || 6) && confirmations >= Number(settings.minMomentumConfirmations || 2) && structure.pass,
    score,
    maxScore,
    confirmations,
    requiredScore: Number(settings.minConfluenceScore || 6),
    requiredConfirmations: Number(settings.minMomentumConfirmations || 2),
    structure,
    indicators: {
      ema50: roundCoin(symbol, emaMid),
      ema200: roundCoin(symbol, emaDominant),
      vwap: Number.isFinite(vwap) ? roundCoin(symbol, vwap) : null,
      volumeRatio: volume.ratio
    },
    details,
    vwapOk,
    volumeOk: volume.pass,
    reason: `Confluence ${score}/${maxScore}, confirmations=${confirmations}; ${structure.reason}`
  };
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


function syntheticChartCandlesFromHistory(symbol, resolution = '5m') {
  const sym = String(symbol || '').toUpperCase();
  const res = normalizeResolution(resolution || '5m');
  let closes = Array.isArray(state.priceHistory[sym]) ? state.priceHistory[sym].map(Number).filter(n => Number.isFinite(n) && n > 0) : [];
  if (closes.length < 80) {
    closes = [];
    for (let i = -260; i <= 0; i += 1) closes.push(simulatedPriceFor(sym, i));
  }
  closes = closes.slice(-240);
  const last = closes[closes.length - 1] || BASE_PRICE[sym] || 10;
  const ohlc = syntheticOhlcFromCloses(closes, last * 0.006);
  const step = resolutionToSeconds(res);
  const end = Math.floor(Date.now() / 1000 / step) * step;
  const start = end - (ohlc.length - 1) * step;
  return ohlc.map((c, i) => ({ ...c, time: start + i * step, volume: 0, resolution: res, synthetic: true }));
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

function macdTranscriptMomentumFromCandles(candles = [], direction = 'LONG', settings = loadSettings()) {
  const rows = (candles || []).filter(c => c && Number.isFinite(c.close));
  const closes = rows.map(c => Number(c.close));
  const macd = calculateMacdRaw(closes, settings);
  const hist = macd.histSeries || [];
  const line = macd.lineSeries || [];
  const sig = macd.signalSeries || [];
  const lastIndex = hist.length - 1;
  const lookback = Math.min(Math.max(Math.floor(Number(settings.macdTranscriptLookbackCandles || settings.histColorLookback || 8)), 2), 40);
  const requireZero = settings.macdRequireZeroLine !== false;
  if (!macd.ready || lastIndex < 2) {
    return { pass: false, ready: false, reason: 'MACD 12/26/9 warming up for transcript momentum confirmation.' };
  }
  let cross = false;
  let crossIndex = null;
  let colorFlip = false;
  let colorFlipIndex = null;
  let weakening = false;
  const scanStart = Math.max(1, lastIndex - lookback + 1);
  for (let i = scanStart; i <= lastIndex; i += 1) {
    const h0 = Number(hist[i - 1]);
    const h1 = Number(hist[i]);
    const l0 = Number(line[i - 1]);
    const s0 = Number(sig[i - 1]);
    const l1 = Number(line[i]);
    const s1 = Number(sig[i]);
    if (![h0, h1, l0, s0, l1, s1].every(Number.isFinite)) continue;
    if (direction === 'LONG') {
      if (h0 < 0 && h1 >= 0) { colorFlip = true; colorFlipIndex = i; }
      if (l0 <= s0 && l1 > s1) { cross = true; crossIndex = i; }
      if (h0 < 0 && h1 > h0) weakening = true; // sellers losing momentum before red -> green
    } else {
      if (h0 > 0 && h1 <= 0) { colorFlip = true; colorFlipIndex = i; }
      if (l0 >= s0 && l1 < s1) { cross = true; crossIndex = i; }
      if (h0 > 0 && h1 < h0) weakening = true; // buyers losing momentum before green -> red
    }
  }
  const nowLine = Number(macd.line);
  const nowSignal = Number(macd.signal);
  const nowHist = Number(macd.hist);
  const zeroOk = !requireZero || (direction === 'LONG' ? nowLine >= 0 : nowLine <= 0);
  const sideOk = direction === 'LONG' ? nowLine > nowSignal && nowHist >= 0 : nowLine < nowSignal && nowHist <= 0;
  const pass = Boolean(cross && colorFlip && weakening && sideOk && zeroOk);
  return {
    pass,
    ready: true,
    cross,
    crossIndex,
    colorFlip,
    colorFlipIndex,
    weakening,
    zeroOk,
    sideOk,
    line: pct(nowLine),
    signal: pct(nowSignal),
    histogram: pct(nowHist),
    reason: pass
      ? `${direction} MACD transcript momentum PASS: histogram color flip + momentum weakening + MACD/signal cross + ${requireZero ? 'zero-line confirmation' : 'zero-line advisory'}.`
      : `WAIT ${direction} MACD: weakening=${weakening} colorFlip=${colorFlip} cross=${cross} sideOk=${sideOk} zeroOk=${zeroOk}; line=${pct(nowLine)} signal=${pct(nowSignal)} hist=${pct(nowHist)}.`
  };
}


function recentKnDirection(rows = [], direction = 'LONG', settings = loadSettings()) {
  const kn = knSmartFromCandles(rows, settings);
  const lastIndex = rows.length - 1;
  const lookback = Math.min(Math.max(Math.floor(Number(settings.knSignalLookbackCandles || 8)), 1), 60);
  const signals = direction === 'LONG' ? kn.buySignals : kn.sellSignals;
  let signalIndex = null;
  for (let i = Math.max(1, lastIndex - lookback + 1); i <= lastIndex; i += 1) {
    if (signals[i]) signalIndex = i;
  }
  const fast = Number(kn.fast[lastIndex]);
  const slow = Number(kn.slow[lastIndex]);
  const trendOk = direction === 'LONG' ? fast > slow : fast < slow;
  return {
    pass: Boolean(signalIndex !== null || trendOk),
    freshSignal: signalIndex !== null,
    trendOk,
    signalIndex,
    fast,
    slow,
    reason: `${direction} KN weekly ${signalIndex !== null ? 'fresh signal' : trendOk ? 'EMA bias' : 'not aligned'}; EMA${kn.fastLen}/${kn.slowLen} fast=${pct(fast)} slow=${pct(slow)}.`
  };
}

function assessWeeklyMacroBias(symbol, settings = loadSettings()) {
  const tf = normalizeResolution(settings.weeklyMacroTimeframe || '1w');
  const rows = weeklyCandlesForSymbol(symbol, settings).filter(c => c && Number.isFinite(c.open) && Number.isFinite(c.high) && Number.isFinite(c.low) && Number.isFinite(c.close));
  const minBars = Math.max(40, Number(settings.macdSlowLength || 26) + Number(settings.macdSignalLength || 9) + 5, Number(settings.smiPercentKLength || 10) + Number(settings.smiSignalLength || 10) + 10);
  if (settings.weeklyMacroBiasEnabled === false) return { enabled: false, ready: true, timeframe: tf, bias: 'DISABLED', direction: '', strength: 0, reason: 'Weekly macro bias disabled.' };
  if (!rows.length || rows.length < minBars) return { enabled: true, ready: false, timeframe: tf, bias: 'WARMUP', direction: '', strength: 0, reason: `Need ${minBars} closed ${tf} candles for weekly macro bias.` };
  const smi = smiFromCandles(rows, settings);
  const cloud = emaCloudFromCandles(rows, settings);
  const lastIndex = rows.length - 1;
  const macdLong = macdTranscriptMomentumFromCandles(rows, 'LONG', settings);
  const macdShort = macdTranscriptMomentumFromCandles(rows, 'SHORT', settings);
  const smiLong = recentSmiDirection(symbol, rows, 'LONG', smi, settings);
  const smiShort = recentSmiDirection(symbol, rows, 'SHORT', smi, settings);
  const knLong = recentKnDirection(rows, 'LONG', settings);
  const knShort = recentKnDirection(rows, 'SHORT', settings);
  const price = Number(rows[lastIndex]?.close || 0);
  const cloudLong = Number(cloud.fast[lastIndex]) > Number(cloud.slow[lastIndex]) && price >= Number(cloud.upper[lastIndex]);
  const cloudShort = Number(cloud.fast[lastIndex]) < Number(cloud.slow[lastIndex]) && price <= Number(cloud.lower[lastIndex]);
  const bullScore = [macdLong.pass, smiLong.pass, knLong.pass, cloudLong].filter(Boolean).length;
  const bearScore = [macdShort.pass, smiShort.pass, knShort.pass, cloudShort].filter(Boolean).length;
  const minScore = Math.min(Math.max(Number(settings.weeklyMacroMinScore || 2), 1), 4);
  let bias = 'NEUTRAL';
  let direction = '';
  if (bullScore >= minScore && bullScore > bearScore) { direction = 'LONG'; bias = bullScore >= 3 ? 'STRONG_BULL' : 'BULL'; }
  if (bearScore >= minScore && bearScore > bullScore) { direction = 'SHORT'; bias = bearScore >= 3 ? 'STRONG_BEAR' : 'BEAR'; }
  return {
    enabled: true,
    ready: true,
    timeframe: tf,
    bias,
    direction,
    strength: direction === 'LONG' ? bullScore : direction === 'SHORT' ? bearScore : 0,
    bullScore,
    bearScore,
    macdLong,
    macdShort,
    smiLong,
    smiShort,
    knLong,
    knShort,
    cloudLong,
    cloudShort,
    reason: `Weekly ${tf} bias=${bias}; bullScore=${bullScore}/4 bearScore=${bearScore}/4. MACD uses corrected histogram logic: red weakening → green expanding = bullish; green weakening → red expanding = bearish. SMI uses default values/cross zones, not custom colors. KN uses EMA5/12 visual signal.`
  };
}

function weeklyPolicyForDirection(weekly, direction, signal = null, settings = loadSettings()) {
  if (!weekly || weekly.enabled === false || !weekly.ready || !weekly.direction || direction !== 'LONG' && direction !== 'SHORT') {
    return { pass: true, mode: 'NO_WEEKLY_BLOCK', riskMultiplier: 1, reason: weekly?.reason || 'Weekly bias unavailable/advisory.' };
  }
  const sameSide = weekly.direction === direction;
  if (sameSide) return { pass: true, mode: 'TREND_TRADE', riskMultiplier: 1, reason: `${direction} aligned with ${weekly.bias}.` };
  const pullbackOk = Boolean(signal?.conditions?.smiPullback && signal?.conditions?.cloudTouch && signal?.conditions?.smiRecoveryCross && signal?.conditions?.entryCandle);
  const pass = settings.weeklyCounterTrendPullbackOnly === false || pullbackOk;
  return {
    pass,
    mode: 'COUNTER_TREND_PULLBACK',
    riskMultiplier: Math.min(Math.max(Number(settings.counterTrendRiskMultiplier || 0.5), 0.1), 1),
    reason: pass
      ? `${direction} is counter to ${weekly.bias}; allowed only because SMI/KN pullback entry is valid. Use reduced risk.`
      : `${direction} blocked: weekly bias is ${weekly.bias}; counter-trend trades require a confirmed SMI/KN pullback.`
  };
}

function tradeTrendStillStrong(trade, row, settings = loadSettings()) {
  if (!trade || !row || row.dec !== trade.side) return false;
  const sig = row.macdDivergenceSignal || {};
  const cond = sig.conditions || {};
  const sameSideSignal = Boolean(row.pass && sig.pass && sig.entrySide === trade.side);
  const macdOk = Boolean(cond.macdTranscript || cond.macdColorFlip || cond.macdSignalCross);
  const smiOk = Boolean(cond.smiDirection || cond.smiRecoveryCross);
  const cloudOk = trade.side === 'LONG' ? Boolean(cond.longTrend || cond.trendCloud) : Boolean(cond.shortTrend || cond.trendCloud);
  if (settings.runnerRequireTrendStrength === false) return sameSideSignal;
  return Boolean(sameSideSignal && macdOk && smiOk && cloudOk);
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


function lastFinite(series = []) {
  for (let i = series.length - 1; i >= 0; i -= 1) {
    const n = Number(series[i]);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function candleBody(c) { return Math.abs(Number(c?.close || 0) - Number(c?.open || 0)); }
function candleRange(c) { return Math.max(0.00000001, Number(c?.high || 0) - Number(c?.low || 0)); }
function candleUpperWick(c) { return Number(c?.high || 0) - Math.max(Number(c?.open || 0), Number(c?.close || 0)); }
function candleLowerWick(c) { return Math.min(Number(c?.open || 0), Number(c?.close || 0)) - Number(c?.low || 0); }
function candleBullish(c) { return Number(c?.close || 0) > Number(c?.open || 0); }
function candleBearish(c) { return Number(c?.close || 0) < Number(c?.open || 0); }

function priceActionConfirmation(candles = [], direction = 'LONG', atr = 0, lookback = 24) {
  const list = (candles || []).filter(c => c && Number.isFinite(c.open) && Number.isFinite(c.high) && Number.isFinite(c.low) && Number.isFinite(c.close));
  if (list.length < 4) return { pass: false, pattern: 'WARMUP', patternLow: null, patternHigh: null, reason: 'Need more candles for price-action trigger' };
  const cur = list[list.length - 1];
  const prev = list[list.length - 2];
  const a = Math.max(Number(atr || 0), Number(cur.close || 0) * 0.001);
  const b = Math.max(candleBody(cur), a * 0.03);
  const r = candleRange(cur);
  const upper = candleUpperWick(cur);
  const lower = candleLowerWick(cur);
  const bullishEngulfing = candleBearish(prev) && candleBullish(cur) && cur.close > prev.open && cur.open <= prev.close;
  const bearishEngulfing = candleBullish(prev) && candleBearish(cur) && cur.close < prev.open && cur.open >= prev.close;
  const bullishPin = candleBullish(cur) && lower >= b * 1.8 && upper <= r * 0.35 && cur.close >= cur.low + r * 0.60;
  const bearishPin = candleBearish(cur) && upper >= b * 1.8 && lower <= r * 0.35 && cur.close <= cur.low + r * 0.40;
  const recent = list.slice(-Math.min(Math.max(Math.floor(lookback || 24), 8), 60));
  const lows = recent.map((c, idx) => ({ idx, low: Number(c.low), high: Number(c.high) })).filter(x => Number.isFinite(x.low));
  const highs = recent.map((c, idx) => ({ idx, high: Number(c.high), low: Number(c.low) })).filter(x => Number.isFinite(x.high));
  const lowSorted = lows.slice().sort((x, y) => x.low - y.low);
  const highSorted = highs.slice().sort((x, y) => y.high - x.high);
  let doubleBottom = false;
  let doubleTop = false;
  if (lowSorted.length >= 2) {
    const first = lowSorted[0];
    const second = lowSorted.find(x => Math.abs(x.idx - first.idx) >= 3 && Math.abs(x.low - first.low) <= a * 0.45);
    if (second) {
      const neckline = Math.max(first.high, second.high);
      doubleBottom = cur.close > neckline || (candleBullish(cur) && cur.close > prev.high);
    }
  }
  if (highSorted.length >= 2) {
    const first = highSorted[0];
    const second = highSorted.find(x => Math.abs(x.idx - first.idx) >= 3 && Math.abs(x.high - first.high) <= a * 0.45);
    if (second) {
      const neckline = Math.min(first.low, second.low);
      doubleTop = cur.close < neckline || (candleBearish(cur) && cur.close < prev.low);
    }
  }
  if (direction === 'LONG') {
    const pattern = bullishEngulfing ? 'BULLISH_ENGULFING' : bullishPin ? 'BULLISH_PIN_BAR' : doubleBottom ? 'DOUBLE_BOTTOM_RECLAIM' : '';
    return { pass: Boolean(pattern), pattern: pattern || 'NO_BULLISH_TRIGGER', patternLow: Math.min(cur.low, prev.low), patternHigh: Math.max(cur.high, prev.high), reason: pattern || 'Need bullish engulfing, pin bar, or double-bottom reclaim near EMA50' };
  }
  const pattern = bearishEngulfing ? 'BEARISH_ENGULFING' : bearishPin ? 'BEARISH_PIN_BAR' : doubleTop ? 'DOUBLE_TOP_REJECTION' : '';
  return { pass: Boolean(pattern), pattern: pattern || 'NO_BEARISH_TRIGGER', patternLow: Math.min(cur.low, prev.low), patternHigh: Math.max(cur.high, prev.high), reason: pattern || 'Need bearish engulfing, pin bar, or double-top rejection near EMA50' };
}


function clamp01(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

function safeZ(value, scale) {
  const v = Number(value || 0);
  const s = Math.max(Math.abs(Number(scale || 0)), 0.00000001);
  return v / s;
}

function marketMemoryFeatureVector(candles, index, helpers = {}) {
  const rows = candles || [];
  const c = rows[index];
  if (!c) return null;
  const close = Number(c.close || 0);
  const open = Number(c.open || close || 0);
  if (!close || !open) return null;
  const prev1 = rows[index - 1];
  const prev3 = rows[index - 3];
  const prev6 = rows[index - 6];
  const atr = Math.max(Number(helpers.atrSeries?.[index] || 0), close * 0.001, 0.00000001);
  const rsi = Number(helpers.rsiSeries?.[index]);
  const range = candleRange(c);
  const vol = Number(c.volume || 0);
  const avgVol = average(rows.slice(Math.max(0, index - 30), index).map(x => Number(x.volume || 0)).filter(x => x > 0)) || vol || 1;
  const ema = Number(helpers.emaSeries?.[index] || close);
  return [
    safeZ(prev1 ? close - Number(prev1.close || close) : 0, atr),
    safeZ(prev3 ? close - Number(prev3.close || close) : 0, atr * 2.2),
    safeZ(prev6 ? close - Number(prev6.close || close) : 0, atr * 3.5),
    Number.isFinite(rsi) ? (rsi - 50) / 50 : 0,
    safeZ(close - ema, atr * 2.0),
    safeZ(candleBody(c), atr * 1.5),
    safeZ(candleUpperWick(c) - candleLowerWick(c), Math.max(range, atr)),
    Math.log(Math.max(0.05, (vol || avgVol) / Math.max(avgVol, 0.00000001)))
  ];
}

function vectorDistance(a = [], b = []) {
  const len = Math.min(a.length, b.length);
  if (!len) return 999;
  let sum = 0;
  for (let i = 0; i < len; i += 1) {
    const d = Number(a[i] || 0) - Number(b[i] || 0);
    sum += d * d;
  }
  return Math.sqrt(sum / len);
}

function buildMarketMemoryHelpers(candles, settings = loadSettings()) {
  const rows = (candles || []).filter(c => c && Number.isFinite(c.open) && Number.isFinite(c.high) && Number.isFinite(c.low) && Number.isFinite(c.close));
  const closes = rows.map(c => Number(c.close));
  const emaLen = Math.min(Math.max(Math.floor(Number(settings.institutionalEmaMidPeriod || 50)), 20), 100);
  const ema = emaSeries(closes, emaLen);
  const rsi = calculateRsiSeries(closes, Number(settings.rsiPeriod || 14));
  const atr = [];
  const tr = rows.map((c, i) => {
    const prevClose = i > 0 ? Number(rows[i - 1].close) : Number(c.close);
    return Math.max(Number(c.high) - Number(c.low), Math.abs(Number(c.high) - prevClose), Math.abs(Number(c.low) - prevClose));
  });
  const atrLen = Math.min(Math.max(Math.floor(Number(settings.atrPeriod || 14)), 5), 50);
  const atrRma = rmaSeries(tr, atrLen);
  for (let i = 0; i < rows.length; i += 1) atr.push(Math.max(Number(atrRma[i] || 0), Number(rows[i].close || 0) * 0.001));
  return { rows, closes, emaSeries: ema, rsiSeries: rsi, atrSeries: atr };
}

function supportResistanceFromCandles(symbol, candles = [], price = 0, atr = 0, settings = loadSettings(), label = 'SR') {
  const rows = (candles || []).filter(c => c && Number.isFinite(c.high) && Number.isFinite(c.low) && Number.isFinite(c.close));
  const p = Number(price || rows.at(-1)?.close || 0);
  const a = Math.max(Number(atr || atrFromCandles(rows, Number(settings.atrPeriod || 14)) || 0), p * 0.001, 0.00000001);
  const lookback = label === '1D' ? Math.min(rows.length, 30) : label === '1H' ? Math.min(rows.length, 72) : Math.min(rows.length, 96);
  const prior = rows.slice(Math.max(0, rows.length - lookback - 1), Math.max(0, rows.length - 1));
  if (!p || prior.length < Math.min(8, Math.max(1, lookback))) return { ready: false, label, support: null, resistance: null, mid: null, passLong: false, passShort: false, reason: `${label} S/R warmup; blocking V70 context until enough closed ${label} candles exist.` };
  const support = Math.min(...prior.map(c => Number(c.low)).filter(Number.isFinite));
  const resistance = Math.max(...prior.map(c => Number(c.high)).filter(Number.isFinite));
  const mid = (support + resistance) / 2;
  const zone = a * Math.min(Math.max(Number(settings.srProximityAtrMult || 1.15), 0.25), 5);
  const retestZone = a * Math.min(Math.max(Number(settings.srBreakoutRetestAtrMult || 0.65), 0.10), 3);
  const last = rows.at(-1);
  const prev = rows.at(-2) || last;
  const nearSupport = Math.abs(p - support) <= zone;
  const nearResistance = Math.abs(p - resistance) <= zone;
  const reclaimSupport = last && Number(last.low) <= support + zone && Number(last.close) > support;
  const rejectResistance = last && Number(last.high) >= resistance - zone && Number(last.close) < resistance;
  const breakoutRetestLong = prev && last && Number(prev.close) > resistance && Number(last.low) <= resistance + retestZone && Number(last.close) >= resistance;
  const breakdownRetestShort = prev && last && Number(prev.close) < support && Number(last.high) >= support - retestZone && Number(last.close) <= support;
  const upperHalf = p >= mid;
  const lowerHalf = p <= mid;
  const passLong = Boolean(nearSupport || reclaimSupport || breakoutRetestLong || (upperHalf && !nearResistance));
  const passShort = Boolean(nearResistance || rejectResistance || breakdownRetestShort || (lowerHalf && !nearSupport));
  return {
    ready: true,
    label,
    support: roundCoin(symbol, support),
    resistance: roundCoin(symbol, resistance),
    mid: roundCoin(symbol, mid),
    zone: roundCoin(symbol, zone),
    nearSupport,
    nearResistance,
    reclaimSupport: Boolean(reclaimSupport),
    rejectResistance: Boolean(rejectResistance),
    breakoutRetestLong: Boolean(breakoutRetestLong),
    breakdownRetestShort: Boolean(breakdownRetestShort),
    passLong,
    passShort,
    reason: `${label} S/R support=${roundCoin(symbol, support)} resistance=${roundCoin(symbol, resistance)} mid=${roundCoin(symbol, mid)}; long=${passLong} short=${passShort}; nearSupport=${nearSupport} nearResistance=${nearResistance}`
  };
}

function previousDayContext(symbol, candles1d = [], price = 0, settings = loadSettings()) {
  const rows = (candles1d || []).filter(c => c && Number.isFinite(c.open) && Number.isFinite(c.high) && Number.isFinite(c.low) && Number.isFinite(c.close));
  const p = Number(price || rows.at(-1)?.close || 0);
  const prev = rows.length >= 2 ? rows[rows.length - 2] : rows[0];
  if (!prev || !p) return { ready: false, passLong: false, passShort: false, reason: 'Previous-day candle warmup; blocking V70 context until previous daily candle exists.' };
  const open = Number(prev.open), high = Number(prev.high), low = Number(prev.low), close = Number(prev.close);
  const range = Math.max(high - low, p * 0.001, 0.00000001);
  const mid = (high + low) / 2;
  const bodyMid = (open + close) / 2;
  const tolerance = p * Math.min(Math.max(Number(settings.previousDayMidTolerancePct || 0.35), 0), 3) / 100;
  const bullDay = close > open;
  const bearDay = close < open;
  const aboveMid = p >= mid - tolerance;
  const belowMid = p <= mid + tolerance;
  const nearPrevLow = Math.abs(p - low) <= range * 0.16;
  const nearPrevHigh = Math.abs(p - high) <= range * 0.16;
  const brokePrevHigh = p > high;
  const brokePrevLow = p < low;
  const passLong = Boolean((aboveMid && !bearDay) || brokePrevHigh || nearPrevLow || p >= bodyMid);
  const passShort = Boolean((belowMid && !bullDay) || brokePrevLow || nearPrevHigh || p <= bodyMid);
  return {
    ready: true,
    open: roundCoin(symbol, open),
    high: roundCoin(symbol, high),
    low: roundCoin(symbol, low),
    close: roundCoin(symbol, close),
    mid: roundCoin(symbol, mid),
    bodyMid: roundCoin(symbol, bodyMid),
    bias: bullDay ? 'BULLISH_PREV_DAY' : bearDay ? 'BEARISH_PREV_DAY' : 'NEUTRAL_PREV_DAY',
    passLong,
    passShort,
    reason: `PrevDay ${bullDay ? 'bull' : bearDay ? 'bear' : 'neutral'} O=${roundCoin(symbol, open)} H=${roundCoin(symbol, high)} L=${roundCoin(symbol, low)} C=${roundCoin(symbol, close)} mid=${roundCoin(symbol, mid)}; price=${roundCoin(symbol, p)}; long=${passLong} short=${passShort}`
  };
}

function directionalVolumeFlow(candles = [], direction = 'LONG', settings = loadSettings(), label = '5M') {
  const rows = (candles || []).filter(c => c && Number.isFinite(c.open) && Number.isFinite(c.close));
  const lookback = Math.min(Math.max(Math.floor(Number(settings.volumeFlowLookback || 24)), 8), 96);
  const slice = rows.slice(-lookback);
  if (slice.length < Math.min(8, lookback)) return { ready: false, pass: false, bias: 'UNKNOWN', biasPct: 0, reason: `${label} volume flow warmup; blocking V70 volume context.` };
  let bullVol = 0, bearVol = 0, neutralVol = 0;
  for (const c of slice) {
    const vol = Math.max(0, Number(c.volume || 0));
    const weight = vol > 0 ? vol : Math.abs(Number(c.close) - Number(c.open));
    if (Number(c.close) > Number(c.open)) bullVol += weight;
    else if (Number(c.close) < Number(c.open)) bearVol += weight;
    else neutralVol += weight;
  }
  const total = bullVol + bearVol + neutralVol;
  if (!total) return { ready: false, pass: false, bias: 'UNKNOWN', biasPct: 0, reason: `${label} volume unavailable; blocking V70 volume context.` };
  const biasPct = ((bullVol - bearVol) / total) * 100;
  const minBias = Math.min(Math.max(Number(settings.volumeFlowMinBiasPct || 8), 0), 60);
  const passLong = biasPct >= -minBias;
  const passShort = biasPct <= minBias;
  const pass = direction === 'LONG' ? passLong : passShort;
  return {
    ready: true,
    pass,
    passLong,
    passShort,
    bias: biasPct > minBias ? 'BULL_VOLUME' : biasPct < -minBias ? 'BEAR_VOLUME' : 'BALANCED_VOLUME',
    biasPct: pct(biasPct),
    bullVol: pct(bullVol),
    bearVol: pct(bearVol),
    reason: `${label} volume flow ${pct(biasPct)}% (${direction} pass=${pass}); bullVol=${pct(bullVol)} bearVol=${pct(bearVol)}`
  };
}

function buildMtfSrVolumeContext(symbol, direction, execCandles = [], settings = loadSettings()) {
  const rows5 = (execCandles || []).filter(c => c && Number.isFinite(c.close));
  const p = Number(rows5.at(-1)?.close || state.market?.[symbol]?.price || 0);
  const a = Math.max(atrFromCandles(rows5, Number(settings.atrPeriod || 14)), p * 0.001, 0.00000001);
  const candles15 = getCachedCandles(symbol, '15m');
  const candles1h = getCachedCandles(symbol, '1h');
  const candles1d = getCachedCandles(symbol, '1d');
  // V72 rule: 5m, 15m and 1h can each become execution triggers when their own setup is complete.
  // Do not fall back to 5m candles for 15m/1h/1d S/R because that hides missing context.
  const sr15 = supportResistanceFromCandles(symbol, candles15, p, a, settings, '15M');
  const sr1h = supportResistanceFromCandles(symbol, candles1h, p, a, settings, '1H');
  const sr1d = supportResistanceFromCandles(symbol, candles1d, p, a, settings, '1D');
  const prevDay = previousDayContext(symbol, candles1d, p, settings);
  const vol5 = directionalVolumeFlow(rows5, direction, settings, '5M');
  const vol15 = directionalVolumeFlow(candles15, direction, settings, '15M');
  const vol1h = directionalVolumeFlow(candles1h, direction, settings, '1H');
  const long = direction === 'LONG';
  const srContexts = [sr15, sr1h, sr1d];
  const srReadyCount = srContexts.filter(x => x.ready).length;
  const srVotes = srContexts.filter(x => x.ready).map(x => long ? x.passLong : x.passShort);
  const srVotePassCount = srVotes.filter(Boolean).length;
  // Require valid 15m + 1h + 1D context, but only 2/3 S/R directional votes.
  const srPass = srReadyCount >= 3 && srVotePassCount >= 2;
  const prevPass = prevDay.ready && (long ? prevDay.passLong : prevDay.passShort);
  // Volume must agree on 5m execution flow plus either 15m or 1h context.
  const vol5Pass = vol5.ready && vol5.pass;
  const vol15Pass = vol15.ready && vol15.pass;
  const vol1hPass = vol1h.ready && vol1h.pass;
  const volVotes = [vol5, vol15, vol1h].filter(x => x.ready).map(x => x.pass);
  const volPass = Boolean(vol5Pass && (vol15Pass || vol1hPass));
  const pass = Boolean(
    (settings.requirePreviousDayContext === false || prevPass) &&
    (settings.requireMtfSupportResistance === false || srPass) &&
    (settings.requireVolumeFlowAlignment === false || volPass)
  );
  return {
    enabled: settings.srVolumeAlignmentEnabled !== false,
    ready: true,
    pass,
    direction,
    previousDay: prevDay,
    sr15,
    sr1h,
    sr1d,
    volume5m: vol5,
    volume15m: vol15,
    volume1h: vol1h,
    srPass,
    srReadyCount,
    srVotePassCount,
    previousDayPass: Boolean(prevPass),
    volumePass: Boolean(volPass),
    volume5mPass: Boolean(vol5Pass),
    volume15mPass: Boolean(vol15Pass),
    volume1hPass: Boolean(vol1hPass),
    reason: `MTF_SR_VOLUME ${direction}: prevDay=${prevPass}; S/R votes=${srVotePassCount}/${srReadyCount}; volume rule=5M ${vol5Pass} + (15M ${vol15Pass} OR 1H ${vol1hPass}); ${prevDay.reason}; ${sr15.reason}; ${sr1h.reason}; ${sr1d.reason}; ${vol5.reason}; ${vol15.reason}; ${vol1h.reason}`
  };
}

function calculateMarketMemoryAverage(symbol, candles = [], settings = loadSettings()) {
  if (settings.marketMemoryEnabled === false) {
    return { enabled: false, ready: true, pass: true, long: { pass: true }, short: { pass: true }, reason: 'Market Memory disabled' };
  }
  const helpers = buildMarketMemoryHelpers(candles, settings);
  const rows = helpers.rows;
  const n = rows.length;
  const patternLength = Math.min(Math.max(Math.floor(Number(settings.marketMemoryPatternLength || 10)), 5), 30);
  const lookahead = Math.min(Math.max(Math.floor(Number(settings.marketMemoryFutureLookahead || 8)), 3), 30);
  const topN = Math.min(Math.max(Math.floor(Number(settings.marketMemoryTopMatches || 5)), 1), 10);
  const scanDepth = Math.min(Math.max(Math.floor(Number(settings.marketMemoryScanDepth || 300)), 120), Math.max(120, n));
  const minSimilarity = Math.min(Math.max(Number(settings.marketMemoryMinSimilarityPct || 80), 55), 98);
  const sensitivity = Math.min(Math.max(Number(settings.marketMemorySensitivity || 1.5), 0.3), 5);
  const cloudAtrMult = Math.min(Math.max(Number(settings.marketMemoryCloudAtrMult || 0.75), 0.2), 3);
  const nearCloudAtrMult = Math.min(Math.max(Number(settings.marketMemoryNearCloudAtrMult || 0.25), 0), 2);
  const maxExtensionAtr = Math.min(Math.max(Number(settings.marketMemoryMaxExtensionAtr || 1.6), 0.5), 5);
  const minForwardMoveAtr = Math.min(Math.max(Number(settings.marketMemoryMinForwardMoveAtr || 0.25), 0), 3);
  const minBars = patternLength + lookahead + 80;
  if (n < minBars) {
    return { enabled: true, ready: false, pass: false, long: { pass: false }, short: { pass: false }, reason: `Need ${minBars} closed 5m candles for Market Memory warmup` };
  }
  const i = n - 1;
  const price = Number(rows[i].close || 0);
  const atr = Math.max(Number(helpers.atrSeries[i] || 0), price * 0.001, 0.00000001);
  const memoryLine = Number(helpers.emaSeries[i] || price);
  const cloudHalf = atr * cloudAtrMult;
  const cloudLow = memoryLine - cloudHalf;
  const cloudHigh = memoryLine + cloudHalf;
  const currentVectors = [];
  for (let k = i - patternLength + 1; k <= i; k += 1) {
    const v = marketMemoryFeatureVector(rows, k, helpers);
    if (!v) return { enabled: true, ready: false, pass: false, long: { pass: false }, short: { pass: false }, reason: 'Market Memory feature warmup' };
    currentVectors.push(v);
  }
  const start = Math.max(patternLength + 6, i - lookahead - scanDepth);
  const end = i - lookahead - 1;
  const matches = [];
  for (let j = start; j <= end; j += 1) {
    const histVectors = [];
    let ok = true;
    for (let k = j - patternLength + 1; k <= j; k += 1) {
      const v = marketMemoryFeatureVector(rows, k, helpers);
      if (!v) { ok = false; break; }
      histVectors.push(v);
    }
    if (!ok) continue;
    let dist = 0;
    for (let k = 0; k < patternLength; k += 1) dist += vectorDistance(currentVectors[k], histVectors[k]);
    dist /= patternLength;
    const similarity = Math.max(0, Math.min(100, 100 * Math.exp(-sensitivity * dist / 2.4)));
    const futureIndex = Math.min(rows.length - 1, j + lookahead);
    const closeJ = Number(rows[j].close || 0);
    const futureClose = Number(rows[futureIndex].close || closeJ);
    const atrJ = Math.max(Number(helpers.atrSeries[j] || 0), closeJ * 0.001, 0.00000001);
    const forwardMove = futureClose - closeJ;
    const forwardAtr = forwardMove / atrJ;
    const lineJ = Number(helpers.emaSeries[j] || closeJ);
    const cloudJ = atrJ * cloudAtrMult;
    const histSlice = rows.slice(Math.max(0, j - patternLength + 1), j + 1);
    const touchedLongCloud = histSlice.some(c => Number(c.low) <= lineJ + cloudJ && Number(c.close) >= lineJ - cloudJ);
    const touchedShortCloud = histSlice.some(c => Number(c.high) >= lineJ - cloudJ && Number(c.close) <= lineJ + cloudJ);
    const type = forwardAtr >= minForwardMoveAtr && closeJ >= lineJ - cloudJ && touchedLongCloud
      ? 'BULLISH_PULLBACK_CONTINUED'
      : forwardAtr <= -minForwardMoveAtr && closeJ <= lineJ + cloudJ && touchedShortCloud
        ? 'BEARISH_PULLBACK_CONTINUED'
        : forwardAtr > 0 ? 'BULLISH_CONTEXT' : forwardAtr < 0 ? 'BEARISH_CONTEXT' : 'FLAT_CONTEXT';
    matches.push({
      index: j,
      time: rows[j].time || null,
      similarity: pct(similarity),
      close: roundCoin(symbol, closeJ),
      futureClose: roundCoin(symbol, futureClose),
      forwardAtr: pct(forwardAtr),
      forwardPct: pct((futureClose - closeJ) / closeJ * 100),
      type,
      line: roundCoin(symbol, lineJ)
    });
  }
  matches.sort((a, b) => Number(b.similarity) - Number(a.similarity));
  const topMatches = matches.slice(0, topN);
  if (!topMatches.length) {
    return { enabled: true, ready: false, pass: false, long: { pass: false }, short: { pass: false }, reason: 'No historical Market Memory matches found' };
  }
  const weightSum = topMatches.reduce((s, m) => s + Math.max(0.0001, Number(m.similarity || 0)), 0);
  const weightedForwardAtr = topMatches.reduce((s, m) => s + Number(m.forwardAtr || 0) * Math.max(0.0001, Number(m.similarity || 0)), 0) / weightSum;
  const best = topMatches[0];
  const recent = rows.slice(-Math.min(Math.max(Number(settings.institutionalPullbackLookback || 10), 3), 30));
  const longTouchedCloud = recent.some(c => Number(c.low) <= cloudHigh + atr * nearCloudAtrMult && Number(c.close) >= cloudLow - atr * nearCloudAtrMult);
  const shortTouchedCloud = recent.some(c => Number(c.high) >= cloudLow - atr * nearCloudAtrMult && Number(c.close) <= cloudHigh + atr * nearCloudAtrMult);
  const longRejection = price >= memoryLine || candleBullish(rows[i]);
  const shortRejection = price <= memoryLine || candleBearish(rows[i]);
  const extensionAtr = Math.abs(price - memoryLine) / atr;
  const notChasing = extensionAtr <= maxExtensionAtr;
  const regime = weightedForwardAtr >= minForwardMoveAtr ? 'BULLISH' : weightedForwardAtr <= -minForwardMoveAtr ? 'BEARISH' : 'NEUTRAL';
  const requirePullback = settings.marketMemoryRequirePullback !== false;
  const requireOutcome = settings.marketMemoryRequireTopMatchOutcome !== false;
  const similarityPass = Number(best.similarity || 0) >= minSimilarity;
  const topBull = String(best.type || '').startsWith('BULLISH');
  const topBear = String(best.type || '').startsWith('BEARISH');
  const longOutcome = !requireOutcome || topBull;
  const shortOutcome = !requireOutcome || topBear;
  const longPullback = !requirePullback || (longTouchedCloud && longRejection);
  const shortPullback = !requirePullback || (shortTouchedCloud && shortRejection);
  const longPass = regime === 'BULLISH' && similarityPass && longOutcome && longPullback && notChasing;
  const shortPass = regime === 'BEARISH' && similarityPass && shortOutcome && shortPullback && notChasing;
  const baseDetail = `MarketMemory regime=${regime}; best=${best.similarity}% ${best.type} ${best.forwardAtr}ATR; weighted=${pct(weightedForwardAtr)}ATR; line=${roundCoin(symbol, memoryLine)} cloud=${roundCoin(symbol, cloudLow)}-${roundCoin(symbol, cloudHigh)}; extension=${pct(extensionAtr)}ATR`;
  return {
    enabled: true,
    ready: true,
    pass: Boolean(longPass || shortPass),
    regime,
    line: roundCoin(symbol, memoryLine),
    cloudLow: roundCoin(symbol, cloudLow),
    cloudHigh: roundCoin(symbol, cloudHigh),
    extensionAtr: pct(extensionAtr),
    weightedForwardAtr: pct(weightedForwardAtr),
    bestMatch: best,
    topMatches,
    long: {
      pass: Boolean(longPass),
      regimeOk: regime === 'BULLISH',
      similarityPass,
      outcomePass: longOutcome,
      pullbackPass: Boolean(longPullback),
      touchedCloud: Boolean(longTouchedCloud),
      rejection: Boolean(longRejection),
      notChasing,
      entryZoneLow: roundCoin(symbol, cloudLow),
      entryZoneHigh: roundCoin(symbol, cloudHigh),
      detail: `${baseDetail}; LONG pullback=${longPullback}; topMatchBull=${topBull}; noChase=${notChasing}`
    },
    short: {
      pass: Boolean(shortPass),
      regimeOk: regime === 'BEARISH',
      similarityPass,
      outcomePass: shortOutcome,
      pullbackPass: Boolean(shortPullback),
      touchedCloud: Boolean(shortTouchedCloud),
      rejection: Boolean(shortRejection),
      notChasing,
      entryZoneLow: roundCoin(symbol, cloudLow),
      entryZoneHigh: roundCoin(symbol, cloudHigh),
      detail: `${baseDetail}; SHORT pullback=${shortPullback}; topMatchBear=${topBear}; noChase=${notChasing}`
    },
    reason: baseDetail
  };
}

function macdMomentumOk(macd, direction, opts = {}) {
  if (!macd?.ready) return Boolean(opts.allowWarmup);
  const line = Number(macd.line || 0);
  const signal = Number(macd.signal || 0);
  const hist = Number(macd.hist || 0);
  const prev = Number(macd.prevHist || 0);
  if (direction === 'LONG') return line > signal && (hist > 0 || hist >= prev);
  if (direction === 'SHORT') return line < signal && (hist < 0 || hist <= prev);
  return false;
}

function calculateInstitutionalEmaMtfLocal(symbol, history, price, atr, settings) {
  const enabled = settings.institutionalEmaEnabled !== false;
  if (!enabled) return { enabled: false, ready: true, pass: true, long: { pass: true }, short: { pass: true }, reason: 'EMA50/200 layer disabled' };
  const candles5 = getCachedCandles(symbol, '5m');
  const closesFallback = (history || []).map(Number).filter(n => Number.isFinite(n) && n > 0);
  const synthetic = closesFallback.length ? syntheticOhlcFromCloses(closesFallback, atr) : [];
  const execCandles = candles5.length >= 80 ? candles5 : synthetic;
  const closes = execCandles.map(c => c.close).filter(n => Number.isFinite(n) && n > 0);
  const p = Number(price || closes[closes.length - 1] || 0);
  const a = Math.max(Number(atr || 0), p * 0.002);
  const midLen = Math.min(Math.max(Math.floor(Number(settings.institutionalEmaMidPeriod || settings.trendEmaPeriod || 50)), 20), 100);
  const slowLen = Math.min(Math.max(Math.floor(Number(settings.institutionalEmaSlowPeriod || settings.dominantEmaPeriod || 200)), 100), 300);
  if (!p || closes.length < Math.max(80, midLen)) {
    return { enabled: true, ready: false, pass: false, long: { pass: false }, short: { pass: false }, reason: `Need at least ${Math.max(80, midLen)} candles for EMA50/200 warmup` };
  }
  const emaMidSeries = emaSeries(closes, midLen);
  const emaSlowSeries = emaSeries(closes, slowLen);
  const emaMid = lastFinite(emaMidSeries);
  const emaSlow = lastFinite(emaSlowSeries);
  const c15 = getCachedCandles(symbol, '15m');
  const c1h = getCachedCandles(symbol, '1h');
  const closes15 = c15.length >= midLen ? c15.map(c => c.close) : downsampleCloses(closes, 3);
  const closes1h = c1h.length >= midLen ? c1h.map(c => c.close) : downsampleCloses(closes, 12);
  const ema50_15 = latestEma(closes15, midLen);
  const ema200_15 = latestEma(closes15, slowLen);
  const ema50_1h = latestEma(closes1h, midLen);
  const ema200_1h = latestEma(closes1h, slowLen);
  const macd5 = calculateMacdRaw(closes, settings);
  const macd15 = calculateMacdRaw(closes15, settings);
  const macd1h = calculateMacdRaw(closes1h, settings);
  const pullbackLookback = Math.min(Math.max(Math.floor(Number(settings.institutionalPullbackLookback || 10)), 3), 30);
  const pbAtr = Math.min(Math.max(Number(settings.institutionalPullbackAtrMult || 0.85), 0.1), 5);
  const maxExtAtr = Math.min(Math.max(Number(settings.institutionalMaxExtensionAtr || 2.2), 0.5), 8);
  const patternLookback = Math.min(Math.max(Math.floor(Number(settings.institutionalPatternLookback || 24)), 8), 80);
  const recent = execCandles.slice(-pullbackLookback);
  const extensionAtr = Math.abs(p - emaMid) / Math.max(a, 0.00000001);
  const marketMemory = calculateMarketMemoryAverage(symbol, execCandles, settings);

  function pullback(direction) {
    const distances = recent.map(c => direction === 'LONG' ? Math.abs(Number(c.low) - emaMid) : Math.abs(Number(c.high) - emaMid)).filter(Number.isFinite);
    const minDistAtr = distances.length ? Math.min(...distances) / Math.max(a, 0.00000001) : 999;
    const touched = direction === 'LONG'
      ? recent.some(c => Number(c.low) <= emaMid + a * pbAtr && Number(c.close) >= emaMid - a * pbAtr)
      : recent.some(c => Number(c.high) >= emaMid - a * pbAtr && Number(c.close) <= emaMid + a * pbAtr);
    const reclaimed = direction === 'LONG' ? p > emaMid : p < emaMid;
    const notChasing = extensionAtr <= maxExtAtr;
    const swing = direction === 'LONG' ? Math.min(...recent.map(c => Number(c.low)).filter(Number.isFinite)) : Math.max(...recent.map(c => Number(c.high)).filter(Number.isFinite));
    return { pass: Boolean(touched && reclaimed && notChasing), touched, reclaimed, notChasing, minDistAtr: pct(minDistAtr), extensionAtr: pct(extensionAtr), swing };
  }

  function side(direction) {
    const long = direction === 'LONG';
    const transcriptMtfTrend = long
      ? ema50_15 > ema50_1h
      : ema50_15 < ema50_1h;
    const ema200Protection = Number.isFinite(emaSlow) ? (long ? p >= emaSlow || emaMid >= emaSlow : p <= emaSlow || emaMid <= emaSlow) : true;
    const execStack = long
      ? p >= emaMid && ema200Protection
      : p <= emaMid && ema200Protection;
    const htfStack = Boolean(transcriptMtfTrend);
    const pb = pullback(direction);
    const pa = priceActionConfirmation(execCandles, direction, a, patternLookback);
    const macd5Ok = macdMomentumOk(macd5, direction);
    const macd15Ok = macdMomentumOk(macd15, direction);
    const macd1hOk = macdMomentumOk(macd1h, direction, { allowWarmup: false });
    const htfMacd = macd15Ok && macd1hOk;
    const confluence = confluenceForSide(symbol, direction, execCandles, {
      price: p, atr: a, emaMid, macd5Ok, macd15Ok, macd1hOk, htfMacd, htfStack,
      priceActionOk: pa.pass,
      longTrend: long ? htfStack : false,
      shortTrend: long ? false : htfStack
    }, settings);
    const srVolume = buildMtfSrVolumeContext(symbol, direction, execCandles, settings);
    const srVolumePass = settings.srVolumeAlignmentEnabled === false || Boolean(srVolume.pass);
    const requirePriceAction = settings.institutionalRequirePriceAction !== false;
    const requireEmaStack = settings.institutionalRequireEmaStack !== false;
    const requirePullback = settings.institutionalRequirePullback !== false;
    const requireHtfMacd = settings.institutionalRequireHtfMacd === true;
    const memorySide = long ? (marketMemory.long || {}) : (marketMemory.short || {});
    const memoryPass = settings.marketMemoryEnabled === false || Boolean(memorySide.pass);
    // V70 balanced execution gate:
    // Hard = transcript MTF EMA50 direction + Market Memory similar-history cloud pullback/rejection + side-correct candle trigger + MACD timing.
    // Advisory only = local EMA50/200 protection, standalone confluence score, VWAP, RSI, CCI, volume, SAR, breakout, two-pole.
    const stackPass = requireEmaStack ? htfStack : true;
    const pullbackPass = settings.marketMemoryEnabled === false
      ? (requirePullback ? pb.pass : true)
      : Boolean(memorySide.pullbackPass || memorySide.pass);
    const htfMacdPass = requireHtfMacd ? htfMacd : true;
    const priceActionPass = !requirePriceAction || Boolean(pa.pass);
    const macdTimingPass = Boolean(macd5Ok || (settings.institutionalRequireHtfMacd === false && (macd15Ok || macd1hOk)));
    const pass = Boolean(stackPass && memoryPass && pullbackPass && priceActionPass && macdTimingPass && htfMacdPass && srVolumePass);
    const rawSl = long ? Math.min(Number(pa.patternLow || p), Number(pb.swing || p)) - a * Math.max(0, Number(settings.slBufferAtrMult ?? 0.25)) : Math.max(Number(pa.patternHigh || p), Number(pb.swing || p)) + a * Math.max(0, Number(settings.slBufferAtrMult ?? 0.25));
    const sl = roundCoin(symbol, rawSl);
    const risk = Math.abs(p - sl);
    const strongMacd = macd5Ok && (long ? macd5.hist > macd5.prevHist : macd5.hist < macd5.prevHist) && (htfMacd || requireHtfMacd === false);
    const dynamicTargetR = Math.min(Math.max(strongMacd ? Number(settings.dynamicTpStrongR || 3) : Number(settings.rewardTargetR || 2), 2), Math.max(2, Number(settings.dynamicTpMaxR || 5)));
    const tp1 = roundCoin(symbol, long ? p + risk * Math.max(1, Number(settings.tp1TriggerR || 1)) : p - risk * Math.max(1, Number(settings.tp1TriggerR || 1)));
    const tp2 = roundCoin(symbol, long ? p + risk * dynamicTargetR : p - risk * dynamicTargetR);
    return {
      pass: Boolean(pass),
      execStack,
      htfStack,
      ema200Protection,
      pullback: pb,
      priceAction: pa,
      macd5Ok,
      macd15Ok,
      macd1hOk,
      htfMacd,
      confluence,
      strongMacd,
      marketMemory: memorySide,
      marketMemoryPass: memoryPass,
      srVolume,
      srVolumePass,
      previousDayPass: srVolume.previousDayPass,
      mtfSupportResistancePass: srVolume.srPass,
      volumeFlowPass: srVolume.volumePass,
      swing: pb.swing,
      sl,
      tp1,
      tp2,
      dynamicTargetR,
      detail: `EMA50/200 only; transcript MTF EMA50 15m vs 1h=${htfStack}; local EMA50/200 advisory=${ema200Protection}; EMA50 pullback advisory=${pb.pass} dist=${pb.minDistAtr}ATR ext=${pb.extensionAtr}ATR; priceAction=${pa.pattern}; MACD5=${macd5Ok}; HTF MACD advisory=${htfMacd}; MarketMemory=${memoryPass ? 'PASS' : 'WAIT'} (${memorySide.detail || marketMemory.reason || '-'}); MTF_SR_VOLUME=${srVolumePass ? 'PASS' : 'WAIT'} (${srVolume.reason}); confluence=${confluence.score}/${confluence.maxScore}; location=${confluence.structure.source}; strongMACD=${strongMacd}`
    };
  }

  const long = side('LONG');
  const short = side('SHORT');
  const pass = long.pass || short.pass;
  return {
    enabled: true,
    ready: true,
    pass,
    fastLen: midLen,
    midLen,
    slowLen,
    ema13: null,
    ema50: roundCoin(symbol, emaMid),
    ema200: roundCoin(symbol, emaSlow),
    ema50_15: roundCoin(symbol, ema50_15),
    ema200_15: roundCoin(symbol, ema200_15),
    ema50_1h: roundCoin(symbol, ema50_1h),
    ema200_1h: roundCoin(symbol, ema200_1h),
    macd5: { ready: macd5.ready, hist: pct(macd5.hist), prevHist: pct(macd5.prevHist) },
    macd15: { ready: macd15.ready, hist: pct(macd15.hist), prevHist: pct(macd15.prevHist) },
    macd1h: { ready: macd1h.ready, hist: pct(macd1h.hist), prevHist: pct(macd1h.prevHist) },
    marketMemory,
    long,
    short,
    reason: pass ? `EMA50/200 + Market Memory layer PASS: ${long.pass ? 'LONG' : 'SHORT'} ${long.pass ? long.detail : short.detail}` : `EMA50/200 + Market Memory layer WAIT: long ${long.detail}; short ${short.detail}`
  };
}


function smaSeries(values = [], length = 4) {
  const len = Math.max(1, Math.floor(Number(length || 1)));
  const out = [];
  for (let i = 0; i < values.length; i += 1) {
    const slice = values.slice(Math.max(0, i - len + 1), i + 1).filter(Number.isFinite);
    out.push(slice.length ? slice.reduce((a, b) => a + b, 0) / slice.length : NaN);
  }
  return out;
}

function rollingStdevSeries(values = [], length = 10) {
  const len = Math.max(2, Math.floor(Number(length || 10)));
  const out = [];
  for (let i = 0; i < values.length; i += 1) {
    const slice = values.slice(Math.max(0, i - len + 1), i + 1).filter(Number.isFinite);
    if (slice.length < 2) { out.push(NaN); continue; }
    const m = slice.reduce((a, b) => a + b, 0) / slice.length;
    const variance = slice.reduce((a, b) => a + Math.pow(b - m, 2), 0) / Math.max(1, slice.length - 1);
    out.push(Math.sqrt(variance));
  }
  return out;
}

function waveTrendFromCandles(candles = [], settings = loadSettings()) {
  const rows = (candles || []).filter(c => c && Number.isFinite(c.high) && Number.isFinite(c.low) && Number.isFinite(c.close));
  const src = rows.map(c => (Number(c.high) + Number(c.low) + Number(c.close)) / 3);
  const clen = Math.min(Math.max(Math.floor(Number(settings.waveTrendChannelLength || 10)), 7), 50);
  const alen = Math.min(Math.max(Math.floor(Number(settings.waveTrendAverageLength || 21)), 7), 50);
  const slen = Math.min(Math.max(Math.floor(Number(settings.waveTrendSignalLength || 4)), 2), 7);
  const mean = emaSeries(src, clen);
  const dev = rollingStdevSeries(src, clen);
  const normalized = src.map((v, i) => {
    const d = Number(dev[i]);
    const m = Number(mean[i]);
    return Number.isFinite(v) && Number.isFinite(m) && Number.isFinite(d) && d > 0 ? ((v - m) / d) * 100 : NaN;
  });
  const wt = emaSeries(normalized.map(v => Number.isFinite(v) ? v : 0), alen);
  const signal = smaSeries(wt, slen);
  const hist = wt.map((v, i) => Number.isFinite(v) && Number.isFinite(signal[i]) ? v - signal[i] : NaN);
  return { wt, signal, hist, source: 'hlc3', clen, alen, slen };
}

function pivotLevelsForBreakRetest(candles = [], lookback = 20) {
  const rows = (candles || []).filter(c => c && Number.isFinite(c.high) && Number.isFinite(c.low));
  const bb = Math.min(Math.max(Math.floor(Number(lookback || 20)), 3), 50);
  const highs = rows.map(c => Number(c.high));
  const lows = rows.map(c => Number(c.low));
  const resistance = [];
  const support = [];
  for (let i = bb; i < rows.length - bb; i += 1) {
    const hiWin = highs.slice(i - bb, i + bb + 1);
    const loWin = lows.slice(i - bb, i + bb + 1);
    if (highs[i] === Math.max(...hiWin)) resistance.push({ index: i, confirmedIndex: i + bb, level: highs[i], time: rows[i].time || null });
    if (lows[i] === Math.min(...loWin)) support.push({ index: i, confirmedIndex: i + bb, level: lows[i], time: rows[i].time || null });
  }
  return { support, resistance, lookback: bb };
}

function lastLevelConfirmedAtOrBefore(levels = [], index = 0) {
  return (levels || []).filter(x => Number(x.confirmedIndex) <= index && Number.isFinite(Number(x.level))).at(-1) || null;
}

function candidateLevelsConfirmedAtOrBefore(levels = [], index = 0, settings = loadSettings()) {
  const count = Math.min(Math.max(Math.floor(Number(settings.breakRetestLevelSearchCount || 8)), 1), 20);
  const maxAge = Math.min(Math.max(Math.floor(Number(settings.breakRetestLevelMaxAgeCandles || 240)), 20), 1200);
  const sigIndex = Number(index || 0);
  return (levels || [])
    .filter(x => Number(x.confirmedIndex) <= sigIndex && Number.isFinite(Number(x.level)))
    .filter(x => sigIndex - Number(x.confirmedIndex || 0) <= maxAge)
    .slice(-count)
    .reverse();
}

function chooseBreakRetestLevel(symbol, rows = [], direction = 'LONG', levels = [], wtIndex = 0, atr = 0, settings = loadSettings()) {
  const candidates = candidateLevelsConfirmedAtOrBefore(levels, wtIndex, settings);
  const lastClose = Number(rows.at(-1)?.close || 0);
  if (!candidates.length) return { level: null, br: { pass: false, reason: 'Waiting for confirmed S/R level at WaveTrend signal.' }, candidatesChecked: 0 };
  const tested = candidates.map(level => ({
    level,
    br: findBreakRetestSequence(symbol, rows, direction, level, wtIndex, atr, settings),
    distance: lastClose ? Math.abs(Number(level.level) - lastClose) / lastClose : Infinity
  }));
  const passed = tested.filter(x => x.br?.pass);
  if (passed.length) {
    passed.sort((a, b) => Number(a.br.retestBarsAgo ?? 999) - Number(b.br.retestBarsAgo ?? 999) || Number(a.distance) - Number(b.distance));
    return { level: passed[0].level, br: passed[0].br, candidatesChecked: tested.length };
  }
  const broken = tested.filter(x => x.br?.breakIndex !== null && x.br?.breakIndex !== undefined);
  if (broken.length) {
    broken.sort((a, b) => Number(a.distance) - Number(b.distance));
    return { level: broken[0].level, br: broken[0].br, candidatesChecked: tested.length };
  }
  tested.sort((a, b) => Number(a.distance) - Number(b.distance));
  return { level: tested[0].level, br: tested[0].br, candidatesChecked: tested.length };
}

function findBreakRetestSequence(symbol, candles = [], direction = 'LONG', levelObj = null, signalIndex = 0, atr = 0, settings = loadSettings()) {
  const rows = (candles || []).filter(c => c && Number.isFinite(c.open) && Number.isFinite(c.high) && Number.isFinite(c.low) && Number.isFinite(c.close));
  const lastIndex = rows.length - 1;
  const level = Number(levelObj?.level || 0);
  const price = Number(rows.at(-1)?.close || 0);
  const a = Math.max(Number(atr || atrFromCandles(rows, Number(settings.atrPeriod || 14)) || 0), price * 0.001, 0.00000001);
  const tolAtr = a * Math.min(Math.max(Number(settings.breakRetestToleranceAtrMult || 0.65), 0.10), 3);
  const tolPct = level * (Math.min(Math.max(Number(settings.breakRetestTolerancePct ?? 0.20), 0.02), 1.0) / 100);
  const tol = Math.max(tolAtr, tolPct);
  const minBarsAfterBreak = Math.min(Math.max(Math.floor(Number(settings.breakRetestMinBarsAfterBreak || 1)), 0), 10);
  const entryWindow = Math.min(Math.max(Math.floor(Number(settings.breakRetestEntryWindowCandles || 3)), 1), 12);
  if (!level || !rows.length) return { pass: false, level, tolerance: roundCoin(symbol, tol), reason: 'No confirmed S/R level available for this setup.' };

  let breakIndex = null;
  for (let i = Math.max(1, Number(signalIndex || 0) + 1); i <= lastIndex; i += 1) {
    const prev = rows[i - 1];
    const cur = rows[i];
    const broke = direction === 'LONG'
      ? Number(prev.close) <= level + tol && Number(cur.close) > level
      : Number(prev.close) >= level - tol && Number(cur.close) < level;
    if (broke) { breakIndex = i; break; }
  }
  if (breakIndex === null) return { pass: false, level: roundCoin(symbol, level), tolerance: roundCoin(symbol, tol), reason: direction === 'LONG' ? 'Waiting for closed candle break above resistance.' : 'Waiting for closed candle break below support.' };

  let retestIndex = null;
  for (let i = breakIndex + minBarsAfterBreak; i <= lastIndex; i += 1) {
    const cur = rows[i];
    const retest = direction === 'LONG'
      ? Number(cur.low) <= level + tol && Number(cur.close) >= level - tol
      : Number(cur.high) >= level - tol && Number(cur.close) <= level + tol;
    if (retest) { retestIndex = i; }
  }
  const fresh = retestIndex !== null && lastIndex - retestIndex <= entryWindow - 1;
  return {
    pass: Boolean(fresh),
    level: roundCoin(symbol, level),
    tolerance: roundCoin(symbol, tol),
    breakIndex,
    retestIndex,
    retestBarsAgo: retestIndex === null ? null : lastIndex - retestIndex,
    reason: retestIndex === null
      ? (direction === 'LONG' ? 'Break confirmed; waiting for resistance retest.' : 'Breakdown confirmed; waiting for support retest.')
      : fresh
        ? `${direction} break/retest confirmed; retest ${lastIndex - retestIndex} closed candle(s) ago.`
        : `Retest happened ${lastIndex - retestIndex} candle(s) ago; waiting for fresh retest.`
  };
}

function recentWaveTrendEvent(wtObj, direction = 'LONG', settings = loadSettings()) {
  const wt = wtObj?.wt || [];
  const sig = wtObj?.signal || [];
  const i = wt.length - 1;
  const rev = Number(settings.waveTrendReversionThreshold || 100);
  const window = Math.min(Math.max(Math.floor(Number(settings.waveTrendSetupWindowCandles || 120)), 5), 360);
  const start = Math.max(1, i - window + 1);
  for (let idx = i; idx >= start; idx -= 1) {
    const prevWt = Number(wt[idx - 1]);
    const prevSig = Number(sig[idx - 1]);
    const nowWt = Number(wt[idx]);
    const nowSig = Number(sig[idx]);
    if (![prevWt, prevSig, nowWt, nowSig].every(Number.isFinite)) continue;
    const os = prevWt <= prevSig && nowWt > nowSig && nowWt < -rev;
    const ob = prevWt >= prevSig && nowWt < nowSig && nowWt > rev;
    if (direction === 'LONG' && os) return { ok: true, index: idx, barsAgo: i - idx, value: pct(nowWt), signal: pct(nowSig), type: 'OVERSOLD_BLUE' };
    if (direction === 'SHORT' && ob) return { ok: true, index: idx, barsAgo: i - idx, value: pct(nowWt), signal: pct(nowSig), type: 'OVERBOUGHT_PURPLE' };
  }

  // Practical mode keeps the transcript logic but avoids missing trades when WT touched OB/OS and recovered just outside the exact dot candle.
  // The trade still needs separate S/R break + retest and MA100 trend confirmation.
  if (settings.waveTrendPracticalRecovery !== false) {
    let extremeIdx = null;
    for (let idx = i; idx >= start; idx -= 1) {
      const nowWt = Number(wt[idx]);
      if (!Number.isFinite(nowWt)) continue;
      if (direction === 'LONG' && nowWt < -rev) { extremeIdx = idx; break; }
      if (direction === 'SHORT' && nowWt > rev) { extremeIdx = idx; break; }
    }
    if (extremeIdx !== null) {
      for (let idx = Math.max(extremeIdx + 1, start); idx <= i; idx += 1) {
        const nowWt = Number(wt[idx]);
        const nowSig = Number(sig[idx]);
        const prevWt = Number(wt[idx - 1]);
        if (![nowWt, nowSig, prevWt].every(Number.isFinite)) continue;
        const recovered = direction === 'LONG'
          ? (nowWt > nowSig || nowWt > prevWt)
          : (nowWt < nowSig || nowWt < prevWt);
        if (recovered) return {
          ok: true,
          index: extremeIdx,
          barsAgo: i - extremeIdx,
          value: pct(wt[i]),
          signal: pct(sig[i]),
          type: direction === 'LONG' ? 'OVERSOLD_RECOVERY' : 'OVERBOUGHT_RECOVERY',
          practicalRecovery: true
        };
      }
    }
  }

  return { ok: false, index: null, barsAgo: null, value: pct(wt[i]), signal: pct(sig[i]), type: direction === 'LONG' ? 'NO_RECENT_OVERSOLD' : 'NO_RECENT_OVERBOUGHT' };
}

function swingStopForRetest(symbol, candles = [], direction = 'LONG', fromIndex = 0, toIndex = null, atr = 0, settings = loadSettings()) {
  const rows = (candles || []).filter(c => c && Number.isFinite(c.high) && Number.isFinite(c.low) && Number.isFinite(c.close));
  const lastIndex = rows.length - 1;
  const end = Math.min(lastIndex, Number.isInteger(toIndex) ? toIndex : lastIndex);
  const lookback = Math.min(Math.max(Math.floor(Number(settings.slSwingLookback || 24)), 6), 120);
  const start = Math.max(0, Math.min(Number(fromIndex || 0), end), end - lookback + 1);
  const slice = rows.slice(start, end + 1);
  const price = Number(rows[end]?.close || rows.at(-1)?.close || 0);
  const a = Math.max(Number(atr || atrFromCandles(rows, Number(settings.atrPeriod || 14)) || 0), price * 0.001, 0.00000001);
  const buffer = a * Math.min(Math.max(Number(settings.slBufferAtrMult ?? 0.25), 0), 2);
  const minDistance = a * Math.min(Math.max(Number(settings.minSlAtrMult || 0.6), 0.05), 5);
  const maxDistance = a * Math.min(Math.max(Number(settings.maxTechnicalSlAtrMult || 6), 2), 20);
  let rawSl = direction === 'LONG'
    ? Math.min(...slice.map(c => Number(c.low)).filter(Number.isFinite)) - buffer
    : Math.max(...slice.map(c => Number(c.high)).filter(Number.isFinite)) + buffer;
  if (!Number.isFinite(rawSl) || !price) rawSl = direction === 'LONG' ? price - minDistance : price + minDistance;
  if (direction === 'LONG') {
    if (price - rawSl < minDistance) rawSl = price - minDistance;
    if (price - rawSl > maxDistance) rawSl = price - maxDistance;
  } else {
    if (rawSl - price < minDistance) rawSl = price + minDistance;
    if (rawSl - price > maxDistance) rawSl = price + maxDistance;
  }
  return { sl: roundCoin(symbol, rawSl), swingStartIndex: start, swingEndIndex: end, buffer: roundCoin(symbol, buffer), reason: `${direction} structural swing SL with ATR buffer. Swing window=${start}-${end}, buffer=${roundCoin(symbol, buffer)}` };
}


function smiFromCandles(candles = [], settings = loadSettings()) {
  const rows = (candles || []).filter(c => c && Number.isFinite(c.high) && Number.isFinite(c.low) && Number.isFinite(c.close));
  const kLen = Math.min(Math.max(Math.floor(Number(settings.smiPercentKLength || 10)), 1), 100);
  const dLen = Math.min(Math.max(Math.floor(Number(settings.smiPercentDLength || 3)), 1), 50);
  const sigLen = Math.min(Math.max(Math.floor(Number(settings.smiSignalLength || 10)), 1), 100);
  const smoothLen = Math.min(Math.max(Math.floor(Number(settings.smiSmoothingPeriod || 5)), 1), 50);
  const highs = rows.map(c => Number(c.high));
  const lows = rows.map(c => Number(c.low));
  const closes = rows.map(c => Number(c.close));
  const rdiff = [];
  const diff = [];
  for (let i = 0; i < rows.length; i += 1) {
    const lo = Math.min(...lows.slice(Math.max(0, i - kLen + 1), i + 1));
    const hi = Math.max(...highs.slice(Math.max(0, i - kLen + 1), i + 1));
    const d = hi - lo;
    diff.push(Number.isFinite(d) ? d : 0);
    rdiff.push(Number.isFinite(closes[i]) && Number.isFinite(hi) && Number.isFinite(lo) ? closes[i] - (hi + lo) / 2 : 0);
  }
  const avgRel = emaSeries(rdiff, dLen);
  const avgDiff = emaSeries(diff, dLen);
  const smiRaw = avgRel.map((v, i) => {
    const ad = Number(avgDiff[i]);
    return ad !== 0 && Number.isFinite(ad) && Number.isFinite(v) ? (v / (ad / 2)) * 100 : 0;
  });
  const smi = smaSeries(smiRaw, smoothLen);
  const signal = emaSeries(smi, sigLen);
  return { smi, signal, raw: smiRaw, kLen, dLen, sigLen, smoothLen, overbought: Number(settings.smiOverbought ?? 40), oversold: Number(settings.smiOversold ?? -40) };
}

function emaCloudFromCandles(candles = [], settings = loadSettings()) {
  const rows = (candles || []).filter(c => c && Number.isFinite(c.close));
  const closes = rows.map(c => Number(c.close));
  const fastLen = Math.min(Math.max(Math.floor(Number(settings.emaCloudFastLength || 50)), 5), 300);
  const slowLen = Math.min(Math.max(Math.floor(Number(settings.emaCloudSlowLength || 200)), fastLen + 1), 500);
  const fast = emaSeries(closes, fastLen);
  const slow = emaSeries(closes, slowLen);
  const upper = fast.map((v, i) => Math.max(Number(v), Number(slow[i])));
  const lower = fast.map((v, i) => Math.min(Number(v), Number(slow[i])));
  const regime = fast.map((v, i) => Number(v) >= Number(slow[i]) ? 'bull' : 'bear');
  return { fast, slow, upper, lower, regime, fastLen, slowLen };
}


function knSmartFromCandles(candles = [], settings = loadSettings()) {
  const rows = (candles || []).filter(c => c && Number.isFinite(c.close));
  const closes = rows.map(c => Number(c.close));
  const fastLen = Math.min(Math.max(Math.floor(Number(settings.knFastEmaLength || 5)), 1), 100);
  const slowLen = Math.min(Math.max(Math.floor(Number(settings.knSlowEmaLength || 12)), fastLen + 1), 200);
  const atrLen = Math.min(Math.max(Math.floor(Number(settings.knAtrPeriod || settings.atrPeriod || 14)), 1), 100);
  const fast = emaSeries(closes, fastLen);
  const slow = emaSeries(closes, slowLen);
  const atr = rows.map((_, i) => atrFromCandles(rows.slice(0, i + 1), atrLen));
  const buySignals = rows.map((_, i) => i > 0 && Number(fast[i - 1]) <= Number(slow[i - 1]) && Number(fast[i]) > Number(slow[i]));
  const sellSignals = rows.map((_, i) => i > 0 && Number(fast[i - 1]) >= Number(slow[i - 1]) && Number(fast[i]) < Number(slow[i]));
  return { fast, slow, atr, buySignals, sellSignals, fastLen, slowLen, atrLen };
}

function recentSmiDirection(symbol, rows = [], direction = 'LONG', smiObj = null, settings = loadSettings()) {
  const smi = smiObj?.smi || [];
  const sig = smiObj?.signal || [];
  const lastIndex = rows.length - 1;
  const lookback = Math.min(Math.max(Math.floor(Number(settings.smiRecoveryLookbackCandles || 8)), 1), 30);
  const ob = Number(settings.smiOverbought ?? 40);
  const os = Number(settings.smiOversold ?? -40);
  const nowSmi = Number(smi[lastIndex]);
  const nowSig = Number(sig[lastIndex]);
  let crossed = false;
  let crossIndex = null;
  let pulledBack = false;
  const scanStart = Math.max(1, lastIndex - lookback + 1);
  for (let i = scanStart; i <= lastIndex; i += 1) {
    const ps = Number(smi[i - 1]);
    const pg = Number(sig[i - 1]);
    const cs = Number(smi[i]);
    const cg = Number(sig[i]);
    if (![ps, pg, cs, cg].every(Number.isFinite)) continue;
    if (direction === 'LONG') {
      if (ps < os || cs < os) pulledBack = true;
      if (ps <= pg && cs > cg && cs > os) { crossed = true; crossIndex = i; }
    } else {
      if (ps > ob || cs > ob) pulledBack = true;
      if (ps >= pg && cs < cg && cs < ob) { crossed = true; crossIndex = i; }
    }
  }
  const directionOk = direction === 'LONG'
    ? Number.isFinite(nowSmi) && Number.isFinite(nowSig) && nowSmi > nowSig && nowSmi > os
    : Number.isFinite(nowSmi) && Number.isFinite(nowSig) && nowSmi < nowSig && nowSmi < ob;
  return {
    pass: Boolean(pulledBack && crossed && directionOk),
    directionOk,
    pulledBack,
    crossed,
    crossIndex,
    barsSinceCross: crossIndex === null ? null : lastIndex - crossIndex,
    smiValue: pct(nowSmi),
    smiSignal: pct(nowSig),
    reason: `${direction} SMI exact recovery ${pulledBack && crossed && directionOk ? 'PASS' : 'WAIT'}: pullback=${pulledBack} cross=${crossed}${crossed ? ` ${lastIndex - crossIndex} candle(s) ago` : ''}; SMI=${pct(nowSmi)} signal=${pct(nowSig)}; required ${direction === 'LONG' ? 'cross above -40 after oversold' : 'cross below +40 after overbought'}.`
  };
}

function findKnSmartSetup(symbol, rows = [], direction = 'LONG', kn = null, smiObj = null, settings = loadSettings()) {
  const lastIndex = rows.length - 1;
  const fast = kn?.fast || [];
  const slow = kn?.slow || [];
  const buySignals = kn?.buySignals || [];
  const sellSignals = kn?.sellSignals || [];
  const atrSeries = kn?.atr || [];
  const signalLookback = Math.min(Math.max(Math.floor(Number(settings.knSignalLookbackCandles || 8)), 1), 60);
  const confirmLookback = Math.min(Math.max(Math.floor(Number(settings.knEntryConfirmLookbackCandles || 5)), 1), 30);
  const slMult = Math.min(Math.max(Number(settings.knSlAtrMultiplier || 1.5), 0.2), 10);
  const tp1R = Math.min(Math.max(Number(settings.tp1TriggerR || 1), 0.5), 5);
  const tp2R = Math.min(Math.max(Number(settings.tp2TriggerR || 2), tp1R), 8);
  const tp3R = Math.min(Math.max(Number(settings.tp3TriggerR || settings.rewardTargetR || 3), tp2R), 10);
  const signals = direction === 'LONG' ? buySignals : sellSignals;
  let signalIndex = null;
  for (let i = Math.max(1, lastIndex - signalLookback + 1); i <= lastIndex; i += 1) {
    if (signals[i]) signalIndex = i;
  }
  const smiState = recentSmiDirection(symbol, rows, direction, smiObj, settings);
  if (signalIndex === null) {
    const nowFast = Number(fast[lastIndex]);
    const nowSlow = Number(slow[lastIndex]);
    return { pass: false, ready: true, direction, signalIndex: null, entryIndex: null, fast: roundCoin(symbol, nowFast), slow: roundCoin(symbol, nowSlow), smi: smiState, reason: `WAIT ${direction}: no KN EMA${kn?.fastLen || 5}/${kn?.slowLen || 12} crossover inside last ${signalLookback} closed candles. ${smiState.reason}` };
  }
  const signalCandle = rows[signalIndex] || {};
  const signalEntry = Number(signalCandle.close || 0);
  let entryIndex = null;
  let entryCandle = null;
  let candleTooLarge = false;
  const end = lastIndex;
  const start = Math.max(signalIndex, end - confirmLookback + 1);
  const requireSmi = settings.knRequireSmiDirection === true;
  for (let i = start; i <= end; i += 1) {
    const c = rows[i] || {};
    const candleBodyOk = direction === 'LONG'
      ? Number(c.close) > Number(c.open) && Number(c.close) >= signalEntry
      : Number(c.close) < Number(c.open) && Number(c.close) <= signalEntry;
    const body = Math.max(Math.abs(Number(c.close) - Number(c.open)), Number(c.close || signalEntry) * 0.00001);
    const upperWick = Number(c.high) - Math.max(Number(c.open), Number(c.close));
    const lowerWick = Math.min(Number(c.open), Number(c.close)) - Number(c.low);
    const maxRejectWickBodyMult = Math.min(Math.max(Number(settings.knMaxRejectionWickBodyMult || 1.2), 0.2), 5);
    const rejectionOk = direction === 'LONG' ? upperWick <= body * maxRejectWickBodyMult : lowerWick <= body * maxRejectWickBodyMult;
    const atr = Math.max(Number(atrSeries[i] || atrFromCandles(rows.slice(0, i + 1), Number(settings.knAtrPeriod || settings.atrPeriod || 14)) || 0), Number(c.close || signalEntry) * 0.001, 0.00000001);
    const maxRange = Math.max(atr * Math.min(Math.max(Number(settings.knMaxEntryCandleAtrMult || 2.2), 0.5), 10), Number(c.close || signalEntry) * (Math.min(Math.max(Number(settings.knMaxEntryCandlePct || 1.0), 0.05), 10) / 100));
    const rangeOk = Math.abs(Number(c.high) - Number(c.low)) <= maxRange;
    if (candleBodyOk && !rangeOk) candleTooLarge = true;
    if (candleBodyOk && rangeOk && rejectionOk && (!requireSmi || smiState.pass)) {
      entryIndex = i;
      entryCandle = c;
    }
  }
  const close = Number(entryCandle?.close || rows[lastIndex]?.close || signalEntry);
  const atrNow = Math.max(Number(atrSeries[entryIndex ?? lastIndex] || atrFromCandles(rows, Number(settings.knAtrPeriod || settings.atrPeriod || 14)) || 0), close * 0.001, 0.00000001);
  const risk = atrNow * slMult;
  const long = direction === 'LONG';
  const sl = roundCoin(symbol, long ? close - risk : close + risk);
  const tp1 = roundCoin(symbol, long ? close + risk * tp1R : close - risk * tp1R);
  const tp2 = roundCoin(symbol, long ? close + risk * tp2R : close - risk * tp2R);
  const tp3 = roundCoin(symbol, long ? close + risk * tp3R : close - risk * tp3R);
  const pass = Boolean(entryIndex !== null && close && risk > 0 && (!requireSmi || smiState.pass));
  return {
    pass,
    ready: true,
    direction,
    signalIndex,
    entryIndex,
    signalEntry: roundCoin(symbol, signalEntry),
    entry: roundCoin(symbol, close),
    fast: roundCoin(symbol, Number(fast[lastIndex])),
    slow: roundCoin(symbol, Number(slow[lastIndex])),
    atr: roundCoin(symbol, atrNow),
    sl,
    tp1,
    tp2,
    tp3,
    dynamicTargetR: tp3R,
    candleTooLarge,
    candleColorPass: Boolean(entryIndex !== null),
    smi: smiState,
    reason: pass
      ? `${direction} KN Smart TP/SL confirmed: EMA${kn?.fastLen || 5}/${kn?.slowLen || 12} crossover at ${signalIndex}, valid ${long ? 'bullish close above' : 'bearish close below'} entry at ${entryIndex}. SL=ATR×${slMult}; TP1=${tp1R}R TP2=${tp2R}R TP3=${tp3R}R. ${smiState.reason}`
      : `WAIT ${direction}: KN signal at ${signalIndex}, waiting for ${long ? 'bullish candle close above entry' : 'bearish candle close below entry'} within ${confirmLookback} candles${candleTooLarge ? '; last valid-side candle was too large by golden-rule filter' : ''}${requireSmi && !smiState.pass ? '; SMI direction confirmation missing' : ''}. ${smiState.reason}`
  };
}

function calculateSmiKnSmartSignalForResolution(symbol, resolution = '5m', price = 0, atr = 0, settings = loadSettings()) {
  const res = normalizeResolution(resolution);
  const rows = getCachedCandles(symbol, res).filter(c => c && Number.isFinite(c.open) && Number.isFinite(c.high) && Number.isFinite(c.low) && Number.isFinite(c.close));
  const p = Number(price || rows.at(-1)?.close || 0);
  const kLen = Math.min(Math.max(Math.floor(Number(settings.smiPercentKLength || 10)), 1), 100);
  const sigLen = Math.min(Math.max(Math.floor(Number(settings.smiSignalLength || 10)), 1), 100);
  const slowLen = Math.min(Math.max(Math.floor(Number(settings.knSlowEmaLength || 12)), 2), 200);
  const minBars = Math.max(slowLen + 25, kLen + sigLen + 25, 60);
  const style = tradeStyleForResolution(res);
  if (!rows.length || rows.length < minBars) return { ready: false, pass: false, entrySide: '', timeframe: res, tradeStyle: style, source: 'SMI_KN_PULLBACK_TPSL_LOCAL', entryModel: 'SMI_KN_PULLBACK_TPSL', reason: `Need ${minBars} closed ${res} candles for ${style} SMI + KN Smart TP/SL warmup.` };
  const smi = smiFromCandles(rows, settings);
  const kn = knSmartFromCandles(rows, settings);
  const cloud = emaCloudFromCandles(rows, settings);
  const macdLong = macdTranscriptMomentumFromCandles(rows, 'LONG', settings);
  const macdShort = macdTranscriptMomentumFromCandles(rows, 'SHORT', settings);
  const atrNowForCloud = Math.max(Number(atr || atrFromCandles(rows, Number(settings.atrPeriod || 14)) || 0), p * 0.001, 0.00000001);
  const cloudLong = findSmiPullbackContinuation(symbol, rows, 'LONG', smi, cloud, atrNowForCloud, settings);
  const cloudShort = findSmiPullbackContinuation(symbol, rows, 'SHORT', smi, cloud, atrNowForCloud, settings);
  const long = findKnSmartSetup(symbol, rows, 'LONG', kn, smi, settings);
  const short = findKnSmartSetup(symbol, rows, 'SHORT', kn, smi, settings);
  // HARD RULE: the bot may only enter after the creator-style SMI trend-continuation sequence.
  // Trend cloud -> SMI pullback beyond band -> price touches/rejects cloud without breaking -> SMI recovery cross -> KN confirmation.
  const rawLongPass = Boolean(long.pass);
  const rawShortPass = Boolean(short.pass);
  long.cloudSetup = cloudLong;
  short.cloudSetup = cloudShort;
  long.macdTranscript = macdLong;
  short.macdTranscript = macdShort;
  const requireMacd = settings.requireMacdTranscriptConfirmation !== false;
  long.pass = Boolean(rawLongPass && cloudLong.pass && (!requireMacd || macdLong.pass));
  short.pass = Boolean(rawShortPass && cloudShort.pass && (!requireMacd || macdShort.pass));
  long.reason = long.pass
    ? `${long.reason} ${cloudLong.reason} ${macdLong.reason}`
    : `WAIT LONG: KN=${rawLongPass}; SMI_PULLBACK_CONTINUATION=${cloudLong.pass}; MACD_TRANSCRIPT=${macdLong.pass}. ${long.reason} ${cloudLong.reason} ${macdLong.reason}`;
  short.reason = short.pass
    ? `${short.reason} ${cloudShort.reason} ${macdShort.reason}`
    : `WAIT SHORT: KN=${rawShortPass}; SMI_PULLBACK_CONTINUATION=${cloudShort.pass}; MACD_TRANSCRIPT=${macdShort.pass}. ${short.reason} ${cloudShort.reason} ${macdShort.reason}`;
  const entrySide = long.pass ? 'LONG' : short.pass ? 'SHORT' : '';
  const chosen = entrySide === 'LONG' ? long : entrySide === 'SHORT' ? short : (long.signalIndex !== null ? long : short.signalIndex !== null ? short : long);
  const signalGrade = entrySide ? (chosen.smi?.pass ? 'A+' : 'A') : 'WAIT';
  const compat = { enabled: false, ready: true, pass: Boolean(entrySide), long: { pass: long.pass, confluence: null, sl: long.sl, dynamicTargetR: long.dynamicTargetR, detail: long.reason, priceAction: { pass: long.candleColorPass, reason: long.reason }, marketMemoryPass: true, srVolumePass: true }, short: { pass: short.pass, confluence: null, sl: short.sl, dynamicTargetR: short.dynamicTargetR, detail: short.reason, priceAction: { pass: short.candleColorPass, reason: short.reason }, marketMemoryPass: true, srVolumePass: true }, reason: 'Legacy compatibility container only; active strategy is SMI + KN Smart TP/SL.' };
  const cloudChosen = chosen?.cloudSetup || (entrySide === 'LONG' ? cloudLong : entrySide === 'SHORT' ? cloudShort : (long.cloudSetup?.pullbackIndex !== null ? long.cloudSetup : short.cloudSetup));
  const conditions = {
    knSignal: Boolean(chosen.signalIndex !== null),
    entryCandle: Boolean(chosen.entryIndex !== null),
    candleSizeOk: !chosen.candleTooLarge,
    smiDirection: Boolean(chosen.smi?.pass),
    trendCloud: Boolean(cloudChosen?.trendPass),
    smiPullback: Boolean(cloudChosen?.pullbackIndex !== null),
    cloudTouch: Boolean(cloudChosen?.cloudTouch || settings.requireCloudTouch === false),
    cloudNotBroken: Boolean(cloudChosen && !cloudChosen.cloudBroken),
    smiRecoveryCross: Boolean(cloudChosen?.cross),
    candleColor: Boolean(cloudChosen?.candleColorPass || settings.requireSmiCandleColor === false),
    macdTranscript: Boolean((entrySide === 'LONG' ? macdLong : entrySide === 'SHORT' ? macdShort : chosen?.macdTranscript)?.pass),
    macdColorFlip: Boolean((entrySide === 'LONG' ? macdLong : entrySide === 'SHORT' ? macdShort : chosen?.macdTranscript)?.colorFlip),
    macdSignalCross: Boolean((entrySide === 'LONG' ? macdLong : entrySide === 'SHORT' ? macdShort : chosen?.macdTranscript)?.cross),
    longTrend: entrySide === 'LONG' && Boolean(cloudChosen?.trendPass),
    shortTrend: entrySide === 'SHORT' && Boolean(cloudChosen?.trendPass)
  };
  const reason = entrySide ? `${signalGrade} ${style} ${res} SMI_KN_PULLBACK_TPSL ${entrySide} confirmed on closed Delta OHLC. ${chosen.reason}` : `WAIT ${style} ${res} SMI_KN_PULLBACK_TPSL. Long: ${long.reason}; Short: ${short.reason}`;
  return { ready: true, pass: Boolean(entrySide), entrySide, timeframe: res, tradeStyle: style, entryModel: 'SMI_KN_PULLBACK_TPSL', source: 'SMI_KN_PULLBACK_TPSL_LOCAL', signalGrade, strategyName: 'SMI Pullback Continuation + KN Smart TP/SL', emaFast: chosen.fast, emaSlow: chosen.slow, knFast: chosen.fast, knSlow: chosen.slow, smiValue: chosen.smi?.smiValue, smiSignal: chosen.smi?.smiSignal, long, short, institutionalEma: compat, invalidationLevel: chosen?.sl || null, entry: chosen?.entry || null, signalEntry: chosen?.signalEntry || null, tp1: chosen?.tp1 || null, tp2: chosen?.tp2 || null, tp3: chosen?.tp3 || null, dynamicTargetR: chosen?.dynamicTargetR || Number(settings.tp3TriggerR || 3), conditions, setup: chosen || null, reason, localApproximation: false };
}

function calculateSmiKnSmartSignal(symbol, history, price, atr, settings = loadSettings()) {
  const frames = settings.multiHorizonScanEnabled === false ? [normalizeResolution(settings.executionTimeframe || '5m')] : strategyTimeframes(settings);
  const signals = frames.map(res => calculateSmiKnSmartSignalForResolution(symbol, res, price, atr, settings));
  const passed = signals.filter(x => x && x.pass && x.entrySide);
  if (passed.length) { passed.sort((a, b) => horizonRank(a.timeframe) - horizonRank(b.timeframe)); const chosen = passed[0]; return { ...chosen, selectedTimeframe: chosen.timeframe, selectedHorizon: chosen.tradeStyle, byTimeframe: signals, reason: `${chosen.reason} Multi-horizon SMI + KN scan checked ${frames.join(' / ')}; selected ${chosen.tradeStyle} ${chosen.timeframe}.` }; }
  const readySignals = signals.filter(x => x && x.ready !== false);
  const chosen = readySignals.find(x => x.long?.signalIndex !== null || x.short?.signalIndex !== null) || readySignals[0] || signals[0] || null;
  if (!chosen) return { ready: false, pass: false, entrySide: '', source: 'SMI_KN_PULLBACK_TPSL_LOCAL', entryModel: 'SMI_KN_PULLBACK_TPSL', reason: 'No strategy timeframes available for SMI + KN Smart scan.', byTimeframe: [] };
  return { ...chosen, selectedTimeframe: chosen.timeframe, selectedHorizon: chosen.tradeStyle, byTimeframe: signals, reason: `WAIT MULTI-HORIZON SMI_KN_PULLBACK_TPSL. Checked ${frames.join(' / ')}. ${signals.map(x => `${x.tradeStyle || '-'} ${x.timeframe || '-'}: ${x.pass ? 'PASS' : x.ready === false ? 'WARMUP' : 'WAIT'}`).join(' | ')}. ${chosen.reason || ''}` };
}

function findSmiPullbackContinuation(symbol, rows = [], direction = 'LONG', smiObj = null, cloud = null, atr = 0, settings = loadSettings()) {
  const lastIndex = rows.length - 1;
  const smi = smiObj?.smi || [];
  const sig = smiObj?.signal || [];
  const ob = Number(settings.smiOverbought ?? 40);
  const os = Number(settings.smiOversold ?? -40);
  const window = Math.min(Math.max(Math.floor(Number(settings.smiPullbackWindowCandles || 80)), 5), 360);
  const start = Math.max(1, lastIndex - window + 1);
  const price = Number(rows.at(-1)?.close || 0);
  const a = Math.max(Number(atr || atrFromCandles(rows, Number(settings.atrPeriod || 14)) || 0), price * 0.001, 0.00000001);
  const touchTol = a * Math.min(Math.max(Number(settings.cloudTouchToleranceAtrMult ?? 0.60), 0), 2.5);
  const breakTol = a * Math.min(Math.max(Number(settings.cloudBreakToleranceAtrMult ?? 0.12), 0), 1.5);
  const recoveryLookback = Math.min(Math.max(Math.floor(Number(settings.smiRecoveryLookbackCandles || 8)), 1), 30);
  const allowRecentCross = settings.smiAllowRecentRecoveryCross !== false;
  let pullbackIndex = null;
  let cloudTouch = false;
  let cloudBroken = false;
  let lastCloudTouchIndex = null;

  for (let i = start; i <= lastIndex; i += 1) {
    const cur = rows[i];
    const upper = Number(cloud?.upper?.[i]);
    const lower = Number(cloud?.lower?.[i]);
    const v = Number(smi[i]);
    if (![upper, lower, v].every(Number.isFinite)) continue;
    const touched = direction === 'LONG'
      ? Number(cur.low) <= upper + touchTol && Number(cur.close) >= lower - breakTol
      : Number(cur.high) >= lower - touchTol && Number(cur.close) <= upper + breakTol;
    const broken = direction === 'LONG'
      ? Number(cur.close) < lower - breakTol
      : Number(cur.close) > upper + breakTol;
    const isPullback = direction === 'LONG' ? v < os : v > ob;
    if (isPullback) {
      // Use the most recent valid pullback, not the first old pullback in the window.
      pullbackIndex = i;
      cloudTouch = false;
      cloudBroken = false;
      lastCloudTouchIndex = null;
    }
    if (pullbackIndex !== null && i >= pullbackIndex) {
      if (touched) { cloudTouch = true; lastCloudTouchIndex = i; }
      if (broken) cloudBroken = true;
    }
  }

  const nowSmi = Number(smi[lastIndex]);
  const nowSig = Number(sig[lastIndex]);
  const cur = rows[lastIndex] || {};
  const candleColorPass = direction === 'LONG' ? Number(cur.close) > Number(cur.open) : Number(cur.close) < Number(cur.open);
  const strictCandle = settings.requireSmiCandleColor !== false;
  let cross = false;
  let crossIndex = null;
  let crossSmi = nowSmi;
  let crossSig = nowSig;
  const scanStart = allowRecentCross ? Math.max(1, lastIndex - recoveryLookback + 1) : lastIndex;
  for (let i = scanStart; i <= lastIndex; i += 1) {
    const prevSmi = Number(smi[i - 1]);
    const prevSig = Number(sig[i - 1]);
    const curSmi = Number(smi[i]);
    const curSig = Number(sig[i]);
    if (![prevSmi, prevSig, curSmi, curSig].every(Number.isFinite)) continue;
    const crossed = direction === 'LONG'
      ? prevSmi <= prevSig && curSmi > curSig && curSmi > os
      : prevSmi >= prevSig && curSmi < curSig && curSmi < ob;
    if (crossed && (pullbackIndex === null || i >= pullbackIndex)) {
      cross = true;
      crossIndex = i;
      crossSmi = curSmi;
      crossSig = curSig;
    }
  }

  const trendPass = direction === 'LONG'
    ? Number(cloud?.fast?.[lastIndex]) > Number(cloud?.slow?.[lastIndex]) && Number(cur.close) > Number(cloud?.upper?.[lastIndex]) - touchTol
    : Number(cloud?.fast?.[lastIndex]) < Number(cloud?.slow?.[lastIndex]) && Number(cur.close) < Number(cloud?.lower?.[lastIndex]) + touchTol;

  // Practical fallback: if the wick missed the cloud by a tiny amount but price pulled back close to it, allow it.
  const fallbackTouch = settings.practicalCloudTouchFallback !== false && pullbackIndex !== null && (() => {
    const from = Math.max(pullbackIndex, lastIndex - window + 1);
    for (let i = from; i <= lastIndex; i += 1) {
      const r = rows[i];
      const upper = Number(cloud?.upper?.[i]);
      const lower = Number(cloud?.lower?.[i]);
      if (![upper, lower].every(Number.isFinite)) continue;
      if (direction === 'LONG' && Number(r.low) <= upper + touchTol * 1.5 && Number(r.close) >= lower - breakTol) return true;
      if (direction === 'SHORT' && Number(r.high) >= lower - touchTol * 1.5 && Number(r.close) <= upper + breakTol) return true;
    }
    return false;
  })();
  const touchPass = settings.requireCloudTouch === false || cloudTouch || fallbackTouch;
  const candlePass = strictCandle ? candleColorPass : true;
  const pass = Boolean(trendPass && pullbackIndex !== null && touchPass && !cloudBroken && cross && candlePass);
  const barsSinceCross = crossIndex === null ? null : lastIndex - crossIndex;
  return {
    pass,
    trendPass,
    pullbackIndex,
    cloudTouch: Boolean(cloudTouch || fallbackTouch),
    strictCloudTouch: cloudTouch,
    fallbackCloudTouch: Boolean(fallbackTouch && !cloudTouch),
    lastCloudTouchIndex,
    cloudBroken,
    cross,
    crossIndex,
    barsSinceCross,
    candleColorPass,
    candleColorSoftPass: !strictCandle || candleColorPass,
    smiValue: pct(nowSmi),
    smiSignal: pct(nowSig),
    crossSmi: pct(crossSmi),
    crossSignal: pct(crossSig),
    barsSincePullback: pullbackIndex === null ? null : lastIndex - pullbackIndex,
    reason: pass
      ? `${direction} SMI pullback continuation confirmed: recovery cross ${barsSinceCross === 0 ? 'on latest candle' : `${barsSinceCross} candle(s) ago`} after cloud-touch pullback. SMI=${pct(nowSmi)} signal=${pct(nowSig)}.`
      : `WAIT ${direction}: trend=${trendPass} pullback=${pullbackIndex !== null} cloudTouch=${touchPass} cloudBroken=${cloudBroken} cross=${cross}${barsSinceCross !== null ? `(${barsSinceCross} ago)` : ''} candleColor=${!strictCandle || candleColorPass}; SMI=${pct(nowSmi)} signal=${pct(nowSig)}.`
  };
}

function cloudSwingStop(symbol, rows = [], direction = 'LONG', fromIndex = 0, atr = 0, settings = loadSettings()) {
  const lastIndex = rows.length - 1;
  const lookback = Math.min(Math.max(Math.floor(Number(settings.slSwingLookback || 24)), 6), 120);
  const start = Math.max(0, Math.min(Number(fromIndex || lastIndex - lookback + 1), lastIndex), lastIndex - lookback + 1);
  return swingStopForRetest(symbol, rows, direction, start, lastIndex, atr, settings);
}

function calculateSmiEmaCloudSignalForResolution(symbol, resolution = '5m', price = 0, atr = 0, settings = loadSettings()) {
  const res = normalizeResolution(resolution);
  const rows = getCachedCandles(symbol, res).filter(c => c && Number.isFinite(c.open) && Number.isFinite(c.high) && Number.isFinite(c.low) && Number.isFinite(c.close));
  const p = Number(price || rows.at(-1)?.close || 0);
  const a = Math.max(Number(atr || atrFromCandles(rows, Number(settings.atrPeriod || 14)) || 0), p * 0.001, 0.00000001);
  const fastLen = Math.min(Math.max(Math.floor(Number(settings.emaCloudFastLength || 50)), 5), 300);
  const slowLen = Math.min(Math.max(Math.floor(Number(settings.emaCloudSlowLength || 200)), fastLen + 1), 500);
  const minBars = Math.max(slowLen + 25, Math.floor(Number(settings.smiPercentKLength || 10)) + Math.floor(Number(settings.smiSignalLength || 10)) + 25, 120);
  const style = tradeStyleForResolution(res);
  if (!rows.length || rows.length < minBars) return { ready: false, pass: false, entrySide: '', timeframe: res, tradeStyle: style, source: 'SMI_EMA_CLOUD_TPSL_LOCAL', entryModel: 'SMI_EMA_CLOUD_TPSL', reason: `Need ${minBars} closed ${res} candles for ${style} SMI + EMA50/200 cloud warmup.` };
  const smi = smiFromCandles(rows, settings);
  const cloud = emaCloudFromCandles(rows, settings);
  const lastIndex = rows.length - 1;
  const close = Number(rows.at(-1)?.close || p);
  const tp1R = Math.min(Math.max(Number(settings.tp1TriggerR || 1), 0.5), 3);
  const tp2R = Math.min(Math.max(Number(settings.tp2TriggerR || 2), tp1R), 5);
  const tp3R = Math.min(Math.max(Number(settings.tp3TriggerR || settings.rewardTargetR || 2.5), tp2R), 6);
  function side(direction) {
    const long = direction === 'LONG';
    const setup = findSmiPullbackContinuation(symbol, rows, direction, smi, cloud, a, settings);
    const from = setup.pullbackIndex ?? Math.max(0, lastIndex - Number(settings.slSwingLookback || 24));
    const stop = cloudSwingStop(symbol, rows, direction, from, a, settings);
    const risk = Math.abs(close - Number(stop.sl));
    const tp1 = roundCoin(symbol, long ? close + risk * tp1R : close - risk * tp1R);
    const tp2 = roundCoin(symbol, long ? close + risk * tp2R : close - risk * tp2R);
    const tp3 = roundCoin(symbol, long ? close + risk * tp3R : close - risk * tp3R);
    const fast = Number(cloud.fast[lastIndex]);
    const slow = Number(cloud.slow[lastIndex]);
    return { pass: Boolean(setup.pass && risk > 0), timeframe: res, tradeStyle: style, setup, smiValue: setup.smiValue, smiSignal: setup.smiSignal, emaFast: roundCoin(symbol, fast), emaSlow: roundCoin(symbol, slow), cloudTop: roundCoin(symbol, cloud.upper[lastIndex]), cloudBottom: roundCoin(symbol, cloud.lower[lastIndex]), trendPass: setup.trendPass, sl: stop.sl, tp1, tp2, tp3, invalidationLevel: stop.sl, dynamicTargetR: tp3R, conditions: { trendCloud: Boolean(setup.trendPass), smiPullback: setup.pullbackIndex !== null, cloudTouch: Boolean(setup.cloudTouch || settings.requireCloudTouch === false), cloudNotBroken: !setup.cloudBroken, smiRecoveryCross: Boolean(setup.cross), candleColor: Boolean(setup.candleColorPass || settings.requireSmiCandleColor === false), longTrend: long ? Boolean(setup.trendPass) : false, shortTrend: long ? false : Boolean(setup.trendPass) }, detail: `${style} ${res} ${direction}: EMA${fastLen}/${slowLen} fast=${roundCoin(symbol, fast)} slow=${roundCoin(symbol, slow)}; ${setup.reason}; SL=${stop.sl} TP1=${tp1} TP2=${tp2} TP3=${tp3}` };
  }
  const long = side('LONG');
  const short = side('SHORT');
  const entrySide = long.pass ? 'LONG' : short.pass ? 'SHORT' : '';
  const chosen = entrySide === 'LONG' ? long : entrySide === 'SHORT' ? short : (long.setup?.pullbackIndex !== null ? long : short.setup?.pullbackIndex !== null ? short : long);
  const signalGrade = entrySide ? 'A' : 'WAIT';
  const baseConfluence = chosen ? { score: entrySide ? 9 : 0, maxScore: 10, confirmations: entrySide ? 5 : 0, pass: Boolean(entrySide), structure: { pass: Boolean(chosen.conditions?.cloudTouch), reason: chosen.setup?.reason || 'Waiting for SMI pullback/recovery.' }, reason: chosen.detail } : null;
  const compat = { enabled: false, ready: true, pass: Boolean(entrySide), long: { pass: long.pass, confluence: entrySide === 'LONG' ? baseConfluence : null, sl: long.sl, dynamicTargetR: long.dynamicTargetR, detail: long.detail, priceAction: { pass: long.conditions.smiRecoveryCross, reason: long.setup.reason }, marketMemoryPass: true, srVolumePass: true }, short: { pass: short.pass, confluence: entrySide === 'SHORT' ? baseConfluence : null, sl: short.sl, dynamicTargetR: short.dynamicTargetR, detail: short.detail, priceAction: { pass: short.conditions.smiRecoveryCross, reason: short.setup.reason }, marketMemoryPass: true, srVolumePass: true }, reason: 'Legacy compatibility container only; active strategy is SMI + EMA50/200 cloud + TP/SL visual engine.' };
  const reason = entrySide ? `${signalGrade} ${style} ${res} SMI_EMA_CLOUD_TPSL ${entrySide} confirmed on closed Delta OHLC. ${chosen.detail}` : `WAIT ${style} ${res} SMI_EMA_CLOUD_TPSL. Long: ${long.detail}; Short: ${short.detail}`;
  return { ready: true, pass: Boolean(entrySide), entrySide, timeframe: res, tradeStyle: style, entryModel: 'SMI_EMA_CLOUD_TPSL', source: 'SMI_EMA_CLOUD_TPSL_LOCAL', signalGrade, strategyName: 'SMI + EMA50/200 Cloud + Smart TP/SL Multi-Horizon', emaFast: chosen.emaFast, emaSlow: chosen.emaSlow, cloudTop: chosen.cloudTop, cloudBottom: chosen.cloudBottom, smiValue: chosen.smiValue, smiSignal: chosen.smiSignal, long, short, institutionalEma: compat, invalidationLevel: chosen?.sl || null, tp1: chosen?.tp1 || null, tp2: chosen?.tp2 || null, tp3: chosen?.tp3 || null, dynamicTargetR: chosen?.dynamicTargetR || Number(settings.rewardTargetR || 2.5), conditions: chosen?.conditions || {}, setup: chosen?.setup || null, reason, localApproximation: false };
}

function calculateSmiEmaCloudSignal(symbol, history, price, atr, settings = loadSettings()) {
  const frames = settings.multiHorizonScanEnabled === false ? [normalizeResolution(settings.executionTimeframe || '5m')] : strategyTimeframes(settings);
  const signals = frames.map(res => calculateSmiEmaCloudSignalForResolution(symbol, res, price, atr, settings));
  const passed = signals.filter(x => x && x.pass && x.entrySide);
  if (passed.length) { passed.sort((a, b) => horizonRank(a.timeframe) - horizonRank(b.timeframe)); const chosen = passed[0]; return { ...chosen, selectedTimeframe: chosen.timeframe, selectedHorizon: chosen.tradeStyle, byTimeframe: signals, reason: `${chosen.reason} Multi-horizon SMI cloud scan checked ${frames.join(' / ')}; selected ${chosen.tradeStyle} ${chosen.timeframe}.` }; }
  const readySignals = signals.filter(x => x && x.ready !== false);
  const chosen = readySignals.find(x => x.long?.conditions?.smiPullback || x.short?.conditions?.smiPullback) || readySignals[0] || signals[0] || null;
  if (!chosen) return { ready: false, pass: false, entrySide: '', source: 'SMI_EMA_CLOUD_TPSL_LOCAL', entryModel: 'SMI_EMA_CLOUD_TPSL', reason: 'No strategy timeframes available for SMI + EMA cloud scan.', byTimeframe: [] };
  return { ...chosen, selectedTimeframe: chosen.timeframe, selectedHorizon: chosen.tradeStyle, byTimeframe: signals, reason: `WAIT MULTI-HORIZON SMI_EMA_CLOUD_TPSL. Checked ${frames.join(' / ')}. ${signals.map(x => `${x.tradeStyle || '-'} ${x.timeframe || '-'}: ${x.pass ? 'PASS' : x.ready === false ? 'WARMUP' : 'WAIT'}`).join(' | ')}. ${chosen.reason || ''}` };
}


function tradeStyleForResolution(resolution = '5m') {
  const r = normalizeResolution(resolution);
  if (['1m', '3m', '5m'].includes(r)) return 'SCALP';
  if (['15m', '30m'].includes(r)) return 'INTRA';
  return 'SWING';
}

function horizonRank(resolution = '5m') {
  const order = { '1m': 0, '3m': 1, '5m': 2, '15m': 3, '30m': 4, '1h': 5, '2h': 6, '4h': 7, '1d': 8 };
  const r = normalizeResolution(resolution);
  return Object.prototype.hasOwnProperty.call(order, r) ? order[r] : 2;
}

function strategyTimeframes(settings = loadSettings()) {
  const raw = Array.isArray(settings.strategyTimeframes) ? settings.strategyTimeframes : DEFAULT_SETTINGS.strategyTimeframes;
  const cleaned = (raw || ['5m', '15m', '1h']).map(normalizeResolution).filter(r => ['5m','15m','30m','1h','2h','4h'].includes(r));
  const unique = Array.from(new Set(cleaned.length ? cleaned : ['5m','15m','1h']));
  return unique.sort((a, b) => horizonRank(a) - horizonRank(b));
}

function calculateWaveTrendBreakRetestSignalForResolution(symbol, resolution = '5m', price = 0, atr = 0, settings = loadSettings()) {
  const res = normalizeResolution(resolution);
  const rows = getCachedCandles(symbol, res).filter(c => c && Number.isFinite(c.open) && Number.isFinite(c.high) && Number.isFinite(c.low) && Number.isFinite(c.close));
  const p = Number(price || rows.at(-1)?.close || 0);
  const a = Math.max(Number(atr || atrFromCandles(rows, Number(settings.atrPeriod || 14)) || 0), p * 0.001, 0.00000001);
  const trendLen = Math.min(Math.max(Math.floor(Number(settings.ma1Length || settings.trendMaPeriod || 100)), 20), 300);
  const minBars = Math.max(trendLen + 25, Math.floor(Number(settings.breakRetestPivotLookback || 20)) * 2 + 30, 90);
  const style = tradeStyleForResolution(res);
  if (!rows.length || rows.length < minBars) {
    return { ready: false, pass: false, entrySide: '', timeframe: res, tradeStyle: style, source: 'SMI_EMA_CLOUD_TPSL_LOCAL', entryModel: 'SMI_EMA_CLOUD_TPSL', reason: `Need ${minBars} closed ${res} candles for ${style} WaveTrend + Break/Retest + MA100 warmup.` };
  }
  const closes = rows.map(c => Number(c.close));
  const maType = String(settings.ma1Type || settings.trendMaType || 'SMA').toUpperCase() === 'EMA' ? 'EMA' : 'SMA';
  const maSeries = maType === 'EMA' ? emaSeries(closes, trendLen) : smaSeries(closes, trendLen);
  const ma100 = Number(maSeries.at(-1));
  const maTolerance = a * Math.min(Math.max(Number(settings.trendMaToleranceAtrMult || 0.15), 0), 1.5);
  const wt = waveTrendFromCandles(rows, settings);
  const levels = pivotLevelsForBreakRetest(rows, settings.breakRetestPivotLookback || 20);
  const lastIndex = rows.length - 1;

  function side(direction) {
    const long = direction === 'LONG';
    const wtEvent = recentWaveTrendEvent(wt, direction, settings);
    const levelPick = wtEvent.ok
      ? chooseBreakRetestLevel(symbol, rows, direction, long ? levels.resistance : levels.support, wtEvent.index, a, settings)
      : { level: null, br: { pass: false, reason: 'Waiting for WaveTrend OB/OS signal.' }, candidatesChecked: 0 };
    const levelObj = levelPick.level;
    const br = levelPick.br;
    const close = Number(rows.at(-1)?.close || p);
    const trendPass = Number.isFinite(ma100) ? (long ? close >= ma100 - maTolerance : close <= ma100 + maTolerance) : false;
    const retestIdx = Number.isInteger(br.retestIndex) ? br.retestIndex : lastIndex;
    const stop = swingStopForRetest(symbol, rows, direction, wtEvent.index || Math.max(0, lastIndex - 24), retestIdx, a, settings);
    const risk = Math.abs(close - Number(stop.sl));
    const tp1R = Math.min(Math.max(Number(settings.tp1TriggerR || 1), 1), 3);
    const targetR = Math.min(Math.max(Number(settings.rewardTargetR || 1.5), 1.2), 6);
    const tp1 = roundCoin(symbol, long ? close + risk * tp1R : close - risk * tp1R);
    const tp2 = roundCoin(symbol, long ? close + risk * targetR : close - risk * targetR);
    const pass = Boolean(wtEvent.ok && levelObj && br.pass && trendPass && risk > 0);
    return {
      pass,
      timeframe: res,
      tradeStyle: style,
      wtEvent,
      level: levelObj ? { ...levelObj, level: roundCoin(symbol, levelObj.level) } : null,
      breakRetest: br,
      levelCandidatesChecked: levelPick.candidatesChecked || 0,
      ma100: roundCoin(symbol, ma100),
      maType,
      trendPass,
      sl: stop.sl,
      tp1,
      tp2,
      invalidationLevel: stop.sl,
      dynamicTargetR: targetR,
      conditions: {
        waveTrendExtreme: Boolean(wtEvent.ok),
        supportResistanceExists: Boolean(levelObj),
        breakout: Boolean(br.breakIndex !== null && br.breakIndex !== undefined),
        retest: Boolean(br.pass),
        ma100Trend: Boolean(trendPass),
        longTrend: long ? Boolean(trendPass) : false,
        shortTrend: long ? false : Boolean(trendPass)
      },
      detail: `${style} ${res} ${direction}: WT=${wtEvent.type}${wtEvent.ok ? ` ${wtEvent.barsAgo} bars ago` : ''}; ${long ? 'resistance' : 'support'}=${levelObj ? roundCoin(symbol, levelObj.level) : '-'}; checkedLevels=${levelPick.candidatesChecked || 0}; ${br.reason}; ${maType}${trendLen}=${roundCoin(symbol, ma100)} trendPass=${trendPass}; SL=${stop.sl} TP1=${tp1} TP2=${tp2}`
    };
  }

  const long = side('LONG');
  const short = side('SHORT');
  const entrySide = long.pass ? 'LONG' : short.pass ? 'SHORT' : '';
  const chosen = entrySide === 'LONG' ? long : entrySide === 'SHORT' ? short : (long.wtEvent.ok ? long : short.wtEvent.ok ? short : long);
  const signalGrade = entrySide ? (chosen.breakRetest?.retestBarsAgo === 0 ? 'A+' : 'A') : 'WAIT';
  const reason = entrySide
    ? `${signalGrade} ${style} ${res} SMI_EMA_CLOUD_TPSL ${entrySide} confirmed on closed Delta OHLC. ${chosen.detail}`
    : `WAIT ${style} ${res} SMI_EMA_CLOUD_TPSL. Long: ${long.detail}; Short: ${short.detail}`;
  const baseConfluence = chosen ? {
    score: entrySide ? (signalGrade === 'A+' ? 10 : 8) : 0,
    maxScore: 10,
    confirmations: entrySide ? 4 : 0,
    pass: Boolean(entrySide),
    structure: { pass: Boolean(chosen.breakRetest?.pass), reason: chosen.breakRetest?.reason || 'Waiting for break/retest.' },
    reason: chosen.detail
  } : null;
  const institutionalCompat = {
    enabled: false,
    ready: true,
    pass: Boolean(entrySide),
    long: { pass: long.pass, confluence: entrySide === 'LONG' ? baseConfluence : null, sl: long.sl, dynamicTargetR: long.dynamicTargetR, detail: long.detail, priceAction: { pass: long.conditions.retest, reason: long.breakRetest.reason }, marketMemoryPass: true, srVolumePass: true },
    short: { pass: short.pass, confluence: entrySide === 'SHORT' ? baseConfluence : null, sl: short.sl, dynamicTargetR: short.dynamicTargetR, detail: short.detail, priceAction: { pass: short.conditions.retest, reason: short.breakRetest.reason }, marketMemoryPass: true, srVolumePass: true },
    reason: 'Legacy compatibility container only; Market Memory/EMA50/MACD gates are not used in V72.'
  };
  return {
    ready: true,
    pass: Boolean(entrySide),
    entrySide,
    timeframe: res,
    tradeStyle: style,
    entryModel: 'SMI_EMA_CLOUD_TPSL',
    source: 'SMI_EMA_CLOUD_TPSL_LOCAL',
    signalGrade,
    strategyName: 'Enhanced WaveTrend + Break/Retest + MA100 Multi-Horizon',
    ma100: chosen.ma100,
    maType: chosen.maType,
    wtValue: chosen.wtEvent?.value,
    wtSignal: chosen.wtEvent?.signal,
    long,
    short,
    institutionalEma: institutionalCompat,
    invalidationLevel: chosen?.sl || null,
    tp1: chosen?.tp1 || null,
    tp2: chosen?.tp2 || null,
    dynamicTargetR: chosen?.dynamicTargetR || Number(settings.rewardTargetR || 1.5),
    conditions: chosen?.conditions || {},
    breakRetest: chosen?.breakRetest || null,
    selectedLevel: chosen?.level || null,
    reason,
    localApproximation: false
  };
}

function calculateWaveTrendBreakRetestSignal(symbol, history, price, atr, settings = loadSettings()) {
  const frames = settings.multiHorizonScanEnabled === false ? [normalizeResolution(settings.executionTimeframe || '5m')] : strategyTimeframes(settings);
  const signals = frames.map(res => calculateWaveTrendBreakRetestSignalForResolution(symbol, res, price, atr, settings));
  const passed = signals.filter(x => x && x.pass && x.entrySide);
  if (passed.length) {
    // Use the shortest valid clean setup first so a scalp can start immediately; trade management can later promote it to intra/swing.
    passed.sort((a, b) => horizonRank(a.timeframe) - horizonRank(b.timeframe) || Number(a.breakRetest?.retestBarsAgo ?? 999) - Number(b.breakRetest?.retestBarsAgo ?? 999));
    const chosen = passed[0];
    return {
      ...chosen,
      selectedTimeframe: chosen.timeframe,
      selectedHorizon: chosen.tradeStyle,
      byTimeframe: signals,
      reason: `${chosen.reason} Multi-horizon scan checked ${frames.join(' / ')}; selected ${chosen.tradeStyle} ${chosen.timeframe}.`
    };
  }
  const readySignals = signals.filter(x => x && x.ready !== false);
  const chosen = readySignals.find(x => x.long?.conditions?.waveTrendExtreme || x.short?.conditions?.waveTrendExtreme) || readySignals[0] || signals[0] || null;
  if (!chosen) {
    return { ready: false, pass: false, entrySide: '', source: 'SMI_EMA_CLOUD_TPSL_LOCAL', entryModel: 'SMI_EMA_CLOUD_TPSL', reason: 'No strategy timeframes available for WaveTrend + Break/Retest scan.', byTimeframe: [] };
  }
  return {
    ...chosen,
    selectedTimeframe: chosen.timeframe,
    selectedHorizon: chosen.tradeStyle,
    byTimeframe: signals,
    reason: `WAIT MULTI-HORIZON SMI_EMA_CLOUD_TPSL. Checked ${frames.join(' / ')}. ${signals.map(x => `${x.tradeStyle || '-'} ${x.timeframe || '-'}: ${x.pass ? 'PASS' : x.ready === false ? 'WARMUP' : 'WAIT'}`).join(' | ')}. ${chosen.reason || ''}`
  };
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
    return { ready: false, pass: false, entrySide: '', source: 'DELTA_OHLC_INSTITUTIONAL_EMA_MACD_MTF', entryModel, reason: `Need ${minBars} closed 5m candles for MACD/MTF warmup`, localApproximation: !liveCloses.length };
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
    return { ready: false, pass: false, entrySide: '', source: 'DELTA_OHLC_INSTITUTIONAL_EMA_MACD_MTF', entryModel, reason: 'MACD 12/26/9 warming up' };
  }

  const institutional = calculateInstitutionalEmaMtfLocal(symbol, history, p, a, settings);

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

  function finishPlan(direction, rawSwing, trendOk, divergenceOk, divergence, baseConditions, detail, institutionalSide = null) {
    let rawSl = Number(institutionalSide?.sl || 0) || (direction === 'LONG' ? rawSwing - buffer : rawSwing + buffer);
    if (direction === 'LONG') {
      if (p - rawSl < minDistance) rawSl = p - minDistance;
      if (p - rawSl > maxDistance) rawSl = p - maxDistance;
    } else {
      if (rawSl - p < minDistance) rawSl = p + minDistance;
      if (rawSl - p > maxDistance) rawSl = p + maxDistance;
    }
    const sl = roundCoin(symbol, rawSl);
    const risk = Math.abs(p - sl);
    const targetR = Math.min(Math.max(Number(institutionalSide?.dynamicTargetR || settings.rewardTargetR || 2), 2), Math.max(2, Number(settings.dynamicTpMaxR || 5)));
    const tp2 = roundCoin(symbol, direction === 'LONG' ? p + risk * targetR : p - risk * targetR);
    const tp1 = roundCoin(symbol, direction === 'LONG' ? p + risk * Math.max(1, Number(settings.tp1TriggerR || 1)) : p - risk * Math.max(1, Number(settings.tp1TriggerR || 1)));
    const instConditions = institutionalSide ? {
      institutionalPass: Boolean(institutionalSide.pass),
      institutionalExecStack: Boolean(institutionalSide.execStack),
      institutionalHtfStack: Boolean(institutionalSide.htfStack),
      institutionalPullback: Boolean(institutionalSide.pullback?.pass),
      institutionalPriceAction: Boolean(institutionalSide.priceAction?.pass),
      institutionalHtfMacd: Boolean(institutionalSide.htfMacd),
      institutionalStrongMacd: Boolean(institutionalSide.strongMacd),
      confluenceScore: Number(institutionalSide.confluence?.score || 0),
      confluencePass: Boolean(institutionalSide.confluence?.pass),
      structureLocationPass: Boolean(institutionalSide.confluence?.structure?.pass),
      institutionalPattern: institutionalSide.priceAction?.pattern || '-',
      srVolumePass: Boolean(institutionalSide.srVolumePass || institutionalSide.srVolume?.pass),
      previousDayPass: Boolean(institutionalSide.previousDayPass),
      mtfSupportResistancePass: Boolean(institutionalSide.mtfSupportResistancePass),
      volumeFlowPass: Boolean(institutionalSide.volumeFlowPass)
    } : {};
    return { sl, tp1, tp2, invalidationLevel: sl, divergence, dynamicTargetR: targetR, institutional: institutionalSide, conditions: { ...baseConditions, ...instConditions, [direction === 'LONG' ? 'longTrend' : 'shortTrend']: trendOk, divergenceOk }, detail };
  }


  function firstBlockerForSignal(plan, direction) {
    const c = plan?.conditions || {};
    const inst = plan?.institutional || plan?.conditions?.institutional || {};
    const sr = inst?.srVolume || plan?.institutional?.srVolume || {};
    if (!c[direction === 'LONG' ? 'longTrend' : 'shortTrend']) return '15m EMA50 vs 1h EMA50 direction not aligned';
    if (c.institutionalPass === false) {
      if (inst?.marketMemoryPass === false) return 'Market Memory cloud / similar-history gate not passed';
      if (inst?.priceAction?.pass === false || c.institutionalPriceAction === false) return `No side-correct 5m ${direction === 'LONG' ? 'bullish' : 'bearish'} trigger candle`;
      if (inst?.srVolumePass === false || c.srVolumePass === false) {
        if (sr?.previousDayPass === false || c.previousDayPass === false) return 'Previous-day candle context not aligned';
        if (sr?.srPass === false || c.mtfSupportResistancePass === false) return `S/R votes below rule (${sr?.srVotePassCount ?? '-'}/${sr?.srReadyCount ?? '-'})`;
        if (sr?.volumePass === false || c.volumeFlowPass === false) return 'Volume flow not aligned';
        return 'MTF S/R + volume context not passed';
      }
      return 'Market Memory / S/R / volume institutional layer not passed';
    }
    if (c.momentumOk === false) return '5m MACD timing not aligned';
    if (c.timingOk === false) return 'No recent MACD cross / histogram timing';
    return plan?.detail || 'No confirmed 5m entry trigger yet';
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
    const institutionalSide = institutional.long || {};
    const institutionalPass = settings.institutionalEmaEnabled === false || Boolean(institutionalSide.pass);
    const pass = longTrend && divergenceOk && zeroOk && histColorChange && crossover && institutionalPass;
    const div = { first: aLow, second: bLow, priceFirst: roundCoin(symbol, aLow.value), priceSecond: roundCoin(symbol, bLow.value), macdFirst: pct(macd.lineSeries[aLow.index]), macdSecond: pct(macd.lineSeries[bLow.index]) };
    const plan = finishPlan('LONG', institutionalSide.swing || Math.min(aLow.value, bLow.value), longTrend, divergenceOk, div, { priceLowerLow, macdHigherLow, zeroOk, histColorChange, crossover, recentCrossover: cross.ok, crossBarsAgo: cross.barsAgo }, `STRICT longTrend=${longTrend} priceLL=${priceLowerLow} macdHL=${macdHigherLow} zeroBelow=${zeroOk} histColorChange=${histColorChange} bullishCross=${crossover} institutional=${institutionalPass} ${institutionalSide.detail || ''}`, institutionalSide);
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
    const institutionalSide = institutional.short || {};
    const institutionalPass = settings.institutionalEmaEnabled === false || Boolean(institutionalSide.pass);
    const pass = shortTrend && divergenceOk && zeroOk && histColorChange && crossover && institutionalPass;
    const div = { first: aHigh, second: bHigh, priceFirst: roundCoin(symbol, aHigh.value), priceSecond: roundCoin(symbol, bHigh.value), macdFirst: pct(macd.lineSeries[aHigh.index]), macdSecond: pct(macd.lineSeries[bHigh.index]) };
    const plan = finishPlan('SHORT', institutionalSide.swing || Math.max(aHigh.value, bHigh.value), shortTrend, divergenceOk, div, { priceHigherHigh, macdLowerHigh, zeroOk, histColorChange, crossover, recentCrossover: cross.ok, crossBarsAgo: cross.barsAgo }, `STRICT shortTrend=${shortTrend} priceHH=${priceHigherHigh} macdLH=${macdLowerHigh} zeroAbove=${zeroOk} histColorChange=${histColorChange} bearishCross=${crossover} institutional=${institutionalPass} ${institutionalSide.detail || ''}`, institutionalSide);
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
    const institutionalSide = institutional.long || {};
    const institutionalPass = settings.institutionalEmaEnabled === false || Boolean(institutionalSide.pass);
    const momentumOk = Boolean(institutionalSide.macd5Ok || cross.ok);
    const timingOk = Boolean(cross.ok || histColorChange || institutionalSide.confluence?.score >= Number(settings.aPlusConfluenceScore || 10));
    const pass = longTrend && momentumOk && timingOk && zeroPass && divPass && institutionalPass;
    const plan = finishPlan('LONG', institutionalSide.swing || recentSwing('LONG'), longTrend, divergenceOk, strictL.divergence || null, {
      priceLowerLow: Boolean(strictL.conditions?.priceLowerLow),
      macdHigherLow: Boolean(strictL.conditions?.macdHigherLow),
      zeroOk,
      zeroPass,
      histColorChange,
      crossover: cross.ok,
      recentCrossover: cross.ok,
      crossBarsAgo: cross.barsAgo,
      practicalTrigger: true,
      momentumOk,
      timingOk
    }, `PRACTICAL longTrend=${longTrend} histColorChange=${histColorChange} bullishCrossRecent=${cross.ok}${cross.ok ? `(${cross.barsAgo} bars ago)` : ''} zeroBelow=${zeroOk}${zeroLineMode === 'hard' ? ' hard' : ' soft'} divergence=${divergenceOk}${requireDivergenceForEntry ? ' required' : ' optional'} institutional=${institutionalPass} ${institutionalSide.detail || ''}`, institutionalSide);
    return { pass, ...plan };
  }

  function practicalShort() {
    const cross = recentCrossover('SHORT');
    const histColorChange = histChangedRecent();
    const zeroOk = zeroSideHeld(macd.lineSeries, macd.signalSeries, Math.max(0, i - histLookback), i, 'SHORT');
    const divergenceOk = Boolean(strictS.conditions?.priceHigherHigh && strictS.conditions?.macdLowerHigh);
    const zeroPass = zeroLineMode === 'hard' ? zeroOk : true;
    const divPass = requireDivergenceForEntry ? divergenceOk : true;
    const institutionalSide = institutional.short || {};
    const institutionalPass = settings.institutionalEmaEnabled === false || Boolean(institutionalSide.pass);
    const momentumOk = Boolean(institutionalSide.macd5Ok || cross.ok);
    const timingOk = Boolean(cross.ok || histColorChange || institutionalSide.confluence?.score >= Number(settings.aPlusConfluenceScore || 10));
    const pass = shortTrend && momentumOk && timingOk && zeroPass && divPass && institutionalPass;
    const plan = finishPlan('SHORT', institutionalSide.swing || recentSwing('SHORT'), shortTrend, divergenceOk, strictS.divergence || null, {
      priceHigherHigh: Boolean(strictS.conditions?.priceHigherHigh),
      macdLowerHigh: Boolean(strictS.conditions?.macdLowerHigh),
      zeroOk,
      zeroPass,
      histColorChange,
      crossover: cross.ok,
      recentCrossover: cross.ok,
      crossBarsAgo: cross.barsAgo,
      practicalTrigger: true,
      momentumOk,
      timingOk
    }, `PRACTICAL shortTrend=${shortTrend} histColorChange=${histColorChange} bearishCrossRecent=${cross.ok}${cross.ok ? `(${cross.barsAgo} bars ago)` : ''} zeroAbove=${zeroOk}${zeroLineMode === 'hard' ? ' hard' : ' soft'} divergence=${divergenceOk}${requireDivergenceForEntry ? ' required' : ' optional'} institutional=${institutionalPass} ${institutionalSide.detail || ''}`, institutionalSide);
    return { pass, ...plan };
  }

  const long = strictMode ? strictL : practicalLong();
  const short = strictMode ? strictS : practicalShort();
  const entrySide = long.pass ? 'LONG' : short.pass ? 'SHORT' : '';
  const chosen = entrySide === 'LONG' ? long : entrySide === 'SHORT' ? short : (longTrend ? long : shortTrend ? short : long);
  const signalGrade = entrySide
    ? ((chosen.conditions?.divergenceOk && chosen.conditions?.zeroOk && chosen.conditions?.histColorChange) ? 'A+' : 'A')
    : (longTrend || shortTrend ? 'WATCH' : 'WAIT');
  const blockedBy = entrySide ? '' : firstBlockerForSignal(longTrend ? long : shortTrend ? short : long, shortTrend ? 'SHORT' : 'LONG');
  const reason = entrySide
    ? `${signalGrade} ${entryModel} ${entrySide} confirmed on closed 5m Delta OHLC; EMA50(15m)=${roundCoin(symbol, ema15)} EMA50(1h)=${roundCoin(symbol, ema1h)} gap=${pct(emaGapPct)}%; Institutional=${chosen.conditions?.institutionalPass ? 'PASS' : 'WAIT'}; divergence=${chosen.conditions?.divergenceOk ? 'BONUS' : 'optional-missing'}; zeroLine=${chosen.conditions?.zeroOk ? 'BONUS' : 'optional-missing'}; ${chosen.detail}; SL=${chosen.sl} TP=${chosen.tp2}`
    : `${signalGrade} ${entryModel}; ${blockedBy ? `Blocked by: ${blockedBy}; ` : ''}EMA50(15m)=${roundCoin(symbol, ema15)} EMA50(1h)=${roundCoin(symbol, ema1h)} gap=${pct(emaGapPct)}%; Institutional=${institutional.ready ? institutional.reason : 'WARMUP'}; long: ${long.detail}; short: ${short.detail}`;

  return {
    ready: true,
    pass: Boolean(entrySide),
    entrySide,
    entryModel,
    strictMode,
    requireDivergenceForEntry,
    zeroLineMode,
    signalGrade,
    blockedBy,
    entrySignalWindowCandles: entryWindow,
    histColorLookback: histLookback,
    source: liveCloses.length ? 'DELTA_OHLC_INSTITUTIONAL_EMA_MACD_MTF' : 'LOCAL_FALLBACK_INSTITUTIONAL_EMA_MACD_MTF',
    ema15: roundCoin(symbol, ema15),
    ema1h: roundCoin(symbol, ema1h),
    emaGapPct: pct(emaGapPct),
    macdLine: pct(macd.line),
    macdSignal: pct(macd.signal),
    macdHistogram: pct(macd.hist),
    macdPreviousHistogram: pct(macd.prevHist),
    institutionalEma: institutional,
    ema13: institutional.ema13 || null,
    ema50: institutional.ema50 || null,
    ema200: institutional.ema200 || null,
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
  const scoreRisk = riskUsdForScore(settings.__currentOpportunityScore);
  if (scoreRisk > 0) return scoreRisk;
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
  if (r === '1w' || r === 'w') return 604800;
  return 300;
}

function normalizeResolution(resolution = '5m') {
  const r = String(resolution || '5m').toLowerCase().trim();
  if (['1m','3m','5m','15m','30m','1h','2h','4h','1d','1w'].includes(r)) return r;
  if (r === '60m') return '1h';
  if (r === 'd') return '1d';
  if (r === 'w') return '1w';
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
      await fetchDeltaCandles(sym, res, settings, res === '1w' ? 260 : res === '1d' ? 365 : res === '1h' ? 720 : 900);
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
    await refreshDeltaCandles(symbol, ['5m','15m','1h','1d','1w'], settings, force);
  }
  return true;
}

function getCachedCandles(symbol, resolution = '5m') {
  const key = candleKey(symbol, resolution);
  return (state.delta.candlesByKey && Array.isArray(state.delta.candlesByKey[key])) ? state.delta.candlesByKey[key] : [];
}


function aggregateCandlesToWeekly(dailyCandles = []) {
  const rows = (dailyCandles || []).filter(c => c && Number.isFinite(c.open) && Number.isFinite(c.high) && Number.isFinite(c.low) && Number.isFinite(c.close) && Number.isFinite(c.time));
  if (!rows.length) return [];
  const weekSec = 7 * 24 * 60 * 60;
  const buckets = new Map();
  for (const c of rows) {
    const t = Number(c.time);
    const d = new Date(t * 1000);
    const day = d.getUTCDay();
    const daysFromMonday = (day + 6) % 7;
    const monday = Math.floor((t - daysFromMonday * 86400) / weekSec) * weekSec;
    const key = monday;
    const b = buckets.get(key) || { time: key, open: Number(c.open), high: Number(c.high), low: Number(c.low), close: Number(c.close), volume: 0, resolution: '1w', syntheticFrom: '1d' };
    if (!buckets.has(key)) b.open = Number(c.open);
    b.high = Math.max(Number(b.high), Number(c.high));
    b.low = Math.min(Number(b.low), Number(c.low));
    b.close = Number(c.close);
    b.volume = Number(b.volume || 0) + Number(c.volume || 0);
    buckets.set(key, b);
  }
  return Array.from(buckets.values()).sort((a, b) => a.time - b.time);
}

function weeklyCandlesForSymbol(symbol, settings = loadSettings()) {
  const direct = getCachedCandles(symbol, '1w');
  if (Array.isArray(direct) && direct.length >= 40) return direct;
  const daily = getCachedCandles(symbol, '1d');
  const aggregated = aggregateCandlesToWeekly(daily);
  return aggregated.length ? aggregated : direct;
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


function memoryCloudVisualSeries(candles = [], settings = loadSettings()) {
  const rows = Array.isArray(candles) ? candles : [];
  const closes = rows.map(c => Number(c.close || 0));
  const len = Math.min(Math.max(Math.floor(Number(settings.institutionalEmaMidPeriod || settings.trendEmaPeriod || 50)), 20), 100);
  const ema = emaSeries(closes, len);
  const tr = rows.map((c, i) => {
    const prevClose = i > 0 ? Number(rows[i - 1].close) : Number(c.close);
    return Math.max(Number(c.high) - Number(c.low), Math.abs(Number(c.high) - prevClose), Math.abs(Number(c.low) - prevClose));
  });
  const atrLen = Math.min(Math.max(Math.floor(Number(settings.atrPeriod || 14)), 5), 50);
  const atr = rmaSeries(tr, atrLen);
  const cloudMult = Math.min(Math.max(Number(settings.marketMemoryCloudAtrMult || 0.75), 0.2), 3);
  const line = ema.map((v, i) => Number.isFinite(v) ? v : null);
  const high = line.map((v, i) => Number.isFinite(v) ? v + Math.max(Number(atr[i] || 0), Math.abs(v) * 0.001) * cloudMult : null);
  const low = line.map((v, i) => Number.isFinite(v) ? v - Math.max(Number(atr[i] || 0), Math.abs(v) * 0.001) * cloudMult : null);
  const regime = line.map((v, i) => {
    if (!Number.isFinite(v)) return 'neutral';
    const prev = i > 0 && Number.isFinite(line[i - 1]) ? line[i - 1] : v;
    return v >= prev ? 'bull' : 'bear';
  });
  return { line, high, low, regime };
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
  const macdDivergenceSignal = calculateSmiKnSmartSignal(symbol, history, price, atrPreview, settings);
  const weeklyBias = assessWeeklyMacroBias(symbol, settings);
  const weeklyPolicyPreview = weeklyPolicyForDirection(weeklyBias, macdDivergenceSignal?.entrySide || '', macdDivergenceSignal, settings);
  if (macdDivergenceSignal && macdDivergenceSignal.pass && macdDivergenceSignal.entrySide && !weeklyPolicyPreview.pass) {
    macdDivergenceSignal.pass = false;
    macdDivergenceSignal.weeklyPolicy = weeklyPolicyPreview;
    macdDivergenceSignal.reason = `${macdDivergenceSignal.reason} WEEKLY_POLICY_BLOCK: ${weeklyPolicyPreview.reason}`;
  } else if (macdDivergenceSignal) {
    macdDivergenceSignal.weeklyPolicy = weeklyPolicyPreview;
  }
  const webhookSarMacd = null;
  const localSarMacd = null;
  const twoPoleSignal = null;
  const breakoutSignal = null;
  const vwapSignal = null;
  const sarMacdSignal = null;
  let decision = macdDivergenceSignal?.pass && macdDivergenceSignal.entrySide ? macdDivergenceSignal.entrySide : 'WAIT';

  const expectedTrend = directionToTrend(decision);
  const hasStrategySignal = Boolean(macdDivergenceSignal?.pass && macdDivergenceSignal.entrySide === decision);
  const strategySignalSource = hasStrategySignal ? 'SMI_KN_PULLBACK_TPSL_LOCAL' : 'NONE';
  const webhookTrend = normalizeTrendValue(webhookField(raw, ['htfTrend', 'htf_trend', 'higherTimeframeTrend', 'higher_timeframe_trend', 'trend1h', 'trend_1h', 'marketStructure', 'market_structure']));
  const htfBias = webhookTrend || structure.trend;
  const aligned = decision === 'WAIT' ? 0 : (hasStrategySignal ? 2 : (htfBias === expectedTrend ? 1 : 0));
  const volume24h = numberFrom(liveTicker?.volume) || numberFrom(liveTicker?.turnover_usd) || 0;
  const openInterest = numberFrom(liveTicker?.oi) || numberFrom(liveTicker?.open_interest) || numberFrom(liveTicker?.open_interest_value) || 0;
  const openInterestRatio = 1; // Delta ticker-level fallback; historical OI is used when available in future data adapters.
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
  if (hasDirection && macdDivergenceSignal?.invalidationLevel && strategySignalSource === 'SMI_KN_PULLBACK_TPSL_LOCAL') {
    technicalStop = technicalStopForDirection(symbol, decision, price, atr, history, settings);
    technicalStop = { ...technicalStop, sl: macdDivergenceSignal.invalidationLevel, reason: `KN Smart ATR TP/SL: ${macdDivergenceSignal.reason}` };
  }

  state.market[symbol] = { price, prevPrice: previous, atr, relVolume: 1 + Math.abs(volumeSeed), fundingRate, source, macd, structure, supportResistance, weeklyBias, macdDivergenceSignal, sarMacdSignal, twoPoleSignal, breakoutSignal, vwapSignal };

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
    weeklyBias,
    weeklyPolicy: weeklyPolicyPreview,
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


function closedOhlcQualityForExecution(symbol, settings = loadSettings()) {
  const sym = String(symbol || '').toUpperCase();
  const slowLen = Math.min(Math.max(Math.floor(Number(settings.emaCloudSlowLength || 200)), 51), 500);
  const minExec = Math.max(slowLen + 25, 240);
  const frames = settings.multiHorizonScanEnabled === false ? [normalizeResolution(settings.executionTimeframe || '5m')] : strategyTimeframes(settings);
  const checks = frames.map(res => {
    const candles = getCachedCandles(sym, res);
    const count = Array.isArray(candles) ? candles.length : 0;
    const last = count ? candles[count - 1] : null;
    const validLast = Boolean(last && Number.isFinite(last.open) && Number.isFinite(last.high) && Number.isFinite(last.low) && Number.isFinite(last.close));
    return { res, min: minExec, role: 'SMI_EMA_CLOUD_ENTRY', count, validLast, pass: count >= minExec && validLast };
  });
  const anyReady = checks.some(x => x.pass);
  return {
    pass: anyReady,
    detail: anyReady
      ? `OK: V76 has closed OHLC ready for ${checks.filter(x => x.pass).map(x => `${x.res}=${x.count}`).join(', ')}.`
      : `Blocked: V76 requires enough closed Delta OHLC before auto-entry. ${checks.map(x => `${x.res}=${x.count}/${x.min}`).join(', ')}. Do not trade synthetic/ticker-only fallback.`,
    checks
  };
}
function passFail(profile, settings, wallet, trades) {
  const gates = [];
  const direction = profile.decision;
  const hasDirection = direction === 'LONG' || direction === 'SHORT';
  const oneAssetOpen = activeTradeExists(trades, profile.symbol);
  const clusterOpen = settings.maxOneTradePerCorrelationCluster !== false && activeClusterExists(trades, profile.symbol);
  const scorePass = Number(profile.opportunityRanking?.finalScore || profile.kdeScore || 0) >= Number(settings.paperMinScore || 70);
  const equityForRiskGuard = Number(wallet.equity || 0);
  const dailyPnlForRiskGuard = Number(wallet.dailyPnl || 0);
  const dailyLimitBreached = equityForRiskGuard > 0
    && dailyPnlForRiskGuard < 0
    && dailyPnlForRiskGuard <= equityForRiskGuard * (Number(settings.dailyDrawdownLimitPct || -5) / 100);
  const concurrentLimitBreached = (trades.openTrades || []).filter(t => t.status === 'OPEN').length >= settings.maxConcurrentPositions;
  const fundingBad = hasDirection && Math.abs(profile.fundingRate) > settings.maxFundingRatePct8h;
  const hard = (name, pass, detail = '') => gates.push({ name, pass: Boolean(pass), hard: true, detail });
  const soft = (name, pass, detail = '') => gates.push({ name, pass: Boolean(pass), hard: false, detail });

  const dataQuality = closedOhlcQualityForExecution(profile.symbol, settings);
  hard('Delta Closed OHLC Data Quality', dataQuality.pass, dataQuality.detail);
  hard(`Opportunity Score >= ${Number(settings.paperMinScore || 70)}`, scorePass, `Score=${profile.opportunityRanking?.finalScore || profile.kdeScore || 0}; class=${profile.opportunityRanking?.classification || '-'}; need ${Number(settings.paperMinScore || 70)}+.`);

  const sig = profile.macdDivergenceSignal || {};
  const sigModel = String(sig.entryModel || settings.entryModel || 'SMI_EMA_CLOUD_TPSL').toUpperCase();
  const practicalModel = sigModel !== 'STRICT_TRANSCRIPT_DIVERGENCE';
  if (sig.source === 'SMI_KN_PULLBACK_TPSL_LOCAL' || sigModel === 'SMI_KN_PULLBACK_TPSL') {
    hard('SMI Pullback + KN Smart TP/SL Signal', hasDirection && Boolean(sig.pass) && sig.entrySide === direction, sig.reason || 'No valid SMI pullback continuation + KN Smart confirmation on closed candles.');
    hard('EMA50/200 Trend Cloud', hasDirection && Boolean(sig.conditions?.trendCloud), 'Need EMA50/200 trend cloud in trade direction with price on correct side.');
    hard('SMI Pullback Beyond Band', hasDirection && Boolean(sig.conditions?.smiPullback), 'Need SMI pullback below -40 for long or above +40 for short.');
    hard('Cloud Touch / Rejection', hasDirection && Boolean(sig.conditions?.cloudTouch) && Boolean(sig.conditions?.cloudNotBroken), 'Pullback must touch the EMA cloud and not close through it.');
    hard('SMI Recovery Cross', hasDirection && Boolean(sig.conditions?.smiRecoveryCross), 'Need SMI to cross its signal EMA after the pullback.');
    hard('KN EMA5/12 Crossover', hasDirection && Boolean(sig.conditions?.knSignal), direction === 'LONG' ? 'Need fast EMA above slow EMA after crossover.' : direction === 'SHORT' ? 'Need fast EMA below slow EMA after crossover.' : 'Waiting for KN EMA crossover.');
    hard('Entry Candle Confirmation', hasDirection && Boolean(sig.conditions?.entryCandle), direction === 'LONG' ? 'Need bullish candle close above KN entry line.' : 'Need bearish candle close below KN entry line.');
    hard('Golden Candle Size Filter', hasDirection && Boolean(sig.conditions?.candleSizeOk), 'Entry candle too large; wait for next valid candle so SL/TP are not distorted.');
    const signalSlOk = hasDirection && Boolean(sig.invalidationLevel);
    const technicalSlOk = hasDirection && Boolean((profile.technicalStop?.sl && profile.technicalStop?.riskDistance > 0) || signalSlOk);
    hard('KN ATR SL/TP Available', technicalSlOk, profile.technicalStop?.reason || 'KN ATR×1.5 SL with TP1/TP2/TP3 must exist.');
    hard('Risk Guard', hasDirection && !dailyLimitBreached && !concurrentLimitBreached && !fundingBad && !profile.newsBlackout && !(settings.maxOnePositionPerAsset && oneAssetOpen) && !clusterOpen, [
      dailyLimitBreached ? 'daily drawdown breached' : '',
      concurrentLimitBreached ? 'max concurrent positions reached' : '',
      fundingBad ? 'funding rate too high' : '',
      profile.newsBlackout ? 'news blackout' : '',
      settings.maxOnePositionPerAsset && oneAssetOpen ? 'one open position already exists for this asset' : '',
      clusterOpen ? `cluster already has active trade: ${correlationClusterForSymbol(profile.symbol)}` : ''
    ].filter(Boolean).join('; '));
    soft('SMI Values', hasDirection && Boolean(sig.conditions?.smiDirection), `SMI=${sig.smiValue ?? '-'} Signal=${sig.smiSignal ?? '-'}; pullback/recovery is now a hard gate.`);
    soft('KN Values', hasDirection, `EMA fast=${sig.knFast || sig.emaFast || '-'} EMA slow=${sig.knSlow || sig.emaSlow || '-'} entry=${sig.entry || '-'} TP3=${sig.tp3 || '-'}`);
    soft('Active Strategy', true, 'Only SMI pullback continuation + EMA50/200 cloud + KN Smart TP/SL are hard strategy gates.');
    const hardGates = gates.filter(g => g.hard !== false);
    const passedCount = hardGates.filter(g => g.pass).length;
    return { gates, allPass: hardGates.every(g => g.pass), blockedBy: hardGates.find(g => !g.pass)?.name || null, trendVotes: passedCount, trendVotesRequired: hardGates.length, trendVoteText: `SMI-KN ${passedCount}/${hardGates.length}` };
  }
  hard('V70 Balanced 5M Scalp Strategy Signal', hasDirection && Boolean(sig.pass) && sig.entrySide === direction, sig.reason || 'No valid 5m closed-candle scalp setup yet: MTF EMA50 context + previous day/SR/volume context + memory cloud + side-correct trigger + MACD timing must pass.');
  const inst = sig.institutionalEma || {};
  const instSide = direction === 'LONG' ? inst.long : direction === 'SHORT' ? inst.short : null;
  const conf = instSide?.confluence || {};
  soft('Structure Location Context', hasDirection && Boolean(conf.structure?.pass), conf.structure?.reason || 'Context only in V70; Market Memory cloud is the hard pullback/location gate.');
  soft('Confluence Score Context', hasDirection && Number(conf.score || 0) >= Number(settings.minConfluenceScore || 6) && Number(conf.confirmations || 0) >= Number(settings.minMomentumConfirmations || 2), conf.reason || 'Advisory only in V70; not a hidden hard blocker.');
  soft('Local EMA50/200 Context', settings.institutionalEmaEnabled === false || (hasDirection && Boolean(instSide?.execStack || instSide?.htfStack)), instSide?.detail || inst.reason || 'Local EMA50/200 is visual/advisory only.');
  soft('EMA/VWAP/SR Pullback Context', settings.institutionalEmaEnabled === false || (hasDirection && Boolean(instSide?.pullback?.pass || conf.structure?.pass)), instSide?.pullback ? `touched=${instSide.pullback.touched} reclaimed=${instSide.pullback.reclaimed} extension=${instSide.pullback.extensionAtr}ATR` : 'Advisory only; Market Memory cloud pullback is the hard gate.');
  hard('5M Side-Correct Price-Action Trigger', settings.institutionalEmaEnabled === false || (hasDirection && Boolean(instSide?.priceAction?.pass)), instSide?.priceAction?.reason || (direction === 'SHORT' ? 'Need bearish engulfing, bearish pin bar, or double-top rejection on closed 5m candle' : direction === 'LONG' ? 'Need bullish engulfing, bullish pin bar, or double-bottom reclaim on closed 5m candle' : 'Need side-correct 5m trigger candle'));
  soft('HTF MACD Strength', settings.institutionalEmaEnabled === false || (hasDirection && Boolean(instSide?.htfMacd || instSide?.macd5Ok)), `5m=${instSide?.macd5Ok || false} 15m=${instSide?.macd15Ok || false} 1h=${instSide?.macd1hOk || false}`);
  hard('EMA50 15m vs 1h Trend Filter', hasDirection && Boolean(sig.conditions?.longTrend || sig.conditions?.shortTrend), `EMA15=${sig.ema15 || '-'} EMA1H=${sig.ema1h || '-'} gap=${sig.emaGapPct || '-'}%`);
  hard('Market Memory Cloud Match', settings.marketMemoryEnabled === false || (hasDirection && Boolean(instSide?.marketMemoryPass || instSide?.marketMemory?.pass)), instSide?.marketMemory?.detail || 'Need same-side Market Memory regime, cloud pullback/rejection, similarity threshold and #1 historical match outcome.');
  hard('Previous Day + 1D/1H/15M S/R + 5M Volume Flow', settings.srVolumeAlignmentEnabled === false || (hasDirection && Boolean(instSide?.srVolumePass || instSide?.srVolume?.pass)), instSide?.srVolume?.reason || 'Need previous-day candle, 1D/1H/15M S/R votes >=2/3, and volume rule: 5m + either 15m or 1h.');
  const divOk = direction === 'LONG'
    ? Boolean(sig.conditions?.priceLowerLow && sig.conditions?.macdHigherLow)
    : direction === 'SHORT'
      ? Boolean(sig.conditions?.priceHigherHigh && sig.conditions?.macdLowerHigh)
      : false;
  if (practicalModel && sig.zeroLineMode !== 'hard') soft('MACD Zero-Line Side Context', Boolean(sig.conditions?.zeroOk), `Soft filter in Practical mode. MACD=${sig.macdLine ?? '-'} Signal=${sig.macdSignal ?? '-'}`);
  else hard('MACD Zero-Line Side Held', hasDirection && Boolean(sig.conditions?.zeroOk), `MACD=${sig.macdLine ?? '-'} Signal=${sig.macdSignal ?? '-'}`);
  if (practicalModel && !sig.requireDivergenceForEntry) soft('Divergence Context', Boolean(divOk), sig.divergence ? `Optional in Practical mode. Price ${sig.divergence.priceFirst} -> ${sig.divergence.priceSecond}; MACD ${sig.divergence.macdFirst} -> ${sig.divergence.macdSecond}` : 'Optional in Practical mode; no clean confirmed divergence yet');
  else hard('Divergence Confirmed', hasDirection && divOk, sig.divergence ? `Price ${sig.divergence.priceFirst} -> ${sig.divergence.priceSecond}; MACD ${sig.divergence.macdFirst} -> ${sig.divergence.macdSecond}` : 'Need two confirmed pivots');
  soft('Histogram Color Change', hasDirection && Boolean(sig.conditions?.histColorChange), `Preferred within ${sig.histColorLookback || settings.histColorLookback || 6} closed 5m candles; high confluence can still pass.`);
  soft('Confirmed MACD Crossover', hasDirection && Boolean(sig.conditions?.crossover), `Preferred within ${sig.entrySignalWindowCandles || settings.entrySignalWindowCandles || 3} candle(s); not standalone.`);
  if (settings.entryOrderType !== 'market' && settings.requirePullbackForExecution !== false) {
    soft('Limit Pullback Entry', Boolean(profile.decision === 'LONG' || profile.decision === 'SHORT'), 'Execution uses Dash-style smart pullback limit order from KN EMA5/EMA12, candle midpoint, fib pullback, support/resistance, and Market Memory zones. Higher TFs are context only; 5m closed candle is the trigger.');
  }

  soft('Support / Resistance Context', true, profile.supportResistance?.reason || 'Context only; not an entry engine');
  soft('Market Structure Context', true, profile.marketStructure?.reason || 'Context only; not an entry engine');

  const tier = coinTier(profile.symbol);
  hard('Coin Tier Filter', hasDirection && (tier < 3 || Number(conf.score || 0) >= Number(settings.tier3MinConfluenceScore || 10)), tier < 3 ? coinTierLabel(profile.symbol) : `Tier 3 requires A+ confluence score ${settings.tier3MinConfluenceScore || 10}+; score=${Number(conf.score || 0)}`);

  const signalSlOk = hasDirection && Boolean(sig.invalidationLevel || instSide?.sl);
  const technicalSlOk = hasDirection && Boolean((profile.technicalStop?.sl && profile.technicalStop?.riskDistance > 0) || signalSlOk);
  hard('Technical SL Available', technicalSlOk, profile.technicalStop?.reason || instSide?.detail || 'Structure/cloud/swing SL with ATR buffer required');
  hard('Risk Guard', hasDirection && !dailyLimitBreached && !concurrentLimitBreached && !fundingBad && !profile.newsBlackout && !(settings.maxOnePositionPerAsset && oneAssetOpen), [
    dailyLimitBreached ? 'daily drawdown breached' : '',
    concurrentLimitBreached ? 'max concurrent positions reached' : '',
    fundingBad ? 'funding rate too high' : '',
    profile.newsBlackout ? 'news blackout' : '',
    settings.maxOnePositionPerAsset && oneAssetOpen ? 'one open position already exists for this asset' : '',
      clusterOpen ? `cluster already has active trade: ${correlationClusterForSymbol(profile.symbol)}` : ''
  ].filter(Boolean).join('; '));

  const hardGates = gates.filter(g => g.hard !== false);
  const passedCount = hardGates.filter(g => g.pass).length;
  return {
    gates,
    allPass: hardGates.every(g => g.pass),
    blockedBy: hardGates.find(g => !g.pass)?.name || null,
    trendVotes: passedCount,
    trendVotesRequired: hardGates.length,
    trendVoteText: `SMI-CLOUD ${passedCount}/${hardGates.length}`
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





function readableBlockReason(row) {
  const gate = Array.isArray(row?.gates) ? row.gates.find(g => !g.pass && g.hard !== false) : null;
  const gateText = gate ? `${gate.name}${gate.detail ? ': ' + gate.detail : ''}` : '';
  const sigReason = row?.macdDivergenceSignal?.reason || row?.candidate?.marginPlan?.blockedReason || row?.blockedBy || row?.nextTrigger || row?.entryReason || row?.whyReason || '';
  return String(gateText || sigReason || 'Waiting for a complete closed-candle setup; no valid entry signal yet.').slice(0, 500);
}

function nextTriggerText(profile, result, candidate, settings) {
  const direction = profile?.decision || 'WAIT';
  const sig = profile?.macdDivergenceSignal || {};
  if (candidate && result?.allPass) return `READY: ${direction} setup passed; ${candidate.entryType === 'PULLBACK_LIMIT' ? 'place pullback limit order' : 'entry ready'} at ${candidate.entry}; SL ${candidate.sl}; TP2 ${candidate.tp2}.`;
  if (direction === 'WAIT') return sig.reason || 'WAIT: need KN EMA5/12 crossover, valid candle close beyond entry line, acceptable candle size, KN ATR SL/TP levels, and risk sizing on 5m/15m/1h.';
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
    `SMIKN=${profile?.macdDivergenceSignal?.pass ? 'PASS' : profile?.macdDivergenceSignal?.ready ? 'WAIT' : 'WARMUP'}`,
    `SignalSource=${profile?.strategySignalSource || (profile?.hasWebhookSignal ? 'TV' : 'NONE')}`,
    `TV=${profile?.hasWebhookSignal ? 'YES' : 'NO'}`,
    `SupportResistance=${profile?.supportResistance?.reason || '-'}`,
    `SMI=${profile?.macdDivergenceSignal?.smiValue ?? '-'} Signal=${profile?.macdDivergenceSignal?.smiSignal ?? '-'}`,
    `Structure=${profile?.marketStructure?.reason || '-'}`,
    `NextAction=${nextTriggerText(profile, result, candidate, settings)}`
  ];
  if (profile?.macdDivergenceSignal) {
    const sig = profile.macdDivergenceSignal;
    parts.push(`SMI_KN_PULLBACK_SIGNAL=${sig.pass ? 'PASS' : sig.ready ? 'WAIT' : 'WARMUP'} (${sig.entryModel || 'SMI_EMA_CLOUD_TPSL'})`);
    parts.push(`SMI_KN_Reason=${sig.reason || '-'}`);
    parts.push(`SMI=${sig.smiValue ?? '-'} SMISignal=${sig.smiSignal ?? '-'}`);
    parts.push(`KN_FAST=${sig.emaFast ?? '-'} KN_SLOW=${sig.emaSlow ?? '-'}`);
    if (sig.signalEntry) parts.push(`KNEntryLine=${sig.signalEntry}`);
    if (sig.invalidationLevel) parts.push(`StrategicSL=${sig.invalidationLevel}`);
    if (sig.tp3) parts.push(`StrategicTP3=${sig.tp3}`);
  }
  if (profile?.sarMacdSignal) {
    parts.push(`EMA_SAR_MACD=${profile.sarMacdSignal.pass ? 'PASS' : profile.sarMacdSignal.ready ? 'WAIT' : 'WARMUP'}`);
    parts.push(`EMA_SAR_MACD_Reason=${profile.sarMacdSignal.reason || '-'}`);
    if (profile.sarMacdSignal.ema) parts.push(`KN_SLOW=${profile.sarMacdSignal.ema}`);
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
  const candles = getCachedCandles(symbol, settings.executionTimeframe || settings.primaryTimeframe || '5m');
  const closed = Array.isArray(candles) ? candles.filter(c => Number(c?.close) > 0) : [];
  const last = closed.at(-1) || {};
  const atr = Math.max(Number(profile.atr || 0), atrFromCandles(closed, Number(settings.knAtrPeriod || settings.atrPeriod || 14)) || 0, current * 0.001);
  const tick = Math.pow(10, -precisionForCoin(symbol));
  const minGapAtr = Number(settings.smartEntryMinGapAtr ?? settings.pullbackAtrMult ?? 0.12);
  const maxGapAtr = Number(settings.smartEntryMaxGapAtr ?? settings.pullbackMaxAtrMult ?? 1.20);
  const minGap = Math.max(tick, atr * Math.min(Math.max(minGapAtr, 0.02), 1.5));
  const maxGap = atr * Math.min(Math.max(maxGapAtr, 0.2), 5);
  const sig = profile.macdDivergenceSignal || {};
  const sr = profile.supportResistance || {};
  const setup = sig.setup || {};
  const closes = closed.map(c => Number(c.close)).filter(n => Number.isFinite(n) && n > 0);
  const ema5 = Number(setup.fast || sig.knFast || sig.entry || 0) || latestEma(closes, Number(settings.knFastEmaLength || 5));
  const ema12 = Number(setup.slow || sig.knSlow || 0) || latestEma(closes, Number(settings.knSlowEmaLength || 12));
  const lastHigh = Number(last.high || 0);
  const lastLow = Number(last.low || 0);
  const lastClose = Number(last.close || current);
  const candleMid = lastHigh && lastLow ? (lastHigh + lastLow) / 2 : 0;
  const fib382 = direction === 'LONG' && lastHigh && lastLow ? lastHigh - (lastHigh - lastLow) * 0.382
    : direction === 'SHORT' && lastHigh && lastLow ? lastLow + (lastHigh - lastLow) * 0.382 : 0;
  const fib50 = candleMid;

  const mm = direction === 'LONG'
    ? (sig.institutionalEma?.marketMemory?.long || sig.institutionalEma?.long?.marketMemory || {})
    : (sig.institutionalEma?.marketMemory?.short || sig.institutionalEma?.short?.marketMemory || {});
  const memoryLine = Number(sig.institutionalEma?.marketMemory?.line || 0);
  const memoryCloudLow = Number(mm.entryZoneLow || sig.institutionalEma?.marketMemory?.cloudLow || 0);
  const memoryCloudHigh = Number(mm.entryZoneHigh || sig.institutionalEma?.marketMemory?.cloudHigh || 0);

  const candidates = [];
  function add(value, source, weight = 1) {
    const v = Number(value || 0);
    if (!Number.isFinite(v) || v <= 0 || !current) return;
    const gap = Math.abs(current - v);
    const correctSide = direction === 'LONG' ? v < current - tick : v > current + tick;
    if (!correctSide || gap < minGap || gap > maxGap) return;
    candidates.push({ value: v, source, gap, gapAtr: atr ? gap / atr : 0, weight });
  }

  if (settings.smartEntryUseEma5 !== false) add(ema5, 'KN EMA5 pullback', 1.30);
  if (settings.smartEntryUseEma12 !== false) add(ema12, 'KN EMA12 deeper pullback', 1.20);
  if (settings.smartEntryUseCandleMidpoint !== false) add(candleMid, 'last closed candle 50% midpoint', 1.10);
  if (settings.smartEntryUseFib382 !== false) add(fib382, 'last closed candle 0.382 fib pullback', 1.05);
  if (settings.smartEntryUseFib50 !== false) add(fib50, 'last closed candle 0.500 fib pullback', 1.00);
  if (direction === 'LONG') {
    add(sr.support, 'support pullback', 1.15);
    add(memoryCloudHigh, 'Market Memory cloud pullback', 1.05);
    add(memoryCloudLow, 'Market Memory cloud deep pullback', 1.00);
    add(memoryLine, 'Market Memory line pullback', 1.00);
  } else {
    add(sr.resistance, 'resistance pullback', 1.15);
    add(memoryCloudLow, 'Market Memory cloud pullback', 1.05);
    add(memoryCloudHigh, 'Market Memory cloud deep pullback', 1.00);
    add(memoryLine, 'Market Memory line pullback', 1.00);
  }

  // Prefer value-area entries: not too close to chase, not so deep that the signal is likely stale.
  candidates.sort((a, b) => {
    const ideal = 0.45;
    const aScore = Math.abs(a.gapAtr - ideal) / Math.max(a.weight, 0.1);
    const bScore = Math.abs(b.gapAtr - ideal) / Math.max(b.weight, 0.1);
    return aScore - bScore;
  });

  let chosen = candidates[0];
  if (!chosen) {
    const fallback = direction === 'LONG' ? current - minGap : current + minGap;
    chosen = { value: fallback, source: 'ATR safety pullback fallback', gap: Math.abs(current - fallback), gapAtr: atr ? Math.abs(current - fallback) / atr : 0, weight: 0.5 };
  }

  return {
    entry: roundCoin(symbol, chosen.value),
    source: chosen.source,
    current: roundCoin(symbol, current),
    gap: roundCoin(symbol, Math.abs(current - chosen.value)),
    gapAtr: atr ? pct(Math.abs(current - chosen.value) / atr) : 0,
    limitSide: direction === 'LONG' ? 'buy-limit below current price' : 'sell-limit above current price',
    support: sr.support || null,
    resistance: sr.resistance || null,
    smartEntry: true,
    candidates: candidates.slice(0, 6).map(c => ({ source: c.source, entry: roundCoin(symbol, c.value), gapAtr: pct(c.gapAtr) })),
    waitCandles: Math.max(1, Math.floor(Number(settings.smartEntryWaitCandles || settings.entrySignalWindowCandles || 8)))
  };
}

function entryFillableNow(direction, marketPrice, entry) {
  const p = Number(marketPrice || 0);
  const e = Number(entry || 0);
  if (!p || !e) return false;
  return direction === 'LONG' ? p <= e : p >= e;
}



function tradeStyleFromSettings(settings = loadSettings()) {
  const r = normalizeResolution(settings.executionTimeframe || settings.primaryTimeframe || '5m');
  return tradeStyleForResolution(r);
}

function dynamicTpContinuationStrong(row, trade, settings) {
  if (settings.dynamicTpEnabled === false || settings.horizonUpgradeEnabled === false) return false;
  if (!row || !trade || row.dec !== trade.side) return false;
  const r = profitRForTrade(trade);
  if (r < Number(settings.horizonUpgradeMinR || 1)) return false;
  const sig = row.macdDivergenceSignal || {};
  const frames = Array.isArray(sig.byTimeframe) ? sig.byTimeframe : [];
  const entryTf = normalizeResolution(trade.signalTimeframe || trade.timeframe || sig.selectedTimeframe || '5m');
  const entryRank = horizonRank(entryTf);
  const sameSideHigher = frames.find(x => x && x.pass && x.entrySide === trade.side && horizonRank(x.timeframe || '5m') > entryRank);
  if (sameSideHigher) return true;
  if (settings.horizonUpgradeRequireSameSideSignal === false && sig.pass && sig.entrySide === trade.side) return true;
  return Boolean(row.pass && sig.pass && sig.entrySide === trade.side && tradeStyleForResolution(sig.selectedTimeframe || sig.timeframe || entryTf) !== 'SCALP');
}

function continuationTargetRForTrade(trade, row, settings) {
  const sig = row?.macdDivergenceSignal || {};
  const tf = normalizeResolution(sig.selectedTimeframe || sig.timeframe || trade.signalTimeframe || '5m');
  const style = tradeStyleForResolution(tf);
  if (style === 'SWING') return Number(settings.intradayToSwingTargetR || 3.5);
  if (style === 'INTRA') return Number(settings.scalpToIntradayTargetR || 2.5);
  const frames = Array.isArray(sig.byTimeframe) ? sig.byTimeframe : [];
  const sameSideSwing = frames.find(x => x && x.pass && x.entrySide === trade.side && tradeStyleForResolution(x.timeframe) === 'SWING');
  if (sameSideSwing) return Number(settings.intradayToSwingTargetR || 3.5);
  const sameSideIntra = frames.find(x => x && x.pass && x.entrySide === trade.side && tradeStyleForResolution(x.timeframe) === 'INTRA');
  if (sameSideIntra) return Number(settings.scalpToIntradayTargetR || 2.5);
  return Number(settings.rewardTargetR || 1.5);
}

function currentTargetRForTrade(trade, targetName = 'tp2') {
  const entry = tradeInitialEntry(trade);
  const risk = tradeInitialRiskDistance(trade);
  const target = Number(trade?.[targetName] || 0);
  if (!entry || !risk || !target) return 0;
  return Math.abs(target - entry) / risk;
}

function moveTargetIfBetter(trade, targetName, nextPrice, reason) {
  const n = Number(nextPrice || 0);
  const c = Number(trade?.[targetName] || 0);
  if (!n || !c) return false;
  const better = trade.side === 'LONG' ? n > c : n < c;
  if (!better) return false;
  trade[targetName] = roundCoin(trade.coin, n);
  pushManagementEvent(trade, `${reason}: ${String(targetName).toUpperCase()} moved to ${trade[targetName]}`);
  return true;
}

function emaTrailStopForTrade(trade, settings) {
  const candles = getCachedCandles(trade.coin, '5m');
  if (!Array.isArray(candles) || candles.length < 30) return null;
  const len = Math.min(Math.max(Math.floor(Number(settings.trailingStopEmaPeriod || 13)), 3), 50);
  const closes = candles.map(c => c.close).filter(n => Number.isFinite(n) && n > 0);
  const ema = latestEma(closes, len);
  const atr = atrFromCandles(candles, Number(settings.atrPeriod || 14)) || state.market[trade.coin]?.atr || 0;
  if (!ema || !atr) return null;
  const buffer = atr * Math.min(Math.max(Number(settings.trailingStopAtrBuffer || 0.20), 0), 2);
  return trade.side === 'LONG' ? ema - buffer : ema + buffer;
}

function buildTradeCandidate(profile, settings, wallet, trades = loadTrades()) {
  if (profile.decision !== 'LONG' && profile.decision !== 'SHORT') return null;
  const direction = profile.decision;
  const currentPrice = Number(profile.price || 0);
  // V60: secondary pullback preference stays separate from the institutional EMA50 pullback gate, not a second mandatory signal after the MACD trigger.
  // Default behavior: enter with a limit order at the current closed-candle/ticker price.
  // If Require Pullback is enabled, place a pending pullback limit instead.
  const pullbackPlan = settings.entryOrderType !== 'market' && settings.requirePullbackForExecution === true
    ? nearestPullbackEntry(profile, direction, settings)
    : null;
  const entry = pullbackPlan?.entry || Number(profile.macdDivergenceSignal?.entry || 0) || currentPrice;
  const stopPlan = settings.technicalSlEnabled !== false && profile.technicalStop?.sl
    ? profile.technicalStop
    : technicalStopForDirection(profile.symbol, direction, entry, profile.atr, state.priceHistory[profile.symbol] || [], settings);
  const sl = Number(stopPlan.sl || 0);
  const riskDistance = Math.abs(entry - sl);
  if (!entry || !sl || !riskDistance) return null;
  const isBreakoutEntry = false;
  const isVwapEntry = false;
  const isSarMacdEntry = false;
  const isMacdDivergenceEntry = profile.strategySignalSource === 'SMI_KN_PULLBACK_TPSL_LOCAL';
  const tradeStyle = profile.macdDivergenceSignal?.selectedHorizon || profile.macdDivergenceSignal?.tradeStyle || tradeStyleFromSettings(settings);
  const sizing = highProbabilitySizing(profile, settings);
  const weeklyPolicy = profile.weeklyPolicy || weeklyPolicyForDirection(profile.weeklyBias, direction, profile.macdDivergenceSignal, settings);
  const isCounterTrendPullback = weeklyPolicy.mode === 'COUNTER_TREND_PULLBACK';
  const tp1R = Math.min(Math.max(Number(settings.tp1TriggerR || 1), 0.5), 5);
  const tp2R = Math.min(Math.max(Number(settings.tp2TriggerR || 2), tp1R), 5);
  let rewardR = Math.min(Math.max(Number(settings.tp3TriggerR || settings.rewardTargetR || 2.5), tp2R), 6);
  let tp1 = direction === 'LONG' ? entry + riskDistance * tp1R : entry - riskDistance * tp1R;
  let tp2 = direction === 'LONG' ? entry + riskDistance * tp2R : entry - riskDistance * tp2R;
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
    if (Number(profile.macdDivergenceSignal.tp3)) tp3 = Number(profile.macdDivergenceSignal.tp3);
    rewardR = Number(profile.macdDivergenceSignal.dynamicTargetR || settings.rewardTargetR || 2.5);
    const activeConf = direction === 'LONG' ? profile.macdDivergenceSignal.institutionalEma?.long?.confluence : profile.macdDivergenceSignal.institutionalEma?.short?.confluence;
    if (settings.dynamicTpEnabled !== false && Number(activeConf?.score || 0) >= Number(settings.aPlusConfluenceScore || 10)) {
      rewardR = Math.min(Math.max(rewardR, Number(settings.dynamicTpStrongR || 3.5)), Number(settings.dynamicTpMaxR || 6));
      tp2 = direction === 'LONG' ? entry + riskDistance * rewardR : entry - riskDistance * rewardR;
    }
    if (!Number(profile.macdDivergenceSignal.tp3)) tp3 = direction === 'LONG' ? entry + riskDistance * rewardR : entry - riskDistance * rewardR;
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
    sizingMultiplier: pct((sizing.multiplier || 1) * (weeklyPolicy.riskMultiplier || 1)),
    sizingReason: [sizing.reason, weeklyPolicy.reason].filter(Boolean).join(' | '),
    exitPlan: 'V3: SMI + KN Smart TP/SL with weekly macro bias. Same-weekly-side trades use full size; counter-weekly trades are pullback-only and reduced risk. TP1=25%, TP2=25%, TP3=25%, runner=25%; SL moves to breakeven after TP1 and trails while MACD/SMI/KN trend remains strong.',
    weeklyBias: profile.weeklyBias,
    weeklyPolicy,
    isCounterTrendPullback,
    tradeStyle,
    signalTimeframe: profile.macdDivergenceSignal?.selectedTimeframe || profile.macdDivergenceSignal?.timeframe || settings.executionTimeframe || '5m',
    selectedHorizon: profile.macdDivergenceSignal?.selectedHorizon || profile.macdDivergenceSignal?.tradeStyle || tradeStyle,
    confluenceScore: (direction === 'LONG' ? profile.macdDivergenceSignal?.institutionalEma?.long?.confluence?.score : profile.macdDivergenceSignal?.institutionalEma?.short?.confluence?.score) || 0,
    confluence: direction === 'LONG' ? profile.macdDivergenceSignal?.institutionalEma?.long?.confluence : profile.macdDivergenceSignal?.institutionalEma?.short?.confluence,
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
  const ranking = bot11RankingBreakdown(symbol, profile, profile.macdDivergenceSignal || {}, settings);
  profile.kdeScore = ranking.finalScore;
  profile.opportunityRanking = ranking;
  profile.cluster = ranking.cluster;
  const candidate = buildTradeCandidate(profile, settings, wallet, trades);
  if (candidate) { candidate.opportunityScore = ranking.finalScore; candidate.score = ranking.finalScore; candidate.cluster = ranking.cluster; candidate.riskAmountUsd = riskUsdForScore(ranking.finalScore); }
  const result = passFail(profile, settings, wallet, trades);
  if (candidate?.marginPlan) {
    const sizingPass = Boolean(candidate.marginPlan.allowed);
    result.gates.push({ name: 'Sizing', pass: sizingPass });
    if (!sizingPass) {
      result.allPass = false;
      result.blockedBy = `Sizing: ${candidate.marginPlan.blockedReason}`;
    }
  }
  const q = result.allPass ? (Number(profile.kdeScore || 0) >= Number(settings.aPlusConfluenceScore || 8) * 10 ? 'A+' : 'A') : (profile.decision === 'LONG' || profile.decision === 'SHORT' ? 'B / BLOCKED' : 'WAIT');

  return {
    coin: symbol,
    tier: coinTierLabel(symbol),
    tradeStyle: candidate?.tradeStyle || tradeStyleFromSettings(settings),
    dec: profile.decision,
    t15m: result.trendVoteText || (profile.decision === 'WAIT' ? 'Votes 0/4' : (profile.decision === 'LONG' ? 'Bull' : 'Bear')),
    trendStack: result.trendVoteText || '-',
    htf: profile.htfBias,
    support: profile.supportResistance?.support || '-',
    resistance: profile.supportResistance?.resistance || '-',
    nextTrigger: nextTriggerText(profile, result, candidate, settings),
    score: profile.opportunityRanking?.finalScore || profile.kdeScore || 0,
    classification: profile.opportunityRanking?.classification || classifyOpportunityScore(profile.kdeScore),
    cluster: profile.cluster || correlationClusterForSymbol(symbol),
    ranking: profile.opportunityRanking,
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
    blockedBy: result.blockedBy || (result.allPass ? null : (result.gates || []).find(g => !g.pass && g.hard !== false)?.name) || 'Waiting for valid setup',
    entryReason: buildDecisionReason(profile, result, candidate, settings) || (result.gates || []).find(g => !g.pass && g.hard !== false)?.detail || profile.macdDivergenceSignal?.reason || 'Waiting for valid closed-candle setup',
    whyReason: buildDecisionReason(profile, result, candidate, settings) || (result.gates || []).find(g => !g.pass && g.hard !== false)?.detail || profile.macdDivergenceSignal?.reason || 'Waiting for valid closed-candle setup',
    source: profile.source,
    macd: profile.macd,
    marketStructure: profile.marketStructure,
    supportResistance: profile.supportResistance,
    strategyFilters: profile.strategyFilters,
    weeklyBias: profile.weeklyBias,
    weeklyPolicy: profile.weeklyPolicy,
    technicalStop: profile.technicalStop,
    confluence: (profile.decision === 'LONG' ? profile.macdDivergenceSignal?.institutionalEma?.long?.confluence : profile.decision === 'SHORT' ? profile.macdDivergenceSignal?.institutionalEma?.short?.confluence : null),
    confluenceScore: (profile.decision === 'LONG' ? profile.macdDivergenceSignal?.institutionalEma?.long?.confluence?.score : profile.decision === 'SHORT' ? profile.macdDivergenceSignal?.institutionalEma?.short?.confluence?.score : 0) || 0,
    mtfSrVolume: profile.decision === 'LONG' ? profile.macdDivergenceSignal?.institutionalEma?.long?.srVolume : profile.decision === 'SHORT' ? profile.macdDivergenceSignal?.institutionalEma?.short?.srVolume : null,
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
    const latestClosed5m = getCachedCandles(trade.coin, '5m').at(-1);
    if (latestClosed5m?.close) {
      trade.price = roundCoin(trade.coin, latestClosed5m.close);
      trade.lastClosedCandleTime = latestClosed5m.time || trade.lastClosedCandleTime || null;
    } else if (m?.price) {
      trade.price = roundCoin(trade.coin, m.price);
    }
    trade.marketSource = latestClosed5m ? 'DELTA_CLOSED_5M_CANDLE' : (m?.source || trade.marketSource || 'UNKNOWN');
    if (String(trade.status || '').toUpperCase() === 'PENDING_LIMIT') {
      trade.pnl = 0;
      trade.pnlPct = 0;
      trade.profitR = 0;
      const settings = loadSettings();
      const expiryMs = Math.max(5, Number(settings.pendingExpiryMinutes || 45)) * 60 * 1000;
      const openedAtMs = new Date(trade.openedAt || trade.createdAt || Date.now()).getTime();
      if (openedAtMs && Date.now() - openedAtMs > expiryMs) {
        trade.status = 'EXPIRED_LIMIT';
        const idx = trades.openTrades.findIndex(t => t.id === trade.id);
        if (idx >= 0) trades.openTrades.splice(idx, 1);
        appendTradeJournalEvent('CANCEL', trade, { cancelReason: 'Pending pullback limit expired without fill', entry: trade.entry, marketPrice: trade.price });
        log('ORDER', `${trade.coin} ${trade.side} pending pullback limit expired at ${trade.entry}; market=${trade.price}.`);
        continue;
      }
      const closed5m = getCachedCandles(trade.coin, '5m');
      const latest5m = closed5m.at(-1);
      const latestTime = Number(latest5m?.time || 0);
      const placedCandleTime = Number(trade.pendingCreatedCandleTime || trade.signalClosedCandleTime || 0);
      const closedAfterPlacement = latest5m && latestTime && (!placedCandleTime || latestTime > placedCandleTime);
      const waitCandles = Math.max(1, Math.floor(Number(trade.pullbackPlan?.waitCandles || settings.smartEntryWaitCandles || settings.entrySignalWindowCandles || 8)));
      const candlesAfterPlacement = Array.isArray(closed5m) && placedCandleTime
        ? closed5m.filter(c => Number(c?.time || 0) > placedCandleTime).length
        : 0;
      if (candlesAfterPlacement > waitCandles) {
        trade.status = 'EXPIRED_LIMIT';
        const idx = trades.openTrades.findIndex(t => t.id === trade.id);
        if (idx >= 0) trades.openTrades.splice(idx, 1);
        appendTradeJournalEvent('CANCEL', trade, { cancelReason: `Smart entry limit expired after ${waitCandles} closed 5m candles without fill`, entry: trade.entry, marketPrice: trade.price });
        log('ORDER', `${trade.coin} ${trade.side} smart entry limit expired after ${waitCandles} closed 5m candles at ${trade.entry}; market=${trade.price}.`);
        continue;
      }
      const limitTouched = closedAfterPlacement && trade.side === 'LONG'
        ? Number(latest5m.low) <= Number(trade.entry)
        : closedAfterPlacement && trade.side === 'SHORT'
          ? Number(latest5m.high) >= Number(trade.entry)
          : false;
      const filled = Boolean(limitTouched);
      if (filled) {
        trade.status = 'OPEN';
        trade.filledAt = new Date().toISOString();
        trade.fillPrice = trade.entry;
        appendTradeJournalEvent('FILL', trade, { entry: trade.entry, marketPrice: trade.price, candleLow: latest5m?.low || null, candleHigh: latest5m?.high || null, candleTime: latest5m?.time || null, note: 'Paper limit filled only from a closed 5m candle after the order was placed.' });
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
  const triggerR = currentTargetRForTrade(trade, 'tp2') || 2;
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


function tp3ReachedForTrade(trade, settings) {
  const triggerR = currentTargetRForTrade(trade, 'tp3') || Number(settings.tp3TriggerR || 3);
  const r = profitRForTrade(trade);
  const tp3 = Number(trade.tp3 || 0);
  const priceHit = targetPriceHit(trade, tp3);
  const rHit = r >= triggerR;
  return {
    hit: Boolean(priceHit || rHit),
    priceHit,
    rHit,
    r,
    triggerR,
    tp3,
    reason: priceHit ? `TP3 price ${tp3} reached at ${trade.price}` : rHit ? `${pct(r)}R reached TP3 trigger ${triggerR}R` : `TP3 not reached; price=${trade.price} tp3=${tp3 || '-'} r=${pct(r)}R`
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


function maybeLogBlockedRows(rows = [], settings = loadSettings()) {
  if (!settings.botEnabled) return;
  const now = Date.now();
  const sorted = (rows || []).slice().sort((a, b) => Number(b?.score || 0) - Number(a?.score || 0));
  let written = 0;
  for (const row of sorted) {
    if (!row || row.pass) continue;
    const reason = readableBlockReason(row);
    const key = `${row.coin}:${row.dec || 'WAIT'}:${row.blockedBy || reason.slice(0, 80)}`;
    const last = state.lastBlockLog[key] || 0;
    if (now - last < 60 * 1000) continue;
    state.lastBlockLog[key] = now;
    log('BLOCK', `${row.coin} ${row.dec || 'WAIT'} not opened: ${reason}`);
    written += 1;
    if (written >= 8) break;
  }
}

async function runScanAsync({ autoExecute = false, forceDelta = false } = {}) {
  let settings = loadSettings();
  const keys = loadKeys();
  await refreshDeltaPublicData(settings, forceDelta);
  await refreshDeltaCandlesForAssets(settings, forceDelta);
  await syncLiveAccountIfReady(settings, keys, { force: forceDelta });
  settings = loadSettings();
  const payload = runScan({ autoExecute: false });
  maybeLogBlockedRows(payload.rows || [], settings);
  if (settings.botEnabled && !(payload.rows || []).some(r => r.pass && r.candidate)) {
    const top = (payload.rows || []).slice().sort((a,b)=>Number(b.score||0)-Number(a.score||0))[0];
    if (top) log('WAIT', `No trade opened this scan. Best setup: ${top.coin} ${top.dec || 'WAIT'} score=${top.score || 0}. ${readableBlockReason(top)}`);
  }
  if (settings.botEnabled && autoExecute) {
    const localTrades = loadTrades();
    const paperWallet = loadWallet();
    const wallet = effectiveWallet(settings, paperWallet);
    const paperOnlyLiveData = settings.liveDataPaperTradingOnly !== false;
    const usingLiveAccount = paperOnlyLiveData ? false : liveReady(settings, loadKeys());
    const liveModeRequested = !settings.paperTrade && !paperOnlyLiveData;
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
        try {
          const order = openPaperTrade(row, settings, trades, wallet);
          if (order) log('PAPER', `${row.coin} ${row.dec} ${order.status === 'PENDING_LIMIT' ? 'pending pullback limit placed' : 'paper trade opened'} by the same scanner engine used for live.`, { tradeId: order.id, status: order.status, marginUsd: order.marginUsedUsd });
        } catch (error) {
          log('ERROR', `Paper order failed for ${row.coin}: ${error.message}`);
        }
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
    if (ms.tp3Done) trade.tp3Done = true;
    if (ms.runnerActive) trade.runnerActive = true;
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

    if (settings.dynamicTpEnabled !== false && r >= 1 && dynamicTpContinuationStrong(row, trade, settings)) {
      const emaTrail = emaTrailStopForTrade(trade, settings);
      if (emaTrail && moveTradeStop(trade, emaTrail, 'EMA13 continuation trail')) ms.lastEmaTrail = trade.sl;
      if (!trade.tp1Done && (Number(trade.estimatedFullTradeProfitUsd || 0) >= Number(settings.targetFullTradeProfitUsd || 5) || Number(settings.targetFullTradeProfitUsd || 0) >= 5)) {
        const nextTp1R = Math.min(Math.max(Number(settings.dynamicTp1ShiftR || 1.5), Number(settings.tp1TriggerR || 1)), Math.max(1, Number(settings.dynamicTpStrongR || 3) - 0.25));
        if (moveTargetIfBetter(trade, 'tp1', targetRPrice(trade, nextTp1R), `Multi-horizon continuation TP1 shift to ${nextTp1R}R`)) ms.tp1ShiftedR = nextTp1R;
      }
    }

    const tp1Check = tp1ReachedForTrade(trade, settings);
    if (settings.autoTp1Enabled !== false && !trade.tp1Done && tp1Check.hit) {
      let closePct = Math.min(Math.max(Number(settings.tp1ClosePct || 50), 1), 90);
      if (dynamicTpContinuationStrong(row, trade, settings)) {
        closePct = Math.min(closePct, Math.min(Math.max(Number(settings.dynamicTp1StrongClosePct || 25), 1), 75));
        pushManagementEvent(trade, `Multi-horizon continuation: TP1 partial reduced to ${closePct}% so remaining size can run`);
      }
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
      const currentTp2R = currentTargetRForTrade(trade, 'tp2') || 2;
      const maxDynamicR = Math.min(Math.max(Number(settings.dynamicTpMaxR || 5), 2), 8);
      if (dynamicTpContinuationStrong(row, trade, settings) && currentTp2R < maxDynamicR - 0.01) {
        const nextR = Math.min(maxDynamicR, Math.max(currentTp2R + 1, continuationTargetRForTrade(trade, row, settings)));
        if (moveTargetIfBetter(trade, 'tp2', targetRPrice(trade, nextR), `Multi-horizon continuation TP2 extension to ${nextR}R`)) {
          ms.tp2ExtendedR = nextR;
          continue;
        }
      }
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


    const tp3Check = tp3ReachedForTrade(trade, settings);
    if (settings.autoTp1Enabled !== false && settings.smartRunnerEnabled !== false && !trade.tp3Done && trade.tp2Done && tp3Check.hit) {
      const trendStrong = tradeTrendStillStrong(trade, row, settings);
      const closePct = Math.min(Math.max(Number(settings.tp3ClosePct || 25), 1), 75);
      if (opts.live && trade.mode === 'live') {
        try {
          const result = await sendLivePartialCloseOrder(trade, settings, closePct);
          trade.tp3Done = true;
          trade.runnerActive = true;
          ms.tp3Done = true;
          ms.runnerActive = true;
          ms.tp3Reason = tp3Check.reason;
          ms.tp3At = new Date().toISOString();
          log('LIVE', `${trade.coin} ${trade.side} TP3 partial close sent (${closePct}%). Runner left open while trend remains strong.`, { tradeId: trade.id, closeSize: result.closeSize, trigger: tp3Check.reason, trendStrong });
        } catch (error) {
          log('ERROR', `Live TP3 partial close failed for ${trade.coin}: ${error.message}`, { tradeId: trade.id, trigger: tp3Check.reason });
        }
      } else {
        const closed = closeTradePortionInMemory(trades, wallet, trade, closePct, `TP3 partial: ${tp3Check.reason}; runner left open`, trade.price);
        if (closed) {
          trade.tp3Done = true;
          trade.runnerActive = true;
          ms.tp3Done = true;
          ms.runnerActive = true;
          ms.tp3Reason = tp3Check.reason;
          ms.tp3At = new Date().toISOString();
          log('TRADE', `${trade.coin} ${trade.side} TP3 partial closed ${closePct}% at ${closed.exit}; runner active.`, { tradeId: trade.id, pnl: closed.pnl, trigger: tp3Check.reason, trendStrong });
        }
      }
    }

    if (settings.smartRunnerEnabled !== false && trade.runnerActive) {
      const trendStrong = tradeTrendStillStrong(trade, row, settings);
      const emaTrail = emaTrailStopForTrade(trade, settings);
      if (settings.runnerTrailAfterTp3 !== false && emaTrail && moveTradeStop(trade, emaTrail, 'Runner EMA trail')) ms.lastRunnerTrail = trade.sl;
      if (!trendStrong && r > Math.max(Number(settings.tp3TriggerR || 3), 2.5)) {
        pushManagementEvent(trade, 'Runner trend-strength warning: MACD/SMI/KN no longer fully aligned; trailing stop remains active.');
        ms.runnerTrendWeakAt = ms.runnerTrendWeakAt || new Date().toISOString();
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
  // V70 aligned live build: live execution is allowed only after API test, explicit live confirmation, Delta wallet sync, and positions sync.
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

function clearStaleLocalLiveTradesFromDelta() {
  if (state.deltaPositions.status !== 'LIVE_POSITIONS') {
    throw new Error('Delta positions are not synced; run Sync Delta Positions Now first.');
  }
  const trades = loadTrades();
  const deltaSymbols = new Set((state.deltaPositions.openTrades || []).map(t => String(t.coin || t.symbol || '').toUpperCase()).filter(Boolean));
  const before = trades.openTrades || [];
  const kept = [];
  const removed = [];
  for (const t of before) {
    const sym = String(t.coin || '').toUpperCase();
    const liveLike = String(t.mode || '').toLowerCase() === 'live' || Boolean(t.exchangeOrderId || t.clientOrderId);
    if (liveLike && sym && !deltaSymbols.has(sym)) removed.push(t);
    else kept.push(t);
  }
  trades.openTrades = kept;
  saveTrades(trades);
  if (removed.length) {
    for (const t of removed) appendTradeJournalEvent('STALE_CLEAR', t, { reason: 'Removed local live trade because Delta position sync shows no matching open position.' });
    log('SAFE', `Cleared ${removed.length} stale local live trade(s) after Delta position sync.`, { removed: removed.map(t => ({ coin: t.coin, side: t.side, status: t.status, exchangeOrderId: t.exchangeOrderId || null })) });
  } else {
    log('SAFE', 'No stale local live trades found after Delta position sync.');
  }
  return { removedCount: removed.length, removed };
}

async function forceSyncLivePositionsNow(settings = loadSettings()) {
  const keys = loadKeys();
  await refreshDeltaPublicData(settings, true);
  await refreshDeltaCandlesForAssets(settings, true);
  await syncLiveAccountIfReady(settings, keys, { force: true });
  return state.deltaPositions;
}

function buildTradeRecord(row, settings, mode) {
  const id = `T-${row.coin}-${Date.now().toString(36).toUpperCase()}`;
  const plan = row.candidate.marginPlan || {};
  return {
    id,
    coin: row.coin,
    side: row.dec,
    tradeStyle: row.candidate.tradeStyle || row.candidate.selectedHorizon || row.tradeStyle || tradeStyleFromSettings(settings),
    signalTimeframe: row.candidate.signalTimeframe || row.macdDivergenceSignal?.selectedTimeframe || '5m',
    selectedHorizon: row.candidate.selectedHorizon || row.candidate.tradeStyle || row.macdDivergenceSignal?.selectedHorizon || row.tradeStyle || tradeStyleFromSettings(settings),
    initialEntry: row.candidate.entry,
    entry: row.candidate.entry,
    price: row.price,
    marketPriceAtSignal: row.price,
    sl: row.candidate.sl,
    tp1: row.candidate.tp1,
    tp2: row.candidate.tp2,
    tp3: row.candidate.tp3,
    tp1R: row.candidate.tp1R || 1,
    tpPlan: { tp1Pct: Number(settings.tp1ClosePct || 25), tp2Pct: Number(settings.tp2ClosePct || 25), tp3Pct: Number(settings.tp3ClosePct || 25), runnerPct: Number(settings.runnerClosePct || 25) },
    exitPlan: row.candidate.exitPlan || '',
    chandelierLevel: row.candidate.chandelierLevel || null,
    qty: row.candidate.qty,
    liveOrderSize: row.candidate.liveOrderSize,
    lotsPurchased: row.candidate.liveOrderSize || row.candidate.qty || 0,
    confluenceScore: row.candidate.confluenceScore || row.confluenceScore || 0,
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
    tp3Done: false,
    runnerActive: false,
    breakEvenMoved: false,
    trailActive: false,
    lastManagedAt: null,
    sizingMultiplier: row.candidate.sizingMultiplier || plan.sizingMultiplier || 1,
    sizingReason: row.candidate.sizingReason || '',
    addOnCount: 0,
    addOns: [],
    managementEvents: [],
    openedAt: new Date().toISOString(),
    signalClosedCandleTime: getCachedCandles(row.coin, row.candidate.signalTimeframe || '5m').at(-1)?.time || null,
    pendingCreatedCandleTime: row.candidate.entryType === 'PULLBACK_LIMIT' ? (getCachedCandles(row.coin, row.candidate.signalTimeframe || '5m').at(-1)?.time || null) : null,
    rr: row.candidate.rr,
    score: row.score,
    entryReason: [row.entryReason || row.whyReason || row.blockedBy || row.candidate.slReason || 'Entry conditions passed', row.candidate.entryReasonExtra, row.candidate.weeklyPolicy?.reason].filter(Boolean).join(' | '),
    whyReason: [row.entryReason || row.whyReason || row.blockedBy || row.candidate.slReason || 'Entry conditions passed', row.candidate.entryReasonExtra, row.candidate.weeklyPolicy?.reason].filter(Boolean).join(' | '),
    mode,
    orderType: row.candidate.orderType || (settings.entryOrderType === 'market' ? 'market' : 'limit'),
    entryType: row.candidate.entryType || 'MARKET_OR_IMMEDIATE',
    status: row.candidate.entryType === 'PULLBACK_LIMIT' && row.candidate.limitFillableNow === false ? 'PENDING_LIMIT' : 'OPEN',
    marketSource: row.source || 'UNKNOWN',
    slMode: row.candidate.slMode || 'TECHNICAL_SL_FIRST_POSITION_SIZE_SECOND',
    slReason: row.candidate.slReason || '',
    dynamicRiskCapUsd: row.candidate.dynamicRiskCapUsd || 0,
    weeklyBias: row.candidate.weeklyBias || row.weeklyBias || null,
    weeklyPolicy: row.candidate.weeklyPolicy || row.weeklyPolicy || null,
    isCounterTrendPullback: Boolean(row.candidate.isCounterTrendPullback)
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
    tp3Done: false,
    runnerActive: false,
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
  if (!liveReady(settings, keys)) throw new Error('Live mode is not fully confirmed. Check API test, live confirmation, wallet sync, market data and position sync.');
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
  const exchangeOrderId = response?.result?.id || response?.result?.order_id || response?.result?.order?.id || response?.id || response?.order_id || null;
  if (!exchangeOrderId) {
    log('CRITICAL', `Delta accepted/returned a response for ${row.coin} but no exchange order id was found. Trade is NOT counted as live-managed. Check Delta manually before any further trade.`, { response });
    throw new Error('Delta response did not include an exchange order id; refusing to count this as a managed live trade.');
  }
  const bracketFieldsPresent = Boolean(order.bracket_stop_loss_price && order.bracket_take_profit_price);
  if (!bracketFieldsPresent) {
    log('CRITICAL', `LIVE order payload for ${row.coin} does not contain verified SL/TP bracket prices. Refusing live order tracking.`, { order });
    throw new Error('LIVE order payload missing SL/TP bracket prices.');
  }
  trade.status = orderType === 'limit_order' ? 'PENDING_LIMIT' : 'OPEN';
  trade.exchangeOrderId = exchangeOrderId;
  trade.exchangeResponse = response?.result || response;
  trade.liveOrderSize = order.size;
  trade.clientOrderId = clientOrderId;
  trade.liveBracketRequested = true;
  trade.bracketStopLossPrice = order.bracket_stop_loss_price;
  trade.bracketTakeProfitPrice = order.bracket_take_profit_price;
  trades.openTrades.push(trade);
  appendTradeJournalEvent(trade.status === 'PENDING_LIMIT' ? 'PENDING_LIMIT' : 'OPEN', trade, { entryReason: trade.entryReason, sl: trade.sl, tp1: trade.tp1, tp2: trade.tp2, tp3: trade.tp3, orderType: trade.orderType, entryType: trade.entryType });
  try {
    await syncLiveAccountIfReady(settings, keys, { force: true });
    log('VERIFY', `Post-order sync completed for ${row.coin}. LIVE trade has Delta order id ${exchangeOrderId}; confirm bracket SL/TP is visible on Delta before leaving trade unattended.`, { clientOrderId, exchangeOrderId, sl: order.bracket_stop_loss_price, tp: order.bracket_take_profit_price });
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
  const grossWinUsd = pct(closed.filter(t => Number(t.pnl || 0) > 0).reduce((s, t) => s + Number(t.pnl || 0), 0));
  const grossLossUsd = pct(closed.filter(t => Number(t.pnl || 0) < 0).reduce((s, t) => s + Number(t.pnl || 0), 0));
  const grossLossUsdAbs = pct(Math.abs(grossLossUsd));
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
    grossWinUsd,
    grossLossUsd,
    grossLossUsdAbs,
    closedPnl,
    netClosedPnl: closedPnl,
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
    'emaPeriod', 'entryEmaFastPeriod', 'entryEmaSlowPeriod', 'trendEmaPeriod', 'dominantEmaPeriod', 'rsiPeriod', 'cciPeriod', 'volumeSpikeMultiplier', 'minConfluenceScore', 'aPlusConfluenceScore', 'tier3MinConfluenceScore', 'minMomentumConfirmations', 'structureProximityAtr', 'vwapLookback', 'marketMemoryScanDepth', 'marketMemoryTopMatches', 'marketMemoryPatternLength', 'marketMemoryFutureLookahead', 'marketMemorySensitivity', 'marketMemoryMinSimilarityPct', 'marketMemoryCloudAtrMult', 'marketMemoryNearCloudAtrMult', 'marketMemoryMaxExtensionAtr', 'marketMemoryMinForwardMoveAtr', 'previousDayMidTolerancePct', 'srProximityAtrMult', 'srBreakoutRetestAtrMult', 'volumeFlowLookback', 'volumeFlowMinBiasPct', 'emaSlopeThresholdPct', 'atrPeriod', 'atrStopMultiplier', 'supertrendMultiplier', 'kdeThreshold',
    'kdeLookback', 'relativeVolumeLookback', 'htfMinimumAligned', 'trendVotesRequired', 'zoneProximityPct', 'riskPercent', 'defaultLeverage',
    'maxLeverage', 'maxConcurrentPositions', 'maxBotAllocationUsd', 'liveWalletAllocationPct', 'liveMaxBotAllocationUsd', 'maxMarginPerCoinUsd', 'majorCoinMaxMarginUsd',
    'initialMarginUsd', 'majorInitialMarginUsd', 'maxStopLossUsd', 'minEntryMarginUsd', 'addOnStepMarginUsd',
    'majorAddOnStepMarginUsd', 'maxAddOnsPerCoin', 'profitAddOnTriggerR', 'profitAddOnSizePct', 'profitAddOnMinScore',
    'breakEvenTriggerR', 'breakEvenBufferR', 'tp1TriggerR', 'tp2TriggerR', 'tp3TriggerR', 'institutionalEmaFastPeriod', 'institutionalEmaMidPeriod', 'institutionalEmaSlowPeriod', 'institutionalPullbackLookback', 'institutionalPullbackAtrMult', 'institutionalMaxExtensionAtr', 'institutionalPatternLookback', 'dynamicTpStrongR', 'dynamicTpMaxR', 'dynamicTp1ShiftR', 'dynamicTp1StrongClosePct', 'trailingStopEmaPeriod', 'trailingStopAtrBuffer', 'qualitySizeScore1', 'qualitySizeMultiplier1', 'qualitySizeScore2', 'qualitySizeMultiplier2', 'maxQualitySizeMultiplier',
    'dailyDrawdownLimitPct', 'weeklyDrawdownLimitPct', 'monthlyDrawdownLimitPct',
    'maxFundingRatePct8h', 'extremeFundingRatePct8h', 'newsBlackoutBeforeMin', 'newsBlackoutAfterMin', 'minRR', 'autoScanSeconds',
    'marketDataRefreshSeconds', 'liveOrderSize', 'macdFastLength', 'macdSlowLength', 'macdSignalLength', 'mtfEmaPeriod', 'minEmaGapPct', 'divergencePivotLeft', 'divergencePivotRight', 'divergenceLookback', 'minDivergenceMacdPct', 'entrySignalWindowCandles', 'histColorLookback', 'tradingViewSignalFreshnessSeconds', 'sarMacdEmaPeriod', 'sarMacdSarStep', 'sarMacdSarMax', 'sarMacdAdxThreshold', 'sarMacdPullbackLookback', 'sarMacdMaxDistanceAtr', 'sarMacdSwingLookback', 'sarMacdEmaStopBufferAtr', 'twoPoleFilterLength', 'twoPoleBuyMaxLevel', 'twoPoleSellMinLevel', 'twoPoleDeltaVolumeThresholdPct', 'breakoutLookback', 'breakoutConsolidationLookback', 'breakoutMaxRangeAtrMult', 'breakoutMomentumBodyAtrMult', 'breakoutSlBufferAtrMult', 'breakoutTp1R', 'chandelierLength', 'chandelierAtrMult', 'totalWalletAmount', 'maxTradesPerDay', 'maxDailyLossUsd', 'maxConsecutiveLosses', 'paperMinScore', 'adrUsedLimitPct', 'timeFailureCandles', 'pendingExpiryMinutes', 'minSlAtrMult', 'minTrendQuality', 'moveSlAfterTp1MinR', 'moveSlAfterTp1MinAge', 'rewardTargetR', 'targetFullTradeProfitUsd', 'minFullTradeProfitUsd', 'targetProfitUsd', 'minTargetProfitUsd', 'slSwingLookback', 'slBufferAtrMult', 'maxTechnicalSlAtrMult', 'pullbackAtrMult', 'pullbackMaxAtrMult', 'tp1ClosePct', 'tp2ClosePct', 'tp3ClosePct', 'waveTrendChannelLength', 'waveTrendAverageLength', 'waveTrendSignalLength', 'waveTrendReversionThreshold', 'waveTrendSetupWindowCandles', 'breakRetestPivotLookback', 'breakRetestMinBarsAfterBreak', 'breakRetestEntryWindowCandles', 'breakRetestToleranceAtrMult', 'breakRetestTolerancePct', 'breakRetestLevelSearchCount', 'breakRetestLevelMaxAgeCandles', 'ma1Length', 'trendMaToleranceAtrMult', 'horizonUpgradeMinR', 'scalpToIntradayTargetR', 'intradayToSwingTargetR', 'smiPercentKLength', 'smiPercentDLength', 'smiSignalLength', 'smiSmoothingPeriod', 'smiOverbought', 'smiOversold', 'smiPullbackWindowCandles', 'smiRecoveryLookbackCandles', 'emaCloudFastLength', 'emaCloudSlowLength', 'cloudTouchToleranceAtrMult', 'cloudBreakToleranceAtrMult', 'knFastEmaLength', 'knSlowEmaLength', 'knAtrPeriod', 'knSlAtrMultiplier', 'knSignalLookbackCandles', 'knEntryConfirmLookbackCandles', 'knMaxEntryCandleAtrMult', 'knMaxEntryCandlePct'
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
  if (typeof patch.ma1Type === 'string') out.ma1Type = patch.ma1Type.trim().toUpperCase() === 'EMA' ? 'EMA' : 'SMA';
  if (typeof patch.trendMaType === 'string') out.trendMaType = patch.trendMaType.trim().toUpperCase() === 'EMA' ? 'EMA' : 'SMA';
  if (typeof patch.ma1VisualColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(patch.ma1VisualColor.trim())) out.ma1VisualColor = patch.ma1VisualColor.trim();
  if (typeof patch.requireDivergenceForEntry === 'boolean') out.requireDivergenceForEntry = patch.requireDivergenceForEntry;
  if (typeof patch.institutionalEmaEnabled === 'boolean') out.institutionalEmaEnabled = patch.institutionalEmaEnabled;
  if (typeof patch.institutionalRequireEmaStack === 'boolean') out.institutionalRequireEmaStack = patch.institutionalRequireEmaStack;
  if (typeof patch.institutionalRequirePullback === 'boolean') out.institutionalRequirePullback = patch.institutionalRequirePullback;
  if (typeof patch.institutionalRequirePriceAction === 'boolean') out.institutionalRequirePriceAction = patch.institutionalRequirePriceAction;
  if (typeof patch.institutionalRequireHtfMacd === 'boolean') out.institutionalRequireHtfMacd = patch.institutionalRequireHtfMacd;
  if (typeof patch.dynamicTpEnabled === 'boolean') out.dynamicTpEnabled = patch.dynamicTpEnabled;
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
  if (typeof patch.waveTrendPracticalRecovery === 'boolean') out.waveTrendPracticalRecovery = patch.waveTrendPracticalRecovery;
  if (typeof patch.multiHorizonScanEnabled === 'boolean') out.multiHorizonScanEnabled = patch.multiHorizonScanEnabled;
  if (typeof patch.horizonUpgradeEnabled === 'boolean') out.horizonUpgradeEnabled = patch.horizonUpgradeEnabled;
  if (typeof patch.horizonUpgradeRequireSameSideSignal === 'boolean') out.horizonUpgradeRequireSameSideSignal = patch.horizonUpgradeRequireSameSideSignal;
  if (typeof patch.requireCloudTouch === 'boolean') out.requireCloudTouch = patch.requireCloudTouch;
  if (typeof patch.requireSmiCandleColor === 'boolean') out.requireSmiCandleColor = patch.requireSmiCandleColor;
  if (typeof patch.knRequireSmiDirection === 'boolean') out.knRequireSmiDirection = patch.knRequireSmiDirection;
  if (Array.isArray(patch.strategyTimeframes)) out.strategyTimeframes = patch.strategyTimeframes.map(normalizeResolution).filter(r => ['5m','15m','30m','1h','2h','4h'].includes(r));
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
  if (typeof patch.vwapConfluenceEnabled === 'boolean') out.vwapConfluenceEnabled = patch.vwapConfluenceEnabled;
  if (typeof patch.volumeSpikeConfluenceEnabled === 'boolean') out.volumeSpikeConfluenceEnabled = patch.volumeSpikeConfluenceEnabled;
  if (typeof patch.marketMemoryEnabled === 'boolean') out.marketMemoryEnabled = patch.marketMemoryEnabled;
  if (typeof patch.marketMemoryRequirePullback === 'boolean') out.marketMemoryRequirePullback = patch.marketMemoryRequirePullback;
  if (typeof patch.marketMemoryRequireTopMatchOutcome === 'boolean') out.marketMemoryRequireTopMatchOutcome = patch.marketMemoryRequireTopMatchOutcome;
  if (typeof patch.srVolumeAlignmentEnabled === 'boolean') out.srVolumeAlignmentEnabled = patch.srVolumeAlignmentEnabled;
  if (typeof patch.requirePreviousDayContext === 'boolean') out.requirePreviousDayContext = patch.requirePreviousDayContext;
  if (typeof patch.requireMtfSupportResistance === 'boolean') out.requireMtfSupportResistance = patch.requireMtfSupportResistance;
  if (typeof patch.requireVolumeFlowAlignment === 'boolean') out.requireVolumeFlowAlignment = patch.requireVolumeFlowAlignment;
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
  out.maxStopLossUsd = Math.min(Math.max(out.maxStopLossUsd ?? DEFAULT_SETTINGS.maxStopLossUsd, 0.1), 10);
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
  out.institutionalEmaEnabled = typeof out.institutionalEmaEnabled === 'boolean' ? out.institutionalEmaEnabled : DEFAULT_SETTINGS.institutionalEmaEnabled;
  out.institutionalRequireEmaStack = typeof out.institutionalRequireEmaStack === 'boolean' ? out.institutionalRequireEmaStack : DEFAULT_SETTINGS.institutionalRequireEmaStack;
  out.institutionalRequirePullback = typeof out.institutionalRequirePullback === 'boolean' ? out.institutionalRequirePullback : DEFAULT_SETTINGS.institutionalRequirePullback;
  out.institutionalRequirePriceAction = typeof out.institutionalRequirePriceAction === 'boolean' ? out.institutionalRequirePriceAction : DEFAULT_SETTINGS.institutionalRequirePriceAction;
  out.institutionalRequireHtfMacd = typeof out.institutionalRequireHtfMacd === 'boolean' ? out.institutionalRequireHtfMacd : DEFAULT_SETTINGS.institutionalRequireHtfMacd;
  out.dynamicTpEnabled = typeof out.dynamicTpEnabled === 'boolean' ? out.dynamicTpEnabled : DEFAULT_SETTINGS.dynamicTpEnabled;
  out.srVolumeAlignmentEnabled = typeof out.srVolumeAlignmentEnabled === 'boolean' ? out.srVolumeAlignmentEnabled : DEFAULT_SETTINGS.srVolumeAlignmentEnabled;
  out.requirePreviousDayContext = typeof out.requirePreviousDayContext === 'boolean' ? out.requirePreviousDayContext : DEFAULT_SETTINGS.requirePreviousDayContext;
  out.requireMtfSupportResistance = typeof out.requireMtfSupportResistance === 'boolean' ? out.requireMtfSupportResistance : DEFAULT_SETTINGS.requireMtfSupportResistance;
  out.requireVolumeFlowAlignment = typeof out.requireVolumeFlowAlignment === 'boolean' ? out.requireVolumeFlowAlignment : DEFAULT_SETTINGS.requireVolumeFlowAlignment;
  out.previousDayMidTolerancePct = Math.min(Math.max(Number(out.previousDayMidTolerancePct ?? DEFAULT_SETTINGS.previousDayMidTolerancePct), 0), 3);
  out.srProximityAtrMult = Math.min(Math.max(Number(out.srProximityAtrMult ?? DEFAULT_SETTINGS.srProximityAtrMult), 0.25), 5);
  out.srBreakoutRetestAtrMult = Math.min(Math.max(Number(out.srBreakoutRetestAtrMult ?? DEFAULT_SETTINGS.srBreakoutRetestAtrMult), 0.1), 3);
  out.volumeFlowLookback = Math.min(Math.max(Math.floor(out.volumeFlowLookback ?? DEFAULT_SETTINGS.volumeFlowLookback), 8), 96);
  out.volumeFlowMinBiasPct = Math.min(Math.max(Number(out.volumeFlowMinBiasPct ?? DEFAULT_SETTINGS.volumeFlowMinBiasPct), 0), 60);
  out.institutionalEmaFastPeriod = 50;
  out.institutionalEmaMidPeriod = 50;
  out.institutionalEmaSlowPeriod = Math.min(Math.max(Math.floor(out.institutionalEmaSlowPeriod ?? DEFAULT_SETTINGS.institutionalEmaSlowPeriod), 100), 300);
  out.institutionalPullbackLookback = Math.min(Math.max(Math.floor(out.institutionalPullbackLookback ?? DEFAULT_SETTINGS.institutionalPullbackLookback), 3), 30);
  out.institutionalPullbackAtrMult = Math.min(Math.max(Number(out.institutionalPullbackAtrMult ?? DEFAULT_SETTINGS.institutionalPullbackAtrMult), 0.1), 5);
  out.institutionalMaxExtensionAtr = Math.min(Math.max(Number(out.institutionalMaxExtensionAtr ?? DEFAULT_SETTINGS.institutionalMaxExtensionAtr), 0.5), 8);
  out.institutionalPatternLookback = Math.min(Math.max(Math.floor(out.institutionalPatternLookback ?? DEFAULT_SETTINGS.institutionalPatternLookback), 8), 80);
  out.dynamicTpStrongR = Math.min(Math.max(Number(out.dynamicTpStrongR ?? DEFAULT_SETTINGS.dynamicTpStrongR), 2), 8);
  out.dynamicTpMaxR = Math.min(Math.max(Number(out.dynamicTpMaxR ?? DEFAULT_SETTINGS.dynamicTpMaxR), out.dynamicTpStrongR), 8);
  out.dynamicTp1ShiftR = Math.min(Math.max(Number(out.dynamicTp1ShiftR ?? DEFAULT_SETTINGS.dynamicTp1ShiftR), 1), out.dynamicTpStrongR);
  out.dynamicTp1StrongClosePct = Math.min(Math.max(Number(out.dynamicTp1StrongClosePct ?? DEFAULT_SETTINGS.dynamicTp1StrongClosePct), 1), 90);
  out.trailingStopEmaPeriod = Math.min(Math.max(Math.floor(out.trailingStopEmaPeriod ?? DEFAULT_SETTINGS.trailingStopEmaPeriod), 3), 50);
  out.trailingStopAtrBuffer = Math.min(Math.max(Number(out.trailingStopAtrBuffer ?? DEFAULT_SETTINGS.trailingStopAtrBuffer), 0), 2);
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
  out.entryEmaFastPeriod = 50;
  out.entryEmaSlowPeriod = 200;
  out.trendEmaPeriod = 50;
  out.dominantEmaPeriod = 200;
  out.rsiPeriod = Math.min(Math.max(Math.floor(out.rsiPeriod ?? DEFAULT_SETTINGS.rsiPeriod), 5), 50);
  out.cciPeriod = Math.min(Math.max(Math.floor(out.cciPeriod ?? DEFAULT_SETTINGS.cciPeriod), 5), 60);
  out.vwapLookback = Math.min(Math.max(Math.floor(out.vwapLookback ?? DEFAULT_SETTINGS.vwapLookback ?? 96), 20), 300);
  out.volumeSpikeMultiplier = Math.min(Math.max(Number(out.volumeSpikeMultiplier ?? DEFAULT_SETTINGS.volumeSpikeMultiplier), 1), 5);
  out.minConfluenceScore = Math.min(Math.max(Number(out.minConfluenceScore ?? DEFAULT_SETTINGS.minConfluenceScore), 5), 12);
  out.aPlusConfluenceScore = Math.min(Math.max(Number(out.aPlusConfluenceScore ?? DEFAULT_SETTINGS.aPlusConfluenceScore), out.minConfluenceScore), 13);
  out.tier3MinConfluenceScore = Math.min(Math.max(Number(out.tier3MinConfluenceScore ?? DEFAULT_SETTINGS.tier3MinConfluenceScore), out.minConfluenceScore), 13);
  out.minMomentumConfirmations = Math.min(Math.max(Math.floor(out.minMomentumConfirmations ?? DEFAULT_SETTINGS.minMomentumConfirmations), 2), 5);
  out.structureProximityAtr = Math.min(Math.max(Number(out.structureProximityAtr ?? DEFAULT_SETTINGS.structureProximityAtr), 0.25), 4);
  out.vwapConfluenceEnabled = typeof out.vwapConfluenceEnabled === 'boolean' ? out.vwapConfluenceEnabled : DEFAULT_SETTINGS.vwapConfluenceEnabled;
  out.volumeSpikeConfluenceEnabled = typeof out.volumeSpikeConfluenceEnabled === 'boolean' ? out.volumeSpikeConfluenceEnabled : DEFAULT_SETTINGS.volumeSpikeConfluenceEnabled;
  out.marketMemoryEnabled = typeof out.marketMemoryEnabled === 'boolean' ? out.marketMemoryEnabled : DEFAULT_SETTINGS.marketMemoryEnabled;
  out.marketMemoryRequirePullback = typeof out.marketMemoryRequirePullback === 'boolean' ? out.marketMemoryRequirePullback : DEFAULT_SETTINGS.marketMemoryRequirePullback;
  out.marketMemoryRequireTopMatchOutcome = typeof out.marketMemoryRequireTopMatchOutcome === 'boolean' ? out.marketMemoryRequireTopMatchOutcome : DEFAULT_SETTINGS.marketMemoryRequireTopMatchOutcome;
  out.marketMemoryScanDepth = Math.min(Math.max(Math.floor(out.marketMemoryScanDepth ?? DEFAULT_SETTINGS.marketMemoryScanDepth), 120), 900);
  out.marketMemoryTopMatches = Math.min(Math.max(Math.floor(out.marketMemoryTopMatches ?? DEFAULT_SETTINGS.marketMemoryTopMatches), 1), 10);
  out.marketMemoryPatternLength = Math.min(Math.max(Math.floor(out.marketMemoryPatternLength ?? DEFAULT_SETTINGS.marketMemoryPatternLength), 5), 30);
  out.marketMemoryFutureLookahead = Math.min(Math.max(Math.floor(out.marketMemoryFutureLookahead ?? DEFAULT_SETTINGS.marketMemoryFutureLookahead), 3), 30);
  out.marketMemorySensitivity = Math.min(Math.max(Number(out.marketMemorySensitivity ?? DEFAULT_SETTINGS.marketMemorySensitivity), 0.3), 5);
  out.marketMemoryMinSimilarityPct = Math.min(Math.max(Number(out.marketMemoryMinSimilarityPct ?? DEFAULT_SETTINGS.marketMemoryMinSimilarityPct), 55), 98);
  out.marketMemoryCloudAtrMult = Math.min(Math.max(Number(out.marketMemoryCloudAtrMult ?? DEFAULT_SETTINGS.marketMemoryCloudAtrMult), 0.2), 3);
  out.marketMemoryNearCloudAtrMult = Math.min(Math.max(Number(out.marketMemoryNearCloudAtrMult ?? DEFAULT_SETTINGS.marketMemoryNearCloudAtrMult), 0), 2);
  out.marketMemoryMaxExtensionAtr = Math.min(Math.max(Number(out.marketMemoryMaxExtensionAtr ?? DEFAULT_SETTINGS.marketMemoryMaxExtensionAtr), 0.5), 5);
  out.marketMemoryMinForwardMoveAtr = Math.min(Math.max(Number(out.marketMemoryMinForwardMoveAtr ?? DEFAULT_SETTINGS.marketMemoryMinForwardMoveAtr), 0), 3);
  out.srVolumeAlignmentEnabled = typeof out.srVolumeAlignmentEnabled === 'boolean' ? out.srVolumeAlignmentEnabled : DEFAULT_SETTINGS.srVolumeAlignmentEnabled;
  out.requireClosedDailyContext = typeof out.requireClosedDailyContext === 'boolean' ? out.requireClosedDailyContext : DEFAULT_SETTINGS.requireClosedDailyContext;
  out.minDailyCandlesForContext = Math.min(Math.max(Math.floor(Number(out.minDailyCandlesForContext ?? DEFAULT_SETTINGS.minDailyCandlesForContext ?? 9)), 2), 60);
  out.requirePreviousDayContext = typeof out.requirePreviousDayContext === 'boolean' ? out.requirePreviousDayContext : DEFAULT_SETTINGS.requirePreviousDayContext;
  out.requireMtfSupportResistance = typeof out.requireMtfSupportResistance === 'boolean' ? out.requireMtfSupportResistance : DEFAULT_SETTINGS.requireMtfSupportResistance;
  out.requireVolumeFlowAlignment = typeof out.requireVolumeFlowAlignment === 'boolean' ? out.requireVolumeFlowAlignment : DEFAULT_SETTINGS.requireVolumeFlowAlignment;
  out.require5mVolumeFlow = typeof out.require5mVolumeFlow === 'boolean' ? out.require5mVolumeFlow : DEFAULT_SETTINGS.require5mVolumeFlow;
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
  // V77 execution-mode controls. Keep strategy focused: SMI + KN Smart TP/SL with chart-marked Entry/SL/TP.
  out.entryModel = 'SMI_KN_PULLBACK_TPSL';
  out.requireDivergenceForEntry = false;
  out.zeroLineMode = 'off';
  out.smiPercentKLength = Math.min(Math.max(Math.floor(Number(out.smiPercentKLength ?? DEFAULT_SETTINGS.smiPercentKLength)), 1), 100);
  out.smiPercentDLength = Math.min(Math.max(Math.floor(Number(out.smiPercentDLength ?? DEFAULT_SETTINGS.smiPercentDLength)), 1), 50);
  out.smiSignalLength = Math.min(Math.max(Math.floor(Number(out.smiSignalLength ?? DEFAULT_SETTINGS.smiSignalLength)), 1), 100);
  out.smiSmoothingPeriod = Math.min(Math.max(Math.floor(Number(out.smiSmoothingPeriod ?? DEFAULT_SETTINGS.smiSmoothingPeriod)), 1), 50);
  out.smiOverbought = Math.min(Math.max(Number(out.smiOverbought ?? DEFAULT_SETTINGS.smiOverbought), 10), 90);
  out.smiOversold = Math.min(Math.max(Number(out.smiOversold ?? DEFAULT_SETTINGS.smiOversold), -90), -10);
  out.smiPullbackWindowCandles = Math.min(Math.max(Math.floor(Number(out.smiPullbackWindowCandles ?? DEFAULT_SETTINGS.smiPullbackWindowCandles)), 5), 360);
  out.smiRecoveryLookbackCandles = Math.min(Math.max(Math.floor(Number(out.smiRecoveryLookbackCandles ?? DEFAULT_SETTINGS.smiRecoveryLookbackCandles)), 1), 30);
  out.smiAllowRecentRecoveryCross = typeof out.smiAllowRecentRecoveryCross === 'boolean' ? out.smiAllowRecentRecoveryCross : DEFAULT_SETTINGS.smiAllowRecentRecoveryCross;
  out.practicalCloudTouchFallback = typeof out.practicalCloudTouchFallback === 'boolean' ? out.practicalCloudTouchFallback : DEFAULT_SETTINGS.practicalCloudTouchFallback;
  out.practicalCandleColorSoft = typeof out.practicalCandleColorSoft === 'boolean' ? out.practicalCandleColorSoft : DEFAULT_SETTINGS.practicalCandleColorSoft;
  out.emaCloudFastLength = Math.min(Math.max(Math.floor(Number(out.emaCloudFastLength ?? DEFAULT_SETTINGS.emaCloudFastLength)), 5), 300);
  out.emaCloudSlowLength = Math.min(Math.max(Math.floor(Number(out.emaCloudSlowLength ?? DEFAULT_SETTINGS.emaCloudSlowLength)), out.emaCloudFastLength + 1), 500);
  out.cloudTouchToleranceAtrMult = Math.min(Math.max(Number(out.cloudTouchToleranceAtrMult ?? DEFAULT_SETTINGS.cloudTouchToleranceAtrMult), 0), 2);
  out.cloudBreakToleranceAtrMult = Math.min(Math.max(Number(out.cloudBreakToleranceAtrMult ?? DEFAULT_SETTINGS.cloudBreakToleranceAtrMult), 0), 1);
  out.requireCloudTouch = typeof out.requireCloudTouch === 'boolean' ? out.requireCloudTouch : DEFAULT_SETTINGS.requireCloudTouch;
  out.requireSmiCandleColor = typeof out.requireSmiCandleColor === 'boolean' ? out.requireSmiCandleColor : DEFAULT_SETTINGS.requireSmiCandleColor;
  out.knFastEmaLength = Math.min(Math.max(Math.floor(Number(out.knFastEmaLength ?? DEFAULT_SETTINGS.knFastEmaLength)), 1), 100);
  out.knSlowEmaLength = Math.min(Math.max(Math.floor(Number(out.knSlowEmaLength ?? DEFAULT_SETTINGS.knSlowEmaLength)), out.knFastEmaLength + 1), 200);
  out.knAtrPeriod = Math.min(Math.max(Math.floor(Number(out.knAtrPeriod ?? DEFAULT_SETTINGS.knAtrPeriod)), 1), 100);
  out.knSlAtrMultiplier = Math.min(Math.max(Number(out.knSlAtrMultiplier ?? DEFAULT_SETTINGS.knSlAtrMultiplier), 0.2), 10);
  out.knSignalLookbackCandles = Math.min(Math.max(Math.floor(Number(out.knSignalLookbackCandles ?? DEFAULT_SETTINGS.knSignalLookbackCandles)), 1), 60);
  out.knEntryConfirmLookbackCandles = Math.min(Math.max(Math.floor(Number(out.knEntryConfirmLookbackCandles ?? DEFAULT_SETTINGS.knEntryConfirmLookbackCandles)), 1), 30);
  out.knMaxEntryCandleAtrMult = Math.min(Math.max(Number(out.knMaxEntryCandleAtrMult ?? DEFAULT_SETTINGS.knMaxEntryCandleAtrMult), 0.5), 10);
  out.knMaxEntryCandlePct = Math.min(Math.max(Number(out.knMaxEntryCandlePct ?? DEFAULT_SETTINGS.knMaxEntryCandlePct), 0.05), 10);
  out.knRequireSmiDirection = typeof out.knRequireSmiDirection === 'boolean' ? out.knRequireSmiDirection : DEFAULT_SETTINGS.knRequireSmiDirection;
  out.tp1TriggerR = Math.min(Math.max(Number(out.tp1TriggerR ?? DEFAULT_SETTINGS.tp1TriggerR), 0.5), 5);
  out.tp2TriggerR = Math.min(Math.max(Number(out.tp2TriggerR ?? DEFAULT_SETTINGS.tp2TriggerR), out.tp1TriggerR), 8);
  out.tp3TriggerR = Math.min(Math.max(Number(out.tp3TriggerR ?? DEFAULT_SETTINGS.tp3TriggerR), out.tp2TriggerR), 10);
  out.strategyTimeframes = strategyTimeframes(out);
  out.multiHorizonScanEnabled = typeof out.multiHorizonScanEnabled === 'boolean' ? out.multiHorizonScanEnabled : DEFAULT_SETTINGS.multiHorizonScanEnabled;
  out.horizonUpgradeEnabled = typeof out.horizonUpgradeEnabled === 'boolean' ? out.horizonUpgradeEnabled : DEFAULT_SETTINGS.horizonUpgradeEnabled;
  out.horizonUpgradeRequireSameSideSignal = typeof out.horizonUpgradeRequireSameSideSignal === 'boolean' ? out.horizonUpgradeRequireSameSideSignal : DEFAULT_SETTINGS.horizonUpgradeRequireSameSideSignal;
  out.horizonUpgradeMinR = Math.min(Math.max(Number(out.horizonUpgradeMinR ?? DEFAULT_SETTINGS.horizonUpgradeMinR), 0.5), 3);
  out.scalpToIntradayTargetR = Math.min(Math.max(Number(out.scalpToIntradayTargetR ?? DEFAULT_SETTINGS.scalpToIntradayTargetR), 1.5), 6);
  out.intradayToSwingTargetR = Math.min(Math.max(Number(out.intradayToSwingTargetR ?? DEFAULT_SETTINGS.intradayToSwingTargetR), 2), 8);
  out.primaryTimeframe = '5m';
  out.executionTimeframe = '5m';
  out.emaFastTimeframe = '15m';
  out.emaSlowTimeframe = '1h';
  out.macdTrendTimeframe = '1h';
  out.higherTimeframes = ['15m', '1h'];
  out.htfMinimumAligned = 1;
  out.institutionalEmaEnabled = false;
  out.institutionalRequireEmaStack = false;
  out.institutionalRequirePullback = false;
  out.institutionalRequirePriceAction = false;
  out.institutionalRequireHtfMacd = false;
  out.marketMemoryEnabled = false;
  out.marketMemoryRequirePullback = false;
  out.marketMemoryRequireTopMatchOutcome = false;
  out.srVolumeAlignmentEnabled = false;
  out.requireClosedDailyContext = false;
  out.requirePreviousDayContext = false;
  out.requireMtfSupportResistance = false;
  out.requireVolumeFlowAlignment = false;
  out.require5mVolumeFlow = false;
  out.dynamicTpEnabled = true;
  out.macdConfirmationEnabled = false;
  out.twoPoleModuleEnabled = false;
  out.twoPoleAllowLocalEntry = false;
  out.breakoutModuleEnabled = false;
  out.breakoutAllowLocalEntry = false;
  out.vwapModuleEnabled = false;
  out.vwapAllowLocalEntry = false;
  out.sarMacdModuleEnabled = false;
  out.sarMacdAllowLocalEntry = false;
  out.emaPeriod = out.emaCloudFastLength;
  out.mtfEmaPeriod = out.emaCloudFastLength;
  out.trendEmaPeriod = out.emaCloudFastLength;
  out.dominantEmaPeriod = out.emaCloudSlowLength;
  out.minConfluenceScore = 1;
  out.aPlusConfluenceScore = 3;
  out.tier3MinConfluenceScore = 3;
  out.minRR = Math.max(1.5, Math.min(Number(out.minRR || DEFAULT_SETTINGS.minRR), 3));
  out.rewardTargetR = Math.max(out.minRR, Math.min(Number(out.rewardTargetR || DEFAULT_SETTINGS.rewardTargetR), 6));
  out.requirePullbackForExecution = true;
  out.allowMarketWhenNoPullback = false;
  out.smartEntryEnabled = true;
  out.smartEntryWaitCandles = Math.min(Math.max(Math.floor(Number(out.smartEntryWaitCandles || 8)), 1), 30);
  out.smartEntryMinGapAtr = Math.min(Math.max(Number(out.smartEntryMinGapAtr || 0.12), 0.02), 1.5);
  out.smartEntryMaxGapAtr = Math.min(Math.max(Number(out.smartEntryMaxGapAtr || 1.2), 0.2), 5);
  out.smartEntryUseEma5 = out.smartEntryUseEma5 !== false;
  out.smartEntryUseEma12 = out.smartEntryUseEma12 !== false;
  out.smartEntryUseCandleMidpoint = out.smartEntryUseCandleMidpoint !== false;
  out.smartEntryUseFib382 = out.smartEntryUseFib382 !== false;
  out.smartEntryUseFib50 = out.smartEntryUseFib50 !== false;
  out.entryOrderType = 'limit';
  out.signalSource = 'v77_smi_kn_smart_tpsl_chart_marks';
  out.strategyMode = 'V77_SMI_KN_PULLBACK_TPSL_CHART_MARKS';
  out.liveDataPaperTradingOnly = out.liveDataPaperTradingOnly !== false;
  out.paperTrade = out.liveDataPaperTradingOnly ? true : (typeof out.paperTrade === 'boolean' ? out.paperTrade : true);
  out.liveAddOnsEnabled = false;
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


function latestClosedChartSignal(symbol, candles, settings, resolution = '5m') {
  const closes = candles.map(c => c.close).filter(n => Number.isFinite(n) && n > 0);
  const res = normalizeResolution(resolution);
  const signal = calculateSmiKnSmartSignalForResolution(symbol, res, closes[closes.length - 1], atrFromCandles(candles, Number(settings.knAtrPeriod || settings.atrPeriod || 14)), settings);
  return signal;
}

function buildChartPayload(symbol, resolution = '5m', settings = loadSettings()) {
  const sym = String(symbol || settings.assets?.[0] || 'BTCUSD').toUpperCase();
  const res = normalizeResolution(resolution || settings.executionTimeframe || '5m');
  let fullClosedCandles = getCachedCandles(sym, res);
  const usingSyntheticChart = !fullClosedCandles.length;
  if (usingSyntheticChart) fullClosedCandles = syntheticChartCandlesFromHistory(sym, res);
  const closedSlice = fullClosedCandles.slice(-180);
  const closedChartOffset = Math.max(0, fullClosedCandles.length - closedSlice.length);

  const visual = livePreviewCandles(sym, res, fullClosedCandles, settings);
  const visualFullCandles = visual.candles;
  const candles = visualFullCandles.slice(-(visual.usesLivePreview ? 181 : 180));

  const execSliceStart = Math.max(0, visualFullCandles.length - candles.length);
  const knFull = knSmartFromCandles(visualFullCandles, settings);
  const emaFast = (knFull.fast || []).slice(execSliceStart);
  const emaSlow = (knFull.slow || []).slice(execSliceStart);
  const knBuySignals = (knFull.buySignals || []).slice(execSliceStart);
  const knSellSignals = (knFull.sellSignals || []).slice(execSliceStart);
  const smiFull = smiFromCandles(visualFullCandles, settings);
  const smiLine = (smiFull.smi || []).slice(execSliceStart);
  const smiSignal = (smiFull.signal || []).slice(execSliceStart);


  function latestKnVisualPlan() {
    const tp1R = Math.min(Math.max(Number(settings.tp1TriggerR || 1), 0.5), 5);
    const tp2R = Math.min(Math.max(Number(settings.tp2TriggerR || 2), tp1R), 8);
    const tp3R = Math.min(Math.max(Number(settings.tp3TriggerR || settings.rewardTargetR || 3), tp2R), 10);
    const slMult = Math.min(Math.max(Number(settings.knSlAtrMultiplier || 1.5), 0.2), 10);
    let idx = null;
    let side = '';
    for (let i = Math.max(1, visualFullCandles.length - 120); i < visualFullCandles.length; i += 1) {
      if (knFull.buySignals?.[i]) { idx = i; side = 'LONG'; }
      if (knFull.sellSignals?.[i]) { idx = i; side = 'SHORT'; }
    }
    if (idx === null) return null;
    const c = visualFullCandles[idx] || {};
    const entry = Number(c.close || 0);
    const atrAtSignal = Math.max(Number(knFull.atr?.[idx] || atrFromCandles(visualFullCandles.slice(0, idx + 1), Number(settings.knAtrPeriod || 14)) || 0), entry * 0.001, 0.00000001);
    const risk = atrAtSignal * slMult;
    const long = side === 'LONG';
    return {
      side,
      entry: roundCoin(sym, entry),
      currentPrice: roundCoin(sym, currentPrice),
      sl: roundCoin(sym, long ? entry - risk : entry + risk),
      tp1: roundCoin(sym, long ? entry + risk * tp1R : entry - risk * tp1R),
      tp2: roundCoin(sym, long ? entry + risk * tp2R : entry - risk * tp2R),
      tp3: roundCoin(sym, long ? entry + risk * tp3R : entry - risk * tp3R),
      rr: `1:${tp3R}`,
      active: true,
      visualOnly: true,
      entryType: 'KN_SIGNAL_VISUAL',
      signalIndex: idx,
      entryIndex: idx,
      chartIndex: idx - execSliceStart,
      note: 'Latest KN Smart TP/SL visual plan from EMA crossover. Execution still waits for bot validation.'
    };
  }

  const signal = latestClosedChartSignal(sym, fullClosedCandles, settings, res);
  const currentPrice = Number(visual.livePrice || candles.at(-1)?.close || state.market[sym]?.price || BASE_PRICE[sym] || 0);
  const side = signal?.pass ? signal.entrySide : (signal?.short?.signalIndex !== null ? 'SHORT' : 'LONG');
  const chartAtr = atrFromCandles(fullClosedCandles, Number(settings.atrPeriod || 14));
  const chartSr = calculateSupportResistanceLocal(sym, fullClosedCandles.map(c => c.close), currentPrice, chartAtr, settings);
  const chartMtfSrVolume = buildMtfSrVolumeContext(sym, side, getCachedCandles(sym, '5m'), settings);
  const chartPullback = signal?.pass && settings.entryOrderType !== 'market' && settings.requirePullbackForExecution !== false
    ? nearestPullbackEntry({ symbol: sym, price: currentPrice, atr: chartAtr, macdDivergenceSignal: signal, supportResistance: chartSr }, side, settings)
    : null;
  const plannedEntry = chartPullback?.entry || currentPrice;
  const sl = signal?.pass ? signal.invalidationLevel : null;
  const risk = sl ? Math.abs(plannedEntry - sl) : 0;
  const tp1 = signal?.pass ? (Number(signal.tp1) || (side === 'LONG' ? plannedEntry + risk : plannedEntry - risk)) : null;
  const tp2 = signal?.pass ? (Number(signal.tp2) || (side === 'LONG' ? plannedEntry + risk * 2 : plannedEntry - risk * 2)) : null;
  const tp3 = signal?.pass ? (Number(signal.tp3) || (side === 'LONG' ? plannedEntry + risk * Number(settings.rewardTargetR || 2.5) : plannedEntry - risk * Number(settings.rewardTargetR || 2.5))) : null;
  const activeConf = signal?.pass ? (side === 'LONG' ? signal.institutionalEma?.long?.confluence : signal.institutionalEma?.short?.confluence) : null;
  const knVisualPlan = latestKnVisualPlan();
  let plan = signal?.pass ? { side, entry: roundCoin(sym, plannedEntry), currentPrice: roundCoin(sym, currentPrice), sl, tp1: roundCoin(sym, tp1), tp2: roundCoin(sym, tp2), tp3: roundCoin(sym, tp3), rr: signal?.dynamicTargetR ? `1:${signal.dynamicTargetR}` : '1:3', active: true, entryType: chartPullback ? 'PULLBACK_LIMIT' : 'IMMEDIATE', pullbackPlan: chartPullback, confluenceScore: activeConf?.score || 0, confluence: activeConf } : (knVisualPlan || { side, entry: null, sl: null, tp1: null, tp2: null, tp3: null, rr: '1:3', active: false });
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
    source: usingSyntheticChart
      ? 'Synthetic fallback chart from local price history. Live trading still requires Delta candle data.'
      : (visual.usesLivePreview ? 'Delta closed candles + live ticker preview. Bot entries use closed candles from the selected horizon.' : 'Delta /v2/history/candles closed candles'),
    lastFetchAt: state.delta.candlesLastFetchAt?.[candleKey(sym, res)] || null,
    chartOffset: closedChartOffset,
    candles,
    currentPrice: roundCoin(sym, currentPrice),
    usesLivePreview: Boolean(visual.usesLivePreview),
    indicators: {
      emaFast,
      emaSlow,
      knBuySignals,
      knSellSignals,
      emaFastLength: knFull.fastLen,
      emaSlowLength: knFull.slowLen,
      smiLine,
      smiSignal,
      smiOverbought: smiFull.overbought,
      smiOversold: smiFull.oversold
    },
    signal,
    supportResistance: chartSr,
    mtfSrVolume: null,
    confluence: activeConf,
    plan,
    knVisualPlan,
    tradingViewUrl: `https://www.tradingview.com/chart/?symbol=DELTA:${encodeURIComponent(sym)}`,
    warning: visual.usesLivePreview ? 'Live candle is visual only. Orders trigger after the selected horizon candle closes.' : ''
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

    if (req.method === 'POST' && pathname === '/api/force-sync-positions') {
      const settings = loadSettings();
      await forceSyncLivePositionsNow(settings);
      log('SYNC', 'Manual force sync completed for Delta public data, OHLC candles, wallet and positions.');
      return send(res, 200, { ok: true, data: getStatePayload(loadSettings()) });
    }

    if (req.method === 'POST' && pathname === '/api/clear-stale-local-trades') {
      const settings = loadSettings();
      await forceSyncLivePositionsNow(settings);
      const cleared = clearStaleLocalLiveTradesFromDelta();
      return send(res, 200, { ok: true, data: { cleared, state: getStatePayload(loadSettings()) } });
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
      await refreshDeltaCandles(symbol, [resolution, '5m', '15m', '1h', '1d'], settings, true);
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
      if (wantsLiveMode) {
        settings.paperTrade = false;
        settings.botEnabled = false;
        log('SAFE', 'LIVE mode armed after API/wallet/position sync. BOT remains OFF until manually started.');
      }
      if (Object.prototype.hasOwnProperty.call(body, 'paperTrade') && body.paperTrade === true) {
        settings.paperTrade = true;
        settings.botEnabled = false;
        log('SAFE', 'PAPER mode selected. BOT switched OFF.');
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
    if (url.pathname === '/health') return send(res, 200, { ok: true, status: 'healthy', version: 'bot11-strategy-spec-v1-paper-live-data', mode: loadSettings().paperTrade ? 'paper' : 'live' });
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
    console.log(`BOT11 Strategy Spec V3 Paper-LiveData Bot running at http://localhost:${PORT}`);
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
