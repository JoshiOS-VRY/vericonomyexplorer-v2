import { apiFetch, getApiBaseUrl } from '@/lib/api/config';

export async function getBlockTip(): Promise<{ height: number; hash: string }> {
  return apiFetch('/api/blocks/tip');
}

export async function getBlockByHashOrHeight(
  hashOrHeight: string
): Promise<Record<string, unknown>> {
  return apiFetch(`/api/block/${encodeURIComponent(hashOrHeight)}`);
}

export async function getTx(txid: string): Promise<Record<string, unknown>> {
  return apiFetch(`/api/tx/${encodeURIComponent(txid)}`);
}

export async function getLegacyAddress(address: string): Promise<Record<string, unknown>> {
  return apiFetch(`/api/address/${encodeURIComponent(address)}`);
}

export async function getMempoolSummary(): Promise<Record<string, unknown>> {
  return apiFetch('/api/mempool/summary');
}

export async function getMiningHashrate(): Promise<Record<string, unknown>> {
  return apiFetch('/api/mining/hashrate');
}

export async function getNextBlock(): Promise<Record<string, unknown>> {
  return apiFetch('/api/mining/next-block');
}

export async function getNextHalving(): Promise<Record<string, unknown>> {
  return apiFetch('/api/blockchain/next-halving');
}

export async function getUtxoSet(): Promise<Record<string, unknown>> {
  return apiFetch('/api/blockchain/utxo-set');
}

export async function getApiVersion(): Promise<string> {
  const response = await fetch(`${getApiBaseUrl()}/api/version`, {
    cache: 'no-store',
  });
  return response.text();
}

export async function getInternalApi<T>(path: string): Promise<T> {
  return apiFetch<T>(`/internal-api${path.startsWith('/') ? path : `/${path}`}`);
}

export async function proxyRpc(method: string, params: unknown[] = []): Promise<unknown> {
  const response = await fetch(`${getApiBaseUrl()}/rpc-terminal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cmd: method, params }),
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`RPC request failed: ${response.status}`);
  }
  return response.json();
}
