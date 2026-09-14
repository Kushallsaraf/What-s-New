-- What's New MVP schema
-- Append-oriented where possible; observed_at / as_of for point-in-time honesty.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- users (extends Supabase auth.users via id)
-- ---------------------------------------------------------------------------
-- id matches Supabase auth.users when Auth is enabled; no hard FK so
-- migrations also apply on plain Postgres during local bring-up.
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  preferences jsonb not null default '{}'::jsonb,
  push_token text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- stocks
-- ---------------------------------------------------------------------------
create table if not exists public.stocks (
  ticker text primary key,
  company_name text not null,
  sector text not null default '',
  industry text not null default '',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- news_articles
-- ---------------------------------------------------------------------------
create table if not exists public.news_articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  source text not null default '',
  url text,
  published_at timestamptz,
  processed_at timestamptz,
  content_hash text not null,
  raw_json jsonb not null default '{}'::jsonb,
  relevance_score double precision,
  event_id uuid,
  dedupe_of uuid references public.news_articles (id),
  summary text,
  tickers text[] not null default '{}',
  observed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (content_hash)
);

create index if not exists news_articles_published_at_idx on public.news_articles (published_at desc);
create index if not exists news_articles_event_id_idx on public.news_articles (event_id);

-- ---------------------------------------------------------------------------
-- events
-- ---------------------------------------------------------------------------
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null default 'unknown',
  headline text not null,
  summary text,
  importance double precision not null default 0,
  confidence double precision not null default 0,
  cluster_key text,
  source_count integer not null default 1,
  first_seen_at timestamptz not null default now(),
  llm_model text,
  prompt_version text,
  analysis_json jsonb not null default '{}'::jsonb,
  observed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists events_cluster_key_idx on public.events (cluster_key);
create index if not exists events_created_at_idx on public.events (created_at desc);
create index if not exists events_importance_idx on public.events (importance desc);

alter table public.news_articles
  drop constraint if exists news_articles_event_id_fkey;
alter table public.news_articles
  add constraint news_articles_event_id_fkey
  foreign key (event_id) references public.events (id);

-- ---------------------------------------------------------------------------
-- event_stocks
-- ---------------------------------------------------------------------------
create table if not exists public.event_stocks (
  event_id uuid not null references public.events (id) on delete cascade,
  ticker text not null references public.stocks (ticker),
  impact_score double precision not null default 0,
  confidence double precision not null default 0,
  direction text,
  reason text,
  primary key (event_id, ticker)
);

create index if not exists event_stocks_ticker_idx on public.event_stocks (ticker);

-- ---------------------------------------------------------------------------
-- market_data (OHLCV)
-- ---------------------------------------------------------------------------
create table if not exists public.market_data (
  ticker text not null references public.stocks (ticker),
  timestamp timestamptz not null,
  open double precision,
  high double precision,
  low double precision,
  close double precision,
  volume double precision,
  feed text not null default 'iex',
  observed_at timestamptz not null default now(),
  primary key (ticker, timestamp)
);

create index if not exists market_data_timestamp_idx on public.market_data (timestamp desc);

-- ---------------------------------------------------------------------------
-- predictions (immutable once written)
-- ---------------------------------------------------------------------------
create table if not exists public.predictions (
  id uuid primary key default gen_random_uuid(),
  ticker text not null references public.stocks (ticker),
  model text not null,
  model_version text not null default '',
  created_at timestamptz not null default now(),
  as_of timestamptz not null default now(),
  horizon text not null,
  horizon_days integer not null default 1,
  predicted_return double precision,
  direction text,
  confidence double precision,
  predicted_close double precision,
  payload jsonb not null default '{}'::jsonb
);

create index if not exists predictions_ticker_created_idx
  on public.predictions (ticker, created_at desc);

