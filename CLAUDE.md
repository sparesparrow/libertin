# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Working agreement for Libertin. Read this fully before starting work.

## What we're building

A CZ/SK adult social community platform (rebrand: `swingerslife.cz` →
**Libertin**), delivered as **contract work**. Web app (Next.js + TS) and mobile
app (React Native + TS, Expo), plus the backend and infrastructure the platform
runs on.

Audience: adults (naturist / swingers / BDSM / shibari), CZ + EN primary.
Design driver: **discretion as a feature** — members risk real-world harm from
being outed, so privacy UX is a product requirement, not a compliance checkbox.

## Commands

```bash
pnpm install                      # pnpm 10.33.0; engines require Node >= 20 (CI runs 22)
pnpm type-check                   # turbo, 7 projects — the gate that matters
pnpm test:all                     # vitest across the whole workspace (150 tests)
pnpm build                        # turbo build (next build for apps/web)
pnpm storybook                    # packages/ui → http://localhost:6006
```

Single package / single test:

```bash
pnpm vitest run packages/theme            # one package
pnpm --filter @libertin/ui test           # one workspace's suite
pnpm vitest run packages/i18n -t "cs"     # one test by name
```

End-to-end (Cypress 15, `apps/e2e`):

```bash
pnpm e2e                                       # builds web, serves it, runs cypress/e2e/local
pnpm e2e:modules                               # the 10 module specs, against https://libertin.app
pnpm e2e:platform                              # a11y, czech copy, discretion, perf, RSC leak, public pages
pnpm e2e:explore                               # records what the deployed client does; asserts nothing
CYPRESS_BASE_URL=https://staging.example.com pnpm e2e:modules   # any other deployment
pnpm --filter @libertin/e2e cy:install         # idempotent; needed after a cached pnpm install
```

**`pnpm lint` does not work.** `next lint` finds no ESLint config, prompts
interactively, and exits 1 — there is no eslint config file or dependency in the
repo. Do not put it in a verification chain and do not report it as passing.
Tracked as deferred in `docs/ci.md`.

## Scope: the contract is the spec

The owner decided the delivery follows the signed technical specification — the
**whole system**, not only a client layer over the legacy API.

- `docs/backlog.yaml` — **single source of truth** for scope, status, and the
  owner-owned `decisions` list (15 epics, ~72 tasks, all traced to contract codes).
- `docs/requirements-traceability.md` — every contract requirement (A1–A4,
  B1–B14, C1–C13) mapped to current state.
- `docs/team-workflow.md` — how the agent team iterates without colliding.
- `.claude/agents/*.md` — the roles that do the work.
- `docs/adr/` — decisions, with honest trade-offs.

Never invent scope, never silently drop a contracted requirement. Blocking
decisions belong to the owner — record them under `decisions` in the backlog.

Hard acceptance gates from the contract: **UI response ≤ 1,5 s under peak load**
(C12.1), full **CS+EN** delivery (B13), **2FA with SMS + TOTP + passkey**
(B4.2), on-premise maximum (C2), containerised components (C3), **Ansible IaC**
(C11.2), GitLab CI/CD (C10), and handover to an **external operator** (C8).

## The rule that matters most for clients

**Treat the API contract as frozen, untrusted external input.**
- Capture the live API as an OpenAPI/HAR snapshot, commit it as
  `contracts/openapi.snapshot.yaml`.
- The typed client in `packages/api` is currently **hand-written** against the
  snapshot — there is no codegen yet (E11-T3). Agreement therefore rests on
  discipline plus the contract-check task, not on a generator.
- CI fails loudly when the live shape drifts from the snapshot.
- This is the same pattern as freezing a FlatBuffers ICD — never call raw
  `fetch`; always go through the snapshot-locked client.

Until credentials exist, run everything against **MSW mocks** derived from the
snapshot so the apps boot with zero backend.

## Repo shape (pnpm + Turborepo monorepo)

```
libertin/
  apps/
    web/            # Next.js 14 (app router), TS
    mobile/         # Expo (React Native), TS
    e2e/            # Cypress suite (@libertin/e2e, private)
  packages/
    ui/             # shared components (web + RN variants), Storybook
      .storybook/       # the repo's own Storybook
      .storybook-ds/    # scoped config for the claude.ai/design sync (see below)
    theme/          # design tokens: tokens.css (web) + native.ts (RN)
    i18n/           # i18next setup + locales.json (cs/en)
    api/            # typed client + MSW mocks, locked to the snapshot
  contracts/openapi.snapshot.yaml
  perf/             # k6 budgets (C12.1)
  infra/            # Docker / Ansible
  .design-sync/     # committed inputs for the claude.ai/design sync
```

## Architecture — the parts that span files

**Styling has no class vocabulary.** Web components style themselves with inline
React `style` objects whose values are `var(--token)` references from
`packages/theme/tokens.css`; native screens read the parallel `nativeTheme`
object from `@libertin/theme/native`. There are no utility classes, CSS modules,
or styled-components anywhere. `tokens.css` deliberately defines no
`font-family`. The night theme is the `data-theme="private"` attribute on an
ancestor, which re-points the colour tokens — anything built from tokens follows
it, anything built from literal hex does not.

