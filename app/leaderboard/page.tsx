'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useSession, signIn } from 'next-auth/react';
import {
  Container,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  IconButton,
  Collapse,
  Snackbar,
  Button,
  Chip,
  Divider,
} from '@mui/material';
import MuiAlert, { AlertProps } from '@mui/material/Alert';
import { styled } from '@mui/system';
import { KeyboardArrowDown, KeyboardArrowUp } from '@mui/icons-material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import LooksTwoIcon from '@mui/icons-material/LooksTwo';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import ShareIcon from '@mui/icons-material/Share';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import html2canvas from 'html2canvas';

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

const StyledTableCell = styled(TableCell)(({ theme }) => ({
  backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[900] : '#f5f5f5',
  color: theme.palette.mode === 'dark' ? theme.palette.common.white : theme.palette.text.primary,
}));

interface Player {
  rank: string;
  previousRank: string;
  name: string;
  groupPoints: number;
  super8Points: number;
  playoffPoints: number;
  bonusPoints: number;
  totalPoints: number;
  penalty: number;
  timestamp: string;
  chipsUsed: string;
}

type StandingsDelta = { [playerName: string]: 'up' | 'down' | 'same' };

const Leaderboard = () => {
  const { data: session, status } = useSession();
  const [players, setPlayers] = useState<Player[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [openRows, setOpenRows] = useState<{ [key: string]: boolean }>({});
  const [deltaMap, setDeltaMap] = useState<StandingsDelta>({});
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const prevPlayersRef = useRef<Player[]>([]);
  const leaderboardRef = useRef<HTMLDivElement>(null);

  const fetchLeaderboardSnapshot = async () => {
    try {
      const response = await fetch('/api/leaderboard-snapshot', { cache: 'no-store' });
      if (response.status === 404) {
        setPlayers([]);
        return;
      }
      const result = await response.json();
      if (response.ok) {
        const newPlayers: Player[] = result.players;
        // Compute delta based on previousRank vs current rank.
        const newDeltaMap: StandingsDelta = {};
        newPlayers.forEach((player) => {
          const prevRank = Number(player.previousRank);
          const currRank = Number(player.rank);
          if (!isNaN(prevRank) && !isNaN(currRank)) {
            if (currRank < prevRank) {
              newDeltaMap[player.name] = 'up';
            } else if (currRank > prevRank) {
              newDeltaMap[player.name] = 'down';
            } else {
              newDeltaMap[player.name] = 'same';
            }
          } else {
            newDeltaMap[player.name] = 'same';
          }
        });
        setDeltaMap(newDeltaMap);
        setPlayers(newPlayers);
        prevPlayersRef.current = newPlayers;
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };

  useEffect(() => {
    if (session) {
      fetchLeaderboardSnapshot();
    }
  }, [session]);

  const handleRowClick = (playerName: string) => {
    setOpenRows((prev) => ({ ...prev, [playerName]: !prev[playerName] }));
  };

  const handleSnackbarClose = (event: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') return;
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  // Helper: Clone the leaderboard element and remove unwanted styles
  const captureLeaderboardImage = async (): Promise<HTMLCanvasElement | null> => {
    if (!leaderboardRef.current) return null;
    const originalNode = leaderboardRef.current;
    const clonedNode = originalNode.cloneNode(true) as HTMLElement;
    const allElements = clonedNode.querySelectorAll('*');
    allElements.forEach((el) => {
      (el as HTMLElement).style.boxShadow = 'none';
      (el as HTMLElement).style.background = '#fff';
    });
    clonedNode.style.boxShadow = 'none';
    clonedNode.style.background = '#fff';
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.top = '-9999px';
    tempContainer.style.left = '-9999px';
    tempContainer.appendChild(clonedNode);
    document.body.appendChild(tempContainer);
    try {
      const canvas = await html2canvas(clonedNode, { backgroundColor: '#fff' });
      return canvas;
    } catch (error) {
      throw error;
    } finally {
      document.body.removeChild(tempContainer);
    }
  };

  const handleCopyImage = async () => {
    try {
      const canvas = await captureLeaderboardImage();
      if (!canvas) return;
      canvas.toBlob(async (blob) => {
        if (blob) {
          try {
            await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
            setSnackbar({ open: true, message: 'Image copied to clipboard', severity: 'success' });
          } catch (err) {
            setSnackbar({ open: true, message: 'Failed to copy image', severity: 'error' });
          }
        }
      });
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to capture image', severity: 'error' });
    }
  };

  const handleShareImage = async () => {
    try {
      const canvas = await captureLeaderboardImage();
      if (!canvas) return;
      canvas.toBlob(async (blob) => {
        if (blob) {
          const file = new File([blob], 'leaderboard.png', { type: blob.type });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
              await navigator.share({
                files: [file],
                title: 'Leaderboard',
                text: 'Check out this leaderboard!',
              });
              setSnackbar({ open: true, message: 'Image shared successfully', severity: 'success' });
            } catch (err) {
              setSnackbar({ open: true, message: 'Failed to share image', severity: 'error' });
            }
          } else {
            setSnackbar({ open: true, message: 'Sharing image not supported on this device. Try copying the image instead.', severity: 'error' });
          }
        }
      });
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to capture image', severity: 'error' });
    }
  };

  if (status === 'loading') {
    return (
      <Container maxWidth="sm" sx={{ pt: 4 }}>
        <Box display="flex" justifyContent="center" my={4}>
          <Typography align="center" color="primary">Loading...</Typography>
        </Box>
      </Container>
    );
  }

  if (!session) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100vh">
        <Typography align="center" color="error" gutterBottom>
          Please sign in to view the leaderboard.
        </Typography>
        <Button variant="contained" color="primary" onClick={() => signIn()}>
          Sign In
        </Button>
      </Box>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ pt: 4, pb: 4 }}>
      <Box my={4}>
        <Typography variant="h4" align="center" gutterBottom>
          Leaderboard
        </Typography>
        {players.length === 0 ? (
          <Typography align="center" color="primary">
            No leaderboard data available.
          </Typography>
        ) : (
          <>
            {/* Share and copy buttons */}
            <Box display="flex" justifyContent="center" gap={2} mb={2}>
              <IconButton onClick={handleShareImage} color="primary">
                <ShareIcon />
              </IconButton>
              <IconButton onClick={handleCopyImage} color="primary">
                <ContentCopyIcon />
              </IconButton>
            </Box>
            {/* Leaderboard Table wrapped with a ref */}
            <Box ref={leaderboardRef}>
              <TableContainer component={Paper} elevation={3}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <StyledTableCell />
                      <StyledTableCell>
                        <Typography variant="h6">Rank</Typography>
                      </StyledTableCell>
                      <StyledTableCell>
                        <Typography variant="h6">Player</Typography>
                      </StyledTableCell>
                      <StyledTableCell>
                        <Typography variant="h6">Bonus Points</Typography>
                      </StyledTableCell>
                      <StyledTableCell>
                        <Typography variant="h6">Total Points</Typography>
                      </StyledTableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {players.map((player) => (
                      <React.Fragment key={player.name}>
                        <TableRow onClick={() => handleRowClick(player.name)}>
                          <TableCell>
                            <IconButton size="small">
                              {openRows[player.name] ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                            </IconButton>
                          </TableCell>
                          <TableCell>
                            {player.rank}
                            {deltaMap[player.name] === 'up' && (
                              <ArrowUpwardIcon style={{ color: 'green', verticalAlign: 'middle', marginLeft: 4 }} fontSize="small" />
                            )}
                            {deltaMap[player.name] === 'down' && (
                              <ArrowDownwardIcon style={{ color: 'red', verticalAlign: 'middle', marginLeft: 4 }} fontSize="small" />
                            )}
                          </TableCell>
                          <TableCell>{player.name}</TableCell>
                          <TableCell>{player.bonusPoints}</TableCell>
                          <TableCell>{player.totalPoints}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell colSpan={5} style={{ paddingBottom: 0, paddingTop: 0 }}>
                            <Collapse in={openRows[player.name]} timeout="auto" unmountOnExit>
                              <Box margin={1}>
                                <Typography variant="h6" gutterBottom>
                                  Points Breakdown
                                </Typography>
                                <Box sx={{ borderTop: '1px solid #ccc', mt: 1 }}>
                                  <Typography variant="body2" sx={{ pt: 1 }}>
                                    Groups: {player.groupPoints}
                                  </Typography>
                                  <Divider sx={{ my: 1 }} />
                                  <Typography variant="body2">
                                    Super 8: {player.super8Points}
                                  </Typography>
                                  <Divider sx={{ my: 1 }} />
                                  <Typography variant="body2">
                                    Semi/Finals: {player.playoffPoints}
                                  </Typography>
                                  <Divider sx={{ my: 1 }} />
                                  <Typography variant="body2">
                                    Bonuses: {player.bonusPoints}
                                  </Typography>
                                  <Divider sx={{ my: 1 }} />
                                  <Typography variant="body2" sx={{ pb: 1 }}>
                                    Time: {player.timestamp}
                                  </Typography>
                                  <Divider sx={{ my: 1 }} />
                                  <Typography variant="body2" sx={{ pb: 0.5 }}>
                                    Penalty: {player.penalty}
                                  </Typography>
                                  <Divider sx={{ my: 1 }} />
                                  <Typography variant="body2" sx={{ pb: 0.5 }}>
                                    Chips Used:
                                  </Typography>
                                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                    {player.chipsUsed &&
                                      player.chipsUsed.trim() !== '' &&
                                      player.chipsUsed.split(',').map((chip) => {
                                        const trimmed = chip.trim();
                                        const lower = trimmed.toLowerCase();
                                        if (lower === 'double up') {
                                          return (
                                            <Chip
                                              key={trimmed}
                                              icon={<LooksTwoIcon />}
                                              label=""
                                              size="small"
                                              color="primary"
                                            />
                                          );
                                        } else if (lower === 'wildcard') {
                                          return (
                                            <Chip
                                              key={trimmed}
                                              icon={<ShuffleIcon />}
                                              label=""
                                              size="small"
                                              color="primary"
                                            />
                                          );
                                        } else {
                                          return (
                                            <Chip
                                              key={trimmed}
                                              label={trimmed}
                                              size="small"
                                              color="primary"
                                            />
                                          );
                                        }
                                      })}
                                  </Box>
                                </Box>
                              </Box>
                            </Collapse>
                          </TableCell>
                        </TableRow>
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </>
        )}
      </Box>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Leaderboard;