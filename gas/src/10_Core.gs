/**
 * Pure domain logic. Keep this file free of Google service APIs and
 * other Apps Script services so the same rules can be tested with Node.
 */

function opsflowNormalizeText(value) {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).trim();
}

function opsflowNowIso_() {
  return new Date().toISOString();
}

function opsflowNormalizeBoolean(value) {
  if (value === true || value === false) {
    return value;
  }
  var normalized = opsflowNormalizeText(value).toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes';
}

function opsflowIncludes(allowedValues, value) {
  return allowedValues.indexOf(value) !== -1;
}

function opsflowValidateRequest(request) {
  var errors = [];
  var candidate = request || {};
  var requiredTextFields = [
    'request_id',
    'requester_alias',
    'title',
    'description',
    'request_type',
    'impact',
    'urgency',
    'status'
  ];

  requiredTextFields.forEach(function (field) {
    if (!opsflowNormalizeText(candidate[field])) {
      errors.push(field + ' is required');
    }
  });

  if (
    candidate.request_type &&
    !opsflowIncludes(OPSFLOW_CONFIG.requestTypes, candidate.request_type)
  ) {
    errors.push('request_type is not allowed');
  }

  ['impact', 'urgency'].forEach(function (field) {
    if (candidate[field] && !opsflowIncludes(OPSFLOW_CONFIG.levels, candidate[field])) {
      errors.push(field + ' is not allowed');
    }
  });

  if (
    candidate.status &&
    !opsflowIncludes(OPSFLOW_CONFIG.requestStatuses, candidate.status)
  ) {
    errors.push('status is not allowed');
  }

  if (!opsflowNormalizeBoolean(candidate.is_synthetic)) {
    errors.push('is_synthetic must be true for this prototype');
  }

  return {
    valid: errors.length === 0,
    errors: errors
  };
}

function opsflowCanTransition(fromStatus, toStatus) {
  var allowed = OPSFLOW_CONFIG.statusTransitions[fromStatus];
  if (!allowed) {
    return false;
  }
  return allowed.indexOf(toStatus) !== -1;
}

function opsflowValidateStatusChange(request, toStatus, reviewConfirmed) {
  var errors = [];
  var candidate = request || {};

  if (!opsflowCanTransition(candidate.status, toStatus)) {
    errors.push('status transition is not allowed');
  }
  if (toStatus === 'Resolved' && !opsflowNormalizeText(candidate.resolution)) {
    errors.push('resolution is required before Resolved');
  }
  if (toStatus === 'Closed' && !reviewConfirmed) {
    errors.push('review confirmation is required before Closed');
  }
  if (toStatus === 'Cancelled' && !opsflowNormalizeText(candidate.cancellation_reason)) {
    errors.push('cancellation_reason is required before Cancelled');
  }

  return {
    valid: errors.length === 0,
    errors: errors
  };
}

function opsflowSafeJsonParse(value) {
  if (typeof value === 'object' && value !== null) {
    return value;
  }

  var text = opsflowNormalizeText(value);
  if (!text) {
    throw new Error('JSON input is empty');
  }

  text = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  return JSON.parse(text);
}

function opsflowNormalizeStringList(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(function (item) {
      return opsflowNormalizeText(item);
    })
    .filter(function (item) {
      return Boolean(item);
    });
}

function opsflowContainsUnsafeAction(value) {
  var text = opsflowNormalizeText(value).toLowerCase();
  if (!text) {
    return false;
  }

  var disallowedPatterns = [
    /パスワード.{0,8}(変更|初期化|リセット)/,
    /権限.{0,8}(付与|変更|削除)/,
    /アカウント.{0,8}(解除|削除|作成)/,
    /コマンド.{0,8}実行/,
    /本番.{0,8}(変更|操作|再起動)/,
    /rm\s+-rf/,
    /drop\s+(table|database)/,
    /delete\s+from/
  ];

  return disallowedPatterns.some(function (pattern) {
    return pattern.test(text);
  });
}

