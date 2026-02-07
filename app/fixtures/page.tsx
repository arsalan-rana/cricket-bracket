'use client';

import { useSession, signIn } from 'next-auth/react';
import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Button,
  Box,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Skeleton,
  Alert,
  Grid,
  Chip,
  Snackbar,
  Select,
  MenuItem,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { styled } from '@mui/material/styles';
import { DateTime } from 'luxon';
import { SelectChangeEvent } from '@mui/material';

// Import tournament configuration utilities
import { teamColors, teamFlags, getAllDeadlines, getNow, getConfig, getPhaseForMatch } from '@/lib/useTournament';

// Admin email from environment (public for client-side)
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

// A larger, styled Chip that includes flags
const BigChip = styled(Chip)(({ theme }) => ({
  fontSize: '1.1rem',
  padding: '10px 16px',
  height: 'auto',
  fontWeight: 600,
  borderRadius: '12px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  transition: 'all 0.2s ease-in-out',
  minWidth: '120px',
  width: 'auto',
  maxWidth: '100%',
  boxSizing: 'border-box',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  '&:hover': {
    transform: { xs: 'none', sm: 'translateY(-1px)' },
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  },
  [theme.breakpoints.down('sm')]: {
    fontSize: '0.85rem',
    padding: '6px 8px',
    minWidth: 'auto',
    width: '100%',
    maxWidth: 'calc(100vw - 32px)',
    margin: '1px 0',
    borderRadius: '8px',
  },
}));

type SnackbarState = {
  open: boolean;
  message: string;
  severity: 'success' | 'error';
};

interface Fixture {
  date: string;
  match: string;
  team1: string;
  team2: string;
  winner: string;
  picks: { [key: string]: string };
  rowIndex?: number;
};

/**
 * AdminFixtureUpdate
 *
 * This component allows the admin to update the fixture result.
 */
const AdminFixtureUpdate = ({
  fixture,
  setSnackbar,
  onUpdate,
}: {
  fixture: Fixture;
  setSnackbar: React.Dispatch<React.SetStateAction<SnackbarState>>;
  onUpdate?: () => void;
}) => {
  const [newWinner, setNewWinner] = useState<string>(fixture.winner);
  const [updating, setUpdating] = useState<boolean>(false);

  const handleChange = (event: SelectChangeEvent<string>) => {
    setNewWinner(event.target.value);
  };

  const handleUpdate = async () => {
    if (newWinner !== fixture.team1 && newWinner !== fixture.team2 && newWinner !== 'DRAW') {
      setSnackbar({ open: true, message: 'Please select a valid team or "DRAW"', severity: 'error' });
      return;
    }
    setUpdating(true);
    try {
      const response = await fetch('/api/update-fixture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: fixture.date,
          match: fixture.match,
          newWinner,
        }),
      });
      const result = await response.json();
      if (response.ok) {
        const lbResponse = await fetch('/api/refresh-leaderboard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        const lbResult = await lbResponse.json();
        if (lbResponse.ok) {
          setSnackbar({ open: true, message: 'Fixture and leaderboard updated successfully!', severity: 'success' });
          // Refresh the fixtures data to show the winner indicator
          if (onUpdate) {
            onUpdate();
          }
        } else {
          setSnackbar({ open: true, message: lbResult.error || 'Fixture updated but leaderboard refresh failed', severity: 'error' });
        }
      } else {
        setSnackbar({ open: true, message: result.error || 'Fixture update failed', severity: 'error' });
      }
    } catch (err) {
      setSnackbar({ open: true, message: 'An error occurred while updating', severity: 'error' });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Box sx={{ mt: 2, pt: 1, borderTop: '1px solid #ccc' }}>
      <Typography variant="subtitle2">Admin: Update Fixture Result</Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
        <Select value={newWinner} onChange={handleChange} size="small" sx={{ minWidth: 120 }}>
          <MenuItem value={fixture.team1}>{fixture.team1}</MenuItem>
          <MenuItem value={fixture.team2}>{fixture.team2}</MenuItem>
          <MenuItem value="DRAW">DRAW</MenuItem>
        </Select>
        <Button variant="contained" color="primary" onClick={handleUpdate} disabled={updating}>
          {updating ? 'Updating...' : 'Update Fixture'}
        </Button>
      </Box>
    </Box>
  );
};

