import { Pool } from 'undici';
export function createRpcPool(credentials) {
    const origin = `http://${credentials.host}:${credentials.port}`;
    const pool = new Pool(origin, {
        connections: 10,
        pipelining: 1,
        keepAliveTimeout: 30_000,
        keepAliveMaxTimeout: 60_000,
    });
    const auth = credentials.username || credentials.password
        ? `Basic ${Buffer.from(`${credentials.username ?? ''}:${credentials.password ?? ''}`).toString('base64')}`
        : null;
    let requestId = 0;
    async function call(method, params = [], timeoutMs = credentials.timeout ?? 8_000) {
        requestId += 1;
        const body = JSON.stringify({
            jsonrpc: '1.0',
            id: `explorer-api-${requestId}`,
            method,
            params,
        });
        const headers = {
            'content-type': 'application/json',
            accept: 'application/json',
        };
        if (auth) {
            headers.authorization = auth;
        }
        const response = await pool.request({
            path: '/',
            method: 'POST',
            headers,
            body,
            bodyTimeout: timeoutMs,
            headersTimeout: timeoutMs,
        });
        const text = await response.body.text();
        let parsed;
        try {
            parsed = JSON.parse(text);
        }
        catch {
            throw new Error(`RPC ${method} returned invalid JSON: HTTP ${response.statusCode}`);
        }
        if (response.statusCode < 200 || response.statusCode >= 300) {
            const message = parsed.error?.message ?? text;
            throw new Error(`RPC ${method} failed: HTTP ${response.statusCode}: ${message}`);
        }
        if (parsed.error) {
            throw new Error(`RPC ${method} failed: ${parsed.error.message ?? JSON.stringify(parsed.error)}`);
        }
        return parsed.result;
    }
    return {
        call,
        close: () => pool.close(),
    };
}
