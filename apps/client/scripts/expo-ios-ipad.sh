#!/usr/bin/env bash
# Boot an iPad Simulator, then start Expo Go on iOS (same stack as `pnpm ios`).
# Override device: EXPO_IPAD_DEVICE="iPad Air 11" pnpm ios:ipad
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PREFERRED="${EXPO_IPAD_DEVICE:-iPad Pro}"

RESOLVED="$(
  PREFERRED="$PREFERRED" python3 <<'PY'
import json, os, subprocess, sys

preferred = (os.environ.get("PREFERRED") or "iPad Pro").strip().lower()
raw = subprocess.check_output(
    ["xcrun", "simctl", "list", "devices", "available", "-j"],
    text=True,
)
devices = []
for runtime, items in json.loads(raw).get("devices", {}).items():
    if "iOS" not in runtime and "xrOS" not in runtime:
        continue
    for d in items:
        name = d.get("name") or ""
        if "iPad" not in name:
            continue
        if d.get("isAvailable") is False:
            continue
        devices.append(d)

if not devices:
    sys.stderr.write("No available iPad Simulator found.\n")
    sys.exit(1)

def score(d):
    name = (d.get("name") or "").lower()
    if preferred and preferred in name:
        return (0, name)
    if "ipad pro" in name:
        return (1, name)
    if "ipad air" in name:
        return (2, name)
    return (3, name)

devices.sort(key=score)
chosen = devices[0]
sys.stderr.write(f"Using iPad Simulator: {chosen.get('name')} ({chosen['udid']})\n")
print(chosen["udid"])
PY
)"

UDID="$(printf '%s\n' "$RESOLVED" | tail -n 1)"
if [[ -z "$UDID" ]]; then
  echo "Failed to resolve an iPad Simulator UDID." >&2
  exit 1
fi

# Prefer this iPad when Expo picks among booted simulators.
while IFS= read -r other; do
  [[ -z "$other" || "$other" == "$UDID" ]] && continue
  xcrun simctl shutdown "$other" >/dev/null 2>&1 || true
done < <(xcrun simctl list devices booted | sed -nE 's/.*\(([0-9A-Fa-f-]{36})\).*/\1/p')

if ! xcrun simctl list devices | grep -q "$UDID.*(Booted)"; then
  xcrun simctl boot "$UDID" >/dev/null
fi
open -a Simulator
xcrun simctl bootstatus "$UDID" -b >/dev/null

exec bash "${ROOT}/scripts/expo-dev.sh" start --ios "$@"
