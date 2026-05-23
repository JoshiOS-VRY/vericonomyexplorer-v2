# BTC RPC Explorer - Verium Port Analysis

## 📋 Overview

This document provides a comprehensive analysis of the BTC RPC Explorer codebase as it relates to the Verium (VRM) port. The explorer has been partially ported to work with Verium, and this analysis identifies the current state, structure, and areas needing attention.

## 🏗️ Codebase Structure

### Core Architecture

```
btc-rpc-explorer/
├── app.js                    # Main Express application entry point
├── app/
│   ├── config.js             # Configuration management (defaults to VRM)
│   ├── coins.js              # Coin registry (BTC, VRM)
│   ├── coins/
│   │   ├── btc.js            # Bitcoin configuration
│   │   ├── verium.js         # Verium configuration ⭐
│   │   └── veriumFun.js      # Verium historical data ⭐
│   ├── api/
│   │   ├── coreApi.js        # Core blockchain API wrapper
│   │   ├── rpcApi.js         # Direct RPC calls
│   │   └── addressApi.js     # Address lookup APIs
│   └── credentials.js        # RPC authentication
├── routes/
│   ├── baseRouter.js         # Main routes (homepage, blocks, txs, etc.)
│   ├── apiRouter.js          # REST API endpoints
│   └── ...
├── views/                    # Pug templates
└── public/                   # Static assets
    ├── img/network-verium/   # Verium branding ⭐
    └── txt/mining-pools-configs/VRM/  # Verium pool configs ⭐
```

## ✅ Verium Integration Status

### Completed

