import { note } from '../../support/findings';
import { isBlurred, isShown, memberPhotos } from '../../support/visual';

/**
 * What a signed-out stranger can learn about *members*.
 *
 * `discretion.cy.ts` asks what a page reveals about the person looking at it.
 * This asks the other half of the product's one rule — members risk real-world
 * harm from being outed — from the member's side: can someone with no account
 * see who is here?
 *
 * Found on 2026-09-23. The guest view of `/wall` withholds members' *names*
 * ("Zaregistrujte se zdarma a uvidíte jména…") while its sidebar shows their
 * *faces*, unblurred: "Online uživatelé" and "Narozeniny dnes". A face
 * identifies a person far more reliably than a nickname does, and "birthday
 * today" attaches a date of birth to it. Decent mode, which does blur the
 * posts, leaves these untouched.
 *
 * Only counts are recorded. A photo URL contains the member's ID; a test
 * report — which ends up in CI artifacts and run summaries — is not a place to
 * copy one to.
 */
describe('Diskrétnost členů — co vidí nepřihlášený', () => {
  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
  });

  it('zeď neukazuje nepřihlášenému tváře členů', () => {
    cy.visitModule('/wall', { module: 'privacy' });
    // The sidebar fills in after hydration; a fixed settle is honest here
    // because what is being measured is "what is on screen", not "how fast".
    cy.wait(3500);

    cy.window().then((win) => {
      const shown = memberPhotos(win.document).filter((img) => isShown(img, win));
      const unblurred = shown.filter((img) => !isBlurred(img, win));

      if (unblurred.length > 0) {
        note(
          'privacy',
          '/wall',
          'member-faces-exposed',
          `nepřihlášený vidí ${unblurred.length} nerozmazaných profilových fotek členů (z ${shown.length} zobrazených)`,
        );
      }
      expect(unblurred.length, 'unblurred member photos shown to a signed-out visitor').to.equal(0);
    });
  });

  it('zeď nespojuje nepřihlášenému členy s datem narození', () => {
    // "Birthdays today" is a list of people plus one fact about each — their
    // date of birth, to the day. Shown to a stranger, next to a face, it is
    // exactly the kind of join that turns a nickname into a real person.
    cy.visitModule('/wall', { module: 'privacy' });
    cy.wait(3500);

    cy.window().then((win) => {
      const headings = Array.from(win.document.querySelectorAll('h1,h2,h3,h4,p,span,div')).filter(
        (el) => /^\s*narozeniny dnes\s*$/i.test(el.textContent ?? '') && isShown(el as HTMLElement, win),
      );
      if (headings.length === 0) return;

      // Walk up to the widget that holds the heading and count the faces in it.
      let widget: Element | null = headings[0] ?? null;
      for (let i = 0; i < 4 && widget && memberPhotos(widget).length === 0; i += 1) {
        widget = widget.parentElement;
      }
      const faces = widget ? memberPhotos(widget).filter((img) => !isBlurred(img, win)).length : 0;

      if (faces > 0) {
        note(
          'privacy',
          '/wall',
          'member-birthdays-exposed',
          `nepřihlášený vidí „Narozeniny dnes“ s ${faces} tvářemi členů`,
        );
      }
      expect(faces, 'members shown to a signed-out visitor under "Narozeniny dnes"').to.equal(0);
    });
  });
});
