# IREN Stock Prediction Simulator

A minimal, Robinhood-inspired interactive equity research dashboard for **IREN Limited (NASDAQ: IREN)**, presented under Village Research.

## Features
- Monte Carlo projection chart with 2,000 simulated outcomes over 20 trading days
- Switch between sample price trajectories and a terminal-price distribution
- Adjustable starting price, expected return, volatility, catalyst probability, catalyst shock, and investment size
- Bull (P90), median, and bear (P10) scenario analysis
- CSV export

## Run locally
Open `index.html` in a modern browser. No build tools, packages, API keys, or server required.

## Method
The model uses geometric Brownian motion with an optional hypothetical jump on day one. These are **assumption-driven** simulations, not trained forecasts. The reported ~30% rally is a reference benchmark and is not a live price quote.

## Attribution
Village Research is an independent portfolio concept. The small village-themed mark is custom artwork; IREN appears as a typographic name treatment, not an official licensed IREN logo.

## Disclaimer
For education and research only. Not investment advice. No real-time market data is loaded.