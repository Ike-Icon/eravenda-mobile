/**
 * Single HTTP entry point for the whole app (API INTEGRATION POINT #1).
 *
 * - Attaches the JWT as "Authorization: Bearer ...". The backend only runs its cookie/CSRF
 *   origin check for cookie sessions, so bearer requests from a native app work without CORS.
 * - Converts FastAPI error bodies ({"detail": "..."} or a validation list) into ApiError
 *   with a human-readable message screens can show directly.
 * - Calls the registered "unauthorized" handler on 401 so AuthContext can sign the user out.
 */
import * as SecureStore from 'expo-secure-store';
import { API_URL } from '../config/env';

const TOKEN_KEY = 'eravenda.token';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export const tokenStore = {
  get: () => SecureStore.getItemAsync(TOKEN_KEY),
  set: (token: string) => SecureStore.setItemAsync(TOKEN_KEY, token, { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY }),
  clear: () => SecureStore.deleteItemAsync(TOKEN_KEY),
};

let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: (() => void) | null) {
  onUnauthorized = fn;
}

type Query = Record<string, string | number | boolean | undefined | null>;

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  query?: Query;
  /** JSON body */
  json?: unknown;
  /** Native multipart body (e.g. the professional registration form). */
  multipart?: FormData;
  /** application/x-www-form-urlencoded body (only /auth/login uses this) */
  form?: Record<string, string>;
  /** Pass false for public endpoints so a stale token never causes a spurious 401 sign-out. */
  auth?: boolean;
  signal?: AbortSignal;
}

function buildUrl(path: string, query?: Query): string {
  const qs = query
    ? Object.entries(query)
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join('&')
    : '';
  return `${API_URL}${path}${qs ? `?${qs}` : ''}`;
}

function messageFromBody(body: any, fallback: string): string {
  const detail = body?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail.length) {
    // Pydantic validation errors: [{loc: [...], msg: "..."}]
    return detail.map((d) => d?.msg ?? '').filter(Boolean).join('\n') || fallback;
  }
  return fallback;
}

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', query, json, form, multipart, auth = true, signal } = opts;
  const headers: Record<string, string> = { Accept: 'application/json' };

  // Never put a bearer token on a clear-text connection in a production build.
  const api = new URL(API_URL);
  const localHost = ['localhost', '127.0.0.1', '10.0.2.2'].includes(api.hostname);
  if (api.protocol !== 'https:' && !(typeof __DEV__ !== 'undefined' && __DEV__ && localHost)) {
    throw new ApiError('The EraVenda server connection is not secure. Update the app configuration and try again.', 0);
  }

  if (auth) {
    const token = await tokenStore.get();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let body: BodyInit | undefined;
  if (multipart !== undefined) {
    body = multipart;
  } else if (json !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(json);
  } else if (form) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    body = Object.entries(form)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');
  }

  let res: Response;
  try {
    res = await fetch(buildUrl(path, query), { method, headers, body, signal });
  } catch (e: any) {
    if (e?.name === 'AbortError') throw e;
    throw new ApiError('Cannot reach EraVenda. Check your internet connection and try again.', 0);
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  let parsed: any = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    /* non-JSON error page (proxy/cold start): fall through with parsed = null */
  }

  if (!res.ok) {
    if (res.status === 401 && auth && onUnauthorized) onUnauthorized();
    const fallback = res.status === 429 ? 'Too many requests. Please slow down.' : `Request failed (${res.status})`;
    throw new ApiError(messageFromBody(parsed, fallback), res.status);
  }
  return parsed as T;
}
