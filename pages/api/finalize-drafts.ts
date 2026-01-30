// pages/api/finalize-drafts.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../pages/api/auth/[...nextauth]';
import { google } from 'googleapis';
import { DateTime } from 'luxon';

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

  const { phase } = req.query;
  if (!phase || typeof phase !== 'string') {
    return res.status(400).json({ error: 'Missing phase parameter' });
  }

  try {
    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      scopes: SCOPES,
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const timestampEST = DateTime.now().setZone('America/New_York').toFormat('yyyy-MM-dd HH:mm:ss');

    // Step 1: Fetch all entries from "Links" sheet
    const linksResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID!,
      range: 'Links!A:C',
    });

    const linksData = linksResponse.data.values;
    if (!linksData || linksData.length === 0) {
      return res.status(200).json({ message: 'No entries found in Links sheet', count: 0 });
    }

    // Step 2: Find all entries with status = "DRAFT"
    const updatedData = [...linksData];
    let finalizedCount = 0;
    const finalizedUsers: string[] = [];

    for (let i = 0; i < updatedData.length; i++) {
      const row = updatedData[i];
      // Check if status column exists and is "DRAFT"
      if (row[2] === 'DRAFT') {
        updatedData[i][2] = 'SUBMITTED';
        finalizedCount++;
        finalizedUsers.push(row[0]); // Store user name
      }
    }

    // Step 3: Update the Links sheet with finalized statuses
    if (finalizedCount > 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: process.env.GOOGLE_SHEET_ID!,
        range: 'Links!A:C',
        valueInputOption: 'RAW',
        requestBody: { values: updatedData },
      });

      // Step 4: Log activity for each finalized user
      for (const user of finalizedUsers) {
        await logActivity(
          sheets,
          process.env.GOOGLE_SHEET_ID!,
          timestampEST,
          'DRAFT_AUTO_FINALIZED',
          user,
          `draft auto-finalized for ${phase}`
        );
      }
    }

    return res.status(200).json({
      message: `${finalizedCount} draft(s) finalized for phase: ${phase}`,
      count: finalizedCount,
      users: finalizedUsers
    });
  } catch (error) {
    console.error('Error finalizing drafts:', error);
    return res.status(500).json({ error: 'Error finalizing drafts' });
  }
}
