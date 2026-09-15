/**
 * Copy integrity on this repo's own build.
 *
 * Three regressions this catches, all of which have actually happened on this
 * product:
 *
 *  1. An i18n key rendering instead of its value. `useTranslation` fails soft —
 *     an uninitialised or duplicated i18next instance renders the key itself,
 *     so `theme.toggle` ships where `Noční režim` belongs and nothing throws.
 *     See CLAUDE.md, "i18n is one shared i18next instance".
 *  2. The corrected Czech typos coming back. They were fixed once in
 *     `packages/i18n/locales.json`; CLAUDE.md forbids reintroducing them.
 *  3. Placeholder text reaching a page a member can see.
 *
 * The platform suite makes the same checks against the deployed client. This
 * one runs against `apps/web` in CI, so it gates a merge instead of reporting
 * after the fact.
 */

import { CZECH_TYPO_BLOCKLIST } from '../../support/routes';

/** Routes of this repo that render member-facing copy. */
const ROUTES = ['/', '/login'] as const;

/**
 * Keys the local pages resolve. Listed explicitly rather than derived from a
 * generic pattern: a heuristic that flags any dotted token also flags
 * `libertin.cz` and `vas@example.com`, and a check that cries wolf gets muted.
 */
const KEYS_IN_USE = [
  'home.hero.title',
  'home.hero.subtitle',
  'home.hero.cta',
  'home.sections.categories',
  'home.categories.naturists',
  'home.categories.swingers',
  'home.categories.bdsm',
  'home.categories.shibari',
  'footer.about',
  'footer.contact',
  'footer.privacy',
  'footer.terms',
  'footer.age',
  'meta.title',
  'auth.login.title',
  'auth.login.email',
  'auth.login.emailPlaceholder',
  'auth.login.password',
  'auth.login.submit',
  'auth.login.forgotPassword',
  'auth.login.noAccount',
  'auth.login.error',
  'common.error',
] as const;

const PLACEHOLDERS = ['Lorem ipsum', 'dolor sit amet', 'TODO', 'FIXME', 'undefined'] as const;

function enter(route: string): void {
  cy.clearCookies();
  cy.setCookie('libertin.age', '1');
  cy.visit(route);
}

describe('Česká kopie (apps/web)', () => {
  for (const route of ROUTES) {
    describe(route, () => {
      beforeEach(() => enter(route));

      it('renders values, never the i18n keys themselves', () => {
        // `visibleText` rather than `$body.text()`: the latter returns the RSC
        // payload too, which legitimately contains key-shaped strings.
        cy.visibleText().then((text) => {
          const leaked = KEYS_IN_USE.filter((key) => text.includes(key));
          expect(leaked, `unresolved i18n keys rendered on ${route}`).to.deep.equal([]);
        });
      });

      it('does not reintroduce the corrected Czech typos', () => {
        cy.visibleText().then((text) => {
          const found = CZECH_TYPO_BLOCKLIST.filter((entry) => text.includes(entry.wrong)).map(
            (entry) => `"${entry.wrong}" should be "${entry.right}"`,
          );
          expect(found, `Czech typos on ${route}`).to.deep.equal([]);
        });
      });

      it('ships no placeholder text', () => {
        cy.visibleText().then((text) => {
          const found = PLACEHOLDERS.filter((placeholder) => text.includes(placeholder));
          expect(found, `placeholder copy on ${route}`).to.deep.equal([]);
        });
      });

      it('has a non-empty, brand-correct document title', () => {
        // The rebrand is the whole point of the project; the old brand must not
        // survive anywhere a member or a search engine can read it.
        cy.title().should('not.be.empty');
        cy.title().should('not.match', /swingerslife/i);
      });
    });
  }

  it('keeps the old brand out of the gate as well', () => {
    cy.clearCookies();
    cy.visit('/gate');
    cy.visibleText().should('not.match', /swingerslife/i);
  });
});
