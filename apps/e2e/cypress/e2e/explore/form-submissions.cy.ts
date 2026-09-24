import { observe, refuseCookieBanner } from '../../support/observe';

/**
 * What the public forms actually send — before any scenario asserts on it.
 *
 * The scenario suite guards production with an allowlist of writes. Writing
 * that allowlist from guessed endpoint paths would repeat the mistake the
 * explore suite exists to prevent, so this records every non-GET request the
 * two public forms make: method, host, path, status, and the *names* of the
 * body fields. Never the values — the body holds an email address and, on
 * registration, a password.
 *
 * Forgot-password is really submitted, for an RFC 2606 `example.com` address
 * that can belong to no one (approved by the owner for this form). The
 * registration request is **stubbed**: exploration must not create accounts.
 */

interface WriteShape {
  method: string;
  host: string;
  path: string;
  status: number | null;
  bodyFields: string[];
  bodyKind: string;
  contentType: string | null;
  isServerAction: boolean;
}

function bodyShape(body: unknown): { kind: string; fields: string[] } {
  if (body === undefined || body === null || body === '') return { kind: 'empty', fields: [] };
  if (typeof body === 'string') {
    try {
      const parsed: unknown = JSON.parse(body);
      return bodyShape(parsed);
    } catch {
      // A form-encoded body: names only.
      if (/^[\w%.[\]-]+=/.test(body)) {
        return { kind: 'form', fields: body.split('&').map((p) => decodeURIComponent(p.split('=')[0] ?? '')) };
      }
      return { kind: 'text', fields: [] };
    }
  }
  if (Array.isArray(body)) {
    const first: unknown = body[0];
    return { kind: 'array', fields: first !== null && typeof first === 'object' ? Object.keys(first) : [] };
  }
  if (typeof body === 'object') return { kind: 'json', fields: Object.keys(body as Record<string, unknown>) };
  return { kind: typeof body, fields: [] };
}

function recordWrites(ledger: WriteShape[], stub: RegExp | null): void {
  cy.intercept({ method: /^(POST|PUT|PATCH|DELETE)$/, url: /.*/ }, (req) => {
    const url = new URL(req.url);
    const shape = bodyShape(req.body);
    const entry: WriteShape = {
      method: req.method,
      host: url.host,
      path: url.pathname,
      status: null,
      bodyFields: shape.fields,
      bodyKind: shape.kind,
      contentType: (req.headers['content-type'] as string | undefined) ?? null,
      isServerAction: req.headers['next-action'] !== undefined,
    };
    ledger.push(entry);
    if (stub !== null && stub.test(url.pathname)) {
      entry.status = 0;
      req.reply({ statusCode: 503, body: { stubbedBy: 'libertin-e2e-explore' } });
      return;
    }
    req.continue((res) => {
      entry.status = res.statusCode;
    });
  });
}

function responseFeedback(win: Window): string {
  const clone = win.document.body.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('script, style, noscript, template').forEach((n) => n.remove());
  return (clone.textContent ?? '').replace(/\s+/g, ' ').trim();
}

