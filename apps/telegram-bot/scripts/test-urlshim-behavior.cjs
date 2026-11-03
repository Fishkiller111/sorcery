'use strict';
// Contract for this project's node-fetch use; not a general whatwg-url conformance test.
const assert = require('node:assert/strict');
const http = require('node:http');
const fetch = require('node-fetch');
const vectors = [
  ['https://例子.测试/路径?q=中', 'https://xn--fsqu00a.xn--0zwm56d/%E8%B7%AF%E5%BE%84?q=%E4%B8%AD'],
  ['http://[::1]:8080/x', 'http://[::1]:8080/x'],
  ['http://127.1/a', 'http://127.0.0.1/a'],
  ['https://[::ffff:127.0.0.1]/', 'https://[::ffff:7f00:1]/'],
  ['https://example.com/%2e%2e/%2f?q=x#frag', 'https://example.com/%2f?q=x#frag'],
  ['https://☃.net/', 'https://xn--n3h.net/'],
];
(async () => {
  for (const [input, expected] of vectors) assert.equal(new fetch.Request(input).url, expected);
  assert.throws(() => new fetch.Request('http://%00/'), TypeError);
  await assert.rejects(fetch('javascript:alert(1)'));
  await assert.rejects(fetch('/relative'));
  const server = http.createServer((req, res) => {
    if (req.url === '/redirect') return res.writeHead(302, { location: '/target' }).end();
    if (req.url === '/slow') return setTimeout(() => res.end('late'), 500);
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ url: req.url, authorization: req.headers.authorization || '' }));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const base = 'http://127.0.0.1:' + server.address().port;
    const response = await fetch(base + '/redirect', { headers: { Authorization: 'Bearer local-test' } });
    assert.equal(response.url, base + '/target');
    assert.deepEqual(await response.json(), { url: '/target', authorization: 'Bearer local-test' });
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 30);
    await assert.rejects(fetch(base + '/slow', { signal: controller.signal }), (e) => e.name === 'AbortError');
  } finally {
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
  }
  console.log('PASS URL Unicode, IPv4/IPv6, malicious input, redirect and abort');
})().catch((error) => { console.error(error); process.exitCode = 1; });
