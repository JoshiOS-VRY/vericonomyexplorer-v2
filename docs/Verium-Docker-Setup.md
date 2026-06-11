# Verium RPC Explorer Docker Setup

This guide explains how to run the Verium RPC Explorer using Docker.

## Prerequisites

- Docker and Docker Compose installed
- Running Verium node with RPC enabled
- Verium node configured with `server=1` and `txindex=1`

## Quick Start

### 1. Clone and Configure

```bash
git clone <this-repository>
cd btc-rpc-explorer
cp env.example .env
```

### 2. Edit Environment Configuration

Edit the `.env` file with your Verium node details:

```bash
# Verium Node RPC Configuration
BTCEXP_BITCOIND_URI=bitcoin://your_rpc_user:your_rpc_password@127.0.0.1:36988/

# Optional: Address API for enhanced functionality
BTCEXP_ADDRESS_API=electrum
BTCEXP_ELECTRUM_SERVERS=tcp://your_electrum_server:50001
```

### 3. Build and Run

```bash
# Build the Docker image
docker-compose build

# Run the explorer
docker-compose up -d
```

The explorer will be available at `http://localhost:3002`

## Verium Node Configuration

Ensure your Verium node (`verium.conf`) is configured with:

```ini
# Enable RPC server
server=1

# Enable transaction index for full functionality
txindex=1

# RPC credentials
rpcuser=your_rpc_user
rpcpassword=your_rpc_password

# Network settings
rpcallowip=127.0.0.1
rpcbind=127.0.0.1

# Verium uses port 36988 by default
port=36988
rpcport=36988
```

## Environment Variables

### Required Variables

- `BTCEXP_BITCOIND_URI`: Connection string to your Verium node
- `BTCEXP_COIN`: Set to `VRM` (automatically set in Docker)

### Optional Variables

- `BTCEXP_ADDRESS_API`: Address lookup API (`electrum`, `blockchain.com`, etc.)
- `BTCEXP_ELECTRUM_SERVERS`: Electrum servers for address lookups
- `BTCEXP_UI_THEME`: UI theme (`dark` or `light`)
- `BTCEXP_SLOW_DEVICE_MODE`: Set to `true` for resource-constrained environments
- `BTCEXP_PRIVACY_MODE`: Set to `true` to disable external API calls
- `BTCEXP_NO_RATES`: Set to `true` to disable exchange rate fetching

## Docker Commands

### Build Image

```bash
docker-compose build
```

### Run Container

```bash
docker-compose up -d
```

### View Logs

```bash
docker-compose logs -f
```

### Stop Container

```bash
docker-compose down
```

### Update and Rebuild

```bash
git pull
docker-compose down
docker-compose build
docker-compose up -d
```

## Troubleshooting

### Connection Issues

1. **Verify Verium Node**: Ensure your Verium node is running and accessible
2. **Check RPC Settings**: Verify RPC credentials and port (36988)
3. **Network Access**: Ensure the container can reach your Verium node
4. **Firewall**: Check if port 36988 is accessible

### Container Issues

1. **View Logs**: `docker-compose logs -f`
2. **Check Environment**: Verify `.env` file configuration
3. **Rebuild**: Try rebuilding the image with `docker-compose build --no-cache`

### Performance Issues

1. **Enable Slow Device Mode**: Set `BTCEXP_SLOW_DEVICE_MODE=true`
2. **Disable External APIs**: Set `BTCEXP_PRIVACY_MODE=true`
3. **Resource Limits**: Add memory/CPU limits to docker-compose.yml

## Advanced Configuration

### Custom Ports

To run on a different port, modify `docker-compose.yml`:

```yaml
ports:
  - '8080:3002' # Maps host port 8080 to container port 3002
```

### Volume Mounts

To persist cache data:

```yaml
volumes:
  - ./cache:/workspace/cache
```

### Resource Limits

```yaml
deploy:
  resources:
    limits:
      memory: 512M
      cpus: '0.5'
```

## Security Considerations

1. **RPC Credentials**: Use strong RPC passwords
2. **Network Access**: Limit RPC access to trusted IPs
3. **Firewall**: Restrict access to port 3002
4. **HTTPS**: Use a reverse proxy with SSL for production

## Production Deployment

For production deployment:

1. Use a reverse proxy (nginx, Apache)
2. Enable SSL/TLS
3. Set up monitoring and logging
4. Use Docker secrets for sensitive data
5. Configure proper resource limits
6. Set up automated backups

## Support

For issues:

1. Check Verium node logs
2. Check container logs: `docker-compose logs`
3. Verify network connectivity
4. Review environment configuration
