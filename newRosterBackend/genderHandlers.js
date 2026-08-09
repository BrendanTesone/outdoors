/**
 * Gender detection using the Namsor API.
 * Reads/writes gender data to a "Gender" column in the Priority sheet.
 */

const NAMSOR_API_KEY = '6b8fa7c4cf645e503c84506034caa8c7';
const NAMSOR_URL = 'https://v2.namsor.com/NamSorAPIv2/api2/json/genderFullBatch';

/**
 * API Function: For people missing gender in the priority sheet,
 * calls the Namsor API and writes the result back.
 * Payload: { people: [{ name, email }, ...] }
 * Only sends people whose email has no gender yet.
 */
function updateGenderForPeople(payload) {
    try {
        const sheet = getPrioritySheet();
        const data = sheet.getDataRange().getValues();
        const headers = data[0];

        const emailIdx = headers.indexOf('Email');
        const nameIdx = headers.indexOf('Name');
        const priorityIdx = headers.indexOf('Priority');
        const genderIdx = headers.indexOf('Gender');

        if (emailIdx === -1) throw new Error("Priority sheet missing 'Email' column.");

        // If there's no Gender column yet, add it to header row
        let resolvedGenderIdx = genderIdx;
        if (genderIdx === -1) {
            const newColNum = headers.length + 1;
            sheet.getRange(1, newColNum).setValue('Gender');
            resolvedGenderIdx = headers.length; // 0-indexed
        }

        // Build a map of email → current gender value from the sheet
        const existingGenderMap = new Map();
        for (let i = 1; i < data.length; i++) {
            const email = String(data[i][emailIdx]).trim().toLowerCase();
            const gender = genderIdx !== -1 ? String(data[i][genderIdx]).trim() : '';
            if (email) existingGenderMap.set(email, gender);
        }

        // Determine which people still need gender (empty or missing)
        const incoming = (payload.people || []).filter(p => p.email && p.name);
        const toFetch = incoming.filter(p => {
            const g = existingGenderMap.get(String(p.email).trim().toLowerCase());
            return !g || g === '' || g === 'null';
        });

        if (toFetch.length === 0) {
            return { success: true, message: 'No new genders to fetch.', updated: 0 };
        }

        // Call Namsor API with fail-safe error handling
        let apiData = null;
        try {
            const personalNames = toFetch.map(p => ({ name: p.name, id: String(p.email).trim().toLowerCase() }));
            const response = UrlFetchApp.fetch(NAMSOR_URL, {
                method: 'POST',
                headers: {
                    'X-API-KEY': NAMSOR_API_KEY,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
                payload: JSON.stringify({ personalNames }),
                muteHttpExceptions: true,
            });

            if (response.getResponseCode() === 200) {
                apiData = JSON.parse(response.getContentText());
            } else {
                console.warn('Namsor API warning: HTTP ' + response.getResponseCode());
                return { success: false, error: 'Namsor API error HTTP ' + response.getResponseCode() };
            }
        } catch (fetchErr) {
            console.warn('Namsor fetch failed: ' + fetchErr.message);
            return { success: false, error: fetchErr.message };
        }

        const results = apiData.personalNames || [];

        // Build a map of email → likelyGender from API response
        const genderResultMap = new Map();
        results.forEach(r => {
            if (r.id) genderResultMap.set(String(r.id).trim().toLowerCase(), r.likelyGender || 'unknown');
        });

        // Re-read fresh sheet state
        const freshData = sheet.getDataRange().getValues();
        const emailRowMap = new Map();
        for (let i = 1; i < freshData.length; i++) {
            const email = String(freshData[i][emailIdx]).trim().toLowerCase();
            if (email) emailRowMap.set(email, i + 1); // 1-indexed row
        }

        const nameMap = new Map();
        toFetch.forEach(p => nameMap.set(String(p.email).trim().toLowerCase(), p.name));

        let updatedCount = 0;

        genderResultMap.forEach((gender, email) => {
            if (emailRowMap.has(email)) {
                // Update existing row
                const rowIndex = emailRowMap.get(email);
                sheet.getRange(rowIndex, resolvedGenderIdx + 1).setValue(gender);
                updatedCount++;
            } else {
                // Append new row for person not in Priority sheet yet
                const personName = nameMap.get(email) || '';
                const maxCols = Math.max(headers.length, resolvedGenderIdx + 1);
                const newRow = [];
                for (let c = 0; c < maxCols; c++) {
                    if (c === emailIdx) newRow.push(email);
                    else if (c === nameIdx) newRow.push(personName);
                    else if (c === priorityIdx) newRow.push(0);
                    else if (c === resolvedGenderIdx) newRow.push(gender);
                    else newRow.push('');
                }
                sheet.appendRow(newRow);
                updatedCount++;
            }
        });

        SpreadsheetApp.flush();
        return { success: true, message: `Updated gender for ${updatedCount} people.`, updated: updatedCount };

    } catch (err) {
        return { success: false, error: err.message };
    }
}
