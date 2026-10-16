/// <reference types="cypress" />

import { recordFinding } from '../../support/findings';
import { contentKind, cookieKinds, requestFieldNames, safeLoginAction, statusClass } from '../../support/liveContract';

const MODULE = 'live-contract';
const ROUTE = 'swingerslife.cz';
const SYNTHETIC_IDENTIFIER = 'libertin_contract_probe_nonexistent_20261016';
const SYNTHETIC_PASSWORD = 'contract-probe-invalid-password';
const IDENTIFIER_SELECTOR =
  'input:not([type="hidden"]):not([type="password"]):not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"])';

function record(kind: string, detail: string): void {
  recordFinding({ module: MODULE, route: ROUTE, kind, detail });
}

function unobscured(element: HTMLElement): boolean {
  if (element.matches(':disabled') || !Cypress.$(element).is(':visible')) return false;
  const rect = element.getBoundingClientRect();
  const hit = element.ownerDocument.elementFromPoint(
    rect.left + rect.width / 2, rect.top + rect.height / 2,
  );
  return hit !== null && (hit === element || element.contains(hit));
}

function availableLoginForm($passwords: JQuery<HTMLElement>): HTMLFormElement | undefined {
  for (const element of $passwords.toArray().reverse()) {
    const password = element as HTMLInputElement;
    const form = password.form;
    if (form === null || !unobscured(password)) continue;
    if (Array.from(form.querySelectorAll<HTMLInputElement>(IDENTIFIER_SELECTOR)).some(unobscured)) {
      return form;
    }
  }
  return undefined;
}

function cookieControl($passwords: JQuery<HTMLElement>): HTMLElement | undefined {
  for (const input of $passwords.toArray()) {
    if (!Cypress.$(input).is(':visible')) continue;
    const rect = input.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    let panel: Element | null = input.ownerDocument.elementFromPoint(x, y);
    if (panel === null || panel === input) continue;
    // Follow only the actual blocker ancestry, not all buttons on the page.
    // Stop before reaching a common ancestor that also contains the login.
    while (panel !== null && panel !== input.ownerDocument.body && !panel.contains(input)) {
      const text = panel.textContent ?? '';
      if (/cookie|cookies|soubory cookie/i.test(text) && !/plnolet|starší.*18|over.*18/i.test(text)) {
        const buttons = Array.from(panel.querySelectorAll<HTMLElement>('button, [role="button"]'))
          .filter(unobscured);
        const label = (button: HTMLElement): string =>
          (button.getAttribute('aria-label') || button.getAttribute('title') || button.textContent || '')
            .replace(/\s+/g, ' ').trim();
        const close = buttons.filter((button) => /zavřít|close|dismiss/i.test(label(button)));
        if (close.length === 1) return close[0];
        const reject = buttons.filter((button) =>
          /^(odmítnout vše|odmítnout všechny|odmítnout volitelné cookies|pouze nezbytné|jen nezbytné|reject all|necessary only)$/i.test(label(button)),
        );
        if (reject.length === 1) return reject[0];
      }
      panel = panel.parentElement;
    }
  }
  return undefined;
}

function dismissCookieOverlay(): void {
  cy.get('input[type="password"]', { log: false })
    .should(($passwords) => {
      if (availableLoginForm($passwords) === undefined && cookieControl($passwords) === undefined) {
        throw new Error('Login is blocked and no unambiguous cookie close/reject control is available.');
      }
    })
    .then(($passwords) => {
      const control = cookieControl($passwords);
      if (control !== undefined) {
        // Real UI interaction only. No force, DOM removal, storage seeding,
        // accept-all control or automated age assertion.
        cy.wrap(control, { log: false }).click({ log: false });
        cy.then({ log: false }, () => { record('login-cookie-overlay', 'dismissed_via_visible_control'); });
      }
    });
}

function loginForm(): Cypress.Chainable<HTMLFormElement> {
  return cy.get('input[type="password"]', { log: false })
    .should(($passwords) => {
      if (availableLoginForm($passwords) === undefined) {
        throw new Error('No unobscured login form is available after cookie handling.');
      }
    })
    .then(($passwords) => {
      const form = availableLoginForm($passwords);
      if (form === undefined) throw new Error('Login form changed before interaction.');
      return form;
    });
}

