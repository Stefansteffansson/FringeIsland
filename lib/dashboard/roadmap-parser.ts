/**
 * Roadmap Timeline Parser
 * Extracts phase information for timeline visualization
 */

import fs from 'fs';
import path from 'path';

const PROJECT_ROOT = process.cwd();

interface Phase {
  id: string;
  name: string;
  status: 'complete' | 'in-progress' | 'upcoming';
  percentage: number;
  label: string;
}

/**
 * Extract all phases from ROADMAP.md for timeline
 */
export function getPhaseTimeline(): Phase[] {
  try {
    const content = fs.readFileSync(
      path.join(PROJECT_ROOT, 'docs/planning/ROADMAP.md'),
      'utf-8'
    );

    const phases: Phase[] = [];

    // Phase 1 subphases
    const phase1Subphases = [
      { id: '1.1', name: 'Core Infrastructure', pattern: /Phase 1\.1[\s\S]*?✅ COMPLETE/ },
      { id: '1.2', name: 'User Management', pattern: /Phase 1\.2[\s\S]*?✅ COMPLETE/ },
      { id: '1.3', name: 'Group Management', pattern: /Phase 1\.3[\s\S]*?✅ COMPLETE/ },
      { id: '1.4', name: 'Journey System', pattern: /Phase 1\.4[\s\S]*?(\d+)% Complete/ },
      { id: '1.5', name: 'Communication', pattern: /Phase 1\.5[\s\S]*?NOT STARTED/ },
      { id: '1.6', name: 'Polish & Launch', pattern: /Phase 1\.6[\s\S]*?NOT STARTED/ },
    ];

    phase1Subphases.forEach(({ id, name, pattern }) => {
      const match = content.match(pattern);

      if (match) {
        if (match[0].includes('✅ COMPLETE')) {
          phases.push({ id, name, status: 'complete', percentage: 100, label: `Phase ${id}` });
        } else if (match[1]) {
          // In progress with percentage
          phases.push({
            id,
            name,
            status: 'in-progress',
            percentage: parseInt(match[1]),
            label: `Phase ${id}`
          });
        } else {
          // Not started
          phases.push({ id, name, status: 'upcoming', percentage: 0, label: `Phase ${id}` });
        }
      }
    });

    // Phase 2
    if (content.includes('Phase 2:') && content.includes('NOT STARTED')) {
      phases.push({
        id: '2',
        name: 'User-Generated Content',
        status: 'upcoming',
        percentage: 0,
        label: 'Phase 2'
      });
    }

    // Phase 3
    if (content.includes('Phase 3:') && content.includes('NOT STARTED')) {
      phases.push({
        id: '3',
        name: 'Dynamic Journeys',
        status: 'upcoming',
        percentage: 0,
        label: 'Phase 3'
      });
    }

    // Phase 4
    if (content.includes('Phase 4:') && content.includes('NOT STARTED')) {
      phases.push({
        id: '4',
        name: 'Developer Platform',
        status: 'upcoming',
        percentage: 0,
        label: 'Phase 4'
      });
    }

    return phases;
  } catch (error) {
    console.error('Error parsing roadmap timeline:', error);
    return [];
  }
}

/**
 * Get overall Phase 1 completion
 */
export function getOverallPhase1Progress(): number {
  const phases = getPhaseTimeline();
  const phase1Phases = phases.filter(p => p.id.startsWith('1.'));

  if (phase1Phases.length === 0) return 0;

  const totalPercentage = phase1Phases.reduce((sum, p) => sum + p.percentage, 0);
  return Math.round(totalPercentage / phase1Phases.length);
}
