/**
 * Explicit setup and synthetic seed commands.
 */

function opsflowAppendSeedRowsIfEmpty_(sheetName, rows) {
  var current = opsflowReadSheetObjects_(sheetName);
  if (current.length > 0) {
    return {
      sheetName: sheetName,
      added: 0,
      skipped: true
    };
  }

  rows.forEach(function (row) {
    opsflowAppendObject_(sheetName, row);
  });
  return {
    sheetName: sheetName,
    added: rows.length,
    skipped: false
  };
}

function opsflowSetupPrototypeSheets() {
  return opsflowEnsureSheets();
}

function opsflowSeedSyntheticData() {
  opsflowEnsureSheets();
  var seed = opsflowGetSyntheticSeedData_();
  return [
    opsflowAppendSeedRowsIfEmpty_(OPSFLOW_CONFIG.sheetNames.runbooks, seed.runbooks),
    opsflowAppendSeedRowsIfEmpty_(OPSFLOW_CONFIG.sheetNames.faqs, seed.faqs),
    opsflowAppendSeedRowsIfEmpty_(OPSFLOW_CONFIG.sheetNames.requests, seed.requests)
  ];
}

function opsflowSetupAndSeedPrototype() {
  return {
    setup: opsflowSetupPrototypeSheets(),
    seed: opsflowSeedSyntheticData()
  };
}

function opsflowEnqueueActiveRequestForMock() {
  var spreadsheet = opsflowGetSpreadsheet_();
  var sheet = spreadsheet.getActiveSheet();
  if (!sheet || sheet.getName() !== OPSFLOW_CONFIG.sheetNames.requests) {
    throw new Error('Select a data row in the Requests sheet first.');
  }

  var rowNumber = sheet.getActiveCell().getRow();
  if (rowNumber < 2) {
    throw new Error('Select a request data row, not the header.');
  }

  var headers = opsflowGetExpectedHeaders_(OPSFLOW_CONFIG.sheetNames.requests);
  var requestIdColumn = headers.indexOf('request_id') + 1;
  var requestId = sheet.getRange(rowNumber, requestIdColumn).getValue();
  if (!opsflowNormalizeText(requestId)) {
    throw new Error('The selected row has no request_id.');
  }

  return opsflowCreateSheetRepository().enqueueRequest(
    requestId,
    'mock',
    'triage-v1'
  );
}