// Styled Accordion for fixture cards
const StyledAccordion = styled(Accordion)(({ theme }) => ({
  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
  borderRadius: '16px',
  marginBottom: theme.spacing(2),
  border: '1px solid rgba(0,0,0,0.06)',
  overflow: 'visible', // Changed to visible to show winner badge
  transition: 'all 0.3s ease-in-out',
  width: '100%',
  maxWidth: '100%',
  '&:before': { display: 'none' },
  '&:hover': {
    boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
    transform: { xs: 'none', sm: 'translateY(-2px)' },
  },
  '& .MuiAccordionSummary-root': {
    padding: theme.spacing(1.5, 1),
    background: theme.palette.mode === 'dark' 
      ? 'linear-gradient(135deg, #2A2A2A 0%, #3A3A3A 100%)'
      : 'linear-gradient(135deg, #FAFAFA 0%, #F5F5F5 100%)',
    borderRadius: '16px 16px 0 0',
    [theme.breakpoints.up('sm')]: {
      padding: theme.spacing(2, 3),
    },
  },
  '& .MuiAccordionDetails-root': {
    padding: theme.spacing(1.5, 1, 2, 1),
    background: theme.palette.background.paper,
    [theme.breakpoints.up('sm')]: {
      padding: theme.spacing(2, 3, 3, 3),
    },
  },
  [theme.breakpoints.down('sm')]: {
    marginLeft: theme.spacing(0.5),
    marginRight: theme.spacing(0.5),
    width: 'calc(100vw - 16px)',
    maxWidth: 'calc(100vw - 16px)',
  },
}));

