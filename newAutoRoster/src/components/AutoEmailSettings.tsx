import { useState, useEffect } from 'react';
import { Box, TextField, Button, Typography, Paper, Stack, Switch, Alert, CircularProgress } from '@mui/material';

const AutoEmailSettings = () => {
    const [sheetLink, setSheetLink] = useState('');
    const [isStandardTime, setIsStandardTime] = useState(true);
    const [currentLink, setCurrentLink] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL;

    const fetchCurrentConfig = async () => {
        if (!APPS_SCRIPT_URL) return;
        try {
            const response = await fetch(APPS_SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify({ action: 'getConfigs' }),
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            });
            const result = await response.json();
            if (result.success) {
                setCurrentLink(result.props.SLIDESHOW_LINK || null);
                if (result.props.IS_STANDARD_TIME !== undefined) {
                    setIsStandardTime(result.props.IS_STANDARD_TIME !== 'false');
                }
            }
        } catch (e) {
            console.error('Failed to fetch slideshow config', e);
        }
    };

    useEffect(() => {
        fetchCurrentConfig();
    }, []);

    const handleSave = async () => {
        if (!sheetLink) {
            setStatus({ type: 'error', message: 'Please provide a link' });
            return;
        }

        setLoading(true);
        setStatus(null);

        const payload = {
            action: 'updateAutoEmailSettings',
            link: sheetLink,
            isStandardTime: isStandardTime
        };

        try {
            if (APPS_SCRIPT_URL) {
                const response = await fetch(APPS_SCRIPT_URL, {
                    method: 'POST',
                    body: JSON.stringify(payload),
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                });

                const result = await response.json();

                if (result.success) {
                    setStatus({ type: 'success', message: result.message || 'Auto-Reply link updated!' });
                    setSheetLink('');
                    fetchCurrentConfig();
                } else {
                    setStatus({ type: 'error', message: 'Backend Error: ' + (result.error || 'Unknown error occurred') });
                }
            } else {
                throw new Error('API URL not configured');
            }
        } catch (error) {
            setStatus({ type: 'error', message: 'Connection Failed: ' + (error instanceof Error ? error.message : String(error)) });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
                Auto-Reply Slideshow Bot
            </Typography>

            <Paper elevation={3} sx={{ p: 4, width: '100%', maxWidth: 500, borderRadius: 3 }}>
                {currentLink ? (
                    <Box sx={{ mb: 4, p: 2, bgcolor: '#f0f4f2', borderRadius: 2, border: '1px solid #d0e0d8' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                            Current Slideshow Link:
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 0.5, wordBreak: 'break-all', color: 'primary.dark', fontWeight: 500 }}>
                            {currentLink}
                        </Typography>
                    </Box>
                ) : (
                    <Alert severity="warning" sx={{ mb: 4, borderRadius: 2 }}>
                        No slideshow link has been set yet for this week.
                    </Alert>
                )}

                <TextField
                    fullWidth
                    label="New Slideshow Link"
                    variant="outlined"
                    value={sheetLink}
                    onChange={(e) => setSheetLink(e.target.value)}
                    placeholder="Paste the new Google Slides URL here..."
                    sx={{ mb: 3 }}
                />

                <Box sx={{ mb: 4 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                        Is the meeting at a usual day/time? (Standard Monday 8pm)
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                        <Typography color={!isStandardTime ? "primary" : "text.secondary"} sx={{ fontWeight: !isStandardTime ? 600 : 400 }}>
                            No
                        </Typography>
                        <Switch
                            checked={isStandardTime}
                            onChange={(e) => setIsStandardTime(e.target.checked)}
                            color="primary"
                        />
                        <Typography color={isStandardTime ? "primary" : "text.secondary"} sx={{ fontWeight: isStandardTime ? 600 : 400 }}>
                            Yes
                        </Typography>
                    </Stack>
                </Box>

                {status && (
                    <Alert severity={status.type} sx={{ mb: 3 }}>
                        {status.message}
                    </Alert>
                )}

                <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    onClick={handleSave}
                    disabled={loading}
                    startIcon={loading && <CircularProgress size={20} color="inherit" />}
                    sx={{ py: 1.5, borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                >
                    {loading ? 'Updating...' : 'Update Auto Email Settings'}
                </Button>
            </Paper>
        </Box>
    );
};

export default AutoEmailSettings;
