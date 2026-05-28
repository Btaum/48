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

```bash
npm run check
```

This runs syntax checks, smoke tests, frontend chart render tests, and the V59 audit for TP1/TP2 labels, full-trade profit sizing, UI order, and scanner execution consistency.
