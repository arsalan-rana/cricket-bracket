# Tournament Setup Guide

This guide explains how to set up a new cricket tournament bracket.

## Quick Start

To run a new tournament:

1. **Create a new config file** - Copy `/config/asia-cup-2025.ts` and customize
2. **Create a Google Sheet** - Set up sheets with the required structure
3. **Update the lib/tournament.ts import** - Point to your new config
4. **Deploy** - Set `GOOGLE_SHEET_ID` to your new sheet

---

## Step 1: Create Tournament Configuration

Copy `/config/asia-cup-2025.ts` to a new file (e.g., `/config/t20-world-cup-2026.ts`) and update:

### Required Fields

```typescript
export const myTournamentConfig: TournamentConfig = {
  id: 'my-tournament-2026',        // Unique identifier
  name: 'My Tournament 2026',       // Display name
  year: 2026,                       // Tournament year
  timezone: 'America/New_York',     // Timezone for deadlines (IANA format)
  fixtureStartTime: '18:30',        // Default match start time (HH:mm)

  phases: [...],      // Tournament phases with deadlines
  fixtures: [...],    // Fixtures data (fallback if not using sheets)
  bonusQuestions: [...],  // Bonus prediction questions
  teams: {...},       // Team colors and flags
  scoring: {...},     // Scoring rules
  sheets: {...},      // Google Sheets tab names
  features: {...},    // Feature flags
};
```

### Phases Configuration

```typescript
phases: [
  {
    id: 'group-stage',           // Unique phase ID
    name: 'Group Stage',         // Display name
    sheetName: 'Predictions Overview',  // Google Sheet tab name
    matchRange: { start: 1, end: 12 },  // Match number range
    deadline: '2026-06-15T10:30:00',    // ISO 8601 deadline
    scoringType: 'fixed',        // 'fixed' (points per correct) or 'pool' (split pool)
    pointsPerCorrect: 10,        // Points per correct pick (for 'fixed' type)
    drawPoints: 5,               // Points awarded for draw results
  },
  {
    id: 'super4',
    name: 'Super 4',
    sheetName: 'Super 4',
    matchRange: { start: 13, end: 18 },
    deadline: '2026-06-25T10:30:00',
    scoringType: 'pool',         // Pool-based scoring
    poolSize: 160,               // Points split among winners
  },
  {
    id: 'finals',
    name: 'Finals',
    sheetName: 'Finals',
    matchRange: { start: 19, end: 19 },
    deadline: '2026-06-30T10:30:00',
    scoringType: 'pool',
    poolSize: 260,
  },
],
```

### Fixtures Configuration

```typescript
fixtures: [
  {
    match: 1,
    date: '15 June',              // Display date format
    team1: 'Team A',
    team2: 'Team B',
    venue: 'Stadium Name',
    aiPrediction: 'Team A',       // Optional AI prediction
    phase: 'group-stage',         // Must match a phase ID
  },
  // ... more fixtures
],
```

### Teams Configuration

```typescript
teams: {
  'India': {
    primary: '#FF9933',    // Primary color (hex)
    secondary: '#138808',  // Secondary color (hex)
    flag: '🇮🇳',            // Flag emoji (optional)
  },
  // ... more teams
},
```

---

## Step 2: Update the Import

Edit `/lib/tournament.ts` to import your new config:

```typescript
// Change this line:
import asiaCup2025Config from '@/config/asia-cup-2025';
let currentConfig: TournamentConfig = asiaCup2025Config;

// To:
import myTournamentConfig from '@/config/my-tournament-2026';
let currentConfig: TournamentConfig = myTournamentConfig;
```

---

## Step 3: Set Up Google Sheets

Create a new Google Sheet with these tabs:

### Required Sheet Tabs

