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

```bash
npm run check
```

This runs syntax checks, smoke tests, frontend render checks and V64 audit checks.

## Start

```bash
npm install
npm start
```

Set `DASHBOARD_PASSWORD` in `.env` or in your hosting environment before deployment.
