import { generateSignup, signupAllowed } from '../../support/auth';
import { note } from '../../support/findings';
import { observe, refuseCookieBanner } from '../../support/observe';
import { clickNamed, Journey, WRITES } from '../../support/scenario';

/**
 * A new member signing up.
 *
 * Measured on 2026-09-24 (`explore/form-submissions.cy.ts`): the form sends
 * `POST api.libertin.app/api/auth/register` with a JSON body of `username`,
 * `email`, `password`, `gender`, `interests`, and blocks the submit until
 * *both* consent boxes are ticked — terms, and the 18+ / content declaration.
 *
 * Two visits, because the two outcomes need two different servers:
 *  - the server is down (simulated here, nothing reaches production): the
 *    visitor must be told, and must not lose what they typed;
 *  - the server accepts: a real account, **only with `CYPRESS_ALLOW_SIGNUP=1`**.
 *    CI leaves that unset. Created nicknames go into the run report so the
 *    owner can delete them; passwords never go anywhere.
 *
 * `retries: 0`: a retried real signup is a second account.
 */
function fillForm(account: ReturnType<typeof generateSignup>): void {
  cy.get('input[aria-label="Nickname*"]').type(account.nickname);
  cy.get('input[aria-label="Váš email*"]').type(account.email, { log: false });
  cy.get('input[aria-label="Heslo*"]').type(account.password, { log: false });
  cy.get('input[aria-label="Heslo znovu*"]').type(account.password, { log: false });
  cy.get('select[aria-label="Vyber pohlaví*"]').select('Žena');
  cy.get('label').filter((_, l) => /^(naturist|shibari)$/i.test((l.textContent ?? '').trim())).find('input[type="checkbox"]').check({ force: true });
  cy.get('label').filter((_, l) => /souhlasím/i.test(l.textContent ?? '')).find('input[type="checkbox"]').check({ force: true });
}

function arrive(visit: Journey): void {
  visit.step('z úvodní stránky přes Přihlásit se na záložku Registrace', () => {
    cy.visit('/', { failOnStatusCode: false });
    cy.wait(2000);
    refuseCookieBanner();
    clickNamed('a', /^přihlásit se$/i);
    clickNamed('a', /^registrace$/i);
    cy.location('pathname').should('equal', '/register');
  });
}

describe('Scénář — nový člen se registruje', { retries: 0 }, () => {
  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
  });

  it('server registraci nepřijme — návštěvník se to dozví a nepřijde o vyplněné údaje', () => {
    const visit = new Journey('nový člen, výpadek serveru', [
      { ...WRITES.register, stub: { statusCode: 503, body: { message: 'Service Unavailable' } } },
    ]);
    const account = generateSignup();
    arrive(visit);

    visit.step('vyplní formulář, telefon vynechá', () => {
      fillForm(account);
    });

    visit.step('odešle', () => {
      cy.get('button[type="submit"]').filter(':visible').click();
    });

    visit.step('dozví se, že registrace neprošla', () => {
      cy.contains(/registrace se nezdařila|zkuste to znovu|nepodařilo/i, { timeout: 10_000 }).should('be.visible');
      cy.location('pathname').should('equal', '/register');
    });

    visit.step('vyplněné údaje zůstaly, heslo ani e-mail nejsou v URL', () => {
      cy.get('input[aria-label="Nickname*"]').should('have.value', account.nickname);
      cy.get('input[aria-label="Váš email*"]').should('have.value', account.email);
      cy.location('href').then((href) => {
        expect(href.includes(account.password), 'password in the URL').to.equal(false);
        expect(href.includes(encodeURIComponent(account.email)) || href.includes(account.email), 'email in the URL').to.equal(false);
      });
    });

    visit.step('požadavek nesl jen očekávaná pole', () => {
      cy.then(() => {
        const [sent] = visit.writesFor(WRITES.register);
        expect(sent?.outcome, 'register request (stubbed)').to.equal('stubbed');
        expect(sent?.queryKeys, 'query parameters').to.deep.equal([]);
        const fields = sent?.bodyFields ?? [];
        // No phone was entered, so none may be sent — not even an empty one.
        expect(fields.filter((f) => /phone|tel/i.test(f)), 'phone fields sent without a phone').to.deep.equal([]);
        if (!fields.some((f) => /consent|terms|agree|souhlas|adult|age/i.test(f))) {
          note(
            'scenarios',
            '/register',
            'consent-not-sent',
            `požadavek na registraci nenese souhlas s VOP ani prohlášení 18+ (pole: ${fields.join(', ')}); pokud je server nezaznamenává sám, nemá provozovatel doklad o souhlasu (GDPR čl. 7 odst. 1)`,
          );
        }
      });
    });

    visit.finish();
  });

  it('server registraci přijme — skutečný účet (jen s CYPRESS_ALLOW_SIGNUP=1)', function () {
    if (!signupAllowed()) {
      this.skip();
      return;
    }
    const visit = new Journey('nový člen, skutečná registrace', [WRITES.register, WRITES.login]);
    const account = generateSignup();
    arrive(visit);

    visit.step('vyplní formulář a odešle', () => {
      fillForm(account);
      cy.get('button[type="submit"]').filter(':visible').click();
      cy.wait(6000);
    });

    visit.step('server účet založil', () => {
      cy.then(() => {
        const [sent] = visit.writesFor(WRITES.register);
        // Reported before asserting, so the owner learns about the account
        // even if the assertion below fails.
        observe('scenarios', '/register', 'account created by this run — delete it', {
          nickname: account.nickname,
          email: account.email,
          status: sent?.status ?? null,
        });
        note('scenarios', '/register', 'created-account', `běh založil testovací účet ${account.nickname} — smazat`);
        expect(sent?.status, 'register answer').to.be.within(200, 299);
      });
      cy.location('href').should('not.include', account.password);
    });

    visit.finish();
  });
});
