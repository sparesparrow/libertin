import { MODULES } from '../../support/routes';
import { openModule } from '../../support/session';
import { note } from '../../support/findings';

const M = MODULES.marketplace;

describe(`Modul: ${M.label} (${M.path})`, () => {
  beforeEach(function () {
    openModule(this, M);
  });

  it('renders the marketplace heading', () => {
    cy.contains('h1', 'Marketplace').should('be.visible');
  });

  it('renders the seller and buyer entry points', () => {
    cy.visibleText().then((text) => {
      const missing = ['Objednávky', 'Můj marketplace', 'Nový inzerát'].filter(
        (t) => !text.includes(t),
      );
      expect(missing, 'marketplace actions present').to.deep.equal([]);
    });
  });

  it('renders the listing browse controls', () => {
    cy.visibleText().then((text) => {
      const missing = ['Dnešní výběr', 'Prohlížet vše', 'Uložené'].filter(
        (t) => !text.includes(t),
      );
      expect(missing, 'browse controls present').to.deep.equal([]);
    });
  });

  it('resolves the listing grid instead of loading forever', () => {
    cy.visibleText().then((text) => {
      const settled =
        !text.includes('Načítám') || text.includes('Zatím') || text.includes('Žádn');
      if (!settled) {
        note(M.id, M.path, 'stuck-loading', 'listing grid never resolved');
      }
      expect(settled, 'listing grid resolved').to.equal(true);
    });
  });

  it('routes into a listing detail', () => {
    cy.visitModule('/marketplace/cypress-probe', { module: M.id });
    cy.get('h1.next-error-h1').should('not.exist');
  });
});
