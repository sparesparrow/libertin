import { ALL_MODULES, MODULES } from '../../support/routes';
import { note } from '../../support/findings';

/**
 * Discretion checks.
 *
 * CLAUDE.md states the driver plainly: members risk real-world harm from being
 * outed, so privacy UX is a product requirement. These assertions cover the
 * ways a page leaks *who is looking at it* rather than the ways it leaks data
 * from the database.
 */

/** Hosts that would tell a third party a member visited this site. */
const KNOWN_TRACKERS = [
  'google-analytics.com',
  'googletagmanager.com',
  'connect.facebook.net',
  'facebook.com/tr',
  'doubleclick.net',
  'hotjar.com',
  'segment.io',
  'mixpanel.com',
  'clarity.ms',
] as const;

describe('Diskrétnost — co stránka prozradí o návštěvníkovi', () => {
  it('nastavuje Referrer-Policy, aby cíl odkazu nepoznal odkud návštěvník přišel', () => {
    cy.request({ url: '/', failOnStatusCode: false }).then((response) => {
      const policy = String(
        response.headers['referrer-policy'] ?? response.headers['Referrer-Policy'] ?? '',
      ).toLowerCase();

      if (policy === '') {
        note(
          'discretion',
          '/',
          'missing-referrer-policy',
          'chybí hlavička Referrer-Policy — odchozí kliknutí prozradí cíli, ze které stránky člen přišel',
        );
      }

      const safe = ['same-origin', 'no-referrer', 'strict-origin', 'strict-origin-when-cross-origin'];
      expect(policy, 'Referrer-Policy header').to.be.oneOf(safe);
    });
  });

  it('nastavuje X-Content-Type-Options a X-Frame-Options', () => {
    cy.request({ url: '/', failOnStatusCode: false }).then((response) => {
      const headers = response.headers;
      const missing: string[] = [];
      if (!headers['x-content-type-options']) missing.push('X-Content-Type-Options');
      if (!headers['x-frame-options'] && !headers['content-security-policy']) {
        missing.push('X-Frame-Options (or a CSP frame-ancestors)');
      }
      for (const header of missing) {
        note('discretion', '/', 'missing-security-header', `hlavička ${header} není nastavená`);
      }
      expect(missing, 'security headers').to.deep.equal([]);
    });
  });

  /**
   * GDPR/ePrivacy: refusing non-essential cookies must be no harder than
   * accepting, and a refusal must actually refuse.
   *
   * This used to decide the question from button *labels* — it looked for
   * "Odmítnout" and, finding none, reported that no one-click refusal existed.
   * That was wrong: the banner's close button (✕, `aria-label="Zavřít"`) is a
   * one-click refusal that works — measured on 2026-09-23, closing it stores
   * no cookie, writes nothing to localStorage and loads no tracker. So the
   * check now measures the outcome instead of reading the wording: click the
   * one-click way out, then see whether anyone was told the visitor was here.
   *
   * What is asserted is the part that is not a matter of opinion: after one
   * click, no tracker loads. It also catches the opposite failure, a close
   * button quietly treated as consent, which some banners do.
   *
   * What is reported rather than asserted is the part that is a judgement:
   * whether an unlabelled ✕ is as prominent as a filled "Povolit vše" button,
   * and whether the refusal is remembered.
   */
  it('nabízí odmítnutí cookies na jedno kliknutí, které skutečně odmítne', () => {
    const trackerHits: string[] = [];
    cy.intercept('**/*', (req) => {
      if (KNOWN_TRACKERS.some((host) => req.url.includes(host))) trackerHits.push(new URL(req.url).host);
    });
    cy.visitModule('/', { module: 'discretion', keepCookieBanner: true });

    cy.get('button:visible').then(($buttons) => {
      const labelOf = (b: HTMLElement) => ((b.textContent ?? '').trim() || b.getAttribute('aria-label') || '').trim();
      const banner = $buttons.toArray().filter((b) => labelOf(b).length > 0 && labelOf(b).length <= 40);
      const labels = banner.map(labelOf);
      if (!labels.some((l) => /souhlas|povolit vše/i.test(l))) return; // banner not shown on this visit

      const labelled = banner.find((b) => /odmítnout|zamítnout|pouze nezbytné|jen nezbytné/i.test(labelOf(b)));
      const close = banner.find((b) => /^(zavřít|close)$/i.test(b.getAttribute('aria-label') ?? ''));
      const refuse = labelled ?? close;

      if (!labelled) {
        note(
          'discretion',
          '/',
          'gdpr-cookie-banner',
          close
            ? 'odmítnout jde jen neoznačeným ✕ ("Zavřít") — chybí tlačítko "Odmítnout" stejně výrazné jako "Povolit vše"'
            : `cookie lišta nenabízí odmítnutí na jedno kliknutí; nabízí: ${labels.slice(0, 8).join(', ')}`,
        );
      }
      expect(refuse, `a one-click way to refuse (offered: ${labels.slice(0, 8).join(', ')})`).to.not.equal(undefined);

      cy.wrap(refuse).click();
      cy.wait(2000);
      cy.then(() => {
        expect(trackerHits, 'trackers loaded after refusing in one click').to.deep.equal([]);
      });

      // Remembered? A refusal that is forgotten on the next page view is asked
      // again and again, which is how "accept" eventually gets clicked.
      cy.reload();
      cy.wait(2000);
      cy.get('body').then(($body) => {
        const askedAgain = $body
          .find('button:visible')
          .toArray()
          .some((b) => /povolit vše/i.test((b.textContent ?? '').trim()));
        if (askedAgain) {
          note('discretion', '/', 'gdpr-cookie-banner', 'odmítnutí se nepamatuje — lišta se po znovunačtení ptá znovu');
        }
      });
      cy.then(() => {
        expect(trackerHits, 'trackers loaded after reload following a refusal').to.deep.equal([]);
      });
    });
  });

  it('cookie lišta nepřekrývá přihlašovací formulář', () => {
    // Found by the suite: the banner is rendered over the page and swallows
    // pointer events, so a first-time visitor cannot type into the login form
    // until they deal with it. Every spec here has to force clicks past it.
    cy.visit('/login', { failOnStatusCode: false });
    cy.get('input[aria-label="Heslo"]').should('exist');
    cy.get('input[aria-label="Heslo"]').click({ timeout: 8000 });
  });

  it('nenačítá známé trackery třetích stran', () => {
    const requested: string[] = [];

    cy.intercept('**', (req) => {
      requested.push(req.url);
    });

    cy.visitModule('/', { module: 'discretion' });
    cy.settle('discretion', '/');

    cy.then(() => {
      const trackers = [
        ...new Set(
          requested.filter((url) => KNOWN_TRACKERS.some((host) => url.includes(host))),
        ),
      ];
      for (const url of trackers) {
        note('discretion', '/', 'third-party-tracker', url);
      }
      expect(trackers, 'requests to known trackers').to.deep.equal([]);
    });
  });

  it('neposílá odkazy na cizí weby bez rel="noreferrer"', () => {
    cy.visitModule('/', { module: 'discretion' });
    // Queried through `body`, not `cy.get('a[target=_blank]')`: `cy.get`
    // retries until it finds at least one match, so a page with no external
    // links at all — the safest possible answer — timed out and failed.
    cy.get('body').then(($body) => {
      const unsafe = $body
        .find('a[target="_blank"]')
        .toArray()
        .filter((a) => !(a.getAttribute('rel') ?? '').includes('noreferrer'))
        .map((a) => a.getAttribute('href') ?? '(no href)');
      for (const href of unsafe) {
        note('discretion', '/', 'missing-noreferrer', `target=_blank bez rel="noreferrer": ${href}`);
      }
      expect(unsafe, 'target=_blank links without rel=noreferrer').to.deep.equal([]);
    });
  });

  it('neukládá do titulku stránky nic, co prozradí povahu webu ve historii prohlížeče', () => {
    // Browser history and tab titles are read by whoever picks up the device
    // next. This is a report-only check: what counts as too explicit is the
    // owner's call, not the test suite's.
    for (const module of ALL_MODULES) {
      cy.visitModule(module.path, { module: module.id });
      cy.title().then((title) => {
        cy.task('log', `title ${module.path.padEnd(20)} -> ${title}`);
      });
    }
  });

  it('platební stránka neodhaluje údaje o kartě v DOM', () => {
    const M = MODULES.credit;
    cy.visitModule(M.path, { module: M.id });
    cy.settle(M.id, M.path);
    cy.visibleText().then((text) => {
      const cardLike = [...text.matchAll(/\b(?:\d[ -]?){13,19}\b/g)].map((m) => m[0]);
      for (const hit of cardLike) {
        note(M.id, M.path, 'possible-pan', `vykreslen řetězec tvaru čísla karty: ${hit}`);
      }
      expect(cardLike, 'card-number-shaped strings in the payments page').to.deep.equal([]);
    });
  });
});
