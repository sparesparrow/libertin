const SAFE_RESPONSE_KEYS = new Set([
  'data',
  'items',
  'results',
  'success',
  'status',
  'message',
  'user',
  'profile',
  'feed',
  'conversations',
  'events',
  'marketplace',
  'total',
  'page',
  'limit',
  'current_page',
  'last_page',
  'next_page',
  'meta',
  'links',
]);

export type ContentKind = 'json' | 'html' | 'form' | 'multipart' | 'text' | 'other';
export type CookieKind = 'csrf' | 'session' | 'other';

export function contentKind(value: unknown): ContentKind {
  const header = Array.isArray(value) ? String(value[0] ?? '') : String(value ?? '');
  const type = header.toLowerCase();
  if (type.includes('application/json') || type.includes('+json')) return 'json';
  if (type.includes('text/html')) return 'html';
  if (type.includes('application/x-www-form-urlencoded')) return 'form';
  if (type.includes('multipart/form-data')) return 'multipart';
  if (type.startsWith('text/')) return 'text';
  return 'other';
}

export function statusClass(status: number): string {
  if (!Number.isFinite(status)) return 'unknown';
  return `${Math.floor(status / 100)}xx`;
}

export function requestFieldNames(body: unknown): string[] {
  if (body === null || body === undefined) return [];

  if (typeof body === 'string') {
    const value = body.trim();
    if (!value) return [];

    if (value.startsWith('{')) {
      try {
        return requestFieldNames(JSON.parse(value) as unknown);
      } catch {
        return [];
      }
    }

    try {
      return [...new Set([...new URLSearchParams(value).keys()])].sort();
    } catch {
      return [];
    }
  }

  if (typeof body === 'object' && !Array.isArray(body)) {
    return Object.keys(body as Record<string, unknown>).sort();
  }

  return [];
}

export function cookieKinds(names: readonly string[]): CookieKind[] {
  const kinds = new Set<CookieKind>();
  for (const name of names) {
    if (/csrf|xsrf/i.test(name)) kinds.add('csrf');
    else if (/session|sess/i.test(name)) kinds.add('session');
    else kinds.add('other');
  }
  return [...kinds].sort();
}

export function safeResponseShape(body: unknown): string {
  if (Array.isArray(body)) return 'array';
  if (body === null) return 'null';
  if (typeof body !== 'object') return typeof body;

  const keys = Object.keys(body as Record<string, unknown>)
    .filter((key) => SAFE_RESPONSE_KEYS.has(key))
    .sort();
  return keys.length === 0 ? 'object' : `object[${keys.join(',')}]`;
}

export function safeLoginAction(action: string, origin: string): string {
  try {
    const url = new URL(action, origin);
    if (url.origin !== origin) return 'cross-origin';
    return url.pathname === '/login' ? '/login' : 'same-origin-other';
  } catch {
    return 'invalid';
  }
}
