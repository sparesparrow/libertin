/**
 * Security headers configured in `apps/web/next.config.mjs`.
 *
 * The live-site audit (docs/live-audit.md) found the legacy platform shipping
 * none of these. Asserting them here means the fix cannot silently regress
 * through a config edit.
 */

const EXPECTED: readonly { header: string; expected: string }[] = [
  { header: 'strict-transport-security', expected: 'max-age=63072000' },
  { header: 'referrer-policy', expected: 'same-origin' },
  { header: 'x-content-type-options', expected: 'nosniff' },
  { header: 'x-frame-options', expected: 'DENY' },
  { header: 'permissions-policy', expected: 'camera=()' },
];

describe('Bezpečnostní hlavičky (apps/web)', () => {
  before(() => {
    cy.setCookie('libertin.age', '1');
  });

  for (const { header, expected } of EXPECTED) {
    it(`${header} obsahuje "${expected}"`, () => {
      cy.request('/').then((response) => {
        const value = String(response.headers[header] ?? '');
        expect(value, header).to.include(expected);
      });
    });
  }

  it('Referrer-Policy je same-origin, aby cíl odkazu nepoznal odkud návštěvník přišel', () => {
    // Called out separately because it is the one header here chosen for
    // discretion rather than for a generic hardening checklist.
    cy.request('/').then((response) => {
      expect(String(response.headers['referrer-policy'])).to.equal('same-origin');
    });
  });
});
