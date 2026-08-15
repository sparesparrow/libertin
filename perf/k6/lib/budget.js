/**
 * The contract's performance budget, in one place.
 *
 * C12.1 is an acceptance gate, not a target: "odezva uživatelského rozhraní do
 * 1,5 s při špičkovém zatížení". Everything here exists so that number lives in
 * source next to the thing that measures it, rather than in a document nobody
 * runs.
 */

/** C12.1 — hard ceiling for a UI response, in milliseconds. */
export const UI_RESPONSE_BUDGET_MS = 1500;

/**
 * Which percentile the budget is judged at.
 *
 * This is an interpretation, and it decides what passes acceptance, so it is
 * recorded as decision D-007 in docs/backlog.yaml rather than settled here.
 * A literal reading of "odezva do 1,5 s" is p(100) — every response, no
 * exceptions. p(95) is the industry-standard reading and what this harness
 * defaults to; p(100) on a network measurement fails on a single GC pause or
 * a retransmit, which tests the network more than the system.
 *
 * Override with `-e BUDGET_PERCENTILE=99` to see how much headroom there is
 * before the stricter reading would bite.
 */
export const BUDGET_PERCENTILE = Number(__ENV.BUDGET_PERCENTILE || 95);

/**
 * Peak load, in virtual users.
 *
 * The contract says "špičkové zatížení" without a number. 50 VUs is a
 * placeholder that keeps the harness runnable, NOT a contracted figure — the
 * real value has to come from the owner (expected concurrent members at peak)
 * before any run of this can be called an acceptance test. Tracked as D-007.
 */
export const PEAK_VUS = Number(__ENV.PEAK_VUS || 50);

/** Target under test. Defaults to a local `next start`. */
export const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:3000';

/**
 * The threshold expression every measured route is judged by.
 *
 * Kept as a single shared string so no route can silently drift onto a laxer
 * budget than the contract allows.
 */
export const BUDGET_THRESHOLD = `p(${BUDGET_PERCENTILE})<${UI_RESPONSE_BUDGET_MS}`;

/** Routes measured against the budget, tagged so each one is judged separately. */
export const ROUTES = {
  /** Unconfirmed visitor: the age gate (E14-T5b rewrite target). */
  gate: 'gate',
  /** Confirmed visitor: the real landing page. */
  landing: 'landing',
  /** Confirmed visitor: the login screen — the heaviest client bundle today. */
  login: 'login',
};
