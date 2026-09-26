import { accessibleName, observe, TRACKER_HOSTS } from './observe';

/**
 * Support for the scenario suite (`cypress/e2e/scenarios/`).
 *
 * The rest of the suite is organised by feature, one spec per module or
 * concern. A scenario follows a *person* across pages instead, because some
 * defects only exist between pages: a language, a decent-mode choice or a
 * cookie refusal that survives a reload but not a click, the Back button after
 * logout, a layout that only breaks at phone width.
 *
 * Scenarios run against a production deployment and some of them submit real
 * forms (approved by the owner for forgot-password, and for registration only
 * behind `CYPRESS_ALLOW_SIGNUP=1`). Everything else a stray click could send —
 * a post on a real member's wall, a message — is stopped by the write guard
 * below, and stopping it fails the test.
 */

/**
 * The writes a scenario may make, as measured by
 * `explore/form-submissions.cy.ts` on 2026-09-24 — not guessed. All three go
 * to `api.libertin.app` as JSON.
 */
export const WRITES = {
  /** 401 for a wrong password, body `identifier`, `password`. */
  login: { name: 'přihlášení', path: /^\/api\/auth\/login$/ },
  /** Not observed yet (needs an account); matched loosely on purpose. */
  logout: { name: 'odhlášení', path: /^\/api\/auth\/(logout|signout|sign-out)$/ },
  /** 201, body `email`. */
  forgotPassword: { name: 'zapomenuté heslo', path: /^\/api\/auth\/forgot-password$/ },
  /** Body `username`, `email`, `password`, `gender`, `interests`. */
  register: { name: 'registrace', path: /^\/api\/auth\/register$/ },
  /**
   * What any signed-in page sends by itself, seen 25. 9. 2026: the realtime
   * connection (socket.io long-polling POSTs) and the online-presence
   * heartbeat. Not content, but it does mark the account online — so only
   * the returning-member scenario, which signs in, allows it.
   */
  presence: { name: 'přítomnost online', path: /^(\/socket\.io\/|\/api\/profiles\/me\/heartbeat)$/ },
  /** The People directory loads through a POST search — a query, not a write. */
  profileSearch: { name: 'hledání lidí', path: /^\/api\/profiles\/search$/ },
} as const;

export interface WriteRule {
  readonly name: string;
  readonly path: RegExp;
  /**
   * Answer the request here instead of forwarding it to production. Used to
   * simulate the server's side of a flow the run must not really perform.
   */
  readonly stub?: { readonly statusCode: number; readonly body?: Record<string, unknown> };
}

/** One write, as it goes in the run report: shape only, never values. */
export interface WriteRecord {
  readonly method: string;
  readonly host: string;
  readonly path: string;
  /** Query parameter names — anything personal sent here ends up in logs. */
  readonly queryKeys: readonly string[];
  readonly bodyFields: readonly string[];
  /** `passed` reached production; `stubbed` was answered here; `blocked` was stopped. */
  outcome: 'passed' | 'stubbed' | 'blocked';
  status: number | null;
  readonly rule: string | null;
}

function fieldNames(body: unknown): string[] {
  if (typeof body === 'string') {
    try {
      return fieldNames(JSON.parse(body) as unknown);
    } catch {
      return /^[\w%.[\]-]+=/.test(body) ? body.split('&').map((p) => decodeURIComponent(p.split('=')[0] ?? '')) : [];
    }
  }
  if (body !== null && typeof body === 'object' && !Array.isArray(body)) return Object.keys(body);
  return [];
}

/**
 * A persona's visit, told as numbered steps.
 *
 * Create it at the top of the `it`. It installs the write guard and a tracker
 * counter, prefixes any failure with the persona and the step it happened in
 * ("anglicky mluvící návštěvník — krok 4. …" rather than a bare selector
 * timeout), and `finish()` writes the transcript and the write ledger to
 * `reports/<host>/scenarios/observations.md`, so every run documents exactly
 * what it sent to production.
 */
