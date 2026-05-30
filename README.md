# V70 Balanced 5m Scalp MTF S/R Volume Market Memory Bot

V70 keeps the higher-timeframe context but removes the dead-trade problem from V69.

Execution rule:

```text
1D / 1H / 15M = context only
5M closed candle = only scalp entry trigger
```

Hard gates:

1. Delta closed 5m OHLC is available.
2. 15m EMA50 vs 1h EMA50 direction is aligned.
3. Previous-day candle context exists and agrees.
4. 1D / 1H / 15M support-resistance gives at least 2 of 3 directional votes.
5. 5m volume flow aligns and either 15m or 1h volume also aligns.
6. Market Memory cloud pullback/rejection and similar-history match pass.
7. Side-correct 5m candle trigger passes.
8. MACD 12/26/9 timing passes.
9. Structural SL and TP1/TP2 exist before any order.
10. Live mode requires Delta order ID and bracket SL/TP payload.

Soft confluence only:

- MACD divergence.
- MACD zero-line side.
- Local EMA50/200.
- VWAP / RSI / CCI / breakout / SAR / two-pole.

Default is PAPER mode. LIVE must be explicitly armed from Settings.
