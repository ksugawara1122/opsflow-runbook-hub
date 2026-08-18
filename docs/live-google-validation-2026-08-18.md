# Live Google Validation

date:: 2026-08-18
status:: sheet-gas-appsheet-three-decision-review-applied-verified
data_scope:: synthetic-only
sharing:: private-owner-only
appsheet:: owner-only-prototype-applied-and-verified
appsheet_deployment:: not-deployed
gemini:: disabled-and-not-deployed

## Assets

- Google Sheet name: `OpsFlow Runbook Hub - Synthetic MVP - 2026-08-18`
- Apps Script project name: `OpsFlow Runbook Hub - Mock Only`

The Sheet, bound script and AppSheet prototype are private and Owner-only. No
test user, public link or deployment endpoint was added. Resource IDs and edit
URLs are intentionally excluded from the project folder because it is a future
public-export candidate; they are handed off in the private implementation
session only.

## Authorization Boundary

The bound Apps Script project was granted only the scope to view and manage
the spreadsheet in which the application is installed. External-service and
all-spreadsheet scopes were not granted.

The live `コード.gs` contains the mock-only modules:

- `00_Config.gs`
- `10_Core.gs`
- `20_MockAiAdapter.gs`
- `40_SheetRepository.gs`
- `50_QueueProcessor.gs`
- `55_ReviewProcessor.gs`
- `60_Setup.gs`
- `70_Menu.gs`
- `80_SeedData.gs`

`30_GeminiAiAdapter.gs` is intentionally absent from the live project. No API
key or Gemini Script Property is configured.

## Sheet Verification

| Table | Expected data rows | Verified data rows |
|---|---:|---:|
| Requests | 20 | 20 unique request IDs |
| AI_Drafts | 0 before E2E | 3 total: all reviewed |
| AI_Reviews | 0 before review E2E | 3 total: accepted, edited and rejected |
| Runbooks | 4 | 4 unique Runbook IDs |
| FAQs | 8 | 8 unique FAQ IDs |
| Request_Events | 0 before E2E | 6 audit events after E2E |

All six tables retain their exact header order, frozen header row, filter,
column formatting and bounded validation rules. The spreadsheet locale is
`ja_JP` and timezone is `Asia/Tokyo`.

## Mock E2E Evidence

Input: `REQ-0001`, selected from `Requests!A2`.

Resulting draft:

- `ai_draft_id`: `AID-757F44E4`
- `ai_status`: `ready`
- `ai_mode`: `mock`
- `model_name`: `deterministic-rules-v1`
- `prompt_version`: `triage-v1`
- `input_hash`: `f5512b2f`
- `category_suggestion`: `connectivity`
- `runbook_suggestion`: `RB-001`
- `error_code`: blank
- `retry_count`: `0`

Resulting event:

- `event_id`: `EVT-AID-757F44E4`
- `actor_type`: `system`
- `actor_alias`: `opsflow-worker`
- `action`: `ai_draft_ready`
- note: `Synthetic-data prototype; human review required`

At this first stage, the original Request row was unchanged and `AI_Reviews`
remained empty. This proved draft generation and audit recording without
bypassing human review before the later accepted-review test.

## AppSheet Configuration Verification

- Added all six tables.
- Applied Key, Label, Ref, column type and `Required_If` settings.
- Applied Requests Adds+Updates, AI_Drafts Adds+Updates, AI_Reviews Adds only,
  and read-only Runbooks, FAQs and Request_Events permissions.
- Created Open Requests, New Requests, In Progress Requests, Waiting Requests,
  AI Review Queue, AI Errors, Active Runbooks and Active FAQs slices.
- Configured Home dashboard with Requests, AI Review Queue and Runbooks; New
  Request form; AI Review Queue table; Requests; Runbooks table; Statistics;
  ref AI Review Form; and menu FAQs. The review form is opened only through
  `AIレビューを開始`, not directly from the menu.
- Applied the confirmation-enabled `AI下書きを作成` action with strict condition
  `AND([is_synthetic] = TRUE, COUNT([Related AI_Drafts]) = 0)`.
