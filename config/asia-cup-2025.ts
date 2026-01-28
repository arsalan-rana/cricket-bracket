import { TournamentConfig } from './tournament.schema';

/**
 * Asia Cup 2025 Tournament Configuration
 *
 * This is the single source of truth for all tournament-specific settings.
 * To create a new tournament, copy this file and update the values.
 */
export const asiaCup2025Config: TournamentConfig = {
  id: 'asia-cup-2025',
  name: 'Asia Cup 2025',
  year: 2025,
  timezone: 'America/New_York',
  fixtureStartTime: '18:30',

  phases: [
    {
      id: 'group-stage',
      name: 'Group Stage',
      sheetName: 'Predictions Overview',
      matchRange: { start: 1, end: 12 },
      deadline: '2025-09-09T10:30:00',
      scoringType: 'fixed',
      pointsPerCorrect: 10,
      drawPoints: 5,
    },
    {
      id: 'super4',
      name: 'Super 4',
      sheetName: 'Super 4',
      matchRange: { start: 13, end: 18 },
      deadline: '2025-09-20T10:30:00',
      scoringType: 'pool',
      poolSize: 160,
      drawPoints: 5,
    },
    {
      id: 'finals',
      name: 'Finals',
      sheetName: 'Finals',
      matchRange: { start: 19, end: 19 },
      deadline: '2025-09-28T10:30:00',
      scoringType: 'pool',
      poolSize: 260,
    },
  ],

  fixtures: [
    // Group Stage (matches 1-12)
    { match: 1, date: '9 September', team1: 'Afghanistan', team2: 'Hong Kong', venue: 'Sheikh Zayed Stadium, Abu Dhabi', aiPrediction: 'Afghanistan', phase: 'group-stage' },
    { match: 2, date: '10 September', team1: 'India', team2: 'UAE', venue: 'Dubai International Stadium, Dubai', aiPrediction: 'India', phase: 'group-stage' },
    { match: 3, date: '11 September', team1: 'Bangladesh', team2: 'Hong Kong', venue: 'Sheikh Zayed Stadium, Abu Dhabi', aiPrediction: 'Bangladesh', phase: 'group-stage' },
    { match: 4, date: '12 September', team1: 'Oman', team2: 'Pakistan', venue: 'Dubai International Stadium, Dubai', aiPrediction: 'Pakistan', phase: 'group-stage' },
    { match: 5, date: '13 September', team1: 'Bangladesh', team2: 'Sri Lanka', venue: 'Sheikh Zayed Stadium, Abu Dhabi', aiPrediction: 'Bangladesh', phase: 'group-stage' },
    { match: 6, date: '14 September', team1: 'India', team2: 'Pakistan', venue: 'Dubai International Stadium, Dubai', aiPrediction: 'India', phase: 'group-stage' },
    { match: 7, date: '15 September', team1: 'Hong Kong', team2: 'Sri Lanka', venue: 'Dubai International Stadium, Dubai', aiPrediction: 'Sri Lanka', phase: 'group-stage' },
    { match: 8, date: '15 September', team1: 'UAE', team2: 'Oman', venue: 'Sheikh Zayed Stadium, Abu Dhabi', aiPrediction: 'UAE', phase: 'group-stage' },
    { match: 9, date: '16 September', team1: 'Afghanistan', team2: 'Bangladesh', venue: 'Sheikh Zayed Stadium, Abu Dhabi', aiPrediction: 'Afghanistan', phase: 'group-stage' },
    { match: 10, date: '17 September', team1: 'UAE', team2: 'Pakistan', venue: 'Dubai International Stadium, Dubai', aiPrediction: 'Pakistan', phase: 'group-stage' },
    { match: 11, date: '18 September', team1: 'Afghanistan', team2: 'Sri Lanka', venue: 'Sheikh Zayed Stadium, Abu Dhabi', aiPrediction: 'Afghanistan', phase: 'group-stage' },
    { match: 12, date: '19 September', team1: 'India', team2: 'Oman', venue: 'Sheikh Zayed Stadium, Abu Dhabi', aiPrediction: 'India', phase: 'group-stage' },

    // Super 4 (matches 13-18)
    { match: 13, date: '20 September', team1: 'Sri Lanka', team2: 'Bangladesh', venue: 'Dubai International Stadium, Dubai', aiPrediction: 'Sri Lanka', phase: 'super4' },
    { match: 14, date: '21 September', team1: 'India', team2: 'Pakistan', venue: 'Dubai International Stadium, Dubai', aiPrediction: 'India', phase: 'super4' },
    { match: 15, date: '23 September', team1: 'Pakistan', team2: 'Sri Lanka', venue: 'Sheikh Zayed Stadium, Abu Dhabi', aiPrediction: 'Pakistan', phase: 'super4' },
    { match: 16, date: '24 September', team1: 'India', team2: 'Bangladesh', venue: 'Dubai International Stadium, Dubai', aiPrediction: 'India', phase: 'super4' },
    { match: 17, date: '25 September', team1: 'Pakistan', team2: 'Bangladesh', venue: 'Dubai International Stadium, Dubai', aiPrediction: 'Pakistan', phase: 'super4' },
    { match: 18, date: '26 September', team1: 'India', team2: 'Sri Lanka', venue: 'Dubai International Stadium, Dubai', aiPrediction: 'India', phase: 'super4' },

    // Finals (match 19)
    { match: 19, date: '28 September', team1: 'India', team2: 'Pakistan', venue: 'Dubai International Stadium, Dubai', aiPrediction: 'India', phase: 'finals' },
  ],

  bonusQuestions: [
    { id: 'top-scorer', question: "Tournament's Top Scorer", aiPrediction: 'Shubman Gill (India)' },
    { id: 'top-wicket-taker', question: "Tournament's Top Wicket-taker", aiPrediction: 'Rashid Khan (Afghanistan)' },
    { id: 'highest-team-score', question: 'Team with the Highest Single Match Score', aiPrediction: 'India' },
    { id: 'lowest-team-score', question: 'Team with the Lowest Single Match Score', aiPrediction: 'Hong Kong' },
    { id: 'most-sixes', question: 'Most Sixes by a Player', aiPrediction: 'Suryakumar Yadav (India)' },
    { id: 'most-centuries', question: 'Most Centuries by a Player', aiPrediction: 'Shubman Gill (India)' },
    { id: 'most-catches', question: 'Player with the Most Catches', aiPrediction: 'Suryakumar Yadav (India)' },
    { id: 'most-potm', question: 'Player with the Most Player-of-the-Match Awards', aiPrediction: 'Rashid Khan (Afghanistan)' },
    { id: 'best-economy', question: 'Best Bowling Economy (minimum 10 overs)', aiPrediction: 'Jasprit Bumrah (India)' },
    { id: 'highest-individual', question: 'Highest Individual Score', aiPrediction: 'Shubman Gill (India)' },
    { id: 'fastest-fifty', question: 'Fastest Fifty', aiPrediction: 'Abhishek Sharma (India)' },
    { id: 'fastest-century', question: 'Fastest Century', aiPrediction: 'Suryakumar Yadav (India)' },
    { id: 'player-of-tournament', question: 'Player of the Tournament', aiPrediction: 'Suryakumar Yadav (India)' },
  ],

  teams: {
    'New Zealand': { primary: '#000000', secondary: '#FFFFFF', flag: '🇳🇿' },
    'India': { primary: '#FF9933', secondary: '#138808', flag: '🇮🇳' },
    'Bangladesh': { primary: '#006A4E', secondary: '#F42A41', flag: '🇧🇩' },
    'Pakistan': { primary: '#00684A', secondary: '#FFFFFF', flag: '🇵🇰' },
    'South Africa': { primary: '#FFD100', secondary: '#007749', flag: '🇿🇦' },
    'Australia': { primary: '#FFD100', secondary: '#007749', flag: '🇦🇺' },
    'England': { primary: '#012169', secondary: '#C8102E', flag: '🇬🇧' },
    'Afghanistan': { primary: '#D32011', secondary: '#000000', flag: '🇦🇫' },
    'Sri Lanka': { primary: '#FFB300', secondary: '#0056B3', flag: '🇱🇰' },
    'Oman': { primary: '#EE2737', secondary: '#009639', flag: '🇴🇲' },
    'UAE': { primary: '#00732F', secondary: '#FF0000', flag: '🇦🇪' },
    'Hong Kong': { primary: '#DE2910', secondary: '#FFFFFF', flag: '🇭🇰' },
  },

  scoring: {
    latePenaltyPerDay: 10,
    bonusPointsCap: 30,
    bonusPointsPerCorrect: 10,
  },

  sheets: {
    predictionsOverview: 'Predictions Overview',
    super4: 'Super 4',
    finals: 'Finals',
    bonusesOverview: 'Bonuses Overview',
    activityLog: 'Activity Log',
    links: 'Links',
    leaderboard: 'Leaderboard',
    chips: 'Chips',
    fixtures: 'Fixtures', // New sheet for fixture data
  },

  features: {
    chipsEnabled: true,
    bonusQuestionsEnabled: true,
    aiPredictionsEnabled: true,
    fetchFixturesFromSheets: true,
  },
};

// Export as default for easy importing
export default asiaCup2025Config;
