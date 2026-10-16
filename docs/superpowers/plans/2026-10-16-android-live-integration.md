# Android Live Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Android branch safe to test as a standalone native preview, remove the guessed live API target, and add a privacy-preserving live-contract discovery path without claiming unverified backend integration.

**Architecture:** Keep `packages/api` as the only typed network boundary. Introduce explicit mobile runtime mode (`mock` or `live`) with validated public build-time configuration; mock preview builds remain clearly labelled and live mode cannot fall back to a guessed host. Add a Cypress live-audit spec that records only allowlisted structural metadata. Build previews as release-mode APKs with an embedded JS bundle and a separate application id, signed with disposable CI signing material. Keep Google Play upload as an explicitly protected/manual step separate from build.

**Tech Stack:** Expo 52, React Native 0.76, TypeScript, Vitest, Cypress 15, Gradle/Android, GitHub Actions, pnpm/Turborepo.

**Spec:** User implementation brief dated 2026-10-16, plus `CLAUDE.md`, `docs/live-audit.md`, `docs/backlog.yaml`, `contracts/openapi.snapshot.yaml`, and `docs/android-release.md`.

## Global Constraints

- Never commit, log, upload, or include the supplied swingerslife.cz credentials in fixtures or artifacts.
- Do not silently change owner-blocked decisions D-002/D-003 or mark designed backend features delivered.
- No WebView and no raw fetches from screens; typed API boundary remains authoritative.
- No guessed `api.libertin.cz`, `libertin.app`, or `/api/v1` default for live mode.
- Mock and live modes must be explicit; a mock-backed build must not be publishable as production by accident.
- Preview APK must install under a distinct application id and run without Metro.
- Google Play publication is prepared only; no store upload is executed in this task.
- Preserve Kotlin 1.9.25 compatibility pin unless verified unnecessary.

## Review Focus

- Release build accidentally starts mocks or silently falls back to an unverified API host.
- Preview artifact is actually a debug build and still depends on Metro.
- EXPO_PUBLIC configuration accepts credentials, insecure HTTP, query strings, or malformed URLs.
- Authenticated Cypress evidence leaks cookies/tokens/user content through screenshots, videos, logs, or raw response dumps.
- A tag or ordinary workflow run can publish to Google Play without a separate protected/manual action.

---

### Task 1: Explicit mobile runtime configuration

**Files:**
- Create: `apps/mobile/src/runtimeConfig.ts`
- Create: `apps/mobile/__tests__/runtime-config.test.ts`
- Modify: `apps/mobile/src/App.tsx`
- Modify: `apps/mobile/src/AuthFlow.tsx`

**Interfaces:**
- Produces: `readRuntimeConfig(env)` and `runtimeConfig` with `{ networkMode, apiBaseUrl }`.
- Consumers: mobile boot decides whether MSW starts; `AuthFlow` uses only an explicitly configured base URL.

- [ ] Write failing tests for mock mode, live mode requiring HTTPS base URL, trimming trailing slash, and rejection of credentials/query/hash/insecure HTTP.
- [ ] Run mobile Vitest and observe the tests fail because `runtimeConfig` does not exist.
- [ ] Implement the minimal runtime config parser.
- [ ] Change `App.tsx` to start MSW only in explicit mock mode, not merely on `__DEV__`.
- [ ] Remove the hard-coded `https://api.libertin.cz/v1` from `AuthFlow.tsx`; mock mode uses the frozen mock origin, live mode uses validated configuration.
- [ ] Run mobile type-check and tests.
- [ ] Commit.

### Task 2: Privacy-preserving live contract discovery harness

**Files:**
- Create: `apps/e2e/cypress/e2e/live-contract/swingerslife.cy.ts`
- Create: `apps/e2e/cypress/support/liveContract.ts`
- Modify: `apps/e2e/cypress.config.ts`
- Modify: `apps/e2e/package.json`
- Modify: `apps/e2e/README.md`

**Interfaces:**
- Consumes: `CYPRESS_BASE_URL`, `CYPRESS_TEST_USERNAME`, `CYPRESS_TEST_PASSWORD` only at runtime.
- Produces: sanitized structural findings (method, normalized path, content type, status class, field names), never raw bodies/headers/cookies/tokens.

- [ ] Add Cypress coverage that observes the unauthenticated login form and login request while typing the password with `{ log: false }`.
- [ ] Disable video and failure screenshots for live-contract mode before authentication.
- [ ] Intercept read-only navigation for feed/profile/conversation/events/marketplace and allowlist structural metadata only.
- [ ] Do not execute write operations other than login/logout; mark inferred write contracts unverified.
- [ ] Add a dedicated `e2e:live-contract` script and documentation.
- [ ] Run only when a safe runtime can inject credentials; otherwise record as not run with the exact blocker.
- [ ] Commit.

### Task 3: Standalone Android preview APK

**Files:**
- Modify: `.github/workflows/android.yml`
- Modify: `docs/android-release.md`

**Interfaces:**
- Produces: `libertin-preview-apk` artifact, release-mode APK, separate package id, embedded JS bundle, disposable test signature.

- [ ] Replace PR `assembleDebug` artifact with release-mode preview build.
- [ ] Set explicit mock mode and a preview-only application id for the preview artifact.
- [ ] Generate a disposable keystore inside the job and pass it only to the build process.
- [ ] Run `assembleRelease` and verify the APK contains `assets/index.android.bundle` and does not contain the production package id.
- [ ] Upload the preview artifact with a clearly demo/preview name.
- [ ] Keep Kotlin compatibility pin and frozen-lockfile install.
- [ ] Run workflow through GitHub Actions and inspect actual job output/artifact.
- [ ] Commit.

### Task 4: Release build and publication separation

**Files:**
- Modify: `.github/workflows/android.yml`
- Modify: `docs/android-release.md`
- Modify: `.gitlab-ci.yml` only to document/parity-plan Android jobs without claiming execution if GitLab runner support is unavailable.

**Interfaces:**
- Produces: build-only signed AAB capability and a distinct protected/manual Play submission step.

- [ ] Make signed AAB build independent of store upload.
- [ ] Require live network mode and explicit `EXPO_PUBLIC_API_BASE_URL` for release AAB; fail rather than ship mocks.
- [ ] Keep Play submission behind a separate explicit manual/protected gate and do not invoke it in this task.
- [ ] Update release documentation with current verified CI status and missing store requirements.
- [ ] Commit and verify GitHub Actions.

### Task 5: PR evidence and handoff

**Files:**
- Modify PR #11 description and state only; repository docs already carry durable evidence.

**Interfaces:**
- Produces: truthful draft PR with observed website facts, commands actually run, artifact locations, blockers, and privacy notes.

- [ ] Inspect all workflow runs and job logs for the latest head SHA.
- [ ] Inspect artifacts and confirm the preview APK exists if the job passed.
- [ ] Update PR description without credentials/session data/personal content.
- [ ] Keep PR draft while live authenticated discovery/native live integration remains unverified.
- [ ] Request owner review only when release-blocking defects are resolved; do not merge or self-approve.
