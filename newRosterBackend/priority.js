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

        const headers = data[0]; // Email, Name, Priority
        const emailIdx = headers.indexOf("Email");
        const nameIdx = headers.indexOf("Name");
        const priorityIdx = headers.indexOf("Priority");

        if (emailIdx === -1 || priorityIdx === -1) {
            throw new Error("Sheet headers must include 'Email' and 'Priority'.");
        }

        const people = data.slice(1).map(row => ({
            email: String(row[emailIdx]).trim(),
            name: nameIdx !== -1 ? String(row[nameIdx]).trim() : "",
            priority: Number(row[priorityIdx]) || 0
        })).filter(p => p.email !== "");

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
                results.push(`Updated ${email}: ${newVal}`);
            } else {
                // Add new
                const newRow = [];
                headers.forEach((h, i) => {
                    if (i === emailIdx) newRow.push(email);
                    else if (i === nameIdx) newRow.push(name);
                    else if (i === priorityIdx) newRow.push(amount);
                    else newRow.push("");
                });
                sheet.appendRow(newRow);
                // Update map for future refs in same batch (unlikely but safe)
                emailRowMap.set(email, sheet.getLastRow()); // imprecise if concurrent, but we have lock
                results.push(`Added ${email}: ${amount}`);
            }
        });

        SpreadsheetApp.flush();
        return { success: true, message: `Processed ${results.length} adjustments.` };

    } catch (err) {
        return { success: false, error: err.message };
    } finally {
        lock.releaseLock();
    }
}
