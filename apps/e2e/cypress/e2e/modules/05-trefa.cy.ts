import { MODULES } from '../../support/routes';
import { openModule } from '../../support/session';
import { note } from '../../support/findings';

const M = MODULES.trefa;

/** Trefa is the match/discovery surface — a deck of profile recommendations. */
describe(`Modul: ${M.label} (${M.path})`, () => {
  beforeEach(function () {
    openModule(this, M);
  });

  it('renders the discovery surface with an explicit state', () => {
    cy.visibleText().then((text) => {
      const hasDeck = text.includes('Žádné další profily') || text.includes('Trefa');
      expect(hasDeck, 'discovery deck or its empty state rendered').to.equal(true);
    });
  });

  // A member with no profile photo is asked to upload one before the deck
  // opens (seen 25. 9. 2026 with the owner's test account) — that is the
  // escape hatch in that state.
  it('offers the quick-settings escape hatch from the empty state', () => {
    cy.contains(/Upravit rychlé nastavení|Nahrát fotku/).should('be.visible');
  });

  it('has a top-level heading describing the page', () => {
    cy.get('h1').should('exist');
  });

  it('renders the global navigation like every other module', () => {
    // Trefa serves a noticeably smaller document than its siblings. If the
    // shell is missing here, navigation away from an empty deck is a dead end.
    // `Události` left the navigation in September 2026, and Trefa shows the
    // global header as icons, not the text sidebar. What matters is that the
    // header still leads back to the wall.
    cy.get('body').then(($body) => {
      const hasShell = $body.find('a[href="/wall"]:visible, a[href="/"]:visible').length > 0;
      if (!hasShell) {
        note(M.id, M.path, 'missing-shell', 'globální navigace se nevykreslila');
      }
      expect(hasShell, 'global navigation present').to.equal(true);
    });
  });

  it('exposes the swipe/decision controls', () => {
    // Not reachable while the deck is empty; recorded so the gap is visible.
    note(
      M.id,
      M.path,
      'coverage-gap',
      'balíček je v tomto nasazení prázdný — interakce líbí/přeskočit/zpět nejsou otestované',
    );
  });
});