| Tab Name | Purpose | Required Columns |
|----------|---------|------------------|
| **Predictions Overview** | Group stage picks | Date, Match, Team 1, Team 2, Winner, [Player columns] |
| **Super 4** | Super 4/playoffs picks | Date, Match, Team 1, Team 2, Winner, [Player columns] |
| **Finals** | Finals picks | Date, Match, Team 1, Team 2, Winner, [Player columns] |
| **Bonuses Overview** | Bonus predictions | Category, WINNER, [Player columns] |
| **Links** | Submission tracking | Players, Timestamp of submission |
| **Chips** | Chip usage | Player, DoubleUp, Wildcard |
| **Activity Log** | Event history | Timestamp, EventType, User, Details |
| **Leaderboard** | Score snapshot | Rank, Previous Rank, Player, Group Points, Super4 Points, Playoffs Points, Bonus Points, Total Points, Penalty, Timestamp, Chips Used |
| **Fixtures** (optional) | Fixture data | Match, Date, Team1, Team2, Venue, Phase, AIPrediction |

### Predictions Overview Example

| Date | Match | Team 1 | Team 2 | Winner | POTM | Player1 | Player2 | ... |
|------|-------|--------|--------|--------|------|---------|---------|-----|
| 15 June | 1 | India | Pakistan | | | | | |
| 16 June | 2 | Australia | England | | | | | |

### Bonuses Overview Example

| Category | WINNER | Player1 | Player2 | ... |
|----------|--------|---------|---------|-----|
| Tournament's Top Scorer | | | | |
| Tournament's Top Wicket-taker | | | | |

### Fixtures Sheet Example (Optional)

If you want to manage fixtures in the sheet (recommended):

| Match | Date | Team1 | Team2 | Venue | Phase | AIPrediction |
|-------|------|-------|-------|-------|-------|--------------|
| 1 | 15 June | India | Pakistan | Dubai Stadium | group-stage | India |
| 2 | 16 June | Australia | England | Dubai Stadium | group-stage | Australia |

---

## Step 4: Environment Variables

Update `.env.local`:

```bash
# Required
GOOGLE_SHEET_ID=your-new-sheet-id-here
GOOGLE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
ADMIN_EMAIL=admin@example.com
NEXT_PUBLIC_ADMIN_EMAIL=admin@example.com

# Auth
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-secret-key
GOOGLE_CLIENT_ID=your-oauth-client-id
GOOGLE_CLIENT_SECRET=your-oauth-client-secret
```

---

## Step 5: Deploy

1. Commit your changes
2. Deploy to your hosting platform (Vercel, etc.)
3. Set environment variables in your hosting dashboard

---

## Configuration Reference

### Scoring Rules

```typescript
scoring: {
  latePenaltyPerDay: 10,      // Points deducted per day late
  bonusPointsCap: 30,         // Max bonus points for late submissions
  bonusPointsPerCorrect: 10,  // Points per correct bonus answer
},
```

### Feature Flags

```typescript
features: {
  chipsEnabled: true,           // Enable Double Up and Wildcard chips
  bonusQuestionsEnabled: true,  // Enable bonus predictions
  aiPredictionsEnabled: true,   // Show AI predictions
  fetchFixturesFromSheets: true,// Fetch fixtures from Fixtures sheet
},
```

---

## Troubleshooting

### Fixtures not showing
- Check that fixtures have the correct `phase` value matching a phase ID
- Ensure deadlines haven't all passed
- Check browser console for API errors

### Scoring not calculating
- Verify the `Winner` column is filled in for completed matches
- Check that sheet tab names match config exactly
- Ensure admin has clicked "Refresh Leaderboard"

### Authentication issues
- Verify Google OAuth credentials are correct
- Check that `NEXTAUTH_URL` matches your deployment URL
- Ensure the service account has access to the Google Sheet

---

## Multiple Deployments

To run multiple tournaments simultaneously:

1. Create separate Google Sheets for each tournament
2. Create separate config files for each
3. Deploy to different URLs/subdomains
4. Each deployment uses its own `GOOGLE_SHEET_ID`
