const loadingDialog = () => {
  let template = HtmlService.createTemplateFromFile("loading.html");
  let widget = template.evaluate();
  widget.setWidth(600);
  widget.setHeight(600);
  SpreadsheetApp.getUi().showModalDialog(widget, "Loading...");
}

const closeDialog = () => {
  const html = HtmlService.createHtmlOutput(
    "<script>google.script.host.close();</script>"
  );
  SpreadsheetApp.getUi().showModalDialog(html, "Closing...");
}

function clearSheet() {
  loadingDialog();
  RosterSheet.resetRosterSheet();
  closeDialog();
}

function rosterMain() {
  loadingDialog();

  RosterSheet.resetRosterSheet();

  PropHandler.isFullProcess = true;

  PropHandler.programState = "Eboard Selection Menu";

  rosterEboard();
}

function rosterEboard() {
  if (PropHandler.programState !== "Eboard Selection Menu") {
    return;
  }
  PropHandler.programState = "Eboard Selection Process";

  const eboardPeople = EboardSheet.getEboardMembers();

  const template = HtmlService.createTemplateFromFile("EboardMenu.html");
  template.people = eboardPeople;
  const widget = template.evaluate();
  widget.setWidth(600);
  widget.setHeight(600);

  SpreadsheetApp.getUi().showModalDialog(widget, "Eboard Selection");
}

function processEboardFormData(formData) {
  if (PropHandler.programState !== "Eboard Selection Process") {
    return;
  }
  PropHandler.programState = "Driver Selection Menu";

  const processedData = formData
    .filter((person) => person.status !== "not going")
    .map((person) => {
      const name = person.name;
      const email = person.email;
      const driveStatus = person.status === "driver";
      const newPerson = new Person(
        name,
        email,
        null,
        driveStatus,
        true,
        null,
        null
      );
      return newPerson;
    });

  processedData.forEach((person) => {
    RosterSheet.addPerson(person);
  });

  if (PropHandler.isFullProcess) {
    SpreadsheetApp.getUi().alert(
      "Eboard added to roster! Total Count On Roster Is: " +
        RosterSheet.countPeopleOnRosterSheet()
    );
    rosterDrivers();
  } else {
    RosterSheet.cleanRosterSheetTraces();
  }
}

function rosterDrivers() {
  if (PropHandler.programState !== "Driver Selection Menu") {
    return;
  }
  PropHandler.programState = "Driver Selection Process";

  const loadingTemplate = HtmlService.createTemplateFromFile("loading.html");
  const loadingWidget = loadingTemplate.evaluate();
  loadingWidget.setWidth(600);
  loadingWidget.setHeight(600);
  SpreadsheetApp.getUi().showModalDialog(loadingWidget, "Loading...");

  const commitmentData = CommitmentForm.grabPeople();
  const commitmentDataFiltered = commitmentData.filter(
    (person) => person.isDriver === true
  );

  const template = HtmlService.createTemplateFromFile("DriverMenu.html");
  template.people = commitmentDataFiltered;
  const widget = template.evaluate();
  widget.setWidth(600);
  widget.setHeight(600);

  SpreadsheetApp.getUi().showModalDialog(widget, "Driver Selection");
}

function processFormDataDriver(formData) {
  if (PropHandler.programState !== "Driver Selection Process") {
    return;
  }
  PropHandler.programState = "Decide Roster";

  const processedData = formData.map((person) => {
    const name = person.name;
    const email = person.email;
    const driveStatus = person.status === "driver";
    const newPerson = new Person(
      name,
      email,
      null,
      driveStatus,
      false,
      null,
      null
    );
    return newPerson;
  });

  processedData.forEach((person) => {
    RosterSheet.addPerson(person);
  });

  SpreadsheetApp.getUi().alert(
    "Drivers added to Roster! Total Count on roster is " +
      RosterSheet.countPeopleOnRosterSheet()
  );

  if (PropHandler.isFullProcess) {
    decideRoster();
  } else {
    RosterSheet.cleanRosterSheetTraces();
  }
}

function decideRoster() {
  if (PropHandler.programState !== "Decide Roster") {
    return;
  }
  PropHandler.programState = "Nondriver Selection Menu";

  let ui = SpreadsheetApp.getUi();
  let response = ui.alert(
    "Choose roster method:",
    "Do you want to use Automated Picking of people?\n\nYes = Automated Picking\nNo = Handpicking",
    ui.ButtonSet.YES_NO
  );

  if (response == ui.Button.YES) {
    rosterAllAutomated();
  } else {
    rosterAllHandpick();
  }
}

