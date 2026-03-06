#!/usr/bin/env bash
# Check that the repo is safe to push to a public remote: no committed env files with credentials.
# Run before push or in CI (e.g. npm run check:secrets).

set -e
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# test/.env.e2e must not be committed (may contain real tokens)
if git ls-files --error-unmatch test/.env.e2e 2>/dev/null; then
  echo "ERROR: test/.env.e2e must not be committed (public repo). It is gitignored." >&2
  echo "  Run: git rm --cached test/.env.e2e" >&2
  echo "  Then copy test/.env.e2e.example to test/.env.e2e locally and add credentials there." >&2
  exit 1
fi

# .env in root must not be committed
if git ls-files --error-unmatch .env 2>/dev/null; then
  echo "ERROR: .env must not be committed (public repo). It is gitignored." >&2
  echo "  Run: git rm --cached .env" >&2
  exit 1
fi

echo "check-no-secrets: OK (no credential files tracked)"
exit 0
