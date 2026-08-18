# Operation Guide

## Phase 0: Local-only Validation

This phase is already available and performs no external calls.

```powershell
cd .\it-ops-runbook-hub
npm test
npm run validate:samples
```

Do not add credentials to make local tests pass. The mock adapter is the
expected default.

## Phase 1: Google Prototype Setup

The Sheet, mock-only Apps Script and Owner-only AppSheet prototype portions were
executed on 2026-08-18. The AppSheet app remains `Not Deployed`.

Reproducible setup sequence:

1. Create one dedicated Google Sheet containing only synthetic data.
2. Create a container-bound Apps Script project.
3. Copy mock-safe modules `00`, `10`, `20`, `40`, `50`, `55`, `60`, `70` and
   `80` in numeric order. Do not copy `30_GeminiAiAdapter.gs`.
4. Use `gas/appsscript.example.json` as a reviewed manifest template.
5. Run `opsflowSetupPrototypeSheets` manually.
6. Confirm the six header rows before seeding.
7. Run `opsflowSeedSyntheticData` manually.
8. Confirm 20 Requests, 4 Runbooks and 8 FAQs.
9. Create an AppSheet prototype using the same Sheet.
10. Configure keys, references, slices, views and actions from `app-sheet/`.

The source files perform no setup simply by being loaded. Setup and seed writes
are explicit menu or function calls.

### 2026-08-18 Prototype Execution Record

- Created the private, Owner-only synthetic Sheet
  `OpsFlow Runbook Hub - Synthetic MVP - 2026-08-18`.
- Verified all six tables and 20 Requests, 4 Runbooks and 8 FAQs.
- Created the container-bound project `OpsFlow Runbook Hub - Mock Only`.
- Copied the mock-safe modules `00`, `10`, `20`, `40`, `50`, `55`, `60`,
  `70` and `80` to one bound `コード.gs`, preserving numeric source order.
- Intentionally omitted `30_GeminiAiAdapter.gs` from the remote project.
- Granted current-spreadsheet-only access with `@OnlyCurrentDoc`; no
  external-service or all-spreadsheet scope was granted.
- Ran `opsflowSetupAndSeedPrototype` and confirmed no duplicate seed IDs.
- Processed one mock job from `REQ-0001` to a `ready` draft and matching
  `ai_draft_ready` event, with the source Request unchanged.
- Added `Apply selected human review` to the Sheet menu, backed by
  `opsflowProcessSelectedReview`, and updated the human-review processor
  without adding the Gemini module.
- Did not create a trigger, configure Gemini, share the assets or publish an
  endpoint.

### 2026-08-18 AppSheet Execution Record

- Added all six Sheet tables and configured their Key, Label, Ref, column type
  and `Required_If` settings.
- Set table permissions to Requests Adds+Updates, AI_Drafts Adds+Updates,
  AI_Reviews Adds only, and Runbooks, FAQs and Request_Events read-only.
- Created eight slices: Open Requests, New Requests, In Progress Requests,
  Waiting Requests, AI Review Queue, AI Errors, Active Runbooks and Active FAQs.
- Configured Home, New Request, AI Review Queue, Requests, Runbooks, Statistics,
  ref AI Review Form and menu FAQs views. The review form is not directly
  available from the menu and opens only through `AIレビューを開始`.
- Added the action `AI下書きを作成`, fixed to `mock`, with a confirmation
  message and strict condition
  `AND([is_synthetic] = TRUE, COUNT([Related AI_Drafts]) = 0)`.
- Confirmed the action is hidden for `REQ-0001`, which already has a related
  ready draft.
- Used the action on `REQ-0002`, confirmed `queued`, manually ran GAS mock
  processing, then verified `ready`, category `connectivity`, Runbook `RB-001`
  and a matching `ai_draft_ready` event.
- Added prominent `AIレビューを開始`, hidden `Draftをレビュー済みにする` and
  hidden `レビュー保存後にDraftを更新` actions, then assigned the last action
  to the AI Review Form `Form Saved` event.
- Set `AI_Reviews[review_id]` initial value to `"REV-" & UNIQUEID()`.
- Verified accepted review `REV-36146496` / draft `70a20fc4` / `REQ-0002`,
  rejected review `REV-edc0db8a` / draft `AID-757F44E4` / `REQ-0001`, and
  edited review `REV-3a328550` / draft `cada86ca` / `REQ-0003`.
- Applied all three selected reviews through GAS. `REQ-0002` retained
  `connectivity` / `RB-001`, `REQ-0003` changed from `connectivity` / `RB-001`
  to `maintenance` / `RB-004`, and rejected `REQ-0001` stayed unchanged.
- Confirmed final rows: AI_Drafts 3 (all `reviewed`), AI_Reviews 3, AI Review
  Queue 0 and Request_Events 6: three `ai_draft_ready`, two
  `ai_review_applied` and one `ai_review_rejected`.
- Re-ran the selected review at `AI_Reviews!A4` and confirmed no new event or
  second application.
- Set User Guidance to `自主制作・合成データのみ。外部送信なし／Gemini未接続。AI提案は必ず人が確認してください。`
- Confirmed zero AppSheet errors and zero warnings. Three informational notices
  remain for the sign-in allowlist, Requests deck image suggestion and
  Workspace Core security success.
