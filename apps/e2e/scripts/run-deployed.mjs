#!/usr/bin/env node
/**
 * Runs the module or platform suite against a deployed client.
 *
 *   pnpm e2e:modules                                  -> https://libertin.app
 *   CYPRESS_BASE_URL=https://staging.example pnpm e2e:modules
 *
 * These two suites exercise the deployed product (the modules do not exist in
 * this repo's `apps/web`), so their sensible default is the deployment, not
 * `cypress.config.ts`'s `http://localhost:3000` — which is right for the local
 * suite and wrong for these. Before this wrapper, running either without an
 * explicit URL drove specs against a port nothing was listening on.
 *
 * Why a wrapper instead of the obvious alternatives:
 *  - `CYPRESS_BASE_URL=... cypress run` inline in package.json is POSIX shell
 *    syntax; on Windows cmd.exe/PowerShell it fails outright.
 *  - `cypress run --config baseUrl=...` outranks the CYPRESS_BASE_URL env var,
 *    so it would silently override the one switch the whole suite is built
 *    around (and the CI dispatch input that feeds it).
 * Setting the variable only when it is unset keeps the precedence intact.
 *
 * An *empty* CYPRESS_BASE_URL counts as unset: that is exactly the CI
 * misconfiguration fixed in 71faab3, where an unset repo variable arrived as
 * the empty string.
 *
 * The same default lives in `.github/workflows/ci.yml` and `.gitlab-ci.yml`;
 * change all three together.
 */
import { spawnSync } from 'node:child_process';

const DEPLOYED_DEFAULT = 'https://libertin.app';

const SPECS = {
  modules: 'cypress/e2e/modules/**/*.cy.ts',
  platform: 'cypress/e2e/platform/**/*.cy.ts',
  // Records observations (reports/<host>/explore/observations.md); asserts nothing.
  explore: 'cypress/e2e/explore/**/*.cy.ts',
};

const [suite, ...passThrough] = process.argv.slice(2);

if (!suite || !(suite in SPECS)) {
  console.error(`usage: run-deployed.mjs <${Object.keys(SPECS).join('|')}> [cypress args…]`);
  process.exit(2);
}

const env = { ...process.env };
if (!env.CYPRESS_BASE_URL) env.CYPRESS_BASE_URL = DEPLOYED_DEFAULT;
// Gives each suite its own screenshots/ and reports/ folder — see the SUITE
// comment in cypress.config.ts for the run that lost its evidence without it.
env.LIBERTIN_SUITE = suite;

console.log(`→ e2e:${suite} proti ${env.CYPRESS_BASE_URL}`);

const result = spawnSync('cypress', ['run', '--spec', SPECS[suite], ...passThrough], {
  stdio: 'inherit',
  env,
  // Resolves `cypress.cmd` from node_modules/.bin on Windows.
  shell: process.platform === 'win32',
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}
process.exit(result.status ?? 1);
