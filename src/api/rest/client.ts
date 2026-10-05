import { peekServer } from '../config';
import { ApiError, ApiErrorCode } from '../types';

/**
 * HTTP transport for the 369 Mart shop API: the `/369mart/*` routes the
 * website itself is built on, served by Odoo.
 *
 * How this server behaves, learned against it:
 *
 *   1. The customer is an ordinary Odoo session. Signing in sets a
 *      `session_id` cookie and the phone's own cookie jar keeps and sends it;
 *      there is no token for the app to hold.
 *   2. No `X-Odoo-Database` header. With it Odoo answers the sign-in but
 *      sets no cookie, so the customer is signed out again on the very next
 *      call. On a server holding several databases the session is tied to
 *      the shop's database the way the website does it: one visit to
 *      `/web/login?db=<name>`, made only if the server says it does not know
 *      which database is meant.
 *   3. Failures are `{"ok": false, "error", "field"?}` with a real status.
 *      `error` is written for the customer and shown unchanged.
 *   4. A signed-in route asked without a session does not answer 401: it
 *      redirects to Odoo's HTML login page. `fetch` follows that, so an HTML
 *      answer from `/web/login` is how "sign in again" arrives here.
 */

const DEFAULT_TIMEOUT_MS = 20000;

interface Envelope {
  ok?: boolean;
  error?: string;
  field?: string;
  [k: string]: unknown;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: Record<string, unknown>;
  timeoutMs?: number;
  /**
   * A sign-in step itself: its 401 means "wrong password", not "your session
   * ended", so it must not sign anybody out.
   */
  signingIn?: boolean;
}

let onSignedOut: (() => void) | null = null;

/** Called when the server no longer knows this customer, so the app can show them as signed out. */
export function setSignedOutHandler(fn: (() => void) | null): void {
  onSignedOut = fn;
}

function codeFor(status: number): ApiErrorCode {
  if (status === 401 || status === 403) return 'unauthorized';
  if (status === 404) return 'not_found';
  if (status === 400 || status === 409 || status === 422) return 'invalid';
  return 'unknown';
}

/** Ties this phone's session to the shop's database. Once per launch is enough. */
let bound: Promise<void> | null = null;

function bindDatabase(url: string, db: string): Promise<void> {
  if (!bound) {
    bound = fetch(`${url}/web/login?db=${encodeURIComponent(db)}`, { credentials: 'include' })
      .then(() => undefined)
      .catch(() => {
        bound = null;
      });
  }
  return bound;
}

export async function request<T>(path: string, opts: RequestOptions = {}, retried = false): Promise<T> {
  const { url, db } = peekServer();
  if (!url) throw new ApiError('network', 'No shop address is set.');

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (opts.body) headers['Content-Type'] = 'application/json';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${url}${path}`, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      credentials: 'include',
      signal: controller.signal,
    });
  } catch {
    throw new ApiError('network', 'Could not reach the shop. Check your connection.');
  } finally {
    clearTimeout(timer);
  }

  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    // The login page, reached by redirect: the session is gone.
    if (res.url.includes('/web/login') || res.status === 303) {
      if (!opts.signingIn) onSignedOut?.();
      throw new ApiError('unauthorized', 'Sign in to continue.');
    }
    // An HTML 404 is a server with several databases that was not told which.
    if (res.status === 404 && db && !retried) {
      await bindDatabase(url, db);
      return request<T>(path, opts, true);
    }
    throw new ApiError('unknown', `Unexpected answer from the shop (${res.status}).`);
  }

  let payload: Envelope;
  try {
    payload = (await res.json()) as Envelope;
  } catch {
    throw new ApiError('unknown', 'The shop sent an answer the app could not read.');
  }

  if (!res.ok || payload.ok === false) {
    const code = opts.signingIn && res.status === 401 ? 'invalid' : codeFor(res.status);
    if (code === 'unauthorized') onSignedOut?.();
    throw new ApiError(
      code,
      typeof payload.error === 'string' && payload.error
        ? payload.error
        : code === 'unauthorized'
          ? 'Sign in to continue.'
          : `That did not go through (${res.status}).`,
      typeof payload.field === 'string' ? payload.field : undefined
    );
  }
  return payload as unknown as T;
}

/** A picture address as the shop sends it (often relative), made loadable from the phone. */
export function absolute(path: string | undefined | null): string | undefined {
  if (!path) return undefined;
  if (/^https?:\/\//i.test(path)) return path;
  return `${peekServer().url}${path.startsWith('/') ? '' : '/'}${path}`;
}

/** Turns a downloaded file into base64 text, the form the phone's file store takes. */
function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new ApiError('unknown', 'The file could not be read.'));
    reader.onloadend = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      resolve(text.slice(text.indexOf(',') + 1));
    };
    reader.readAsDataURL(blob);
  });
}

/**
 * Fetch a file the shop makes for the signed-in customer (an invoice). A JSON
 * answer here is the shop saying why there is no file, and is thrown as such.
 */
export async function download(path: string): Promise<string> {
  const { url } = peekServer();
  let res: Response;
  try {
    res = await fetch(`${url}${path}`, { credentials: 'include' });
  } catch {
    throw new ApiError('network', 'Could not reach the shop. Check your connection.');
  }
  const contentType = res.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    const payload = (await res.json().catch(() => ({}))) as Envelope;
    throw new ApiError(codeFor(res.status), payload.error || `That did not go through (${res.status}).`);
  }
  if (!res.ok || res.url.includes('/web/login')) {
    throw new ApiError(res.url.includes('/web/login') ? 'unauthorized' : 'unknown', 'Could not fetch the file.');
  }
  return toBase64(await res.blob());
}
