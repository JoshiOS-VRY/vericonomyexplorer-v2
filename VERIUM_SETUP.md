# Verium RPC Explorer Setup Guide

This Bitcoin RPC Explorer has been modified to work with Verium (VRM), a Bitcoin fork. This guide will help you set up and configure the explorer to work with your Verium node.

## Prerequisites

1. **Verium Node**: You need a running Verium node with RPC enabled
2. **Node.js**: Version 12 or higher
3. **npm**: For package management

## Configuration

### 1. Environment Variables

Create a `.env` file in the project root with the following configuration:

```bash
# Coin Configuration
BTCEXP_COIN=VRM

# RPC Configuration (adjust for your Verium node)
BTCEXP_BITCOIND_HOST=127.0.0.1
BTCEXP_BITCOIND_PORT=36987
BTCEXP_BITCOIND_USER=veriumexplorer
BTCEXP_BITCOIND_PASS=-=Verium=-

# Or use cookie file
BTCEXP_BITCOIND_COOKIE=/path/to/your/verium/.cookie

# Optional: Address API for enhanced address lookups
BTCEXP_ADDRESS_API=electrum
BTCEXP_ELECTRUM_SERVERS=tcp://your-electrum-server:50001

# Optional: Exchange rates (currently uses Bitcoin rates as placeholder)
BTCEXP_NO_RATES=false

# Optional: Demo mode
BTCEXP_DEMO=false
```

### 2. Verium Node Configuration

Ensure your Verium node is configured with the following settings in `verium.conf`:

```ini
# Enable RPC server
server=1

# Enable transaction index for full functionality
txindex=1

# RPC credentials
rpcuser=your_rpc_username
rpcpassword=your_rpc_password

# Or use cookie authentication (recommended)
# Remove rpcuser/rpcpassword if using cookie auth

# Network settings
rpcallowip=127.0.0.1
rpcbind=127.0.0.1
```

## Installation

1. **Install Dependencies**:

   ```bash
   npm install
   ```

2. **Start the Explorer**:

   ```bash
   npm start
   ```

   Or with specific configuration:

   ```bash
   BTCEXP_COIN=VRM BTCEXP_BITCOIND_PORT=8332 npm start
   ```

## Important Notes

### Real Verium Data

The configuration now includes real Verium-specific parameters extracted from the source code:

- **Genesis Block Hash**: `8232c0cf3bd7e05546e3d7aaaaf89fed8bc97c4df1a8c95e9249e13a2734932b`
- **Genesis Transaction**: `925e430072a1f39b530fc79db162e29433ab0ea266a99c8cab4f03001dc9faa9`
- **Genesis Date**: September 1, 2016 (timestamp: 1472669240)
- **Block Time**: 5 minutes (variable)
- **Difficulty Adjustment**: 2 days (2880 blocks)
- **Network Port**: 36988
- **Address Prefixes**: P2PKH=70, P2SH=132, Bech32="vrm"
- **Exchange Rates**: Currently uses Bitcoin exchange rates as placeholder
- **Mining Pools**: Basic Verium pool configuration included

### Remaining Updates

The following items still need customization:

1. **Exchange Rate API**: Replace Bitcoin exchange rate API with Verium-specific one
2. **Mining Pool Data**: Update mining pool configurations in `public/txt/mining-pools-configs/VRM/` with real Verium pools
3. **Block Reward Calculation**: The current implementation is simplified - Verium's actual reward mechanism is complex and depends on block time calculations

### Network Assets

Verium-specific branding assets have been created in:

- `public/img/network-verium/` - Logos and icons
- Uses Verium orange color scheme (#FF6B35)

## Features

All Bitcoin RPC Explorer features are available for Verium:

- ✅ Block and transaction browsing
- ✅ Address lookups and transaction history
- ✅ Mempool monitoring
- ✅ Mining statistics
- ✅ Network statistics
- ✅ RPC browser and terminal
- ✅ API endpoints
- ✅ UTXO set analysis
- ✅ Difficulty history
- ✅ Block analysis tools

## Troubleshooting

### Common Issues

1. **Connection Refused**: Ensure your Verium node is running and RPC is enabled
2. **Authentication Failed**: Check RPC credentials or cookie file path
3. **No Data**: Ensure `txindex=1` is set in your Verium node configuration
4. **Slow Performance**: Consider enabling `BTCEXP_SLOW_DEVICE_MODE=true` for resource-constrained environments

### Logs

Check the console output for detailed error messages. The explorer will show connection status and any RPC errors.

## Customization

### Adding Verium-Specific Features

1. **Exchange Rates**: Update `exchangeRateData` in `app/coins/verium.js` with Verium-specific API
2. **Mining Pools**: Add real Verium mining pool data to `public/txt/mining-pools-configs/VRM/`
3. **Historical Events**: Add Verium milestones to `app/coins/veriumFun.js`
4. **UI Customization**: Modify templates in `views/` directory for Verium-specific content

### Verium-Specific Features

Verium has several unique features compared to Bitcoin:

1. **Variable Block Time**: Verium uses a variable block time mechanism instead of fixed 10-minute intervals
2. **Unique Reward System**: Block rewards are calculated using exponential functions based on block time and supply
3. **Special Block 1**: The first block after genesis has a special reward of 564,705 VRM
4. **VIP (Verium Improvement Protocol)**: Verium has its own improvement protocol system
5. **Network Port**: Uses port 36988 instead of Bitcoin's 8333
6. **Address Format**: Uses "vrm" as Bech32 human-readable part
7. **Message Start**: Uses different magic bytes (0x70, 0x35, 0x22, 0x05)

## Support

For issues specific to this Verium modification, please check:

1. Verium node logs
2. Explorer console output
3. RPC connection status

The explorer maintains compatibility with Bitcoin's RPC interface, so most Verium forks should work without additional modifications.
