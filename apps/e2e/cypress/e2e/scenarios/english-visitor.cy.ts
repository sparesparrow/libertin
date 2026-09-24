import { note } from '../../support/findings';
import {
  assertRealPage,
  chooseLanguage,
  clickNamed,
  cookieBannerShown,
  czechShare,
  Journey,
  refuseCookiesRemembered,
  visibleTextOf,
} from '../../support/scenario';

/**
 * An English-speaking visitor (B13 — full CS + EN delivery).
 *
 * The module spec proves the homepage switches. A visitor does not stay on the
 * homepage: they switch once and then follow links, and every page they reach
 * has to still be English. Measured on 2026-09-24: choosing "Angličtina" sets
 * a `libertine.locale` cookie and `lang="en"`.
 *
 * Asserted: `lang` stays `en` on every page reached by a click. Reported: how
 * much Czech is left on each page — "how much is translated" is a progress
 * measure, not a pass/fail line, same as in the module spec.
 */
/**
 * Where the visitor goes, by link name. Paths are not pinned: the same
 * "Členství" link points to /clenstvi from the homepage footer and to
 * /membership from the FAQ. What matters is that it leads somewhere real, in
 * English.
 */
const PAGES: readonly { label: string; link: RegExp }[] = [
  { label: 'FAQ', link: /^(faq|frequently asked questions|časté dotazy)/i },
  { label: 'Membership', link: /^(membership|členství)$/i },
  { label: 'Terms', link: /^(terms|terms and conditions|terms of service|vop)$/i },
  { label: 'GDPR', link: /^(gdpr|privacy)/i },
  { label: 'Log in', link: /^(log ?in|sign ?in|přihlásit se)$/i },
];

describe('Scénář — anglicky mluvící návštěvník', () => {
  it('přepne jednou na angličtinu a zůstane v ní na každé další stránce', () => {
    const visit = new Journey('anglicky mluvící návštěvník');
    const czechLeft: Record<string, number> = {};
    cy.clearCookies();
    cy.clearLocalStorage();

    const stillEnglish = (path: string): void => {
      cy.get('html').invoke('attr', 'lang').should('match', /^en/i);
      cy.document().then((doc) => {
        expect(cookieBannerShown(doc), `cookie banner asked again on ${path} after refusing`).to.equal(false);
        const share = czechShare(visibleTextOf(doc));
        czechLeft[path] = Number(share.toFixed(2));
        if (share > 0.5) {
          note('scenarios', path, 'b13-partial', `po přepnutí na angličtinu a navigaci zůstává ${share.toFixed(1)} % textu s českou diakritikou`);
        }
      });
    };

    visit.step('otevře úvodní stránku a odmítne cookies (Detaily → Odmítnout)', () => {
      cy.visit('/', { failOnStatusCode: false });
      cy.wait(2000);
      refuseCookiesRemembered();
    });

    visit.step('v menu Jazyk vybere Angličtinu', () => {
      chooseLanguage(/^(angličtina|english)$/i);
      cy.wait(2500);
      stillEnglish('/');
    });

    for (const page of PAGES) {
      visit.step(`klikne na odkaz ${page.label}`, () => {
        cy.location('pathname').then((from) => {
          clickNamed('a', page.link);
          cy.location('pathname').should('not.equal', from);
        });
        assertRealPage();
        cy.wait(1500);
        cy.location('pathname').then((path) => stillEnglish(path));
      });
    }

    visit.step('z přihlášení přejde na registraci', () => {
      cy.get('a[href="/register"]').filter(':visible').first().click();
      cy.location('pathname').should('equal', '/register');
      cy.wait(1500);
      stillEnglish('/register');
    });

    visit.finish({ czechDiacriticShare: czechLeft });
  });
});
