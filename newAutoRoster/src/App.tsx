import { useMemo } from 'react'
import { HashRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom'
import { Tabs, Tab, Box, Container, AppBar, Toolbar, Typography, CssBaseline, ThemeProvider, createTheme } from '@mui/material'
import QRGenerator from './components/QRGenerator'
import AddCloseDate from './components/AddCloseDate'
import AutoEmailSettings from './components/AutoEmailSettings'
import AutoFormGenerator from './components/AutoFormGenerator'
import ToolsConfig from './components/ToolsConfig'
import './App.css'

function AppContent() {
  const location = useLocation()

  // Use the current path as the tab value. 
  const currentPath = location.pathname === '/' ? '/qr' : location.pathname

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: '#f8faf9' }}>
      <AppBar position="fixed" color="default" sx={{ bgcolor: 'white', borderBottom: '1px solid #e0e6e4', boxShadow: 'none' }}>
        <Container maxWidth="lg">
          <Toolbar disableGutters>
            <Typography variant="h5" sx={{ mr: 4, fontWeight: 800, color: 'primary.main', cursor: 'default', letterSpacing: '-0.02em' }}>
              Eboard Tools
            </Typography>
            <Tabs
              value={currentPath}
              indicatorColor="primary"
              textColor="primary"
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                '& .MuiTab-root': {
                  fontSize: '0.95rem',
                  minWidth: 100,
                  transition: 'all 0.2s',
                  '&:hover': {
                    color: 'primary.light',
                    opacity: 0.8,
                  },
                },
              }}
            >
              <Tab
                value="/qr"
                label="QR Generator"
                component={Link}
                to="/qr"
                sx={{ textTransform: 'none', fontWeight: 600 }}
              />
              <Tab
                value="/auto-form"
                label="Commitment Form Generator"
                component={Link}
                to="/auto-form"
                sx={{ textTransform: 'none', fontWeight: 600 }}
              />
              <Tab
                value="/add-date"
                label="Schedule Form Close Date"
                component={Link}
                to="/add-date"
                sx={{ textTransform: 'none', fontWeight: 600 }}
              />
              <Tab
                value="/auto-email"
                label="Auto-Reply Slideshow Bot"
                component={Link}
                to="/auto-email"
                sx={{ textTransform: 'none', fontWeight: 600 }}
              />
              <Tab
                value="/config"
                label="Tools Config"
                component={Link}
                to="/config"
                sx={{ textTransform: 'none', fontWeight: 600 }}
              />
            </Tabs>
          </Toolbar>
        </Container>
      </AppBar>
      <Toolbar /> {/* Spacer for fixed AppBar */}
      <Container maxWidth="lg" sx={{ mt: 6, mb: 6, flexGrow: 1 }}>
        <Routes>
          <Route path="/" element={<Navigate to="/qr" replace />} />
          <Route path="/qr" element={<QRGenerator />} />
          <Route path="/auto-form" element={<AutoFormGenerator />} />
          <Route path="/add-date" element={<AddCloseDate />} />
          <Route path="/auto-email" element={<AutoEmailSettings />} />
          <Route path="/config" element={<ToolsConfig />} />
        </Routes>
      </Container>
    </Box>
  )
}



function App() {
  const theme = useMemo(() => createTheme({
    palette: {
      primary: {
        main: '#005A43',
        light: '#008462',
        dark: '#003d2e',
        contrastText: '#ffffff',
      },
      secondary: {
        main: '#C19A6B', // A desert sand / muted gold for a premium feel
      },
      background: {
        default: '#f8faf9',
        paper: '#ffffff',
      },
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h5: {
        fontWeight: 700,
      },
      h6: {
        fontWeight: 600,
      },
    },
    shape: {
      borderRadius: 12,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 600,
            padding: '10px 24px',
            boxShadow: 'none',
            '&:hover': {
              boxShadow: '0px 4px 12px rgba(0, 90, 67, 0.15)',
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.04)',
            border: '1px solid #eef2f1',
          },
        },
      },
    },
  }), []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AppContent />
      </Router>
    </ThemeProvider>
  )
}

export default App


