import { TournamentConfig } from './tournament.schema';

/**
 * ICC Men's T20 World Cup 2026 Tournament Configuration
 *
 * Format:
 * - Group Stage: 40 matches (4 groups of 5 teams, Feb 7-20)
 * - Super 8s: 12 matches (2 groups of 4 teams, Feb 21 - Mar 1)
 * - Semi-Finals: 2 matches (Mar 3 & 5)
 * - Final: 1 match (Mar 8)
 */
export const t20WorldCup2026Config: TournamentConfig = {
  id: 't20-world-cup-2026',
  name: 'ICC T20 World Cup 2026',
  year: 2026,
  timezone: 'America/New_York',
  fixtureStartTime: '08:30', // Night matches in IST = morning EST

  phases: [
    {
      id: 'group-stage',
      name: 'Group Stage',
      sheetName: 'Predictions Overview',
      matchRange: { start: 1, end: 40 },
      deadline: '2026-02-07T00:29:00', // Before first match (Feb 7 12:30 AM EST)
      scoringType: 'fixed',
      pointsPerCorrect: 10,
      drawPoints: 5,
    },
    {
      id: 'super4',
      name: 'Super 8s',
      sheetName: 'Super 8',
      matchRange: { start: 41, end: 52 },
      deadline: '2026-02-21T08:00:00', // Before first Super 8 match
      scoringType: 'pool',
      poolSize: 160,
    },
    {
      id: 'semifinals',
      name: 'Semi-Finals',
      sheetName: 'Semi-Finals',
      matchRange: { start: 53, end: 54 },
      deadline: '2026-03-03T08:00:00', // Before first semi-final
      scoringType: 'pool',
      poolSize: 160,
    },
    {
      id: 'finals',
      name: 'Final',
      sheetName: 'Final',
      matchRange: { start: 55, end: 55 },
      deadline: '2026-03-08T08:00:00', // Before final
      scoringType: 'pool',
      poolSize: 260,
    },
  ],

  fixtures: [
    // ============ GROUP STAGE (Matches 1-40) ============

    // Day 1 - Feb 7
    { match: 1, date: '7 February', team1: 'Netherlands', team2: 'Pakistan', venue: 'Colombo (SSC)', aiPrediction: 'Pakistan', phase: 'group-stage' },
    { match: 2, date: '7 February', team1: 'Scotland', team2: 'West Indies', venue: 'Eden Gardens, Kolkata', aiPrediction: 'West Indies', phase: 'group-stage' },
    { match: 3, date: '7 February', team1: 'India', team2: 'USA', venue: 'Wankhede, Mumbai', aiPrediction: 'India', phase: 'group-stage' },

    // Day 2 - Feb 8
    { match: 4, date: '8 February', team1: 'Afghanistan', team2: 'New Zealand', venue: 'Chennai', aiPrediction: 'Afghanistan', phase: 'group-stage' },
    { match: 5, date: '8 February', team1: 'England', team2: 'Nepal', venue: 'Wankhede, Mumbai', aiPrediction: 'England', phase: 'group-stage' },
    { match: 6, date: '8 February', team1: 'Sri Lanka', team2: 'Ireland', venue: 'Colombo (RPS)', aiPrediction: 'Sri Lanka', phase: 'group-stage' },

    // Day 3 - Feb 9
    { match: 7, date: '9 February', team1: 'Italy', team2: 'Scotland', venue: 'Eden Gardens, Kolkata', aiPrediction: 'Scotland', phase: 'group-stage' },
    { match: 8, date: '9 February', team1: 'Oman', team2: 'Zimbabwe', venue: 'Colombo (SSC)', aiPrediction: 'Zimbabwe', phase: 'group-stage' },
    { match: 9, date: '9 February', team1: 'Canada', team2: 'South Africa', venue: 'Ahmedabad', aiPrediction: 'South Africa', phase: 'group-stage' },

    // Day 4 - Feb 10
    { match: 10, date: '10 February', team1: 'Namibia', team2: 'Netherlands', venue: 'Delhi', aiPrediction: 'Netherlands', phase: 'group-stage' },
    { match: 11, date: '10 February', team1: 'New Zealand', team2: 'UAE', venue: 'Chennai', aiPrediction: 'New Zealand', phase: 'group-stage' },
    { match: 12, date: '10 February', team1: 'Pakistan', team2: 'USA', venue: 'Colombo (SSC)', aiPrediction: 'Pakistan', phase: 'group-stage' },

    // Day 5 - Feb 11
    { match: 13, date: '11 February', team1: 'Afghanistan', team2: 'South Africa', venue: 'Ahmedabad', aiPrediction: 'South Africa', phase: 'group-stage' },
    { match: 14, date: '11 February', team1: 'Australia', team2: 'Ireland', venue: 'Colombo (RPS)', aiPrediction: 'Australia', phase: 'group-stage' },
    { match: 15, date: '11 February', team1: 'England', team2: 'West Indies', venue: 'Wankhede, Mumbai', aiPrediction: 'England', phase: 'group-stage' },

    // Day 6 - Feb 12
    { match: 16, date: '12 February', team1: 'Sri Lanka', team2: 'Oman', venue: 'Pallekele', aiPrediction: 'Sri Lanka', phase: 'group-stage' },
    { match: 17, date: '12 February', team1: 'Italy', team2: 'Nepal', venue: 'Wankhede, Mumbai', aiPrediction: 'Nepal', phase: 'group-stage' },
    { match: 18, date: '12 February', team1: 'India', team2: 'Namibia', venue: 'Delhi', aiPrediction: 'India', phase: 'group-stage' },

    // Day 7 - Feb 13
    { match: 19, date: '13 February', team1: 'Australia', team2: 'Zimbabwe', venue: 'Colombo (RPS)', aiPrediction: 'Australia', phase: 'group-stage' },
    { match: 20, date: '13 February', team1: 'Canada', team2: 'UAE', venue: 'Delhi', aiPrediction: 'Canada', phase: 'group-stage' },
    { match: 21, date: '13 February', team1: 'Netherlands', team2: 'USA', venue: 'Chennai', aiPrediction: 'Netherlands', phase: 'group-stage' },

    // Day 8 - Feb 14
    { match: 22, date: '14 February', team1: 'Ireland', team2: 'Oman', venue: 'Colombo (SSC)', aiPrediction: 'Ireland', phase: 'group-stage' },
    { match: 23, date: '14 February', team1: 'England', team2: 'Scotland', venue: 'Eden Gardens, Kolkata', aiPrediction: 'England', phase: 'group-stage' },
    { match: 24, date: '14 February', team1: 'New Zealand', team2: 'South Africa', venue: 'Ahmedabad', aiPrediction: 'South Africa', phase: 'group-stage' },

    // Day 9 - Feb 15
    { match: 25, date: '15 February', team1: 'Nepal', team2: 'West Indies', venue: 'Wankhede, Mumbai', aiPrediction: 'West Indies', phase: 'group-stage' },
    { match: 26, date: '15 February', team1: 'Namibia', team2: 'USA', venue: 'Chennai', aiPrediction: 'Namibia', phase: 'group-stage' },
    { match: 27, date: '15 February', team1: 'India', team2: 'Pakistan', venue: 'Colombo (RPS)', aiPrediction: 'India', phase: 'group-stage' },

    // Day 10 - Feb 16
    { match: 28, date: '16 February', team1: 'Afghanistan', team2: 'UAE', venue: 'Delhi', aiPrediction: 'Afghanistan', phase: 'group-stage' },
    { match: 29, date: '16 February', team1: 'England', team2: 'Italy', venue: 'Eden Gardens, Kolkata', aiPrediction: 'England', phase: 'group-stage' },
    { match: 30, date: '16 February', team1: 'Australia', team2: 'Sri Lanka', venue: 'Pallekele', aiPrediction: 'Australia', phase: 'group-stage' },

    // Day 11 - Feb 17
    { match: 31, date: '17 February', team1: 'Canada', team2: 'New Zealand', venue: 'Chennai', aiPrediction: 'New Zealand', phase: 'group-stage' },
    { match: 32, date: '17 February', team1: 'Ireland', team2: 'Zimbabwe', venue: 'Pallekele', aiPrediction: 'Ireland', phase: 'group-stage' },
    { match: 33, date: '17 February', team1: 'Nepal', team2: 'Scotland', venue: 'Wankhede, Mumbai', aiPrediction: 'Scotland', phase: 'group-stage' },

    // Day 12 - Feb 18
    { match: 34, date: '18 February', team1: 'South Africa', team2: 'UAE', venue: 'Delhi', aiPrediction: 'South Africa', phase: 'group-stage' },
    { match: 35, date: '18 February', team1: 'Namibia', team2: 'Pakistan', venue: 'Colombo (SSC)', aiPrediction: 'Pakistan', phase: 'group-stage' },
    { match: 36, date: '18 February', team1: 'India', team2: 'Netherlands', venue: 'Ahmedabad', aiPrediction: 'India', phase: 'group-stage' },

    // Day 13 - Feb 19
    { match: 37, date: '19 February', team1: 'Italy', team2: 'West Indies', venue: 'Eden Gardens, Kolkata', aiPrediction: 'West Indies', phase: 'group-stage' },
    { match: 38, date: '19 February', team1: 'Sri Lanka', team2: 'Zimbabwe', venue: 'Colombo (RPS)', aiPrediction: 'Sri Lanka', phase: 'group-stage' },
    { match: 39, date: '19 February', team1: 'Afghanistan', team2: 'Canada', venue: 'Chennai', aiPrediction: 'Afghanistan', phase: 'group-stage' },

    // Day 14 - Feb 20
    { match: 40, date: '20 February', team1: 'Australia', team2: 'Oman', venue: 'Pallekele', aiPrediction: 'Australia', phase: 'group-stage' },

    // ============ SUPER 8s (Matches 41-52) ============

    // Feb 21
    { match: 41, date: '21 February', team1: 'TBA', team2: 'TBA', venue: 'Colombo (RPS)', phase: 'super4' },

    // Feb 22
    { match: 42, date: '22 February', team1: 'TBA', team2: 'TBA', venue: 'Pallekele', phase: 'super4' },
    { match: 43, date: '22 February', team1: 'TBA', team2: 'TBA', venue: 'Ahmedabad', phase: 'super4' },

    // Feb 23
    { match: 44, date: '23 February', team1: 'TBA', team2: 'TBA', venue: 'Wankhede, Mumbai', phase: 'super4' },

    // Feb 24
    { match: 45, date: '24 February', team1: 'TBA', team2: 'TBA', venue: 'Pallekele', phase: 'super4' },

    // Feb 25
    { match: 46, date: '25 February', team1: 'TBA', team2: 'TBA', venue: 'Colombo (RPS)', phase: 'super4' },

    // Feb 26
    { match: 47, date: '26 February', team1: 'TBA', team2: 'TBA', venue: 'Ahmedabad', phase: 'super4' },
    { match: 48, date: '26 February', team1: 'TBA', team2: 'TBA', venue: 'Chennai', phase: 'super4' },

    // Feb 27
    { match: 49, date: '27 February', team1: 'TBA', team2: 'TBA', venue: 'Colombo (RPS)', phase: 'super4' },

    // Feb 28
    { match: 50, date: '28 February', team1: 'TBA', team2: 'TBA', venue: 'Pallekele', phase: 'super4' },

    // Mar 1
    { match: 51, date: '1 March', team1: 'TBA', team2: 'TBA', venue: 'Delhi', phase: 'super4' },
    { match: 52, date: '1 March', team1: 'TBA', team2: 'TBA', venue: 'Eden Gardens, Kolkata', phase: 'super4' },

    // ============ KNOCKOUTS (Matches 53-55) ============

    // Semi-finals
    { match: 53, date: '3 March', team1: 'TBA', team2: 'TBA', venue: 'TBA', phase: 'semifinals' },
    { match: 54, date: '5 March', team1: 'TBA', team2: 'TBA', venue: 'Wankhede, Mumbai', phase: 'semifinals' },

    // Final
    { match: 55, date: '8 March', team1: 'TBA', team2: 'TBA', venue: 'TBA', phase: 'finals' },
  ],

  bonusQuestions: [
    { id: 'top-scorer', question: "Tournament's Top Scorer", aiPrediction: 'Suryakumar Yadav' },
    { id: 'top-wicket-taker', question: "Tournament's Top Wicket-taker", aiPrediction: 'Rashid Khan' },
    { id: 'highest-team-score', question: 'Team with the Highest Single Match Score', aiPrediction: 'India' },
    { id: 'lowest-team-score', question: 'Team with the Lowest Single Match Score', aiPrediction: 'Italy' },
    { id: 'most-sixes', question: 'Most Sixes by a Player', aiPrediction: 'Shimron Hetmyer' },
    { id: 'most-catches', question: 'Player with the Most Catches', aiPrediction: 'Suryakumar Yadav' },
    { id: 'most-potm', question: 'Player with the Most Player-of-the-Match Awards', aiPrediction: 'Jasprit Bumrah' },
    { id: 'best-economy', question: 'Best Bowling Economy (minimum 10 overs)', aiPrediction: 'Rashid Khan' },
    { id: 'highest-individual', question: 'Highest Individual Score', aiPrediction: 'Travis Head' },
    { id: 'fastest-fifty', question: 'Fastest Fifty', aiPrediction: 'Hardik Pandya' },
    { id: 'player-of-tournament', question: 'Player of the Tournament', aiPrediction: 'Jasprit Bumrah' },
  ],

  teams: {
    // Group A
    'India': { primary: '#FF9933', secondary: '#138808', flag: '🇮🇳' },
    'Pakistan': { primary: '#00684A', secondary: '#FFFFFF', flag: '🇵🇰' },
    'Netherlands': { primary: '#FF6600', secondary: '#FFFFFF', flag: '🇳🇱' },
    'USA': { primary: '#002868', secondary: '#BF0A30', flag: '🇺🇸' },
    'Namibia': { primary: '#003580', secondary: '#D21034', flag: '🇳🇦' },

    // Group B
    'Australia': { primary: '#FFD100', secondary: '#007749', flag: '🇦🇺' },
    'Sri Lanka': { primary: '#FFB300', secondary: '#0056B3', flag: '🇱🇰' },
    'Ireland': { primary: '#169B62', secondary: '#FFFFFF', flag: '🇮🇪' },
    'Oman': { primary: '#EE2737', secondary: '#009639', flag: '🇴🇲' },
    'Zimbabwe': { primary: '#FCE300', secondary: '#009739', flag: '🇿🇼' },

    // Group C
    'England': { primary: '#012169', secondary: '#C8102E', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
    'West Indies': { primary: '#7B0041', secondary: '#FFD100', flag: '🌴' },
    'Scotland': { primary: '#005EB8', secondary: '#FFFFFF', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿' },
    'Nepal': { primary: '#DC143C', secondary: '#003893', flag: '🇳🇵' },
    'Italy': { primary: '#009246', secondary: '#CE2B37', flag: '🇮🇹' },

    // Group D
    'South Africa': { primary: '#007749', secondary: '#FFD100', flag: '🇿🇦' },
    'New Zealand': { primary: '#000000', secondary: '#FFFFFF', flag: '🇳🇿' },
    'Afghanistan': { primary: '#D32011', secondary: '#000000', flag: '🇦🇫' },
    'Canada': { primary: '#FF0000', secondary: '#FFFFFF', flag: '🇨🇦' },
    'UAE': { primary: '#00732F', secondary: '#FF0000', flag: '🇦🇪' },

    // Placeholder for TBA teams
    'TBA': { primary: '#808080', secondary: '#FFFFFF', flag: '❓' },
  },

  scoring: {
    latePenaltyPerDay: 10,
    bonusPointsCap: 30,
    bonusPointsPerCorrect: 10,
  },

  sheets: {
    predictionsOverview: 'Predictions Overview',
    super4: 'Super 8',
    semifinals: 'Semi-Finals',
    finals: 'Final',
    bonusesOverview: 'Bonuses Overview',
    activityLog: 'Activity Log',
    links: 'Links',
    leaderboard: 'Leaderboard',
    chips: 'Chips',
    fixtures: 'Fixtures',
  },

  features: {
    chipsEnabled: true,
    bonusQuestionsEnabled: true,
    aiPredictionsEnabled: true, // AI predictions enabled for group stage
    fetchFixturesFromSheets: true,
  },
};

export default t20WorldCup2026Config;
