# ADR 0002 — Contact graph reach semantics

| | |
|---|---|
| Status | Owner selected direct directed edges for the first synthetic model; production processing remains blocked on privacy/security and legal review |
| Date | 2026-10-17 |
| Scope | PR 12 proposal; authorized for design and synthetic implementation only |
| References | PR 12 `02-kontaktni-dosah.md`, `04-vexl-architecture/libertin-design.md`, D-003, D-004 |

## Context

PR 12 describes several different graph relationships. Treating them as one “contact circle” can reveal more than a user intended and makes consent, retention and audience explanations ambiguous. On 2026-10-17 the owner selected direct directed edges only for the first synthetic audience model.

Implementation: draft PR 15 (`dad83fd03332114e0f3a8a8dfc978ccb7de3a67b`) adds the pure synthetic helper and tests; GitHub checks are pending.

## Decision for the first synthetic model

Use only the author’s outgoing edge A → B: A is the synthetic address-book owner and B is the candidate recipient. This follows PR 12’s principle that an author may extend a post into the author’s own contact circle. A reverse edge B → A does not imply A → B. Do not infer transitive paths or intersections. This choice authorizes synthetic model and test work only; it does not authorize importing or processing real contacts.

## Other relations excluded from the first model

1. **Direct directed edge:** A lists B (`A → B`). This is the narrowest match, but reveals that B is an address-book contact of A to the service performing the match.
2. **One intermediary address book:** A lists X and X lists B (`A → X → B`). This may reach beyond the poster’s own address book and requires processing or retaining an intermediary’s edges.
3. **Shared-contact intersection:** A and B both list X (`A → X ← B`). This is a different relation from a two-edge path; it must not be described as “friends of friends” without qualification.
4. **Longer paths or transitive reach:** These increase coverage and inference risk. No proposal text authorizes silently enabling them.

## Consequences and remaining approvals

- Implement only synthetic fixtures and typed graph inputs; do not import or process real contacts.
- Keep edge direction and graph operation explicit in contracts and tests.
- Do not expose a path, intermediary, count or fine-grained degree to an end user until separately approved.
- Legal basis, DPIA, minimization, retention/deletion, enumeration resistance, moderator access, and protocol leakage require review before production.
- HMAC or ordinary hashing does not make phone numbers anonymous; no PSI or zero-knowledge claim is adopted by this ADR.

## Remaining acceptance criteria before production

The owner must still approve audience-size rules, displayed explanations, retention/deletion, and failure behavior. Security/privacy and legal reviews must record the threat model, legal basis, and leakage. Any later versioned contract must demonstrate that only the selected direct directed edge returns an eligible audience. No production graph processing is approved by this ADR.
