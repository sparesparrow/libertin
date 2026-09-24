import { observe } from '../../support/observe';
import { assertRealPage, clickNamed, cookieBannerShown, Journey } from '../../support/scenario';

/**
 * A curious first-time visitor.
 *
 * Arrives on the homepage from a search, says no to cookies the long way
 * (Detaily → Odmítnout, the way a careful visitor would), reads about one
 * community, the platform, the FAQ and the membership terms, then opens the
 * registration form — and leaves without filling it in. Nothing is submitted.
 *
 * Asserted: every hop lands on a real page (the deployment answers unknown
 * paths with HTTP 200 and a client-rendered 404), Back returns to where the
 * visitor came from, and at no step is a tracker loaded or anything written.
 */
describe('Scénář — zvědavý první návštěvník', () => {
  it('prohlédne si web, odmítne cookies a odejde bez registrace', () => {
    const visit = new Journey('zvědavý první návštěvník');
    cy.clearCookies();
    cy.clearLocalStorage();

    visit.step('přijde na úvodní stránku', () => {
      cy.visit('/', { failOnStatusCode: false });
      assertRealPage();
      cy.get('h1').filter(':visible').should('have.length.at.least', 1);
    });

    visit.step('v cookie liště otevře Detaily a zvolí Odmítnout', () => {
      clickNamed('button', /^detaily$/i);
      clickNamed('button', /^odmítnout$/i);
      cy.document().then((doc) => expect(cookieBannerShown(doc), 'cookie banner after refusing').to.equal(false));
    });

    visit.step('rozklikne kartu komunity Naturist', () => {
      cy.location('pathname').then((before) => {
        clickNamed('button', /^naturist/i);
        cy.wait(1000);
        cy.location('pathname').then((after) => {
          cy.document().then((doc) => {
            // A card is a button, not a link; what it does was not specified
            // anywhere, so it is recorded rather than asserted.
            observe('scenarios', before, 'community card click', {
              navigatedTo: after === before ? null : after,
              dialogOpened: doc.querySelector('[role="dialog"], dialog[open]') !== null,
            });
          });
        });
      });
      cy.visit('/', { failOnStatusCode: false });
    });

    visit.step('pokračuje odkazem „Více“ na stránku O nás', () => {
      clickNamed('a', /^více$/i);
      cy.location('pathname').should('equal', '/o-nas');
      assertRealPage();
    });

    visit.step('vrátí se tlačítkem Zpět', () => {
      cy.go('back');
      cy.location('pathname').should('equal', '/');
    });

    visit.step('v patičce otevře Časté dotazy', () => {
      clickNamed('a', /časté dotazy/i);
      cy.location('pathname').should('equal', '/faq');
      assertRealPage();
    });

    // The homepage footer links /clenstvi; the FAQ page links /membership.
    // Which path is canonical is the client's business — that the link leads
    // to a real page is what the visitor needs.
    let membership = '';
    visit.step('odtud Členství', () => {
      clickNamed('a', /^členství$/i);
      cy.location('pathname').should('not.equal', '/faq');
      assertRealPage();
      cy.location('pathname').then((p) => {
        membership = p;
      });
      cy.visibleText().should('match', /členství/i);
    });

    visit.step('v hlavičce Přihlásit se, pak záložka Registrace', () => {
      clickNamed('a', /^přihlásit se$/i);
      cy.location('pathname').should('equal', '/login');
      clickNamed('a', /^registrace$/i);
      cy.location('pathname').should('equal', '/register');
      cy.get('input[aria-label="Nickname*"]').should('be.visible');
    });

    visit.step('rozmyslí si to a vrátí se o dvě stránky zpět', () => {
      cy.go('back');
      cy.location('pathname').should('equal', '/login');
      cy.go('back');
      cy.location('pathname').should((p) => expect(p).to.equal(membership));
    });

    visit.step('odmítnutí platí i po celé procházce', () => {
      cy.document().then((doc) => expect(cookieBannerShown(doc), 'cookie banner asked again').to.equal(false));
    });

    visit.finish();
    cy.then(() => expect(visit.writes, 'writes by a visitor who submitted nothing').to.deep.equal([]));
  });
});
