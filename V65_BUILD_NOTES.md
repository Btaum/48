# V66 EMA50/200 + MACD Divergence + Market Memory Cloud Paper Bot

## Core strategy
- 5m execution candles only.
- Direction uses transcript MTF EMA rule: 15m EMA50 vs 1h EMA50.
- Chart keeps only EMA50 and EMA200 from the local execution view, plus 15m EMA50 and 1h EMA50 references.
- EMA8/9/13/21 are removed from chart visuals and from hard entry gating.
- Market Memory cloud is a hard pullback/rejection gate and is plotted as a green/red cloud on the chart.
- MACD 12/26/9 is the timing layer. Divergence is required by default.
- VWAP, RSI, CCI, volume spike, breakout, SAR, and two-pole are not hard entry gates in this build.

## Execution policy
- Live-armed lock remains active.
- Closed 5m candles only for signal confirmation.
- Pullback-limit first execution.
- Market entry remains blocked unless explicitly changed later.
- Paper limit fills only after a later closed candle touches the limit level.
- Entry, SL, TP1, and TP2 must be planned before any paper order is created.

## Risk policy
- SL is structural: swing/cloud/divergence invalidation plus ATR buffer.
- Wider SL reduces lot size; the bot must not tighten SL into normal crypto noise.
- TP1 defaults around 1R partial. TP2 is at least 2R and may extend only when momentum remains strong.
