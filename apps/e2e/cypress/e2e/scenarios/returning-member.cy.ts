import { hasCredentials, NO_CREDENTIALS_REASON, testPassword, testUsername } from '../../support/auth';
import { refuseCookieBanner } from '../../support/observe';
import { MODULES } from '../../support/routes';
import { clickNamed, Journey, WRITES } from '../../support/scenario';

/**
 * A returning member: signs in, looks around, signs out — and then someone
 * else presses Back on the same browser.
 *
 * That last step is the one this scenario exists for. On a shared or borrowed
 * device, "I signed out" has to mean the next person cannot page back into
 * the member's messages from the browser's history.
 *
 * Posts nothing and messages no one: every write except sign-in and sign-out
 * is stopped by the guard, and a stopped write fails the run. Skips without a
 * test account (`CYPRESS_TEST_USERNAME` / `CYPRESS_TEST_PASSWORD`), which must
 * be a throwaway with no real personal data (D-009).
 */
const LOGOUT = /^(odhlásit( se)?|log ?out|sign ?out)$/i;

describe('Scénář — vracející se člen', () => {
  it('přihlásí se, projde web, odhlásí se — a tlačítko Zpět už nic neukáže', function () {
    if (!hasCredentials()) {
      cy.log(NO_CREDENTIALS_REASON);
      this.skip();
      return;
    }
    const visit = new Journey('vracející se člen', [WRITES.login, WRITES.logout]);
    cy.clearCookies();
    cy.clearLocalStorage();

    visit.step('přihlásí se formulářem', () => {
      cy.visit('/login', { failOnStatusCode: false });
      cy.wait(2000);
      refuseCookieBanner();
      cy.get('input[aria-label="Vaše uživatelské jméno"]').type(testUsername() ?? '', { log: false });
      cy.get('input[aria-label="Heslo"]').type(testPassword() ?? '', { log: false });
      cy.get('button[type="submit"]').click();
      cy.location('pathname', { timeout: 25_000 }).should('not.equal', '/login');
      cy.dismissNetworkModal();
    });

    visit.step('prohlédne si zeď', () => {
      cy.visit(MODULES.wall.path);
      cy.contains(MODULES.wall.marker).should('exist');
    });

    visit.step('otevře Lidi', () => {
      cy.visit(MODULES.profiles.path);
      cy.location('pathname').should('equal', MODULES.profiles.path);
    });

    visit.step('otevře zprávy', () => {
      cy.visit(MODULES.bog.path);
      cy.location('pathname').should('equal', MODULES.bog.path);
      cy.contains(MODULES.bog.marker).should('exist');
    });

    visit.step('odhlásí se', () => {
      cy.get('body').then(($body) => {
        const direct = $body.find('a:visible, button:visible').toArray().some((el) => LOGOUT.test((el.textContent ?? '').trim()));
        if (!direct) {
          // Sign-out usually lives in the account menu; open it first.
          cy.get('button[aria-haspopup], button[aria-expanded]').filter(':visible').last().click();
        }
      });
      cy.get('a, button').filter(':visible').filter((_, el) => LOGOUT.test((el.textContent ?? '').trim())).first().click();
      cy.location('pathname', { timeout: 15_000 }).should('match', /^\/(login)?$/);
    });

    visit.step('někdo jiný stiskne Zpět — zprávy se neukážou', () => {
      cy.go('back');
      cy.location('pathname', { timeout: 15_000 }).should('equal', '/login');
      cy.visibleText().should('not.include', MODULES.bog.marker);
    });

    visit.finish();
  });
});
