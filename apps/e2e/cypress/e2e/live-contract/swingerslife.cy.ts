/// <reference types="cypress" />

import { recordFinding } from '../../support/findings';
import {
  contentKind,
  cookieKinds,
  requestFieldNames,
  safeLoginAction,
  statusClass,
} from '../../support/liveContract';

const MODULE = 'live-contract';
const ROUTE = 'swingerslife.cz';
const SYNTHETIC_IDENTIFIER = 'libertin_contract_probe_nonexistent_20261016';
const SYNTHETIC_PASSWORD = 'contract-probe-invalid-password';

function record(kind: string, detail: string): void {
  recordFinding({ module: MODULE, route: ROUTE, kind, detail });
}

function loginFormFromPassword($password: JQuery<HTMLElement>): HTMLFormElement {
  const passwordInput = $password.get(0) as HTMLInputElement | undefined;
  if (passwordInput === undefined) throw new Error('Login password input was not found.');
  const form = passwordInput.form;
  if (form === null) throw new Error('Login password input is not inside a form.');
  return form;
}

function visibleIdentifier(form: HTMLFormElement): HTMLInputElement {
  const input = form.querySelector<HTMLInputElement>(
    'input:not([type="hidden"]):not([type="password"]):not([type="checkbox"]):not([type="submit"]):not([type="button"])',
  );
  if (input === null) throw new Error('No visible login identifier input was found.');
  return input;
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
        const form = loginFormFromPassword($password);
        const fields = Array.from(form.querySelectorAll('input'))
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
      record('login-cookies-before', `kinds=[${kinds.join(',')}] count=${cookies.length}`);
    });
  });

  it('observes one invalid synthetic login request without exposing request values', () => {
    cy.visit('/login', { failOnStatusCode: false, log: false });
    cy.get('input[type="password"]', { log: false })
      .first()
      .then(($password) => {
        const form = loginFormFromPassword($password);
        const origin = form.ownerDocument.location.origin;
        const action = new URL(form.action, origin);

        if (form.method.toUpperCase() !== 'POST') {
          throw new Error(`Refusing synthetic login probe because form method is ${form.method}.`);
        }
        if (action.origin !== origin) {
          throw new Error('Refusing synthetic login probe because the form action is cross-origin.');
        }

        cy.intercept('POST', action.href, (req) => {
          const requestKind = contentKind(req.headers['content-type']);
          const fields = requestFieldNames(req.body);
          req.continue((res) => {
            record(
              'invalid-login-network',
              [
                `method=${req.method.toUpperCase()}`,
                `action=${safeLoginAction(action.href, origin)}`,
                `request=${requestKind}`,
                `fields=[${fields.join(',')}]`,
                `status=${statusClass(res.statusCode)}`,
                `response=${contentKind(res.headers['content-type'])}`,
              ].join(' '),
            );
          });
        }).as('invalidLogin');

        cy.wrap(visibleIdentifier(form), { log: false })
          .clear({ log: false })
          .type(SYNTHETIC_IDENTIFIER, { log: false });
        cy.wrap($password, { log: false })
          .clear({ log: false })
          .type(SYNTHETIC_PASSWORD, { log: false });
        cy.wrap(form, { log: false }).submit({ log: false });
      });

    cy.wait('@invalidLogin', { log: false });
    cy.getCookies({ log: false }).then((cookies) => {
      const kinds = cookieKinds(cookies.map((cookie) => cookie.name));
      record('login-cookies-after', `kinds=[${kinds.join(',')}] count=${cookies.length}`);
    });
  });
});
