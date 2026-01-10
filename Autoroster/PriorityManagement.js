function autoPriorityMain() {
  let template = HtmlService.createTemplateFromFile("loading.html");
  let widget = template.evaluate();
  widget.setWidth(600);
  widget.setHeight(600);
  SpreadsheetApp.getUi().showModalDialog(widget, "Loading...");

  let rosterPeopleWithPriority = RosterSheet.getRosterizedPeople(
    true,
    true,
    false,
    true
  );
  let commitmentPeopleWithPriority = CommitmentForm.grabPeople();
  let formattedCombinedPeople = formatCombinedPeople(
    rosterPeopleWithPriority,
    commitmentPeopleWithPriority
  );

  let html = HtmlService.createHtmlOutput(
    "<script>google.script.host.close();</script>"
  );
  SpreadsheetApp.getUi().showModalDialog(html, "Closing...");

  priorityUi(formattedCombinedPeople);
  return;
}

function formatCombinedPeople(
  rosterPeopleWithPriority,
  commitmentPeopleWithPriority
) {
  let newPeople = [];
  rosterPeopleWithPriority.forEach((person) => {
    let priority;
    if (priority == null && !person.isEboard) {
      //If priority has not been assigned yet, any rostered are -1
      priority = person.rosterState == RosterStates.Rostered ? -1 : null;
    }
    if (priority == null && !person.isEboard) {
      // If priority not, any waitlist are +1
      priority = person.rosterState == RosterStates.Waitlisted ? 1 : null;
    }
    if (priority == null && !person.isEboard) {
      //if priority not, any non eboard rejected are +1
      priority = 1;
    }
    if (priority == null && person.isEboard) {
      //if priority not, any eboard are 0
      priority = 0;
    }
    let newPerson = {
      email: person.email,
      priority: priority,
    };
    newPeople.push(newPerson);
  });

  commitmentPeopleWithPriority.forEach((commitPerson) => {
    if (
      !rosterPeopleWithPriority.some((rosterPerson) => {
        return commitPerson.email === rosterPerson.email;
      })
    ) {
      let newPerson = {
        email: commitPerson.email,
        priority: 1,
      };
      newPeople.push(newPerson);
    }
  });

  return newPeople;
}

function getRosterPeopleWithPriority() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const startRow = 7;
  const lastRow = sheet.getLastRow();
  const totalPeople = countPeopleOnRosterSheet();
  const data = sheet
    .getRange(startRow, 4, lastRow - startRow + 1, 1)
    .getValues();
  const people = [];

  for (let i = 0; i < data.length; i++) {
    const rowIndex = startRow + i;
    const email = data[i][0];
    if (email) {
      const person = {
        email: email.toLowerCase(),
        priority: rowIndex > totalPeople + 6 - 5 ? 1 : -1,
      };
      people.push(person);
    }
  }
  //flattenEmailsAndAlert(people)
  return people;
}

