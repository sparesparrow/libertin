# @libertin/e2e

Cypress end-to-end suite for the Libertin web client. Backlog: **E11-T5**.

## Two targets, one suite

The suite is written against *any* deployment of the client, because the work
is currently split across two of them:

| Command | Target | Gates merges |
|---|---|---|
| `pnpm e2e:local` | this repo's `apps/web` on `localhost:3000` | yes |
| `pnpm e2e:modules` | a deployed client via `CYPRESS_BASE_URL` | no — manual |
| `pnpm e2e:platform` | same, cross-cutting checks | no — manual |

Nothing in the specs hardcodes a host. `CYPRESS_BASE_URL` is the only switch.

### bash / zsh (Linux, macOS)

```bash
# this repo's client, production build, server started and stopped for you
pnpm --filter @libertin/e2e e2e:local:ci

# the deployed client — defaults to https://libertin.app
pnpm --filter @libertin/e2e e2e:modules
pnpm --filter @libertin/e2e e2e:platform

# any other deployment
CYPRESS_BASE_URL=https://staging.example.com pnpm --filter @libertin/e2e e2e:modules

# interactive (cy:open does not go through the wrapper — pass the URL)
CYPRESS_BASE_URL=https://libertin.app pnpm --filter @libertin/e2e cy:open
```

### PowerShell (Windows)

`VAR=value command` is shell syntax that PowerShell does not have — it will try
to run a command literally named `CYPRESS_BASE_URL=https://…` and fail. Set the
variable in the environment first, then run:

```powershell
# this repo's client, production build, server started and stopped for you
pnpm --filter @libertin/e2e e2e:local:ci

# the deployed client — defaults to https://libertin.app, no variable needed
pnpm --filter @libertin/e2e e2e:modules

# any other deployment
$env:CYPRESS_BASE_URL = "https://staging.example.com"
pnpm --filter @libertin/e2e e2e:modules

# interactive
pnpm --filter @libertin/e2e cy:open

# the variable lives for the rest of the session — clear it when you switch back
Remove-Item Env:\CYPRESS_BASE_URL
```

Scoped to a single command, without leaving the variable set:

```powershell
$env:CYPRESS_BASE_URL = "https://staging.example.com"
try { pnpm --filter @libertin/e2e e2e:modules }
finally { Remove-Item Env:\CYPRESS_BASE_URL -ErrorAction SilentlyContinue }
```

#### Windows notes

- **Run from the repo root or with `--filter`.** Both work; `--filter` is what
  the examples use so the working directory does not matter.
- **`cy:open` needs a desktop session.** It will not work over plain SSH or in
  a container without a display. `cypress run` is headless and works anywhere.
- **Long paths.** Cypress and pnpm both nest deeply. If installs fail with
  `ENAMETOOLONG` or `EPERM`, enable long paths once, from an elevated shell:

  ```powershell
  New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" `
    -Name LongPathsEnabled -Value 1 -PropertyType DWORD -Force
  git config --global core.longpaths true
  ```

- **Antivirus and the binary.** The Cypress binary unpacks to
  `$env:LOCALAPPDATA\Cypress\Cache` and is ~250 MB. Real-time scanning makes
  the first run noticeably slow; excluding that folder helps. To relocate it,
  set `CYPRESS_CACHE_FOLDER` before installing.
- **Corporate proxy.** Set `HTTPS_PROXY` before `pnpm install` so the binary
  download goes through it, and `NODE_EXTRA_CA_CERTS` to your CA bundle if TLS
  is intercepted:

  ```powershell
  $env:HTTPS_PROXY = "http://proxy.example:8080"
  $env:NODE_EXTRA_CA_CERTS = "C:\path\to\ca-bundle.crt"
  pnpm install
  ```

- **If the binary download fails partway**, `pnpm install` reports a checksum
  mismatch rather than retrying. Download the zip yourself and install from it:

  ```powershell
  Invoke-WebRequest -Uri "https://cdn.cypress.io/desktop/15.20.1/win32-x64/cypress.zip" `
    -OutFile "$env:TEMP\cypress.zip"
  $env:CYPRESS_INSTALL_BINARY = "$env:TEMP\cypress.zip"
  pnpm --filter @libertin/e2e exec cypress install --force
  Remove-Item Env:\CYPRESS_INSTALL_BINARY
  pnpm --filter @libertin/e2e cy:verify
  ```

