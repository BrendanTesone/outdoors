import { useMemo } from 'react'
import { HashRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom'
import {
  Box, Container, Typography, CssBaseline, ThemeProvider, createTheme,
  Drawer, ListItemButton, ListItemIcon, ListItemText, ListSubheader, Divider
} from '@mui/material'
import SettingsIcon from '@mui/icons-material/Settings';
import QrCodeIcon from '@mui/icons-material/QrCode';
import DescriptionIcon from '@mui/icons-material/Description';
import EventIcon from '@mui/icons-material/Event';
import GroupIcon from '@mui/icons-material/Group';
import MailIcon from '@mui/icons-material/Mail';
import StarIcon from '@mui/icons-material/Star';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import SendIcon from '@mui/icons-material/Send';
import MapIcon from '@mui/icons-material/Map';

import QRGenerator from './components/QRGenerator'
import AddCloseDate from './components/AddCloseDate'
import AutoEmailSettings from './components/AutoEmailSettings'
import AutoFormGenerator from './components/AutoFormGenerator'
import ToolsConfig from './components/ToolsConfig'
import PriorityManager from './components/PriorityManager'
import AutoRoster from './components/AutoRoster'
import DraftTripEmail from './components/DraftTripEmail'
import SetRosterPriority from './components/SetRosterPriority'
import ItineraryGenerator from './components/ItineraryGenerator'
import DashboardHome from './components/DashboardHome'
import outdoorsLogo from './assets/Outdoors Tree Logo.png'
import './App.css'

const DRAWER_WIDTH = 280;

function AppContent() {
  const location = useLocation();

  const MenuItem = ({ to, icon, label, beta }: { to: string, icon: React.ReactNode, label: string, beta?: boolean }) => {
    const active = location.pathname === to;
    return (
      <ListItemButton
        component={Link}
        to={to}
        sx={{
          my: 0.5,
          mx: 1,
          borderRadius: 2,
          bgcolor: active ? 'rgba(0, 90, 67, 0.08)' : 'transparent',
          color: active ? 'primary.main' : 'text.primary',
          '&:hover': {
            bgcolor: active ? 'rgba(0, 90, 67, 0.08)' : 'rgba(0,0,0,0.04)'
          },
          '& .MuiListItemIcon-root': {
            color: active ? 'primary.main' : 'text.secondary'
          }
        }}
        selected={active}
      >
        <ListItemIcon>{icon}</ListItemIcon>
        <ListItemText
          primary={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {label}
              {beta && (
                <Typography
                  sx={{
                    fontSize: '0.6rem',
                    bgcolor: 'rgba(0,0,0,0.05)',
                    px: 0.5,
                    borderRadius: 0.5,
                    fontWeight: 700,
                    color: 'text.secondary',
                    letterSpacing: '0.05em'
                  }}
                >
                  BETA
                </Typography>
              )}
            </Box>
          }
          primaryTypographyProps={{ fontWeight: active ? 700 : 500, fontSize: '0.9rem' }}
        />
      </ListItemButton>
    );
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f8faf9' }}>

      {/* Top Bar */}


      {/* Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: DRAWER_WIDTH, boxSizing: 'border-box', borderRight: '1px solid #e0e6e4', bgcolor: '#ffffff' },
        }}
      >
        <Box
          component={Link}
          to="/"
          sx={{
            p: 1.5,
            borderBottom: '1px solid #e0e6e4',
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            textDecoration: 'none',
            color: 'inherit',
            cursor: 'pointer',
            transition: 'bgcolor 0.2s',
            '&:hover': { bgcolor: '#f9f9f9' }
          }}
        >
          <img src={outdoorsLogo} alt="Logo" style={{ height: 60, width: 'auto' }} />
          <Typography variant="h6" sx={{ fontWeight: 800, color: 'primary.main', fontSize: '1.2rem', whiteSpace: 'nowrap' }}>
            Eboard Tools
          </Typography>
        </Box>
        <Box sx={{ overflow: 'auto', py: 2 }}>

          <ListSubheader disableSticky sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', color: 'text.secondary', lineHeight: '2em' }}>
            Phase 1: Trip Prep
          </ListSubheader>
          <MenuItem to="/qr" icon={<QrCodeIcon />} label="QR Generator" />
          <MenuItem to="/auto-form" icon={<DescriptionIcon />} label="Commitment Form" />
          <MenuItem to="/add-date" icon={<EventIcon />} label="Set Close Date" />

          <Divider sx={{ my: 2, mx: 2 }} />

          <ListSubheader disableSticky sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', color: 'text.secondary', lineHeight: '2em' }}>
            Phase 2: Roster Management
          </ListSubheader>
          <MenuItem to="/auto-roster" icon={<GroupIcon />} label="Auto Roster" />
          <MenuItem to="/set-priority" icon={<TrendingUpIcon />} label="Set Trip Priority" />

          <Divider sx={{ my: 2, mx: 2 }} />

          <ListSubheader disableSticky sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', color: 'text.secondary', lineHeight: '2em' }}>
            Phase 3: Communication
          </ListSubheader>
          <MenuItem to="/draft-email" icon={<MailIcon />} label="Draft Trip Emails" />
          <MenuItem to="/auto-email" icon={<SendIcon />} label="Email Slideshow Bot" />

          <Divider sx={{ my: 2, mx: 2 }} />

          <ListSubheader disableSticky sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', color: 'text.secondary', lineHeight: '2em' }}>
            Experimental
          </ListSubheader>
          <MenuItem to="/itinerary" icon={<MapIcon />} label="Itinerary Generator" beta />

          <Divider sx={{ my: 2, mx: 2 }} />

          <ListSubheader disableSticky sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', color: 'text.secondary', lineHeight: '2em' }}>
            Admin & Database
          </ListSubheader>
          <MenuItem to="/priority" icon={<StarIcon />} label="Priority Database" />
          <MenuItem to="/config" icon={<SettingsIcon />} label="Global Config" />

        </Box>
      </Drawer>

      {/* Main Content */}
      <Box component="main" sx={{ flexGrow: 1, p: 4, width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` } }}>

        <Container maxWidth="lg">
          <Routes>
            <Route path="/" element={<DashboardHome />} />
            <Route path="/qr" element={<QRGenerator />} />
            <Route path="/auto-form" element={<AutoFormGenerator />} />
            <Route path="/add-date" element={<AddCloseDate />} />
            <Route path="/auto-email" element={<AutoEmailSettings />} />
            <Route path="/priority" element={<PriorityManager />} />
            <Route path="/config" element={<ToolsConfig />} />
            <Route path="/auto-roster" element={<AutoRoster />} />
            <Route path="/draft-email" element={<DraftTripEmail />} />
            <Route path="/set-priority" element={<SetRosterPriority />} />
            <Route path="/itinerary" element={<ItineraryGenerator />} />
          </Routes>
        </Container>
      </Box>
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
