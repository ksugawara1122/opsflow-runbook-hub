/**
 * Synthetic-only seed data. No real company, product, network, identity or
 * credential values are included.
 */

function opsflowGetSyntheticRunbooks_() {
  return [
    {
      runbook_id: 'RB-001',
      title: 'VPN接続トラブルの初期確認',
      category: 'connectivity',
      keywords: 'VPN 接続 Wi-Fi ネットワーク つながらない',
      initial_checks: '影響範囲、インターネット接続、エラー表示、直前変更を確認する。',
      procedure: '利用者側の接続状態を確認し、個別発生か複数発生かを分けて記録する。',
      escalation_conditions: '複数利用者で同時発生、業務影響が大きい、または一次受付で判断できない場合。',
      version: '1.0',
      status: 'active',
      source_type: 'synthetic',
      last_reviewed_at: '2026-08-18'
    },
    {
      runbook_id: 'RB-002',
      title: '業務アプリへサインインできない場合の情報収集',
      category: 'authentication',
      keywords: 'サインイン ログイン 認証 アカウント エラー',
      initial_checks: '対象サービス、発生時刻、影響範囲、画面表示、直前変更を確認する。',
      procedure: '認証情報そのものを聞かず、画面表示と発生条件を記録して所定の担当へ引き継ぐ。',
      escalation_conditions: '複数利用者で同時発生、本人確認が必要、またはアカウント操作が必要な場合。',
      version: '1.0',
      status: 'active',
      source_type: 'synthetic',
      last_reviewed_at: '2026-08-18'
    },
    {
      runbook_id: 'RB-003',
      title: '共有フォルダアクセス依頼の受付と確認',
      category: 'access',
      keywords: '共有フォルダ アクセス 閲覧 申請 期限',
      initial_checks: '対象、必要な操作範囲、期間、申請者、承認経路を確認する。',
      procedure: 'アクセス変更は行わず、必要情報と承認状況を記録して管理担当へ引き継ぐ。',
      escalation_conditions: '承認者不明、機密情報を含む、または通常の申請経路外の場合。',
      version: '1.0',
      status: 'active',
      source_type: 'synthetic',
      last_reviewed_at: '2026-08-18'
    },
    {
      runbook_id: 'RB-004',
      title: '定期メンテナンス後の動作確認記録',
      category: 'maintenance',
      keywords: 'メンテナンス 保守 動作確認 定期作業 結果',
      initial_checks: '対象機能、確認時間、期待結果、確認担当を整理する。',
      procedure: '事前に決めた確認項目を実施し、期待結果との差異を記録する。',
      escalation_conditions: '期待結果と異なる、確認不能、または業務影響が確認された場合。',
      version: '1.0',
      status: 'active',
      source_type: 'synthetic',
      last_reviewed_at: '2026-08-18'
    }
  ];
}

function opsflowGetSyntheticFaqs_() {
  return [
    {
      faq_id: 'FAQ-001',
      runbook_id: 'RB-001',
      question: '1人だけVPNへ接続できない場合は何を確認しますか。',
      answer: '端末のネットワーク接続、接続先、画面表示、直前変更を確認します。',
      status: 'active'
    },
    {
      faq_id: 'FAQ-002',
      runbook_id: 'RB-001',
      question: '複数利用者で同時に発生した場合はどうしますか。',
      answer: '個別端末だけでなく共通サービス側も疑い、管理担当へ引き継ぎます。',
      status: 'active'
    },
    {
      faq_id: 'FAQ-003',
      runbook_id: 'RB-002',
      question: '認証情報を依頼本文へ書いてよいですか。',
      answer: '書きません。画面表示、発生時刻、対象サービス等だけを記録します。',
      status: 'active'
    },
    {
      faq_id: 'FAQ-004',
      runbook_id: 'RB-002',
      question: '複数利用者がサインインできない場合はどうしますか。',
      answer: '影響範囲を記録し、共通の認証障害の可能性として引き継ぎます。',
      status: 'active'
    },
    {
      faq_id: 'FAQ-005',
      runbook_id: 'RB-003',
      question: 'アクセス依頼では何を確認しますか。',
      answer: '対象、必要な操作範囲、期間、申請者、承認経路を確認します。',
      status: 'active'
    },
    {
      faq_id: 'FAQ-006',
      runbook_id: 'RB-003',
      question: '受付担当がその場でアクセスを変更しますか。',
      answer: '変更しません。必要情報を記録し、所定の管理担当へ引き継ぎます。',
      status: 'active'
    },
    {
      faq_id: 'FAQ-007',
      runbook_id: 'RB-004',
      question: '動作確認では何を記録しますか。',
      answer: '対象、確認時刻、期待結果、実際の結果、差異を記録します。',
      status: 'active'
    },
    {
      faq_id: 'FAQ-008',
      runbook_id: 'RB-004',
      question: '期待結果と異なる場合はどうしますか。',
      answer: '追加変更を行わず、差異と影響を記録して管理担当へ引き継ぎます。',
      status: 'active'
    }
  ];
}

