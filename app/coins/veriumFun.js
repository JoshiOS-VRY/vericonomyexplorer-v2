module.exports = {
  items: [
    {
      type: 'blockheight',
      date: '2016-09-01', // Verium genesis date (September 1, 2016)
      chain: 'main',
      blockHeight: 0,
      blockHash: '8232c0cf3bd7e05546e3d7aaaaf89fed8bc97c4df1a8c95e9249e13a2734932b',
      summary: 'Verium Genesis Block',
      alertBodyHtml:
        "This is the first block in the Verium blockchain, known as the <b>Genesis Block</b>. Verium is a Bitcoin fork designed for enhanced privacy and security with variable block times and unique reward mechanisms.<br/>Read more about Verium at: <a href='https://vericonomy.com/'>vericonomy.com</a>.",
      referenceUrl: 'https://vericonomy.com/',
    },
    {
      type: 'tx',
      date: '2016-09-01',
      chain: 'main',
      txid: '925e430072a1f39b530fc79db162e29433ab0ea266a99c8cab4f03001dc9faa9',
      blockHeight: 0,
      summary: 'Coinbase transaction of the Verium Genesis Block',
      alertBodyHtml:
        "This is the <b>coinbase transaction</b> of the <a href='./block/8232c0cf3bd7e05546e3d7aaaaf89fed8bc97c4df1a8c95e9249e13a2734932b'>Verium Genesis Block</a>. The coinbase message references 'VeriCoin block 1340292', linking Verium to the VeriCoin ecosystem. Verium implements enhanced privacy features while maintaining compatibility with Bitcoin's core protocol.",
      referenceUrl: 'https://vericonomy.com/',
    },
    {
      type: 'blockheight',
      date: '2016-09-01',
      chain: 'main',
      blockHeight: 1,
      blockHash: '3f2566fc0abcc9b2e26c737d905ff3e639a49d44cd5d11d260df3cfb62663012',
      summary: 'First Verium Block After Genesis',
      alertBodyHtml:
        'This is the first block mined after the Verium genesis block, marking the beginning of active mining on the Verium network.',
      referenceUrl: 'https://vericonomy.com/',
    },
    {
      type: 'blockheight',
      date: '2017-01-01', // Approximate date
      chain: 'main',
      blockHeight: 1500,
      blockHash: '0458cc7c7093cea6e78eed03a8f57d0eed200aaf5171eea82e63b8e643891cce',
      summary: 'Verium Network Milestone',
      alertBodyHtml:
        "This block represents an early milestone in the Verium network's development, showing the network's stability and growth.",
      referenceUrl: 'https://vericonomy.com/',
    },
    {
      type: 'blockheight',
      date: '2018-01-01', // Approximate date
      chain: 'main',
      blockHeight: 100000,
      blockHash: '0510c6cb8c5a2a5437fb893853f10e298654361a05cf611b1c54c1750dfbdad6',
      summary: '100,000 Block Milestone',
      alertBodyHtml:
        "Verium reached its 100,000th block, demonstrating the network's continued operation and growth since genesis.",
      referenceUrl: 'https://vericonomy.com/',
    },
  ],
};
