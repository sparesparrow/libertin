import { refuseCookieBanner } from '../../support/observe';
import { clickNamed, Journey, WRITES } from '../../support/scenario';

/**
 * A member who forgot their password.
 *
 * Submits for real: the owner approved real submissions for this form. The
 * address is on `example.com` (RFC 2606), which can belong to no one and can
 * never receive the mail, and one run sends exactly one request — `retries: 0`
 * so a flaky run cannot send three.
 *
 * Measured on 2026-09-24: the link on /login swaps the form in place (no route
 * change), the request is `POST api.libertin.app/api/auth/forgot-password`
 * with a JSON body `{ email }`, answered 201.
 *
 * Asserted, beyond "it works":
 *  - the address travels in the request body, never in a URL — URLs end up in
 *    browser history, proxy logs and analytics;
 *  - the answer does not say whether an account exists. On this platform
 *    "is this email registered?" is exactly the question an abusive partner
 *    or an employer would like answered.
 */
describe('Scénář — zapomenuté heslo', { retries: 0 }, () => {
  it('požádá o odkaz a nedozví se, jestli účet existuje', () => {
    const visit = new Journey('člen, který zapomněl heslo', [WRITES.forgotPassword]);
    const address = `cypress-e2e+forgot-${Date.now().toString(36)}@example.com`;
    cy.clearCookies();
    cy.clearLocalStorage();

    visit.step('přijde na přihlášení', () => {
      cy.visit('/login', { failOnStatusCode: false });
      cy.wait(2000);
      refuseCookieBanner();
    });

    visit.step('klikne na Zapomenuté heslo', () => {
      clickNamed('button', /^zapomenuté heslo$/i);
      cy.get('input[type="email"]').filter(':visible').should('have.length', 1);
    });

    visit.step('zadá e-mail a pošle odkaz', () => {
      cy.get('input[type="email"]').filter(':visible').type(address, { log: false });
      clickNamed('button', /^poslat odkaz$/i);
    });

    visit.step('dostane neutrální potvrzení', () => {
      cy.contains(/pokud u nás účet/i, { timeout: 10_000 }).should('be.visible');
      cy.visibleText().then((text) => {
        expect(text, 'the answer reveals whether the account exists').to.not.match(/neexistuje|nenalezen|není registrov|not found|does not exist/i);
      });
    });

    visit.step('adresa nikdy není v URL', () => {
      cy.location('href').then((href) => {
        expect(href.includes(address) || href.includes(encodeURIComponent(address)), 'address in the page URL').to.equal(false);
      });
      cy.then(() => {
        const sent = visit.writesFor(WRITES.forgotPassword);
        expect(sent, 'forgot-password requests in one visit').to.have.length(1);
        expect(sent[0]?.status, 'forgot-password answer').to.be.within(200, 299);
        expect(sent[0]?.bodyFields, 'forgot-password body fields').to.deep.equal(['email']);
        expect(sent[0]?.queryKeys, 'query parameters on the request').to.deep.equal([]);
      });
    });

    visit.finish();
  });
});
