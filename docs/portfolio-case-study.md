# ポートフォリオ・ケーススタディ

## 表示上の前提

- 自主制作・架空事例
- 合成データのみ
- private / Owner-only の検証用プロトタイプ
- AppSheet は `Not Deployed`
- 有償導入実績、顧客環境での稼働実績ではない

## 1分で説明する要約

小規模な情シス・IT運用チームを想定し、問い合わせ受付、Runbook参照、
AI下書き、人による承認・修正・却下、監査記録を一つにつないだ
AppSheet + Google Sheets + GAS の自主制作MVPです。

AIは判断や実行を行わず、要約・分類・確認項目の下書きだけを作ります。
確定値は人がレビューした後に、GASがJSON、カテゴリ、Runbook、安全禁止語、
合成データ条件を再検証して反映します。却下時はRequestsを変更しません。

## 想定課題

- 依頼内容の書き方がばらつき、一次確認に時間がかかる。
- 手順書と問い合わせ記録が分かれ、参照先が分かりにくい。
- 生成AIの提案と人が確定した内容を混同しやすい。
- 修正・却下・確定反映の証跡を後から説明しにくい。

## 作成したもの

| 領域 | 内容 |
|---|---|
| 業務設計 | 依頼受付、状態、Runbook、AI Draft、Review、Eventの流れ |
| データ設計 | 6表、Key / Ref、Enum、Required条件、状態遷移 |
| AppSheet | 8 slices、一覧・入力・詳細・集計・レビュー画面、4 actions |
| GAS | schema-safe repository、mock queue、排他、1回再試行、review processor |
| AI境界 | mock既定、Geminiは明示有効化ゲートの後ろで現在無効、出力検証、禁止操作チェック、人手確認 |
| 品質保証 | Node自動テスト、合成データ検証、ライブE2E、監査イベント |
| 引き継ぎ | 要件、構成、運用、復旧、AppSheet設定、テスト証跡 |

## 検証済みの流れ

```text
Synthetic Request
  -> mock AI queue
  -> validated AI draft
  -> accepted / edited / rejected
  -> GAS safety validation
  -> confirmed fields or no Request change
  -> idempotent audit event
```

2026-08-18時点の合成データ検証値:

- Requests: 20
- Runbooks: 4
- FAQs: 8
- mock queue E2E: 3件
- AI reviews: accepted / edited / rejectedを各1件
- AI drafts: 3件、すべて`reviewed`
- Request events: 6件
- edited反映: `connectivity / RB-001`から`maintenance / RB-004`へ変更
- rejected反映: Requestsの確認済み項目を変更しない
- 同じreviewの再実行: 監査イベントを追加せず二重適用を防止
- 自動テスト: 30件合格
- mock期待結果: 20 / 20一致

これらは機能検証用の合成値であり、実運用の削減率や顧客成果ではありません。

## 担当範囲として説明できること

- 想定利用者と業務フローの整理
- データ項目、参照関係、状態遷移、例外条件の設計
- AppSheetの入力・一覧・レビューUI構築
- GASによる明示実行、検証、監査ログ、二重適用防止
- 合成データとテストケースの作成
- 運用手順、制約、復旧方法の文書化
- 生成AIを下書きへ限定するhuman-in-the-loop設計

説明時には「自主制作」「架空事例」「合成データ」を必ず併記し、
PM、監査責任者、本番運用責任者、有償導入担当だったとは表現しません。

## 関連しやすい小規模案件

- Google Sheetsを使った申請・問い合わせ・台帳の整備
- AppSheetの入力フォーム、一覧、絞り込み、参照画面のMVP
- GASによる明示実行の定型処理と監査ログ
- FAQ、Runbook、手順書の構造化
- 生成AI出力を人が確認する業務フローの試作
- 合成データ、テスト項目、操作手順を含む引き継ぎ資料

初期提案では、顧客の本番アカウント操作、権限変更、パスワード操作、
無人通知、24時間監視、機密データのAI送信を対象外にします。

## 提案文へ入れられる短文

> AppSheet・Google Sheets・GASを用い、問い合わせ受付からRunbook参照、
> AI下書き、人による承認・修正・却下、監査記録までをつないだ
> 合成データ専用MVPを自主制作しました。要件・データ設計・テスト・
> 運用手順まで一式で説明できます。

## 公開ゲートの進捗

外部公開や案件提案の前に、次を別工程で確認します。

1. 完了: アカウント、編集URL、資産IDを含まない画面素材を作成。
2. 完了: 公開対象を自己完結した単独パッケージへ限定。
3. 完了: secret / personal-information scanを再実行。
4. 完了: standalone公開パッケージはMIT Licenseを採用。
5. 準備済み: 公開用ポートフォリオページと案件応募パックを作成。
6. 未実施: GitHub公開と案件応募の最終送信。
