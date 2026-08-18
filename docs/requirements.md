# Requirements

## Purpose

Provide a small, synthetic IT operations workflow that connects request intake,
Runbook lookup, AI-assisted drafting, human review and response evidence.

The first release must be useful without AI. AI is an optional drafting aid,
not the system of record or an execution agent.

## Users

| Role | Goal | MVP capability |
|---|---|---|
| Requester | Submit a consistent request | New Request form |
| Operator | Triage and track requests | List, detail, state and assignee fields |
| Resolver | Follow a Runbook and record resolution | Runbook, FAQ and resolution fields |
| Reviewer | Accept, edit or reject an AI draft | AI Review Queue and review form |
| Administrator | Maintain demo choices and content | Settings plus Runbook/FAQ tables |

All users are synthetic aliases in version 0.1.0.

## Primary Workflow

1. A synthetic requester creates a request.
2. An operator validates impact, urgency and missing information.
3. The operator may enqueue an AI draft.
4. The queue processor reads only the approved request fields and active
   Runbook summaries.
5. The mock or explicitly enabled Gemini adapter returns structured JSON.
6. The validator rejects unsafe, unknown or non-reviewable output.
7. A reviewer accepts, edits or rejects the draft.
8. Confirmed fields and resolution evidence are recorded separately from AI
   output.
9. Status, category and error counts can be summarized.

## Functional Requirements

| ID | Requirement | Local implementation |
|---|---|---|
| FR-01 | Validate request required fields and enums | `opsflowValidateRequest` |
| FR-02 | Enforce allowed state transitions | `opsflowCanTransition` |
| FR-03 | Require resolution before `Resolved` | `opsflowValidateStatusChange` |
| FR-04 | Require cancellation reason before `Cancelled` | `opsflowValidateStatusChange` |
| FR-05 | List and reference active Runbooks | Sheets repository and AppSheet spec |
| FR-06 | Queue AI work separately from request status | `AI_Drafts` plus queue processor |
| FR-07 | Run without an API key | deterministic mock adapter |
| FR-08 | Validate AI JSON and allowed values | `opsflowValidateAiDraft` |
| FR-09 | Reject execution-oriented AI actions | prohibited-action patterns |
| FR-10 | Retry at most once | queue processor |
| FR-11 | Record success or error event | `Request_Events` repository writes |
| FR-12 | Require human review | AI schema plus review resolver |
| FR-13 | Support accept, edit and reject | `opsflowResolveReview` |
| FR-14 | Keep Gemini disabled by default | explicit Script Property gate |
| FR-15 | Validate all synthetic portfolio data | local validation script |

## Non-functional Requirements

| ID | Requirement |
|---|---|
| NFR-01 | No npm dependency is required for local tests. |
| NFR-02 | GAS source must parse in one Apps Script V8-compatible global context. |
| NFR-03 | Loading source files performs no external write or network call. |
| NFR-04 | API keys and environment IDs are not committed. |
| NFR-05 | AI failure does not block manual request processing. |
| NFR-06 | Existing Sheet headers are never silently rewritten. |
| NFR-07 | Public evidence distinguishes synthetic measurements from real outcomes. |
| NFR-08 | Real personal, employer, client and production data are prohibited. |

## Acceptance Criteria

- `npm test` passes.
- `npm run validate:samples` reports `status: ok`.
- All 20 requests validate as synthetic.
- All four Runbooks and eight FAQs have valid references.
- Mock output for all 20 requests matches the expected category and Runbook.
- An invalid AI category, unknown Runbook, review bypass or unsafe action is
  rejected.
- A locked queue performs no work.
- Gemini cannot run unless explicitly enabled and configured.
- Google-side creation and end-to-end behavior remain a separate acceptance
  phase.

## Out of Scope

- Production incident response
- Account, password, permission or credential operations
- Real-company data or integrations
- Automatic external messaging
- Attachment or document ingestion
- RAG, vector databases or autonomous agents
- Public deployment and paid client work
