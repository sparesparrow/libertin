import { note } from '../../support/findings';
import { accessibleName } from '../../support/observe';
import { cookieBannerShown, inCookieBanner, Journey, WRITES } from '../../support/scenario';

/**
 * A keyboard-only visitor — a screen-reader user, or someone with a motor
 * impairment who cannot use a mouse (C1 accessibility, WCAG 2.1.1 / 2.4.7).
 *
 * Uses `cy.press`, which sends real key events through the browser, so focus
 * moves exactly as it would for a person and `:focus-visible` styles apply.
 *
 * Buttons are activated with Space, not Enter. Measured on 2026-09-24:
 * `cy.press(Enter)` activates *no* native button here — not the banner's ✕,
 * and not the "Jazyk" menu button either, which is an ordinary
 * `<button type="button">`. Enter failing on every button at once is the tool
 * (the key event carries no activation), not the site; Space works on both.
 * Reporting it as a site defect would be wrong, so this does not use it.
 *
 * Asserted: the cookie banner can be dismissed without a mouse, the sign-in
 * form can be reached, filled and submitted with the keyboard alone, and the
 * refusal for a wrong password is shown. The one write is a login with a
 * made-up account (401), which creates nothing.
 *
 * Reported: controls that receive focus with no visible indicator. Detecting
 * an indicator from computed styles is a heuristic (a colour change on a
 * border would be missed), so it is not a gate.
 */
const { Keys } = Cypress.Keyboard;
const MAX_TABS = 40;

interface Stop {
  name: string;
  tag: string;
  indicator: boolean;
  inBanner: boolean;
}

function focusStop(win: Window): Stop | null {
  const el = win.document.activeElement;
  if (!el || el === win.document.body) return null;
  const style = win.getComputedStyle(el);
  const outline = style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0;
  const shadow = style.boxShadow !== 'none';
  return { name: accessibleName(el), tag: el.tagName.toLowerCase(), indicator: outline || shadow, inBanner: inCookieBanner(el) };
}

describe('Scénář — návštěvník jen s klávesnicí', () => {
  it('zavře cookie lištu a přihlásí se bez myši', () => {
    const visit = new Journey('návštěvník jen s klávesnicí', [WRITES.login]);
    const order: Stop[] = [];
    cy.clearCookies();
    cy.clearLocalStorage();

    // Tab until `target` has focus, recording every stop on the way.
    const tabTo = (target: (s: Stop) => boolean, what: string, tabs = 0): void => {
      cy.press(Keys.TAB);
      cy.window().then((win) => {
        const stop = focusStop(win);
        if (stop) order.push(stop);
        if (stop && target(stop)) return;
        if (tabs + 1 >= MAX_TABS) throw new Error(`${what}: not reached in ${MAX_TABS} presses of Tab`);
        tabTo(target, what, tabs + 1);
      });
    };

    visit.step('otevře přihlášení', () => {
      cy.visit('/login', { failOnStatusCode: false });
      cy.wait(2500);
      cy.document().then((doc) => expect(cookieBannerShown(doc), 'cookie banner on a first visit').to.equal(true));
    });

    // The login page has its own "Zavřít" too, behind the banner; only the
    // one inside the banner counts.
    visit.step('tabulátorem dojde na ✕ cookie lišty a stiskne mezerník', () => {
      tabTo((s) => s.inBanner && /^(zavřít|close)$/i.test(s.name), 'cookie banner ✕');
      cy.then(() => {
        const behind = order.slice(0, -1).filter((s) => !s.inBanner);
        if (behind.length > 0) {
          note(
            'scenarios',
            '/login',
            'focus-behind-modal',
            `cookie lišta zakrývá stránku, ale fokus jde nejdřív na ${behind.length} prvků pod ní (${behind.map((s) => `"${s.name}"`).join(', ')}) — klávesnicí se pracuje naslepo pod překryvem`,
          );
        }
      });
      cy.press(Keys.SPACE);
      cy.wait(800);
      cy.document().then((doc) => expect(cookieBannerShown(doc), 'cookie banner after Space on ✕').to.equal(false));
    });

    visit.step('tabulátorem dojde na pole pro uživatelské jméno a vyplní ho', () => {
      tabTo((s) => s.tag === 'input' && /uživatelské jméno|username|e-?mail/i.test(s.name), 'username field');
      cy.focused().type(`cyp-nobody-${Date.now().toString(36)}`);
    });

    visit.step('Tab na heslo a vyplní ho', () => {
      cy.press(Keys.TAB);
      cy.focused().should('have.attr', 'type', 'password').type('not-a-real-password-1', { log: false });
    });

    visit.step('odešle Enterem v poli hesla', () => {
      // Implicit form submission from a text field — this one Cypress does
      // perform, unlike activating a button with Enter.
      cy.focused().type('{enter}', { log: false });
      cy.contains(/nesprávný (email|nick) nebo heslo|incorrect/i, { timeout: 10_000 }).should('be.visible');
    });

    visit.step('odmítnutí dostal jako výsledek skutečného odeslání', () => {
      cy.then(() => {
        const logins = visit.writesFor(WRITES.login);
        expect(logins.map((w) => w.status), 'login requests sent by pressing Enter').to.deep.equal([401]);
      });
    });

    visit.finish({ focusOrder: order.map((s) => `${s.tag} "${s.name}"${s.indicator ? '' : ' (bez viditelného fokusu)'}`) });
    cy.then(() => {
      const invisible = [...new Set(order.filter((s) => !s.indicator).map((s) => `${s.tag} "${s.name}"`))];
      if (invisible.length > 0) {
        note('scenarios', '/login', 'focus-not-visible', `fokus bez viditelného ukazatele (WCAG 2.4.7): ${invisible.join(', ')}`);
      }
    });
  });
});
