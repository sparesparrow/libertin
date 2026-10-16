/// <reference types="cypress" />

import { recordFinding } from '../../support/findings';
import { cookieKinds, safeLoginAction } from '../../support/liveContract';

const MODULE = 'live-contract';
const ROUTE = 'swingerslife.cz';

function record(kind: string, detail: string): void {
  recordFinding({ module: MODULE, route: ROUTE, kind, detail });
}

describe('swingerslife.cz public contract discovery', () => {
  before(() => {
    const baseUrl = Cypress.config('baseUrl');
    if (baseUrl === null || new URL(baseUrl).origin !== 'https://swingerslife.cz') {
      throw new Error('Live contract discovery must target https://swingerslife.cz explicitly.');
    }
  });

  it('records the public login form structure without submitting credentials', () => {
    cy.visit('/login', { failOnStatusCode: false, log: false });
    cy.get('input[type="password"]', { log: false })
      .first()
      .then(($password) => {
        const form = $password[0].form;
        if (form === null) throw new Error('Login password input is not inside a form.');

        const fields = [...form.querySelectorAll('input')]
          .map((input) => input.name)
          .filter((name) => name.length > 0)
          .sort();
        const origin = form.ownerDocument.location.origin;
        const csrf = fields.some((field) => /csrf|xsrf|_token/i.test(field));

        record(
          'login-form',
          [
            `method=${form.method.toUpperCase()}`,
            `action=${safeLoginAction(form.action, origin)}`,
            `enctype=${form.enctype || 'unspecified'}`,
            `fields=[${fields.join(',')}]`,
            `csrf_field=${csrf ? 'present' : 'absent'}`,
          ].join(' '),
        );
      });

    cy.getCookies({ log: false }).then((cookies) => {
      const kinds = cookieKinds(cookies.map((cookie) => cookie.name));
      record('login-cookies', `kinds=[${kinds.join(',')}] count=${cookies.length}`);
    });
  });
});
