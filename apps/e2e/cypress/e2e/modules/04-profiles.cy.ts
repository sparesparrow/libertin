import { MODULES } from '../../support/routes';
import { openModule } from '../../support/session';
import { note } from '../../support/findings';

const M = MODULES.profiles;

describe(`Modul: ${M.label} (${M.path})`, () => {
  describe('Adresář lidí', () => {
    beforeEach(function () {
      openModule(this, M);
    });

    it('renders the directory heading', () => {
      cy.contains('h1', 'Lidé').should('be.visible');
    });

    it('offers a filter control', () => {
      cy.contains('Zobrazit filtr').should('be.visible');
    });

    it('resolves the directory into profiles or an empty state', () => {
      cy.visibleText().then((text) => {
        const settled =
          !text.includes('Načítám') || text.includes('Zatím') || text.includes('Žádn');
        if (!settled) {
          note(M.id, M.path, 'stuck-loading', 'adresář lidí se nikdy nedonačetl');
        }
        expect(settled, 'directory resolved').to.equal(true);
      });
    });
  });

  describe('Vlastní profil', () => {
    it('renders the profile page rather than a shell', () => {
      cy.visitModule('/profile', { module: M.id });
      cy.settle(M.id, '/profile');
      cy.visibleText().should('have.length.greaterThan', 200);
    });
  });

  for (const [route, label] of [
    ['/profile/friends', 'Přátelé'],
    ['/profile/favorites', 'Oblíbení'],
  ] as const) {
    it(`${label} (${route}) renders its own section`, () => {
      cy.visitModule(route, { module: M.id });
      cy.settle(M.id, route);
      cy.get('h1.next-error-h1').should('not.exist');
      cy.visibleText().should('have.length.greaterThan', 200);
    });
  }

  it('renders a profile detail for a dynamic id', () => {
    // `/profile/[id]` is a catch-all under `/profile`, so an unknown id is not
    // distinguishable from a real one by routing alone. If it renders the same
    // page for nonsense, that is a defect worth naming.
    cy.visitModule('/profile/does-not-exist-cypress', { module: M.id });
    cy.settle(M.id, '/profile/[id]');
    cy.visibleText().then((text) => {
      const handled =
        text.includes('nenalezen') ||
        text.includes('Nenalezen') ||
        text.includes('neexistuje') ||
        text.includes('Žádn');
      if (!handled) {
        note(
          M.id,
          '/profile/[id]',
          'missing-empty-state',
          'neznámé id profilu se vykreslí bez stavu "nenalezeno"',
        );
      }
    });
  });
});
