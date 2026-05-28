# MACD MTF EMA Bot V57

Delta Exchange India focused MACD + MTF EMA bot.

V57 key correction: default execution no longer waits for a second pullback after the MACD trigger. It uses immediate limit entry at the current closed-candle/ticker price, while optional pullback-limit mode remains available in Settings.

Strategy logic:
- 5m execution chart.
- 15m EMA50 vs 1h EMA50 trend filter.
- MACD 12/26/9 crossover.
- MACD histogram color change.
- Divergence and zero-line can be strict or soft/context depending on settings.
- SL from technical swing/ATR buffer.
- TP1 partial and TP2 2R target.

Start with `npm install` then `npm start`.