// Accordion component for each fixture
const FixtureAccordion = ({
  fixture,
  session,
  setSnackbar,
  onUpdate,
}: {
  fixture: Fixture;
  session: any;
  setSnackbar: React.Dispatch<React.SetStateAction<SnackbarState>>;
  onUpdate?: () => void;
}) => {
  const team1Picks = Object.entries(fixture.picks)
    .filter(([_, pick]) => pick === fixture.team1)
    .map(([player]) => player);
  const team2Picks = Object.entries(fixture.picks)
    .filter(([_, pick]) => pick === fixture.team2)
    .map(([player]) => player);

  const matchNum = parseInt(fixture.match);
  const phaseInfo = getPhaseForMatch(matchNum);
  const matchType = phaseInfo ? {
    label: phaseInfo.name,
    color: phaseInfo.color
  } : {
    label: 'Match',
    color: '#1B5E20'
  };

  return (
    <StyledAccordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box sx={{ width: '100%', textAlign: 'center' }}>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: { xs: 'flex-start', sm: 'center' }, 
            mb: 1,
            flexDirection: { xs: 'column', sm: 'row' },
            gap: { xs: 1, sm: 0 }
          }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, flex: 1 }}>
              {fixture.date} – Match {fixture.match}
            </Typography>
            <Chip 
              label={matchType.label}
              size="small"
              sx={{ 
                backgroundColor: matchType.color,
                color: 'white',
                fontWeight: 600,
                fontSize: '0.75rem'
              }}
            />
          </Box>
          <Box sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: { xs: 0.3, sm: 2 },
            justifyContent: { xs: 'stretch', sm: 'center' },
            alignItems: { xs: 'stretch', sm: 'center' },
            mt: { xs: 1, sm: 2 },
            pt: { xs: 1.5, sm: 2 }, // Add top padding for winner badge
            px: { xs: 0, sm: 0 },
            width: '100%',
            maxWidth: '100%',
            overflow: 'visible', // Changed from 'hidden' to 'visible' to show badge
            position: 'relative',
          }}>
            <Box sx={{ position: 'relative', width: { xs: '100%', sm: 'auto' } }}>
              <BigChip
                label={`${teamFlags[fixture.team1] || ''} ${fixture.team1}`}
                sx={{
                  backgroundColor: teamColors[fixture.team1]?.primary || '#E0E0E0',
                  color: teamColors[fixture.team1]?.secondary || '#000000',
                  border: `2px solid ${teamColors[fixture.team1]?.secondary || '#E0E0E0'}`,
                }}
              />
              {fixture.winner && fixture.winner.trim() !== '' && fixture.team1 === fixture.winner && (
                <Chip
                  label="WINNER"
                  size="small"
                  sx={{
                    position: 'absolute',
                    top: { xs: -8, sm: -10 },
                    right: { xs: -8, sm: -10 },
                    backgroundColor: '#FFD700',
                    color: '#000',
                    fontWeight: 800,
                    fontSize: { xs: '0.6rem', sm: '0.65rem' },
                    height: { xs: 20, sm: 24 },
                    boxShadow: '0 2px 8px rgba(255, 215, 0, 0.6)',
                    border: '2px solid #FFA500',
                    zIndex: 10,
                    '& .MuiChip-label': {
                      px: { xs: 0.5, sm: 1 },
                    }
                  }}
                />
              )}
            </Box>
            <Typography
              variant="body2"
              sx={{
                alignSelf: 'center',
                mx: { xs: 0, sm: 1 },
                my: { xs: 0.2, sm: 0 },
                fontWeight: 'bold',
                color: 'text.secondary',
                fontSize: { xs: '0.75rem', sm: '1.2rem' },
                textAlign: 'center',
                minHeight: { xs: 'auto', sm: 'auto' }
              }}
            >
              vs
            </Typography>
            <Box sx={{ position: 'relative', width: { xs: '100%', sm: 'auto' } }}>
              <BigChip
                label={`${teamFlags[fixture.team2] || ''} ${fixture.team2}`}
                sx={{
                  backgroundColor: teamColors[fixture.team2]?.primary || '#E0E0E0',
                  color: teamColors[fixture.team2]?.secondary || '#000000',
                  border: `2px solid ${teamColors[fixture.team2]?.secondary || '#E0E0E0'}`,
                }}
              />
              {fixture.winner && fixture.winner.trim() !== '' && fixture.team2 === fixture.winner && (
                <Chip
                  label="WINNER"
                  size="small"
                  sx={{
                    position: 'absolute',
                    top: { xs: -8, sm: -10 },
                    right: { xs: -8, sm: -10 },
                    backgroundColor: '#FFD700',
                    color: '#000',
                    fontWeight: 800,
                    fontSize: { xs: '0.6rem', sm: '0.65rem' },
                    height: { xs: 20, sm: 24 },
                    boxShadow: '0 2px 8px rgba(255, 215, 0, 0.6)',
                    border: '2px solid #FFA500',
                    zIndex: 10,
                    '& .MuiChip-label': {
                      px: { xs: 0.5, sm: 1 },
                    }
                  }}
                />
              )}
            </Box>

            {/* Draw indicator - positioned absolutely in center */}
            {fixture.winner && fixture.winner.trim() !== '' && fixture.winner === 'DRAW' && (
              <Box sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 100,
              }}>
                <Chip
                  label="DRAW"
                  sx={{
                    backgroundColor: '#ED6C02',
                    color: 'white',
                    fontWeight: 800,
                    fontSize: { xs: '0.7rem', sm: '0.85rem' },
                    height: { xs: 24, sm: 28 },
                    boxShadow: '0 4px 12px rgba(237, 108, 2, 0.6)',
                    border: '2px solid #F57C00',
                    '& .MuiChip-label': {
                      px: { xs: 1, sm: 1.5 },
                    }
                  }}
                />
              </Box>
            )}
          </Box>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              {`${teamFlags[fixture.team1] || ''} ${fixture.team1}`} Picks:
            </Typography>
            {team1Picks.length > 0 ? (
              team1Picks.map((player) => (
                <Typography key={player} variant="body2">
                  {player}
                </Typography>
              ))
            ) : (
              <Typography variant="body2" color="textSecondary">
                No picks yet.
              </Typography>
            )}
          </Grid>
          <Grid item xs={6}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              {`${teamFlags[fixture.team2] || ''} ${fixture.team2}`} Picks:
            </Typography>
            {team2Picks.length > 0 ? (
              team2Picks.map((player) => (
                <Typography key={player} variant="body2">
                  {player}
                </Typography>
              ))
            ) : (
              <Typography variant="body2" color="textSecondary">
                No picks yet.
              </Typography>
            )}
          </Grid>
        </Grid>
        {ADMIN_EMAIL && session.user?.email === ADMIN_EMAIL && (
          <AdminFixtureUpdate fixture={fixture} setSnackbar={setSnackbar} onUpdate={onUpdate} />
        )}
      </AccordionDetails>
    </StyledAccordion>
  );
};

