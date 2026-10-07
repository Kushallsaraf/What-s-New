"""Runtime configuration from environment variables."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[3]


def _env(name: str, default: str = "") -> str:
    return os.environ.get(name, default).strip()


def _env_float(name: str, default: float) -> float:
    raw = _env(name)
    if not raw:
        return default
    return float(raw)


def _env_int(name: str, default: int) -> int:
    raw = _env(name)
    if not raw:
        return default
    return int(raw)


@dataclass(frozen=True)
class Settings:
    """Application settings resolved once per process."""

    database_url: str
    supabase_url: str
    supabase_anon_key: str
    supabase_jwt_secret: str
    alpaca_api_key: str
    alpaca_api_secret: str
    alpaca_feed: str
    finnhub_api_key: str
    sec_user_agent: str
    sec_tickers: tuple[str, ...]
    fred_api_key: str
    fred_series: tuple[str, ...]
    eia_api_key: str
    eia_series: tuple[str, ...]
    bls_api_key: str
    bls_series: tuple[str, ...]
    macro_sources: tuple[str, ...]
    llm_provider: str
    llm_api_key: str
    llm_model_analysis: str
    llm_model_reports: str
    llm_budget_usd_per_run: float
    llm_effort: str
    news_sources: tuple[str, ...]
    fixtures_dir: Path
    feed_preview_file: Path | None
    outputs_dir: Path
    replay: bool
    signal_weight_news: float
    signal_weight_kronos: float
    signal_weight_market: float
    wn_secrets: str
    wn_blobs: str
    wn_queue: str
    wn_push: str
    wn_analytics: str
    wn_telemetry: str
    wn_cache: str
    wn_forecaster: str
    wn_mailer: str

    @property
    def repo_root(self) -> Path:
        return _repo_root()


def load_settings() -> Settings:
    """Load settings from the process environment."""
    root = _repo_root()
    news_raw = _env("WN_NEWS_SOURCES", "rss,sec_edgar,finnhub")
    sources = tuple(s.strip() for s in news_raw.split(",") if s.strip())
    macro_raw = _env("WN_MACRO_SOURCES", "treasury,bls,fred,eia")
    macro_sources = tuple(s.strip() for s in macro_raw.split(",") if s.strip())
    llm_provider = _env("WN_LLM_PROVIDER", "anthropic").lower()

    def csv_env(name: str, default: str) -> tuple[str, ...]:
        return tuple(value.strip().upper() for value in _env(name, default).split(",") if value.strip())

    return Settings(
        database_url=_env("DATABASE_URL"),
        supabase_url=_env("SUPABASE_URL"),
        supabase_anon_key=_env("SUPABASE_ANON_KEY"),
        supabase_jwt_secret=_env("SUPABASE_JWT_SECRET"),
        alpaca_api_key=_env("ALPACA_API_KEY"),
        alpaca_api_secret=_env("ALPACA_API_SECRET"),
        alpaca_feed=_env("ALPACA_FEED", "iex"),
        finnhub_api_key=_env("FINNHUB_API_KEY"),
        sec_user_agent=_env(
            "SEC_USER_AGENT",
            "WhatsNewMVP research@example.com",
        ),
        sec_tickers=csv_env(
            "WN_SEC_TICKERS",
            (
                "AAPL,MSFT,NVDA,AMZN,META,JPM,XOM,JNJ,"
                "SOFI,HIMS,IONQ,RKLB,RXST,ACMR,UPWK,"
                "RY,TD,SHOP,ENB,CNQ,CP,CNI,BMO,"
                "LSPD,BB,BLDP,SAND,ORLA,EQX,AG"
            ),
        ),
        fred_api_key=_env("FRED_API_KEY"),
        fred_series=csv_env("FRED_SERIES", "FEDFUNDS,GDPC1,INDPRO,RSAFS"),
        eia_api_key=_env("EIA_API_KEY"),
        eia_series=csv_env(
            "EIA_SERIES",
            "WCESTUS1,WGTSTUS1,WCRFPUS2,NW2_EPG0_SWO_R48_BCF",
        ),
        bls_api_key=_env("BLS_API_KEY"),
        bls_series=csv_env(
            "BLS_SERIES",
            "CUSR0000SA0,CES0000000001,LNS14000000",
        ),
        macro_sources=macro_sources,
        llm_provider=llm_provider,
        llm_api_key=_env("LLM_API_KEY")
        or _env("ANTHROPIC_API_KEY" if llm_provider == "anthropic" else "OPENAI_API_KEY"),
        llm_model_analysis=_env(
            "LLM_MODEL_ANALYSIS", "claude-opus-5-5" if llm_provider == "anthropic" else "gpt-4o-mini"
        ),
        llm_model_reports=_env(
            "LLM_MODEL_REPORTS", "claude-opus-5-5" if llm_provider == "anthropic" else "gpt-4o"
        ),
        llm_budget_usd_per_run=_env_float("LLM_BUDGET_USD_PER_RUN", 1.0),
        # Anthropic only: low|medium|high|xhigh|max. Blank keeps the model default.
        llm_effort=_env("LLM_EFFORT", ""),
        news_sources=sources,
        fixtures_dir=Path(_env("FIXTURES_DIR", str(root / "fixtures"))),
        # Opt-in only. Lets /api/feed serve a dry-run file while there is no
        # database, so the app can be developed against real pipeline output.
        # Unset in any environment a user can reach.
        feed_preview_file=(
            Path(_env("WN_FEED_PREVIEW_FILE", "")) if _env("WN_FEED_PREVIEW_FILE") else None
        ),
        outputs_dir=Path(_env("OUTPUTS_DIR", str(root / "outputs"))),
        replay=_env("WN_REPLAY", "0") in {"1", "true", "TRUE", "yes"},
        signal_weight_news=_env_float("SIGNAL_WEIGHT_NEWS", 0.45),
        signal_weight_kronos=_env_float("SIGNAL_WEIGHT_KRONOS", 0.0),
        signal_weight_market=_env_float("SIGNAL_WEIGHT_MARKET", 0.55),
        wn_secrets=_env("WN_SECRETS", "env"),
        wn_blobs=_env("WN_BLOBS", "local"),
        wn_queue=_env("WN_QUEUE", "inline"),
        wn_push=_env("WN_PUSH", "console"),
        wn_analytics=_env("WN_ANALYTICS", "noop"),
        wn_telemetry=_env("WN_TELEMETRY", "stdout-json"),
        wn_cache=_env("WN_CACHE", "postgres"),
        wn_forecaster=_env("WN_FORECASTER", "local-cpu"),
        wn_mailer=_env("WN_MAILER", "console"),
    )


# Lazy singleton used by modules that prefer import-time access.
_settings: Settings | None = None


def get_settings() -> Settings:
    global _settings
    if _settings is None:
        _settings = load_settings()
    return _settings


def reset_settings() -> None:
    """Clear cached settings (tests only)."""
    global _settings
    _settings = None
