/// <reference types="cypress" />

import { recordFinding } from '../../support/findings';

// Diagnostic only: no credentials, submission, consent changes or screenshots.
// Findings are classifications and counts, never DOM text or input values.
function note(kind: string, detail: string): void {
  recordFinding({ module: 'live-contract', route: 'swingerslife.cz', kind, detail });
}

function category(text: string): string {
  const label = text.replace(/\s+/g, ' ').trim();
  if (/^(odmítnout vše|odmítnout všechny|reject all)$/i.test(label)) return 'reject-all';
  if (/nezbytn|necessary|essential/i.test(label)) return 'necessary-related';
  if (/uložit|save/i.test(label)) return 'save-related';
  if (/přijmout|accept|souhlasím|agree/i.test(label)) return 'accept-related';
  if (/nastavení|settings|preferences/i.test(label)) return 'settings-related';
  if (/zavřít|close|dismiss/i.test(label)) return 'close-related';
  if (/18|plnolet|adult|věk|age/i.test(label)) return 'age-related';
  if (/přihl|log.?in|sign.?in/i.test(label)) return 'login-related';
  if (/pokračovat|vstoupit|continue|enter/i.test(label)) return 'continue-related';
  return 'other';
}

function snapshot(doc: Document, phase: string): void {
  const win = doc.defaultView;
  if (win === null) throw new Error('Login document has no window.');
  const visible = (element: Element): boolean => Cypress.$(element).is(':visible');
  const dialogs = Array.from(doc.querySelectorAll('[role="dialog"], [aria-modal="true"]')).filter(visible);
  const controls = Array.from(doc.querySelectorAll('button, [role="button"], input[type="submit"]')).filter(visible);
  note('login-ui-summary', `phase=${phase} dialogs=${dialogs.length} controls=${controls.length} viewport=${win.innerWidth}x${win.innerHeight}`);

  controls.forEach((element, index) => {
    const rect = element.getBoundingClientRect();
    const hit = doc.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    // Only the category is persisted. Never export the label itself.
    const text = element.getAttribute('aria-label') ?? element.textContent ?? '';
    note('login-ui-control', `phase=${phase} index=${index} tag=${element.tagName.toLowerCase()} category=${category(text)} in_dialog=${element.closest('[role="dialog"], [aria-modal="true"]') !== null} uncovered=${hit !== null && (hit === element || element.contains(hit))}`);
  });

  Array.from(doc.querySelectorAll<HTMLInputElement>('input[type="password"]')).forEach((input, index) => {
    const rect = input.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const hit = doc.elementFromPoint(x, y);
    const blocker = hit === input ? null : hit;
    const style = blocker === null ? null : win.getComputedStyle(blocker);
    const dialog = blocker?.closest('[role="dialog"], [aria-modal="true"]');
    // Read public UI text only for classification; never record it verbatim.
    const context = dialog?.textContent ?? blocker?.textContent ?? '';
    const contextKind = /cookie|cookies|soubory cookie/i.test(context) ? 'cookies'
      : /plnolet|18\s*\+|starší.*18|over.*18/i.test(context) ? 'age' : 'unknown';
    note('login-input-blocker', [
      `phase=${phase}`, `index=${index}`, `visible=${visible(input)}`,
      `disabled=${input.disabled}`, `has_form=${input.form !== null}`,
      `in_viewport=${x >= 0 && y >= 0 && x < win.innerWidth && y < win.innerHeight}`,
      `rect=${Math.round(rect.left)},${Math.round(rect.top)},${Math.round(rect.width)},${Math.round(rect.height)}`,
      `uncovered=${hit === input}`, `blocker_tag=${blocker?.tagName.toLowerCase() ?? 'none'}`,
      `blocker_position=${style?.position ?? 'none'}`,
      `dialog=${dialog != null}`, `context=${contextKind}`,
    ].join(' '));
  });
}

describe('public login overlay diagnostics (not authentication verification)', () => {
  before(() => {
    const base = Cypress.config('baseUrl');
    if (base === null || new URL(base).origin !== 'https://swingerslife.cz') {
      throw new Error('Public diagnostics must target https://swingerslife.cz explicitly.');
    }
  });

  it('records sanitized blocker metadata before any interaction', () => {
    cy.visit('/login', { failOnStatusCode: false, log: false });
    cy.get('input[type="password"]', { log: false }).should('exist');
    cy.document({ log: false }).then((doc) => snapshot(doc, 'initial'));
    // A second diagnostic sample distinguishes delayed overlays/hydration from
    // the first render. This is not used to make the contract tests pass.
    cy.wait(1500, { log: false });
    cy.document({ log: false }).then((doc) => snapshot(doc, 'settled'));
  });
});
