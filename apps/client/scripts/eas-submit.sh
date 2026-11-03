#!/usr/bin/env bash
# EAS submit with Clash :7892 proxy (same remap as eas-cloud-build.sh).
#
# Usage:
#   ./scripts/eas-submit.sh ios
#   ./scripts/eas-submit.sh ios --latest
#   ./scripts/eas-submit.sh android
#   pnpm submit:eas:ios
#
# Extra args are passed through to `eas submit`.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# shellcheck source=eas-proxy.sh
source "$(dirname "${BASH_SOURCE[0]}")/eas-proxy.sh"
trap eas_cleanup_proxy_bridge EXIT INT TERM
eas_setup_http_proxy

PLATFORM="${1:-}"
if [[ -z "$PLATFORM" ]]; then
  echo "Usage: $0 <ios|android> [eas submit args...]" >&2
  exit 1
fi
shift || true

echo "EAS submit: platform=$PLATFORM $*"
# shellcheck disable=SC2086
eas submit --platform "$PLATFORM" --non-interactive "$@"
