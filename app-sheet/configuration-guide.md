# AppSheet Configuration Guide

status:: owner-only-prototype-applied-and-verified
data_scope:: synthetic-only
deployment:: not-deployed
sharing:: private-owner-only
gemini:: not-connected

This guide records the applied Owner-only AppSheet prototype and its remaining
pre-deployment checks. No public deployment, sharing, billing plan, contract,
Bot or trigger was added.

## Applied Prototype Summary

- All six tables were added.
- Key, Label, Ref, column type and `Required_If` settings were applied.
- Eight slices, the mock-only queue action and three review actions were
  configured.
- The AppSheet enqueue action followed by manual GAS mock processing was
  verified with one synthetic Request.
- Accepted, edited and rejected Review Form saves and chained draft-status
  updates were verified.
- All three review rows were applied through the explicit GAS Sheet menu; the
  queue is empty and review-event idempotence was verified.

## Data Source

The applied prototype uses the dedicated synthetic Google Sheet created by the
explicit setup phase. All six tables are added:

- `Requests`
- `AI_Drafts`
- `AI_Reviews`
- `Runbooks`
- `FAQs`
- `Request_Events`

Do not connect an existing work, client or personal-data Sheet.

## Keys and Labels

| Table | Key | Applied label |
|---|---|---|
| Requests | `request_id` | `title` |
| AI_Drafts | `ai_draft_id` | `ai_draft_id` |
| AI_Reviews | `review_id` | `review_id` |
| Runbooks | `runbook_id` | `title` |
| FAQs | `faq_id` | `question` |
| Request_Events | `event_id` | `action` |

Disable AppSheet-generated keys for these fields. GAS or the AppSheet action
must create the ID explicitly.

## Table Update Permissions

| Table | Applied permission |
|---|---|
| Requests | Adds and Updates |
| AI_Drafts | Adds and Updates |
| AI_Reviews | Adds only |
| Runbooks | Read-only |
| FAQs | Read-only |
| Request_Events | Read-only |

## References

| Column | Type | Referenced table |
|---|---|---|
| `Requests[runbook_id]` | Ref | Runbooks |
| `AI_Drafts[request_id]` | Ref | Requests |
| `AI_Drafts[runbook_suggestion]` | Ref | Runbooks |
| `AI_Reviews[ai_draft_id]` | Ref | AI_Drafts |
| `AI_Reviews[final_runbook_id]` | Ref | Runbooks |
| `FAQs[runbook_id]` | Ref | Runbooks |
| `Request_Events[request_id]` | Ref | Requests |

Allow blank values for suggested or final Runbook references.

## Enum Columns

Use the exact values from `gas/src/00_Config.gs`.

| Column | Values |
|---|---|
| `request_type` | incident, service_request, access, question |
| `impact` / `urgency` | low, medium, high |
| `Requests[status]` | New, Triaged, In Progress, Waiting, Resolved, Closed, Cancelled |
| `confirmed_category` | connectivity, authentication, access, maintenance, general |
| `AI_Drafts[ai_status]` | queued, processing, ready, error, reviewed |
| `AI_Drafts[ai_mode]` | mock, gemini |
| `AI_Reviews[decision]` | accepted, edited, rejected |
| `Runbooks[status]` / `FAQs[status]` | draft, active, retired |

## Applied Slices

| Slice | Row filter condition |
|---|---|
| Open Requests | `NOT(IN([status], LIST("Closed", "Cancelled")))` |
| New Requests | `[status] = "New"` |
| In Progress Requests | `[status] = "In Progress"` |
| Waiting Requests | `[status] = "Waiting"` |
| AI Review Queue | `[ai_status] = "ready"` |
| AI Errors | `[ai_status] = "error"` |
| Active Runbooks | `[status] = "active"` |
| Active FAQs | `[status] = "active"` |

## Queue Action

The applied `Requests` action is named `AI下書きを作成` and uses:

`Data: add a new row to another table using values from this row`

Target table: `AI_Drafts`

| Target column | Value |
|---|---|
| `ai_draft_id` | `UNIQUEID()` |
| `request_id` | `[request_id]` |
| `ai_status` | `"queued"` |
| `ai_mode` | `"mock"` |
| `prompt_version` | `"triage-v1"` |
| `retry_count` | `0` |
| `created_at` | `NOW()` |

Applied `Only if this condition is true`:

```text
AND(
  [is_synthetic] = TRUE,
  COUNT([Related AI_Drafts]) = 0
)
```

The action shows a confirmation message and remains locked to `mock`. This
strict rule hides the button whenever any related AI draft exists, including
the existing `ready` draft for `REQ-0001`. Do not expose a user-selectable
Gemini mode until the separate Gemini gate is approved.

