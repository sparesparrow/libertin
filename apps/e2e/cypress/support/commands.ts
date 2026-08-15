/// <reference types="cypress" />

import { testPassword, testUsername } from './auth';
import { recordFinding } from './findings';
import { CZECH_TYPO_BLOCKLIST } from './routes';

/**
 * Copy the client renders while a section is still fetching. Any of these left
 * standing after the settle window means the section never resolved.
 */
const LOADING_MARKERS = ['Načítám…', 'Načítání…', 'Načítám...', 'Načítání...'] as const;

/** Class Next.js puts on the heading of its built-in error/404 screen. */
const NEXT_ERROR_HEADING = 'h1.next-error-h1';

export interface VisitModuleOptions {
  /** Module id used when reporting findings from this page. */
  readonly module?: string;
  /** Leave the cookie banner standing — only the discretion spec wants this. */
  readonly keepCookieBanner?: boolean;
}

/**
 * Buttons the cookie banner offers, best first.
 *
 * There is no "reject all" among them, which is itself a finding the
 * discretion spec reports: under GDPR refusing must be as easy as accepting,
 * and on this banner it takes a detour through "Upravit".
 */
const COOKIE_BANNER_BUTTONS = ['Odmítnout vše', 'Souhlas', 'Povolit vše'] as const;

/**
 * Reported but non-fatal: buffered now, flushed to the reporter in `afterEach`.
 * See `support/findings.ts` for why this is not a direct `cy.task`.
 */
function record(module: string, route: string, kind: string, detail: string): void {
  recordFinding({ module, route, kind, detail });
}

/**
 * Visit a route and prove it is a real route.
 *
 * Worth knowing, because it is the whole reason this command exists: the
 * deployment answers unknown paths with HTTP 200, and its 404 screen is
 * rendered on the client out of the RSC payload — which every page carries.
 * So neither the status code nor the served HTML distinguishes a live module
 * from a missing one. The built DOM does: only the 404 screen turns
 * `next-error-h1` into an element.
 */
Cypress.Commands.add('visitModule', (path: string, options: VisitModuleOptions = {}): void => {
  const module = options.module ?? path;

  cy.visit(path, { failOnStatusCode: false });
  cy.get(NEXT_ERROR_HEADING, { timeout: 4000 }).should('not.exist');
  cy.get('body').should('be.visible');

  if (options.keepCookieBanner !== true) {
    cy.dismissCookieBanner();
  }

  cy.location('pathname').then((pathname) => {
    if (pathname !== path && !path.startsWith(pathname)) {
      record(module, path, 'redirect', `přesměrováno na ${pathname}`);
    }
  });
});

/**
 * Close the cookie banner if it is up.
 *
 * Not cosmetic: the banner is rendered over the page and intercepts pointer
 * events, so without this every click in every spec fails with "element is
 * covered by another element". That is also how it behaves for a real member
 * on their first visit, which the discretion spec records separately.
 */
Cypress.Commands.add('dismissCookieBanner', (): void => {
  cy.get('body', { log: false }).then(($body) => {
    for (const label of COOKIE_BANNER_BUTTONS) {
      const $button = $body
        .find('button')
        .filter((_, el) => (el.textContent ?? '').trim() === label);
      if ($button.length > 0) {
        cy.wrap($button.first(), { log: false }).click({ force: true });
        return;
      }
    }
  });
});

/**
 * Sign in and keep the session across specs.
 *
 * `cy.session` caches by the credential key, so the form is driven once per run
 * rather than once per test. The inputs carry no `name` or `id` — only
 * `aria-label` — so that is what the selectors use; when `data-cy` hooks land
 * this should move onto `cy.byCy`.
 */
