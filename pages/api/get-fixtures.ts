// pages/api/get-fixtures.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { google } from 'googleapis';
import {
  getConfig,
  getAllFixtures,
  isFeatureEnabled,
  getSheetName,
} from '@/lib/tournament';
import { Fixture } from '@/config/tournament.schema';
import { FIXTURES_HEADERS } from '@/lib/sheets';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];

// Simple in-memory cache
let fixturesCache: { data: Fixture[]; timestamp: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * API endpoint to fetch fixtures from Google Sheets or config fallback
 *
 * GET /api/get-fixtures
 * Query params:
 *   - phase: (optional) Filter fixtures by phase ID
 *   - refresh: (optional) Set to 'true' to bypass cache
 *
 * Returns: { fixtures: Fixture[], source: 'sheets' | 'config' }
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { phase, refresh } = req.query;
  const shouldRefresh = refresh === 'true';

  try {
    let fixtures: Fixture[];
    let source: 'sheets' | 'config';

    // Check if we should fetch from sheets
    if (isFeatureEnabled('fetchFixturesFromSheets')) {
      // Check cache first (unless refresh requested)
      if (
        !shouldRefresh &&
        fixturesCache &&
        Date.now() - fixturesCache.timestamp < CACHE_TTL_MS
      ) {
        fixtures = fixturesCache.data;
        source = 'sheets';
      } else {
        // Try to fetch from Google Sheets
        const sheetFixtures = await fetchFixturesFromSheets();
        if (sheetFixtures && sheetFixtures.length > 0) {
          fixtures = sheetFixtures;
          source = 'sheets';
          // Update cache
          fixturesCache = { data: fixtures, timestamp: Date.now() };
        } else {
          // Fallback to config
          fixtures = getAllFixtures();
          source = 'config';
        }
      }
    } else {
      // Use config directly
      fixtures = getAllFixtures();
      source = 'config';
    }

    // Filter by phase if specified
    if (phase && typeof phase === 'string') {
      fixtures = fixtures.filter((f) => f.phase === phase);
    }

    return res.status(200).json({ fixtures, source });
  } catch (error) {
    console.error('Error fetching fixtures:', error);
    // Fallback to config on error
    let fixtures = getAllFixtures();
    if (phase && typeof phase === 'string') {
      fixtures = fixtures.filter((f) => f.phase === phase);
    }
    return res.status(200).json({ fixtures, source: 'config' });
  }
}

/**
 * Fetch fixtures from Google Sheets
 */
async function fetchFixturesFromSheets(): Promise<Fixture[] | null> {
  try {
    const config = getConfig();
    if (!config.sheets.fixtures) {
      return null;
    }

    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      scopes: SCOPES,
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID!;
    const range = `${config.sheets.fixtures}!A1:Z100`;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values;
    if (!rows || rows.length < 2) {
      return null;
    }

    const headers = rows[0];

    // Find column indices
    const matchIdx = headers.indexOf('Match');
    const dateIdx = headers.indexOf('Date');
    const team1Idx = headers.indexOf('Team1');
    const team2Idx = headers.indexOf('Team2');
    const venueIdx = headers.indexOf('Venue');
    const phaseIdx = headers.indexOf('Phase');
    const aiPredIdx = headers.indexOf('AIPrediction');

    // Validate required columns exist
    if (matchIdx === -1 || team1Idx === -1 || team2Idx === -1) {
      console.warn('Fixtures sheet missing required columns');
      return null;
    }

    const fixtures: Fixture[] = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || !row[matchIdx]) continue;

      const fixture: Fixture = {
        match: parseInt(row[matchIdx], 10),
        date: dateIdx !== -1 ? row[dateIdx] || '' : '',
        team1: row[team1Idx] || '',
        team2: row[team2Idx] || '',
        venue: venueIdx !== -1 ? row[venueIdx] || '' : '',
        phase: phaseIdx !== -1 ? row[phaseIdx] || '' : '',
        aiPrediction: aiPredIdx !== -1 ? row[aiPredIdx] : undefined,
      };

      if (fixture.team1 && fixture.team2) {
        fixtures.push(fixture);
      }
    }

    return fixtures.length > 0 ? fixtures : null;
  } catch (error) {
    console.error('Error fetching fixtures from sheets:', error);
    return null;
  }
}
