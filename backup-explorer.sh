#!/bin/bash

# Verium Explorer Complete Backup Script
# Creates a complete backup of everything needed to restore the explorer elsewhere

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKUP_BASE_DIR="$HOME"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="verium-explorer-backup-${TIMESTAMP}"
BACKUP_DIR="${BACKUP_BASE_DIR}/${BACKUP_NAME}"
EXPLORER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "${EXPLORER_DIR}/package.json" ]; then
    print_error "This script must be run from the explorer directory"
    exit 1
fi

print_status "Starting Verium Explorer backup..."
print_info "Explorer directory: ${EXPLORER_DIR}"
print_info "Backup directory: ${BACKUP_DIR}"

# Create backup directory structure
mkdir -p "${BACKUP_DIR}"
mkdir -p "${BACKUP_DIR}/explorer"
mkdir -p "${BACKUP_DIR}/database"
mkdir -p "${BACKUP_DIR}/cache"
mkdir -p "${BACKUP_DIR}/config"

# Get database info
if [ -f "${EXPLORER_DIR}/.env" ]; then
    source "${EXPLORER_DIR}/.env" 2>/dev/null || true
fi

DB_PATH="${BTCEXP_SQLITE_PATH:-${EXPLORER_DIR}/database/explorer.db}"
CACHE_DIR="${BTCEXP_FILESYSTEM_CACHE_DIR:-${EXPLORER_DIR}/cache}"

print_status "Backing up application code..."

# Copy application files (exclude node_modules, logs, cache, database)
rsync -av --progress \
    --exclude='node_modules' \
    --exclude='logs' \
    --exclude='*.log' \
    --exclude='cache' \
    --exclude='database' \
    --exclude='.git' \
    --exclude='.env' \
    --exclude='*.db' \
    --exclude='*.db-shm' \
    --exclude='*.db-wal' \
    --exclude='npm-debug.log*' \
    --exclude='yarn-debug.log*' \
    --exclude='yarn-error.log*' \
    --exclude='.nyc_output' \
    --exclude='coverage' \
    --exclude='.DS_Store' \
    --exclude='*.swp' \
    --exclude='*.swo' \
    --exclude='*~' \
    "${EXPLORER_DIR}/" "${BACKUP_DIR}/explorer/"

print_status "Backing up database..."

# Backup database file
if [ -f "${DB_PATH}" ]; then
    DB_SIZE=$(du -h "${DB_PATH}" | cut -f1)
    print_info "Database size: ${DB_SIZE}"
    print_info "Copying database file (this may take a while)..."
    
    # Copy database file
    cp "${DB_PATH}" "${BACKUP_DIR}/database/explorer.db"
    
    # Copy WAL and SHM files if they exist
    if [ -f "${DB_PATH}-wal" ]; then
        cp "${DB_PATH}-wal" "${BACKUP_DIR}/database/explorer.db-wal"
        print_info "Copied WAL file"
    fi
    
    if [ -f "${DB_PATH}-shm" ]; then
        cp "${DB_PATH}-shm" "${BACKUP_DIR}/database/explorer.db-shm"
        print_info "Copied SHM file"
    fi
    
    print_status "Database backed up successfully"
else
    print_warning "Database file not found at ${DB_PATH}"
    print_warning "Backup will continue without database"
fi

print_status "Backing up configuration..."

# Backup .env file (if exists)
if [ -f "${EXPLORER_DIR}/.env" ]; then
    cp "${EXPLORER_DIR}/.env" "${BACKUP_DIR}/config/.env"
    print_info "Backed up .env file"
    
    # Create .env.example with sanitized values
    sed 's/=.*/=***REDACTED***/g' "${EXPLORER_DIR}/.env" > "${BACKUP_DIR}/config/.env.example"
    print_info "Created .env.example (sanitized)"
else
    print_warning ".env file not found"
fi

# Backup env.example if it exists
if [ -f "${EXPLORER_DIR}/env.example" ]; then
    cp "${EXPLORER_DIR}/env.example" "${BACKUP_DIR}/config/env.example"
fi

print_status "Backing up cache (optional)..."

