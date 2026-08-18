'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGas } = require('./load-gas');

const allGasFiles = [
  'gas/src/00_Config.gs',
  'gas/src/10_Core.gs',
  'gas/src/20_MockAiAdapter.gs',
  'gas/src/30_GeminiAiAdapter.gs',
  'gas/src/40_SheetRepository.gs',
  'gas/src/50_QueueProcessor.gs',
  'gas/src/55_ReviewProcessor.gs',
  'gas/src/60_Setup.gs',
  'gas/src/70_Menu.gs',
  'gas/src/80_SeedData.gs'
];

test('all Apps Script source files parse in one V8-compatible context', () => {
  const gas = loadGas(allGasFiles);

  assert.equal(typeof gas.opsflowEnsureSheets, 'function');
  assert.equal(typeof gas.opsflowProcessMockQueue, 'function');
  assert.equal(typeof gas.opsflowProcessSelectedReview, 'function');
  assert.equal(typeof gas.opsflowSeedSyntheticData, 'function');
  assert.equal(typeof gas.onOpen, 'function');
});

test('embedded Apps Script seed data remains synthetic and complete', () => {
  const gas = loadGas(allGasFiles);
  const seed = gas.opsflowGetSyntheticSeedData_();

  assert.equal(seed.requests.length, 20);
  assert.equal(seed.runbooks.length, 4);
  assert.equal(seed.faqs.length, 8);
  assert.equal(seed.requests.every((request) => request.is_synthetic === true), true);
  assert.equal(
    seed.requests.every((request) => gas.opsflowValidateRequest(request).valid),
    true
  );
});
