import { useState, useMemo } from 'react';
import {
    Box, Typography, Paper, TextField, Button, Stack,
    CircularProgress, Alert, Divider, Chip, LinearProgress,
    Stepper, Step, StepLabel, Accordion, AccordionSummary, AccordionDetails
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LaunchIcon from '@mui/icons-material/Launch';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL;
const FIRST_TIMER_TARGET_RATIO = 0.70; // target 70% first timers
const FEMALE_TARGET_RATIO = 0.55;       // target 55% female among non-eboard

type StepStatus = 'idle' | 'loading' | 'done' | 'error';

interface StepState {
    label: string;
    status: StepStatus;
    detail?: string;
}

// ─── Sorting Utilities ────────────────────────────────────────────────────────

const byPriority = (a: any, b: any) => {
    const aDriver = a.isDriver ? 1 : 0;
    const bDriver = b.isDriver ? 1 : 0;
    if (bDriver !== aDriver) return bDriver - aDriver; // Drivers always sort first

    const diff = (b.priority ?? 0) - (a.priority ?? 0);
    return diff !== 0 ? diff : (a.name || '').localeCompare(b.name || '');
};

/**
 * Multi-target interleave queue popping algorithm:
 * 1. Targets ~70% First Timers (isFirstTrip === true).
 * 2. Targets ~55% Female gender balance.
 * 3. Gracefully pops available first-timers until exhausted, then pops returning members.
 * 4. Works seamlessly when 0 first timers exist or when fewer than 70% can make it.
 */
function autoRosterSort(people: any[]): any[] {
    if (!people || people.length === 0) return [];

    // Separate into First Timers (isFirstTrip === true) vs Returning (isFirstTrip !== true)
    const firstTimers = people.filter(p => p.isFirstTrip === true);
    const returning   = people.filter(p => p.isFirstTrip !== true);

    // Create sub-queues split by gender & sorted by priority within First Timers
    const ftFemale = firstTimers.filter(p => p.gender?.toLowerCase() === 'female').sort(byPriority);
    const ftMale   = firstTimers.filter(p => p.gender?.toLowerCase() === 'male').sort(byPriority);
    const ftOther  = firstTimers.filter(p => !p.gender || (p.gender.toLowerCase() !== 'female' && p.gender.toLowerCase() !== 'male')).sort(byPriority);

    // Create sub-queues split by gender & sorted by priority within Returning
    const retFemale = returning.filter(p => p.gender?.toLowerCase() === 'female').sort(byPriority);
    const retMale   = returning.filter(p => p.gender?.toLowerCase() === 'male').sort(byPriority);
    const retOther  = returning.filter(p => !p.gender || (p.gender.toLowerCase() !== 'female' && p.gender.toLowerCase() !== 'male')).sort(byPriority);

    const result: any[] = [];

    // Helper to pop next candidate from sub-queues respecting female target ratio (55%)
    const popGenderBalanced = (fQ: any[], mQ: any[], oQ: any[]) => {
        const total = result.length;
        const femalesAdded = result.filter(p => p.gender?.toLowerCase() === 'female').length;
        const currentFemaleRatio = total === 0 ? 0 : femalesAdded / total;
        const needFemale = currentFemaleRatio < FEMALE_TARGET_RATIO;

        if (needFemale && fQ.length > 0) return fQ.shift()!;
        if (mQ.length > 0) return mQ.shift()!;
        if (fQ.length > 0) return fQ.shift()!;
        if (oQ.length > 0) return oQ.shift()!;
        return null;
    };

    const hasAny = (fQ: any[], mQ: any[], oQ: any[]) => fQ.length > 0 || mQ.length > 0 || oQ.length > 0;

    const hasFirstTimersLeft = () => hasAny(ftFemale, ftMale, ftOther);
    const hasReturningLeft   = () => hasAny(retFemale, retMale, retOther);
    while (hasFirstTimersLeft() || hasReturningLeft()) {
        const total = result.length;
        const ftAdded = result.filter(p => p.isFirstTrip === true).length;
        const currentFtRatio = total === 0 ? 0 : ftAdded / total;
        const needFirstTimer = currentFtRatio < FIRST_TIMER_TARGET_RATIO;

        let selected = null;

        if (needFirstTimer && hasFirstTimersLeft()) {
            selected = popGenderBalanced(ftFemale, ftMale, ftOther);
        } else if (hasReturningLeft()) {
            selected = popGenderBalanced(retFemale, retMale, retOther);
        } else if (hasFirstTimersLeft()) {
            selected = popGenderBalanced(ftFemale, ftMale, ftOther);
        }

        if (selected) {
            result.push(selected);
        } else {
            break;
        }
    }

    return result;
}

/**
 * Priority sort with 70% First-Timers modification (used when some members are ungendered).
 * Interleaves First-Timers (70% target) and Returning members strictly sorted by priority.
 */
function firstTimerPrioritySort(people: any[]): any[] {
    if (!people || people.length === 0) return [];

    const firstTimerQueue = people.filter(p => p.isFirstTrip === true).sort(byPriority);
    const returningQueue  = people.filter(p => p.isFirstTrip !== true).sort(byPriority);

    const result: any[] = [];

    while (firstTimerQueue.length > 0 || returningQueue.length > 0) {
        const total = result.length;
        const ftAdded = result.filter(p => p.isFirstTrip === true).length;
        const currentFtRatio = total === 0 ? 0 : ftAdded / total;
        const needFirstTimer = currentFtRatio < FIRST_TIMER_TARGET_RATIO;

        if (needFirstTimer && firstTimerQueue.length > 0) {
            result.push(firstTimerQueue.shift()!);
        } else if (returningQueue.length > 0) {
            result.push(returningQueue.shift()!);
        } else {
            result.push(firstTimerQueue.shift()!);
        }
    }

    return result;
}

// ─── Component ────────────────────────────────────────────────────────────────

const AutoRoster2 = () => {
    const [commitmentLink, setCommitmentLink] = useState('');
    const [rosterName, setRosterName] = useState('');

    const [loadingCommitment, setLoadingCommitment] = useState(false);

    const [commitmentPeople, setCommitmentPeople] = useState<any[] | null>(null);
    const [eboardPeople, setEboardPeople] = useState<any[] | null>(null);

    const [validationError, setValidationError] = useState<string | null>(null);

    const [building, setBuilding] = useState(false);
    const [buildSteps, setBuildSteps] = useState<StepState[]>([]);
    const [createdLink, setCreatedLink] = useState<string | null>(null);
    const [globalError, setGlobalError] = useState<string | null>(null);

    const post = (body: object) =>
        fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            mode: 'cors',
            cache: 'no-cache',
            body: JSON.stringify(body),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        }).then(r => r.json());

    const updateStep = (index: number, patch: Partial<StepState>) => {
        setBuildSteps(prev => prev.map((s, i) => i === index ? { ...s, ...patch } : s));
    };

    // ─── Step 1: Load commitment form with auto-gender resolution ────────────
    const handleLoad = async () => {
        if (!commitmentLink.trim()) return;

        setLoadingCommitment(true);
        setValidationError(null);
        setCommitmentPeople(null);
        setEboardPeople(null);
        setCreatedLink(null);
        setBuildSteps([]);
        setGlobalError(null);

        try {
            const [commitData, eboardData] = await Promise.all([
                post({ action: 'getCommitmentDataWithGender', link: commitmentLink.trim() }),
                post({ action: 'getEboardData' }),
            ]);

            if (!commitData.success) {
                setValidationError(commitData.error || 'Failed to load commitment form.');
                return;
            }

            const eboardMembers: any[] = (eboardData.success && eboardData.members) ? eboardData.members : [];
            const eboardEmails = new Set(eboardMembers.map(m => String(m.email).trim().toLowerCase()));

            const rawPeople: any[] = commitData.people || [];

            // Filter out eboard members from commitmentPeople so they aren't duplicated
            const regulars = rawPeople.filter(p => !eboardEmails.has(String(p.email).trim().toLowerCase()));

            setEboardPeople(eboardMembers);
            setCommitmentPeople(regulars);
        } catch (e) {
            setValidationError((e as Error).message);
        } finally {
            setLoadingCommitment(false);
        }
    };

    // ─── Step 2: Make Roster ──────────────────────────────────────────────────
    const handleMakeRoster = async () => {
        if (!commitmentPeople || !eboardPeople) return;

        setBuilding(true);
        setGlobalError(null);
        setCreatedLink(null);

        setBuildSteps([
            { label: 'Create roster spreadsheet from template', status: 'loading' },
            { label: 'Add E-board members', status: 'idle' },
            { label: 'Add regular members (Drivers First, 70% First-Timers, & Gender Balance sort)', status: 'idle' },
        ]);

        try {
            // Step 1: Create Spreadsheet
            let rosterLink = '';
            try {
                const nameArg = rosterName.trim() ? { rosterName: rosterName.trim() } : {};
                const createRes = await post({ action: 'createRosterFromTemplate', ...nameArg });
                if (!createRes.success) throw new Error(createRes.error || 'Failed to create spreadsheet.');
                rosterLink = createRes.link;
                updateStep(0, { status: 'done', detail: createRes.name });
            } catch (e) {
                updateStep(0, { status: 'error', detail: (e as Error).message });
                setGlobalError((e as Error).message);
                setBuilding(false);
                return;
            }

            // Step 2: Add E-board members
            updateStep(1, { status: 'loading' });
            try {
                if (eboardPeople.length > 0) {
                    const eboardPayload = eboardPeople.map(p => ({ ...p, isDriver: false }));
                    const addEboard = await post({ action: 'addPeople', link: rosterLink, people: eboardPayload });
                    if (!addEboard.success) throw new Error(addEboard.error || 'Failed to add E-board members.');
                }
                updateStep(1, { status: 'done', detail: `${eboardPeople.length} E-board members added` });
            } catch (e) {
                updateStep(1, { status: 'error', detail: (e as Error).message });
                setGlobalError((e as Error).message);
                setBuilding(false);
                return;
            }

            // Step 3: Add Regular Members (Drivers sorted first, followed by non-drivers)
            updateStep(2, { status: 'loading' });
            try {
                const drivers = commitmentPeople.filter(p => p.isDriver).sort(byPriority);
                const nonDrivers = commitmentPeople.filter(p => !p.isDriver);
                const sortedNonDrivers = allHaveGender ? autoRosterSort(nonDrivers) : firstTimerPrioritySort(nonDrivers);
                const sorted = [...drivers, ...sortedNonDrivers];

                const regularsPayload = sorted.map(p => ({ ...p, isDriver: !!p.isDriver }));
                const addRegulars = await post({ action: 'addPeople', link: rosterLink, people: regularsPayload });
                if (!addRegulars.success) throw new Error(addRegulars.error || 'Failed to add regular members.');

                updateStep(2, { status: 'done' });
            } catch (e) {
                updateStep(2, { status: 'error', detail: (e as Error).message });
                setGlobalError((e as Error).message);
                setBuilding(false);
                return;
            }

            setCreatedLink(rosterLink);
        } finally {
            setBuilding(false);
        }
    };

    // ─── Derived display state ────────────────────────────────────────────────

    const dataLoaded = commitmentPeople !== null && eboardPeople !== null;
    const totalPeople = (eboardPeople?.length ?? 0) + (commitmentPeople?.length ?? 0);

    const femaleCount     = commitmentPeople?.filter(p => p.gender?.toLowerCase() === 'female').length ?? 0;
    const maleCount       = commitmentPeople?.filter(p => p.gender?.toLowerCase() === 'male').length ?? 0;
    const unknownCount    = commitmentPeople ? commitmentPeople.length - femaleCount - maleCount : 0;
    const allHaveGender   = commitmentPeople ? (commitmentPeople.length > 0 && unknownCount === 0) : false;

    const sortedRegulars  = useMemo(() => {
        if (!commitmentPeople) return [];
        const drivers = commitmentPeople.filter(p => p.isDriver).sort(byPriority);
        const nonDrivers = commitmentPeople.filter(p => !p.isDriver);
        const sortedNonDrivers = allHaveGender ? autoRosterSort(nonDrivers) : firstTimerPrioritySort(nonDrivers);
        return [...drivers, ...sortedNonDrivers];
    }, [commitmentPeople, allHaveGender]);

    const genderChip = (g: string | null) => {
        const gender = g?.toLowerCase();
        if (gender === 'female') return <Chip label="F" size="small" sx={{ bgcolor: '#fce4ec', color: '#880e4f', fontWeight: 800, fontSize: '0.6rem', height: 18, minWidth: 24 }} />;
        if (gender === 'male')   return <Chip label="M" size="small" sx={{ bgcolor: '#e3f2fd', color: '#1565c0', fontWeight: 800, fontSize: '0.6rem', height: 18, minWidth: 24 }} />;
        return <Chip label="?" size="small" sx={{ bgcolor: '#f1f3f4', color: '#5f6368', fontWeight: 700, fontSize: '0.6rem', height: 18, minWidth: 24 }} />;
    };

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', gap: 3, maxWidth: 780, mx: 'auto' }}>
            <Box>
                <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.main', mb: 2 }}>
                    Auto Roster
                </Typography>

                <Accordion variant="outlined" defaultExpanded sx={{ borderRadius: 2, bgcolor: '#fafafa', border: '1px solid #e0e6e4' }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <InfoOutlinedIcon color="primary" fontSize="small" />
                            <Typography variant="subtitle2" fontWeight={800} color="primary.main">
                                How Applicants Are Sorted
                            </Typography>
                        </Stack>
                    </AccordionSummary>
                    <AccordionDetails sx={{ pt: 0 }}>
                        <Typography variant="body2" component="div" sx={{ color: 'text.secondary', lineHeight: 1.7 }}>
                            <ol style={{ margin: 0, paddingLeft: 20 }}>
                                <li><b>👑 E-board First</b></li>
                                <li><b>🚗 Drivers Second</b></li>
                                <li><b>🌟 70% First-Timers Target</b></li>
                                <li><b>🩷 Gender Balance</b></li>
                                <li><b>📊 Priority Points</b></li>
                            </ol>
                        </Typography>
                    </AccordionDetails>
                </Accordion>
            </Box>

            {/* ── Step 1: Load commitment form ── */}
            <Paper elevation={2} sx={{
                p: 3, borderRadius: 3,
                border: '2px solid',
                borderColor: dataLoaded ? '#2e7d32' : '#eef2f1',
            }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                    {dataLoaded
                        ? <CheckCircleIcon sx={{ color: '#2e7d32' }} />
                        : <Typography sx={{ fontWeight: 800, fontSize: '1.1rem' }}>1</Typography>}
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>Load Commitment Form</Typography>
                </Stack>

                <Stack direction="row" spacing={1}>
                    <TextField
                        fullWidth
                        size="small"
                        label="Commitment Form Spreadsheet Link"
                        value={commitmentLink}
                        onChange={e => setCommitmentLink(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && !loadingCommitment && handleLoad()}
                        disabled={loadingCommitment || building}
                        placeholder="https://docs.google.com/spreadsheets/d/..."
                    />
                    <Button
                        variant="contained"
                        onClick={handleLoad}
                        disabled={loadingCommitment || !commitmentLink.trim() || building}
                        sx={{ minWidth: 100, bgcolor: '#006b3d', '&:hover': { bgcolor: '#005a33' } }}
                    >
                        {loadingCommitment ? <CircularProgress size={20} color="inherit" /> : 'Load'}
                    </Button>
                </Stack>

                {validationError && (
                    <Alert severity="error" sx={{ mt: 2 }} icon={<ErrorOutlineIcon />}>
                        {validationError}
                    </Alert>
                )}

                {/* ── Preview after load ── */}
                {dataLoaded && (
                    <Box sx={{ mt: 3 }}>

                        {/* Eboard preview */}
                        {eboardPeople!.length > 0 && (
                            <Box sx={{ mb: 2 }}>
                                <Typography variant="caption" sx={{ fontWeight: 700, color: '#ef6c00', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Eboard (added first, Non-Driver)
                                </Typography>
                                <Paper variant="outlined" sx={{ mt: 0.5, maxHeight: 120, overflow: 'auto', bgcolor: '#fffaf5' }}>
                                    {eboardPeople!.map((p, i) => (
                                        <Box key={i} sx={{
                                            px: 1.5, py: 0.6,
                                            borderBottom: i < eboardPeople!.length - 1 ? '1px solid #f0e0cc' : 'none',
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                        }}>
                                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{p.name}</Typography>
                                            <Typography variant="caption" color="text.secondary">{p.email}</Typography>
                                        </Box>
                                    ))}
                                </Paper>
                            </Box>
                        )}

                        {/* Regulars preview */}
                        {sortedRegulars.length > 0 && (
                            <Box>
                                <Paper variant="outlined" sx={{ mt: 0.5, maxHeight: 240, overflow: 'auto', bgcolor: '#f8fbff' }}>
                                    {sortedRegulars.map((p, i) => (
                                        <Box key={i} sx={{
                                            px: 1.5, py: 0.65,
                                            borderBottom: i < sortedRegulars.length - 1 ? '1px solid #e3eef8' : 'none',
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                        }}>
                                            <Stack direction="row" spacing={1} alignItems="center">
                                                <Typography variant="caption" color="text.disabled" sx={{ minWidth: 22, fontWeight: 700 }}>
                                                    #{i + 1}
                                                </Typography>
                                                {genderChip(p.gender)}
                                                <Typography variant="body2" sx={{ fontWeight: 600 }}>{p.name}</Typography>
                                                {p.isDriver && (
                                                    <Chip
                                                        label="🚗 Driver"
                                                        size="small"
                                                        sx={{ bgcolor: '#e8f5e9', color: '#2e7d32', fontWeight: 800, fontSize: '0.62rem', height: 18 }}
                                                    />
                                                )}
                                                {p.isFirstTrip && (
                                                     <Chip
                                                         label="🌟 First Trip"
                                                         size="small"
                                                         sx={{ bgcolor: '#fff8e1', color: '#b78103', fontWeight: 800, fontSize: '0.62rem', height: 18 }}
                                                     />
                                                )}
                                                <Typography variant="caption" sx={{
                                                    bgcolor: '#e3f2fd', color: '#1976d2',
                                                    px: 0.8, borderRadius: 2, fontWeight: 800, fontSize: '0.62rem'
                                                }}>
                                                    Priority: {p.priority ?? 0}
                                                </Typography>
                                            </Stack>
                                            <Typography variant="caption" color="text.secondary">{p.email}</Typography>
                                        </Box>
                                    ))}
                                </Paper>
                            </Box>
                        )}
                    </Box>
                )}
            </Paper>

            {/* ── Step 2: Make roster ── */}
            {dataLoaded && (
                <Paper elevation={2} sx={{
                    p: 3, borderRadius: 3,
                    border: '2px solid',
                    borderColor: createdLink ? '#2e7d32' : '#1976d2',
                    bgcolor: createdLink ? '#f8faf9' : '#fff',
                }}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                        {createdLink
                            ? <CheckCircleIcon sx={{ color: '#2e7d32' }} />
                            : <AutoFixHighIcon sx={{ color: '#1976d2' }} />}
                        <Typography variant="h6" sx={{ fontWeight: 800 }}>Make Auto Roster</Typography>
                    </Stack>
                    <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 2 }}>
                        <b>Next steps on generated roster:</b>
                        <ol style={{ margin: '4px 0 0 0', paddingLeft: 20 }}>
                            <li>Delete E-board members who aren't going.</li>
                            <li>Make any E-board members drivers who want to drive.</li>
                            <li>Trim members from the bottom up until everyone fits in cars (keep enough for a waitlist).</li>
                        </ol>
                    </Typography>

                    <Stack direction="row" spacing={1} sx={{ mb: 2.5 }}>
                        <TextField
                            fullWidth
                            size="small"
                            label="Roster Name"
                            placeholder="e.g. Fall Hike 2026"
                            value={rosterName}
                            onChange={e => setRosterName(e.target.value)}
                            disabled={building || !!createdLink}
                        />
                        <Button
                            variant="contained"
                            onClick={handleMakeRoster}
                            disabled={building || !!createdLink}
                            startIcon={building ? undefined : <AutoFixHighIcon />}
                            sx={{
                                minWidth: 190,
                                bgcolor: '#1976d2',
                                '&:hover': { bgcolor: '#1565c0' },
                                fontWeight: 700,
                            }}
                        >
                            {building ? <CircularProgress size={20} color="inherit" /> : 'Make Auto Roster'}
                        </Button>
                    </Stack>

                    {/* Progress stepper */}
                    {buildSteps.length > 0 && (
                        <Box>
                            <Divider sx={{ mb: 2 }} />
                            {building && <LinearProgress sx={{ mb: 2, borderRadius: 2 }} />}
                            <Stepper orientation="vertical" nonLinear activeStep={-1}>
                                {buildSteps.map((step, i) => (
                                    <Step key={i} completed={step.status === 'done'}>
                                        <StepLabel
                                            error={step.status === 'error'}
                                            icon={
                                                step.status === 'loading' ? (
                                                    <CircularProgress size={20} />
                                                ) : step.status === 'done' ? (
                                                    <CheckCircleIcon sx={{ color: '#2e7d32' }} />
                                                ) : step.status === 'error' ? (
                                                    <ErrorOutlineIcon sx={{ color: 'error.main' }} />
                                                ) : (
                                                    <Box sx={{
                                                        width: 24, height: 24, borderRadius: '50%',
                                                        bgcolor: '#e0e0e0', display: 'flex',
                                                        alignItems: 'center', justifyContent: 'center',
                                                        fontSize: '0.75rem', fontWeight: 700, color: '#666'
                                                    }}>
                                                        {i + 1}
                                                    </Box>
                                                )
                                            }
                                        >
                                            <Typography variant="body2" sx={{ fontWeight: step.status === 'loading' ? 700 : 500 }}>
                                                {step.label}
                                            </Typography>
                                            {step.detail && (
                                                <Typography variant="caption" color={step.status === 'error' ? 'error' : 'text.secondary'}>
                                                    {step.detail}
                                                </Typography>
                                            )}
                                        </StepLabel>
                                    </Step>
                                ))}
                            </Stepper>
                        </Box>
                    )}

                    {createdLink && (
                        <Alert
                            severity="success"
                            sx={{ mt: 2 }}
                            action={
                                <Button size="small" href={createdLink} target="_blank" endIcon={<LaunchIcon />} sx={{ fontWeight: 700 }}>
                                    Open Sheet
                                </Button>
                            }
                        >
                            Roster created — {totalPeople} members added ({femaleCount}F / {maleCount}M).
                        </Alert>
                    )}

                    {globalError && !createdLink && (
                        <Alert severity="error" sx={{ mt: 2 }}>{globalError}</Alert>
                    )}
                </Paper>
            )}
        </Box>
    );
};

export default AutoRoster2;
