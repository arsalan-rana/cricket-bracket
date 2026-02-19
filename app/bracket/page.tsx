'use client';

import { useSession, signIn } from 'next-auth/react';
import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Container,
  Typography,
  Button,
  Box,
  Paper,
  Collapse,
  Skeleton,
  CircularProgress,
  Fab,
  TextField,
  Tabs,
  Tab,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Tooltip
} from '@mui/material';
import { ExpandMore, ExpandLess } from '@mui/icons-material';
import LooksTwoIcon from '@mui/icons-material/LooksTwo';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import SendIcon from '@mui/icons-material/Send';
import SaveIcon from '@mui/icons-material/Save';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { DateTime } from 'luxon';
import { useTheme } from '@mui/material/styles';

// Import tournament configuration utilities
import {
  teamColors,
  bonusQuestions,
  bonusPredictions,
  getAllDeadlines,
  getFixtureStartTime,
  getNow,
  useAllFixtures,
  getFutureFixtures,
  getConfig,
  getPhaseForMatch,
  Fixture,
} from '@/lib/useTournament';

// TabPanel component (from MUI docs)
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}
function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: { xs: 1, sm: 3 }, position: 'relative' }}>{children}</Box>}
    </div>
  );
}
function a11yProps(index: number) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  };
}

const BracketSubmission = () => {
  const { data: session } = useSession();
  const theme = useTheme();
  const config = getConfig();

  // Fetch fixtures from API/config
  const {
    groupStageFixtures: fixtures,
    super4Fixtures: playoffsFixtures,
    semifinalsFixtures,
    finalsFixtures,
    isLoading: fixturesLoading
  } = useAllFixtures();

  const [tabValue, setTabValue] = useState(0); // Will be set based on current phase
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Group stage picks state
  const [predictions, setPredictions] = useState<{ [match: number]: string }>({});
  // Playoffs picks state
  const [playoffsPredictions, setPlayoffsPredictions] = useState<{ [match: number]: string }>({});
  // Semifinals picks state
  const [semifinalsPredictions, setSemifinalsPredictions] = useState<{ [match: number]: string }>({});
  // Finals picks state
  const [finalsPredictions, setFinalsPredictions] = useState<{ [match: number]: string }>({});
  const [detailsOpen, setDetailsOpen] = useState<{ [match: number]: boolean }>({});
  const [bonusAnswers, setBonusAnswers] = useState<{ [key: string]: string }>({});

  // NEW: A flag that indicates whether the user has already submitted (finalized) their group stage bracket.
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [showDeadlinePopup, setShowDeadlinePopup] = useState(false);
  const [snackbars, setSnackbars] = useState<Array<{ id: number; open: boolean; message: string; severity: "success" | "error" | "warning" }>>([]);

  // --- CHIP STATES (Per Phase) ---
  const [selectedChipMenu, setSelectedChipMenu] = useState<"doubleUp" | "wildcard" | null>(null);
  const [selectedDoubleUp, setSelectedDoubleUp] = useState<number | null>(null);
  const [selectedWildcard, setSelectedWildcard] = useState<number | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  // Chips organized by phase
  type PhaseChips = { doubleUp: number | null; wildcard: number | null };
  const [userChips, setUserChips] = useState<{
    groupStage: PhaseChips;
    super8: PhaseChips;
    semifinals: PhaseChips;
    finals: PhaseChips;
  }>({
    groupStage: { doubleUp: null, wildcard: null },
    super8: { doubleUp: null, wildcard: null },
    semifinals: { doubleUp: null, wildcard: null },
    finals: { doubleUp: null, wildcard: null },
  });

  const showSnackbar = (message: string, severity: "success" | "error" | "warning") => {
    const id = Date.now() + Math.random(); // Simple unique ID
    setSnackbars((prev) => [...prev, { id, open: true, message, severity }]);
  };

  const handleSnackbarClose = (id: number) => {
    setSnackbars((prev) => prev.filter((snackbar) => snackbar.id !== id));
  };

  // Deadlines for each bracket type (from tournament config)
  const deadlines = getAllDeadlines();
  const groupStageDeadline = deadlines['group-stage'] || deadlines.groupStage;
  const playoffsDeadline = deadlines['super4'] || deadlines.super4;
  const semifinalsDeadline = deadlines['semifinals'] || deadlines.semifinals;
  const finalsDeadline = deadlines['finals'] || deadlines.finals;

  const now = getNow();
  const isGroupStagePastDeadline = now > groupStageDeadline;
  const isPlayoffsPastDeadline = now > playoffsDeadline;
  const isSemifinalsPastDeadline = semifinalsDeadline ? now > semifinalsDeadline : isPlayoffsPastDeadline;
  const isFinalsPastDeadline = now > finalsDeadline;

  // Draft status tracking
  const [submissionStatus, setSubmissionStatus] = useState<{
    groupStage: 'DRAFT' | 'SUBMITTED' | 'NONE',
    super8: 'DRAFT' | 'SUBMITTED' | 'NONE',
    finals: 'DRAFT' | 'SUBMITTED' | 'NONE'
  }>({
    groupStage: 'NONE',
    super8: 'NONE',
    finals: 'NONE'
  });

  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // AI Predictions dialog state
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiDialogMode, setAiDialogMode] = useState<'replace' | 'fillEmpty'>('fillEmpty');

  // Get phase names from config
  const super4Phase = config.phases.find((p) => p.id === 'super4');
  const semifinalsPhase = config.phases.find((p) => p.id === 'semifinals');
  const finalsPhase = config.phases.find((p) => p.id === 'finals');

  // Show tabs based on deadlines
  const showSuper4Tab = isGroupStagePastDeadline;
  const showSemifinalsTab = semifinalsPhase && isSemifinalsPastDeadline;
  const showFinalsTab = isFinalsPastDeadline;

  // For group stage we only lock if the user already finalized their submission.
  const locked = isGroupStagePastDeadline && alreadySubmitted;

  // Set default tab to Super 8 if available, otherwise Fixture Picks
  useEffect(() => {
    if (showSuper4Tab && tabValue === 0) {
      setTabValue(2); // Switch to Super 8 tab when it becomes available
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSuper4Tab]);

  // Fetch existing group stage bracket picks on mount
  useEffect(() => {
    const fetchExistingPicks = async () => {
      if (!session?.user?.name) return;
      setIsLoading(true);
      try {
        const response = await fetch(`/api/get-bracket?name=${encodeURIComponent(session.user.name)}`);
        const data = await response.json();
        if (response.ok) {
          if (Object.keys(predictions).length === 0 && data.picks && Object.keys(data.picks).length > 0) {
            setAlreadySubmitted(true);
            setPredictions(data.picks);
            setBonusAnswers(data.bonusPicks || {});
          }
        }
      } catch (error) {
        console.error("Error fetching bracket:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchExistingPicks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // NEW: Fetch existing playoff and finals picks on mount from the new endpoint
  useEffect(() => {
    const fetchPlayoffsFinalsPicks = async () => {
      if (!session?.user?.name) return;
      try {
        const response = await fetch(`/api/get-bracket-playoffs?name=${encodeURIComponent(session.user.name)}&t=${Date.now()}`, {
          cache: 'no-store'
        });
        const data = await response.json();
        if (response.ok) {
          console.log('Fetched Super 8 picks:', data.playoffsPicks);
          setPlayoffsPredictions(data.playoffsPicks || {});
          setFinalsPredictions(data.finalsPicks || {});
        } else {
          console.error('Error response:', data);
        }
      } catch (error) {
        console.error("Error fetching playoff and finals picks:", error);
      }
    };
    fetchPlayoffsFinalsPicks();
  }, [session]);

  // Fetch user's chip usage from the backend (per phase)
  useEffect(() => {
    const fetchUserChips = async () => {
      if (!session?.user?.name) return;
      try {
        const response = await fetch('/api/get-user-chips');
        if (response.ok) {
          const data = await response.json();
          setUserChips({
            groupStage: data.groupStage || { doubleUp: null, wildcard: null },
            super8: data.super8 || { doubleUp: null, wildcard: null },
            semifinals: data.semifinals || { doubleUp: null, wildcard: null },
            finals: data.finals || { doubleUp: null, wildcard: null },
          });
        }
      } catch (error) {
        console.error("Error fetching user chips:", error);
      }
    };
    fetchUserChips();
  }, [session]);

  // Fetch submission status for draft tracking
  useEffect(() => {
    const fetchStatus = async () => {
      if (!session?.user?.name) return;

      const userName = session.user.name;
      const phases = ['group-stage', 'super8', 'finals'];
      const statuses = await Promise.all(
        phases.map(phase =>
          fetch(`/api/get-submission-status?name=${userName}&phase=${phase}`)
            .then(r => r.json())
            .catch(() => ({ status: 'NONE' }))
        )
      );

      setSubmissionStatus({
        groupStage: statuses[0].status,
        super8: statuses[1].status,
        finals: statuses[2].status
      });
    };

    fetchStatus();
  }, [session]);

  // Auto-save to localStorage (debounced 30 seconds)
  const saveToLocalStorage = useCallback(() => {
    if (!session?.user?.name || !autoSaveEnabled) return;

    const draftData = {
      predictions,
      playoffsPredictions,
      finalsPredictions,
      bonusAnswers,
      timestamp: new Date().toISOString()
    };

    localStorage.setItem(
      `draft_${session.user.name}`,
      JSON.stringify(draftData)
    );
    setLastSaved(new Date());
  }, [predictions, playoffsPredictions, finalsPredictions, bonusAnswers, session, autoSaveEnabled]);

  // Trigger auto-save on pick changes (with debounce)
  useEffect(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      saveToLocalStorage();
    }, 30000); // 30 second debounce

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [predictions, playoffsPredictions, finalsPredictions, bonusAnswers, saveToLocalStorage]);

  // Restore from localStorage on mount
  useEffect(() => {
    if (!session?.user?.name) return;

    const savedDraft = localStorage.getItem(`draft_${session.user.name}`);
    if (savedDraft) {
      try {
        const {
          predictions: p,
          playoffsPredictions: pp,
          finalsPredictions: fp,
          bonusAnswers: ba,
          timestamp
        } = JSON.parse(savedDraft);

        // Only restore if no server data exists
        if (Object.keys(predictions).length === 0 && p) {
          setPredictions(p || {});
          setPlayoffsPredictions(pp || {});
          setFinalsPredictions(fp || {});
          setBonusAnswers(ba || {});
          if (timestamp) {
            setLastSaved(new Date(timestamp));
          }
        }
      } catch (error) {
        console.error("Error restoring draft from localStorage:", error);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // Determine current phase based on active tab
  const getCurrentPhase = (): 'group-stage' | 'super4' | 'semifinals' | 'finals' | null => {
    if (tabValue === 0 || tabValue === 1) return 'group-stage';
    if (tabValue === 2) return 'super4';
    if (showSemifinalsTab && tabValue === 3) return 'semifinals';
    if (showFinalsTab && tabValue === (showSemifinalsTab ? 4 : 3)) return 'finals';
    return null;
  };

  const currentPhase = getCurrentPhase();

  // Get current phase chips
  const getCurrentPhaseChips = (): PhaseChips => {
    if (currentPhase === 'group-stage') return userChips.groupStage;
    if (currentPhase === 'super4') return userChips.super8;
    if (currentPhase === 'semifinals') return userChips.semifinals;
    if (currentPhase === 'finals') return userChips.finals;
    return { doubleUp: null, wildcard: null };
  };

  const currentPhaseChips = getCurrentPhaseChips();

  // Get fixtures for current phase only (future fixtures within the phase)
  const getCurrentPhaseFixtures = (): Fixture[] => {
    let phaseFixtures: Fixture[] = [];
    if (currentPhase === 'group-stage') phaseFixtures = fixtures;
    else if (currentPhase === 'super4') phaseFixtures = playoffsFixtures;
    else if (currentPhase === 'semifinals') phaseFixtures = semifinalsFixtures;
    else if (currentPhase === 'finals') phaseFixtures = finalsFixtures;

    // Filter to only future fixtures
    return getFutureFixtures(phaseFixtures);
  };

  const availableFixtures = getCurrentPhaseFixtures();

  const handleSelection = (match: number, team: string) => {
    if (locked) return;
    setPredictions((prev) => ({
      ...prev,
      [match]: team,
    }));
  };

  const handlePlayoffsSelection = (match: number, team: string) => {
    if (isPlayoffsPastDeadline) return;
    setPlayoffsPredictions((prev) => ({
      ...prev,
      [match]: team,
    }));
  };

  const handleSemifinalsSelection = (match: number, team: string) => {
    if (isSemifinalsPastDeadline) return;
    setSemifinalsPredictions((prev) => ({
      ...prev,
      [match]: team,
    }));
  };

  const handleFinalsSelection = (match: number, team: string) => {
    if (isFinalsPastDeadline) return;
    setFinalsPredictions((prev) => ({
      ...prev,
      [match]: team,
    }));
  };

  const toggleDetails = (match: number) => {
    setDetailsOpen((prev) => ({
      ...prev,
      [match]: !prev[match],
    }));
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Save draft handler
  const handleSaveDraft = async (phase: 'group-stage' | 'super8' | 'finals') => {
    if (!session?.user?.name) return;

    setIsSubmitting(true);

    try {
      let endpoint = '';
      let payload: any = { name: session.user.name, isDraft: true };

      if (phase === 'group-stage') {
        endpoint = '/api/submit-bracket';
        payload.picks = predictions;
        payload.bonusAnswers = bonusAnswers;
      } else if (phase === 'super8') {
        endpoint = '/api/submit-playoffs';
        payload.picks = playoffsPredictions;
      } else if (phase === 'finals') {
        endpoint = '/api/submit-finals';
        payload.picks = finalsPredictions;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const statusKey = phase === 'group-stage' ? 'groupStage' : phase === 'super8' ? 'super8' : 'finals';
        setSubmissionStatus(prev => ({ ...prev, [statusKey]: 'DRAFT' }));
        setLastSaved(new Date());
        showSnackbar('Draft saved successfully!', 'success');
      } else {
        throw new Error('Failed to save draft');
      }
    } catch (error) {
      console.error('Error saving draft:', error);
      showSnackbar('Error saving draft', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // AI Predictions handlers
  const handleOpenAiDialog = () => {
    setAiDialogOpen(true);
  };

  const handleCloseAiDialog = () => {
    setAiDialogOpen(false);
  };

  const handleApplyAiPredictions = () => {
    if (!config.features.aiPredictionsEnabled) {
      showSnackbar('AI predictions are not enabled for this tournament', 'error');
      return;
    }

    const aiFixtures = fixtures.filter(f => f.aiPrediction);
    if (aiFixtures.length === 0) {
      showSnackbar('No AI predictions available', 'error');
      return;
    }

    const newPredictions = { ...predictions };
    let appliedCount = 0;

    aiFixtures.forEach(fixture => {
      if (aiDialogMode === 'replace' || !newPredictions[fixture.match]) {
        if (fixture.aiPrediction) {
          newPredictions[fixture.match] = fixture.aiPrediction;
          appliedCount++;
        }
      }
    });

    setPredictions(newPredictions);
    setAiDialogOpen(false);

    const mode = aiDialogMode === 'replace' ? 'replaced' : 'filled';
    showSnackbar(`AI predictions applied! ${appliedCount} picks ${mode}.`, 'success');
  };

  const handleApplyBonusAiPredictions = () => {
    if (!config.features.bonusQuestionsEnabled) {
      showSnackbar('Bonus questions are not enabled for this tournament', 'error');
      return;
    }

    const newBonusAnswers = { ...bonusAnswers };
    let appliedCount = 0;

    bonusQuestions.forEach(question => {
      const prediction = bonusPredictions[question];
      if (prediction) {
        if (aiDialogMode === 'replace' || !newBonusAnswers[question] || newBonusAnswers[question].trim() === '') {
          newBonusAnswers[question] = prediction;
          appliedCount++;
        }
      }
    });

    setBonusAnswers(newBonusAnswers);
    setAiDialogOpen(false);

    const mode = aiDialogMode === 'replace' ? 'replaced' : 'filled';
    showSnackbar(`AI predictions applied! ${appliedCount} bonus picks ${mode}.`, 'success');
  };

  // Submission functions for each bracket type
  const doSubmit = async (hasEmptyBonusQuestions = false) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/submit-bracket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: session?.user?.name,
          picks: predictions,
          bonusAnswers: bonusAnswers,
          isDraft: false,
        }),
      });
      if (response.ok) {
        showSnackbar("Your bracket has been submitted successfully!", "success");
        setAlreadySubmitted(true);
        setSubmissionStatus(prev => ({ ...prev, groupStage: 'SUBMITTED' }));

        // Clear draft from localStorage after successful final submission
        if (session?.user?.name) {
          localStorage.removeItem(`draft_${session.user.name}`);
          setAutoSaveEnabled(false);
        }

        // Show bonus reminder as a separate message immediately if needed
        if (hasEmptyBonusQuestions) {
          showSnackbar("Remember to make your bonus picks. You can select/update them until the deadline.", "warning");
        }
      } else {
        showSnackbar("Failed to submit your bracket. Please try again.", "error");
      }
    } catch (error) {
      showSnackbar("An error occurred while submitting. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const doSubmitPlayoffs = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/submit-playoffs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: session?.user?.name,
          picks: playoffsPredictions,
          isDraft: false,
        }),
      });
      if (response.ok) {
        showSnackbar("Your playoffs bracket has been submitted successfully!", "success");
        setSubmissionStatus(prev => ({ ...prev, super8: 'SUBMITTED' }));

        // Clear draft from localStorage after successful final submission
        if (session?.user?.name) {
          localStorage.removeItem(`draft_${session.user.name}`);
          setAutoSaveEnabled(false);
        }
      } else {
        showSnackbar("Failed to submit your playoffs bracket. Please try again.", "error");
      }
    } catch (error) {
      showSnackbar("An error occurred while submitting playoffs bracket. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const doSubmitFinals = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/submit-finals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: session?.user?.name,
          picks: finalsPredictions,
          isDraft: false,
        }),
      });
      if (response.ok) {
        showSnackbar("Your finals bracket has been submitted successfully!", "success");
        setSubmissionStatus(prev => ({ ...prev, finals: 'SUBMITTED' }));

        // Clear draft from localStorage after successful final submission
        if (session?.user?.name) {
          localStorage.removeItem(`draft_${session.user.name}`);
          setAutoSaveEnabled(false);
        }
      } else {
        showSnackbar("Failed to submit your finals bracket. Please try again.", "error");
      }
    } catch (error) {
      showSnackbar("An error occurred while submitting finals bracket. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = () => {
    if (tabValue === 0 || tabValue === 1) {
      // Group Stage & Bonus picks submission
      if (Object.keys(predictions).length !== fixtures.length) {
        showSnackbar("Please predict the winner for all matches before submitting.", "error");
        return;
      }
      // Check if any bonus questions are empty
      let hasEmptyBonusQuestions = false;
      for (const question of bonusQuestions) {
        if (!bonusAnswers[question] || bonusAnswers[question].trim() === "") {
          hasEmptyBonusQuestions = true;
          break;
        }
      }
      if (isGroupStagePastDeadline) {
        if (alreadySubmitted) {
          showSnackbar("Group stage bracket submission is locked. You cannot modify your submission.", "error");
          return;
        } else {
          setShowDeadlinePopup(true);
          return;
        }
      }
      doSubmit(hasEmptyBonusQuestions);
    } else if (tabValue === 2) {
      // Playoffs submission
      if (Object.keys(playoffsPredictions).length !== playoffsFixtures.length) {
        showSnackbar("Please predict the winner for all playoffs matches before submitting.", "error");
        return;
      }
      if (isPlayoffsPastDeadline) {
        showSnackbar("Playoffs submission is locked. You cannot modify your submission.", "error");
        return;
      }
      doSubmitPlayoffs();
    } else if (tabValue === 3) {
      // Finals submission
      if (!finalsFixtures[0].team1 || !finalsFixtures[0].team2) {
        showSnackbar("Finals are not available yet.", "error");
        return;
      }
      if (!finalsPredictions[finalsFixtures[0].match]) {
        showSnackbar("Please predict the winner for the finals match before submitting.", "error");
        return;
      }
      if (isFinalsPastDeadline) {
        showSnackbar("Finals submission is locked. You cannot modify your submission.", "error");
        return;
      }
      doSubmitFinals();
    }
  };

  const handlePopupContinue = () => {
    setShowDeadlinePopup(false);
    // Check if any bonus questions are empty for late submission too
    let hasEmptyBonusQuestions = false;
    for (const question of bonusQuestions) {
      if (!bonusAnswers[question] || bonusAnswers[question].trim() === "") {
        hasEmptyBonusQuestions = true;
        break;
      }
    }
    doSubmit(hasEmptyBonusQuestions);
  };

  const handlePopupCancel = () => {
    setShowDeadlinePopup(false);
  };

  const handleChipMenuToggle = (chip: "doubleUp" | "wildcard") => {
    if (selectedChipMenu === chip) {
      setSelectedChipMenu(null);
    } else {
      setSelectedChipMenu(chip);
    }
  };

  const handleApplyChip = () => {
    setConfirmDialogOpen(true);
  };

  const handleConfirmCancel = () => {
    setConfirmDialogOpen(false);
  };

  const handleConfirmChip = async () => {
    setConfirmDialogOpen(false);

    if (!currentPhase) {
      showSnackbar("Unable to determine current phase.", "error");
      return;
    }

    if (selectedChipMenu === "wildcard" && selectedWildcard) {
      const fixture = availableFixtures.find(f => f.match === selectedWildcard);
      if (!fixture) {
        showSnackbar("Invalid fixture selection.", "error");
        return;
      }
      
      // Get current pick based on phase
      let currentPick: string | undefined;
      if (currentPhase === 'group-stage') {
        currentPick = predictions[fixture.match];
      } else if (currentPhase === 'super4') {
        currentPick = playoffsPredictions[fixture.match];
      } else if (currentPhase === 'semifinals') {
        currentPick = semifinalsPredictions[fixture.match];
      } else if (currentPhase === 'finals') {
        currentPick = finalsPredictions[fixture.match];
      }

      let newPick: string;
      if (currentPick === fixture.team1) {
        newPick = fixture.team2;
      } else if (currentPick === fixture.team2) {
        newPick = fixture.team1;
      } else {
        // If no current pick, default to team2
        newPick = fixture.team2;
      }
      
      // Update the appropriate state based on phase
      try {
        if (currentPhase === 'group-stage') {
          const updatedPicks = { ...predictions, [fixture.match]: newPick };
          setPredictions(updatedPicks);

          const bracketResponse = await fetch('/api/submit-bracket', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              name: session?.user?.name,
              picks: updatedPicks,
              bonusAnswers: bonusAnswers,
              isWildcard: true,
            }),
          });

          if (!bracketResponse.ok) {
            showSnackbar("Failed to update your bracket with the wildcard change.", "error");
            return;
          }
        } else if (currentPhase === 'super4') {
          const updatedPlayoffsPicks = { ...playoffsPredictions, [fixture.match]: newPick };
          setPlayoffsPredictions(updatedPlayoffsPicks);

          const bracketResponse = await fetch('/api/submit-playoffs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              name: session?.user?.name,
              picks: updatedPlayoffsPicks,
            }),
          });

          if (!bracketResponse.ok) {
            showSnackbar("Failed to update your picks with the wildcard change.", "error");
            return;
          }
        } else if (currentPhase === 'semifinals') {
          const updatedSemifinalsPicks = { ...semifinalsPredictions, [fixture.match]: newPick };
          setSemifinalsPredictions(updatedSemifinalsPicks);

          // For semifinals, we might use the same finals API endpoint or create a new one
          // For now, using finals endpoint as semifinals shares the same sheet structure
          const bracketResponse = await fetch('/api/submit-finals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              name: session?.user?.name,
              picks: updatedSemifinalsPicks,
            }),
          });

          if (!bracketResponse.ok) {
            showSnackbar("Failed to update your picks with the wildcard change.", "error");
            return;
          }
        } else if (currentPhase === 'finals') {
          const updatedFinalsPicks = { ...finalsPredictions, [fixture.match]: newPick };
          setFinalsPredictions(updatedFinalsPicks);

          const bracketResponse = await fetch('/api/submit-finals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              name: session?.user?.name,
              picks: updatedFinalsPicks,
            }),
          });

          if (!bracketResponse.ok) {
            showSnackbar("Failed to update your picks with the wildcard change.", "error");
            return;
          }
        }
      } catch (error) {
        showSnackbar("An error occurred while updating picks.", "error");
        return;
      }
      
      try {
        const chipResponse = await fetch('/api/submit-chips', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name: session?.user?.name,
            phase: currentPhase,
            chips: { wildcard: fixture.match },
          }),
        });

        if (!chipResponse.ok) {
          showSnackbar("Picks updated, but failed to record wildcard usage.", "error");
          return;
        }

        showSnackbar("Wildcard applied! Your prediction has been swapped.", "success");

        // Update the specific phase's chips
        setUserChips((prev) => ({
          ...prev,
          [currentPhase === 'group-stage' ? 'groupStage' : currentPhase === 'super4' ? 'super8' : currentPhase]: {
            ...prev[currentPhase === 'group-stage' ? 'groupStage' : currentPhase === 'super4' ? 'super8' : currentPhase as 'semifinals' | 'finals'],
            wildcard: fixture.match
          }
        }));
        setSelectedChipMenu(null);
        setSelectedWildcard(null);
      } catch (error) {
        showSnackbar("An error occurred while recording wildcard usage.", "error");
      }
    } else if (selectedChipMenu === "doubleUp" && selectedDoubleUp) {
      try {
        const response = await fetch('/api/submit-chips', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name: session?.user?.name,
            phase: currentPhase,
            chips: { doubleUp: selectedDoubleUp },
          }),
        });
        if (response.ok) {
          showSnackbar("Chip activated successfully!", "success");

          // Update the specific phase's chips
          setUserChips((prev) => ({
            ...prev,
            [currentPhase === 'group-stage' ? 'groupStage' : currentPhase === 'super4' ? 'super8' : currentPhase as 'semifinals' | 'finals']: {
              ...prev[currentPhase === 'group-stage' ? 'groupStage' : currentPhase === 'super4' ? 'super8' : currentPhase as 'semifinals' | 'finals'],
              doubleUp: selectedDoubleUp
            }
          }));
          setSelectedChipMenu(null);
          setSelectedDoubleUp(null);
        } else {
          showSnackbar("Failed to activate chip. Please try again.", "error");
        }
      } catch (error) {
        showSnackbar("An error occurred while activating chip. Please try again.", "error");
      }
    }
  };

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

  let chipFixture: Fixture | undefined;
  if (selectedChipMenu === "doubleUp" && selectedDoubleUp) {
    chipFixture = [...fixtures, ...playoffsFixtures].find(f => f.match === selectedDoubleUp);
  } else if (selectedChipMenu === "wildcard" && selectedWildcard) {
    chipFixture = [...fixtures, ...playoffsFixtures].find(f => f.match === selectedWildcard);
  }

  // Helper to set the FAB button label based on the active tab.
  const getSubmitButtonLabel = () => {
    if (tabValue === 0 || tabValue === 1) return "Submit Bracket";
    if (tabValue === 2) return "Submit Super 8";
    if (tabValue === 3) return "Submit Finals";
  };

  return (
    <Container
      maxWidth="sm"
      disableGutters
      sx={{
        pt: '10px',
        px: { xs: 0.5, sm: 3 },
        width: '100%',
        maxWidth: { xs: '100vw', sm: '600px' },
        overflowX: 'hidden', // Only hide horizontal overflow to prevent sticky issues
        position: 'relative',
        boxSizing: 'border-box'
      }}
    >
      <Box my={4} textAlign="center">
        <Typography variant="h4" gutterBottom sx={{
          fontWeight: 900,
          background: 'linear-gradient(135deg, #10044A 0%, #1C5D9C 50%, #FF9100 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          textShadow: '0 4px 12px rgba(16, 4, 74, 0.2)',
          letterSpacing: '-0.03em',
        }}>
          🏏 Your Bracket
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{
          fontSize: '1.1rem',
          maxWidth: '600px',
          mx: 'auto',
        }}>
          Make your selections in the tabs below and then submit your bracket.
        </Typography>
      </Box>

      {/* --- CHIP ACTIVATION UI --- Only for group-stage and super4 */}
      {(currentPhase === 'group-stage' || currentPhase === 'super4') && (
        <Box textAlign="center" my={4}>
          <Typography variant="h5" gutterBottom>
            Activate a Chip
          </Typography>
          <Box display="flex" justifyContent="center" gap={2}>
            <IconButton
              onClick={() => handleChipMenuToggle("doubleUp")}
              disabled={currentPhaseChips.doubleUp !== null}
              size="large"
              sx={{
                backgroundColor: 'grey.200',
                '&:hover': { backgroundColor: 'grey.300' },
                borderRadius: '50%',
                p: 1.5,
              }}
            >
              <LooksTwoIcon color={currentPhaseChips.doubleUp !== null ? "disabled" : "primary"} />
            </IconButton>
            <IconButton
              onClick={() => handleChipMenuToggle("wildcard")}
              disabled={currentPhaseChips.wildcard !== null}
              size="large"
              sx={{
                backgroundColor: 'grey.200',
                '&:hover': { backgroundColor: 'grey.300' },
                borderRadius: '50%',
                p: 1.5,
              }}
            >
              <ShuffleIcon color={currentPhaseChips.wildcard !== null ? "disabled" : "primary"} />
            </IconButton>
          </Box>
        {selectedChipMenu === "doubleUp" && (
          <Box mt={2}>
            <Typography variant="subtitle1">Double Up Chip</Typography>
            <FormControl fullWidth>
              <InputLabel id="doubleUp-select-label">Fixture</InputLabel>
              <Select
                labelId="doubleUp-select-label"
                value={selectedDoubleUp || ""}
                label="Fixture"
                onChange={(e) => setSelectedDoubleUp(Number(e.target.value))}
              >
                {availableFixtures.map((fixture) => (
                  <MenuItem key={fixture.match} value={fixture.match}>
                    {`Match ${fixture.match} - ${fixture.date}: ${fixture.team1} vs ${fixture.team2}`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        )}
        {selectedChipMenu === "wildcard" && (
          <Box mt={2}>
            <Typography variant="subtitle1">Wildcard Chip</Typography>
            <FormControl fullWidth>
              <InputLabel id="wildcard-select-label">Fixture</InputLabel>
              <Select
                labelId="wildcard-select-label"
                value={selectedWildcard || ""}
                label="Fixture"
                onChange={(e) => setSelectedWildcard(Number(e.target.value))}
              >
                {availableFixtures.map((fixture) => (
                  <MenuItem key={fixture.match} value={fixture.match}>
                    {`Match ${fixture.match} - ${fixture.date}: ${fixture.team1} vs ${fixture.team2}`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        )}
        {(selectedChipMenu &&
          ((selectedChipMenu === "doubleUp" && selectedDoubleUp) ||
           (selectedChipMenu === "wildcard" && selectedWildcard))) && (
          <Box mt={2} textAlign="center">
            <Button variant="contained" color="primary" onClick={handleApplyChip}>
              Apply Chip
            </Button>
          </Box>
        )}
        </Box>
      )}

      {/* --- CONFIRM CHIP ACTIVATION DIALOG --- Only for group-stage and super4 */}
      {(currentPhase === 'group-stage' || currentPhase === 'super4') && (
        <Dialog open={confirmDialogOpen} onClose={handleConfirmCancel}>
        <DialogTitle>Confirm Chip Activation</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {chipFixture
              ? `Are you sure you want to activate the ${
                  selectedChipMenu === "doubleUp" ? "Double Up" : "Wildcard"
                } chip for Match ${chipFixture.match} - ${chipFixture.date}: ${chipFixture.team1} vs ${chipFixture.team2}?`
              : ''}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleConfirmCancel} variant="contained" color="error">
            Cancel
          </Button>
          <Button onClick={handleConfirmChip} variant="contained" color="success">
            Confirm
          </Button>
        </DialogActions>
        </Dialog>
      )}

      {/* --- AI PREDICTIONS DIALOG --- */}
      <Dialog open={aiDialogOpen} onClose={handleCloseAiDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          background: 'linear-gradient(135deg, #FF9100 0%, #02A7D1 100%)',
          color: 'white',
          fontWeight: 700,
        }}>
          <AutoAwesomeIcon />
          Use AI Predictions
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <DialogContentText sx={{ mb: 3 }}>
            {tabValue === 0 ? (
              <>AI predictions are available for {fixtures.filter(f => f.aiPrediction).length} out of {fixtures.length} matches.</>
            ) : (
              <>AI predictions are available for {bonusQuestions.filter(q => bonusPredictions[q]).length} out of {bonusQuestions.length} bonus questions.</>
            )}
            {' '}How would you like to apply them?
          </DialogContentText>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Button
              variant={aiDialogMode === 'fillEmpty' ? 'contained' : 'outlined'}
              onClick={() => setAiDialogMode('fillEmpty')}
              sx={{
                py: 1.5,
                justifyContent: 'flex-start',
                textAlign: 'left',
                borderRadius: 2,
              }}
            >
              <Box>
                <Typography variant="subtitle1" fontWeight={700}>
                  Fill Empty Only (Recommended)
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {tabValue === 0
                    ? "Apply AI predictions only to matches you haven't picked yet"
                    : "Apply AI predictions only to questions you haven't answered yet"
                  }
                </Typography>
              </Box>
            </Button>
            <Button
              variant={aiDialogMode === 'replace' ? 'contained' : 'outlined'}
              onClick={() => setAiDialogMode('replace')}
              sx={{
                py: 1.5,
                justifyContent: 'flex-start',
                textAlign: 'left',
                borderRadius: 2,
              }}
            >
              <Box>
                <Typography variant="subtitle1" fontWeight={700}>
                  Replace All
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Replace all your {tabValue === 0 ? 'picks' : 'answers'} with AI predictions (cannot be undone)
                </Typography>
              </Box>
            </Button>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseAiDialog} variant="outlined">
            Cancel
          </Button>
          <Button
            onClick={tabValue === 0 ? handleApplyAiPredictions : handleApplyBonusAiPredictions}
            variant="contained"
            startIcon={<AutoAwesomeIcon />}
            sx={{
              background: 'linear-gradient(135deg, #FF9100 0%, #02A7D1 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #F57C00 0%, #0288D1 100%)',
              },
            }}
          >
            Apply Predictions
          </Button>
        </DialogActions>
      </Dialog>

      {/* --- TABS FOR BRACKET SUBMISSION --- */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="Bracket Submission Tabs">
          <Tab label="Fixture Picks" {...a11yProps(0)} />
          <Tab label="Bonus Picks" {...a11yProps(1)} />
          {showSuper4Tab && <Tab label={super4Phase?.name || 'Super 8'} {...a11yProps(2)} />}
          {showSemifinalsTab && <Tab label={semifinalsPhase?.name || 'Semi-Finals'} {...a11yProps(3)} />}
          {showFinalsTab && <Tab label={finalsPhase?.name || 'Final'} {...a11yProps(showSemifinalsTab ? 4 : 3)} />}
        </Tabs>
      </Box>

      {/* Group Stage Tab */}
      <TabPanel value={tabValue} index={0}>
        {/* Draft Status Banner */}
        {submissionStatus.groupStage === 'DRAFT' && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            You have an incomplete draft. Complete all picks and submit before deadline.
            {lastSaved && (
              <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                Last saved: {lastSaved.toLocaleString()}
              </Typography>
            )}
          </Alert>
        )}

        {submissionStatus.groupStage === 'SUBMITTED' && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Your bracket has been submitted! You can still update it before the deadline.
          </Alert>
        )}

        {/* AI Predictions Button */}
        {!isGroupStagePastDeadline && config.features.aiPredictionsEnabled && (
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
            <Button
              variant="contained"
              onClick={handleOpenAiDialog}
              startIcon={<AutoAwesomeIcon />}
              sx={{
                background: 'linear-gradient(135deg, #FF9100 0%, #02A7D1 100%)',
                color: 'white',
                fontWeight: 700,
                px: 3,
                py: 1.5,
                borderRadius: 3,
                boxShadow: '0 4px 16px rgba(255, 145, 0, 0.4)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #F57C00 0%, #0288D1 100%)',
                  transform: 'scale(1.02)',
                  boxShadow: '0 6px 20px rgba(255, 145, 0, 0.5)',
                },
                transition: 'all 0.3s ease-in-out',
              }}
            >
              Use AI Predictions
            </Button>
          </Box>
        )}

        {/* Progress Indicator - Fixed at top */}
        {!isGroupStagePastDeadline && (
          <Box
            sx={{
              position: 'fixed',
              top: { xs: 104, sm: 112 }, // Below app bar + deadline counter
              left: 0,
              right: 0,
              zIndex: 1000,
              bgcolor: 'background.paper',
              py: 1,
              px: { xs: 2, sm: 3 },
              borderBottom: '1px solid',
              borderColor: 'divider',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              backdropFilter: 'blur(10px)',
              backgroundColor: theme.palette.mode === 'dark'
                ? 'rgba(30, 30, 30, 0.95)'
                : 'rgba(255, 255, 255, 0.95)',
            }}
          >
            <Box sx={{ maxWidth: 'sm', mx: 'auto' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                  Progress: {Object.keys(predictions).length} of {fixtures.length} picks
                </Typography>
                <Typography variant="caption" color="text.secondary" fontWeight="bold">
                  {Math.round((Object.keys(predictions).length / fixtures.length) * 100)}%
                </Typography>
              </Box>
              <Box sx={{ width: '100%', height: { xs: 6, sm: 8 }, bgcolor: 'action.hover', borderRadius: 1 }}>
                <Box
                  sx={{
                    width: `${(Object.keys(predictions).length / fixtures.length) * 100}%`,
                    height: '100%',
                    bgcolor: 'primary.main',
                    borderRadius: 1,
                    transition: 'width 0.3s ease-in-out'
                  }}
                />
              </Box>
            </Box>
          </Box>
        )}

        {/* Spacer to prevent content from going under fixed progress bar */}
        {!isGroupStagePastDeadline && <Box sx={{ height: 68 }} />}

        {fixtures.map((fixture) => {
          const matchInfo = getPhaseForMatch(fixture.match) || {
            name: 'Match',
            color: '#1B5E20',
            icon: '🏏'
          };

          return (
            <Box 
              key={fixture.match}
              sx={{
                width: '100%',
                maxWidth: '100%',
                overflow: 'hidden',
                px: { xs: 0.5, sm: 0 },
                boxSizing: 'border-box'
              }}
            >
              <Paper sx={{
              p: { xs: 1.5, sm: 3 },
              mx: { xs: 0, sm: 0 },
              my: { xs: 1.5, sm: 3 },
              textAlign: 'center',
              borderRadius: { xs: 3, sm: 4 },
              boxShadow: theme.palette.mode === 'dark'
                ? '0 8px 32px rgba(2, 167, 209, 0.2), 0 0 0 1px rgba(255, 145, 0, 0.1)'
                : '0 8px 32px rgba(16, 4, 74, 0.12), 0 0 0 1px rgba(16, 4, 74, 0.05)',
              background: theme.palette.mode === 'dark'
                ? 'linear-gradient(135deg, rgba(26, 26, 46, 0.95) 0%, rgba(16, 4, 74, 0.3) 100%)'
                : 'linear-gradient(135deg, #FFFFFF 0%, rgba(245, 247, 250, 0.9) 100%)',
              backdropFilter: 'blur(20px)',
              border: theme.palette.mode === 'dark'
                ? '1px solid rgba(255, 145, 0, 0.2)'
                : '1px solid rgba(16, 4, 74, 0.08)',
              transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              width: { xs: '100%', sm: 'auto' },
              maxWidth: { xs: '100%', sm: 'none' },
              overflow: 'hidden',
              boxSizing: 'border-box',
              position: 'relative',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '3px',
                background: 'linear-gradient(90deg, #FF9100 0%, #02A7D1 50%, #DA2C5A 100%)',
                opacity: 0.7,
              },
              '&:hover': {
                boxShadow: theme.palette.mode === 'dark'
                  ? '0 12px 48px rgba(2, 167, 209, 0.3), 0 0 0 2px rgba(255, 145, 0, 0.3)'
                  : '0 12px 48px rgba(16, 4, 74, 0.2), 0 0 0 2px rgba(255, 145, 0, 0.2)',
                transform: { xs: 'none', sm: 'translateY(-4px) scale(1.01)' },
                borderColor: theme.palette.mode === 'dark'
                  ? 'rgba(255, 145, 0, 0.4)'
                  : 'rgba(16, 4, 74, 0.15)',
              },
            }}>
              <Box 
                display="flex" 
                justifyContent="space-between" 
                alignItems="center" 
                mb={2}
                sx={{
                  width: '100%',
                  maxWidth: '100%',
                  overflow: 'hidden',
                  px: { xs: 0, sm: 0 }
                }}
              >
                <Typography 
                  variant="h6" 
                  sx={{ 
                    fontWeight: 700, 
                    flex: 1,
                    fontSize: { xs: '1rem', sm: '1.25rem' },
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Match {fixture.match} - {fixture.date}
                </Typography>
                <Chip
                  label={`${matchInfo.icon} ${matchInfo.name}`}
                  size="small"
                  sx={{
                    backgroundColor: matchInfo.color,
                    color: 'white',
                    fontWeight: 600,
                    fontSize: { xs: '0.7rem', sm: '0.8rem' },
                    height: { xs: 24, sm: 32 },
                    px: { xs: 0.5, sm: 1 },
                    flexShrink: 0,
                    ml: { xs: 0.5, sm: 1 }
                  }}
                />
              </Box>
              <Box 
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  gap: { xs: 0.5, sm: 2 },
                  alignItems: { xs: 'stretch', sm: 'center' },
                  justifyContent: { xs: 'stretch', sm: 'center' },
                  width: '100%',
                  maxWidth: '100%',
                  px: { xs: 0, sm: 1 },
                  overflow: 'hidden',
                }}
              >
                {isLoading ? (
                  <Skeleton variant="rectangular" width="100%" height={48} sx={{ borderRadius: 2 }} />
                ) : (
                  <Button
                    variant={predictions[fixture.match] === fixture.team1 ? "contained" : "outlined"}
                    onClick={() => handleSelection(fixture.match, fixture.team1)}
                    disabled={locked}
                    sx={{
                      width: { xs: '100%', sm: 'auto' },
                      minWidth: { xs: 'auto', sm: 140 },
                      maxWidth: { xs: '100%', sm: 'none' },
                      height: { xs: 48, sm: 56 },
                      borderRadius: { xs: 6, sm: 8 },
                      fontWeight: 700,
                      fontSize: { xs: '0.85rem', sm: '1rem' },
                      px: { xs: 2, sm: 3 },
                      boxSizing: 'border-box',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      position: 'relative',
                      backgroundColor: predictions[fixture.match] === fixture.team1
                        ? teamColors[fixture.team1]?.primary || theme.palette.primary.main
                        : 'transparent',
                      color: predictions[fixture.match] === fixture.team1
                        ? teamColors[fixture.team1]?.secondary || 'white'
                        : theme.palette.mode === 'dark'
                          ? theme.palette.text.primary
                          : teamColors[fixture.team1]?.primary || theme.palette.primary.main,
                      borderColor: theme.palette.mode === 'dark'
                        ? theme.palette.primary.main
                        : teamColors[fixture.team1]?.primary || theme.palette.primary.main,
                      borderWidth: 2.5,
                      boxShadow: predictions[fixture.match] === fixture.team1
                        ? `0 6px 20px ${teamColors[fixture.team1]?.primary || theme.palette.primary.main}40`
                        : 'none',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': {
                        backgroundColor: predictions[fixture.match] === fixture.team1
                          ? teamColors[fixture.team1]?.primary || theme.palette.primary.main
                          : theme.palette.mode === 'dark'
                            ? `${theme.palette.primary.main}25`
                            : `${teamColors[fixture.team1]?.primary || theme.palette.primary.main}20`,
                        borderWidth: 2.5,
                        transform: 'translateY(-2px) scale(1.02)',
                        boxShadow: predictions[fixture.match] === fixture.team1
                          ? `0 10px 30px ${teamColors[fixture.team1]?.primary || theme.palette.primary.main}50`
                          : `0 6px 20px ${teamColors[fixture.team1]?.primary || theme.palette.primary.main}30`,
                      },
                      '&:active': {
                        transform: 'translateY(0) scale(0.98)',
                      },
                    }}
                  >
                    {fixture.team1}
                  </Button>
                )}
                <Typography 
                  variant="body1" 
                  sx={{ 
                    fontWeight: 'bold', 
                    color: 'text.secondary', 
                    mx: { xs: 0, sm: 2 },
                    my: { xs: 0.3, sm: 0 },
                    fontSize: { xs: '0.9rem', sm: '1.5rem' },
                    textAlign: 'center',
                    minHeight: { xs: 'auto', sm: 'auto' }
                  }}
                >
                  vs
                </Typography>
                {isLoading ? (
                  <Skeleton variant="rectangular" width="100%" height={48} sx={{ borderRadius: 2 }} />
                ) : (
                  <Button
                    variant={predictions[fixture.match] === fixture.team2 ? "contained" : "outlined"}
                    onClick={() => handleSelection(fixture.match, fixture.team2)}
                    disabled={locked}
                    sx={{
                      width: { xs: '100%', sm: 'auto' },
                      minWidth: { xs: 'auto', sm: 140 },
                      maxWidth: { xs: '100%', sm: 'none' },
                      height: { xs: 48, sm: 56 },
                      borderRadius: { xs: 6, sm: 8 },
                      fontWeight: 700,
                      fontSize: { xs: '0.85rem', sm: '1rem' },
                      px: { xs: 2, sm: 3 },
                      boxSizing: 'border-box',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      position: 'relative',
                      backgroundColor: predictions[fixture.match] === fixture.team2
                        ? teamColors[fixture.team2]?.primary || theme.palette.primary.main
                        : 'transparent',
                      color: predictions[fixture.match] === fixture.team2
                        ? teamColors[fixture.team2]?.secondary || 'white'
                        : theme.palette.mode === 'dark'
                          ? theme.palette.text.primary
                          : teamColors[fixture.team2]?.primary || theme.palette.primary.main,
                      borderColor: theme.palette.mode === 'dark'
                        ? theme.palette.primary.main
                        : teamColors[fixture.team2]?.primary || theme.palette.primary.main,
                      borderWidth: 2.5,
                      boxShadow: predictions[fixture.match] === fixture.team2
                        ? `0 6px 20px ${teamColors[fixture.team2]?.primary || theme.palette.primary.main}40`
                        : 'none',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': {
                        backgroundColor: predictions[fixture.match] === fixture.team2
                          ? teamColors[fixture.team2]?.primary || theme.palette.primary.main
                          : theme.palette.mode === 'dark'
                            ? `${theme.palette.primary.main}25`
                            : `${teamColors[fixture.team2]?.primary || theme.palette.primary.main}20`,
                        borderWidth: 2.5,
                        transform: 'translateY(-2px) scale(1.02)',
                        boxShadow: predictions[fixture.match] === fixture.team2
                          ? `0 10px 30px ${teamColors[fixture.team2]?.primary || theme.palette.primary.main}50`
                          : `0 6px 20px ${teamColors[fixture.team2]?.primary || theme.palette.primary.main}30`,
                      },
                      '&:active': {
                        transform: 'translateY(0) scale(0.98)',
                      },
                    }}
                  >
                    {fixture.team2}
                  </Button>
                )}
              </Box>
              <Button
                variant="text"
                color="secondary"
                size="small"
                onClick={() => toggleDetails(fixture.match)}
                endIcon={detailsOpen[fixture.match] ? <ExpandLess /> : <ExpandMore />}
                sx={{ mt: 2 }}
              >
                Details
              </Button>
              <Collapse in={detailsOpen[fixture.match]}>
                <Box 
                  mt={2} 
                  p={2} 
                  borderRadius={2}
                  sx={{
                    bgcolor: theme.palette.mode === 'dark' 
                      ? 'rgba(255,255,255,0.05)' 
                      : '#f5f5f5'
                  }}
                >
                  <Typography variant="body2" color="text.primary">
                    <strong>✨ AI Prediction:</strong> {fixture.aiPrediction}
                  </Typography>
                  <Typography variant="body2" color="text.primary">
                    <strong>📍 Venue:</strong> {fixture.venue}
                  </Typography>
                </Box>
              </Collapse>
            </Paper>
            </Box>
          );
        })}
      </TabPanel>

      {/* Bonus Picks Tab */}
      <TabPanel value={tabValue} index={1}>
        <Box my={4}>
          <Typography variant="h5" gutterBottom>
            Bonus Questions
          </Typography>

          {/* AI Predictions Button for Bonus */}
          {!isGroupStagePastDeadline && config.features.bonusQuestionsEnabled && (
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
              <Button
                variant="contained"
                onClick={handleOpenAiDialog}
                startIcon={<AutoAwesomeIcon />}
                sx={{
                  background: 'linear-gradient(135deg, #FF9100 0%, #02A7D1 100%)',
                  color: 'white',
                  fontWeight: 700,
                  px: 3,
                  py: 1.5,
                  borderRadius: 3,
                  boxShadow: '0 4px 16px rgba(255, 145, 0, 0.4)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #F57C00 0%, #0288D1 100%)',
                    transform: 'scale(1.02)',
                    boxShadow: '0 6px 20px rgba(255, 145, 0, 0.5)',
                  },
                  transition: 'all 0.3s ease-in-out',
                }}
              >
                Use AI Predictions
              </Button>
            </Box>
          )}

          {bonusQuestions.map((question) => (
            <Box key={question} mb={2}>
              <TextField
                fullWidth
                label={question}
                value={bonusAnswers[question] || ""}
                onChange={(e) =>
                  setBonusAnswers((prev) => ({
                    ...prev,
                    [question]: e.target.value,
                  }))
                }
                disabled={locked}
              />
              <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 0.5 }}>
                AI Prediction: {bonusPredictions[question]}
              </Typography>
            </Box>
          ))}
        </Box>
      </TabPanel>

      {/* Super 8 Tab */}
      {showSuper4Tab && <TabPanel value={tabValue} index={2}>
        {/* Draft Status Banner */}
        {submissionStatus.super8 === 'DRAFT' && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            You have an incomplete draft. Complete all picks and submit before deadline.
            {lastSaved && (
              <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                Last saved: {lastSaved.toLocaleString()}
              </Typography>
            )}
          </Alert>
        )}

        {submissionStatus.super8 === 'SUBMITTED' && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Your Super 8 bracket has been submitted! You can still update it before the deadline.
          </Alert>
        )}

        {/* Progress Indicator - Fixed at top */}
        {!isPlayoffsPastDeadline && (
          <Box
            sx={{
              position: 'fixed',
              top: { xs: 104, sm: 112 }, // Below app bar + deadline counter
              left: 0,
              right: 0,
              zIndex: 1000,
              bgcolor: 'background.paper',
              py: 1,
              px: { xs: 2, sm: 3 },
              borderBottom: '1px solid',
              borderColor: 'divider',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              backdropFilter: 'blur(10px)',
              backgroundColor: theme.palette.mode === 'dark'
                ? 'rgba(30, 30, 30, 0.95)'
                : 'rgba(255, 255, 255, 0.95)',
            }}
          >
            <Box sx={{ maxWidth: 'sm', mx: 'auto' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                  Progress: {Object.keys(playoffsPredictions).length} of {playoffsFixtures.length} picks
                </Typography>
                <Typography variant="caption" color="text.secondary" fontWeight="bold">
                  {Math.round((Object.keys(playoffsPredictions).length / playoffsFixtures.length) * 100)}%
                </Typography>
              </Box>
              <Box sx={{ width: '100%', height: { xs: 6, sm: 8 }, bgcolor: 'action.hover', borderRadius: 1 }}>
                <Box
                  sx={{
                    width: `${(Object.keys(playoffsPredictions).length / playoffsFixtures.length) * 100}%`,
                    height: '100%',
                    bgcolor: 'primary.main',
                    borderRadius: 1,
                    transition: 'width 0.3s ease-in-out'
                  }}
                />
              </Box>
            </Box>
          </Box>
        )}

        {/* Spacer to prevent content from going under fixed progress bar */}
        {!isPlayoffsPastDeadline && <Box sx={{ height: 68 }} />}

        {playoffsFixtures.map((fixture) => {
          const matchInfo = getPhaseForMatch(fixture.match) || {
            name: 'Match',
            color: '#FF6F00',
            icon: '🟡'
          };

          return (
            <Box 
              key={fixture.match}
              sx={{
                width: '100%',
                maxWidth: '100%',
                overflow: 'hidden',
                px: { xs: 0.5, sm: 0 },
                boxSizing: 'border-box'
              }}
            >
              <Paper sx={{ 
                p: { xs: 0.8, sm: 3 }, 
                mx: { xs: 0, sm: 0 },
                my: { xs: 1, sm: 3 }, 
                textAlign: 'center', 
                borderRadius: { xs: 2, sm: 3 },
                boxShadow: theme.palette.mode === 'dark' 
                  ? '0 4px 20px rgba(0,0,0,0.3)' 
                  : '0 4px 20px rgba(0,0,0,0.1)',
                background: theme.palette.mode === 'dark'
                  ? 'linear-gradient(135deg, #2A2A2A 0%, #1E1E1E 100%)'
                  : 'linear-gradient(135deg, #FAFAFA 0%, #F5F5F5 100%)',
                transition: 'all 0.3s ease-in-out',
                width: { xs: '100%', sm: 'auto' },
                maxWidth: { xs: '100%', sm: 'none' },
                overflow: 'hidden',
                boxSizing: 'border-box',
                position: 'relative',
                '&:hover': {
                  boxShadow: theme.palette.mode === 'dark'
                    ? '0 8px 30px rgba(0,0,0,0.4)'
                    : '0 8px 30px rgba(0,0,0,0.15)',
                  transform: { xs: 'none', sm: 'translateY(-2px)' },
                },
              }}>
                <Box 
                  display="flex" 
                  justifyContent="space-between" 
                  alignItems="center" 
                  mb={2}
                  sx={{
                    width: '100%',
                    maxWidth: '100%',
                    overflow: 'hidden',
                    px: { xs: 0, sm: 0 }
                  }}
                >
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      fontWeight: 700, 
                      flex: 1,
                      fontSize: { xs: '1rem', sm: '1.25rem' },
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Match {fixture.match} - {fixture.date}
                  </Typography>
                  <Chip 
                    label={`${matchInfo.icon} ${matchInfo.name}`}
                    size="small"
                    sx={{ 
                      backgroundColor: matchInfo.color,
                      color: 'white',
                      fontWeight: 600,
                      fontSize: { xs: '0.7rem', sm: '0.8rem' },
                      height: { xs: 24, sm: 32 },
                      px: { xs: 0.5, sm: 1 },
                      flexShrink: 0,
                      ml: { xs: 0.5, sm: 1 }
                    }}
                  />
                </Box>
                <Box 
                  sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    gap: { xs: 0.5, sm: 2 },
                    alignItems: { xs: 'stretch', sm: 'center' },
                    justifyContent: { xs: 'stretch', sm: 'center' },
                    width: '100%',
                    maxWidth: '100%',
                    px: { xs: 0, sm: 1 },
                    overflow: 'hidden',
                  }}
                >
                  <Button
                    variant={playoffsPredictions[fixture.match] === fixture.team1 ? "contained" : "outlined"}
                    onClick={() => handlePlayoffsSelection(fixture.match, fixture.team1)}
                    disabled={isPlayoffsPastDeadline}
                    sx={{
                      width: { xs: '100%', sm: 'auto' },
                      minWidth: { xs: 'auto', sm: 120 },
                      maxWidth: { xs: '100%', sm: 'none' },
                      height: { xs: 42, sm: 48 },
                      borderRadius: { xs: 2, sm: 3 },
                      fontWeight: 600,
                      fontSize: { xs: '0.8rem', sm: '1rem' },
                      px: { xs: 1, sm: 2 },
                      boxSizing: 'border-box',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      backgroundColor: playoffsPredictions[fixture.match] === fixture.team1 
                        ? teamColors[fixture.team1]?.primary || theme.palette.primary.main
                        : 'transparent',
                      color: playoffsPredictions[fixture.match] === fixture.team1
                        ? teamColors[fixture.team1]?.secondary || 'white'
                        : theme.palette.mode === 'dark' 
                          ? theme.palette.text.primary
                          : teamColors[fixture.team1]?.primary || theme.palette.primary.main,
                      borderColor: theme.palette.mode === 'dark'
                        ? theme.palette.primary.main
                        : teamColors[fixture.team1]?.primary || theme.palette.primary.main,
                      borderWidth: 2,
                      '&:hover': {
                        backgroundColor: playoffsPredictions[fixture.match] === fixture.team1
                          ? teamColors[fixture.team1]?.primary || theme.palette.primary.main
                          : theme.palette.mode === 'dark'
                            ? `${theme.palette.primary.main}20`
                            : `${teamColors[fixture.team1]?.primary || theme.palette.primary.main}15`,
                        borderWidth: 2,
                      },
                    }}
                  >
                    {fixture.team1}
                  </Button>
                  <Typography 
                    variant="body1" 
                    sx={{ 
                      fontWeight: 'bold', 
                      color: 'text.secondary', 
                      mx: { xs: 0, sm: 2 },
                      my: { xs: 0.3, sm: 0 },
                      fontSize: { xs: '0.9rem', sm: '1.5rem' },
                      textAlign: 'center',
                      minHeight: { xs: 'auto', sm: 'auto' }
                    }}
                  >
                    vs
                  </Typography>
                  <Button
                    variant={playoffsPredictions[fixture.match] === fixture.team2 ? "contained" : "outlined"}
                    onClick={() => handlePlayoffsSelection(fixture.match, fixture.team2)}
                    disabled={isPlayoffsPastDeadline}
                    sx={{
                      width: { xs: '100%', sm: 'auto' },
                      minWidth: { xs: 'auto', sm: 120 },
                      maxWidth: { xs: '100%', sm: 'none' },
                      height: { xs: 42, sm: 48 },
                      borderRadius: { xs: 2, sm: 3 },
                      fontWeight: 600,
                      fontSize: { xs: '0.8rem', sm: '1rem' },
                      px: { xs: 1, sm: 2 },
                      boxSizing: 'border-box',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      backgroundColor: playoffsPredictions[fixture.match] === fixture.team2 
                        ? teamColors[fixture.team2]?.primary || theme.palette.primary.main
                        : 'transparent',
                      color: playoffsPredictions[fixture.match] === fixture.team2
                        ? teamColors[fixture.team2]?.secondary || 'white'
                        : theme.palette.mode === 'dark' 
                          ? theme.palette.text.primary
                          : teamColors[fixture.team2]?.primary || theme.palette.primary.main,
                      borderColor: theme.palette.mode === 'dark'
                        ? theme.palette.primary.main
                        : teamColors[fixture.team2]?.primary || theme.palette.primary.main,
                      borderWidth: 2,
                      '&:hover': {
                        backgroundColor: playoffsPredictions[fixture.match] === fixture.team2
                          ? teamColors[fixture.team2]?.primary || theme.palette.primary.main
                          : theme.palette.mode === 'dark'
                            ? `${theme.palette.primary.main}20`
                            : `${teamColors[fixture.team2]?.primary || theme.palette.primary.main}15`,
                        borderWidth: 2,
                      },
                    }}
                  >
                    {fixture.team2}
                  </Button>
                </Box>
                <Button
                  variant="text"
                  color="secondary"
                  size="small"
                  onClick={() => toggleDetails(fixture.match)}
                  endIcon={detailsOpen[fixture.match] ? <ExpandLess /> : <ExpandMore />}
                  sx={{ mt: 2 }}
                >
                  Details
                </Button>
                <Collapse in={detailsOpen[fixture.match]}>
                  <Box 
                    mt={2} 
                    p={2} 
                    borderRadius={2}
                    sx={{
                      bgcolor: theme.palette.mode === 'dark' 
                        ? 'rgba(255,255,255,0.05)' 
                        : '#f5f5f5'
                    }}
                  >
                    <Typography variant="body2" color="text.primary">
                      <strong>✨ AI Prediction:</strong> {fixture.aiPrediction}
                    </Typography>
                    <Typography variant="body2" color="text.primary">
                      <strong>📍 Venue:</strong> {fixture.venue}
                    </Typography>
                  </Box>
                </Collapse>
              </Paper>
            </Box>
          );
        })}
      </TabPanel>}

      {/* Finals Tab */}
      {showFinalsTab && <TabPanel value={tabValue} index={3}>
        {/* Draft Status Banner */}
        {submissionStatus.finals === 'DRAFT' && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            You have an incomplete draft. Complete all picks and submit before deadline.
            {lastSaved && (
              <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                Last saved: {lastSaved.toLocaleString()}
              </Typography>
            )}
          </Alert>
        )}

        {submissionStatus.finals === 'SUBMITTED' && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Your finals bracket has been submitted! You can still update it before the deadline.
          </Alert>
        )}

        {/* Progress Indicator - Fixed at top */}
        {!isFinalsPastDeadline && finalsFixtures.length > 0 && (
          <Box
            sx={{
              position: 'fixed',
              top: { xs: 104, sm: 112 }, // Below app bar + deadline counter
              left: 0,
              right: 0,
              zIndex: 1000,
              bgcolor: 'background.paper',
              py: 1,
              px: { xs: 2, sm: 3 },
              borderBottom: '1px solid',
              borderColor: 'divider',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              backdropFilter: 'blur(10px)',
              backgroundColor: theme.palette.mode === 'dark'
                ? 'rgba(30, 30, 30, 0.95)'
                : 'rgba(255, 255, 255, 0.95)',
            }}
          >
            <Box sx={{ maxWidth: 'sm', mx: 'auto' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                  Progress: {Object.keys(finalsPredictions).length} of {finalsFixtures.length} picks
                </Typography>
                <Typography variant="caption" color="text.secondary" fontWeight="bold">
                  {Math.round((Object.keys(finalsPredictions).length / finalsFixtures.length) * 100)}%
                </Typography>
              </Box>
              <Box sx={{ width: '100%', height: { xs: 6, sm: 8 }, bgcolor: 'action.hover', borderRadius: 1 }}>
                <Box
                  sx={{
                    width: `${(Object.keys(finalsPredictions).length / finalsFixtures.length) * 100}%`,
                    height: '100%',
                    bgcolor: 'primary.main',
                    borderRadius: 1,
                    transition: 'width 0.3s ease-in-out'
                  }}
                />
              </Box>
            </Box>
          </Box>
        )}

        {/* Spacer to prevent content from going under fixed progress bar */}
        {!isFinalsPastDeadline && finalsFixtures.length > 0 && <Box sx={{ height: 68 }} />}

        {(!finalsFixtures[0].team1 || !finalsFixtures[0].team2) ? (
          <Typography variant="body1">Finals are not available yet.</Typography>
        ) : (
          finalsFixtures.map((fixture) => (
            <Paper key={fixture.match} sx={{ p: 2, my: 2, textAlign: 'center', borderRadius: 2 }}>
              <Typography variant="h6" gutterBottom>
                Match {fixture.match} - {fixture.date}
              </Typography>
              <Box display="flex" justifyContent="center" gap={2}>
                <Button
                  variant={finalsPredictions[fixture.match] === fixture.team1 ? "contained" : "outlined"}
                  onClick={() => handleFinalsSelection(fixture.match, fixture.team1)}
                  disabled={isFinalsPastDeadline}
                >
                  {fixture.team1}
                </Button>
                <Button
                  variant={finalsPredictions[fixture.match] === fixture.team2 ? "contained" : "outlined"}
                  onClick={() => handleFinalsSelection(fixture.match, fixture.team2)}
                  disabled={isFinalsPastDeadline}
                >
                  {fixture.team2}
                </Button>
              </Box>
              <Button
                variant="text"
                color="secondary"
                size="small"
                onClick={() => toggleDetails(fixture.match)}
                endIcon={detailsOpen[fixture.match] ? <ExpandLess /> : <ExpandMore />}
                sx={{ mt: 1 }}
              >
                Details
              </Button>
              <Collapse in={detailsOpen[fixture.match]}>
                <Box 
                  mt={2} 
                  p={2} 
                  borderRadius={2}
                  sx={{
                    bgcolor: theme.palette.mode === 'dark' 
                      ? 'rgba(255,255,255,0.05)' 
                      : '#f5f5f5'
                  }}
                >
                  <Typography variant="body2" color="text.primary">
                    <strong>✨ AI Prediction:</strong> {fixture.aiPrediction}
                  </Typography>
                  <Typography variant="body2" color="text.primary">
                    <strong>📍 Venue:</strong> {fixture.venue}
                  </Typography>
                </Box>
              </Collapse>
            </Paper>
          ))
        )}
      </TabPanel>}

      {/* Save Draft Button - only show if not submitted */}
      {((tabValue === 0 || tabValue === 1) && submissionStatus.groupStage !== 'SUBMITTED' && !isGroupStagePastDeadline) && (
        <Tooltip title="Save incomplete picks" arrow>
          <Fab
            variant="extended"
            onClick={() => handleSaveDraft('group-stage')}
            disabled={isSubmitting}
            sx={{
              position: 'fixed',
              bottom: 90,
              right: 16,
              zIndex: 1000,
              background: 'linear-gradient(135deg, #FF9100 0%, #02A7D1 100%)',
              color: 'white',
              fontWeight: 700,
              px: 3,
              borderRadius: 6,
              boxShadow: '0 8px 24px rgba(255, 145, 0, 0.35)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                background: 'linear-gradient(135deg, #E68100 0%, #0196C0 100%)',
                transform: 'translateY(-3px) scale(1.05)',
                boxShadow: '0 12px 32px rgba(255, 145, 0, 0.45)',
              },
              '&:active': {
                transform: 'translateY(-1px) scale(1.02)',
              },
            }}
          >
            {isSubmitting ? <CircularProgress size={24} color="inherit" /> : <SaveIcon sx={{ mr: 1 }} />}
            Save Draft
          </Fab>
        </Tooltip>
      )}

      {(tabValue === 2 && submissionStatus.super8 !== 'SUBMITTED' && !isPlayoffsPastDeadline) && (
        <Tooltip title="Save incomplete picks" arrow>
          <Fab
            variant="extended"
            onClick={() => handleSaveDraft('super8')}
            disabled={isSubmitting}
            sx={{
              position: 'fixed',
              bottom: 90,
              right: 16,
              zIndex: 1000,
              background: 'linear-gradient(135deg, #FF9100 0%, #02A7D1 100%)',
              color: 'white',
              fontWeight: 700,
              px: 3,
              borderRadius: 6,
              boxShadow: '0 8px 24px rgba(255, 145, 0, 0.35)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                background: 'linear-gradient(135deg, #E68100 0%, #0196C0 100%)',
                transform: 'translateY(-3px) scale(1.05)',
                boxShadow: '0 12px 32px rgba(255, 145, 0, 0.45)',
              },
              '&:active': {
                transform: 'translateY(-1px) scale(1.02)',
              },
            }}
          >
            {isSubmitting ? <CircularProgress size={24} color="inherit" /> : <SaveIcon sx={{ mr: 1 }} />}
            Save Draft
          </Fab>
        </Tooltip>
      )}

      {((showFinalsTab && tabValue === (showSemifinalsTab ? 4 : 3)) && submissionStatus.finals !== 'SUBMITTED' && !isFinalsPastDeadline) && (
        <Tooltip title="Save incomplete picks" arrow>
          <Fab
            variant="extended"
            onClick={() => handleSaveDraft('finals')}
            disabled={isSubmitting}
            sx={{
              position: 'fixed',
              bottom: 90,
              right: 16,
              zIndex: 1000,
              background: 'linear-gradient(135deg, #FF9100 0%, #02A7D1 100%)',
              color: 'white',
              fontWeight: 700,
              px: 3,
              borderRadius: 6,
              boxShadow: '0 8px 24px rgba(255, 145, 0, 0.35)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                background: 'linear-gradient(135deg, #E68100 0%, #0196C0 100%)',
                transform: 'translateY(-3px) scale(1.05)',
                boxShadow: '0 12px 32px rgba(255, 145, 0, 0.45)',
              },
              '&:active': {
                transform: 'translateY(-1px) scale(1.02)',
              },
            }}
          >
            {isSubmitting ? <CircularProgress size={24} color="inherit" /> : <SaveIcon sx={{ mr: 1 }} />}
            Save Draft
          </Fab>
        </Tooltip>
      )}

      <Fab
        variant="extended"
        onClick={handleSubmit}
        disabled={isSubmitting || (locked && (tabValue === 0 || tabValue === 1))}
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          zIndex: 1000,
          background: 'linear-gradient(135deg, #10044A 0%, #1C5D9C 50%, #DA2C5A 100%)',
          color: '#ffffff',
          fontWeight: 700,
          px: 4,
          py: 1.5,
          borderRadius: 6,
          boxShadow: '0 12px 32px rgba(16, 4, 74, 0.4)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          border: '2px solid rgba(255, 145, 0, 0.3)',
          '&:hover': {
            background: 'linear-gradient(135deg, #0A0228 0%, #133A75 50%, #C02050 100%)',
            transform: 'translateY(-4px) scale(1.05)',
            boxShadow: '0 16px 40px rgba(16, 4, 74, 0.5), 0 0 20px rgba(255, 145, 0, 0.3)',
            borderColor: 'rgba(255, 145, 0, 0.6)',
          },
          '&:active': {
            transform: 'translateY(-2px) scale(1.02)',
          },
          '&:disabled': {
            background: 'linear-gradient(135deg, #B0BEC5 0%, #90A4AE 100%)',
            color: '#ECEFF1',
            boxShadow: 'none',
            borderColor: 'transparent',
          },
        }}
      >
        {isSubmitting ? <CircularProgress size={24} color="inherit" /> : <SendIcon sx={{ mr: 1 }} />}
        {getSubmitButtonLabel()}
      </Fab>

      {snackbars.map((snackbar, index) => (
        <Snackbar
          key={snackbar.id}
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={() => handleSnackbarClose(snackbar.id)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          sx={{ 
            bottom: `${16 + (index * 72)}px !important` // Stack snackbars vertically
          }}
        >
          <Alert onClose={() => handleSnackbarClose(snackbar.id)} severity={snackbar.severity} sx={{ width: '100%' }}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      ))}

      <Dialog open={showDeadlinePopup} onClose={handlePopupCancel}>
        <DialogTitle>Submission Deadline Passed</DialogTitle>
        <DialogContent>
          <DialogContentText>
            The deadline for the bracket submission has passed. Remember that your submission will incur a penalty.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handlePopupCancel} variant="contained" color="error">
            Cancel
          </Button>
          <Button onClick={handlePopupContinue} variant="contained" color="success">
            Continue
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default BracketSubmission;