- **`pnpm install` skips the Cypress binary by default** unless the package is
  allowed to run build scripts. The root `package.json` already lists it under
  `pnpm.onlyBuiltDependencies`, so a plain `pnpm install` is enough. If it was
  skipped anyway, `pnpm approve-builds` or the manual install above fixes it.

## The test account

Seven of the nine modules redirect an anonymous visitor to `/login` on
hydration. Without a seeded member account those specs cannot assert anything
about the module — they would only ever be testing the login page — so they
are **skipped**, not passed:

```bash
# bash / zsh
CYPRESS_TEST_USERNAME=... CYPRESS_TEST_PASSWORD=... pnpm e2e:modules
```

```powershell
# PowerShell
$env:CYPRESS_TEST_USERNAME = "..."
$env:CYPRESS_TEST_PASSWORD = "..."
pnpm --filter @libertin/e2e e2e:modules
Remove-Item Env:\CYPRESS_TEST_USERNAME, Env:\CYPRESS_TEST_PASSWORD
```

Do not put the password in a script you commit, and be aware that typing it as
a literal above puts it in your PowerShell history
(`$env:APPDATA\Microsoft\Windows\PowerShell\PSReadline\ConsoleHost_history.txt`).
`Read-Host -AsSecureString` avoids that:

```powershell
$cred = Get-Credential -Message "Libertin e2e test account"
$env:CYPRESS_TEST_USERNAME = $cred.UserName
$env:CYPRESS_TEST_PASSWORD = $cred.GetNetworkCredential().Password
```

A skipped test is reported as pending and the run says how many. That is
deliberate. A green run that tested the login page nine times would report
coverage that does not exist, which is worse than an honest gap.

The account must be a throwaway test member with no real personal data. This is
an adult platform; a test account that belongs to a person is a privacy
incident waiting to happen. In CI it belongs in masked/protected variables
(GitLab) or repository secrets (GitHub), never in this repo.

## Layout

```
cypress/
  e2e/
    modules/     one spec per module the owner tracks
    platform/    cross-cutting: shell, a11y, perf, Czech copy, discretion, leaks,
                 public pages, decent mode, member exposure
    explore/     records what the deployed client does; asserts nothing
    scenarios/   persona journeys across pages; some submit real forms
    local/       this repo's apps/web — age gate, homepage, login, copy,
                 accessibility, public surface, security headers
  support/
    routes.ts    module -> route registry; the single place a path is written
    commands.ts  visitModule, login, settle, visibleText, dismissCookieBanner
    findings.ts  the finding buffer (read the comment before changing it)
    session.ts   openModule() — the auth guard that skips instead of lying
    errors.ts    console/uncaught error collection
    observe.ts   observation helpers for explore/ (names and counts, never values)
    scenario.ts  Journey (steps + write guard), viewports, language/decent-mode helpers
```

## Things worth knowing before you edit a spec

**A 404 here answers HTTP 200.** The deployment serves unknown paths with
status 200 and renders the Next.js 404 screen on the client, out of the RSC
payload — which *every* page carries. So neither the status code nor the served
HTML distinguishes a live route from a dead one. Only the built DOM does:
`h1.next-error-h1` exists as an element solely on the 404 screen. That is what
`cy.visitModule` checks, and it is why the dead-link spec navigates instead of
using `cy.request`.

**`$body.text()` lies.** Next inlines the whole RSC payload into `<script>`
tags inside `<body>`, so raw text matching finds every string the server ever
serialised, including ones that never render. Use `cy.visibleText()`, which
strips script/style first. The exception is `platform/rsc-leak.cy.ts`, which
reads the raw body on purpose — the payload is exactly what it is auditing.

**Record findings with `note()`, never a `cy.*` command.** `cy.task` is queued,
so it runs when the queue reaches it. A check that records a finding and then
asserts in the same callback — the shape every check here wants — throws
synchronously, the queue is torn down, and the finding is never sent. The run
then fails *and* reports none of the detail explaining why. `note()` is
synchronous and buffers; `support/e2e.ts` flushes in `afterEach`, which still
runs after a failure. This was a real bug in this suite, found by noticing that
failing tests reported fewer findings than passing ones.

**The cookie banner intercepts pointer events.** `cy.visitModule` dismisses it
by default. Pass `{ keepCookieBanner: true }` when the banner itself is under
test.