function rosterAllAutomated() {
  if (PropHandler.isFullProcess && PropHandler.programState !== "Nondriver Selection Menu") {
    return;
  }

  PropHandler.programState = "Nondriver Selection Process";

  let template = HtmlService.createTemplateFromFile("loading.html");
  let widget = template.evaluate();
  widget.setWidth(600);
  widget.setHeight(600);
  SpreadsheetApp.getUi().showModalDialog(widget, "Loading...");
  const sortedList = getSortedAndProcessedData().filter(person => person.rosterState !== RosterStates.Rejected)
  sortedList.forEach((person) => {
    RosterSheet.addPerson(person);
  });

  if (PropHandler.isFullProcess) {
    RosterSheet.sortRosterByDriverValue();
  }

  RosterSheet.cleanRosterSheetTraces();

  const html = HtmlService.createHtmlOutput(
    "<script>google.script.host.close();</script>"
  );
  SpreadsheetApp.getUi().showModalDialog(html, "Closing...");

  SpreadsheetApp.getUi().alert(
    "Roster has been created! Total Count on roster is " +
      RosterSheet.countPeopleOnRosterSheet()
  );
}

function rosterAllHandpick() {
  SpreadsheetApp.getUi().alert("handpick")
  if (PropHandler.programState !== "Nondriver Selection Menu") {
    return;
  }
  PropHandler.programState = "Nondriver Selection Process";
  
  let template = HtmlService.createTemplateFromFile("loading.html");
  let widget = template.evaluate();
  widget.setWidth(600);
  widget.setHeight(600);
  SpreadsheetApp.getUi().showModalDialog(widget, "Loading...");
  const rosteredPeople = RosterSheet.getRosterizedPeople(false,false,false,false)
  const sortedList = getSortedAndProcessedData().filter(person=>{return !rosteredPeople.some(rosteredPerson=>rosteredPerson.email === person.email)});

  let expectedRosterCount = PropHandler.numRostered;
  let numWaitlist = PropHandler.numWaitlist;
  let numRostered = RosterSheet.countPeopleOnRosterSheet();
  let maxToBeAddedAsRostered = expectedRosterCount - numRostered;

  const menuTemplate = HtmlService.createTemplateFromFile("HandpickMenu.html");
  menuTemplate.attendeeData = sortedList;
  menuTemplate.numRostered = maxToBeAddedAsRostered;
  menuTemplate.numWaitlist = numWaitlist;

  const menuWidget = menuTemplate.evaluate();
  menuWidget.setWidth(1100);
  menuWidget.setHeight(900);
  SpreadsheetApp.getUi().showModalDialog(
    menuWidget,
    "Handpicked Trip Selection"
  );
}

function processRosterAllHandpick(formDataArray) {
  if (PropHandler.programState !== "Nondriver Selection Process") {
    return;
  }

  let template = HtmlService.createTemplateFromFile("loading.html");
  let widget = template.evaluate();
  widget.setWidth(600);
  widget.setHeight(600);
  SpreadsheetApp.getUi().showModalDialog(widget, "Loading...");

  const processedData = CommitmentForm.grabPeople();

  const newPeople = [];

  formDataArray.forEach((element) => {
    const email = element.email;
    const status = element.status;
    // Find the matching person by email
    const matchingPerson = processedData.find(
      (person) => person.email === email
    );
    if (matchingPerson != null) {
      matchingPerson.isDriver = false;
      switch (status) {
        case "Rostered":
          matchingPerson.rosterState = RosterStates.Rostered;
          break;
        case "Rejected":
          matchingPerson.rosterState = RosterStates.Rejected;
          break;
        case "Waitlisted":
          matchingPerson.rosterState = RosterStates.Waitlisted;
          break;
      }
      newPeople.push(matchingPerson);
    }
  });

  newPeople
    .filter((person) => {
      return person.rosterState === RosterStates.Rostered;
    })
    .forEach((person) => {
      RosterSheet.addPerson(person);
    });

  newPeople
    .filter((person) => {
      return person.rosterState === RosterStates.Waitlisted;
    })
    .forEach((person) => {
      RosterSheet.addPerson(person);
    });

  if (PropHandler.isFullProcess) {
    RosterSheet.sortRosterByDriverValue();
  }

  RosterSheet.cleanRosterSheetTraces();

  let html = HtmlService.createHtmlOutput(
    "<script>google.script.host.close();</script>"
  );

  SpreadsheetApp.getUi().showModalDialog(html, "Closing...");
}
