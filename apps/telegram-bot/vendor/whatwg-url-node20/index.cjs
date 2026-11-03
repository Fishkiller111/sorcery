'use strict';
const nodeMajor = Number(process.versions.node.split('.')[0]);
if (nodeMajor < 20) throw new Error('This narrow local shim requires Node.js >=20.');
const { URL } = require('node:url');
if (typeof URL !== 'function') throw new Error('Node.js built-in URL is unavailable.');
// Deliberately exposes only the property node-fetch@2.7.0 references.
module.exports = { URL };
