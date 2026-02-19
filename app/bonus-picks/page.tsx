'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useSession, signIn } from 'next-auth/react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Container,
  Typography,
  Paper,
  Box,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Button,
  Divider,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
} from '@mui/material';
import MuiAlert, { AlertProps } from '@mui/material/Alert';
import { styled, useTheme } from '@mui/material/styles';
import { KeyboardArrowDown, KeyboardArrowUp } from '@mui/icons-material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ViewListIcon from '@mui/icons-material/ViewList';
import GridOnIcon from '@mui/icons-material/GridOn';
import { SnackbarCloseReason } from '@mui/material';
import LooksTwoIcon from '@mui/icons-material/LooksTwo';
import ShuffleIcon from '@mui/icons-material/Shuffle';

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

// We'll update header cell styling to use the theme.
const StyledHeaderCell = styled(TableCell)(({ theme }) => ({
  backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[900] : '#f5f5f5',
  color: theme.palette.mode === 'dark' ? theme.palette.common.white : theme.palette.text.primary,
}));

interface BonusPicksData {
  // Mapping: player name => { bonus category => pick }
  [player: string]: {
    [category: string]: string;
  };
}

// Transformed type: bonus category => { player => pick }
interface CategoryBonusPicks {
  [category: string]: {
    [player: string]: string;
  };
}

type ViewMode = 'accordion' | 'table';

const AllBonusPicksAllPage = () => {
  const { data: session, status } = useSession();
  const theme = useTheme();
  const [bonusPicks, setBonusPicks] = useState<BonusPicksData>({});
  const [transformedData, setTransformedData] = useState<CategoryBonusPicks>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });
  const [viewMode, setViewMode] = useState<ViewMode>('accordion');

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleSnackbarClose = (event: React.SyntheticEvent | Event, reason: SnackbarCloseReason) => {
    if (reason === 'clickaway') return;
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  // Fetch bonus picks from the API endpoint.
  const fetchBonusPicks = useCallback(async () => {
    setLoading(true);
    try {
      // Call the endpoint without a name parameter so it returns bonus picks for all players.
      const res = await fetch('/api/get-bonus-picks', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok) {
        setBonusPicks(data.bonusPicks);
      } else {
        const errMsg = data.error || 'Failed to fetch bonus picks';
        setError(errMsg);
        showSnackbar(errMsg, 'error');
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errMsg);
      showSnackbar(errMsg, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  // Transform bonusPicks from a player-keyed mapping to a category-keyed mapping,
  // filtering out any key that is "WINNERS".
  const transformData = (data: BonusPicksData) => {
    const categoryMap: CategoryBonusPicks = {};
    Object.entries(data).forEach(([player, picks]) => {
      if (player.trim().toUpperCase() === "WINNERS") return;
      Object.entries(picks).forEach(([category, pick]) => {
        if (!categoryMap[category]) {
          categoryMap[category] = {};
        }
        categoryMap[category][player] = pick;
      });
    });
    setTransformedData(categoryMap);
  };

  // For the table view, prepare an array of player names (excluding "WINNERS").
  const playerList = bonusPicks ? Object.keys(bonusPicks).filter(name => name.trim().toUpperCase() !== "WINNERS") : [];

  useEffect(() => {
    if (session) {
      fetchBonusPicks();
    }
  }, [session, fetchBonusPicks]);

  useEffect(() => {
    if (Object.keys(bonusPicks).length > 0) {
      transformData(bonusPicks);
    }
  }, [bonusPicks]);

  if (status === 'loading') {
    return (
      <Container maxWidth="sm" sx={{ pt: 4 }}>
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (!session) {
    return (
      <Container maxWidth="sm" sx={{ pt: 4 }}>
        <Typography variant="h6" align="center" color="error" gutterBottom>
          Please sign in to view bonus picks.
        </Typography>
        <Box display="flex" justifyContent="center">
          <Button variant="contained" onClick={() => signIn()}>
            Sign In
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth={false} sx={{ pt: 4, pb: 4 }}>
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h4" color="primary">
            Bonus Picks
          </Typography>
          <Box>
            <IconButton
              color={viewMode === 'accordion' ? 'primary' : 'default'}
              onClick={() => setViewMode('accordion')}
            >
              <ViewListIcon />
            </IconButton>
            <IconButton
              color={viewMode === 'table' ? 'primary' : 'default'}
              onClick={() => setViewMode('table')}
            >
              <GridOnIcon />
            </IconButton>
          </Box>
        </Box>
        {loading ? (
          <Box display="flex" justifyContent="center" my={4}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Typography variant="body1" color="error" align="center">
            {error}
          </Typography>
        ) : (
          <>
            {viewMode === 'accordion' && (
              <>
                {Object.entries(transformedData).map(([category, picks]) => (
                  <Box key={category} mb={2}>
                    <Accordion>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="h6">{category}</Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <List>
                          {Object.entries(picks).map(([player, pick]) => (
                            <ListItem key={player} disablePadding>
                              <ListItemText primary={player} secondary={pick || "No pick submitted"} />
                            </ListItem>
                          ))}
                        </List>
                      </AccordionDetails>
                    </Accordion>
                  </Box>
                ))}
              </>
            )}
            {viewMode === 'table' && (
              <Box
                sx={{
                  overflowX: 'auto',
                  width: '100%',
                  mx: 'auto',
                  '& table': { width: '100%', minWidth: { xs: 500, md: 1000 } },
                }}
              >
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell
                        sx={(theme) => ({
                          position: 'sticky',
                          left: 0,
                          backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[900] : '#f5f5f5',
                          color: theme.palette.mode === 'dark' ? theme.palette.common.white : theme.palette.text.primary,
                          zIndex: 1,
                        })}
                      >
                        <strong>Category</strong>
                      </TableCell>
                      {playerList.map((player) => (
                        <TableCell
                          key={player}
                          align="center"
                          sx={(theme) => ({
                            backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[900] : '#f5f5f5',
                            color: theme.palette.mode === 'dark' ? theme.palette.common.white : theme.palette.text.primary,
                          })}
                        >
                          <strong>{player}</strong>
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Object.entries(transformedData).map(([category, picks]) => (
                      <TableRow key={category}>
                        <TableCell
                          sx={(theme) => ({
                            position: 'sticky',
                            left: 0,
                            backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[900] : '#f5f5f5',
                            color: theme.palette.mode === 'dark' ? theme.palette.common.white : theme.palette.text.primary,
                            zIndex: 1,
                          })}
                        >
                          <strong>{category}</strong>
                        </TableCell>
                        {playerList.map((player) => (
                          <TableCell key={player} align="center">
                            {picks[player] || "No pick submitted"}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}
          </>
        )}
      </Paper>
      <Box display="flex" justifyContent="center" mb={2}>
        <Button variant="outlined" onClick={fetchBonusPicks}>
          Refresh
        </Button>
      </Box>
    </Container>
  );
};

export default AllBonusPicksAllPage;