/**
 * Google Sheets persistence adapter.
 *
 * All writes are explicit function calls. Loading this file does not create or
 * modify any spreadsheet.
 */

function opsflowCreateId_(prefix) {
  if (typeof Utilities === 'undefined') {
    throw new Error('Utilities is unavailable in this runtime');
  }
  return prefix + '-' + Utilities.getUuid().split('-')[0].toUpperCase();
}

function opsflowGetSpreadsheet_() {
  var spreadsheetId = '';
  if (typeof PropertiesService !== 'undefined') {
    spreadsheetId = PropertiesService.getScriptProperties().getProperty(
      OPSFLOW_CONFIG.scriptPropertyKeys.spreadsheetId
    );
  }

  if (opsflowNormalizeText(spreadsheetId)) {
    return SpreadsheetApp.openById(spreadsheetId);
  }

  var active = SpreadsheetApp.getActiveSpreadsheet();
  if (!active) {
    throw new Error(
      'No active spreadsheet. Set the OPSFLOW_SPREADSHEET_ID Script Property.'
    );
  }
  return active;
}

function opsflowGetExpectedHeaders_(sheetName) {
  var headers = OPSFLOW_CONFIG.headers[sheetName];
  if (!headers) {
    throw new Error('Unknown sheet schema: ' + sheetName);
  }
  return headers.slice();
}

function opsflowEnsureSheet_(spreadsheet, sheetName) {
  var expectedHeaders = opsflowGetExpectedHeaders_(sheetName);
  var sheet = spreadsheet.getSheetByName(sheetName);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
  }

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
    sheet.setFrozenRows(1);
    return sheet;
  }

  if (sheet.getLastColumn() !== expectedHeaders.length) {
    throw new Error(
      'Column count mismatch in ' + sheetName + '. Refusing to rewrite an existing schema.'
    );
  }

  var actualHeaders = sheet
    .getRange(1, 1, 1, expectedHeaders.length)
    .getValues()[0]
    .map(opsflowNormalizeText);

  if (JSON.stringify(actualHeaders) !== JSON.stringify(expectedHeaders)) {
    throw new Error(
      'Header mismatch in ' + sheetName + '. Refusing to rewrite an existing schema.'
    );
  }
  return sheet;
}

function opsflowEnsureSheets() {
  var spreadsheet = opsflowGetSpreadsheet_();
  Object.keys(OPSFLOW_CONFIG.headers).forEach(function (sheetName) {
    opsflowEnsureSheet_(spreadsheet, sheetName);
  });

  return {
    spreadsheetId: spreadsheet.getId(),
    sheetNames: Object.keys(OPSFLOW_CONFIG.headers),
    schemaVersion: OPSFLOW_CONFIG.schemaVersion
  };
}

function opsflowReadSheetObjects_(sheetName) {
  var spreadsheet = opsflowGetSpreadsheet_();
  var sheet = opsflowEnsureSheet_(spreadsheet, sheetName);
  var lastRow = sheet.getLastRow();
  var headers = opsflowGetExpectedHeaders_(sheetName);

  if (lastRow < 2) {
    return [];
  }

  var values = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  return values
    .filter(function (row) {
      return row.some(function (value) {
        return value !== '' && value !== null;
      });
    })
    .map(function (row) {
      var result = {};
      headers.forEach(function (header, index) {
        result[header] = row[index];
      });
      return result;
    });
}

function opsflowObjectToRow_(sheetName, object) {
  return opsflowGetExpectedHeaders_(sheetName).map(function (header) {
    var value = object[header];
    if (value === undefined || value === null) {
      return '';
    }
    return value;
  });
}

function opsflowAppendObject_(sheetName, object) {
  var spreadsheet = opsflowGetSpreadsheet_();
  var sheet = opsflowEnsureSheet_(spreadsheet, sheetName);
  var row = opsflowObjectToRow_(sheetName, object);
  sheet.getRange(sheet.getLastRow() + 1, 1, 1, row.length).setValues([row]);
  return object;
}

function opsflowFindRowNumber_(sheetName, keyField, keyValue) {
  var spreadsheet = opsflowGetSpreadsheet_();
  var sheet = opsflowEnsureSheet_(spreadsheet, sheetName);
  var headers = opsflowGetExpectedHeaders_(sheetName);
  var keyColumnIndex = headers.indexOf(keyField);

  if (keyColumnIndex === -1) {
    throw new Error('Unknown key field ' + keyField + ' for ' + sheetName);
  }
  if (sheet.getLastRow() < 2) {
    return -1;
  }

  var values = sheet
    .getRange(2, keyColumnIndex + 1, sheet.getLastRow() - 1, 1)
    .getValues();
  for (var index = 0; index < values.length; index += 1) {
    if (opsflowNormalizeText(values[index][0]) === opsflowNormalizeText(keyValue)) {
      return index + 2;
    }
  }
  return -1;
}

function opsflowUpdateObjectByKey_(sheetName, keyField, keyValue, updates) {
  var spreadsheet = opsflowGetSpreadsheet_();
  var sheet = opsflowEnsureSheet_(spreadsheet, sheetName);
  var headers = opsflowGetExpectedHeaders_(sheetName);
  var rowNumber = opsflowFindRowNumber_(sheetName, keyField, keyValue);

  if (rowNumber === -1) {
    throw new Error(sheetName + ' row not found for ' + keyField + '=' + keyValue);
  }

  var current = sheet.getRange(rowNumber, 1, 1, headers.length).getValues()[0];
  headers.forEach(function (header, index) {
    if (Object.prototype.hasOwnProperty.call(updates, header)) {
      current[index] = updates[header];
    }
  });
  sheet.getRange(rowNumber, 1, 1, headers.length).setValues([current]);
}