function opsflowGetSyntheticRequests_() {
  var definitions = [
    ['REQ-0001', 'VPNへ接続できない', '本日9時ごろから1名がVPNへ接続できず、エラーメッセージが表示されます。', 'incident', 'medium', 'high', 'connectivity', 'RB-001'],
    ['REQ-0002', '在宅接続が不安定', '利用者からVPN接続が途中で切れると連絡がありました。', 'incident', 'medium', 'medium', 'connectivity', 'RB-001'],
    ['REQ-0003', '複数名のVPN接続不可', '本日10時、複数利用者で同じ接続エラーが出ています。', 'incident', 'high', 'high', 'connectivity', 'RB-001'],
    ['REQ-0004', '社外から接続できない', 'ネットワークは利用できますが、VPNの画面で接続が完了しません。', 'question', 'low', 'medium', 'connectivity', 'RB-001'],
    ['REQ-0005', 'VPN確認方法を知りたい', '利用者1名から接続できないと問い合わせがありました。', 'question', 'low', 'low', 'connectivity', 'RB-001'],
    ['REQ-0006', '業務アプリへサインインできない', '本日午後、1名がサインイン画面から先へ進めません。エラー表示があります。', 'incident', 'medium', 'medium', 'authentication', 'RB-002'],
    ['REQ-0007', 'ログインエラーの問い合わせ', '利用者から業務アプリにログインできないと連絡がありました。', 'question', 'low', 'medium', 'authentication', 'RB-002'],
    ['REQ-0008', '複数名で認証エラー', '10時30分ごろから複数利用者に同じ認証メッセージが表示されています。', 'incident', 'high', 'high', 'authentication', 'RB-002'],
    ['REQ-0009', 'サインイン画面が繰り返される', '利用者1名でサインイン画面が繰り返し表示されます。', 'incident', 'medium', 'medium', 'authentication', 'RB-002'],
    ['REQ-0010', '認証エラーの確認依頼', '業務アプリでエラーが表示されています。発生時刻は不明です。', 'service_request', 'low', 'low', 'authentication', 'RB-002'],
    ['REQ-0011', '共有フォルダ閲覧依頼', '利用者1名が一時的に共有フォルダを閲覧する申請です。期限は今月末です。', 'access', 'low', 'medium', 'access', 'RB-003'],
    ['REQ-0012', '共有先へアクセスできない', '承認済みの利用者から、対象の共有フォルダを閲覧できないと連絡がありました。', 'incident', 'medium', 'medium', 'access', 'RB-003'],
    ['REQ-0013', 'プロジェクト資料の閲覧申請', '共有資料を継続して閲覧する申請です。承認経路を確認してください。', 'access', 'low', 'low', 'access', 'RB-003'],
    ['REQ-0014', '一時アクセスの受付', '一時アクセスが必要ですが、期限と承認者が記載されていません。', 'access', 'medium', 'medium', 'access', 'RB-003'],
    ['REQ-0015', '共有フォルダの申請方法', '利用者から共有フォルダへアクセスする申請方法について質問がありました。', 'question', 'low', 'low', 'access', 'RB-003'],
    ['REQ-0016', 'メンテナンス後の確認', '本日15時に定期メンテナンス後の動作確認を行う依頼です。', 'service_request', 'medium', 'medium', 'maintenance', 'RB-004'],
    ['REQ-0017', '定期作業の結果記録', '保守後の確認結果を記録し、差異があれば引き継ぐ依頼です。', 'service_request', 'low', 'low', 'maintenance', 'RB-004'],
    ['REQ-0018', '動作確認で差異あり', '本日16時、期待結果と異なる画面表示を1名が確認しました。', 'incident', 'medium', 'high', 'maintenance', 'RB-004'],
    ['REQ-0019', '確認項目の相談', '定期メンテナンス後に何を記録するか相談したいです。', 'question', 'low', 'low', 'maintenance', 'RB-004'],
    ['REQ-0020', '依頼内容の整理', '業務で使うITツールについて相談がありますが、対象と希望時期は未定です。', 'question', 'low', 'low', 'general', '']
  ];

  return definitions.map(function (definition, index) {
    var day = ('0' + (index + 1)).slice(-2);
    return {
      request_id: definition[0],
      created_at: '2026-08-' + day + 'T09:00:00+09:00',
      requester_alias: 'user-' + ('00' + ((index % 5) + 1)).slice(-3),
      title: definition[1],
      description: definition[2],
      request_type: definition[3],
      impact: definition[4],
      urgency: definition[5],
      status: index < 10 ? 'New' : 'Triaged',
      assignee_alias: index < 10 ? '' : 'operator-001',
      confirmed_category: definition[6],
      runbook_id: definition[7],
      resolution: '',
      cancellation_reason: '',
      escalated: false,
      escalation_note: '',
      updated_at: '2026-08-' + day + 'T09:00:00+09:00',
      is_synthetic: true
    };
  });
}

function opsflowGetSyntheticSeedData_() {
  return {
    runbooks: opsflowGetSyntheticRunbooks_(),
    faqs: opsflowGetSyntheticFaqs_(),
    requests: opsflowGetSyntheticRequests_()
  };
}
