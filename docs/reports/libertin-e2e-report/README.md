# Libertin — Cypress e2e report

Target: `https://libertine-omega.vercel.app`
Run date: 2026-08-15
Suite: `apps/e2e` (Cypress 15.20.1, Electron headless, 1280×800)

## Run totals

| | |
|---|---|
| Tests | 148 |
| Passing | 43 |
| Failing | 13 |
| **Pending (skipped — no test account)** | **92** |
| Specs failing | 5 of 18 |
| Findings recorded | 30 |

The 92 pending tests are not flake and not a bug in the suite. Seven of the
nine modules redirect an anonymous visitor to `/login` on hydration, so without
a seeded member account those specs cannot assert anything about the module.
They are skipped rather than passed, because a green run that tested the login
page nine times would report coverage that does not exist.

To unlock them:

```bash
CYPRESS_TEST_USERNAME=... CYPRESS_TEST_PASSWORD=... pnpm e2e:modules
```

## Contents

| Path | What it is |
|---|---|
| `findings.txt` | Grouped, deduplicated findings — start here |
| `findings.json` | The same data, machine-readable |
| `screenshots/` | One image per failing test (retries dropped) |
| `logs/cypress-run.log` | Full run output |

## Findings by severity

### Privacy — the one to fix first

**`anonymous-payload-leak` — `/wall`.** A signed-out visitor is shown a guest
panel ("Prohlížíte si zeď jako host"), but the response body they were served
to render it still contains the member wall: the story composer, the feed
filters, and other members' names. The gate runs on the client, after the data
has already crossed the wire.

This repository has already fixed this exact defect once, for the age gate
(backlog E14-T5b): not rendering the content was not enough, because Next seeds
the requested segment into `self.__next_f.push(...)` regardless. The fix there
was to divert the request in middleware, before routing commits to the segment.
`/wall` needs the same treatment.

On this product it is not cosmetic. Members are here on an expectation of
discretion, and "their name was in the HTML but the CSS hid it" is not a
defence anyone wants to make.

### Security headers — absent

`Referrer-Policy`, `X-Content-Type-Options` and `X-Frame-Options` (or a CSP
`frame-ancestors`) are all unset. The missing `Referrer-Policy` is the one that
matters most here: every outbound click currently tells the destination site
which page on an adult platform the visitor came from. `apps/web` in this repo
already sets all five headers in `next.config.mjs` — the deployed client does
not.

### GDPR — cookie banner

The banner offers `Souhlas`, `Povolit vše`, `Upravit`, `Detaily`. There is no
one-click refusal. Under GDPR/ePrivacy, refusing non-essential cookies must be
no harder than accepting; here it takes a detour through "Upravit". The banner
text also states data is shared with advertising and social-media partners,
which is worth a second look on a platform whose members are at risk from being
profiled.

The banner is also modal and swallows pointer events, so a first-time visitor
cannot type into the login form until they deal with it. Every spec in this
suite has to force clicks past it.

### Content — Czech copy and filler

- `Zapomenute heslo` → `Zapomenuté heslo` (site-wide footer)
- `Obnovit svůj učet` → `Obnovit svůj účet` (site-wide footer)
- Lorem ipsum still on the homepage community cards (Naturisté, Swingeři, BDSM,
  Šibari) — the first thing a visitor reads about what the platform is for

The footer typos are the ones `CLAUDE.md` names explicitly as fixed-once,
never-to-return. Note the login page's own form says `Zapomenuté heslo`
correctly while the footer beneath it says `Zapomenute` — two copies of the
same string that disagree on the same page.

### Performance — C12.1 (≤ 1,5 s)

| Route | TTFB | Load |
|---|---|---|
| `/` | 24 ms | ~1 350–1 600 ms |
| `/wall` | 20–45 ms | 1 774 – 2 532 ms |

Read these as a *single-user* measurement from one machine with no concurrency.
They cannot prove the contract is met — peak-load acceptance stays with the k6
harness (E11-T4b). They can prove a page is already over budget with nobody on
it, and `/wall` is. TTFB is consistently tiny, so the cost is all client-side
render, not the server.

### Accessibility (axe, serious + critical only)

- `color-contrast`: 40 nodes on `/`, 110 nodes on `/wall`
- `scrollable-region-focusable`: 2 horizontal carousels on `/` unreachable by
  keyboard

### Correctness

- `/profile/<unknown-id>` renders without a not-found state — any id is
  accepted and produces a page.

## Routes, as measured

Several obvious guesses are not real routes. Verified by navigation, not by
status code — this deployment answers unknown paths with **HTTP 200** and a
client-rendered 404, so neither the status nor the served HTML distinguishes a
live module from a missing one.

| Module | Route | Auth |
|---|---|---|
| Homepage | `/` | public |
| Zeď | `/wall` | public (guest view) |
| Bog | `/messages` | member |
| Profily | `/people`, `/profile`, `/profile/[id]` | member |
| Trefa | `/trefa` | member |
| Chat | `/chat`, `/chat/[id]` | member |
| Marketplace | `/marketplace`, `/marketplace/[id]` | member |
| Média | `/media` | member |
| Kredit | `/profile/credit` | member |

Not routes: `/zed`, `/bog`, `/profily`, `/kredit`, `/credit`, `/feed`,
`/dashboard`, `/events`, `/about`.
