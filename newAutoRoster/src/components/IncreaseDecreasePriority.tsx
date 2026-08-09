import React, { useState, useMemo } from 'react';
import {
    Box, Typography, Paper, TextField, Button,
    CircularProgress, Alert, Grid, Chip, Stack,
    Dialog, DialogContent, DialogActions
} from '@mui/material';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle';
import SendIcon from '@mui/icons-material/Send';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

const extractEmails = (text: string): string[] => {
    if (!text) return [];
    const matches = text.match(EMAIL_REGEX);
    if (!matches) return [];
    const unique = new Set(matches.map(e => e.trim().toLowerCase()));
    return Array.from(unique);
};

const IncreaseDecreasePriority: React.FC = () => {
    // Increase section state
    const [increaseInput, setIncreaseInput] = useState<string>('');
    const [increaseAmount, setIncreaseAmount] = useState<number>(1);
    const [increaseLoading, setIncreaseLoading] = useState<boolean>(false);
    const [increaseStatus, setIncreaseStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    // Decrease section state
    const [decreaseInput, setDecreaseInput] = useState<string>('');
    const [decreaseAmount, setDecreaseAmount] = useState<number>(1);
    const [decreaseLoading, setDecreaseLoading] = useState<boolean>(false);
    const [decreaseStatus, setDecreaseStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    // Modal Dialog State
    const [successModal, setSuccessModal] = useState<{
        open: boolean;
        title: string;
        message: string;
        badgeColor: 'success' | 'error';
    }>({ open: false, title: '', message: '', badgeColor: 'success' });

    const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL;

    // Derived emails
    const increaseEmails = useMemo(() => extractEmails(increaseInput), [increaseInput]);
    const decreaseEmails = useMemo(() => extractEmails(decreaseInput), [decreaseInput]);

    // Handle batch increase
    const handleIncrease = async () => {
        if (increaseEmails.length === 0) {
            setIncreaseStatus({ type: 'error', message: "Please enter at least one valid email to increase priority." });
            return;
        }
        if (!APPS_SCRIPT_URL) {
            setIncreaseStatus({ type: 'error', message: "Apps Script backend URL is not configured." });
            return;
        }

        const amount = Math.abs(increaseAmount) || 1;
        setIncreaseLoading(true);
        setIncreaseStatus(null);

        const adjustments = increaseEmails.map(email => ({
            email,
            name: '',
            amountChange: amount
        }));

        try {
            const response = await fetch(APPS_SCRIPT_URL, {
                method: 'POST',
                mode: 'cors',
                cache: 'no-cache',
                body: JSON.stringify({
                    action: 'batchAdjustPriority',
                    adjustments
                }),
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            });

            const data = await response.json();

            if (data.success) {
                const msg = `Success! Increased priority by +${amount} for ${increaseEmails.length} member(s).`;
                setIncreaseStatus({
                    type: 'success',
                    message: msg
                });
                setIncreaseInput('');
                setSuccessModal({
                    open: true,
                    title: 'Priority Increased!',
                    message: `Successfully increased priority score by +${amount} for ${increaseEmails.length} member(s). Changes have been saved to the database.`,
                    badgeColor: 'success'
                });
            } else {
                setIncreaseStatus({ type: 'error', message: data.error || "Failed to adjust priority." });
            }
        } catch (e) {
            setIncreaseStatus({ type: 'error', message: "Connection Error: " + (e as Error).message });
        } finally {
            setIncreaseLoading(false);
        }
    };

    // Handle batch decrease
    const handleDecrease = async () => {
        if (decreaseEmails.length === 0) {
            setDecreaseStatus({ type: 'error', message: "Please enter at least one valid email to decrease priority." });
            return;
        }
        if (!APPS_SCRIPT_URL) {
            setDecreaseStatus({ type: 'error', message: "Apps Script backend URL is not configured." });
            return;
        }

        const amount = Math.abs(decreaseAmount) || 1;
        setDecreaseLoading(true);
        setDecreaseStatus(null);

        const adjustments = decreaseEmails.map(email => ({
            email,
            name: '',
            amountChange: -amount // Negative for decrease
        }));

        try {
            const response = await fetch(APPS_SCRIPT_URL, {
                method: 'POST',
                mode: 'cors',
                cache: 'no-cache',
                body: JSON.stringify({
                    action: 'batchAdjustPriority',
                    adjustments
                }),
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            });

            const data = await response.json();

            if (data.success) {
                const msg = `Success! Decreased priority by -${amount} for ${decreaseEmails.length} member(s).`;
                setDecreaseStatus({
                    type: 'success',
                    message: msg
                });
                setDecreaseInput('');
                setSuccessModal({
                    open: true,
                    title: 'Priority Decreased!',
                    message: `Successfully decreased priority score by -${amount} for ${decreaseEmails.length} member(s). Changes have been saved to the database.`,
                    badgeColor: 'error'
                });
            } else {
                setDecreaseStatus({ type: 'error', message: data.error || "Failed to adjust priority." });
            }
        } catch (e) {
            setDecreaseStatus({ type: 'error', message: "Connection Error: " + (e as Error).message });
        } finally {
            setDecreaseLoading(false);
        }
    };

    return (
        <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', gap: 4, maxWidth: 1200, mx: 'auto' }}>
            <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.main', mb: 1 }}>
                    Increase / Decrease Priority
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Manually adjust priority points for groups of members. Increase or decrease priority scores independently by specifying member emails and amount.
                </Typography>
            </Box>

            <Grid container spacing={4}>
                {/* 1. INCREASE PRIORITY CARD */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <Paper
                        elevation={3}
                        sx={{
                            p: 3,
                            borderRadius: 3,
                            border: '2px solid',
                            borderColor: '#66bb6a',
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            bgcolor: '#f8faf9'
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                            <Typography variant="h6" sx={{ fontWeight: 800, color: '#2e7d32', display: 'flex', alignItems: 'center', gap: 1 }}>
                                <AddCircleIcon sx={{ color: '#2e7d32' }} /> Increase Priority
                            </Typography>
                            <Chip
                                label={`${increaseEmails.length} Member(s)`}
                                color={increaseEmails.length > 0 ? "success" : "default"}
                                size="small"
                                sx={{ fontWeight: 700 }}
                            />
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            Paste emails of members whose priority points should be <b>increased</b>.
                        </Typography>

                        {increaseStatus && (
                            <Alert
                                severity={increaseStatus.type}
                                onClose={() => setIncreaseStatus(null)}
                                icon={<ErrorOutlineIcon />}
                                sx={{ mb: 2 }}
                            >
                                {increaseStatus.message}
                            </Alert>
                        )}

                        <Stack spacing={2} sx={{ flexGrow: 1 }}>
                            <TextField
                                multiline
                                rows={8}
                                fullWidth
                                variant="outlined"
                                label="Member Emails"
                                placeholder={"btesone@binghamton.edu\ncsandt@binghamton.edu\n..."}
                                value={increaseInput}
                                onChange={(e) => setIncreaseInput(e.target.value)}
                                disabled={increaseLoading}
                                sx={{ fontFamily: 'monospace' }}
                            />

                            <TextField
                                type="number"
                                size="small"
                                label="Amount to Increase By (+)"
                                value={increaseAmount}
                                onChange={(e) => setIncreaseAmount(parseInt(e.target.value, 10) || 1)}
                                inputProps={{ min: 1 }}
                                disabled={increaseLoading}
                            />

                            <Box sx={{ mt: 'auto', pt: 1 }}>
                                <Button
                                    fullWidth
                                    variant="contained"
                                    size="large"
                                    onClick={handleIncrease}
                                    disabled={increaseLoading || increaseEmails.length === 0}
                                    startIcon={increaseLoading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                                    sx={{
                                        bgcolor: '#2e7d32',
                                        '&:hover': { bgcolor: '#1b5e20' },
                                        fontWeight: 800,
                                        py: 1.2
                                    }}
                                >
                                    {increaseLoading ? 'Submitting Increase...' : `Increase Priority (+${increaseAmount})`}
                                </Button>
                            </Box>
                        </Stack>
                    </Paper>
                </Grid>

                {/* 2. DECREASE PRIORITY CARD */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <Paper
                        elevation={3}
                        sx={{
                            p: 3,
                            borderRadius: 3,
                            border: '2px solid',
                            borderColor: '#ef5350',
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            bgcolor: '#fdf8f8'
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                            <Typography variant="h6" sx={{ fontWeight: 800, color: '#c62828', display: 'flex', alignItems: 'center', gap: 1 }}>
                                <RemoveCircleIcon sx={{ color: '#c62828' }} /> Decrease Priority
                            </Typography>
                            <Chip
                                label={`${decreaseEmails.length} Member(s)`}
                                color={decreaseEmails.length > 0 ? "error" : "default"}
                                size="small"
                                sx={{ fontWeight: 700 }}
                            />
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            Paste emails of members whose priority points should be <b>decreased</b>.
                        </Typography>

                        {decreaseStatus && (
                            <Alert
                                severity={decreaseStatus.type}
                                onClose={() => setDecreaseStatus(null)}
                                icon={<ErrorOutlineIcon />}
                                sx={{ mb: 2 }}
                            >
                                {decreaseStatus.message}
                            </Alert>
                        )}

                        <Stack spacing={2} sx={{ flexGrow: 1 }}>
                            <TextField
                                multiline
                                rows={8}
                                fullWidth
                                variant="outlined"
                                label="Member Emails"
                                placeholder={"btesone@binghamton.edu\ncsandt@binghamton.edu\n..."}
                                value={decreaseInput}
                                onChange={(e) => setDecreaseInput(e.target.value)}
                                disabled={decreaseLoading}
                                sx={{ fontFamily: 'monospace' }}
                            />

                            <TextField
                                type="number"
                                size="small"
                                label="Amount to Decrease By (-)"
                                value={decreaseAmount}
                                onChange={(e) => setDecreaseAmount(parseInt(e.target.value, 10) || 1)}
                                inputProps={{ min: 1 }}
                                disabled={decreaseLoading}
                            />

                            <Box sx={{ mt: 'auto', pt: 1 }}>
                                <Button
                                    fullWidth
                                    variant="contained"
                                    size="large"
                                    onClick={handleDecrease}
                                    disabled={decreaseLoading || decreaseEmails.length === 0}
                                    startIcon={decreaseLoading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                                    sx={{
                                        bgcolor: '#c62828',
                                        '&:hover': { bgcolor: '#b71c1c' },
                                        fontWeight: 800,
                                        py: 1.2
                                    }}
                                >
                                    {decreaseLoading ? 'Submitting Decrease...' : `Decrease Priority (-${decreaseAmount})`}
                                </Button>
                            </Box>
                        </Stack>
                    </Paper>
                </Grid>
            </Grid>

            {/* Success Modal Dialog */}
            <Dialog
                open={successModal.open}
                onClose={() => setSuccessModal(prev => ({ ...prev, open: false }))}
                PaperProps={{
                    sx: {
                        borderRadius: 4,
                        p: 2,
                        textAlign: 'center',
                        maxWidth: 440,
                        width: '100%'
                    }
                }}
            >
                <DialogContent sx={{ pt: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                        <CheckCircleOutlineIcon sx={{ fontSize: 68, color: successModal.badgeColor === 'error' ? '#c62828' : '#2e7d32' }} />
                    </Box>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: successModal.badgeColor === 'error' ? '#c62828' : '#2e7d32', mb: 1 }}>
                        {successModal.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1, lineHeight: 1.6 }}>
                        {successModal.message}
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
                    <Button
                        variant="contained"
                        size="large"
                        onClick={() => setSuccessModal(prev => ({ ...prev, open: false }))}
                        sx={{
                            bgcolor: successModal.badgeColor === 'error' ? '#c62828' : '#2e7d32',
                            '&:hover': { bgcolor: successModal.badgeColor === 'error' ? '#b71c1c' : '#1b5e20' },
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

export default IncreaseDecreasePriority;
