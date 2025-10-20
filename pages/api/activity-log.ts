// pages/api/activity-log.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      scopes: SCOPES,
    });

    const sheets = google.sheets({ version: 'v4', auth });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID!,
      range: 'Activity Log!A:D',
    });

    const data = response.data.values || [];

    // Skip the header row if present
    const activities = data.slice(1).map(row => ({
      timestamp: row[0],
      eventType: row[1],
      user: row[2],
      details: row[3],
    }));

    // Optionally, you could reverse the array to show the most recent first:
    res.status(200).json({ activities: activities.reverse() });
  } catch (error) {
    console.error('Error fetching activity log:', error);
    res.status(500).json({ error: 'Error fetching activity log' });
  }
}