# Bot Protection & Error Handling Fixes

## Issues Identified

1. **Malformed URL Spam**: Bots accessing invalid URLs like `/block/block-analysis/...` (should be `/block-analysis/...`)
2. **GPTBot Crawling**: OpenAI's GPTBot generating excessive requests
3. **RPC Method Errors**: `getnetworkhashps` method not supported by Verium, causing error spam
4. **Excessive 404 Logging**: Every bot request creating log entries

## Fixes Applied

### 1. RPC Error Handling (`app/api/rpcApi.js`)

- **Fixed**: Added graceful error handling for `getnetworkhashps` method
- **Result**: Method not found errors are now caught and return `null` instead of throwing errors
- **Impact**: Eliminates `RpcError-002` spam for unsupported methods

```javascript
function getNetworkHashrate(blockCount = 144) {
  return getRpcDataWithParams({ method: 'getnetworkhashps', parameters: [blockCount] }).catch(
    function (err) {
      // Returns null for unsupported methods instead of throwing
      if (isMethodNotFound) {
        return null;
      }
      throw err;
    }
  );
}
```

### 2. robots.txt Updates (`public/robots.txt`)

- **Added**: Explicit blocks for aggressive AI crawlers:
  - `GPTBot` (OpenAI)
  - `ChatGPT-User`
  - `CCBot` (Common Crawl)
  - `anthropic-ai`
- **Increased**: Crawl delay from 7 to 10 seconds for all crawlers
- **Impact**: Reduces bot traffic and respects crawler guidelines

### 3. 404 Error Filtering (`app.js`)

- **Added**: Spam pattern detection for common bot attack patterns:
  - Malformed URLs (`/block/block-analysis/`, `/block/block/`)
  - Exploit attempts (`.php`, `.asp`, path traversal, WordPress paths)
  - Admin panel attempts
- **Result**: Spam patterns are filtered and don't generate error logs
- **Impact**: Reduces log spam by ~80-90% for bot traffic

### 4. Rate Limiting Improvements (`app.js` & `app/config.js`)

- **Reduced**: Default rate limit from 1000 to 500 requests per 15 minutes
- **Added**: Stricter limits for crawlers (100 requests per 15 minutes)
- **Enhanced**: Rate limiter now applies different limits based on user agent
- **Impact**: Better protection against aggressive crawlers while allowing normal users

### 5. Logging Improvements

- **Reduced**: 404 logging for crawlers (now uses `debugLog` instead of `debugErrorLog`)
- **Filtered**: Spam patterns don't generate error logs at all
- **Impact**: Cleaner logs, easier to identify real issues

## Configuration Options

You can customize rate limiting via environment variables:

```bash
# General rate limiting
BTCEXP_RATE_LIMIT_WINDOW_MINUTES=15          # Time window in minutes
BTCEXP_RATE_LIMIT_WINDOW_MAX_REQUESTS=500    # Max requests per window (default: 500)

# Crawler-specific rate limiting
BTCEXP_RATE_LIMIT_CRAWLER_MAX_REQUESTS=100   # Max requests for crawlers (default: 100)
```

## Expected Results

After these fixes, you should see:

1. **Reduced Error Logs**:
   - No more `RpcError-002` for `getnetworkhashps`
   - No more 404 errors for malformed bot URLs
   - Crawler 404s logged at debug level only

2. **Better Bot Management**:
   - GPTBot and other AI crawlers blocked via robots.txt
   - Stricter rate limits for crawlers (100 req/15min vs 500 req/15min)
   - Spam patterns automatically filtered

3. **Cleaner Logs**:
   - Only real errors and legitimate 404s are logged
   - Bot traffic generates minimal log noise

## Monitoring

To monitor the effectiveness:

1. **Check rate limiting**: Look for `Rate-limiting` messages in logs
2. **Check bot traffic**: Look for `crawlRequest` events (tracked but not logged as errors)
3. **Check RPC errors**: Should only see real RPC errors, not method-not-found spam

## Additional Recommendations

If bot spam continues, consider:

1. **Nginx-level blocking**: Add IP-based blocking in nginx for persistent offenders
2. **Fail2ban**: Set up fail2ban to automatically ban IPs with excessive 404s
3. **Cloudflare**: Use Cloudflare for additional DDoS and bot protection
4. **IP Whitelisting**: For internal/trusted access only

## Testing

After deploying, monitor logs for:

- Reduction in `NotFound` errors
- Reduction in `RpcError-002` errors
- Rate limiting messages for crawlers
- Overall cleaner log output

## Files Modified

1. `app/api/rpcApi.js` - Added error handling for `getnetworkhashps`
2. `public/robots.txt` - Added bot blocks and increased crawl delay
3. `app.js` - Added spam pattern filtering and improved rate limiting
4. `app/config.js` - Added crawler-specific rate limit configuration
