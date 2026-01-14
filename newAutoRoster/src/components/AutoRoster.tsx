import { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, TextField, Button, Stack,
    CircularProgress, Alert, Dialog, DialogTitle,
    DialogContent, DialogActions, Grid, Tabs, Tab,
    Select, MenuItem
} from '@mui/material';
import LaunchIcon from '@mui/icons-material/Launch';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';

interface RosterLink {
    id: string;
    waitlistNum: number | null;
}

const AutoRoster = () => {
    const [rosterLink, setRosterLink] = useState('');
    const [commitmentLink, setCommitmentLink] = useState('');
    const [rosterLinks, setRosterLinks] = useState<RosterLink[]>([]);

    const [loadingCommitment, setLoadingCommitment] = useState(false);
    const [loadingRoster, setLoadingRoster] = useState(false);
    const [loading, setLoading] = useState(false);
    const [commitmentPeople, setCommitmentPeople] = useState<any[] | null>(null);
    const [rosterPeople, setRosterPeople] = useState<any[] | null>(null);
    const [leftTab, setLeftTab] = useState(0); // 0: Eboard, 1: Commitment

    const [rosterName, setRosterName] = useState('');
    const [createdLink, setCreatedLink] = useState<string | null>(null);
    const [eboardPeople, setEboardPeople] = useState<any[] | null>(null);
    const [eboardUrl, setEboardUrl] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Original State References
    const [originalEboard, setOriginalEboard] = useState<any[] | null>(null);
    const [originalCommitment, setOriginalCommitment] = useState<any[] | null>(null);

    // Waitlist Modal State
    const [openWaitlistModal, setOpenWaitlistModal] = useState(false);
    const [waitlistNumInput, setWaitlistNumInput] = useState('0');

    // Confirm Modal State
    const [openConfirmModal, setOpenConfirmModal] = useState(false);
    const [confirmTitle, setConfirmTitle] = useState('');
    const [pendingAdd, setPendingAdd] = useState<{ person: any, isDriver: boolean, type: 'eboard' | 'commitment' } | null>(null);


    // Custom Remove Modal State
    const [openCustomRemoveConfirm, setOpenCustomRemoveConfirm] = useState(false);
    const [targetPersonToRemove, setTargetPersonToRemove] = useState<any | null>(null);

    // Auto Fill Modal State
    const [openAutoFillModal, setOpenAutoFillModal] = useState(false);

    const [creatingRoster, setCreatingRoster] = useState(false);

    const [openCapacityMismatchModal, setOpenCapacityMismatchModal] = useState(false);

    const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL;

    const sortPeople = (list: any[]) => {
        return [...list].sort((a, b) => {
            // Tier 1: Driver status (True > False)
            if (a.isDriver !== b.isDriver) return a.isDriver ? -1 : 1;

            // Tier 2: Eboard status (True > False)
            if (a.isEboard !== b.isEboard) return a.isEboard ? -1 : 1;

            // Tier 3: Priority Score (High > Low)
            const aScore = a.priority ?? 0;
            const bScore = b.priority ?? 0;
            if (aScore !== bScore) return bScore - aScore;

            // Tier 4: Name (A-Z)
            return (a.name || '').localeCompare(b.name || '');
        });
    };

    const extractId = (input: string) => {
        const fileMatch = input.match(/\/d\/([-\w]{25,})/);
        if (fileMatch) return fileMatch[1];
        return input.trim();
    };

    // Fetch stored roster links and eboard on mount
    useEffect(() => {
        const init = async () => {
            if (!APPS_SCRIPT_URL) return;
            try {
                // Fetch Roster Links
                const rosterResp = await fetch(APPS_SCRIPT_URL, {
                    method: 'POST',
                    body: JSON.stringify({ action: 'getRosterLinks' }),
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                });
                const rosterData = await rosterResp.json();
                if (rosterData.success) {
                    setRosterLinks(rosterData.links || []);
                }

                // Fetch Eboard
                handleFetchEboard();
            } catch (e) {
                console.error('Initialization failed:', e);
            }
        };
        init();
    }, [APPS_SCRIPT_URL]);

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

        setLoading(true);
        setError(null);
        if (action === 'getCommitmentData') setCommitmentPeople(null);
        else setRosterPeople(null);

        try {
            const response = await fetch(APPS_SCRIPT_URL, {
                method: 'POST',
                mode: 'cors',
                cache: 'no-cache',
                body: JSON.stringify({ action, link: linkToUse.trim() }),
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`HTTP ${response.status}: ${text.substring(0, 100)}`);
            }

            const data = await response.json();
            if (data.success) {
                if (action === 'getCommitmentData') {
                    setOriginalCommitment(data.people);

                    // Deduplicate: Remove those already in roster AND those in Eboard
                    const rosterEmails = new Set(rosterPeople?.map(p => p.email) || []);
                    const eboardEmails = new Set(eboardPeople?.map(p => p.email) || []);

                    const filtered = (data.people || []).filter((p: any) =>
                        !rosterEmails.has(p.email) && !eboardEmails.has(p.email)
                    );
                    setCommitmentPeople(sortPeople(filtered));
                } else {
                    setRosterPeople(sortPeople(data.people || []));

                    // Deduplicate Others: Remove those now in roster from Commitment and Eboard
                    const newRosterEmails = new Set(data.people?.map((p: any) => p.email) || []);

                    if (commitmentPeople) {
                        setCommitmentPeople(prev => prev ? prev.filter(p => !newRosterEmails.has(p.email)) : null);
                    }
                    if (eboardPeople) {
                        setEboardPeople(prev => prev ? prev.filter(p => !newRosterEmails.has(p.email)) : null);
                    }
                }
            } else {
                setError(data.error || 'Failed to fetch data');
            }
        } catch (e) {
            setError('Connection Error: ' + (e as Error).message);
        } finally {
            setLoading(false);
            if (action === 'getCommitmentData') setLoadingCommitment(false);
            else setLoadingRoster(false);
        }
    };

    const handleLoadCommitment = () => {
        handleFetchData('getCommitmentData', commitmentLink);
    };

    const handleLoadRoster = (linkOverride?: string) => {
        const linkToUse = linkOverride || rosterLink;

        if (!linkToUse) {
            setError('Please provide a roster link.');
            return;
        }

        const trimmedLink = linkToUse.trim();
        const id = extractId(trimmedLink);

        const existing = rosterLinks.find(rl => rl.id === id && rl.waitlistNum !== null);

        if (existing) {
            handleFetchData('getRosterData', trimmedLink);
        } else {
            setOpenWaitlistModal(true);
        }
    };

    const handleWaitlistConfirm = async () => {
        const num = parseInt(waitlistNumInput, 10);
        if (isNaN(num)) {
            alert('Please enter a valid number');
            return;
        }

        // Use rosterLink from state, ensuring it's the one we're working with
        const trimmedLink = rosterLink.trim();
        const id = extractId(trimmedLink);

        const newEntry: RosterLink = {
            id: id,
            waitlistNum: num
        };

        const updatedLinks = [...rosterLinks, newEntry];
        setRosterLinks(updatedLinks);
        setOpenWaitlistModal(false);

        // Save to backend
        if (APPS_SCRIPT_URL) {
            try {
                await fetch(APPS_SCRIPT_URL, {
                    method: 'POST',
                    body: JSON.stringify({ action: 'saveRosterLinks', links: updatedLinks }),
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                });
            } catch (e) {
                console.error('Failed to save roster links:', e);
            }
        }

        handleFetchData('getRosterData', trimmedLink);
    };

    const handleCreateRoster = async () => {
        if (!APPS_SCRIPT_URL) return;
        setCreatingRoster(true);
        setError(null);
        setCreatedLink(null);

        try {
            const response = await fetch(APPS_SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'createRosterFromTemplate',
                    rosterName: rosterName.trim()
                }),
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            });
            const data = await response.json();
            if (data.success) {
                setCreatedLink(data.link);
                setRosterName('');
                setRosterLink(data.link);
                // Trigger load roster with the new link, which will check for waitlistNum
                handleLoadRoster(data.link);
            } else {
                setError(data.error || 'Failed to create roster');
            }
        } catch (e) {
            setError('Connection Error: ' + (e as Error).message);
        } finally {
            setCreatingRoster(false);
        }
    };


    const handleSaveRoster = async (force: boolean = false) => {
        if (!rosterLink || !rosterPeople || rosterPeople.length === 0) {
            setError('No roster data to save or roster link missing.');
            return;
        }

        if (!force) {
            const drivers = rosterPeople.filter(p => p.isDriver).length;
            const currentId = extractId(rosterLink);
            const meta = rosterLinks.find(rl => rl.id === currentId);
            const waitlist = meta?.waitlistNum || 0;
            const totalCapacity = (drivers * 5) + waitlist;
            const currentCount = rosterPeople.length;

            if (currentCount !== totalCapacity) {
                setOpenCapacityMismatchModal(true);
                return;
            }
        }

        setLoading(true);
        setError(null);
        setStatusMessage('Clearing roster and saving fresh copy...');

        try {
            // Step 1: Clear the roster
            const clearResp = await fetch(APPS_SCRIPT_URL!, {
                method: 'POST',
                body: JSON.stringify({ action: 'clearRoster', link: rosterLink.trim() }),
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            });
            const clearData = await clearResp.json();

            if (!clearData.success) {
                throw new Error(clearData.error || 'Failed to clear roster.');
            }

            // Step 2: Add all current people
            const addResp = await fetch(APPS_SCRIPT_URL!, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'addPeople',
                    link: rosterLink.trim(),
                    people: rosterPeople
                }),
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            });
            const addData = await addResp.json();

            if (!addData.success) {
                throw new Error(addData.error || 'Failed to add people to roster.');
            }

            setStatusMessage(addData.message || 'Roster saved successfully!');
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setLoading(false);
        }
    };

    const handleFetchEboard = async () => {
        if (!APPS_SCRIPT_URL) return;
        setLoading(true);
        setError(null);
        setEboardPeople(null);

        try {
            const response = await fetch(APPS_SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify({ action: 'getEboardData' }),
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            });
            const data = await response.json();
            if (data.success) {
                setOriginalEboard(data.members);
                setEboardUrl(data.url);

                // Deduplicate: Remove those already in roster
                const rosterEmails = new Set(rosterPeople?.map(p => p.email) || []);
                const filtered = (data.members || []).filter((p: any) => !rosterEmails.has(p.email));
                setEboardPeople(filtered);
            } else {
                setError(data.error || 'Failed to fetch eboard');
            }
        } catch (e) {
            setError('Connection Error: ' + (e as Error).message);
        } finally {
            setLoading(false);
        }
    };

    const handleAddPerson = (person: any, isDriver: boolean, fromType: 'eboard' | 'commitment') => {
        const enrichedPerson = { ...person, isDriver };

        // Add to roster and sort
        setRosterPeople(prev => sortPeople([...(prev || []), enrichedPerson]));

        // Remove from source
        if (fromType === 'eboard') {
            setEboardPeople(prev => prev ? prev.filter(p => p.email !== person.email) : null);
        } else {
            setCommitmentPeople(prev => prev ? prev.filter(p => p.email !== person.email) : null);
        }
    };

    const handleRemovePerson = (person: any, force: boolean = false) => {
        const email = person.email;

        // Check if in original lists
        const inOgCommitment = originalCommitment?.find(p => p.email === email);
        const inOgEboard = originalEboard?.find(p => p.email === email);

        if (!force && !inOgCommitment && !inOgEboard) {
            setTargetPersonToRemove(person);
            setOpenCustomRemoveConfirm(true);
            return;
        }

        // Remove from current roster
        setRosterPeople(prev => prev ? prev.filter(p => p.email !== email) : null);

        // Return to original list placement
        if (inOgCommitment) {
            setCommitmentPeople(prev => sortPeople([...(prev || []), inOgCommitment]));
        } else if (inOgEboard) {
            setEboardPeople(prev => [...(prev || []), inOgEboard].sort((a, b) => (a.name || '').localeCompare(b.name || '')));
        }

        if (force) {
            setOpenCustomRemoveConfirm(false);
            setTargetPersonToRemove(null);
        }
    };

    const handleAutoFill = () => {
        if (!rosterPeople || !commitmentPeople) {
            setStatusMessage('Please load both commitment and roster data first.');
            setOpenAutoFillModal(false);
            return;
        }

        // 1. Get current drivers count
        const driverCount = rosterPeople.filter(p => p.isDriver).length;
        if (driverCount === 0) {
            setError('Cannot Auto-Fill without at least one driver rostered.');
            setOpenAutoFillModal(false);
            return;
        }

        // 2. Get waitlistNum for current roster
        const currentId = extractId(rosterLink);
        const meta = rosterLinks.find(rl => rl.id === currentId);
        const waitlist = meta?.waitlistNum || 0;

        // 3. Max capacity calculation: (drivers * 5) + waitlist
        const maxCapacity = (driverCount * 5) + waitlist;
        const currentTotal = rosterPeople.length;
        const spotsRemaining = maxCapacity - currentTotal;

        if (spotsRemaining <= 0) {
            setStatusMessage('Roster is already at or above capacity.');
            setOpenAutoFillModal(false);
            return;
        }

        // 4. Sort commitment people by priority (High to Low)
        const sortedCommitment = [...commitmentPeople].sort((a, b) => {
            const aScore = a.priority ?? 0;
            const bScore = b.priority ?? 0;
            if (aScore !== bScore) return bScore - aScore;
            return (a.name || '').localeCompare(b.name || '');
        });

        // 5. Fill slots
        const toAdd = sortedCommitment.slice(0, spotsRemaining).map(p => ({
            ...p,
            isDriver: false // Adding them as passengers
        }));
        const remainingCommitment = sortedCommitment.slice(spotsRemaining);

        // 6. Update states
        setRosterPeople(prev => sortPeople([...(prev || []), ...toAdd]));
        setCommitmentPeople(remainingCommitment);

        setOpenAutoFillModal(false);
        setStatusMessage(`Successfully added ${toAdd.length} people to the roster.`);
    };

    const handleActionClick = (person: any, action: 'Driver' | 'Non-Driver', isWarning: boolean, type: 'eboard' | 'commitment') => {
        if (isWarning) {
            setConfirmTitle(`Confirm: ${action} for ${person.name}?`);
            setPendingAdd({ person, isDriver: action === 'Driver', type });
            setOpenConfirmModal(true);
        } else {
            handleAddPerson(person, action === 'Driver', type);
        }
    };

    const handleRosterToggle = (person: any, newIsDriver: boolean) => {
        const ogPerson = originalCommitment?.find(p => p.email === person.email);
        const wasOriginallyDriver = ogPerson ? ogPerson.isDriver === true : true; // Assume true if not found (e.g. eboard)

        if (newIsDriver && !wasOriginallyDriver) {
            setConfirmTitle(`Confirm: Set ${person.name} as Driver?`);
            // We reuse pendingAdd logic but mark it as a 'roster' update
            setPendingAdd({ person, isDriver: true, type: 'commitment' }); // type doesn't support roster yet, let's just use commitment and check email
            setOpenConfirmModal(true);
            return;
        }

        // Just update state
        setRosterPeople(prev => {
            if (!prev) return null;
            const updated = prev.map(p => p.email === person.email ? { ...p, isDriver: newIsDriver } : p);
            return sortPeople(updated);
        });
    };

    const DataList = ({ people, title, type }: { people: any[] | null, title: string, type: 'eboard' | 'commitment' | 'roster' }) => {
        if (!people) return null;
        return (
            <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" sx={{ color: 'primary.main', mb: 1, fontWeight: 700 }}>
                    {title}
                </Typography>
                <Paper variant="outlined" sx={{
                    maxHeight: '350px',
                    overflow: 'auto',
                    bgcolor: '#fcfcfc',
                    p: 1
                }}>
                    {people.map((p, i) => {
                        const showButtons = type === 'eboard' || type === 'commitment';
                        const score = p.priority ?? 0;
                        const isDriver = p.isDriver === true;

                        return (
                            <Box key={i} sx={{
                                p: 1.5,
                                borderBottom: i < people.length - 1 ? '1px solid #eee' : 'none',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                '&:hover': { bgcolor: '#f5f7f6' }
                            }}>
                                <Box sx={{ flexGrow: 1 }}>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{p.name}</Typography>
                                        {(type === 'commitment' || type === 'roster') && (
                                            <Typography variant="caption" sx={{
                                                bgcolor: '#e3f2fd',
                                                color: '#1976d2',
                                                px: 0.8,
                                                borderRadius: 2,
                                                fontWeight: 800,
                                                fontSize: '0.65rem',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                Priority: {score}
                                            </Typography>
                                        )}
                                        {type === 'roster' && p.isEboard && (
                                            <Typography variant="caption" sx={{
                                                bgcolor: '#fff3e0',
                                                color: '#ef6c00',
                                                px: 0.8,
                                                borderRadius: 1,
                                                fontWeight: 800,
                                                fontSize: '0.65rem'
                                            }}>
                                                EBOARD
                                            </Typography>
                                        )}
                                    </Stack>
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                        {p.email}
                                    </Typography>
                                </Box>

                                {showButtons ? (
                                    <Stack direction="row" spacing={1}>
                                        <Button
                                            size="small"
                                            variant="contained"
                                            onClick={() => {
                                                const isWarning = type === 'eboard' ? false : !isDriver;
                                                handleActionClick(p, 'Driver', isWarning, type as any);
                                            }}
                                            sx={{
                                                fontSize: '0.65rem',
                                                py: 0.5,
                                                bgcolor: (type === 'eboard' || isDriver) ? '#006b3d' : '#d32f2f',
                                                '&:hover': { bgcolor: (type === 'eboard' || isDriver) ? '#005a33' : '#b71c1c' }
                                            }}
                                        >
                                            Driver +
                                        </Button>
                                        <Button
                                            size="small"
                                            variant="contained"
                                            onClick={() => handleActionClick(p, 'Non-Driver', false, type as any)}
                                            sx={{
                                                fontSize: '0.65rem',
                                                py: 0.5,
                                                bgcolor: '#37474f',
                                                '&:hover': { bgcolor: '#263238' }
                                            }}
                                        >
                                            Non-Driver +
                                        </Button>
                                    </Stack>
                                ) : (
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <Select
                                            size="small"
                                            value={isDriver ? 'driver' : 'nondriver'}
                                            onChange={(e) => handleRosterToggle(p, e.target.value === 'driver')}
                                            sx={{
                                                fontSize: '0.7rem',
                                                height: '24px',
                                                bgcolor: isDriver ? '#e8f5e9' : '#f5f5f5',
                                                color: isDriver ? '#2e7d32' : '#757575',
                                                fontWeight: 700,
                                                '& .MuiSelect-select': { py: 0, pl: 1, pr: '24px !important' },
                                                '& fieldset': { border: 'none' }
                                            }}
                                        >
                                            <MenuItem value="driver" sx={{ fontSize: '0.75rem', fontWeight: 600 }}>Driver</MenuItem>
                                            <MenuItem value="nondriver" sx={{ fontSize: '0.75rem', fontWeight: 600 }}>Non-Driver</MenuItem>
                                        </Select>

                                        <Button
                                            size="small"
                                            variant="outlined"
                                            color="error"
                                            onClick={() => handleRemovePerson(p)}
                                            sx={{ minWidth: 'auto', p: 0.2 }}
                                        >
                                            <RemoveCircleOutlineIcon fontSize="small" />
                                        </Button>
                                    </Stack>
                                )}
                            </Box>
                        );
                    })}
                </Paper>
            </Box>
        );
    };

    return (
        <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.main', textAlign: 'center' }}>
                Auto Roster
            </Typography>

            {statusMessage && (
                <Alert severity="success" onClose={() => setStatusMessage(null)}>
                    {statusMessage}
                </Alert>
            )}

            {createdLink && (
                <Alert severity="success" onClose={() => setCreatedLink(null)}>
                    Roster Created: <a href={createdLink} target="_blank" rel="noreferrer">Open Sheet</a>
                </Alert>
            )}

            {/* Step 1: Commitment Form */}
            <Paper elevation={3} sx={{
                p: 3, borderRadius: 4,
                border: '2px solid',
                borderColor: commitmentPeople !== null ? '#2e7d32' : '#eef2f1',
                bgcolor: commitmentPeople !== null ? '#f8faf9' : '#fff'
            }}>
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    {commitmentPeople !== null ? '' : ''} Step 1: Load Commitment Form
                </Typography>
                <Stack direction="row" spacing={1}>
                    <TextField
                        fullWidth
                        size="small"
                        label="Commitment Link"
                        value={commitmentLink}
                        onChange={(e) => setCommitmentLink(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleLoadCommitment()}
                        disabled={loadingCommitment}
                    />
                    <Button
                        variant="contained"
                        onClick={handleLoadCommitment}
                        disabled={loadingCommitment || !commitmentLink}
                        sx={{ bgcolor: '#006b3d', color: 'white', minWidth: '100px', '&:hover': { bgcolor: '#005a33' } }}
                    >
                        {loadingCommitment ? <CircularProgress size={20} color="inherit" /> : 'Load'}
                    </Button>
                </Stack>
            </Paper>

            {/* Step 2: Roster Link / Creation */}
            {commitmentPeople !== null && (
                <Paper elevation={3} sx={{
                    p: 3, borderRadius: 4,
                    border: '2px solid',
                    borderColor: rosterPeople !== null ? '#2e7d32' : '#eef2f1',
                    bgcolor: rosterPeople !== null ? '#f8faf9' : '#fff'
                }}>
                    <Typography variant="h6" sx={{ fontWeight: 800, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                        {rosterPeople !== null ? '' : ''} Step 2: Load or Generate Roster
                    </Typography>
                    <Grid container width="100%">
                        <Grid padding="15px" width="50%">
                            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', mb: 1, display: 'block' }}>
                                USE EXISTING ROSTER
                            </Typography>
                            <Stack direction="row" spacing={1}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    label="Roster Link"
                                    value={rosterLink}
                                    onChange={(e) => setRosterLink(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleLoadRoster()}
                                    disabled={loadingRoster}
                                />
                                <Button
                                    variant="contained"
                                    onClick={() => handleLoadRoster()}
                                    disabled={loadingRoster || !rosterLink}
                                    sx={{ bgcolor: '#006b3d', '&:hover': { bgcolor: '#005a33' }, minWidth: '100px' }}
                                >
                                    {loadingRoster ? <CircularProgress size={20} color="inherit" /> : 'Load'}
                                </Button>
                            </Stack>
                        </Grid>
                        <Grid padding="15px" width="50%">
                            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', mb: 1, display: 'block' }}>
                                CREATE NEW FROM TEMPLATE
                            </Typography>
                            <Stack direction="row" spacing={1}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    label="New Roster Name"
                                    placeholder="Optional"
                                    value={rosterName}
                                    onChange={(e) => setRosterName(e.target.value)}
                                    disabled={loading}
                                />
                                <Button
                                    variant="contained"
                                    onClick={handleCreateRoster}
                                    disabled={loading || creatingRoster}
                                    sx={{ whiteSpace: 'nowrap', bgcolor: '#006b3d', '&:hover': { bgcolor: '#005a33' }, minWidth: '100px' }}
                                >
                                    {creatingRoster ? <CircularProgress size={20} color="inherit" /> : 'Create'}
                                </Button>
                            </Stack>
                        </Grid>
                    </Grid>
                </Paper>
            )}

            {/* Step 3: Rostering Menu */}
            {(commitmentPeople !== null && rosterPeople !== null) && (
                <Paper elevation={3} sx={{
                    p: 3, borderRadius: 4,
                    border: '2px solid',
                    borderColor: '#1976d2',
                    bgcolor: '#fff'
                }}>
                    <Typography variant="h6" sx={{ fontWeight: 800, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                        Step 3: Rostering Menu
                    </Typography>

                    <Grid container width="100%" spacing={1}>
                        {/* Left Side: Draft Pool */}
                        <Grid width="48%">
                            <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
                                <Tabs
                                    value={leftTab}
                                    onChange={(_, v) => setLeftTab(v)}
                                    variant="fullWidth"
                                    sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: '#f8faf9' }}
                                >
                                    <Tab label="Eboard" sx={{ fontWeight: 700 }} />
                                    <Tab label="Commitment" sx={{ fontWeight: 700 }} />
                                </Tabs>
                                <Box sx={{ p: 2 }}>
                                    {leftTab === 1 ? (
                                        <DataList people={commitmentPeople} title="" type="commitment" />
                                    ) : (
                                        <Stack spacing={2}>
                                            {eboardUrl && (
                                                <Button
                                                    variant="contained"
                                                    fullWidth
                                                    startIcon={<LaunchIcon />}
                                                    href={eboardUrl}
                                                    target="_blank"
                                                    sx={{ bgcolor: '#37474f', '&:hover': { bgcolor: '#263238' }, fontWeight: 700 }}
                                                >
                                                    Eboard Member Sheet
                                                </Button>
                                            )}
                                            <DataList people={eboardPeople} title="" type="eboard" />
                                        </Stack>
                                    )}
                                </Box>
                            </Paper>
                        </Grid>

                        {/* Right Side: Roster Output */}
                        <Grid width="48%">
                            <Paper variant="outlined" sx={{ borderRadius: 3, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                <Tabs
                                    value={0}
                                    variant="fullWidth"
                                    sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: '#f8faf9' }}
                                >
                                    <Tab label="Current Roster" sx={{ fontWeight: 700 }} />
                                </Tabs>
                                <Box sx={{ p: 2, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                                    <Stack direction="row" spacing={1} sx={{ mb: 2, width: '100%' }}>
                                        <Button
                                            size="small"
                                            variant="contained"
                                            color="info"
                                            disabled={loading || (rosterPeople?.filter(p => p.isDriver).length || 0) === 0}
                                            onClick={() => setOpenAutoFillModal(true)}
                                            sx={{ fontSize: '0.7rem', fontWeight: 700, flex: 1 }}
                                        >
                                            Auto-Fill Non-Drivers
                                        </Button>
                                        <Button
                                            size="small"
                                            variant="contained"
                                            color="success"
                                            disabled={loading || !rosterPeople || rosterPeople.length === 0}
                                            onClick={() => handleSaveRoster(false)}
                                            sx={{ bgcolor: '#006b3d', '&:hover': { bgcolor: '#005a33' }, flex: 1 }}
                                        >
                                            Save
                                        </Button>
                                        <Button
                                            size="small"
                                            variant="contained"
                                            color="inherit"
                                            href={rosterLink}
                                            target="_blank"
                                            disabled={!rosterLink}
                                            startIcon={<LaunchIcon />}
                                            sx={{ bgcolor: '#eee', color: '#333', '&:hover': { bgcolor: '#e0e0e0' }, flex: 0.8, fontSize: '0.7rem' }}
                                        >
                                            Open Roster Sheet
                                        </Button>
                                    </Stack>
                                    <Box sx={{ mb: 2, p: 1.5 }}>
                                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                                            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                                                Total Capacity (w/ Waitlist): {
                                                    ((rosterPeople?.filter(p => p.isDriver).length || 0) * 5) +
                                                    (rosterLinks.find(rl => rl.id === extractId(rosterLink))?.waitlistNum || 0)
                                                }
                                            </Typography>
                                            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                                                Current: {rosterPeople?.length || 0}
                                            </Typography>
                                        </Stack>
                                    </Box>
                                    <DataList people={rosterPeople} title="" type="roster" />
                                </Box>
                            </Paper>
                        </Grid>
                    </Grid>
                </Paper>
            )}
            {/* Alerts Section */}
            <Stack spacing={2}>




                {error && <Alert severity="error">{error}</Alert>}
            </Stack>

            {/* Waitlist Number Modal */}
            <Dialog open={openWaitlistModal} onClose={() => setOpenWaitlistModal(false)}>
                <DialogTitle sx={{ fontWeight: 700 }}>Waitlist Configuration</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                        This roster link is new. Please specify the number of members to waitlist for this sheet.
                    </Typography>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Waitlist Number"
                        type="number"
                        fullWidth
                        variant="outlined"
                        value={waitlistNumInput}
                        onChange={(e) => setWaitlistNumInput(e.target.value)}
                    />
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={() => setOpenWaitlistModal(false)}>Cancel</Button>
                    <Button onClick={handleWaitlistConfirm} variant="contained" sx={{ px: 4 }}>
                        Confirm & Load
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Confirm Modal for Unimplemented Actions */}
            <Dialog open={openConfirmModal} onClose={() => setOpenConfirmModal(false)}>
                <DialogTitle sx={{ fontWeight: 700 }}>Confirm Action</DialogTitle>
                <DialogContent>
                    <Typography variant="body1">
                        {confirmTitle}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1, color: 'error.main', fontWeight: 600 }}>
                        Note: This person is NOT currently marked as a driver in the system.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setOpenConfirmModal(false)}>Cancel</Button>
                    <Button
                        onClick={() => {
                            if (pendingAdd) {
                                // Check if person is already in roster (toggle case)
                                const inRoster = rosterPeople?.some(p => p.email === pendingAdd.person.email);
                                if (inRoster) {
                                    setRosterPeople(prev => prev ? prev.map(p => p.email === pendingAdd.person.email ? { ...p, isDriver: true } : p) : null);
                                    setRosterPeople(prev => prev ? sortPeople(prev) : null);
                                } else {
                                    handleAddPerson(pendingAdd.person, pendingAdd.isDriver, pendingAdd.type);
                                }
                            }
                            setOpenConfirmModal(false);
                        }}
                        variant="contained"
                        color="error"
                    >
                        Confirm Anyway
                    </Button>
                </DialogActions>
            </Dialog>


            {/* Custom Remove Confirm Modal */}
            <Dialog open={openCustomRemoveConfirm} onClose={() => setOpenCustomRemoveConfirm(false)}>
                <DialogTitle sx={{ fontWeight: 700 }}>Confirm Removal</DialogTitle>
                <DialogContent>
                    <Typography variant="body1">
                        Are you sure you want to remove **{targetPersonToRemove?.name}**?
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                        Note: This person is not on the original commitment form or Eboard list. They may have been custom added to the roster.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setOpenCustomRemoveConfirm(false)}>Cancel</Button>
                    <Button
                        onClick={() => handleRemovePerson(targetPersonToRemove, true)}
                        variant="contained"
                        color="error"
                    >
                        Remove Anyway
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Capacity Mismatch Confirm Modal */}
            <Dialog open={openCapacityMismatchModal} onClose={() => setOpenCapacityMismatchModal(false)}>
                <DialogTitle sx={{ fontWeight: 700 }}>Capacity Mismatch Warning</DialogTitle>
                <DialogContent>
                    <Typography variant="body1">
                        The current roster count does not match the calculated total capacity.
                    </Typography>
                    <Box sx={{ mt: 2, p: 2, bgcolor: '#fff3e0', borderRadius: 2, border: '1px solid #ffe0b2' }}>
                        <Typography variant="body2" sx={{ color: '#e65100' }}>
                            {(() => {
                                const drivers = rosterPeople?.filter(p => p.isDriver).length || 0;
                                const currentId = extractId(rosterLink);
                                const meta = rosterLinks.find(rl => rl.id === currentId);
                                const waitlist = meta?.waitlistNum || 0;
                                const totalCap = (drivers * 5) + waitlist;
                                return (
                                    <>
                                        Total Capacity (Drivers × 5 + Waitlist): <b>{totalCap}</b><br />
                                        Current Roster Count: <b>{rosterPeople?.length || 0}</b>
                                    </>
                                );
                            })()}
                        </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
                        Do you want to save anyway?
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setOpenCapacityMismatchModal(false)}>Cancel</Button>
                    <Button
                        onClick={() => {
                            setOpenCapacityMismatchModal(false);
                            handleSaveRoster(true);
                        }}
                        variant="contained"
                        color="warning"
                    >
                        Save Anyway
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Smart Populate Modal */}
            <Dialog open={openAutoFillModal} onClose={() => setOpenAutoFillModal(false)}>
                <DialogTitle sx={{ fontWeight: 800, color: 'info.main' }}>Auto-Fill Non-Drivers ✨</DialogTitle>
                <DialogContent>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        Are you sure you have added all Drivers and Eboard members?
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
                        The system will now automatically fill the remaining slots with Non-Drivers based on their <b>Priority Score</b>.
                    </Typography>
                    <Box sx={{ mt: 3, p: 2, bgcolor: '#f0f7ff', borderRadius: 2, border: '1px solid #cce3ff' }}>
                        <Typography variant="subtitle2" sx={{ color: '#005bb7', fontWeight: 700 }}>
                            Capacity Check:
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#005bb7' }}>
                            {(() => {
                                const drivers = rosterPeople?.filter(p => p.isDriver).length || 0;
                                const currentId = extractId(rosterLink);
                                const meta = rosterLinks.find(rl => rl.id === currentId);
                                const waitlist = meta?.waitlistNum || 0;
                                const totalCap = (drivers * 5) + waitlist;
                                return (
                                    <>
                                        You have <b>{drivers}</b> drivers rostered.<br />
                                        Max Capacity: (<b>{drivers}</b> drivers × 5) + <b>{waitlist}</b> (waitlist) = <b>{totalCap}</b> total.<br />
                                        Current roster size: <b>{rosterPeople?.length || 0}</b>.
                                    </>
                                );
                            })()}
                        </Typography>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={() => setOpenAutoFillModal(false)}>Wait, I'm not done</Button>
                    <Button
                        variant="contained"
                        onClick={handleAutoFill}
                        sx={{ bgcolor: '#006b3d', '&:hover': { bgcolor: '#005a33' }, px: 3 }}
                    >
                        Begin Auto-Fill
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default AutoRoster;
