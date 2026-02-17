// app/components/RecentActivity.tsx
'use client';

import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  Paper,
  Divider,
  useTheme,
  Skeleton
} from '@mui/material';
import { DateTime } from 'luxon';

interface Activity {
  timestamp: string;
  eventType: string;
  user: string;
  details: string;
}

// Map internal event types to user-friendly messages and emojis.
const eventTypeMap: { [key: string]: string } = {
  BRACKET_SUBMITTED: 'Bracket Submitted 🎉',
  BRACKET_UPDATED: 'Bracket Updated 🔄',
  FIXTURE_UPDATED: 'Fixture Updated 🏆',
  SUPER4_SUBMITTED: 'Super 4 Picks Submitted 🟡',
  SUPER4_UPDATED: 'Super 4 Picks Updated 🔄',
  PLAYOFFS_SUBMITTED: 'Super 4 Picks Submitted 🟡',
  PLAYOFFS_UPDATED: 'Super 4 Picks Updated 🔄',
  CHIP_DOUBLEUP_ACTIVATED: 'Double Up Activated 2️⃣',
  CHIP_WILDCARD_ACTIVATED: 'Wildcard Activated 🃏'
  // Add additional mappings as needed.
};

const RecentActivity = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const theme = useTheme();

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const response = await fetch('/api/activity-log', { cache: 'no-store' });
        const data = await response.json();
        if (response.ok) {
          console.log('response from activity log', data);
          setActivities(data.activities);
        } else {
          setError(data.error);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, []);

  if (error) {
    return (
      <Box mt={4}>
        <Typography variant="h6" color="error">
          Error: {error}
        </Typography>
      </Box>
    );
  }

  return (
    <Paper
      sx={{
        padding: 2,
        borderRadius: 2,
        boxShadow: 3,
        maxWidth: 600,
        margin: 'auto',
        mt: 4,
      }}
    >
      <Typography variant="h5" gutterBottom>
        Recent Activity
      </Typography>
      {loading ? (
        // Show three skeleton "cards"
        <Box
          sx={{
            maxHeight: 450,
            overflowY: 'auto',
            pr: 1,
          }}
        >
          <List>
            {[1, 2, 3].map((skeletonIndex) => (
              <Paper
                key={skeletonIndex}
                sx={{
                  marginBottom: 2,
                  padding: 2,
                  borderRadius: 2,
                  backgroundColor: theme.palette.background.default,
                }}
                elevation={2}
              >
                <ListItem alignItems="flex-start" disableGutters>
                  <ListItemText
                    primary={
                      <Box
                        display="flex"
                        justifyContent="space-between"
                        alignItems="center"
                        mb={1}
                      >
                        <Skeleton variant="text" width="60%" height={30} />
                        <Skeleton variant="text" width="30%" height={20} />
                      </Box>
                    }
                    secondary={
                      <React.Fragment>
                        <Skeleton variant="text" width="40%" height={20} />
                        <Skeleton variant="text" width="80%" height={20} />
                      </React.Fragment>
                    }
                  />
                </ListItem>
                <Divider variant="inset" component="li" />
              </Paper>
            ))}
          </List>
        </Box>
      ) : activities.length === 0 ? (
        <Typography variant="body1">No recent activity found.</Typography>
      ) : (
        <Box
          sx={{
            maxHeight: 450, // Increased height to show at least 3 cards
            overflowY: 'auto',
            pr: 1 // extra padding for scrollbar
          }}
        >
          <List>
            {activities.map((activity, index) => {
              // Translate the event type using our map; if not found, fallback to the original.
              const friendlyEvent =
                eventTypeMap[activity.eventType] || activity.eventType;
              // Format timestamp using Luxon (assumes timestamp is in a format recognized by JavaScript Date)
              const formattedTime = DateTime.fromJSDate(new Date(activity.timestamp)).toFormat('MMM dd HH:mm');

              return (
                <Paper
                  key={index}
                  sx={{
                    marginBottom: 2,
                    padding: 2,
                    borderRadius: 2,
                    backgroundColor: theme.palette.background.default,
                  }}
                  elevation={2}
                >
                  <ListItem alignItems="flex-start" disableGutters>
                    <ListItemText
                      primary={
                        <Box
                          display="flex"
                          justifyContent="space-between"
                          alignItems="center"
                          mb={1}
                        >
                          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                            {friendlyEvent}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formattedTime}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <React.Fragment>
                          <Typography
                            component="span"
                            variant="body2"
                            color="text.primary"
                            sx={{ fontWeight: 'medium' }}
                          >
                            {activity.user}
                          </Typography>
                          {` — ${activity.details}`}
                        </React.Fragment>
                      }
                    />
                  </ListItem>
                  {index < activities.length - 1 && <Divider variant="inset" component="li" />}
                </Paper>
              );
            })}
          </List>
        </Box>
      )}
    </Paper>
  );
};

export default RecentActivity;