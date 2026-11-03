#!/usr/bin/env bash
# Expo CLI (undici) only supports http/https proxies — socks5:// crashes Metro/API fetch.
# Default workflow is Expo Go (`expo start` / `start --ios`).
#
# Clash (7892 等) 不能套在 `expo start --ios` 上：打开模拟器时 Expo CLI 的 HTTPS
# 会走代理并 Request timed out / TLS disconnect。EAS 云构建仍用 eas-cloud-build.sh + 7892。
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Ensure Homebrew pod/brew are visible even if the IDE terminal skipped ~/.zshrc.
export PATH="/opt/homebrew/bin:/usr/local/bin:${PATH:-/usr/bin:/bin}"

clear_proxies() {
  for var in HTTP_PROXY HTTPS_PROXY ALL_PROXY http_proxy https_proxy all_proxy \
             SOCKS_PROXY SOCKS5_PROXY socks_proxy socks5_proxy; do
    unset "$var" 2>/dev/null || true
  done
  export NO_PROXY='*' noproxy='*'
}

# Always drop socks5 — undici cannot use it.
for var in HTTP_PROXY HTTPS_PROXY ALL_PROXY http_proxy https_proxy all_proxy; do
  val="${!var:-}"
  if [[ "$val" == socks5://* || "$val" == socks5h://* ]]; then
    unset "$var"
  fi
done

# Metro / Simulator / CocoaPods：一律绕过本地代理，避免 --ios 打开模拟器 TLS 超时。
case "${1:-}" in
  start|run:ios|run:android|prebuild)
    if [[ -n "${http_proxy:-${HTTP_PROXY:-${https_proxy:-${HTTPS_PROXY:-}}}}" ]]; then
      echo "expo-dev: clearing HTTP(S) proxy for Expo Go / Simulator (use eas-cloud-build.sh for EAS + 7892)"
    fi
    clear_proxies
    ;;
esac

exec "${ROOT}/node_modules/.bin/expo" "$@"
