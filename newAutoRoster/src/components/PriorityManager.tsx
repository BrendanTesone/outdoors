import { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, Alert, CircularProgress,
    Stack, IconButton, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, TextField,
    InputAdornment, Button, Tooltip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import LaunchIcon from '@mui/icons-material/Launch';

interface Person {
    email: string;
    name: string;
    priority: number;
}

const PriorityManager = () => {
    const [people, setPeople] = useState<Person[]>([]);
    const [sheetId, setSheetId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [search, setSearch] = useState('');
    const [stableOrder, setStableOrder] = useState<string[]>([]);

    const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL;

    const fetchPeople = async () => {
        if (!APPS_SCRIPT_URL) return;
        setLoading(true);
        try {
            const response = await fetch(APPS_SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify({ action: 'getPriorityData' }),
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            });
            const result = await response.json();
            if (result.success) {
                setPeople(result.people);
                setSheetId(result.sheetId);
                // Set stable order based on initial sort
                const sorted = [...result.people].sort((a, b) => b.priority - a.priority);
                setStableOrder(sorted.map(p => p.email));
            } else {
                setStatus({ type: 'error', message: result.error || 'Failed to fetch data' });
            }
        } catch (e) {
            console.error(e);
            setStatus({ type: 'error', message: 'Connection Error' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPeople();
    }, []);

    const handleAdjust = async (email: string, name: string, change: number) => {
        if (!APPS_SCRIPT_URL) return;

        // Optimistic Update: Update UI immediately
        setPeople(prev => prev.map(p =>
            p.email === email ? { ...p, priority: p.priority + change } : p
        ));

        try {
            const response = await fetch(APPS_SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'adjustPriority',
                    email,
                    name,
                    amountChange: change
                }),
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            });
            const result = await response.json();
            if (!result.success) {
                // Rollback JUST this specific change on error
                setPeople(prev => prev.map(p =>
                    p.email === email ? { ...p, priority: p.priority - change } : p
                ));
                setStatus({ type: 'error', message: result.error || 'Update failed' });
            }
        } catch (e) {
            // Rollback JUST this specific change on connection error
            setPeople(prev => prev.map(p =>
                p.email === email ? { ...p, priority: p.priority - change } : p
            ));
            setStatus({ type: 'error', message: 'Update failed: Connection Error' });
        }
    };


    const filteredPeople = stableOrder
        .map(email => people.find(p => p.email === email)!)
        .filter(p => p && (
            p.email.toLowerCase().includes(search.toLowerCase()) ||
            p.name.toLowerCase().includes(search.toLowerCase())
        ));

    // Handle any people who might be in 'people' but not in 'stableOrder'
    const missingPeople = people.filter(p => !stableOrder.includes(p.email));
    const finalDisplayList = [...filteredPeople, ...missingPeople];

    return (
        <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="h5" sx={{ fontWeight: 600 }}>
                    Priority Manager
                </Typography>
                <Stack direction="row" spacing={2}>
                    {sheetId && (
                        <Button
                            variant="outlined"
                            startIcon={<LaunchIcon />}
                            onClick={() => window.open(`https://docs.google.com/spreadsheets/d/${sheetId}/edit`, '_blank')}
                        >
                            Open Sheet
                        </Button>
                    )}
                    <Button
                        startIcon={<RefreshIcon />}
                        onClick={fetchPeople}
                        disabled={loading}
                        variant="outlined"
                    >
                        Refresh
                    </Button>
                </Stack>
            </Stack>

            {status && (
                <Alert severity={status.type} onClose={() => setStatus(null)}>
                    {status.message}
                </Alert>
            )}


            <Paper elevation={3} sx={{ borderRadius: 3, overflow: 'hidden' }}>
                <Box sx={{ p: 2, bgcolor: '#f8faf9', borderBottom: '1px solid #eef2f1' }}>
                    <TextField
                        fullWidth
                        placeholder="Search by name or email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        variant="outlined"
                        size="small"
                        slotProps={{
                            input: {
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon color="action" />
                                    </InputAdornment>
                                )
                            }
                        }}
                    />
                </Box>

                <TableContainer sx={{ maxHeight: 600 }}>
                    <Table stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 700 }}>Priority Score</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading && finalDisplayList.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} align="center" sx={{ py: 8 }}>
                                        <CircularProgress size={40} />
                                    </TableCell>
                                </TableRow>
                            ) : finalDisplayList.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} align="center" sx={{ py: 8, color: 'text.secondary' }}>
                                        No people found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                finalDisplayList.map((person) => (
                                    <TableRow key={person.email} hover>
                                        <TableCell>{person.name || '—'}</TableCell>
                                        <TableCell sx={{ color: 'text.secondary' }}>{person.email}</TableCell>
                                        <TableCell align="center">
                                            <Box sx={{
                                                display: 'inline-block',
                                                px: 2, py: 0.5,
                                                borderRadius: 1,
                                                bgcolor: person.priority > 0 ? '#e6f4ea' : person.priority < 0 ? '#fce8e6' : '#f1f3f4',
                                                color: person.priority > 0 ? '#137333' : person.priority < 0 ? '#c5221f' : '#3c4043',
                                                fontWeight: 700
                                            }}>
                                                {person.priority}
                                            </Box>
                                        </TableCell>
                                        <TableCell align="right">
                                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                                                <Tooltip title="Decrease Priority">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleAdjust(person.email, person.name, -1)}
                                                        disabled={loading}
                                                        sx={{ color: '#c5221f', bgcolor: '#fce8e6', '&:hover': { bgcolor: '#fad2cf' } }}
                                                    >
                                                        <RemoveIcon />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Increase Priority">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleAdjust(person.email, person.name, 1)}
                                                        disabled={loading}
                                                        sx={{ color: '#137333', bgcolor: '#e6f4ea', '&:hover': { bgcolor: '#d2e3d8' } }}
                                                    >
                                                        <AddIcon />
                                                    </IconButton>
                                                </Tooltip>
                                            </Stack>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        </Box>
    );
};

export default PriorityManager;
