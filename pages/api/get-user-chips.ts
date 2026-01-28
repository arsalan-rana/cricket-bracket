// pages/api/get-user-chips.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const name = session.user?.name;
  if (!name) {
    return res.status(400).json({ error: 'No user name found in session' });
  }

  try {
    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      scopes: SCOPES,
    });
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID!;

    // Fetch the Chips tab (columns A:G - DoubleUp only for group & super8, Wildcard for all)
    const chipRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Chips!A:G',
    });
    const rows = chipRes.data.values || [];

    if (!rows || rows.length === 0) {
      return res.status(200).json({
        name,
        groupStage: { doubleUp: null, wildcard: null },
        super8: { doubleUp: null, wildcard: null },
        semifinals: { doubleUp: null, wildcard: null },
        finals: { doubleUp: null, wildcard: null }
      });
    }

    // Find the row matching the user name (case-insensitive)
    const userRow = rows.find((row, index) => index > 0 && row[0]?.trim().toLowerCase() === name.trim().toLowerCase());

    if (!userRow) {
      // No chip data found for user. Return empty values.
      return res.status(200).json({
        name,
        groupStage: { doubleUp: null, wildcard: null },
        super8: { doubleUp: null, wildcard: null },
        semifinals: { doubleUp: null, wildcard: null },
        finals: { doubleUp: null, wildcard: null }
      });
    }

    // Parse chip values for each phase
    const parseChipValue = (value: string | undefined) => {
      return value && value.trim() !== '' ? parseInt(value, 10) : null;
    };

    return res.status(200).json({
      name,
      groupStage: {
        doubleUp: parseChipValue(userRow[1]),
        wildcard: parseChipValue(userRow[2])
      },
      super8: {
        doubleUp: parseChipValue(userRow[3]),
        wildcard: parseChipValue(userRow[4])
      },
      semifinals: {
        doubleUp: null, // No DoubleUp for semifinals
        wildcard: parseChipValue(userRow[5])
      },
      finals: {
        doubleUp: null, // No DoubleUp for finals
        wildcard: parseChipValue(userRow[6])
      }
    });
  } catch (error) {
    console.error('Error fetching user chips:', error);
    return res.status(500).json({ error: 'Error fetching user chips' });
  }
}