#!/usr/bin/env bash
# Shared EAS / Expo CLI proxy setup (Clash HTTP :7892).
# Source from other scripts:  source "$(dirname "$0")/eas-proxy.sh" && eas_setup_http_proxy
#
# Env:
#   EAS_HTTP_PROXY         force proxy URL (default http://127.0.0.1:7892 when unset)
#   EAS_PROXY_BRIDGE_PORT  SOCKS→HTTP bridge port (default 18080)
# Legacy :10009 is remapped to :7892.

eas_setup_http_proxy() {
  local DEFAULT_HTTP_PROXY="${EAS_HTTP_PROXY:-http://127.0.0.1:7892}"
  local current="${EAS_HTTP_PROXY:-${https_proxy:-${HTTPS_PROXY:-${http_proxy:-${HTTP_PROXY:-${all_proxy:-${ALL_PROXY:-}}}}}}}"

  if [[ -z "$current" ]]; then
    current="$DEFAULT_HTTP_PROXY"
    echo "No proxy set; using EAS default: $current"
  elif [[ -n "${EAS_HTTP_PROXY:-}" ]]; then
    echo "Using EAS_HTTP_PROXY: $current"
  fi

  # 旧快连 10009 → Clash 7892
  if [[ "$current" == *":10009"* ]]; then
    current="${current//:10009/:7892}"
    if [[ "$current" == socks5://* ]] || [[ "$current" == socks5h://* ]]; then
      current="http://127.0.0.1:7892"
    fi
    echo "Remapped legacy proxy port 10009 → 7892: $current"
  fi

  if [[ "$current" == http://* ]] || [[ "$current" == https://* ]]; then
    export http_proxy="$current" https_proxy="$current"
    export HTTP_PROXY="$current" HTTPS_PROXY="$current"
    unset ALL_PROXY all_proxy
    echo "Using HTTP proxy: $current"
    return 0
  fi

  if [[ "$current" == socks5://* ]] || [[ "$current" == socks5h://* ]]; then
    local socks_host="" socks_port=""
    if [[ "$current" =~ @([^:/]+):([0-9]+) ]]; then
      socks_host="${BASH_REMATCH[1]}"
      socks_port="${BASH_REMATCH[2]}"
    elif [[ "$current" =~ ://([^:/]+):([0-9]+) ]]; then
      socks_host="${BASH_REMATCH[1]}"
      socks_port="${BASH_REMATCH[2]}"
    fi
    if [[ "$socks_host" == "127.0.0.1" || "$socks_host" == "localhost" ]]; then
      export http_proxy="http://127.0.0.1:${socks_port}"
      export https_proxy="$http_proxy"
      export HTTP_PROXY="$http_proxy"
      export HTTPS_PROXY="$http_proxy"
      unset ALL_PROXY all_proxy
      echo "Using HTTP proxy (same port as local SOCKS): $http_proxy"
      return 0
    fi

    local bridge_port="${EAS_PROXY_BRIDGE_PORT:-18080}"
    echo "Starting SOCKS -> HTTP bridge on 127.0.0.1:${bridge_port}"
    SOCKS_UPSTREAM="$current" BRIDGE_PORT="$bridge_port" \
      npx --yes -p proxy-chain@2 node -e "
        const ProxyChain = require('proxy-chain');
        const upstream = process.env.SOCKS_UPSTREAM;
        const port = Number(process.env.BRIDGE_PORT || 18080);
        new ProxyChain.Server({
          port,
          prepareRequestFunction: () => ({
            requestAuthentication: false,
            upstreamProxyUrl: upstream,
          }),
        }).listen(() => {
          console.log('HTTP proxy http://127.0.0.1:' + port + ' -> ' + upstream);
        });
      " &
    EAS_PROXY_BRIDGE_PID=$!
    sleep 2
    if ! kill -0 "$EAS_PROXY_BRIDGE_PID" 2>/dev/null; then
      echo "Failed to start proxy bridge." >&2
      return 1
    fi
    export http_proxy="http://127.0.0.1:${bridge_port}"
    export https_proxy="$http_proxy"
    export HTTP_PROXY="$http_proxy"
    export HTTPS_PROXY="$http_proxy"
    unset ALL_PROXY all_proxy
    return 0
  fi

  echo "Unsupported proxy scheme: $current" >&2
  return 1
}

eas_cleanup_proxy_bridge() {
  if [[ -n "${EAS_PROXY_BRIDGE_PID:-}" ]] && kill -0 "$EAS_PROXY_BRIDGE_PID" 2>/dev/null; then
    kill "$EAS_PROXY_BRIDGE_PID" 2>/dev/null || true
    wait "$EAS_PROXY_BRIDGE_PID" 2>/dev/null || true
  fi
}
