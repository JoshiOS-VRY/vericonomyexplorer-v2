'use strict';

const http = require('http');

function createRpcClient(credentials) {
  if (!credentials || !credentials.host || !credentials.port) {
    throw new Error('Cannot create RPC client: missing host or port');
  }

  const auth =
    credentials.username || credentials.password
      ? `Basic ${Buffer.from(`${credentials.username || ''}:${credentials.password || ''}`).toString('base64')}`
      : null;

  let requestId = 0;

  async function call(method, params = []) {
    requestId++;
    const body = JSON.stringify({
      jsonrpc: '1.0',
      id: `vericonomy-indexer-${requestId}`,
      method,
      params,
    });

    return parseSingleResponse(await postJson(body), method);
  }

  async function batch(requests) {
    if (!Array.isArray(requests) || requests.length === 0) {
      return [];
    }

    requestId++;
    const body = JSON.stringify(
      requests.map((entry, index) => ({
        jsonrpc: '1.0',
        id: `vericonomy-indexer-${requestId}-${index}`,
        method: entry.method,
        params: entry.params || [],
      }))
    );

    const response = await postJson(body);
    if (!Array.isArray(response.parsed)) {
      throw new Error('RPC batch returned invalid JSON');
    }

    const byId = Object.fromEntries(response.parsed.map((entry) => [String(entry.id), entry]));

    return requests.map((entry, index) => {
      const id = `vericonomy-indexer-${requestId}-${index}`;
      const item = byId[id];
      if (!item) {
        throw new Error(`RPC batch missing response for ${entry.method}`);
      }
      if (item.error) {
        throw new Error(`RPC ${entry.method} failed: ${JSON.stringify(item.error)}`);
      }
      return item.result;
    });
  }

  async function postJson(body) {
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
    };

    if (auth) {
      headers.Authorization = auth;
    }

    const response = await httpRequest(
      {
        host: credentials.host,
        port: credentials.port,
        method: 'POST',
        path: credentials.path || '/',
        timeout: credentials.timeout || 30000,
        headers,
      },
      body
    );

    let parsed;
    try {
      parsed = JSON.parse(response.body);
    } catch (err) {
      throw new Error(`RPC returned invalid JSON: HTTP ${response.statusCode}`);
    }

    if (response.statusCode < 200 || response.statusCode >= 300) {
      const message = parsed && parsed.error ? JSON.stringify(parsed.error) : response.body;
      throw new Error(`RPC failed: HTTP ${response.statusCode}: ${message}`);
    }

    return { parsed, statusCode: response.statusCode, body: response.body };
  }

  function parseSingleResponse(response, method) {
    const parsed = response.parsed;
    if (parsed.error) {
      throw new Error(`RPC ${method} failed: ${JSON.stringify(parsed.error)}`);
    }
    return parsed.result;
  }

  return { call, batch };
}

function httpRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      const chunks = [];

      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          body: Buffer.concat(chunks).toString('utf8'),
        });
      });
    });

    req.on('timeout', () => {
      req.destroy(new Error(`RPC request timed out after ${options.timeout}ms`));
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

module.exports = {
  createRpcClient,
};
