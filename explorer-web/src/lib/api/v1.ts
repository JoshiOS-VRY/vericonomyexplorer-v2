import { loadRootEnv } from "@/lib/env";

export type { getClientV1Url, getTipStreamUrl } from "@/lib/api/v1Urls";

export interface V1FetchOptions {
  revalidate?: number | false;
  cache?: RequestCache;
}

export class V1FetchError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "V1FetchError";
    this.status = status;
  }
}

export function getFastApiBaseUrl(): string {
  loadRootEnv();
  const explicit =
    process.env.EXPLORER_FAST_API_URL ?? process.env.NEXT_PUBLIC_EXPLORER_FAST_API_URL;
  if (explicit) return explicit.replace(/\/$/, "");

  const host = process.env.VCEXP_FAST_API_HOST ?? "127.0.0.1";
  const port = process.env.VCEXP_FAST_API_PORT ?? "3003";
  return `http://${host}:${port}`.replace(/\/$/, "");
}

export async function v1Fetch<T>(path: string, options: V1FetchOptions = {}): Promise<T> {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const v1Path = normalized.startsWith("/v1/") ? normalized : `/v1${normalized}`;
  const url = `${getFastApiBaseUrl()}${v1Path}`;
  const init: RequestInit & { next?: { revalidate?: number | false } } = {
    headers: { Accept: "application/json" },
    cache: options.cache ?? "no-store",
  };

  if (options.revalidate !== undefined) {
    init.next = { revalidate: options.revalidate };
  }

  const response = await fetch(url, init);
  if (!response.ok) {
    let message = `Request failed: ${response.status}`;
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      /* ignore */
    }
    throw new V1FetchError(message, response.status);
  }

  return response.json() as Promise<T>;
}

export async function v1FetchText(path: string, options: V1FetchOptions = {}): Promise<string> {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const v1Path = normalized.startsWith("/v1/") ? normalized : `/v1${normalized}`;
  const url = `${getFastApiBaseUrl()}${v1Path}`;
  const init: RequestInit & { next?: { revalidate?: number | false } } = {
    cache: options.cache ?? "no-store",
  };

  if (options.revalidate !== undefined) {
    init.next = { revalidate: options.revalidate };
  }

  const response = await fetch(url, init);
  if (!response.ok) {
    throw new V1FetchError(`Request failed: ${response.status}`, response.status);
  }

  return response.text();
}
