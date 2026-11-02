import { useMemo, useState } from 'react';
import {
    Box, Typography, Paper, TextField, Button, Alert, Stack, IconButton, Divider,
    Table, TableHead, TableBody, TableRow, TableCell, CircularProgress
} from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import CloseIcon from '@mui/icons-material/Close';
import AddRoadIcon from '@mui/icons-material/AddRoad';
import DownloadIcon from '@mui/icons-material/Download';
import LocalGasStationIcon from '@mui/icons-material/LocalGasStation';
import { fetchLinkTrip, assembleTrip, type LinkTrip } from '../gasForms/itinerary';
import { buildTripPdf, askSaveLocation, savePdf } from '../gasForms/pdf';
import { fmtMiles, getTown, sumMiles } from '../gasForms/routing';

const GasForms = () => {
    const [linksText, setLinksText] = useState('');
    const [links, setLinks] = useState<LinkTrip[]>([]);
    const [destination, setDestination] = useState('');
    const [loadingLinks, setLoadingLinks] = useState(false);
    const [loadingPdf, setLoadingPdf] = useState(false);
    const [statusMsg, setStatusMsg] = useState('');
    const [isError, setIsError] = useState(false);

    // The single trip that drives BOTH the form and the itinerary
    const trip = useMemo(() => assembleTrip(links), [links]);

    const say = (msg: string, error = false) => {
        setIsError(error);
        setStatusMsg(msg);
    };

    const applyLinks = (next: LinkTrip[]) => {
        setLinks(next);
        setDestination(assembleTrip(next).destinationCity);
    };

    const handleCalculate = async () => {
        const lines = linksText
            .split(/[\r\n]+/)
            .map(l => l.trim())
            .filter(l => l.length > 0);

        if (lines.length === 0) {
            say('Please paste at least one Google Maps link.', true);
            return;
        }

        setLoadingLinks(true);
        say(`Found ${lines.length} link(s) to process...`);

        const added: LinkTrip[] = [];
        try {
            for (let i = 0; i < lines.length; i++) {
                const prefix = lines.length > 1 ? `Link ${i + 1}/${lines.length}: ` : '';
                added.push(await fetchLinkTrip(lines[i], m => say(prefix + m)));
            }
            applyLinks([...links, ...added]);
            setLinksText('');
            say(`Added ${added.length} link(s), ${added.reduce((n, l) => n + l.legs.length, 0)} leg(s).`);
        } catch (err) {
            if (added.length > 0) applyLinks([...links, ...added]);
            say('Error: ' + (err instanceof Error ? err.message : String(err)), true);
        } finally {
            setLoadingLinks(false);
        }
    };

    const handleRemoveLink = (id: string) => applyLinks(links.filter(l => l.id !== id));

    const handleMoveLink = (index: number, dir: -1 | 1) => {
        const target = index + dir;
        if (target < 0 || target >= links.length) return;
        const next = [...links];
        [next[index], next[target]] = [next[target], next[index]];
        applyLinks(next);
    };

    const handleDownload = async () => {
        try {
            // Ask where to save first, while the click is still fresh (browsers require this)
            const target = await askSaveLocation();
            if (target === null) return;

            setLoadingPdf(true);
            say('Generating PDF...');
            const bytes = await buildTripPdf(trip, destination);
            await savePdf(bytes, target);
            say('PDF saved successfully!');
            setTimeout(() => setStatusMsg(''), 5000);
        } catch (err) {
            say('Error: ' + (err instanceof Error ? err.message : String(err)), true);
        } finally {
            setLoadingPdf(false);
        }
    };

    return (
        <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.main', mb: 1 }}>
                Gas Reimbursement
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 2, textAlign: 'center' }}>
                Paste Google Maps links to calculate mileage and save one PDF: filled reimbursement form + itinerary.
            </Typography>

            <Paper elevation={3} sx={{ p: 4, width: '100%', maxWidth: 850, borderRadius: 3 }}>
                <TextField
                    fullWidth
                    multiline
                    minRows={3}
                    label="Google Maps link(s), one per line"
                    value={linksText}
                    onChange={e => setLinksText(e.target.value)}
                    placeholder="https://www.google.com/maps/dir/Binghamton,+NY/Ithaca,+NY"
                    sx={{ mb: 3 }}
                />
                <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    onClick={handleCalculate}
                    disabled={loadingLinks}
                    startIcon={loadingLinks ? <CircularProgress size={20} color="inherit" /> : <AddRoadIcon />}
                    sx={{ borderRadius: 2, py: 1.5, fontSize: '1.1rem' }}
                >
                    {loadingLinks ? 'Calculating Route(s) (can take ~30s)...' : 'Calculate Route(s)'}
                </Button>

                {statusMsg && (
                    <Alert severity={isError ? 'error' : 'success'} sx={{ mt: 3 }}>
                        {statusMsg}
                    </Alert>
                )}
            </Paper>

            {links.length > 0 && (
                <>
                    <Paper elevation={3} sx={{ p: 4, width: '100%', maxWidth: 850, borderRadius: 3 }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main', mb: 1 }}>
                            Links ({links.length})
                        </Typography>
                        {links.map((link, idx) => (
                            <Box key={link.id}>
                                {idx > 0 && <Divider />}
                                <Stack direction="row" alignItems="center" spacing={0.5} sx={{ py: 1 }}>
                                    <IconButton size="small" disabled={idx === 0} onClick={() => handleMoveLink(idx, -1)} title="Move link up">
                                        <ArrowUpwardIcon fontSize="small" />
                                    </IconButton>
                                    <IconButton size="small" disabled={idx === links.length - 1} onClick={() => handleMoveLink(idx, 1)} title="Move link down">
                                        <ArrowDownwardIcon fontSize="small" />
                                    </IconButton>
                                    <Typography sx={{ flex: 1, fontSize: '0.9rem', pl: 1 }}>
                                        {link.stops.map(getTown).join(' → ')}
                                        <Typography component="span" color="text.secondary" sx={{ fontSize: '0.9rem' }}>
                                            {' '}({link.legs.length} legs, {fmtMiles(sumMiles(link.legs))} mi)
                                        </Typography>
                                    </Typography>
                                    <IconButton size="small" color="error" onClick={() => handleRemoveLink(link.id)} title="Remove link">
                                        <CloseIcon fontSize="small" />
                                    </IconButton>
                                </Stack>
                            </Box>
                        ))}
                    </Paper>

                    <Paper elevation={3} sx={{ p: 4, width: '100%', maxWidth: 850, borderRadius: 3 }}>
                        <TextField
                            fullWidth
                            label="Page 1 destination city & state"
                            helperText="Auto-filled from the 2nd-to-last stop"
                            placeholder="e.g. Ithaca, NY"
                            value={destination}
                            onChange={e => setDestination(e.target.value)}
                            sx={{ mb: 4 }}
                        />

                        <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LocalGasStationIcon /> Statement of Travel Mileage ({trip.legs.length} rows)
                        </Typography>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 700 }}>#</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>From</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>To</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Miles</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {trip.legs.map((leg, idx) => (
                                    <TableRow key={idx}>
                                        <TableCell sx={{ color: 'text.secondary', fontWeight: 700 }}>{idx + 1}</TableCell>
                                        <TableCell>{getTown(leg.from)}</TableCell>
                                        <TableCell>{getTown(leg.to)}</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: 'primary.main' }} title={`Itinerary shows: ${leg.distance}`}>
                                            {leg.miles}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        <Typography sx={{ textAlign: 'right', mt: 2, fontWeight: 700, color: 'primary.main' }}>
                            Total miles traveled: {fmtMiles(trip.totalMiles)} mi
                        </Typography>

                        <Button
                            fullWidth
                            variant="contained"
                            size="large"
                            onClick={handleDownload}
                            disabled={loadingPdf}
                            startIcon={loadingPdf ? <CircularProgress size={20} color="inherit" /> : <DownloadIcon />}
                            sx={{ borderRadius: 2, py: 1.5, fontSize: '1.1rem', mt: 3 }}
                        >
                            {loadingPdf ? 'Generating PDF...' : 'Download Reimbursement + Itinerary PDF'}
                        </Button>
                    </Paper>
                </>
            )}
        </Box>
    );
};

export default GasForms;