**No `data-cy` hooks exist yet.** Every selector here is user-visible text, an
ARIA label, or a role. That is honest but brittle against copy changes, and it
cannot tell apart two elements that read the same. `cy.byCy('name')` is ready
for `[data-cy]` attributes as they land; move specs onto it when they do.

## Output

A run writes `reports/findings.txt` and `reports/findings.json`, grouped by
kind and deduplicated across retries, and prints the same report to the
terminal. Findings are observations that do not by themselves fail a test —
the assertions decide pass/fail, the findings explain what was seen.

Failure screenshots land in `screenshots/`. Both directories are gitignored and
are uploaded as CI artifacts.

## Performance

`platform/performance.cy.ts` enforces the contracted C12.1 budget (1 500 ms,
overridable with `LIBERTIN_RESPONSE_BUDGET_MS`). Read its numbers as a
*single-user* measurement from one machine with no concurrency: it can prove a
page is already over budget with nobody on it, but it cannot prove the contract
is met. Peak-load acceptance stays with the k6 harness in `perf/k6`
(E11-T4 / E11-T4b).


## Exploration (`e2e:explore`)

```bash
pnpm e2e:explore        # against https://libertin.app; writes reports/<host>/explore/observations.md
```

The exploration suite records what the deployed client *does* and asserts
nothing. Run it before writing an assertion about a feature you have not seen
work. Two findings were withdrawn in September 2026 because checks were
written from assumptions:

- the language switcher was reported missing for a week. It is an icon button
  with no text (`aria-label="Jazyk"`), and its menu names English
  "Angličtina";
- the cookie banner was reported as having no one-click refusal. Its ✕ is one,
  and it works.

What it covers: an inventory of every visible control on the public pages
(this is how decent mode and the language button were found), what each exit
from the cookie banner stores and loads, every entry in the language menu and
what switching to it changes, and decent mode off versus on.

It records cookie and storage **names and lengths, never values**, because
signed-in runs carry session tokens. For member photos it records **counts,
never URLs**, because a photo URL contains the member's ID. Reports land in CI
artifacts, so neither may be copied into them.


## Scenarios (`e2e:scenarios`)

```bash
pnpm e2e:scenarios                             # against https://libertin.app
CYPRESS_ALLOW_SIGNUP=1 pnpm e2e:scenarios      # also creates one real account
```

The rest of the suite is organised by feature. A scenario follows a *person*
across pages, because some defects exist only between pages: a language or a
decent-mode choice that survives a reload but not a click, a cookie refusal
that is forgotten on the next full load, the Back button after logout, a layout
that breaks only at phone width.

| Spec | Persona | What it asserts |
| --- | --- | --- |
| `first-visit` | curious first-time visitor | real page at every hop, Back works, refusal via Detaily → Odmítnout holds, nothing written |
| `shared-device` | discreet visitor, shared laptop | decent mode stays on across *clicks* and Back; wall blurred |
| `english-visitor` | English speaker | `lang="en"` on every page reached by a link; banner not asked again |
| `phone` | visitor on a 390×844 phone | ✕ closes the banner, menus reachable, no page scrolls sideways |
| `keyboard-only` | no mouse | banner closable, login reachable, fillable and submittable by keyboard |
| `forgot-password` | member who forgot the password | one real request, address never in a URL, answer does not reveal whether the account exists |
| `register` | new member | server failure is reported and the form keeps its values; real signup only with `CYPRESS_ALLOW_SIGNUP=1` |
| `returning-member` | member on a shared device | after logout, Back does not show messages (skips without a test account) |

**Writes to production.** Every scenario runs inside a `Journey`
(`support/scenario.ts`) that intercepts every `POST`/`PUT`/`PATCH`/`DELETE`.
Only the endpoints in `WRITES` may pass, and each scenario lists the ones it
needs; anything else is answered locally with 418 and fails the test. The
endpoints were measured by `explore/form-submissions.cy.ts`, not guessed. A
default run sends exactly one forgot-password request (for an `example.com`
address) and one login with a made-up account, which the server refuses with
401. The ledger of every write, with field names only, is in
`reports/<host>/scenarios/observations.md`.

**Enter vs. Space.** `cy.press(Enter)` activates no native button on the
deployed client, not even the plain `<button>` of the language menu, so
`keyboard-only` activates buttons with Space. Don't report "Enter does not
work" from this suite: it's the tool, not the site.
