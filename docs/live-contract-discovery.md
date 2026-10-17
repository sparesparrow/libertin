# Live contract discovery — swingerslife.cz

Status: **partial / valid-account authentication not verified**
Last updated: 2026-10-17

This document deliberately separates current evidence from historical clues and from Libertin's designed API. It must not be used to turn an inference into a server contract.

## Observed and reproduced

### Public login surface — 2026-10-16

A fresh unauthenticated visit to `https://swingerslife.cz/login` currently presents:

- an identifier labelled **Nick / přezdívka**;
- a password input;
- a remember-me control;
- a submit control.

That observation proves the current public identifier is nickname-oriented. It does **not** by itself prove the request encoding, action URL, CSRF mechanism, cookie semantics, response type, or authenticated API surface.

### Synthetic invalid-login observations — 2026-10-16

The PR 11 public contract workflow ran the normal browser UI flow once with a synthetic invalid identifier and password. Its sanitized artifact is [`public-live-contract-findings` from run 38962784873](https://github.com/sparesparrow/libertin/actions/runs/38962784873). It recorded:

- form method `GET`, action `/login`, fields `username` and `password`, and no CSRF-like form field;
- after dismissing the cookie overlay with its visible control, one submit sent `POST` JSON to `https://api.libertin.app/api/auth/login` with fields `identifier` and `password`;
- the response was JSON in the 4xx class; the probe did not authenticate;
- no cookies were observed before or after that attempt.

This confirms the current UI sent an authentication request to that observed host and route. It does not establish valid-credential behavior, session persistence, a general API contract, or endpoint stability. The route is observed evidence, not a guessed `/api/v1` route.

A separate PR 13 CI run unintentionally repeated the same synthetic invalid-login flow once because the temporary workflow originally ran on every pull request. Cancellation was requested, but the probe step completed before cancellation took effect. The sanitized artifact from [run 38980049943](https://github.com/sparesparrow/libertin/actions/runs/38980049943) records the same form fields, observed JSON POST route, and 4xx response class; no valid credentials or real account data were used. The workflow is now path-restricted. No further production probe is planned.

`apps/e2e/cypress/e2e/live-contract/swingerslife.cy.ts` records sanitized form structure and performs at most one synthetic invalid login request. It records method/path class, encoding, field names, coarse response class and cookie kinds; it does not record credential values, response bodies, sessions or CSRF values.

Run it only against the explicit live origin:

```bash
CYPRESS_BASE_URL=https://swingerslife.cz \
  pnpm --filter @libertin/e2e e2e:live-contract
```

Live-contract mode disables Cypress failure screenshots, keeps video disabled, and disables retries so a future authenticated extension cannot accidentally persist private UGC or repeat logins.

### Historical evidence — not re-verified today

`docs/live-audit.md` records a 2026-07-08 observation of a Laravel form/cookie flow with `user`, `password`, `remember`, `_token`, `XSRF-TOKEN`, and a session cookie. Treat that as a useful historical clue only; it differs from the recent sanitized probe and is not current truth.

## Valid-account authenticated discovery — NOT RUN

The supplied test account has **not** been placed in the repository, fixtures, workflow inputs, reports, or artifacts.

The current execution environment has no networked Cypress/browser runtime to which the account secret can be injected locally. The available GitHub connection also does not expose repository-secret writes. Passing the password as a workflow-dispatch input would create an avoidable disclosure risk, so that route is intentionally not used.

The invalid probe above does not verify successful authentication. The following remain unverified today:

- actual login submission method, URL and encoding;
- current CSRF acquisition/renewal behavior and session-cookie requirements;
- whether any JSON API or bearer-token flow exists;
- feed, self-profile, conversation-list, events and Marketplace read endpoints;
- pagination and authenticated error behavior;
- WebSocket or realtime transport details;
- write endpoints other than the fact that existing client/form code may imply them.

No authenticated screenshots, HAR files, cookies, authorization headers, CSRF tokens, messages, photos or profile data were captured or exported.

## Contract classification

| Classification | What belongs here now |
|---|---|
| **Observed / reproduced** | Current form uses `username`/`password`; the synthetic invalid-login flow sent JSON `identifier`/`password` to `api.libertin.app/api/auth/login` and received a 4xx JSON response in two CI executions (run 38962784873 and an accidental repeat in run 38980049943). No successful authentication was established. |
| **Historical / inferred** | The 2026-07-08 Laravel cookie/CSRF form flow in `docs/live-audit.md`. It is not promoted to current truth without a fresh capture. |
| **Frozen but currently unverified** | The `contracts/openapi.snapshot.yaml` JSON/bearer endpoints and its `api.libertin.cz` server entry. They remain preserved under repository policy, but must not be used as evidence that the host or paths work today. |
| **Designed / unimplemented** | 2FA/passkey/recovery/session endpoints described by ADR 0001 and marked `x-provenance: designed`. They remain blocked by the backend decision and are not live-server claims. |

## Native-client consequence

The Android app must not silently use `api.libertin.cz`, `libertin.app`, or a guessed `/api/v1` path as a live backend. Live mode now requires an explicit, validated HTTPS `EXPO_PUBLIC_API_BASE_URL`; mock mode is separate and explicit.

Until the authenticated contract is captured safely, implementing a native cookie/session adapter, bearer-token storage, feed parsing, or profile parsing would be guesswork. The supported deliverable is therefore the native mock preview plus the configuration and discovery scaffolding. A real-network build must stay blocked until this document can be updated with sanitized authenticated evidence.
