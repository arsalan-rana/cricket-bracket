// pages/api/get-submission-status.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../pages/api/auth/[...nextauth]';
import { google } from 'googleapis';
import { getConfig } from '@/lib/tournament';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized - No session found' });
  }

  const { name, phase } = req.query;
  if (!name || typeof name !== 'string' || !phase || typeof phase !== 'string') {
    return res.status(400).json({ error: 'Missing name or phase parameter' });
  }

  try {
    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      scopes: SCOPES,
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const config = getConfig();

    // Step 1: Query "Links" sheet for user's latest entry for the phase
    const linksResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID!,
      range: 'Links!A:C',
    });

    const linksData = linksResponse.data.values;
    if (!linksData || linksData.length === 0) {
      return res.status(200).json({
        status: 'NONE',
        timestamp: null,
        pickCount: 0
      });
    }

    // Find the latest entry for this user
    // We need to filter by phase somehow - but Links sheet doesn't have phase info
    // For now, we'll just get the latest entry for the user and assume it's for the requested phase
    // A better implementation would include phase in the Links sheet
    let latestEntry = null;
    let latestTimestamp = null;

    for (let i = linksData.length - 1; i >= 0; i--) {
      const row = linksData[i];
      if (row[0] === name) {
        latestEntry = row;
        latestTimestamp = row[1];
        break;
      }
    }

    if (!latestEntry) {
      return res.status(200).json({
        status: 'NONE',
        timestamp: null,
        pickCount: 0
      });
    }

    // Read status column (default "SUBMITTED" if missing for backward compat)
    const status = latestEntry[2] || 'SUBMITTED';

    // Step 2: Count non-empty picks from predictions sheet based on phase
    let sheetRange = '';
    if (phase === 'group-stage') {
      sheetRange = `${config.sheets.predictionsOverview}!A1:Z1000`;
    } else if (phase === 'super8') {
      sheetRange = `${config.sheets.super4}!A1:Z1000`;
    } else if (phase === 'finals') {
      sheetRange = `${config.sheets.finals}!A1:Z1000`;
    } else {
      return res.status(400).json({ error: 'Invalid phase parameter' });
    }

    let pickCount = 0;
    try {
      const predictionsResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEET_ID!,
        range: sheetRange,
      });

      const predictionsData = predictionsResponse.data.values;
      if (predictionsData && predictionsData.length > 0) {
        const headers = predictionsData[0];
        const userColumnIndex = headers.indexOf(name);
        if (userColumnIndex !== -1) {
          for (let i = 1; i < predictionsData.length; i++) {
            if (predictionsData[i][userColumnIndex]) {
              pickCount++;
            }
          }
        }
      }
    } catch (sheetErr) {
      // Tab may not exist yet (e.g. Finals tab before knockouts) — return 0 picks
      console.warn(`Could not fetch sheet for phase "${phase}":`, sheetRange, sheetErr);
    }

    return res.status(200).json({
      status,
      timestamp: latestTimestamp,
      pickCount
    });
  } catch (error) {
    console.error('Error fetching submission status:', error);
    return res.status(500).json({ error: 'Error fetching submission status' });
  }
}
