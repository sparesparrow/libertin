/**
 * Credentials for the authenticated module specs.
 *
 * Seven of the nine modules redirect to `/login` on hydration, so without a
 * seeded account those specs cannot assert anything about the module — they
 * would only ever be testing the login page. They are therefore *skipped*
 * rather than passed when no credentials are configured: a vacuous green run
 * is worse than an honest gap, because it reports coverage that does not exist.
 *
 * Supply them as Cypress env values, never as literals in the repo:
 *
 *   CYPRESS_TEST_USERNAME=... CYPRESS_TEST_PASSWORD=... pnpm e2e:modules
 *
 * In CI they belong in masked/protected variables (GitLab) or repository
 * secrets (GitHub), and the account behind them must be a throwaway test
 * member with no real personal data — this is an adult platform, and a test
 * account that belongs to a person is a privacy incident waiting to happen.
 */

export function testUsername(): string | undefined {
  const value = Cypress.env('TEST_USERNAME');
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export function testPassword(): string | undefined {
  const value = Cypress.env('TEST_PASSWORD');
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export function hasCredentials(): boolean {
  return testUsername() !== undefined && testPassword() !== undefined;
}

export const NO_CREDENTIALS_REASON =
  'skipped: no CYPRESS_TEST_USERNAME / CYPRESS_TEST_PASSWORD configured — this module requires a signed-in session';
