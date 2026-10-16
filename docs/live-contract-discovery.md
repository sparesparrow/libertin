# Live contract discovery — swingerslife.cz

Status: **partial / authenticated capture not run**  
Last updated: 2026-10-16

This document deliberately separates current evidence from historical clues and from Libertin's designed API. It must not be used to turn an inference into a server contract.

## Observed and reproduced

### Public login surface — 2026-10-16

A fresh unauthenticated visit to `https://swingerslife.cz/login` currently presents:

- an identifier labelled **Nick / přezdívka**;
- a password input;
- a remember-me control;
- a submit control.

That observation proves the current public identifier is nickname-oriented. It does **not** prove the request encoding, action URL, CSRF mechanism, cookie semantics, response type, or authenticated API surface.

`apps/e2e/cypress/e2e/live-contract/swingerslife.cy.ts` is a read-only public probe for the form structure. It records only method/action class, encoding, field names, whether a CSRF-like field exists, and coarse cookie kinds. It never submits credentials.

Run it only against the explicit live origin:

```bash
CYPRESS_BASE_URL=https://swingerslife.cz \
  pnpm --filter @libertin/e2e e2e:live-contract
```

Live-contract mode disables Cypress failure screenshots, keeps video disabled, and disables retries so a future authenticated extension cannot accidentally persist private UGC or repeat logins.

### Historical evidence — not re-verified today

`docs/live-audit.md` records a 2026-07-08 observation of a Laravel form/cookie flow with `user`, `password`, `remember`, `_token`, `XSRF-TOKEN`, and a session cookie. Treat that as a useful historical clue only. The current live request has not been reproduced in this execution environment.

## Authenticated discovery — NOT RUN

The supplied test account has **not** been placed in the repository, fixtures, workflow inputs, reports, or artifacts.

The current execution environment has no networked Cypress/browser runtime to which the account secret can be injected locally. The available GitHub connection also does not expose repository-secret writes. Passing the password as a workflow-dispatch input would create an avoidable disclosure risk, so that route is intentionally not used.

Therefore the following remain unverified today:

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
| **Observed / reproduced** | Current public login UI uses a nickname-oriented identifier. Public Cypress form probe exists but has not yet produced a committed live report. |
| **Historical / inferred** | The 2026-07-08 Laravel cookie/CSRF form flow in `docs/live-audit.md`. It is not promoted to current truth without a fresh capture. |
| **Frozen but currently unverified** | The `contracts/openapi.snapshot.yaml` JSON/bearer endpoints and its `api.libertin.cz` server entry. They remain preserved under repository policy, but must not be used as evidence that the host or paths work today. |
| **Designed / unimplemented** | 2FA/passkey/recovery/session endpoints described by ADR 0001 and marked `x-provenance: designed`. They remain blocked by the backend decision and are not live-server claims. |

## Native-client consequence

The Android app must not silently use `api.libertin.cz`, `libertin.app`, or a guessed `/api/v1` path as a live backend. Live mode now requires an explicit, validated HTTPS `EXPO_PUBLIC_API_BASE_URL`; mock mode is separate and explicit.

Until the authenticated contract is captured safely, implementing a native cookie/session adapter, bearer-token storage, feed parsing, or profile parsing would be guesswork. The supported deliverable is therefore the native mock preview plus the configuration and discovery scaffolding. A real-network build must stay blocked until this document can be updated with sanitized authenticated evidence.