// Generic function to transform sheet data into Fixture objects.
const transformData = (data: any[][] | undefined): Fixture[] => {
  if (!data || data.length === 0) return [];
  const header = data[0];
  const fixtures: Fixture[] = [];
  const dateIndex = header.indexOf('Date');
  const matchIndex = header.indexOf('Match');
  const team1Index = header.indexOf('Team 1');
  const team2Index = header.indexOf('Team 2');
  const winnerIndex = header.indexOf('Winner');
  if ([dateIndex, matchIndex, team1Index, team2Index, winnerIndex].includes(-1)) {
    throw new Error('Required columns not found');
  }
  let lastCompletedFixtureIndex = -1;
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[dateIndex] === 'Date' && row[matchIndex] === 'Match') continue;
    if (row[winnerIndex] && row[winnerIndex].trim() !== '') lastCompletedFixtureIndex = i;
    const fixture: Fixture = {
      date: row[dateIndex],
      match: row[matchIndex],
      team1: row[team1Index],
      team2: row[team2Index],
      winner: row[winnerIndex],
      picks: {},
      rowIndex: i,
    };
    for (let j = 0; j < header.length; j++) {
      const columnName = header[j];
      if (![header[dateIndex], header[matchIndex], header[team1Index], header[team2Index], 'Winner', 'POTM'].includes(columnName)) {
        fixture.picks[columnName] = row[j];
      }
    }
    fixtures.push(fixture);
  }
  let fixturesToShow =
    lastCompletedFixtureIndex + 1 < fixtures.length ? lastCompletedFixtureIndex + 1 : fixtures.length;
  if (fixturesToShow === 0) {
    fixturesToShow = lastCompletedFixtureIndex + 2 < fixtures.length ? lastCompletedFixtureIndex + 2 : fixtures.length;
  }
  return fixtures.slice(0, fixturesToShow).reverse();
};

// Function for fixtures page - shows ALL completed fixtures + next upcoming one
const transformDataForFixtures = (data: any[][] | undefined): Fixture[] => {
  if (!data || data.length === 0) return [];
  const header = data[0];
  const fixtures: Fixture[] = [];
  const dateIndex = header.indexOf('Date');
  const matchIndex = header.indexOf('Match');
  const team1Index = header.indexOf('Team 1');
  const team2Index = header.indexOf('Team 2');
  const winnerIndex = header.indexOf('Winner');
  if ([dateIndex, matchIndex, team1Index, winnerIndex].includes(-1)) {
    throw new Error('Required columns not found');
  }

  let lastCompletedFixtureIndex = -1;
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[dateIndex] === 'Date' && row[matchIndex] === 'Match') continue;
    if (row[winnerIndex] && row[winnerIndex].trim() !== '') lastCompletedFixtureIndex = i;
    const fixture: Fixture = {
      date: row[dateIndex],
      match: row[matchIndex],
      team1: row[team1Index],
      team2: row[team2Index],
      winner: row[winnerIndex],
      picks: {},
      rowIndex: i,
    };
    for (let j = 0; j < header.length; j++) {
      const columnName = header[j];
      if (![header[dateIndex], header[matchIndex], header[team1Index], header[team2Index], 'Winner', 'POTM'].includes(columnName)) {
        fixture.picks[columnName] = row[j];
      }
    }
    fixtures.push(fixture);
  }

  // For fixtures page: show ALL completed + ONLY the next upcoming (if any)
  if (lastCompletedFixtureIndex === -1) {
    // No completed fixtures, show only the first upcoming
    return fixtures.length > 0 ? [fixtures[0]] : [];
  }

  // Get only the actually completed fixtures (those with winners)
  const completedFixtures = fixtures.filter(f => f.winner && f.winner.trim() !== '');

  // Find the first upcoming fixture (no winner)
  const nextUpcoming = fixtures.find(f => !f.winner || f.winner.trim() === '');

  if (nextUpcoming) {
    return [...completedFixtures, nextUpcoming].reverse();
  }
  return completedFixtures.reverse();
};

