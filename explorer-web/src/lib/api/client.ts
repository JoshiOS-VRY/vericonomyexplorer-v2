import type { ChainSummary } from "@/lib/api/types";
import { getClientV1Url, getTipStreamUrl } from "@/lib/api/v1Urls";
export class ClientApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ClientApiError";
    this.status = status;
  }
}

export function getClientApiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return getClientV1Url(normalized);
}

export async function clientApiFetch<T>(path: string): Promise<T> {
  const response = await fetch(getClientV1Url(path), {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    let message = `Request failed: ${response.status}`;
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      /* ignore */
    }
    throw new ClientApiError(message, response.status);
  }

  return response.json() as Promise<T>;
}

export async function fetchBlockHeight(chainId = "vrm"): Promise<number> {
  const response = await fetch(getClientV1Url(`/${chainId}/tip/height`), {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new ClientApiError(`Request failed: ${response.status}`, response.status);
  }

  const height = Number((await response.text()).trim());
  if (!Number.isFinite(height)) {
    throw new ClientApiError("Invalid block height response", response.status);
  }

  return height;
}

export async function fetchChainSummary(chainId: string): Promise<ChainSummary> {
  return clientApiFetch<ChainSummary>(`/${chainId}/summary`);
}

export { getTipStreamUrl };
