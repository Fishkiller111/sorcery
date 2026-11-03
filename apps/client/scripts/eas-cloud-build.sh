#!/usr/bin/env bash
# Trigger EAS cloud builds (Android / iOS).
#
# Usage:
#   ./scripts/eas-cloud-build.sh android            # preview APK
#   ./scripts/eas-cloud-build.sh ios                # preview IPA
#   ./scripts/eas-cloud-build.sh all                # both platforms
#   ./scripts/eas-cloud-build.sh android production     # production APK (APKPure / sideload)
#   ./scripts/eas-cloud-build.sh android production-aab # Play Store AAB
#
# Env:
#   EAS_BUILD_PROFILE   override profile (default: preview, or argv[2])
#   EAS_BUILD_ARGS      extra flags for eas build (e.g. --clear-cache)
#   EAS_BUILD_WAIT=1    wait for build to finish (default: submit and exit)
#   EAS_PROXY_BRIDGE_PORT  local HTTP bridge port (default: 18080)
#   EAS_HTTP_PROXY      default HTTP proxy when shell has none (default: http://127.0.0.1:7892)
#   https_proxy / HTTPS_PROXY  if socks5://, auto-starts HTTP bridge via proxy-chain

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PLATFORM="${1:-}"
PROFILE="${2:-${EAS_BUILD_PROFILE:-preview}}"

usage() {
  echo "Usage: $0 <android|ios|all> [preview|production|development]" >&2
  exit 1
}

[[ -n "$PLATFORM" ]] || usage
case "$PLATFORM" in
  android|ios|all) ;;
  *) usage ;;
esac

# shellcheck source=eas-proxy.sh
source "$(dirname "${BASH_SOURCE[0]}")/eas-proxy.sh"
trap eas_cleanup_proxy_bridge EXIT INT TERM
eas_setup_http_proxy

WAIT_FLAG="--no-wait"
if [[ "${EAS_BUILD_WAIT:-}" == "1" ]]; then
  WAIT_FLAG=""
fi

echo "EAS cloud build: platform=$PLATFORM profile=$PROFILE"
# shellcheck disable=SC2086
eas build --platform "$PLATFORM" --profile "$PROFILE" --non-interactive $WAIT_FLAG ${EAS_BUILD_ARGS:-}
