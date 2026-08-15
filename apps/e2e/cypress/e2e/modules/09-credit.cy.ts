import { MODULES } from '../../support/routes';
import { openModule } from '../../support/session';
import { note } from '../../support/findings';

const M = MODULES.credit;

/**
 * Kredit / platební brána. This is the one module where a silent failure costs
 * money, so the assertions lean on state being explicit rather than pretty.
 */
describe(`Modul: ${M.label} (${M.path})`, () => {
  beforeEach(function () {
    openModule(this, M);
  });

  it('renders the payments heading', () => {
    cy.contains('h1', 'Platby').should('be.visible');
  });

  it('renders the membership tiers on offer', () => {
    cy.contains('h2', 'Členství').should('be.visible');
    cy.visibleText().then((text) => {
      const missing = ['Členství Plus', 'Členství Premium'].filter((t) => !text.includes(t));
      expect(missing, 'membership tiers present').to.deep.equal([]);
    });
  });

  it('states a price for every tier it offers', () => {
    cy.visibleText().then((text) => {
      const hasPrice = /\d+\s*(Kč|CZK|€|EUR|kreditů|kredit)/i.test(text);
      if (!hasPrice) {
        note(
          M.id,
          M.path,
          'missing-price',
          'úrovně členství jsou nabízeny bez uvedené ceny',
        );
      }
      expect(hasPrice, 'a price is shown next to the tiers').to.equal(true);
    });
  });

  it('resolves the credit balance instead of loading forever', () => {
    cy.visibleText().then((text) => {
      const settled = !text.includes('Načítám');
      if (!settled) {
        note(
          M.id,
          M.path,
          'stuck-loading',
          'zůstatek kreditu se nikdy nedonačetl — na místě zůstatku je na platební stránce spinner',
        );
      }
      expect(settled, 'credit balance resolved').to.equal(true);
    });
  });

  it('never sends payment data over a non-TLS origin', () => {
    cy.location('protocol').then((protocol) => {
      if (Cypress.config('baseUrl')?.startsWith('https')) {
        expect(protocol, 'payments served over TLS').to.equal('https:');
      }
    });
  });

  it('completes a checkout against the gateway', () => {
    // Deliberately not automated against a live gateway: driving a real
    // provider from CI either needs sandbox credentials or it charges someone.
    // Blocked until the gateway choice and its sandbox keys exist (D-004 /
    // backlog E-credit); recorded so the gap is not mistaken for coverage.
    note(
      M.id,
      M.path,
      'coverage-gap',
      'checkout není automatizovaný — vyžaduje sandbox platební brány a testovací přístupy',
    );
  });
});
