"""Optional zero-shot adapter for the official shiyu-coder/Kronos repository."""

from __future__ import annotations

import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any


MODEL_CONFIG = {
    "kronos-mini": {
        "model": "NeoQuasar/Kronos-mini",
        "tokenizer": "NeoQuasar/Kronos-Tokenizer-2k",
        "max_context": 2048,
    },
    "kronos-small": {
        "model": "NeoQuasar/Kronos-small",
        "tokenizer": "NeoQuasar/Kronos-Tokenizer-base",
        "max_context": 512,
    },
}


@dataclass
class KronosAdapter:
    """Load Mini or Small without training and expose a narrow benchmark API."""

    variant: str
    repository_path: Path
    device: str = "cpu"
    sample_count: int = 5

    def __post_init__(self) -> None:
        if self.variant not in MODEL_CONFIG:
            raise ValueError(f"unsupported Kronos variant: {self.variant}")
        if not self.repository_path.exists():
            raise FileNotFoundError(
                "Clone https://github.com/shiyu-coder/Kronos and pass --kronos-repo."
            )

        sys.path.insert(0, str(self.repository_path))
        try:
            from model import Kronos, KronosPredictor, KronosTokenizer
        except ImportError as error:
            raise RuntimeError(
                "Kronos dependencies are optional. Install the repository requirements "
                "inside a separate environment before enabling this adapter."
            ) from error

        config = MODEL_CONFIG[self.variant]
        tokenizer = KronosTokenizer.from_pretrained(config["tokenizer"])
        model = Kronos.from_pretrained(config["model"])
        self._predictor = KronosPredictor(
            model,
            tokenizer,
            max_context=config["max_context"],
            device=self.device,
        )

    def predict(self, history: list[dict[str, Any]], future: list[dict[str, Any]]) -> list[float]:
        try:
            import pandas as pd
        except ImportError as error:
            raise RuntimeError("Install the optional Kronos dependencies first.") from error

        columns = ["open", "high", "low", "close", "volume"]
        frame = pd.DataFrame(history)
        for column in columns:
            if column not in frame:
                frame[column] = 0.0
        frame["amount"] = frame.get("amount", frame["close"] * frame["volume"])
        x_frame = frame[[*columns, "amount"]]
        x_timestamp = pd.to_datetime(frame["timestamp"])
        y_timestamp = pd.to_datetime([row["timestamp"] for row in future])

        prediction = self._predictor.predict(
            df=x_frame,
            x_timestamp=x_timestamp,
            y_timestamp=y_timestamp,
            pred_len=len(future),
            T=1.0,
            top_p=0.9,
            sample_count=self.sample_count,
        )
        return [float(value) for value in prediction["close"].tolist()]
