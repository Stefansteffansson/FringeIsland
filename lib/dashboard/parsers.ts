/**
 * Dashboard Data Parsers
 *
 * These functions read and parse project markdown files to extract
 * structured data for the development dashboard.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const PROJECT_ROOT = process.cwd();

/**
 * Read a file from the project root
 */
function readProjectFile(relativePath: string): string {
  const fullPath = path.join(PROJECT_ROOT, relativePath);
  return fs.readFileSync(fullPath, 'utf-8');
}

/**
 * Extract version from PROJECT_STATUS.md
 */
export function getProjectVersion(): string {
  try {
    const content = readProjectFile('PROJECT_STATUS.md');
    const match = content.match(/\*\*Current Version:\*\* (.+)/);
    return match ? match[1] : 'Unknown';
  } catch {
    return 'Unknown';
  }
}

/**
 * Extract current focus from PROJECT_STATUS.md
 */
export function getCurrentFocus(): { focus: string; isComplete: boolean } {
  try {
    const content = readProjectFile('PROJECT_STATUS.md');
    const match = content.match(/\*\*Current Focus:\*\* (.+)/);
    if (match) {
      const focus = match[1];
      const isComplete = focus.includes('✅') || focus.includes('COMPLETED');
      return { focus, isComplete };
    }
    return { focus: 'Unknown', isComplete: false };
  } catch {
    return { focus: 'Unknown', isComplete: false };
  }
}

/**
 * Extract active tasks from PROJECT_STATUS.md
 */
export function getActiveTasks(): Array<{ task: string; completed: boolean }> {
  try {
    const content = readProjectFile('PROJECT_STATUS.md');
    const tasksSection = content.match(/\*\*Active Tasks:\*\*([\s\S]*?)\*\*Blocked/);
    if (!tasksSection) return [];

    const tasks = tasksSection[1]
      .split('\n')
      .filter(line => line.trim().startsWith('-'))
      .map(line => {
        const completed = line.includes('[x]') || line.includes('✅');
        const task = line
          .replace(/^- \[x\]/i, '')
          .replace(/^- \[ \]/i, '')
          .replace(/✅/g, '')
          .trim();
        return { task, completed };
      });

    return tasks;
  } catch {
    return [];
  }
}

/**
 * Extract blockers from PROJECT_STATUS.md
 */
export function getBlockers(): string[] {
  try {
    const content = readProjectFile('PROJECT_STATUS.md');
    const blockersSection = content.match(/\*\*Blocked\/Waiting:\*\*([\s\S]*?)---/);
    if (!blockersSection) return [];

    const blockers = blockersSection[1]
      .split('\n')
      .filter(line => line.trim().startsWith('-'))
      .map(line => line.replace(/^-\s*/, '').trim())
      .filter(blocker => blocker.toLowerCase() !== 'none');

    return blockers;
  } catch {
    return [];
  }
}

/**
 * Extract quick stats from PROJECT_STATUS.md
 */
