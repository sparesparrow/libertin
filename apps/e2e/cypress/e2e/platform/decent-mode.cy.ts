import { note } from '../../support/findings';
import { countBlurredElements, isBlurred, isShown, memberPhotos } from '../../support/visual';

/**
 * "Slušný režim" — decent mode.
 *
 * On a platform whose design driver is discretion, this is the control that
 * decides whether the site is safe to have open near other people: a shared
 * screen, a partner walking past, a phone lent for a moment. It is reachable
 * by anyone, signed in or not, from the footer.
 *
 * Measured on 2026-09-23: it is a real toggle (`<button aria-pressed>`), it is
 * remembered across reloads, and it blurs the post content on `/wall`. It does
 * not touch the homepage, and it does not blur member avatars — which on the
 * guest view of `/wall` are the one thing that can out someone.
 */

const TOGGLE = /slušný režim/i;

/**
 * The visible toggle. Not `cy.contains('button', TOGGLE)`: that yields only
 * the *first* match. Since 25. 9. 2026 the footer — toggle included — is in
 * the page twice, `cy.contains` settled on a copy that is not visible, and
 * every test here timed out on a toggle a visitor could see and click.
 */
function toggle(): Cypress.Chainable<JQuery<HTMLElement>> {
  return cy
    .get('button')
    .filter(':visible')
    .filter((_, b) => TOGGLE.test(b.textContent ?? ''))
    .first();
}

function turnOn(): void {
  toggle().as('toggle');
  cy.get('@toggle').should('have.attr', 'aria-pressed', 'false');
  cy.get('@toggle').click();
}

describe('Slušný režim', () => {
  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
  });

  it('je přepínač, který říká, v jakém je stavu', () => {
    // aria-pressed is what lets a screen-reader user know which mode they are
    // in — without it, "is this safe to have open right now?" has no answer.
    cy.visitModule('/', { module: 'decent-mode' });
    turnOn();
    toggle()
      .should('have.attr', 'aria-pressed', 'true')
      .and('contain.text', 'Vypnout');
  });

  it('pamatuje si volbu po znovunačtení', () => {
    // A discretion setting that resets on reload is worse than none: it
    // teaches the member that it is on when it is not.
    cy.visitModule('/', { module: 'decent-mode' });
    turnOn();
    cy.reload();
    toggle().should('have.attr', 'aria-pressed', 'true');
  });

  it('rozmaže obsah zdi', () => {
    let baseline = 0;
    cy.visitModule('/wall', { module: 'decent-mode' });
    cy.wait(3000);
    cy.window().then((win) => {
      baseline = countBlurredElements(win.document, win);
    });

    turnOn();
    cy.reload();
    cy.wait(3000);
    cy.window().then((win) => {
      const blurred = countBlurredElements(win.document, win);
      expect(blurred, `blurred elements on /wall (without decent mode: ${baseline})`).to.be.greaterThan(baseline);
    });
  });

  it('rozmaže i tváře členů', () => {
    // The guest view hides members' names but shows their faces; decent mode
    // is the switch a nervous visitor reaches for, so it has to cover them.
    cy.visitModule('/wall', { module: 'decent-mode' });
    turnOn();
    cy.reload();
    cy.wait(3500);
    cy.window().then((win) => {
      const shown = memberPhotos(win.document).filter((img) => isShown(img, win));
      const unblurred = shown.filter((img) => !isBlurred(img, win)).length;
      if (unblurred > 0) {
        note(
          'decent-mode',
          '/wall',
          'decent-mode-gap',
          `se slušným režimem zůstává nerozmazaných ${unblurred} fotek členů (z ${shown.length})`,
        );
      }
      expect(unblurred, 'member photos left unblurred with decent mode on').to.equal(0);
    });
  });

  it('hlásí, jestli se slušný režim projeví i na úvodní stránce', () => {
    // Reported, not asserted: what the homepage should hide in decent mode is
    // a content decision. That it hides *nothing* is worth knowing.
    const snapshot = (win: Window) => ({
      blurred: countBlurredElements(win.document, win),
      images: Array.from(win.document.querySelectorAll('img')).filter((i) => isShown(i, win) && !isBlurred(i, win)).length,
    });
    let before = { blurred: 0, images: 0 };
    cy.visitModule('/', { module: 'decent-mode' });
    cy.wait(2000);
    cy.window().then((win) => {
      before = snapshot(win);
    });
    turnOn();
    cy.reload();
    cy.wait(2000);
    cy.window().then((win) => {
      const after = snapshot(win);
      if (after.blurred <= before.blurred && after.images >= before.images) {
        note(
          'decent-mode',
          '/',
          'decent-mode-gap',
          `slušný režim na úvodní stránce nic neskryje (${after.images} viditelných obrázků, včetně úvodní fotografie)`,
        );
      }
    });
  });
});
