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
                const scriptProps = PropertiesService.getScriptProperties();
                let list = JSON.parse(scriptProps.getProperty('FORM_DATES_LIST') || '[]');
                list = list.filter(item => item.formLink !== contents.formLink);
                scriptProps.setProperty('FORM_DATES_LIST', JSON.stringify(list));
                return outputJsonResponse({ success: true, message: 'Removed from schedule.' });
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
