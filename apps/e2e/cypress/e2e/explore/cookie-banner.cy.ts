import { TRACKER_HOSTS, cookieShape, observe, storageShape } from '../../support/observe';

/**
 * What each way out of the cookie banner actually does.
 *
 * The banner's labels do not say what happens: its ✕ turned out to be a
 * working refusal, which a label-reading check had reported as missing. So
 * each action is clicked on a fresh visit and its effects are recorded —
 * cookies set (names only), storage written, trackers loaded, and whether the
 * choice is remembered on the next page view.
 *
 * "Upravit" is recorded separately: what it offers, and whether any optional
 * category is ticked before the visitor touches it. Pre-ticked consent is not
 * consent under GDPR, so that default is worth knowing exactly.
 */

interface Action {
  readonly label: string;
  readonly find: (el: HTMLElement) => boolean;
}

const ACTIONS: readonly Action[] = [
  { label: 'zavřít (✕)', find: (b) => /^(zavřít|close)$/i.test(b.getAttribute('aria-label') ?? '') },
  { label: 'Povolit vše', find: (b) => /^povolit vše$/i.test((b.textContent ?? '').trim()) },
];

describe('Průzkum — cookie lišta', () => {
  for (const action of ACTIONS) {
    it(`akce: ${action.label}`, () => {
      const trackers = new Set<string>();
      cy.clearCookies();
      cy.clearLocalStorage();
      cy.intercept('**/*', (req) => {
        if (TRACKER_HOSTS.test(req.url)) trackers.add(new URL(req.url).host);
      });
      cy.visit('/', { failOnStatusCode: false });
      cy.wait(2500);

      let trackersBeforeChoice: string[] = [];
      cy.then(() => {
        trackersBeforeChoice = [...trackers];
      });

      cy.get('body').then(($body) => {
        const button = $body.find('button:visible').toArray().find(action.find);
        if (!button) {
          observe('cookie-banner', '/', `action ${action.label}`, { present: false });
          return;
        }
        cy.wrap(button).click();
        cy.wait(2000);
        cy.window()
          .then((win) => ({
            present: true,
            trackersBeforeChoice,
            trackersAfter: [...trackers],
            cookies: cookieShape(win.document),
            storage: storageShape(win),
          }))
          .then((after) => {
            cy.reload();
            cy.wait(2000);
            cy.get('body').then(($reloaded) => {
              const askedAgain = $reloaded
                .find('button:visible')
                .toArray()
                .some((b) => /povolit vše/i.test((b.textContent ?? '').trim()));
              observe('cookie-banner', '/', `action ${action.label}`, {
                ...after,
                trackersAfterReload: [...trackers],
                bannerAskedAgainAfterReload: askedAgain,
              });
            });
          });
      });
    });
  }

  it('nabídka „Upravit“', () => {
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.visit('/', { failOnStatusCode: false });
    cy.wait(2500);
    cy.get('body').then(($body) => {
      const edit = $body
        .find('button:visible')
        .toArray()
        .find((b) => /^upravit$/i.test((b.textContent ?? '').trim()));
      if (!edit) {
        observe('cookie-banner', '/', 'settings', { present: false });
        return;
      }
      cy.wrap(edit).click();
      cy.wait(1000);
      cy.window()
        .then((win) => {
          const switches = Array.from(
            win.document.querySelectorAll('input[type="checkbox"], [role="switch"]'),
          ).filter((el) => (el as HTMLElement).offsetParent !== null || el.getAttribute('role') === 'switch');
          const categories = switches.map((el) => {
            const input = el as HTMLInputElement;
            const label =
              el.getAttribute('aria-label') ??
              (input.id ? win.document.querySelector(`label[for="${input.id}"]`)?.textContent : null) ??
              el.closest('label, li, div')?.textContent ??
              '';
            return {
              label: label.replace(/\s+/g, ' ').trim().slice(0, 60),
              checkedByDefault: input.checked ?? el.getAttribute('aria-checked') === 'true',
              disabled: input.disabled ?? el.getAttribute('aria-disabled') === 'true',
            };
          });
          const buttons = Array.from(win.document.querySelectorAll('button'))
            .filter((b) => (b as HTMLElement).offsetParent !== null)
            .map((b) => (b.textContent ?? '').trim() || b.getAttribute('aria-label') || '')
            .filter((t) => t.length > 0 && t.length <= 40);
          return { present: true, categories, buttons };
        })
        .then((data) => observe('cookie-banner', '/', 'settings', data));
    });
  });
});
