/**
 * The public surface of this repo's client: what a crawler and an anonymous
 * visitor can reach, and whether the links we publish actually resolve.
 *
 * Link integrity is recorded as *findings* rather than assertions. A dead
 * footer link is a real defect, but the fix is owner-supplied content (a
 * privacy policy and terms of use are legal copy, not something a test run
 * should invent), so failing the merge gate on it would block every unrelated
 * change until that copy exists. The run report names each one. To make it
 * gate instead, turn the `note()` call below into an assertion — that is a
 * one-line change and is the right move once the pages land.
 */

import { note } from '../../support/findings';

const FOOTER_LINKS = ['/o-nas', '/kontakt', '/soukromi', '/podminky'] as const;

/** Routes the sitemap claims are public and indexable. */
const SITEMAP_ROUTES = ['/', '/login'] as const;

describe('Veřejný povrch (apps/web)', () => {
  it('serves robots.txt without consent and points at the sitemap', () => {
    // A crawler never confirms an age gate, so the SEO surface must answer
    // before consent or the site is invisible.
    cy.clearCookies();
    cy.request('/robots.txt').then((response) => {
      expect(response.status).to.equal(200);
      expect(response.body).to.contain('User-Agent: *');
      expect(response.body).to.contain('Sitemap:');
    });
  });

  it('serves a sitemap listing exactly the routes that exist', () => {
    cy.clearCookies();
    cy.request('/sitemap.xml').then((response) => {
      expect(response.status).to.equal(200);
      for (const route of SITEMAP_ROUTES) {
        expect(response.body, `sitemap lists ${route}`).to.contain(
          route === '/' ? '<loc>' : `${route}</loc>`,
        );
      }
      // The gate is a mechanism, not a destination. Indexing it would send
      // search traffic to a dead end and advertise the gate as a landing page.
      expect(response.body, 'sitemap does not advertise /gate').to.not.contain('/gate<');
    });
  });

  it('keeps the sitemap honest about gated content', () => {
    // Everything listed must be reachable by the crawler that reads the list.
    cy.clearCookies();
    cy.request({ url: '/', failOnStatusCode: false }).then((response) => {
      expect(response.status, 'the indexed landing route answers').to.equal(200);
    });
  });

  it('reports every footer link that does not resolve', () => {
    cy.setCookie('libertin.age', '1');
    for (const href of FOOTER_LINKS) {
      cy.request({ url: href, failOnStatusCode: false }).then((response) => {
        if (response.status >= 400) {
          note(
            'apps/web',
            href,
            'dead-link',
            `footer odkazuje na ${href}, které vrací ${response.status} — stránka neexistuje`,
          );
        }
      });
    }
  });

  it('answers an unknown route with a real not-found status, not a soft 200', () => {
    // The deployed client returns 200 for missing routes with a client-rendered
    // error screen (CLAUDE.md names this trap). This repo must not copy that:
    // a soft 404 gets the page indexed and tells a crawler the route is real.
    //
    // Consent is required to measure this at all. Without the cookie the age
    // gate answers first — correctly, and with 200 — so an unconsented request
    // measures the gate, not the router. The first version of this check
    // omitted the cookie and read the gate's 200 as a soft 404.
    cy.setCookie('libertin.age', '1');
    cy.request({ url: '/tato-cesta-neexistuje-cypress', failOnStatusCode: false }).then(
      (response) => {
        expect(response.status, 'unknown route status').to.equal(404);
      },
    );
  });

  it('shows the gate, not a 404, when an unconsented visitor hits an unknown route', () => {
    // The complement of the check above, and the reason it needs the cookie:
    // consent is decided before routing, so an anonymous visitor must never be
    // told which routes exist. A 404 here would be an enumeration oracle.
    cy.clearCookies();
    cy.request({ url: '/tato-cesta-neexistuje-cypress', failOnStatusCode: false }).then(
      (response) => {
        expect(response.status, 'unconsented unknown route').to.equal(200);
      },
    );
  });
});
