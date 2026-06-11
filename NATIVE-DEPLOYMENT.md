# Verium RPC Explorer - Native Deployment Guide

This guide shows how to run the Verium RPC Explorer without Docker on various operating systems.

## Prerequisites

### System Requirements

- **Node.js**: Version 18 or higher (recommended: Node.js 20)
- **npm**: Version 8 or higher
- **Git**: For cloning the repository
- **Memory**: Minimum 2GB RAM (4GB+ recommended)
- **Disk**: At least 1GB free space

### Verium Node Requirements

- **Verium Core**: Running and synced
- **RPC Access**: Enabled and accessible
- **Port**: Default Verium RPC port 36988

## Installation Methods

### Method 1: Direct Git Clone (Recommended)

```bash
# 1. Clone the repository
git clone -b verium-explorer http://192.168.1.186:3000/jayhines91/btc-rpc-explorer.git
cd btc-rpc-explorer

# 2. Install dependencies
npm install

# 3. Create environment file
cp env.example .env

# 4. Edit configuration
nano .env

# 5. Start the explorer
npm start
```

### Method 2: Using PM2 (Production)

```bash
# 1. Install PM2 globally
npm install -g pm2

# 2. Clone and setup (same as Method 1)
git clone -b verium-explorer http://192.168.1.186:3000/jayhines91/btc-rpc-explorer.git
cd btc-rpc-explorer
npm install
cp env.example .env

# 3. Create PM2 ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'verium-explorer',
    script: 'bin/www',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      BTCEXP_COIN: 'VRM',
      BTCEXP_HOST: '0.0.0.0',
      BTCEXP_PORT: '3003',
      BTCEXP_DISPLAY_CURRENCY: 'vrm',
      BTCEXP_UI_THEME: 'dark'
    },
    env_production: {
      NODE_ENV: 'production'
    },
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
};
EOF

# 4. Create logs directory
mkdir -p logs

# 5. Start with PM2
pm2 start ecosystem.config.js --env production

# 6. Save PM2 configuration
pm2 save
pm2 startup
```

### Method 3: Systemd Service (Linux)

```bash
# 1. Create systemd service file
sudo tee /etc/systemd/system/verium-explorer.service > /dev/null << 'EOF'
[Unit]
Description=Verium RPC Explorer
After=network.target

[Service]
Type=simple
User=verium
WorkingDirectory=/opt/verium-explorer
ExecStart=/usr/bin/node bin/www
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=BTCEXP_COIN=VRM
Environment=BTCEXP_HOST=0.0.0.0
Environment=BTCEXP_PORT=3003
Environment=BTCEXP_DISPLAY_CURRENCY=vrm
Environment=BTCEXP_UI_THEME=dark

[Install]
WantedBy=multi-user.target
EOF

# 2. Create user and directory
sudo useradd -r -s /bin/false verium
sudo mkdir -p /opt/verium-explorer
sudo chown verium:verium /opt/verium-explorer

# 3. Deploy application
sudo -u verium git clone -b verium-explorer http://192.168.1.186:3000/jayhines91/btc-rpc-explorer.git /opt/verium-explorer
cd /opt/verium-explorer
sudo -u verium npm install
sudo -u verium cp env.example .env

# 4. Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable verium-explorer
sudo systemctl start verium-explorer
```

## Environment Configuration

Create a `.env` file with your settings:

```bash
# Verium Node Connection
BTCEXP_BITCOIND_URI=bitcoin://rpcuser:rpcpassword@127.0.0.1:36988/

# Alternative: Individual RPC settings
# BTCEXP_BITCOIND_HOST=127.0.0.1
# BTCEXP_BITCOIND_PORT=36988
# BTCEXP_BITCOIND_USER=rpcuser
# BTCEXP_BITCOIND_PASS=rpcpassword

# Address API Configuration
BTCEXP_ADDRESS_API=electrum
BTCEXP_ELECTRUM_SERVERS=tcp://127.0.0.1:50001

# UI Settings
BTCEXP_UI_THEME=dark
BTCEXP_SLOW_DEVICE_MODE=false

# Performance Settings
BTCEXP_RPC_CONCURRENCY=10
BTCEXP_OLD_SPACE_MAX_SIZE=1024

# Security (optional)
# BTCEXP_BASIC_AUTH_PASSWORD=your_secure_password

# Privacy (optional)
# BTCEXP_PRIVACY_MODE=true
# BTCEXP_NO_RATES=true

# Cache Configuration
BTCEXP_FILESYSTEM_CACHE_DIR=./cache

# Logging
DEBUG=btcexp:app,btcexp:error
```

## Platform-Specific Instructions

### Ubuntu/Debian

