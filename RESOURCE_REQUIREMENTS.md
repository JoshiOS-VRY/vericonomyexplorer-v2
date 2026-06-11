# Verium Explorer/Node - Resource Requirements

## Summary

**Minimum Requirements (Basic Operation):**

- **CPU**: 2 cores
- **RAM**: 4 GB
- **Disk**: 50 GB (SSD recommended)
- **Network**: 5 Mbps upload/download

**Recommended Requirements (Production):**

- **CPU**: 4+ cores
- **RAM**: 8-16 GB
- **Disk**: 100+ GB SSD
- **Network**: 10+ Mbps upload/download

---

## Detailed Breakdown

### 1. Verium Node (Bitcoin Core Fork)

#### CPU

- **Minimum**: 2 cores (1.5+ GHz)
- **Recommended**: 4+ cores (2.0+ GHz)
- **Usage**:
  - Initial sync: High CPU usage
  - Normal operation: Low to moderate
  - Block validation: CPU-intensive during sync

#### RAM

- **Minimum**: 2 GB
- **Recommended**: 4-8 GB
- **Usage**:
  - Blockchain indexing: 2-4 GB
  - UTXO set: 1-2 GB
  - RPC operations: 500 MB - 1 GB
  - **Total**: ~4-8 GB for comfortable operation

#### Disk Storage

- **Blockchain data**: ~20-30 GB (grows over time)
- **Index files**: ~5-10 GB
- **Logs**: ~1-2 GB
- **Total**: **~30-50 GB minimum**, 100+ GB recommended for growth

#### Network

- **Initial sync**: 10+ Mbps (can take days/weeks)
- **Normal operation**: 1-5 Mbps
- **Peers**: 8-10 connections typical

---

### 2. Verium Explorer (Node.js Application)

#### CPU

- **Minimum**: 1 core
- **Recommended**: 2 cores
- **Usage**:
  - Low during idle
  - Moderate during page loads
  - Higher during database sync/backfill

#### RAM

- **Minimum**: 1 GB
- **Recommended**: 2-4 GB
- **Breakdown**:
  - Node.js base: ~200-300 MB
  - Application code: ~100-200 MB
  - LRU cache (in-memory): ~100-500 MB
  - Redis cache (if enabled): ~100-1000 MB (configurable)
  - SQLite operations: ~50-200 MB
  - **Total**: ~1-2 GB typical, up to 4 GB with heavy caching

#### Disk Storage

**SQLite Database:**

- **Current stats** (371,321 blocks synced):
  - Database size: ~658 MB
  - Bytes per block: ~1,859 bytes
  - Bytes per transaction: ~1,511 bytes

- **Estimated for full chain** (1,000,000 blocks):
  - Database size: **~1.73 GB**
  - Growth rate: ~1.7 MB per 1,000 blocks

**Additional Storage:**

- Application files: ~500 MB
- Node modules: ~200-300 MB
- Logs: ~100-500 MB
- Filesystem cache (if enabled): ~100 MB - 1 GB
- **Total**: **~3-5 GB** for explorer

#### Network

- **Inbound**: Minimal (serves web pages)
- **Outbound**:
  - RPC calls to Verium node: Low bandwidth
  - External API calls (if enabled): Variable

---

### 3. Combined System Requirements

#### Minimum Configuration

```
CPU:     2 cores (1.5+ GHz)
RAM:     4 GB
Disk:    50 GB (SSD recommended)
Network: 5 Mbps
```

**Breakdown:**

- Verium Node: 2 GB RAM, 30 GB disk
- Explorer: 1 GB RAM, 5 GB disk
- OS + Buffer: 1 GB RAM, 15 GB disk

#### Recommended Configuration

```
CPU:     4+ cores (2.0+ GHz)
RAM:     8-16 GB
Disk:    100+ GB SSD
Network: 10+ Mbps
```

**Breakdown:**

- Verium Node: 4-8 GB RAM, 50 GB disk
- Explorer: 2-4 GB RAM, 5 GB disk
- Redis (optional): 1 GB RAM, minimal disk
- OS + Buffer: 2-4 GB RAM, 45 GB disk

#### Production/High-Traffic Configuration

```
CPU:     8+ cores (2.5+ GHz)
RAM:     16-32 GB
Disk:    200+ GB SSD
Network: 50+ Mbps
```

**Breakdown:**

- Verium Node: 8 GB RAM, 100 GB disk
- Explorer: 4 GB RAM, 10 GB disk
- Redis: 2-4 GB RAM
- OS + Buffer: 4-8 GB RAM, 90 GB disk

