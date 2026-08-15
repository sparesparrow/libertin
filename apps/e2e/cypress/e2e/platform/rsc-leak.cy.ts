import { note } from '../../support/findings';

/**
 * Member content must not ride along in an anonymous response.
 *
 * This repository has already been through this exact defect once. E14-T5b:
 * the age gate stopped *rendering* the landing page, but Next had already
 * seeded the requested segment into `self.__next_f.push(...)`, so the page was
 * still readable in view-source. The fix was to divert the request in
 * middleware, before routing commits to the segment.
 *
 * `/wall` on the deployment under test has the same shape. A signed-out
 * visitor is shown a guest panel — "Prohlížíte si zeď jako host" — but the
 * response body they received to render it still carries the member wall: the
 * story rail, the composer, and other members' names. The gate is applied
 * after the data has already crossed the wire, which means it is not a gate.
 *
 * On this product that is not a cosmetic bug. Members are here under an
 * expectation of discretion, and "their name was in the HTML but the CSS hid
 * it" is not a defence anyone wants to make.
 *
 * These assertions read the raw body on purpose, `<script>` payload included —
 * that is exactly where the content hides.
 */

interface LeakCheck {
  readonly route: string;
  readonly description: string;
  /** Strings that must not appear in a response served to an anonymous client. */
  readonly memberOnly: readonly string[];
}

const CHECKS: readonly LeakCheck[] = [
  {
    route: '/wall',
    description: 'zeď — kompozitor a jména členů',
    memberOnly: ['Vytvořit příběh', 'Od přátel', 'Co sleduji'],
  },
];

describe('Únik dat — anonymní odpověď nesmí nést členský obsah', () => {
  for (const check of CHECKS) {
    it(`${check.route} (${check.description})`, () => {
      cy.request({ url: check.route, failOnStatusCode: false }).then((response) => {
        const body = String(response.body);
        const leaked = check.memberOnly.filter((marker) => body.includes(marker));

        for (const marker of leaked) {
          note(
            'privacy',
            check.route,
            'anonymous-payload-leak',
            `"${marker}" je v těle odpovědi pro nepřihlášeného návštěvníka, ačkoli vykreslená stránka ukazuje hostovský pohled`,
          );
        }

        expect(leaked, `member-only content in the anonymous ${check.route} response`).to.deep.equal(
          [],
        );
      });
    });
  }

  it('/wall skutečně ukazuje hostovi hostovský pohled', () => {
    // The counterpart to the check above: the *rendered* page is correct, which
    // is what makes the payload leak easy to miss.
    cy.visitModule('/wall', { module: 'privacy' });
    cy.visibleText().should('include', 'jako host');
  });
});
