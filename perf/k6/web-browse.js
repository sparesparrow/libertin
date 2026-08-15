import http from 'k6/http';
import { check, group } from 'k6';

import {
  BASE_URL,
  BUDGET_THRESHOLD,
  PEAK_VUS,
  ROUTES,
  UI_RESPONSE_BUDGET_MS,
} from './lib/budget.js';

/**
 * C12.1 acceptance harness — UI response under peak load.
 *
 * ## What this measures, and what it does not
 *
 * It measures server response time for the web front-end's document requests:
 * the time from sending the request to having the full HTML body. That is the
 * part the system controls and the part a load test can honestly assert.
 *
 * It does NOT measure what a member perceives. Time-to-interactive also
 * includes DNS, TLS, the client bundle parsing and hydration, and the network
 * between Prague and the host — none of which k6 exercises. A green run here is
 * a necessary condition for C12.1, not a sufficient one. Browser-side timings
 * belong with the Playwright work (E11-T5).
 *
 * ## Correctness is part of the budget
 *
 * Every request is checked for the right *content*, not just a 200. A gated
 * response served in 40 ms is fast because it is withholding the page — count
 * that as a pass and the harness would reward the privacy gate for making the
 * numbers look good. So the confirmed-visitor requests assert the real page
 * came back, and the unconfirmed one asserts it did not.
 */

const AGE_COOKIE = 'libertin.age=1';

export const options = {
  scenarios: {
    // Ramp up, hold at peak, ramp down. The hold is what the thresholds are
    // really about; the ramps exist so the system is not judged on a cold JIT.
    peak: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: __ENV.RAMP_UP || '20s', target: PEAK_VUS },
        { duration: __ENV.HOLD || '1m', target: PEAK_VUS },
        { duration: __ENV.RAMP_DOWN || '10s', target: 0 },
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    // The contract line, applied per route so a fast gate cannot mask a slow
    // landing page in the aggregate.
    [`http_req_duration{route:${ROUTES.gate}}`]: [BUDGET_THRESHOLD],
    [`http_req_duration{route:${ROUTES.landing}}`]: [BUDGET_THRESHOLD],
    [`http_req_duration{route:${ROUTES.login}}`]: [BUDGET_THRESHOLD],

    // A run that only meets the budget by failing requests has not met it.
    http_req_failed: ['rate<0.01'],
    // Content assertions, per the note above.
    checks: ['rate>0.99'],
  },
  // Discretion is a feature (C2): never ship results to a third-party service.
  // Any summary output stays on the machine that ran it.
  noConnectionReuse: false,
  userAgent: 'libertin-k6/1.0 (perf harness; C12.1)',
};

function get(path, tag, extraHeaders) {
  return http.get(`${BASE_URL}${path}`, {
    headers: Object.assign({ Accept: 'text/html' }, extraHeaders || {}),
    tags: { route: tag },
  });
}

export default function () {
  group('unconfirmed visitor sees the gate', () => {
    const response = get('/', ROUTES.gate);

    check(response, {
      'gate: 200': (r) => r.status === 200,
      'gate: renders the age gate': (r) => r.body.includes('age-gate-title'),
      // The E14-T5b guarantee, asserted under load: the landing page's tree
      // must not be in the response body, not even in the RSC seed.
      'gate: withholds the page tree': (r) => !r.body.includes('categories-heading'),
    });
  });

  group('confirmed visitor browses', () => {
    const headers = { Cookie: AGE_COOKIE };

    const landing = get('/', ROUTES.landing, headers);
    check(landing, {
      'landing: 200': (r) => r.status === 200,
      'landing: serves the real page': (r) => r.body.includes('categories-heading'),
    });

    const login = get('/login', ROUTES.login, headers);
    check(login, {
      'login: 200': (r) => r.status === 200,
      'login: not gated': (r) => !r.body.includes('age-gate-title'),
    });
  });
}

/**
 * Compact, self-contained run report.
 *
 * Written by hand rather than pulling k6's `textSummary` from jslib.k6.io: that
 * is a remote import evaluated at run time, and an acceptance harness for an
 * on-premise system (C2) must not need the public internet to produce a result.
 */
export function handleSummary(data) {
  const pct = BUDGET_THRESHOLD.match(/p\((\d+)\)/)[1];
  const lines = [
    '',
    `C12.1 — UI response budget`,
    `  target      ${BASE_URL}`,
    `  budget      p(${pct}) < ${UI_RESPONSE_BUDGET_MS} ms`,
    `  peak load   ${PEAK_VUS} VUs   (placeholder — see D-007)`,
    '',
  ];

  let failed = false;

  for (const route of Object.values(ROUTES)) {
    const metric = data.metrics[`http_req_duration{route:${route}}`];
    if (!metric) continue;
    const measured = metric.values[`p(${pct})`];
    const ok = measured < UI_RESPONSE_BUDGET_MS;
    if (!ok) failed = true;
    lines.push(
      `  ${route.padEnd(9)} p(${pct})=${measured.toFixed(1)}ms  med=${metric.values.med.toFixed(1)}ms  ` +
        `max=${metric.values.max.toFixed(1)}ms  ${ok ? 'PASS' : 'FAIL'}`,
    );
  }

  // A fast run that served the wrong thing is not a pass — see the note at the
  // top of this file about the gate making the numbers look good.
  const checks = data.metrics.checks;
  const reqFailed = data.metrics.http_req_failed;
  if (checks) {
    const rate = checks.values.rate;
    if (rate <= 0.99) failed = true;
    lines.push(
      '',
      `  content checks   ${(rate * 100).toFixed(2)}% passed ` +
        `(${checks.values.passes} ok / ${checks.values.fails} failed)  ${rate > 0.99 ? 'PASS' : 'FAIL'}`,
    );
  }
  if (reqFailed) {
    const rate = reqFailed.values.rate;
    if (rate >= 0.01) failed = true;
    lines.push(
      `  request errors   ${(rate * 100).toFixed(2)}%  ${rate < 0.01 ? 'PASS' : 'FAIL'}`,
    );
  }
  if (data.metrics.iterations) {
    lines.push(`  iterations       ${data.metrics.iterations.values.count}`);
  }

  lines.push('', failed ? '  RESULT: FAIL' : '  RESULT: PASS', '');

  return {
    stdout: lines.join('\n'),
    // Machine-readable copy for CI to archive; gitignored, never committed —
    // a run result is a measurement of one machine, not contracted evidence.
    'perf/k6/.results/web-browse.json': JSON.stringify(data, null, 2),
  };
}
