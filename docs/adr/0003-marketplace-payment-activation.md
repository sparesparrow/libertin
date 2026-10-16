# ADR 0003 — Marketplace payment and commission activation

| | |
|---|---|
| Status | Proposed, owner/legal/provider decision blocked |
| Date | 2026-10-16 |
| Scope | PR 12 proposal; authorized for synthetic and sandbox development only |
| References | PR 12 `marketplace-services.md`, `market-research.md`, D-003, D-004 |

## Context

The proposal prioritizes events/tickets, private-space reservations, then approved services. It proposes category commissions and provider processing alternatives, but neither a final bundle rate nor payment provider, eligible service policy, tax treatment, or merchant terms are signed. Mandatory member subscription is superseded by service commissions in the later proposal.

## Decisions still required

- Choose one rate in the proposed 7–8% range for multi-entry packages, and define attribution, first/repeat booking, fee base, rounding and policy-version application.
- Approve eligible categories, merchant verification, cancellation/refund and ticket obligations.
- Select a provider only after reviewing its signed terms for the intended categories, geography, seller-of-record, taxes, payment charges, refunds, reserves and payout model.
- Decide seller legal-identity handling and how it stays separate from community-profile reveal.
- Approve operational controls, reconciliation and dispute responsibilities.

## Consequences before decision

- Synthetic listings and sandbox-only provider adapters are allowed for development.
- Store money as integer minor units or another reviewed exact-money type; persist the applied policy version with each order.
- Exclude deposits, tips and separately listed shipping according to the proposal; define bundle fee application without charging once per supplier.
- Implement idempotent intents, signed webhook verification, replay protection, ledger, refunds and reconciliation tests before considering real charging.
- Do not enable real charges, wallets, escrow, payouts, or sensitive service categories. No provider is selected by this ADR, and no production migration is approved.

## Acceptance criteria for a later decision

Owner, legal and provider reviews resolve the decisions above in writing. A contract and domain tests cover successful/failed/duplicate events, refunds and reconciliation. Production activation requires a separate explicit approval after sandbox evidence and current provider-term verification.
