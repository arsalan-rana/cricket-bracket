// lib/sheets.ts
// Centralized Google Sheets range strings and utilities

import { getConfig, getSheetName } from './tournament';

/**
 * Sheet range strings with default data range
 * These are the full ranges used for reading/writing sheet data
 */
export const SHEET_RANGES = {
  get predictionsOverview() {
    return `${getSheetName('predictionsOverview')}!A1:Z1000`;
  },
  get super4() {
    return `${getSheetName('super4')}!A1:Z1000`;
  },
  get finals() {
    return `${getSheetName('finals')}!A1:Z1000`;
  },
  get bonusesOverview() {
    return `${getSheetName('bonusesOverview')}!A1:Z1000`;
  },
  get activityLog() {
    return `${getSheetName('activityLog')}!A:D`;
  },
  get links() {
    return `${getSheetName('links')}!A:B`;
  },
  get linksExtended() {
    return `${getSheetName('links')}!A:D`;
  },
  get leaderboard() {
    return `${getSheetName('leaderboard')}!A1:K1000`;
  },
  get leaderboardData() {
    return `${getSheetName('leaderboard')}!A2:K1000`;
  },
  get chips() {
    return `${getSheetName('chips')}!A:C`;
  },
  get fixtures() {
    const config = getConfig();
    if (config.sheets.fixtures) {
      return `${config.sheets.fixtures}!A1:Z100`;
    }
    return null;
  },
};

/**
 * Get a range for a specific sheet with custom column range
 */
export function getSheetRange(
  sheetName: string,
  columnRange: string = 'A1:Z1000'
): string {
  return `${sheetName}!${columnRange}`;
}

/**
 * Get the range for phase predictions
 */
export function getPredictionsRange(phaseId: string): string {
  switch (phaseId) {
    case 'group-stage':
      return SHEET_RANGES.predictionsOverview;
    case 'super4':
      return SHEET_RANGES.super4;
    case 'finals':
      return SHEET_RANGES.finals;
    default:
      throw new Error(`Unknown phase: ${phaseId}`);
  }
}

/**
 * Headers expected in prediction sheets
 */
export const PREDICTION_HEADERS = ['Date', 'Match', 'Team 1', 'Team 2', 'Winner', 'POTM'];

/**
 * Headers expected in leaderboard sheet
 */
export const LEADERBOARD_HEADERS = [
  'Rank',
  'Previous Rank',
  'Player',
  'Group Points',
  'Super4 Points',
  'Playoffs Points',
  'Bonus Points',
  'Total Points',
  'Penalty',
  'Timestamp',
  'Chips Used',
];

/**
 * Headers expected in chips sheet
 */
export const CHIPS_HEADERS = ['Player', 'DoubleUp', 'Wildcard'];

/**
 * Headers expected in links sheet
 */
export const LINKS_HEADERS = ['Players', 'Timestamp of submission'];

/**
 * Headers expected in activity log sheet
 */
export const ACTIVITY_LOG_HEADERS = ['Timestamp', 'EventType', 'User', 'Details'];

/**
 * Headers expected in fixtures sheet
 */
export const FIXTURES_HEADERS = ['Match', 'Date', 'Team1', 'Team2', 'Venue', 'Phase', 'AIPrediction'];

/**
 * System columns that are not player names in prediction sheets
 */
export const SYSTEM_COLUMNS = ['Date', 'Match', 'Team 1', 'Team 2', 'Winner', 'POTM'];
