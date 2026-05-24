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
