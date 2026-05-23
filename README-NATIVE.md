# Verium RPC Explorer - Native Deployment

This guide shows how to run the Verium RPC Explorer without Docker on your local machine or server.

## Quick Start

### Option 1: Automated Setup (Recommended)

```bash
# Clone the repository
git clone -b verium-explorer http://192.168.1.186:3000/jayhines91/btc-rpc-explorer.git
cd btc-rpc-explorer

# Run the automated setup script
./setup-native.sh setup
```

### Option 2: Manual Setup

```bash
# 1. Clone repository
git clone -b verium-explorer http://192.168.1.186:3000/jayhines91/btc-rpc-explorer.git
cd btc-rpc-explorer

# 2. Install dependencies
npm install

# 3. Create environment file
cp env.example .env
# Edit .env with your Verium node configuration

# 4. Start the explorer
npm start
```

### Option 3: Development Mode

```bash
# For development/testing
./start-dev.sh        # Linux/macOS
# or
start-dev.bat         # Windows
```

## Prerequisites

- **Node.js**: Version 18 or higher
- **npm**: Version 8 or higher
- **Git**: For cloning the repository
- **Verium Node**: Running and accessible via RPC

## Installation Methods

### 1. Development Mode (Simple)

Perfect for testing and development:

```bash
# Clone and start
git clone -b verium-explorer http://192.168.1.186:3000/jayhines91/btc-rpc-explorer.git
cd btc-rpc-explorer
npm install
cp env.example .env
# Edit .env file
./start-dev.sh
```

### 2. Production Mode (PM2)

For production deployment with process management:

```bash
# Use the automated setup
./setup-native.sh setup

# Or manually:
npm install -g pm2
npm install
cp env.example .env
# Edit .env file
pm2 start ecosystem.config.js
```

### 3. System Service (Linux)

For system-level service management:

```bash
# Follow the systemd setup in NATIVE-DEPLOYMENT.md
sudo systemctl start verium-explorer
```

## Configuration

### Environment Variables (.env file)

```bash
# Verium Node Connection
BTCEXP_BITCOIND_URI=bitcoin://rpcuser:rpcpassword@127.0.0.1:36988/

# Address API
BTCEXP_ADDRESS_API=electrum
BTCEXP_ELECTRUM_SERVERS=tcp://127.0.0.1:50001

# UI Settings
BTCEXP_UI_THEME=dark
BTCEXP_SLOW_DEVICE_MODE=false

# Security (optional)
# BTCEXP_BASIC_AUTH_PASSWORD=your_secure_password
```

## Management Commands

### Using the Setup Script

```bash
./setup-native.sh setup     # Complete setup
./setup-native.sh stop      # Stop application
./setup-native.sh restart   # Restart application
./setup-native.sh logs      # View logs
./setup-native.sh status    # Show status
./setup-native.sh update    # Update from Git
./setup-native.sh cleanup   # Remove application
```

### Using PM2

```bash
pm2 start verium-explorer   # Start
pm2 stop verium-explorer    # Stop
pm2 restart verium-explorer # Restart
pm2 logs verium-explorer   # View logs
pm2 status                  # Show status
pm2 monit                   # Monitor resources
```

### Using npm (Development)

```bash
npm start                   # Start in development mode
npm run start              # Alternative start command
```

## Platform Support

### Linux (Ubuntu/Debian)
```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Linux (CentOS/RHEL/Fedora)
```bash
# Install Node.js
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs
```

### macOS
```bash
# Install Node.js via Homebrew
brew install node
```

### Windows
1. Download Node.js from https://nodejs.org/
2. Install Git for Windows
3. Use PowerShell or Command Prompt

## Access the Explorer

Once running, access your Verium explorer at:
- **Local**: `http://localhost:3003`
- **Network**: `http://your-server-ip:3003`

## Features

✅ **Verium Currency**: All amounts displayed in VRM  
✅ **Port 3003**: Updated from default 3002  
✅ **Git Integration**: Easy updates from repository  
✅ **Process Management**: PM2 for production  
✅ **Development Mode**: Simple start for testing  
✅ **Cross-Platform**: Linux, macOS, Windows support  

## Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   lsof -i :3003
   kill -9 <PID>
   ```

2. **Permission Issues**
   ```bash
   chmod +x bin/www
   chown -R $USER:$USER .
   ```

3. **Memory Issues**
   ```bash
   export NODE_OPTIONS="--max-old-space-size=2048"
   npm start
   ```

4. **Verium Node Connection**
   - Verify Verium node is running
   - Check RPC credentials in .env
   - Ensure port 36988 is accessible

### Logs and Monitoring

```bash
# View logs
pm2 logs verium-explorer

# Monitor resources
pm2 monit

# Check system resources
htop
free -h
```

## Security Considerations

1. **Firewall**: Only expose port 3003 if needed
2. **Reverse Proxy**: Use nginx for HTTPS
3. **User Permissions**: Run as non-root user
4. **Environment Variables**: Keep sensitive data in .env
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

## Support

For issues and questions:
1. Check the logs: `pm2 logs verium-explorer`
2. Verify Verium node connection
3. Check system resources
4. Review the configuration in .env file
