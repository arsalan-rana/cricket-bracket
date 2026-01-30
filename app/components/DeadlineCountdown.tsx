// app/components/DeadlineCountdown.tsx
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Box, Typography, Skeleton } from '@mui/material';
import { DateTime } from 'luxon';
import { getAllDeadlines, getNow } from '@/lib/useTournament';

const DeadlineCountdown = () => {
  // Get deadlines from tournament config
  const deadlines = useMemo(() => getAllDeadlines(), []);
  const groupStageDeadline = deadlines.groupStage;
  const super4Deadline = deadlines.super4;
  const finalsDeadline = deadlines.finals;

  // Determine current deadline and phase
  const now = getNow();
  let currentDeadline: DateTime;
  let currentPhase: string;

  if (now < groupStageDeadline) {
    currentDeadline = groupStageDeadline;
    currentPhase = 'group stage bracket';
  } else if (now < super4Deadline) {
    currentDeadline = super4Deadline;
    currentPhase = 'Super 4 picks';
  } else if (now < finalsDeadline) {
    currentDeadline = finalsDeadline;
    currentPhase = 'Finals pick';
  } else {
    currentDeadline = finalsDeadline; // All deadlines passed
    currentPhase = 'Finals pick';
  }

  // Initialize timeLeft as null so we can show a skeleton until it's computed.
  const [timeLeft, setTimeLeft] = useState<string | null>(null);
  const [deadlinePassed, setDeadlinePassed] = useState<boolean>(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = DateTime.local();
      if (now >= currentDeadline) {
        setDeadlinePassed(true);
        setTimeLeft('Submission closed');
        clearInterval(interval);
      } else {
        const diff = currentDeadline.diff(now, ['days', 'hours', 'minutes', 'seconds']).toObject();
        const days = Math.floor(diff.days || 0);
        const hours = Math.floor(diff.hours || 0);
        const minutes = Math.floor(diff.minutes || 0);
        const seconds = Math.floor(diff.seconds || 0);
        const newTimeLeft = `${days}d ${hours}h ${minutes}m ${seconds}s`;
        setTimeLeft(newTimeLeft);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [currentDeadline]);

  return (
    <Box
      sx={{
        background: 'linear-gradient(90deg, #333, #555)',
        color: '#fff',
        py: 1,
        px: 2,
        textAlign: 'center',
        fontSize: '0.9rem',
        letterSpacing: 0.5,
      }}
    >
      {deadlinePassed ? (
        <Typography>
          The deadline has passed. No further submissions are accepted.
        </Typography>
      ) : (
        <Typography>
          {timeLeft === null ? (
            // Show a skeleton placeholder covering the entire message area until timeLeft is computed.
            <Skeleton variant="text" width="100%" height={24} />
          ) : (
            `Deadline to submit: ${timeLeft}`
          )}
        </Typography>
      )}
    </Box>
  );
};

export default DeadlineCountdown;
