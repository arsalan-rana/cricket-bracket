// pages/api/submit-bracket.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../pages/api/auth/[...nextauth]';
import { google } from 'googleapis';
import { DateTime } from 'luxon';
import { getBonusQuestionStrings } from '@/lib/tournament';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

// Helper function to log an activity event
const logActivity = async (
  sheets: any,
  spreadsheetId: string,
  timestamp: string,
  eventType: string,
  user: string,
  details: string = ''
) => {
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Activity Log!A:D',
      valueInputOption: 'RAW',
      requestBody: {
        values: [[timestamp, eventType, user, details]],
      },
    });
  } catch (error) {
    console.error('Error logging activity:', error);
    // Optionally, decide if you want to fail silently or propagate the error.
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  console.log("SESSION:", session);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized - No session found' });
  }

  // Updated: Accept an optional flag isWildcard and isDraft.
  const { name, picks, bonusAnswers, isWildcard, isDraft = false } = req.body;
  if (
    !name ||
    typeof name !== 'string' ||
    !picks ||
    typeof picks !== 'object' ||
    !bonusAnswers ||
    typeof bonusAnswers !== 'object'
  ) {
    return res.status(400).json({ error: 'Invalid request data' });
  }

  try {
    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      scopes: SCOPES,
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Convert current time to EST
    const timestampEST = DateTime.now().setZone('America/New_York').toFormat('yyyy-MM-dd HH:mm:ss');

    // Step 1: Fetch existing sheet data from "Predictions Overview"
    const sheetResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID!,
      range: 'Predictions Overview!A1:Z1000',
    });

    const data = sheetResponse.data.values;
    if (!data || data.length === 0) {
      return res.status(500).json({ error: 'Sheet is empty' });
    }

    const headers = data[0];
    let userColumnIndex = headers.indexOf(name);
    let eventType = '';
    let eventDetails = '';

    // Step 2: If user doesn't have a column, add one (new submission)
    if (userColumnIndex === -1) {
      eventType = isDraft ? 'BRACKET_DRAFT_SAVED' : 'BRACKET_SUBMITTED';
      eventDetails = isDraft ? 'saved their bracket draft' : 'submitted their bracket';
      userColumnIndex = headers.length;
      headers.push(name);

      // Update headers in the sheet
      await sheets.spreadsheets.values.update({
        spreadsheetId: process.env.GOOGLE_SHEET_ID!,
        range: 'Predictions Overview!A1:Z1',
        valueInputOption: 'RAW',
        requestBody: { values: [headers] },
      });
    } else {
      // If the user's column already exists, it's an update.
      eventType = isDraft ? 'BRACKET_DRAFT_SAVED' : 'BRACKET_UPDATED';
      eventDetails = isDraft ? 'saved their bracket draft' : 'updated their bracket';
    }

    // Step 3: Prepare data to update each row with their picks
    const updatedData = [...data];
    for (const matchNumber in picks) {
      const rowIndex = parseInt(matchNumber, 10);
      if (!updatedData[rowIndex]) updatedData[rowIndex] = [];
      updatedData[rowIndex][userColumnIndex] = picks[matchNumber];
    }

    // Step 4: Update the sheet with new picks
    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEET_ID!,
      range: 'Predictions Overview!A1:Z1000',
      valueInputOption: 'RAW',
      requestBody: { values: updatedData },
    });

    // Step 5: Append a row to "Links" tab with player's name, EST timestamp, and status
    if(!isWildcard) {
      const status = isDraft ? 'DRAFT' : 'SUBMITTED';
      await sheets.spreadsheets.values.append({
        spreadsheetId: process.env.GOOGLE_SHEET_ID!,
        range: 'Links!A:C',
        valueInputOption: 'RAW',
        requestBody: {
          values: [[name, timestampEST, status]], // Player Name, Timestamp, Status
        },
      });
    }

    // --- NEW STEP: Update Bonuses Overview with bonus picks ---
    // Fetch existing bonuses data from "Bonuses Overview" sheet
    const bonusSheetResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID!,
      range: 'Bonuses Overview!A1:Z1000',
    });
    const bonusData = bonusSheetResponse.data.values;
    if (!bonusData || bonusData.length === 0) {
      return res.status(500).json({ error: 'Bonuses Overview sheet is empty' });
    }

    // The header row (row 0) should contain: "Category", "WINNER", and then user columns.
    const bonusHeader = bonusData[0];
    let bonusUserColIndex = bonusHeader.indexOf(name);
    if (bonusUserColIndex === -1) {
      bonusUserColIndex = bonusHeader.length;
      bonusHeader.push(name);
      bonusData[0] = bonusHeader;
    }

    // Get bonus categories from tournament config
    const bonusQuestions = getBonusQuestionStrings();

    // For each bonus question, find its row (matching the first column) and update the user's cell.
    bonusQuestions.forEach((question) => {
      // Find the row (skip header row) where the first cell equals the bonus question.
      const rowIndex = bonusData.findIndex((row, idx) => idx > 0 && row[0] === question);
      if (rowIndex !== -1) {
        // Ensure the row has enough columns; fill with empty strings if needed.
        while (bonusData[rowIndex].length < bonusUserColIndex + 1) {
          bonusData[rowIndex].push("");
        }
        bonusData[rowIndex][bonusUserColIndex] = bonusAnswers[question] || "";
      } else {
        console.error(`Bonus question row not found for category: ${question}`);
      }
    });

    // Update the Bonuses Overview sheet with the modified bonusData.
    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEET_ID!,
      range: 'Bonuses Overview!A1:Z1000',
      valueInputOption: 'RAW',
      requestBody: { values: bonusData },
    });

    // --- NEW STEP: Log Activity ---
    // If this submission is NOT triggered by a wildcard swap, log the activity.
    if (!isWildcard) {
      await logActivity(
        sheets,
        process.env.GOOGLE_SHEET_ID!,
        timestampEST,
        eventType,
        name,
        eventDetails
      );
    }

    return res.status(200).json({ message: 'Bracket submitted successfully' });
  } catch (error) {
    console.error('Error submitting bracket:', error);
    return res.status(500).json({ error: 'Error submitting bracket' });
  }
}