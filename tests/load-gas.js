'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const projectRoot = path.resolve(__dirname, '..');

const defaultGasFiles = [
  'gas/src/00_Config.gs',
  'gas/src/10_Core.gs',
  'gas/src/20_MockAiAdapter.gs',
  'gas/src/30_GeminiAiAdapter.gs',
  'gas/src/50_QueueProcessor.gs'
];

function loadGas(files = defaultGasFiles, overrides = {}) {
  const context = vm.createContext({
    console,
    ...overrides
  });

  for (const relativePath of files) {
    const absolutePath = path.join(projectRoot, relativePath);
    const source = fs.readFileSync(absolutePath, 'utf8');
    vm.runInContext(source, context, {
      filename: relativePath
    });
  }

  return context;
}

module.exports = {
  defaultGasFiles,
  loadGas,
  projectRoot
};
