#!/bin/bash
#
# SessionStart hook — install what a Claude Code on the web session needs to
# run type-check, unit tests and the Cypress suite without any manual step.
#
# Deliberately NOT a call into ./setup.sh: that script is written for a human
# at a terminal — it prints colours, can clone a repo, and calls `exit 1` when
# a prerequisite is missing. A hook wants none of that.
#
set -euo pipefail

# Local machines already have their own setup; this only fixes up the remote
# container, where every session starts from a fresh clone.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/../..}"

echo "→ libertin: session setup"

# --- environment ------------------------------------------------------------
# Mirrors the CI env block: a build or test must not phone home.
if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
  {
    echo 'export NEXT_TELEMETRY_DISABLED=1'
    echo 'export TURBO_TELEMETRY_DISABLED=1'
    echo 'export DO_NOT_TRACK=1'
    # Outbound HTTPS in this environment goes through a TLS-intercepting proxy.
    # Node tooling that fetches (Cypress's binary download most of all) needs
    # the proxy CA or it fails verification part-way through.
    if [ -f /root/.ccr/ca-bundle.crt ]; then
      echo 'export NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt'
    fi
  } >> "$CLAUDE_ENV_FILE"
fi

# --- dependencies -----------------------------------------------------------
# --frozen-lockfile matches CI, so a lockfile that drifted fails here rather
# than halfway through someone's task. Unlike `npm ci` it does not wipe
# node_modules, so a warm container still benefits from its cache.
echo "→ pnpm install"
pnpm install --frozen-lockfile

# --- Cypress browser --------------------------------------------------------
# Not redundant with the install above, and this is the part that is easy to
# get wrong. pnpm records that cypress's postinstall ran and skips it on later
# installs — but the ~250 MB browser it downloads lives in ~/.cache/Cypress,
# which is a different cache entirely. Warm pnpm store + cold Cypress cache
# gives you a store that says "installed" and a disk with no browser, and the
# failure surfaces much later as `cypress verify` exiting 1. The same trap took
# out the CI e2e job on its first real run.
#
# `cypress install` is idempotent: a no-op when the browser is already there.
#
# Best-effort on purpose. It is a large download that can be cut off by a flaky
# proxy, and type-check, unit tests and the dev server do not need it — so a
# failure here must not cost the session its dependencies.
echo "→ cypress binary"
if pnpm --filter @libertin/e2e cy:install; then
  echo "✓ cypress ready"
else
  echo "⚠ cypress binary not installed — unit tests and type-check are unaffected."
  echo "  Retry with: pnpm --filter @libertin/e2e cy:install"
fi

echo "✓ libertin: ready — pnpm type-check | pnpm test:all | pnpm e2e"
