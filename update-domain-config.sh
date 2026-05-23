#!/bin/bash
# Update Explorer Configuration for Domain
# Domain: verium-explorer.vericonomy.com

set -e

DOMAIN="verium-explorer.vericonomy.com"
ENV_FILE="/home/jhadmin/btc-rpc-explorer/.env"

echo "=== Updating Explorer Configuration ==="
echo "Domain: $DOMAIN"
echo ""

# Check if .env exists, if not create from env.example
if [ ! -f "$ENV_FILE" ]; then
    if [ -f "/home/jhadmin/btc-rpc-explorer/env.example" ]; then
        cp /home/jhadmin/btc-rpc-explorer/env.example "$ENV_FILE"
        echo "✅ Created .env from env.example"
    else
        echo "⚠️  .env file not found and env.example not available"
        echo "Creating basic .env file..."
        touch "$ENV_FILE"
    fi
fi

# Update or add configuration
echo "Updating .env file..."

# Function to set or update env variable
set_env_var() {
    local key=$1
    local value=$2
    
    if grep -q "^${key}=" "$ENV_FILE"; then
        # Update existing
        sed -i "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
        echo "  Updated: $key=$value"
    else
        # Add new
        echo "${key}=${value}" >> "$ENV_FILE"
        echo "  Added: $key=$value"
    fi
}

# Set domain-related configuration
set_env_var "BTCEXP_BASEURL" "/"
set_env_var "BTCEXP_HOST" "127.0.0.1"
set_env_var "BTCEXP_PORT" "3003"
set_env_var "BTCEXP_SECURE_SITE" "true"

echo ""
echo "✅ Configuration updated"
echo ""
echo "Current configuration:"
echo "  Base URL: /"
echo "  Host: 127.0.0.1 (localhost, nginx will handle external access)"
echo "  Port: 3003"
echo "  Secure Site: true (HTTPS enabled)"
echo ""
echo "Note: Restart the explorer for changes to take effect"

# Add admin authentication if not already set
if ! grep -q "BTCEXP_ADMIN_USERNAME" "$ENV_FILE"; then
    echo ""
    echo "Admin Authentication Setup:"
    echo "To enable admin dashboard access from anywhere, add these to your .env file:"
    echo "  BTCEXP_ADMIN_USERNAME=your_username"
    echo "  BTCEXP_ADMIN_PASSWORD=your_secure_password"
    echo ""
    echo "Would you like to set admin credentials now? (y/n)"
    read -r response
    if [ "$response" = "y" ] || [ "$response" = "Y" ]; then
        echo "Enter admin username:"
        read -r admin_user
        echo "Enter admin password:"
        read -rs admin_pass
        echo ""
        echo "BTCEXP_ADMIN_USERNAME=$admin_user" >> "$ENV_FILE"
        echo "BTCEXP_ADMIN_PASSWORD=$admin_pass" >> "$ENV_FILE"
        echo "✅ Admin credentials added to .env"
    fi
fi
