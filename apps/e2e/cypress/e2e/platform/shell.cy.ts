import { ALL_MODULES } from '../../support/routes';
import { openModule } from '../../support/session';
import { note } from '../../support/findings';

/**
 * The global shell is asserted here, once, across every module — so that a
 * regression in the shared navigation is reported as one shell failure instead
 * of nine module failures pointing at the wrong owner.
 */

const PRIMARY_NAV = ['Domů', 'Zeď', 'Události'] as const;

describe('Shell — globální navigace a patička', () => {
  for (const module of ALL_MODULES) {
    describe(module.label, () => {
      beforeEach(function () {
        openModule(this, module);
      });

      it('renders the primary navigation', () => {
        cy.visibleText().then((text) => {
          const missing = PRIMARY_NAV.filter((item) => !text.includes(item));
          expect(missing, 'primary navigation items').to.deep.equal([]);
        });
      });

      it('renders the footer with a support contact', () => {
        cy.visibleText().should('include', 'Kontaktovat podporu');
      });

      it('declares the document language', () => {
        cy.get('html').should('have.attr', 'lang');
      });

      it('renders exactly one h1', () => {
        cy.get('h1').then(($h1) => {
          if ($h1.length !== 1) {
            note(
              module.id,
              module.path,
              'a11y-heading',
              `expected exactly one h1, found ${$h1.length}`,
            );
          }
          expect($h1.length, 'number of h1 elements').to.equal(1);
        });
      });
    });
  }

  describe('Popisky navigace', () => {
    it('does not render a navigation label twice in a row', () => {
      // The rendered nav reads "… Kolekce Kolekce … Komunikace Komunikace …",
      // which is how a group heading looks when it is rendered alongside an
      // identically-named child instead of wrapping it.
      cy.visitModule('/wall', { module: 'shell' });
      cy.visibleText().then((text) => {
        const words = text.split(' ').filter((w) => w.length > 3);
        const repeated = new Set<string>();
        for (let i = 1; i < words.length; i += 1) {
          const previous = words[i - 1];
          const current = words[i];
          if (previous !== undefined && current !== undefined && previous === current) {
            repeated.add(current);
          }
        }
        const found = [...repeated];
        for (const label of found) {
          note('shell', '/wall', 'duplicate-label', `"${label}" rendered twice in a row`);
        }
        expect(found, 'labels rendered twice in a row').to.deep.equal([]);
      });
    });
  });
});
