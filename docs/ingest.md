# The ingest funnel

How a headline becomes a card in the app, and why each stage refuses things.

```text
sources          219 articles   RSS allowlist, SEC filings, Finnhub
   │
   ▼ enrich       extract.py    name companies; classify market themes
   │
   ▼ dedupe       dedupe.py     216 new   content hash, then title similarity
   │
   ▼ gate         score.py       51 kept  important AND analysable
   │
   ▼ cluster      cluster.py     37 groups
   │
   ▼ analyse      llm/            LLM when a key is set, heuristic otherwise
   │
   ▼ persist                      events, event_stocks, feed_items
```

Counts are from a live run on 2026-09-14 over a 24-hour window. Reproduce
them with the dry run below.

## Why the gate has two halves

An article passes only if it is **important** and **analysable**.

`is_important` is a score threshold. `is_analysable` asks a different
question: is there anything for the analysis stage to attach to? Until
recently that meant "does it name a company in the universe", and that single
condition was the pipeline's real constraint. World news names countries,
ministers and commodities. Measured over live feeds, 218 world articles
produced 4 analysable events — 1.8% — and everything else was fetched,
stored and never looked at.

## Theme routing

[`ingest/themes.py`](../pipeline/src/whats_new/ingest/themes.py) supplies the
missing half. Sixteen themes cover the classes of event that move a broad
market: monetary policy, inflation, labour data, trade and tariffs,
sanctions, energy supply, conflict, shipping, financial stability, elections,
regulation, semiconductor policy, commodities, disaster, labour action,
public health.

Each theme carries liquid proxies drawn from the universe — energy stories
route to `XLE`/`USO`, rate stories to `TLT`/`XLF`/`SPY`/`GLD`.

**A theme match is a routing decision, not a forecast.** It says "this is an
energy story, look at XLE". Direction, magnitude and confidence are the
analysis stage's job. Nothing in this module should ever be rendered to a
user as a prediction.

### Precision over recall

Every promoted article costs LLM budget downstream, and the product promise
is signal rather than volume. So:

- Ambiguous themes carry a `context` requirement. `regulation` keys on words
  common in general reporting ("court ruling", "investigation into"), so it
  only counts alongside a corporate subject.
- Lifestyle copy must match nothing. `test_themes.py` pins four real
  headlines that used to tie with a tariff announcement at 0.27.

## Ticker extraction

[`ingest/extract.py`](../pipeline/src/whats_new/ingest/extract.py) names
companies. A false ticker is worse here than a missed one: it attaches a real
instrument to a story that never mentioned it, and the app presents that as
evidence.

Three rules, each of which exists because its absence was visible in live
output:

1. **Aliases match whole tokens.** A substring check named AMD from
   "advanced drone" and AXP from "American officials".
2. **Generic first words don't stand in for a company.** "Boris Johnson" is
   not JNJ, "Taiwan" is not TSM, "oil wells" is not WFC, "visa rules" is not
   V, and "U.S." is not USB — it was, twelve times in 219 articles. The full
   company name still matches, so nothing real is lost. Sector ETFs match on
   their full name only, since every word of "Energy Select Sector SPDR" is a
   common noun.
3. **Words that are also tickers need a marker.** `ICE`, `NOW`, `CAT` and
   friends resolve from `$NOW` or `(NOW)`, never from bare prose.

`enrich_article` keeps named tickers and theme proxies in separate fields.
`analysis_tickers` merges them — companies first — and that merged list is
what clustering and analysis see.

## Scoring

`score_article` returns 0..1 from: a base, named companies, theme weight,
keyword hits, an SEC bonus and a mega-cap bonus.

Two caps matter, both added after live output showed the score saturating:

- **Keyword hits are capped.** `HIGH_KEYWORDS` overlaps the theme patterns
  heavily, so uncapped the same signal counted twice — a Fed story matching
  "fed ", "federal reserve", "rate hike" and "inflation" added 0.48 on top of
  a 0.40 theme. Every macro headline hit the 1.0 ceiling and all 41 events
  came out "High" impact and "breaking". Repeating a subject is not extra
  importance.
- **Theme proxies don't earn the named-company bonus.** `news_ingest` folds
  proxies into `tickers` before clustering and then scores again; counting
  them re-inflated every macro story on the second pass.

Importance now spreads 0.46–0.97 across a live run rather than flattening.

## Running it without a database

There is no Supabase instance yet. Rather than a preview script beside the
job, which would drift, the job takes a flag:

```bash
python -m whats_new.jobs run news_ingest --dry-run --since-hours 24
```

Everything above runs. Only persistence is skipped. The result is JSON on
stdout — structured logs go to stderr — containing the feed cards the app
would have received and the themes that routed each one:

```json
{
  "status": "ok", "dry_run": true,
  "rows_in": 219, "articles_new": 216, "articles_analysable": 51,
  "clusters": 37, "analyzed": 0, "cost_usd": 0.0,
  "events": [
    {
      "section": "breaking", "importance": 0.97,
      "themes": ["monetary_policy"],
      "payload": { "headline": "...", "tickers": [{"ticker": "TLT", "...": "..."}] }
    }
  ]
}
```

`tests/test_news_ingest_dry_run.py` asserts the database is never reached, by
raising a `BaseException` from `db._connect` — an ordinary `Exception` would
be swallowed by the job's own error handling and the run would still look
green.

## Known gaps

- **The LLM stage has not been exercised on real output.** Without
  `LLM_API_KEY`, every event falls back to `heuristic_analysis`, which
  returns `neutral` direction, `0.35` confidence and a placeholder summary.
  The cards are structurally correct and analytically empty.
- **Clustering under-merges.** Six separate Fed stories in one run became six
  events, so the top of the feed was all the same subject.
- **Theme matches are not yet evaluated.** Nothing checks whether an energy
  story routed to `XLE` was followed by a move in `XLE`. Until
  `prediction_outcomes` is resolving these calls, treat every impact score as
  unvalidated — which is the strongest argument for not putting a number in
  front of a user yet.
- **A speaker's title can trigger a theme.** "ECB's Lagarde says Europe must
  build its own AI" classified as monetary policy. Regex cannot tell a source
  from a subject; the analysis stage is where that should be caught.
