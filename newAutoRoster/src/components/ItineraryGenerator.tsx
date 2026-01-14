import { useState } from 'react';
import { Box, Typography, Paper, TextField, Button, Alert, Stack, Card, CardContent, CardMedia, Accordion, AccordionSummary, AccordionDetails, CircularProgress } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import MapIcon from '@mui/icons-material/Map';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';

const ItineraryGenerator = () => {
    const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL;

    // --- STATE ---

    // 0. Full Generation
    const [finalUrl, setFinalUrl] = useState('');
    const [genResult, setGenResult] = useState<{ docUrl: string, docId: string } | null>(null);
    const [loadingGen, setLoadingGen] = useState(false);

    // 1. Parsing
    const [testUrl, setTestUrl] = useState('');
    const [stopsResult, setStopsResult] = useState<{ stops: string[], fullUrl: string } | null>(null);
    const [loadingStops, setLoadingStops] = useState(false);

    // 2. Location
    const [locQuery, setLocQuery] = useState('');
    const [locResult, setLocResult] = useState<{ lat: number, lon: number, source: string } | null>(null);
    const [loadingLoc, setLoadingLoc] = useState(false);

    // 3. Route
    const [routeOrigin, setRouteOrigin] = useState('');
    const [routeDest, setRouteDest] = useState('');
    const [routeResult, setRouteResult] = useState<{ image: string, distance: string, duration: string } | null>(null);
    const [loadingRoute, setLoadingRoute] = useState(false);

    // 4. Amenities
    const [amenityQuery, setAmenityQuery] = useState('');
    const [amenitiesResult, setAmenitiesResult] = useState<{ hospitals: any[], gas: any[], mechanic: any[] } | null>(null);
    const [loadingAmenities, setLoadingAmenities] = useState(false);

    // --- HANDLERS ---

    const callApi = async (action: string, payload: any) => {
        if (!APPS_SCRIPT_URL) throw new Error("API URL missing");
        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: action, ...payload }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        });
        return await response.json();
    };

    const handleTestStops = async () => {
        setLoadingStops(true);
        setStopsResult(null);
        try {
            const res = await callApi('testExtractStops', { url: testUrl });
            if (res.success) setStopsResult(res);
            else alert(res.error);
        } catch (e) { alert(e); }
        setLoadingStops(false);
    };

    const handleTestLoc = async () => {
        setLoadingLoc(true);
        setLocResult(null);
        try {
            const res = await callApi('testResolveLocation', { query: locQuery });
            if (res.success) setLocResult(res);
            else alert(res.error || "Location not found");
        } catch (e) { alert(e); }
        setLoadingLoc(false);
    };

    const handleTestRoute = async () => {
        setLoadingRoute(true);
        setRouteResult(null);
        try {
            const res = await callApi('testRouteMap', {
                origin: routeOrigin,
                dest: routeDest
            });
            if (res.success) setRouteResult(res);
            else alert(res.error);
        } catch (e) { alert(e); }
        setLoadingRoute(false);
    };

    const handleTestAmenities = async () => {
        setLoadingAmenities(true);
        setAmenitiesResult(null);
        try {
            const res = await callApi('testAmenities', { address: amenityQuery });
            if (res.success) setAmenitiesResult(res.data);
            else alert(res.error || "Could not find amenities for this location.");
        } catch (e) { alert(e); }
        setLoadingAmenities(false);
    };

    const handleGenerate = async () => {
        setLoadingGen(true);
        setGenResult(null);
        try {
            const res = await callApi('generateItinerary', { url: finalUrl });
            if (res.success) setGenResult(res);
            else alert(res.error);
        } catch (e) { alert(e); }
        setLoadingGen(false);
    };

    return (
        <Box sx={{ p: 4, maxWidth: 1000, mx: 'auto' }}>
            <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.main', mb: 2, textAlign: 'center' }}>
                Itinerary Generator <span style={{ color: '#666', fontSize: '1.2rem', verticalAlign: 'middle' }}>(Beta)</span>
            </Typography>

            <Alert severity="info" sx={{ mb: 4, borderRadius: 2 }}>
                <Typography variant="body2" fontWeight="bold" gutterBottom>Instructions:</Typography>
                <Typography variant="body2">
                    1. Go to <b>Google Maps</b> and create a multi-stop itinerary.<br />
                    2. The trip <b>MUST</b> start and end at <b>Binghamton University</b> (e.g. Binghamton &rarr; Stop A &rarr; Stop B &rarr; Binghamton).<br />
                    3. Copy the full browser URL and paste it into the field below.
                </Typography>
            </Alert>

            {/* 0. FULL GENERATOR */}
            <Accordion defaultExpanded sx={{ mb: 4, border: '2px solid', borderColor: 'success.main' }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Stack direction="row" spacing={2} alignItems="center">
                        <MapIcon color="success" />
                        <Typography variant="h6" fontWeight="bold">Generate Full Google Doc</Typography>
                    </Stack>
                </AccordionSummary>
                <AccordionDetails>
                    <Stack spacing={2}>
                        <TextField
                            label="Google Maps Direction URL"
                            fullWidth
                            placeholder="https://www.google.com/maps/dir/..."
                            value={finalUrl}
                            onChange={e => setFinalUrl(e.target.value)}
                        />
                        <Button
                            variant="contained"
                            color="success"
                            fullWidth
                            size="large"
                            onClick={handleGenerate}
                            disabled={loadingGen}
                            startIcon={loadingGen ? <CircularProgress size={20} color="inherit" /> : null}
                        >
                            {loadingGen ? 'Building Itinerary (Can take ~30s)...' : 'Generate Full Document'}
                        </Button>

                        {genResult && (
                            <Alert
                                severity="success"
                                action={
                                    <Button color="inherit" size="small" href={genResult.docUrl} target="_blank">
                                        OPEN DOC
                                    </Button>
                                }
                            >
                                Your itinerary is ready!
                            </Alert>
                        )}
                    </Stack>
                </AccordionDetails>
            </Accordion>

            {/* DEBUG TOOLS DROPDOWN */}
            <Accordion sx={{ bgcolor: 'rgba(0,0,0,0.02)' }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="overline" color="text.secondary" fontWeight="bold">Advanced Debug Tools</Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ px: 0 }}>
                    <Stack spacing={2}>

                        {/* 1. URL PARSER */}
                        <Accordion defaultExpanded>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Stack direction="row" spacing={2} alignItems="center">
                                    <MapIcon color="primary" />
                                    <Typography variant="h6">1. Test URL Parsing</Typography>
                                </Stack>
                            </AccordionSummary>
                            <AccordionDetails>
                                <Stack spacing={2}>
                                    <TextField
                                        label="Google Maps URL"
                                        fullWidth
                                        value={testUrl}
                                        onChange={(e) => setTestUrl(e.target.value)}
                                    />
                                    <Button variant="contained" onClick={handleTestStops} disabled={loadingStops}>
                                        {loadingStops ? 'Parsing...' : 'Parse Stops'}
                                    </Button>
                                    {stopsResult && (
                                        <Box sx={{ bgcolor: '#f5f5f5', p: 2, borderRadius: 2 }}>
                                            <Typography variant="subtitle2">Full URL:</Typography>
                                            <Typography variant="body2" sx={{ wordBreak: 'break-all', mb: 2 }}>{stopsResult.fullUrl}</Typography>
                                            <Typography variant="subtitle2">Stops Found ({stopsResult.stops.length}):</Typography>
                                            <ul>
                                                {stopsResult.stops.map((s, i) => <li key={i}>{s}</li>)}
                                            </ul>
                                        </Box>
                                    )}
                                </Stack>
                            </AccordionDetails>
                        </Accordion>

                        {/* 2. LOCATION RESOLVER */}
                        <Accordion>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Stack direction="row" spacing={2} alignItems="center">
                                    <LocationOnIcon color="secondary" />
                                    <Typography variant="h6">2. Test Location Resolution</Typography>
                                </Stack>
                            </AccordionSummary>
                            <AccordionDetails>
                                <Stack spacing={2}>
                                    <TextField
                                        label="Address / Place Name"
                                        fullWidth
                                        value={locQuery}
                                        onChange={(e) => setLocQuery(e.target.value)}
                                    />
                                    <Button variant="contained" color="secondary" onClick={handleTestLoc} disabled={loadingLoc}>
                                        {loadingLoc ? 'Resolving...' : 'Resolve Coordinates'}
                                    </Button>
                                    {locResult && (
                                        <Alert severity="success">
                                            <b>Found via {locResult.source}:</b> {locResult.lat}, {locResult.lon}
                                        </Alert>
                                    )}
                                </Stack>
                            </AccordionDetails>
                        </Accordion>

                        {/* 3. ROUTE & MAP */}
                        <Accordion>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Stack direction="row" spacing={2} alignItems="center">
                                    <DirectionsCarIcon color="warning" />
                                    <Typography variant="h6">3. Test Route & Map Image</Typography>
                                </Stack>
                            </AccordionSummary>
                            <AccordionDetails>
                                <Stack spacing={2}>
                                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                        <TextField
                                            label="Origin Addr."
                                            fullWidth
                                            value={routeOrigin}
                                            onChange={e => setRouteOrigin(e.target.value)}
                                        />
                                        <TextField
                                            label="Destination Addr."
                                            fullWidth
                                            value={routeDest}
                                            onChange={e => setRouteDest(e.target.value)}
                                        />
                                    </Stack>

                                    <Button variant="contained" color="warning" fullWidth onClick={handleTestRoute} disabled={loadingRoute}>
                                        {loadingRoute ? 'Routing...' : 'Get Route & Map Screenshot'}
                                    </Button>

                                    {routeResult && (
                                        <Card>
                                            <CardContent>
                                                <Typography variant="h6">{routeResult.duration} / {routeResult.distance}</Typography>
                                            </CardContent>
                                            <CardMedia
                                                component="img"
                                                height="350"
                                                image={routeResult.image}
                                                alt="Route Map"
                                            />
                                        </Card>
                                    )}
                                </Stack>
                            </AccordionDetails>
                        </Accordion>

                        {/* 4. AMENITIES */}
                        <Accordion>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Stack direction="row" spacing={2} alignItems="center">
                                    <LocalHospitalIcon color="error" />
                                    <Typography variant="h6">4. Test Amenities</Typography>
                                </Stack>
                            </AccordionSummary>
                            <AccordionDetails>
                                <Stack spacing={2}>
                                    <TextField
                                        label="Address / Center Point"
                                        fullWidth
                                        value={amenityQuery}
                                        onChange={e => setAmenityQuery(e.target.value)}
                                    />
                                    <Button variant="contained" color="error" fullWidth onClick={handleTestAmenities} disabled={loadingAmenities}>
                                        {loadingAmenities ? 'Scanning Area...' : 'Find Nearby Amenities'}
                                    </Button>

                                    {amenitiesResult && (
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                                            {['Hospitals', 'Gas', 'Mechanic'].map((type) => {
                                                const key = type.toLowerCase() as keyof typeof amenitiesResult;
                                                const items = amenitiesResult[key];
                                                return (
                                                    <Box key={type} sx={{ flex: '1 1 300px', minWidth: 250 }}>
                                                        <Paper sx={{ p: 2, height: '100%', bgcolor: '#fffafa' }}>
                                                            <Typography variant="h6" gutterBottom>{type}</Typography>
                                                            {items.length === 0 ? <Typography color="text.secondary">None found.</Typography> :
                                                                items.map((item: any, i: number) => (
                                                                    <Box
                                                                        key={i}
                                                                        sx={{
                                                                            mb: 2,
                                                                            p: 1.5,
                                                                            border: i === 0 ? '2px solid' : '1px solid #ddd',
                                                                            borderColor: i === 0 ? 'primary.main' : '#ddd',
                                                                            borderRadius: 1,
                                                                            position: 'relative',
                                                                            bgcolor: i === 0 ? 'rgba(25, 118, 210, 0.04)' : 'transparent'
                                                                        }}
                                                                    >
                                                                        {i === 0 && (
                                                                            <Typography
                                                                                variant="caption"
                                                                                sx={{
                                                                                    position: 'absolute',
                                                                                    top: -10,
                                                                                    right: 10,
                                                                                    bgcolor: 'primary.main',
                                                                                    color: 'white',
                                                                                    px: 1,
                                                                                    borderRadius: 1,
                                                                                    fontWeight: 'bold',
                                                                                    fontSize: '0.65rem'
                                                                                }}
                                                                            >
                                                                                BEST OPTION
                                                                            </Typography>
                                                                        )}
                                                                        <Typography fontWeight={700} color={i === 0 ? 'primary.main' : 'text.primary'}>
                                                                            {item.name}
                                                                        </Typography>
                                                                        <Typography variant="caption" display="block">Address: {item.address}</Typography>
                                                                        <Typography variant="caption" display="block">Phone: {item.phone}</Typography>
                                                                        <Typography variant="caption" display="block">Hours: {item.hours}</Typography>
                                                                        <Typography variant="caption" display="block" color="primary" sx={{ fontWeight: 'bold', mt: 0.5 }}>
                                                                            {item.driveStats}
                                                                        </Typography>
                                                                    </Box>
                                                                ))
                                                            }
                                                        </Paper>
                                                    </Box>
                                                );
                                            })}
                                        </Box>
                                    )}
                                </Stack>
                            </AccordionDetails>
                        </Accordion>
                    </Stack>
                </AccordionDetails>
            </Accordion>
        </Box>
    );
};

export default ItineraryGenerator;
