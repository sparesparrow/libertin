import { PUBLIC_PAGES, CZECH_TYPO_BLOCKLIST } from '../../support/routes';
import { note } from '../../support/findings';

/**
 * The public, informational and legal surface.
 *
 * Why this spec exists: the module suite covers the member-facing product, and
 * seven of those ten modules sit behind a login the run usually has no account
 * for. Everything in *this* file is reachable by anyone, which makes it both
 * the part a stranger judges the platform by and the part that carries the
 * legal obligations — and, until now, the part with no coverage at all.
 *
 * The deployment answers unknown paths with HTTP 200 and a client-rendered
 * error screen, so a status code proves nothing here. Existence is judged the
 * way `00-route-inventory` judges it: the Next error heading must be absent and
 * the page must have rendered real text.
 */
describe('Veřejné a právní stránky', () => {
  for (const page of PUBLIC_PAGES) {
    describe(`${page.label} (${page.path})`, () => {
      it('je skutečná routa, ne 404 obrazovka s kódem 200', () => {
        cy.visitModule(page.path, { module: 'public' });
        cy.get('body').then(($body) => {
          if ($body.find('h1.next-error-h1').length > 0) {
            note('public', page.path, 'missing-page', `${page.label} neexistuje — ${page.why}`);
          }
        });
        cy.get('h1.next-error-h1').should('not.exist');
        cy.visibleText().should('have.length.greaterThan', 50);
      });

      it('je dostupná bez přihlášení', () => {
        // A legal document behind a login is not published. Nobody deciding
        // whether to join can read the terms they would be agreeing to.
        cy.visitModule(page.path, { module: 'public' });
        cy.location('pathname').then((pathname) => {
          if (pathname.startsWith('/login')) {
            note(
              'public',
              page.path,
              'public-page-gated',
              `${page.label} přesměrovává nepřihlášeného na /login — ${page.why}`,
            );
          }
          expect(pathname, `${page.path} stays public`).to.not.match(/^\/login/);
        });
      });

      it('nese vlastní obsah, ne jen shell', () => {
        cy.visitModule(page.path, { module: 'public' });
        cy.visibleText().then((text) => {
          // The shell (header + footer) is on every page; a page that renders
          // only the shell reads as "published" while saying nothing. Form
          // pages are exempt: they are mostly inputs, so short is correct for
          // them and flagging it is noise that devalues every other finding.
          if (page.kind !== 'form' && text.length < 400) {
            note(
              'public',
              page.path,
              'thin-page',
              `${page.label} má jen ${text.length} znaků viditelného textu — ${page.why}`,
            );
          }

          for (const marker of page.marker ?? []) {
            if (!text.toLowerCase().includes(marker.toLowerCase())) {
              note(
                'public',
                page.path,
                'missing-topic',
                `${page.label} neobsahuje "${marker}" — ${page.why}`,
              );
            }
          }
        });
      });

      it('neobsahuje známé překlepy', () => {
        cy.visitModule(page.path, { module: 'public' });
        cy.visibleText().then((text) => {
          const hits = CZECH_TYPO_BLOCKLIST.filter((typo) => text.includes(typo.wrong));
          for (const hit of hits) {
            note('public', page.path, 'czech-typo', `"${hit.wrong}" má být "${hit.right}"`);
          }
          expect(
            hits.map((h) => h.wrong),
            `forbidden Czech strings on ${page.path}`,
          ).to.deep.equal([]);
        });
      });
    });
  }

  it('patička odkazuje jen na stránky, které existují', () => {
    // The repo's own client ships four dead footer links; this is the same
    // check pointed at the deployed client, so the two cannot drift apart.
    cy.visitModule('/', { module: 'public' });
    cy.get('footer a[href^="/"]')
      .then(($links) => [...new Set([...$links].map((a) => a.getAttribute('href') ?? ''))])
      .then((hrefs) => {
        const internal = hrefs.filter((h) => h.length > 1 && !h.startsWith('/#'));
        expect(internal.length, 'footer has internal links to check').to.be.greaterThan(0);
        cy.wrap(internal).each((href) => {
          cy.request({ url: String(href), failOnStatusCode: false }).then((response) => {
            if (response.status >= 400) {
              note(
                'public',
                String(href),
                'dead-link',
                `patička odkazuje na ${href}, které vrací ${response.status}`,
              );
            }
          });
        });
      });
  });
});
