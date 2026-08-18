'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { loadGas, projectRoot } = require('../tests/load-gas');

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const next = text[index + 1];

    if (character === '"' && quoted && next === '"') {
      field += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === ',' && !quoted) {
      row.push(field);
      field = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && next === '\n') {
        index += 1;
      }
      row.push(field);
      if (row.some((value) => value !== '')) {
        rows.push(row);
      }
      row = [];
      field = '';
    } else {
      field += character;
    }
  }

  if (field !== '' || row.length > 0) {
    row.push(field);
    if (row.some((value) => value !== '')) {
      rows.push(row);
    }
  }

  if (quoted) {
    throw new Error('CSV contains an unterminated quoted field');
  }
  return rows;
}

function csvToObjects(text) {
  const rows = parseCsv(text);
  if (rows.length === 0) {
    return { headers: [], objects: [] };
  }
  const headers = rows[0];
  const objects = rows.slice(1).map((row, rowIndex) => {
    if (row.length !== headers.length) {
      throw new Error(
        `CSV row ${rowIndex + 2} has ${row.length} columns; expected ${headers.length}`
      );
    }
    return Object.fromEntries(headers.map((header, index) => [header, row[index]]));
  });
  return { headers, objects };
}

function readCsv(relativePath) {
  return csvToObjects(
    fs.readFileSync(path.join(projectRoot, relativePath), 'utf8')
  );
}

function findDuplicates(values) {
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values) {
    if (seen.has(value)) {
      duplicates.add(value);
    }
    seen.add(value);
  }
  return [...duplicates];
}

function scanForSensitivePatterns(label, objects, errors) {
  const patterns = [
    { name: 'email address', pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i },
    { name: 'IPv4 address', pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/ },
    { name: 'OpenAI-style secret', pattern: /\bsk-[A-Za-z0-9_-]{12,}\b/ },
    { name: 'Google API key', pattern: /\bAIza[A-Za-z0-9_-]{20,}\b/ },
    { name: 'private key', pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ }
  ];

  objects.forEach((object, index) => {
    const serialized = JSON.stringify(object);
    for (const { name, pattern } of patterns) {
      if (pattern.test(serialized)) {
        errors.push(`${label} row ${index + 2} contains a possible ${name}`);
      }
    }
  });
}

