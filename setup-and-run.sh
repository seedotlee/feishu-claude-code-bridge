#!/usr/bin/env bash
#
# Clone (or update) a specific branch of lark-channel-bridge, install deps,
# build, and run it. Idempotent: re-running pulls the latest branch commit
# and rebuilds.
#
# Usage:
#   ./setup-and-run.sh                 # clone+build+run with defaults
#   ./setup-and-run.sh start           # pass a subcommand through to the CLI
#   BRANCH=main ./setup-and-run.sh     # override branch
#   REPO_URL=... DEST=~/apps/bridge ./setup-and-run.sh
#
# Env overrides:
#   REPO_URL  git remote to clone        (default: HTTPS GitHub URL below)
#   BRANCH    branch / tag / commit      (default: feat/lisi/codex-bridge-sh)
#   DEST      checkout directory         (default: ~/.local/src/lark-channel-bridge)
#   NO_RUN=1  set up only, don't launch  (build then exit)
#
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/seedotlee/feishu-claude-code-bridge.git}"
BRANCH="${BRANCH:-feat/lisi/codex-bridge-sh}"
DEST="${DEST:-$HOME/.local/src/lark-channel-bridge}"

log() { printf '\033[1;36m▸ %s\033[0m\n' "$*"; }
die() { printf '\033[1;31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

# --- ensure pnpm ---------------------------------------------------------
if ! command -v pnpm >/dev/null 2>&1; then
  if command -v corepack >/dev/null 2>&1; then
    log "pnpm not found — enabling via corepack"
    corepack enable >/dev/null 2>&1 || true
    corepack prepare pnpm@latest --activate >/dev/null 2>&1 || true
  fi
fi
command -v pnpm >/dev/null 2>&1 || die "pnpm not available. Install it: npm i -g pnpm (or enable corepack)."
command -v git >/dev/null 2>&1 || die "git not found."
command -v node >/dev/null 2>&1 || die "node not found (need >= 20)."

# --- clone or update -----------------------------------------------------
if [ -d "$DEST/.git" ]; then
  log "Updating existing checkout at $DEST"
  git -C "$DEST" fetch --depth 1 origin "$BRANCH"
  git -C "$DEST" checkout -B "$BRANCH" FETCH_HEAD
else
  log "Cloning $REPO_URL ($BRANCH) → $DEST"
  mkdir -p "$(dirname "$DEST")"
  git clone --depth 1 --branch "$BRANCH" "$REPO_URL" "$DEST"
fi

cd "$DEST"

# --- install + build -----------------------------------------------------
# tsup externalizes runtime deps, so node_modules is required at runtime —
# `install` is not optional even though we also build.
log "Installing dependencies"
pnpm install --prefer-offline

log "Building"
pnpm build

# --- run -----------------------------------------------------------------
if [ "${NO_RUN:-0}" = "1" ]; then
  log "Build complete (NO_RUN set). To launch: node bin/lark-channel-bridge.mjs run"
  exit 0
fi

# Default to `run`; forward any args the caller passed (e.g. `start`, `-c ...`).
if [ "$#" -eq 0 ]; then
  set -- run
fi
log "Launching: node bin/lark-channel-bridge.mjs $*"
exec node bin/lark-channel-bridge.mjs "$@"