---

## Storage Growth Projections

### SQLite Database Growth

Based on current data (658 MB for 371K blocks):

| Blocks | Estimated Size | Notes               |
| ------ | -------------- | ------------------- |
| 100K   | ~186 MB        | Early chain         |
| 500K   | ~930 MB        | Mid-chain           |
| 1M     | ~1.73 GB       | Full chain estimate |
| 2M     | ~3.5 GB        | Future growth       |

**Growth rate**: ~1.7 MB per 1,000 blocks

### Verium Blockchain Growth

- **Block time**: 5 minutes (300 seconds)
- **Blocks per day**: ~288 blocks
- **Blocks per year**: ~105,120 blocks
- **Estimated growth**: ~20-30 GB per year (varies with transaction volume)

---

## Performance Considerations

### Initial Sync

- **Verium Node**: Can take days/weeks depending on:
  - Network speed
  - CPU power
  - Disk I/O speed (SSD highly recommended)
- **Explorer Database**: Backfill runs in background
  - Processes 100 blocks per chunk
  - 1 second delay between chunks
  - Estimated time: ~11-12 days for 1M blocks at 1 block/second

### Normal Operation

- **CPU**: Low to moderate usage
- **RAM**: Stable, depends on cache size
- **Disk I/O**: Low for reads, periodic writes during sync
- **Network**: Minimal bandwidth usage

### High Traffic

- **Concurrent users**: Each user adds ~10-50 MB RAM
- **Cache hit rate**: Higher cache = lower RPC load
- **Database queries**: SQLite handles well up to moderate load

---

## Optimization Tips

### Reduce Memory Usage

1. **Disable Redis** (if not needed): Saves 100 MB - 1 GB
2. **Reduce LRU cache size**: Lower `slowDeviceMode` cache limits
3. **Limit SQLite cache**: Use filesystem cache instead
4. **Set Node.js memory limit**: `--max-old-space-size=1024` (1 GB)

### Reduce Disk Usage

1. **Enable pruning** (if acceptable): Reduces blockchain size
2. **Compress SQLite database**: Use `VACUUM` periodically
3. **Rotate logs**: Keep only recent logs
4. **Disable filesystem cache**: Use Redis or SQLite only

### Improve Performance

1. **Use SSD**: Critical for database performance
2. **Enable Redis**: Faster than SQLite for hot cache
3. **Increase RPC concurrency**: More parallel RPC calls
4. **Use reverse proxy**: nginx for SSL and caching

---

## Cost Estimates (Cloud Providers)

### Minimum (VPS)

- **DigitalOcean**: $12/month (2 GB RAM, 1 vCPU, 50 GB SSD)
- **Linode**: $12/month (2 GB RAM, 1 vCPU, 50 GB SSD)
- **Vultr**: $12/month (2 GB RAM, 1 vCPU, 50 GB SSD)

### Recommended (VPS)

- **DigitalOcean**: $24/month (4 GB RAM, 2 vCPU, 80 GB SSD)
- **Linode**: $24/month (4 GB RAM, 2 vCPU, 80 GB SSD)
- **Vultr**: $24/month (4 GB RAM, 2 vCPU, 80 GB SSD)

### Production (VPS)

- **DigitalOcean**: $48/month (8 GB RAM, 4 vCPU, 160 GB SSD)
- **Linode**: $48/month (8 GB RAM, 4 vCPU, 160 GB SSD)
- **Vultr**: $48/month (8 GB RAM, 4 vCPU, 160 GB SSD)

---

## Monitoring Recommendations

### Key Metrics to Watch

1. **RAM usage**: Should stay under 80% of total
2. **Disk space**: Monitor growth, keep 20% free
3. **CPU usage**: Should be low during normal operation
4. **Database size**: Track SQLite growth
5. **Sync progress**: Monitor backfill status
6. **RPC response times**: Should be < 1 second

### Tools

- **htop/top**: CPU and RAM monitoring
- **df -h**: Disk space monitoring
- **pm2 monit**: Node.js process monitoring
- **Explorer admin dashboard**: `/admin/database-status`

---

## Notes

- **SSD is highly recommended** for both blockchain and database storage
- **Initial sync is the most resource-intensive** period
- **SQLite database grows linearly** with block count
- **Redis is optional** but recommended for better performance
- **Network bandwidth** is most important during initial sync
- **CPU is less critical** after initial sync completes

---

_Last updated: Based on current database stats (371,321 blocks, 658 MB)_
