import { note } from '../../support/findings';
import { refuseCookieBanner } from '../../support/observe';
import {
  assertRealPage,
  cookieBannerShown,
  decentToggle,
  horizontalOverflow,
  Journey,
  overflowingElements,
  VIEWPORTS,
} from '../../support/scenario';

/**
 * A visitor on a phone (390×844, an ordinary modern handset).
 *
 * Until this spec the whole suite ran at 1280×800 — and for a community most
 * of whose visitors browse on a phone, often somewhere they would rather not
 * be seen doing it, that left the most common way in untested.
 *
 * Asserted: the cookie banner can be closed, and no page scrolls sideways
 * (a page wider than the screen is the classic mobile layout failure). The
 * sign-in link, the language menu and the decent-mode toggle must be reachable.
 */
const ROUTES = ['/', '/login', '/register', '/wall', '/faq'] as const;

describe('Scénář — návštěvník na telefonu', () => {
  beforeEach(() => {
    cy.viewport(VIEWPORTS.phone[0], VIEWPORTS.phone[1]);
  });

  it('projde veřejné stránky bez vodorovného posouvání', () => {
    const visit = new Journey('návštěvník na telefonu');
    const overflow: Record<string, number> = {};
    cy.clearCookies();
    cy.clearLocalStorage();

    visit.step('otevře úvodní stránku a zavře cookie lištu křížkem', () => {
      cy.visit('/', { failOnStatusCode: false });
      cy.wait(2500);
      refuseCookieBanner();
      cy.document().then((doc) => expect(cookieBannerShown(doc), 'cookie banner after ✕ on a phone').to.equal(false));
    });

    visit.step('vidí odkaz Přihlásit se a menu Jazyk', () => {
      cy.get('a[href="/login"]').filter(':visible').should('have.length.at.least', 1);
      cy.get('button[aria-label="Jazyk"]').filter(':visible').first().click();
      cy.get('[role="menuitem"], [role="menuitemradio"], [role="option"]').filter(':visible').should('have.length.at.least', 2);
      cy.get('body').type('{esc}');
    });

    visit.step('dostane se k přepínači slušného režimu', () => {
      decentToggle().scrollIntoView().should('be.visible');
    });

    for (const route of ROUTES) {
      visit.step(`změří šířku ${route}`, () => {
        cy.visit(route, { failOnStatusCode: false });
        assertRealPage();
        cy.wait(2500);
        cy.window().then((win) => {
          const px = horizontalOverflow(win);
          overflow[route] = px;
          if (px > 0) {
            note('scenarios', route, 'mobile-overflow', `na 390 px šířky se stránka posouvá do strany o ${px} px (${overflowingElements(win).join(', ')})`);
          }
        });
      });
    }

    visit.finish({ horizontalOverflowPx: overflow });
    // Asserted once at the end, so one wide page does not hide the others.
    cy.then(() => {
      const wide = Object.entries(overflow).filter(([, px]) => px > 0).map(([r, px]) => `${r} (+${px}px)`);
      expect(wide, 'pages wider than a 390px screen').to.deep.equal([]);
    });
  });
});
