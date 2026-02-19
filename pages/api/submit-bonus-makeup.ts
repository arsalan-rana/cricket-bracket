// pages/api/submit-bonus-makeup.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import { google } from 'googleapis';
import { DateTime } from 'luxon';
import { getConfig } from '@/lib/useTournament';

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
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized - No session found' });
  }

  const { name, topScorer, topWicketTaker } = req.body;

  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Invalid name parameter' });
  }

  if (!topScorer || !topWicketTaker) {
    return res.status(400).json({ error: 'Both bonus picks are required' });
  }

  // Check if deadline has passed
  const config = getConfig();
  if (config.bonusMakeupDeadline) {
    const deadline = DateTime.fromISO(config.bonusMakeupDeadline, { zone: config.timezone });
    const now = DateTime.now().setZone(config.timezone);

    if (now > deadline) {
      return res.status(403).json({ error: 'Deadline has passed for bonus makeup submissions' });
    }
  }

  try {
    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      scopes: SCOPES,
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID!;

    // Convert current time to EST for logging
    const timestampEST = DateTime.now().setZone('America/New_York').toFormat('yyyy-MM-dd HH:mm:ss');

    // Fetch existing bonuses data from "Bonuses Overview" sheet
    const bonusSheetResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
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

    // Define the two bonus questions we're handling
    const bonusQuestions = [
      { question: "Tournament's Top Scorer", value: topScorer },
      { question: "Tournament's Top Wicket-taker", value: topWicketTaker }
    ];

    // For each bonus question, find its row and update the user's cell
    for (const { question, value } of bonusQuestions) {
      const rowIndex = bonusData.findIndex((row, idx) => idx > 0 && row[0] === question);

      if (rowIndex !== -1) {
        // Ensure the row has enough columns
        while (bonusData[rowIndex].length < bonusUserColIndex + 1) {
          bonusData[rowIndex].push("");
        }
        bonusData[rowIndex][bonusUserColIndex] = value;
      } else {
        // If row doesn't exist, create it
        const newRow = Array(bonusUserColIndex + 1).fill("");
        newRow[0] = question;
        newRow[bonusUserColIndex] = value;
        bonusData.push(newRow);
      }
    }

    // Update the Bonuses Overview sheet with the modified bonusData
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Bonuses Overview!A1:Z1000',
      valueInputOption: 'RAW',
      requestBody: { values: bonusData },
    });

    // Log activity
    await logActivity(
      sheets,
      spreadsheetId,
      timestampEST,
      'BONUS_MAKEUP_SUBMITTED',
      name,
      'submitted makeup bonus picks for Top Scorer and Top Wicket-taker'
    );

    return res.status(200).json({ message: 'Bonus makeup picks submitted successfully' });
  } catch (error) {
    console.error('Error submitting bonus makeup:', error);
    return res.status(500).json({ error: 'Error submitting bonus makeup picks' });
  }
}
