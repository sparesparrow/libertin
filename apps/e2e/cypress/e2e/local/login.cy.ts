/**
 * Login flow of the repo's own client, running against the MSW mocks.
 *
 * Everything here must work with no backend: `packages/api` intercepts the
 * calls, which is the whole point of the snapshot-locked client.
 */

describe('Přihlášení (apps/web, MSW)', () => {
  beforeEach(() => {
    cy.clearCookies();
    cy.setCookie('libertin.age', '1');
    cy.visit('/login');
  });

  it('renders the login form from i18n keys', () => {
    cy.contains('Přihlášení').should('be.visible');
    cy.contains('E-mail').should('be.visible');
    cy.contains('Heslo').should('be.visible');
    cy.contains('Přihlásit se').should('be.visible');
  });

  it('labels every input, so the form is usable on a screen reader', () => {
    cy.get('input').each(($input) => {
      const id = $input.attr('id');
      const labelled = $input.attr('aria-label') ?? $input.attr('aria-labelledby');
      if (id) {
        cy.get(`label[for="${id}"]`).should('exist');
      } else {
        expect(labelled, `input ${$input.attr('name') ?? '(unnamed)'} has an accessible name`).to
          .not.be.undefined;
      }
    });
  });

  it('uses the correct input types for email and password', () => {
    cy.get('input[type="email"]').should('exist');
    cy.get('input[type="password"]').should('exist');
  });

  it('never reflects the password into the DOM as plain text', () => {
    const password = 'cypress-secret-value';
    cy.get('input[type="password"]').type(password, { log: false });
    cy.get('body').then(($body) => {
      const clone = $body.clone();
      clone.find('script, style').remove();
      expect(clone.text(), 'rendered page text').to.not.include(password);
    });
  });

  it('offers the forgotten-password route with corrected Czech', () => {
    // "Zapomenuté", not "Zapomenute" — the typo CLAUDE.md forbids reintroducing.
    cy.contains('Zapomenuté heslo').should('exist');
    cy.get('body').should('not.contain.text', 'Zapomenute heslo');
  });

  it('signs in and leaves the login page', () => {
    // Stubbed here rather than leaning on MSW. `MswProvider` starts the worker
    // only when `NODE_ENV === 'development'`, and this suite runs against
    // `next start` — a production build, which is the thing worth testing.
    // Without a stub the form would call the real api.libertin.cz and hang.
    cy.intercept('POST', '**/auth/login', {
      statusCode: 200,
      body: {
        token: 'cypress-token',
        expiresIn: 600,
        user: {
          id: 'a1b2c3d4-0000-0000-0000-000000000001',
          email: 'member@example.com',
          verified: true,
          role: 'member',
          displayName: 'Jan Novák',
          avatar: null,
          twoFactorEnabled: false,
        },
      },
    }).as('login');

    cy.get('input[type="email"]').type('member@example.com');
    cy.get('input[type="password"]').type('correct-horse');
    cy.contains('button', 'Přihlásit se').click();

    cy.wait('@login');
    cy.location('pathname', { timeout: 15_000 }).should('not.equal', '/login');
  });

  it('shows an error message when the API rejects the credentials', () => {
    cy.intercept('POST', '**/auth/login', { statusCode: 401, body: { message: 'nope' } }).as(
      'login',
    );
    cy.get('input[type="email"]').type('member@example.com');
    cy.get('input[type="password"]').type('wrong');
    cy.contains('button', 'Přihlásit se').click();
    cy.wait('@login');
    cy.contains('Nastala chyba').should('be.visible');
  });
});
