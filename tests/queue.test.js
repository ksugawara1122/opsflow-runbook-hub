'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGas } = require('./load-gas');

function createValidRequest(overrides = {}) {
  return {
    request_id: 'REQ-0001',
    requester_alias: 'user-001',
    title: 'VPNへ接続できない',
    description: '本日9時に利用者1名でエラーが表示されます',
    request_type: 'incident',
    impact: 'medium',
    urgency: 'high',
    status: 'New',
    is_synthetic: true,
    ...overrides
  };
}

function createRepository(request = createValidRequest()) {
  const state = {
    processing: [],
    ready: [],
    errors: [],
    events: []
  };

  return {
    state,
    listQueuedDrafts() {
      return [
        {
          ai_draft_id: 'AID-001',
          request_id: request.request_id,
          ai_status: 'queued',
          ai_mode: 'mock',
          prompt_version: 'triage-v1'
        }
      ];
    },
    getRequest() {
      return request;
    },
    listActiveRunbooks() {
      return [
        {
          runbook_id: 'RB-001',
          title: 'VPN接続トラブル',
          category: 'connectivity',
          keywords: 'VPN 接続',
          status: 'active'
        }
      ];
    },
    markDraftProcessing(...args) {
      state.processing.push(args);
    },
    markDraftReady(...args) {
      state.ready.push(args);
    },
    markDraftError(...args) {
      state.errors.push(args);
    },
    appendEvent(event) {
      state.events.push(event);
    }
  };
}

function createLock() {
  return {
    released: false,
    tryLock: () => true,
    releaseLock() {
      this.released = true;
    }
  };
}

test('queue processes a valid mock job and records human-reviewable output', () => {
  const gas = loadGas();
  const repository = createRepository();
  const lock = createLock();
  const report = gas.opsflowProcessQueue({
    repository,
    lock,
    allowedModes: ['mock'],
    nowFn: () => '2026-08-18T00:00:00.000Z'
  });

  assert.equal(report.processed, 1);
  assert.equal(report.ready, 1);
  assert.equal(report.errors, 0);
  assert.equal(repository.state.ready.length, 1);
  assert.equal(repository.state.ready[0][1].needs_human_review, true);
  assert.equal(repository.state.events[0].action, 'ai_draft_ready');
  assert.equal(lock.released, true);
});

test('queue retries one invalid AI response before accepting a valid response', () => {
  const gas = loadGas();
  const repository = createRepository();
  let calls = 0;
  const adapters = {
    mock: {
      modelName: 'test-adapter',
      generate() {
        calls += 1;
        if (calls === 1) {
          return {
            summary_draft: '',
            category_suggestion: 'unknown',
            checklist_draft: [],
            missing_information: [],
            runbook_suggestion: null,
            needs_human_review: false
          };
        }
        return {
          summary_draft: '確認依頼です。',
          category_suggestion: 'connectivity',
          checklist_draft: ['影響範囲を確認する'],
          missing_information: [],
          runbook_suggestion: 'RB-001',
          needs_human_review: true
        };
      }
    }
  };

  const report = gas.opsflowProcessQueue({
    repository,
    adapters,
    lock: createLock(),
    nowFn: () => '2026-08-18T00:00:00.000Z'
  });

  assert.equal(report.ready, 1);
  assert.equal(calls, 2);
  assert.equal(repository.state.ready[0][2].retryCount, 1);
});

test('invalid request becomes an error without applying AI output', () => {
  const gas = loadGas();
  const repository = createRepository(
    createValidRequest({ is_synthetic: false })
  );
  const report = gas.opsflowProcessQueue({
    repository,
    lock: createLock(),
    nowFn: () => '2026-08-18T00:00:00.000Z'
  });

  assert.equal(report.ready, 0);
  assert.equal(report.errors, 1);
  assert.equal(repository.state.ready.length, 0);
  assert.equal(repository.state.errors[0][1], 'REQUEST_INVALID');
  assert.equal(repository.state.events[0].action, 'ai_draft_error');
});

test('locked queue returns without processing', () => {
  const gas = loadGas();
  const repository = createRepository();
  const lock = {
    tryLock: () => false,
    releaseLock() {
      throw new Error('must not release a lock that was not acquired');
    }
  };
  const report = gas.opsflowProcessQueue({ repository, lock });

  assert.equal(report.status, 'locked');
  assert.equal(report.processed, 0);
  assert.equal(repository.state.processing.length, 0);
});
