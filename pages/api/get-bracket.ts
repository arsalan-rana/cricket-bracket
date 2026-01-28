// pages/api/get-bracket.ts

import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req });

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

    // Fetch fixture picks from "Predictions Overview" sheet
    const sheetResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID!,
      range: 'Predictions Overview!A1:Z1000',
    });
    const data = sheetResponse.data.values;
    const picks: { [match: number]: string } = {};

    // If sheet has data and headers exist
    if (data && data.length > 0) {
      const headers = data[0];
      const userColumnIndex = headers.indexOf(name);
      if (userColumnIndex !== -1) {
        for (let i = 1; i < data.length; i++) {
          if (data[i] && data[i][userColumnIndex]) {
            picks[i] = data[i][userColumnIndex]; // Store match number as key
          }
        }
      }
    }

    // Fetch bonus picks from "Bonuses Overview" sheet
    const bonusResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID!,
      range: 'Bonuses Overview!A1:Z1000',
    });
    const bonusData = bonusResponse.data.values;
    let bonusPicks: { [category: string]: string } = {};
    if (bonusData && bonusData.length > 0) {
      const bonusHeader = bonusData[0];
      const bonusUserColIndex = bonusHeader.indexOf(name);
      if (bonusUserColIndex !== -1) {
        for (let i = 1; i < bonusData.length; i++) {
          const row = bonusData[i];
          const category = row[0]; // first column is the bonus category
          if (category) {
            bonusPicks[category] = row[bonusUserColIndex] || "";
          }
        }
      }
    }

    return res.status(200).json({ picks, bonusPicks });
  } catch (error) {
    console.error('Error fetching user picks:', error);
    return res.status(500).json({ error: 'Error fetching data' });
  }
}