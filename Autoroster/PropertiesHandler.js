class PropHandler {
  static get isFullProcess(){
    return PropertiesService.getScriptProperties().getProperty("isFullProcess");
  }

  static set isFullProcess(value){
    PropertiesService.getScriptProperties().setProperty("isFullProcess", value);
  }
  
  static get programState() {
    return PropertiesService.getScriptProperties().getProperty("programState");
  }

  static set programState(value) {
    PropertiesService.getScriptProperties().setProperty("programState", value);
  }

  static get numRostered() {
    while (
      !PropertiesService.getScriptProperties().getProperty("numRostered")
    ) {
      const newAnswer = askQuestion(
        `How many people do you want to be ROSTERED (on the trip)? - Max based on # cars (${RosterSheet.getMaxRosterCount()}!)`
      );
      PropHandler.numRostered = newAnswer;
    }

    return parseInt(
      JSON.parse(
        PropertiesService.getScriptProperties().getProperty("numRostered")
      )
    );
  }

  static set numRostered(value) {
    PropertiesService.getScriptProperties().setProperty(
      "numRostered",
      JSON.stringify(value)
    );
  }

  static get numWaitlist() {
    while (
      !PropertiesService.getScriptProperties().getProperty("numWaitlist")
    ) {
      const newAnswer = askQuestion(
        `How many people do you want to be WAITLISTED? - EX: 5)`
      );
      PropHandler.numWaitlist = newAnswer;
    }

    return parseInt(
      JSON.parse(
        PropertiesService.getScriptProperties().getProperty("numWaitlist")
      )
    );
  }
  static set numWaitlist(value) {
    PropertiesService.getScriptProperties().setProperty(
      "numWaitlist",
      JSON.stringify(value)
    );
  }

  static get cachedCommitmentData() {
    return JSON.parse(
      PropertiesService.getScriptProperties().getProperty("commitmentFormData")
    );
  }

  static set cachedCommitmentData(value) {
    PropertiesService.getScriptProperties().setProperty(
      "commitmentFormData",
      JSON.stringify(value)
    );
  }

  static get commitmentSheetLink() {
    let ui = SpreadsheetApp.getUi();
    while (
      !PropertiesService.getScriptProperties().getProperty(
        "commitmentSheetLink"
      )
    ) {
      let response = ui.prompt(
        "Enter Spreadsheet Link",
        "Please enter a spreadsheet link:",
        ui.ButtonSet.OK_CANCEL
      );

      if (response.getSelectedButton() === ui.Button.OK) {
        const link = response.getResponseText();

        try {
          SpreadsheetApp.openByUrl(link);
        } catch (error) {
          ui.alert("Error", error.message, ui.ButtonSet.OK);
          continue;
        }

        PropHandler.commitmentSheetLink = link;
        break;
      }
    }

    return JSON.parse(
      PropertiesService.getScriptProperties().getProperty("commitmentSheetLink")
    );
  }

  static set commitmentSheetLink(value) {
    PropertiesService.getScriptProperties().setProperty(
      "commitmentSheetLink",
      JSON.stringify(value)
    );
  }

  static get nameCol() {
    if (PropertiesService.getScriptProperties().getProperty("nameCol")) {
      return parseInt(
        JSON.parse(
          PropertiesService.getScriptProperties().getProperty("nameCol")
        )
      );
    }

    let newNameCol;

    let ui = SpreadsheetApp.getUi();

    const link = PropHandler.commitmentSheetLink;

    let targetSpreadsheet;
    try {
      targetSpreadsheet = SpreadsheetApp.openByUrl(link);
    } catch (error) {
      ui.alert(
        "Error",
        "Could not open the target spreadsheet. Check the URL and your permissions.",
        ui.ButtonSet.OK
      );
      return;
    }

    let targetSheet = targetSpreadsheet.getSheets()[0];

    let lastColumn = targetSheet.getLastColumn();
    let rowData = targetSheet.getRange(1, 1, 1, lastColumn).getValues()[0];

    for (let col = 0; col < rowData.length; col++) {
      let cellValue = rowData[col];
      if (!cellValue) continue;

      let text = cellValue.toString().toUpperCase();

      if (text.indexOf("NAME") !== -1) {
        newNameCol = col + 1;
        PropHandler.nameCol = newNameCol;
        return newNameCol;
      }
    }
  }

  static set nameCol(value) {
    PropertiesService.getScriptProperties().setProperty(
      "nameCol",
      JSON.stringify(value)
    );
  }

  static get emailCol() {
    if (PropertiesService.getScriptProperties().getProperty("emailCol")) {
      return parseInt(
        JSON.parse(
          PropertiesService.getScriptProperties().getProperty("emailCol")
        )
      );
    }

    let newEmailCol;

    let ui = SpreadsheetApp.getUi();

    const link = PropHandler.commitmentSheetLink;

    let targetSpreadsheet;
    try {
      targetSpreadsheet = SpreadsheetApp.openByUrl(link);
    } catch (error) {
      ui.alert(
        "Error",
        "Could not open the target spreadsheet. Check the URL and your permissions.",
        ui.ButtonSet.OK
      );
      return;
    }

    let targetSheet = targetSpreadsheet.getSheets()[0];

    let lastColumn = targetSheet.getLastColumn();
    let rowData = targetSheet.getRange(1, 1, 1, lastColumn).getValues()[0];

    for (let col = 0; col < rowData.length; col++) {
      let cellValue = rowData[col];
      if (!cellValue) continue;

      let text = cellValue.toString().toUpperCase();

      if (text.indexOf("MAIL") !== -1) {
        newEmailCol = col + 1;
        PropHandler.emailCol = newEmailCol;
        return newEmailCol;
      }
    }
  }

  static set emailCol(value) {
    PropertiesService.getScriptProperties().setProperty(
      "emailCol",
      JSON.stringify(value)
    );
  }

  static get driveCol() {
    if (PropertiesService.getScriptProperties().getProperty("driveCol")) {
      return parseInt(
        JSON.parse(
          PropertiesService.getScriptProperties().getProperty("driveCol")
        )
      );
    }

    let newDriveCol;

    let ui = SpreadsheetApp.getUi();

    const link = PropHandler.commitmentSheetLink;

    let targetSpreadsheet;
    try {
      targetSpreadsheet = SpreadsheetApp.openByUrl(link);
    } catch (error) {
      ui.alert(
        "Error",
        "Could not open the target spreadsheet. Check the URL and your permissions.",
        ui.ButtonSet.OK
      );
      return;
    }

    let targetSheet = targetSpreadsheet.getSheets()[0];

    let lastColumn = targetSheet.getLastColumn();
    let rowData = targetSheet.getRange(1, 1, 1, lastColumn).getValues()[0];

    for (let col = 0; col < rowData.length; col++) {
      let cellValue = rowData[col];
      if (!cellValue) continue;

      let text = cellValue.toString().toUpperCase();

      if (text.indexOf("DRIVE") !== -1 || text.indexOf("CAR") !== -1) {
        newDriveCol = col + 1;
        PropHandler.driveCol = newDriveCol;
        return newDriveCol;
      }
    }
  }
  static set driveCol(value) {
    PropertiesService.getScriptProperties().setProperty(
      "driveCol",
      JSON.stringify(value)
    );
  }
}
