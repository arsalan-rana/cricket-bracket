'use client';

import { useSession, signIn } from 'next-auth/react';
import React, { useEffect, useState, useMemo } from 'react';
import {
  Container,
  Typography,
  Box,
  Tabs,
  Tab,
  Skeleton,
  Button,
  Alert,
} from '@mui/material';
import { teamFlags, getConfig } from '@/lib/useTournament';
import { SYSTEM_COLUMNS } from '@/lib/sheets';

// ─── TYPES ──────────────────────────────────────────────────────────────────

interface Match {
  id: number;
  t1: string;
  t2: string;
  w: string;
  picks: { [player: string]: string };
}

interface TeamStat {
  name: string;
  totalPicked: number;
  timesPlayed: number;
  timesWon: number;
  avgPickRate: number;
  pickedAndLost: number;
  notPickedAndWon: number;
}

interface PlayerStat {
  name: string;
  correct: number;
  total: number;
  accuracy: number;
  contrarian: number;
  contrarianRate: number;
  upsetsCalled: number;
  bigBustsMissed: number;
  longestStreak: number;
  longestLoss: number;
}

interface BustMatch extends Match {
  loser: string;
  pickedLoser: number;
  total: number;
  pct: number;
}

interface UpsetMatch extends Match {
  pickedWinner: number;
  total: number;
  pct: number;
}

interface DifficultyMatch extends Match {
  wrong: number;
  total: number;
  difficulty: number;
}

interface IndPakPick {
  name: string;
  pick: string;
  correct: boolean;
}

interface AnalyticsData {
  teamList: TeamStat[];
  mostPicked: TeamStat[];
  leastPicked: TeamStat[];
  bustMatches: BustMatch[];
  upsetMatches: UpsetMatch[];
  consensusRight: Match[];
  consensusWrong: Match[];
  matchDifficulty: DifficultyMatch[];
  playerStats: PlayerStat[];
  indPakPicks: IndPakPick[];
  players: string[];
  allMatches: Match[];
}

// ─── FLAG HELPER ────────────────────────────────────────────────────────────

const FLAG = teamFlags;

// ─── SHEET DATA TRANSFORM ───────────────────────────────────────────────────

function transformSheetToMatches(data: any[][] | undefined): Match[] {
  if (!data || data.length === 0) return [];
  const header = data[0];
  const matchIdx = header.indexOf('Match');
  const t1Idx = header.indexOf('Team 1');
  const t2Idx = header.indexOf('Team 2');
  const winnerIdx = header.indexOf('Winner');

  if ([matchIdx, t1Idx, t2Idx, winnerIdx].includes(-1)) return [];

  // Player columns = all columns not in SYSTEM_COLUMNS
  const playerCols: { name: string; idx: number }[] = [];
  for (let j = 0; j < header.length; j++) {
    if (!SYSTEM_COLUMNS.includes(header[j]) && header[j]) {
      playerCols.push({ name: header[j], idx: j });
    }
  }

  const matches: Match[] = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || !row[matchIdx]) continue;
    // Skip duplicate header rows
    if (row[matchIdx] === 'Match' && row[t1Idx] === 'Team 1') continue;

    const matchStr = String(row[matchIdx]).replace(/\D/g, '');
    const matchNum = parseInt(matchStr);
    if (isNaN(matchNum)) continue;

    const winner = row[winnerIdx] || '';
    // Only include matches that have been played (have a winner)
    if (!winner || winner.trim() === '') continue;

    const picks: { [player: string]: string } = {};
    for (const pc of playerCols) {
      if (row[pc.idx] && row[pc.idx].trim() !== '') {
        picks[pc.name] = row[pc.idx];
      }
    }

    matches.push({
      id: matchNum,
      t1: row[t1Idx] || '',
      t2: row[t2Idx] || '',
      w: winner.trim(),
      picks,
    });
  }

  return matches;
}

/**
 * Transform Finals sheet data — match numbers are derived from row position,
 * not from a "Match" column. Mirrors the fixtures page's transformFinalsSheetData.
 */
function transformFinalsSheetToMatches(data: any[][] | undefined): Match[] {
  if (!data || data.length === 0) return [];
  const cfg = getConfig();
  const header = data[0];
  const offset = cfg.phases.find((p: any) => p.id === 'finals')?.matchRange?.start ?? 53;

  const t1Idx = header.indexOf('Team 1');
  const t2Idx = header.indexOf('Team 2');
  const winnerIdx = header.indexOf('Winner');

  // Player columns
  const playerCols: { name: string; idx: number }[] = [];
  for (let j = 0; j < header.length; j++) {
    if (!SYSTEM_COLUMNS.includes(header[j]) && header[j]) {
      playerCols.push({ name: header[j], idx: j });
    }
  }

  const matches: Match[] = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row) continue;
    const matchNum = (offset - 1) + i;

    const t1 = (t1Idx !== -1 && row[t1Idx]) || '';
    const t2 = (t2Idx !== -1 && row[t2Idx]) || '';
    const winner = (winnerIdx !== -1 && row[winnerIdx]) || '';

    // Skip rows without teams or winner
    if (!t1 || !t2 || !winner || winner.trim() === '') continue;

    const picks: { [player: string]: string } = {};
    for (const pc of playerCols) {
      if (row[pc.idx] && row[pc.idx].trim() !== '') {
        picks[pc.name] = row[pc.idx];
      }
    }

    matches.push({ id: matchNum, t1, t2, w: winner.trim(), picks });
  }

  return matches;
}

