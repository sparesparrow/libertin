import { cookieShape, observe, refuseCookieBanner, storageShape } from '../../support/observe';
import { countBlurredElements, isBlurred, isShown, memberPhotos } from '../../support/visual';

/**
 * Decent mode ("slušný režim"), off versus on, on each page that matters.
 *
 * The first look at this measured only whether `<img>` elements carried a
 * filter, found none, and nearly concluded the mode did nothing. The blur is
 * applied to wrapper elements, so this counts blurred elements anywhere in the
 * tree, and separately counts member photos and how many of them stay sharp —
 * counts only, never their URLs.
 *
 * The mode is switched on by clicking the footer toggle, the way a visitor
 * would, rather than by planting the cookie: that also records what the
 * toggle stores.
 */

const ROUTES = ['/', '/wall'] as const;
const TOGGLE = /slušný režim/i;

function measure(win: Window) {
  const photos = memberPhotos(win.document).filter((img) => isShown(img, win));
  return {
    blurredElements: countBlurredElements(win.document, win),
    visibleImages: Array.from(win.document.querySelectorAll('img')).filter((i) => isShown(i, win)).length,
    memberPhotosShown: photos.length,
    memberPhotosUnblurred: photos.filter((img) => !isBlurred(img, win)).length,
    toggle: Array.from(win.document.querySelectorAll('button'))
      .filter((b) => TOGGLE.test(b.textContent ?? ''))
      .map((b) => ({ label: (b.textContent ?? '').trim(), pressed: b.getAttribute('aria-pressed') }))[0] ?? null,
  };
}

describe('Průzkum — slušný režim', () => {
  for (const route of ROUTES) {
    it(`vypnuto vs. zapnuto na ${route}`, () => {
      cy.clearCookies();
      cy.clearLocalStorage();
      cy.visit(route, { failOnStatusCode: false });
      cy.wait(3000);
      refuseCookieBanner();
      cy.wait(500);

      let off: ReturnType<typeof measure> | null = null;
      cy.window().then((win) => {
        off = measure(win);
      });

      cy.get('body').then(($body) => {
        const toggle = $body.find('button:visible').toArray().find((b) => TOGGLE.test(b.textContent ?? ''));
        if (!toggle) {
          observe('decent-mode', route, 'off vs on', { toggleFound: false, off });
          return;
        }
        cy.wrap(toggle).click();
        cy.wait(1000);
        cy.window()
          .then((win) => ({ cookies: cookieShape(win.document), storage: storageShape(win) }))
          .then((stored) => {
            cy.reload();
            cy.wait(3000);
            refuseCookieBanner();
            cy.wait(500);
            cy.window().then((win) => {
              observe('decent-mode', route, 'off vs on', { toggleFound: true, off, on: measure(win), stored });
            });
          });
      });
    });
  }
});
