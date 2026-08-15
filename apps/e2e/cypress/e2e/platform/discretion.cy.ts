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
          'no Referrer-Policy header — an outbound click tells the destination which page the member came from',
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
        note('discretion', '/', 'missing-security-header', `${header} not set`);
      }
      expect(missing, 'security headers').to.deep.equal([]);
    });
  });

  it('nabízí odmítnutí cookies stejně snadno jako souhlas', () => {
    // GDPR/ePrivacy: refusing non-essential cookies must be no harder than
    // accepting. A banner whose only one-click actions are "Souhlas" and
    // "Povolit vše", with refusal hidden behind "Upravit", does not clear that
    // bar — and on a platform whose members are already at risk from being
    // profiled, the default matters more than usual.
    cy.visitModule('/', { module: 'discretion', keepCookieBanner: true });

    cy.get('button').then(($buttons) => {
      const labels = $buttons
        .toArray()
        .map((b) => (b.textContent ?? '').trim())
        // Long strings here are card bodies, not banner actions — a banner
        // action is a short label, and letting prose through made the reported
        // finding unreadable.
        .filter((label) => label.length > 0 && label.length <= 40);

      const accepts = labels.some((l) => /souhlas|povolit vše/i.test(l));
      if (!accepts) return; // banner not shown on this visit

      const rejects = labels.some((l) => /odmítnout|zamítnout|pouze nezbytné|jen nezbytné/i.test(l));
      if (!rejects) {
        note(
          'discretion',
          '/',
          'gdpr-cookie-banner',
          `no one-click refusal on the cookie banner; offered: ${labels.slice(0, 8).join(', ')}`,
        );
      }
      expect(rejects, 'cookie banner offers a one-click refusal').to.equal(true);
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
    cy.get('a[target="_blank"]').then(($links) => {
      const unsafe = $links
        .toArray()
        .filter((a) => !(a.getAttribute('rel') ?? '').includes('noreferrer'))
        .map((a) => a.getAttribute('href') ?? '(no href)');
      for (const href of unsafe) {
        note('discretion', '/', 'missing-noreferrer', `target=_blank without noreferrer: ${href}`);
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
        note(M.id, M.path, 'possible-pan', `card-number-shaped string rendered: ${hit}`);
      }
      expect(cardLike, 'card-number-shaped strings in the payments page').to.deep.equal([]);
    });
  });
});
