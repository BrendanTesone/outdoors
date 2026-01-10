function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Rostering(copy to use)")
    .addItem("Roster: Fill Rostering Sheet from Commitment Form", "rosterMain")
    .addItem(
      "Email Generator: Draft Acceptance/Rejection Emails for Trip",
      "autoDraftMain"
    )
    .addItem("Priority: Set Priority for Trip", "autoPriorityMain")
    .addItem("Clear Sheet: WARNING - CLEARS EVERYTHING", "clearSheet")
    .addToUi();
  SpreadsheetApp.getUi()
    .createMenu("Other Functions(no copy needed)")
    .addItem("Auto Email: Input Meeting Slideshow Link", "addLinkToEmailSheet")
    .addItem(
      'Form Gen: Generates Form, Publishes, Makes QR, and Gives Form a "Close" Date',
      "commitmentFormMain"
    )
    .addItem(
      "Form Close: Add End Date/Time to Existing Google Form",
      "addDateToForm"
    )
    .addItem("Make Qr Code", "makeQr")
    .addToUi();
  SpreadsheetApp.getUi()
    .createMenu("DebugMenu")
    .addItem(
      "Auto Email: Fix Email script for if meeting is at a weird date/time",
      "addTrueToEmailSheet"
    )
    .addItem("Input Eboard", "rosterEboard")
    .addItem("Add Drivers", "rosterDrivers")
    .addItem(
      "Nondriver trip assignments, including priority",
      "rosterAllAutomated"
    )
    .addItem("Handpick Trip Assignments", "rosterAllHandpick")
    .addItem("runTest","runTest")
    .addToUi();
}

function placeholder() {
  SpreadsheetApp.getUi().alert("Coming soon");
  return;
}
