"""Small, deterministic forecasts that every optional model must beat."""

from __future__ import annotations

from collections.abc import Sequence


def last_value(history: Sequence[float], horizon: int) -> list[float]:
    """Random-walk forecast: the last observed close persists."""
    _validate(history, horizon)
    return [float(history[-1])] * horizon


def drift(history: Sequence[float], horizon: int) -> list[float]:
    """Continue the average end-to-end change over the observed window."""
    _validate(history, horizon)
    if len(history) == 1:
        return last_value(history, horizon)
    step = (float(history[-1]) - float(history[0])) / (len(history) - 1)
    return [float(history[-1]) + step * index for index in range(1, horizon + 1)]


def moving_average(history: Sequence[float], horizon: int, window: int = 10) -> list[float]:
    """Forecast the recent mean; useful when a series mean-reverts."""
    _validate(history, horizon)
    recent = history[-min(window, len(history)) :]
    mean = sum(float(value) for value in recent) / len(recent)
    return [mean] * horizon


def _validate(history: Sequence[float], horizon: int) -> None:
    if not history:
        raise ValueError("history must contain at least one value")
    if horizon < 1:
        raise ValueError("horizon must be at least one")
