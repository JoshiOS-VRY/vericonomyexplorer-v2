# Verium RPC Explorer - Docker Deployment Guide

## Quick Start

### 1. Build and Run with Docker Compose

```bash
# Clone and navigate to the repository
cd btc-rpc-explorer

# Create environment file
cp env.example .env

# Edit the .env file with your Verium node configuration
nano .env

# Build and start the explorer
docker-compose up -d --build
```

### 2. Environment Configuration

Create a `.env` file with the following variables:

```bash
# Verium Node Connection
BTCEXP_BITCOIND_URI=bitcoin://rpcuser:rpcpassword@127.0.0.1:36988/

# Address API (optional)
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

### 3. Manual Docker Build

```bash
# Build the image
docker build -t verium-rpc-explorer:latest .

# Run the container
docker run -d \
  --name verium-explorer \
  -p 3003:3003 \
  -e BTCEXP_BITCOIND_URI="bitcoin://rpcuser:rpcpassword@127.0.0.1:36988/" \
  -e BTCEXP_COIN=VRM \
  -e BTCEXP_DISPLAY_CURRENCY=vrm \
  -v verium-cache:/app/cache \
  verium-rpc-explorer:latest
```

## Production Deployment

### 1. Using Docker Compose (Recommended)

The included `docker-compose.yml` is production-ready with:

- Health checks
- Automatic restarts
- Volume persistence
- Security best practices
- Non-root user execution

### 2. Environment Variables

| Variable                  | Description            | Default                                          |
| ------------------------- | ---------------------- | ------------------------------------------------ |
| `BTCEXP_COIN`             | Coin type              | `VRM`                                            |
| `BTCEXP_DISPLAY_CURRENCY` | Default currency       | `vrm`                                            |
| `BTCEXP_BITCOIND_URI`     | Verium node connection | `bitcoin://rpcuser:rpcpassword@127.0.0.1:36988/` |
| `BTCEXP_UI_THEME`         | UI theme               | `dark`                                           |
| `BTCEXP_SLOW_DEVICE_MODE` | Performance mode       | `false`                                          |
| `BTCEXP_PRIVACY_MODE`     | Disable external APIs  | `false`                                          |
| `BTCEXP_NO_RATES`         | Disable exchange rates | `false`                                          |

### 3. Security Considerations

- **Basic Authentication**: Set `BTCEXP_BASIC_AUTH_PASSWORD` for basic auth
- **Network Security**: Use reverse proxy (nginx) for HTTPS
- **RPC Security**: Ensure Verium node RPC is properly secured
- **Firewall**: Only expose necessary ports

### 4. Reverse Proxy Configuration (Nginx)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3003;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 5. Monitoring and Logs

```bash
# View logs
docker-compose logs -f verium-explorer

# Check container health
docker-compose ps

# View resource usage
docker stats verium-rpc-explorer
```

## Troubleshooting

### Common Issues

1. **Connection to Verium Node**
   - Verify `BTCEXP_BITCOIND_URI` is correct
   - Check if Verium node is running and accessible
   - Ensure RPC credentials are correct

2. **Performance Issues**
   - Enable `BTCEXP_SLOW_DEVICE_MODE=true` for low-resource systems
   - Adjust `BTCEXP_RPC_CONCURRENCY` based on your system

3. **Cache Issues**
   - Clear cache: `docker-compose down && docker volume rm verium-cache`

### Health Checks

The container includes health checks that verify the explorer is responding:

- Check interval: 30 seconds
- Timeout: 10 seconds
- Retries: 3
- Start period: 40 seconds

## Updates

```bash
# Pull latest changes
git pull

# Rebuild and restart
docker-compose down
docker-compose up -d --build
```

## Backup

The cache volume contains important data:

```bash
# Backup cache
docker run --rm -v verium-cache:/data -v $(pwd):/backup alpine tar czf /backup/verium-cache-backup.tar.gz -C /data .
```
