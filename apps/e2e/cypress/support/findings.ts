/**
 * Finding buffer.
 *
 * Findings are collected in memory and flushed to the Node process in an
 * `afterEach`, rather than being sent with `cy.task` at the point they are
 * noticed. That indirection is load-bearing, not decoration:
 *
 * `cy.task` is a queued Cypress command, so it does not run when it is called,
 * it runs when the queue reaches it. A check that records a finding and then
 * asserts in the same callback — the shape every check here wants — throws
 * synchronously, the queue is torn down, and the queued `cy.task` never
 * executes. The run then fails *and* reports none of the detail explaining
 * why. Buffering in plain memory and flushing afterwards survives the failure,
 * because `afterEach` still runs.
 *
 * The buffer hangs off `globalThis` rather than living in a module-level
 * `const`. Cypress bundles the support file and each spec file, and a module
 * reached by two different specifiers can end up instantiated twice — at which
 * point the specs write to one array and the flush reads an empty other one.
 * That failure is silent, which is the worst kind: the suite reports fewer
 * problems than it found. One well-known global has no such failure mode.
 */

export interface Finding {
  readonly module: string;
  readonly route: string;
  readonly kind: string;
  readonly detail: string;
}

const BUFFER_KEY = '__libertinE2eFindings__';

type FindingGlobal = typeof globalThis & { [BUFFER_KEY]?: Finding[] };

function buffer(): Finding[] {
  const scope = globalThis as FindingGlobal;
  const existing = scope[BUFFER_KEY];
  if (existing !== undefined) return existing;
  const created: Finding[] = [];
  scope[BUFFER_KEY] = created;
  return created;
}

export function recordFinding(finding: Finding): void {
  buffer().push(finding);
}

/**
 * Record a finding from a spec.
 *
 * Deliberately a plain function and not a `cy.*` command: a command would be
 * queued, and the callbacks that notice findings are the same ones that throw
 * on the assertion immediately afterwards. A queued command placed there never
 * runs. Calling this is synchronous, so it always does.
 */
export function note(module: string, route: string, kind: string, detail: string): void {
  recordFinding({ module, route, kind, detail });
}

/** Returns everything buffered so far and empties the buffer. */
export function drainFindings(): Finding[] {
  const pending = buffer();
  const drained = [...pending];
  pending.length = 0;
  return drained;
}
