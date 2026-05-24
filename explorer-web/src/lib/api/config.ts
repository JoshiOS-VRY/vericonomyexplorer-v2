import { getApiBasePath, getApiBaseUrl } from "@/lib/env";

export { getApiBaseUrl, getApiBasePath };

export function getInternalApiBaseUrl(): string {
  return `${getApiBaseUrl()}/internal-api`;
}

export interface FetchOptions {
  revalidate?: number | false;
  cache?: RequestCache;
}

export class ApiFetchError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiFetchError";
    this.status = status;
  }
}

export async function apiFetch<T>(
  path: string,
  options: FetchOptions = {},
): Promise<T> {
  const basePath = getApiBasePath();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${getApiBaseUrl()}${basePath === "" ? "" : basePath}${normalizedPath}`;
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
      /* ignore parse errors */
    }
    throw new ApiFetchError(message, response.status);
  }

  return response.json() as Promise<T>;
}

export async function apiFetchHtml(path: string): Promise<string> {
  const basePath = getApiBasePath();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${getApiBaseUrl()}${basePath === "" ? "" : basePath}${normalizedPath}`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new ApiFetchError(`Request failed: ${response.status}`, response.status);
  }
  return response.text();
}