```bash
# 1. Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. Install build tools
sudo apt-get install -y build-essential python3 git

# 3. Clone and setup
git clone -b verium-explorer http://192.168.1.186:3000/jayhines91/btc-rpc-explorer.git
cd btc-rpc-explorer
npm install
cp env.example .env

# 4. Start the application
npm start
```

### CentOS/RHEL/Fedora

```bash
# 1. Install Node.js 20
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs

# 2. Install build tools
sudo yum groupinstall -y "Development Tools"
sudo yum install -y python3 git

# 3. Clone and setup
git clone -b verium-explorer http://192.168.1.186:3000/jayhines91/btc-rpc-explorer.git
cd btc-rpc-explorer
npm install
cp env.example .env

# 4. Start the application
npm start
```

### macOS

```bash
# 1. Install Node.js (using Homebrew)
brew install node

# 2. Clone and setup
git clone -b verium-explorer http://192.168.1.186:3000/jayhines91/btc-rpc-explorer.git
cd btc-rpc-explorer
npm install
cp env.example .env

# 3. Start the application
npm start
```

### Windows

```powershell
# 1. Install Node.js from https://nodejs.org/
# 2. Open PowerShell as Administrator

# 3. Clone repository
git clone -b verium-explorer http://192.168.1.186:3000/jayhines91/btc-rpc-explorer.git
cd btc-rpc-explorer

# 4. Install dependencies
npm install

# 5. Create environment file
copy env.example .env

# 6. Edit .env file with your configuration
notepad .env

# 7. Start the application
npm start
```

## Production Setup

### Using PM2 (Recommended for Production)

```bash
# 1. Install PM2
npm install -g pm2

# 2. Create ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'verium-explorer',
    script: 'bin/www',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      BTCEXP_COIN: 'VRM',
      BTCEXP_HOST: '0.0.0.0',
      BTCEXP_PORT: '3003',
      BTCEXP_DISPLAY_CURRENCY: 'vrm',
      BTCEXP_UI_THEME: 'dark'
    },
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    max_memory_restart: '1G'
  }]
};
EOF

# 3. Create logs directory
mkdir -p logs

# 4. Start with PM2
pm2 start ecosystem.config.js

# 5. Save PM2 configuration
pm2 save
pm2 startup
```

### Using Nginx Reverse Proxy

```nginx
# /etc/nginx/sites-available/verium-explorer
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3003;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Management Commands

### Using PM2

```bash
# Start the explorer
pm2 start verium-explorer

# Stop the explorer
pm2 stop verium-explorer

# Restart the explorer
pm2 restart verium-explorer

# View logs
pm2 logs verium-explorer

# Monitor
pm2 monit

# Show status
pm2 status
```

### Using Systemd

```bash
# Start service
sudo systemctl start verium-explorer

# Stop service
sudo systemctl stop verium-explorer

# Restart service
sudo systemctl restart verium-explorer

# View logs
sudo journalctl -u verium-explorer -f

# Check status
sudo systemctl status verium-explorer
```

## Troubleshooting

### Common Issues

1. **Port Already in Use**

   ```bash
   # Check what's using port 3003
   lsof -i :3003

   # Kill the process
   kill -9 <PID>
   ```

2. **Permission Issues**

   ```bash
   # Fix file permissions
   chmod +x bin/www
   chown -R $USER:$USER .
   ```

3. **Memory Issues**

   ```bash
   # Increase Node.js memory limit
   export NODE_OPTIONS="--max-old-space-size=2048"
   npm start
   ```

4. **Verium Node Connection**
   - Verify Verium node is running
   - Check RPC credentials
   - Ensure port 36988 is accessible

### Logs and Monitoring

```bash
# View application logs
tail -f logs/combined.log

# Check system resources
htop
free -h
df -h

# Test connectivity
curl http://localhost:3003/
```

## Security Considerations

1. **Firewall**: Only expose port 3003 if needed
2. **Reverse Proxy**: Use nginx for HTTPS and security
3. **User Permissions**: Run as non-root user
4. **Environment Variables**: Keep sensitive data in .env file
5. **Updates**: Regularly update Node.js and dependencies

## Backup and Updates

### Backup

```bash
# Backup application
tar -czf verium-explorer-backup.tar.gz btc-rpc-explorer/

# Backup cache
tar -czf cache-backup.tar.gz cache/
```

### Updates

```bash
# Update from Git
git pull origin verium-explorer
npm install
pm2 restart verium-explorer
```

## Performance Optimization

1. **Memory**: Set appropriate `--max-old-space-size`
2. **CPU**: Use PM2 cluster mode for multi-core systems
3. **Cache**: Ensure cache directory has sufficient space
4. **Network**: Use reverse proxy for SSL termination
