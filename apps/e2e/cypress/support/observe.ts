/**
 * Helpers for the exploration suite (`cypress/e2e/explore/`).
 *
 * Exploration records what the deployed client *does* — before anyone writes
 * an assertion about what it *should* do. It exists because assertions written
 * from assumptions have been wrong here more than once: a language switcher
 * reported missing for a week (it is an icon with no text, and its menu names
 * English "Angličtina"), and a cookie banner reported as having no one-click
 * refusal (its ✕ is one, and it works). Look first, then assert.
 *
 * What these helpers deliberately never record:
 *  - cookie or storage *values* — only names and lengths. Signed-in runs
 *    carry session tokens, and reports end up in CI artifacts.
 *  - image URLs of member photos — they contain the member's ID. Counts only.
 */

/** Hosts that would tell a third party a visitor was here. */
export const TRACKER_HOSTS =
  /google-analytics|googletagmanager|gtag\/|facebook\.net|fbevents|hotjar|doubleclick|clarity\.ms|matomo|plausible|segment\.io|mixpanel|tiktok|linkedin\.com\/px/i;

/** Queue one observation. Call at the end of a chain, with the data computed. */
export function observe(spec: string, route: string, topic: string, data: unknown): void {
  cy.task('recordObservation', { spec, route, topic, data }, { log: false });
}

/** Names and value lengths of cookies visible to the page — never values. */
export function cookieShape(doc: Document): Record<string, number> {
  const shape: Record<string, number> = {};
  for (const pair of doc.cookie.split(';')) {
    const [name, ...rest] = pair.trim().split('=');
    if (name) shape[name] = rest.join('=').length;
  }
  return shape;
}

/** Keys and value lengths in localStorage — never values. */
export function storageShape(win: Window): Record<string, number> {
  const shape: Record<string, number> = {};
  for (let i = 0; i < win.localStorage.length; i += 1) {
    const key = win.localStorage.key(i);
    if (key !== null) shape[key] = (win.localStorage.getItem(key) ?? '').length;
  }
  return shape;
}

/**
 * The accessible name a screen reader would announce — an approximation of the
 * accessible-name algorithm, in the order it resolves.
 *
 * The first version read only `aria-label` and text content, and reported 7
 * "unnamed" controls on /register that were in fact form inputs named by their
 * `<label>`. An inventory that invents problems is worse than none, so this
 * follows the real sources: aria-labelledby, aria-label, a `<label for>`, a
 * wrapping `<label>`, title, placeholder, an image's alt, then text.
 */
export function accessibleName(el: Element): string {
  const doc = el.ownerDocument;
  const clean = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ').trim();

  const labelledBy = el.getAttribute('aria-labelledby');
  if (labelledBy) {
    const text = labelledBy
      .split(/\s+/)
      .map((id) => clean(doc.getElementById(id)?.textContent))
      .join(' ')
      .trim();
    if (text) return text.slice(0, 60);
  }
  const aria = clean(el.getAttribute('aria-label'));
  if (aria) return aria.slice(0, 60);

  if (el.id) {
    const forLabel = clean(doc.querySelector(`label[for="${CSS.escape(el.id)}"]`)?.textContent);
    if (forLabel) return forLabel.slice(0, 60);
  }
  const wrapping = clean(el.closest('label')?.textContent);
  if (wrapping && el.tagName !== 'LABEL') return wrapping.slice(0, 60);

  const fallback =
    clean(el.getAttribute('title')) ||
    clean(el.getAttribute('placeholder')) ||
    clean(el.querySelector('img')?.getAttribute('alt')) ||
    clean(el.textContent);
  return fallback.slice(0, 60);
}

/**
 * Close the cookie banner the least-consenting way available: its ✕.
 *
 * Exploration runs as an anonymous visitor who has not agreed to anything, so
 * that what it observes is what a stranger gets. Clicking "Povolit vše" to get
 * the banner out of the way would observe a different site.
 *
 * It closes the ✕ that is actually on top — the one a visitor's click would
 * reach — and repeats while a banner is still showing, recording how many
 * copies of the banner the page rendered and how many clicks it took. This
 * exists because an earlier version picked the first ✕ in the DOM, found it
 * covered, and reported the banner as covering its own close button; the
 * measurement below is what settled what was really going on.
 */
export function refuseCookieBanner(route = ''): void {
  const isClose = (b: HTMLElement) => /^(zavřít|close)$/i.test(b.getAttribute('aria-label') ?? '');
  const bannerCount = (doc: Document) =>
    Array.from(doc.querySelectorAll('button')).filter((b) => /^povolit vše$/i.test((b.textContent ?? '').trim())).length;
  const visibleBanners = (doc: Document) =>
    Array.from(doc.querySelectorAll('button')).filter(
      (b) => /^povolit vše$/i.test((b.textContent ?? '').trim()) && (b as HTMLElement).offsetParent !== null,
    ).length;

  cy.document().then((doc) => {
    const rendered = bannerCount(doc);
    if (rendered === 0) return;

    let clicks = 0;
    const closeTopmost = (): void => {
      cy.document().then((d) => {
        if (visibleBanners(d) === 0 || clicks >= 4) {
          if (route) {
            observe('cookie-banner', route, 'closing the banner with ✕', {
              bannerCopiesRendered: rendered,
              clicksNeeded: clicks,
              stillVisibleAfter: visibleBanners(d),
            });
          }
          return;
        }
        const candidates = Array.from(d.querySelectorAll('button'))
          .filter((b) => (b as HTMLElement).offsetParent !== null && isClose(b as HTMLElement)) as HTMLElement[];
        const topmost = candidates.find((b) => {
          const r = b.getBoundingClientRect();
          const hit = d.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
          return hit !== null && (hit === b || b.contains(hit));
        });
        if (!topmost) {
          if (route) {
            observe('cookie-banner', route, 'closing the banner with ✕', {
              bannerCopiesRendered: rendered,
              clicksNeeded: clicks,
              stillVisibleAfter: visibleBanners(d),
              note: 'no ✕ is reachable by a click — every one is covered',
            });
          }
          return;
        }
        clicks += 1;
        cy.wrap(topmost).click();
        cy.wait(400);
        closeTopmost();
      });
    };
    closeTopmost();
  });
}
