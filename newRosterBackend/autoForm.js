/**
 * API Function: Creates a new Commitment Form from template parameters.
 */
function createCommitmentForm(payload) {
    const title = payload.title;
    const eventDate = new Date(payload.eventDate);
    const closeDate = payload.closeDate;
    const meetingPlace = payload.meetingPlace;
    const returnTime = payload.returnTime;

    const tz = Session.getScriptTimeZone();
    const formattedDate = Utilities.formatDate(eventDate, tz, "MM/dd/yyyy");
    const dayName = Utilities.formatDate(eventDate, tz, "EEEE");
    const hrsAndMins = Utilities.formatDate(eventDate, tz, "h:mm a");

    // 1. Create the Form
    const formTitle = title + " Commitment Form " + formattedDate;
    const form = FormApp.create(formTitle);

    const description = "Date: " + dayName + " " + formattedDate +
        "\nMeeting place/time: " + hrsAndMins + " " + meetingPlace +
        "\nReturn time: " + returnTime;

    form.setDescription(description);

    // 2. Add Standard Questions
    form.addTextItem().setTitle("Name? (First and Last)").setRequired(true);
    form.addTextItem().setTitle("Bmail (include @binghamton.edu)").setRequired(true);
    form.addMultipleChoiceItem()
        .setTitle("Is your car registered on B-Engaged and are you willing to drive people?")
        .setChoiceValues(["Yes", "No"])
        .setRequired(true);
    form.addMultipleChoiceItem()
        .setTitle("Is your B-Engaged form filled out?")
        .setChoiceValues(["Yes", "No", "Pending..."])
        .setRequired(true);

    // 3. Move Form to Folder
    const props = PropertiesService.getScriptProperties();
    const folderId = props.getProperty('COMMITMENT_FORM_FOLDER_ID');

    try {
        const file = DriveApp.getFileById(form.getId());
        DriveApp.getFolderById(folderId).addFile(file);
        DriveApp.getRootFolder().removeFile(file);
    } catch (e) {
        console.error("Failed to move form to folder:", e.message);
    }

    // 4. Register the Close Date in our registry
    // This reuses the logic from saveFormCloseDateSettings in addDate.js
    const closePayload = {
        formLink: form.getEditUrl(),
        date: closeDate
    };
    saveFormCloseDateSettings(closePayload);

    return {
        success: true,
        message: "Commitment Form created successfully!",
        editUrl: form.getEditUrl(),
        publishedUrl: form.getPublishedUrl()
    };
}
