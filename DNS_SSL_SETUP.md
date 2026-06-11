# DNS and SSL Setup Guide

## Domain: verium-explorer.vericonomy.com

## ✅ Completed Steps

1. **Explorer Configuration Updated**
   - Base URL: `/`
   - Host: `127.0.0.1` (localhost)
   - Port: `3003`
   - Secure Site: `true` (HTTPS enabled)

2. **Nginx Configuration Created**
   - File: `nginx-verium-explorer.conf`
   - Configured for domain: `verium-explorer.vericonomy.com`
   - HTTPS redirect enabled
   - SSL security headers configured

3. **SSL Setup Script Created**
   - File: `setup-ssl.sh`
   - Automates Let's Encrypt certificate installation
   - Configures nginx and auto-renewal

## 📋 Next Steps

### Step 1: Verify DNS Propagation

Check if DNS has propagated:

```bash
dig verium-explorer.vericonomy.com +short
# or
nslookup verium-explorer.vericonomy.com
```

The domain should resolve to your VPS IP address.

**Note:** DNS propagation can take 5 minutes to 48 hours. You can check propagation status at:

- https://www.whatsmydns.net/#A/verium-explorer.vericonomy.com

### Step 2: Run SSL Setup

Once DNS has propagated, run the SSL setup script:

```bash
cd /home/jhadmin/btc-rpc-explorer
sudo ./setup-ssl.sh
```

The script will:

1. Install nginx configuration
2. Start nginx
3. Obtain SSL certificate from Let's Encrypt
4. Configure HTTPS redirect
5. Set up automatic certificate renewal

### Step 3: Restart Explorer (if needed)

If you made configuration changes, restart the explorer:

```bash
# If running directly with node
cd /home/jhadmin/btc-rpc-explorer
# Stop current process (Ctrl+C or kill process)
npm start

# If running with PM2
pm2 restart verium-explorer

# If running with Docker
cd /home/jhadmin/btc-rpc-explorer
docker-compose restart verium-explorer
```

### Step 4: Verify Setup

1. **Check HTTPS access:**

   ```
   https://verium-explorer.vericonomy.com
   ```

2. **Verify SSL certificate:**
   - Browser should show a valid SSL certificate
   - No security warnings
   - HTTPS redirect working

3. **Check nginx status:**

   ```bash
   sudo systemctl status nginx
   ```

4. **Check SSL certificate:**
   ```bash
   sudo certbot certificates
   ```

## 🔧 Manual SSL Setup (if script fails)

If the automated script doesn't work, you can set up SSL manually:

### 1. Install nginx configuration

```bash
sudo cp /home/jhadmin/btc-rpc-explorer/nginx-verium-explorer.conf /etc/nginx/sites-available/verium-explorer
sudo ln -s /etc/nginx/sites-available/verium-explorer /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 2. Obtain SSL certificate

```bash
sudo certbot --nginx -d verium-explorer.vericonomy.com
```

Follow the prompts:

- Enter email address
- Agree to terms
- Choose redirect HTTP to HTTPS

### 3. Verify auto-renewal

```bash
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
sudo systemctl status certbot.timer
```

## 🔍 Troubleshooting

### DNS not resolving

- Wait longer for propagation
- Check DNS records at your domain registrar
- Verify A record points to correct IP

### SSL certificate fails

- Ensure DNS is fully propagated
- Check that port 80 is open and accessible
- Verify nginx is running: `sudo systemctl status nginx`
- Check nginx logs: `sudo tail -f /var/log/nginx/error.log`

### 502 Bad Gateway

- Verify explorer is running on port 3003: `netstat -tlnp | grep 3003`
- Check nginx proxy settings
- Verify firewall allows port 443

### Certificate renewal fails

- Check certbot logs: `sudo journalctl -u certbot.timer`
- Manually renew: `sudo certbot renew --dry-run`
- Verify nginx is running during renewal

## 📝 Configuration Files

- **Nginx config:** `/etc/nginx/sites-available/verium-explorer`
- **SSL certificates:** `/etc/letsencrypt/live/verium-explorer.vericonomy.com/`
- **Nginx logs:** `/var/log/nginx/verium-explorer-*.log`
- **Explorer config:** `/home/jhadmin/btc-rpc-explorer/.env`

## 🔐 Security Notes

- SSL certificate auto-renews every 90 days
- HTTPS redirect is enforced
- Security headers are configured
- Keep nginx and certbot updated

## 📞 Support

If you encounter issues:

1. Check nginx error logs: `sudo tail -f /var/log/nginx/error.log`
2. Check explorer logs
3. Verify DNS propagation
4. Test SSL certificate: `openssl s_client -connect verium-explorer.vericonomy.com:443`
