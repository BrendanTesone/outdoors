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

        // Optional First Trip column: looks for phrase containing BOTH 'first' AND 'trip'/'trips'
        const firstTripTagRegex = /(?=.*first)(?=.*trips?)/i;
        const firstTripIdx = headers.findIndex(h => firstTripTagRegex.test(String(h)));

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

            // Optional First Trip value check
            let isFirstTrip = null;
            if (firstTripIdx !== -1) {
                const rawTripVal = String(row[firstTripIdx]).trim().toLowerCase();
                isFirstTrip = rawTripVal.startsWith("y") || rawTripVal === "true";
            }

            // Priority Logic
            const priority = isEboard ? null : (priorityMap.get(email) ?? 0);

            return {
                name: name,
                email: email,
                isDriver: isDriver,
                isFirstTrip: isFirstTrip,
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

/**
 * API Function: Wrapper around getCommitmentDataFromLink that automatically
 * batch-resolves gender for unknown members, updates the Priority sheet, and attaches gender.
 */
function getCommitmentDataWithGender(payload) {
    // 1. Call original function
    const result = getCommitmentDataFromLink(payload);
    if (!result.success || !result.people || result.people.length === 0) {
        return result;
    }

    try {
        // 2. Resolve missing genders in batch & update Priority Sheet
        updateGenderForPeople({ people: result.people });

        // 3. Read back updated priority & gender data from Priority Sheet
        const priorityResult = getPriorityData();
        const genderMap = new Map();
        if (priorityResult.success) {
            priorityResult.people.forEach(p => {
                if (p.email && p.gender) {
                    genderMap.set(String(p.email).trim().toLowerCase(), String(p.gender).toLowerCase());
                }
            });
        }

        // 4. Attach gender to each person in commitment list
        const enrichedPeople = result.people.map(p => ({
            ...p,
            gender: genderMap.get(String(p.email).trim().toLowerCase()) || null,
        }));

        return {
            ...result,
            people: enrichedPeople
        };
    } catch (err) {
        // If gender resolution fails, return original result gracefully
        return result;
    }
}

