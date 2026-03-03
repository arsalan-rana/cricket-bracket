// pages/api/get-bracket-playoffs.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { google } from 'googleapis';
import { getMatchOffset, getConfig } from '@/lib/tournament';

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

    // Get the sheet name from config
    const config = getConfig();
    const super8SheetName = config.sheets.super4;

    // Fetch Super 8 picks — fail gracefully if tab doesn't exist yet
    const playoffsPicks: { [match: number]: string } = {};
    try {
      const playoffsResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEET_ID!,
        range: `${super8SheetName}!A1:Z1000`,
      });
      const playoffsData = playoffsResponse.data.values;
      if (playoffsData && playoffsData.length > 0) {
        const playoffsHeaders = playoffsData[0];
        const userColumnIndex = playoffsHeaders.indexOf(name);
        if (userColumnIndex !== -1) {
          const playoffsOffset = getMatchOffset('super4');
          for (let i = 1; i < playoffsData.length; i++) {
            if (playoffsData[i] && playoffsData[i][userColumnIndex]) {
              playoffsPicks[i + playoffsOffset] = playoffsData[i][userColumnIndex];
            }
          }
        }
      }
    } catch (err) {
      console.warn(`Could not fetch ${super8SheetName} tab — it may not exist yet:`, err);
    }

    // Fetch Finals sheet picks (contains both semi-finals rows 53-54 and final row 55)
    const finalsSheetName = config.sheets.finals;
    const semifinalsPicks: { [match: number]: string } = {};
    const finalsPicks: { [match: number]: string } = {};
    try {
      const finalsResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEET_ID!,
        range: `${finalsSheetName}!A1:Z1000`,
      });
      const finalsData = finalsResponse.data.values;
      if (finalsData && finalsData.length > 0) {
        const finalsHeaders = finalsData[0];
        const finalsUserColIndex = finalsHeaders.indexOf(name);
        if (finalsUserColIndex !== -1) {
          const finalsOffset = getMatchOffset('finals'); // offset = 52 (matchRange.start 53 - 1)
          const semisPhase = config.phases.find(p => p.id === 'semifinals');
          for (let i = 1; i < finalsData.length; i++) {
            if (finalsData[i] && finalsData[i][finalsUserColIndex]) {
              const matchNum = i + finalsOffset;
              const pick = finalsData[i][finalsUserColIndex];
              // Split into semis vs finals based on phase matchRange
              if (semisPhase && matchNum >= semisPhase.matchRange.start && matchNum <= semisPhase.matchRange.end) {
                semifinalsPicks[matchNum] = pick;
              } else {
                finalsPicks[matchNum] = pick;
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn(`Could not fetch ${finalsSheetName} tab — it may not exist yet:`, err);
    }

    return res.status(200).json({ playoffsPicks, semifinalsPicks, finalsPicks });
  } catch (error) {
    console.error('Error fetching playoff bracket picks:', error);
    return res.status(500).json({ error: 'Error fetching data' });
  }
}