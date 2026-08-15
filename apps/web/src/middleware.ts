import { NextResponse, type NextRequest } from 'next/server';

import { AGE_CONSENT_COOKIE, GATE_PATH, isAgeConsentValue } from './lib/ageConsentCookie';

/**
 * Stops unconfirmed requests before routing (E14-T5b).
 *
 * ## Why the layout check was not enough
 *
 * E14-T5 moved the age gate to the server: the root layout renders the gate
 * *instead of* `children`, so the landing page is never rendered and never
 * appears in the visible markup. Measured against `next build` + `next start`
 * (Next 14.2.35), that held for what the browser *displays* — but not for what
 * the response *contains*. Next builds the cache-node seed for child segments
 * before the layout decides whether to render them, so an unconfirmed response
 * still carried the requested page's tree inside `self.__next_f.push(...)`.
 *
 * Verified on the pre-fix build: a cookie-less `GET /` returned a body
 * containing `categories-heading`, `/o-nas`, `/soukromi`, `/podminky` and
 * `/kontakt` — the landing page's section and footer structure — even though
 * only the gate was rendered. View-source was enough to see it.
 *
 * No layout-level change can close that: by the time a layout runs, routing has
 * already committed to the requested segment. The request has to be diverted
 * earlier, which is what this middleware does.
 *
 * ## Why a rewrite and not a redirect
 *
 * A rewrite keeps the visitor's URL intact. That matters twice over:
 *
 *  - after confirming, `router.refresh()` re-requests the same URL and lands on
 *    the page they actually asked for, with no redirect dance to restore it;
 *  - the address bar and browser history never record a detour through a
 *    `/gate` URL. History entries are visible to anyone who later picks up the
 *    machine, and a URL that says "gate" invites the obvious question.
 *
 * Routing then resolves to `GATE_PATH`, an intentionally empty route, so the
 * requested page's module is never loaded, never rendered and never seeded.
 */
export function middleware(request: NextRequest): NextResponse {
  const consented = isAgeConsentValue(request.cookies.get(AGE_CONSENT_COOKIE)?.value);
  const { pathname } = request.nextUrl;

  // A confirmed visitor has no reason to be on the gate route — that only
  // happens by typing it, or by a stale link. Send them to the real site rather
  // than serving the deliberately blank page.
  if (pathname === GATE_PATH) {
    return consented ? redirectHome(request) : noStore(NextResponse.next());
  }

  if (consented) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = GATE_PATH;
  return noStore(NextResponse.rewrite(url));
}

function redirectHome(request: NextRequest): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = '/';
  url.search = '';
  return NextResponse.redirect(url);
}

/**
 * Keeps a gate response out of shared caches.
 *
 * Whether a visitor sees the gate or the site is decided by a cookie, so a CDN
 * or corporate proxy that stored one response and replayed it for everyone
 * would either hand the site to someone who never confirmed, or pin the gate
 * onto someone who did.
 *
 * `Vary: Cookie` would be the natural companion here and is deliberately not
 * set: Next overwrites `Vary` with its own router values
 * (`RSC, Next-Router-State-Tree, …`) after middleware runs, so setting it is
 * theatre — it does not survive into the response. `no-store` does survive
 * (verified with `curl -I`), and it is the stronger control anyway: a cache
 * that honours it never stores the response, so it has nothing to key on.
 *
 * Site-wide cache policy for authenticated responses is E14-T7; this covers the
 * gate only.
 */
function noStore(response: NextResponse): NextResponse {
  response.headers.set('Cache-Control', 'no-store, must-revalidate');
  return response;
}

export const config = {
  /**
   * Everything except assets and the two public SEO endpoints.
   *
   * `robots.txt` and `sitemap.xml` are deliberately left reachable: they carry
   * no member content, and gating them would break indexing of the public
   * marketing surface without protecting anything. `mockServiceWorker.js` is
   * the MSW worker, which must load before the app can boot against mocks.
   *
   * Note this matcher covers RSC navigation requests too — those arrive on the
   * same pathname with an `RSC` header, so a client-side navigation by an
   * unconfirmed visitor is diverted exactly like a fresh document request.
   */
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|mockServiceWorker\\.js).*)',
  ],
};
