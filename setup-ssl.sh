#!/bin/bash
# SSL Setup Script for Verium Explorer
# Domain: verium-explorer.vericonomy.com

set -e

DOMAIN="verium-explorer.vericonomy.com"
NGINX_CONF="/etc/nginx/sites-available/verium-explorer"
NGINX_ENABLED="/etc/nginx/sites-enabled/verium-explorer"

echo "=== Verium Explorer SSL Setup ==="
echo "Domain: $DOMAIN"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "Please run as root (use sudo)"
    exit 1
fi

# Step 1: Copy nginx configuration
echo "Step 1: Installing nginx configuration..."
if [ -f "/home/jhadmin/btc-rpc-explorer/nginx-verium-explorer.conf" ]; then
    cp /home/jhadmin/btc-rpc-explorer/nginx-verium-explorer.conf "$NGINX_CONF"
    echo "✅ Nginx config copied to $NGINX_CONF"
else
    echo "❌ Error: nginx-verium-explorer.conf not found"
    exit 1
fi

# Step 2: Create temporary HTTP-only config for certbot
echo ""
echo "Step 2: Creating temporary HTTP config for certificate generation..."
cat > "$NGINX_CONF" << NGINX_EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;
    
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    location / {
        proxy_pass http://127.0.0.1:3003;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }
}
NGINX_EOF

# Step 3: Enable site
echo ""
echo "Step 3: Enabling nginx site..."
ln -sf "$NGINX_CONF" "$NGINX_ENABLED"
echo "✅ Site enabled"

# Step 4: Test nginx configuration
echo ""
echo "Step 4: Testing nginx configuration..."
nginx -t
if [ $? -ne 0 ]; then
    echo "❌ Nginx configuration test failed"
    exit 1
fi
echo "✅ Nginx configuration is valid"

# Step 5: Start/restart nginx
echo ""
echo "Step 5: Starting nginx..."
systemctl start nginx
systemctl enable nginx
echo "✅ Nginx started and enabled"

# Step 6: Obtain SSL certificate
echo ""
echo "Step 6: Obtaining SSL certificate from Let's Encrypt..."
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email admin@vericonomy.com --redirect
if [ $? -ne 0 ]; then
    echo "⚠️  Certbot failed. You may need to run manually:"
    echo "   sudo certbot --nginx -d $DOMAIN"
    exit 1
fi
echo "✅ SSL certificate obtained"

# Step 7: Restore full nginx config
echo ""
echo "Step 7: Restoring full nginx configuration..."
cp /home/jhadmin/btc-rpc-explorer/nginx-verium-explorer.conf "$NGINX_CONF"
nginx -t
if [ $? -ne 0 ]; then
    echo "❌ Nginx configuration test failed after update"
    exit 1
fi
systemctl reload nginx
echo "✅ Full nginx configuration restored"

# Step 8: Set up auto-renewal
echo ""
echo "Step 8: Setting up certificate auto-renewal..."
systemctl enable certbot.timer
systemctl start certbot.timer
echo "✅ Auto-renewal configured"

echo ""
echo "=== Setup Complete ==="
echo "✅ SSL certificate installed for $DOMAIN"
echo "✅ Nginx configured and running"
echo "✅ HTTPS redirect enabled"
echo ""
echo "Your explorer should now be accessible at:"
echo "  https://$DOMAIN"
echo ""
echo "Note: If DNS hasn't propagated yet, you may need to wait a few minutes."