# Backup cache directory (optional, can be large)
# Skip cache by default as it can be regenerated
if [ -d "${CACHE_DIR}" ] && [ "$(ls -A ${CACHE_DIR} 2>/dev/null)" ]; then
    CACHE_SIZE=$(du -sh "${CACHE_DIR}" | cut -f1)
    print_info "Cache size: ${CACHE_SIZE}"
    print_info "Skipping cache backup (can be regenerated)"
    # Uncomment below to include cache
    # cp -r "${CACHE_DIR}"/* "${BACKUP_DIR}/cache/" 2>/dev/null || true
    # print_info "Cache backed up"
else
    print_info "No cache directory found or cache is empty"
fi

print_status "Creating backup manifest..."

# Create manifest file
cat > "${BACKUP_DIR}/BACKUP_MANIFEST.txt" << EOF
Verium Explorer Backup Manifest
===============================
Created: $(date)
Source Directory: ${EXPLORER_DIR}
Backup Directory: ${BACKUP_DIR}

Contents:
---------
1. Explorer Application Code
   - Location: explorer/
   - Excludes: node_modules, logs, cache, database

2. Database
   - Location: database/
   - File: explorer.db
   - Size: $(if [ -f "${BACKUP_DIR}/database/explorer.db" ]; then du -h "${BACKUP_DIR}/database/explorer.db" | cut -f1; else echo "Not found"; fi)

3. Configuration
   - Location: config/
   - Files: .env, env.example

4. Cache (optional)
   - Location: cache/
   - Note: Cache can be regenerated, included only if requested

System Information:
-------------------
OS: $(uname -a)
Node.js: $(node --version 2>/dev/null || echo "Not found")
npm: $(npm --version 2>/dev/null || echo "Not found")

Database Information:
--------------------
$(if [ -f "${BACKUP_DIR}/database/explorer.db" ]; then
    BTCEXP_USE_SQLITE=true node -e "
    const Database = require('better-sqlite3');
    const db = new Database('${BACKUP_DIR}/database/explorer.db');
    const blockCount = db.prepare('SELECT COUNT(*) as count FROM blocks;').get();
    const txCount = db.prepare('SELECT COUNT(*) as count FROM transactions;').get();
    const addrCount = db.prepare('SELECT COUNT(*) as count FROM address_balances;').get();
    const syncMeta = db.prepare('SELECT value FROM sync_metadata WHERE key = ?;').get('last_synced_height');
    console.log('Blocks:', blockCount.count);
    console.log('Transactions:', txCount.count);
    console.log('Addresses:', addrCount.count);
    console.log('Last synced height:', syncMeta ? syncMeta.value : 'Unknown');
    db.close();
    " 2>/dev/null || echo "Could not read database info"
else
    echo "Database not included in backup"
fi)

Restoration Instructions:
------------------------
See RESTORE.md for detailed restoration instructions.

Quick Start:
1. Extract backup to desired location
2. Run: npm install
3. Copy database to database/ directory
4. Copy .env to root directory
5. Run: npm start
EOF

print_status "Creating restoration guide..."

# Create restoration guide
cat > "${BACKUP_DIR}/RESTORE.md" << 'EOF'
# Verium Explorer Restoration Guide

This backup contains everything needed to restore the Verium Explorer on a new system.

## Prerequisites

- Node.js 18+ installed
- npm 8+ installed
- Verium node running and accessible via RPC

## Restoration Steps

### 1. Extract Backup

```bash
# Extract the backup archive (if compressed)
tar -xzf verium-explorer-backup-*.tar.gz
cd verium-explorer-backup-*
```

### 2. Install Dependencies

```bash
cd explorer
npm install
```

### 3. Restore Database

```bash
# Create database directory
mkdir -p database

# Copy database file
cp ../database/explorer.db database/explorer.db

# Copy WAL and SHM files if they exist
cp ../database/explorer.db-wal database/ 2>/dev/null || true
cp ../database/explorer.db-shm database/ 2>/dev/null || true
```

### 4. Restore Configuration

```bash
# Copy .env file to explorer root
cp ../config/.env .env

# Edit .env file with your new system's settings:
# - Update RPC connection details if needed
# - Update paths if needed
# - Update any other system-specific settings
```

### 5. Verify Configuration

