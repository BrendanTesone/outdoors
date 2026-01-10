import { useState, useEffect } from 'react';
import { Box, TextField, Button, Typography, Paper, Alert, CircularProgress, Stack, Divider, IconButton, List, ListItem, ListItemText } from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import DeleteIcon from '@mui/icons-material/Delete';

const AddCloseDate = () => {
    // Helper to get next Tuesday at 10 AM
    const getNextTuesdayAt10AM = () => {
        let d = dayjs().day(2).hour(10).minute(0).second(0);
        if (d.isBefore(dayjs())) d = d.add(1, 'week');
        return d;
    };

    const [formLink, setFormLink] = useState('');
    const [selectedDate, setSelectedDate] = useState<Dayjs | null>(getNextTuesdayAt10AM());
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [activeDates, setActiveDates] = useState<any[]>([]);

    const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL;

    const fetchActiveDates = async () => {
        if (!APPS_SCRIPT_URL) return;
        try {
            const response = await fetch(APPS_SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify({ action: 'getConfigs' }),
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            });
            const result = await response.json();
            if (result.success && result.props.FORM_DATES_LIST) {
                setActiveDates(JSON.parse(result.props.FORM_DATES_LIST));
            }
        } catch (e) {
            console.error('Failed to fetch active dates', e);
        }
    };

    useEffect(() => {
        fetchActiveDates();
    }, []);

    const handleDelete = async (formLink: string) => {
        if (!APPS_SCRIPT_URL) return;
        setLoading(true);
        try {
            await fetch(APPS_SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify({ action: 'deleteFormDate', formLink }),
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            });
            fetchActiveDates();
        } catch (e) {
            console.error('Failed to delete date', e);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!formLink || !selectedDate) {
            setStatus({ type: 'error', message: 'Please fill in all fields' });
            return;
        }

        setLoading(true);
        setStatus(null);

        const payload = {
            action: 'addFormDate',
            formLink,
            date: selectedDate.format('YYYY-MM-DD HH:mm')
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
                    setStatus({ type: 'success', message: result.message || 'Close date successfully added!' });
                    setFormLink('');
                    setSelectedDate(getNextTuesdayAt10AM());
                    fetchActiveDates();
                } else {
                    setStatus({ type: 'error', message: 'Backend Error: ' + (result.error || 'Unknown error occurred') });
                }
            } else {
                throw new Error('No API endpoint found');
            }
        } catch (error) {
            setStatus({ type: 'error', message: 'Connection Failed: Check Web App deployment.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
                    Schedule Form Close Date
                </Typography>

                <Paper elevation={3} sx={{ p: 4, width: '100%', maxWidth: 500, borderRadius: 3 }}>
                    <TextField
                        fullWidth
                        label="Google Form Link / ID"
                        variant="outlined"
                        value={formLink}
                        onChange={(e) => setFormLink(e.target.value)}
                        placeholder="https://docs.google.com/forms/d/..."
                        sx={{ mb: 3 }}
                    />

                    <DateTimePicker
                        label="Close Date & Time"
                        value={selectedDate}
                        onChange={(newValue) => setSelectedDate(newValue)}
                        slotProps={{ textField: { fullWidth: true, sx: { mb: 3 } } }}
                    />

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
                        {loading ? 'Adding Date...' : 'Add Close Date to Form'}
                    </Button>
                </Paper>

                {activeDates.length > 0 && (
                    <Paper elevation={3} sx={{ p: 4, mt: 4, width: '100%', maxWidth: 700, borderRadius: 3 }}>
                        <Typography variant="h6" gutterBottom>Active Schedules</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            Forms that will be automatically closed at the specified time (EST).
                        </Typography>
                        <Divider sx={{ mb: 2 }} />
                        <List>
                            {activeDates.map((item, index) => (
                                <ListItem
                                    key={index}
                                    sx={{ bgcolor: '#f9fbfb', borderRadius: 2, mb: 1, border: '1px solid #eef2f1' }}
                                    secondaryAction={
                                        <Stack direction="row" spacing={1}>
                                            <Button variant="outlined" size="small" onClick={() => window.open(item.formLink, '_blank')}>
                                                Open
                                            </Button>
                                            <IconButton edge="end" aria-label="delete" onClick={() => handleDelete(item.formLink)} disabled={loading}>
                                                <DeleteIcon color="error" />
                                            </IconButton>
                                        </Stack>
                                    }
                                >
                                    <ListItemText
                                        primary={item.formLink.length > 40 ? item.formLink.substring(0, 40) + '...' : item.formLink}
                                        secondary={`Closes: ${dayjs(item.closeDate).format('MMMM D, YYYY h:mm A')}`}
                                        sx={{ mr: 12 }}
                                    />
                                </ListItem>
                            ))}
                        </List>
                    </Paper>
                )}
            </Box>
        </LocalizationProvider>
    );
};

export default AddCloseDate;
