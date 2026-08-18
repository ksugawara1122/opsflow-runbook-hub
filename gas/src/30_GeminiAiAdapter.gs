/**
 * Optional Gemini adapter.
 *
 * This file is inert unless explicitly called with Apps Script Properties set.
 * Before first use, re-check the current official Gemini API endpoint, model
 * name, pricing, data handling terms and allowed input scope.
 */

function opsflowGetRequiredScriptProperty_(propertyKey) {
  if (typeof PropertiesService === 'undefined') {
    throw new Error('PropertiesService is unavailable in this runtime');
  }

  var value = PropertiesService.getScriptProperties().getProperty(propertyKey);
  if (!opsflowNormalizeText(value)) {
    throw new Error('Required Script Property is missing: ' + propertyKey);
  }
  return value;
}

function opsflowGetOptionalScriptProperty_(propertyKey) {
  if (typeof PropertiesService === 'undefined') {
    return '';
  }
  return opsflowNormalizeText(
    PropertiesService.getScriptProperties().getProperty(propertyKey)
  );
}

function opsflowBuildGeminiPrompt_(request, runbooks) {
  var safeRunbooks = (runbooks || []).map(function (runbook) {
    return {
      runbook_id: runbook.runbook_id,
      title: runbook.title,
      category: runbook.category,
      keywords: runbook.keywords
    };
  });

  var safeInput = {
    request: {
      request_id: request.request_id,
      title: request.title,
      description: request.description,
      request_type: request.request_type,
      impact: request.impact,
      urgency: request.urgency
    },
    allowed_categories: OPSFLOW_CONFIG.categories,
    allowed_runbooks: safeRunbooks,
    rules: [
      'Return JSON only.',
      'needs_human_review must be true.',
      'Do not instruct password changes, permission changes, account operations, command execution, production changes or restarts.',
      'Do not invent facts not present in the request.',
      'Use null when no runbook is suitable.',
      'Limit checklist_draft to eight short information-gathering or verification items.'
    ],
    output_shape: {
      summary_draft: '',
      category_suggestion: '',
      checklist_draft: [],
      missing_information: [],
      runbook_suggestion: null,
      needs_human_review: true
    }
  };

  return 'You support a synthetic IT request triage demo.\n' + JSON.stringify(safeInput);
}

function opsflowExtractGeminiText_(payload) {
  var candidates = payload && payload.candidates;
  if (!candidates || !candidates.length) {
    throw new Error('Gemini response has no candidates');
  }

  var parts = candidates[0].content && candidates[0].content.parts;
  if (!parts || !parts.length || !opsflowNormalizeText(parts[0].text)) {
    throw new Error('Gemini response has no text content');
  }
  return parts[0].text;
}

function opsflowGeminiGenerateDraft(request, runbooks, options) {
  var settings = options || {};
  var apiKey = settings.apiKey || opsflowGetRequiredScriptProperty_(
    OPSFLOW_CONFIG.scriptPropertyKeys.geminiApiKey
  );
  var model = settings.model || opsflowGetRequiredScriptProperty_(
    OPSFLOW_CONFIG.scriptPropertyKeys.geminiModel
  );
  var apiBase = settings.apiBase || opsflowGetOptionalScriptProperty_(
    OPSFLOW_CONFIG.scriptPropertyKeys.geminiApiBase
  ) || 'https://generativelanguage.googleapis.com/v1beta';
  var fetcher = settings.fetcher || function (url, fetchOptions) {
    return UrlFetchApp.fetch(url, fetchOptions);
  };

  var url = apiBase.replace(/\/$/, '') + '/models/' + encodeURIComponent(model) + ':generateContent';
  var response = fetcher(url, {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'x-goog-api-key': apiKey
    },
    muteHttpExceptions: true,
    payload: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: opsflowBuildGeminiPrompt_(request, runbooks) }]
        }
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1
      }
    })
  });

  var statusCode = response.getResponseCode();
  var responseText = response.getContentText();
  if (statusCode < 200 || statusCode >= 300) {
    throw new Error('Gemini API returned HTTP ' + statusCode);
  }

  var payload = JSON.parse(responseText);
  return opsflowSafeJsonParse(opsflowExtractGeminiText_(payload));
}