Edit `.env` and ensure:
- `BTCEXP_BITCOIND_HOST` - Verium node host
- `BTCEXP_BITCOIND_PORT` - Verium node port (default: 36988)
- `BTCEXP_BITCOIND_USER` - RPC username
- `BTCEXP_BITCOIND_PASS` - RPC password
- `BTCEXP_SQLITE_PATH` - Path to database (default: ./database/explorer.db)
- `BTCEXP_FILESYSTEM_CACHE_DIR` - Path to cache (default: ./cache)

### 6. Start Explorer

```bash
# Start the explorer
npm start

# Or use PM2 for production
pm2 start ecosystem.config.js
```

### 7. Verify Installation

1. Open browser to http://localhost:3003 (or your configured port)
2. Check that blocks are displaying
3. Check database status at /admin/database-status
4. Verify address lookups work

## Troubleshooting

### Database Issues

If you get database errors:
- Ensure database file has correct permissions
- Check that database directory exists and is writable
- Verify `BTCEXP_SQLITE_PATH` in .env matches actual location

### RPC Connection Issues

If explorer can't connect to Verium node:
- Verify Verium node is running
- Check RPC credentials in .env
- Test RPC connection: `curl -u user:pass -d '{"method":"getblockchaininfo"}' http://localhost:36988`

### Port Conflicts

If port is already in use:
- Change `BTCEXP_PORT` in .env
- Or stop the conflicting service

## Notes

- Cache directory can be regenerated, so it's optional
- Database contains all synced blocks and address data
- Configuration files may need adjustment for new system
- Paths in .env should be absolute or relative to explorer directory

## Support

For issues, check:
- Logs in logs/ directory
- Database status at /admin/database-status
- System resources (RAM, disk space)
EOF

print_status "Calculating backup size..."

# Calculate sizes
TOTAL_SIZE=$(du -sh "${BACKUP_DIR}" | cut -f1)
print_info "Total backup size: ${TOTAL_SIZE}"

print_status "Creating checksums..."

# Create checksums
cd "${BACKUP_DIR}"
find . -type f -exec md5sum {} \; > CHECKSUMS.md5 2>/dev/null || find . -type f -exec shasum -a 256 {} \; > CHECKSUMS.sha256 2>/dev/null || true
print_info "Checksums created"

print_status "Creating archive..."

# Create compressed archive
cd "${BACKUP_BASE_DIR}"
print_info "Creating compressed archive (this may take a while)..."
ARCHIVE_NAME="${BACKUP_NAME}.tar.gz"
tar -czf "${ARCHIVE_NAME}" "${BACKUP_NAME}" 2>/dev/null || {
    print_warning "Could not create compressed archive, backup directory is ready"
    ARCHIVE_NAME=""
}

if [ -n "${ARCHIVE_NAME}" ] && [ -f "${ARCHIVE_NAME}" ]; then
    ARCHIVE_SIZE=$(du -h "${ARCHIVE_NAME}" | cut -f1)
    print_status "Archive created: ${ARCHIVE_NAME}"
    print_info "Archive size: ${ARCHIVE_SIZE}"
    
    # Create archive checksum
    md5sum "${ARCHIVE_NAME}" > "${ARCHIVE_NAME}.md5" 2>/dev/null || shasum -a 256 "${ARCHIVE_NAME}" > "${ARCHIVE_NAME}.sha256" 2>/dev/null || true
    print_info "Archive checksum created"
fi

print_status "Backup complete!"
echo ""
print_info "Backup location: ${BACKUP_DIR}"
if [ -n "${ARCHIVE_NAME}" ]; then
    print_info "Archive location: ${BACKUP_BASE_DIR}/${ARCHIVE_NAME}"
fi
echo ""
print_info "Contents:"
echo "  - Explorer code: ${BACKUP_DIR}/explorer/"
echo "  - Database: ${BACKUP_DIR}/database/"
echo "  - Configuration: ${BACKUP_DIR}/config/"
echo "  - Documentation: ${BACKUP_DIR}/RESTORE.md"
echo "  - Manifest: ${BACKUP_DIR}/BACKUP_MANIFEST.txt"
echo ""
print_warning "IMPORTANT: The .env file contains sensitive credentials."
print_warning "Keep this backup secure and do not share it publicly."
echo ""
print_status "To restore, see: ${BACKUP_DIR}/RESTORE.md"

