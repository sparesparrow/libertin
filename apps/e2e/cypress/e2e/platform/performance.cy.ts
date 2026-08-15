import { ALL_MODULES } from '../../support/routes';
import { openModule } from '../../support/session';
import { note } from '../../support/findings';

/**
 * C12.1 — "UI response ≤ 1,5 s under peak load".
 *
 * Read the numbers this spec produces for what they are. Cypress drives one
 * browser from one machine with no concurrency, so this is a *single-user*
 * measurement: it can prove a page is already too slow with nobody on it, but
 * it cannot prove the contract is met. Peak-load acceptance stays with the k6
 * harness in `perf/k6` (backlog E11-T4 / E11-T4b).
 *
 * The budget is deliberately failed loudly rather than recorded quietly: a
 * page that misses it with a single user will not recover under load.
 */

interface Timing {
  readonly ttfbMs: number;
  readonly domContentLoadedMs: number;
  readonly loadMs: number;
}

function measure(): Cypress.Chainable<Timing> {
  return cy.navigationTiming().then((entry) => ({
    ttfbMs: Math.round(entry.responseStart - entry.startTime),
    domContentLoadedMs: Math.round(entry.domContentLoadedEventEnd - entry.startTime),
    loadMs: Math.round(entry.loadEventEnd - entry.startTime),
  }));
}

describe('Výkon — rozpočet C12.1 (≤ 1,5 s, jeden uživatel)', () => {
  const budgetMs = Number(Cypress.env('responseBudgetMs') ?? 1500);

  for (const module of ALL_MODULES) {
    it(`${module.label} (${module.path}) se načte do ${budgetMs} ms`, function () {
      // Warm the route first. A cold serverless invocation is a real cost, but
      // it is a deployment property, not the page's rendering cost, and mixing
      // the two produces a number nobody can act on.
      openModule(this, module);
      cy.visitModule(module.path, { module: module.id });

      // Three steps, not one. `cy.task` is queued, so a synchronous `expect` in
      // the same callback tears the queue down before the measurement is ever
      // printed — and a perf failure with no number in the log is useless.
      measure()
        .then((timing) => {
          if (timing.loadMs > budgetMs) {
            note(
              module.id,
              module.path,
              'perf-budget',
              `načtení ${timing.loadMs} ms překračuje rozpočet ${budgetMs} ms (ttfb ${timing.ttfbMs} ms)`,
            );
          }
          cy.task(
            'log',
            `${module.label.padEnd(24)} ttfb=${timing.ttfbMs}ms dcl=${timing.domContentLoadedMs}ms load=${timing.loadMs}ms`,
          );
          return timing;
        })
        .then((timing) => {
          expect(timing.loadMs, `load time for ${module.path}`).to.be.at.most(budgetMs);
        });
    });
  }
});
