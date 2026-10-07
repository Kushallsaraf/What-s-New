"""Tests for market-theme routing of news that names no ticker.

The regression these guard against is specific: before ingest/themes.py, an
article reached analysis only if it mentioned a company in the universe, so
macro and world stories were stored and never looked at. Measured against
live feeds, 218 world articles yielded 4 analysable events, and a tariff
repeal scored identically to a dental-tourism feature.
"""

from __future__ import annotations

from whats_new.ingest.extract import analysis_tickers, enrich_article
from whats_new.ingest.score import is_analysable, is_important, score_article
from whats_new.ingest.themes import classify, theme_assets, theme_score
from whats_new.sources.base import RawArticle


def article(title: str, summary: str = "") -> RawArticle:
    return enrich_article(RawArticle(title=title, source="Test", summary=summary))


# --- routing ---------------------------------------------------------------


def test_tariff_story_routes_to_trade_policy():
    a = article("Trump says he will remove all Irish whiskey tariffs")
    assert "trade_policy" in a.themes
    assert a.proxy_tickers, "a trade story must offer something to analyse"


def test_jobs_report_routes_to_labour_and_clears_the_bar():
    """The exact headline the old gate discarded despite scoring 0.63."""
    a = article("The big August jobs report is due out Friday")
    assert "labor_data" in a.themes
    assert is_important(a)
    assert is_analysable(a), "macro stories used to be dropped for naming no company"


def test_opec_story_routes_to_energy():
    a = article("OPEC signals it will hold crude output steady through the quarter")
    assert "energy_supply" in a.themes
    assert "XLE" in a.proxy_tickers


def test_central_bank_story_routes_to_rates():
    a = article("Bank of Japan holds its policy rate steady")
    assert "monetary_policy" in a.themes
    assert "TLT" in a.proxy_tickers


def test_shipping_disruption_routes_to_logistics():
    a = article("Vessels divert as Red Sea attacks continue")
    assert "shipping" in a.themes


# --- precision: the expensive half ----------------------------------------


def test_lifestyle_features_match_nothing():
    """Every promoted article costs LLM budget downstream, so noise must not
    reach analysis. These two used to tie with the tariff story at 0.27."""
    for title in (
        "'Tirana teeth': Albania hopes to be the new Turkey for dental work",
        "I asked my husband to pay into my pension when we had a child",
        "Athletes with autism take center court at the US Open",
        "'What you see is what you pay' - why some US restaurants are banning tips",
    ):
        a = article(title)
        assert not a.themes, f"should not be market-themed: {title}"
        assert not (is_important(a) and is_analysable(a)), f"should not reach analysis: {title}"


def test_tariff_story_outranks_lifestyle_feature():
    tariff = article("Trump says he will remove all Irish whiskey tariffs")
    dental = article("'Tirana teeth': Albania hopes to be the new Turkey for dental work")
    assert score_article(tariff) > score_article(dental)


def test_ambiguous_theme_needs_corporate_context():
    """`regulation` keys on words common in general reporting, so it only
    counts alongside a corporate subject."""
    bare = article("Court ruling expected next week")
    corporate = article("Court ruling against the platform company expected next week")
    assert "regulation" not in bare.themes
    assert "regulation" in corporate.themes


# --- asset routing ---------------------------------------------------------


def test_named_tickers_come_before_theme_proxies():
    a = article("Exxon Mobil weighs new refinery amid rising crude oil prices")
    assert "XOM" in a.tickers
    combined = analysis_tickers(a)
    assert combined[0] == "XOM", "a named company leads its own story"
    assert len(combined) == len(set(combined)), "no duplicate tickers"


def test_theme_proxies_never_duplicate_named_tickers():
    a = article("Exxon Mobil and Chevron respond to crude oil price swings")
    assert not set(a.tickers) & set(a.proxy_tickers)


def test_theme_assets_are_capped():
    matches = classify("tariff sanctions crude oil federal reserve jobs report")
    assert len(theme_assets(matches)) <= 4


def test_multiple_themes_score_above_one_theme():
    one = classify("crude oil output steady")
    many = classify("sanctions on crude oil exports after the central bank decision")
    assert theme_score(many) > theme_score(one)


def test_theme_score_is_zero_without_matches():
    assert theme_score([]) == 0.0


# --- enrichment contract ---------------------------------------------------


def test_enrichment_is_idempotent():
    a = article("OPEC signals it will hold crude output steady")
    before = (list(a.themes), list(a.proxy_tickers), list(a.tickers))
    enrich_article(a)
    assert (a.themes, a.proxy_tickers, a.tickers) == before


def test_unenriched_article_still_scores():
    """score_article classifies on the fly when handed a raw article."""
    raw = RawArticle(title="OPEC signals it will hold crude output steady", source="Test")
    assert score_article(raw) > 0.45


# --- scoring: keyword bonuses must not saturate ----------------------------


def test_repeated_keywords_do_not_pin_the_score_ceiling():
    """HIGH_KEYWORDS overlaps the theme patterns, so uncapped the same signal
    was counted twice. Against live feeds every macro headline reached 1.0 and
    all 41 events came out "High" impact and "breaking"."""
    fed = article(
        "Fed rate hike expected as inflation persists",
        "The Federal Reserve meets this week. CPI and the jobs report follow, "
        "with tariff and crude oil pressures in the background.",
    )
    score = score_article(fed)
    assert score > 0.6, "a stacked macro story is still clearly important"
    assert score < 1.0, "but repeating a subject is not extra importance"


def test_strong_and_marginal_stories_do_not_tie():
    strong = article(
        "Federal Reserve raises rates as inflation persists",
        "The rate decision lands with CPI data due Friday.",
    )
    marginal = article(
        "Analyst lifts price target after product launch",
        "The note follows a partnership announcement.",
    )
    assert score_article(strong) > score_article(marginal) + 0.1


def test_score_is_stable_once_proxies_are_folded_into_tickers():
    """news_ingest sets `tickers = analysis_tickers(article)` before clustering,
    then scores again. If proxies counted as named companies, that second pass
    inflated every macro story back to 1.0 and re-flattened the feed."""
    a = article("Federal Reserve holds rates as inflation data cools")
    before = score_article(a)
    a.tickers = analysis_tickers(a)
    assert score_article(a) == before


def test_patterns_match_whole_words_only():
    """"the fed" used to fire inside "the Federal Intelligence Service"."""
    def keys(text: str) -> list[str]:
        return [m.key for m in classify(text)]

    assert "monetary_policy" not in keys(
        "Former head of the Federal Intelligence Service arrested for treason"
    )
    assert "monetary_policy" in keys("The Fed holds rates steady")
    assert "trade_policy" in keys("New tariffs hit steel imports")
