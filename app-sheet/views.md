# AppSheet View Specification

status:: owner-only-prototype-applied-and-verified
deployment:: not-deployed
sharing:: private-owner-only

## Navigation

Applied navigation:

1. Home
2. New Request
3. AI Review Queue
4. Requests
5. Runbooks
6. Statistics

`FAQs` is a menu view. `AI Review Form` is a `ref` view and is opened only by
the `AIレビューを開始` `LINKTOFORM` action, preventing direct menu entry. Raw
events are not exposed as a primary view.

## Applied View Inventory

| View | Applied form |
|---|---|
| Home | Dashboard containing Requests, AI Review Queue and Runbooks |
| New Request | Form |
| AI Review Queue | Table |
| Requests | Deck |
| Runbooks | Table |
| Statistics | Configured AppSheet view |
| AI Review Form | Ref form; action-entry only |
| FAQs | Menu view |

## Views

The inventory above is the verified live configuration. The detailed sections
below retain intended display behavior; built-in detail routes are not
separately marked verified unless stated. Accepted, edited and rejected review
paths are verified below.

### S-01 Home

Type: Dashboard

Includes:

- Requests
- AI Review Queue
- Runbooks

Do not display a fabricated SLA or cost-saving number.

### S-02 New Request

Type: Form

Editable:

- `requester_alias`
- `title`
- `description`
- `request_type`
- `impact`
- `urgency`

Automatic/default:

- `request_id`: `"REQ-" & UNIQUEID()` for AppSheet-created rows
- `created_at`: `NOW()`
- `updated_at`: `NOW()`
- `status`: `"New"`
- `is_synthetic`: `TRUE`

### S-03 Request List

Type: Deck

Display:

- title
- status
- impact / urgency
- confirmed category
- assignee alias
- updated time

Group by `status`; provide category and assignee filters.

### S-04 Request Detail

Type: Detail

Sections:

1. Original request
2. Human-confirmed fields
3. Related AI drafts and reviews
4. Selected Runbook and FAQs
5. Resolution and escalation
6. Request events

Place the mock enqueue action in this view. Label it `AI下書きを作成` rather
than implying an automatic decision.

### S-05 AI Review Queue

Type: Table based on the `AI Review Queue` slice

Display:

- Request
- AI status
- category suggestion
- Runbook suggestion
- model name
- prompt version
- completed time

Highlight `needs human review` in the description or view instructions.

### S-06 Runbook List

Type: Table

Display:

- title
- category
- version
- last reviewed date

Use only the `Active Runbooks` slice in normal navigation.

### S-07 Runbook Detail

Type: Detail

Sections:

- initial checks
- procedure
- escalation conditions
- related FAQs
- version, source type and last reviewed date

Show `source_type=synthetic` visibly.

### S-08 Statistics

Type: Statistics view

Allowed metrics:

- count by Request status
- count by confirmed category
- count of AI ready / error / reviewed
- count of accepted / edited / rejected reviews
- count by assignee alias

Define each metric on the screen. Do not call a synthetic count a business
outcome.

### S-09 Menu and Ref Views

Applied:

- FAQs: menu
- AI Review Form: ref, opened only from `AIレビューを開始`

Do not expose API keys, Script Properties, Sheet IDs or account information.

## Applied Action and Guidance

The Requests action is labeled `AI下書きを作成`. It creates a mock `queued`
AI_Drafts row only when this strict condition is true:

```text
AND([is_synthetic] = TRUE, COUNT([Related AI_Drafts]) = 0)
```

The confirmation message is enabled. The action was hidden for `REQ-0001`,
which already had a related ready draft, and was successfully run for
`REQ-0002`. GAS then processed that row to `ready` and added a matching
`ai_draft_ready` event.

Review actions:

- `AIレビューを開始`: prominent AI_Drafts `LINKTOFORM`; visible only when the
  draft is `ready` and has no related AI Review; prefills the draft ID, final
  summary/category/checklist/Runbook and `reviewer-001`.
- `Draftをレビュー済みにする`: hidden AI_Drafts action that changes a `ready`
  draft to `reviewed`.
- `レビュー保存後にDraftを更新`: hidden AI_Reviews action that invokes the
  draft action for `LIST([ai_draft_id])` when the reference is nonblank and the
  draft is still `ready`.

AI Review Form has the third action configured as `Form Saved`. The live tests
created one accepted, one edited and one rejected review. Each associated draft
changed to `reviewed`, left AI Review Queue and hid its review action. The queue
is now empty with three reviewed drafts and three review rows.

Review application remains a deliberate second step in Sheets. The operator
selects an AI_Reviews row and runs `Apply selected human review`. Accepted and
edited decisions apply the confirmed category and Runbook; rejected leaves its
Request unchanged. The six final events include three ready, two applied and
one rejected events, and a repeated application added no event.

User Guidance:

`自主制作・合成データのみ。外部送信なし／Gemini未接続。AI提案は必ず人が確認してください。`

## UX Review Checklist

- [ ] AI suggestion and human-confirmed value are visually separate.
- [ ] Original Request text remains visible during review.
- [ ] Error state does not hide or block manual handling.
- [x] Synthetic-data and human-review guidance is configured.
- [x] No action label suggests that AI executed an operational change.
- [ ] Mobile and desktop layouts are both checked.
- [ ] Account identity is hidden before screenshots or recording.

The AppSheet Errors and Warnings sections reported zero. All three review saves
and the explicit GAS application path are verified. Automatic AppSheet-to-GAS
review processing remains inactive. The app remains private, Owner-only and
`Not Deployed`, with no sharing, billing plan, contract, Bot or trigger.
