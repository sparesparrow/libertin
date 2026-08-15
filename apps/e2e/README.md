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

# a deployed client
CYPRESS_BASE_URL=https://example.vercel.app pnpm --filter @libertin/e2e e2e:modules

# interactive
CYPRESS_BASE_URL=https://example.vercel.app pnpm --filter @libertin/e2e cy:open
```

### PowerShell (Windows)

`VAR=value command` is shell syntax that PowerShell does not have — it will try
to run a command literally named `CYPRESS_BASE_URL=https://…` and fail. Set the
variable in the environment first, then run:

```powershell
# this repo's client, production build, server started and stopped for you
pnpm --filter @libertin/e2e e2e:local:ci

# a deployed client
$env:CYPRESS_BASE_URL = "https://example.vercel.app"
pnpm --filter @libertin/e2e e2e:modules

# interactive
pnpm --filter @libertin/e2e cy:open

# the variable lives for the rest of the session — clear it when you switch back
Remove-Item Env:\CYPRESS_BASE_URL
```

Scoped to a single command, without leaving the variable set:

```powershell
$env:CYPRESS_BASE_URL = "https://example.vercel.app"
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
    platform/    cross-cutting: shell, a11y, perf, Czech copy, discretion, leaks
    local/       this repo's apps/web — age gate, login, security headers
  support/
    routes.ts    module -> route registry; the single place a path is written
    commands.ts  visitModule, login, settle, visibleText, dismissCookieBanner
    findings.ts  the finding buffer (read the comment before changing it)
    session.ts   openModule() — the auth guard that skips instead of lying
    errors.ts    console/uncaught error collection
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