Cypress.Commands.add('login', (): void => {
  const username = testUsername();
  const password = testPassword();

  if (username === undefined || password === undefined) {
    throw new Error(
      'cy.login() called without CYPRESS_TEST_USERNAME / CYPRESS_TEST_PASSWORD. ' +
        'Guard authenticated specs with hasCredentials() so they skip instead of failing.',
    );
  }

  cy.session(
    ['libertin', username],
    () => {
      cy.visit('/login', { failOnStatusCode: false });
      cy.dismissCookieBanner();

      cy.get('input[aria-label="Vaše uživatelské jméno"]').type(username, { log: false });
      cy.get('input[aria-label="Heslo"]').type(password, { log: false });
      cy.get('button[type="submit"]').click();

      // The sign-in either leaves /login or reports a reason. Anything else is
      // a hang, and failing here beats every module spec failing downstream.
      cy.location('pathname', { timeout: 20_000 }).should('not.equal', '/login');
    },
    {
      cacheAcrossSpecs: true,
      validate() {
        cy.visit('/wall', { failOnStatusCode: false });
        cy.location('pathname', { timeout: 15_000 }).should('equal', '/wall');
      },
    },
  );
});

/**
 * Wait for client-rendered sections to settle, and *report* the ones that never
 * do rather than failing. A module still in progress is expected to have
 * unfinished sections; a hard failure here would drown the real signal.
 */
Cypress.Commands.add('settle', (module: string, route: string, timeout = 8000): void => {
  const deadline = Date.now() + timeout;

  const poll = (): void => {
    cy.get('body', { log: false }).then(($body) => {
      const text = $body.text();
      const stuck = LOADING_MARKERS.filter((marker) => text.includes(marker));
      if (stuck.length === 0) return;

      if (Date.now() > deadline) {
        record(
          module,
          route,
          'stuck-loading',
          `stále zobrazuje "${stuck.join('", "')}" po ${timeout} ms`,
        );
        return;
      }

      cy.wait(250, { log: false });
      poll();
    });
  };

  poll();
});

/**
 * The page's visible text with `<script>`/`<style>` contents removed.
 *
 * `$body.text()` alone is unusable here: Next.js inlines the whole RSC payload
 * into `<script>` tags inside `<body>`, so raw text matching finds every string
 * the server ever serialised, including ones that never render. Asserting on
 * that would pass for copy no user can see.
 */
Cypress.Commands.add('visibleText', () => {
  return cy.get('body').then(($body): string => {
    const clone = $body.clone();
    clone.find('script, style, noscript, template').remove();
    return clone.text().replace(/\s+/g, ' ').trim();
  });
});

/** Navigation Timing for the current page, used by the C12.1 budget spec. */
Cypress.Commands.add('navigationTiming', () => {
  return cy.window({ log: false }).then((win): PerformanceNavigationTiming => {
    const [entry] = win.performance.getEntriesByType(
      'navigation',
    ) as PerformanceNavigationTiming[];
    if (!entry) throw new Error('No PerformanceNavigationTiming entry available');
    return entry;
  });
});

/** Assert the forbidden Czech strings are absent, reporting each hit. */
Cypress.Commands.add('assertCzechCopy', (module: string, route: string): void => {
  cy.visibleText().then((text) => {
    const hits = CZECH_TYPO_BLOCKLIST.filter((typo) => text.includes(typo.wrong));
    for (const hit of hits) {
      record(module, route, 'czech-typo', `"${hit.wrong}" má být "${hit.right}"`);
    }
    expect(
      hits.map((h) => `"${h.wrong}" (should be "${h.right}")`),
      'forbidden Czech strings on page',
    ).to.deep.equal([]);
  });
});

/**
 * Selector convention for the client team.
 *
 * The app under test ships no `data-cy`/`data-testid` attributes today, so
 * every spec here selects on user-visible text and roles. That is honest
 * testing, but it is brittle against copy changes and it cannot tell apart two
 * elements that read the same. As `data-cy` hooks land, specs should move onto
 * this command.
 */
Cypress.Commands.add('byCy', (name: string, options?: Partial<Cypress.Loggable>) => {
  return cy.get(`[data-cy="${name}"]`, options);
});

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      visitModule(path: string, options?: VisitModuleOptions): Chainable<void>;
      dismissCookieBanner(): Chainable<void>;
      login(): Chainable<void>;
      settle(module: string, route: string, timeout?: number): Chainable<void>;
      visibleText(): Chainable<string>;
      navigationTiming(): Chainable<PerformanceNavigationTiming>;
      assertCzechCopy(module: string, route: string): Chainable<void>;
      byCy(name: string, options?: Partial<Loggable>): Chainable<JQuery<HTMLElement>>;
    }
  }
}

export {};
