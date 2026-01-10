import { useState, useEffect } from 'react';
import { Box, TextField, Button, Typography, Paper, Alert, CircularProgress, Divider, Stack } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';

const ToolsConfig = () => {
    const [folderUrl, setFolderUrl] = useState('');
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL;

    const fetchConfig = async () => {
        try {
            if (!APPS_SCRIPT_URL) return;
            const response = await fetch(APPS_SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify({ action: 'getConfigs' }),
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            });
            const result = await response.json();
            if (result.success) {
                setCurrentFolderId(result.props.COMMITMENT_FORM_FOLDER_ID);
            }
        } catch (err) {
            console.error('Failed to fetch config:', err);
        }
    };

    useEffect(() => {
        fetchConfig();
    }, []);

    const extractFolderId = (url: string) => {
        const match = url.match(/folders\/([-\w]{25,})/);
        return match ? match[1] : url.trim();
    };

    const handleSave = async () => {
        if (!folderUrl) {
            setStatus({ type: 'error', message: 'Please provide a Folder URL or ID' });
            return;
        }

        const newId = extractFolderId(folderUrl);
        if (!newId || newId.length < 20) {
            setStatus({ type: 'error', message: 'Invalid Folder URL or ID format' });
            return;
        }

        setLoading(true);
        setStatus(null);

        try {
            const response = await fetch(APPS_SCRIPT_URL!, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'saveConfig',
                    key: 'COMMITMENT_FORM_FOLDER_ID',
                    value: newId
                }),
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            });

            const result = await response.json();
            if (result.success) {
                setStatus({ type: 'success', message: 'Commitment Forms folder updated!' });
                setCurrentFolderId(newId);
                setFolderUrl('');
            } else {
                setStatus({ type: 'error', message: result.error || 'Failed to update' });
            }
        } catch (err) {
            setStatus({ type: 'error', message: 'Connection Error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
                <SettingsIcon color="primary" sx={{ fontSize: 32 }} />
                <Typography variant="h5" sx={{ fontWeight: 600 }}>
                    Tools Configuration
                </Typography>
            </Stack>

            <Paper elevation={3} sx={{ p: 4, width: '100%', maxWidth: 600, borderRadius: 3 }}>
                <Typography variant="h6" gutterBottom>
                    Commitment Form Storage
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Specify where newly generated commitment forms should be saved.
                </Typography>

                <Box sx={{ mb: 4, p: 2, bgcolor: '#f5f7f6', borderRadius: 2, border: '1px solid #e0e6e4' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
                        Current Folder ID:
                    </Typography>
                    <Typography variant="body1" sx={{ fontFamily: 'monospace', mt: 0.5, wordBreak: 'break-all' }}>
                        {currentFolderId || 'Loading...'}
                    </Typography>
                </Box>

                <Divider sx={{ mb: 4 }} />

                <Stack spacing={3}>
                    <TextField
                        fullWidth
                        label="Update Folder URL"
                        placeholder="Paste the Google Drive folder link here..."
                        value={folderUrl}
                        onChange={(e) => setFolderUrl(e.target.value)}
                        variant="outlined"
                    />

                    {status && <Alert severity={status.type}>{status.message}</Alert>}

                    <Button
                        fullWidth
                        variant="contained"
                        size="large"
                        onClick={handleSave}
                        disabled={loading}
                        startIcon={loading && <CircularProgress size={20} color="inherit" />}
                        sx={{ py: 1.5, borderRadius: 2, fontWeight: 600 }}
                    >
                        {loading ? 'Saving...' : 'Update Storage Folder'}
                    </Button>
                </Stack>
            </Paper>
        </Box>
    );
};

export default ToolsConfig;
