# Libertin

Modernized client layer for the `swingerslife.cz` → **Libertin** rebrand.
Next.js 14 web + Expo mobile, pnpm + Turborepo monorepo. See [CLAUDE.md](CLAUDE.md)
for the working agreement and [docs/setup.md](docs/setup.md) for complete local
development setup instructions.

## Quickstart

**Automated setup** (recommended):

```bash
git clone https://github.com/sparesparrow/libertin.git
cd libertin
./setup.sh
```

**Manual setup:**

```bash
pnpm install
pnpm type-check

# Storybook — all UI components + screens (web & native via react-native-web)
pnpm storybook                          # → http://localhost:6006

# Web (Next.js)
pnpm --filter=@libertin/web dev         # → http://localhost:3000

# Mobile (Expo)
pnpm --filter=@libertin/mobile start    # then i / a for simulator
```

Everything boots offline against MSW mocks derived from
[`contracts/openapi.snapshot.yaml`](contracts/openapi.snapshot.yaml) — no
backend credentials needed. Never call `fetch` directly; always go through
`@libertin/api`.

**→ Full setup guide:** [docs/setup.md](docs/setup.md)

## Workspace layout

| Path | What |
|---|---|
| `apps/web` | Next.js 14 (app router) — landing, login, security headers |
| `apps/mobile` | Expo / React Native — auth flow (login → verify → onboarding → feed) |
| `packages/ui` | Shared components, web + native variants, Storybook |
| `packages/theme` | Design tokens (`tokens.css` for web, `native.ts` for RN) |
| `packages/i18n` | i18next setup + `locales.json` (cs/en, source of truth for all copy) |
| `packages/api` | Typed client + MSW mocks, locked to the OpenAPI snapshot |
| `contracts/` | Frozen API contract — run `/contract-check` to detect drift |

## Releases

A `vX.Y.Z` tag packs the four shared packages, attaches the tarballs to a
GitHub Release, and pushes the web container image to GHCR. Pushing to an npm
registry is opt-in and still waiting on an owner decision (D-008).

```bash
pnpm -r --filter './packages/*' exec npm version 0.1.0 --no-git-tag-version
git commit -am "chore: release 0.1.0" && git tag v0.1.0
git push origin main --tags
```

Full process, tag scheme and caveats: [docs/publishing.md](docs/publishing.md).

## Conventions (enforced)

- All user-facing strings via i18n keys — no hardcoded copy, no PII.
- Theme tokens only — no raw hex in components.
- TypeScript strict; components live in `packages/ui`, apps compose.

Claude Code shortcuts: `/phase2`, `/contract-check`, `/audit-czech`, `/storybook`
(see `.claude/commands/`).
