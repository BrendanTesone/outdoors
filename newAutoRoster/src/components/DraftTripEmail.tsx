
import { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, TextField, Button, Stack,
    CircularProgress, Radio, RadioGroup, FormControlLabel,
    FormControl, Divider
} from '@mui/material';

interface Person {
    name: string;
    email: string;
    isDriver?: boolean;
    isEboard?: boolean;
    priority?: number;
    rosterState?: 'Rostered' | 'Waitlisted' | 'Rejected' | 'None';
}

const DraftTripEmail = () => {
    const [rosterLink, setRosterLink] = useState('');
    const [commitmentLink, setCommitmentLink] = useState('');

    const [loadingCommitment, setLoadingCommitment] = useState(false);
    const [loadingRoster, setLoadingRoster] = useState(false);
    const [loadingDraft, setLoadingDraft] = useState(false);

    // Data containers
    const [commitmentPeople, setCommitmentPeople] = useState<Person[] | null>(null); // Raw from sheet
    const [rosterPeople, setRosterPeople] = useState<Person[] | null>(null); // Raw from sheet

    // The working list for the draft menu
    const [draftList, setDraftList] = useState<Person[] | null>(null);

    const [error, setError] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);

    const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL;

    // Helper functions

    const handleFetchData = async (action: 'getCommitmentData' | 'getRosterData', linkToUse: string) => {
        if (!linkToUse) {
            setError('Please provide a spreadsheet link.');
            return;
        }
        if (!APPS_SCRIPT_URL) {
            setError('Apps Script URL not configured.');
            return;
        }

        if (action === 'getCommitmentData') setLoadingCommitment(true);
        else setLoadingRoster(true);

        setLoadingDraft(false);
        setError(null);
        setStatusMessage(null);

        try {
            const response = await fetch(APPS_SCRIPT_URL, {
                method: 'POST',
                mode: 'cors',
                cache: 'no-cache',
                body: JSON.stringify({ action, link: linkToUse.trim() }),
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            });

            const data = await response.json();
            if (data.success) {
                if (action === 'getCommitmentData') {
                    // Normalize (lowercase) emails for consistent matching later
                    const people = (data.people || []).map((p: Person) => ({ ...p, email: p.email.toLowerCase() }));
                    setCommitmentPeople(people);
                } else {
                    // Keep Roster order exactly as returned from sheet
                    const people = (data.people || []).map((p: Person) => ({ ...p, email: p.email.toLowerCase() }));
                    setRosterPeople(people);
                }
            } else {
                setError(data.error || 'Failed to fetch data');
            }
        } catch (e) {
            setError('Connection Error: ' + (e as Error).message);
        } finally {
            if (action === 'getCommitmentData') setLoadingCommitment(false);
            else setLoadingRoster(false);
        }
    };

    // Effect to generating the Draft List when both sources are loaded
    useEffect(() => {
        if (commitmentPeople && rosterPeople) {
            generateDraftList();
        }
    }, [commitmentPeople, rosterPeople]);

    const generateDraftList = () => {
        if (!commitmentPeople || !rosterPeople) return;

        const newList: Person[] = [];

        // 1. Calculate Capacity from Roster
        // "you see the number of drivers, that times 5 is the number of rostered"
        const numDrivers = rosterPeople.filter(p => p.isDriver).length;
        const capacity = numDrivers * 5;

        // 2. Process Roster People (In Order)
        // "iterate over and display in that order"
        const rosterEmails = new Set<string>();

        rosterPeople.forEach((person, index) => {
            rosterEmails.add(person.email);
            // "the rest is waitlisted"
            if (index < capacity) {
                newList.push({ ...person, rosterState: 'Rostered' });
            } else {
                newList.push({ ...person, rosterState: 'Waitlisted' });
            }
        });

        // 3. Process Commitment People (Rejected)
        // "anyone from the commitment sheet thats not in that set is automatically rejected"
        commitmentPeople.forEach(cp => {
            if (!rosterEmails.has(cp.email)) {
                newList.push({ ...cp, rosterState: 'Rejected' });
            }
        });

        setDraftList(newList);
    };

    const handleLoadCommitment = () => handleFetchData('getCommitmentData', commitmentLink);

    const handleLoadRoster = () => {
        handleFetchData('getRosterData', rosterLink);
    };

    const handleStatusChange = (email: string, newState: 'Rostered' | 'Waitlisted' | 'Rejected' | 'None') => {
        setDraftList(prev => prev ? prev.map(p => p.email === email ? { ...p, rosterState: newState } : p) : null);
    };

    const getEmailBody = (rostered: Person[], waitlisted: Person[]) => {
        // Sort Rostered: Drivers+Eboard -> Driver -> Eboard -> Passenger
        const sortedRoster = [...rostered].sort((a, b) => {
            // Priority 1: isDriver && isEboard
            if (a.isDriver && a.isEboard && !(b.isDriver && b.isEboard)) return -1;
            if (b.isDriver && b.isEboard && !(a.isDriver && a.isEboard)) return 1;

            // Priority 2: isDriver && !isEboard
            if (a.isDriver && !a.isEboard && !(b.isDriver && !b.isEboard)) return -1;
            if (b.isDriver && !b.isEboard && !(a.isDriver && !b.isEboard)) return 1;

            // Priority 3: !isDriver && isEboard
            if (!a.isDriver && a.isEboard && !(!b.isDriver && b.isEboard)) return -1;
            if (!b.isDriver && b.isEboard && !(!a.isDriver && a.isEboard)) return 1;

            return 0; // Passengers
        });

        let html = "<p><br /><strong><u>Roster</u></strong><br>";
        sortedRoster.forEach(p => {
            html += `${p.name} `;
            if (p.isEboard) html += ' <span style="color: blue;">eboard </span>';
            if (p.isDriver) html += ' <span style="color: red;">driver</span>';
            html += "<br>";
        });

        html += "<br><b><u>Waitlist: </u></b>(We will contact you if a spot opens up)<br>";
        waitlisted.forEach(p => {
            html += `${p.name} <br>`;
        });

        html += "<br><br>See ya soon!</p>";
        return html;
    };

    const handleCreateDrafts = async () => {
        if (!draftList || !APPS_SCRIPT_URL) return;
        setLoadingDraft(true);
        setStatusMessage("Creating drafts...");
        setError(null);

        try {
            const rostered = draftList.filter(p => p.rosterState === 'Rostered');
            const waitlisted = draftList.filter(p => p.rosterState === 'Waitlisted');
            const rejected = draftList.filter(p => p.rosterState === 'Rejected');

            // 1. Accept Email (Rostered + Waitlisted)
            const acceptRecipients = [...rostered, ...waitlisted].map(p => p.email);
            const body = getEmailBody(rostered, waitlisted);
            // Default subject, user can edit it in Gmail
            const subject = "Trip Roster Update";

            if (acceptRecipients.length > 0) {
                const resp = await fetch(APPS_SCRIPT_URL, {
                    method: 'POST',
                    body: JSON.stringify({
                        action: 'createEmailDraft',
                        recipientBcc: acceptRecipients,
                        subject: subject,
                        body: body
                    }),
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                });
                const data = await resp.json();
                if (!data.success) throw new Error(data.error);
            }

            // 2. Reject Email
            const rejectRecipients = rejected.map(p => p.email);
            const rejectBody = "Hello everyone,\n\nUnfortunately, we do not have enough drivers for this trip, so you won't be able to attend this time.\n\nWe understand this is disappointing, and we will prioritize you for future trips.\n\nIf you have a car, please consider signing up to drive and ensuring your Club Sports form is up to date. Our trips depend on volunteer drivers, and we truly appreciate those who help make them possible.\n\nWe hope to see you on future trips!;";
            const rejectSubject = "Update: Trip Rejection";

            if (rejectRecipients.length > 0) {
                const resp = await fetch(APPS_SCRIPT_URL, {
                    method: 'POST',
                    body: JSON.stringify({
                        action: 'createEmailDraft',
                        recipientBcc: rejectRecipients,
                        subject: rejectSubject,
                        body: rejectBody.replace(/\n/g, '<br>')
                    }),
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                });
                const data = await resp.json();
                if (!data.success) throw new Error(data.error);
            }

            setStatusMessage("Drafts made, check email");

        } catch (e) {
            setError((e as Error).message);
        } finally {
            setLoadingDraft(false);
        }
    };

    return (
        <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.main', textAlign: 'center' }}>
                Draft Trip Email
            </Typography>

            {error && (
                <Paper sx={{ p: 2, bgcolor: '#ffebee', color: '#c62828', border: '1px solid #ef5350' }}>
                    <Typography>{error}</Typography>
                </Paper>
            )}

            {statusMessage && (
                <Paper sx={{ p: 2, bgcolor: '#e8f5e9', color: '#2e7d32', border: '1px solid #66bb6a' }}>
                    <Typography>{statusMessage}</Typography>
                </Paper>
            )}

            <Stack spacing={3}>
                {/* Step 1 */}
                <Paper elevation={3} sx={{ p: 3, borderRadius: 4, bgcolor: commitmentPeople ? '#f8faf9' : 'white', border: '2px solid', borderColor: commitmentPeople ? '#2e7d32' : '#eef2f1' }}>
                    <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>{commitmentPeople ? '✅' : ''} Step 1: Commitment Form</Typography>
                    <Stack direction="row" spacing={1}>
                        <TextField
                            fullWidth size="small" label="Commitment Link" value={commitmentLink}
                            onChange={(e) => setCommitmentLink(e.target.value)}
                            disabled={loadingCommitment || loadingDraft}
                        />
                        <Button variant="contained" onClick={handleLoadCommitment} disabled={loadingCommitment || !commitmentLink}>
                            {loadingCommitment ? <CircularProgress size={20} /> : 'Load'}
                        </Button>
                    </Stack>
                </Paper>

                {/* Step 2 */}
                <Paper elevation={3} sx={{ p: 3, borderRadius: 4, bgcolor: rosterPeople ? '#f8faf9' : 'white', border: '2px solid', borderColor: rosterPeople ? '#2e7d32' : '#eef2f1' }}>
                    <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>{rosterPeople ? '✅' : ''} Step 2: Roster Sheet</Typography>
                    <Stack direction="row" spacing={1}>
                        <TextField
                            fullWidth size="small" label="Roster Link" value={rosterLink}
                            onChange={(e) => setRosterLink(e.target.value)}
                            disabled={loadingRoster || loadingDraft}
                        />
                        <Button variant="contained" onClick={() => handleLoadRoster()} disabled={loadingRoster || !rosterLink}>
                            {loadingRoster ? <CircularProgress size={20} /> : 'Load'}
                        </Button>
                    </Stack>
                </Paper>

                {/* Step 3: Draft Menu */}
                {draftList && (
                    <Paper elevation={3} sx={{ p: 3, borderRadius: 4, border: '2px solid #1976d2' }}>
                        <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Step 3: Review & Draft</Typography>

                        <Box sx={{ mb: 3 }}>
                            {draftList.map((person, i) => (
                                <Paper key={i} variant="outlined" sx={{ p: 2, mb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Box>
                                        <Typography variant="subtitle2" fontWeight={700}>{person.name}</Typography>
                                        <Typography variant="caption" color="text.secondary">{person.email}</Typography>
                                        <Stack direction="row" spacing={1} mt={0.5}>
                                            {person.isDriver && <Typography variant="caption" sx={{ bgcolor: '#ffebee', color: '#c62828', px: 0.5, borderRadius: 1 }}>Driver</Typography>}
                                            {person.isEboard && <Typography variant="caption" sx={{ bgcolor: '#e3f2fd', color: '#1565c0', px: 0.5, borderRadius: 1 }}>Eboard</Typography>}
                                        </Stack>
                                    </Box>
                                    <FormControl component="fieldset">
                                        <RadioGroup row value={person.rosterState} onChange={(e) => handleStatusChange(person.email, e.target.value as any)}>
                                            <FormControlLabel value="Rostered" control={<Radio size="small" color="success" />} label={<Typography variant="caption">Rostered</Typography>} />
                                            <FormControlLabel value="Waitlisted" control={<Radio size="small" color="warning" />} label={<Typography variant="caption">Waitlisted</Typography>} />
                                            <FormControlLabel value="Rejected" control={<Radio size="small" color="error" />} label={<Typography variant="caption">Rejected</Typography>} />
                                            <FormControlLabel value="None" control={<Radio size="small" />} label={<Typography variant="caption">None</Typography>} />
                                        </RadioGroup>
                                    </FormControl>
                                </Paper>
                            ))}
                        </Box>

                        <Divider sx={{ my: 2 }} />

                        <Stack direction="row" spacing={2} justifyContent="flex-end">
                            <Button variant="contained" onClick={handleCreateDrafts} disabled={loadingDraft}>
                                {loadingDraft ? <CircularProgress size={24} /> : 'Create Email Drafts'}
                            </Button>
                        </Stack>
                    </Paper>
                )}
            </Stack>
        </Box>
    );
};

export default DraftTripEmail;
