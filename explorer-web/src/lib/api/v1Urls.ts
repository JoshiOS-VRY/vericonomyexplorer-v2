/** Client-safe v1 URL helpers (no Node.js imports). */

export function getClientV1Url(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (normalized.startsWith("/v1/")) return normalized;
  return `/v1${normalized}`;
}

export function getTipStreamUrl(chainId: string): string {
  return getClientV1Url(`/${chainId}/tip/stream`);
}
