import { cookies } from 'next/headers';
import type { Dict } from '@libertin/i18n/dict';

import { AGE_CONSENT_COOKIE, isAgeConsentValue } from './ageConsentCookie';

// Re-exported so existing server-component imports keep working; the value
// itself lives in `ageConsentCookie.ts`, which the edge middleware can also
// import (this module cannot cross that boundary — it uses `next/headers`).
export { AGE_CONSENT_COOKIE };

/**
 * Reads the consent decision on the server, before any HTML is produced.
 *
 * This is the fix for P3 in docs/privacy-review.md: the previous gate was a
 * client overlay, so the full landing page — including the words that name the
 * audience — was already in the response body and stayed visible until React
 * hydrated. Deciding here means the gated tree is never rendered, never
 * serialised and never sent.
 *
 * Cost, stated openly: `cookies()` opts the whole app out of static rendering.
 * That is unavoidable for a per-visitor decision, and the alternative (leaking
 * the page to unconfirmed visitors) is not a trade we are willing to make.
 *
 * The RSC-seed residual this comment used to describe — the requested page's
 * tree appearing inside `self.__next_f.push(...)` even though only the gate
 * rendered — is closed by `src/middleware.ts` (E14-T5b), which diverts
 * unconfirmed requests before routing reaches the page. This check remains as
 * the backstop: if the middleware ever stops running (dropped from a deploy, or
 * a matcher edited too narrowly), the server still refuses to render content
 * without consent instead of failing open.
 */
export function hasAgeConsent(): boolean {
  return isAgeConsentValue(cookies().get(AGE_CONSENT_COOKIE)?.value);
}

/**
 * Copy for the "your browser is refusing cookies" state.
 *
 * The key `ageGate.cookiesRequired` does not exist in `packages/i18n/locales.json`
 * yet and that file is owned by another role in this batch, so it is read
 * defensively rather than hardcoded here — hardcoding a Czech sentence in the
 * app would break the "no copy outside i18n" rule. Until the key lands the gate
 * simply stays closed, which is the safe direction: no content is revealed and
 * no consent is silently granted.
 */
export function cookiesRequiredNotice(gate: Dict['ageGate']): string | undefined {
  const value = (gate as Record<string, unknown>)['cookiesRequired'];
  return typeof value === 'string' ? value : undefined;
}
