import { useState } from 'react';
import { Box, TextField, Button, Typography, Paper, Alert, CircularProgress, Stack, Divider } from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

const AutoFormGenerator = () => {
    // Default Dates
    const getNextSaturdayAt11AM = () => {
        let d = dayjs().day(6).hour(11).minute(0).second(0);
        if (d.isBefore(dayjs())) d = d.add(1, 'week');
        return d;
    };

    const getNextTuesdayAt10AM = () => {
        let d = dayjs().day(2).hour(10).minute(0).second(0);
        if (d.isBefore(dayjs())) d = d.add(1, 'week');
        return d;
    };

    const [title, setTitle] = useState('');
    const [eventDate, setEventDate] = useState<Dayjs | null>(getNextSaturdayAt11AM());
    const [closeDate, setCloseDate] = useState<Dayjs | null>(getNextTuesdayAt10AM());
    const [meetingPlace, setMeetingPlace] = useState('Mohawk Parking Lot');
    const [returnTime, setReturnTime] = useState('');

    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [resultUrls, setResultUrls] = useState<{ editUrl: string, publishedUrl: string } | null>(null);

    const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL;

    const handleCreate = async () => {
        if (!title || !eventDate || !closeDate) {
            setStatus({ type: 'error', message: 'Please fill in required fields (Title, Event Date, Close Date)' });
            return;
        }

        setLoading(true);
        setStatus(null);
        setResultUrls(null);

        const payload = {
            action: 'createCommitmentForm',
            title,
            eventDate: eventDate.format('YYYY-MM-DD HH:mm'),
            closeDate: closeDate.format('YYYY-MM-DD HH:mm'),
            meetingPlace,
            returnTime
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
                    setStatus({ type: 'success', message: result.message });
                    setResultUrls({ editUrl: result.editUrl, publishedUrl: result.publishedUrl });
                } else {
                    setStatus({ type: 'error', message: 'Backend Error: ' + (result.error || 'Unknown error') });
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

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
        } catch (err) {
            console.error('Failed to copy text:', err);
        }
    };

    const handleCopyQR = async () => {
        if (!resultUrls?.publishedUrl) return;
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(resultUrls.publishedUrl)}`;
        try {
            const response = await fetch(qrUrl);
            const blob = await response.blob();
            await navigator.clipboard.write([
                new ClipboardItem({ [blob.type]: blob })
            ]);
        } catch (err) {
            console.error('Failed to copy QR code:', err);
        }
    };

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.main', mb: 3 }}>
                    Commitment Form Generator
                </Typography>

                <Box sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', md: 'row' },
                    gap: 4,
                    alignItems: 'flex-start',
                    justifyContent: 'center',
                    width: '100%',
                    maxWidth: 1200
                }}>
                    <Paper elevation={3} sx={{ p: 4, width: '100%', maxWidth: 600, borderRadius: 3 }}>
                        <Stack spacing={3}>
                            <TextField
                                fullWidth
                                label="Event Title"
                                placeholder="e.g. Apple Picking"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                helperText="Appends 'Commitment Form' and Date automatically"
                            />

                            <DateTimePicker
                                label="Event Date & Meeting Time"
                                value={eventDate}
                                onChange={(val) => setEventDate(val)}
                                slotProps={{ textField: { fullWidth: true } }}
                            />

                            <DateTimePicker
                                label="When to close form?"
                                value={closeDate}
                                onChange={(val) => setCloseDate(val)}
                                slotProps={{ textField: { fullWidth: true } }}
                            />

                            <TextField
                                fullWidth
                                label="Meeting Place"
                                value={meetingPlace}
                                onChange={(e) => setMeetingPlace(e.target.value)}
                            />

                            <TextField
                                fullWidth
                                label="Return Time"
                                placeholder="e.g. 5:00 PM"
                                value={returnTime}
                                onChange={(e) => setReturnTime(e.target.value)}
                            />

                            {status && <Alert severity={status.type}>{status.message}</Alert>}

                            <Button
                                fullWidth
                                variant="contained"
                                size="large"
                                onClick={handleCreate}
                                disabled={loading}
                                startIcon={loading && <CircularProgress size={20} color="inherit" />}
                                sx={{ py: 1.5, borderRadius: 2, fontWeight: 600 }}
                            >
                                {loading ? 'Creating Form...' : 'Generate New Commitment Form'}
                            </Button>
                        </Stack>
                    </Paper>

                    {resultUrls && (
                        <Paper elevation={3} sx={{ p: 4, width: '100%', maxWidth: 500, borderRadius: 3, bgcolor: '#f0f4f2' }}>
                            <Typography variant="h6" gutterBottom color="primary">Form Created!</Typography>
                            <Divider sx={{ mb: 2 }} />

                            <Box sx={{ mb: 3 }}>
                                <Typography variant="subtitle2" color="text.secondary">Edit Link:</Typography>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <TextField size="small" fullWidth value={resultUrls.editUrl} slotProps={{ input: { readOnly: true } }} />
                                    <Button variant="contained" onClick={() => window.open(resultUrls.editUrl, '_blank')}><OpenInNewIcon /></Button>
                                    <Button variant="outlined" onClick={() => copyToClipboard(resultUrls.editUrl)}><ContentCopyIcon /></Button>
                                </Stack>
                            </Box>

                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                                <Box
                                    component="img"
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(resultUrls.publishedUrl)}`}
                                />
                                <Button variant="outlined" onClick={handleCopyQR} startIcon={<ContentCopyIcon />}>
                                    Copy QR Code
                                </Button>
                            </Box>
                        </Paper>
                    )}
                </Box>
            </Box>
        </LocalizationProvider>
    );
};

export default AutoFormGenerator;
