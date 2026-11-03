'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{check}=require('./check-urlshim-topology.cjs');
const root=path.resolve(__dirname,'..'), l=JSON.parse(fs.readFileSync(path.join(root,'package-lock.json'))),m=JSON.parse(fs.readFileSync(path.join(root,'package.json')));
assert.deepEqual(check(l,m),[]); let n=0;
for(const mutate of [x=>x.packages['node_modules/node-fetch'].version='2.8.0',x=>x.packages['node_modules/grammy'].version='1.46.0',x=>x.packages['node_modules/rogue']={dependencies:{'node-fetch':'*'}},x=>x.packages['node_modules/rogue']={dependencies:{'whatwg-url':'*'}},x=>x.packages['node_modules/tr46']={version:'0.0.3'},x=>x.packages['node_modules/rogue/node_modules/node-fetch']={version:'2.7.0'},x=>x.packages['node_modules/whatwg-url'].resolved='elsewhere',x=>x.packages['node_modules/rogue']={peerDependencies:{'whatwg-url':'*'}}]){let x=structuredClone(l);mutate(x);assert.notEqual(check(x,m).length,0);n++}
console.log('PASS fail-closed mutations:',n);
