export function normalizePathname(pathname: string): string {
  return pathname.replace(/\/$/, "") || "/";
}

export function isNavLinkActive(
  pathname: string,
  href: string,
  exact?: boolean,
  prefix?: boolean,
): boolean {
  const current = normalizePathname(pathname);
  if (exact) return current === href;
  if (prefix) return current === href || current.startsWith(`${href}/`);
  return current === href || current.startsWith(`${href}/`);
}

export function isNavDropdownActive(
  pathname: string,
  items: { href: string }[],
  prefix?: boolean,
): boolean {
  return items.some((item) => isNavLinkActive(pathname, item.href, false, prefix));
}

export function getNavSearchString(pathname: string, search?: string): string {
  if (!search) {
    return pathname;
  }
  return `${pathname}${search.startsWith("?") ? search : `?${search}`}`;
}
