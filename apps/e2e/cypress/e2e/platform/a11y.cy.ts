import type { Result } from 'axe-core';

import { ALL_MODULES } from '../../support/routes';
import { openModule } from '../../support/session';
import { note } from '../../support/findings';

/**
 * Accessibility is not a nice-to-have on this product. Members use it on
 * borrowed and shared devices, often with the screen dimmed — the same
 * discretion pressure that drives the privacy UX also means a lot of
 * low-attention interaction. Contrast and labelling carry that.
 *
 * Only `serious` and `critical` violations fail. Axe's `moderate` and `minor`
 * findings on a work-in-progress UI are mostly noise, and a suite that cries
 * wolf gets muted.
 */

/** Records each violation as a finding; the assertion itself still fails. */
function report(module: string, route: string) {
  return (violations: Result[]): void => {
    for (const violation of violations) {
      const first = violation.nodes[0]?.target.join(' ') ?? 'n/a';
      note(
        module,
        route,
        `a11y-${violation.id}`,
        `${violation.impact ?? 'neznámý'}: ${violation.help} — ${violation.nodes.length} uzlů, první: ${first}`,
      );
    }
  };
}

describe('Přístupnost — axe (serious + critical)', () => {
  for (const module of ALL_MODULES) {
    it(`${module.label} (${module.path}) nemá závažné přestupky`, function () {
      openModule(this, module);
      cy.injectAxe();
      cy.checkA11y(
        undefined,
        { includedImpacts: ['serious', 'critical'] },
        report(module.id, module.path),
      );
    });
  }
});
