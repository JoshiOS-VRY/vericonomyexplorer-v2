# Verium Data Extracted from Source Code

This document contains all the real Verium blockchain parameters extracted from the [Verium source code](https://github.com/jayhines91/verium/tree/Verium-1.3.5).

## 🔍 **Genesis Block Information**

### Genesis Block Hash

```
8232c0cf3bd7e05546e3d7aaaaf89fed8bc97c4df1a8c95e9249e13a2734932b
```

### Genesis Transaction ID

```
925e430072a1f39b530fc79db162e29433ab0ea266a99c8cab4f03001dc9faa9
```

### Genesis Block Details

- **Timestamp**: 1472669240 (September 1, 2016)
- **Nonce**: 233180
- **Bits**: proofOfWorkLimit.GetCompact()
- **Version**: 1
- **Genesis Reward**: 2500 VRM
- **Coinbase Message**: "VeriCoin block 1340292"
- **Merkle Root**: 925e430072a1f39b530fc79db162e29433ab0ea266a99c8cab4f03001dc9faa9

## 🌐 **Network Parameters**

### Block Time & Difficulty

- **Target Block Time**: 5 minutes (300 seconds)
- **Difficulty Adjustment**: 2 days (2880 blocks at 5-minute intervals)
- **Target Timespan**: 2 _ 24 _ 60 \* 60 seconds (2 days)

### Network Configuration

- **Default Port**: 36988
- **Message Start**: 0x70, 0x35, 0x22, 0x05
- **Network ID**: "main"

### Address Formats

- **P2PKH Prefix**: 70 (addresses start with 'V')
- **P2SH Prefix**: 132 (addresses start with '3')
- **Private Key Prefix**: 198 (70 + 128)
- **Extended Public Key**: 0xE3, 0xCC, 0xBB, 0x92
- **Extended Private Key**: 0xE3, 0xCC, 0xAE, 0x01
- **Bech32 HRP**: "vrm"

## 💰 **Block Reward System**

### Special Rewards

- **Block 1**: 564,705 VRM (special presale reward)
- **Genesis Block**: 2,500 VRM

### Reward Calculation

Verium uses a unique exponential reward system:

```cpp
// For blocks after supply reaches 2,899,999 VRM
double dReward = 0.04 * exp(0.0116 * nBlockTime);

// For blocks before supply reaches 2,899,999 VRM
double dReward = 0.25 * exp(0.0116 * nBlockTime);
```

### Supply Limits

- **Maximum Supply**: 21,000,000 VRM (same as Bitcoin)
- **Supply Parity Point**: 2,899,999 VRM (10x VeriCoin supply)

## 🏗️ **Consensus Parameters**

### Proof of Work

- **Algorithm**: Scrypt² (scrypt squared)
- **Minimum Difficulty**: 0.00000048
- **No Retargeting**: false (difficulty adjusts normally)

### VIP (Verium Improvement Protocol)

- **VIP1 Height**: 520000 (Change Min Fee)

## 📊 **Checkpoints**

### Mainnet Checkpoints

- **Block 1**: 3f2566fc0abcc9b2e26c737d905ff3e639a49d44cd5d11d260df3cfb62663012
- **Block 1500**: 0458cc7c7093cea6e78eed03a8f57d0eed200aaf5171eea82e63b8e643891cce
- **Block 100000**: 0510c6cb8c5a2a5437fb893853f10e298654361a05cf611b1c54c1750dfbdad6

### Chain Transaction Data

- **Time**: 1499513240
- **Transaction Count**: 36,540
- **Transaction Rate**: 0.0013

## 🔧 **RPC Methods**

### Additional RPC Methods

Verium includes additional RPC methods not found in Bitcoin:

- `getsubsidy` - Returns proof-of-work subsidy value
- `getblockrate` - Returns block rate per hour

## 📅 **Historical Timeline**

- **September 1, 2016**: Genesis block created
- **2016**: First blocks mined, network begins operation
- **2017**: Network reaches 1,500 block milestone
- **2018**: Network reaches 100,000 block milestone
- **Current**: Active development on Verium-1.3.5

## 🎯 **Key Differences from Bitcoin**

1. **Variable Block Time**: Not fixed 10-minute intervals
2. **Exponential Rewards**: Based on block time and supply
3. **Scrypt² Algorithm**: Uses scrypt squared instead of SHA-256
4. **Special Block 1**: Massive reward for first block
5. **VIP System**: Verium Improvement Protocol
6. **Network Port**: 36988 instead of 8333
7. **Address Prefixes**: Different from Bitcoin's

## 📁 **Source Files Analyzed**

- `src/chainparams.cpp` - Network parameters and genesis block
- `src/consensus/params.h` - Consensus parameters
- `src/validation.cpp` - Block validation and reward calculation
- `src/pow.cpp` - Proof of work and reward functions
- `src/rpc/blockchain.cpp` - RPC methods
- `README.md` - Project documentation

All this data has been integrated into the Verium RPC Explorer configuration to provide accurate blockchain exploration capabilities.
