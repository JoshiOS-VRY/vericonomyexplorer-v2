export interface CacheFetchOptions {
  revalidate?: number | false;
  cache?: RequestCache;
  timeoutMs?: number;
}

export type NextFetchInit = RequestInit & {
  next?: { revalidate?: number | false };
};

export function buildFetchInit(
  options: CacheFetchOptions = {},
  extra: RequestInit = {},
): NextFetchInit {
  const init: NextFetchInit = {
    ...extra,
    cache:
      options.cache ??
      (options.revalidate !== undefined ? "force-cache" : "no-store"),
  };

  if (options.revalidate !== undefined) {
    init.next = { revalidate: options.revalidate };
  }

  return init;
}
