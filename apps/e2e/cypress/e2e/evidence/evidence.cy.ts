import { hasCredentials } from '../../support/auth';

/**
 * Evidence capture — screenshots that back each finding in
 * `docs/e2e-findings-2026-08-15.md`.
 *
 * Separate from the assertion specs on purpose. A failure screenshot is taken
 * at the moment a test blew up, which is whatever the runner happened to be
 * looking at; it proves the test failed, not what the problem *is*. These are
 * composed instead: named after the finding they support, cropped to the
 * element that carries it, and taken on a passing path so nothing in frame is
 * an artefact of the failure.
 *
 * Opt-in — `CYPRESS_CAPTURE_EVIDENCE=1` — because it writes images nobody
 * needs on an ordinary verification run.
 *
 * Output: `screenshots/<host>/evidence.cy.ts/<nn-finding-name>.png`
 */

function evidenceEnabled(): boolean {
  return String(Cypress.env('CAPTURE_EVIDENCE') ?? '') === '1';
}

describe('Důkazy k nálezům', { retries: 0 }, () => {
  beforeEach(function () {
    if (!evidenceEnabled()) this.skip();
  });

  it('01 — /wall hostovský pohled (nález 1)', () => {
    cy.clearCookies();
    cy.seedCookieConsent();
    cy.visit('/wall', { failOnStatusCode: false });
    cy.get('body').should('be.visible');
    cy.wait(3000);
    cy.screenshot('01-wall-hostovsky-pohled', { capture: 'viewport' });
  });

  it('02 — rozmazaný cizí obsah je v DOM (nález 1)', () => {
    cy.clearCookies();
    cy.seedCookieConsent();
    cy.visit('/wall', { failOnStatusCode: false });
    cy.wait(3000);
    // The blur is the gate. Outlining it shows how much sits underneath.
    cy.get('[class*="blur"]').then(($el) => {
      $el.each((_, node) => {
        node.setAttribute('style', `${node.getAttribute('style') ?? ''};outline:4px solid #F20B49`);
      });
    });
    cy.screenshot('02-wall-rozmazani-je-jen-css', { capture: 'viewport' });
  });

  it('03 — cookie lišta bez odmítnutí (nález 3)', () => {
    cy.clearCookies();
    cy.visit('/', { failOnStatusCode: false });
    cy.get('body').should('be.visible');
    cy.wait(3000);
    cy.screenshot('03-cookie-lista-bez-odmitnuti', { capture: 'viewport' });
  });

  it('04 — patička s překlepy (nález 4)', () => {
    cy.seedCookieConsent();
    cy.visit('/', { failOnStatusCode: false });
    cy.wait(2000);
    cy.contains('Zapomenute heslo').scrollIntoView();
    cy.contains('Zapomenute heslo')
      .parents('footer,div')
      .first()
      .screenshot('04-paticka-zapomenute-ucet');
  });

  it('05 — registrace přijme slabé heslo (nález 5)', () => {
    cy.seedCookieConsent();
    cy.visit('/register', { failOnStatusCode: false });
    cy.wait(2000);
    cy.get('input[aria-label="Heslo*"]').type('123456789');
    cy.get('input[aria-label="Heslo znovu*"]').type('123456789');
    // Unmask, so the image carries the actual value instead of nine dots —
    // evidence a reader cannot check for themselves is not evidence.
    cy.get('button[aria-label="Zobrazit heslo"]').each(($b) => {
      cy.wrap($b).click({ force: true });
    });
    cy.contains('alespoň 8 znaků').scrollIntoView();
    cy.screenshot('05-registrace-slabe-heslo', { capture: 'viewport' });
  });

  it('06 — Lorem ipsum na homepage (nález 6)', () => {
    cy.seedCookieConsent();
    cy.visit('/', { failOnStatusCode: false });
    cy.wait(2500);
    cy.contains('Lorem ipsum').scrollIntoView();
    cy.screenshot('06-homepage-lorem-ipsum', { capture: 'viewport' });
  });

  it('07 — /media bez alt textů (nález 8)', function () {
    if (!hasCredentials()) this.skip();
    cy.login();
    cy.seedCookieConsent();
    cy.visit('/media', { failOnStatusCode: false });
    cy.wait(4000);
    cy.dismissNetworkModal();
    cy.wait(1500);
    // Ring every image that a screen reader cannot name.
    cy.get('img').then(($imgs) => {
      $imgs.each((_, img) => {
        if (!img.getAttribute('alt')) {
          img.setAttribute('style', `${img.getAttribute('style') ?? ''};outline:3px solid #F20B49`);
        }
      });
    });
    cy.screenshot('07-media-obrazky-bez-alt', { capture: 'viewport' });
  });

  it('07b — modál „nenámé sítě" po přihlášení (překlep + překryv)', function () {
    if (!hasCredentials()) this.skip();
    cy.login();
    cy.seedCookieConsent();
    cy.visit('/media', { failOnStatusCode: false });
    cy.wait(4000);
    // Captured before dismissing: the modal is both the typo and an overlay
    // that blocks the page a member just navigated to.
    cy.screenshot('07b-modal-nenamé-site', { capture: 'viewport' });
  });

  it('08 — neznámé id profilu (nález 9)', function () {
    if (!hasCredentials()) this.skip();
    cy.login();
    cy.seedCookieConsent();
    cy.visit('/profile/tento-profil-neexistuje', { failOnStatusCode: false });
    cy.wait(4000);
    cy.dismissNetworkModal();
    cy.wait(1000);
    cy.screenshot('08-profil-nezname-id', { capture: 'viewport' });
  });

  it('09 — /verify-email tvrdí, že ověření je nutné (nález o session)', function () {
    if (!hasCredentials()) this.skip();
    cy.login();
    cy.seedCookieConsent();
    cy.visit('/verify-email', { failOnStatusCode: false });
    cy.wait(3000);
    cy.screenshot('09-verify-email-nevymahano', { capture: 'viewport' });
  });
});
