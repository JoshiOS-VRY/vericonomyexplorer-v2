import path from 'node:path';
import { config as loadDotenv } from 'dotenv';

let loaded = false;

/** Load root repo .env so BTCEXP_* / VCEXP_* vars are available to Next. */
export function loadRootEnv(): void {
  if (loaded) return;
  loaded = true;
  const rootDir = path.join(process.cwd(), '..');
  loadDotenv({ path: path.join(rootDir, '.env') });
  loadDotenv({ path: path.join(rootDir, '.env.local'), override: true });
  loadDotenv({ path: path.join(process.cwd(), '.env.local'), override: true });
}

export function getApiBaseUrl(): string {
  loadRootEnv();

  const explicit = process.env.EXPLORER_API_URL ?? process.env.NEXT_PUBLIC_EXPLORER_API_URL;
  if (explicit) return explicit.replace(/\/$/, '');

  const host = process.env.BTCEXP_HOST ?? '127.0.0.1';
  const port = process.env.BTCEXP_PORT ?? '3002';
  return `http://${host}:${port}`.replace(/\/$/, '');
}

export function getApiBasePath(): string {
  loadRootEnv();
  const base = process.env.BTCEXP_BASEURL ?? '/';
  return base.endsWith('/') ? base.slice(0, -1) : base;
}

export function getUiThemeDefault(): 'light' | 'dark' | 'system' {
  loadRootEnv();
  const theme = (process.env.BTCEXP_UI_THEME ?? 'dark').toLowerCase();
  if (theme === 'light') return 'light';
  if (theme === 'system') return 'system';
  return 'dark';
}
