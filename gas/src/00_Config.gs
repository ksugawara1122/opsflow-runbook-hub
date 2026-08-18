/** @OnlyCurrentDoc */

/**
 * Shared constants for the OpsFlow Runbook Hub prototype.
 *
 * The prototype is synthetic-data-only. Configuration that contains a secret
 * or an environment-specific identifier must be stored in Apps Script
 * Properties, never in this file or a spreadsheet cell.
 */
var OPSFLOW_CONFIG = Object.freeze({
  schemaVersion: '0.1.0',
  defaultAiMode: 'mock',
  maxAiRetries: 1,
  maxChecklistItems: 8,
  maxQueueBatch: 10,

  sheetNames: Object.freeze({
    requests: 'Requests',
    aiDrafts: 'AI_Drafts',
    aiReviews: 'AI_Reviews',
    runbooks: 'Runbooks',
    faqs: 'FAQs',
    requestEvents: 'Request_Events'
  }),

  requestTypes: Object.freeze([
    'incident',
    'service_request',
    'access',
    'question'
  ]),

  categories: Object.freeze([
    'connectivity',
    'authentication',
    'access',
    'maintenance',
    'general'
  ]),

  levels: Object.freeze(['low', 'medium', 'high']),

  requestStatuses: Object.freeze([
    'New',
    'Triaged',
    'In Progress',
    'Waiting',
    'Resolved',
    'Closed',
    'Cancelled'
  ]),

  statusTransitions: Object.freeze({
    'New': Object.freeze(['Triaged', 'Cancelled']),
    'Triaged': Object.freeze(['In Progress', 'Waiting', 'Cancelled']),
    'In Progress': Object.freeze(['Waiting', 'Resolved', 'Cancelled']),
    'Waiting': Object.freeze(['In Progress', 'Resolved', 'Cancelled']),
    'Resolved': Object.freeze(['In Progress', 'Closed']),
    'Closed': Object.freeze([]),
    'Cancelled': Object.freeze([])
  }),

  aiStatuses: Object.freeze([
    'queued',
    'processing',
    'ready',
    'error',
    'reviewed'
  ]),

  aiModes: Object.freeze(['mock', 'gemini']),
  reviewDecisions: Object.freeze(['accepted', 'edited', 'rejected']),

  scriptPropertyKeys: Object.freeze({
    spreadsheetId: 'OPSFLOW_SPREADSHEET_ID',
    aiMode: 'OPSFLOW_AI_MODE',
    geminiEnabled: 'OPSFLOW_GEMINI_ENABLED',
    geminiApiKey: 'OPSFLOW_GEMINI_API_KEY',
    geminiModel: 'OPSFLOW_GEMINI_MODEL',
    geminiApiBase: 'OPSFLOW_GEMINI_API_BASE'
  }),

  headers: Object.freeze({
    Requests: Object.freeze([
      'request_id',
      'created_at',
      'requester_alias',
      'title',
      'description',
      'request_type',
      'impact',
      'urgency',
      'status',
      'assignee_alias',
      'confirmed_category',
      'runbook_id',
      'resolution',
      'cancellation_reason',
      'escalated',
      'escalation_note',
      'updated_at',
      'is_synthetic'
    ]),
    AI_Drafts: Object.freeze([
      'ai_draft_id',
      'request_id',
      'ai_status',
      'ai_mode',
      'model_name',
      'prompt_version',
      'input_hash',
      'summary_draft',
      'category_suggestion',
      'checklist_draft_json',
      'missing_info_json',
      'runbook_suggestion',
      'raw_output',
      'error_code',
      'retry_count',
      'created_at',
      'started_at',
      'completed_at'
    ]),
    AI_Reviews: Object.freeze([
      'review_id',
      'ai_draft_id',
      'decision',
      'final_summary',
      'final_category',
      'final_checklist_json',
      'final_runbook_id',
      'review_note',
      'reviewer_alias',
      'reviewed_at'
    ]),
    Runbooks: Object.freeze([
      'runbook_id',
      'title',
      'category',
      'keywords',
      'initial_checks',
      'procedure',
      'escalation_conditions',
      'version',
      'status',
      'source_type',
      'last_reviewed_at'
    ]),
    FAQs: Object.freeze([
      'faq_id',
      'runbook_id',
      'question',
      'answer',
      'status'
    ]),
    Request_Events: Object.freeze([
      'event_id',
      'request_id',
      'event_at',
      'actor_type',
      'actor_alias',
      'action',
      'before_json',
      'after_json',
      'note'
    ])
  })
});

function opsflowGetConfig() {
  return OPSFLOW_CONFIG;
}
