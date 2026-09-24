/**
 * Journeys through this repo's own client (`apps/web`) — the merge gate's
 * counterpart to `cypress/e2e/scenarios/`, which run against the deployment.
 *
 * The other local specs check one page each. These follow a visitor from the
 * age gate to a signed-in state, so a regression that only shows between pages
 * (the gate forgetting consent on a client-side navigation, a card linking
 * nowhere, a failed login leaving the form unusable) fails the gate.
 *
 * The API is stubbed per test: `MswProvider` runs only in development, and this
 * suite runs against `next start`.
 */

const MEMBER = {
  token: 'cypress-token',
  expiresIn: 600,
  user: {
    id: 'a1b2c3d4-0000-0000-0000-000000000001',
    email: 'member@example.com',
    verified: true,
    role: 'member',
    displayName: 'Test Member',
    avatar: null,
    twoFactorEnabled: false,
  },
};

describe('Cesty návštěvníka (apps/web)', () => {
  beforeEach(() => {
    cy.clearCookies();
  });

  it('brána → úvod → karta komunity → chybné heslo → správné heslo', () => {
    let attempts = 0;
    cy.intercept('POST', '**/auth/login', (req) => {
      attempts += 1;
      if (attempts === 1) req.reply({ statusCode: 401, body: { message: 'invalid' } });
      else req.reply({ statusCode: 200, body: MEMBER });
    }).as('login');

    cy.visit('/');
    cy.contains('Je mi 18+, vstoupit').click();
    cy.contains('Naše komunity').should('be.visible');

    // Every community card leads to sign-in; follow the first one.
    cy.get('section[aria-labelledby="categories-heading"] a').first().click();
    cy.location('pathname').should('equal', '/login');
    // Consent survived the client-side navigation: no second gate.
    cy.contains('Je vám 18 nebo více let?').should('not.exist');

    cy.get('input[type="email"]').type('member@example.com');
    cy.get('input[type="password"]').type('wrong');
    cy.contains('button', 'Přihlásit se').click();
    cy.wait('@login');
    cy.contains('Nastala chyba').should('be.visible');

    // The form stays usable after a refusal: correct the password, retry.
    cy.get('input[type="email"]').should('have.value', 'member@example.com');
    cy.get('input[type="password"]').clear().type('correct-horse');
    cy.contains('button', 'Přihlásit se').click();
    cy.wait('@login');
    cy.location('pathname', { timeout: 15_000 }).should('not.equal', '/login');
    cy.then(() => expect(attempts, 'login requests').to.equal(2));
  });

  it('bránu projde i návštěvník jen s klávesnicí', () => {
    cy.visit('/');
    const tabTo = (n: number): void => {
      cy.press(Cypress.Keyboard.Keys.TAB);
      cy.focused().then(($el) => {
        if (/18\+/.test($el.text())) return;
        if (n >= 15) throw new Error('gate button not reachable with Tab in 15 presses');
        tabTo(n + 1);
      });
    };
    tabTo(0);
    // Space, not Enter: `cy.press(Enter)` does not activate buttons (see
    // scenarios/keyboard-only.cy.ts).
    cy.press(Cypress.Keyboard.Keys.SPACE);
    cy.contains('Naše komunity').should('be.visible');
  });

  it('úvod i přihlášení se vejdou na telefon bez vodorovného posouvání', () => {
    cy.viewport(390, 844);
    cy.setCookie('libertin.age', '1');
    for (const path of ['/', '/login']) {
      cy.visit(path);
      cy.window().then((win) => {
        const overflow = win.document.documentElement.scrollWidth - win.innerWidth;
        expect(overflow, `horizontal overflow on ${path} at 390px`).to.be.at.most(0);
      });
    }
  });
});
