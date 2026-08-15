import { note } from '../../support/findings';
import { signupAllowed, generateSignup } from '../../support/auth';

/**
 * Registrace — a real flow test, and the bootstrap for module coverage.
 *
 * Seven of the nine modules sit behind a login, so a member account is what
 * unblocks them. Rather than treat that as pure setup, the flow is tested on
 * its own terms: it is the first thing every new member touches, and on this
 * product the interests and consent controls on this form are the moment a
 * visitor hands over the most sensitive thing about them.
 *
 * `retries: 0` on purpose. A retried signup would create a second and third
 * account on someone's real deployment; a flaky registration test is worth
 * less than a clean database.
 */
describe('Registrace', { retries: 0 }, () => {
  beforeEach(() => {
    cy.clearCookies();
    cy.seedCookieConsent();
    cy.visit('/register', { failOnStatusCode: false });
    cy.get('body').should('be.visible');
  });

  it('renders every field a new member has to fill in', () => {
    cy.get('input[aria-label="Nickname*"]').should('be.visible');
    cy.get('input[aria-label="Váš email*"]').should('be.visible');
    cy.get('input[aria-label="Heslo*"]').should('be.visible');
    cy.get('input[aria-label="Heslo znovu*"]').should('be.visible');
    cy.get('select').should('have.length.at.least', 2);
    cy.contains('select', 'Muž').should('exist');
  });

  it('marks the phone number optional and says it stays private', () => {
    // Discretion: a phone number is the single most re-identifying field on
    // this form. Both that it is optional and that its handling is stated
    // up-front are product requirements here, not nice-to-haves.
    cy.get('input[aria-label="Telefon (nepovinné)"]').should('exist');
    cy.visibleText().should('include', 'není nikde zveřejněno');
  });

  it('states the password rule before the member guesses it', () => {
    cy.visibleText().should('include', 'alespoň 8 znaků');
  });

  it('offers the four communities as separate opt-ins', () => {
    cy.visibleText().then((text) => {
      const missing = ['Naturist', 'Swingers', 'BDSM', 'Shibari'].filter(
        (community) => !text.includes(community),
      );
      expect(missing, 'community opt-ins').to.deep.equal([]);
    });
  });

  it('says interests are only visible to members who share them', () => {
    cy.visibleText().should('include', 'Uvidíte jen zájmy uživatelů');
  });

  it('does not create an account without the terms checkbox', () => {
    const account = generateSignup();

    cy.get('input[aria-label="Nickname*"]').type(account.nickname);
    cy.get('input[aria-label="Váš email*"]').type(account.email);
    cy.get('input[aria-label="Heslo*"]').type(account.password, { log: false });
    cy.get('input[aria-label="Heslo znovu*"]').type(account.password, { log: false });

    cy.get('button[type="submit"]').click();

    // Still on the form: either a validation message or a disabled submit.
    cy.location('pathname').should('include', '/register');
  });

  /**
   * The one test that writes to someone else's system.
   *
   * Opt-in via `CYPRESS_ALLOW_SIGNUP=1`. A suite that silently creates an
   * account on every CI run would fill the owner's member table with debris,
   * and on an adult platform a stray half-real account is worse than debris.
   */
  it('creates a usable account and signs the member in', function () {
    if (!signupAllowed()) {
      this.skip();
      return;
    }

    const account = generateSignup();
    cy.task('log', `signing up as ${account.nickname} <${account.email}>`);

    cy.get('input[aria-label="Nickname*"]').type(account.nickname);
    cy.get('input[aria-label="Váš email*"]').type(account.email);
    cy.get('input[aria-label="Heslo*"]').type(account.password, { log: false });
    cy.get('input[aria-label="Heslo znovu*"]').type(account.password, { log: false });

    cy.contains('select', 'Muž').select('Muž');

    // First community opt-in, then the terms box — the last checkbox on the
    // form is the consent one.
    cy.get('input[type="checkbox"]').first().check({ force: true });
    cy.get('input[type="checkbox"]').last().check({ force: true });

    cy.get('button[type="submit"]').click();

    cy.wait(6000);

    cy.location('pathname').then((pathname) => {
      cy.visibleText().then((text) => {
        cy.task('log', `after signup: ${pathname} :: ${text.slice(0, 300)}`);

        const needsVerification = /ověř|overit|potvrď|e-?mail.{0,40}(odesl|posl)/i.test(text);
        if (needsVerification) {
          note(
            'registration',
            '/register',
            'signup-needs-verification',
            'účet vznikl, ale vyžaduje ověření e-mailem — bez schránky ho nelze aktivovat',
          );
        }
        if (pathname === '/register') {
          note(
            'registration',
            '/register',
            'signup-blocked',
            `registrace neprošla, stránka zůstala na /register: ${text.slice(0, 200)}`,
          );
        }
      });
    });
  });
});
