/**
 * Logic for handling Commitment Form spreadsheets.
 */

/**
 * API Function: Fetches and interprets data from a Commitment Form spreadsheet.
 */
function getCommitmentDataFromLink(payload) {
    try {
        const link = payload.link;
        if (!link) throw new Error("No link provided.");

        const ss = SpreadsheetApp.openByUrl(link);
        const sheet = ss.getSheets()[0];
        const data = sheet.getDataRange().getValues();

        if (data.length < 1) return { success: true, people: [] };

        const headers = data[0];
        const nameIdx = findColumnByHeader(headers, ["NAME"]);
        const emailIdx = findColumnByHeader(headers, ["MAIL"]);
        const driveIdx = findColumnByHeader(headers, ["DRIVE", "CAR"]);
        const timestampIdx = 0;

        if (emailIdx === -1) throw new Error("Could not find Email column.");

        // Fetch eboard members for lookup
        const eboardResult = getEboardData();
        const eboardEmails = new Set();
        if (eboardResult.success) {
            eboardResult.members.forEach(m => eboardEmails.add(String(m.email).trim().toLowerCase()));
        }

        // Fetch priority data for lookup
        const priorityResult = getPriorityData();
        const priorityMap = new Map();
        if (priorityResult.success) {
            priorityResult.people.forEach(p => priorityMap.set(String(p.email).trim().toLowerCase(), p.priority));
        }

        const people = data.slice(1).map(row => {
            const email = String(row[emailIdx]).trim().toLowerCase();
            const name = nameIdx !== -1 ? String(row[nameIdx]).trim() : "";
            const driverVal = driveIdx !== -1 ? String(row[driveIdx]).trim().toLowerCase() : "";

            // All items (Name, Email, Driver) are required
            if (!name || !email || !email.includes("@binghamton.edu") || !driverVal) {
                return null;
            }

            const isDriver = driverVal.startsWith("y") || driverVal === "yes" || driverVal === "true";
            const isEboard = eboardEmails.has(email);

            // Priority Logic
            const priority = isEboard ? null : (priorityMap.get(email) ?? 0);

            return {
                name: name,
                email: email,
                isDriver: isDriver,
                submissionDateAndTime: row[timestampIdx] instanceof Date ? row[timestampIdx].toISOString() : row[timestampIdx],
                priority: priority,
                isEboard: isEboard,
            };
        }).filter(p => p !== null);

        return { success: true, people, id: ss.getId() };
    } catch (err) {
        return { success: false, error: err.message };
    }
}