describe('Průzkum — co odesílají veřejné formuláře', { retries: 0 }, () => {
  it('zapomenuté heslo — skutečné odeslání pro adresu na example.com', () => {
    const ledger: WriteShape[] = [];
    cy.clearCookies();
    cy.clearLocalStorage();
    recordWrites(ledger, null);

    cy.visit('/login', { failOnStatusCode: false });
    cy.wait(2500);
    refuseCookieBanner();

    // How does a visitor get there? Record the link, then follow it.
    cy.get('body').then(($body) => {
      const link = $body
        .find('a, button')
        .toArray()
        .find((el) => /zapomenut/i.test(el.textContent ?? ''));
      observe('form-submissions', '/login', 'forgot-password link', {
        found: link !== undefined,
        tag: link?.tagName.toLowerCase() ?? null,
        href: link?.getAttribute('href') ?? null,
        label: (link?.textContent ?? '').trim(),
      });
      if (link) cy.wrap(link).click();
      else cy.visit('/forgot-password', { failOnStatusCode: false });
    });
    cy.wait(2000);

    cy.location('pathname').then((pathname) => {
      cy.window().then((win) => {
        const inputs = Array.from(win.document.querySelectorAll('input, button, select, textarea'))
          .filter((el) => (el as HTMLElement).offsetParent !== null)
          .map((el) => ({
            tag: el.tagName.toLowerCase(),
            type: el.getAttribute('type'),
            name: el.getAttribute('name'),
            ariaLabel: el.getAttribute('aria-label'),
            placeholder: el.getAttribute('placeholder'),
            text: (el.textContent ?? '').trim().slice(0, 40),
          }));
        observe('form-submissions', pathname, 'forgot-password form', { pathname, controls: inputs });
      });
    });

    const address = `cypress-e2e+forgot-${Date.now().toString(36)}@example.com`;
    cy.get('input[type="email"], input[aria-label*="mail" i], input[placeholder*="mail" i], input[name*="mail" i]')
      .filter(':visible')
      .first()
      .type(address, { log: false });
    cy.get('button[type="submit"], button')
      .filter(':visible')
      .filter((_, b) => /odeslat|obnov|reset|poslat|send|pokračovat/i.test(b.textContent ?? '') || b.getAttribute('type') === 'submit')
      .first()
      .click();
    cy.wait(5000);

    cy.location().then((loc) => {
      cy.window().then((win) => {
        const text = responseFeedback(win);
        observe('form-submissions', '/forgot-password', 'after submit', {
          pathname: loc.pathname,
          // The address must never be in the URL: URLs land in history and logs.
          addressInUrl: loc.href.includes(encodeURIComponent(address)) || loc.href.includes(address),
          feedbackExcerpt: text.replace(address, '<address>').slice(0, 300),
          writes: ledger,
        });
      });
    });
  });

  it('registrace — požadavek zachycen a zastaven, účet nevznikne', () => {
    const ledger: WriteShape[] = [];
    cy.clearCookies();
    cy.clearLocalStorage();
    // Stub every write this page makes: whatever the endpoint is, nothing
    // reaches production. Only its shape is recorded.
    recordWrites(ledger, /.*/);

    cy.visit('/register', { failOnStatusCode: false });
    cy.wait(2500);
    refuseCookieBanner();

    const stamp = Date.now().toString(36);
    cy.get('input[aria-label="Nickname*"]').type(`cyx${stamp}`.slice(0, 12));
    cy.get('input[aria-label="Váš email*"]').type(`cypress-e2e+${stamp}@example.com`, { log: false });
    cy.get('input[aria-label="Heslo*"]').type(`Cy!${stamp}Aa1`, { log: false });
    cy.get('input[aria-label="Heslo znovu*"]').type(`Cy!${stamp}Aa1`, { log: false });
    cy.contains('select', 'Muž').select('Muž');
    // One community, then every consent box (terms and the 18+ declaration).
    cy.get('input[type="checkbox"]').first().check({ force: true });
    cy.get('label')
      .filter((_, l) => /souhlasím/i.test(l.textContent ?? ''))
      .find('input[type="checkbox"]')
      .check({ force: true });

    cy.window().then((win) => {
      const selects = Array.from(win.document.querySelectorAll('select')).map((s) => ({
        ariaLabel: s.getAttribute('aria-label'),
        options: Array.from(s.options).map((o) => o.text.trim()).slice(0, 12),
      }));
      const checkboxes = Array.from(win.document.querySelectorAll('input[type="checkbox"]')).map((c) => {
        const label = c.closest('label')?.textContent ?? c.getAttribute('aria-label') ?? '';
        return label.replace(/\s+/g, ' ').trim().slice(0, 60);
      });
      observe('form-submissions', '/register', 'register form', { selects, checkboxes });
    });

    cy.get('button[type="submit"]').click();
    cy.wait(4000);

    cy.location().then((loc) => {
      cy.window().then((win) => {
        // What still blocks the submit, if anything: fields the browser or the
        // client marks invalid, by label — never by value.
        const invalid = Array.from(win.document.querySelectorAll('input, select, textarea'))
          .filter((el) => {
            const f = el as HTMLInputElement;
            return f.getAttribute('aria-invalid') === 'true' || (typeof f.checkValidity === 'function' && !f.checkValidity());
          })
          .map((el) => ({
            label: el.getAttribute('aria-label') ?? el.closest('label')?.textContent?.trim().slice(0, 40) ?? el.tagName,
            required: (el as HTMLInputElement).required,
            validationMessage: (el as HTMLInputElement).validationMessage,
          }));
        const alerts = Array.from(win.document.querySelectorAll('[role="alert"], [aria-live]'))
          .map((a) => (a.textContent ?? '').replace(/\s+/g, ' ').trim())
          .filter((t) => t.length > 0);
        const submit = win.document.querySelector('button[type="submit"]') as HTMLButtonElement | null;
        observe('form-submissions', '/register', 'after (stubbed) submit', {
          pathname: loc.pathname,
          invalid,
          alerts,
          submitDisabled: submit?.disabled ?? null,
          phoneRequired: (win.document.querySelector('input[type="tel"]') as HTMLInputElement | null)?.required ?? null,
          phoneLabel: win.document.querySelector('input[type="tel"]')?.getAttribute('aria-label') ?? null,
          search: loc.search.length > 0 ? '(non-empty)' : '',
          feedbackExcerpt: responseFeedback(win).slice(0, 900),
          writes: ledger,
        });
      });
    });
  });

  it('přihlášení — tvar požadavku se špatným heslem (nic se nevytvoří)', () => {
    const ledger: WriteShape[] = [];
    cy.clearCookies();
    cy.clearLocalStorage();
    recordWrites(ledger, null);

    cy.visit('/login', { failOnStatusCode: false });
    cy.wait(2500);
    refuseCookieBanner();
    cy.get('input[aria-label="Vaše uživatelské jméno"]').type(`cyp-nobody-${Date.now().toString(36)}`);
    cy.get('input[aria-label="Heslo"]').type('not-a-real-password-1', { log: false });
    cy.get('button[type="submit"]').click();
    cy.wait(5000);

    cy.location().then((loc) => {
      cy.window().then((win) => {
        observe('form-submissions', '/login', 'wrong-password login', {
          pathname: loc.pathname,
          feedbackExcerpt: responseFeedback(win).slice(0, 300),
          writes: ledger,
        });
      });
    });
  });
});
