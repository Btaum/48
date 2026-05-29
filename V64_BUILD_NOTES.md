# V64 Build Notes — Market Memory Live-Mimic Paper Execution

## What changed from V62

- Added Market Memory similar-history engine.
- Added hard Market Memory pullback gate.
- Added top historical match outcome check.
- Added closed-candle-only pending limit fill logic.
- Added pending order candle timestamp so old candles cannot fill a new paper order.
- Added trade page gross wins, gross losses, net closed P/L, open P/L, win/loss count and win rate.
- Kept side modules disabled to avoid strategy clutter.

## Market Memory implementation

The bot scans recent closed candles and compares the current pattern with past conditions using:

- momentum over multiple windows,
- RSI state,
- volatility/ATR context,
- EMA distance,
- candle body/wick structure,
- relative volume where available.

It then ranks the closest historical matches. The top match must show the same continuation behavior unless disabled from settings. This implements the transcript logic: identify a trend, wait for pullback into the cloud/average, confirm rejection, then check whether the closest historical match continued in the same direction.

## Entry execution

Default behavior is pullback-limit first:

- Long: buy-limit below current closed-candle price near Market Memory cloud, EMA or support.
- Short: sell-limit above current closed-candle price near Market Memory cloud, EMA or resistance.
- Market fallback stays off by default.
- The order only fills from a later closed 5m candle touching the limit.

## SL / TP

- SL remains beyond structural invalidation / cloud / swing with ATR buffer.
- TP1 is partial at around 1R.
- TP2 starts from the full plan and can extend only when confluence and momentum remain strong.
- Position size reduces if structural SL is wide.

## Verification performed

- `node --check server.js`
- `node --check public/app.js`
- `npm test`
- `npm run check`
- zip integrity test
