/**
 * API Function: Saves the Auto-Reply Slideshow Bot settings to Script Properties.
 * This is called from the React frontend.
 */
function updateAutoEmailSettings(payload) {
    try {
        const props = PropertiesService.getScriptProperties();

        // Save the direct property for the processing logic
        props.setProperty('SLIDESHOW_LINK', payload.link);
        props.setProperty('IS_STANDARD_TIME', String(payload.isStandardTime));

        // Optional: Still handle sharing permissions if a link is provided
        if (payload.link) {
            try {
                const fileIdMatch = payload.link.match(/[-\w]{25,}/);
                if (fileIdMatch && fileIdMatch[0]) {
                    const file = DriveApp.getFileById(fileIdMatch[0]);
                    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
                }
            } catch (e) {
                console.warn("Could not set file permissions:", e.message);
            }
        }

        return {
            success: true,
            message: "Slideshow Bot settings saved and link is live.",
            link: payload.link
        };
    } catch (err) {
        return {
            success: false,
            error: err.message
        };
    }
}

/**
 * Triggered Function: Main entry point for the email bot.
 * Should be set up on a time-based trigger (e.g., every 5-10 minutes).
 */
function autoEmailMain() {
    const now = new Date();
    const props = PropertiesService.getScriptProperties();

    // 1. Reset on Sunday
    checkSundayReset(now, props);

    // 2. Process Emails
    processEmails(now, props);
}

/**
 * Logic: Clears the previous week's link and processed emails list on Sunday.
 */
function checkSundayReset(now, props) {
    const currentWeek = Utilities.formatDate(now, "EST", "yyyy-ww");
    const lastReset = props.getProperty('LAST_RESET_WEEK');

    // If it's Sunday (0) and we haven't reset for this week yet
    if (now.getDay() === 0 && lastReset !== currentWeek) {
        props.deleteProperty('SLIDESHOW_LINK');
        props.setProperty('PROCESSED_EMAILS', JSON.stringify([])); // Clear email list
        props.setProperty('LAST_RESET_WEEK', currentWeek);
        console.log("Sunday Reset: Link and Email list cleared.");
    }
}

/**
 * Logic: Checks for incoming emails and replies with the slideshow link if applicable.
 */
function processEmails(now, props) {
    const slideshowLink = props.getProperty('SLIDESHOW_LINK');
    if (!slideshowLink) return; // Exit if no link is currently set

    const slidesEmailAddress = "binghamtonoutdoorsclub+slides@gmail.com";

    // Load processed emails from properties
    const rawEmails = props.getProperty('PROCESSED_EMAILS');
    let processedEmails = rawEmails ? JSON.parse(rawEmails) : [];

    // Search emails from including one day before
    const yesterday = new Date(now.getTime() - (24 * 60 * 60 * 1000));
    const formattedDate = Utilities.formatDate(yesterday, "EST", "yyyy/MM/dd");
    const threads = GmailApp.search(`to:${slidesEmailAddress} after:${formattedDate}`);

    threads.forEach(thread => {
        const message = thread.getMessages()[0];
        const senderEmail = formatEmail(message.getFrom());

        if (!processedEmails.includes(senderEmail)) {
            const timeframe = getTimeframeStatus(now, props);
            let responseBody = "";
            const timestamp = Utilities.formatDate(now, "EST", "yyyy-MM-dd HH:mm:ss");
            const footer = `<br><p style='color: #666; font-size: 0.8em;'>Sent at: ${timestamp} (EST)</p>`;

            if (timeframe === "WithinTimeframe") {
                responseBody = `Here ya go.<br><a href='${slideshowLink}'>${slideshowLink}</a><br><br>` +
                    `Please only reply to this address for slides. All other inquiries to binghamtonoutdoorsclub@gmail.com.` + footer;
            }
            else if (timeframe === "OutsideTimeframe") {
                responseBody = `Unfortunately forms for trips close Tuesday at 10:00 am. Here is the link for reference:<br>` +
                    `<a href='${slideshowLink}'>${slideshowLink}</a>` + footer;
            }

            if (responseBody !== "") {
                message.reply("", { htmlBody: responseBody });
                message.markRead();

                // Update local list and save back to properties
                processedEmails.push(senderEmail);
                props.setProperty('PROCESSED_EMAILS', JSON.stringify(processedEmails));
            }
        }
    });
}

/**
 * Helper: Determines if we are within the Monday/Tuesday window.
 */
function getTimeframeStatus(now, props) {
    // If user explicitly flagged this as a non-standard time, we always count as "WithinTimeframe"
    // to bypass the Tuesday 10am restriction.
    const isStandardTime = props.getProperty('IS_STANDARD_TIME') !== 'false';

    if (!isStandardTime) return "WithinTimeframe";

    const day = now.getDay();   // 0=Sun, 1=Mon, 2=Tue...
    const hour = now.getHours();

    // Monday 9 PM (21:00) to Tuesday 10 AM
    const isMondayAfter9 = (day === 1 && hour >= 21);
    const isTuesdayBefore10 = (day === 2 && hour < 10);

    if (isMondayAfter9 || isTuesdayBefore10) return "WithinTimeframe";

    // Sunday or Monday before 9 PM
    if (day === 0 || (day === 1 && hour < 21)) return "MeetingInProgress";

    return "OutsideTimeframe";
}

/**
 * Helper: Extracts email address from name string.
 */

function formatEmail(input) {
    const match = String(input).match(/<(.+?)>/);
    return match ? match[1] : String(input).trim();
}
