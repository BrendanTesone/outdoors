import { useState, useEffect } from 'react';
import { Box, TextField, Button, Typography, Paper, Alert, Stack, Divider } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import FolderIcon from '@mui/icons-material/Folder';
import DescriptionIcon from '@mui/icons-material/Description';

const ToolsConfig = () => {
    const [commitmentFolderUrl, setCommitmentFolderUrl] = useState('');
    const [priorityUrl, setPriorityUrl] = useState('');
    const [rosterTemplateUrl, setRosterTemplateUrl] = useState('');
    const [rosterFolderUrl, setRosterFolderUrl] = useState('');
    const [eboardUrl, setEboardUrl] = useState('');

    const [currentCommitmentFolderId, setCurrentCommitmentFolderId] = useState<string | null>(null);
    const [currentPriorityId, setCurrentPriorityId] = useState<string | null>(null);
    const [currentRosterTemplateId, setCurrentRosterTemplateId] = useState<string | null>(null);
    const [currentRosterFolderId, setCurrentRosterFolderId] = useState<string | null>(null);
    const [currentEboardId, setCurrentEboardId] = useState<string | null>(null);

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
                setCurrentCommitmentFolderId(result.props.COMMITMENT_FORM_FOLDER_ID);
                setCurrentPriorityId(result.props.PRIORITY_SHEET_ID);
                setCurrentRosterTemplateId(result.props.ROSTER_TEMPLATE_ID);
                setCurrentRosterFolderId(result.props.ROSTER_FOLDER_ID);
                setCurrentEboardId(result.props.EBOARD_SHEET_ID);
            }
        } catch (err) {
            console.error('Failed to fetch config:', err);
        }
    };

    useEffect(() => {
        fetchConfig();
    }, []);

    const extractId = (input: string) => {
        // Try folder pattern
        const folderMatch = input.match(/folders\/([-\w]{25,})/);
        if (folderMatch) return folderMatch[1];

        // Try file/sheet pattern
        const fileMatch = input.match(/\/d\/([-\w]{25,})/);
        if (fileMatch) return fileMatch[1];

        // Return trimmed input if it looks like an ID
        return input.trim();
    };

    const handleSaveConfig = async (key: string, value: string, successMsg: string) => {
        const id = extractId(value);
        if (!id || id.length < 20) {
            setStatus({ type: 'error', message: `Invalid ID/URL format for ${key.replace(/_/g, ' ')}` });
            return;
        }

        setLoading(true);
        setStatus(null);

        try {
            const response = await fetch(APPS_SCRIPT_URL!, {
                method: 'POST',
                body: JSON.stringify({ action: 'saveConfig', key, value: id }),
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            });

            const result = await response.json();
            if (result.success) {
                setStatus({ type: 'success', message: successMsg });
                // Update local state and clear inputs
                if (key === 'COMMITMENT_FORM_FOLDER_ID') {
                    setCurrentCommitmentFolderId(id);
                    setCommitmentFolderUrl('');
                } else if (key === 'PRIORITY_SHEET_ID') {
                    setCurrentPriorityId(id);
                    setPriorityUrl('');
                } else if (key === 'ROSTER_TEMPLATE_ID') {
                    setCurrentRosterTemplateId(id);
                    setRosterTemplateUrl('');
                } else if (key === 'ROSTER_FOLDER_ID') {
                    setCurrentRosterFolderId(id);
                    setRosterFolderUrl('');
                } else if (key === 'EBOARD_SHEET_ID') {
                    setCurrentEboardId(id);
                    setEboardUrl('');
                }
            } else {
                setStatus({ type: 'error', message: result.error || 'Failed to update' });
            }
        } catch (err) {
            setStatus({ type: 'error', message: 'Connection Error' });
        } finally {
            setLoading(false);
        }
    };

    const ConfigSection = ({ title, description, currentId, inputVal, setInputVal, settingKey, label, successMsg }: any) => (
        <Paper elevation={3} sx={{ p: 4, width: '100%', maxWidth: 700, borderRadius: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {title.includes('Folder') ? <FolderIcon color="primary" /> : <DescriptionIcon color="primary" />}
                {title}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {description}
            </Typography>

            <Box sx={{ mb: 4, p: 2, bgcolor: '#f5f7f6', borderRadius: 2, border: '1px solid #e0e6e4' }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
                    Current ID:
                </Typography>
                <Typography variant="body1" sx={{ fontFamily: 'monospace', mt: 0.5, wordBreak: 'break-all', fontSize: '0.9rem' }}>
                    {currentId || 'Not Set'}
                </Typography>
            </Box>

            <Stack spacing={2}>
                <TextField
                    fullWidth
                    label={label}
                    value={inputVal}
                    onChange={(e) => setInputVal(e.target.value)}
                    variant="outlined"
                    size="small"
                />
                <Button
                    variant="contained"
                    onClick={() => handleSaveConfig(settingKey, inputVal, successMsg)}
                    disabled={loading || !inputVal}
                >
                    Update {title.split(' ')[0]}
                </Button>
            </Stack>
        </Paper>
    );

    return (
        <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <Stack direction="row" spacing={2} alignItems="center">
                <SettingsIcon color="primary" sx={{ fontSize: 32 }} />
                <Typography variant="h5" sx={{ fontWeight: 800 }}>
                    Global Parameters
                </Typography>
            </Stack>

            <ConfigSection
                title="Commitment Folder"
                description="Where newly generated commitment forms are stored."
                currentId={currentCommitmentFolderId}
                inputVal={commitmentFolderUrl}
                setInputVal={setCommitmentFolderUrl}
                settingKey="COMMITMENT_FORM_FOLDER_ID"
                label="Folder URL or ID"
                successMsg="Commitment folder updated!"
            />

            <ConfigSection
                title="Priority Sheet"
                description="The master sheet containing Email, Name, and Priority scores."
                currentId={currentPriorityId}
                inputVal={priorityUrl}
                setInputVal={setPriorityUrl}
                settingKey="PRIORITY_SHEET_ID"
                label="Spreadsheet URL or ID"
                successMsg="Priority sheet updated!"
            />

            <ConfigSection
                title="Eboard Sheet"
                description="The sheet containing Eboard members' emails."
                currentId={currentEboardId}
                inputVal={eboardUrl}
                setInputVal={setEboardUrl}
                settingKey="EBOARD_SHEET_ID"
                label="Spreadsheet URL or ID"
                successMsg="Eboard sheet updated!"
            />

            <Divider sx={{ width: '100%', maxWidth: 700, my: 1 }} />

            <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                Roster File Creation
            </Typography>

            <ConfigSection
                title="Roster Template"
                description="The master template file (.xlsx or Sheets) used to generate new rosters."
                currentId={currentRosterTemplateId}
                inputVal={rosterTemplateUrl}
                setInputVal={setRosterTemplateUrl}
                settingKey="ROSTER_TEMPLATE_ID"
                label="File URL or ID"
                successMsg="Roster template ID updated!"
            />

            <ConfigSection
                title="Roster Destination Folder"
                description="The folder where newly created roster copies will be placed."
                currentId={currentRosterFolderId}
                inputVal={rosterFolderUrl}
                setInputVal={setRosterFolderUrl}
                settingKey="ROSTER_FOLDER_ID"
                label="Folder URL or ID"
                successMsg="Roster destination folder updated!"
            />

            {status && (
                <Box sx={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 2000 }}>
                    <Alert severity={status.type} variant="filled" onClose={() => setStatus(null)} sx={{ boxShadow: 3 }}>
                        {status.message}
                    </Alert>
                </Box>
            )}
        </Box>
    );
};

export default ToolsConfig;
