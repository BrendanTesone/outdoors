/**
 * POST Dispatcher: Routes incoming POST requests to specific AutoRoster functions.
 */
function doPost(e) {
    try {
        const contents = JSON.parse(e.postData.contents);
        switch (contents.action) {
            case 'addFormDate':
                return outputJsonResponse(saveFormCloseDateSettings(contents));
            case 'updateAutoEmailSettings':
                return outputJsonResponse(updateAutoEmailSettings(contents));
            case 'createCommitmentForm':
                return outputJsonResponse(createCommitmentForm(contents));
            case 'saveConfig':
                PropertiesService.getScriptProperties().setProperty(contents.key, contents.value);
                return outputJsonResponse({ success: true, message: 'Property ' + contents.key + ' updated!' });
            case 'getConfigs':
                const allProps = PropertiesService.getScriptProperties().getProperties();
                return outputJsonResponse({ success: true, props: allProps });
            case 'deleteFormDate':
                return outputJsonResponse(deleteFormDateRegistry(contents));
            case 'getPriorityData':
                return outputJsonResponse(getPriorityData());
            case 'adjustPriority':
                return outputJsonResponse(adjustPriority(contents));
            case 'getCommitmentData':
                return outputJsonResponse(getCommitmentDataFromLink(contents));
            case 'getRosterData':
                return outputJsonResponse(getRosterDataFromLink(contents));
            case 'createRosterFromTemplate':
                return outputJsonResponse(createRosterFromTemplate(contents));
            case 'getEboardData':
                return outputJsonResponse(getEboardData());
            case 'clearRoster':
                return outputJsonResponse(clearRoster(contents));
            case 'addPeople':
                return outputJsonResponse(addPeople(contents));
            case 'getRosterLinks':
                return outputJsonResponse(getRosterLinks());
            case 'saveRosterLinks':
                return outputJsonResponse(saveRosterLinks(contents));
            case 'createEmailDraft':
                return outputJsonResponse(createEmailDraft(contents));
            case 'batchAdjustPriority':
                return outputJsonResponse(batchAdjustPriority(contents));
            default:
                return outputJsonResponse({ error: 'Action not found' });
        }

    } catch (err) {
        return outputJsonResponse({ error: 'Backend Error: ' + err.message });
    }

}

/**
 * Entry point for the Web App (GET request).
 * Shows the current array of form dates.
 */
function doGet() {
    const props = PropertiesService.getScriptProperties().getProperties();

    // Parse JSON strings for better readability in the debug view
    Object.keys(props).forEach(key => {
        try {
            props[key] = JSON.parse(props[key]);
        } catch (e) {
            // Keep as string if not JSON
        }
    });

    const html = '<h1>Eboard Tools: Script Properties Registry</h1><pre>' +
        JSON.stringify(props, null, 2) +
        '</pre>';
    return HtmlService.createHtmlOutput(html);
}

/**
 * Helper: Processes and returns a JSON response.
 */
function outputJsonResponse(obj) {
    return ContentService.createTextOutput(JSON.stringify(obj))
        .setMimeType(ContentService.MimeType.JSON);
}
