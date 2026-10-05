import { ServerConfig } from './types';

/**
 * Where the app points.
 *
 * Set at build time: `EXPO_PUBLIC_API_URL` is the Odoo address the website's
 * `/369mart/*` routes live on, `EXPO_PUBLIC_ODOO_DB` its database. With no
 * address the app runs on demo data, so a fresh checkout is never a dead screen.
 */
const url = (process.env.EXPO_PUBLIC_API_URL ?? '').trim().replace(/\/+$/, '');

const config: ServerConfig = {
  url,
  db: (process.env.EXPO_PUBLIC_ODOO_DB ?? '').trim(),
  useMock: !url || process.env.EXPO_PUBLIC_API_MODE === 'mock',
};

export function peekServer(): ServerConfig {
  return config;
}
