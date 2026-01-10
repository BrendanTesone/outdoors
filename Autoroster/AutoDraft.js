function autoDraftMain() {
  const loadingTemplate = HtmlService.createTemplateFromFile("loading.html");
  const loadingWidget = loadingTemplate.evaluate();
  loadingWidget.setWidth(600);
  loadingWidget.setHeight(600);
  SpreadsheetApp.getUi().showModalDialog(loadingWidget, "Loading...");

  const rosterizedPeople = RosterSheet.getRosterizedPeople(
    false,
    true,
    false,
    true
  );
  const committedPeople = CommitmentForm.grabPeople();

  const committedPeopleWithRejectionStates =
    addRejectionStateToEmailsWithoutOverlap(committedPeople, rosterizedPeople);

  draftUi(committedPeopleWithRejectionStates);
}

function addRejectionStateToEmailsWithoutOverlap(commitmentData, rosterData) {
  let newCommitment = [];
  commitmentData.forEach((commitmentPerson) => {
    personMatch = rosterData.some(
      (rosteredPerson) => commitmentPerson.email === rosteredPerson.email
    );
    if (!personMatch) {
      commitmentPerson.rosterState = RosterStates.Rejected;
      newCommitment.push(commitmentPerson);
    }
  });

  rosterData.forEach((rosterPerson) => {
    newCommitment.push(rosterPerson);
  });

  newCommitment.sort((a, b) => {
    const order = {
      Rostered: 0,
      Waitlisted: 1,
      Rejected: 2,
    };

    return order[a.rosterState] - order[b.rosterState];
  });

  return newCommitment;
}

function draftUi(people) {
  let template = HtmlService.createTemplateFromFile("DraftMenu.html");
  let twoDArray = people.map((obj) => [obj.email, obj.rosterState]);
  template.attendeeData = twoDArray;
  let widget = template
    .evaluate()
    .setTitle("Email Draft Menu")
    .setWidth(600)
    .setHeight(600);
  SpreadsheetApp.getUi().showModalDialog(widget, "Email Draft Menu");
  return;
}

function processDraftUi(people) {
  let waitlist = [];
  let rostered = [];
  let rejected = [];
  let committedPeople = CommitmentForm.grabPeople(true, false);
  filteredPeople = people.filter((person) => person.priority !== 0);
  let rosteredPeople = RosterSheet.getRosterizedPeople(
    false,
    true,
    false,
    true
  );

  rosteredPeople.forEach((person) => {
    if (person.isEboard) {
      rostered.push(person);
    }
  });

  committedPeople.forEach((cperson) => {
    let foundPerson = filteredPeople.find(
      (fperson) => fperson.email === cperson.email
    );

    if (foundPerson != null) {
      if (foundPerson.priority === 1) {
        cperson.rosterState = RosterStates.Rostered;
        rostered.push(cperson);
      } else if (foundPerson.priority === -1) {
        cperson.rosterState = RosterStates.Waitlisted;
        waitlist.push(cperson);
      } else if (foundPerson.priority === -2) {
        cperson.rosterState = RosterStates.Rejected;
        rejected.push(cperson);
      }
    }
    cperson.isDriver = RosterSheet.getIsDriver(cperson);
  });
  const waitlist1d = waitlist
    .filter((obj) => obj.email !== undefined)
    .map((obj) => obj.email);
  const roster1d = rostered
    .filter((obj) => obj.email !== undefined)
    .map((obj) => obj.email);
  let waitlistRosteredEmails1D = [...roster1d, ...waitlist1d];
  const rejectedEmails1D = rejected
    .filter((obj) => obj.email !== undefined)
    .map((obj) => obj.email);

  let sheetName = SpreadsheetApp.getActiveSpreadsheet().getName();

  let body = getBody(rostered, waitlist);

  let acceptLink = draftEmailWithBCC(waitlistRosteredEmails1D, sheetName, body);

  const rejectLink = draftEmailWithBCC(
    rejectedEmails1D,
    "Update: " + sheetName + " trip rejection.",
    "Hello everyone,\n\nUnfortunately, we do not have enough drivers for this trip, so you won't be able to attend this time.\n\nWe understand this is disappointing, and we will prioritize you for future trips.\n\nIf you have a car, please consider signing up to drive and ensuring your Club Sports form is up to date. Our trips depend on volunteer drivers, and we truly appreciate those who help make them possible.\n\nWe hope to see you on future trips!"
  );

  showSidebarOfEmailDraftLinks(acceptLink, rejectLink);

  return;
}

function draftEmailWithBCC(recipients, subject, body) {
  let myEmail = Session.getActiveUser().getEmail();
  let draft = GmailApp.createDraft(myEmail, subject, "", {
    bcc: recipients.join(", "),
    htmlBody: body,
  });

  let draftId = draft.getId();
  let draftUrl = "https://mail.google.com/mail/u/0/#drafts/" + draftId;
  return draftUrl;
}

function showSidebarOfEmailDraftLinks(accepted, rejected) {
  accepted = "https://mail.google.com/mail/u/0/#drafts";
  const htmlContent = `
    <div style="padding: 20px; font-family: Arial, sans-serif;">
      <h3>Quick Link</h3>
      <p><a href="${accepted}" target="_blank">Drafts</a></p>
    </div>
  `;

  const html = HtmlService.createHtmlOutput(htmlContent).setTitle(
    "Link To Email Draft"
  );

  SpreadsheetApp.getUi().showSidebar(html);
}

function getBody(rosteredPeople, waitlistedPeople) {
  let htmlBody = "<p>";
  htmlBody += "<br /><strong><u>Roster</u></strong><br>";

  rosteredPeople.sort((a, b) => {
    // Priority 1: isDriver && isEboard
    if (a.isDriver && a.isEboard && !(b.isDriver && b.isEboard)) return -1;
    if (b.isDriver && b.isEboard && !(a.isDriver && a.isEboard)) return 1;

    // Priority 2: isDriver && !isEboard
    if (a.isDriver && !a.isEboard && !(b.isDriver && !b.isEboard)) return -1;
    if (b.isDriver && !b.isEboard && !(a.isDriver && !b.isEboard)) return 1;

    // Priority 3: !isDriver && isEboard
    if (!a.isDriver && a.isEboard && !(!b.isDriver && b.isEboard)) return -1;
    if (!b.isDriver && b.isEboard && !(!a.isDriver && a.isEboard)) return 1;

    // Priority 4: !isDriver && !isEboard (no need to check, it's the default)
    return 0;
  });

  rosteredPeople.forEach((person) => {
    let personHtml = `${person.name} `;

    if (person.isEboard) {
      personHtml += ' <span style="color: blue;">eboard </span>';
      if (person.isDriver) {
        personHtml += ` <span style="color: red;">driver</span>`;
      }
    } else {
      if (person.isDriver) {
        personHtml += ` <span style="color: red;">driver</span>`;
      }
    }
    htmlBody += personHtml + "<br>";
  });

  htmlBody +=
    "<br><b><u>Waitlist: </u></b>(We will contact you if a spot opens up)<br>";

  waitlistedPeople.forEach((person) => {
    const personHtml = `${person.name} `;
    htmlBody += personHtml + "<br>";
  });
  htmlBody += "<br><br>See ya soon!</p>";
  return htmlBody;
}