// ─── ANALYTICS ENGINE ───────────────────────────────────────────────────────

function computeAll(allMatches: Match[], players: string[]): AnalyticsData {
  const scoreable = allMatches.filter(m => m.w !== 'DRAW');

  // ── TEAM STATS ──
  const teams: {
    [name: string]: {
      timesPlayed: number;
      timesWon: number;
      totalPicked: number;
      pickedAndWon: number;
      pickedAndLost: number;
      notPickedAndWon: number;
      participantCount: number;
    };
  } = {};

  for (const m of scoreable) {
    [m.t1, m.t2].forEach(t => {
      if (!teams[t])
        teams[t] = { timesPlayed: 0, timesWon: 0, totalPicked: 0, pickedAndWon: 0, pickedAndLost: 0, notPickedAndWon: 0, participantCount: 0 };
    });
    const participants = players.filter(p => m.picks[p]);
    const n = participants.length;
    teams[m.t1].timesPlayed++;
    teams[m.t2].timesPlayed++;
    teams[m.w].timesWon++;

    participants.forEach(p => {
      const pick = m.picks[p];
      if (pick === m.t1) teams[m.t1].totalPicked += 1;
      if (pick === m.t2) teams[m.t2].totalPicked += 1;
    });

    const pickedWinner = participants.filter(p => m.picks[p] === m.w).length;
    const notPickedWinner = n - pickedWinner;
    teams[m.w].pickedAndWon += pickedWinner;
    teams[m.w].notPickedAndWon += notPickedWinner;
    const loser = m.w === m.t1 ? m.t2 : m.t1;
    teams[loser].pickedAndLost += participants.filter(p => m.picks[p] === loser).length;
    teams[m.t1].participantCount += n;
    teams[m.t2].participantCount += n;
  }

  // ── MOST/LEAST PICKED ──
  const teamList: TeamStat[] = Object.entries(teams)
    .map(([name, d]) => ({
      name,
      totalPicked: d.totalPicked,
      timesPlayed: d.timesPlayed,
      timesWon: d.timesWon,
      avgPickRate: d.timesPlayed > 0 ? d.totalPicked / (d.participantCount / 2) : 0,
      pickedAndLost: d.pickedAndLost,
      notPickedAndWon: d.notPickedAndWon,
    }))
    .filter(t => t.timesPlayed > 0);

  teamList.sort((a, b) => b.totalPicked - a.totalPicked);
  const mostPicked = teamList.slice(0, 5);
  const leastPicked = [...teamList].sort((a, b) => a.totalPicked - b.totalPicked).slice(0, 5);

  // ── BIGGEST BUSTS ──
  const bustMatches: BustMatch[] = scoreable
    .map(m => {
      const participants = players.filter(p => m.picks[p]);
      const loser = m.w === m.t1 ? m.t2 : m.t1;
      const pickedLoser = participants.filter(p => m.picks[p] === loser).length;
      return { ...m, loser, pickedLoser, total: participants.length, pct: participants.length ? pickedLoser / participants.length : 0 };
    })
    .filter(m => m.pickedLoser > 0)
    .sort((a, b) => b.pickedLoser - a.pickedLoser);

  // ── BIGGEST UPSETS ──
  const upsetMatches: UpsetMatch[] = scoreable
    .map(m => {
      const participants = players.filter(p => m.picks[p]);
      const pickedWinner = participants.filter(p => m.picks[p] === m.w).length;
      return { ...m, pickedWinner, total: participants.length, pct: participants.length ? pickedWinner / participants.length : 0 };
    })
    .filter(m => m.pickedWinner <= 2)
    .sort((a, b) => a.pickedWinner - b.pickedWinner);

  // ── CONSENSUS MATCHES ──
  const consensusRight = scoreable.filter(m => {
    const ps = players.filter(p => m.picks[p]);
    return ps.length > 0 && ps.every(p => m.picks[p] === m.w);
  });
  const consensusWrong = scoreable.filter(m => {
    const ps = players.filter(p => m.picks[p]);
    return ps.length > 0 && ps.every(p => m.picks[p] !== m.w);
  });

  // ── PLAYER PROFILES ──
  const playerStats: PlayerStat[] = players
    .map(player => {
      let correct = 0,
        total = 0,
        contrarian = 0,
        upsetsCalled = 0,
        bigBustsMissed = 0;
      let longestStreak = 0,
        curStreak = 0,
        longestLoss = 0,
        curLoss = 0;

      for (const m of scoreable) {
        if (!m.picks[player]) continue;
        total++;
        const participants = players.filter(p => m.picks[p]);
        const pickCounts: { [pick: string]: number } = {};
        participants.forEach(p => {
          const pk = m.picks[p];
          pickCounts[pk] = (pickCounts[pk] || 0) + 1;
        });
        const consensusPick = Object.entries(pickCounts).reduce((a, b) => (b[1] > a[1] ? b : a))[0];
        const myPick = m.picks[player];
        const isContrarian = myPick !== consensusPick;
        if (isContrarian) contrarian++;

        const isCorrect = myPick === m.w;
        if (isCorrect) {
          correct++;
          curStreak++;
          curLoss = 0;
          longestStreak = Math.max(longestStreak, curStreak);
          const pickedWinner = participants.filter(p => m.picks[p] === m.w).length;
          if (pickedWinner <= 3) upsetsCalled++;
        } else {
          curLoss++;
          curStreak = 0;
          longestLoss = Math.max(longestLoss, curLoss);
          const pickedLoser = participants.filter(p => m.picks[p] === myPick).length;
          if (pickedLoser >= 8) bigBustsMissed++;
        }
      }

      return {
        name: player,
        correct,
        total,
        accuracy: total ? Math.round((correct / total) * 100) : 0,
        contrarian,
        contrarianRate: total ? Math.round((contrarian / total) * 100) : 0,
        upsetsCalled,
        bigBustsMissed,
        longestStreak,
        longestLoss,
      };
    })
    .sort((a, b) => b.accuracy - a.accuracy);

  // ── INDIA vs PAKISTAN ──
  const indPak = allMatches.find(m => m.id === 27);
  const indPakPicks: IndPakPick[] = indPak
    ? players
        .filter(p => indPak.picks[p])
        .map(p => ({
          name: p,
          pick: indPak.picks[p],
          correct: indPak.picks[p] === indPak.w,
        }))
    : [];

  // ── MATCH DIFFICULTY ──
  const matchDifficulty: DifficultyMatch[] = scoreable
    .map(m => {
      const ps = players.filter(p => m.picks[p]);
      const wrong = ps.filter(p => m.picks[p] !== m.w).length;
      return { ...m, wrong, total: ps.length, difficulty: ps.length ? wrong / ps.length : 0 };
    })
    .sort((a, b) => b.difficulty - a.difficulty);

  return {
    teamList,
    mostPicked,
    leastPicked,
    bustMatches,
    upsetMatches,
    consensusRight,
    consensusWrong,
    matchDifficulty,
    playerStats,
    indPakPicks,
    players,
    allMatches,
  };
}