Live verification used `REQ-0002`: the action created draft key `70a20fc4` as
`queued`; manual GAS mock processing changed it to `ready` and recorded an
`ai_draft_ready` event. The result category was `connectivity`, the Runbook was
`RB-001`, and the input hash was `cd75a06d`.

## Review Actions and Form Saved

### `AIレビューを開始`

- Table: AI_Drafts
- Action: `LINKTOFORM` into AI Review Form
- Position: Prominent
- Condition:

```text
AND(
  [ai_status] = "ready",
  COUNT([Related AI_Reviews]) = 0
)
```

Prefill mapping:

| Review field | Draft value |
|---|---|
| `ai_draft_id` | `[ai_draft_id]` |
| `final_summary` | `[summary_draft]` |
| `final_category` | `[category_suggestion]` |
| `final_checklist_json` | `[checklist_draft_json]` |
| `final_runbook_id` | `[runbook_suggestion]` |
| `reviewer_alias` | `"reviewer-001"` |

### `Draftをレビュー済みにする`

- Table: AI_Drafts
- Effect: set `ai_status` to `"reviewed"`
- Position: Hide
- Condition: `[ai_status] = "ready"`

### `レビュー保存後にDraftを更新`

- Table: AI_Reviews
- Referenced table: AI_Drafts
- Referenced rows: `LIST([ai_draft_id])`
- Referenced action: `Draftをレビュー済みにする`
- Position: Hide
- Condition: `ai_draft_id` is nonblank and the referenced draft is `ready`

AI Review Form uses `レビュー保存後にDraftを更新` as its `Form Saved` action.
The view Position is `ref`, not `menu`, so the form is opened only through the
prominent `AIレビューを開始` `LINKTOFORM` route.

## Review Form

The review form design includes:

- original Request title and description;
- AI summary and category suggestion;
- AI checklist JSON rendered as readable text where possible;
- suggested Runbook;
- decision: accepted, edited or rejected;
- human final summary, category, checklist and Runbook;
- review note and reviewer alias.

Behavior:

- `accepted`: copy the reviewed AI values into the final review fields.
- `edited`: require final summary and final category.
- `rejected`: require a review note and do not copy AI values to Requests.
- keep the AI draft row; change its status to `reviewed` only after the review
  record is saved.

The AppSheet Form Saved action changes only the draft status. To apply a saved
decision, the operator selects its row in the `AI_Reviews` Sheet and runs
`OpsFlow Prototype > Apply selected human review`. The GAS Review Processor
calls `opsflowResolveReview`, validates the Draft and final values, rejects
checklist JSON that is not an array, and creates an idempotent review event.

The three verified paths are:

- accepted review `REV-36146496`, draft `70a20fc4`, `REQ-0002`: applied
  `connectivity` / `RB-001`, equal to its existing confirmed values;
- rejected review `REV-edc0db8a`, draft `AID-757F44E4`, `REQ-0001`: left the
  Request unchanged;
- edited review `REV-3a328550`, draft `cada86ca`, `REQ-0003`: changed
  `connectivity` / `RB-001` to `maintenance` / `RB-004`.

All three drafts are `reviewed`, AI Review Queue is empty, and the six final
events comprise three `ai_draft_ready`, two `ai_review_applied` and one
`ai_review_rejected`. Re-running the selected review at `AI_Reviews!A4` added
no event. Only `Requests[confirmed_category]` and `Requests[runbook_id]` are
applied; final summaries and checklist JSON remain in AI_Reviews.

## Validation Rules

- `is_synthetic` initial value: `TRUE`
- `is_synthetic` editable: off
- `AI_Drafts[created_at]` initial value: `NOW()`
- `AI_Drafts[started_at]` and `AI_Drafts[completed_at]`: no initial value and
  not required; the mock queue processor fills them when processing starts and
  finishes
- `AI_Reviews[review_id]` initial value: `"REV-" & UNIQUEID()`
- `resolution` required when status is `Resolved`
- `cancellation_reason` required when status is `Cancelled`
- `escalation_note` required when `escalated=TRUE`
- hide `raw_output` from ordinary views
- hide all environment and account identifiers from views

The conditional required rules above were applied as `Required_If` expressions.

## User Guidance

The app displays:

`自主制作・合成データのみ。外部送信なし／Gemini未接続。AI提案は必ず人が確認してください。`

## Security and Sharing

- Sign-in is required and the Owner is the only user.
- No test user or public app sharing was added.
- The app remains `Not Deployed`.
- No AppSheet billing plan or contract was started.
- No Bot, trigger or automation was configured.
- Confirm AppSheet licensing before moving out of prototype state.
- Do not use security filters as a substitute for synthetic-only data during
  this phase.

The AppSheet Errors and Warnings sections showed zero. Three Info notices
remained: sign-in allowlist guidance, a Requests deck image suggestion and a
successful Workspace Core security check.
