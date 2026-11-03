'use strict';
const fs=require('node:fs'), path=require('node:path'), crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
function check(lock, manifest){
 const errors=[]; const p=lock.packages||{};
 if(manifest.engines?.node!=='>=20'||manifest.dependencies?.['whatwg-url']!=='file:./vendor/whatwg-url-node20'||manifest.overrides?.['whatwg-url']!=='$whatwg-url') errors.push('root configuration mismatch');
 if(p['']?.dependencies?.['whatwg-url']!=='file:./vendor/whatwg-url-node20') errors.push('lock root mismatch');
 if(p['node_modules/grammy']?.version!=='1.45.1') errors.push('grammy version mismatch');
 if(p['node_modules/node-fetch']?.version!=='2.7.0') errors.push('node-fetch version mismatch');
 if(p['node_modules/whatwg-url']?.resolved!=='vendor/whatwg-url-node20'||p['node_modules/whatwg-url']?.link!==true) errors.push('shim link mismatch');
 if(p['vendor/whatwg-url-node20']?.version!=='0.0.0-node20-shim'||p['vendor/whatwg-url-node20']?.name!=='whatwg-url') errors.push('shim version mismatch');
 for(const [loc,pkg] of Object.entries(p)) {
  if(loc && /(?:^|\/)node_modules\/tr46$/.test(loc)) errors.push('tr46 forbidden: '+loc);
  if(loc && /(?:^|\/)node_modules\/node-fetch$/.test(loc) && loc!=='node_modules/node-fetch') errors.push('extra node-fetch: '+loc);
  if(loc && /(?:^|\/)node_modules\/whatwg-url$/.test(loc) && loc!=='node_modules/whatwg-url') errors.push('extra whatwg-url: '+loc);
  for(const key of ['dependencies','devDependencies','optionalDependencies','peerDependencies']){
   if(pkg[key]?.['node-fetch'] && !(loc==='node_modules/grammy'&&key==='dependencies'&&pkg.version==='1.45.1')) errors.push('unexpected node-fetch consumer: '+loc+' '+key);
   if(pkg[key]?.['whatwg-url'] && !((loc===''&&key==='dependencies')||(loc==='node_modules/node-fetch'&&key==='dependencies'&&pkg.version==='2.7.0'))) errors.push('unexpected whatwg-url consumer: '+loc+' '+key);
  }
 }
 return errors;
}
function runtime(){
 const errs=check(JSON.parse(fs.readFileSync(path.join(root,'package-lock.json'))),JSON.parse(fs.readFileSync(path.join(root,'package.json'))));
 const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
 if(Number(process.versions.node.split('.')[0])<20) errs.push('Node >=20 required');
 if(hash('node_modules/node-fetch/lib/index.js')!=='79541f01338e70f4ff6f8a1d12f5c2914d4c6ab2ba96b7ddf48d2add01c13813') errs.push('node-fetch source hash mismatch');
 if(hash('vendor/whatwg-url-node20/index.cjs')!=='f2cff39780719677a8106db9f6e57c270aea6209baa3e12bf2c1d4cb753a4dac') errs.push('shim source hash mismatch');
 if(fs.realpathSync(require.resolve('whatwg-url'))!==fs.realpathSync(path.join(root,'vendor/whatwg-url-node20/index.cjs'))) errs.push('wrong shim resolution');
 const shim=require('whatwg-url'); if(Object.keys(shim).join(',')!=='URL'||shim.URL!==require('node:url').URL) errs.push('wrong shim exports');
 if(errs.length) throw Error(errs.join('\n')); console.log('PASS urlshim topology and source guards');
}
if(require.main===module)try{runtime()}catch(e){console.error(e.message);process.exitCode=1}
module.exports={check};
