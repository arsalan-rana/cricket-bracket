# Bonus Makeup Implementation

## Overview
This document describes the implementation of the bonus makeup submission feature and the fix for the original bonus question bug.

## The Original Bug

### Problem
The `submit-bracket.ts` API tried to match bonus questions from the tournament config with rows in the "Bonuses Overview" Google Sheet. If a row didn't exist for a bonus question, it would:
1. Log an error: `Bonus question row not found for category: ${question}`
2. Skip saving that bonus answer

This caused "Tournament's Top Scorer" and "Tournament's Top Wicket-taker" picks to not be saved for any users.

### Root Cause
Lines 161-173 in `pages/api/submit-bracket.ts` used `findIndex` to locate rows but didn't create them if missing.

### Fix
Updated the code to automatically create missing bonus question rows in the sheet when they don't exist:

```typescript
if (rowIndex !== -1) {
  // Row exists - update it
} else {
  // Row doesn't exist - create it
  const newRow = Array(bonusUserColIndex + 1).fill("");
  newRow[0] = question;
  newRow[bonusUserColIndex] = bonusAnswers[question] || "";
  bonusData.push(newRow);
}
```

## Bonus Makeup Feature

### Purpose
Allow all users to submit picks for the two missing bonus questions ("Tournament's Top Scorer" and "Tournament's Top Wicket-taker") with a deadline, ensuring fairness since everyone has seen equal matches.

### Implementation

#### 1. Configuration (`config/tournament.schema.ts` & `config/asia-cup-2025.ts`)
- Added optional `bonusMakeupDeadline` field to `TournamentConfig`
- Set deadline to `2026-02-25T23:59:00` (you can adjust this)

#### 2. API Endpoints

**POST `/api/submit-bonus-makeup`**
- Accepts: `{ name, topScorer, topWicketTaker }`
- Validates deadline hasn't passed
- Saves to "Bonuses Overview" sheet
- Creates rows if they don't exist
- Logs activity: `BONUS_MAKEUP_SUBMITTED`

**GET `/api/get-bonus-makeup?name={name}`**
- Returns: `{ picks: { topScorer, topWicketTaker } }`
- Fetches existing picks for a user

#### 3. UI Page (`/bonus-makeup`)
Features:
- Countdown timer showing time remaining until deadline
- Two text fields for the bonus picks
- Auto-loads existing picks if already submitted
- Shows success message if already submitted (allows updates)
- Disables submission after deadline
- Real-time validation and feedback

#### 4. Navigation
- Added "Bonus Makeup" (📝) to the navigation menu

#### 5. Activity Tracking
- Added `BONUS_MAKEUP_SUBMITTED` event type
- Shows as "Bonus Makeup Submitted 📝" in Recent Activity feed

## How to Use

### For Administrators
1. **Set the deadline**: Edit `config/asia-cup-2025.ts` and update `bonusMakeupDeadline`
2. **Notify users**: Tell your users to visit the "/bonus-makeup" page
3. **Monitor submissions**: Check the Activity Log in Google Sheets

### For Users
1. Navigate to "Bonus Makeup" from the menu
2. See the countdown timer
3. Enter picks for:
   - Tournament's Top Scorer
   - Tournament's Top Wicket-taker
4. Submit before the deadline
5. Can update picks anytime before deadline

## Google Sheets Impact

### Bonuses Overview Sheet
The system will now:
- Create missing bonus question rows automatically
- Ensure all users' picks are saved correctly

### Activity Log Sheet
New event type:
- `BONUS_MAKEUP_SUBMITTED` - When a user submits/updates makeup picks

## Testing Checklist

- [ ] Verify deadline countdown shows correctly
- [ ] Test submission before deadline
- [ ] Test submission after deadline (should be blocked)
- [ ] Verify picks are saved to Google Sheet correctly
- [ ] Verify activity is logged
- [ ] Test updating picks (submit again before deadline)
- [ ] Check that bonus picks appear in Recent Activity feed

## Files Modified/Created

### Modified:
- `config/tournament.schema.ts` - Added bonusMakeupDeadline field
- `config/asia-cup-2025.ts` - Set bonusMakeupDeadline value
- `pages/api/submit-bracket.ts` - Fixed row creation bug
- `app/components/NavBar.tsx` - Added Bonus Makeup menu item
- `app/components/RecentActivity.tsx` - Added BONUS_MAKEUP_SUBMITTED event type

### Created:
- `pages/api/submit-bonus-makeup.ts` - Makeup submission endpoint
- `pages/api/get-bonus-makeup.ts` - Fetch makeup picks endpoint
- `app/bonus-makeup/page.tsx` - UI for makeup submissions
- `docs/BONUS_MAKEUP_IMPLEMENTATION.md` - This document

## Future Improvements

1. Email notifications when users submit
2. Admin dashboard to see who hasn't submitted yet
3. Bulk import/export for makeup picks
4. More detailed activity logging (show which picks were updated)
