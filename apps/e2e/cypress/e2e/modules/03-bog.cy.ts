import { MODULES } from '../../support/routes';
import { openModule } from '../../support/session';
import { note } from '../../support/findings';

const M = MODULES.bog;

/**
 * "Bog" is the WhatsApp-style messenger. It lives on `/messages`, not on
 * `/bog` — that path resolves to the framework 404.
 */
describe(`Modul: ${M.label} (${M.path})`, () => {
  beforeEach(function () {
    openModule(this, M);
  });

  // Tabs as they stand on 25. 9. 2026 (Zprávy / Skupiny / Volání); the
  // earlier Lidé / Místnosti tabs were a previous design, not a regression.
  it('renders the messenger tabs', () => {
    cy.visibleText().then((text) => {
      const missing = ['Zprávy', 'Skupiny', 'Volání'].filter((t) => !text.includes(t));
      expect(missing, 'messenger tabs present').to.deep.equal([]);
    });
  });

  it('renders a conversation list with an explicit empty state', () => {
    cy.visibleText().should('include', 'Žádné konverzace');
  });

  it('prompts the reader to pick a conversation', () => {
    cy.visibleText().should('include', 'Vyberte konverzaci');
  });

  it('has a top-level heading describing the page', () => {
    cy.get('h1').should('exist');
  });

  it('exposes a message composer once a conversation is open', () => {
    // No conversation exists in this deployment's fixture data, so the
    // composer cannot be reached. Recorded rather than skipped silently: this
    // is the module's core interaction and it is currently unverifiable.
    note(
      M.id,
      M.path,
      'coverage-gap',
      'v nasazení není žádná konverzace — kompozitor, odeslání ani příjem nejsou otestované',
    );
  });
});
