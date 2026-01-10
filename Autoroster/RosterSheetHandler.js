class RosterSheet {
  static sortRosterByDriverValue() {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const startRow = 7;
    const columnToSort = 6;

    // Get all data starting from row 7
    const data = sheet
      .getRange(
        startRow,
        1,
        sheet.getLastRow() - startRow + 1,
        sheet.getLastColumn()
      )
      .getValues();

    // Sort the data, putting "Yes" above "No"
    data.sort((a, b) => {
      if (a[columnToSort - 1] === "Yes" && b[columnToSort - 1] !== "Yes")
        return -1;
      if (a[columnToSort - 1] !== "Yes" && b[columnToSort - 1] === "Yes")
        return 1;
      return 0;
    });

    // Set the sorted data back to the sheet
    sheet.getRange(startRow, 1, data.length, data[0].length).setValues(data);
  }

  static cleanRosterSheetTraces() {
    const properties = PropertiesService.getScriptProperties();
    properties.deleteProperty("isFullProcess");
  }

  static resetRosterSheet() {
    let sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    let startRow = 7;
    let endRow = sheet.getLastRow();
    for (let i = startRow; i < endRow; i++) {
      sheet.getRange(i, 1).setValue("");
      sheet.getRange(i, 4).setValue("");
      sheet.getRange(i, 6).setValue("");

      sheet
        .getRange(i, 2)
        .setValue(
          "=IFERROR(LEFT(A" +
            i +
            ',SEARCH(" ",A' +
            i +
            ')),"Paste Full Name into Column A")'
        );
      sheet
        .getRange(i, 3)
        .setValue("=REPLACE(A" + i + ",1,LEN(B" + i + '),"")');
      sheet
        .getRange(i, 5)
        .setValue(
          '=IF(Sheet1!$B$7:$B$49="Paste Full Name into Column A","",C' +
            i +
            '&" "&LEFT(B' +
            i +
            ",1))"
        );
    }
    this.cleanRosterSheetTraces();

    // Clear cached data
    const properties = PropertiesService.getScriptProperties();
    properties.deleteProperty("eboardMembers");
    properties.deleteProperty("commitmentFormData");
    properties.deleteProperty("numWaitlist");
    properties.deleteProperty("numRostered");
    properties.deleteProperty("programState");
    properties.deleteProperty("commitmentSheetLink");
    properties.deleteProperty("isFullProcess");
    properties.deleteProperty("nameCol");
    properties.deleteProperty("emailCol");
    properties.deleteProperty("driveCol");

  }

  static getMaxRosterCount() {
    let people = this.getRosterizedPeople(false, false, false, false);
    let newPeople = people.filter((person) => person.isDriver === true);
    let peopleLength = newPeople.length;

    const numPeoplePerDriver = 5;

    return peopleLength * numPeoplePerDriver;
  }

  static getIsDriver(person) {
    return RosterSheet.getRosterizedPeople(false, false, false, false).some(
      (rosterizedPerson) => {
        return (
          rosterizedPerson.email === person.email && rosterizedPerson.isDriver
        );
      }
    );
  }

  static personAlreadyAdded(person) {
    const rosterPeople = this.getRosterizedPeople(false, false, false, false);

    return rosterPeople.some(
      (rosterizedPerson) => rosterizedPerson.email === person.email
    );
  }

  static addPerson(person) {
    if (this.personAlreadyAdded(person)) {
      return;
    }

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

    const startRow = 7; // Start searching from row 6
    let nextRow = startRow;
    const emailCol = 4; // Column D contains emails
    const nameCol = 1;
    const driveCol = 6;

    // Find the next empty row where A, D, and F are empty
    while (
      sheet.getRange(nextRow, nameCol).getValue() ||
      sheet.getRange(nextRow, emailCol).getValue() ||
      sheet.getRange(nextRow, driveCol).getValue()
    ) {
      nextRow++;
    }

    sheet.getRange(nextRow, nameCol).setValue(person.name);
    sheet.getRange(nextRow, emailCol).setValue(person.email);
    sheet.getRange(nextRow, driveCol).setValue(person.isDriver ? "Yes" : "No");
  }

  static addPersonWithMaxCheck(person) {
    const numWaitlist = PropHandler.numWaitlist;
    const numRostered = PropHandler.numRostered;

    if (this.countPeopleOnRosterSheet() >= numRostered + numWaitlist) {
      return;
    }

    this.addPerson(person);
  }

  static countPeopleOnRosterSheet() {
    return this.getRosterizedPeople(false, false, false, false).length;
  }



  static getRosterizedPeople(
    getPriority = true,
    getIsEboard = true,
    getDate = true,
    getRosterState = true
  ) {
    const startRow = 7;

    let lastRow = SpreadsheetApp.getActiveSpreadsheet()
      .getActiveSheet()
      .getLastRow();

    const startColumn = 1;
    const numRows = lastRow - startRow + 1;
    const numColumns = 6;

    let data = SpreadsheetApp.getActiveSpreadsheet()
      .getActiveSheet()
      .getRange(startRow, startColumn, numRows, numColumns)
      .getValues();
    data = data.map((row) => [
      row[0], // Column A
      "", // Empty column
      "", // Empty column
      row[3], // Column D
      "", // Empty column
      row[5], // Column F
    ]);

    const people = [];
    lastRow = 0;
    data.forEach((row) => {
      if (row[3] != "") {
        lastRow++;
      }
    });

    data.forEach((rawRosterizedMember, index) => {
      if (
        rawRosterizedMember[0] != "" &&
        rawRosterizedMember[3] != "" &&
        rawRosterizedMember[5] != ""
      ) {
        const isDriver =
          rawRosterizedMember[5].toLowerCase().trim() === "yes" ? true : false;
        const email = rawRosterizedMember[3].toString().toLowerCase().trim();
        const name = rawRosterizedMember[0].toString().trim();
        const autoPriorityTable = new AutoPriorityTable();
        const priority = getPriority
          ? autoPriorityTable.getPriorityFromEmail(email)
          : null;
        const isEboard = getIsEboard ? EboardSheet.isEboard(email) : null;
        const commitmentForm = new CommitmentForm();
        const date = getDate
          ? commitmentForm.getTimestampFromEmail(email)
          : null;
        let person;
        const numWaitlist = getRosterState ? PropHandler.numWaitlist : null;
        const rosterState = getRosterState
          ? index < lastRow - numWaitlist
            ? RosterStates.Rostered
            : RosterStates.Waitlisted
          : null;
        person = new Person(
          name,
          email,
          priority,
          isDriver,
          isEboard,
          date,
          rosterState
        );

        if (email.includes("@binghamton.edu")) {
          people.push(person);
        }
      }
    });
    return people;
  }
}