export class Journey {
  readonly writes: WriteRecord[] = [];
  readonly trackers: string[] = [];
  private readonly steps: string[] = [];
  private current = '0. start';
  private count = 0;

  constructor(
    readonly persona: string,
    private readonly allow: readonly WriteRule[] = [],
  ) {
    cy.on('fail', (err) => {
      err.message = `${this.persona} — krok ${this.current}\n\n${err.message}`;
      throw err;
    });

    cy.intercept({ method: /^(POST|PUT|PATCH|DELETE)$/, url: /.*/ }, (req) => {
      const url = new URL(req.url);
      const rule = this.allow.find((r) => r.path.test(url.pathname)) ?? null;
      const record: WriteRecord = {
        method: req.method,
        host: url.host,
        path: url.pathname,
        queryKeys: Array.from(url.searchParams.keys()),
        bodyFields: fieldNames(req.body),
        outcome: rule === null ? 'blocked' : rule.stub ? 'stubbed' : 'passed',
        status: null,
        rule: rule?.name ?? null,
      };
      this.writes.push(record);

      if (rule === null) {
        req.reply({ statusCode: 418, body: { blockedBy: 'libertin-e2e-scenarios' } });
        return;
      }
      if (rule.stub) {
        record.status = rule.stub.statusCode;
        req.reply({ statusCode: rule.stub.statusCode, body: rule.stub.body ?? {} });
        return;
      }
      // Presence traffic is a socket.io long-poll that the page aborts on every
      // navigation; waiting for its response turned each abort into an
      // unhandled rejection that failed the test. It is recorded, not timed.
      if (rule.name === WRITES.presence.name) {
        req.continue();
        return;
      }
      req.continue((res) => {
        record.status = res.statusCode;
      });
    });

    // Answered here, so CI never pings a tracker even if one appears.
    cy.intercept({ url: TRACKER_HOSTS }, (req) => {
      this.trackers.push(new URL(req.url).host);
      req.reply({ statusCode: 204, body: '' });
    });
  }

  /** One step of the story. Everything `fn` queues is attributed to it. */
  step(label: string, fn: () => void): void {
    this.count += 1;
    const numbered = `${this.count}. ${label}`;
    cy.then(() => {
      this.assertNothingBlocked();
      this.current = numbered;
      this.steps.push(numbered);
    });
    cy.log(`**${numbered}**`);
    fn();
  }

  /** Writes that went through the allowlist under `rule`, in order. */
  writesFor(rule: WriteRule): WriteRecord[] {
    return this.writes.filter((w) => w.rule === rule.name);
  }

  private assertNothingBlocked(): void {
    const blocked = this.writes.filter((w) => w.outcome === 'blocked').map((w) => `${w.method} ${w.host}${w.path}`);
    expect(blocked, 'writes outside the allowlist (stopped before reaching production)').to.deep.equal([]);
  }

  /** Report the visit, then assert the invariants every persona shares. */
  finish(extra: Record<string, unknown> = {}): void {
    cy.location('pathname').then((pathname) => {
      observe('scenarios', pathname, this.persona, {
        steps: this.steps,
        writes: this.writes,
        trackers: [...new Set(this.trackers)],
        ...extra,
      });
      this.assertNothingBlocked();
      expect([...new Set(this.trackers)], 'tracker requests during the visit').to.deep.equal([]);
    });
  }
}

/** Phone and tablet sizes the scenarios use (CSS pixels, portrait). */
export const VIEWPORTS = {
  phone: [390, 844],
  tablet: [820, 1180],
} as const;

/**
 * The page is a real route, not the client-rendered 404 served with HTTP 200.
 * Only the 404 screen renders `h1.next-error-h1` — see `cy.visitModule`.
 */
export function assertRealPage(): void {
  cy.get('h1.next-error-h1', { timeout: 4000 }).should('not.exist');
}

