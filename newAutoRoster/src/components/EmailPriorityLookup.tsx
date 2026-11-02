import { useState } from 'react';
import {
    Box, Typography, Paper, TextField, Button, Alert, Stack, CircularProgress,
    Table, TableHead, TableBody, TableRow, TableCell
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ListAltIcon from '@mui/icons-material/ListAlt';

interface Row {
    email: string;
    priority: number | null; // null = not in the priority database
}

const EmailPriorityLookup = () => {
    const [input, setInput] = useState('');
    const [rows, setRows] = useState<Row[]>([]);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL;

    const handleLookup = async () => {
        const emails = Array.from(new Set(
            input.split(/[\s,;]+/).map(e => e.trim()).filter(e => e.length > 0)
        ));
        if (emails.length === 0) {
            setStatus({ type: 'error', message: 'Please enter at least one email.' });
            return;
        }
        if (!APPS_SCRIPT_URL) {
            setStatus({ type: 'error', message: 'API URL missing' });
            return;
        }

        setLoading(true);
        setStatus(null);
        try {
            const response = await fetch(APPS_SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify({ action: 'getPriorityData' }),
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            });
            const result = await response.json();
            if (!result.success) {
                setStatus({ type: 'error', message: result.error || 'Failed to fetch priority data' });
                return;
            }
            const lookup = new Map<string, number>();
            for (const p of result.people as { email: string; priority: number }[]) {
                lookup.set(String(p.email).trim().toLowerCase(), p.priority);
            }
            const next = emails.map(email => ({
                email,
                priority: lookup.has(email.toLowerCase()) ? lookup.get(email.toLowerCase())! : null,
            }));
            setRows(next);
            const missing = next.filter(r => r.priority === null).length;
            setStatus({
                type: missing ? 'error' : 'success',
                message: missing
                    ? `Found ${next.length - missing} of ${next.length}. ${missing} not in the priority database.`
                    : `Found priority for all ${next.length} email(s).`
            });
        } catch (e) {
            console.error(e);
            setStatus({ type: 'error', message: 'Connection Error' });
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = async () => {
        // Tab-separated so it pastes into Sheets/Excel as two columns
        const text = rows.map(r => `${r.email}\t${r.priority === null ? 'N/A' : r.priority}`).join('\n');
        try {
            await navigator.clipboard.writeText(text);
            setStatus({ type: 'success', message: 'Copied to clipboard.' });
        } catch {
            setStatus({ type: 'error', message: 'Failed to copy to clipboard.' });
        }
    };

    return (
        <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.main', mb: 1 }}>
                Email Priority Lookup
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 2, textAlign: 'center' }}>
                Paste a list of emails to get a two-column list (email, priority) you can copy.
            </Typography>

            <Paper elevation={3} sx={{ p: 4, width: '100%', maxWidth: 700, borderRadius: 3 }}>
                <TextField
                    fullWidth
                    multiline
                    minRows={6}
                    label="Emails (one per line, or separated by commas/spaces)"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    sx={{ mb: 3 }}
                />
                <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    onClick={handleLookup}
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <ListAltIcon />}
                    sx={{ borderRadius: 2, py: 1.5, fontSize: '1.1rem' }}
                >
                    {loading ? 'Looking up...' : 'Look Up Priority'}
                </Button>

                {status && (
                    <Alert severity={status.type} onClose={() => setStatus(null)} sx={{ mt: 3 }}>
                        {status.message}
                    </Alert>
                )}
            </Paper>

            {rows.length > 0 && (
                <Paper elevation={3} sx={{ p: 4, width: '100%', maxWidth: 700, borderRadius: 3 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
                            Results ({rows.length})
                        </Typography>
                        <Button variant="outlined" startIcon={<ContentCopyIcon />} onClick={handleCopy}>
                            Copy List
                        </Button>
                    </Stack>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 700 }}>Priority</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {rows.map(r => (
                                <TableRow key={r.email} hover>
                                    <TableCell>{r.email}</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 700, color: r.priority === null ? 'error.main' : 'text.primary' }}>
                                        {r.priority === null ? 'N/A' : r.priority}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Paper>
            )}
        </Box>
    );
};

export default EmailPriorityLookup;
