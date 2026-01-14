/**
 * Logic for handling Eboard spreadsheets.
 */

/**
 * API Function: Fetches all eboard members from the configured eboard sheet.
 */
function getEboardData() {
    try {
        const props = PropertiesService.getScriptProperties().getProperties();
        const eboardId = props.EBOARD_SHEET_ID;
        if (!eboardId) throw new Error("Eboard Sheet ID not set in Config.");

        const ss = SpreadsheetApp.openById(eboardId);
        const sheet = ss.getSheets()[0];
        const data = sheet.getDataRange().getValues();

        // Assuming headers in row 1, data starts row 2
        // Based on existing logic: name in Col A, email in Col B
        const members = data.slice(1).map(row => ({
            name: String(row[0]).trim(),
            email: String(row[1]).trim().toLowerCase()
        })).filter(m => m.name && m.email);

        return {
            success: true,
            members,
            url: ss.getUrl()
        };
    } catch (err) {
        return { success: false, error: err.message };
    }
}
