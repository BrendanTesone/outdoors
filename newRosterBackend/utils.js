/**
 * Helper Utilities for handling Google Sheets.
 */

/**
 * Helper: Find column index by header name pattern.
 */
function findColumnByHeader(headers, patterns) {
    for (let i = 0; i < headers.length; i++) {
        const header = String(headers[i]).toUpperCase();
        if (patterns.some(p => header.indexOf(p) !== -1)) {
            return i;
        }
    }
    return -1;
}
