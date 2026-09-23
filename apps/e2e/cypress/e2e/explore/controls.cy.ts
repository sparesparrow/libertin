import { accessibleName, observe, refuseCookieBanner } from '../../support/observe';

/**
 * Inventory of every visible control on the public pages.
 *
 * This is how "Zapnout slušný režim" and the language button were discovered:
 * neither is in the module registry, and the language button has no visible
 * text at all, so no text-based check could have found it. An inventory shows
 * what is actually there, including controls nobody thought to test.
 *
 * Only public, signed-out pages: the member-facing pages contain other
 * people's names, and an inventory has no business copying them.
 */
const ROUTES = ['/', '/login', '/register'] as const;

describe('Průzkum — ovládací prvky', () => {
  for (const route of ROUTES) {
    it(`inventura ${route}`, () => {
      cy.clearCookies();
      cy.clearLocalStorage();
      cy.visit(route, { failOnStatusCode: false });
      cy.wait(2500);

      // Before the banner is closed: what covers the page? A modal that blocks
      // everything is a different first impression from a bar at the bottom.
      cy.window()
        .then((win) => {
          const top = win.document.elementFromPoint(win.innerWidth / 2, win.innerHeight / 2);
          const modal = win.document.querySelector('[role="dialog"], dialog[open], [aria-modal="true"]');
          return {
            topmostAtCentre: top ? `${top.tagName.toLowerCase()}${top.id ? `#${top.id}` : ''}` : null,
            dialogMarkedUp: modal !== null,
          };
        })
        .then((data) => observe('controls', route, 'first-paint overlay', data));

      refuseCookieBanner(route);
      cy.wait(500);

      cy.window()
        .then((win) => {
          const controls = Array.from(
            win.document.querySelectorAll('button, a[href], [role="button"], [role="switch"], [role="menuitem"], input, select'),
          ).filter((el) => (el as HTMLElement).offsetParent !== null);

          const rows = controls.map((el) => ({
            tag: el.tagName.toLowerCase(),
            name: accessibleName(el),
            role: el.getAttribute('role'),
            pressed: el.getAttribute('aria-pressed'),
            expanded: el.getAttribute('aria-expanded'),
            href: el.getAttribute('href'),
          }));
          return {
            total: rows.length,
            // A control with no accessible name is announced as just "button".
            unnamed: rows.filter((r) => r.name === '').length,
            toggles: rows.filter((r) => r.pressed !== null),
            controls: rows,
          };
        })
        .then((data) => observe('controls', route, 'visible controls', data));
    });
  }
});
