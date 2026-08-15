/// <reference types="cypress" />

import 'cypress-axe';
import './commands';
import { isIgnorable, pushRuntimeError, resetRuntimeErrors } from './errors';
import { drainFindings } from './findings';

function stringify(value: unknown): string {
  if (value instanceof Error) return `${value.name}: ${value.message}`;
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

beforeEach(() => {
  resetRuntimeErrors();
});

/**
 * Flush buffered findings to the Node process.
 *
 * In `afterEach` on purpose: it runs whether the test passed or failed, so the
 * detail behind a failure survives the failure. Sending each finding at the
 * point it is noticed does not — see `support/findings.ts`.
 */
afterEach(() => {
  const findings = drainFindings();
  if (findings.length === 0) return;
  cy.task('recordFindings', findings, { log: false });
});

Cypress.on('window:before:load', (win) => {
  const originalError = win.console.error.bind(win.console);

  win.console.error = (...args: unknown[]): void => {
    const message = args.map(stringify).join(' ');
    if (!isIgnorable(message)) {
      pushRuntimeError({ type: 'console.error', message });
    }
    originalError(...args);
  };

  win.addEventListener('unhandledrejection', (event) => {
    const message = stringify(event.reason);
    if (!isIgnorable(message)) {
      pushRuntimeError({ type: 'unhandledrejection', message });
    }
  });
});

/**
 * Collect rather than abort. Returning false keeps the spec running so the
 * page's other assertions still produce signal; the runtime-errors spec is
 * where an exception becomes a failure.
 */
Cypress.on('uncaught:exception', (err) => {
  if (!isIgnorable(err.message)) {
    pushRuntimeError({ type: 'uncaught', message: `${err.name}: ${err.message}` });
  }
  return false;
});
