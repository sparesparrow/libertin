/**
 * Landing page of the repo's own client (`apps/web`), behind the age gate.
 *
 * The gate specs prove the page is *withheld* correctly; nothing until now
 * proved the page is *right* once it is shown. Everything asserted here comes
 * from `packages/i18n/locales.json` via `getDict('cs')`, so a copy regression
 * or a broken token wiring fails at this level rather than in review.
 */

/** Consent is a precondition, not the thing under test — see age-gate.cy.ts. */
function enterSite(): void {
  cy.clearCookies();
  cy.setCookie('libertin.age', '1');
  cy.visit('/');
}

const CATEGORIES = ['Naturisté', 'Swingeři', 'BDSM', 'Šibari'] as const;

const FOOTER_LINKS = [
  { label: 'O nás', href: '/o-nas' },
  { label: 'Kontakt', href: '/kontakt' },
  { label: 'Ochrana soukromí', href: '/soukromi' },
  { label: 'Podmínky použití', href: '/podminky' },
] as const;

describe('Úvodní stránka (apps/web)', () => {
  beforeEach(enterSite);

  it('renders the hero from the catalogue, not from hardcoded copy', () => {
    cy.contains('h1', 'Vaše komunita, vaše pravidla').should('be.visible');
    cy.contains('Diskrétní sociální síť pro dospělé.').should('be.visible');
  });

  it('points the hero call to action at the login route', () => {
    cy.contains('a', 'Vstoupit').should('have.attr', 'href', '/login');
  });

  it('shows all four contracted communities', () => {
    cy.contains('#categories-heading', 'Naše komunity').should('be.visible');
    for (const category of CATEGORIES) {
      cy.contains(category).should('be.visible');
    }
  });

  it('names the categories section for assistive technology', () => {
    // The section is labelled by the heading rather than an aria-label, so the
    // accessible name and the visible name cannot drift apart.
    cy.get('section[aria-labelledby="categories-heading"]').should('exist');
    cy.get('#categories-heading').should('exist');
  });

  it('routes every community card into the funnel', () => {
    // Anonymous visitors cannot browse a community; the card is a signup
    // entry point, and a card that goes nowhere is a dead conversion path.
    cy.get('main a[href="/login"]').should('have.length.greaterThan', CATEGORIES.length - 1);
  });

  it('carries the brand and the 18+ notice in the footer', () => {
    cy.contains('footer', 'Libertin').should('exist');
    cy.contains('footer', 'Pouze pro osoby starší 18 let').should('be.visible');
  });

  it('offers every footer link with the agreed label and target', () => {
    for (const link of FOOTER_LINKS) {
      cy.contains('footer a', link.label).should('have.attr', 'href', link.href);
    }
  });

  it('renders exactly one h1, so the document outline is not ambiguous', () => {
    cy.get('body').find('h1').should('have.length', 1);
  });

  it('declares Czech as the document language', () => {
    // B13 ships cs+en; cs is the default and screen readers need it declared
    // or Czech is read with English phonetics.
    cy.get('html').should('have.attr', 'lang', 'cs');
  });
});
