import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import { once } from 'node:events';
import { Bot, InputFile } from 'grammy';
import { telegramClientOptions } from '../src/bot/createBot.js';
import { downloadTelegramFile } from '../src/custom-agent/tgFile.js';
import type { AppConfig } from '../src/config.js';

// 测试只监听 loopback；证书/私钥临时生成，只信任该测试证书，不关闭 TLS 校验。
if (process.env.SORCERY_PROXY_TEST_CHILD !== '1') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sorcery-proxy-test-'));
  try {
    const cert = path.join(dir, 'cert.pem');
    const key = path.join(dir, 'key.pem');
    const generate = spawnSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1', '-keyout', key, '-out', cert, '-subj', '/CN=localhost', '-addext', 'subjectAltName=DNS:localhost,IP:127.0.0.1'], { stdio: 'pipe', timeout: 15000 });
    if (generate.error || generate.status !== 0) throw new Error('测试需要可用的 openssl 和 SAN 支持');
    const child = spawnSync(process.execPath, ['--import', 'tsx', fileURLToPath(import.meta.url)], { stdio: 'inherit', timeout: 30000, env: { ...process.env, SORCERY_PROXY_TEST_CHILD: '1', SORCERY_PROXY_TEST_CERT: cert, SORCERY_PROXY_TEST_KEY: key, NODE_EXTRA_CA_CERTS: cert } });
    if (child.error || child.status !== 0) throw new Error(`隔离代理子测试失败: ${child.status ?? child.error?.message}`);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  process.exit(0);
}

let connects = 0;
const sockets = new Set<net.Socket>();
const testBodies: {path: string; body: string; contentType: string}[] = [];
const origin = https.createServer({key: fs.readFileSync(process.env.SORCERY_PROXY_TEST_KEY!),cert:fs.readFileSync(process.env.SORCERY_PROXY_TEST_CERT!)}, (req,res) => {
  const chunks: Buffer[]=[]; req.on('data',(b:Buffer)=>chunks.push(b)); req.on('end',()=>{
    const path=req.url||''; const body=Buffer.concat(chunks).toString(); testBodies.push({path,body,contentType:String(req.headers['content-type']||'')});
    if (path === '/file') {res.writeHead(200,{'Content-Type':'application/octet-stream'}); res.end('test-file-bytes'); return;}
    res.writeHead(200,{'Content-Type':'application/json'});
    if (path.endsWith('/getMe')) res.end(JSON.stringify({ok:true,result:{id:12345,is_bot:true,first_name:'TestBot',username:'test_bot'}}));
    else if(path.endsWith('/sendMessage')) res.end(JSON.stringify({ok:true,result:{message_id:1,date:0,chat:{id:1,type:'private'},text:'hello'}}));
    else if(path.endsWith('/sendPhoto')) res.end(JSON.stringify({ok:true,result:{message_id:2,date:0,chat:{id:1,type:'private'},photo:[]}}));
    else {res.statusCode=404;res.end(JSON.stringify({ok:false,description:'unknown method'}));}
  });
});
origin.listen(0,'127.0.0.1');await once(origin,'listening'); const port=(origin.address() as net.AddressInfo).port;
const proxy=http.createServer((_req,res)=>{res.writeHead(405);res.end()});
proxy.on('connection', (socket) => { sockets.add(socket); socket.on('close', () => sockets.delete(socket)); });
proxy.on('connect',(req, client, head)=>{
  connects++;
  if(req.headers['proxy-authorization']!=='Basic '+Buffer.from('test-user:test-pass').toString('base64')) {client.write('HTTP/1.1 407 Proxy Authentication Required\r\nProxy-Authenticate: Basic realm="local"\r\n\r\n');client.destroy();return;}
  if(req.url!==`localhost:${port}`){client.write('HTTP/1.1 403 Forbidden\r\n\r\n');client.destroy();return;}
  const upstream=net.connect(port,'127.0.0.1',()=>{client.write('HTTP/1.1 200 Connection Established\r\n\r\n');if(head.length)upstream.write(head);client.pipe(upstream);upstream.pipe(client)}); upstream.on('error',()=>client.destroy());client.on('error',()=>upstream.destroy());
});
proxy.listen(0,'127.0.0.1');await once(proxy,'listening');const pp=(proxy.address() as net.AddressInfo).port;
const proxyUrl=`http://test-user:test-pass@127.0.0.1:${pp}`;
try {
  const client = telegramClientOptions({telegramProxyUrl:proxyUrl} as AppConfig);
  assert(client?.baseFetchConfig?.agent);
  const bot = new Bot('12345:FAKE_TEST_ONLY',{client:{...client,apiRoot:`https://localhost:${port}`}});
  assert.equal((await bot.api.getMe()).id,12345);
  assert.equal((await bot.api.sendMessage(1,'hello')).text,'hello');
  await bot.api.sendPhoto(1,new InputFile(Buffer.from('tiny-test-photo'),'fake.jpg'));
  assert.equal((await downloadTelegramFile(`https://localhost:${port}/file`,proxyUrl)).toString(),'test-file-bytes');
  assert(testBodies.some(x=>x.path.endsWith('/sendMessage')&&x.body.includes('hello')));
  assert(testBodies.some(x=>x.path.endsWith('/sendPhoto')&&x.contentType.includes('multipart/form-data')&&x.body.includes('tiny-test-photo')));
  assert(connects>=4); console.log(`PASS: HTTPS CONNECT + Basic auth, verified local TLS, grammY getMe/sendMessage/multipart, Telegram file fetch; CONNECT count ${connects}`);
} finally { for (const socket of sockets) socket.destroy(); proxy.closeAllConnections(); origin.closeAllConnections(); await Promise.all([new Promise<void>(r=>proxy.close(()=>r())),new Promise<void>(r=>origin.close(()=>r()))]); }
