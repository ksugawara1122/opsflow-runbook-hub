'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCsv, validateSamples } = require('../scripts/validate-samples');

test('CSV parser handles quoted commas and line endings', () => {
  const rows = parseCsv('a,b\r\n"x,y",z\r\n');
  assert.deepEqual(rows, [
    ['a', 'b'],
    ['x,y', 'z']
  ]);
});

test('sample data matches schemas, safety checks and mock expectations', () => {
  const result = validateSamples();

  assert.equal(result.status, 'ok', result.errors.join('\n'));
  assert.deepEqual(result.counts, {
    requests: 20,
    runbooks: 4,
    faqs: 8,
    expectedResults: 20,
    fixtures: 4
  });
  assert.deepEqual(result.mockEvaluation, {
    matched: 20,
    total: 20
  });
});
