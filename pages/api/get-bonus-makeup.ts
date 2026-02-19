// pages/api/get-bonus-makeup.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { name } = req.query;
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid name parameter' });
  }

  try {
    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      scopes: SCOPES,
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Fetch bonus picks from "Bonuses Overview" sheet
    const bonusResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID!,
      range: 'Bonuses Overview!A1:Z1000',
    });

    const bonusData = bonusResponse.data.values;
    const picks = {
      topScorer: '',
      topWicketTaker: ''
    };

    if (bonusData && bonusData.length > 0) {
      const bonusHeader = bonusData[0];
      const bonusUserColIndex = bonusHeader.indexOf(name);

      if (bonusUserColIndex !== -1) {
        for (let i = 1; i < bonusData.length; i++) {
          const row = bonusData[i];
          const category = row[0];

          if (category === "Tournament's Top Scorer") {
            picks.topScorer = row[bonusUserColIndex] || "";
          } else if (category === "Tournament's Top Wicket-taker") {
            picks.topWicketTaker = row[bonusUserColIndex] || "";
          }
        }
      }
    }

    return res.status(200).json({ picks });
  } catch (error) {
    console.error('Error fetching bonus makeup picks:', error);
    return res.status(500).json({ error: 'Error fetching data' });
  }
}
