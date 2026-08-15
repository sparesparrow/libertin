import { ALL_MODULES, CZECH_TYPO_BLOCKLIST } from '../../support/routes';
import { openModule } from '../../support/session';
import { note } from '../../support/findings';

/**
 * CLAUDE.md names these typos explicitly: they were corrected once in
 * `packages/i18n/locales.json` and must not come back. The client under test
 * carries its own copy, so this spec is the check that the correction actually
 * reached the shipped strings.
 */
describe('Čeština — zakázané řetězce', () => {
  for (const module of ALL_MODULES) {
    it(`${module.label} (${module.path}) neobsahuje známé překlepy`, function () {
      openModule(this, module);
      cy.assertCzechCopy(module.id, module.path);
    });
  }

  it('nikde nezůstal neinterpolovaný placeholder', () => {
    cy.visitModule('/', { module: 'copy' });
    cy.visibleText().then((text) => {
      const leftovers = [...text.matchAll(/\{\{[^}]{1,40}\}\}/g)].map((m) => m[0]);
      const unique = [...new Set(leftovers)];
      for (const placeholder of unique) {
        note('copy', '/', 'untranslated-placeholder', `${placeholder} se vykreslil doslovně`);
      }
      expect(unique, 'raw i18n placeholders in rendered copy').to.deep.equal([]);
    });
  });

  it('na veřejných stránkách nezůstal filler text', () => {
    // Found on the homepage: all four community cards (Naturisté, Swingeři,
    // BDSM, Šibari) still carry "Lorem ipsum dolor sit amet…". These are the
    // first thing a visitor reads about what the platform is for.
    for (const route of ['/', '/wall', '/faq']) {
      cy.visitModule(route, { module: 'copy' });
      cy.visibleText().then((text) => {
        const filler = ['Lorem ipsum', 'dolor sit amet', 'consectetuer'].filter((needle) =>
          text.includes(needle),
        );
        if (filler.length > 0) {
          note('copy', route, 'placeholder-copy', `na stránce je stále výplňový text: ${filler.join(', ')}`);
        }
        expect(filler, `filler text on ${route}`).to.deep.equal([]);
      });
    }
  });

  it('blocklist je neprázdný (ochrana proti prázdnému testu)', () => {
    // A blocklist that quietly emptied would make every check above pass.
    expect(CZECH_TYPO_BLOCKLIST.length).to.be.greaterThan(0);
  });
});
