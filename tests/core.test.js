'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGas } = require('./load-gas');

function validRequest(overrides = {}) {
  return {
    request_id: 'REQ-TEST',
    requester_alias: 'user-001',
    title: 'VPNへ接続できない',
    description: '本日9時に利用者1名でエラーが表示されました',
    request_type: 'incident',
    impact: 'medium',
    urgency: 'high',
    status: 'New',
    resolution: '',
    cancellation_reason: '',
    is_synthetic: true,
    ...overrides
  };
}

test('synthetic request passes validation', () => {
  const gas = loadGas();
  const result = gas.opsflowValidateRequest(validRequest());

  assert.equal(result.valid, true);
  assert.deepEqual(Array.from(result.errors), []);
});

test('non-synthetic request is rejected', () => {
  const gas = loadGas();
  const result = gas.opsflowValidateRequest(
    validRequest({ is_synthetic: false })
  );

  assert.equal(result.valid, false);
  assert.match(Array.from(result.errors).join(' '), /is_synthetic/);
});

test('request enumerations are enforced', () => {
  const gas = loadGas();
  const result = gas.opsflowValidateRequest(
    validRequest({ request_type: 'unknown', urgency: 'critical' })
  );

  assert.equal(result.valid, false);
  assert.match(Array.from(result.errors).join(' '), /request_type/);
  assert.match(Array.from(result.errors).join(' '), /urgency/);
});

test('status transitions follow the explicit state model', () => {
  const gas = loadGas();

  assert.equal(gas.opsflowCanTransition('New', 'Triaged'), true);
  assert.equal(gas.opsflowCanTransition('New', 'Closed'), false);
  assert.equal(gas.opsflowCanTransition('Resolved', 'In Progress'), true);
  assert.equal(gas.opsflowCanTransition('Closed', 'New'), false);
});

test('resolved and cancelled transitions require completion details', () => {
  const gas = loadGas();

  const unresolved = gas.opsflowValidateStatusChange(
    validRequest({ status: 'In Progress' }),
    'Resolved',
    false
  );
  assert.equal(unresolved.valid, false);
  assert.match(Array.from(unresolved.errors).join(' '), /resolution/);

  const cancelled = gas.opsflowValidateStatusChange(
    validRequest({ status: 'New' }),
    'Cancelled',
    false
  );
  assert.equal(cancelled.valid, false);
  assert.match(Array.from(cancelled.errors).join(' '), /cancellation_reason/);
});

test('valid AI draft requires human review and an existing runbook', () => {
  const gas = loadGas();
  const result = gas.opsflowValidateAiDraft(
    {
      summary_draft: 'VPN接続の確認依頼です。',
      category_suggestion: 'connectivity',
      checklist_draft: ['影響範囲を確認する'],
      missing_information: ['発生時刻'],
      runbook_suggestion: 'RB-001',
      needs_human_review: true
    },
    ['RB-001']
  );

  assert.equal(result.valid, true);
  assert.equal(result.normalized.needs_human_review, true);
});

test('AI draft cannot bypass review or reference an unknown runbook', () => {
  const gas = loadGas();
  const result = gas.opsflowValidateAiDraft(
    {
      summary_draft: '確認依頼です。',
      category_suggestion: 'connectivity',
      checklist_draft: [],
      missing_information: [],
      runbook_suggestion: 'RB-999',
      needs_human_review: false
    },
    ['RB-001']
  );

  assert.equal(result.valid, false);
  const errors = Array.from(result.errors).join(' ');
  assert.match(errors, /needs_human_review/);
  assert.match(errors, /does not exist/);
});

test('unsafe account or production actions are rejected', () => {
  const gas = loadGas();
  const result = gas.opsflowValidateAiDraft(
    {
      summary_draft: '認証エラーです。',
      category_suggestion: 'authentication',
      checklist_draft: ['利用者のパスワードをリセットする'],
      missing_information: [],
      runbook_suggestion: 'RB-002',
      needs_human_review: true
    },
    ['RB-002']
  );

  assert.equal(result.valid, false);
  assert.match(Array.from(result.errors).join(' '), /prohibited/);
});

test('input hash is deterministic and changes with request text', () => {
  const gas = loadGas();
  const first = gas.opsflowCreateInputHash(validRequest());
  const second = gas.opsflowCreateInputHash(validRequest());
  const changed = gas.opsflowCreateInputHash(
    validRequest({ description: '異なる説明' })
  );

  assert.equal(first, second);
  assert.notEqual(first, changed);
  assert.match(first, /^[0-9a-f]{8}$/);
});

test('accepted review resolves to the AI draft but remains an explicit human action', () => {
  const gas = loadGas();
  const result = gas.opsflowResolveReview(
    {
      decision: 'accepted',
      reviewer_alias: 'reviewer-001'
    },
    {
      summary_draft: 'VPN接続の確認依頼です。',
      category_suggestion: 'connectivity',
      checklist_draft: ['影響範囲を確認する'],
      runbook_suggestion: 'RB-001'
    },
    ['RB-001']
  );

  assert.equal(result.valid, true);
  assert.equal(result.resolution.apply_to_request, true);
  assert.equal(result.resolution.final_category, 'connectivity');
  assert.equal(result.resolution.final_runbook_id, 'RB-001');
});

test('rejected review never applies AI fields to the request', () => {
  const gas = loadGas();
  const result = gas.opsflowResolveReview(
    {
      decision: 'rejected',
      reviewer_alias: 'reviewer-001',
      review_note: '依頼内容と一致しない'
    },
    {
      summary_draft: 'unused',
      category_suggestion: 'general',
      checklist_draft: [],
      runbook_suggestion: null
    },
    []
  );

  assert.equal(result.valid, true);
  assert.equal(result.resolution.apply_to_request, false);
  assert.equal(result.resolution.final_summary, '');
});

test('edited review rejects invalid checklist JSON and prohibited actions', () => {
  const gas = loadGas();
  const invalidJson = gas.opsflowResolveReview(
    {
      decision: 'edited',
      reviewer_alias: 'reviewer-001',
      final_summary: '確認依頼です。',
      final_category: 'general',
      final_checklist_json: 'not-json'
    },
    {},
    []
  );
  assert.equal(invalidJson.valid, false);
  assert.match(Array.from(invalidJson.errors).join(' '), /not valid JSON/);

  const unsafe = gas.opsflowResolveReview(
    {
      decision: 'edited',
      reviewer_alias: 'reviewer-001',
      final_summary: '確認依頼です。',
      final_category: 'authentication',
      final_checklist: ['利用者のパスワードをリセットする']
    },
    {},
    []
  );
  assert.equal(unsafe.valid, false);
  assert.match(Array.from(unsafe.errors).join(' '), /prohibited/);
});

test('edited review rejects checklist JSON that is not an array', () => {
  const gas = loadGas();
  const result = gas.opsflowResolveReview(
    {
      decision: 'edited',
      reviewer_alias: 'reviewer-001',
      final_summary: '確認依頼です。',
      final_category: 'general',
      final_checklist_json: '{"item":"配列ではない"}'
    },
    {},
    []
  );

  assert.equal(result.valid, false);
  assert.match(Array.from(result.errors).join(' '), /not valid JSON/);
});
