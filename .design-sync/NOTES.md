# design-sync notes — @libertin/ui → claude.ai/design

Shape: **storybook**. Bundle global: `window.LibertinUI`. 10 web components,
31 stories. Native components (`src/native/**`) are deliberately out of scope.

## What this repo does differently

- **The package has no build.** `@libertin/ui` sets `main: ./src/index.ts` and
  ships TypeScript source; there is no `dist/`. The converter is pointed at the
  source entry (`--entry packages/ui/src/index.ts`, mirrored in `cfg.entry`)
  and esbuild compiles it. There is nothing to run before the converter, so
  `cfg.buildCmd` is just the workspace install.

- **`--node-modules` must be `apps/web/node_modules`, not the DS package's own.**
  pnpm's strict layout leaves `packages/ui/node_modules` without `react-dom`
  (it is only a transitive Storybook dependency there), and `vendorReact` reads
  `react-dom/umd/react-dom.development.js` from that directory directly.
  `apps/web/node_modules` carries react + react-dom 18.3.1 with UMD builds,
  plus `@libertin/*`, `i18next` and `react-i18next` — the same versions.

- **A scoped Storybook config exists solely for this sync:**
  `packages/ui/.storybook-ds/`. It is the repo's own config with one change —
  the stories glob is one level deep (`../src/*/*.stories.@(ts|tsx)`), which
  excludes `src/native/**`. Two structural reasons, not preference:
  `Native/Button` and `UI/Button` derive the same component name and would
  merge into one card with incompatible props, and native stories import
  `react-native`, which the preview compiler resolves against the shipped
  bundle (there is no react-native in it). It must live inside `packages/ui`:
  from anywhere else, pnpm's layout cannot resolve
  `storybook/internal/preview/runtime` and the preview build fails.

- **`_ds_bundle.css` is legitimately a stub.** Components style themselves with
  inline React `style` objects reading `var(--token)`; there is no compiled
  component stylesheet anywhere in the repo. `tokens.css` ships through the
  auto-detected `@libertin/theme` tokens package and `styles.css` imports it.
  Validate reports `[CSS_RUNTIME]` — that is the correct, non-blocking outcome.
  **Do not set `cfg.cssEntry`**: pointing it at `packages/theme/tokens.css`
  fails containment (cssEntry is bounded to the DS package dir) and only turns
  a correct `[CSS_RUNTIME]` into a misleading `[CSS_PLACEHOLDER]`.

## Fixes applied (symptom → root cause → fix)

- **[GENERAL] Every `useTranslation()` label rendered as a raw key**
  (`theme.toggle` instead of `Noční režim`) → the `.storybook/preview`
  decorator bundle and the component bundle each carried their **own** copy of
  `i18next`, so the decorator initialised an instance nothing else read →
  `.design-sync/libertin-root.tsx` is merged into the component bundle via
  `cfg.extraEntries`, so it initialises the *same* instance, and is declared as
  `cfg.provider` (`LibertinRoot`) so the README and every `.prompt.md` carry
  real wrap guidance. This was invisible on Button and Avatar, whose stories
  pass literal strings — it only surfaced on ThemeToggle.

- **ThemeToggle / Night Mode rendered light-and-off** → the story seeds its
  stored theme through a Storybook `loaders` hook, which the generated wrapper
  does not run → owned `.design-sync/previews/ThemeToggle.tsx` executes each
  story's synchronous loaders before mount.

- **AgeGate rendered as a split scrim with no heading** → the card's
  `.ds-single` wrapper carries `transform: translateZ(0)` (deliberate overlay
  containment), which makes it the containing block for AgeGate's
  `position: fixed; inset: 0` root; the wrapper takes its height from its
  content, so the scrim collapsed → owned `.design-sync/previews/AgeGate.tsx`
  wraps each story in a sized stage that establishes its own containing block.

- **`[GRID_OVERFLOW]`** → `cfg.overrides.AgeGate.cardMode: "single"` (fixed
  content escaping its cell) and `cfg.overrides.CategoryCard.cardMode: "column"`
  (the `Grid` story is wider than a cell).

## Environment

- Chromium: playwright 1.62 expects build 1234, this image ships 1194. Every
  capture command needs
  `DS_CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome`.
- Reference storybook build:
  `cd packages/ui && npx storybook build -c .storybook-ds -o <repo-root>/.design-sync/sb-reference`

## Re-sync risks — read this first

1. **`[ASSETS_BLOCKED]` / placehold.co — one story is unverified.**
   `Avatar / With Image` loads `https://placehold.co/80`. In this environment
   the agent proxy relay drops chromium's TLS tunnels (`curl` reaches the host,
   the browser does not), so **both** panels rendered the alt-text fallback and
   the grade records agreement on a fallback, not on a loaded image. The `src`
   does reach the DOM. Re-verify this story from a shell with browser egress
   before trusting it.

2. **The i18n fix lives in a sync-owned file, not in the DS.** If
   `packages/i18n`'s `initI18n` signature or export name changes,
   `.design-sync/libertin-root.tsx` breaks and every label silently reverts to
   raw keys. The compare loop catches it — but only on a component whose
   stories use i18n (ThemeToggle, LoginForm, Hero, SiteFooter, AgeGate), never
   on Button or Avatar.

3. **Two owned previews duplicate the generated `compose()` helper.** If the
   converter's `preview-gen-storybook.mjs` template changes, the owned
   `AgeGate.tsx` and `ThemeToggle.tsx` will keep composing stories the old way.
   Re-diff them against `.design-sync/.cache/previews/<Name>.tsx` on any
   toolchain bump.

4. **The scoped Storybook config can drift.** `packages/ui/.storybook-ds/`
   duplicates `packages/ui/.storybook/preview.tsx`. A change to the repo's real
   preview (a new decorator, a different default locale) will not reach the
   reference build until it is copied across, and a stale reference silently
   grades against the old design.

5. **`AgeGate / Cookies Blocked` renders identically to `Default` on both
   sides.** The blocked-cookie notice only appears after the confirm click.
   It is graded `match` on that basis, not because the blocked state was seen.

6. **Storybook canvas background.** The reference panel paints `#FAFAF9` from
   the `backgrounds` addon; previews paint white. This is framing, present in
   every sheet, and correctly ignored under the rubric — do not "fix" it.
