/**
 * Helper: Gets the configured Priority Sheet.
 */
function getPrioritySheet() {
    const props = PropertiesService.getScriptProperties();
    const sheetId = props.getProperty('PRIORITY_SHEET_ID');
    if (!sheetId) throw new Error("Priority Sheet ID not configured in Tools Config.");

    const ss = SpreadsheetApp.openById(sheetId);
    let sheet = ss.getSheetByName("Priority");
    if (!sheet) {
        // Create if doesn't exist? Or just use first sheet. 
        // Let's assume the user creates a sheet named "Priority" or we use the first one.
        sheet = ss.getSheets()[0];
    }
    return sheet;
}

/**
 * API Function: Fetches all people and their priority scores.
 */
function getPriorityData() {
    try {
        const sheet = getPrioritySheet();
        const sheetId = sheet.getParent().getId();
        const data = sheet.getDataRange().getValues();
        if (data.length < 2) return { success: true, people: [], sheetId };

        const headers = data[0]; // Email, Name, Priority, Gender
        const emailIdx = headers.indexOf("Email");
        const nameIdx = headers.indexOf("Name");
        const priorityIdx = headers.indexOf("Priority");
        const genderIdx = headers.indexOf("Gender");

        if (emailIdx === -1 || priorityIdx === -1) {
            throw new Error("Sheet headers must include 'Email' and 'Priority'.");
        }

        const people = data.slice(1).map(row => {
            const gender = genderIdx !== -1 ? String(row[genderIdx]).trim() : '';
            return {
                email: String(row[emailIdx]).trim(),
                name: nameIdx !== -1 ? String(row[nameIdx]).trim() : "",
                priority: Number(row[priorityIdx]) || 0,
                gender: gender || null,
            };
        }).filter(p => p.email !== "");

        return { success: true, people, sheetId };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

/**
 * API Function: Adjusts a person's priority.
 */
function adjustPriority(payload) {
    const lock = LockService.getScriptLock();
    try {
        // Wait up to 30 seconds for the lock
        lock.waitLock(30000);

        const sheet = getPrioritySheet();
        const data = sheet.getDataRange().getValues();
        const headers = data[0];

        const emailIdx = headers.indexOf("Email");
        const nameIdx = headers.indexOf("Name");
        const priorityIdx = headers.indexOf("Priority");

        if (emailIdx === -1 || priorityIdx === -1) {
            throw new Error("Sheet headers must include 'Email' and 'Priority'.");
        }

        const targetEmail = (payload.email || "").trim().toLowerCase();
        const amount = Number(payload.amountChange) || 0;
        const targetName = (payload.name || "").trim();

        let foundRowIndex = -1;
        for (let i = 1; i < data.length; i++) {
            if (String(data[i][emailIdx]).trim().toLowerCase() === targetEmail) {
                foundRowIndex = i + 1; // 1-indexed
                break;
            }
        }

        if (foundRowIndex !== -1) {
            // Re-fetch the specific cell for maximum accuracy
            const currentVal = Number(sheet.getRange(foundRowIndex, priorityIdx + 1).getValue()) || 0;
            const newVal = currentVal + amount;
            sheet.getRange(foundRowIndex, priorityIdx + 1).setValue(newVal);

            // Force the write to complete before the lock is released
            SpreadsheetApp.flush();

            return { success: true, message: "Priority updated for " + targetEmail, newValue: newVal };
        } else {
            // Add new person
            const newRow = [];
            headers.forEach((h, i) => {
                if (i === emailIdx) newRow.push(targetEmail);
                else if (i === nameIdx) newRow.push(targetName);
                else if (i === priorityIdx) newRow.push(amount);
                else newRow.push("");
            });
            sheet.appendRow(newRow);
            return { success: true, message: "New person added with priority " + amount, newValue: amount };
        }
    } catch (err) {
        return { success: false, error: err.message };
    } finally {
        lock.releaseLock();
    }
}
/**
 * API Function: Batch adjusts priority for multiple people.
 * Payload: { adjustments: [{ email, amountChange, name }, ...] }
 */
function batchAdjustPriority(payload) {
    const lock = LockService.getScriptLock();
    try {
        lock.waitLock(30000);

        const sheet = getPrioritySheet();
        const data = sheet.getDataRange().getValues();
        const headers = data[0];

        const emailIdx = headers.indexOf("Email");
        const nameIdx = headers.indexOf("Name");
        const priorityIdx = headers.indexOf("Priority");

        if (emailIdx === -1 || priorityIdx === -1) {
            throw new Error("Sheet headers must include 'Email' and 'Priority'.");
        }

        const adjustments = payload.adjustments || [];
        const results = [];

        // Create a map of existing emails to row indices
        const emailRowMap = new Map();
        for (let i = 1; i < data.length; i++) {
            const email = String(data[i][emailIdx]).trim().toLowerCase();
            if (email) emailRowMap.set(email, i + 1);
        }

        adjustments.forEach(adj => {
            const email = (adj.email || "").trim().toLowerCase();
            const amount = Number(adj.amountChange);
            const name = (adj.name || "").trim();

            if (!email || amount === 0) return;

            if (emailRowMap.has(email)) {
                // Update existing
                const rowIndex = emailRowMap.get(email);
                const currentVal = Number(sheet.getRange(rowIndex, priorityIdx + 1).getValue()) || 0;
                const newVal = currentVal + amount;
                sheet.getRange(rowIndex, priorityIdx + 1).setValue(newVal);

                // If existing row has an empty name and a name is provided, fill it
                if (nameIdx !== -1 && name) {
                    const currentName = String(sheet.getRange(rowIndex, nameIdx + 1).getValue()).trim();
                    if (!currentName) {
                        sheet.getRange(rowIndex, nameIdx + 1).setValue(name);
                    }
                }
                results.push(`Updated ${email}: ${newVal}`);
            } else {
                // Add new person
                const maxCols = Math.max(headers.length, genderIdx !== -1 ? genderIdx + 1 : 0);
                const newRow = [];
                for (let c = 0; c < maxCols; c++) {
                    if (c === emailIdx) newRow.push(email);
                    else if (c === nameIdx) newRow.push(name);
                    else if (c === priorityIdx) newRow.push(amount);
                    else newRow.push("");
                }
                sheet.appendRow(newRow);
                emailRowMap.set(email, sheet.getLastRow());
                results.push(`Added ${email}: ${amount}`);
            }
        });

        SpreadsheetApp.flush();

        // Attempt gender resolution for any added/updated people with names
        try {
            const peopleForGender = adjustments
                .filter(adj => adj.email && adj.name)
                .map(adj => ({ email: adj.email, name: adj.name }));
            if (peopleForGender.length > 0) {
                updateGenderForPeople({ people: peopleForGender });
            }
        } catch (gErr) {
            console.warn("Gender resolution during batch priority update skipped: " + gErr.message);
        }

        return { success: true, message: `Processed ${results.length} adjustments.` };

    } catch (err) {
        return { success: false, error: err.message };
    } finally {
        lock.releaseLock();
    }
}
