import { useState } from 'react';
import { Box, TextField, Button, Typography, Paper } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

const QRGenerator = () => {
    const [text, setText] = useState('');
    const [qrUrl, setQrUrl] = useState('');

    const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setText(e.target.value);
        if (qrUrl) setQrUrl('');
    };

    const handleInputInteraction = () => {
        if (qrUrl) setQrUrl('');
    };

    const generateQRCode = () => {
        if (!text.trim()) return;
        const url = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(text)}`;
        setQrUrl(url);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            generateQRCode();
        }
    };

    const handleCopyImage = async () => {
        if (!qrUrl) return;
        try {
            const response = await fetch(qrUrl);
            const blob = await response.blob();
            await navigator.clipboard.write([
                new ClipboardItem({ [blob.type]: blob })
            ]);
        } catch (err) {
            console.error('Failed to copy image:', err);
        }
    };

    return (
        <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.main', mb: 3 }}>
                QR Code Generator
            </Typography>
            <Paper elevation={3} sx={{ p: 4, width: '100%', maxWidth: 450, borderRadius: 3 }}>
                <TextField
                    fullWidth
                    label="Enter text or URL"
                    variant="outlined"
                    value={text}
                    onChange={handleTextChange}
                    onClick={handleInputInteraction}
                    onTouchStart={handleInputInteraction}
                    onKeyDown={handleKeyDown}
                    placeholder="Paste a link or type something..."
                    sx={{ mb: 3 }}
                />
                <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    onClick={generateQRCode}
                    disabled={!text.trim()}
                    sx={{ borderRadius: 2, py: 1.5, fontSize: '1.1rem', textTransform: 'none' }}
                >
                    Generate QR Code
                </Button>
            </Paper>

            <Box sx={{ mt: 4, minHeight: 250, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                {qrUrl ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
                        <Box
                            component="img"
                            src={qrUrl}
                            alt="QR Code"

                        />
                        <Button
                            variant="outlined"
                            size="large"
                            startIcon={<ContentCopyIcon />}
                            onClick={handleCopyImage}
                            sx={{
                                height: 80,
                                px: 4,
                                fontSize: '1.2rem',
                                borderRadius: 3,
                                borderWidth: 2,
                                fontWeight: 600,
                                '&:hover': { borderWidth: 2 }
                            }}
                        >
                            Copy Image
                        </Button>
                    </Box>
                ) : (
                    <Typography color="text.secondary" sx={{ fontStyle: 'italic' }}>
                        QR code will appear here after clicking "Generate"
                    </Typography>
                )}
            </Box>
        </Box>
    );
};

export default QRGenerator;
