# PR 12 implementation execution plan

Status: active. Proposal work is **proposed and authorized for development**;
it is not a signed contract change, legal approval, or production activation.
PR 12 remains an independent documentation PR.

## Current baseline

- PR 12 is open at `4ad6cd21323f8a8f2f5369059d3b77b7d4c6906d`. All nine files
  in its current tree were read directly from that SHA. Its README describes
  `welcome.tsx.draft`, but no such file exists in the PR tree or app source.
- PR 11 is merged. Its exact PR head is
  `8930e4a47830fafffb379d0d96135e9bca68da17`; GitHub records squash merge
  commit `6e3de0c98b638a4cd4d03a929b39bfc7fde3fa20`. Its Android verification
  and standalone preview jobs succeeded. Install, type-check, pack, test, build,
  and web E2E passed; module E2E and performance were skipped. Release and
  Play-publish jobs were skipped. Preview artifact `libertin-preview-mock-apk`
  came from run `38962784863` (artifact `12073039964`), expires
  `2026-10-23T20:38:30Z`, and was inspected from that exact run: SHA-256
  `9a3b5995450ed5bd6c4c83f8b4e36ebd562378217fc1da67f2571c3db93a9aa5`,
  package `cz.libertin.preview`, version `1.0.0` / code `23`, embedded
  `assets/index.android.bundle`, APK v2 signature verified, signer
  `CN=Libertin Preview` (certificate SHA-256
  `070d4c228323f43b302f45f5595d13530839b748f70b95e3209c637d1b702c95`).
- PR 12's current check run is `38962270169`: install, type-check, pack, test,
  build, and web E2E succeeded; module E2E and performance were skipped. Skipped
  checks are not treated as passing.
- On the owner-selected Moto G54 5G (`moto-g54-test-01`, Android 15), the exact PR 11
  artifact was installed as `cz.libertin.preview` and exited during cold start.
  App-UID-filtered logs record `ReferenceError: Property 'TransformStream'
  doesn't exist`, followed by `AppRegistry` failing to register `main` because a
  module evaluation failed. The process was gone before the 23-second check.
  This confirms an import-time Hermes Web Streams compatibility failure, not a
  native linker failure. Private raw evidence remains in ignored
  `.local/device-runs/pr11-run-38962784863/device/`.
- The importing seam was the original static `msw/native` import in
  `apps/mobile/src/App.tsx`: the fetch interceptor defines
  `BrotliDecompressionStream extends TransformStream` during evaluation. PR 13
  (`3101863d3c6136ed5184e1b573e591641d6e0b49`) adds the pinned Web Streams
  polyfill before `App`, loads MSW only in explicit mock mode, resolves runtime
  configuration after mount, and shows a retryable startup error. Repository CI
  passed on the previous code commit; current CI `38983070623` and Android
  `38983070510` are running. Earlier Android attempts found a missing AVD path
  and unusable KVM permissions; both now have explicit setup and assertions.
  The exact artifact and selected-device retest remain pending.
- The current API snapshot/client has observed login/feed/profile surfaces and
  designed 2FA only; there is no proposal contact, certification, reveal,
  booking, or marketplace API implementation. SMS 2FA is not phone-possession
  verification.
- Existing UI seams are `apps/mobile/src/AuthFlow.tsx`, `packages/ui/src/native/`,
  `packages/theme/native.ts`, and `packages/i18n/locales.json` / `dict.ts`.
  Existing API seams are `packages/api/src/client.ts`,
  `packages/api/src/mocks/handlers.ts`, and `contracts/openapi.snapshot.yaml`.
  No proposal-specific feature flag or persisted model is present.
- Repository guidance found: `CLAUDE.md`, `docs/backlog.yaml`,
  `docs/requirements-traceability.md`, and `docs/adr/`. No `AGENTS.md`,
  `CODEX-LIBERTIN-PROMPT.md`, or `README-CODEX-SETUP.md` is present in the
  repository. No `scripts/android_device_loop.py` is present. The contract
  appendix itself is not in the public repository; the signed-scope mapping is
  represented by the backlog and traceability document.
- Host check: Git 2.55.0, gh 2.102.0, Node 26.8.2, Python 3.14.7, and ADB
  1.0.41 are available. System `corepack` and `pnpm` are not on PATH; the
  repository-pinned `pnpm@10.33.0` ran through `npx` and a frozen install
  passed. Java 17 is installed but the `mise` shim has no selected version; the
  pinned JDK is available by full path. Android Build Tools 36.1.0 include
  `aapt`, `apkanalyzer`, and `apksigner`.
- The owner selected test device `moto-g54-test-01`. Only the test package was queried,
  installed, and launched. No app data was cleared, no package uninstalled, no
  screenshot captured, and no other app opened. The PR 11 artifact and private
  app-scoped logs remain under ignored `.local/device-runs/`.
- Future CI preview APKs use a package unique to workflow run and attempt,
  because the disposable signer rotates. The new phone install can therefore
  sit beside the baseline without uninstalling it or replacing its data.
- A Metro Android export of the local fix succeeded: 839 modules and a 2.94 MB
  Hermes bundle. Metro warned that MSW/interceptor package export targets
  contain parent-directory paths and used file-based resolution. The GitHub
  release-like APK build and emulator launch smoke remain required.
