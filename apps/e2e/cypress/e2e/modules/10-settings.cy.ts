import { note } from '../../support/findings';
import { MODULES } from '../../support/routes';
import { openModule } from '../../support/session';

const M = MODULES.settings;

/**
 * Nastavení profilu — the four tabs where a member hands over everything the
 * platform knows about them.
 *
 * This module gets stricter treatment than the others, for a reason that is in
 * `CLAUDE.md` rather than in any test convention: discretion is the product.
 * These forms collect relationship status, sexual orientation, body
 * measurements, piercings and tattoos, and what the member is looking for. On
 * a naturist / swingers / BDSM platform that combination is not "profile
 * data" — under GDPR Art. 9 it is special-category data about a person's sex
 * life, and the hand-off's own `privacy.*` i18n namespace exists precisely to
 * put controls next to it.
 */

/** Fields whose visibility a member would reasonably expect to control. */
const SENSITIVE_FIELDS = [
  'Sexuální orientace',
  'Stav',
  'Datum narození',
  'Velikost podprsenky',
  'Tetování',
  'Piercing',
] as const;

/**
 * Controls the delivered `libertin_i18n.json` already has copy for, under
 * `privacy.*`. Their absence is not a missing nice-to-have — the strings were
 * written, signed off and shipped in the hand-off; nothing renders them.
 */
const PRIVACY_CONTROLS = [
  'Skrýt profil',
  'Anonymní prohlížení',
  'Soukromé album',
  'poloha',
  'Zámek aplikace',
] as const;

describe(`Modul: ${M.label} (${M.path})`, () => {
  beforeEach(function () {
    openModule(this, M);
    cy.dismissNetworkModal();
  });

  it('renders all four tabs', () => {
    cy.visibleText().then((text) => {
      const missing = ['Účet', 'Osobní', 'O mně', 'Hledám'].filter((t) => !text.includes(t));
      expect(missing, 'settings tabs').to.deep.equal([]);
    });
  });

  it('says up front that the phone number stays private', () => {
    // The one privacy promise this surface does make, and it is a good one —
    // asserted so it cannot quietly disappear.
    cy.visit('/settings/ucet', { failOnStatusCode: false });
    cy.wait(3000);
    cy.visibleText().should('include', 'Telefonní číslo není nikde zveřejněno');
  });

  it('offers a visibility control next to special-category data', () => {
    cy.visit('/settings/o-mne', { failOnStatusCode: false });
    cy.wait(4000);
    cy.dismissNetworkModal();

    cy.visibleText().then((text) => {
      const collected = SENSITIVE_FIELDS.filter((f) => text.includes(f));
      const controls = PRIVACY_CONTROLS.filter((c) => text.includes(c));
      const visibility = /kdo (to )?uvidí|viditeln|soukrom|jen pro přátele/i.test(text);

      if (collected.length > 0 && controls.length === 0 && !visibility) {
        note(
          M.id,
          '/settings/o-mne',
          'privacy-no-visibility-control',
          `formulář sbírá ${collected.join(', ')} bez jediného ovládání viditelnosti; ` +
            'klíče privacy.* z hand-offu (Skrýt profil, Anonymní prohlížení, …) se nikde nevykreslují',
        );
      }
      expect(
        controls.length > 0 || visibility,
        'some visibility control next to special-category data',
      ).to.equal(true);
    });
  });

  it('explains what happens with the data it collects', () => {
    cy.visit('/settings/o-mne', { failOnStatusCode: false });
    cy.wait(4000);
    cy.visibleText().then((text) => {
      const explains = /zpracov|GDPR|ochran[aě] osobních|zásady soukromí/i.test(text);
      if (!explains) {
        note(
          M.id,
          '/settings/o-mne',
          'privacy-no-notice',
          'u sběru zvláštní kategorie údajů (sexuální orientace) není žádný odkaz na zpracování ani na zásady soukromí',
        );
      }
      expect(explains, 'a data-processing notice at the point of collection').to.equal(true);
    });
  });

  it('shows a not-found state for an unknown tab', () => {
    cy.visit('/settings/tato-zalozka-neexistuje', { failOnStatusCode: false });
    cy.wait(4000);
    cy.visibleText().then((text) => {
      const handled = /nenalezen|neexistuje|Žádn/i.test(text);
      if (!handled) {
        note(
          M.id,
          '/settings/[tab]',
          'missing-empty-state',
          'neznámá záložka vykreslí nastavení, jako by existovala — stejně jako /profile/[id]',
        );
      }
      expect(handled, 'unknown tab shows a not-found state').to.equal(true);
    });
  });
});