export function getQuickStats(): {
  phase: string;
  tables: number;
  migrations: number;
  tests: { total: number; passing: number; percentage: number };
  behaviors: number;
} {
  try {
    const content = readProjectFile('PROJECT_STATUS.md');

    const phaseMatch = content.match(/\*\*Phase:\*\* (.+)/);
    const tablesMatch = content.match(/\*\*Total Tables:\*\* (\d+)/);
    const migrationsMatch = content.match(/\*\*Total Migrations:\*\* (\d+)/);
    // Matches either format:
    //   "110 tests, **110/110 passing**"  (current)
    //   "110 tests (110 passing"           (legacy)
    const testsMatch =
      content.match(/\*\*Test Coverage:\*\* (\d+) tests[^0-9]+(\d+)\/\d+ passing/) ||
      content.match(/\*\*Test Coverage:\*\* (\d+) tests \((\d+) passing/);
    const behaviorsMatch = content.match(/\*\*Behaviors Documented:\*\* (\d+)/);

    return {
      phase: phaseMatch ? phaseMatch[1] : 'Unknown',
      tables: tablesMatch ? parseInt(tablesMatch[1]) : 0,
      migrations: migrationsMatch ? parseInt(migrationsMatch[1]) : 0,
      tests: testsMatch ? {
        total: parseInt(testsMatch[1]),
        passing: parseInt(testsMatch[2]),
        percentage: Math.round((parseInt(testsMatch[2]) / parseInt(testsMatch[1])) * 100)
      } : { total: 0, passing: 0, percentage: 0 },
      behaviors: behaviorsMatch ? parseInt(behaviorsMatch[1]) : 0,
    };
  } catch {
    return {
      phase: 'Unknown',
      tables: 0,
      migrations: 0,
      tests: { total: 0, passing: 0, percentage: 0 },
      behaviors: 0,
    };
  }
}

/**
 * Extract next priorities from PROJECT_STATUS.md
 */
export function getNextPriorities(): Array<{ priority: string; status: string; phase?: string }> {
  try {
    const content = readProjectFile('PROJECT_STATUS.md');
    const prioritiesSection = content.match(/## 🎯 Next Priorities([\s\S]*?)---/);
    if (!prioritiesSection) return [];

    const priorities = prioritiesSection[1]
      .split('\n')
      .filter(line => /^\d+\./.test(line.trim()))
      .map(line => {
        let status = 'pending';
        if (line.includes('✅')) status = 'complete';
        else if (line.includes('🔄')) status = 'in-progress';
        else if (line.includes('⏳')) status = 'upcoming';

        // Extract phase label if present [Phase X.Y]
        const phaseMatch = line.match(/\[Phase ([\d.]+)\]/);
        const phase = phaseMatch ? phaseMatch[1] : undefined;

        const priority = line
          .replace(/^\d+\.\s*/, '')
          .replace(/\[Phase [\d.]+\]\s*/, '') // Remove phase label from text
          .replace(/[✅🔄⏳]/g, '')
          .trim();

        return { priority, status, phase };
      });

    return priorities;
  } catch {
    return [];
  }
}

/**
 * Extract phase completion from ROADMAP.md
 */
export function getPhaseProgress(): {
  currentPhase: string;
  percentage: number;
  description: string;
} {
  try {
    const content = readProjectFile('docs/planning/ROADMAP.md');

    // Look for the Phase 1 section with completion percentage
    const phaseMatch = content.match(/## Phase 1:.*?(\d+)% Complete/i);
    const descMatch = content.match(/## Phase 1: Foundation.*?\n\n\*\*Goal\*\*: (.+)/);

    return {
      currentPhase: 'Phase 1.4 - Journey System',
      percentage: phaseMatch ? parseInt(phaseMatch[1]) : 0,
      description: descMatch ? descMatch[1] : 'Launch a working platform',
    };
  } catch {
    return {
      currentPhase: 'Unknown',
      percentage: 0,
      description: '',
    };
  }
}

/**
 * Get deferred decisions from DEFERRED_DECISIONS.md
 */
export function getDeferredDecisions(): Array<{ decision: string; reason: string; deferredTo: string }> {
  try {
    const content = readProjectFile('docs/planning/DEFERRED_DECISIONS.md');

    // Extract decision items (look for ### headings)
    const decisions: Array<{ decision: string; reason: string; deferredTo: string }> = [];
    const sections = content.split(/###\s+/);

    sections.slice(1).forEach(section => {
      const lines = section.split('\n');
      const decision = lines[0].trim();

      // Skip meta sections (How to Use, Adding New, etc.)
      if (decision.toLowerCase().includes('how to use') ||
          decision.toLowerCase().includes('adding new')) {
        return;
      }

      // Find the "Deferred To" line
      const deferredToLine = lines.find(line => line.includes('**Deferred To**:'));
      const deferredTo = deferredToLine
        ? deferredToLine.replace(/\*\*Deferred To\*\*:\s*/i, '').trim()
        : null;

      // Only include if we have a valid "Deferred To"
      if (!deferredTo) return;

      // Find reason from multiple possible sources
      let reason = '';

      // Try to find "Decision:" line
      const decisionLine = lines.find(line => line.includes('**Decision**:'));
      if (decisionLine) {
        reason = decisionLine.replace(/\*\*Decision\*\*:\s*/i, '').trim();
      }

      // Or try to find "Rationale:" section with bullet points
      const rationaleIndex = lines.findIndex(line => line.includes('**Rationale**:'));
      if (rationaleIndex !== -1 && !reason) {
        const reasonLines = [];
        for (let i = rationaleIndex + 1; i < Math.min(rationaleIndex + 4, lines.length); i++) {
          const line = lines[i].trim();
          if (line.startsWith('**') || line.startsWith('##')) break;
          if (line.startsWith('-')) {
            reasonLines.push(line.replace(/^-\s*/, ''));
          }
        }
        reason = reasonLines.join('; ');
      }

      // Or try "Context:" as fallback
      if (!reason) {
        const contextLine = lines.find(line => line.includes('**Context**:'));
        if (contextLine) {
          reason = contextLine.replace(/\*\*Context\*\*:\s*/i, '').trim();
        }
      }

      // Truncate if too long
      if (reason.length > 150) {
        reason = reason.substring(0, 147) + '...';
      }

      if (decision && reason && deferredTo) {
        decisions.push({ decision, reason, deferredTo });
      }
    });

    return decisions.slice(0, 8); // Return top 8
  } catch (error) {
    console.error('Error parsing deferred decisions:', error);
    return [];
  }
}

/**
 * Get git status via exec
 */
export async function getGitStatus(): Promise<{
  branch: string;
  clean: boolean;
  ahead: number;
  behind: number;
  recentCommits: Array<{ hash: string; message: string }>;
}> {
  try {
    const branch = execSync('git branch --show-current', { encoding: 'utf-8' }).trim();
    const status = execSync('git status --porcelain', { encoding: 'utf-8' }).trim();
    const clean = status.length === 0;

    // Get recent commits
    const commits = execSync('git log -5 --oneline', { encoding: 'utf-8' })
      .trim()
      .split('\n')
      .map(line => {
        const [hash, ...messageParts] = line.split(' ');
        return {
          hash,
          message: messageParts.join(' '),
        };
      });

    return {
      branch,
      clean,
      ahead: 0,
      behind: 0,
      recentCommits: commits,
    };
  } catch {
    return {
      branch: 'unknown',
      clean: true,
      ahead: 0,
      behind: 0,
      recentCommits: [],
    };
  }
}

/**
 * Get last session summary
 */
export function getLastSessionSummary(): {
  date: string;
  duration: string;
  summary: string;
  accomplishments: string[];
} {
  try {
    const content = readProjectFile('PROJECT_STATUS.md');
    const sessionSection = content.match(/## 🔄 Last Session Summary([\s\S]*?)---/);
    if (!sessionSection) return { date: '', duration: '', summary: '', accomplishments: [] };

    const dateMatch = sessionSection[1].match(/\*\*Date:\*\* (.+)/);
    const durationMatch = sessionSection[1].match(/\*\*Duration:\*\* (.+)/);
    const summaryMatch = sessionSection[1].match(/\*\*Summary:\*\*([\s\S]*?)\*\*(?:Bridge Doc|Major Accomplishments)/);

    // Extract accomplishments
    const accomplishmentsSection = sessionSection[1].match(/\*\*Major Accomplishments:\*\*([\s\S]*?)(?:\*\*Files Changed|\n\n)/);
    const accomplishments = accomplishmentsSection
      ? accomplishmentsSection[1]
          .split('\n')
          .filter(line => line.trim().startsWith('-'))
          .map(line => line.replace(/^-\s*/, '').trim())
      : [];

    return {
      date: dateMatch ? dateMatch[1] : '',
      duration: durationMatch ? durationMatch[1] : '',
      summary: summaryMatch ? summaryMatch[1].trim() : '',
      accomplishments: accomplishments.slice(0, 5),
    };
  } catch {
    return { date: '', duration: '', summary: '', accomplishments: [] };
  }
}
