/**
 * Explicit human-review application flow.
 *
 * AppSheet records the review and marks its AI draft reviewed. This processor
 * is then run manually from the Sheet. It revalidates the selected review,
 * applies only confirmed category/Runbook fields and writes one idempotency
 * event. Rejected reviews never update Requests.
 */

function opsflowReviewEventId_(reviewId) {
  return 'EVT-' + opsflowNormalizeText(reviewId);
}

function opsflowParseReviewDraft_(draft, allowedRunbookIds) {
  var checklist;
  var missingInformation;
  try {
    checklist = opsflowSafeJsonParse(draft.checklist_draft_json || '[]');
    missingInformation = opsflowSafeJsonParse(draft.missing_info_json || '[]');
  } catch (error) {
    throw new Error('AI draft JSON validation failed: ' + error.message);
  }

  var validation = opsflowValidateAiDraft(
    {
      summary_draft: draft.summary_draft,
      category_suggestion: draft.category_suggestion,
      checklist_draft: checklist,
      missing_information: missingInformation,
      runbook_suggestion: draft.runbook_suggestion || null,
      needs_human_review: true
    },
    allowedRunbookIds
  );
  if (!validation.valid) {
    throw new Error('AI draft validation failed: ' + validation.errors.join('; '));
  }
  return validation.normalized;
}

function opsflowApplyReview_(reviewId, repository, nowFn) {
  var normalizedReviewId = opsflowNormalizeText(reviewId);
  if (!normalizedReviewId) {
    throw new Error('review_id is required');
  }

  var eventId = opsflowReviewEventId_(normalizedReviewId);
  var existingEvent = repository.getEvent(eventId);
  if (existingEvent) {
    return {
      status: 'already_processed',
      reviewId: normalizedReviewId,
      requestId: existingEvent.request_id,
      eventId: eventId,
      applied: existingEvent.action === 'ai_review_applied'
    };
  }

  var review = repository.getReview(normalizedReviewId);
  if (!review) {
    throw new Error('Review not found: ' + normalizedReviewId);
  }

  var draft = repository.getDraft(review.ai_draft_id);
  if (!draft) {
    throw new Error('AI draft not found: ' + review.ai_draft_id);
  }
  if (opsflowNormalizeText(draft.ai_status) !== 'reviewed') {
    throw new Error('AI draft must be reviewed before applying its review');
  }

  var request = repository.getRequest(draft.request_id);
  if (!request) {
    throw new Error('Request not found: ' + draft.request_id);
  }
  var requestValidation = opsflowValidateRequest(request);
  if (!requestValidation.valid) {
    throw new Error('Request is invalid: ' + requestValidation.errors.join('; '));
  }

  var runbooks = repository.listActiveRunbooks();
  var allowedRunbookIds = runbooks.map(function (runbook) {
    return runbook.runbook_id;
  });
  var decision = opsflowNormalizeText(review.decision);
  var resolverDraft = decision === 'accepted'
    ? opsflowParseReviewDraft_(draft, allowedRunbookIds)
    : draft;
  var resolved = opsflowResolveReview(review, resolverDraft, allowedRunbookIds);
  if (!resolved.valid) {
    throw new Error('Review validation failed: ' + resolved.errors.join('; '));
  }

  var appliedAt = nowFn();
  var beforeFields = {
    confirmed_category: opsflowNormalizeText(request.confirmed_category),
    runbook_id: opsflowNormalizeText(request.runbook_id)
  };
  var afterFields = {
    review_id: normalizedReviewId,
    decision: decision,
    confirmed_category: beforeFields.confirmed_category,
    runbook_id: beforeFields.runbook_id
  };

  if (resolved.resolution.apply_to_request) {
    afterFields.confirmed_category = resolved.resolution.final_category;
    afterFields.runbook_id = resolved.resolution.final_runbook_id || '';
    repository.updateRequestReviewFields(request.request_id, {
      confirmed_category: afterFields.confirmed_category,
      runbook_id: afterFields.runbook_id,
      updated_at: appliedAt
    });
  }

  repository.appendEvent({
    event_id: eventId,
    request_id: request.request_id,
    event_at: appliedAt,
    actor_type: 'human',
    actor_alias: opsflowNormalizeText(review.reviewer_alias),
    action: resolved.resolution.apply_to_request
      ? 'ai_review_applied'
      : 'ai_review_rejected',
    before_json: JSON.stringify(beforeFields),
    after_json: JSON.stringify(afterFields),
    note: resolved.resolution.apply_to_request
      ? 'Synthetic human review applied; summary/checklist remain in AI_Reviews'
      : 'Synthetic human review rejected; Request fields were not changed'
  });

  return {
    status: 'completed',
    reviewId: normalizedReviewId,
    requestId: request.request_id,
    eventId: eventId,
    decision: decision,
    applied: resolved.resolution.apply_to_request,
    confirmedCategory: afterFields.confirmed_category,
    runbookId: afterFields.runbook_id
  };
}

function opsflowProcessReview(reviewId, options) {
  var settings = options || {};
  var repository = settings.repository || opsflowCreateSheetRepository();
  var nowFn = settings.nowFn || opsflowNowIso_;
  var lock = settings.lock || opsflowCreateDefaultLock_();

  if (!lock.tryLock(settings.lockWaitMs || 5000)) {
    return {
      status: 'locked',
      reviewId: opsflowNormalizeText(reviewId),
      applied: false
    };
  }

  try {
    return opsflowApplyReview_(reviewId, repository, nowFn);
  } finally {
    lock.releaseLock();
  }
}

function opsflowProcessSelectedReview() {
  var spreadsheet = opsflowGetSpreadsheet_();
  var sheet = spreadsheet.getActiveSheet();
  if (!sheet || sheet.getName() !== OPSFLOW_CONFIG.sheetNames.aiReviews) {
    throw new Error('Select a data row in the AI_Reviews sheet first.');
  }

  var rowNumber = sheet.getActiveCell().getRow();
  if (rowNumber < 2) {
    throw new Error('Select a review data row, not the header.');
  }

  var headers = opsflowGetExpectedHeaders_(OPSFLOW_CONFIG.sheetNames.aiReviews);
  var reviewIdColumn = headers.indexOf('review_id') + 1;
  var reviewId = sheet.getRange(rowNumber, reviewIdColumn).getValue();
  if (!opsflowNormalizeText(reviewId)) {
    throw new Error('The selected row has no review_id.');
  }

  return opsflowProcessReview(reviewId);
}