function containsProbe(value: unknown): boolean {
  if (typeof value === 'string') {
    const text = value.trim();
    if (text.startsWith('{')) {
      try { return containsProbe(JSON.parse(text) as unknown); } catch { return false; }
    }
    return Array.from(new URLSearchParams(text).values()).some((item) => item === SYNTHETIC_IDENTIFIER);
  }
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    return Object.values(value as Record<string, unknown>).some((item) => item === SYNTHETIC_IDENTIFIER);
  }
  return false;
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
    // Structural inspection needs no click or consent interaction.
    cy.get('input[type="password"]', { log: false }).first().then(($password) => {
      const password = $password.get(0) as HTMLInputElement | undefined;
      const form = password?.form;
      if (form === undefined || form === null) throw new Error('No login form found for structural inspection.');
      const fields = Array.from(form.querySelectorAll('input'))
        .map((input) => input.name).filter((name) => name.length > 0).sort();
      const origin = form.ownerDocument.location.origin;
      record('login-form', [
        `method=${form.method.toUpperCase()}`,
        `action=${safeLoginAction(form.action, origin)}`,
        `enctype=${form.enctype || 'unspecified'}`,
        `fields=[${fields.join(',')}]`,
        `csrf_field=${fields.some((field) => /csrf|xsrf|_token/i.test(field)) ? 'present' : 'absent'}`,
      ].join(' '));
    });
    cy.getCookies({ log: false }).then((cookies) => {
      const kinds = cookieKinds(cookies.map((cookie) => cookie.name));
      record('login-cookies-before', `kinds=[${kinds.join(',')}] count=${cookies.length}`);
    });
  });

  it('observes one invalid synthetic login request without exposing request values', () => {
    cy.visit('/login', { failOnStatusCode: false, log: false });
    dismissCookieOverlay();
    loginForm().then((form) => {
      const origin = form.ownerDocument.location.origin;
      if (new URL(form.action, origin).origin !== origin) {
        throw new Error('Refusing synthetic login probe because the form action is cross-origin.');
      }
      cy.intercept(`${origin}/**`, (req) => {
        if (!containsProbe(req.body) && !containsProbe(req.query)) return;
        req.alias = 'invalidLogin';
        const bodyFields = requestFieldNames(req.body);
        const queryFields = Object.keys(req.query ?? {}).sort();
        const action = safeLoginAction(req.url, origin);
        req.continue((res) => {
          record('invalid-login-network', [
            `method=${req.method.toUpperCase()}`, `action=${action}`,
            `request=${contentKind(req.headers['content-type'])}`,
            `body_fields=[${bodyFields.join(',')}]`, `query_fields=[${queryFields.join(',')}]`,
            `status=${statusClass(res.statusCode)}`, `response=${contentKind(res.headers['content-type'])}`,
          ].join(' '));
        });
      });
      const identifier = Array.from(form.querySelectorAll<HTMLInputElement>(IDENTIFIER_SELECTOR)).find(unobscured);
      const password = Array.from(form.querySelectorAll<HTMLInputElement>('input[type="password"]')).find(unobscured);
      if (identifier === undefined || password === undefined) throw new Error('Login inputs became unavailable.');
      cy.wrap(identifier, { log: false }).clear({ log: false });
      cy.wrap(identifier, { log: false }).type(SYNTHETIC_IDENTIFIER, { log: false });
      cy.wrap(password, { log: false }).clear({ log: false });
      cy.wrap(password, { log: false }).type(SYNTHETIC_PASSWORD, { log: false });
      cy.then({ log: false }, () => {
        const submitter = Array.from(form.querySelectorAll<HTMLElement>(
          'button:not([type]), button[type="submit"], input[type="submit"]',
        )).find(unobscured);
        if (submitter === undefined) throw new Error('No available login submit control found.');
        cy.wrap(submitter, { log: false }).click({ log: false });
      });
    });
    cy.wait('@invalidLogin', { log: false }).then((interception) => {
      if (interception.response === undefined) throw new Error('The synthetic login request did not receive an HTTP response.');
    });
    cy.getCookies({ log: false }).then((cookies) => {
      const kinds = cookieKinds(cookies.map((cookie) => cookie.name));
      record('login-cookies-after', `kinds=[${kinds.join(',')}] count=${cookies.length}`);
    });
  });
});
