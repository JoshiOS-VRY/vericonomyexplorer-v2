# Vericoin (VRC) Explorer Conversion Analysis

## Overview

This document outlines what's needed to convert the current Verium (VRM) explorer to work with Vericoin (VRC). Based on the [Vericoin codebase](https://github.com/VeriConomy/vericoin) and the [current Vericoin explorer](https://explorer-vrc.vericonomy.com/#homePeers), here's a comprehensive breakdown.

## Key Differences: Vericoin vs Verium

### Consensus Mechanism

- **Vericoin (VRC)**: Proof-of-Stake-Time (PoST) - Staking/Minting
- **Verium (VRM)**: Proof-of-Work (PoW) - Mining

### Network Parameters

Based on the Vericoin codebase and explorer:

| Parameter         | Vericoin (VRC)         | Verium (VRM)        | Notes                                  |
| ----------------- | ---------------------- | ------------------- | -------------------------------------- |
| **Consensus**     | PoST (Staking)         | PoW (Mining)        | Fundamental difference                 |
| **Block Time**    | Variable (PoST)        | 5 minutes           | Vericoin uses time-based staking       |
| **Reward System** | Interest-based staking | Block reward mining | Vericoin rewards based on staking time |
| **Network Port**  | TBD (check source)     | 36988               | Different default ports                |
| **RPC Port**      | TBD (check source)     | 36987               | Different RPC ports                    |

## Required Changes for Vericoin Support

### 1. Coin Configuration File (`app/coins/vericoin.js`)

Create a new coin configuration file similar to `verium.js`:

**Required Parameters:**

```javascript
{
  name: "Vericoin",
  ticker: "VRC",
  // Network parameters from Vericoin source
  genesisBlockHash: "...", // Extract from Vericoin source
  genesisTransactionId: "...",
  targetBlockTimeSeconds: null, // PoST doesn't have fixed block time
  difficultyAdjustmentBlockCount: null, // PoST doesn't use difficulty
  currencyUnits: [
    { name: "VRC", multiplier: 1 },
    { name: "mVRC", multiplier: 1000 },
    // ... similar to Verium
  ],
  // PoST-specific
  stakingEnabled: true,
  interestRate: true, // Vericoin has interest rate
  // Address prefixes (extract from Vericoin source)
  addressPrefixes: {
    p2pkh: "...", // Extract from chainparams.cpp
    p2sh: "...",
    bech32: "vrc" // Likely
  }
}
```

**Extract from Vericoin Source:**

- Genesis block hash from `src/chainparams.cpp`
- Genesis transaction ID
- Network port from `src/chainparams.cpp`
- RPC port (check `src/rpc/server.cpp` or config)
- Address prefixes from `src/chainparams.cpp`
- Staking parameters from `src/validation.cpp` or `src/pow.cpp`

### 2. RPC Method Support

**Vericoin-Specific RPC Methods Needed:**

Based on the explorer showing "Extraction" (staking), you'll need:

1. **`getstakinginfo`** - Staking status and statistics
   - Current staking status
   - Staking balance
   - Expected time to stake
   - Staking weight

2. **`getmintinfo`** or **`getmintinginfo`** - Minting/staking information
   - Recent mints
   - Minting statistics
   - Staker addresses

3. **`getinterest`** or **`getinterestrate`** - Interest rate information
   - Current interest rate
   - Interest rate history

4. **`getextraction`** - Extraction/staking data (if available)
   - Top stakers
   - Extraction statistics

5. **Standard RPC Methods** (should work as-is):
   - `getblockchaininfo`
   - `getblock`
   - `getrawtransaction`
   - `getnetworkinfo`
   - `getpeerinfo`
   - `getmempoolinfo`

**Action Required:**

- Check Vericoin source code (`src/rpc/`) for exact RPC method names
- Test each method with a Vericoin node
- Add error handling for unsupported methods (like we did for Verium)

### 3. Frontend Features

