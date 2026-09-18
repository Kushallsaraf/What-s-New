-- Official macro observations and normalized SEC Company Facts.
-- Macro revisions are preserved by including the value in the uniqueness key.

create table if not exists public.macro_observations (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  series_id text not null,
  series_name text not null,
  period timestamptz not null,
  value numeric not null,
  unit text not null default '',
  frequency text not null default '',
  source_url text not null,
  raw_json jsonb not null default '{}'::jsonb,
  observed_at timestamptz not null default now(),
  unique (source, series_id, period, value)
);

create index if not exists macro_observations_latest_idx
  on public.macro_observations (source, series_id, period desc);

create table if not exists public.company_facts (
  id uuid primary key default gen_random_uuid(),
  ticker text not null,
  cik text not null,
  metric text not null,
  label text not null,
  period_end timestamptz not null,
  value numeric not null,
  unit text not null default '',
  form text not null,
  filed_at timestamptz,
  fiscal_year integer,
  fiscal_period text not null default '',
  accession text not null default '',
  source_url text not null,
  raw_json jsonb not null default '{}'::jsonb,
  observed_at timestamptz not null default now(),
  unique (ticker, metric, period_end, form, accession)
);

create index if not exists company_facts_latest_idx
  on public.company_facts (ticker, metric, period_end desc);

create index if not exists company_facts_filed_at_idx
  on public.company_facts (filed_at desc);
