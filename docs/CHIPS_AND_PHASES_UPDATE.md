# Chips and Phases Update

## Summary of Changes

### 1. Semi-Finals as Separate Phase

**What Changed:**
- Split the "Knockouts" phase into two separate phases:
  - **Semi-Finals** (Matches 53-54): Pool of 160 points
  - **Final** (Match 55): Pool of 260 points

**Tournament Structure:**
| Phase ID | Name | Matches | Deadline | Scoring | Pool Size |
|----------|------|---------|----------|---------|-----------|
| group-stage | Group Stage | 1-40 | Feb 6, 11 PM | Fixed | 10 pts/match |
| super4 | Super 8s | 41-52 | Feb 21, 8 AM | Pool | 160 points |
| semifinals | Semi-Finals | 53-54 | Mar 3, 8 AM | Pool | 160 points |
| finals | Final | 55 | Mar 8, 8 AM | Pool | 260 points |

**Files Updated:**
- `/config/t20-world-cup-2026.ts` - Added semifinals phase
- `/config/tournament.schema.ts` - Added semifinals to SheetsConfig
- `/lib/useTournament.ts` - Added semifinals color/icon (purple 🔥)

**Google Sheets Required:**
You need to create two new sheets in your Google Sheets document:
1. **"Semi-Finals"** sheet - for semi-final predictions (matches 53-54)
2. **"Final"** sheet - for final prediction (match 55)

Both should have the same structure as your other prediction sheets (Date, Match, Team 1, Team 2, Winner, [Player columns]).

---

### 2. Chips Enabled Per Phase

**What Changed:**
- Chips are now enabled for **each phase** instead of just group stage
- Each player gets:
  - 1 Double Up chip per phase (4 total)
  - 1 Wildcard chip per phase (4 total)
- Chips expire if not used in their phase

**New Chips Sheet Structure:**
The "Chips" sheet now needs these columns:

| Column | Header | Description |
|--------|--------|-------------|
| A | Player | Player name |
| B | DoubleUp_GroupStage | Match number for group stage double up |
| C | Wildcard_GroupStage | Match number for group stage wildcard |
| D | DoubleUp_Super8 | Match number for Super 8 double up |
| E | Wildcard_Super8 | Match number for Super 8 wildcard |

**Note:** Chips (both DoubleUp and Wildcard) are only available for Group Stage and Super 8. No chips for Semi-Finals or Final.

**API Changes:**

**`/api/get-user-chips`:**
- Now returns chips organized by phase:
```json
{
  "name": "John Doe",
  "groupStage": { "doubleUp": 5, "wildcard": 12 },
  "super8": { "doubleUp": 42, "wildcard": 48 },
  "semifinals": { "doubleUp": null, "wildcard": 53 },
  "finals": { "doubleUp": null, "wildcard": null }
}
```
**Note:** `doubleUp` is always `null` for semifinals and finals.

**`/api/submit-chips`:**
- Now requires a `phase` parameter:
```json
{
  "name": "John Doe",
  "phase": "group-stage",  // or "super4", "semifinals", "finals"
  "chips": {
    "doubleUp": 5,      // Only for group-stage and super4
    "wildcard": 12      // Available for all phases
  }
}
```
**Note:** Attempting to submit `doubleUp` for semifinals or finals will return an error.

---

## Frontend Changes Required

The frontend currently needs to be updated to:
1. Support chips for each phase (not done yet - requires significant UI changes)
2. Show chip selection for Super 8, Semi-Finals, and Finals tabs
3. Track chips per phase in component state
4. Display which chips are available/used for each phase

**Current Status:**
- ✅ Backend APIs updated
- ✅ Schema and config updated
- ✅ Semi-finals phase added
- ❌ Frontend UI not yet updated (still shows single chip selection)

---

## Migration Steps

### For Existing Tournaments:

1. **Update Google Sheets:**
   - Rename "Knockouts" sheet to "Semi-Finals"
   - Create new "Final" sheet
   - Update "Chips" sheet with new column headers (B through I)
   - Copy existing chip data to columns B and C (GroupStage chips)

2. **Update Config:**
   - Already done for T20 World Cup 2026
   - For other tournaments, follow the pattern in `/config/t20-world-cup-2026.ts`

3. **Frontend Update Required:**
   - The bracket page needs updates to:
     - Fetch chips per phase from API
     - Allow chip selection for each phase separately
     - Show chip status for current phase only
     - Prevent using chips across phases

---

## ✅ All Updates Complete!

### Backend (Complete)
- ✅ APIs updated to handle per-phase chips
- ✅ Google Sheets structure defined
- ✅ Tournament config updated with semifinals

### Frontend (Complete)
- ✅ Chip state management refactored for per-phase chips
- ✅ Chip selection UI shows only current phase fixtures
- ✅ Chip display shows current phase status
- ✅ Automatic chip expiry between phases
- ✅ Semi-finals tab and predictions added
- ✅ All submission handlers updated

---

## 🚀 Ready to Deploy

### Google Sheets Setup Required

**1. Create New Sheets:**
- Rename "Knockouts" → "Semi-Finals"
- Create new "Final" sheet

**2. Update Chips Sheet:**

Delete old sheet, create new one with these exact headers:

| Column | Header |
|--------|--------|
| A | Player |
| B | DoubleUp_GroupStage |
| C | Wildcard_GroupStage |
| D | DoubleUp_Super8 |
| E | Wildcard_Super8 |
| F | Wildcard_Semifinals |
| G | Wildcard_Finals |

### How It Works Now

**Each phase has its own chips:**
- Group Stage: 1 DoubleUp + 1 Wildcard
- Super 8: 1 DoubleUp + 1 Wildcard (fresh set)
- Semi-Finals: Wildcard only
- Final: Wildcard only

**Chips automatically expire:**
- Unused Group Stage chips can't be used in Super 8
- Unused Super 8 chips can't be used in Semi-Finals
- Each phase starts with a clean slate

**User sees:**
- Only chips for current phase in the UI
- Disabled chip buttons if already used in current phase
- Fresh chips appear when new phase begins
