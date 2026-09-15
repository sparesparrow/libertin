/**
 * Accessibility of this repo's own client, as a merge gate.
 *
 * The platform suite runs axe against the deployed client, which cannot gate
 * anything: it targets a deployment this pipeline does not produce (D-009). The
 * three routes `apps/web` actually serves are deterministic, so they can be
 * held to the standard on every push.
 *
 * Only `serious` and `critical` fail, matching the platform suite's threshold —
 * axe's `moderate` and `minor` findings on a work-in-progress UI are mostly
 * noise, and a suite that cries wolf gets muted.
 */

import type { Result } from 'axe-core';

import { note } from '../../support/findings';

/** Records each violation as a finding; the assertion itself still fails. */
function report(route: string) {
  return (violations: Result[]): void => {
    for (const violation of violations) {
      const first = violation.nodes[0]?.target.join(' ') ?? 'n/a';
      note(
        'apps/web',
        route,
        `a11y-${violation.id}`,
        `${violation.impact ?? 'neznámý'}: ${violation.help} — ${violation.nodes.length} uzlů, první: ${first}`,
      );
    }
  };
}

interface LocalRoute {
  readonly path: string;
  readonly label: string;
  /** The age gate is the one surface a visitor reaches with no consent. */
  readonly needsConsent: boolean;
}

const ROUTES: readonly LocalRoute[] = [
  { path: '/gate', label: 'Věková brána', needsConsent: false },
  { path: '/', label: 'Úvodní stránka', needsConsent: true },
  { path: '/login', label: 'Přihlášení', needsConsent: true },
];

/**
 * Violations that are known, recorded, and waiting on an owner decision.
 *
 * This is a baseline, not an amnesty. Each entry is still reported as a finding
 * on every run, so it cannot go quiet; what it does not do is fail the merge
 * gate on a question a test run has no standing to answer. Anything *not* on
 * this list fails, so the debt can shrink but never silently grow.
 *
 * `color-contrast` on `/`: white on `--color-primary` (#F20B49) measures
 * 4.27:1, under AA's 4.5:1 for normal text — the hero CTA is 18px/600, which is
 * not "large text" by WCAG. The design system already ships the AA-safe
 * raspberry (`--color-primary-text`, #C40A3C → 6.08:1), but seven components
 * render white on the brand fill, so switching is a visible brand change across
 * the product. Recorded as D-010; remove this entry when it is resolved.
 */
const KNOWN_VIOLATIONS: readonly { route: string; ruleId: string }[] = [
  { route: '/', ruleId: 'color-contrast' },
];

function isKnown(route: string, ruleId: string): boolean {
  return KNOWN_VIOLATIONS.some((known) => known.route === route && known.ruleId === ruleId);
}

describe('Přístupnost apps/web — axe (serious + critical)', () => {
  for (const route of ROUTES) {
    it(`${route.label} (${route.path}) nemá závažné přestupky`, () => {
      cy.clearCookies();
      if (route.needsConsent) cy.setCookie('libertin.age', '1');
      cy.visit(route.path);
      cy.injectAxe();
      // `checkA11y` with a callback and `skipFailures` reports everything and
      // decides the pass/fail itself, so the baseline is applied here instead.
      cy.checkA11y(
        undefined,
        { includedImpacts: ['serious', 'critical'] },
        (violations) => {
          report(route.path)(violations);
          const unexpected = violations.filter((v) => !isKnown(route.path, v.id));
          expect(
            unexpected.map((v) => v.id),
            `new serious/critical a11y violations on ${route.path}`,
          ).to.deep.equal([]);
        },
        true,
      );
    });
  }

  it('gives the age gate a focusable control on load', () => {
    // The gate traps focus by design (it is modal and non-dismissible). A trap
    // with nothing focusable inside it is a keyboard dead end, which is the
    // failure mode that matters most here.
    cy.clearCookies();
    cy.visit('/gate');
    cy.get('[role="dialog"]').within(() => {
      cy.get('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])').should(
        'have.length.greaterThan',
        0,
      );
    });
  });
});
