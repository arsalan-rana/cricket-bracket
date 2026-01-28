import { DateTime } from 'luxon';
import {
  TournamentConfig,
  TournamentPhase,
  Fixture,
  BonusQuestion,
  TeamStyle,
} from '@/config/tournament.schema';
import t20WorldCup2026Config from '@/config/t20-world-cup-2026';

// Export the current tournament config
// To switch tournaments, change this import
let currentConfig: TournamentConfig = t20WorldCup2026Config;

/**
 * Get the current tournament configuration
 */
export function getConfig(): TournamentConfig {
  return currentConfig;
}

/**
 * Set the tournament configuration (useful for testing or dynamic config)
 */
export function setConfig(config: TournamentConfig): void {
  currentConfig = config;
}

/**
 * Get a phase by its ID
 */
export function getPhase(phaseId: string): TournamentPhase | undefined {
  return currentConfig.phases.find((p) => p.id === phaseId);
}

/**
 * Get the deadline for a phase as a Luxon DateTime
 */
export function getDeadline(phaseId: string): DateTime {
  const phase = getPhase(phaseId);
  if (!phase) {
    throw new Error(`Phase not found: ${phaseId}`);
  }
  return DateTime.fromISO(phase.deadline, { zone: currentConfig.timezone });
}

/**
 * Get all deadlines as a map of phase ID to DateTime
 */
export function getAllDeadlines(): Record<string, DateTime> {
  const deadlines: Record<string, DateTime> = {};
  for (const phase of currentConfig.phases) {
    deadlines[phase.id] = DateTime.fromISO(phase.deadline, {
      zone: currentConfig.timezone,
    });
  }
  return deadlines;
}

/**
 * Check if a phase is currently open for submissions
 */
export function isPhaseOpen(phaseId: string): boolean {
  const deadline = getDeadline(phaseId);
  const now = DateTime.now().setZone(currentConfig.timezone);
  return now < deadline;
}

/**
 * Check if a phase deadline has passed
 */
export function isPhasePastDeadline(phaseId: string): boolean {
  return !isPhaseOpen(phaseId);
}

/**
 * Get the current active phase (the one whose deadline hasn't passed yet)
 */
export function getCurrentPhase(): TournamentPhase | null {
  const now = DateTime.now().setZone(currentConfig.timezone);
  for (const phase of currentConfig.phases) {
    const deadline = DateTime.fromISO(phase.deadline, {
      zone: currentConfig.timezone,
    });
    if (now < deadline) {
      return phase;
    }
  }
  return null; // All phases have passed
}

/**
 * Get fixtures for a specific phase
 */
export function getFixturesForPhase(phaseId: string): Fixture[] {
  return currentConfig.fixtures.filter((f) => f.phase === phaseId);
}

/**
 * Get all fixtures
 */
export function getAllFixtures(): Fixture[] {
  return currentConfig.fixtures;
}

/**
 * Get a fixture by match number
 */
export function getFixture(matchNumber: number): Fixture | undefined {
  return currentConfig.fixtures.find((f) => f.match === matchNumber);
}

/**
 * Calculate the row offset for a phase (for Google Sheets writes)
 * The offset is the number to subtract from match number to get row index
 */
export function getMatchOffset(phaseId: string): number {
  const phase = getPhase(phaseId);
  if (!phase) {
    throw new Error(`Phase not found: ${phaseId}`);
  }
  return phase.matchRange.start - 1;
}

/**
 * Get phase ID for a given match number
 */
export function getPhaseForMatch(matchNumber: number): TournamentPhase | undefined {
  return currentConfig.phases.find(
    (p) => matchNumber >= p.matchRange.start && matchNumber <= p.matchRange.end
  );
}

/**
 * Get team styling (colors and flag)
 */
export function getTeamStyle(teamName: string): TeamStyle | undefined {
  return currentConfig.teams[teamName];
}

/**
 * Get team colors only
 */