-- ---------------------------------------------------------------------------
-- prediction_outcomes (separate so predictions stay immutable)
-- ---------------------------------------------------------------------------
create table if not exists public.prediction_outcomes (
  id uuid primary key default gen_random_uuid(),
  prediction_id uuid not null references public.predictions (id) on delete cascade,
  resolved_at timestamptz not null default now(),
  actual_return double precision,
  actual_close double precision,
  direction_correct boolean,
  absolute_error double precision,
  meta jsonb not null default '{}'::jsonb,
  unique (prediction_id)
);

-- ---------------------------------------------------------------------------
-- signals (component scores stored separately)
-- ---------------------------------------------------------------------------
create table if not exists public.signals (
  id uuid primary key default gen_random_uuid(),
  ticker text not null references public.stocks (ticker),
  timestamp timestamptz not null default now(),
  news_score double precision not null default 0,
  quant_score double precision not null default 0,
  market_score double precision not null default 0,
  overall_score double precision not null default 0,
  weights jsonb not null default '{}'::jsonb,
  meta jsonb not null default '{}'::jsonb,
  observed_at timestamptz not null default now()
);

create index if not exists signals_ticker_ts_idx on public.signals (ticker, timestamp desc);

-- ---------------------------------------------------------------------------
-- watchlists
-- ---------------------------------------------------------------------------
create table if not exists public.watchlists (
  user_id uuid not null references public.users (id) on delete cascade,
  ticker text not null references public.stocks (ticker),
  created_at timestamptz not null default now(),
  primary key (user_id, ticker)
);

-- ---------------------------------------------------------------------------
-- reports
-- ---------------------------------------------------------------------------
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  created_at timestamptz not null default now(),
  as_of timestamptz not null default now(),
  title text,
  content jsonb not null default '{}'::jsonb,
  llm_model text,
  prompt_version text
);

create index if not exists reports_type_created_idx on public.reports (type, created_at desc);

-- ---------------------------------------------------------------------------
-- feed_items (materialized cards)
-- ---------------------------------------------------------------------------
create table if not exists public.feed_items (
  id uuid primary key default gen_random_uuid(),
  card_type text not null,
  payload jsonb not null default '{}'::jsonb,
  importance double precision not null default 0,
  confidence double precision not null default 0,
  tickers text[] not null default '{}',
  section text not null default 'recent',
  event_id uuid references public.events (id) on delete set null,
  created_at timestamptz not null default now(),
  observed_at timestamptz not null default now()
);

create index if not exists feed_items_created_idx on public.feed_items (created_at desc);
create index if not exists feed_items_importance_idx on public.feed_items (importance desc);
create index if not exists feed_items_section_idx on public.feed_items (section);

-- ---------------------------------------------------------------------------
-- job_runs
-- ---------------------------------------------------------------------------
create table if not exists public.job_runs (
  id uuid primary key default gen_random_uuid(),
  job_name text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running',
  rows_in integer not null default 0,
  rows_out integer not null default 0,
  llm_tokens integer not null default 0,
  estimated_cost_usd double precision not null default 0,
  error text,
  meta jsonb not null default '{}'::jsonb
);

create index if not exists job_runs_job_started_idx on public.job_runs (job_name, started_at desc);

-- ---------------------------------------------------------------------------
-- llm_cache
-- ---------------------------------------------------------------------------
create table if not exists public.llm_cache (
  cache_key text primary key,
  value_json jsonb not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

-- ---------------------------------------------------------------------------
-- RLS stubs (open for service role; tighten when Auth is live)
-- ---------------------------------------------------------------------------
alter table public.users enable row level security;
alter table public.watchlists enable row level security;

-- Policies use auth.uid() when the Supabase Auth schema is present.
do $$
begin
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'auth' and p.proname = 'uid') then
    if not exists (select 1 from pg_policies where schemaname = 'public' and policyname = 'users_self') then
      execute 'create policy users_self on public.users for all using (auth.uid() = id) with check (auth.uid() = id)';
    end if;
    if not exists (select 1 from pg_policies where schemaname = 'public' and policyname = 'watchlists_self') then
      execute 'create policy watchlists_self on public.watchlists for all using (auth.uid() = user_id) with check (auth.uid() = user_id)';
    end if;
  end if;
end $$;