- The prior update to `docs/live-contract-discovery.md` was reviewed and
  incorporated with sanitized evidence for the accidental PR 13 CI repeat.
  Proposal tracking and ADR changes remain separate from feature activation.
- PR 15 (`dad83fd03332114e0f3a8a8dfc978ccb7de3a67b`) contains the first
  synthetic contact-audience slice: a pure helper over outgoing directed
  author-to-recipient edges and six unit cases. It adds no API route, contact
  import, graph persistence, or production processing. Local tests, API
  type-check, frozen install, and repository-wide type-check passed. GitHub CI
  run `38981584089` passed. Android run `38981584022` built and verified the
  standalone APK, but that branch's workflow had no emulator-smoke steps;
  release and Play publish were skipped. Its base package and disposable
  signer were not installed on the phone. The API-only slice adds no native
  interaction.

## Milestones

| ID | Work | State | Acceptance evidence / blocker |
|---|---|---|---|
| M0 | Recheck PRs, proposal sources, repository guidance, PR 11 changes/checks/artifact | verified | Current GitHub state and all nine PR 12 files inspected. Exact PR 11 run/artifact, APK hash, package, bundle, signature and merge commit recorded above. |
| M1 | Reproduce preview cold start and diagnose app-scoped native/JS evidence | verified | Exact PR 11 APK exits before registration; the Hermes `TransformStream` failure is confirmed in UID-filtered logs. The fix and its validation are tracked in M7. |
| M2 | Maintain proposal scope, requirement matrix, owner directions, ADRs and checkpoint | in_progress | PR 12 mapping is complete. Owner chose Laravel extension (D-003), maximum on-premise (D-004), and direct directed edges for the first synthetic graph. Production graph, hosting topology and legal/provider decisions remain open. |
| M3 | Implement safe CS/EN onboarding and independent identity-state model | planned | Startup recovery is being validated first; then use real tokens/components and default-off gates. No live phone, contact, certification or payment services. |
| M4 | Implement server-authorized audience/reveal contracts and permission tests | in_progress (synthetic only) | The direct-edge helper is in draft PR 15 and its six local unit cases pass. Server authorization, audience projection, identity reveal, and any real graph processing remain blocked by legacy source/schema review, D-004 topology, and legal/privacy/security decisions. |
| M5 | Implement synthetic marketplace/commission and sandbox payment slice | planned | No named-business implication or real charging. Bundle rate, eligible categories, provider terms and legal model remain unresolved. |
| M6 | Verify current live authentication transport and preserve sanitized evidence | in_progress | Sanitized runs `38962784873` and `38980049943` show the same synthetic JSON POST and 4xx response; the second was an accidental CI repeat completed before cancellation. Valid auth and a general API contract remain unverified. No further production probe is planned. |
| M7 | Focused CI, implementation PR, exact artifact and selected-device loop | in_progress | Draft PR 13 is open at `3101863d3c6136ed5184e1b573e591641d6e0b49`. Prior repository CI run `38982181947` passed. Android run `38981213728` could not find the created AVD; run `38982181982` then showed unusable KVM access. The workflow now uses an explicit AVD directory, checks registration, and configures/verifies KVM. Retry `38983070510` is running. Inspect the exact artifact and repeat launch testing on `moto-g54-test-01` after the run passes. No merge or store release is authorized. |

## Requirement precedence and guardrails

1. Later `marketplace-services.md` supersedes mandatory member subscription as
   the preferred proposed revenue model. Pricing scenarios remain research,
   not product policy.
2. `04-vexl-architecture/libertin-design.md` and `market-research.md` correct
   older contact assumptions. Friends see the author/profile; eligible
   nonfriends receive an unlinked representation; a phone-verified uncertified
   person may view/reply without profile disclosure; reveal requires current
   certification and independent consent from both accounts.
3. Phone possession, account creation, certification, merchant verification,
   and payment are independent state axes. SMS is not age or legal-identity
   proof. Payment cannot buy certification or profile reveal.
4. Earlier restrictions on direct contacts, graph-degree display, and photos
   for uncertified recipients are proposals, not approved final rules. The
   owner selected direct outgoing edges for the synthetic model only. Production
   audience thresholds, moderator access, retention, and media handling remain
   explicit owner/privacy decisions.
5. Keep market assumptions separate from executable policy. Keep mock mode
   hermetic; no live fallback, real contact import, live SMS, certification,
   payment, payout, production migration, or sensitive-category activation. The
   direct graph choice applies to synthetic edges only; audience thresholds,
   retention, and legal/privacy/security gates remain open.
6. Add no proposal routes to the frozen OpenAPI snapshot until the contract is
   deliberately designed and reviewed. The snapshot's `designed` 2FA routes
   remain distinct from observed live endpoints.
7. Never merge an implementation PR, publish to a store, or use a real payment
   provider without separate authorization and required review.

## Resume procedure

Read `checkpoint.json`, recheck GitHub PRs/heads and tool/device state, then
continue the earliest unblocked milestone. Use only the owner-selected device reference
`moto-g54-test-01`; its ADB serial is retained only in private local state. Keep raw device evidence in a private
ignored local directory; commit only sanitized synthetic-flow evidence.
