/**
 * Queue orchestration with dependency injection for local tests.
 */

function opsflowCreateDefaultAdapters_(options) {
  var settings = options || {};
  return {
    mock: {
      modelName: 'deterministic-rules-v1',
      generate: function (request, runbooks) {
        return opsflowMockGenerateDraft(request, runbooks, settings.mockOptions || {});
      }
    },
    gemini: {
      modelName: settings.geminiModel || 'configured-in-script-properties',
      generate: function (request, runbooks) {
        return opsflowGeminiGenerateDraft(request, runbooks, settings.geminiOptions || {});
      }
    }
  };
}

function opsflowCreateDefaultLock_() {
  if (typeof LockService === 'undefined') {
    return {
      tryLock: function () {
        return true;
      },
      releaseLock: function () {}
    };
  }
  return LockService.getScriptLock();
}

function opsflowToErrorCode_(error) {
  var message = error && error.message ? error.message : String(error);
  var normalized = message.replace(/[\r\n\t]+/g, ' ').slice(0, 180);

  if (/invalid json|not valid json/i.test(normalized)) {
    return 'AI_JSON_INVALID';
  }
  if (/validation/i.test(normalized)) {
    return 'AI_VALIDATION_FAILED';
  }
  if (/request is invalid/i.test(normalized)) {
    return 'REQUEST_INVALID';
  }
  if (/request not found/i.test(normalized)) {
    return 'REQUEST_NOT_FOUND';
  }
  if (/http\s+\d+/i.test(normalized)) {
    return 'AI_HTTP_ERROR';
  }
  if (/script property|api key|model/i.test(normalized)) {
    return 'AI_CONFIGURATION_ERROR';
  }
  return 'AI_PROCESSING_ERROR';
}

function opsflowProcessSingleJob_(job, repository, adapters, nowFn) {
  var startedAt = nowFn();
  repository.markDraftProcessing(job.ai_draft_id, startedAt);

  var request = repository.getRequest(job.request_id);
  if (!request) {
    throw new Error('Request not found: ' + job.request_id);
  }

  var requestValidation = opsflowValidateRequest(request);
  if (!requestValidation.valid) {
    throw new Error('Request is invalid: ' + requestValidation.errors.join('; '));
  }

  var runbooks = repository.listActiveRunbooks();
  var allowedRunbookIds = runbooks.map(function (runbook) {
    return runbook.runbook_id;
  });
  var adapter = adapters[job.ai_mode];
  if (!adapter) {
    throw new Error('AI mode has no adapter: ' + job.ai_mode);
  }

  var lastError = null;
  var retryCount = 0;
  var result = null;
  for (
    var attempt = 0;
    attempt <= OPSFLOW_CONFIG.maxAiRetries;
    attempt += 1
  ) {
    try {
      var generated = adapter.generate(request, runbooks, {
        attempt: attempt,
        job: job
      });
      var validation = opsflowValidateAiDraft(generated, allowedRunbookIds);
      if (!validation.valid) {
        throw new Error('AI validation failed: ' + validation.errors.join('; '));
      }
      result = validation.normalized;
      retryCount = attempt;
      break;
    } catch (error) {
      lastError = error;
      retryCount = attempt;
    }
  }

  if (!result) {
    throw lastError || new Error('AI processing failed without an error');
  }

  var completedAt = nowFn();
  repository.markDraftReady(
    job,
    result,
    {
      modelName: adapter.modelName,
      promptVersion: job.prompt_version || 'triage-v1',
      inputHash: opsflowCreateInputHash(request),
      retryCount: retryCount
    },
    completedAt
  );

  repository.appendEvent({
    event_id: 'EVT-' + job.ai_draft_id,
    request_id: request.request_id,
    event_at: completedAt,
    actor_type: 'system',
    actor_alias: 'opsflow-worker',
    action: 'ai_draft_ready',
    before_json: '',
    after_json: JSON.stringify({
      ai_draft_id: job.ai_draft_id,
      category_suggestion: result.category_suggestion,
      runbook_suggestion: result.runbook_suggestion
    }),
    note: 'Synthetic-data prototype; human review required'
  });

  return {
    jobId: job.ai_draft_id,
    requestId: request.request_id,
    status: 'ready',
    retryCount: retryCount
  };
}

function opsflowProcessQueue(options) {
  var settings = options || {};
  var repository = settings.repository || opsflowCreateSheetRepository();
  var adapters = settings.adapters || opsflowCreateDefaultAdapters_(settings);
  var lock = settings.lock || opsflowCreateDefaultLock_();
  var nowFn = settings.nowFn || opsflowNowIso_;
  var limit = Math.min(
    settings.limit || OPSFLOW_CONFIG.maxQueueBatch,
    OPSFLOW_CONFIG.maxQueueBatch
  );
  var allowedModes = settings.allowedModes || OPSFLOW_CONFIG.aiModes;

  if (!lock.tryLock(settings.lockWaitMs || 5000)) {
    return {
      status: 'locked',
      processed: 0,
      ready: 0,
      errors: 0,
      results: []
    };
  }

  var report = {
    status: 'completed',
    processed: 0,
    ready: 0,
    errors: 0,
    results: []
  };

  try {
    var jobs = repository.listQueuedDrafts(limit, allowedModes);
    jobs.forEach(function (job) {
      report.processed += 1;
      try {
        var result = opsflowProcessSingleJob_(job, repository, adapters, nowFn);
        report.ready += 1;
        report.results.push(result);
      } catch (error) {
        var completedAt = nowFn();
        var errorCode = opsflowToErrorCode_(error);
        repository.markDraftError(
          job,
          errorCode,
          OPSFLOW_CONFIG.maxAiRetries,
          completedAt
        );
        repository.appendEvent({
          event_id: 'EVT-' + job.ai_draft_id + '-ERROR',
          request_id: job.request_id,
          event_at: completedAt,
          actor_type: 'system',
          actor_alias: 'opsflow-worker',
          action: 'ai_draft_error',
          before_json: '',
          after_json: JSON.stringify({
            ai_draft_id: job.ai_draft_id,
            error_code: errorCode
          }),
          note: 'No AI output was applied to the request'
        });
        report.errors += 1;
        report.results.push({
          jobId: job.ai_draft_id,
          requestId: job.request_id,
          status: 'error',
          errorCode: errorCode
        });
      }
    });
  } finally {
    lock.releaseLock();
  }

  return report;
}

function opsflowProcessMockQueue() {
  return opsflowProcessQueue({ allowedModes: ['mock'] });
}

function opsflowProcessGeminiQueueExplicit() {
  var enabled = opsflowGetRequiredScriptProperty_(
    OPSFLOW_CONFIG.scriptPropertyKeys.geminiEnabled
  );
  if (String(enabled).toLowerCase() !== 'true') {
    throw new Error('Gemini processing is disabled. Set OPSFLOW_GEMINI_ENABLED=true explicitly.');
  }
  return opsflowProcessQueue({ allowedModes: ['gemini'] });
}
