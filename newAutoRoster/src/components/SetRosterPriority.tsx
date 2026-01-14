
import { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, TextField, Button, Stack,
    CircularProgress, Divider, FormControl, RadioGroup, FormControlLabel, Radio
} from '@mui/material';

interface Person {
    name: string;
    email: string;
    isDriver?: boolean;
    isEboard?: boolean;
    rosterState?: 'Likely Rostered' | 'Likely Waitlisted' | 'Likely Rejected' | 'None';
    priorityChange?: number; // -1, 0, 1
}

const SetRosterPriority = () => {
    const [rosterLink, setRosterLink] = useState('');
    const [commitmentLink, setCommitmentLink] = useState('');

    const [loadingCommitment, setLoadingCommitment] = useState(false);
    const [loadingRoster, setLoadingRoster] = useState(false);
    const [processing, setProcessing] = useState(false);

    // Data containers
    const [commitmentPeople, setCommitmentPeople] = useState<Person[] | null>(null);
    const [rosterPeople, setRosterPeople] = useState<Person[] | null>(null);

    // The working list for the priority menu
    const [priorityList, setPriorityList] = useState<Person[] | null>(null);

    const [error, setError] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);

    const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL;

    // Helper functions
    const sortPeople = (list: any[]) => {
        return [...list].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    };

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

        setProcessing(false);
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
                // Normalize emails
                const people = (data.people || []).map((p: any) => ({ ...p, email: p.email.toLowerCase() }));
                if (action === 'getCommitmentData') {
                    setCommitmentPeople(sortPeople(people));
                } else {
                    setRosterPeople(people); // Keep roster order for capacity calc logic if needed, though less critical here
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

    useEffect(() => {
        if (commitmentPeople && rosterPeople) {
            generatePriorityList();
        }
    }, [commitmentPeople, rosterPeople]);

    const generatePriorityList = () => {
        if (!commitmentPeople || !rosterPeople) return;

        // Logic mirrors DraftTripEmail logic for assigning state, then adds Priority rules

        const newList: Person[] = [];
        const numDrivers = rosterPeople.filter(p => p.isDriver).length;
        const capacity = numDrivers * 5;
        const rosterEmails = new Set<string>();

        // 1. Process Roster (Rostered vs Waitlisted)
        rosterPeople.forEach((person, index) => {
            rosterEmails.add(person.email);
            let p: Person = { ...person };
            if (index < capacity) {
                p.rosterState = 'Likely Rostered';
                // Rule: Rostered = -1 (unless Eboard)
                p.priorityChange = p.isEboard ? 0 : -1;
            } else {
                p.rosterState = 'Likely Waitlisted';
                // Rule: Waitlisted = +1 (unless Eboard, though usually Eboard isn't waitlisted)
                p.priorityChange = p.isEboard ? 0 : 1;
            }
            newList.push(p);
        });

        // 2. Process Commitment (Rejected)
        commitmentPeople.forEach(cp => {
            if (!rosterEmails.has(cp.email)) {
                let p: Person = { ...cp, rosterState: 'Likely Rejected' };
                // Rule: Rejected = +1 (unless Eboard)
                p.priorityChange = p.isEboard ? 0 : 1;
                newList.push(p);
            }
        });

        // Sort for display (Rostered -> Waitlisted -> Rejected)
        setPriorityList(newList.sort((a, b) => {
            const order = { 'Likely Rostered': 0, 'Likely Waitlisted': 1, 'Likely Rejected': 2, 'None': 3 };
            return (order[a.rosterState || 'None'] - order[b.rosterState || 'None']);
        }));
    };

    const handlePriorityChange = (email: string, newChange: number) => {
        setPriorityList(prev => prev ? prev.map(p => p.email === email ? { ...p, priorityChange: newChange } : p) : null);
    };

    const handleSubmit = async () => {
        if (!priorityList || !APPS_SCRIPT_URL) return;
        setProcessing(true);
        setStatusMessage("Updating priorities...");
        setError(null);

        // Filter out those with 0 change to save time
        const adjustments = priorityList
            .filter(p => p.priorityChange !== 0)
            .map(p => ({
                email: p.email,
                name: p.name,
                amountChange: p.priorityChange
            }));

        if (adjustments.length === 0) {
            setStatusMessage("No priority changes to submit.");
            setProcessing(false);
            return;
        }

        try {
            const response = await fetch(APPS_SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'batchAdjustPriority',
                    adjustments: adjustments
                }),
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            });
            const data = await response.json();

            if (data.success) {
                setStatusMessage("Success! " + data.message);
                // Disable button or clear list to prevent double submission? 
                // Leaving list visible but with success message is safer UX.
            } else {
                setError(data.error);
            }
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setProcessing(false);
        }
    };

    return (
        <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.main', textAlign: 'center' }}>
                Set Roster Priorities
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
                            disabled={loadingCommitment || processing}
                        />
                        <Button variant="contained" onClick={() => handleFetchData('getCommitmentData', commitmentLink)} disabled={loadingCommitment || !commitmentLink}>
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
                            disabled={loadingRoster || processing}
                        />
                        <Button variant="contained" onClick={() => handleFetchData('getRosterData', rosterLink)} disabled={loadingRoster || !rosterLink}>
                            {loadingRoster ? <CircularProgress size={20} /> : 'Load'}
                        </Button>
                    </Stack>
                </Paper>

                {/* Step 3: Priority Review */}
                {priorityList && (
                    <Paper elevation={3} sx={{ p: 3, borderRadius: 4, border: '2px solid #1976d2' }}>
                        <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Step 3: Review Priority Changes</Typography>
                        <Stack spacing={1}>
                            {priorityList.map((person, i) => (
                                <Paper key={i} variant="outlined" sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Box>
                                        <Typography variant="subtitle2" fontWeight={700}>{person.name}</Typography>
                                        <Typography variant="caption" color="text.secondary">{person.email}</Typography>
                                        <Stack direction="row" spacing={1} mt={0.5}>
                                            <Typography variant="caption" sx={{
                                                bgcolor: person.rosterState === 'Likely Rostered' ? '#e8f5e9' : (person.rosterState === 'Likely Waitlisted' ? '#fff3e0' : '#ffebee'),
                                                color: person.rosterState === 'Likely Rostered' ? '#2e7d32' : (person.rosterState === 'Likely Waitlisted' ? '#ef6c00' : '#c62828'),
                                                px: 0.5, borderRadius: 1
                                            }}>
                                                {person.rosterState}
                                            </Typography>
                                            {person.isEboard && <Typography variant="caption" sx={{ bgcolor: '#e3f2fd', color: '#1565c0', px: 0.5, borderRadius: 1 }}>Eboard</Typography>}
                                        </Stack>
                                    </Box>
                                    <FormControl component="fieldset">
                                        <RadioGroup row value={person.priorityChange} onChange={(e) => handlePriorityChange(person.email, parseInt(e.target.value))}>
                                            <FormControlLabel value={1} control={<Radio size="small" color="success" />} label={<Typography variant="caption" sx={{ color: 'green', fontWeight: 'bold' }}>+1</Typography>} />
                                            <FormControlLabel value={0} control={<Radio size="small" />} label={<Typography variant="caption">0</Typography>} />
                                            <FormControlLabel value={-1} control={<Radio size="small" color="error" />} label={<Typography variant="caption" sx={{ color: 'red', fontWeight: 'bold' }}>-1</Typography>} />
                                        </RadioGroup>
                                    </FormControl>
                                </Paper>
                            ))}
                        </Stack>

                        <Divider sx={{ my: 2 }} />

                        <Stack direction="row" justifyContent="flex-end">
                            <Button variant="contained" onClick={handleSubmit} disabled={processing} sx={{ bgcolor: '#1976d2' }}>
                                {processing ? <CircularProgress size={24} color="inherit" /> : 'Submit Priority Changes'}
                            </Button>
                        </Stack>
                    </Paper>
                )}
            </Stack>
        </Box>
    );
};

export default SetRosterPriority;
