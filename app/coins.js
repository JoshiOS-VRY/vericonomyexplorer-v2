'use strict';

const btc = require('./coins/btc.js');
const vericoin = require('./coins/vericoin.js');
const verium = require('./coins/verium.js');

module.exports = {
  BTC: btc,
  VRC: vericoin,
  VRM: verium,

  coins: ['BTC', 'VRC', 'VRM'],
};