export function getTeamColors(teamName: string): { primary: string; secondary: string } | undefined {
  const style = currentConfig.teams[teamName];
  if (!style) return undefined;
  return { primary: style.primary, secondary: style.secondary };
}

/**
 * Get team flag emoji
 */
export function getTeamFlag(teamName: string): string | undefined {
  return currentConfig.teams[teamName]?.flag;
}

/**
 * Get all team colors as a map
 */
export function getAllTeamColors(): { [key: string]: { primary: string; secondary: string } } {
  const colors: { [key: string]: { primary: string; secondary: string } } = {};
  for (const [team, style] of Object.entries(currentConfig.teams)) {
    colors[team] = { primary: style.primary, secondary: style.secondary };
  }
  return colors;
}

/**
 * Get all team flags as a map
 */
export function getAllTeamFlags(): { [key: string]: string } {
  const flags: { [key: string]: string } = {};
  for (const [team, style] of Object.entries(currentConfig.teams)) {
    if (style.flag) {
      flags[team] = style.flag;
    }
  }
  return flags;
}

/**
 * Get bonus questions
 */
export function getBonusQuestions(): BonusQuestion[] {
  return currentConfig.bonusQuestions;
}

/**
 * Get bonus questions as string array (for backward compatibility)
 */
export function getBonusQuestionStrings(): string[] {
  return currentConfig.bonusQuestions.map((q) => q.question);
}

/**
 * Get AI predictions for bonus questions as a map
 */
export function getBonusPredictions(): { [key: string]: string } {
  const predictions: { [key: string]: string } = {};
  for (const q of currentConfig.bonusQuestions) {
    if (q.aiPrediction) {
      predictions[q.question] = q.aiPrediction;
    }
  }
  return predictions;
}

/**
 * Get the fixture start time for a given fixture
 */
export function getFixtureStartTime(fixture: Fixture): Date {
  const [time] = currentConfig.fixtureStartTime.split(':');
  const hours = parseInt(time, 10);
  const minutes = parseInt(currentConfig.fixtureStartTime.split(':')[1], 10);

  const dt = DateTime.fromFormat(
    `${fixture.date} ${currentConfig.year} ${currentConfig.fixtureStartTime}`,
    'd MMMM yyyy HH:mm',
    { zone: currentConfig.timezone }
  );
  return dt.toJSDate();
}

/**
 * Get scoring configuration for a phase
 */
export function getPhaseScoring(phaseId: string): {
  type: 'fixed' | 'pool';
  pointsPerCorrect?: number;
  poolSize?: number;
  drawPoints?: number;
} {
  const phase = getPhase(phaseId);
  if (!phase) {
    throw new Error(`Phase not found: ${phaseId}`);
  }
  return {
    type: phase.scoringType,
    pointsPerCorrect: phase.pointsPerCorrect,
    poolSize: phase.poolSize,
    drawPoints: phase.drawPoints,
  };
}

/**
 * Get global scoring rules
 */
export function getScoringRules() {
  return currentConfig.scoring;
}

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(
  feature: 'chipsEnabled' | 'bonusQuestionsEnabled' | 'aiPredictionsEnabled' | 'fetchFixturesFromSheets'
): boolean {
  return currentConfig.features[feature];
}

/**
 * Get sheet name for a specific purpose
 */
export function getSheetName(
  purpose:
    | 'predictionsOverview'
    | 'super4'
    | 'finals'
    | 'bonusesOverview'
    | 'activityLog'
    | 'links'
    | 'leaderboard'
    | 'chips'
    | 'fixtures'
): string {
  const name = currentConfig.sheets[purpose];
  if (!name) {
    throw new Error(`Sheet name not configured: ${purpose}`);
  }
  return name;
}

/**
 * Get sheet name for a phase
 */
export function getSheetNameForPhase(phaseId: string): string {
  const phase = getPhase(phaseId);
  if (!phase) {
    throw new Error(`Phase not found: ${phaseId}`);
  }
  return phase.sheetName;
}
