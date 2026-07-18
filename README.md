# Bitcoin Rainbow Wave - Actual vs Predicted

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A fully client-side interactive web application that overlays **actual Bitcoin price data** onto the famous **Bitcoin Rainbow Wave** predicted cycle model.

![Bitcoin Rainbow Wave](screenshot.png)

## Features

- **Real price overlay**: Actual weekly BTC/USD closes from 2017 to present, overlaid on the predicted Rainbow Wave path
- **Log / Linear scale toggle**: Switch between logarithmic and linear price scales
- **Time range selector**: View All, 5Y, 3Y, 1Y, or 6M windows
- **Layer controls**: Toggle rainbow bands, predicted path, ATH markers, and buy zones
- **Interactive tooltip**: Hover over any point to see actual vs predicted price, difference, and current rainbow zone
- **Cycle analysis cards**: Key insights for each major cycle (2017, 2021, 2025, 2027)
- **Dark mode support**: Automatic light/dark theme based on system preference
- **CSV export**: Download all data with predicted values and zone classifications
- **Responsive design**: Works on desktop, tablet, and mobile

## Live Demo

Open `index.html` in any modern browser. No server required - it's 100% client-side.

## Data Sources

| Source | Data | Period |
|--------|------|--------|
| Yahoo Finance | BTC-USD weekly OHLCV | 2024-2026 |
| Binance | BTCUSDT weekly closes | 2025-2026 |
| Historical | Approximate weekly closes | 2017-2024 |

## File Structure

```
.
├── index.html          # Main HTML page
├── style.css           # All styling (light/dark mode)
├── app.js              # Application logic & chart rendering
├── data.js             # Embedded BTC price data & model parameters
├── btc_full_data.json  # Raw combined data (for reference)
└── README.md           # This file
```

## How the Rainbow Wave Model Works

The Bitcoin Rainbow Wave is a logarithmic regression model that attempts to predict Bitcoin's long-term price trajectory based on historical halving cycles:

| Cycle | Predicted ATH | Actual ATH | Status |
|-------|--------------|------------|--------|
| 2017 | ~$20k | $19,783 | Matched |
| 2021 | ~$70k | $69,000 | Matched |
| 2025 | $126,000 | $109,035 | Underperformed (-13.5%) |
| 2027 | $440,000 | TBD | Pending |

## Rainbow Zones

The chart divides price action into 8 colored zones:

| Zone | Color | Action |
|------|-------|--------|
| Maximum bubble territory | Red | Sell |
| Sell. Seriously, sell | Orange | Sell |
| FOMO intensifies | Yellow | Caution |
| Is this a bubble? | Lime | Hold |
| Still cheap | Green | Hold |
| Accumulate | Blue | Buy |
| Buy! | Purple | Strong buy |
| Fire sale! | Deep purple | Maximum buy |

## Current Position (2026-07-18)

- **Current Price**: $63,947
- **Predicted Buy Zone 2026**: ~$61,343
- **Position**: Upper edge of Buy Zone 2026
- **Next Target (2027 ATH)**: $440,000 (+588% potential)

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## License

MIT License - feel free to use, modify, and distribute.

## Disclaimer

This is a data visualization tool for educational purposes only. It is **not financial advice**. Cryptocurrency investments carry significant risk. Past performance does not guarantee future results.