// Function for GROUP STAGE fixtures page - shows ALL completed + ALL next day's matches
const transformDataForFixturesGroupStage = (data: any[][] | undefined): Fixture[] => {
  if (!data || data.length === 0) return [];
  const header = data[0];
  const fixtures: Fixture[] = [];
  const dateIndex = header.indexOf('Date');
  const matchIndex = header.indexOf('Match');
  const team1Index = header.indexOf('Team 1');
  const team2Index = header.indexOf('Team 2');
  const winnerIndex = header.indexOf('Winner');
  if ([dateIndex, matchIndex, team1Index, team2Index, winnerIndex].includes(-1)) {
    throw new Error('Required columns not found');
  }

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[dateIndex] === 'Date' && row[matchIndex] === 'Match') continue;
    const fixture: Fixture = {
      date: row[dateIndex],
      match: row[matchIndex],
      team1: row[team1Index],
      team2: row[team2Index],
      winner: row[winnerIndex],
      picks: {},
      rowIndex: i,
    };
    for (let j = 0; j < header.length; j++) {
      const columnName = header[j];
      if (![header[dateIndex], header[matchIndex], header[team1Index], header[team2Index], 'Winner', 'POTM'].includes(columnName)) {
        fixture.picks[columnName] = row[j];
      }
    }
    fixtures.push(fixture);
  }

  // Get completed fixtures (those with winners)
  const completedFixtures = fixtures.filter(f => f.winner && f.winner.trim() !== '');

  // Get upcoming fixtures (no winner)
  const upcomingFixtures = fixtures.filter(f => !f.winner || f.winner.trim() === '');

  if (upcomingFixtures.length === 0) {
    // All fixtures completed
    return completedFixtures.reverse();
  }

  // Find the first upcoming match's date
  const firstUpcomingDate = upcomingFixtures[0].date;

  // Parse the date (format: "7 February" or similar)
  const parseFixtureDate = (dateStr: string): DateTime | null => {
    try {
      // Try to parse "7 February" format
      const parts = dateStr.trim().split(' ');
      if (parts.length >= 2) {
        const day = parseInt(parts[0], 10);
        const month = parts[1];
        // Assume year 2026 for T20 WC
        const dateString = `${day} ${month} 2026`;
        return DateTime.fromFormat(dateString, 'd MMMM yyyy', { zone: 'America/New_York' });
      }
    } catch (e) {
      console.error('Error parsing date:', dateStr, e);
    }
    return null;
  };

  const firstUpcomingDateTime = parseFixtureDate(firstUpcomingDate);

  if (!firstUpcomingDateTime || !firstUpcomingDateTime.isValid) {
    // Fallback to showing just the first upcoming match if date parsing fails
    return [...completedFixtures, upcomingFixtures[0]].reverse();
  }

  // Get all matches for the next day (same date as first upcoming match)
  const nextDayMatches = upcomingFixtures.filter(f => {
    const fixtureDateTime = parseFixtureDate(f.date);
    if (!fixtureDateTime || !fixtureDateTime.isValid) return false;
    // Check if it's the same day
    return fixtureDateTime.hasSame(firstUpcomingDateTime, 'day');
  });

  // Return completed fixtures + all next day matches, reversed
  return [...completedFixtures, ...nextDayMatches].reverse();
};