function opsflowValidateAiDraft(draft, allowedRunbookIds) {
  var errors = [];
  var candidate;

  try {
    candidate = opsflowSafeJsonParse(draft);
  } catch (error) {
    return {
      valid: false,
      errors: ['AI output is not valid JSON: ' + error.message],
      normalized: null
    };
  }

  var normalized = {
    summary_draft: opsflowNormalizeText(candidate.summary_draft),
    category_suggestion: opsflowNormalizeText(candidate.category_suggestion),
    checklist_draft: opsflowNormalizeStringList(candidate.checklist_draft),
    missing_information: opsflowNormalizeStringList(candidate.missing_information),
    runbook_suggestion: candidate.runbook_suggestion
      ? opsflowNormalizeText(candidate.runbook_suggestion)
      : null,
    needs_human_review: candidate.needs_human_review === true
  };

  if (!normalized.summary_draft) {
    errors.push('summary_draft is required');
  }
  if (!opsflowIncludes(OPSFLOW_CONFIG.categories, normalized.category_suggestion)) {
    errors.push('category_suggestion is not allowed');
  }
  if (!Array.isArray(candidate.checklist_draft)) {
    errors.push('checklist_draft must be an array');
  }
  if (normalized.checklist_draft.length > OPSFLOW_CONFIG.maxChecklistItems) {
    errors.push('checklist_draft exceeds the maximum item count');
  }
  if (!Array.isArray(candidate.missing_information)) {
    errors.push('missing_information must be an array');
  }
  if (!normalized.needs_human_review) {
    errors.push('needs_human_review must be true');
  }

  if (
    normalized.runbook_suggestion &&
    (allowedRunbookIds || []).indexOf(normalized.runbook_suggestion) === -1
  ) {
    errors.push('runbook_suggestion does not exist');
  }

  var unsafeFields = [normalized.summary_draft]
    .concat(normalized.checklist_draft)
    .concat(normalized.missing_information);
  if (unsafeFields.some(opsflowContainsUnsafeAction)) {
    errors.push('AI output contains a prohibited execution action');
  }

  return {
    valid: errors.length === 0,
    errors: errors,
    normalized: normalized
  };
}

function opsflowValidateReview(review, aiDraft) {
  var errors = [];
  var candidate = review || {};
  var decision = opsflowNormalizeText(candidate.decision);

  if (!opsflowIncludes(OPSFLOW_CONFIG.reviewDecisions, decision)) {
    errors.push('decision is not allowed');
  }
  if (!opsflowNormalizeText(candidate.reviewer_alias)) {
    errors.push('reviewer_alias is required');
  }
  if (decision === 'edited') {
    if (!opsflowNormalizeText(candidate.final_summary)) {
      errors.push('final_summary is required when edited');
    }
    if (!opsflowIncludes(OPSFLOW_CONFIG.categories, candidate.final_category)) {
      errors.push('final_category is required when edited');
    }
  }
  if (decision === 'rejected' && !opsflowNormalizeText(candidate.review_note)) {
    errors.push('review_note is required when rejected');
  }
  if (decision === 'accepted' && !aiDraft) {
    errors.push('aiDraft is required when accepted');
  }

  return {
    valid: errors.length === 0,
    errors: errors
  };
}

