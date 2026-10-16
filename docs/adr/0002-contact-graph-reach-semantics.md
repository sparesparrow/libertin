# ADR 0002 — Contact graph reach semantics

| | |
|---|---|
| Status | Proposed, decision blocked on owner and privacy/security review |
| Date | 2026-10-16 |
| Scope | PR 12 proposal; authorized for design and synthetic implementation only |
| References | PR 12 `02-kontaktni-dosah.md`, `04-vexl-architecture/libertin-design.md`, D-003, D-004 |

## Context

PR 12 describes several different graph relationships. Treating them as one “contact circle” can reveal more than a user intended and makes consent, retention and audience explanations ambiguous. The proposal does not settle which graph operation the first release should use.

## Alternatives requiring owner choice

1. **Direct directed edge:** A lists B (`A → B`). This is the narrowest match, but reveals that B is an address-book contact of A to the service performing the match.
2. **One intermediary address book:** A lists X and X lists B (`A → X → B`). This may reach beyond the poster’s own address book and requires processing or retaining an intermediary’s edges.
3. **Shared-contact intersection:** A and B both list X (`A → X ← B`). This is a different relation from a two-edge path; it must not be described as “friends of friends” without qualification.
4. **Longer paths or transitive reach:** These increase coverage and inference risk. No proposal text authorizes silently enabling them.

## Consequences before decision

- Implement only synthetic fixtures and typed graph inputs; do not import or process real contacts.
- Keep edge direction and graph operation explicit in contracts and tests.
- Do not expose a path, intermediary, count or fine-grained degree to an end user until separately approved.
- Legal basis, DPIA, minimization, retention/deletion, enumeration resistance, moderator access, and protocol leakage require review before production.
- HMAC or ordinary hashing does not make phone numbers anonymous; no PSI or zero-knowledge claim is adopted by this ADR.

## Acceptance criteria for a later decision

The owner selects allowed relation(s), audience-size rules, displayed explanation, retention and deletion behavior, and failure behavior. Security/privacy review records the threat model and leakage. A versioned contract and synthetic graph tests then demonstrate that only the selected relation returns an eligible audience.