const Fixtures = () => {
  const { data: session, status } = useSession();
  const config = getConfig();
  const [groupStageFixtures, setGroupStageFixtures] = useState<Fixture[]>([]);
  const [super4Fixtures, setSuper4Fixtures] = useState<Fixture[]>([]);
  const [finalsFixtures, setFinalsFixtures] = useState<Fixture[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<SnackbarState>({ open: false, message: '', severity: 'success' });

  // Get phase names from config
  const groupStagePhase = config.phases.find((p) => p.id === 'group-stage');
  const super4Phase = config.phases.find((p) => p.id === 'super4');
  const finalsPhase = config.phases.find((p) => p.id === 'finals');

  const fetchData = async () => {
    try {
      const response = await fetch('/api/sheets', { cache: 'no-store' });
      const result = await response.json();
      if (response.ok) {
        // Use new transform function for group stage (shows all next day matches)
        setGroupStageFixtures(transformDataForFixturesGroupStage(result.groupStage));
        // Use original transform for Super 8 and Finals (shows only next match)
        setSuper4Fixtures(transformDataForFixtures(result.super4));
        setFinalsFixtures(transformDataForFixtures(result.finals));
      } else {
        setError(result.error || 'An error occurred while fetching data');
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
    }
  };

  useEffect(() => {
    if (session) {
      fetchData();
    }
  }, [session]);

  if (status === 'loading') {
    return (
      <Container sx={{ py: 4, textAlign: 'center' }}>
        <Skeleton variant="rectangular" height={150} sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" height={150} sx={{ mb: 2 }} />
      </Container>
    );
  }

  if (!session) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100vh">
        <Typography align="center" color="error" gutterBottom>
          Please sign in to view the fixtures.
        </Typography>
        <Button variant="contained" color="primary" onClick={() => signIn()}>
          Sign In
        </Button>
      </Box>
    );
  }

  if (error) {
    return (
      <Container sx={{ py: 4 }}>
        <Alert severity="error">Error: {error}</Alert>
      </Container>
    );
  }

  // Determine current time and phase start times from config
  const nowEastern = getNow();
  const deadlines = getAllDeadlines();
  const super4Start = deadlines.super4;
  const finalsStart = deadlines.finals;
  const showSuper4 = nowEastern >= super4Start;
  const showFinals = nowEastern >= finalsStart;

  return (
    <Container 
      maxWidth="lg" 
      disableGutters
      sx={{ 
        py: { xs: 2, sm: 4 }, 
        px: { xs: 0.5, sm: 3 },
        width: '100%',
        maxWidth: { xs: '100vw', sm: '900px' },
        overflow: 'hidden'
      }}
    >
      <Typography variant="h4" align="center" gutterBottom>
        Fixtures
      </Typography>

      {/* Finals Section - only show if finals fixture exists and both teams are set */}
      {showFinals && finalsFixtures.length > 0 && finalsFixtures[0].team1 && finalsFixtures[0].team2 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom>
            {finalsPhase?.name || 'Finals'}
          </Typography>
          {finalsFixtures.map((fixture, index) => (
            <FixtureAccordion key={`finals-${index}`} fixture={fixture} session={session} setSnackbar={setSnackbar} onUpdate={fetchData} />
          ))}
        </Box>
      )}

      {/* Super 4 Section - only show if the current time is past the Super 4 start time */}
      {showSuper4 && super4Fixtures.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom>
            {super4Phase?.name || 'Super 4'}
          </Typography>
          {super4Fixtures.map((fixture, index) => (
            <FixtureAccordion key={`super4-${index}`} fixture={fixture} session={session} setSnackbar={setSnackbar} onUpdate={fetchData} />
          ))}
        </Box>
      )}

      {/* Group Stage Section */}
      {groupStageFixtures.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom>
            {groupStagePhase?.name || 'Group Stage'}
          </Typography>
          {groupStageFixtures.map((fixture, index) => (
            <FixtureAccordion key={`group-${index}`} fixture={fixture} session={session} setSnackbar={setSnackbar} onUpdate={fetchData} />
          ))}
        </Box>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={(event, reason) => {
          if (reason !== 'clickaway') {
            setSnackbar({ ...snackbar, open: false });
          }
        }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={(event: React.SyntheticEvent, reason?: string) => {
            if (reason !== 'clickaway') {
              setSnackbar({ ...snackbar, open: false });
            }
          }}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Fixtures;