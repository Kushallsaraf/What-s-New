"""Precision tests for ticker extraction.

Extraction used to do two loose things: match company-name aliases as bare
substrings, and treat any 1-5 letter uppercase run as a ticker. Both were
survivable while the pipeline only read company wires. Once world news started
flowing through, they produced constant false company references — measured
over 219 live articles, "U.S." alone resolved to USB twelve times.

A false ticker is worse here than a missed one: it attaches a real instrument
to a story that never mentioned it, and the app presents that as evidence.
"""

from __future__ import annotations

from whats_new.ingest.extract import enrich_article, extract_tickers
from whats_new.sources.base import RawArticle


def tickers(title: str, summary: str = "") -> list[str]:
    return extract_tickers(RawArticle(title=title, source="Test", summary=summary))


# --- false positives that were live on real headlines ----------------------


def test_us_prefix_is_not_us_bancorp():
    assert "USB" not in tickers("Iran says it destroyed U.S. advanced drone over Hormuz")


def test_advanced_is_not_amd():
    assert "AMD" not in tickers("Iran says it destroyed U.S. advanced drone over Hormuz")


def test_a_persons_surname_is_not_a_company():
    assert "JNJ" not in tickers("Boris Johnson defends his record at the inquiry")
    assert "WMB" not in tickers("Williams says the committee will report in spring")


def test_a_country_is_not_a_chipmaker():
    assert "TSM" not in tickers("Taiwan reports further incursions into its air defence zone")


def test_a_us_state_is_not_texas_instruments():
    assert "TXN" not in tickers("Texas braces for a second storm system this week")


def test_common_nouns_are_not_sector_etfs():
    """ETF names are built entirely from common nouns, so only the full name
    may match. Otherwise every story about energy prices named XLE."""
    found = tickers("Energy prices climb as consumer demand holds up", "Industrial output was flat.")
    assert not {"XLE", "XLY", "XLI"} & set(found)


def test_immigration_visas_are_not_the_payment_network():
    assert "V" not in tickers("New visa rules take effect for skilled workers")


def test_oil_wells_are_not_wells_fargo():
    assert "WFC" not in tickers("Drillers cap wells across the basin as prices fall")


def test_ambiguous_bare_words_need_a_marker():
    assert "ICE" not in tickers("ICE raids draw protests in three cities")
    assert "NOW" not in tickers("NOW is the time, says the campaign group")


def test_the_rainforest_is_not_the_retailer():
    assert "AMZN" not in tickers(
        "Flávio Bolsonaro leads Brazil's first round, raising Amazon deforestation concerns"
    )
    assert "AMZN" not in tickers("Fires spread across the Amazon as the dry season peaks")


def test_a_nationality_is_not_a_company():
    assert "CNQ" not in tickers("Parti Québécois wins but Canadian unity question lingers")
    assert "RY" not in tickers("Royal family attends the ceremony")


# --- the matches that must survive -----------------------------------------


def test_full_company_names_still_resolve():
    assert "XOM" in tickers("Exxon Mobil weighs a new refinery")
    assert "WFC" in tickers("Wells Fargo reports quarterly earnings")
    assert "V" in tickers("Visa Inc. lifts its full-year outlook")
    assert "JNJ" in tickers("Johnson & Johnson settles the talc litigation")
    assert "TSM" in tickers("Taiwan Semiconductor raises capital spending")
    assert "AMZN" in tickers("Amazon raises its Prime fee")
    assert "CNQ" in tickers("Canadian Natural Resources lifts output guidance")


def test_common_short_forms_still_resolve():
    assert "NVDA" in tickers("Nvidia beats on data centre revenue")
    assert "AAPL" in tickers("Apple releases a redesigned Siri")
    assert "MSFT" in tickers("Microsoft sets limits for future AI models")


def test_marked_tickers_resolve_even_when_ambiguous():
    assert "NOW" in tickers("$NOW climbs after the subscription update")
    assert "ICE" in tickers("Intercontinental Exchange (ICE) reports volume growth")


def test_alias_must_be_a_whole_token():
    """`alias in text` matched inside longer words."""
    assert "INTC" not in tickers("The report was intelligible but incomplete")
    assert "MU" not in tickers("The museum opens in spring")


def test_enrichment_keeps_named_and_proxy_tickers_separate():
    a = enrich_article(
        RawArticle(title="Exxon Mobil weighs new refinery amid crude oil swings", source="Test")
    )
    assert "XOM" in a.tickers
    assert "XOM" not in a.proxy_tickers
    assert a.proxy_tickers, "the energy theme should still offer a sector proxy"
