'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGas } = require('./load-gas');

const reviewGasFiles = [
  'gas/src/00_Config.gs',
  'gas/src/10_Core.gs',
  'gas/src/20_MockAiAdapter.gs',
  'gas/src/30_GeminiAiAdapter.gs',
  'gas/src/50_QueueProcessor.gs',
  'gas/src/55_ReviewProcessor.gs'
];

function validRequest(overrides = {}) {
  return {
    request_id: 'REQ-TEST',
    requester_alias: 'user-001',
    title: '合成レビュー検証',
    description: '合成データだけを使うレビュー検証です',
    request_type: 'question',
    impact: 'low',
    urgency: 'low',
    status: 'New',
    confirmed_category: 'connectivity',
    runbook_id: 'RB-001',
    resolution: '',
    cancellation_reason: '',
    is_synthetic: true,
    ...overrides
  };
}

function validDraft(overrides = {}) {
  return {
    ai_draft_id: 'AID-TEST',
    request_id: 'REQ-TEST',
    ai_status: 'reviewed',
    summary_draft: '合成レビューの確認依頼です。',
    category_suggestion: 'connectivity',
    checklist_draft_json: '["影響範囲を確認する"]',
    missing_info_json: '[]',
    runbook_suggestion: 'RB-001',
    ...overrides
  };
}

function createRepository({ review, draft = validDraft(), request = validRequest(), event = null }) {
  const writes = { requests: [], events: [] };
  return {
    writes,
    getEvent: () => event,
    getReview: () => review,
    getDraft: () => draft,
    getRequest: () => request,
    listActiveRunbooks: () => [
      { runbook_id: 'RB-001', status: 'active' },
      { runbook_id: 'RB-004', status: 'active' }
    ],
    updateRequestReviewFields: (requestId, updates) => {
      writes.requests.push({ requestId, updates });
    },
    appendEvent: (newEvent) => {
      writes.events.push(newEvent);
    }
  };
}

function process(gas, repository, reviewId = 'REV-TEST') {
  return gas.opsflowProcessReview(reviewId, {
    repository,
    nowFn: () => '2026-08-18T13:00:00.000Z'
  });
}

test('accepted review applies validated draft fields and writes one event', () => {
  const gas = loadGas(reviewGasFiles);
  const repository = createRepository({
    review: {
      review_id: 'REV-TEST',
      ai_draft_id: 'AID-TEST',
      decision: 'accepted',
      reviewer_alias: 'reviewer-001'
    }
  });

  const result = process(gas, repository);

  assert.equal(result.status, 'completed');
  assert.equal(result.applied, true);
  assert.deepEqual(JSON.parse(JSON.stringify(repository.writes.requests[0])), {
    requestId: 'REQ-TEST',
    updates: {
      confirmed_category: 'connectivity',
      runbook_id: 'RB-001',
      updated_at: '2026-08-18T13:00:00.000Z'
    }
  });
  assert.equal(repository.writes.events[0].action, 'ai_review_applied');
  assert.equal(repository.writes.events[0].event_id, 'EVT-REV-TEST');
});

test('edited review applies only the human-confirmed category and Runbook', () => {
  const gas = loadGas(reviewGasFiles);
  const repository = createRepository({
    review: {
      review_id: 'REV-EDIT',
      ai_draft_id: 'AID-TEST',
      decision: 'edited',
      final_summary: '人が修正した合成レビューです。',
      final_category: 'maintenance',
      final_checklist_json: '["合成データであることを確認する"]',
      final_runbook_id: 'RB-004',
      reviewer_alias: 'reviewer-001'
    }
  });

  const result = process(gas, repository, 'REV-EDIT');

  assert.equal(result.applied, true);
  assert.equal(result.confirmedCategory, 'maintenance');
  assert.equal(result.runbookId, 'RB-004');
  assert.equal(repository.writes.requests.length, 1);
  assert.equal(repository.writes.events.length, 1);
});

test('rejected review writes evidence without changing Requests', () => {
  const gas = loadGas(reviewGasFiles);
  const repository = createRepository({
    review: {
      review_id: 'REV-REJECT',
      ai_draft_id: 'AID-TEST',
      decision: 'rejected',
      review_note: '合成分岐テストのため却下',
      reviewer_alias: 'reviewer-001'
    }
  });

  const result = process(gas, repository, 'REV-REJECT');

  assert.equal(result.applied, false);
  assert.equal(repository.writes.requests.length, 0);
  assert.equal(repository.writes.events[0].action, 'ai_review_rejected');
});

test('an existing review event makes processing idempotent', () => {
  const gas = loadGas(reviewGasFiles);
  const repository = createRepository({
    review: null,
    event: {
      event_id: 'EVT-REV-TEST',
      request_id: 'REQ-TEST',
      action: 'ai_review_applied'
    }
  });

  const result = process(gas, repository);

  assert.equal(result.status, 'already_processed');
  assert.equal(result.applied, true);
  assert.equal(repository.writes.requests.length, 0);
  assert.equal(repository.writes.events.length, 0);
});

test('review application refuses an unreviewed draft and unsafe edited text', () => {
  const gas = loadGas(reviewGasFiles);
  const notReviewed = createRepository({
    review: {
      review_id: 'REV-TEST',
      ai_draft_id: 'AID-TEST',
      decision: 'accepted',
      reviewer_alias: 'reviewer-001'
    },
    draft: validDraft({ ai_status: 'ready' })
  });
  assert.throws(() => process(gas, notReviewed), /must be reviewed/);

  const unsafe = createRepository({
    review: {
      review_id: 'REV-TEST',
      ai_draft_id: 'AID-TEST',
      decision: 'edited',
      final_summary: '本番サーバーを再起動する',
      final_category: 'maintenance',
      final_checklist_json: '[]',
      final_runbook_id: 'RB-004',
      reviewer_alias: 'reviewer-001'
    }
  });
  assert.throws(() => process(gas, unsafe), /Review validation failed/);
});
