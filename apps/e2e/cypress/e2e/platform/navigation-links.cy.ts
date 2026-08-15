import { note } from '../../support/findings';

/**
 * Every internal link in the global shell must lead somewhere.
 *
 * This has to navigate rather than `cy.request()`: the deployment answers
 * unknown paths with HTTP 200, and its 404 screen is rendered on the client
 * from the RSC payload — so neither the status code nor the served HTML
 * distinguishes a live route from a dead one. Only the built DOM does.
 */

const SOURCE_ROUTE = '/wall';

/** Links that legitimately leave the app or do nothing on their own. */
function isInternalRoute(href: string): boolean {
  return (
    href.startsWith('/') &&
    !href.startsWith('//') &&
    href.length > 1 &&
    !href.includes('#') &&
    !href.startsWith('/_next')
  );
}

describe('Navigace — žádný odkaz nesmí vést na 404', () => {
  it('collects and follows every internal link in the shell', () => {
    cy.visitModule(SOURCE_ROUTE, { module: 'shell' });

    cy.get('a[href]')
      .then(($links) => {
        const hrefs = $links
          .toArray()
          .map((a) => a.getAttribute('href') ?? '')
          .filter(isInternalRoute);
        return [...new Set(hrefs)].sort();
      })
      .then((hrefs) => {
        expect(hrefs.length, 'internal links found in the shell').to.be.greaterThan(0);
        cy.task('log', `Checking ${hrefs.length} internal links from ${SOURCE_ROUTE}`);

        const dead: string[] = [];

        cy.wrap(hrefs, { log: false }).each((href) => {
          const route = String(href);
          cy.visit(route, { failOnStatusCode: false });
          cy.get('body').should('be.visible');
          cy.get('body').then(($body) => {
            if ($body.find('h1.next-error-h1').length > 0) {
              dead.push(route);
            }
          });
        });

        cy.then(() => {
          for (const route of dead) {
            note('shell', route, 'dead-nav-link', 'linked from the shell but renders a 404');
          }
          expect(dead, 'shell links resolving to the framework 404').to.deep.equal([]);
        });
      });
  });
});
