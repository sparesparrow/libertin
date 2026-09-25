import { ALL_MODULES } from '../../support/routes';
import { openModule } from '../../support/session';
import { note } from '../../support/findings';

/**
 * The global shell is asserted here, once, across every module — so that a
 * regression in the shared navigation is reported as one shell failure instead
 * of nine module failures pointing at the wrong owner.
 */

/*
 * Primary navigation: only what is structural rather than fashionable — home,
 * and a way to the wall. `Události` used to be expected and is gone since the
 * nav was reworked to Trefa / Marketplace / Skupinový chat; that is a product
 * decision, not a defect.
 */

describe('Shell — globální navigace a patička', () => {
  for (const module of ALL_MODULES) {
    describe(module.label, () => {
      beforeEach(function () {
        openModule(this, module);
      });

      // The guest homepage names the wall "Objevujte", not "Zeď" (measured
      // 25. 9. 2026), so the structural check is a visible link to /wall,
      // whatever it is called; "Domů" is still asserted by name.
      it('renders the primary navigation', () => {
        cy.get('body').then(($body) => {
          const text = $body.find('a:visible').toArray().map((a) => (a.textContent ?? '').trim());
          const hrefs = $body.find('a:visible').toArray().map((a) => a.getAttribute('href') ?? '');
          const missing = [
            ...(text.includes('Domů') ? [] : ['Domů']),
            ...(hrefs.includes('/wall') ? [] : ['odkaz na /wall']),
          ];
          expect(missing, 'primary navigation items').to.deep.equal([]);
        });
      });

      // "Kontaktovat podporu" appears only in some footers; others say
      // "Napište nám" (→ /kontakt). Either is a support contact.
      it('renders the footer with a support contact', () => {
        cy.visibleText().should('match', /Kontaktovat podporu|Napište nám/);
      });

      it('declares the document language', () => {
        cy.get('html').should('have.attr', 'lang');
      });

      it('renders exactly one h1', () => {
        // Queried through `body` on purpose. `cy.get('h1')` throws when there
        // is no match, so the `.then` never runs and the finding is never
        // recorded — the run reports a bare timeout and loses the one number
        // that explains it. Asking the body for its h1 elements yields an
        // empty set instead, so zero is reportable.
        cy.get('body').then(($body) => {
          const $h1 = $body.find('h1');
          if ($h1.length !== 1) {
            note(
              module.id,
              module.path,
              'a11y-heading',
              `očekáván právě jeden h1, nalezeno ${$h1.length}`,
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
          note('shell', '/wall', 'duplicate-label', `"${label}" vykreslen dvakrát za sebou`);
        }
        expect(found, 'labels rendered twice in a row').to.deep.equal([]);
      });
    });
  });
});
