global.currencyTypes = {
  vrm: {
    id: 'vrm',
    type: 'native',
    name: 'VRM',
    multiplier: 1,
    default: true,
    decimalPlaces: 8,
  },
  btc: {
    id: 'btc',
    type: 'native',
    name: 'BTC',
    multiplier: 1,
    default: false,
    decimalPlaces: 8,
  },
  sat: {
    id: 'sat',
    type: 'native',
    name: 'sat',
    multiplier: 100000000,
    decimalPlaces: 0,
  },
  usd: {
    id: 'usd',
    type: 'exchanged',
    name: 'USD',
    multiplier: 'usd',
    decimalPlaces: 2,
    symbol: '$',
  },
  eur: {
    id: 'eur',
    type: 'exchanged',
    name: 'EUR',
    multiplier: 'eur',
    decimalPlaces: 2,
    symbol: '€',
  },
  gbp: {
    id: 'gbp',
    type: 'exchanged',
    name: 'GBP',
    multiplier: 'gbp',
    decimalPlaces: 2,
    symbol: '£',
  },
};

global.currencySymbols = {
  vrm: 'V',
  btc: '₿',
  usd: '$',
  eur: '€',
  gbp: '£',
};
