import { MODULES } from '../../support/routes';
import { openModule } from '../../support/session';
import { note } from '../../support/findings';

const M = MODULES.homepage;

describe(`Modul: ${M.label} (${M.path})`, () => {
  beforeEach(function () {
    openModule(this, M);
  });

  it('renders the hero as the page heading', () => {
    cy.get('h1').should('be.visible').and('contain.text', 'Seznamte');
  });

  it('renders the platform intro and the events section', () => {
    cy.visibleText().should('include', 'O platformě');
    cy.contains('h2', 'Doporučené akce').should('be.visible');
  });

  it('lists event cards under the events section', () => {
    cy.contains('h2', 'Doporučené akce')
      .parents('section')
      .first()
      .within(() => {
        cy.get('h3').should('have.length.greaterThan', 0);
      });
  });

  it('offers a route into the product for a signed-out visitor', () => {
    cy.get('a[href="/login"]').should('exist');
  });

  /**
   * B13 — full CS+EN delivery.
   *
   * Two wrong versions of this check came before this one, and both are worth
   * remembering because both "found" a missing feature that was there.
   *
   * The first searched the page for the words "Česky" and "English". The
   * switcher is an icon button (a flag, `aria-label="Jazyk"`) with no visible
   * text, so it reported "no language switcher" for a week.
   *
   * The second opened the menu and looked for "English". The menu lists
   * twelve languages *named in Czech*, so English is "Angličtina" — and a
   * filter written in English concluded, wrongly, that only Čeština was
   * offered.
   *
   * So this does what B13 actually asks: choose English, then check that the
   * page is in English. Being offered a language is not the same as being
   * delivered one.
   */
  it('exposes the language switcher required by B13', () => {
    const ENGLISH = /^(angličtina|english|en)$/i;

    cy.get('button[aria-label="Jazyk"]').filter(':visible').should('have.length.at.least', 1);
    cy.get('button[aria-label="Jazyk"]').filter(':visible').first().click();

    cy.get('[role="menuitem"], [role="menuitemradio"], [role="option"]')
      .filter(':visible')
      .then(($items) => {
        const choices = $items.toArray().map((el) => (el.textContent ?? '').trim());
        expect(
          choices.some((c) => ENGLISH.test(c)),
          `English among the language choices (offered: ${choices.join(', ')})`,
        ).to.equal(true);
        const english = $items.toArray().find((el) => ENGLISH.test((el.textContent ?? '').trim()));
        cy.wrap(english).click();
      });

    cy.wait(3000);
    cy.get('html').invoke('attr', 'lang').should('match', /^en/i);
    cy.visibleText().then((text) => {
      // Czech diacritics are a cheap, reliable tell for untranslated copy:
      // English uses none of them. Reported, because "how much is left in
      // Czech" is a progress measure, not a pass/fail line.
      const czech = (text.match(/[ěščřžůňťďĚŠČŘŽŮŇŤĎ]/g) ?? []).length;
      const share = text.length > 0 ? (czech / text.length) * 100 : 0;
      if (share > 0.5) {
        note('homepage', '/', 'b13-partial', `po přepnutí na angličtinu zůstává ${czech} českých znaků s diakritikou (${share.toFixed(1)} % textu)`);
      }
    });
  });
});
