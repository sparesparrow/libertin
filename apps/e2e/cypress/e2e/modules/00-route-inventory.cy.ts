import { ALL_MODULES, routesOf } from '../../support/routes';

/**
 * The gate every other module spec depends on.
 *
 * This deployment answers unknown paths with HTTP 200 and the Next.js 404
 * screen, so "the route responded" proves nothing. If this spec is red, the
 * module is not deployed at the path the suite thinks it is — fix
 * `support/routes.ts` before reading any other failure in this folder.
 */
describe('Inventář rout — každý modul existuje na očekávané cestě', () => {
  for (const module of ALL_MODULES) {
    for (const route of routesOf(module)) {
      it(`${module.label}: ${route} je skutečná routa`, () => {
        cy.visitModule(route, { module: module.id });
        cy.get('h1.next-error-h1').should('not.exist');
        cy.visibleText().should('have.length.greaterThan', 50);
      });
    }
  }
});
