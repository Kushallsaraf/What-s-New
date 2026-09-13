export type DataSource = {
  id: string;
  name: string;
  purpose: string;
  officialUrl: string;
  cadence: string;
  access: 'no-key' | 'free-key' | 'internal-only';
  redistribution: string;
};

export const dataSources: DataSource[] = [
  {
    id: 'sec-edgar',
    name: 'SEC EDGAR',
    purpose: 'Company filings and filing events',
    officialUrl: 'https://www.sec.gov/edgar/sec-api-documentation',
    cadence: 'Event-driven',
    access: 'no-key',
    redistribution: 'Link to the filing and retain provenance.',
  },
  {
    id: 'fred',
    name: 'Federal Reserve Economic Data',
    purpose: 'Rates and macroeconomic time series',
    officialUrl: 'https://fred.stlouisfed.org/docs/api/fred/',
    cadence: 'Series-dependent',
    access: 'free-key',
    redistribution: 'Attribute the underlying source for each series.',
  },
  {
    id: 'treasury',
    name: 'U.S. Treasury',
    purpose: 'Official interest-rate and fiscal data',
    officialUrl:
      'https://home.treasury.gov/resource-center/data-chart-center/interest-rates',
    cadence: 'Business days',
    access: 'no-key',
    redistribution: 'Public U.S. government data; retain source link.',
  },
  {
    id: 'bls',
    name: 'U.S. Bureau of Labor Statistics',
    purpose: 'Inflation and labor-market releases',
    officialUrl: 'https://www.bls.gov/developers/',
    cadence: 'Release calendar',
    access: 'no-key',
    redistribution: 'Public U.S. government data; retain series metadata.',
  },
  {
    id: 'eia',
    name: 'U.S. Energy Information Administration',
    purpose: 'Energy inventories, production, and prices',
    officialUrl: 'https://www.eia.gov/opendata/',
    cadence: 'Daily or weekly',
    access: 'free-key',
    redistribution: 'Retain units, frequency, and source attribution.',
  },
  {
    id: 'london-strategic-edge',
    name: 'London Strategic Edge',
    purpose: 'Research and internal feature exploration',
    officialUrl: 'https://londonstrategicedge.com/',
    cadence: 'Site-dependent',
    access: 'internal-only',
    redistribution:
      'Do not display or redistribute unless written permission and terms allow it.',
  },
];
