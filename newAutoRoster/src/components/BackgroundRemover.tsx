import { useState, useRef, useEffect } from 'react';
import {
    Box, Typography, Button, LinearProgress, Stack, Tooltip,
    ToggleButtonGroup, ToggleButton
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DownloadIcon from '@mui/icons-material/Download';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import CheckIcon from '@mui/icons-material/Check';
import { removeBackground, preload } from '@imgly/background-removal';

type ModelType = 'isnet_fp16' | 'isnet_quint8';

const BackgroundRemover = () => {
    const [processedUrl, setProcessedUrl] = useState<string | null>(null);
    const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);
    const [currentFile, setCurrentFile] = useState<File | null>(null);
    const [model, setModel] = useState<ModelType>('isnet_quint8');
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [copied, setCopied] = useState(false);

    const fileInputRef = useRef<HTMLInputElement | null>(null);

    // Preload the fast model weights in the background on page load
    useEffect(() => {
        preload({ model: 'isnet_quint8' }).catch(() => {});
    }, []);

    const processFile = async (file: File, selectedModel: ModelType = model) => {
        if (!file.type.startsWith('image/')) return;

        setCurrentFile(file);
        setLoading(true);
        setProgress(10);
        setProcessedUrl(null);
        setProcessedBlob(null);

        try {
            const blob = await removeBackground(file, {
                model: selectedModel,
                progress: (_key: string, current: number, total: number) => {
                    if (total > 0) setProgress(Math.round((current / total) * 100));
                }
            });
            setProcessedBlob(blob);
            setProcessedUrl(URL.createObjectURL(blob));
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleModelChange = (_: React.MouseEvent<HTMLElement>, newModel: ModelType | null) => {
        if (!newModel || newModel === model) return;
        setModel(newModel);
        if (currentFile) {
            processFile(currentFile, newModel);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer.files?.[0]) {
            processFile(e.dataTransfer.files[0]);
        }
    };

    const handleDownload = () => {
        if (!processedUrl || !currentFile) return;
        const name = currentFile.name.replace(/\.[^/.]+$/, "");
        const a = document.createElement('a');
        a.href = processedUrl;
        a.download = `${name}-transparent.png`;
        a.click();
    };

    const handleCopy = async () => {
        if (!processedBlob || !navigator.clipboard?.write) return;
        try {
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': processedBlob })]);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (e) {
            console.error(e);
        }
    };

    const handleReset = () => {
        setProcessedUrl(null);
        setProcessedBlob(null);
        setCurrentFile(null);
        setProgress(0);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <Box sx={{ maxWidth: 760, mx: 'auto', py: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h5" sx={{ fontWeight: 800 }}>
                    Background Remover
                </Typography>
                <ToggleButtonGroup
                    size="small"
                    value={model}
                    exclusive
                    onChange={handleModelChange}
                    disabled={loading}
                    sx={{
                        '& .MuiToggleButton-root': {
                            textTransform: 'none',
                            px: 1.5,
                            py: 0.5,
                            fontSize: '0.85rem',
                            fontWeight: 600
                        }
                    }}
                >
                    <ToggleButton value="isnet_quint8">
                        Fast (Recommended)
                    </ToggleButton>
                    <ToggleButton value="isnet_fp16">
                        Slow (High Quality)
                    </ToggleButton>
                </ToggleButtonGroup>
            </Box>

            <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])}
            />

            {!processedUrl && !loading && (
                <Box
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                    onClick={() => fileInputRef.current?.click()}
                    sx={{
                        p: 8,
                        textAlign: 'center',
                        border: '2px dashed #cbd5e1',
                        borderRadius: 3,
                        cursor: 'pointer',
                        bgcolor: '#fff',
                        transition: 'all 0.15s',
                        '&:hover': { borderColor: 'primary.main', bgcolor: 'rgba(0, 90, 67, 0.02)' }
                    }}
                >
                    <CloudUploadIcon sx={{ fontSize: 44, color: 'text.secondary', mb: 1.5 }} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        Drop image here or click to browse
                    </Typography>
                </Box>
            )}

            {loading && (
                <Box sx={{ p: 8, textAlign: 'center', bgcolor: '#fff', borderRadius: 3, border: '1px solid #e2e8f0' }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Processing... {progress > 0 ? `${progress}%` : ''}
                    </Typography>
                    <LinearProgress
                        variant={progress > 0 ? "determinate" : "indeterminate"}
                        value={progress}
                        sx={{ maxWidth: 320, mx: 'auto', height: 6, borderRadius: 3 }}
                    />
                </Box>
            )}

            {processedUrl && !loading && (
                <Box sx={{ textAlign: 'center' }}>
                    <Box
                        sx={{
                            p: 3,
                            borderRadius: 3,
                            border: '1px solid #e2e8f0',
                            bgcolor: '#fff',
                            background: 'repeating-conic-gradient(#e2e8f0 0% 25%, #ffffff 0% 50%) 50% / 20px 20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minHeight: 380,
                            mb: 2.5
                        }}
                    >
                        <img
                            src={processedUrl}
                            alt="Cutout"
                            style={{ maxWidth: '100%', maxHeight: 440, objectFit: 'contain' }}
                        />
                    </Box>

                    <Stack direction="row" spacing={1.5} justifyContent="center">
                        <Button
                            variant="contained"
                            startIcon={<DownloadIcon />}
                            onClick={handleDownload}
                        >
                            Download PNG
                        </Button>
                        <Tooltip title={copied ? "Copied!" : "Copy image"}>
                            <Button
                                variant="outlined"
                                startIcon={copied ? <CheckIcon /> : <ContentCopyIcon />}
                                onClick={handleCopy}
                            >
                                {copied ? 'Copied' : 'Copy'}
                            </Button>
                        </Tooltip>
                        <Button
                            variant="text"
                            color="inherit"
                            startIcon={<RestartAltIcon />}
                            onClick={handleReset}
                        >
                            New
                        </Button>
                    </Stack>
                </Box>
            )}
        </Box>
    );
};

export default BackgroundRemover;
