'use client';

import { useState, useEffect } from 'react';
import { DateTime } from 'luxon';
import { Fixture } from '@/config/tournament.schema';

// Import config directly for client-side use
import t20WorldCup2026Config from '@/config/t20-world-cup-2026';

const config = t20WorldCup2026Config;

// Re-export types for convenience
export type { Fixture };

/**
 * Client-side tournament configuration hook and utilities
 */

// Team colors map (derived from config)
export const teamColors: { [key: string]: { primary: string; secondary: string } } = (() => {
  const colors: { [key: string]: { primary: string; secondary: string } } = {};
  for (const [team, style] of Object.entries(config.teams)) {
    colors[team] = { primary: style.primary, secondary: style.secondary };
  }
  return colors;
})();

// Team flags map (derived from config)
export const teamFlags: { [key: string]: string } = (() => {
  const flags: { [key: string]: string } = {};
  for (const [team, style] of Object.entries(config.teams)) {
    if (style.flag) {
      flags[team] = style.flag;
    }
  }
  return flags;
})();

// Bonus questions (derived from config)
export const bonusQuestions: string[] = config.bonusQuestions.map((q) => q.question);

// Bonus AI predictions (derived from config)
export const bonusPredictions: { [key: string]: string } = (() => {
  const predictions: { [key: string]: string } = {};
  for (const q of config.bonusQuestions) {
    if (q.aiPrediction) {
      predictions[q.question] = q.aiPrediction;
    }
  }
  return predictions;
})();

// Get deadline for a phase
export function getDeadline(phaseId: string): DateTime {
  const phase = config.phases.find((p) => p.id === phaseId);
  if (!phase) {
    throw new Error(`Phase not found: ${phaseId}`);
  }
  return DateTime.fromISO(phase.deadline, { zone: config.timezone });
}

// Get all deadlines dynamically
export function getAllDeadlines(): { [key: string]: DateTime } {
  const deadlines: { [key: string]: DateTime } = {};
  for (const phase of config.phases) {
    deadlines[phase.id] = DateTime.fromISO(phase.deadline, { zone: config.timezone });
  }
  // Also provide legacy keys for backward compatibility
  if (deadlines['group-stage']) deadlines.groupStage = deadlines['group-stage'];
  if (deadlines['super4']) deadlines.super4 = deadlines['super4'];
  if (deadlines['semifinals']) deadlines.semifinals = deadlines['semifinals'];
  if (deadlines['finals']) deadlines.finals = deadlines['finals'];
  return deadlines;
}

// Check if phase deadline has passed
export function isPhasePastDeadline(phaseId: string): boolean {
  const deadline = getDeadline(phaseId);
  const now = DateTime.now().setZone(config.timezone);
  return now > deadline;
}

// Get fixture start time
export function getFixtureStartTime(fixture: Fixture): Date {
  const dt = DateTime.fromFormat(
    `${fixture.date} ${config.year} ${config.fixtureStartTime}`,
    'd MMMM yyyy HH:mm',
    { zone: config.timezone }
  );
  return dt.toJSDate();
}

// Get current time in tournament timezone
export function getNow(): DateTime {
  return DateTime.now().setZone(config.timezone);
}

// Get tournament config
export function getConfig() {
  return config;
}

// Get phase information for a match number
export function getPhaseForMatch(matchNumber: number): { id: string; name: string; color: string; icon: string } | null {
  const phase = config.phases.find(
    (p) => matchNumber >= p.matchRange.start && matchNumber <= p.matchRange.end
  );

  if (!phase) return null;

  // Color scheme for phases
  const phaseColors: { [key: string]: { color: string; icon: string } } = {
    'group-stage': { color: '#1B5E20', icon: '🏏' },
    'super4': { color: '#FF6F00', icon: '🟡' },
    'semifinals': { color: '#9C27B0', icon: '🔥' },
    'finals': { color: '#D32F2F', icon: '🏆' },
  };

  const colorInfo = phaseColors[phase.id] || { color: '#1B5E20', icon: '🏏' };

  return {
    id: phase.id,
    name: phase.name,
    color: colorInfo.color,
    icon: colorInfo.icon,
  };
}

/**
 * Hook to fetch fixtures from API with loading/error states
 */
export function useFixtures(phaseId?: string) {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'sheets' | 'config'>('config');

  useEffect(() => {
    const fetchFixtures = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const url = phaseId
          ? `/api/get-fixtures?phase=${encodeURIComponent(phaseId)}`
          : '/api/get-fixtures';
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          setFixtures(data.fixtures);
          setSource(data.source);
        } else {
          // Fallback to config
          const fallbackFixtures = phaseId
            ? config.fixtures.filter((f) => f.phase === phaseId)
            : config.fixtures;
          setFixtures(fallbackFixtures);
          setSource('config');
        }
      } catch (err) {
        console.error('Error fetching fixtures:', err);
        // Fallback to config
        const fallbackFixtures = phaseId
          ? config.fixtures.filter((f) => f.phase === phaseId)
          : config.fixtures;
        setFixtures(fallbackFixtures);
        setSource('config');
        setError('Failed to fetch fixtures from server');
      } finally {
        setIsLoading(false);
      }
    };

    fetchFixtures();
  }, [phaseId]);

  return { fixtures, isLoading, error, source };
}

/**
 * Hook that returns fixtures split by phase (convenience hook)
 */
export function useAllFixtures() {
  const { fixtures, isLoading, error, source } = useFixtures();

  const groupStageFixtures = fixtures.filter((f) => f.phase === 'group-stage');
  const super4Fixtures = fixtures.filter((f) => f.phase === 'super4');
  const semifinalsFixtures = fixtures.filter((f) => f.phase === 'semifinals');
  const finalsFixtures = fixtures.filter((f) => f.phase === 'finals');

  return {
    fixtures,
    groupStageFixtures,
    super4Fixtures,
    semifinalsFixtures,
    finalsFixtures,
    isLoading,
    error,
    source,
  };
}

/**
 * Get fixtures for chips (future fixtures only)
 */
export function getFutureFixtures(allFixtures: Fixture[]): Fixture[] {
  const now = getNow().toJSDate();
  return allFixtures
    .filter((fixture) => getFixtureStartTime(fixture) > now)
    .sort((a, b) => a.match - b.match);
}
