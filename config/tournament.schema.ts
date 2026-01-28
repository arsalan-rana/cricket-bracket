// Tournament Configuration Schema
// This file defines the TypeScript interfaces for tournament configuration.

/**
 * A phase of the tournament (e.g., Group Stage, Super 4, Finals)
 */
export interface TournamentPhase {
  /** Unique identifier for this phase (e.g., 'group-stage', 'super4', 'finals') */
  id: string;
  /** Display name (e.g., 'Group Stage', 'Super 4', 'Finals') */
  name: string;
  /** Name of the Google Sheet tab for this phase's predictions */
  sheetName: string;
  /** Range of match numbers in this phase */
  matchRange: {
    start: number;
    end: number;
  };
  /** ISO 8601 deadline string (e.g., '2025-09-09T10:30:00') */
  deadline: string;
  /** How scoring works: 'fixed' = points per correct pick, 'pool' = split pool among winners */
  scoringType: 'fixed' | 'pool';
  /** Points awarded per correct pick (only for scoringType: 'fixed') */
  pointsPerCorrect?: number;
  /** Total pool to split among winners (only for scoringType: 'pool') */
  poolSize?: number;
  /** Points awarded for a draw result */
  drawPoints?: number;
}

/**
 * A fixture/match in the tournament
 */
export interface Fixture {
  /** Match number (1-indexed) */
  match: number;
  /** Display date (e.g., '9 September') */
  date: string;
  /** First team name */
  team1: string;
  /** Second team name */
  team2: string;
  /** Venue description */
  venue: string;
  /** AI's predicted winner (optional) */
  aiPrediction?: string;
  /** Phase ID this fixture belongs to */
  phase: string;
}

/**
 * A bonus question for the tournament
 */
export interface BonusQuestion {
  /** Unique identifier */
  id: string;
  /** The question text */
  question: string;
  /** AI's predicted answer (optional) */
  aiPrediction?: string;
}

/**
 * Styling for a team
 */
export interface TeamStyle {
  /** Primary color (hex) */
  primary: string;
  /** Secondary color (hex) */
  secondary: string;
  /** Flag emoji (optional) */
  flag?: string;
}

/**
 * Scoring rules for the tournament
 */
export interface ScoringRules {
  /** Points deducted per day of late submission */
  latePenaltyPerDay: number;
  /** Maximum bonus points cap for late submissions */
  bonusPointsCap: number;
  /** Points awarded per correct bonus question */
  bonusPointsPerCorrect: number;
}

/**
 * Google Sheets configuration
 */
export interface SheetsConfig {
  /** Sheet name for group stage predictions */
  predictionsOverview: string;
  /** Sheet name for Super 4 predictions */
  super4: string;
  /** Sheet name for semi-finals predictions */
  semifinals?: string;
  /** Sheet name for finals predictions */
  finals: string;
  /** Sheet name for bonus predictions */
  bonusesOverview: string;
  /** Sheet name for activity log */
  activityLog: string;
  /** Sheet name for submission links/timestamps */
  links: string;
  /** Sheet name for leaderboard snapshot */
  leaderboard: string;
  /** Sheet name for chips tracking */
  chips: string;
  /** Sheet name for fixtures data (optional - if fetching from sheets) */
  fixtures?: string;
}

/**
 * Feature flags for the tournament
 */
export interface FeatureFlags {
  /** Whether chips (Double Up, Wildcard) are enabled */
  chipsEnabled: boolean;
  /** Whether bonus questions are enabled */
  bonusQuestionsEnabled: boolean;
  /** Whether to show AI predictions */
  aiPredictionsEnabled: boolean;
  /** Whether to fetch fixtures from Google Sheets (vs using config) */
  fetchFixturesFromSheets: boolean;
}

/**
 * Complete tournament configuration
 */
export interface TournamentConfig {
  /** Unique tournament identifier */
  id: string;
  /** Tournament display name */
  name: string;
  /** Tournament year */
  year: number;
  /** Timezone for deadlines (IANA format, e.g., 'America/New_York') */
  timezone: string;
  /** Default fixture start time (HH:mm format, e.g., '18:30') */
  fixtureStartTime: string;

  /** Tournament phases configuration */
  phases: TournamentPhase[];

  /** Fixtures (fallback if not fetching from sheets) */
  fixtures: Fixture[];

  /** Bonus questions */
  bonusQuestions: BonusQuestion[];

  /** Team styling (colors and flags) */
  teams: {
    [teamName: string]: TeamStyle;
  };

  /** Scoring rules */
  scoring: ScoringRules;

  /** Google Sheets configuration */
  sheets: SheetsConfig;

  /** Feature flags */
  features: FeatureFlags;
}
