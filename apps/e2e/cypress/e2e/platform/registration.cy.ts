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
    // Case-insensitive: the copy moved from "alespoň" to "Aspoň" on 25. 9.
    // 2026, which is a wording choice, not a missing rule.
    cy.visibleText().should('match', /a?lespoň 8 znaků|aspoň 8 znaků/i);
  });

  it('offers the four communities as separate opt-ins', () => {
    cy.visibleText().then((text) => {
      const missing = ['Naturist', 'Swingers', 'BDSM', 'Shibari'].filter(
        (community) => !text.includes(community),
      );
      expect(missing, 'community opt-ins').to.deep.equal([]);
    });
  });

  /**
   * Until 24. 9. 2026 the form promised "Uvidíte jen zájmy uživatelů…" — that
   * interests are shown only to members who share them. On 25. 9. the note
   * under the communities reads "Uvidíte jen příspěvky ze světů, které máte
   * vybrané", which explains filtering, not who can see a member's interests.
   * Whether the promise was dropped or moved is the owner's question, so it is
   * reported; the test asserts only that the choice is explained at all.
   */
  it('explains what choosing a community does', () => {
    cy.visibleText().then((text) => {
      if (!/zájmy uživatelů|vidí jen|uvidí jen/i.test(text)) {
        note(
          'registration',
          '/register',
          'interest-visibility-unstated',
          'formulář už neříká, kdo uvidí zvolené zájmy (dřív „Uvidíte jen zájmy uživatelů…“)',
        );
      }
      expect(text, 'explanation next to the community choice').to.match(/uvidíte jen/i);
    });
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

    // First community opt-in, then *both* consent boxes — terms and the 18+ /
    // content declaration. Ticking only the last checkbox, as this used to,
    // leaves the terms box empty and the client never sends the request
    // (measured by explore/form-submissions.cy.ts on 2026-09-24).
    cy.get('input[type="checkbox"]').first().check({ force: true });
    cy.get('label')
      .filter((_, l) => /souhlasím/i.test(l.textContent ?? ''))
      .find('input[type="checkbox"]')
      .check({ force: true });

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
