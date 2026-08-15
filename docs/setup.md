# Local Development Setup

Complete guide to cloning and setting up Libertin for local development.

## Prerequisites

Before you start, ensure your system meets these requirements:

| Requirement | Version | Installation |
|---|---|---|
| Node.js | ≥ 20 | https://nodejs.org |
| pnpm | ≥ 9 | `npm install -g pnpm` |
| Git | latest | https://git-scm.com |

**Why pnpm?** This is a monorepo using pnpm workspaces + Turborepo for task orchestration.
`npm` and `yarn` will not work correctly — lock file is `pnpm-lock.yaml`.

## Quick Start (Automated)

If you have Node.js and Git installed, run the automated setup:

```bash
git clone https://github.com/sparesparrow/libertin.git
cd libertin
./setup.sh
```

The script will:
1. Verify system prerequisites (Node, pnpm, Git)
2. Install all dependencies
3. Run type checks
4. Initialize the Mock Service Worker for offline web development

Then jump to **[Running the apps](#running-the-apps)** below.

## Manual Setup (Step by Step)

### 1. Clone the Repository

```bash
git clone https://github.com/sparesparrow/libertin.git
cd libertin
```

### 2. Install Dependencies

```bash
pnpm install
```

This installs all workspace packages (web, mobile, shared UI, i18n, design tokens, API client).

**Troubleshooting:**
- If you see `ERR! ENOENT`, try `pnpm install --force`
- If you get pnpm version errors, run `npm install -g pnpm@latest`

### 3. Verify Setup

Type check everything to catch TypeScript errors early:

```bash
pnpm type-check
```

This should pass with no errors — the codebase enforces `strict: true`.

## Running the Apps

Everything runs offline against **MSW mocks** derived from
[`contracts/openapi.snapshot.yaml`](../contracts/openapi.snapshot.yaml).
No backend credentials or API keys needed.

### Storybook (UI Component Library)

View and develop all shared components (web React + React Native variants):

```bash
pnpm storybook
```

Opens http://localhost:6006 with hot reload. Use this for:
- Developing components in isolation
- Checking cross-platform (web/mobile) variants
- Running visual regression tests (future)

### Web App (Next.js 14)

Run the authenticated web experience:

```bash
pnpm --filter=@libertin/web dev
```

Opens http://localhost:3000 with hot reload. Includes:
- Landing page (public)
- Login + age verification (public)
- Onboarding flow (authenticated)
- Community feed (authenticated)

**First run note:** The app initializes the MSW worker automatically on first request.
If you see "Unable to find a mocked response," check browser console for MSW status.

### Mobile App (Expo / React Native)

Start the Expo development server:

```bash
pnpm --filter=@libertin/mobile start
```

Then choose your platform:
- Press `i` for iOS simulator (requires Xcode on macOS)
- Press `a` for Android emulator (requires Android Studio)
- Press `w` for web (alternative: http://localhost:19006)
- Scan QR code with Expo Go app on a real phone

The app runs the same codebase as web but uses React Native primitives.
For component development, use Storybook instead (faster iteration).

## Project Structure

```
libertin/
  apps/
    web/                # Next.js 14 → http://localhost:3000
    mobile/             # Expo (React Native) → simulator or http://localhost:19006
  packages/
    ui/                 # Shared components (web + mobile), Storybook @ http://localhost:6006
    theme/              # Design tokens (tokens.css for web, native.ts for React Native)
    i18n/               # i18next setup + locales (cs/en)
    api/                # Typed API client + MSW mocks
  contracts/
    openapi.snapshot.yaml  # Frozen API contract (truth for both real backend and mocks)
  docs/
    adr/                # Architecture decision records
    backlog.yaml        # Single source of truth for scope & status
    requirements-traceability.md
  CLAUDE.md             # Working agreement for Claude Code
```

## Common Tasks

### Type Check

```bash
pnpm type-check
```

Runs TypeScript over all packages. Must pass before commit (enforced by CI).

### Tests

Run all tests (unit + component):

```bash
pnpm test:all
```

Or in watch mode during development:

```bash
pnpm test
```

### Lint

Check code style (ESLint, Prettier):

```bash
pnpm lint
```

Auto-fix:

```bash
pnpm lint --fix
```

### Build

Build everything for production:

```bash
pnpm build
```

This builds web (Next.js) and mobile (Expo) apps, generates Storybook, etc.

## Conventions

These are enforced and verified by CI:

| Convention | Rationale |
|---|---|
| **TypeScript strict** | Catch bugs at compile time; no `any` in committed code |
| **i18n for all copy** | Support both Czech (cs) and English (en) without hardcoding strings |
| **Theme tokens only** | Components never use raw hex colors — all colors from design system |
| **Components in `/packages/ui`** | Apps compose; no UI code duplication |
| **API via `@libertin/api`** | Never call `fetch` directly; always go through the typed, snapshot-locked client |

## API Contract & MSW Mocks

The API contract is frozen in [`contracts/openapi.snapshot.yaml`](../contracts/openapi.snapshot.yaml).

- **Local development:** All requests are intercepted by **Mock Service Worker (MSW)** and respond with pre-defined mocks
- **CI verification:** Run `/contract-check` to detect drift between the snapshot and live API
- **Client generation:** The client in `packages/api` is currently hand-written against the snapshot
  (codegen planned as E11-T3)

**Why this matters:** If the real API changes shape, CI fails loudly. The snapshot + MSW mocks form a contract both dev and production respect.

## Troubleshooting

### pnpm: command not found

```bash
npm install -g pnpm
```

### Port already in use

Each app uses a different port:
- Storybook: 6006
- Web: 3000
- Mobile: 19006 (Expo web), 8081 (Metro bundler)

Kill the process or run on a different port:

```bash
# Web on port 3001
pnpm --filter=@libertin/web dev -- -p 3001
```

### Node version mismatch

Install Node >= 20. On macOS with Homebrew:

```bash
brew install node
```

On other systems, visit https://nodejs.org.

Check your version:

```bash
node -v  # should be v20.x.x or higher
```

### pnpm-lock.yaml conflicts

Never manually edit `pnpm-lock.yaml`. If it conflicts:

```bash
# Reinstall everything
pnpm install --force
```

### TypeScript errors in IDE

Make sure your IDE uses the project's TypeScript version:

**VS Code:** Install "TypeScript Vue Plugin" if you see red squiggles,
or set `typescript.tsdk` in `.vscode/settings.json`:

```json
{
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

### MSW not intercepting requests

MSW requires a service worker. If you see network requests go through to a real backend:

1. Open browser DevTools → Application → Service Workers
2. Check that `mockServiceWorker.js` is registered (status: "activated")
3. If not, refresh the page
4. Check browser console for MSW warnings/errors

For development, all requests should be handled by MSW with no real backend needed.

## Docker Development (Optional)

For backend or infrastructure work, a compose setup is provided:

```bash
docker-compose up
```

See [`docs/dev-orchestration.md`](./dev-orchestration.md) for details.

## Next Steps

- **Architecture:** Read [`CLAUDE.md`](../CLAUDE.md) for the working agreement and scope
- **Status:** Check [`docs/backlog.yaml`](./backlog.yaml) for in-progress work
- **Decisions:** Browse [`docs/adr/`](./adr/) for architecture decisions
- **Components:** Open Storybook to explore the UI library
- **Code walkthrough:** Run `/phase2` (Claude Code shortcut) for Phase 2 setup

## Questions or Issues?

- Open an issue on [GitHub](https://github.com/sparesparrow/libertin/issues)
- For Claude Code–specific questions, run `/help`
