"""Thin psycopg access layer over DATABASE_URL."""

from __future__ import annotations

import json
from contextlib import contextmanager
from typing import Any, Iterator, Sequence

_connection = None


def _connect():
    global _connection
    from whats_new.config import get_settings

    settings = get_settings()
    if not settings.database_url:
        raise RuntimeError(
            "DATABASE_URL is not set. Copy .env.example to .env and add your Supabase connection string."
        )
    try:
        import psycopg
        from psycopg.rows import dict_row
    except ImportError as exc:
        raise RuntimeError("Install pipeline extras: pip install -e '.[data]'") from exc

    if _connection is None or _connection.closed:
        _connection = psycopg.connect(settings.database_url, row_factory=dict_row)
    return _connection


def reset_connection() -> None:
    global _connection
    if _connection is not None and not _connection.closed:
        _connection.close()
    _connection = None


@contextmanager
def cursor() -> Iterator[Any]:
    conn = _connect()
    cur = conn.cursor()
    try:
        yield cur
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()


def execute(sql: str, params: Sequence[Any] | None = None) -> None:
    with cursor() as cur:
        cur.execute(sql, params or ())


def executemany(sql: str, seq_of_params: Sequence[Sequence[Any]]) -> None:
    with cursor() as cur:
        cur.executemany(sql, seq_of_params)


def fetch_one(sql: str, params: Sequence[Any] | None = None) -> dict[str, Any] | None:
    with cursor() as cur:
        cur.execute(sql, params or ())
        row = cur.fetchone()
        return dict(row) if row else None


def fetch_all(sql: str, params: Sequence[Any] | None = None) -> list[dict[str, Any]]:
    with cursor() as cur:
        cur.execute(sql, params or ())
        return [dict(r) for r in cur.fetchall()]


def insert_returning(sql: str, params: Sequence[Any] | None = None) -> dict[str, Any] | None:
    with cursor() as cur:
        cur.execute(sql, params or ())
        row = cur.fetchone()
        return dict(row) if row else None


def to_jsonb(value: Any) -> str:
    return json.dumps(value, default=str)


def upsert_stock(ticker: str, company_name: str, sector: str, industry: str) -> None:
    execute(
        """
        INSERT INTO stocks (ticker, company_name, sector, industry)
        VALUES (%s, %s, %s, %s)
        ON CONFLICT (ticker) DO UPDATE
        SET company_name = EXCLUDED.company_name,
            sector = EXCLUDED.sector,
            industry = EXCLUDED.industry
        """,
        (ticker, company_name, sector, industry),
    )


def seed_universe() -> int:
    from whats_new.universe import STOCKS

    for stock in STOCKS:
        upsert_stock(stock.ticker, stock.company_name, stock.sector, stock.industry)
    return len(STOCKS)


def start_job_run(job_name: str, meta: dict[str, Any] | None = None) -> str:
    row = insert_returning(
        """
        INSERT INTO job_runs (job_name, meta)
        VALUES (%s, %s::jsonb)
        RETURNING id
        """,
        (job_name, to_jsonb(meta or {})),
    )
    return str(row["id"]) if row else ""


def finish_job_run(
    job_id: str,
    *,
    status: str = "ok",
    rows_in: int = 0,
    rows_out: int = 0,
    llm_tokens: int = 0,
    estimated_cost_usd: float = 0.0,
    error: str | None = None,
    meta: dict[str, Any] | None = None,
) -> None:
    if not job_id:
        return
    execute(
        """
        UPDATE job_runs
        SET finished_at = now(),
            status = %s,
            rows_in = %s,
            rows_out = %s,
            llm_tokens = %s,
            estimated_cost_usd = %s,
            error = %s,
            meta = coalesce(meta, '{}'::jsonb) || %s::jsonb
        WHERE id = %s::uuid
        """,
        (
            status,
            rows_in,
            rows_out,
            llm_tokens,
            estimated_cost_usd,
            error,
            to_jsonb(meta or {}),
            job_id,
        ),
    )
