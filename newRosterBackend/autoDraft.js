
/**
 * Creates a Gmail draft with the provided recipients, subject, and body.
 */
function createEmailDraft(payload) {
    try {
        const myEmail = Session.getActiveUser().getEmail();
        // Clean up BCC list to remove empty entries
        const bccList = (payload.recipientBcc || []).filter(e => e && e.trim() !== "").join(",");

        if (!bccList) {
            return { success: false, error: "No valid recipients provided." };
        }

        const draft = GmailApp.createDraft(myEmail, payload.subject, "", {
            bcc: bccList,
            htmlBody: payload.body
        });

        // Construct a direct link to the draft if possible, or just the generic drafts folder
        const draftId = draft.getId();
        const draftUrl = "https://mail.google.com/mail/u/0/#drafts/" + draftId;

        return {
            success: true,
            draftId: draftId,
            draftUrl: draftUrl
        };
    } catch (e) {
        return { success: false, error: e.message };
    }
}
