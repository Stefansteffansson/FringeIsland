import { Metadata } from 'next';
import Link from 'next/link';
import {
  Target,
  CheckCircle2,
  XCircle,
  BarChart3,
  GitBranch,
  Clock,
  FileText,
  Sparkles,
  Minimize2,
} from 'lucide-react';
import PhaseTimeline from '@/components/dashboard/PhaseTimeline';
import FloatingStatsBar from '@/components/dashboard/FloatingStatsBar';
import DashboardCard from '@/components/dashboard/DashboardCard';
import {
  getProjectVersion,
  getCurrentFocus,
  getActiveTasks,
  getBlockers,
  getQuickStats,
  getNextPriorities,
  getDeferredDecisions,
  getGitStatus,
  getLastSessionSummary,
} from '@/lib/dashboard/parsers';
import { getPhaseTimeline, getOverallPhase1Progress } from '@/lib/dashboard/roadmap-parser';

export const metadata: Metadata = {
  title: 'FringeIsland Dev Dashboard',
  description: 'Development dashboard for FringeIsland project',
};

// Force dynamic rendering to prevent hydration mismatches
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DashboardPage() {
  // Development only - dashboard reads local .md files that don't exist in production
  if (process.env.NODE_ENV === 'production') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Development Dashboard</h1>
          <p className="text-gray-400">This dashboard is only available in development mode.</p>
        </div>
      </div>
    );
  }

  // Fetch all data
  const version = getProjectVersion();
  const { focus, isComplete } = getCurrentFocus();
  const tasks = getActiveTasks();
  const blockers = getBlockers();
  const stats = getQuickStats();
  const priorities = getNextPriorities();
  const deferredDecisions = getDeferredDecisions();
  const gitStatus = await getGitStatus();
  const lastSession = getLastSessionSummary();
  const phases = getPhaseTimeline();
  const overallProgress = getOverallPhase1Progress();
  const projectRoot = process.cwd();

  return (
    <div className="fixed inset-0 z-[9999] h-screen overflow-y-auto bg-gray-900 text-gray-100 pb-24">
      {/* Ultra Compact Sticky Header */}
      <div className="sticky top-0 z-50 bg-gradient-to-r from-blue-900 to-purple-900 border-b border-gray-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              <h1 className="text-base font-bold text-white">FringeIsland Development Dashboard</h1>
              <span className="text-xs text-blue-200/80">· Project overview and status tracking</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-baseline gap-1.5">
                <span className="text-[10px] text-blue-200">Version</span>
                <span className="text-sm font-bold text-white">{version}</span>
              </div>
              {/* Close Dashboard Button */}
              <Link
                href="/groups"
                className="flex items-center gap-1.5 px-3 py-1 bg-white/10 hover:bg-white/20 rounded-lg transition-colors group"
                title="Close dashboard and return to FringeIsland"
              >
                <Minimize2 className="w-3.5 h-3.5 text-blue-200 group-hover:text-white" />
                <span className="text-xs text-blue-200 group-hover:text-white">Close</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-4">
        {/* Phase Timeline */}
        <PhaseTimeline phases={phases} overallProgress={overallProgress} />

        {/* 2-Column Card Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Current Focus Card */}
          <DashboardCard
            title="Current Focus"
            icon={<Target className="w-4 h-4" />}
            defaultExpanded={true}
            maxHeight="150px"
          >
            <div className="flex items-start justify-between">
              <p className="text-white font-medium">
                {focus.replace(/[✅🔄⏳]/g, '').trim()}
              </p>
              {isComplete && <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />}
            </div>
          </DashboardCard>

          {/* Blockers Card */}
          <DashboardCard
            title="Blockers"
            icon={blockers.length === 0 ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            badge={blockers.length}
            defaultExpanded={true}
            maxHeight="150px"
          >
            {blockers.length === 0 ? (
              <p className="text-green-400 font-medium">None - All clear! 🎉</p>
            ) : (
              <ul className="space-y-1.5">
                {blockers.map((blocker, index) => (
                  <li key={index} className="text-gray-200 flex items-start gap-2 text-sm">
                    <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                    <span>{blocker}</span>
                  </li>
                ))}
              </ul>
            )}
          </DashboardCard>
        </div>

        {/* Row 2: Active Tasks | Next Priorities */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Active Tasks Card */}
          <DashboardCard
            title="Active Tasks"
            icon={<CheckCircle2 className="w-4 h-4" />}
            badge={tasks.length}
            defaultExpanded={false}
            maxHeight="250px"
          >
            {tasks.length === 0 ? (
              <p className="text-gray-400 text-xs">No active tasks</p>
            ) : (
              <ul className="space-y-1">
                {tasks.map((task, index) => (
                  <li key={index} className="flex items-start gap-2">
                    {task.completed ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0 mt-0.5" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-600 flex-shrink-0 mt-0.5" />
                    )}
                    <span className={`text-xs ${task.completed ? 'text-gray-500 line-through' : 'text-gray-200'}`}>
                      {task.task}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </DashboardCard>

          {/* Next Priorities Card */}
          <DashboardCard
            title="Next Priorities"
            icon={<Target className="w-4 h-4" />}
            badge={priorities.length}
            defaultExpanded={false}
            maxHeight="250px"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-1.5 px-2 text-[10px] text-gray-400 font-medium">#</th>
                    <th className="text-left py-1.5 px-2 text-[10px] text-gray-400 font-medium">Phase</th>
                    <th className="text-left py-1.5 px-2 text-[10px] text-gray-400 font-medium">Priority</th>
                    <th className="text-center py-1.5 px-2 text-[10px] text-gray-400 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {priorities.map((priority, index) => {
                    const statusColors = {
                      complete: 'text-green-400 bg-green-500/20',
                      'in-progress': 'text-yellow-400 bg-yellow-500/20',
                      upcoming: 'text-blue-400 bg-blue-500/20',
                      pending: 'text-gray-400 bg-gray-500/20',
                    };

                    const statusIcons = {
                      complete: '✅',
                      'in-progress': '🔄',
                      upcoming: '⏳',
                      pending: '⏸️',
                    };

                    return (
                      <tr key={index} className="border-b border-gray-800 hover:bg-gray-800/50">
                        <td className="py-2 px-2 text-gray-400 text-xs">{index + 1}</td>
                        <td className="py-2 px-2">
                          {priority.phase ? (
                            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-purple-500/20 text-purple-300 rounded whitespace-nowrap">
                              {priority.phase}
                            </span>
                          ) : (
                            <span className="text-gray-600 text-[10px]">—</span>
                          )}
                        </td>
                        <td className="py-2 px-2 text-gray-200 text-xs font-normal" suppressHydrationWarning>{priority.priority}</td>
                        <td className="py-2 px-2 text-center">
                          <span
                            className={`px-1.5 py-0.5 text-[10px] font-medium rounded-full inline-block ${
                              statusColors[priority.status as keyof typeof statusColors]
                            }`}
                          >
                            {statusIcons[priority.status as keyof typeof statusIcons]}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </DashboardCard>
        </div>

        {/* Row 3: Deferred Decisions | Git Status */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Deferred Decisions Card */}
          <DashboardCard
            title="Deferred Decisions"
            icon={<XCircle className="w-4 h-4" />}
            badge={deferredDecisions.length}
            defaultExpanded={false}
            maxHeight="250px"
          >
            {deferredDecisions.length === 0 ? (
              <p className="text-gray-400 text-sm">No deferred decisions found</p>
            ) : (
              <div className="space-y-3">
                {deferredDecisions.map((decision, index) => (
                  <div key={index} className="border-l-2 border-yellow-500/50 pl-3">
                    <div className="flex items-start justify-between gap-2 mb-0.5">
                      <h4 className="text-white font-medium text-sm">{decision.decision}</h4>
                      <span className="px-1.5 py-0.5 text-[10px] font-medium bg-yellow-500/20 text-yellow-300 rounded-full flex-shrink-0">
                        {decision.deferredTo}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">{decision.reason}</p>
                  </div>
                ))}
              </div>
            )}
          </DashboardCard>

          {/* Git Status Card */}
          <DashboardCard
            title="Git Status"
            icon={<GitBranch className="w-4 h-4" />}
            defaultExpanded={false}
            maxHeight="250px"
          >
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <div>
                  <div className="text-xs text-gray-400">Branch</div>
                  <div className="text-white text-sm font-medium flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                    {gitStatus.branch}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Status</div>
                  <div
                    className={`text-sm font-medium flex items-center gap-1.5 ${
                      gitStatus.clean ? 'text-green-400' : 'text-yellow-400'
                    }`}
                  >
                    {gitStatus.clean ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Clean
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3.5 h-3.5" />
                        Changes
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-medium text-gray-400 mb-1.5">Recent Commits</h4>
                <ul className="space-y-1.5">
                  {gitStatus.recentCommits.map((commit, index) => (
                    <li key={index} className="flex items-start gap-2 text-xs">
                      <code className="text-blue-400 font-mono flex-shrink-0 text-[10px]">{commit.hash}</code>
                      <span className="text-gray-300">{commit.message}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </DashboardCard>
        </div>

        {/* Row 4: Last Session Summary (full width) */}
        {lastSession.date && (
          <DashboardCard
            title="Last Session Summary"
            icon={<Clock className="w-4 h-4" />}
            defaultExpanded={false}
            maxHeight="200px"
          >
            <div className="space-y-3">
              <div className="flex items-center gap-4 text-xs">
                <div>
                  <span className="text-gray-400">Date:</span>{' '}
                  <span className="text-white">{lastSession.date}</span>
                </div>
                <div>
                  <span className="text-gray-400">Duration:</span>{' '}
                  <span className="text-white">{lastSession.duration}</span>
                </div>
              </div>

              {lastSession.accomplishments.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-gray-400 mb-1.5">Major Accomplishments</h4>
                  <ul className="space-y-1">
                    {lastSession.accomplishments.map((item, index) => (
                      <li key={index} className="flex items-start gap-1.5 text-gray-300 text-sm">
                        <span className="text-green-400 flex-shrink-0 text-xs">✓</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </DashboardCard>
        )}

      </div>

      {/* Footer */}
      <div className="max-w-7xl mx-auto px-6 py-8 mt-12 border-t border-gray-800">
        <p className="text-center text-gray-500 text-sm">
          FringeIsland Development Dashboard • Last updated: {new Date().toLocaleString()}
        </p>
      </div>

      {/* Bottom Gradient Overlay */}
      <div className="fixed bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black via-gray-900/90 to-transparent pointer-events-none z-40" />

      {/* Floating Stats Bar */}
      <FloatingStatsBar stats={stats} projectRoot={projectRoot} />
    </div>
  );
}
