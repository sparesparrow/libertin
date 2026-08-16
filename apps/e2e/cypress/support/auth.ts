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

/**
 * Read a credential from the Cypress environment.
 *
 * Coerces rather than type-guarding on `string`, and that is not defensive
 * padding — it is a bug this suite actually hit. Cypress parses `CYPRESS_*`
 * values, so an all-digit password like `123456789` arrives as the **number**
 * 123456789, not a string. A `typeof value === 'string'` check silently
 * rejected it, `hasCredentials()` returned false, and every authenticated spec
 * reported *pending* — a run that looked like "no credentials configured" when
 * the credentials were right there. Numeric passwords are perfectly legal, so
 * the reader has to accept one.
 */
function credential(name: string): string | undefined {
  const value: unknown = Cypress.env(name);
  if (value === undefined || value === null) return undefined;
  const text = String(value);
  return text.length > 0 ? text : undefined;
}

export function testUsername(): string | undefined {
  return credential('TEST_USERNAME');
}

export function testPassword(): string | undefined {
  return credential('TEST_PASSWORD');
}

export function hasCredentials(): boolean {
  return testUsername() !== undefined && testPassword() !== undefined;
}

export interface SignupAccount {
  readonly nickname: string;
  readonly email: string;
  readonly password: string;
}

/**
 * Whether this run may create an account on the target deployment.
 *
 * Off unless `CYPRESS_ALLOW_SIGNUP=1`. Writing to someone else's member table
 * is not something a test suite should do as a side effect of running, and on
 * an adult platform a stray half-registered account is worse than ordinary
 * test debris.
 */
export function signupAllowed(): boolean {
  return String(Cypress.env('ALLOW_SIGNUP') ?? '') === '1';
}

/**
 * A throwaway account with no real personal data.
 *
 * The address is on `example.com`, which RFC 2606 reserves precisely so it can
 * never belong to anyone and can never receive mail. The nickname is stamped
 * so two runs never collide, and is obviously machine-made — anyone looking at
 * the member table should be able to tell at a glance that it is test debris
 * and not a person. The registration form marks the phone number optional, so
 * none is invented: a fabricated CZ number could belong to a real person.
 */
export function generateSignup(): SignupAccount {
  const stamp = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
  return {
    // The form caps the nickname at 12 characters.
    nickname: `cyp${stamp}`.slice(0, 12),
    email: `cypress-e2e+${stamp}@example.com`,
    password: `Cy!${stamp}Aa1`,
  };
}

export const NO_CREDENTIALS_REASON =
  'skipped: no CYPRESS_TEST_USERNAME / CYPRESS_TEST_PASSWORD configured — this module requires a signed-in session';
