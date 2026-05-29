<<<<<<< HEAD
# V64 EMA + MACD + Market Memory Paper Bot

Delta Exchange India paper-only live-mimic build.

## Core rule

The bot must not open a paper trade until it has a complete closed-candle plan:

1. Directional bias from 5m execution structure plus 15m/1h EMA context.
2. Market Memory regime from similar historical candle conditions.
3. Current price must retest the Market Memory cloud / EMA pullback zone and reject it.
4. MACD 12/26/9 confirms timing.
5. Entry, SL, TP1, TP2, margin/lots and estimated full-plan profit must be calculated before order placement.
6. Default entry is a pullback limit. Market entry remains blocked unless explicitly enabled.

## Paper mode policy

Paper trades are designed to mimic live behavior as closely as possible:

- Closed 5m candles only for signal confirmation.
- Pending limit orders only fill from a closed candle after the order was placed.
- No old-candle backfill fills.
- Paper mode stays forced on in this build.
- Live API keys may be used for reference/sync, not live order execution.

## Risk policy

SL is structure-first: beyond the pullback cloud/swing/invalidation with ATR buffer. If the correct SL is wide, the bot reduces lots/margin instead of tightening the SL. If R:R or minimum profit is not acceptable, the trade is rejected.

## Trade page

The Trades page shows:

- Closed wins amount.
- Closed losses amount.
- Net closed P/L.
- Open/unrealized P/L.
- Win/loss counts and win rate.

## Validation

=======
# MACD MTF EMA Bot V59

Delta Exchange India bot focused on the MACD Divergence + MTF EMA strategy.

## Core strategy

- Execution timeframe: 5-minute closed candles.
- Trend filter: EMA50 from 15m versus EMA50 from 1h.
- Entry model: Practical MTF MACD by default, with Strict Transcript mode available.
- MACD: 12/26/9.
- TP1 = 1R partial close.
- After TP1, SL moves to breakeven/profit buffer.
- TP2 = 2R final close of the remaining position.

## V59 correction

V59 fixes the profit-sizing labels and calculation. The bot now sizes and displays the projected **full-trade profit** from the complete TP1 + TP2 exit plan, not TP2 alone.

Default full exit plan with 50/50 management:

- TP1 closes 50% at 1R.
- TP2 closes 100% of the remaining 50% at 2R.
- Blended completed-trade reward = 1.5R.

## Validation

Run:

>>>>>>> a27d754590c85a16cd9e1218b83f7ecd177f9072
```bash
npm run check
```

<<<<<<< HEAD
This runs syntax checks, smoke tests, frontend render checks and V64 audit checks.

## Start

```bash
npm install
npm start
```

Set `DASHBOARD_PASSWORD` in `.env` or in your hosting environment before deployment.
=======
This runs syntax checks, smoke tests, frontend chart render tests, and the V59 audit for TP1/TP2 labels, full-trade profit sizing, UI order, and scanner execution consistency.
>>>>>>> a27d754590c85a16cd9e1218b83f7ecd177f9072
