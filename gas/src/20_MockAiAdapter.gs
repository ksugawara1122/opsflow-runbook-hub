/**
 * Deterministic AI substitute used for local tests and safe demonstrations.
 * It performs no network calls and never reads environment secrets.
 */

function opsflowInferMockCategory(request) {
  var text = [request.title, request.description].join(' ').toLowerCase();
  var rules = [
    {
      category: 'connectivity',
      pattern: /(vpn|wi-?fi|ネットワーク|接続|つながら)/i
    },
    {
      category: 'authentication',
      pattern: /(サインイン|ログイン|認証|パスワード|アカウント)/i
    },
    {
      category: 'access',
      pattern: /(共有フォルダ|アクセス|閲覧|権限申請)/i
    },
    {
      category: 'maintenance',
      pattern: /(メンテナンス|保守|動作確認|定期作業)/i
    }
  ];

  for (var index = 0; index < rules.length; index += 1) {
    if (rules[index].pattern.test(text)) {
      return rules[index].category;
    }
  }
  return 'general';
}

function opsflowBuildMockChecklist(category) {
  var byCategory = {
    connectivity: [
      '発生している利用者数と影響範囲を確認する',
      'インターネット接続の有無を確認する',
      '表示されたエラー内容を記録する',
      '直前の端末・ネットワーク変更有無を確認する'
    ],
    authentication: [
      '対象サービスと発生時刻を確認する',
      '利用者が入力した画面とエラー内容を記録する',
      '直前の認証情報変更有無を確認する',
      '同じ事象が他の利用者にもあるか確認する'
    ],
    access: [
      '対象の共有先と必要な操作範囲を確認する',
      '申請者と承認者の役割を確認する',
      '期限付きアクセスか継続アクセスか確認する',
      '既存の申請経路と記録方法を確認する'
    ],
    maintenance: [
      '対象機能と確認予定時間を記録する',
      '確認前の状態と期待結果を整理する',
      '確認結果と差異を記録する',
      '異常時の連絡先と引継ぎ条件を確認する'
    ],
    general: [
      '依頼の目的と期待する完了状態を確認する',
      '対象範囲と希望時期を確認する',
      '不足している情報を依頼者へ確認する'
    ]
  };

  return byCategory[category] || byCategory.general;
}

function opsflowBuildMockMissingInformation(request, category) {
  var text = [request.title, request.description].join(' ');
  var missing = [];

  if (!/(いつ|時刻|午前|午後|昨日|本日|\d{1,2}[:時])/i.test(text)) {
    missing.push('発生時刻');
  }
  if (!/(1名|複数|全員|一部|利用者)/i.test(text)) {
    missing.push('影響範囲');
  }
  if (!/(エラー|表示|コード|メッセージ)/i.test(text)) {
    missing.push('画面表示またはエラー内容');
  }
  if (category === 'access' && !/(期限|一時|継続)/i.test(text)) {
    missing.push('必要なアクセス期間');
  }

  return missing.slice(0, 4);
}

function opsflowSummarizeForMock(request) {
  var description = opsflowNormalizeText(request.description).replace(/\s+/g, ' ');
  var summary = opsflowNormalizeText(request.title);

  if (description) {
    summary += '。' + description;
  }
  if (summary.length > 160) {
    summary = summary.slice(0, 157) + '...';
  }
  return summary;
}

function opsflowMockGenerateDraft(request, runbooks, options) {
  var settings = options || {};
  var fixture = settings.fixture || null;

  if (fixture) {
    return JSON.parse(JSON.stringify(fixture));
  }

  var category = opsflowInferMockCategory(request);
  var rankedRunbooks = opsflowRankRunbooks(request, runbooks);
  var matchingCategory = rankedRunbooks.filter(function (item) {
    return item.runbook.category === category;
  });
  var selected = matchingCategory[0] || rankedRunbooks[0] || null;

  return {
    summary_draft: opsflowSummarizeForMock(request),
    category_suggestion: category,
    checklist_draft: opsflowBuildMockChecklist(category),
    missing_information: opsflowBuildMockMissingInformation(request, category),
    runbook_suggestion: selected ? selected.runbook.runbook_id : null,
    needs_human_review: true
  };
}
