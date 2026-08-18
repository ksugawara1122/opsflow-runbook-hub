# Test Report

date:: 2026-08-18
version:: 0.1.0
environment:: Windows PowerShell / Node.js v24.15.0
external_network:: google-workspace-only
credential_material:: not-read-or-stored
google_oauth:: owner-approved-current-spreadsheet-only
external_ai_calls:: 0
google_end_to_end:: sheet-and-appsheet-entry-routes-three-ready-drafts-passed
appsheet_live_verification:: accepted-edited-rejected-and-gas-apply-passed
appsheet_deployment:: not-deployed

## Result Summary

| Check | Result |
|---|---:|
| Automated Node tests | 30 / 30 passed |
| Sample validator | `status: ok` |
| Synthetic request schema | 20 / 20 passed |
| Mock category and Runbook expectation | 20 / 20 matched |
| Portfolio site validator | `status: ok`; 3 pages and all local assets resolved |
| 90-second demo | 90.00 s; H.264 High; 1280 x 720; 30 fps; 2,544,486 bytes |
| Public release scan | `status: ok`; 45 text files; 0 findings |
| Runbook records | 4 valid |
| FAQ records | 8 valid |
| Explicit mock fixtures | 4 valid |
| Sensitive-pattern findings | 0 |
| Native Google Sheet setup | 6 / 6 tables verified |
| Live mock-ready drafts and events | 3 / 3 passed |
| AppSheet tables | 6 / 6 configured |
| AppSheet slices | 8 / 8 configured |
| AppSheet Errors section | 0 errors |
| AppSheet Warnings section | 0 warnings |
| AppSheet Info section | 3 informational notices |
| AppSheet mock queue action | 1 / 1 passed |
| AppSheet review actions | 3 / 3 configured |
| Review Form decisions | 3 / 3 passed: accepted, edited, rejected |
| GAS selected-review processing | 3 / 3 passed |
| AI draft rows after live tests | 3 reviewed, 0 ready |
| Request event rows after live tests | 6 total: 3 ready, 2 applied, 1 rejected |
| AI review rows | 3 total: 1 accepted, 1 edited, 1 rejected |
| Request review outcomes | accepted applied same values; edited changed values; rejected unchanged |
| Review re-run idempotence | passed; event count remained 6 |
| External AI calls | 0 |
| External sharing | 0 |

## Commands

```powershell
npm test
npm run validate:samples
npm run validate:site
npm run scan:release
```

## Covered Behavior

- Synthetic-only request validation
- Enum and state transition enforcement
- Resolution and cancellation requirements
- AI JSON parsing and normalization
- Rejection of checklist JSON that parses to a non-array value
- Human-review requirement
- Unknown Runbook rejection
- Unsafe account/permission/command/production action rejection
- Deterministic input fingerprinting
- Human accept and reject resolution behavior
- Whole GAS source parse in a shared V8-compatible context
- Embedded seed-data validation
- Mock classification and Runbook selection
- Mock fixture isolation
- Gemini header-based API key handling with a local fake fetcher
- Queue success, bounded retry, error and lock behavior
- CSV schema, reference and expected-result validation
- Sensitive-pattern scanning
- AppSheet Key, Label, Ref, column type and `Required_If` configuration
- AppSheet table update permissions and eight slices
- AppSheet action visibility for an existing related draft
- AppSheet action creation of a mock `queued` draft and GAS completion to
  `ready` with a matching event
- Review-form `LINKTOFORM` prefill and `REV-` key generation
- Ref-only Review Form entry through the prominent review action
- Accepted, edited and rejected Review Form saves, chained Form Saved actions
  and draft transitions from `ready` to `reviewed`
- Removal of the reviewed draft from AI Review Queue and hiding of its review
  action
- Repository reads for Draft, Review and Event plus bounded Request review-field
  updates
- Sheet-menu processing of accepted, edited and rejected reviews through
  `opsflowResolveReview`
- Accepted/edited Request updates, rejected no-change behavior and idempotent
  review-event creation

## Environment Note

