#!/bin/bash
# Setup Admin Authentication for Verium Explorer

set -e

ENV_FILE="/home/jhadmin/btc-rpc-explorer/.env"

echo "=== Admin Authentication Setup ==="
echo ""

# Check if .env exists
if [ ! -f "$ENV_FILE" ]; then
    if [ -f "/home/jhadmin/btc-rpc-explorer/env.example" ]; then
        cp /home/jhadmin/btc-rpc-explorer/env.example "$ENV_FILE"
        echo "✅ Created .env from env.example"
    else
        touch "$ENV_FILE"
        echo "✅ Created new .env file"
    fi
fi

# Check if credentials already exist
if grep -q "BTCEXP_ADMIN_USERNAME" "$ENV_FILE" && grep -q "BTCEXP_ADMIN_PASSWORD" "$ENV_FILE"; then
    echo "⚠️  Admin credentials already configured in .env"
    echo ""
    echo "Current username: $(grep '^BTCEXP_ADMIN_USERNAME=' "$ENV_FILE" | cut -d'=' -f2)"
    echo ""
    read -p "Do you want to update them? (y/n): " update
    if [ "$update" != "y" ] && [ "$update" != "Y" ]; then
        echo "Keeping existing credentials."
        exit 0
    fi
    
    # Remove old credentials
    sed -i '/^BTCEXP_ADMIN_USERNAME=/d' "$ENV_FILE"
    sed -i '/^BTCEXP_ADMIN_PASSWORD=/d' "$ENV_FILE"
    sed -i '/^BTCEXP_ADMIN_USER=/d' "$ENV_FILE"
    sed -i '/^BTCEXP_ADMIN_PASS=/d' "$ENV_FILE"
fi

echo "Enter admin username:"
read -r admin_user

echo "Enter admin password (input will be hidden):"
read -rs admin_pass
echo ""

echo "Confirm password:"
read -rs admin_pass_confirm
echo ""

if [ "$admin_pass" != "$admin_pass_confirm" ]; then
    echo "❌ Passwords do not match!"
    exit 1
fi

# Add credentials to .env
echo "" >> "$ENV_FILE"
echo "# Admin Dashboard Authentication" >> "$ENV_FILE"
echo "BTCEXP_ADMIN_USERNAME=$admin_user" >> "$ENV_FILE"
echo "BTCEXP_ADMIN_PASSWORD=$admin_pass" >> "$ENV_FILE"

echo ""
echo "✅ Admin credentials configured!"
echo ""
echo "Username: $admin_user"
echo "Password: [hidden]"
echo ""
echo "The admin dashboard is now protected with username/password authentication."
echo "You can access it from anywhere at: /admin/dashboard"
echo ""
echo "⚠️  IMPORTANT: Restart the explorer for changes to take effect!"
