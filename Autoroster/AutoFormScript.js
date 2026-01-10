function commitmentFormMain(){
  let htmlOutput = HtmlService.createHtmlOutputFromFile('AutoForm')
    .setTitle('Form Generator')
    .setWidth(600);
  SpreadsheetApp.getUi().showSidebar(htmlOutput);
}

function formatDate(date) {
  let newDate = new Date(date);
  let month = newDate.getMonth() + 1; // getMonth() returns 0-11, so we add 1
  let day = newDate.getDate();
  let year = newDate.getFullYear();
  
  // Ensure two digits for month and day
  if (month < 10) month = '0' + month;
  if (day < 10) day = '0' + day;

  return month + '/' + day + '/' + year;
}

function getDayName(date) {
  let daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  let newDate = new Date(date);
  let dayIndex = newDate.getDay(); // getDay() returns 0 for Sunday, 1 for Monday, etc.
  return daysOfWeek[dayIndex];
}

function getHoursAndMinutes(date) {
  let newDate = new Date(date);
  let hours = newDate.getHours();
  let minutes = newDate.getMinutes();
  let ampm = hours >= 12 ? 'PM' : 'AM';

  // Convert 24-hour time to 12-hour time
  hours = hours % 12 || 12;

  // Ensure two digits for minutes
  if (minutes < 10) minutes = '0' + minutes;

  return hours + ':' + minutes + ' ' + ampm;
}

function processAutoFormData(formData){
  loadingDialog();
  let title = formData.title;
  let eventDate = formData.date;
  let closeDate = formData.close_date;
  let meetingPlace = formData.meeting_place;
  let returnTime = formData.return_time;
  let day = getDayName(eventDate)
  let formattedDate = formatDate(eventDate);
  let hrsAndMins = getHoursAndMinutes(eventDate);


  let form = FormApp.create(title+" Commitment Form " + formattedDate);

  form.setDescription("Date: "+ day + " " + formattedDate + "\nMeeting place/time: "+ hrsAndMins + " " + meetingPlace+"\nReturn time: "+returnTime);
  
  form.addTextItem()
      .setTitle("Name? (First and Last)")
      .setRequired(true);
      
  form.addTextItem()
      .setTitle("Bmail (include @binghamton.edu)")
      .setRequired(true);
      
  form.addMultipleChoiceItem()
      .setTitle("Is your car registered on B-Engaged and are you willing to drive people?")
      .setChoiceValues(["Yes", "No"])
      .setRequired(true);
      
  form.addMultipleChoiceItem()
      .setTitle("Is your B-Engaged form filled out?")
      .setChoiceValues(["Yes", "No", "Pending..."])
      .setRequired(true);
  moveFormAndShowSidebar(form);
  let formManager = new FormManager();
  formManager.addFormDateToSheet(form.getEditUrl(),closeDate);
  return;
}

function moveFormAndShowSidebar(form) {
  let editLink = form.getEditUrl();  
  let folderId = Links.commitmentFormFolderId;
  let fileId = form.getId();
  let folder = DriveApp.getFolderById(folderId);
  DriveApp.getFileById(fileId).moveTo(folder);
  closeDialog()
  showLinkImageSidebar(editLink,form)
  return;
}

function showLinkImageSidebar(link,form) {
  let imageLink = "https://api.qrserver.com/v1/create-qr-code/?size=500x500&data="+form.getPublishedUrl();
  const template = HtmlService.createTemplateFromFile('AutoFormGenSideBar');
  template.link = link; // Default link
  template.imageUrl = imageLink; // Default image
  const htmlOutput = template.evaluate().setTitle('Link and Image Display');
  SpreadsheetApp.getUi().showSidebar(htmlOutput);
  return;
}