/**
 * Logic for handling Roster spreadsheets.
 */

/**
 * API Function: Fetches and interprets data from a Roster spreadsheet.
 */
function getRosterDataFromLink(payload) {
    try {
        const link = payload.link;
        if (!link) throw new Error("No link provided.");

        const ss = SpreadsheetApp.openByUrl(link);
        const sheet = ss.getSheets()[0];
        const data = sheet.getDataRange().getValues();

        let headerRowIdx = -1;
        let nameIdx = -1;
        let emailIdx = -1;
        let driveIdx = -1;

        // Search for the header row containing 'Name', 'Mail', and 'Drive'
        for (let i = 0; i < Math.min(data.length, 50); i++) {
            const row = data[i].map(cell => String(cell).toUpperCase());
            const nIdx = row.findIndex(cell => cell.indexOf("NAME") !== -1);
            const eIdx = row.findIndex(cell => cell.indexOf("MAIL") !== -1);
            const dIdx = row.findIndex(cell => cell.indexOf("DRIVE") !== -1);

            if (nIdx !== -1 && eIdx !== -1 && dIdx !== -1) {
                headerRowIdx = i;
                nameIdx = nIdx;
                emailIdx = eIdx;
                driveIdx = dIdx;
                break;
            }
        }

        if (headerRowIdx === -1) {
            throw new Error("Could not find a header row containing 'Name', 'Mail', and 'Drive'.");
        }

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

        const people = data.slice(headerRowIdx + 1).map((row, index) => {
            const email = String(row[emailIdx]).trim().toLowerCase();
            const name = nameIdx !== -1 ? String(row[nameIdx]).trim() : "";
            const driverVal = driveIdx !== -1 ? String(row[driveIdx]).trim().toLowerCase() : "";

            // All items (Name, Email, Driver) are required
            if (!name || !email || !driverVal) {
                return null;
            }

            const isDriver = driverVal === "yes" || driverVal === "true" || driverVal.startsWith("y");
            const isEboard = eboardEmails.has(email);

            // Priority Logic:
            // 1. If isEboard -> null
            // 2. Otherwise -> priority from sheet or 0
            const priority = isEboard ? null : (priorityMap.get(email) ?? 0);

            return {
                name: name,
                email: email,
                isDriver: isDriver,
                priority: priority,
                isEboard: isEboard,
                rosterState: null
            };
        }).filter(p => p !== null);

        return { success: true, people, id: ss.getId() };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

/**
 * API Function: Copies a roster template to a specific folder and returns the link.
 */
function createRosterFromTemplate(payload) {
    try {
        const props = PropertiesService.getScriptProperties().getProperties();
        const templateId = props.ROSTER_TEMPLATE_ID;
        const folderId = props.ROSTER_FOLDER_ID;

        if (!templateId) throw new Error("Roster Template ID not set in Config.");
        if (!folderId) throw new Error("Roster Destination Folder ID not set in Config.");

        const templateFile = DriveApp.getFileById(templateId);
        const destinationFolder = DriveApp.getFolderById(folderId);

        let newFileName = payload.rosterName || "";
        if (!newFileName.trim()) {
            const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm");
            newFileName = "Roster Copy - " + timestamp;
        }

        const newFile = templateFile.makeCopy(newFileName, destinationFolder);
        newFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.EDIT);

        return {
            success: true,
            message: "New roster created successfully!",
            link: newFile.getUrl(),
            name: newFileName
        };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

/**
 * API Function: Clears roster data and resets formulas using a row-by-row loop.
 */
function clearRoster(payload) {
    try {
        const link = payload.link;
        if (!link) throw new Error("No link provided.");

        const ss = SpreadsheetApp.openByUrl(link);
        const sheet = ss.getSheets()[0];

        const startRow = 7;
        const endRow = 200;

        // Loop from startRow up to and including endRow
        for (let i = startRow; i <= endRow; i++) {
            sheet.getRange(i, 1).setValue(""); // Column A
            sheet.getRange(i, 4).setValue(""); // Column D
            sheet.getRange(i, 6).setValue(""); // Column F

            // Column B Formula
            sheet.getRange(i, 2).setValue(
                "=IFERROR(LEFT(A" + i + ',SEARCH(" ",A' + i + ')),"Paste Full Name into Column A")'
            );

            // Column C Formula
            sheet.getRange(i, 3).setValue("=REPLACE(A" + i + ",1,LEN(B" + i + '),"")');

            // Column E Formula
            sheet.getRange(i, 5).setValue(
                '=IF(Sheet1!$B$7:$B$49="Paste Full Name into Column A","",C' + i + '&" "&LEFT(B' + i + ",1))"
            );
        }

        return { success: true, message: "Roster reset logic applied across all " + endRow + " rows." };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

/**
 * API Function: Adds a list of people to the roster sheet.
 * Skips duplicates based on email (Column D).
 */
function addPeople(payload) {
    try {
        const link = payload.link;
        const people = payload.people;
        if (!link) throw new Error("No link provided.");
        if (!people || !Array.isArray(people)) throw new Error("No people array provided.");

        const ss = SpreadsheetApp.openByUrl(link);
        const sheet = ss.getSheets()[0];

        const startRow = 7;
        const emailCol = 4; // Column D
        const nameCol = 1;  // Column A
        const driveCol = 6; // Column F

        // 1. Get existing emails to avoid duplicates
        const lastRow = sheet.getLastRow();
        let existingEmails = new Set();
        if (lastRow >= startRow) {
            const emails = sheet.getRange(startRow, emailCol, lastRow - startRow + 1, 1).getValues();
            emails.forEach(row => {
                const email = String(row[0]).trim().toLowerCase();
                if (email) existingEmails.add(email);
            });
        }

        let addedCount = 0;
        let skippedCount = 0;

        // 2. Add each person
        for (const person of people) {
            const email = String(person.email || "").trim().toLowerCase();
            if (!email) {
                skippedCount++;
                continue;
            }

            if (existingEmails.has(email)) {
                skippedCount++;
                continue;
            }

            // Find next empty row
            let nextRow = startRow;
            while (true) {
                const values = sheet.getRange(nextRow, 1, 1, 6).getValues()[0];
                const aVal = String(values[nameCol - 1]).trim();
                const dVal = String(values[emailCol - 1]).trim();
                const fVal = String(values[driveCol - 1]).trim();

                if (!aVal && !dVal && !fVal) {
                    break;
                }
                nextRow++;
            }

            // Set values
            sheet.getRange(nextRow, nameCol).setValue(String(person.name || "").trim());
            sheet.getRange(nextRow, emailCol).setValue(email);
            sheet.getRange(nextRow, driveCol).setValue(person.isDriver ? "Yes" : "No");

            existingEmails.add(email);
            addedCount++;
        }

        return {
            success: true,
            message: `Added ${addedCount} people, skipped ${skippedCount} (duplicates or invalid).`
        };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

/**
 * API Function: Fetches the stored roster links from Script Properties.
 */
function getRosterLinks() {
    try {
        const props = PropertiesService.getScriptProperties();
        const stored = props.getProperty('ROSTER_LINKS');
        return {
            success: true,
            links: stored ? JSON.parse(stored) : []
        };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

/**
 * API Function: Saves the roster links array to Script Properties.
 */
function saveRosterLinks(payload) {
    try {
        const links = payload.links;
        if (!Array.isArray(links)) throw new Error("Invalid links format.");

        PropertiesService.getScriptProperties().setProperty('ROSTER_LINKS', JSON.stringify(links));
        return { success: true, message: "Roster links updated successfully." };
    } catch (err) {
        return { success: false, error: err.message };
    }
}