function opsflowResolveReview(review, aiDraft, allowedRunbookIds) {
  var validation = opsflowValidateReview(review, aiDraft);
  if (!validation.valid) {
    return {
      valid: false,
      errors: validation.errors,
      resolution: null
    };
  }

  var decision = opsflowNormalizeText(review.decision);
  if (decision === 'rejected') {
    return {
      valid: true,
      errors: [],
      resolution: {
        apply_to_request: false,
        decision: decision,
        final_summary: '',
        final_category: '',
        final_checklist: [],
        final_runbook_id: null
      }
    };
  }

  var source = decision === 'accepted' ? aiDraft : review;
  var finalRunbookId = opsflowNormalizeText(
    source.final_runbook_id || source.runbook_suggestion
  );
  if (finalRunbookId && (allowedRunbookIds || []).indexOf(finalRunbookId) === -1) {
    return {
      valid: false,
      errors: ['final_runbook_id does not exist'],
      resolution: null
    };
  }

  var finalChecklist;
  try {
    var checklistSource = decision === 'accepted'
      ? aiDraft.checklist_draft
      : (
          Array.isArray(review.final_checklist)
            ? review.final_checklist
            : opsflowSafeJsonParse(review.final_checklist_json || '[]')
        );
    if (!Array.isArray(checklistSource)) {
      throw new Error('Checklist must be an array');
    }
    finalChecklist = opsflowNormalizeStringList(checklistSource);
  } catch (error) {
    return {
      valid: false,
      errors: ['final_checklist_json is not valid JSON'],
      resolution: null
    };
  }

  var resolution = {
    apply_to_request: true,
    decision: decision,
    final_summary: opsflowNormalizeText(
      decision === 'accepted' ? aiDraft.summary_draft : review.final_summary
    ),
    final_category: opsflowNormalizeText(
      decision === 'accepted' ? aiDraft.category_suggestion : review.final_category
    ),
    final_checklist: finalChecklist,
    final_runbook_id: finalRunbookId || null
  };

  if (!resolution.final_summary) {
    return {
      valid: false,
      errors: ['final_summary is required'],
      resolution: null
    };
  }
  if (!opsflowIncludes(OPSFLOW_CONFIG.categories, resolution.final_category)) {
    return {
      valid: false,
      errors: ['final_category is not allowed'],
      resolution: null
    };
  }
  if (resolution.final_checklist.length > OPSFLOW_CONFIG.maxChecklistItems) {
    return {
      valid: false,
      errors: ['final_checklist exceeds the maximum item count'],
      resolution: null
    };
  }
  if (
    [resolution.final_summary]
      .concat(resolution.final_checklist)
      .some(opsflowContainsUnsafeAction)
  ) {
    return {
      valid: false,
      errors: ['final review contains a prohibited execution action'],
      resolution: null
    };
  }

  return {
    valid: true,
    errors: [],
    resolution: resolution
  };
}

function opsflowTokenize(value) {
  return opsflowNormalizeText(value)
    .toLowerCase()
    .split(/[\s,、。・/／:：;；()（）\[\]「」]+/)
    .filter(function (token) {
      return token.length >= 2;
    });
}

function opsflowRankRunbooks(request, runbooks) {
  var sourceTokens = opsflowTokenize(
    [request.title, request.description, request.request_type].join(' ')
  );

  return (runbooks || [])
    .filter(function (runbook) {
      return runbook.status === 'active';
    })
    .map(function (runbook) {
      var keywords = opsflowTokenize(
        [runbook.title, runbook.category, runbook.keywords].join(' ')
      );
      var score = keywords.reduce(function (total, keyword) {
        var matched = sourceTokens.some(function (sourceToken) {
          return sourceToken.indexOf(keyword) !== -1 || keyword.indexOf(sourceToken) !== -1;
        });
        return total + (matched ? 1 : 0);
      }, 0);

      return {
        runbook: runbook,
        score: score
      };
    })
    .filter(function (result) {
      return result.score > 0;
    })
    .sort(function (left, right) {
      if (right.score !== left.score) {
        return right.score - left.score;
      }
      return left.runbook.runbook_id.localeCompare(right.runbook.runbook_id);
    });
}

function opsflowCreateInputHash(request) {
  var input = [
    request.request_id,
    request.title,
    request.description,
    request.request_type,
    request.impact,
    request.urgency
  ].join('|');
  var hash = 2166136261;

  for (var index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return ('00000000' + (hash >>> 0).toString(16)).slice(-8);
}
