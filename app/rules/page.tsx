'use client';

import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import LooksTwoIcon from '@mui/icons-material/LooksTwo';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import { getConfig, getAllDeadlines } from '@/lib/useTournament';

const RulesPage = () => {
  const config = getConfig();
  const deadlines = getAllDeadlines();

  // Get phase configurations
  const groupStagePhase = config.phases.find((p) => p.id === 'group-stage');
  const super4Phase = config.phases.find((p) => p.id === 'super4');
  const finalsPhase = config.phases.find((p) => p.id === 'finals');

  // Format deadline for display
  const formatDeadline = (deadline: any) => {
    return deadline.toLocaleString({
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short'
    });
  };

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="100vh"
      p={3}
    >
      <Paper elevation={3} sx={{ padding: 4, maxWidth: 800 }}>
        <Typography variant="h3" align="center" gutterBottom color="primary">
          {config.name} Rules
        </Typography>

        {groupStagePhase && (
          <>
            <Typography variant="h5" color="secondary" mt={4} gutterBottom>
              1. {groupStagePhase.name} (due {formatDeadline(deadlines.groupStage)}):
            </Typography>
            {groupStagePhase.scoringType === 'fixed' && groupStagePhase.pointsPerCorrect && (
              <Typography variant="body1" gutterBottom>
                • Correct Match Winner: <strong>{groupStagePhase.pointsPerCorrect} points</strong>
              </Typography>
            )}
            {groupStagePhase.drawPoints && (
              <Typography variant="body1" gutterBottom>
                • Match Abandoned/Draw: <strong>{groupStagePhase.drawPoints} points</strong>
              </Typography>
            )}
          </>
        )}

        {(super4Phase || finalsPhase) && (
          <>
            <Typography variant="h5" color="secondary" mt={4} gutterBottom>
              2. Playoff Stages:
            </Typography>
            {super4Phase && (
              <>
                <Typography variant="body1" gutterBottom fontWeight={600}>
                  {super4Phase.name} (due {formatDeadline(deadlines.super4)}):
                </Typography>
                {super4Phase.scoringType === 'pool' && super4Phase.poolSize && (
                  <Typography variant="body1" gutterBottom ml={2}>
                    • Pool-based scoring: <strong>{super4Phase.poolSize} points</strong> split among all correct predictions
                  </Typography>
                )}
                {super4Phase.scoringType === 'fixed' && super4Phase.pointsPerCorrect && (
                  <Typography variant="body1" gutterBottom ml={2}>
                    • Correct Match Winner: <strong>{super4Phase.pointsPerCorrect} points</strong>
                  </Typography>
                )}
              </>
            )}
            {finalsPhase && (
              <>
                <Typography variant="body1" gutterBottom fontWeight={600} mt={2}>
                  {finalsPhase.name} (due {formatDeadline(deadlines.finals)}):
                </Typography>
                {finalsPhase.scoringType === 'pool' && finalsPhase.poolSize && (
                  <Typography variant="body1" gutterBottom ml={2}>
                    • Pool-based scoring: <strong>{finalsPhase.poolSize} points</strong> split among all correct predictions
                  </Typography>
                )}
                {finalsPhase.scoringType === 'fixed' && finalsPhase.pointsPerCorrect && (
                  <Typography variant="body1" gutterBottom ml={2}>
                    • Correct Match Winner: <strong>{finalsPhase.pointsPerCorrect} points</strong>
                  </Typography>
                )}
              </>
            )}
          </>
        )}

        <Typography variant="h5" color="secondary" mt={4} gutterBottom>
          3. Tiebreakers:
        </Typography>
        <Typography variant="body1" gutterBottom>
          • Earliest Submission: If tied, the participant who submitted their predictions first wins.
        </Typography>

        {config.features.bonusQuestionsEnabled && (
          <>
            <Typography variant="h5" color="secondary" mt={4} gutterBottom>
              4. Bonus Predictions ({groupStagePhase?.name} Only):
            </Typography>
            <Typography variant="body1" gutterBottom>
              • Each correct prediction awards <strong>{config.scoring.bonusPointsPerCorrect} points</strong>.
            </Typography>
            <Typography variant="body2" gutterBottom>
              Note: Bonus picks apply only to the {groupStagePhase?.name.toLowerCase()}.
            </Typography>
          </>
        )}

        <Typography variant="h5" color="secondary" mt={4} gutterBottom>
          {config.features.bonusQuestionsEnabled ? '5' : '4'}. Penalties for Late Submissions:
        </Typography>
        <Typography variant="body1" gutterBottom>
          To ensure fairness, strict rules will be applied to late submissions:
        </Typography>
        <Typography variant="body1" gutterBottom>
          <strong>Late Submission Penalty:</strong>
        </Typography>
        <Typography variant="body2" gutterBottom>
          • No points will be awarded for any matches that have already started or concluded by the time the predictions are submitted.
        </Typography>
        <Typography variant="body2" gutterBottom>
          • A penalty of <strong>{Math.abs(config.scoring.latePenaltyPerDay)} points</strong> will be deducted from the total score for each day the submission is late.
        </Typography>
        <Typography variant="body1" gutterBottom>
          <strong>Bonus Points Cap for Late Submissions:</strong>
        </Typography>
        <Typography variant="body2" gutterBottom>
          • A maximum cap of <strong>{config.scoring.bonusPointsCap} bonus points</strong> will be applied to late submissions to prevent any undue advantage.
        </Typography>

        {config.features.chipsEnabled && (
          <>
            <Typography variant="h5" color="secondary" mt={4} gutterBottom>
              {config.features.bonusQuestionsEnabled ? '6' : '5'}. Chip Features ({groupStagePhase?.name} Only):
            </Typography>
            <Typography variant="body1" gutterBottom>
              • <strong>
                <span style={{ display: 'inline-flex', verticalAlign: 'middle', marginRight: 4 }}>
                  <LooksTwoIcon fontSize="small" />
                </span>
                Double Up Chip:
              </strong>{' '}
              For any {groupStagePhase?.name.toLowerCase()} fixture, you can activate the Double Up chip before the match begins. If your prediction for that match is correct, your points for that fixture are doubled. Each participant can use the Double Up chip for only one fixture.
            </Typography>
            <Typography variant="body1" gutterBottom>
              • <strong>
                <span style={{ display: 'inline-flex', verticalAlign: 'middle', marginRight: 4 }}>
                  <ShuffleIcon fontSize="small" />
                </span>
                Wildcard Chip:
              </strong>{' '}
              For any {groupStagePhase?.name.toLowerCase()} fixture, you can activate the Wildcard chip before the match begins. This chip allows you to swap your prediction for that fixture (choosing the opposite team) without penalty. Each participant can use the Wildcard chip for only one fixture.
            </Typography>
          </>
        )}
      </Paper>
    </Box>
  );
};

export default RulesPage;