- Kept the app private and Owner-only, `Not Deployed`, with no sharing, billing
  plan, contract, Bot or trigger.

## Mock Queue Operation

Verified AppSheet route:

1. Open a synthetic Request with no related AI draft.
2. Choose `AI下書きを作成` and accept the confirmation message.
3. Sync and confirm one `AI_Drafts` row is `queued` in `mock` mode.
4. Manually run `opsflowProcessMockQueue` in the bound Apps Script project.
5. Sync AppSheet and confirm the draft is `ready` and the matching
   `Request_Events` row exists.
6. Confirm the enqueue action is no longer displayed for that Request.

The original Sheet-menu route also remains available:

1. Select a data row in the `Requests` sheet.
2. Choose `OpsFlow Prototype > Queue selected request for mock AI`.
3. Choose `OpsFlow Prototype > Process mock queue`.
4. Confirm an `AI_Drafts` row changes from `queued` to `ready`.
5. Confirm a matching `Request_Events` row exists.
6. Review the draft in AppSheet; do not treat it as confirmed until an explicit
   accept or edit decision is recorded.

## Human Review Operation

Verified accepted, edited and rejected route:

1. Open a `ready` draft with no related AI Review.
2. Choose the prominent `AIレビューを開始` action.
3. Confirm the form prefilled `ai_draft_id`, final summary, final category,
   final checklist JSON, final Runbook and reviewer alias `reviewer-001`.
4. Select `accepted`, `edited` or `rejected`, complete its required fields,
   save and sync.
5. Confirm a `REV-` AI_Reviews row exists, the draft is `reviewed`, the draft is
   absent from AI Review Queue and its review action is hidden.
6. In the `AI_Reviews` Sheet, select the saved review row and choose `OpsFlow
   Prototype > Apply selected human review`.
7. Confirm an accepted or edited review applies only the confirmed category and
   Runbook to Requests. Confirm a rejected review leaves Requests unchanged.
8. Confirm exactly one `ai_review_applied` or `ai_review_rejected` event exists
   for the review. Re-run once and confirm the event count does not change.

The AppSheet Form Saved chain updates only the draft status; the explicit Sheet
menu runs `opsflowResolveReview` and applies the review. The processor rejects
checklist JSON that is not an array. Final summaries and checklist JSON remain
in AI_Reviews, while only confirmed category and Runbook are copied to Requests.

## Trigger Plan

The MVP may later use a time-driven trigger for `opsflowProcessMockQueue`.

Before enabling a trigger:

- complete one manual mock run;
- verify the Sheet owner and script owner;
- verify the maximum batch of 10;
- verify that only `mock` jobs exist;
- record how the trigger will be disabled.

Do not attach the Gemini function to a trigger during the initial prototype.

## Gemini Enablement

Gemini is disabled by default and has not been called.

Before first enablement:

1. Recheck official Gemini API model names, endpoint, price and data terms.
2. Confirm that only synthetic fields will be transmitted.
3. Set a low billing/quota boundary outside this repository.
4. Store values in Apps Script Properties:

```text
OPSFLOW_GEMINI_ENABLED=true
OPSFLOW_GEMINI_API_KEY=<stored only in Script Properties>
OPSFLOW_GEMINI_MODEL=<currently approved model name>
```

5. Enqueue a single `gemini` test job.
6. Run `opsflowProcessGeminiQueueExplicit` manually.
7. Inspect the exact output and event before any repeated execution.

Never display Script Properties in screenshots or logs.

## Error Recovery

| Error code | Check | Recovery |
|---|---|---|
| `REQUEST_NOT_FOUND` | Request ID and Ref | Correct data; enqueue a new draft |
| `REQUEST_INVALID` | Required fields and `is_synthetic` | Correct synthetic row; enqueue anew |
| `AI_JSON_INVALID` | Adapter response | Keep error evidence; inspect adapter |
| `AI_VALIDATION_FAILED` | Category, Runbook, review and unsafe-action rules | Correct prompt/fixture; enqueue anew |
| `AI_CONFIGURATION_ERROR` | Explicit gate and Script Properties | Do not expose values; correct configuration |
| `AI_HTTP_ERROR` | Current official endpoint and quota | Stop repeated calls; verify externally |
| `AI_PROCESSING_ERROR` | Bounded Apps Script log | Diagnose without copying secrets into notes |

The prototype has no automated delete or reset command. Preserve failed rows as
test evidence. Any cleanup should be a reviewed, exact-row operation.

## Pre-publication Checklist

- [ ] All records remain synthetic.
- [ ] No email, IP address, API key, OAuth value or private URL appears.
- [ ] Screenshots hide Google account identity and edit links.
- [ ] `raw_output` and Apps Script Properties are not shown.
- [ ] Test results are current and reproducible.
- [ ] Measurements are labeled synthetic.
- [ ] The project is labeled自主制作 / 架空事例.
- [ ] A license is selected deliberately before public publication.
- [ ] Only this self-contained folder is exported; the Vault is not published.
- [ ] Owner approves the exact files and destination.
