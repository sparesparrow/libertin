/**
 * Age gate — the repo's own client (`apps/web`), not the module preview.
 *
 * These assertions are the browser-level counterpart to `middleware.test.ts`.
 * The unit test proves the middleware decides correctly; this proves the
 * decision survives a real request/response and a real render.
 */

const CONSENT_COOKIE = 'libertin.age';

/**
 * Copy that only exists in the landing page's *body*, never on the gate.
 *
 * Picked carefully. Category names like "Naturisté" look like the obvious
 * markers and are wrong: the root layout sets a site description
 * ("… Naturisté, swingeři, BDSM a šibari …") on every response including the
 * gate, deliberately, because it is public SEO metadata for the marketing
 * surface. Asserting on those words fails on correct behaviour. What must not
 * appear is the landing page's own rendered structure.
 */
const GATED_MARKERS = [
  'Naše komunity',
  'categories-heading',
  'Vaše komunita, vaše pravidla',
] as const;

describe('Age gate (apps/web)', () => {
  beforeEach(() => {
    cy.clearCookies();
  });

  it('shows the gate to a visitor with no consent cookie', () => {
    cy.visit('/');
    cy.contains('Je vám 18 nebo více let?').should('be.visible');
    cy.contains('Je mi 18+, vstoupit').should('be.visible');
  });

  it('keeps gated copy out of the response body, not merely off the screen', () => {
    // E14-T5b: not rendering `children` was not enough — Next still seeded the
    // requested segment into the RSC payload, so the landing page's structure
    // was readable in view-source. This asserts the raw body, deliberately
    // including <script> content, because that is where the leak lived.
    cy.request('/').then((response) => {
      const body = String(response.body);
      const leaked = GATED_MARKERS.filter((marker) => body.includes(marker));
      expect(leaked, 'gated copy present in the un-consented response body').to.deep.equal([]);
    });
  });

  it('keeps the gate response out of shared caches', () => {
    cy.request('/').then((response) => {
      const cacheControl = String(response.headers['cache-control'] ?? '');
      expect(cacheControl, 'Cache-Control on a gate response').to.include('no-store');
    });
  });

  it('reveals the site once consent is confirmed, without changing the URL', () => {
    cy.visit('/');
    cy.contains('Je mi 18+, vstoupit').click();

    cy.getCookie(CONSENT_COOKIE).should('have.property', 'value', '1');
    cy.location('pathname').should('equal', '/');
    cy.contains('Naše komunity').should('be.visible');
  });

  it('records consent in a session cookie, so a closed browser re-gates', () => {
    cy.visit('/');
    cy.contains('Je mi 18+, vstoupit').click();
    cy.getCookie(CONSENT_COOKIE).should((cookie) => {
      expect(cookie, 'consent cookie').to.not.equal(null);
      // A session cookie carries no expiry. Anything else would leave a shared
      // machine unlocked after the browser closes (privacy-review P7).
      expect(cookie?.expiry, 'consent cookie expiry').to.be.oneOf([undefined, null]);
    });
  });

  it('does not name the site in the consent cookie', () => {
    cy.visit('/');
    cy.contains('Je mi 18+, vstoupit').click();
    cy.getCookie(CONSENT_COOKIE).then((cookie) => {
      expect(cookie?.value, 'consent cookie value').to.equal('1');
    });
  });

  it('sends a confirmed visitor away from /gate', () => {
    cy.setCookie(CONSENT_COOKIE, '1');
    cy.visit('/gate');
    cy.location('pathname').should('equal', '/');
  });

  it('gates a deep link just like the landing page', () => {
    cy.visit('/login');
    cy.contains('Je vám 18 nebo více let?').should('be.visible');
    cy.location('pathname').should('equal', '/login');
  });

  it('leaves robots.txt and sitemap.xml reachable without consent', () => {
    for (const path of ['/robots.txt', '/sitemap.xml']) {
      cy.request(path).its('status').should('equal', 200);
    }
  });
});
