# Forecast-model policy

## Default state

Kronos is **off**. The product can ship its research workflow without a forecast model. The phone never runs Kronos.

## Evaluation order

1. Establish rolling-origin results for last-value, drift, and recent-mean baselines.
2. Evaluate Kronos Mini and Small zero-shot with the same cutoffs and inputs.
3. Compare MAE, RMSE, and directional accuracy across several assets, regimes, and horizons.
4. Retain a variant only if it improves both error metrics by at least 2%, does not reduce directional accuracy, wins 60% or more of comparable folds, and passes at least two horizons.
5. Keep results out of user-facing confidence until calibration and stability checks also pass.

No fine-tuning is part of this MVP. It should only be considered after repeatable zero-shot value is demonstrated and the cost/benefit is clear.

## User-facing role

A retained model may add one bounded piece of evidence to a scenario. It must never create a direct buy/sell instruction, dominate higher-quality filing or macro evidence, or hide disagreement with simple baselines.

## Avoiding false confidence

- Split data in time; never shuffle future observations into training context.
- Report all attempted assets and windows, not only successful examples.
- Include fees/slippage only if the team later evaluates an executable strategy.
- Treat model confidence separately from confidence in a research claim.
- Disable the model when inputs are stale, incomplete, out of domain, or materially different from the benchmark data.
