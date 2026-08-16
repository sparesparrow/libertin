/**
 * Copy the curated evidence screenshots into `docs/e2e-evidence/`, where they
 * are committed alongside the report that cites them.
 *
 * Run output is normally gitignored on purpose — a screenshot from one run on
 * one day is a measurement, not source. Evidence is the exception: the report
 * makes claims about a system we do not control, and a claim whose proof lives
 * in a gitignored folder on a container that no longer exists cannot be checked
 * by anyone later. So this set is deliberately promoted out of run output and
 * into the docs.
 */
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';

const HOST = process.argv[2] ?? 'libertine-omega.vercel.app';
const source = resolve(`screenshots/${HOST}/evidence/evidence.cy.ts`);
const target = resolve('../../docs/e2e-evidence');

if (!existsSync(source)) {
  console.error(`No evidence at ${source}\nRun: CYPRESS_CAPTURE_EVIDENCE=1 pnpm evidence`);
  process.exit(1);
}

// Replace wholesale rather than merge: a stale image left behind from an older
// capture would be cited by the report as if it were current.
rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });

const files = readdirSync(source).filter((f) => f.endsWith('.png')).sort();
for (const file of files) {
  cpSync(join(source, file), join(target, file));
}
console.log(`Published ${files.length} evidence screenshots to docs/e2e-evidence/`);
for (const file of files) console.log(`  ${file}`);