/** Click the first visible link or button whose accessible name matches. */
export function clickNamed(tag: 'a' | 'button', name: RegExp): void {
  cy.get(tag)
    .filter(':visible')
    .filter((_, el) => name.test(accessibleName(el)))
    .first()
    .click();
}

/** Visible text without the RSC payload — the plain-function twin of `cy.visibleText`. */
export function visibleTextOf(doc: Document): string {
  const clone = doc.body.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('script, style, noscript, template').forEach((n) => n.remove());
  return (clone.textContent ?? '').replace(/\s+/g, ' ').trim();
}

/** Share of the text (in %) made of Czech-only letters — English uses none. */
export function czechShare(text: string): number {
  const czech = (text.match(/[ěščřžůňťďĚŠČŘŽŮŇŤĎ]/g) ?? []).length;
  return text.length > 0 ? (czech / text.length) * 100 : 0;
}

/** Choose a language from the flag menu (`aria-label="Jazyk"`, names in Czech). */
export function chooseLanguage(name: RegExp): void {
  cy.get('button[aria-label="Jazyk"]').filter(':visible').first().click();
  cy.get('[role="menuitem"], [role="menuitemradio"], [role="option"]')
    .filter(':visible')
    .filter((_, el) => name.test((el.textContent ?? '').trim()))
    .first()
    .click();
}

export const DECENT_TOGGLE = /slušný režim|decent mode/i;

/** The footer's decent-mode toggle; `aria-pressed` is its state. */
export function decentToggle(): Cypress.Chainable<JQuery<HTMLElement>> {
  return cy
    .get('button[aria-pressed]')
    .filter(':visible')
    .filter((_, b) => DECENT_TOGGLE.test(b.textContent ?? ''))
    .first();
}

/** How far the page scrolls sideways, in CSS pixels. 0 is right. */
export function horizontalOverflow(win: Window): number {
  return Math.max(0, win.document.documentElement.scrollWidth - win.innerWidth);
}

/** The widest offenders, by tag and class — never by content. */
export function overflowingElements(win: Window, limit = 5): string[] {
  return Array.from(win.document.body.querySelectorAll('*'))
    .filter((el) => el.getBoundingClientRect().right > win.innerWidth + 1)
    .filter((el) => win.getComputedStyle(el).position !== 'fixed')
    .slice(0, limit)
    .map((el) => `${el.tagName.toLowerCase()}${el.classList.length ? `.${Array.from(el.classList).slice(0, 2).join('.')}` : ''}`);
}

/** The visible cookie banner, if any — found by its "Povolit vše" button. */
export function cookieBannerShown(doc: Document): boolean {
  return Array.from(doc.querySelectorAll('button')).some(
    (b) => /^(povolit vše|allow all)$/i.test((b.textContent ?? '').trim()) && b.offsetParent !== null,
  );
}

/** Whether `el` sits inside the cookie banner (an ancestor holds its "Povolit vše"). */
export function inCookieBanner(el: Element): boolean {
  for (let node = el.parentElement; node; node = node.parentElement) {
    const hasAllow = Array.from(node.querySelectorAll('button')).some((b) => /^(povolit vše|allow all)$/i.test((b.textContent ?? '').trim()));
    if (hasAllow) return node !== el.ownerDocument.body;
  }
  return false;
}

/**
 * Refuse cookies the way that is remembered: Detaily → Odmítnout.
 *
 * The ✕ refuses too, but is forgotten on the next full page load (reported in
 * the discretion spec), so a persona that closed the banner with ✕ met it again
 * after switching language — and it covers the page. A careful visitor who
 * does not want to be asked twice uses this path.
 */
export function refuseCookiesRemembered(): void {
  cy.document().then((doc) => {
    if (!cookieBannerShown(doc)) return;
    clickNamed('button', /^(detaily|details)$/i);
    clickNamed('button', /^(odmítnout|reject|decline)$/i);
    cy.document().then((d) => expect(cookieBannerShown(d), 'cookie banner after Odmítnout').to.equal(false));
  });
}
