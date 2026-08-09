import { Grid, Paper, Typography, Box, Stack } from '@mui/material';
import QrCodeIcon from '@mui/icons-material/QrCode';
import DescriptionIcon from '@mui/icons-material/Description';
import EventIcon from '@mui/icons-material/Event';
import GroupIcon from '@mui/icons-material/Group';
import MailIcon from '@mui/icons-material/Mail';
import StarIcon from '@mui/icons-material/Star';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import SendIcon from '@mui/icons-material/Send';
import SettingsIcon from '@mui/icons-material/Settings';
import MapIcon from '@mui/icons-material/Map';
import { useNavigate } from 'react-router-dom';

const ToolCard = ({ icon, title, description, to, badge }: { icon: React.ReactNode, title: string, description: string, to: string, badge?: string }) => {
    const navigate = useNavigate();
    return (
        <Paper
            elevation={0}
            onClick={() => navigate(to)}
            sx={{
                p: 3,
                height: '100%',
                border: '1px solid #e0e6e4',
                borderRadius: 3,
                cursor: 'pointer',
                position: 'relative',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 12px 24px rgba(0,0,0,0.06)',
                    borderColor: 'primary.main',
                    bgcolor: 'rgba(0, 90, 67, 0.02)'
                }
            }}
        >
            {badge && (
                <Typography
                    variant="caption"
                    sx={{
                        position: 'absolute',
                        top: 12,
                        right: 12,
                        bgcolor: '#f1f5f9',
                        color: '#64748b',
                        px: 1,
                        py: 0.2,
                        borderRadius: 1,
                        fontWeight: 'bold',
                        fontSize: '0.65rem'
                    }}
                >
                    {badge}
                </Typography>
            )}
            <Box sx={{ color: 'primary.main', mb: 2 }}>
                {icon}
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 1.5, fontSize: '1.1rem' }}>
                {title}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                {description}
            </Typography>
        </Paper>
    );
};

const DashboardHome = () => {
    return (
        <Box maxWidth="md" sx={{ mx: 'auto', py: 4 }}>
            <Box sx={{ textAlign: 'center', mb: 8 }}>
                <Typography variant="h3" sx={{ fontWeight: 800, color: 'primary.main', mb: 2 }}>
                    Welcome to Eboard Tools
                </Typography>
                <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 400, maxWidth: 600, mx: 'auto' }}>
                    A comprehensive suite of automation tools designed to streamline outdoors club operations, from trip planning to roster management.
                </Typography>
            </Box>

            <Stack spacing={6}>
                {/* Trip Preparation */}
                <Box>
                    <Typography variant="overline" sx={{ fontWeight: 800, color: 'text.secondary', letterSpacing: '0.1em', mb: 3, display: 'block' }}>
                        Trip Preparation
                    </Typography>
                    <Grid container spacing={3}>
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <ToolCard
                                to="/auto-form"
                                icon={<DescriptionIcon fontSize="large" />}
                                title="Commitment Form"
                                description="Creates, fills out, publishes and sets an end date for a commitment form from a template."
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <ToolCard
                                to="/qr"
                                icon={<QrCodeIcon fontSize="large" />}
                                title="QR Code Generator"
                                description="Instantly generate QR codes for signup forms and links."
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <ToolCard
                                to="/add-date"
                                icon={<EventIcon fontSize="large" />}
                                title="Set Form Close Date"
                                description="Set a time for commitment forms to close to prevent late submissions."
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <ToolCard
                                to="/itinerary"
                                icon={<MapIcon fontSize="large" />}
                                title="Itinerary Generator"
                                description="Generate emergency plans and directions from multi-stop Google Maps links."
                            />
                        </Grid>
                    </Grid>
                </Box>

                {/* Roster & Priority Management */}
                <Box>
                    <Typography variant="overline" sx={{ fontWeight: 800, color: 'text.secondary', letterSpacing: '0.1em', mb: 3, display: 'block' }}>
                        Roster & Priority Management
                    </Typography>
                    <Grid container spacing={3}>
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <ToolCard
                                to="/auto-roster-2"
                                icon={<GroupIcon fontSize="large" />}
                                title="Auto Roster"
                                description="Fully automated roster creation with gender balancing and priority point ranking."
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <ToolCard
                                to="/new-set-priority"
                                icon={<TrendingUpIcon fontSize="large" />}
                                title="Set Priority for Trip"
                                description="Process commitment form links with automatic backend gender resolution and update trip priorities."
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <ToolCard
                                to="/increase-decrease-priority"
                                icon={<TrendingUpIcon fontSize="large" />}
                                title="Increase/Decrease Priority"
                                description="Manually adjust priority points for individual club members in the database."
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <ToolCard
                                to="/priority"
                                icon={<StarIcon fontSize="large" />}
                                title="Priority Database"
                                description="View and manage the priority standings for all club members."
                            />
                        </Grid>
                    </Grid>
                </Box>

                {/* Communications */}
                <Box>
                    <Typography variant="overline" sx={{ fontWeight: 800, color: 'text.secondary', letterSpacing: '0.1em', mb: 3, display: 'block' }}>
                        Communications
                    </Typography>
                    <Grid container spacing={3}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <ToolCard
                                to="/draft-email"
                                icon={<MailIcon fontSize="large" />}
                                title="Draft Trip Emails"
                                description="Generate trip emails for trip attendance, waitlist, and rejection notifications."
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <ToolCard
                                to="/auto-email"
                                icon={<SendIcon fontSize="large" />}
                                title="Email Slideshow Bot"
                                description="Automate the weekly slideshow email distribution to those that request from binghamtonoutdoorsclub+slides@gmail.com."
                            />
                        </Grid>
                    </Grid>
                </Box>

                {/* System Settings */}
                <Box>
                    <Typography variant="overline" sx={{ fontWeight: 800, color: 'text.secondary', letterSpacing: '0.1em', mb: 3, display: 'block' }}>
                        System Settings
                    </Typography>
                    <Grid container spacing={3}>
                        <Grid size={{ xs: 12, sm: 12 }}>
                            <ToolCard
                                to="/config"
                                icon={<SettingsIcon fontSize="large" />}
                                title="Global Config"
                                description="Set the links for folders, templates, and master sheets."
                            />
                        </Grid>
                    </Grid>
                </Box>

            </Stack>
        </Box>
    );
};

export default DashboardHome;
