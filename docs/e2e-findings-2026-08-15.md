# E2E findings — deployed client, 2026-08-15

First run of the Cypress suite (`apps/e2e`, backlog E11-T5) against the
in-progress module deployment.

- **Target:** `https://libertine-omega.vercel.app`
- **Suite:** Cypress 15.20.1, Electron headless, 1280×800
- **Result:** 148 tests — 43 passing, 13 failing, 92 pending
- **Findings recorded:** 30

## Read this first: the target is not this repository

The nine modules under review live on a Next.js application that is **not in
`sparesparrow/libertin`**, on any branch. This repository's `apps/web` currently
serves `/`, `/gate` and `/login`; the deployment serves `/wall`, `/messages`,
`/trefa`, `/chat`, `/marketplace`, `/media`, `/people`, `/profile/*`. Different
codebase, different brand string ("Libertine" vs "Libertin"), different
component conventions (Tailwind utility classes vs this repo's design tokens).

The suite is therefore written against *any* deployment: `CYPRESS_BASE_URL` is
the only switch and no spec hardcodes a host. It runs against this repo's
client today and will run against the modules unchanged once they land here.

**Open question for the owner:** which deployment should e2e watch, and where
does that code live? Tracked as **D-008**.

## The 92 pending tests

Not flake, and not a bug in the harness. Seven of the nine modules redirect an
anonymous visitor to `/login` **on hydration** — invisible to anything that
only reads the server response, which is why it was not obvious until the suite
drove a real browser. Without a seeded member account those specs cannot assert
anything about the module, so they are skipped rather than passed.

A green run that tested the login page nine times would report coverage that
does not exist. The pending count is the honest number.

Unblocking needs a throwaway test account (**D-008**). We did not self-register
one: creating accounts on a deployment we do not own is the owner's call.

| Module | Route | Anonymous access |
|---|---|---|
| Homepage | `/` | public |
| Zeď | `/wall` | public — guest view |
| Bog | `/messages` | redirects to `/login` |
| Profily | `/people`, `/profile`, `/profile/[id]` | redirects to `/login` |
| Trefa | `/trefa` | redirects to `/login` |
| Chat | `/chat`, `/chat/[id]` | redirects to `/login` |
| Marketplace | `/marketplace`, `/marketplace/[id]` | redirects to `/login` |
| Média | `/media` | redirects to `/login` |
| Kredit | `/profile/credit` | redirects to `/login` |

Routes that do **not** exist, despite being the obvious guesses: `/zed`,
`/bog`, `/profily`, `/kredit`, `/credit`, `/feed`, `/dashboard`, `/events`,
`/about`. Verified by navigation, not by status code — see the note on 404s
below.

---

## Findings, worst first

### 1. Member content ships in the anonymous response (`/wall`)

A signed-out visitor is shown a guest panel — *"Prohlížíte si zeď jako host"* —
but the body they were served to render it still contains the member wall: the
story composer (`Vytvořit příběh`), the feed filters (`Od přátel`,
`Co sleduji`) and other members' names (`Jan Pavlovský`, `Marie Donaldová`).
The gate runs on the client, after the data has crossed the wire.

This repository has already fixed this exact defect once, for the age gate
(**E14-T5b**). Not rendering the content was not enough, because Next seeds the
requested segment into `self.__next_f.push(...)` regardless of what the layout
decides; view-source still had it. The fix was to divert the request in
middleware, before routing commits to the segment. `/wall` needs the same
treatment — no layout-level change can close it.

On this product it is not cosmetic. `CLAUDE.md` puts it plainly: members risk
real-world harm from being outed. "Their name was in the HTML but the CSS hid
it" is not a defence anyone wants to make.

Spec: `platform/rsc-leak.cy.ts`.

### 2. No security headers

`Referrer-Policy`, `X-Content-Type-Options` and `X-Frame-Options` (or a CSP
`frame-ancestors`) are all unset on the deployment.

The missing `Referrer-Policy` is the one that matters most here: every outbound
click currently tells the destination site which page on an adult platform the
visitor came from. `apps/web` in this repo already sets all five headers in
`next.config.mjs`, with `same-origin` chosen deliberately for exactly this
reason. The deployed client does not.

This is also what `docs/live-audit.md` found on the legacy platform. It has
been carried forward rather than fixed.

### 3. Cookie banner — no one-click refusal

The banner offers `Souhlas`, `Povolit vše`, `Upravit`, `Detaily`, `Více o
cookies`. There is no one-click refusal; declining requires a detour through
"Upravit".

Under GDPR/ePrivacy, refusing non-essential cookies must be no harder than
accepting. For a CZ/EU adult platform this is not a technicality. The banner
text also states that usage data is shared with advertising and social-media
partners — worth a second look for a product whose central promise is
discretion.

Separately, the banner is modal and swallows pointer events: a first-time
visitor **cannot type into the login form** until they deal with it. Every spec
in this suite has to force clicks past it, which is a good proxy for how it
feels to a real user.

### 4. Czech copy

| Rendered | Should be | Where |
|---|---|---|
| `Zapomenute heslo` | `Zapomenuté heslo` | site-wide footer |
| `Obnovit svůj učet` | `Obnovit svůj účet` | site-wide footer |

These are the typos `CLAUDE.md` names explicitly as fixed-once,
never-to-return. Note that on `/login` the form's own link says `Zapomenuté
heslo` correctly while the footer directly beneath it says `Zapomenute` — two
copies of the same string, on the same page, disagreeing. That is the shape of
a problem that comes back: the correction was applied to one copy.

### 5. Lorem ipsum on the homepage

All four community cards — Naturisté, Swingeři, BDSM, Šibari — still render
*"Lorem ipsum dolor sit amet, consectetuer adipiscing elit…"*. This is the
first thing a visitor reads about what the platform is for, on the page that
has to do the convincing.

### 6. Performance — over the C12.1 budget on `/wall`

| Route | TTFB | Load |
|---|---|---|
| `/` | ~24 ms | 1 346 – 1 600 ms |
| `/wall` | 20 – 45 ms | **1 774 – 2 532 ms** |

Read as a *single-user* measurement from one machine with no concurrency. It
cannot prove the contract is met — peak-load acceptance stays with the k6
harness (E11-T4b, blocked on D-007). It can prove a page is already over budget
with nobody on it, and `/wall` is, on every attempt.

TTFB is consistently tiny, so the cost is entirely client-side render, not the
server. That is the useful part of the number: this is a bundle/hydration
problem, not a hosting one.

### 7. Accessibility (axe, serious + critical only)

| Rule | Impact | Where |
|---|---|---|
| `color-contrast` | serious | 40 nodes on `/`, 110 nodes on `/wall` |
| `scrollable-region-focusable` | serious | 2 horizontal carousels on `/` |

Contrast at this volume is a palette decision, not 150 individual mistakes —
most hits are `text-ink-faint` on light surfaces. Worth noting that this repo's
own tokens already solved the same problem once: `CLAUDE.md` records that
raspberry-on-white must use `#C40A3C` rather than the brand `#F20B49` to reach
AA. The deployed client is not using that palette.

The carousels cannot be reached or moved by keyboard at all.

### 8. `/profile/<unknown-id>` has no not-found state

Any id renders a page. `/profile/settings`, `/profile/wallet` and
`/profile/does-not-exist-cypress` all resolve through the `[id]` segment, so
there is no way to tell a real profile from a typo — and no route can later be
added under `/profile/` without colliding with a member whose id matches.

---

## What passed

Worth recording, since the failures dominate the list:

- All 12 module routes resolve and render their own content (not the shell).
- Every internal link in the global shell leads somewhere — no dead nav links.
- No console errors or uncaught exceptions on `/` or `/wall`.
- No third-party trackers loaded (Google Analytics, Meta, Hotjar, Segment,
  Mixpanel, Clarity all absent).
- No card-number-shaped strings rendered on the payments page.
- The homepage renders its hero, intro, events section with cards, a login
  entry point, and the B13 language switcher (cs + en both present).
- `/wall`'s guest view says plainly that the visitor is a guest and explains
  what signing up unlocks.

## The local suite (this repo's `apps/web`)

**22 tests, 22 passing.** Run with `pnpm e2e`.

- Age gate: gate shown without consent; **gated copy absent from the response
  body**, not merely off-screen (the E14-T5b guarantee, asserted against the
  raw body including `<script>`); `no-store` on gate responses; consent revealed
  without changing the URL; session cookie with no expiry; cookie value is bare
  `1` and its name does not describe the site; `/gate` redirects a confirmed
  visitor; deep links gated identically; `robots.txt` and `sitemap.xml` remain
  reachable.
- Login: renders from i18n keys; every input has an accessible name; correct
  input types; the password is never reflected into the DOM as text; the
  corrected `Zapomenuté heslo` is present and the old typo is absent; sign-in
  navigates away; a rejected sign-in shows an error.
- All five security headers from `next.config.mjs`.

Note for whoever extends these: `MswProvider` starts the worker only when
`NODE_ENV === 'development'`, so a production build has no mock backend. The
login spec stubs with `cy.intercept` rather than relying on MSW, because
`next start` is the build worth testing.

---

## Two traps in this deployment, for anyone writing specs

**A 404 answers HTTP 200.** Unknown paths return status 200 and render the
Next.js 404 screen on the client, from the RSC payload — which *every* page
carries. Neither the status code nor the served HTML distinguishes a live route
from a dead one. Only the built DOM does: `h1.next-error-h1` exists as an
element solely on the 404 screen. Several hours of route mapping went into
learning this; `cy.visitModule` now encodes it.

**`$body.text()` finds strings that never render.** Next inlines the whole RSC
payload into `<script>` tags inside `<body>`. Assert with `cy.visibleText()`,
which strips script/style first — otherwise a copy check passes on text no user
can see. The one deliberate exception is the leak spec in finding 1, where the
payload *is* the subject.

## Reproducing

```bash
pnpm install
pnpm e2e                                                   # local, 22/22
CYPRESS_BASE_URL=https://libertine-omega.vercel.app \
  pnpm e2e:modules && pnpm e2e:platform                    # deployed
```

Reports land in `apps/e2e/reports/findings.{txt,json}`, screenshots in
`apps/e2e/screenshots/`. CI uploads both as artifacts.
