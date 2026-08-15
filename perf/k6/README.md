# Performance harness — C12.1

The contract sets one hard performance gate:

> **C12.1** — odezva uživatelského rozhraní do **1,5 s** při špičkovém zatížení.

This directory is where that number is enforced instead of merely written down.

## Running it

```bash
# 1. build and start the app under test (production build, not `next dev` —
#    dev-mode numbers are meaningless)
pnpm --filter @libertin/web build
pnpm --filter @libertin/web start &

# 2. run the harness
k6 run perf/k6/web-browse.js
```

Useful overrides:

| Variable | Default | Meaning |
|---|---|---|
| `BASE_URL` | `http://127.0.0.1:3000` | target under test |
| `PEAK_VUS` | `50` | concurrent virtual users at peak |
| `BUDGET_PERCENTILE` | `95` | percentile the budget is judged at |
| `RAMP_UP` / `HOLD` / `RAMP_DOWN` | `20s` / `1m` / `10s` | stage durations |

```bash
k6 run perf/k6/web-browse.js -e BASE_URL=https://staging.libertin.cz -e PEAK_VUS=200
```

k6 exits **99** when a threshold is crossed, so any CI step that runs it fails
on a regression without extra wiring.

## What it measures — and what it does not

It measures **server response time for document requests**: request sent → full
HTML body received. That is the part the system controls and the part a load
test can honestly assert.

It does **not** measure what a member actually perceives. Time-to-interactive
also includes DNS, TLS, bundle parse and hydration, and the network between the
member and the host. A green run here is a **necessary** condition for C12.1,
not a sufficient one. Browser-side timing belongs with the Playwright work
(E11-T5).

### Correctness counts as part of the budget

Every request asserts on content, not just status. A gated response served in
40 ms is fast *because it is withholding the page* — score that as a pass and
the harness would reward the age gate for flattering the numbers. So confirmed
requests assert the real page came back and unconfirmed ones assert it did not.
The unconfirmed check also re-asserts the E14-T5b guarantee under load: the
landing page's tree must not appear in a gated response, RSC seed included.

## Baseline measured so far

Recorded so the next run has something to compare against — **not** acceptance
evidence:

```
target      http://127.0.0.1:3000   (next start, production build)
budget      p(95) < 1500 ms
peak load   20 VUs
host        4 vCPU / 16 GB container, app and load generator on the same box

  gate      p(95)=92.0ms  med=81.0ms  max=130.8ms  PASS
  landing   p(95)=92.3ms  med=81.4ms  max=131.2ms  PASS
  login     p(95)=92.4ms  med=81.0ms  max=127.4ms  PASS

  content checks   100.00% (16051 ok / 0 failed)
  request errors   0.00%
```

Read this as a **floor, not a verdict**. Three things make it optimistic:

1. **No backend.** The API, database, cache and object storage do not exist yet
   (D-003), so these pages render from static dictionaries. The real numbers
   arrive when a request has to touch a database.
2. **No network.** Load generator and app share a loopback interface, so
   latency, TLS and bandwidth all read as zero.
3. **Not peak load.** 20 VUs is what this container runs cleanly, and the
   contracted peak is unknown — see below.

The harness was verified to fail as designed: re-run against a 1 ms budget it
reported `RESULT: FAIL` and exited 99.

## Open question — D-007

Two numbers in this harness are placeholders the owner has to set, because both
decide what passes acceptance:

- **What is "špičkové zatížení"?** The contract names no figure. `PEAK_VUS=50`
  keeps the harness runnable; it is not a contracted value.
- **Which percentile?** A literal reading of "odezva do 1,5 s" is p(100) — every
  response, no exceptions. p(95) is the standard engineering reading and the
  default here. p(100) over a real network fails on a single GC pause or TCP
  retransmit, which tests the network more than the system.

Until both are fixed, a green run demonstrates the harness works — it does not
demonstrate the contract is met. Tracked as decision **D-007** in
`docs/backlog.yaml`.

## Why not in the PR pipeline

The GitHub/GitLab shared runners are noisy neighbours: the same commit can vary
by several hundred milliseconds between runs. Gating merges on that produces
flaky red builds and teaches everyone to re-run until green, which is worse than
no gate at all. The CI job is therefore `workflow_dispatch` — run it against a
representative host, not against a shared runner.
