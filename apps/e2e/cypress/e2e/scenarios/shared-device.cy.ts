import { note } from '../../support/findings';
import { assertRealPage, clickNamed, cookieBannerShown, decentToggle, Journey, refuseCookiesRemembered } from '../../support/scenario';
import { countBlurredElements, isBlurred, isShown, memberPhotos } from '../../support/visual';

/**
 * A discreet visitor on a shared device — a family laptop, a partner nearby.
 *
 * The first thing they do is switch decent mode on, and then they browse by
 * clicking, never by typing URLs. The platform spec already proves the mode
 * survives a *reload*; this proves it survives *navigation*, which is how the
 * mode is actually used: a setting that resets on the next click teaches the
 * visitor it is on when it is not.
 *
 * Asserted: the toggle stays pressed on every page reached, and the wall is
 * blurred when reached by a click. Reported: member faces left sharp (the
 * platform spec asserts that one), and the tab titles someone glancing at the
 * screen or the history would read.
 */
describe('Scénář — diskrétní návštěvník na sdíleném zařízení', () => {
  it('zapne slušný režim a ten ho provází celou návštěvou', () => {
    const visit = new Journey('diskrétní návštěvník na sdíleném zařízení');
    const titles: Record<string, string> = {};
    cy.clearCookies();
    cy.clearLocalStorage();

    const stillOn = (page: string): void => {
      decentToggle().should('have.attr', 'aria-pressed', 'true');
      cy.title().then((t) => {
        titles[page] = t;
      });
    };

    // Refused the remembered way: closed with ✕, the banner came back on the
    // full load that Back from /faq triggers, and covered the page.
    visit.step('otevře úvodní stránku a odmítne cookies (Detaily → Odmítnout)', () => {
      cy.visit('/', { failOnStatusCode: false });
      cy.wait(2000);
      refuseCookiesRemembered();
    });

    visit.step('hned zapne slušný režim v patičce', () => {
      decentToggle().should('have.attr', 'aria-pressed', 'false').click();
      stillOn('/');
    });

    visit.step('klikne na „Objevujte“ a dostane se na zeď', () => {
      clickNamed('a', /^objevujte$/i);
      cy.location('pathname').should('equal', '/wall');
      assertRealPage();
      cy.wait(3500);
      stillOn('/wall');
    });

    visit.step('na zdi je obsah rozmazaný', () => {
      cy.window().then((win) => {
        expect(countBlurredElements(win.document, win), 'blurred elements on /wall reached by a click').to.be.greaterThan(0);
        const faces = memberPhotos(win.document).filter((img) => isShown(img, win));
        const sharp = faces.filter((img) => !isBlurred(img, win)).length;
        if (sharp > 0) {
          note('scenarios', '/wall', 'decent-mode-faces', `se zapnutým slušným režimem zůstává ostrých ${sharp} z ${faces.length} fotek členů`);
        }
      });
    });

    visit.step('přejde patičkou na Časté dotazy', () => {
      clickNamed('a', /časté dotazy/i);
      cy.location('pathname').should('equal', '/faq');
      stillOn('/faq');
    });

    visit.step('vrátí se tlačítkem Zpět na zeď', () => {
      cy.go('back');
      cy.location('pathname').should('equal', '/wall');
      stillOn('/wall (zpět)');
      cy.document().then((doc) => expect(cookieBannerShown(doc), 'cookie banner asked again after Back').to.equal(false));
    });

    visit.step('vyjede nahoru a přes „Domů“ se vrátí na úvod', () => {
      cy.scrollTo('top');
      clickNamed('a', /^domů$/i);
      cy.location('pathname').should('equal', '/');
      stillOn('/ (znovu)');
    });

    visit.finish({ titles });
  });
});