function getCommitmentPeopleWithPriority(rosterPeopleWithPriority) {
  const mainSheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

  let link = RosterSheet.getCommitmentLink();
  let emailCol = PropHandler.emailCol;
  let externalSpreadsheet;
  try {
    externalSpreadsheet = SpreadsheetApp.openByUrl(link);
  } catch (error) {
    SpreadsheetApp.getUi().alert(
      "Error",
      "Unable to open the commitment spreadsheet. Check the URL and your access permissions.",
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    return [];
  }

  let sheet = externalSpreadsheet.getSheets()[0];
  let data = sheet.getDataRange().getValues();

  let people = [];

  for (let i = 1; i < data.length; i++) {
    let email = data[i][emailCol - 1];

    if (email) {
      email = email.toLowerCase();

      let isDuplicate = rosterPeopleWithPriority.some(function (rosterPerson) {
        return (
          rosterPerson.email
            .toString()
            .trim()
            .toLowerCase()
            .includes(email.trim().toLowerCase()) ||
          email
            .trim()
            .toLowerCase()
            .includes(rosterPerson.email.toString().trim().toLowerCase())
        );
      });

      // Only add if no overlap
      if (!isDuplicate) {
        people.push({
          email: email,
          priority: 1,
        });
      }
    }
  }
  return people;
}

function priorityUi(combinedPeople) {
  let template = HtmlService.createTemplateFromFile("PriorityPointMenu.html");
  let twoDArray = combinedPeople.map((obj) => [obj.email, obj.priority]);
  template.attendeeData = twoDArray;
  let widget = template
    .evaluate()
    .setTitle("Priority Point Menu")
    .setWidth(400);

  SpreadsheetApp.getUi().showSidebar(widget);
  return;
}

//return obj.email && obj.email.toString().toLowerCase().includes("@binghamton.edu");

function processPriorityUi(people) {
  let positivePriority = [];
  let negativePriority = [];

  people.forEach(function (person) {
    if (person.priority === 1) {
      positivePriority.push(person);
    } else if (person.priority === -1) {
      negativePriority.push(person);
    }
  });
  const counter = new AutoPriorityTable();
  const positivePriority1d = positivePriority.map((person) => person.email);
  const negativePriority1d = negativePriority.map((person) => person.email);
  counter.increasePriority(positivePriority1d);
  counter.decreasePriority(negativePriority1d);
  counter.sortSheet();
  let html = HtmlService.createHtmlOutput(
    "<script>google.script.host.close();</script>"
  );
  SpreadsheetApp.getUi().showSidebar(html);
  SpreadsheetApp.getUi().alert(
    "Finished!, Priority list edited, DO NOT SUBMIT PRIORITY FOR THIS TRIP AGAIN"
  );
}

class AutoPriorityTable {
  constructor() {
    // Open the spreadsheet using its URL or ID
    const spreadsheet = SpreadsheetApp.openByUrl(Links.prioritySheetLink); // Or use openById(spreadsheetId) if only ID is provided

    // Get the first sheet in the linked spreadsheet
    this.sheet = spreadsheet.getSheets()[0];

    // Check if the sheet exists
    if (!this.sheet) {
      throw new Error("No sheets found in the linked spreadsheet");
    }
  }

  getHeaderIndices() {
    const headers = this.sheet
      .getRange(1, 1, 1, this.sheet.getLastColumn())
      .getValues()[0];
    const bmailIdx = headers.indexOf("bmail");
    const priorityIdx = headers.indexOf("Priority Level");

    if (bmailIdx === -1 || priorityIdx === -1) {
      throw new Error(
        "The sheet must have 'bmail' and 'Priority Level' columns."
      );
    }

    return { bmailIdx, priorityIdx };
  }
  //TODO refactor a lot of blaot
  getPriorityFromEmail(email) {
    const { bmailIdx, priorityIdx } = this.getHeaderIndices(); //why

    const data = this.sheet.getDataRange().getValues();

    const rowIndex = data.findIndex(
      (row) => row[bmailIdx].toLowerCase() === email
    ); //.tolowercase needed because sheet is unpredictable

    const isFound = rowIndex !== -1;

    let currentPriority = isFound ? data[rowIndex][priorityIdx] : 0;

    return currentPriority;
  }

  increasePriority(emailAddList) {
    const { bmailIdx, priorityIdx } = this.getHeaderIndices();
    const data = this.sheet.getDataRange().getValues();
    const headers = data[0];

    emailAddList.forEach((email) => {
      email = email.toString().toLowerCase();
      let rowIndex = data.findIndex(
        (row) => row[bmailIdx].toLowerCase() === email
      );

      if (rowIndex !== -1) {
        // Email exists, update priority
        const currentPriority = parseInt(data[rowIndex][priorityIdx]) || 0;
        this.sheet
          .getRange(rowIndex + 1, priorityIdx + 1)
          .setValue(currentPriority + 1);
      } else {
        // Email doesn't exist, add new row
        const newRow = Array(headers.length).fill("");
        newRow[bmailIdx] = email;
        newRow[priorityIdx] = 1;
        this.sheet.appendRow(newRow);
      }
    });
  }

  decreasePriority(emailSubList) {
    const { bmailIdx, priorityIdx } = this.getHeaderIndices();
    const data = this.sheet.getDataRange().getValues();

    emailSubList.forEach((email) => {
      email = email.toString().toLowerCase();
      let rowIndex = data.findIndex(
        (row) => row[bmailIdx].toLowerCase() === email
      );

      if (rowIndex !== -1) {
        const currentPriority = parseInt(data[rowIndex][priorityIdx]) || 0;

        // Only decrement if the priority is greater than 0
        if (currentPriority > 0) {
          this.sheet
            .getRange(rowIndex + 1, priorityIdx + 1)
            .setValue(currentPriority - 1);
        }
      } else {
        // Email doesn't exist, set priority to 0
        const newRow = Array(data[0].length).fill("");
        newRow[bmailIdx] = email;
        newRow[priorityIdx] = 0;
        this.sheet.appendRow(newRow);
      }
    });
  }

  sortSheet() {
    const { priorityIdx } = this.getHeaderIndices();
    this.sheet
      .getRange(2, 1, this.sheet.getLastRow() - 1, this.sheet.getLastColumn())
      .sort({ column: priorityIdx + 1, ascending: false });
  }
}

function sortSheet() {
  try {
    const counter = new AutoPriorityTable();
    counter.sortSheet();
    //SpreadsheetApp.getUi().alert('Success', 'Sheet has been sorted.', SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (error) {
    //SpreadsheetApp.getUi().alert('Error', error.toString(), SpreadsheetApp.getUi().ButtonSet.OK);
  }
}
