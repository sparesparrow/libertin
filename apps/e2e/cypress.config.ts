import { mkdirSync, writeFileSync } from 'node:fs';

import { defineConfig } from 'cypress';

/**
 * Cypress harness for the Libertin web client (backlog E11-T5).
 *
 * The suite is written to run against *any* deployment of the client, because
 * today the module work under test lives on a preview deployment while this
 * repository still carries the landing/auth slice. `CYPRESS_BASE_URL` is the
 * only switch:
 *
 *   pnpm e2e:local     -> http://localhost:3000        (this repo, `next start`)
 *   pnpm e2e:modules   -> CYPRESS_BASE_URL=<preview>   (module verification)
 *
 * Nothing in the specs hardcodes a host.
 */

const DEFAULT_BASE_URL = 'http://localhost:3000';

const BASE_URL = process.env.CYPRESS_BASE_URL ?? DEFAULT_BASE_URL;

/**
 * Artifacts are kept per target host.
 *
 * Cypress empties its output folders at the start of every run, so with one
 * shared folder the second suite silently destroys the first one's evidence:
 * running `e2e:local` after `e2e:modules` left the deployed run's failure
 * screenshots gone, with nothing to say they had ever existed. The two suites
 * point at different hosts, so the host is the natural separator.
 */
function targetSlug(url: string): string {
  try {
    return new URL(url).host.replace(/[^a-zA-Z0-9.-]/g, '_');
  } catch {
    return 'unknown-target';
  }
}

const TARGET = targetSlug(BASE_URL);

/**
 * Evidence and failure screenshots live in sibling folders, not one shared one.
 *
 * Splitting by host was necessary but not sufficient: both the evidence run and
 * the verification run point at the *same* host, so the evidence run trashed
 * the failure screenshots exactly as the local run had trashed them before.
 * The axis that matters is which kind of run produced the image, because the
 * two answer different questions — "what is wrong" versus "where did the test
 * blow up" — and neither should be able to delete the other.
 */
const CAPTURING_EVIDENCE = process.env.CYPRESS_CAPTURE_EVIDENCE === '1';
const ARTIFACT_KIND = CAPTURING_EVIDENCE ? 'evidence' : 'failures';

/**
 * The third axis: which suite. Host and kind were still not enough.
 *
 * `e2e:modules` and `e2e:platform` hit the same host and are both failure runs,
 * so they shared one folder — and Cypress empties its output folders at the
 * start of every run. Running them back to back (which is exactly what the CI
 * job does) meant the platform suite silently deleted every module failure
 * screenshot and overwrote the module findings. On 2026-09-23 that erased the
 * three homepage failure screenshots, including the one for the B13 language
 * switcher, and the `missing-empty-state` finding, with nothing to say they had
 * ever existed.
 *
 * Set by `scripts/run-deployed.mjs`. When it is unset — the local suite, the
 * evidence run, `cy:open` — the layout is unchanged, so nothing that reads the
 * old paths (e.g. `scripts/publish-evidence.mjs`) moves.
 */
const SUITE = process.env.LIBERTIN_SUITE?.replace(/[^a-z0-9-]/gi, '') || '';
const ARTIFACT_ROOT = SUITE ? `${TARGET}/${SUITE}` : TARGET;

/**
 * C12.1 — contracted acceptance limit for a UI response is 1,5 s. Kept as an
 * env value so a run can tighten it, never so a run can quietly loosen it in
 * CI: the pipeline pins it to the contract number.
 */
const RESPONSE_BUDGET_MS = Number(process.env.LIBERTIN_RESPONSE_BUDGET_MS ?? 1500);

/**
 * An observation is a neutral fact recorded by the exploration suite
 * (`cypress/e2e/explore/`): what a control is called, what a banner stores,
 * which languages a menu offers. Unlike a finding it claims nothing is wrong,
 * so it is written to its own report and never mixed into `findings.txt`.
 */
interface Observation {
  readonly spec: string;
  readonly route: string;
  readonly topic: string;
  readonly data: unknown;
}

/** A finding is an observation that is reported but does not fail the run. */
interface Finding {
  readonly module: string;
  readonly route: string;
  readonly kind: string;
  readonly detail: string;
}

export default defineConfig({
  e2e: {
    baseUrl: BASE_URL,
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: 'cypress/support/e2e.ts',
    fixturesFolder: 'cypress/fixtures',
    screenshotsFolder: `screenshots/${ARTIFACT_ROOT}/${ARTIFACT_KIND}`,
    videosFolder: `videos/${ARTIFACT_ROOT}/${ARTIFACT_KIND}`,
    downloadsFolder: 'downloads',

    video: false,
    screenshotOnRunFailure: true,

    viewportWidth: 1280,
    viewportHeight: 800,

    // A preview deployment cold-starts; a real user would wait too, but the
    // perf spec is what judges latency, not the transport timeout.
    defaultCommandTimeout: 10_000,
    pageLoadTimeout: 60_000,
    requestTimeout: 20_000,

    retries: { runMode: 2, openMode: 0 },

    experimentalMemoryManagement: true,

    setupNodeEvents(on, config) {
      /**
       * Keyed by module+route+kind+detail so a retried test does not report the
       * same problem three times. Retries exist to absorb flake, not to
       * multiply findings.
       */
      const findings = new Map<string, Finding>();
      const observations: Observation[] = [];

      on('task', {
        recordFindings(batch: Finding[]): null {
          for (const finding of batch) {
            findings.set(
              `${finding.module}|${finding.route}|${finding.kind}|${finding.detail}`,
              finding,
            );
          }
          return null;
        },

        recordObservation(observation: Observation): null {
          observations.push(observation);
          return null;
        },

        log(message: string): null {
          // eslint-disable-next-line no-console
          console.log(message);
          return null;
        },
      });

      on('after:run', () => {
        const reportDir = `reports/${ARTIFACT_ROOT}`;

        if (observations.length > 0) {
          mkdirSync(reportDir, { recursive: true });
          writeFileSync(
            `${reportDir}/observations.json`,
            `${JSON.stringify(observations, null, 2)}\n`,
            'utf8',
          );
          const md = [`# Pozorování — ${BASE_URL}`, ''];
          for (const o of observations) {
            md.push(`## ${o.topic} — \`${o.route}\``, '', '```json', JSON.stringify(o.data, null, 2), '```', '');
          }
          writeFileSync(`${reportDir}/observations.md`, `${md.join('\n')}\n`, 'utf8');
        }

        if (findings.size === 0) return;

        const byKind = new Map<string, Finding[]>();
        for (const finding of findings.values()) {
          const bucket = byKind.get(finding.kind) ?? [];
          bucket.push(finding);
          byKind.set(finding.kind, bucket);
        }

        const lines = [`\n=== Nálezy Libertin e2e (${findings.size}) ===`];
        for (const [kind, bucket] of [...byKind.entries()].sort()) {
          lines.push(`\n${kind} (${bucket.length})`);
          for (const finding of bucket) {
            lines.push(`  ${finding.module} ${finding.route} — ${finding.detail}`);
          }
        }
        const report = lines.join('\n');

        // eslint-disable-next-line no-console
        console.log(report);

        mkdirSync(reportDir, { recursive: true });
        writeFileSync(`${reportDir}/findings.txt`, `${report}\n`, 'utf8');
        writeFileSync(
          `${reportDir}/findings.json`,
          `${JSON.stringify([...findings.values()], null, 2)}\n`,
          'utf8',
        );
      });

      config.env.responseBudgetMs = RESPONSE_BUDGET_MS;
      return config;
    },
  },
});
