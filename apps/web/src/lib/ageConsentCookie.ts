/**
 * Age-consent cookie facts shared by the middleware and the server components.
 *
 * This module exists because of a runtime boundary: `middleware.ts` runs in the
 * edge runtime, where `next/headers` does not exist. `ageConsent.ts` imports
 * `next/headers`, so the middleware cannot import from it without dragging that
 * dependency across the boundary. Keeping the cookie name and the predicate
 * here — with no Next imports at all — means both sides agree on the contract
 * by construction rather than by two copies that can drift apart.
 */

/**
 * Session cookie that records the 18+ confirmation.
 *
 * Deliberately boring name: cookies are visible to anyone who opens devtools on
 * a borrowed laptop, so it must not describe what the site is. It carries no
 * value beyond `1` — no identity, no timestamp, nothing to correlate.
 */
export const AGE_CONSENT_COOKIE = 'libertin.age';

/** The only value that counts as consent. */
export const AGE_CONSENT_VALUE = '1';

/**
 * Route the middleware rewrites unconfirmed requests to.
 *
 * It is an intentionally empty route (see `src/app/gate/page.tsx`): the point
 * of the rewrite is that routing resolves somewhere that has no content to
 * serialise, so nothing about the requested page can reach the response.
 */
export const GATE_PATH = '/gate';

/**
 * Whether a raw cookie value counts as consent.
 *
 * Strict equality, not truthiness: an empty string, `0`, `false` or a stale
 * value from an older scheme must all read as "not consented". The safe
 * direction for this control is always to stay closed.
 */
export function isAgeConsentValue(value: string | undefined): boolean {
  return value === AGE_CONSENT_VALUE;
}
