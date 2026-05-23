# Verium RPC Explorer - Git Repository Deployment

## Repository Information
- **Git URL**: `http://192.168.1.186:3000/jayhines91/btc-rpc-explorer.git`
- **Branch**: `verium-explorer`
- **Port**: `3003` (updated from 3002)
- **Container**: `verium-rpc-explorer`

## Quick Deployment

### Option 1: Automated Git Deployment (Recommended)

```bash
# Use the automated deployment script
./deploy-from-git.sh deploy
```

This script will:
1. Clone/update from your Git repository
2. Create environment configuration
3. Build and deploy the Docker container
4. Start the Verium explorer on port 3003

### Option 2: Manual Git Deployment

```bash
# 1. Clone the repository
git clone -b verium-explorer http://192.168.1.186:3000/jayhines91/btc-rpc-explorer.git
cd btc-rpc-explorer

# 2. Create environment file
cp env.example .env
# Edit .env with your Verium node configuration

# 3. Deploy with Docker Compose
docker-compose up -d --build
```

## Environment Configuration

Create a `.env` file with your Verium node settings:

```bash
# Verium Node Connection (Update with your actual credentials)
BTCEXP_BITCOIND_URI=bitcoin://rpcuser:rpcpassword@127.0.0.1:36988/

# Address API Configuration
BTCEXP_ADDRESS_API=electrum
BTCEXP_ELECTRUM_SERVERS=tcp://127.0.0.1:50001

# UI Settings
BTCEXP_UI_THEME=dark
BTCEXP_SLOW_DEVICE_MODE=false

# Security (optional)
# BTCEXP_BASIC_AUTH_PASSWORD=your_secure_password

# Privacy (optional)
# BTCEXP_PRIVACY_MODE=true
# BTCEXP_NO_RATES=true
```

## Deployment Commands

### Using the Git Deployment Script

```bash
# Deploy from Git repository
./deploy-from-git.sh deploy

# Stop the explorer
./deploy-from-git.sh stop

# Restart the explorer
./deploy-from-git.sh restart

# View logs
./deploy-from-git.sh logs

# Check status
./deploy-from-git.sh status

# Update from Git and restart
./deploy-from-git.sh update

# Clean up everything
./deploy-from-git.sh cleanup

# Show help
./deploy-from-git.sh help
```

### Using Docker Compose Directly

```bash
# Start the explorer
docker-compose up -d

# Stop the explorer
docker-compose down

# View logs
docker-compose logs -f

# Rebuild and restart
docker-compose up -d --build
```

## Access the Explorer

Once deployed, access your Verium explorer at:
- **Local**: `http://localhost:3003`
- **Network**: `http://192.168.1.186:3003` (if accessible from network)

## Key Features

✅ **Verium Currency**: All amounts displayed in VRM  
✅ **Port 3003**: Updated from default 3002  
✅ **Git Integration**: Automated deployment from your repository  
✅ **Docker Optimized**: Multi-stage build, security hardening  
✅ **Health Checks**: Container monitoring and auto-restart  
✅ **Volume Persistence**: Cache data preserved between restarts  

## Configuration Files

- **Dockerfile**: Multi-stage build with Verium configuration
- **docker-compose.yml**: Production-ready with port 3003
- **nginx.conf**: Reverse proxy configuration for port 3003
- **deploy-from-git.sh**: Automated Git deployment script

## Troubleshooting

### Check Container Status
```bash
docker-compose ps
```

### View Logs
```bash
docker-compose logs -f verium-explorer
```

### Check Health
```bash
curl http://localhost:3003/
```

### Restart Service
```bash
docker-compose restart
```

## Updates

To update from your Git repository:

```bash
# Using the script
./deploy-from-git.sh update

# Or manually
git pull origin verium-explorer
docker-compose down
docker-compose up -d --build
```

## Production Deployment

For production deployment:

1. **Set up reverse proxy** (nginx) using the provided `nginx.conf`
2. **Configure SSL certificates** for HTTPS
3. **Set up monitoring** and logging
4. **Configure backup** for cache volumes
5. **Set up firewall rules** for port 3003

## Security Considerations

- **Basic Auth**: Set `BTCEXP_BASIC_AUTH_PASSWORD` in `.env`
- **Network Security**: Use reverse proxy for HTTPS
- **RPC Security**: Secure your Verium node RPC connection
- **Firewall**: Only expose necessary ports

## Support

The deployment includes:
- Health checks every 30 seconds
- Automatic restart on failure
- Volume persistence for cache
- Non-root user execution
- Comprehensive logging