The sandbox blocks child-process spawning by the default multi-file Node test
runner. The project therefore runs Node's test runner in-process with
`--test-isolation=none`. This changes test-process isolation only; it does not
skip any test cases.

## Portfolio Demo Verification

The public portfolio includes a 90.00-second, silent H.264 video at 1280 x 720
and 30 fps. Its nine source frames use only cropped synthetic AppSheet and
Google Sheets screenshots plus explanatory text. The rendered MP4 is 2,544,486
bytes and has SHA-256
`96FCB1F0AA1B5A05BCB4800E3D0274EF7541A3BE5C291133BEABC4401EE00A00`.

Frames sampled at 0, 22, 54 and 84 seconds were visually checked for text
clipping, account chrome, edit URLs and non-synthetic identifiers. The site
validator also confirmed the Pages redirect, referenced images, MP4/VTT files,
non-autoplay controls and project-relative paths.

## Remaining Verification

- Apps Script time-driven trigger behavior
- AppSheet deployment, sharing, licensing and role/security-filter behavior
- Real Gemini endpoint/model behavior, only after separate enablement approval
- GitHub Pages delivery and remote playback, after the publication setting is enabled

## Live Google Mock E2E

On 2026-08-18, the private synthetic Sheet and its container-bound Apps Script
project were initialized with current-document-only access. The setup was
idempotent: Requests remained at 20 unique IDs, Runbooks at 4 and FAQs at 8.

`REQ-0001` was queued in `mock` mode and processed to one `ready` AI draft.
The result used `deterministic-rules-v1`, category `connectivity`, Runbook
`RB-001` and input hash `f5512b2f`. Its existing related draft correctly hid
the AppSheet action under the strict duplicate-prevention rule.

For `REQ-0002`, the AppSheet action `AI下書きを作成` created draft key
`70a20fc4` in `queued` mock mode. Manual GAS mock processing changed it to
`ready` and appended a matching `ai_draft_ready` event. The result category was
`connectivity`, the Runbook suggestion was `RB-001`, and the input hash was
`cd75a06d`.

After the first two draft tests, `AI_Drafts` contained two `ready` rows and
`Request_Events` contained two matching events. A third mock draft for
`REQ-0003` later added the third `ai_draft_ready` event.

The prominent `AIレビューを開始` action was then used on draft `70a20fc4` for
`REQ-0002`. The Review Form prefilled its draft ID, summary, category
`connectivity`, checklist JSON, Runbook `RB-001` and reviewer alias
`reviewer-001`. Saving decision `accepted` created review `REV-36146496`.
The Form Saved chain changed that draft to `reviewed`; it disappeared from
AI Review Queue and the review action became hidden.

Two additional Review Form tests saved rejected review `REV-edc0db8a` for draft
`AID-757F44E4` / `REQ-0001` and edited review `REV-3a328550` for draft
`cada86ca` / `REQ-0003`. All three drafts became `reviewed` and AI Review Queue
became empty.

Each AI_Reviews row was then selected in Sheets and processed with `Apply
selected human review`. Accepted `REQ-0002` applied the same category
`connectivity` and Runbook `RB-001`; edited `REQ-0003` changed from
`connectivity` / `RB-001` to `maintenance` / `RB-004`; rejected `REQ-0001`
left its Request unchanged. The processor appended two `ai_review_applied`
events and one `ai_review_rejected` event. Re-running the selected review at
`AI_Reviews!A4` added no event, confirming idempotence.

Final connector verification showed three reviewed AI_Drafts rows, three
AI_Reviews rows, zero queue rows and six Request_Events rows: three
`ai_draft_ready`, two `ai_review_applied` and one `ai_review_rejected`.

The AppSheet Errors and Warnings sections both reported zero. Three
informational notices remained: sign-in allowlist guidance, a Requests deck
image suggestion and a successful Workspace Core security check. The app is
private and Owner-only, remains `Not Deployed`, and has no sharing, billing
plan, contract, Bot or trigger.

See [Live Google validation](live-google-validation-2026-08-18.md) for asset
names, scope and verification details. Resource IDs and edit URLs are excluded.