**i18n is one shared i18next instance, and that is load-bearing.** Components
call `useTranslation()`; nothing initialises i18n itself. If a bundle ends up
with a *second* copy of `i18next`, the initialised instance and the read
instance differ and every label silently renders as its raw key
(`theme.toggle` instead of `Noční režim`). This has bitten the Storybook
decorator bundle already — see `.design-sync/NOTES.md`. When adding a new entry
point, verify a translated label renders, not just that it compiles.

**Both apps boot offline.** MSW handlers from `packages/api` are installed at
startup — `apps/web/src/lib/MswProvider.tsx` (mounted in the root layout) and
`apps/mobile/src/mocks/native.ts` — so every screen works with no backend and no
credentials. `apps/mobile/src/AuthFlow.tsx` is the whole mobile auth state
machine (login → verify → success → onboarding → feed) driven by the mocked
client.

**e2e targets two different things.** `cypress/e2e/local/*` runs against a build
of this repo; `cypress/e2e/modules/*` and `platform/*` run against whatever
`CYPRESS_BASE_URL` points at, defaulting to `https://libertin.app` via
`apps/e2e/scripts/run-deployed.mjs` — a deployment that is **not** this repo's
code on any branch (tracked as D-009). The same default is repeated in both CI
configs; change all three together. Artifacts are written per host, per
kind (failures/evidence) and per deployed suite (modules/platform) — each axis
was added after a run silently deleted another's evidence, because Cypress
empties its output folders at the start of every run. Routes live only in
`apps/e2e/cypress/support/routes.ts`; no spec hardcodes a path. Credentials come
from `CYPRESS_TEST_USERNAME` / `CYPRESS_TEST_PASSWORD` and are never committed —
note that Cypress parses an all-digit env value as a *number*, so coerce with
`String()`.

Two traps the deployed client sets, both of which have produced wrong
conclusions before:
- **A 404 answers HTTP 200** with a client-rendered error screen. `curl -w
  '%{http_code}'` proves nothing about whether a route exists; only a browser
  run does.
- **`$body.text()` returns the entire RSC payload**, including content the
  rendered page never shows. Use `cy.visibleText()`. (This is also the E14-T5b
  defect class: `self.__next_f.push(...)` ships signed-in wall content to
  anonymous visitors.)

**Look before asserting.** `cypress/e2e/explore/` records observations rather
than asserting (`reports/<host>/explore/observations.md`). Two findings about
the deployed client were withdrawn because the checks were written from
assumptions: an icon-only language button, and a menu that names English
"Angličtina". Run `pnpm e2e:explore` before writing an assertion about a
feature you have not seen work. Observations and reports record cookie names,
never values, and member-photo counts, never URLs (a URL carries the member's ID).

`note()` in `cypress/support/findings.ts` is a plain synchronous function, **not**
a `cy.*` command — a queued command is lost when the assertion in the same
callback throws.

**claude.ai/design sync.** `.design-sync/` holds the committed inputs (config,
`conventions.md`, owned previews, NOTES.md) that convert `packages/ui` into a
component library the Claude Design agent builds from.
`packages/ui/.storybook-ds/` is a scoped Storybook config for that sync only —
its stories glob is one level deep so `src/native/**` is excluded, because
`Native/Button` and `UI/Button` derive the same component name and native
stories import `react-native`. Read `.design-sync/NOTES.md` (especially
**Re-sync risks**) before touching any of it.

## Conventions

- TypeScript strict. No `any` in committed code.
- Components live in `packages/ui`; apps compose them, never duplicate.
- All user-facing strings go through i18next keys — no hardcoded copy. This
  includes app-level wiring (error messages, fallback names), not just screens.
  Source of truth is `packages/i18n/locales.json`; add every key to **both**
  `cs` and `en` (B13).
- Use theme tokens, never raw hex, in components.
- Czech strings are corrected; do not reintroduce the old typos
  (Zapomenuté, Máte, svoji).
- Never hardcode PII (the old verify screen leaked a real email/phone — keep
  them as `{email}` / `{phone}` interpolations). Test fixtures use RFC 2606
  reserved domains (`example.com`).

## Blocking decisions (owner-owned)

Nine open decisions, **D-001 … D-009**, live under `decisions` in
`docs/backlog.yaml` — that file is authoritative, not this list. Dependent tasks
stay `blocked` until resolved; do not work around one with an assumption. The
two most likely to affect a given task: **D-001** (Figma editor access — the
hand-off defines contracted UI scope C1, and the account holds only a View seat)
and **D-009** (which deployment the module e2e suite watches, and the throwaway
test account it uses).

## Delivered so far

Phases 1–3: monorepo (pnpm + Turborepo), theme tokens (web + native), i18n
cs/en, UI components with Storybook, typed API client with MSW mocks, mobile
auth flow, web landing + login parity, age gate, security headers,
robots/sitemap.

Since: the Cypress e2e suite (E11-T5 — 10 modules, platform specs, evidence
capture), GitHub + GitLab CI pipelines, the k6 perf harness, a SessionStart hook
for Claude Code on the web, and the claude.ai/design conversion of
`packages/ui`.

Everything boots offline against MSW mocks; `pnpm type-check` (7/7) and
`pnpm test:all` (150) pass, and `next build` succeeds.

## Definition of done

For a screen or component: renders from tokens + i18n keys (no hardcoded colour
or copy), has a Storybook entry, passes `pnpm type-check` and `next build`, and
works against MSW mocks offline.

For any task: verified with real command output, backlog status updated,
committed and pushed. **Never report done without running the verification.**