1. **Coin Configuration** (`app/coins/verium.js`)
   - ✅ Genesis block hash: `8232c0cf3bd7e05546e3d7aaaaf89fed8bc97c4df1a8c95e9249e13a2734932b`
   - ✅ Genesis transaction: `925e430072a1f39b530fc79db162e29433ab0ea266a99c8cab4f03001dc9faa9`
   - ✅ Block time: 5 minutes (300 seconds)
   - ✅ Difficulty adjustment: 2880 blocks (2 days)
   - ✅ Currency units (VRM, mVRM, bits, sat)
   - ✅ Network branding (orange color #FF6B35)
   - ✅ Historical milestones (`veriumFun.js`)

2. **Configuration** (`app/config.js`)
   - ✅ Default coin set to `VRM` (line 36)
   - ✅ Default display currency: `vrm`
   - ✅ Verium-specific tool names

3. **Assets**
   - ✅ Verium coin icon (`public/img/network-verium/coin-icon.svg`)
   - ✅ Mining pool configs (`public/txt/mining-pools-configs/VRM/0.json`)
   - ⚠️ Missing: `logo.svg` in `network-verium/` directory

4. **Documentation**
   - ✅ `VERIUM_SETUP.md` - Setup guide
   - ✅ `VERIUM_DATA_EXTRACTED.md` - Extracted blockchain data
   - ✅ `docs/Verium-Docker-Setup.md` - Docker instructions

### Partially Complete / Needs Work

1. **Block Reward Calculation** (`app/coins/verium.js:447-457`)
   - ⚠️ Simplified implementation
   - ⚠️ Verium uses complex exponential reward based on block time
   - ⚠️ Special block 1 reward (564,705 VRM) not fully implemented

2. **Exchange Rates** (`app/coins/verium.js:411-432`)
   - ⚠️ Currently uses Bitcoin exchange rates as placeholder
   - ⚠️ Needs Verium-specific exchange rate API

3. **Mining Pool Data**
   - ⚠️ Basic placeholder data exists
   - ⚠️ Needs real Verium mining pool addresses

4. **UTXO Set Checkpoints** (`app/coins/verium.js:144-159`)
   - ⚠️ All zeros - needs real Verium UTXO data

5. **Supply Checkpoints** (`app/coins/verium.js:137-142`)
   - ⚠️ All zeros - needs real Verium supply data

## 🔍 Key Code Patterns

### Coin Configuration Access

The codebase uses multiple patterns to access coin configuration:

1. **Global Access**: `global.coinConfig` (set in `app.js:817`)
2. **Template Access**: `res.locals.coinConfig` (set in `app.js:1079`)
3. **Direct Access**: `coinConfig` (in routes - relies on `res.locals`)

**⚠️ Potential Issue**: In `routes/baseRouter.js`, `coinConfig` is used directly (lines 95, 119, 149, etc.) without the `res.locals.` prefix. This works because Express makes `res.locals` properties available directly, but it's inconsistent with `global.coinConfig` usage on line 161.

### RPC Connection Flow

1. **Startup** (`app.js:813-1047`)
   - Loads coin config: `global.coinConfig = coins[config.coin]`
   - Connects to RPC: `connectToRpcServer()`
   - Verifies connection: `verifyRpcConnection()`
   - On success: `onRpcConnectionVerified()`

2. **RPC Client** (`app.js:975-989`)
   - Main client: `global.rpcClient` (with timeout)
   - Long-running: `global.rpcClientNoTimeout`

3. **Default Port** (`app/credentials.js:41`)
   - Default: 8332 (Bitcoin)
   - Verium uses: 36988 (must be set via env var)

## 🐛 Potential Issues

### 1. Missing Logo File
- **Location**: `public/img/network-verium/logo.svg`
- **Impact**: Logo may not display correctly
- **Status**: Only `coin-icon.svg` exists

### 2. Inconsistent coinConfig Access
- **Location**: `routes/baseRouter.js`
- **Issue**: Mix of `coinConfig` and `global.coinConfig`
- **Risk**: Low (both work, but inconsistent)

### 3. Block Reward Function
- **Location**: `app/coins/verium.js:447-457`
- **Issue**: Simplified implementation doesn't match Verium's complex reward system
- **Impact**: Block reward calculations may be inaccurate

### 4. Exchange Rate API
- **Location**: `app/coins/verium.js:411-432`
- **Issue**: Uses Bitcoin rates
- **Impact**: VRM/USD rates will be incorrect

### 5. Default RPC Port
- **Location**: `app/credentials.js:41`
- **Issue**: Defaults to 8332 (Bitcoin)
- **Impact**: Must set `BTCEXP_BITCOIND_PORT=36988` for Verium

## 📊 Verium-Specific Parameters

### Network Configuration
- **Port**: 36988 (vs Bitcoin's 8333)
- **RPC Port**: 36988 (vs Bitcoin's 8332)
- **Message Start**: `0x70, 0x35, 0x22, 0x05`
- **Address Prefixes**: P2PKH=70 ('V'), P2SH=132 ('3'), Bech32="vrm"

### Blockchain Parameters
- **Genesis Date**: September 1, 2016 (timestamp: 1472669240)
- **Block Time**: 5 minutes (variable, not fixed)
- **Difficulty Adjustment**: Every 2880 blocks (2 days)
- **Max Supply**: 21,000,000 VRM
- **Algorithm**: Scrypt² (scrypt squared)

### Special Blocks
- **Block 0**: Genesis (2,500 VRM reward)
- **Block 1**: Special presale reward (564,705 VRM)
- **Block 1500**: Early milestone
- **Block 100000**: Network milestone

## 🔄 How to Refresh Server

### Quick Restart (if running via npm)
```bash
cd /home/jhadmin/btc-rpc-explorer
npm start
```

### If running in screen session
```bash
# Find the screen session
screen -ls

# Attach to it (e.g., "blockexplorer")
screen -r blockexplorer

# Restart: Ctrl+C, then
npm start
# Or: node ./bin/www
```

### If running via PM2
```bash
pm2 restart btc-rpc-explorer
# or
pm2 reload btc-rpc-explorer
```

### If running via systemd
```bash
sudo systemctl restart btc-rpc-explorer
```

### Docker
```bash
docker-compose restart
# or
docker-compose down && docker-compose up -d
```

## 🎯 Recommended Next Steps

1. **Create Missing Logo**
   - Add `public/img/network-verium/logo.svg`
   - Should match Verium branding (orange #FF6B35)

2. **Fix Block Reward Calculation**
   - Implement proper Verium reward formula
   - Handle special block 1 reward
   - Consider block time in calculations

3. **Update Exchange Rate API**
   - Find or create Verium-specific exchange rate API
   - Update `exchangeRateData` in `verium.js`

4. **Populate Real Data**
   - Add real UTXO set checkpoints
   - Add real supply checkpoints
   - Update mining pool addresses

5. **Standardize coinConfig Access**
   - Use consistent pattern (`global.coinConfig` or `res.locals.coinConfig`)
   - Update `routes/baseRouter.js` for consistency

6. **Test Verium-Specific Features**
   - Verify block time calculations
   - Test difficulty adjustment display
   - Verify address format handling

## 📝 Environment Variables for Verium

```bash
# Required
BTCEXP_COIN=VRM
BTCEXP_BITCOIND_PORT=36988  # Verium RPC port
BTCEXP_BITCOIND_HOST=127.0.0.1
BTCEXP_BITCOIND_USER=your_rpc_user
BTCEXP_BITCOIND_PASS=your_rpc_pass

# Or use cookie
BTCEXP_BITCOIND_COOKIE=/path/to/verium/.cookie

# Optional
BTCEXP_DISPLAY_CURRENCY=vrm
BTCEXP_UI_THEME=dark
BTCEXP_SLOW_DEVICE_MODE=false
```

## 🔗 Key Files Reference

- **Coin Config**: `app/coins/verium.js`
- **Main App**: `app.js`
- **Routes**: `routes/baseRouter.js`
- **RPC API**: `app/api/rpcApi.js`
- **Core API**: `app/api/coreApi.js`
- **Config**: `app/config.js`
- **Credentials**: `app/credentials.js`

## 📚 Documentation Files

- `VERIUM_SETUP.md` - Setup instructions
- `VERIUM_DATA_EXTRACTED.md` - Extracted blockchain parameters
- `docs/Verium-Docker-Setup.md` - Docker deployment
- `README.md` - Original Bitcoin explorer docs

---

**Last Updated**: Analysis completed after codebase review
**Status**: Partially ported, functional but needs refinement

