/**
 * API Function: Adds or updates a form close date in an array within Script Properties.
 * Replaces the old AddDate.js functionality.
 */
function saveFormCloseDateSettings(payload) {
    validateFormAccess(payload);

    const props = PropertiesService.getScriptProperties();
    const rawData = props.getProperty('FORM_DATES_LIST') || '[]';
    let formDates = JSON.parse(rawData);

    const targetLink = (payload.formLink || '').trim();
    const newEntry = {
        formLink: targetLink,
        closeDate: payload.date
    };

    // Check if we already have an entry for this form to update it, otherwise append
    const existingIndex = formDates.findIndex(item => (item.formLink || '').trim() === targetLink);
    if (existingIndex > -1) {
        formDates[existingIndex] = newEntry;
    } else {
        formDates.push(newEntry);
    }

    // Save the synchronized array back to Script Properties
    props.setProperty('FORM_DATES_LIST', JSON.stringify(formDates));

    return {
        success: true,
        message: 'Added Close Date for Form to the registry.',
        allDates: formDates
    };
}

/**
 * API Function: Validates if a Google Form link is accessible.
 */
function validateFormAccess(payload) {
    const target = payload.formLink;
    if (!target) return;
    try {
        FormApp.openByUrl(target);
    } catch (err) {
        throw new Error('Form Access Error: Check link.');
    }
}

/**
 * Timer-triggered function to close expired forms from the registry.
 */
function closeForms() {
    const props = PropertiesService.getScriptProperties();
    const rawData = props.getProperty('FORM_DATES_LIST') || '[]';
    let formDates = JSON.parse(rawData);
    const currentTime = new Date();

    const initialCount = formDates.length;

    // Filter out and close expired forms
    const remainingDates = formDates.filter(entry => {
        const formDate = new Date(entry.closeDate);

        // If form is expired (time diff <= 0)
        if (formDate - currentTime <= 0) {
            try {
                const form = FormApp.openByUrl(entry.formLink);
                form.setAcceptingResponses(false);
                console.log('Successfully closed expired form:', entry.formLink);
            } catch (e) {
                console.error('Failed to close form:', entry.formLink, e.message);
            }
            return false; // Remove from array
        }
        return true; // Keep in array
    });

    // Save back only if forms were removed
    if (remainingDates.length !== initialCount) {
        props.setProperty('FORM_DATES_LIST', JSON.stringify(remainingDates));
    }
}
/**
 * API Function: Removes a form link from the registry.
 */
function deleteFormDateRegistry(payload) {
    const props = PropertiesService.getScriptProperties();
    const rawData = props.getProperty('FORM_DATES_LIST') || '[]';
    let formDates = JSON.parse(rawData);

    const target = (payload.formLink || '').trim();
    const initialCount = formDates.length;

    // Filter out the specific link
    const remaining = formDates.filter(item => (item.formLink || '').trim() !== target);

    if (remaining.length !== initialCount) {
        props.setProperty('FORM_DATES_LIST', JSON.stringify(remaining));
        return { success: true, message: 'Schedule removed.' };
    }

    return { success: false, error: 'Link not found in registry.' };
}
