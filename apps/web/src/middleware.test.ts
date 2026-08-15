import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';

import { config, middleware } from './middleware';
import { AGE_CONSENT_COOKIE, GATE_PATH, isAgeConsentValue } from './lib/ageConsentCookie';

const ORIGIN = 'https://libertin.cz';

function request(path: string, cookie?: string): NextRequest {
  const headers = new Headers();
  if (cookie !== undefined) headers.set('cookie', cookie);
  return new NextRequest(new URL(path, ORIGIN), { headers });
}

/** Where `NextResponse.rewrite()` records its target. */
function rewriteTarget(response: Response): string | null {
  return response.headers.get('x-middleware-rewrite');
}

describe('age-gate middleware', () => {
  describe('without consent', () => {
    it('rewrites the landing page to the empty gate route', () => {
      const response = middleware(request('/'));

      expect(rewriteTarget(response)).toBe(`${ORIGIN}${GATE_PATH}`);
    });

    it.each(['/', '/login', '/o-nas', '/soukromi', '/nested/deep/page'])(
      'diverts %s',
      (path) => {
        expect(rewriteTarget(middleware(request(path)))).toBe(`${ORIGIN}${GATE_PATH}`);
      },
    );

    it('preserves the visitor URL so confirming lands on the page they asked for', () => {
      // A rewrite, never a redirect: the address bar and browser history must
      // not record a detour through /gate, and router.refresh() after consent
      // has to re-request the original URL.
      const response = middleware(request('/login?next=/feed'));

      expect(response.status).toBe(200);
      expect(response.headers.get('location')).toBeNull();
    });

    it('keeps the gate response out of shared caches', () => {
      expect(middleware(request('/')).headers.get('cache-control')).toContain('no-store');
    });

    it('serves the gate route itself without rewriting it again', () => {
      const response = middleware(request(GATE_PATH));

      expect(rewriteTarget(response)).toBeNull();
      expect(response.headers.get('cache-control')).toContain('no-store');
    });
  });

  describe('with consent', () => {
    const consented = `${AGE_CONSENT_COOKIE}=1`;

    it('lets the request through untouched', () => {
      const response = middleware(request('/', consented));

      expect(rewriteTarget(response)).toBeNull();
      expect(response.headers.get('location')).toBeNull();
    });

    it('redirects a confirmed visitor away from the blank gate route', () => {
      const response = middleware(request(GATE_PATH, consented));

      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toBe(`${ORIGIN}/`);
    });

    it('ignores unrelated cookies sharing the request', () => {
      const response = middleware(request('/', `theme=dark; ${consented}; other=x`));

      expect(rewriteTarget(response)).toBeNull();
    });
  });

  describe('consent predicate stays closed by default', () => {
    // The safe direction for this control is always "not consented" — an empty,
    // falsy or stale value must never read as a confirmation.
    it.each(['0', '', 'false', 'true', 'yes', '11', ' 1'])('rejects %o', (value) => {
      expect(isAgeConsentValue(value)).toBe(false);
    });

    it('rejects a missing cookie', () => {
      expect(isAgeConsentValue(undefined)).toBe(false);
    });

    it('accepts exactly "1"', () => {
      expect(isAgeConsentValue('1')).toBe(true);
    });

    it('gates a request carrying a rejected value', () => {
      expect(rewriteTarget(middleware(request('/', `${AGE_CONSENT_COOKIE}=0`)))).toBe(
        `${ORIGIN}${GATE_PATH}`,
      );
    });
  });
});

describe('middleware matcher', () => {
  // The matcher is the real security boundary: anything it skips is served
  // without ever consulting the gate, so its shape is worth asserting directly
  // rather than trusting by inspection.
  const matcher = new RegExp(`^${config.matcher[0]}$`);

  it.each(['/', '/login', '/o-nas', '/gate', '/deep/nested/route'])('covers %s', (path) => {
    expect(matcher.test(path)).toBe(true);
  });

  it.each([
    '/_next/static/chunks/main.js',
    '/_next/image',
    '/favicon.ico',
    '/robots.txt',
    '/sitemap.xml',
    '/mockServiceWorker.js',
  ])('skips %s', (path) => {
    expect(matcher.test(path)).toBe(false);
  });

  it('leaves the public SEO endpoints reachable', () => {
    // Gating these would break indexing of the public marketing surface while
    // protecting nothing — neither carries member content.
    expect(matcher.test('/robots.txt')).toBe(false);
    expect(matcher.test('/sitemap.xml')).toBe(false);
  });
});
