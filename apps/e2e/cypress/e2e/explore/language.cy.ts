import { cookieShape, observe, refuseCookieBanner, storageShape } from '../../support/observe';

/**
 * The language menu, and what choosing a language actually changes.
 *
 * The menu names its languages in Czech ("Angličtina", not "English"), which
 * is how an English-language filter once concluded that only Czech was on
 * offer. This records the menu exactly as rendered, then switches to each
 * choice and measures the result — `lang` attribute, path, how much of the
 * visible text still carries Czech diacritics, and where the choice is stored.
 *
 * Diacritic share is a cheap proxy, not a translation audit: Slovak, Croatian
 * and Romanian carry diacritics of their own, and a share near zero for
 * English is what "actually translated" looks like.
 */

const CZECH_DIACRITICS = /[ěščřžůňťďĚŠČŘŽŮŇŤĎ]/g;

function openMenu(): void {
  cy.get('body').then(($body) => {
    const button = $body.find('button[aria-label="Jazyk"]:visible').first();
    if (button.length) cy.wrap(button).click();
  });
}

function menuChoices(doc: Document): string[] {
  return Array.from(doc.querySelectorAll('[role="menuitem"], [role="menuitemradio"], [role="option"]'))
    .filter((el) => (el as HTMLElement).offsetParent !== null)
    .map((el) => (el.textContent ?? '').trim());
}

describe('Průzkum — jazyky', () => {
  let choices: string[] = [];

  before(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.visit('/', { failOnStatusCode: false });
    cy.wait(2500);
    refuseCookieBanner();
    openMenu();
    cy.wait(800);
    cy.document().then((doc) => {
      choices = menuChoices(doc);
      observe('language', '/', 'menu', {
        switcherLabel: doc.querySelector('button[aria-label="Jazyk"]') ? 'Jazyk' : null,
        count: choices.length,
        choices,
        initialLang: doc.documentElement.lang,
      });
    });
  });

  it('přepnutí do každého nabízeného jazyka', () => {
    cy.then(() => {
      for (const choice of choices) {
        cy.clearCookies();
        cy.clearLocalStorage();
        cy.visit('/', { failOnStatusCode: false });
        cy.wait(2000);
        refuseCookieBanner();
        openMenu();
        cy.wait(600);
        cy.get('body').then(($body) => {
          const item = $body
            .find('[role="menuitem"]:visible, [role="menuitemradio"]:visible, [role="option"]:visible')
            .toArray()
            .find((el) => (el.textContent ?? '').trim() === choice);
          if (!item) {
            observe('language', '/', `switch → ${choice}`, { clickable: false });
            return;
          }
          cy.wrap(item).click();
          cy.wait(2500);
          cy.window()
            .then((win) => {
              const text = win.document.body.innerText;
              const czech = (text.match(CZECH_DIACRITICS) ?? []).length;
              return {
                clickable: true,
                lang: win.document.documentElement.lang,
                path: win.location.pathname,
                firstHeading: (win.document.querySelector('h1')?.textContent ?? '').trim().slice(0, 80),
                czechDiacriticShare: text.length ? Number(((czech / text.length) * 100).toFixed(2)) : 0,
                cookies: cookieShape(win.document),
                storage: storageShape(win),
              };
            })
            .then((data) => observe('language', '/', `switch → ${choice}`, data));
        });
      }
    });
  });
});
