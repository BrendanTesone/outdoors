import React, { useState, useMemo } from 'react';
import {
    Box, Typography, Paper, TextField, Button, Stack,
    CircularProgress, Divider, FormControl, RadioGroup, FormControlLabel, Radio,
    Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, InputAdornment,
    Alert, Grid, Dialog, DialogContent, DialogActions
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import SendIcon from '@mui/icons-material/Send';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import BalanceIcon from '@mui/icons-material/Balance';
import LinkIcon from '@mui/icons-material/Link';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

interface PersonData {
    name?: string;
    email: string;
    gender?: string | null;
    priority?: number | null;
    isDriver?: boolean;
    isFirstTrip?: boolean | null;
    isEboard?: boolean;
}

interface PriorityItem {
    email: string;
    name: string;
    gender: string | null;
    isFirstTrip?: boolean | null;
    status: 'Went on Trip' | 'Applied & Rejected' | 'Went on Trip (Not in Form)';
    priorityChange: number; // -1, 0, 1
}

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

const extractEmails = (text: string): string[] => {
    if (!text) return [];
    const matches = text.match(EMAIL_REGEX);
    if (!matches) return [];
    const unique = new Set(matches.map(e => e.trim().toLowerCase()));
    return Array.from(unique);
};

const NewSetRosterPriority: React.FC = () => {
    const [commitmentLink, setCommitmentLink] = useState<string>('');
    const [wentOnTripInput, setWentOnTripInput] = useState<string>('');

    const [loadingProcess, setLoadingProcess] = useState<boolean>(false);
    const [commitmentPeople, setCommitmentPeople] = useState<PersonData[] | null>(null);

    const [overrides, setOverrides] = useState<Record<string, number>>({});
    const [searchQuery, setSearchQuery] = useState<string>('');

    const [processing, setProcessing] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);

    // Modal Success Dialog State
    const [successModal, setSuccessModal] = useState<{
        open: boolean;
        title: string;
        message: string;
        details?: React.ReactNode;
    }>({ open: false, title: '', message: '' });

    const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL;

    // Check if both input boxes have content
    const isProcessReady = useMemo(() => {
        return Boolean(commitmentLink.trim() && wentOnTripInput.trim());
    }, [commitmentLink, wentOnTripInput]);

    // Process commitment form and resolve gender / priority when PROCESS button is clicked
    const handleProcess = async () => {
        if (!commitmentLink.trim()) {
            setError("Please enter a valid Commitment Form spreadsheet link.");
            return;
        }
        if (!wentOnTripInput.trim()) {
            setError("Please enter emails of members who went on the trip.");
            return;
        }
        if (!APPS_SCRIPT_URL) {
            setError("Apps Script backend URL is not configured.");
            return;
        }

        setLoadingProcess(true);
        setError(null);
        setStatusMessage(null);

        try {
            const response = await fetch(APPS_SCRIPT_URL, {
                method: 'POST',
                mode: 'cors',
                cache: 'no-cache',
                body: JSON.stringify({
                    action: 'getCommitmentDataWithGender',
                    link: commitmentLink.trim()
                }),
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            });

            const data = await response.json();

            if (data.success) {
                const people: PersonData[] = (data.people || []).map((p: any) => ({
                    ...p,
                    email: p.email.toLowerCase()
                }));
                setCommitmentPeople(people);
                const msg = `Processed commitment form (${people.length} applicants) & resolved genders!`;
                setStatusMessage(msg);
                setSuccessModal({
                    open: true,
                    title: 'Commitment Form Processed!',
                    message: `Successfully loaded ${people.length} applicants from the commitment form and auto-resolved member genders in the backend.`,
                    details: (
                        <Box sx={{ mt: 1.5, p: 2, bgcolor: '#f0f7ff', borderRadius: 2, border: '1px solid #90caf9', textAlign: 'left' }}>
                            <Typography variant="subtitle2" sx={{ color: '#1565c0', fontWeight: 700, mb: 1 }}>
                                Processing Summary:
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'text.primary', lineHeight: 1.6 }}>
                                • Applicants Loaded: <b>{people.length}</b><br />
                                • Trip Attendees (Went): <b>{wentEmails.length}</b><br />
                                • Adjustments Calculated: <b>{Math.max(people.length, wentEmails.length)} member adjustments ready for review below!</b>
                            </Typography>
                        </Box>
                    )
                });
            } else {
                setError(data.error || "Failed to process commitment form data.");
            }
        } catch (e) {
            setError("Connection Error: " + (e as Error).message);
        } finally {
            setLoadingProcess(false);
        }
    };

    // Parse email lists
    const wentEmails = useMemo(() => extractEmails(wentOnTripInput), [wentOnTripInput]);

    // Map commitment people by email
    const commitmentMap = useMemo(() => {
        const map = new Map<string, PersonData>();
        if (commitmentPeople) {
            commitmentPeople.forEach(p => {
                map.set(p.email.toLowerCase(), p);
            });
        }
        return map;
    }, [commitmentPeople]);

    const commitmentEmails = useMemo(() => Array.from(commitmentMap.keys()), [commitmentMap]);

    // Calculate priority list based on both inputs
    const computedPriorityList = useMemo(() => {
        if (!commitmentPeople) return [];

        const wentSet = new Set(wentEmails);
        const allEmailsSet = new Set([...wentEmails, ...commitmentEmails]);

        const list: PriorityItem[] = [];

        allEmailsSet.forEach(email => {
            const went = wentSet.has(email);
            const applied = commitmentMap.has(email);
            const personInfo = commitmentMap.get(email);

            let status: PriorityItem['status'];
            let defaultChange: number;

            if (went) {
                status = applied ? 'Went on Trip' : 'Went on Trip (Not in Form)';
                defaultChange = -1; // Decrease priority by 1 for attending trip
            } else {
                status = 'Applied & Rejected';
                defaultChange = 1; // Increase priority (rejected count) by 1
            }

            const priorityChange = overrides[email] !== undefined ? overrides[email] : defaultChange;

            list.push({
                email,
                name: personInfo?.name || '',
                gender: personInfo?.gender || null,
                isFirstTrip: personInfo?.isFirstTrip || null,
                status,
                priorityChange
            });
        });

        // Sort by status, then email
        return list.sort((a, b) => {
            if (a.status !== b.status) {
                return a.status.localeCompare(b.status);
            }
            return a.email.localeCompare(b.email);
        });
    }, [wentEmails, commitmentEmails, commitmentMap, commitmentPeople, overrides]);

    const filteredPriorityList = useMemo(() => {
        if (!searchQuery.trim()) return computedPriorityList;
        const q = searchQuery.toLowerCase();
        return computedPriorityList.filter(item =>
            item.email.toLowerCase().includes(q) || item.name.toLowerCase().includes(q)
        );
    }, [computedPriorityList, searchQuery]);

    const handlePriorityOverride = (email: string, value: number) => {
        setOverrides(prev => ({
            ...prev,
            [email]: value
        }));
    };

    const handleReset = () => {
        setWentOnTripInput('');
        setCommitmentLink('');
        setCommitmentPeople(null);
        setOverrides({});
        setError(null);
        setStatusMessage(null);
    };

    const handleSubmit = async () => {
        if (computedPriorityList.length === 0) {
            setError("No emails detected to submit.");
            return;
        }
        if (!APPS_SCRIPT_URL) {
            setError("Apps Script backend URL is not configured.");
            return;
        }

        setProcessing(true);
        setStatusMessage("Updating priorities in backend database...");
        setError(null);

        const adjustments = computedPriorityList
            .filter(item => item.priorityChange !== 0)
            .map(item => ({
                email: item.email,
                name: item.name || '',
                amountChange: item.priorityChange
            }));

        if (adjustments.length === 0) {
            setStatusMessage("No priority adjustments were made (all set to 0).");
            setProcessing(false);
            return;
        }

        try {
            const response = await fetch(APPS_SCRIPT_URL, {
                method: 'POST',
                mode: 'cors',
                cache: 'no-cache',
                body: JSON.stringify({
                    action: 'batchAdjustPriority',
                    adjustments: adjustments
                }),
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            });

            const data = await response.json();

            if (data.success) {
                const msg = `Success! ${data.message || 'Priority database updated successfully.'}`;
                setStatusMessage(msg);
                setSuccessModal({
                    open: true,
                    title: 'Priority Database Updated!',
                    message: `Success! ${data.message || 'Priority database updated successfully.'}`,
                    details: (
                        <Box sx={{ mt: 1.5, p: 2, bgcolor: '#e8f5e9', borderRadius: 2, border: '1px solid #66bb6a', textAlign: 'left' }}>
                            <Typography variant="subtitle2" sx={{ color: '#2e7d32', fontWeight: 700 }}>
                                ✅ Synchronization Complete
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                All member priority scores have been saved to the master priority sheet in Google Drive.
                            </Typography>
                        </Box>
                    )
                });
            } else {
                setError(data.error || 'Failed to update priority database.');
            }
        } catch (e) {
            setError("Connection Error: " + (e as Error).message);
        } finally {
            setProcessing(false);
        }
    };

    const stats = useMemo(() => {
        const wentCount = computedPriorityList.filter(i => i.priorityChange < 0).length;
        const rejectedCount = computedPriorityList.filter(i => i.priorityChange > 0).length;
        const neutralCount = computedPriorityList.filter(i => i.priorityChange === 0).length;
        return { wentCount, rejectedCount, neutralCount, total: computedPriorityList.length };
    }, [computedPriorityList]);

    const genderStats = useMemo(() => {
        if (!commitmentPeople) return null;
        const female = commitmentPeople.filter(p => p.gender?.toLowerCase() === 'female').length;
        const male = commitmentPeople.filter(p => p.gender?.toLowerCase() === 'male').length;
        const unknown = commitmentPeople.length - female - male;
        return { female, male, unknown };
    }, [commitmentPeople]);

    return (
        <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', gap: 3, maxWidth: 1000, mx: 'auto' }}>
            {/* Header & Instructions */}
            <Box>
                <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.main', mb: 2 }}>
                    Set Priority for Trip
                </Typography>
                <Alert severity="info" sx={{ borderRadius: 2, border: '1px solid #90caf9' }}>
                    <Typography variant="body2" fontWeight="bold" gutterBottom>Instructions:</Typography>
                    <Typography variant="body2" component="div">
                        <ol style={{ margin: 0, paddingLeft: 20 }}>
                            <li><b>Enter Trip Inputs:</b> Paste the Google Sheets link for your commitment form responses and the list of emails for members who went on the trip.</li>
                            <li><b>Process Commitment Form:</b> Click <b>Process Commitment Form</b> to load applicants, resolve missing genders, and calculate score adjustments (-1 for trip goers, +1 for rejected applicants).</li>
                            <li><b>Review & Submit:</b> Check the calculated priority adjustments in the preview table below and click <b>Submit Batch Priority Changes</b> to update the database.</li>
                        </ol>
                    </Typography>
                </Alert>
            </Box>

            {error && (
                <Alert severity="error" onClose={() => setError(null)} icon={<ErrorOutlineIcon />}>
                    {error}
                </Alert>
            )}

            {statusMessage && (
                <Alert severity={statusMessage.startsWith('Success') ? 'success' : 'info'} onClose={() => setStatusMessage(null)}>
                    {statusMessage}
                </Alert>
            )}

            {/* ── Step 1: Enter Trip Inputs ── */}
            <Paper elevation={2} sx={{
                p: 3, borderRadius: 3,
                border: '2px solid',
                borderColor: commitmentPeople ? '#2e7d32' : '#eef2f1',
            }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                    {commitmentPeople
                        ? <CheckCircleIcon sx={{ color: '#2e7d32' }} />
                        : <Typography sx={{ fontWeight: 800, fontSize: '1.1rem' }}>1</Typography>}
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>Enter Trip Inputs</Typography>
                </Stack>

                <Grid container spacing={3}>
                    {/* Box 1: Commitment Form Link */}
                    <Grid size={{ xs: 12, md: 6 }}>
                        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#f9fafb' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <LinkIcon color="primary" fontSize="small" /> Commitment Form Link
                                </Typography>
                                {commitmentPeople && (
                                    <Chip
                                        label={`${commitmentPeople.length} Loaded`}
                                        color="success"
                                        size="small"
                                        sx={{ fontWeight: 700 }}
                                    />
                                )}
                            </Box>
                            <Typography variant="caption" color="text.secondary" sx={{ mb: 2 }}>
                                Spreadsheet link to the trip's commitment form responses.
                            </Typography>
                            <TextField
                                fullWidth
                                size="small"
                                variant="outlined"
                                placeholder="https://docs.google.com/spreadsheets/d/..."
                                label="Commitment Form Link"
                                value={commitmentLink}
                                onChange={(e) => setCommitmentLink(e.target.value)}
                                disabled={loadingProcess || processing}
                                sx={{ mb: 2 }}
                            />
                            <Button
                                fullWidth
                                variant="contained"
                                onClick={handleProcess}
                                disabled={loadingProcess || processing || !isProcessReady}
                                startIcon={loadingProcess ? <CircularProgress size={18} color="inherit" /> : <PlayArrowIcon />}
                                sx={{
                                    bgcolor: '#005A43',
                                    '&:hover': { bgcolor: '#003d2e' },
                                    fontWeight: 700,
                                    py: 1,
                                    borderRadius: 2
                                }}
                            >
                                {loadingProcess ? 'Processing...' : 'Process Commitment Form'}
                            </Button>
                        </Paper>
                    </Grid>

                    {/* Box 2: Went On Trip Emails */}
                    <Grid size={{ xs: 12, md: 6 }}>
                        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#f9fafb' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <CheckCircleIcon color="success" fontSize="small" /> Went On Trip Emails
                                </Typography>
                                <Chip
                                    label={`${wentEmails.length} Attendees`}
                                    color={wentEmails.length > 0 ? "success" : "default"}
                                    size="small"
                                    sx={{ fontWeight: 700 }}
                                />
                            </Box>
                            <Typography variant="caption" color="text.secondary" sx={{ mb: 2 }}>
                                List of emails for members who attended the trip (Priority -1).
                            </Typography>
                            <TextField
                                multiline
                                rows={5}
                                fullWidth
                                size="small"
                                variant="outlined"
                                placeholder={"btesone@binghamton.edu\ncsandt@binghamton.edu\ndfried2@binghamton.edu\n..."}
                                value={wentOnTripInput}
                                onChange={(e) => setWentOnTripInput(e.target.value)}
                                disabled={loadingProcess || processing}
                                sx={{ flexGrow: 1, fontFamily: 'monospace' }}
                            />
                        </Paper>
                    </Grid>
                </Grid>

                {genderStats && (
                    <Box sx={{ mt: 3, p: 1.5, borderRadius: 2, bgcolor: '#f0f7ff', border: '1px solid #90caf9', display: 'flex', alignItems: 'center', gap: 2 }}>
                        <BalanceIcon sx={{ color: '#1565c0' }} />
                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#1565c0' }}>
                            Gender Sync Complete:
                        </Typography>
                        <Stack direction="row" spacing={1}>
                            <Chip label={`🩷 Female: ${genderStats.female}`} size="small" sx={{ bgcolor: '#fce4ec', color: '#880e4f', fontWeight: 700 }} />
                            <Chip label={`💙 Male: ${genderStats.male}`} size="small" sx={{ bgcolor: '#e3f2fd', color: '#1565c0', fontWeight: 700 }} />
                            {genderStats.unknown > 0 && (
                                <Chip label={`❓ Unknown: ${genderStats.unknown}`} size="small" sx={{ bgcolor: '#f1f3f4', color: '#5f6368', fontWeight: 700 }} />
                            )}
                        </Stack>
                    </Box>
                )}
            </Paper>

            {/* ── Step 2: Review & Submit Priority Adjustments ── */}
            {computedPriorityList.length > 0 && (
                <Paper elevation={2} sx={{ p: 3, borderRadius: 3, border: '2px solid #005A43' }}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                        <Typography sx={{ fontWeight: 800, fontSize: '1.1rem' }}>2</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 800 }}>Review & Submit Priority Adjustments</Typography>
                    </Stack>

                    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 3 }}>
                        <Typography variant="body2" color="text.secondary">
                            Review calculated adjustments before submitting to the database. Negative numbers decrease priority; positive numbers increase priority.
                        </Typography>

                        <Stack direction="row" spacing={1}>
                            <Chip label={`Total: ${stats.total}`} variant="outlined" sx={{ fontWeight: 700 }} />
                            <Chip label={`-1 (Went): ${stats.wentCount}`} color="error" variant="outlined" sx={{ fontWeight: 700 }} />
                            <Chip label={`+1 (Rejected): ${stats.rejectedCount}`} color="success" variant="outlined" sx={{ fontWeight: 700 }} />
                            {stats.neutralCount > 0 && <Chip label={`0 (Neutral): ${stats.neutralCount}`} variant="outlined" sx={{ fontWeight: 700 }} />}
                        </Stack>
                    </Box>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                        <TextField
                            size="small"
                            placeholder="Filter by name or email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon fontSize="small" />
                                    </InputAdornment>
                                ),
                            }}
                            sx={{ width: { xs: '100%', sm: 300 } }}
                        />

                        <Stack direction="row" spacing={1}>
                            <Button size="small" variant="outlined" color="inherit" onClick={handleReset} disabled={processing}>
                                Clear All
                            </Button>
                        </Stack>
                    </Stack>

                    <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 400, borderRadius: 2 }}>
                        <Table stickyHeader size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 800 }}>Member Info</TableCell>
                                    <TableCell sx={{ fontWeight: 800 }}>Gender</TableCell>
                                    <TableCell sx={{ fontWeight: 800 }}>Category Status</TableCell>
                                    <TableCell sx={{ fontWeight: 800, textAlign: 'center' }}>Adjustment Override</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredPriorityList.map((item) => (
                                    <TableRow key={item.email} hover>
                                        <TableCell>
                                            <Stack direction="row" alignItems="center" spacing={1}>
                                                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                                    {item.name || '—'}
                                                </Typography>
                                                {item.isFirstTrip && (
                                                    <Chip label="🌟 First Trip" size="small" sx={{ bgcolor: '#fff8e1', color: '#b78103', fontWeight: 800, fontSize: '0.65rem', height: 18 }} />
                                                )}
                                            </Stack>
                                            <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                                                {item.email}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            {(() => {
                                                const g = item.gender?.toLowerCase();
                                                if (g === 'female') return <Chip label="Female" size="small" sx={{ bgcolor: '#fce4ec', color: '#880e4f', fontWeight: 700, fontSize: '0.7rem' }} />;
                                                if (g === 'male') return <Chip label="Male" size="small" sx={{ bgcolor: '#e3f2fd', color: '#1565c0', fontWeight: 700, fontSize: '0.7rem' }} />;
                                                return <Chip label="Unknown" size="small" sx={{ bgcolor: '#f1f3f4', color: '#5f6368', fontWeight: 600, fontSize: '0.7rem' }} />;
                                            })()}
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                size="small"
                                                label={item.status}
                                                color={item.status.startsWith('Went') ? 'warning' : 'info'}
                                                sx={{ fontWeight: 700, fontSize: '0.75rem' }}
                                            />
                                        </TableCell>
                                        <TableCell align="center">
                                            <FormControl component="fieldset">
                                                <RadioGroup
                                                    row
                                                    value={item.priorityChange}
                                                    onChange={(e) => handlePriorityOverride(item.email, parseInt(e.target.value, 10))}
                                                >
                                                    <FormControlLabel
                                                        value={1}
                                                        control={<Radio size="small" color="success" />}
                                                        label={<Typography variant="caption" sx={{ color: 'green', fontWeight: 'bold' }}>+1 (Boost)</Typography>}
                                                    />
                                                    <FormControlLabel
                                                        value={0}
                                                        control={<Radio size="small" />}
                                                        label={<Typography variant="caption">0</Typography>}
                                                    />
                                                    <FormControlLabel
                                                        value={-1}
                                                        control={<Radio size="small" color="error" />}
                                                        label={<Typography variant="caption" sx={{ color: 'red', fontWeight: 'bold' }}>-1 (Penalty)</Typography>}
                                                    />
                                                </RadioGroup>
                                            </FormControl>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    <Divider sx={{ my: 3 }} />

                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                        <Button
                            variant="contained"
                            size="large"
                            startIcon={processing ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                            onClick={handleSubmit}
                            disabled={processing || computedPriorityList.length === 0}
                            sx={{ bgcolor: 'primary.main', px: 4, fontWeight: 700 }}
                        >
                            {processing ? 'Submitting Changes...' : `Submit Batch Priority Changes (${stats.wentCount + stats.rejectedCount} Active)`}
                        </Button>
                    </Box>
                </Paper>
            )}

            {/* Success Modal Dialog */}
            <Dialog
                open={successModal.open}
                onClose={() => setSuccessModal(prev => ({ ...prev, open: false }))}
                PaperProps={{
                    sx: {
                        borderRadius: 4,
                        p: 2,
                        textAlign: 'center',
                        maxWidth: 480,
                        width: '100%'
                    }
                }}
            >
                <DialogContent sx={{ pt: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                        <CheckCircleOutlineIcon sx={{ fontSize: 68, color: '#2e7d32' }} />
                    </Box>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.main', mb: 1 }}>
                        {successModal.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {successModal.message}
                    </Typography>
                    {successModal.details}
                </DialogContent>
                <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
                    <Button
                        variant="contained"
                        size="large"
                        onClick={() => setSuccessModal(prev => ({ ...prev, open: false }))}
                        sx={{
                            bgcolor: '#005A43',
                            '&:hover': { bgcolor: '#003d2e' },
                            fontWeight: 700,
                            px: 4,
                            borderRadius: 2
                        }}
                    >
                        Got It
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default NewSetRosterPriority;