function opsflowGetObjectByKey_(sheetName, keyField, keyValue) {
  var rows = opsflowReadSheetObjects_(sheetName);
  for (var index = 0; index < rows.length; index += 1) {
    if (opsflowNormalizeText(rows[index][keyField]) === opsflowNormalizeText(keyValue)) {
      return rows[index];
    }
  }
  return null;
}

function opsflowCreateSheetRepository() {
  return {
    listQueuedDrafts: function (limit, allowedModes) {
      var modes = allowedModes || OPSFLOW_CONFIG.aiModes;
      return opsflowReadSheetObjects_(OPSFLOW_CONFIG.sheetNames.aiDrafts)
        .filter(function (draft) {
          return (
            draft.ai_status === 'queued' &&
            modes.indexOf(draft.ai_mode) !== -1
          );
        })
        .slice(0, limit);
    },

    getRequest: function (requestId) {
      return opsflowGetObjectByKey_(
        OPSFLOW_CONFIG.sheetNames.requests,
        'request_id',
        requestId
      );
    },

    getDraft: function (draftId) {
      return opsflowGetObjectByKey_(
        OPSFLOW_CONFIG.sheetNames.aiDrafts,
        'ai_draft_id',
        draftId
      );
    },

    getReview: function (reviewId) {
      return opsflowGetObjectByKey_(
        OPSFLOW_CONFIG.sheetNames.aiReviews,
        'review_id',
        reviewId
      );
    },

    getEvent: function (eventId) {
      return opsflowGetObjectByKey_(
        OPSFLOW_CONFIG.sheetNames.requestEvents,
        'event_id',
        eventId
      );
    },

    listActiveRunbooks: function () {
      return opsflowReadSheetObjects_(OPSFLOW_CONFIG.sheetNames.runbooks).filter(
        function (runbook) {
          return runbook.status === 'active';
        }
      );
    },

    markDraftProcessing: function (draftId, startedAt) {
      opsflowUpdateObjectByKey_(
        OPSFLOW_CONFIG.sheetNames.aiDrafts,
        'ai_draft_id',
        draftId,
        {
          ai_status: 'processing',
          started_at: startedAt,
          error_code: ''
        }
      );
    },

    markDraftReady: function (job, result, metadata, completedAt) {
      opsflowUpdateObjectByKey_(
        OPSFLOW_CONFIG.sheetNames.aiDrafts,
        'ai_draft_id',
        job.ai_draft_id,
        {
          ai_status: 'ready',
          model_name: metadata.modelName,
          prompt_version: metadata.promptVersion,
          input_hash: metadata.inputHash,
          summary_draft: result.summary_draft,
          category_suggestion: result.category_suggestion,
          checklist_draft_json: JSON.stringify(result.checklist_draft),
          missing_info_json: JSON.stringify(result.missing_information),
          runbook_suggestion: result.runbook_suggestion || '',
          raw_output: JSON.stringify(result),
          error_code: '',
          retry_count: metadata.retryCount,
          completed_at: completedAt
        }
      );
    },

    markDraftError: function (job, errorCode, retryCount, completedAt) {
      opsflowUpdateObjectByKey_(
        OPSFLOW_CONFIG.sheetNames.aiDrafts,
        'ai_draft_id',
        job.ai_draft_id,
        {
          ai_status: 'error',
          error_code: errorCode,
          retry_count: retryCount,
          completed_at: completedAt
        }
      );
    },

    appendEvent: function (event) {
      opsflowAppendObject_(OPSFLOW_CONFIG.sheetNames.requestEvents, event);
    },

    updateRequestReviewFields: function (requestId, updates) {
      opsflowUpdateObjectByKey_(
        OPSFLOW_CONFIG.sheetNames.requests,
        'request_id',
        requestId,
        updates
      );
    },

    enqueueRequest: function (requestId, aiMode, promptVersion) {
      var request = this.getRequest(requestId);
      if (!request) {
        throw new Error('Request not found: ' + requestId);
      }
      var requestValidation = opsflowValidateRequest(request);
      if (!requestValidation.valid) {
        throw new Error('Request is invalid: ' + requestValidation.errors.join('; '));
      }
      if (!opsflowIncludes(OPSFLOW_CONFIG.aiModes, aiMode)) {
        throw new Error('AI mode is not allowed: ' + aiMode);
      }

      var activeDuplicate = opsflowReadSheetObjects_(
        OPSFLOW_CONFIG.sheetNames.aiDrafts
      ).some(function (draft) {
        return (
          draft.request_id === requestId &&
          ['queued', 'processing', 'ready'].indexOf(draft.ai_status) !== -1
        );
      });
      if (activeDuplicate) {
        throw new Error('An active AI draft already exists for ' + requestId);
      }

      var now = opsflowNowIso_();
      var draft = {
        ai_draft_id: opsflowCreateId_('AID'),
        request_id: requestId,
        ai_status: 'queued',
        ai_mode: aiMode,
        model_name: '',
        prompt_version: promptVersion || 'triage-v1',
        input_hash: '',
        summary_draft: '',
        category_suggestion: '',
        checklist_draft_json: '',
        missing_info_json: '',
        runbook_suggestion: '',
        raw_output: '',
        error_code: '',
        retry_count: 0,
        created_at: now,
        started_at: '',
        completed_at: ''
      };
      opsflowAppendObject_(OPSFLOW_CONFIG.sheetNames.aiDrafts, draft);
      return draft;
    }
  };
}