// ── ARCHETYPE (relative to the group) ──
function archetype(p: PlayerStat, allStats: PlayerStat[]): { label: string; emoji: string; desc: string } {
  const sorted = [...allStats];
  const n = sorted.length;

  // Rank helpers (1 = best/highest)
  const accRank = sorted.sort((a, b) => b.accuracy - a.accuracy).findIndex(x => x.name === p.name) + 1;
  const contRank = sorted.sort((a, b) => b.contrarianRate - a.contrarianRate).findIndex(x => x.name === p.name) + 1;
  const upsetRank = sorted.sort((a, b) => b.upsetsCalled - a.upsetsCalled).findIndex(x => x.name === p.name) + 1;
  const streakRank = sorted.sort((a, b) => b.longestStreak - a.longestStreak).findIndex(x => x.name === p.name) + 1;
  const lossRank = sorted.sort((a, b) => b.longestLoss - a.longestLoss).findIndex(x => x.name === p.name) + 1;
  const bustRank = sorted.sort((a, b) => b.bigBustsMissed - a.bigBustsMissed).findIndex(x => x.name === p.name) + 1;

  const isTop3 = (rank: number) => rank <= Math.max(3, Math.ceil(n * 0.3));
  const isBottom3 = (rank: number) => rank > n - Math.max(3, Math.ceil(n * 0.3));

  // Oracle: high contrarian + actually calls upsets
  if (isTop3(contRank) && isTop3(upsetRank) && p.upsetsCalled > 0)
    return { label: 'The Oracle', emoji: '🔮', desc: 'Goes against the crowd and gets rewarded' };

  // Contrarian: goes against consensus most often
  if (contRank === 1 || (isTop3(contRank) && p.contrarianRate >= 15))
    return { label: 'The Contrarian', emoji: '🔥', desc: 'Loves to zig when everyone zags' };

  // Sharpshooter: best accuracy in the group
  if (accRank === 1)
    return { label: 'The Sharpshooter', emoji: '🎯', desc: 'Best accuracy in the group — pure precision' };

  // Streak King: longest win streak
  if (streakRank === 1 && p.longestStreak >= 8)
    return { label: 'The Streak King', emoji: '👑', desc: 'Goes on heaters that make everyone jealous' };

  // Safe Hand: top accuracy + low contrarian (follows the crowd, nails it)
  if (isTop3(accRank) && isBottom3(contRank))
    return { label: 'The Safe Hand', emoji: '🧱', desc: 'Solid, reliable, boring in the best way' };

  // Gambler: calls upsets but not necessarily contrarian overall
  if (isTop3(upsetRank) && p.upsetsCalled > 0)
    return { label: 'The Gambler', emoji: '🎲', desc: 'Sniffs out upsets with style' };

  // Heartbreak Kid: high busts missed, follows favourites that lose
  if (isTop3(bustRank) && p.bigBustsMissed > 0)
    return { label: 'The Heartbreak Kid', emoji: '💔', desc: 'Backs the favourite, cries when they bottle it' };

  // Cursed: longest losing streak
  if (lossRank === 1 && p.longestLoss >= 4)
    return { label: 'The Cursed', emoji: '😭', desc: 'Goes on runs that defy statistical probability' };

  // Underdog: bottom accuracy but still in the game
  if (isBottom3(accRank))
    return { label: 'The Underdog', emoji: '🐕', desc: 'Down but never out — the comeback is brewing' };

  // Middle of the pack
  if (p.accuracy >= 75)
    return { label: 'The Steady Eddie', emoji: '⚖️', desc: 'Consistently solid, never too flashy' };

  return { label: 'The Wildcard', emoji: '🃏', desc: 'Unpredictable — keeps everyone guessing' };
}

// ─── STYLED COMPONENTS ──────────────────────────────────────────────────────

const Card = ({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div
    style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 14,
      padding: '20px',
      marginBottom: 16,
      ...style,
    }}
  >
    {children}
  </div>
);

