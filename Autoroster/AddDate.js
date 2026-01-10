function addDateToForm() {
  let htmlOutput = HtmlService.createHtmlOutputFromFile(
    "AddDateSidebar"
  ).setTitle("Add Close Date To Form");
  SpreadsheetApp.getUi().showSidebar(htmlOutput);
}

function processAddDateData(link, date) {
  try {
    FormApp.openByUrl(link);
  } catch {
    SpreadsheetApp.getUi().alert("Invalid link, try again");
    addDateToForm();
    return;
  }

  FormManager.addFormDateToSheet(link, date);

  const html = HtmlService.createHtmlOutput(
    "<script>google.script.host.close();</script>"
  );
  SpreadsheetApp.getUi().showSidebar(html);

  SpreadsheetApp.getUi().alert("Added Close Date to Form Successfully!");
}
