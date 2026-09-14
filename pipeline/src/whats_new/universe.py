"""Tracked equity and ETF universe for the MVP."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Stock:
    ticker: str
    company_name: str
    sector: str
    industry: str


# NASDAQ-100 majors + S&P 100 overlap + sector / broad ETFs.
# Intentionally curated (~145) rather than exhaustive.
_RAW: tuple[tuple[str, str, str, str], ...] = (
    # Mega-cap tech
    ("AAPL", "Apple Inc.", "Technology", "Consumer Electronics"),
    ("MSFT", "Microsoft Corporation", "Technology", "Software"),
    ("NVDA", "NVIDIA Corporation", "Technology", "Semiconductors"),
    ("GOOGL", "Alphabet Inc. Class A", "Communication Services", "Internet"),
    ("GOOG", "Alphabet Inc. Class C", "Communication Services", "Internet"),
    ("AMZN", "Amazon.com Inc.", "Consumer Discretionary", "E-Commerce"),
    ("META", "Meta Platforms Inc.", "Communication Services", "Social Media"),
    ("TSLA", "Tesla Inc.", "Consumer Discretionary", "Automobiles"),
    ("AVGO", "Broadcom Inc.", "Technology", "Semiconductors"),
    ("ORCL", "Oracle Corporation", "Technology", "Software"),
    ("CRM", "Salesforce Inc.", "Technology", "Software"),
    ("ADBE", "Adobe Inc.", "Technology", "Software"),
    ("AMD", "Advanced Micro Devices", "Technology", "Semiconductors"),
    ("INTC", "Intel Corporation", "Technology", "Semiconductors"),
    ("QCOM", "QUALCOMM Incorporated", "Technology", "Semiconductors"),
    ("TXN", "Texas Instruments", "Technology", "Semiconductors"),
    ("AMAT", "Applied Materials", "Technology", "Semiconductor Equipment"),
    ("MU", "Micron Technology", "Technology", "Semiconductors"),
    ("LRCX", "Lam Research", "Technology", "Semiconductor Equipment"),
    ("KLAC", "KLA Corporation", "Technology", "Semiconductor Equipment"),
    ("SNPS", "Synopsys Inc.", "Technology", "Software"),
    ("CDNS", "Cadence Design Systems", "Technology", "Software"),
    ("INTU", "Intuit Inc.", "Technology", "Software"),
    ("NOW", "ServiceNow Inc.", "Technology", "Software"),
    ("PANW", "Palo Alto Networks", "Technology", "Cybersecurity"),
    ("CRWD", "CrowdStrike Holdings", "Technology", "Cybersecurity"),
    ("CSCO", "Cisco Systems", "Technology", "Networking"),
    ("IBM", "International Business Machines", "Technology", "IT Services"),
    ("ACN", "Accenture plc", "Technology", "IT Services"),
    ("NXPI", "NXP Semiconductors", "Technology", "Semiconductors"),
    ("ADI", "Analog Devices", "Technology", "Semiconductors"),
    ("MRVL", "Marvell Technology", "Technology", "Semiconductors"),
    ("ASML", "ASML Holding", "Technology", "Semiconductor Equipment"),
    ("TSM", "Taiwan Semiconductor", "Technology", "Semiconductors"),
    # Communication / media
    ("NFLX", "Netflix Inc.", "Communication Services", "Streaming"),
    ("DIS", "The Walt Disney Company", "Communication Services", "Media"),
    ("CMCSA", "Comcast Corporation", "Communication Services", "Cable"),
    ("T", "AT&T Inc.", "Communication Services", "Telecom"),
    ("VZ", "Verizon Communications", "Communication Services", "Telecom"),
    ("TMUS", "T-Mobile US", "Communication Services", "Telecom"),
    # Consumer
    ("COST", "Costco Wholesale", "Consumer Staples", "Retail"),
    ("WMT", "Walmart Inc.", "Consumer Staples", "Retail"),
    ("PG", "Procter & Gamble", "Consumer Staples", "Household Products"),
    ("KO", "The Coca-Cola Company", "Consumer Staples", "Beverages"),
    ("PEP", "PepsiCo Inc.", "Consumer Staples", "Beverages"),
    ("MCD", "McDonald's Corporation", "Consumer Discretionary", "Restaurants"),
    ("NKE", "NIKE Inc.", "Consumer Discretionary", "Apparel"),
    ("SBUX", "Starbucks Corporation", "Consumer Discretionary", "Restaurants"),
    ("HD", "The Home Depot", "Consumer Discretionary", "Home Improvement"),
    ("LOW", "Lowe's Companies", "Consumer Discretionary", "Home Improvement"),
    ("TJX", "TJX Companies", "Consumer Discretionary", "Retail"),
    ("BKNG", "Booking Holdings", "Consumer Discretionary", "Travel"),
    ("ABNB", "Airbnb Inc.", "Consumer Discretionary", "Travel"),
    ("CMG", "Chipotle Mexican Grill", "Consumer Discretionary", "Restaurants"),
    ("MAR", "Marriott International", "Consumer Discretionary", "Hotels"),
    # Financials
    ("JPM", "JPMorgan Chase", "Financials", "Banks"),
    ("BAC", "Bank of America", "Financials", "Banks"),
    ("WFC", "Wells Fargo", "Financials", "Banks"),
    ("C", "Citigroup Inc.", "Financials", "Banks"),
    ("GS", "Goldman Sachs", "Financials", "Investment Banking"),
    ("MS", "Morgan Stanley", "Financials", "Investment Banking"),
    ("BLK", "BlackRock Inc.", "Financials", "Asset Management"),
    ("SCHW", "Charles Schwab", "Financials", "Brokerage"),
    ("AXP", "American Express", "Financials", "Consumer Finance"),
    ("V", "Visa Inc.", "Financials", "Payments"),
    ("MA", "Mastercard Inc.", "Financials", "Payments"),
    ("PYPL", "PayPal Holdings", "Financials", "Payments"),
    ("COF", "Capital One Financial", "Financials", "Consumer Finance"),
    ("USB", "U.S. Bancorp", "Financials", "Banks"),
    ("PNC", "PNC Financial Services", "Financials", "Banks"),
    ("BK", "Bank of New York Mellon", "Financials", "Custody"),
    ("SPGI", "S&P Global", "Financials", "Data & Analytics"),
    ("MCO", "Moody's Corporation", "Financials", "Data & Analytics"),
    ("ICE", "Intercontinental Exchange", "Financials", "Exchanges"),
    ("CME", "CME Group", "Financials", "Exchanges"),
    # Healthcare
    ("UNH", "UnitedHealth Group", "Healthcare", "Managed Care"),
    ("JNJ", "Johnson & Johnson", "Healthcare", "Pharma"),
    ("LLY", "Eli Lilly", "Healthcare", "Pharma"),
    ("ABBV", "AbbVie Inc.", "Healthcare", "Pharma"),
    ("MRK", "Merck & Co.", "Healthcare", "Pharma"),
    ("PFE", "Pfizer Inc.", "Healthcare", "Pharma"),
    ("BMY", "Bristol-Myers Squibb", "Healthcare", "Pharma"),
    ("AMGN", "Amgen Inc.", "Healthcare", "Biotech"),
    ("GILD", "Gilead Sciences", "Healthcare", "Biotech"),
    ("VRTX", "Vertex Pharmaceuticals", "Healthcare", "Biotech"),
    ("REGN", "Regeneron Pharmaceuticals", "Healthcare", "Biotech"),
    ("ISRG", "Intuitive Surgical", "Healthcare", "Medical Devices"),
    ("MDT", "Medtronic plc", "Healthcare", "Medical Devices"),
    ("SYK", "Stryker Corporation", "Healthcare", "Medical Devices"),
    ("TMO", "Thermo Fisher Scientific", "Healthcare", "Life Sciences"),
    ("DHR", "Danaher Corporation", "Healthcare", "Life Sciences"),
    ("ABT", "Abbott Laboratories", "Healthcare", "Medical Devices"),
    ("CVS", "CVS Health", "Healthcare", "Pharmacy / Insurance"),
    # Energy
    ("XOM", "Exxon Mobil", "Energy", "Integrated Oil"),
    ("CVX", "Chevron Corporation", "Energy", "Integrated Oil"),
    ("COP", "ConocoPhillips", "Energy", "E&P"),
    ("SLB", "Schlumberger", "Energy", "Oilfield Services"),
    ("EOG", "EOG Resources", "Energy", "E&P"),
    ("OXY", "Occidental Petroleum", "Energy", "E&P"),
    ("MPC", "Marathon Petroleum", "Energy", "Refining"),
    ("PSX", "Phillips 66", "Energy", "Refining"),
    ("VLO", "Valero Energy", "Energy", "Refining"),
    ("WMB", "Williams Companies", "Energy", "Midstream"),
    # Industrials
    ("CAT", "Caterpillar Inc.", "Industrials", "Machinery"),
    ("DE", "Deere & Company", "Industrials", "Machinery"),
    ("GE", "GE Aerospace", "Industrials", "Aerospace"),
    ("HON", "Honeywell International", "Industrials", "Conglomerate"),
    ("UNP", "Union Pacific", "Industrials", "Railroads"),
    ("UPS", "United Parcel Service", "Industrials", "Logistics"),
    ("FDX", "FedEx Corporation", "Industrials", "Logistics"),
    ("BA", "Boeing Company", "Industrials", "Aerospace"),
    ("LMT", "Lockheed Martin", "Industrials", "Defense"),
    ("RTX", "RTX Corporation", "Industrials", "Aerospace"),
    ("MMM", "3M Company", "Industrials", "Conglomerate"),
    ("ETN", "Eaton Corporation", "Industrials", "Electrical Equipment"),
    # Materials / utilities / real estate
    ("LIN", "Linde plc", "Materials", "Industrial Gases"),
    ("APD", "Air Products", "Materials", "Industrial Gases"),
    ("SHW", "Sherwin-Williams", "Materials", "Specialty Chemicals"),
    ("NEE", "NextEra Energy", "Utilities", "Electric"),
    ("DUK", "Duke Energy", "Utilities", "Electric"),
    ("SO", "Southern Company", "Utilities", "Electric"),
    ("AMT", "American Tower", "Real Estate", "REIT"),
    ("PLD", "Prologis Inc.", "Real Estate", "REIT"),
    ("EQIX", "Equinix Inc.", "Real Estate", "Data Center REIT"),
    # Broad and sector ETFs
    ("SPY", "SPDR S&P 500 ETF", "ETF", "Broad Market"),
    ("QQQ", "Invesco QQQ Trust", "ETF", "Nasdaq-100"),
    ("IWM", "iShares Russell 2000 ETF", "ETF", "Small Cap"),
    ("DIA", "SPDR Dow Jones Industrial Average ETF", "ETF", "Blue Chip"),
    ("XLK", "Technology Select Sector SPDR", "ETF", "Technology"),
    ("XLF", "Financial Select Sector SPDR", "ETF", "Financials"),
    ("XLE", "Energy Select Sector SPDR", "ETF", "Energy"),
    ("XLV", "Health Care Select Sector SPDR", "ETF", "Healthcare"),
    ("XLI", "Industrial Select Sector SPDR", "ETF", "Industrials"),
    ("XLY", "Consumer Discretionary Select Sector SPDR", "ETF", "Consumer Discretionary"),
    ("XLP", "Consumer Staples Select Sector SPDR", "ETF", "Consumer Staples"),
    ("XLU", "Utilities Select Sector SPDR", "ETF", "Utilities"),
    ("XLB", "Materials Select Sector SPDR", "ETF", "Materials"),
    ("XLRE", "Real Estate Select Sector SPDR", "ETF", "Real Estate"),
    ("XLC", "Communication Services Select Sector SPDR", "ETF", "Communication"),
    ("SMH", "VanEck Semiconductor ETF", "ETF", "Semiconductors"),
    ("SOXX", "iShares Semiconductor ETF", "ETF", "Semiconductors"),
    ("ARKK", "ARK Innovation ETF", "ETF", "Innovation"),
    ("TLT", "iShares 20+ Year Treasury Bond ETF", "ETF", "Bonds"),
    ("HYG", "iShares iBoxx High Yield Corporate Bond ETF", "ETF", "Bonds"),
    ("GLD", "SPDR Gold Shares", "ETF", "Commodities"),
    ("USO", "United States Oil Fund", "ETF", "Commodities"),
)


STOCKS: tuple[Stock, ...] = tuple(
    Stock(ticker=t, company_name=n, sector=s, industry=i) for t, n, s, i in _RAW
)

TICKERS: tuple[str, ...] = tuple(s.ticker for s in STOCKS)

_BY_TICKER: dict[str, Stock] = {s.ticker: s for s in STOCKS}


def get_stock(ticker: str) -> Stock | None:
    return _BY_TICKER.get(ticker.upper())


def tickers_by_sector(sector: str) -> list[str]:
    return [s.ticker for s in STOCKS if s.sector.lower() == sector.lower()]


def is_tracked(ticker: str) -> bool:
    return ticker.upper() in _BY_TICKER
