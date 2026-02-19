'use client';

import React, { useEffect, useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import {
  Container,
  Typography,
  Paper,
  Box,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Snackbar,
  Chip,
} from '@mui/material';
import { DateTime } from 'luxon';
import { getConfig } from '@/lib/useTournament';
import MuiAlert, { AlertProps } from '@mui/material/Alert';

const SnackbarAlert = React.forwardRef<HTMLDivElement, AlertProps>(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

const BonusMakeupPage = () => {
  const { data: session, status } = useSession();
  const config = getConfig();

  const [topScorer, setTopScorer] = useState('');
  const [topWicketTaker, setTopWicketTaker] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingPicks, setFetchingPicks] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const [timeRemaining, setTimeRemaining] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);

  const [isPastDeadline, setIsPastDeadline] = useState(false);

  // Calculate time remaining
  useEffect(() => {
    if (!config.bonusMakeupDeadline) return;

    const updateCountdown = () => {
      const deadline = DateTime.fromISO(config.bonusMakeupDeadline!, { zone: config.timezone });
      const now = DateTime.now().setZone(config.timezone);

      if (now > deadline) {
        setIsPastDeadline(true);
        return;
      }

      const diff = deadline.diff(now, ['days', 'hours', 'minutes', 'seconds']);
      setTimeRemaining({
        days: Math.floor(diff.days),
        hours: Math.floor(diff.hours),
        minutes: Math.floor(diff.minutes),
        seconds: Math.floor(diff.seconds),
      });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [config.bonusMakeupDeadline, config.timezone]);

  // Fetch existing picks
  useEffect(() => {
    const fetchPicks = async () => {
      if (!session?.user?.name) return;

      setFetchingPicks(true);
      try {
        const response = await fetch(`/api/get-bonus-makeup?name=${encodeURIComponent(session.user.name)}`);
        const data = await response.json();

        if (response.ok) {
          setTopScorer(data.picks.topScorer || '');
          setTopWicketTaker(data.picks.topWicketTaker || '');

          // Check if already submitted
          if (data.picks.topScorer && data.picks.topWicketTaker) {
            setSubmitted(true);
          }
        }
      } catch (error) {
        console.error('Error fetching picks:', error);
      } finally {
        setFetchingPicks(false);
      }
    };

    fetchPicks();
  }, [session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!session?.user?.name) {
      setSnackbar({
        open: true,
        message: 'Please sign in to submit',
        severity: 'error',
      });
      return;
    }

    if (!topScorer.trim() || !topWicketTaker.trim()) {
      setSnackbar({
        open: true,
        message: 'Please fill in both fields',
        severity: 'warning',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/submit-bonus-makeup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: session.user.name,
          topScorer: topScorer.trim(),
          topWicketTaker: topWicketTaker.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSnackbar({
          open: true,
          message: 'Bonus picks submitted successfully!',
          severity: 'success',
        });
        setSubmitted(true);
      } else {
        setSnackbar({
          open: true,
          message: data.error || 'Failed to submit',
          severity: 'error',
        });
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'An error occurred while submitting',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSnackbarClose = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  if (status === 'loading' || fetchingPicks) {
    return (
      <Container maxWidth="md" sx={{ pt: 4 }}>
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (!session) {
    return (
      <Container maxWidth="md" sx={{ pt: 4 }}>
        <Typography variant="h6" align="center" color="error" gutterBottom>
          Please sign in to submit bonus picks.
        </Typography>
        <Box display="flex" justifyContent="center">
          <Button variant="contained" onClick={() => signIn()}>
            Sign In
          </Button>
        </Box>
      </Container>
    );
  }

  if (!config.bonusMakeupDeadline) {
    return (
      <Container maxWidth="md" sx={{ pt: 4 }}>
        <Alert severity="info">
          Bonus makeup submissions are not currently available.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ pt: 4, pb: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
          Bonus Picks Makeup Submission
        </Typography>

        <Alert severity="info" sx={{ mb: 3 }}>
          Due to a technical issue, the original bonus submission didn&apos;t capture picks for &quot;Top Scorer&quot; and &quot;Top Wicket-taker&quot;.
          Since everyone has seen the matches equally, you can now submit these two bonus picks.
        </Alert>

        {isPastDeadline ? (
          <Alert severity="error" sx={{ mb: 3 }}>
            The deadline for makeup bonus submissions has passed.
          </Alert>
        ) : timeRemaining && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Time Remaining:
            </Typography>
            <Box display="flex" gap={1} flexWrap="wrap">
              <Chip
                label={`${timeRemaining.days} Days`}
                color="primary"
                sx={{ fontSize: '1rem', fontWeight: 'bold' }}
              />
              <Chip
                label={`${timeRemaining.hours} Hours`}
                color="primary"
                sx={{ fontSize: '1rem', fontWeight: 'bold' }}
              />
              <Chip
                label={`${timeRemaining.minutes} Min`}
                color="primary"
                sx={{ fontSize: '1rem', fontWeight: 'bold' }}
              />
              <Chip
                label={`${timeRemaining.seconds} Sec`}
                color="primary"
                sx={{ fontSize: '1rem', fontWeight: 'bold' }}
              />
            </Box>
          </Box>
        )}

        {submitted && (
          <Alert severity="success" sx={{ mb: 3 }}>
            You have already submitted your bonus picks. You can update them below before the deadline.
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} noValidate>
          <TextField
            fullWidth
            label="Tournament's Top Scorer"
            value={topScorer}
            onChange={(e) => setTopScorer(e.target.value)}
            disabled={loading || isPastDeadline}
            sx={{ mb: 3 }}
            helperText="Enter the player name and team (e.g., Virat Kohli (India))"
            required
          />

          <TextField
            fullWidth
            label="Tournament's Top Wicket-taker"
            value={topWicketTaker}
            onChange={(e) => setTopWicketTaker(e.target.value)}
            disabled={loading || isPastDeadline}
            sx={{ mb: 3 }}
            helperText="Enter the player name and team (e.g., Rashid Khan (Afghanistan))"
            required
          />

          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            size="large"
            disabled={loading || isPastDeadline}
            sx={{ mt: 2 }}
          >
            {loading ? <CircularProgress size={24} /> : submitted ? 'Update Picks' : 'Submit Picks'}
          </Button>
        </Box>
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <SnackbarAlert onClose={handleSnackbarClose} severity={snackbar.severity}>
          {snackbar.message}
        </SnackbarAlert>
      </Snackbar>
    </Container>
  );
};

export default BonusMakeupPage;
