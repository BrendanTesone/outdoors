function addLinkToEmailSheet() {
  let spreadsheetUrl = Links.autoEmailSheet;
  let spreadsheet = SpreadsheetApp.openByUrl(spreadsheetUrl);

  const sheet = spreadsheet.getActiveSheet();

  let ui = SpreadsheetApp.getUi();
  let prompt1 = ui.alert(
    "Is the meeting at a usual time?",
    "Say yes if on a standard monday/time, say no if not at a normal time.",
    ui.ButtonSet.YES_NO
  );

  if (prompt1 == ui.Button.NO) {
    addTrueToEmailSheet();
  }

  while (true) {
    let response = ui.prompt(
      "Enter a Link",
      "Please paste the URL you want to add:",
      ui.ButtonSet.OK_CANCEL
    );

    if (response.getSelectedButton() == ui.Button.OK) {
      let link = response.getResponseText();

      if (link.startsWith("http")) {
        sheet.getRange("B1").setValue(link);
        ui.alert(
          "Success",
          "Link has been added to cell B1 in the specified spreadsheet",
          ui.ButtonSet.OK
        );

        var fileId = link.match(/[-\w]{25,}/);
        if (fileId && fileId[0]) {
          file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        }
        
        return;
      } else {
        ui.alert(
          "Error",
          "Please enter a valid URL starting with http:// or https://",
          ui.ButtonSet.OK
        );
      }
      
    } else {
      ui.alert("Cancelled", "No link was added", ui.ButtonSet.OK);
    }
  }
}

function addTrueToEmailSheet() {
  let spreadsheetUrl = Links.autoEmailSheet;
  let spreadsheet = SpreadsheetApp.openByUrl(spreadsheetUrl);
  const sheet = spreadsheet.getActiveSheet();

  sheet.getRange("B4").setValue(true);

  SpreadsheetApp.getUi().alert("Fixed auto email for this week");
}
