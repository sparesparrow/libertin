import { hasCredentials } from '../../support/auth';
import { note } from '../../support/findings';
import { MODULES } from '../../support/routes';
import { openModule } from '../../support/session';

const M = MODULES.wall;

/** Feed filters the member wall renders as its primary control row. */
const FILTERS = ['Vše', 'Od přátel', 'Co sleduji', 'S foto', 'S video'] as const;

/**
 * The wall is the one module with two genuinely different faces: a signed-out
 * visitor gets a guest panel, a member gets the feed. Both are asserted —
 * the guest view is what most first-time visitors actually see, and it carries
 * the product's conversion message.
 */
describe(`Modul: ${M.label} (${M.path})`, () => {
  describe('Host (nepřihlášený)', () => {
    beforeEach(() => {
      cy.clearCookies();
      cy.visitModule(M.path, { module: M.id });
      cy.settle(M.id, M.path);
    });

    it('says plainly that the visitor is browsing as a guest', () => {
      cy.visibleText().should('include', 'jako host');
    });

    it('explains what signing up unlocks', () => {
      cy.visibleText().should('include', 'Zaregistrujte se');
    });

    it('has a top-level heading describing the page', () => {
      cy.get('h1').should('exist');
    });

    it('does not show member-only composing to a guest', () => {
      // If the composer is on screen without an account, either the gate leaks
      // or the guest is about to hit an error they cannot act on.
      cy.get('body').then(($body) => {
        const visible = $body.find(':visible').text().includes('Vytvořit příběh');
        if (visible) {
          note(M.id, M.path, 'guest-gate', 'kompozitor příběhů je viditelný nepřihlášenému návštěvníkovi');
        }
        expect(visible, 'story composer visible to a guest').to.equal(false);
      });
    });
  });

  describe('Člen (přihlášený)', () => {
    beforeEach(function () {
      if (!hasCredentials()) this.skip();
      openModule(this, M);
    });

    it('renders the story rail with a create-story affordance', () => {
      cy.contains('Vytvořit příběh').should('be.visible');
    });

    it('renders every feed filter', () => {
      cy.visibleText().then((text) => {
        const missing = FILTERS.filter((filter) => !text.includes(filter));
        expect(missing, 'feed filters present').to.deep.equal([]);
      });
    });

    it('resolves the feed into either posts or an explicit empty state', () => {
      cy.visibleText().then((text) => {
        const settled =
          !text.includes('Načítám') || text.includes('Zatím') || text.includes('Žádné');
        if (!settled) {
          note(M.id, M.path, 'stuck-loading', 'feed nikdy neopustil stav načítání');
        }
        expect(settled, 'feed resolved to content or an empty state').to.equal(true);
      });
    });
  });
});
