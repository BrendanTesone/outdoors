class FormManager {
  static addFormDateToSheet(formLink, formDate) {
    const spreadsheet = SpreadsheetApp.openByUrl(Links.formTrackerUrl);

    let sheet = spreadsheet.getSheets()[0];
    let data = sheet.getRange("A:A").getValues();
    let found = false;

    for (let i = 0; i < data.length; i++) {
      const existingFormLink = data[i][0];
      try {
        const existingForm = FormApp.openByUrl(existingFormLink);
        const existingTitle = existingForm.getTitle();
        const currentForm = FormApp.openByUrl(formLink);
        const currentTitle = currentForm.getTitle();
        if (existingTitle === currentTitle) {
          sheet.getRange(i + 1, 2).setValue(formDate);
          found = true;
          break;
        }
      } catch {
        console.error(`Error opening form: ${existingFormLink}. Skipping.`);
      }
    }

    if (!found) {
      sheet.appendRow([formLink, formDate]);
    }
  }
}
