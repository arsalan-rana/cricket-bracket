// pages/api/update-fixture.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../pages/api/auth/[...nextauth]';
import { google } from 'googleapis';
import { DateTime } from 'luxon';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests.
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Only allow admin to update fixtures.
  const session = await getServerSession(req, res, authOptions);
  const adminEmail = process.env.ADMIN_EMAIL; // Set this in your env variables.
  if (!session || session.user?.email !== adminEmail) {
    return res.status(401).json({ error: 'Unauthorized: Admin only' });
  }

  const { date, match, newWinner } = req.body;
  // newWinner may be one of the teams or "DRAW"
  if (!date || !match || newWinner === undefined || newWinner === null) {
    return res.status(400).json({ error: 'Missing required fields: date, match, or newWinner' });
  }

  // Parse match number - handle formats like "Match 1", "1", or numbers
  let matchString = typeof match === 'string' ? match.trim() : String(match);

  // Remove "Match " prefix if present (case-insensitive)
  matchString = matchString.replace(/^match\s+/i, '');

  const matchNumber = parseInt(matchString, 10);

  if (isNaN(matchNumber) || matchNumber < 1) {
    console.error('Invalid match number received:', { match, matchString, matchNumber });
    return res.status(400).json({ error: `Invalid match number: "${match}"` });
  }

  // Determine which bracket the fixture belongs to based on T20 WC 2026 config:
  // Group Stage: 1-40, Super 8s: 41-52, Semi-Finals: 53-54, Finals: 55
  let bracketType: 'group' | 'super4' | 'finals' = 'group';
  let sheetName = 'Predictions Overview';

  if (matchNumber >= 1 && matchNumber <= 40) {
    bracketType = 'group';
    sheetName = 'Predictions Overview';
  } else if (matchNumber >= 41 && matchNumber <= 52) {
    bracketType = 'super4';
    sheetName = 'Super 8';
  } else if (matchNumber >= 53 && matchNumber <= 54) {
    bracketType = 'finals';
    sheetName = 'Semi-Finals';
  } else if (matchNumber === 55) {
    bracketType = 'finals';
    sheetName = 'Final';
  } else {
    return res.status(400).json({ error: `Match number ${matchNumber} is out of valid range (1-55)` });
  }

  // Set sheet range and offset based on bracket type.
  const range = `${sheetName}!A1:Z1000`;
  let offset = 0;

  if (bracketType === 'group') {
    offset = 0; // Group stage: match 1 is in row 1 (after header)
  } else if (bracketType === 'super4') {
    offset = 40; // Super 8: match 41 should be in row 1 (after header)
  } else if (bracketType === 'finals') {
    // Semi-Finals & Final: match 53 should be in row 1, match 54 in row 2, match 55 in row 1 of Final sheet
    if (sheetName === 'Semi-Finals') {
      offset = 52; // match 53 -> row 1, match 54 -> row 2
    } else if (sheetName === 'Final') {
      offset = 54; // match 55 -> row 1
    }
  }

  try {
    // Authenticate with Google Sheets API.
    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      scopes: SCOPES,
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID!;

    // Fetch the current sheet data from the appropriate tab.
    const sheetResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });
    const data = sheetResponse.data.values;
    if (!data || data.length === 0) {
      return res.status(500).json({ error: 'Sheet is empty' });
    }

    // Find header indices for Date, Match, and Winner columns.
    const headers = data[0];
    const dateIndex = headers.indexOf('Date');
    const matchIndex = headers.indexOf('Match');
    const winnerIndex = headers.indexOf('Winner');
    if (dateIndex === -1 || matchIndex === -1 || winnerIndex === -1) {
      return res.status(500).json({ error: 'Required columns not found' });
    }

    // Calculate the expected row index in the sheet.
    // For group and finals, we assume row number equals the match number (with finals adjusted by offset).
    // For playoffs, apply the offset.
    const targetRowIndex = matchNumber - offset;

    if (targetRowIndex < 1 || targetRowIndex >= data.length) {
      return res.status(404).json({ error: 'Fixture row not found in the sheet' });
    }

    const row = data[targetRowIndex];
    // Use trimmed values for comparison.
    // Normalize match values by extracting numbers for comparison
    const sheetMatchValue = row[matchIndex].toString().trim().replace(/^match\s+/i, '');
    const requestMatchValue = matchString;

    if (row[dateIndex].trim() !== date.trim() || sheetMatchValue !== requestMatchValue) {
      console.warn('Mismatch in fixture data; proceeding with update.', {
        sheetDate: row[dateIndex].trim(),
        requestDate: date.trim(),
        sheetMatch: sheetMatchValue,
        requestMatch: requestMatchValue,
      });
    }

    // Update the Winner column for the target row.
    data[targetRowIndex][winnerIndex] = newWinner;

    // Update the sheet with the new fixture result.
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'RAW',
      requestBody: { values: data },
    });

    // Log the update activity.
    const timestampEST = DateTime.now().setZone('America/New_York').toFormat('yyyy-MM-dd HH:mm:ss');
    const adminName = session.user?.name || session.user?.email;
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Activity Log!A:D',
      valueInputOption: 'RAW',
      requestBody: {
        values: [[timestampEST, 'FIXTURE_UPDATED', adminName, `Match ${match} Winner: ${newWinner}`]],
      },
    });

    return res.status(200).json({ message: 'Fixture updated successfully' });
  } catch (error) {
    console.error('Error updating fixture:', error);
    return res.status(500).json({ error: 'Error updating fixture' });
  }
}