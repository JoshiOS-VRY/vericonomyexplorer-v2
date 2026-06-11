# Admin Dashboard Authentication Setup

The admin dashboard is protected with username/password authentication, allowing secure access from anywhere.

## Quick Setup

Run the interactive setup script:

```bash
cd /home/jhadmin/btc-rpc-explorer
./setup-admin-auth.sh
```

This will prompt you for:

- Admin username
- Admin password (input is hidden)
- Password confirmation

## Manual Setup

Add these lines to your `.env` file:

```bash
BTCEXP_ADMIN_USERNAME=your_username
BTCEXP_ADMIN_PASSWORD=your_secure_password
```

## How It Works

1. **Authentication Method**: HTTP Basic Authentication
2. **Access**: Available from any IP address (once credentials are set)
3. **Fallback**: If credentials are not set, only localhost access is allowed
4. **UI**: Admin dashboard link is hidden from the public UI

## Accessing the Admin Dashboard

Once credentials are configured:

1. Navigate to: `https://verium-explorer.vericonomy.com/admin/dashboard`
2. Browser will prompt for username and password
3. Enter your credentials
4. Access granted!

## Admin Routes Protected

All `/admin/*` routes are protected:

- `/admin/dashboard` - Main admin dashboard
- `/admin/os-stats` - OS statistics
- `/admin/app-stats` - Application statistics
- `/admin/perf-log` - Performance logs
- `/admin/database-status` - Database sync status

## Security Notes

- **Password Storage**: Passwords are stored in plain text in `.env` file
- **File Permissions**: Ensure `.env` file has restricted permissions:
  ```bash
  chmod 600 .env
  ```
- **HTTPS**: Always use HTTPS when accessing admin dashboard remotely
- **Strong Passwords**: Use a strong, unique password

## Changing Credentials

To change your admin credentials:

1. Edit `.env` file:

   ```bash
   nano .env
   ```

2. Update these lines:

   ```
   BTCEXP_ADMIN_USERNAME=new_username
   BTCEXP_ADMIN_PASSWORD=new_password
   ```

3. Restart the explorer

Or run the setup script again:

```bash
./setup-admin-auth.sh
```

## Troubleshooting

### Can't access admin dashboard

1. **Check credentials are set:**

   ```bash
   grep BTCEXP_ADMIN .env
   ```

2. **Verify explorer is restarted** after setting credentials

3. **Check browser console** for authentication errors

4. **Try incognito/private mode** to clear cached credentials

### Browser keeps asking for credentials

- Clear browser cache and cookies
- Try a different browser
- Verify username/password are correct in `.env`

### 403 Forbidden error

- Credentials may not be configured
- Check `.env` file has correct format (no quotes around values)
- Restart explorer after changes

## Environment Variables

| Variable                | Description    | Required                |
| ----------------------- | -------------- | ----------------------- |
| `BTCEXP_ADMIN_USERNAME` | Admin username | Yes (for remote access) |
| `BTCEXP_ADMIN_PASSWORD` | Admin password | Yes (for remote access) |

**Alternative variable names** (also supported):

- `BTCEXP_ADMIN_USER` (instead of `BTCEXP_ADMIN_USERNAME`)
- `BTCEXP_ADMIN_PASS` (instead of `BTCEXP_ADMIN_PASSWORD`)

## Example .env Configuration

```bash
# Admin Dashboard Authentication
BTCEXP_ADMIN_USERNAME=admin
BTCEXP_ADMIN_PASSWORD=your_secure_password_here
```

## Notes

- The admin link is hidden from the UI for security
- You must manually navigate to `/admin/dashboard`
- Authentication uses HTTP Basic Auth (standard browser prompt)
- Credentials are checked on every request to admin routes
- No session cookies are used - browser handles authentication
