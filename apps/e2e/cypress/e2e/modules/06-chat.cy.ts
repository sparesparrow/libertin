import { MODULES } from '../../support/routes';
import { openModule } from '../../support/session';
import { note } from '../../support/findings';

const M = MODULES.chat;

describe(`Modul: ${M.label} (${M.path})`, () => {
  beforeEach(function () {
    openModule(this, M);
  });

  it('renders the chat heading', () => {
    cy.contains('h1', 'Chatujte s přáteli online').should('be.visible');
  });

  it('renders the chat tabs', () => {
    cy.visibleText().then((text) => {
      const missing = ['Chat', 'Místnosti', 'Nejaktivnější', 'Pravidla'].filter(
        (t) => !text.includes(t),
      );
      expect(missing, 'chat tabs present').to.deep.equal([]);
    });
  });

  it('offers a create-room action', () => {
    cy.contains('Vytvořit').should('be.visible');
  });

  it('resolves the room list instead of loading forever', () => {
    cy.visibleText().then((text) => {
      const settled =
        !text.includes('Načítání') || text.includes('Zatím') || text.includes('Žádn');
      if (!settled) {
        note(M.id, M.path, 'stuck-loading', 'room list never resolved');
      }
      expect(settled, 'room list resolved').to.equal(true);
    });
  });

  it('routes into an individual room', () => {
    cy.visitModule('/chat/cypress-probe', { module: M.id });
    cy.get('h1.next-error-h1').should('not.exist');
  });
});
