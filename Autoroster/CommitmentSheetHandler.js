class CommitmentForm {
  static grabPeople() {
    const cachedCommitmentData = PropHandler.cachedCommitmentData;
    if (cachedCommitmentData) {
      return cachedCommitmentData;
    }

    const link = PropHandler.commitmentSheetLink;

    let nameCol = PropHandler.nameCol;
    let emailCol = PropHandler.emailCol;
    let driveCol = PropHandler.driveCol;

    const externalSpreadsheet = SpreadsheetApp.openByUrl(link);

    const sheet = externalSpreadsheet.getSheets()[0];

    const startRow = 2;
    const lastRow = externalSpreadsheet.getLastRow();

    const startColumn = 1;
    const numRows = lastRow - startRow + 1;

    const numColumns = sheet.getLastColumn();
    const data = sheet
      .getRange(startRow, startColumn, numRows, numColumns)
      .getValues();
    const people = [];

    data.forEach((row) => {
      const timestamp = row[0];
      const name = row[nameCol - 1];
      const email = row[emailCol - 1].toString().toLowerCase().trim();
      const driver = row[driveCol - 1];
      if (
        driver != "" &&
        name != "" &&
        email != "" &&
        email.includes("@binghamton.edu")
      ) {
        const firstLetter = driver.toString().charAt(0).toLowerCase();

        let isDriver = firstLetter === "y" ? true : false;

        const isEboard = EboardSheet.isEboard(email);

        const autoPriorityTable = new AutoPriorityTable();
        const priority = autoPriorityTable.getPriorityFromEmail(email);

        const dateObj = new Date(timestamp);

        const person = new Person(
          name,
          email,
          priority,
          isDriver,
          isEboard,
          dateObj,
          null
        );

        people.push(person);
      }
    });

    PropHandler.cachedCommitmentData = people;

    return people;
  }

  static getTimestampFromEmail(email) {
    const data = this.grabPeople();
    const rowIndex = data.findIndex((row) => row.email === email);
    const isFound = rowIndex != -1;
    const date = isFound ? data[rowIndex].submissionDateAndTime : null;
    return date;
  }
}
