const RosterStates = {
  Rostered: "Rostered",
  Waitlisted: "Waitlisted",
  Rejected: "Rejected",
};

class Person {
  constructor(
    name,
    email,
    priority,
    isDriver,
    isEboard,
    submissionDateAndTime,
    rosterState,
    gender = null,
  ) {
    this.name = name;
    this.email = email;
    this.priority = priority;
    this.isDriver = isDriver;
    this.isEboard = isEboard;
    this.submissionDateAndTime = submissionDateAndTime;
    this.rosterState = rosterState;
    this.gender = gender;
  }
}

function askQuestion(question) {
  let ui = SpreadsheetApp.getUi(); // Get the UI instance of the spreadsheet
  let response = ui.prompt(question); // Ask the question with a default value

  // Check the user's response
  if (response.getSelectedButton() == ui.Button.OK) {
    return response.getResponseText(); // Return the user's response
  } else {
    return null; // Return null if the user cancels
  }
}

class Links {
  static get eboardSheetLink() {
    const eboardSheetLink =
      "https://docs.google.com/spreadsheets/d/1hpI6k0T61vYo-EAhIgw4Av60rYV6iVneR5QACeVK_vg/edit";
    return eboardSheetLink;
  }

  static get prioritySheetLink() {
    // real one
    const prioritySheetLink =
      "https://docs.google.com/spreadsheets/d/1ds7PMbDj8vgjsMEKhYsQXrAMl5cKrtSjt2cZmSlZEfo/edit";

    //fake one
    //const prioritySheetLink = "https://docs.google.com/spreadsheets/d/1jrW0vy0ovjbIse88-9i9HmGr6s8sB0i7NdcGPM7COMc/edit";

    return prioritySheetLink;
  }

  static get autoEmailSheet() {
    return "https://docs.google.com/spreadsheets/d/1QT0JWlgshEXkQfSJRFnCi1DZyBIyBarbu9b6GcSv-y0/edit";
  }

  static get commitmentFormFolderId() {
    return "1Tfzre1xSvQA6E_LWb8xNFIe_b_DBMqHr";
  }

  static get formTrackerUrl() {
    return "https://docs.google.com/spreadsheets/d/1V4wVIo_mDtveqWhh7G08rZBPp7QDhlwJMkPhqnd6wec/edit";
  }
  
  static get genderSheetLink(){
    return "https://docs.google.com/spreadsheets/d/1qu-vc9DFA5nNd0F3SfsXC5Qux6nDJwL6F1uVDR-224A/edit";
  }
}
