'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGas } = require('./load-gas');

const runbooks = [
  {
    runbook_id: 'RB-001',
    title: 'VPN接続トラブルの初期確認',
    category: 'connectivity',
    keywords: 'VPN 接続 ネットワーク',
    status: 'active'
  },
  {
    runbook_id: 'RB-003',
    title: '共有フォルダアクセス依頼',
    category: 'access',
    keywords: '共有フォルダ アクセス 申請',
    status: 'active'
  }
];

test('mock adapter classifies VPN request and suggests matching runbook', () => {
  const gas = loadGas();
  const draft = gas.opsflowMockGenerateDraft(
    {
      request_id: 'REQ-0001',
      title: 'VPNへ接続できない',
      description: '本日9時に利用者1名でエラーが表示されます',
      request_type: 'incident'
    },
    runbooks
  );

  assert.equal(draft.category_suggestion, 'connectivity');
  assert.equal(draft.runbook_suggestion, 'RB-001');
  assert.equal(draft.needs_human_review, true);
  assert.ok(Array.from(draft.checklist_draft).length <= 8);
});

test('mock adapter keeps an unknown request in the general category', () => {
  const gas = loadGas();
  const draft = gas.opsflowMockGenerateDraft(
    {
      request_id: 'REQ-0020',
      title: '相談があります',
      description: '対象と希望時期は未定です',
      request_type: 'question'
    },
    runbooks
  );

  assert.equal(draft.category_suggestion, 'general');
  assert.equal(draft.runbook_suggestion, null);
  assert.ok(Array.from(draft.missing_information).includes('発生時刻'));
});

test('mock fixture is returned without mutation', () => {
  const gas = loadGas();
  const fixture = {
    summary_draft: 'fixture',
    category_suggestion: 'general',
    checklist_draft: ['目的を確認する'],
    missing_information: [],
    runbook_suggestion: null,
    needs_human_review: true
  };
  const result = gas.opsflowMockGenerateDraft({}, [], { fixture });
  result.checklist_draft.push('changed');

  assert.equal(fixture.checklist_draft.length, 1);
});

test('Gemini adapter sends API key as a header and parses JSON output', () => {
  const gas = loadGas();
  let requestRecord;
  const expected = {
    summary_draft: 'synthetic summary',
    category_suggestion: 'general',
    checklist_draft: [],
    missing_information: [],
    runbook_suggestion: null,
    needs_human_review: true
  };

  const result = gas.opsflowGeminiGenerateDraft(
    {
      request_id: 'REQ-TEST',
      title: '相談',
      description: '合成データです',
      request_type: 'question',
      impact: 'low',
      urgency: 'low'
    },
    [],
    {
      apiKey: 'test-only-key',
      model: 'test-model',
      apiBase: 'https://example.invalid/v1beta',
      fetcher(url, options) {
        requestRecord = { url, options };
        return {
          getResponseCode: () => 200,
          getContentText: () =>
            JSON.stringify({
              candidates: [
                {
                  content: {
                    parts: [{ text: JSON.stringify(expected) }]
                  }
                }
              ]
            })
        };
      }
    }
  );

  assert.equal(requestRecord.url.includes('test-only-key'), false);
  assert.equal(requestRecord.options.headers['x-goog-api-key'], 'test-only-key');
  assert.equal(result.needs_human_review, true);
  assert.equal(result.category_suggestion, 'general');
});