Based on [explorer-vrc.vericonomy.com](https://explorer-vrc.vericonomy.com/#homePeers):

#### A. Extraction/Staking Section

**Current Status:** Not implemented in btc-rpc-explorer

**Required:**

- New route: `/extraction` or `/staking`
- New view: `views/extraction.pug`
- API endpoint: `/api/extraction` or `/api/staking`
- Display:
  - Top stakers (addresses)
  - Staking statistics
  - Recent mints
  - Staking rewards

**Implementation:**

```javascript
// routes/baseRouter.js
router.get('/extraction', async (req, res) => {
  const stakingInfo = await rpcApi.getRpcData('getstakinginfo');
  const mintInfo = await rpcApi.getRpcData('getmintinfo');
  // ... render extraction page
});
```

#### B. Orphaned Blocks

**Current Status:** Partially supported (database has `orphaned_blocks` table)

**Required:**

- Route: `/orphans`
- View: `views/orphans.pug`
- Display orphaned blocks with:
  - Last height
  - Last hash
  - Branch length
  - Status

**Implementation:**

- Query `orphaned_blocks` table from SQLite
- Or use RPC method if available (check Vericoin source)

#### C. Peers Display

**Current Status:** Supported via `getpeerinfo`

**Required:**

- Enhanced peer display showing:
  - Sub. Version
  - Protocol version
  - Count
  - AddNode functionality

**Implementation:**

- Already available via `getpeerinfo` RPC
- May need UI enhancements

#### D. Rich List

**Current Status:** Database supports this (`address_balances` table)

**Required:**

- Route: `/richlist`
- View: `views/richlist.pug`
- Query SQLite `address_balances` table
- Display top 100 addresses by balance

**Implementation:**

```javascript
// routes/baseRouter.js
router.get('/richlist', async (req, res) => {
  const topAddresses = await sqliteAddressApi.getTopAddresses(100);
  // ... render richlist
});
```

#### E. Interest Rate Display

**Current Status:** Not implemented

**Required:**

- Display current interest rate on homepage
- Interest rate history chart
- RPC call: `getinterest` or `getinterestrate`

### 4. Network Hashrate (PoST Context)

**Issue:** Vericoin uses PoST, not PoW, so "network hashrate" doesn't apply

**Solution:**

- Replace "Network Hashrate" with "Network Staking Weight" or "Total Staked"
- Use `getstakinginfo` to get total staking weight
- Display as "Total Staked" or "Network Staking Weight"

### 5. Block Display Changes

**PoST-Specific Fields:**

- Remove "Mined by" (miner address)
- Add "Minted by" (staker address)
- Display staking reward instead of mining reward
- Show interest earned in block

**Block Reward:**

- Vericoin blocks have staking rewards, not mining rewards
- Extract reward calculation from Vericoin source
- Display as "Staking Reward" or "Mint Reward"

### 6. Address Format Support

**Required:**

- Extract address prefixes from Vericoin source
- Update `app/utils.js` to handle Vericoin addresses
- Support Vericoin bech32 format (likely "vrc" HRP)

### 7. Configuration Updates

**`app/coins.js`:**

```javascript
const vericoin = require('./coins/vericoin.js');

module.exports = {
  BTC: btc,
  VRM: verium,
  VRC: vericoin, // Add Vericoin
  coins: ['BTC', 'VRM', 'VRC'],
};
```

**`app/config.js`:**

- Update default coin option to support VRC
- Add Vericoin-specific defaults

### 8. Branding Assets

**Required:**

- Create `public/img/network-vericoin/` directory
- Add Vericoin logo (`logo.svg`)
- Add favicon files
- Add coin icon (`coin-icon.svg`)
- Update color scheme (check Vericoin branding)

### 9. Database Schema

**Current Status:** SQLite schema should work as-is

**May Need:**

- `staking_info` table for staking statistics
- `mints` table for minting history
- `interest_rates` table for interest rate history

**Or:**

- Use existing `blocks` and `transactions` tables
- Add staking-specific fields if needed

## Remote Node Configuration

### Using Nodes on Another Server

**Will it cause issues?** **No, but consider:**

1. **Network Latency:**
   - Remote RPC calls will be slower
   - May impact page load times
   - Consider caching more aggressively

2. **Connection Reliability:**
   - Network issues between explorer and node
   - Implement retry logic
   - Add connection health monitoring

3. **Security:**
   - Use SSL/TLS for RPC connections
   - Restrict RPC access to explorer IP only
   - Use strong RPC credentials

4. **Configuration:**

   ```bash
   # In .env or docker-compose.yml
   BTCEXP_BITCOIND_HOST=remote-node-ip
   BTCEXP_BITCOIND_PORT=vericoin-rpc-port
   BTCEXP_BITCOIND_USER=rpcuser
   BTCEXP_BITCOIND_PASS=rpcpassword
   ```

5. **Node Configuration:**

   ```ini
   # On remote Vericoin node
   server=1
   rpcallowip=explorer-server-ip
   rpcbind=0.0.0.0  # Or specific IP
   rpcuser=...
   rpcpassword=...
   ```

6. **Firewall:**
   - Open RPC port on remote node
   - Restrict to explorer server IP
   - Use VPN if possible

7. **Performance:**
   - Remote nodes work fine for read-only operations
   - SQLite caching will help reduce RPC calls
   - Consider Redis for hot cache

## Implementation Priority

### Phase 1: Basic Vericoin Support

1. ✅ Create `app/coins/vericoin.js` with basic parameters
2. ✅ Extract genesis block and network parameters from source
3. ✅ Add Vericoin to coin registry
4. ✅ Test basic block/transaction viewing

### Phase 2: PoST Features

1. ✅ Implement staking info display
2. ✅ Add extraction/staking page
3. ✅ Replace "hashrate" with "staking weight"
4. ✅ Update block display for PoST

### Phase 3: Advanced Features

1. ✅ Rich list implementation
2. ✅ Orphaned blocks page
3. ✅ Interest rate display
4. ✅ Enhanced peer display

### Phase 4: Polish

1. ✅ Branding assets
2. ✅ UI/UX improvements
3. ✅ Performance optimization
4. ✅ Documentation

## Testing Checklist

- [ ] Connect to Vericoin node
- [ ] View blocks correctly
- [ ] View transactions correctly
- [ ] Address lookups work
- [ ] Staking info displays
- [ ] Extraction page works
- [ ] Rich list displays
- [ ] Orphaned blocks display
- [ ] Interest rate shows
- [ ] Remote node connection works
- [ ] Performance is acceptable

## Resources

- **Vericoin Source:** https://github.com/VeriConomy/vericoin
- **Current Explorer:** https://explorer-vrc.vericonomy.com/#homePeers
- **Verium Explorer (Reference):** Current codebase

## Next Steps

1. **Extract Vericoin Parameters:**
   - Clone Vericoin repository
   - Extract genesis block, network params, RPC methods
   - Document all differences from Verium

2. **Create Vericoin Coin Config:**
   - Start with `verium.js` as template
   - Update all Vericoin-specific values
   - Test with Vericoin node

3. **Implement PoST Features:**
   - Add staking RPC methods
   - Create extraction/staking UI
   - Update block display

4. **Test Remote Node:**
   - Configure remote Vericoin node
   - Test connection and performance
   - Optimize caching if needed
