// pages/api/submit-semifinals.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../pages/api/auth/[...nextauth]';
import { google } from 'googleapis';
import { DateTime } from 'luxon';
import { getMatchOffset } from '@/lib/tournament';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

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

  const { name, picks, isDraft = false } = req.body;
  if (!name || typeof name !== 'string' || !picks || typeof picks !== 'object') {
    return res.status(400).json({ error: 'Invalid request data' });
  }

  try {
    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      scopes: SCOPES,
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const timestampEST = DateTime.now().setZone('America/New_York').toFormat('yyyy-MM-dd HH:mm:ss');
    const sheetName = 'Finals';

    // Step 1: Fetch existing sheet data
    const sheetResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID!,
      range: `${sheetName}!A1:Z1000`,
    });
    const data = sheetResponse.data.values;
    if (!data || data.length === 0) {
      return res.status(500).json({ error: 'Sheet is empty' });
    }

    const headers = data[0];
    let userColumnIndex = headers.indexOf(name);
    let eventType = '';
    let eventDetails = '';

    // Step 2: Add user column if new
    if (userColumnIndex === -1) {
      eventType = isDraft ? 'SEMIFINALS_DRAFT_SAVED' : 'SEMIFINALS_SUBMITTED';
      eventDetails = isDraft ? 'saved their semi-finals draft' : 'submitted their semi-finals picks';
      userColumnIndex = headers.length;
      headers.push(name);
      await sheets.spreadsheets.values.update({
        spreadsheetId: process.env.GOOGLE_SHEET_ID!,
        range: `${sheetName}!A1:Z1`,
        valueInputOption: 'RAW',
        requestBody: { values: [headers] },
      });
    } else {
      eventType = isDraft ? 'SEMIFINALS_DRAFT_SAVED' : 'SEMIFINALS_UPDATED';
      eventDetails = isDraft ? 'saved their semi-finals draft' : 'updated their semi-finals picks';
    }

    // Step 3: Update picks using match offset
    const updatedData = [...data];
    const offset = getMatchOffset('finals'); // Finals sheet covers matches 53-55, offset = 52
    for (const matchNumber in picks) {
      const numericMatch = parseInt(matchNumber, 10);
      const rowIndex = numericMatch - offset;
      if (!updatedData[rowIndex]) updatedData[rowIndex] = [];
      updatedData[rowIndex][userColumnIndex] = picks[matchNumber];
    }

    // Step 4: Write back to sheet
    console.log(`[submit-semifinals] Writing for "${name}", offset=${offset}, picks:`, JSON.stringify(picks));
    console.log(`[submit-semifinals] userColumnIndex=${userColumnIndex}, total rows to write: ${updatedData.length}`);
    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEET_ID!,
      range: `${sheetName}!A1:Z1000`,
      valueInputOption: 'RAW',
      requestBody: { values: updatedData },
    });

    // Step 5: Log to Links tab
    const status = isDraft ? 'SEMIS_DRAFT' : 'SEMIS_SUBMITTED';

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID!,
      range: 'Links!A:C',
      valueInputOption: 'RAW',
      requestBody: {
        values: [[name, timestampEST, status]],
      },
    });

    // Step 6: Log activity
    await logActivity(sheets, process.env.GOOGLE_SHEET_ID!, timestampEST, eventType, name, eventDetails);

    return res.status(200).json({ message: 'Semi-finals picks submitted successfully' });
  } catch (error) {
    console.error('Error submitting semi-finals picks:', error);
    return res.status(500).json({ error: 'Error submitting semi-finals picks' });
  }
}
