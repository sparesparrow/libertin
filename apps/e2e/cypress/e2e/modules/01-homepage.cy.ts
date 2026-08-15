import { MODULES } from '../../support/routes';
import { openModule } from '../../support/session';

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

  it('exposes the language switcher required by B13', () => {
    cy.visibleText().then((text) => {
      expect(text, 'language switcher').to.include('Česky');
      expect(text, 'language switcher').to.include('English');
    });
  });
});