- Confirmed the action was hidden for `REQ-0001` because its related ready draft
  already existed.
- Configured `AIレビューを開始` on AI_Drafts as a prominent `LINKTOFORM` action.
  It prefills `ai_draft_id`, final summary, final category, final checklist JSON,
  final Runbook and reviewer alias `reviewer-001`; it appears only for `ready`
  drafts with no related AI Review.
- Configured hidden `Draftをレビュー済みにする` to set `ai_status="reviewed"`
  only from `ready`.
- Configured hidden `レビュー保存後にDraftを更新` on AI_Reviews to run that
  draft action on `LIST([ai_draft_id])` only when the reference is nonblank and
  the referenced draft is `ready`.
- Set AI Review Form `Form Saved` to `レビュー保存後にDraftを更新` and aligned
  `review_id` initial value to `"REV-" & UNIQUEID()`.

For `REQ-0002`, the AppSheet action created draft key `70a20fc4` in `queued`
mock mode. Manual GAS processing changed it to `ready`, category
`connectivity`, Runbook `RB-001`, input hash `cd75a06d`, and appended a matching
`ai_draft_ready` event. At that checkpoint, before any review test, AI_Drafts
was 2, Request_Events was 2 and AI_Reviews was 0.

## Human Review E2E Evidence

The prominent review action was opened from draft `70a20fc4` for `REQ-0002`.
The Review Form prefilled the draft ID, final summary, category `connectivity`,
checklist JSON, Runbook `RB-001` and reviewer alias `reviewer-001`.

Saving decision `accepted` created review `REV-36146496`. After sync, draft
`70a20fc4` was `reviewed`, disappeared from AI Review Queue and no longer showed
the review action.

The same ref-only Form route then saved:

- rejected review `REV-edc0db8a` for draft `AID-757F44E4` / `REQ-0001`;
- edited review `REV-3a328550` for draft `cada86ca` / `REQ-0003`.

All three Form Saved chains changed their drafts to `reviewed`. The review queue
was empty and the start action was hidden for each reviewed draft.

The remote mock-only Apps Script was updated with `55_ReviewProcessor.gs`, and
the Sheet menu gained `Apply selected human review`. Each of the three review
rows was selected and processed through `opsflowResolveReview`:

- accepted `REQ-0002` applied `connectivity` / `RB-001`, equal to its existing
  confirmed values;
- edited `REQ-0003` changed `connectivity` / `RB-001` to `maintenance` /
  `RB-004`;
- rejected `REQ-0001` left its Request unchanged.

Final connector verification showed:

- AI_Drafts: 3 total, all `reviewed`;
- AI_Reviews: 3 total, one accepted, one edited and one rejected;
- AI Review Queue: 0;
- Request_Events: 6 total, with three `ai_draft_ready`, two
  `ai_review_applied` and one `ai_review_rejected`.

Re-running the selected review at `AI_Reviews!A4` produced no new event. This
verified idempotence. The Core also rejects checklist JSON that parses to a
non-array value. Only confirmed category and Runbook are copied to Requests;
final summaries and checklist JSON remain in AI_Reviews.

User Guidance is set to:

`自主制作・合成データのみ。外部送信なし／Gemini未接続。AI提案は必ず人が確認してください。`

The AppSheet Errors and Warnings sections showed zero. Three Info notices
remained for sign-in allowlist guidance, a Requests deck image suggestion and a
successful Workspace Core security check. The app remains `Not Deployed`; no
sharing, billing plan, contract, Bot or trigger was added.

## Remaining Work

- Verify concurrent or time-driven production behavior only under a separately
  approved test plan.
- Keep AppSheet-to-GAS review application as an explicit Sheet-menu operation
  unless a separately approved Bot or trigger is designed and tested.
- Keep deployment, sharing, billing, Bots and triggers disabled until separately
  approved and reviewed.
- Do not enable Gemini without a new approval and a current model, pricing and
  data-term review.
