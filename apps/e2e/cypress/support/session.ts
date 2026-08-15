import { hasCredentials } from './auth';
import type { ModuleRoute } from './routes';

/**
 * Prepare a module page for assertions, skipping when it cannot be reached.
 *
 * Call from a `beforeEach(function () { ... })` — a `function`, not an arrow,
 * because `this.skip()` needs Mocha's context.
 *
 * A skipped test is reported as pending. That is the point: a module behind a
 * login wall with no test account is *uncovered*, and the run should say so
 * rather than quietly asserting against the login page and going green.
 */
export function openModule(context: Mocha.Context, module: ModuleRoute, path?: string): void {
  const route = path ?? module.path;

  if (module.requiresAuth === true) {
    if (!hasCredentials()) {
      context.skip();
      return;
    }
    cy.login();
  }

  cy.visitModule(route, { module: module.id });
  cy.settle(module.id, route);
}
