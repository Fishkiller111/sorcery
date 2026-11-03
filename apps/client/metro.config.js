const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

const zustandCjsAliases = {
  zustand: 'index.js',
  'zustand/middleware': 'middleware.js',
  'zustand/vanilla': 'vanilla.js',
  'zustand/shallow': 'shallow.js',
  'zustand/context': 'context.js',
};

const zustandRoot = path.join(__dirname, 'node_modules', 'zustand');

const origResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const cjsEntry = zustandCjsAliases[moduleName];
  if (cjsEntry) {
    return {
      filePath: path.join(zustandRoot, cjsEntry),
      type: 'sourceFile',
    };
  }

  if (origResolveRequest) {
    return origResolveRequest(context, moduleName, platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