const SectionTitle = ({ children, color = '#d4a843' }: { children: React.ReactNode; color?: string }) => (
  <div style={{ fontSize: 11, letterSpacing: 3, color, textTransform: 'uppercase', marginBottom: 14, fontWeight: 700 }}>{children}</div>
);

const TeamBar = ({ team, value, max, color = '#52b788' }: { team: string; value: number; max: number; color?: string }) => (
  <div style={{ marginBottom: 10 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
      <span style={{ fontSize: 13, color: '#e8dcc8' }}>
        {FLAG[team] || '🏏'} {team}
      </span>
      <span style={{ fontSize: 13, fontWeight: 700, color }}>{value}</span>
    </div>
    <div style={{ height: 5, background: 'rgba(255,255,255,0.07)', borderRadius: 3 }}>
      <div style={{ height: '100%', width: `${(value / max) * 100}%`, background: color, borderRadius: 3, transition: 'width 0.5s ease' }} />
    </div>
  </div>
);

// ─── TAB PANEL ──────────────────────────────────────────────────────────────

function TeamsTab({ data }: { data: AnalyticsData }) {
  const { teamList, mostPicked, leastPicked } = data;
  const maxPicked = Math.max(...teamList.map(t => t.totalPicked));

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, marginBottom: 14 }}>
        <Card>
          <SectionTitle>🔥 Most Backed Teams</SectionTitle>
          <div style={{ fontSize: 11, color: '#5a7a5a', marginBottom: 12 }}>Total times picked across all matches</div>
          {mostPicked.map(t => (
            <TeamBar key={t.name} team={t.name} value={t.totalPicked} max={maxPicked} color="#d4a843" />
          ))}
        </Card>
        <Card>
          <SectionTitle color="#6a9a8a">🫥 Least Backed Teams</SectionTitle>
          <div style={{ fontSize: 11, color: '#5a7a5a', marginBottom: 12 }}>The unloved and the ignored</div>
          {leastPicked.map(t => (
            <TeamBar key={t.name} team={t.name} value={t.totalPicked} max={maxPicked} color="#4a8a6a" />
          ))}
        </Card>
      </div>

      <Card>
        <SectionTitle>📊 Complete Team Loyalty Index</SectionTitle>
        <div style={{ fontSize: 11, color: '#5a7a5a', marginBottom: 14 }}>Every team&apos;s pick count vs actual wins</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(212,168,67,0.3)' }}>
                {['Team', 'Played', 'Won', 'Total Picks', 'Picked & Lost 💔', 'Won Unbacked 👻'].map(h => (
                  <th key={h} style={{ padding: '8px 10px', color: '#d4a843', fontSize: 10, letterSpacing: 1, textAlign: 'left', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...teamList].sort((a, b) => b.totalPicked - a.totalPicked).map(t => (
                <tr key={t.name} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '9px 10px' }}>
                    {FLAG[t.name] || '🏏'} {t.name}
                  </td>
                  <td style={{ padding: '9px 10px', textAlign: 'center', color: '#7a9a7a' }}>{t.timesPlayed}</td>
                  <td style={{ padding: '9px 10px', textAlign: 'center', color: '#52b788' }}>{t.timesWon}</td>
                  <td style={{ padding: '9px 10px', textAlign: 'center', color: '#d4a843', fontWeight: 700 }}>{t.totalPicked}</td>
                  <td style={{ padding: '9px 10px', textAlign: 'center', color: t.pickedAndLost > 5 ? '#c05050' : '#8a6a6a' }}>{t.pickedAndLost}</td>
                  <td style={{ padding: '9px 10px', textAlign: 'center', color: t.notPickedAndWon > 2 ? '#52b788' : '#4a6a5a' }}>{t.notPickedAndWon}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function UpsetsTab({ data }: { data: AnalyticsData }) {
  const { bustMatches, upsetMatches, matchDifficulty } = data;

  return (
    <div>
      <Card>
        <SectionTitle color="#c05050">💔 Biggest Consensus Busts</SectionTitle>
        <div style={{ fontSize: 11, color: '#5a7a5a', marginBottom: 14 }}>Matches where the most people backed the loser</div>
        {bustMatches.slice(0, 6).map(m => {
          const pct = Math.round(m.pct * 100);
          return (
            <div
              key={m.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 14px',
                marginBottom: 8,
                background: 'rgba(180,50,50,0.07)',
                border: '1px solid rgba(180,50,50,0.18)',
                borderRadius: 10,
              }}
            >
              <div style={{ fontSize: 22, minWidth: 30 }}>💔</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, marginBottom: 3 }}>
                  <span style={{ color: '#e8dcc8' }}>
                    {FLAG[m.t1] || '🏏'} {m.t1}
                  </span>
                  <span style={{ color: '#4a4a4a', margin: '0 8px' }}>vs</span>
                  <span style={{ color: '#e8dcc8' }}>
                    {FLAG[m.t2] || '🏏'} {m.t2}
                  </span>
                  <span style={{ fontSize: 10, color: '#5a5a5a', marginLeft: 8 }}>M{m.id}</span>
                </div>
                <div style={{ fontSize: 12, color: '#8a7a6a' }}>
                  <span style={{ color: '#c05050', fontWeight: 700 }}>
                    {m.pickedLoser}/{m.total} picked {FLAG[m.loser]} {m.loser}
                  </span>
                  <span style={{ color: '#4a4a4a', margin: '0 6px' }}>·</span>
                  <span style={{ color: '#52b788' }}>
                    {FLAG[m.w]} {m.w} won
                  </span>
                </div>
              </div>
              <div style={{ textAlign: 'center', minWidth: 52 }}>
                <div style={{ fontSize: 20, fontWeight: 900, color: '#c05050' }}>{pct}%</div>
                <div style={{ fontSize: 10, color: '#5a4a4a' }}>got it wrong</div>
              </div>
            </div>
          );
        })}
      </Card>

      <Card>
        <SectionTitle color="#52b788">👻 Unbacked Winners</SectionTitle>
        <div style={{ fontSize: 11, color: '#5a7a5a', marginBottom: 14 }}>Won with nobody (or almost nobody) backing them</div>
        {upsetMatches.slice(0, 6).map(m => (
          <div
            key={m.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 14px',
              marginBottom: 8,
              background: 'rgba(50,140,80,0.07)',
              border: '1px solid rgba(50,140,80,0.18)',
              borderRadius: 10,
            }}
          >
            <div style={{ fontSize: 22, minWidth: 30 }}>👻</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, marginBottom: 3 }}>
                <span style={{ color: '#e8dcc8' }}>
                  {FLAG[m.t1] || '🏏'} {m.t1}
                </span>
                <span style={{ color: '#4a4a4a', margin: '0 8px' }}>vs</span>
                <span style={{ color: '#e8dcc8' }}>
                  {FLAG[m.t2] || '🏏'} {m.t2}
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#8a7a6a' }}>
                <span style={{ color: '#52b788', fontWeight: 700 }}>
                  Only {m.pickedWinner}/{m.total} backed {FLAG[m.w]} {m.w}
                </span>
                <span style={{ color: '#4a4a4a', margin: '0 6px' }}>·</span>
                <span style={{ color: '#d4a843' }}>They won anyway 🎉</span>
              </div>
            </div>
            <div style={{ textAlign: 'center', minWidth: 52 }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#52b788' }}>{Math.round(m.pct * 100)}%</div>
              <div style={{ fontSize: 10, color: '#4a6a5a' }}>backed them</div>
            </div>
          </div>
        ))}
      </Card>

      <Card>
        <SectionTitle color="#8a7aaa">🎯 Hardest Matches to Call</SectionTitle>
        <div style={{ fontSize: 11, color: '#5a7a5a', marginBottom: 14 }}>Ranked by % of participants who got it wrong</div>
        {matchDifficulty.slice(0, 8).map((m, i) => {
          const wrongPct = Math.round(m.difficulty * 100);
          const color = wrongPct >= 80 ? '#c05050' : wrongPct >= 50 ? '#d4a843' : '#52b788';
          return (
            <div
              key={m.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 8,
                padding: '8px 12px',
                background: 'rgba(255,255,255,0.02)',
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <span style={{ color: '#4a4a4a', minWidth: 22, fontSize: 13 }}>#{i + 1}</span>
              <span style={{ flex: 1, fontSize: 12, color: '#c0b09a' }}>
                {FLAG[m.t1] || '🏏'} {m.t1} vs {FLAG[m.t2] || '🏏'} {m.t2}
              </span>
              <span style={{ fontSize: 11, color: '#52b788', minWidth: 80, textAlign: 'right' }}>
                ✓ {FLAG[m.w]} {m.w}
              </span>
              <span style={{ fontWeight: 900, color, minWidth: 44, textAlign: 'right' }}>{wrongPct}% 💀</span>
            </div>
          );
        })}
      </Card>
    </div>
  );
}

function PlayersTab({ data }: { data: AnalyticsData }) {
  const { playerStats } = data;

  return (
    <div>
      <Card>
        <SectionTitle>🎭 Player Archetypes</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 10 }}>
          {playerStats.map(p => {
            const arc = archetype(p, playerStats);
            const rank = [...playerStats].sort((a, b) => b.accuracy - a.accuracy).findIndex(x => x.name === p.name) + 1;
            return (
              <div
                key={p.name}
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 12,
                  padding: '14px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#e8dcc8' }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: '#d4a843', marginTop: 2 }}>
                      {arc.emoji} {arc.label}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 18, fontWeight: 900, color: '#d4a843' }}>#{rank}</div>
                    <div style={{ fontSize: 10, color: '#5a5a5a' }}>{p.accuracy}% acc</div>
                  </div>
                </div>
                <div style={{ fontSize: 10, color: '#7a6a5a', marginBottom: 10, fontStyle: 'italic' }}>{arc.desc}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {(
                    [
                      ['Accuracy', `${p.accuracy}%`, '#52b788'],
                      ['Contrarian', `${p.contrarianRate}%`, '#8a7aaa'],
                      ['Upsets Called', String(p.upsetsCalled), '#d4a843'],
                      ['Best Streak', `${p.longestStreak}✓`, '#5aa0c0'],
                    ] as const
                  ).map(([label, val, col]) => (
                    <div key={label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '6px 8px' }}>
                      <div style={{ fontSize: 9, color: '#5a5a5a', letterSpacing: 1, textTransform: 'uppercase' }}>{label}</div>
                      <div style={{ fontSize: 16, fontWeight: 900, color: col }}>{val}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <SectionTitle>📊 Full Player Stats</SectionTitle>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(212,168,67,0.3)' }}>
                {['#', 'Player', 'Raw Acc.', 'Correct', 'Total', 'Contrarian%', 'Upsets Called', 'Busts Missed', 'Best Streak', 'Worst Skid'].map(h => (
                  <th key={h} style={{ padding: '7px 8px', color: '#d4a843', fontSize: 9, letterSpacing: 1, textAlign: 'left', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {playerStats.map((p, i) => (
                <tr key={p.name} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '8px', color: '#5a5a5a', fontWeight: 700 }}>{i + 1}</td>
                  <td style={{ padding: '8px', color: '#e8dcc8', whiteSpace: 'nowrap' }}>{p.name}</td>
                  <td style={{ padding: '8px', color: p.accuracy >= 65 ? '#52b788' : p.accuracy >= 50 ? '#d4a843' : '#c05050', fontWeight: 700 }}>
                    {p.accuracy}%
                  </td>
                  <td style={{ padding: '8px', color: '#7a9a7a' }}>{p.correct}</td>
                  <td style={{ padding: '8px', color: '#7a9a7a' }}>{p.total}</td>
                  <td style={{ padding: '8px', color: p.contrarianRate >= 20 ? '#8a7aaa' : '#5a5a6a' }}>{p.contrarianRate}%</td>
                  <td style={{ padding: '8px', color: p.upsetsCalled >= 3 ? '#d4a843' : '#5a5a5a', fontWeight: p.upsetsCalled >= 3 ? 700 : 400 }}>
                    {p.upsetsCalled}
                  </td>
                  <td style={{ padding: '8px', color: p.bigBustsMissed >= 4 ? '#c05050' : '#5a5a5a' }}>{p.bigBustsMissed}</td>
                  <td style={{ padding: '8px', color: '#5aa0c0' }}>{p.longestStreak} in a row ✓</td>
                  <td style={{ padding: '8px', color: p.longestLoss >= 5 ? '#c05050' : '#6a5a5a' }}>{p.longestLoss} in a row ✗</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function MomentsTab({ data }: { data: AnalyticsData }) {
  const { indPakPicks, consensusRight, consensusWrong, playerStats, bustMatches, upsetMatches, allMatches } = data;
  const scoreable = allMatches.filter(m => m.w !== 'DRAW');
  const indPak = allMatches.find(m => m.id === 27);

  return (
    <div>
      {/* India vs Pakistan - hardcoded match 27 */}
      {indPak && indPakPicks.length > 0 && (
        <Card style={{ borderColor: 'rgba(212,168,67,0.3)', background: 'rgba(212,168,67,0.04)' }}>
          <SectionTitle>🇮🇳🇵🇰 The Big One: India vs Pakistan</SectionTitle>
          <div style={{ fontSize: 11, color: '#7a9a7a', marginBottom: 14 }}>
            Match 27 · {indPak.w} won · The group&apos;s loyalty test
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            {['India', 'Pakistan'].map(side => {
              const backers = indPakPicks.filter(p => p.pick === side);
              return (
                <div
                  key={side}
                  style={{
                    background: side === 'India' ? 'rgba(255,153,51,0.07)' : 'rgba(0,100,0,0.07)',
                    border: `1px solid ${side === 'India' ? 'rgba(255,153,51,0.2)' : 'rgba(0,150,0,0.2)'}`,
                    borderRadius: 12,
                    padding: 16,
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: 28, marginBottom: 4 }}>{FLAG[side]}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#e8dcc8', marginBottom: 2 }}>{side}</div>
                  <div style={{ fontSize: 11, color: '#6a7a6a', marginBottom: 10 }}>{side === indPak.w ? '✅ Won' : '❌ Lost'}</div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: side === 'India' ? '#ff9933' : '#52b788' }}>{backers.length}</div>
                  <div style={{ fontSize: 10, color: '#5a5a5a', marginBottom: 10 }}>backed them</div>
                  {backers.map(b => (
                    <div
                      key={b.name}
                      style={{
                        fontSize: 11,
                        padding: '3px 8px',
                        borderRadius: 20,
                        marginBottom: 4,
                        display: 'inline-block',
                        marginRight: 4,
                        background: b.correct ? 'rgba(82,183,136,0.15)' : 'rgba(180,60,60,0.15)',
                        color: b.correct ? '#52b788' : '#c05050',
                        border: `1px solid ${b.correct ? 'rgba(82,183,136,0.3)' : 'rgba(180,60,60,0.3)'}`,
                      }}
                    >
                      {b.name}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Consensus matches */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
        <Card>
          <SectionTitle color="#52b788">🤝 Universal Agreement (All Right)</SectionTitle>
          <div style={{ fontSize: 11, color: '#5a7a5a', marginBottom: 12 }}>Matches where every participant got it correct</div>
          {consensusRight.slice(0, 8).map(m => (
            <div
              key={m.id}
              style={{ fontSize: 12, padding: '6px 10px', marginBottom: 5, background: 'rgba(82,183,136,0.07)', borderRadius: 7, border: '1px solid rgba(82,183,136,0.15)' }}
            >
              ✅ M{m.id}: {m.t1} vs {m.t2} → {FLAG[m.w]} {m.w}
            </div>
          ))}
          <div style={{ fontSize: 11, color: '#4a6a4a', marginTop: 8 }}>{consensusRight.length} matches total</div>
        </Card>
        <Card>
          <SectionTitle color="#c05050">😱 Mass Heartbreak (All Wrong)</SectionTitle>
          <div style={{ fontSize: 11, color: '#5a7a5a', marginBottom: 12 }}>Matches where nobody called it right</div>
          {consensusWrong.length === 0 ? (
            <div style={{ fontSize: 12, color: '#5a5a5a', fontStyle: 'italic' }}>No matches where literally everyone got it wrong. Impressive!</div>
          ) : (
            consensusWrong.map(m => (
              <div
                key={m.id}
                style={{ fontSize: 12, padding: '6px 10px', marginBottom: 5, background: 'rgba(180,50,50,0.07)', borderRadius: 7, border: '1px solid rgba(180,50,50,0.15)' }}
              >
                ❌ M{m.id}: {m.t1} vs {m.t2} → {FLAG[m.w]} {m.w} won
              </div>
            ))
          )}
          <div style={{ fontSize: 11, color: '#6a4a4a', marginTop: 8 }}>{consensusWrong.length} matches total</div>
        </Card>
      </div>

      {/* Hall of Fame & Shame */}
      <Card>
        <SectionTitle>🏆 Hall of Fame & Hall of Shame</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: '#52b788', letterSpacing: 2, marginBottom: 10 }}>🌟 FAME</div>
            {[
              {
                title: 'Most Contrarian Correct',
                badge: '🔮',
                name: (() => {
                  const best = playerStats.reduce((a, b) => (b.upsetsCalled > a.upsetsCalled ? b : a));
                  return `${best.name} (${best.upsetsCalled} upsets called)`;
                })(),
              },
              {
                title: 'Best Raw Accuracy',
                badge: '🎯',
                name: (() => {
                  const best = playerStats.reduce((a, b) => (b.accuracy > a.accuracy ? b : a));
                  return `${best.name} (${best.accuracy}%)`;
                })(),
              },
              {
                title: 'Longest Win Streak',
                badge: '🔥',
                name: (() => {
                  const best = playerStats.reduce((a, b) => (b.longestStreak > a.longestStreak ? b : a));
                  return `${best.name} (${best.longestStreak} in a row)`;
                })(),
              },
              {
                title: 'The Lone Wolf',
                badge: '🐺',
                name: (() => {
                  const best = playerStats.reduce((a, b) => (b.contrarianRate > a.contrarianRate ? b : a));
                  return `${best.name} (${best.contrarianRate}% contrarian)`;
                })(),
              },
            ].map(item => (
              <div
                key={item.title}
                style={{ padding: '10px 12px', marginBottom: 7, background: 'rgba(82,183,136,0.07)', border: '1px solid rgba(82,183,136,0.15)', borderRadius: 9 }}
              >
                <div style={{ fontSize: 10, color: '#4a6a5a', letterSpacing: 1, marginBottom: 2 }}>
                  {item.badge} {item.title.toUpperCase()}
                </div>
                <div style={{ fontSize: 13, color: '#52b788', fontWeight: 700 }}>{item.name}</div>
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#c05050', letterSpacing: 2, marginBottom: 10 }}>💀 SHAME</div>
            {[
              {
                title: 'Most Consensus Busts Missed',
                badge: '💔',
                name: (() => {
                  const worst = playerStats.reduce((a, b) => (b.bigBustsMissed > a.bigBustsMissed ? b : a));
                  return `${worst.name} (${worst.bigBustsMissed} times)`;
                })(),
              },
              {
                title: 'Worst Raw Accuracy',
                badge: '😭',
                name: (() => {
                  const worst = playerStats.reduce((a, b) => (b.accuracy < a.accuracy ? b : a));
                  return `${worst.name} (${worst.accuracy}%)`;
                })(),
              },
              {
                title: 'Longest Losing Streak',
                badge: '⬇️',
                name: (() => {
                  const worst = playerStats.reduce((a, b) => (b.longestLoss > a.longestLoss ? b : a));
                  return `${worst.name} (${worst.longestLoss} in a row)`;
                })(),
              },
            ].map(item => (
              <div
                key={item.title}
                style={{ padding: '10px 12px', marginBottom: 7, background: 'rgba(180,50,50,0.07)', border: '1px solid rgba(180,50,50,0.15)', borderRadius: 9 }}
              >
                <div style={{ fontSize: 10, color: '#6a4a4a', letterSpacing: 1, marginBottom: 2 }}>
                  {item.badge} {item.title.toUpperCase()}
                </div>
                <div style={{ fontSize: 13, color: '#c05050', fontWeight: 700 }}>{item.name}</div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Fun facts */}
      <Card style={{ borderColor: 'rgba(138,122,170,0.3)' }}>
        <SectionTitle color="#8a7aaa">🤓 Fun Facts & Trivia</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
          {[
            { emoji: '🌍', stat: `${consensusRight.length}/${scoreable.length}`, label: 'matches everyone got right', color: '#52b788' },
            { emoji: '💀', stat: `${consensusWrong.length}`, label: 'matches everyone got wrong', color: '#c05050' },
            {
              emoji: '🎲',
              stat: bustMatches[0] ? `M${bustMatches[0].id}` : 'N/A',
              label: `worst bust: ${bustMatches[0]?.loser || ''} vs ${bustMatches[0]?.w || ''}`,
              color: '#c05050',
            },
            {
              emoji: '👻',
              stat: upsetMatches[0] ? `M${upsetMatches[0].id}` : 'N/A',
              label: `biggest ghost win: ${upsetMatches[0]?.w || ''}`,
              color: '#8a7aaa',
            },
            {
              emoji: '🤝',
              stat: String(allMatches.filter(m => m.w === 'DRAW').length),
              label: 'matches ended in a DRAW (0 pts for all)',
              color: '#7a8a9a',
            },
          ].map(f => (
            <div
              key={f.label}
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 10,
                padding: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <span style={{ fontSize: 22 }}>{f.emoji}</span>
              <div>
                <div style={{ fontSize: 17, fontWeight: 900, color: f.color }}>{f.stat}</div>
                <div style={{ fontSize: 11, color: '#6a6a6a' }}>{f.label}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── MAIN PAGE ──────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const { data: session, status } = useSession();
  const [tab, setTab] = useState(0);
  const [allMatches, setAllMatches] = useState<Match[]>([]);
  const [players, setPlayers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;

    const fetchData = async () => {
      try {
        const res = await fetch('/api/sheets', { cache: 'no-store' });
        if (!res.ok) {
          setError('Failed to fetch data');
          return;
        }
        const result = await res.json();

        // Debug: log raw sheet data headers
        console.log('[Analytics] groupStage rows:', result.groupStage?.length, 'header:', result.groupStage?.[0]);
        console.log('[Analytics] super4 rows:', result.super4?.length, 'header:', result.super4?.[0]);
        console.log('[Analytics] finals rows:', result.finals?.length, 'header:', result.finals?.[0]);
        // Debug: log a sample data row
        if (result.groupStage?.[1]) console.log('[Analytics] groupStage row 1:', result.groupStage[1]);
        if (result.super4?.[1]) console.log('[Analytics] super4 row 1:', result.super4[1]);
        if (result.finals?.[1]) console.log('[Analytics] finals row 1:', result.finals[1]);

        // Transform all phases
        const groupMatches = transformSheetToMatches(result.groupStage);
        const super4Matches = transformSheetToMatches(result.super4);
        const finalsMatches = transformFinalsSheetToMatches(result.finals);

        console.log('[Analytics] groupMatches:', groupMatches.length, 'super4Matches:', super4Matches.length, 'finalsMatches:', finalsMatches.length);

        const combined = [...groupMatches, ...super4Matches, ...finalsMatches];
        // Sort by match id
        combined.sort((a, b) => a.id - b.id);

        // Extract unique player names from all picks
        const playerSet = new Set<string>();
        for (const m of combined) {
          Object.keys(m.picks).forEach(p => playerSet.add(p));
        }
        const playerList = Array.from(playerSet).sort();

        setAllMatches(combined);
        setPlayers(playerList);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [session]);

  const analyticsData = useMemo(() => {
    if (allMatches.length === 0 || players.length === 0) return null;
    return computeAll(allMatches, players);
  }, [allMatches, players]);

  if (status === 'loading' || loading) {
    return (
      <Container sx={{ py: 4, textAlign: 'center' }}>
        <Skeleton variant="rectangular" height={60} sx={{ mb: 2, borderRadius: 2 }} />
        <Skeleton variant="rectangular" height={40} sx={{ mb: 2, borderRadius: 2 }} />
        <Skeleton variant="rectangular" height={300} sx={{ mb: 2, borderRadius: 2 }} />
      </Container>
    );
  }

  if (!session) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100vh">
        <Typography align="center" color="error" gutterBottom>
          Please sign in to view analytics.
        </Typography>
        <Button variant="contained" color="primary" onClick={() => signIn()}>
          Sign In
        </Button>
      </Box>
    );
  }

  if (error) {
    return (
      <Container sx={{ py: 4 }}>
        <Alert severity="error">Error: {error}</Alert>
      </Container>
    );
  }

  if (!analyticsData) {
    return (
      <Container sx={{ py: 4 }}>
        <Alert severity="info">No match data available yet.</Alert>
      </Container>
    );
  }

  const totalMatches = analyticsData.allMatches.length;
  const totalPlayers = analyticsData.players.length;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at 20% 20%, #0d1f0d 0%, #060d06 40%, #080814 100%)',
        fontFamily: "'Palatino Linotype','Book Antiqua',Palatino,serif",
        color: '#e8dcc8',
      }}
    >
      {/* Header */}
      <div
        style={{
          background: 'linear-gradient(180deg,#1a3a1a 0%,#0d200d 100%)',
          borderBottom: '2px solid #d4a843',
          padding: '22px 20px 18px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 10, letterSpacing: 5, color: '#d4a843', marginBottom: 3 }}>T20 WORLD CUP 2026</div>
        <div style={{ fontSize: 28, fontWeight: 900, color: '#f0e6cc', letterSpacing: 0.5 }}>BRACKET INTELLIGENCE</div>
        <div style={{ fontSize: 12, color: '#7a9a7a', marginTop: 3, letterSpacing: 2 }}>
          {totalMatches} MATCHES · {totalPlayers} PREDICTORS · DEEP ANALYSIS
        </div>
      </div>

      {/* Tabs */}
      <Box sx={{ background: 'rgba(0,0,0,0.3)', display: 'flex', justifyContent: 'center' }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            '& .MuiTab-root': {
              color: '#6a7a5a',
              fontFamily: 'inherit',
              fontSize: 13,
              textTransform: 'none',
              minWidth: 100,
            },
            '& .Mui-selected': {
              color: '#d4a843 !important',
            },
            '& .MuiTabs-indicator': {
              backgroundColor: '#d4a843',
            },
          }}
        >
          <Tab label="🏏 Teams" />
          <Tab label="💥 Upsets" />
          <Tab label="🧠 Players" />
          <Tab label="🎭 Moments" />
        </Tabs>
      </Box>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '20px 16px 48px' }}>
        {tab === 0 && <TeamsTab data={analyticsData} />}
        {tab === 1 && <UpsetsTab data={analyticsData} />}
        {tab === 2 && <PlayersTab data={analyticsData} />}
        {tab === 3 && <MomentsTab data={analyticsData} />}
      </div>
    </div>
  );
}
