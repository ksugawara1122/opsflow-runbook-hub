/**
 * Spreadsheet menu. No function runs automatically except menu creation.
 */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('OpsFlow Prototype')
    .addItem('1. Setup sheets', 'opsflowSetupPrototypeSheets')
    .addItem('2. Seed synthetic data', 'opsflowSeedSyntheticData')
    .addSeparator()
    .addItem('Queue selected request for mock AI', 'opsflowEnqueueActiveRequestForMock')
    .addItem('Process mock queue', 'opsflowProcessMockQueue')
    .addSeparator()
    .addItem('Apply selected human review', 'opsflowProcessSelectedReview')
    .addToUi();
}
