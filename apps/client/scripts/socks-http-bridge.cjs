/**
 * Local HTTP proxy that forwards to a SOCKS upstream.
 * EAS CLI uses https-proxy-agent, which only supports HTTP CONNECT proxies.
 *
 * Usage:
 *   SOCKS_UPSTREAM='socks5://127.0.0.1:7892' node scripts/socks-http-bridge.cjs
 *   # or: node scripts/socks-http-bridge.cjs 'socks5://...' 18080
 */
const ProxyChain = require('proxy-chain');

const upstream = process.env.SOCKS_UPSTREAM || process.argv[2];
const port = Number(process.env.BRIDGE_PORT || process.argv[3] || 18080);

if (!upstream) {
  console.error('Missing SOCKS upstream. Set SOCKS_UPSTREAM or pass as argv[2].');
  process.exit(1);
}

new ProxyChain.Server({
  port,
  prepareRequestFunction: () => ({
    requestAuthentication: false,
    upstreamProxyUrl: upstream,
  }),
}).listen(() => {
  console.log(`HTTP proxy http://127.0.0.1:${port} -> ${upstream}`);
});