function validateSamples() {
  const gas = loadGas();
  const errors = [];
  const warnings = [];

  const requestsCsv = readCsv('sample-data/requests.csv');
  const runbooksCsv = readCsv('sample-data/runbooks.csv');
  const faqsCsv = readCsv('sample-data/faqs.csv');
  const expectedCsv = readCsv('sample-data/expected-results.csv');
  const fixtures = JSON.parse(
    fs.readFileSync(
      path.join(projectRoot, 'sample-data/mock-ai-fixtures.json'),
      'utf8'
    )
  );

  const expectedHeaders = gas.OPSFLOW_CONFIG.headers;
  const schemaChecks = [
    ['Requests', requestsCsv.headers],
    ['Runbooks', runbooksCsv.headers],
    ['FAQs', faqsCsv.headers]
  ];
  for (const [schemaName, actualHeaders] of schemaChecks) {
    const expected = Array.from(expectedHeaders[schemaName]);
    if (JSON.stringify(actualHeaders) !== JSON.stringify(expected)) {
      errors.push(`${schemaName} headers do not match the GAS schema`);
    }
  }

  if (requestsCsv.objects.length !== 20) {
    errors.push(`requests.csv must contain 20 rows; found ${requestsCsv.objects.length}`);
  }
  if (runbooksCsv.objects.length !== 4) {
    errors.push(`runbooks.csv must contain 4 rows; found ${runbooksCsv.objects.length}`);
  }
  if (faqsCsv.objects.length !== 8) {
    errors.push(`faqs.csv must contain 8 rows; found ${faqsCsv.objects.length}`);
  }
  if (expectedCsv.objects.length !== requestsCsv.objects.length) {
    errors.push('expected-results.csv must have one row per request');
  }

  const requestIds = requestsCsv.objects.map((row) => row.request_id);
  const runbookIds = runbooksCsv.objects.map((row) => row.runbook_id);
  const faqIds = faqsCsv.objects.map((row) => row.faq_id);
  for (const [label, values] of [
    ['request_id', requestIds],
    ['runbook_id', runbookIds],
    ['faq_id', faqIds]
  ]) {
    const duplicates = findDuplicates(values);
    if (duplicates.length > 0) {
      errors.push(`${label} contains duplicates: ${duplicates.join(', ')}`);
    }
  }

  requestsCsv.objects.forEach((request) => {
    const validation = gas.opsflowValidateRequest(request);
    if (!validation.valid) {
      errors.push(
        `${request.request_id} is invalid: ${Array.from(validation.errors).join('; ')}`
      );
    }
    if (request.runbook_id && !runbookIds.includes(request.runbook_id)) {
      errors.push(`${request.request_id} references unknown runbook ${request.runbook_id}`);
    }
  });

  faqsCsv.objects.forEach((faq) => {
    if (!runbookIds.includes(faq.runbook_id)) {
      errors.push(`${faq.faq_id} references unknown runbook ${faq.runbook_id}`);
    }
  });

  const expectedByRequest = new Map(
    expectedCsv.objects.map((row) => [row.request_id, row])
  );
  let mockMatches = 0;
  requestsCsv.objects.forEach((request) => {
    const expected = expectedByRequest.get(request.request_id);
    if (!expected) {
      errors.push(`Missing expected result for ${request.request_id}`);
      return;
    }

    const draft = gas.opsflowMockGenerateDraft(request, runbooksCsv.objects);
    const validation = gas.opsflowValidateAiDraft(draft, runbookIds);
    if (!validation.valid) {
      errors.push(
        `${request.request_id} mock draft is invalid: ${Array.from(validation.errors).join('; ')}`
      );
      return;
    }
    if (draft.category_suggestion !== expected.expected_category) {
      errors.push(
        `${request.request_id} category ${draft.category_suggestion} != ${expected.expected_category}`
      );
      return;
    }
    if ((draft.runbook_suggestion || '') !== expected.expected_runbook_id) {
      errors.push(
        `${request.request_id} runbook ${draft.runbook_suggestion || ''} != ${expected.expected_runbook_id}`
      );
      return;
    }
    if (
      expected.expected_missing_information_contains &&
      !Array.from(draft.missing_information).includes(
        expected.expected_missing_information_contains
      )
    ) {
      errors.push(
        `${request.request_id} missing_information lacks ${expected.expected_missing_information_contains}`
      );
      return;
    }
    mockMatches += 1;
  });

  for (const [requestId, fixture] of Object.entries(fixtures)) {
    if (!requestIds.includes(requestId)) {
      errors.push(`Fixture references unknown request ${requestId}`);
    }
    const validation = gas.opsflowValidateAiDraft(fixture, runbookIds);
    if (!validation.valid) {
      errors.push(
        `Fixture ${requestId} is invalid: ${Array.from(validation.errors).join('; ')}`
      );
    }
  }

  scanForSensitivePatterns('requests.csv', requestsCsv.objects, errors);
  scanForSensitivePatterns('runbooks.csv', runbooksCsv.objects, errors);
  scanForSensitivePatterns('faqs.csv', faqsCsv.objects, errors);
  scanForSensitivePatterns('mock-ai-fixtures.json', Object.values(fixtures), errors);

  if (fixtures && Object.keys(fixtures).length < 4) {
    warnings.push('Fewer than four explicit mock fixtures are present');
  }

  return {
    status: errors.length === 0 ? 'ok' : 'failed',
    errors,
    warnings,
    counts: {
      requests: requestsCsv.objects.length,
      runbooks: runbooksCsv.objects.length,
      faqs: faqsCsv.objects.length,
      expectedResults: expectedCsv.objects.length,
      fixtures: Object.keys(fixtures).length
    },
    mockEvaluation: {
      matched: mockMatches,
      total: requestsCsv.objects.length
    }
  };
}

if (require.main === module) {
  const result = validateSamples();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (result.status !== 'ok') {
    process.exitCode = 1;
  }
}

module.exports = {
  csvToObjects,
  parseCsv,
  validateSamples
};
