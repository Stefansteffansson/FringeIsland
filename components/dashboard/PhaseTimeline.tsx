import { CheckCircle2, Circle, Clock } from 'lucide-react';

interface Phase {
  id: string;
  name: string;
  status: 'complete' | 'in-progress' | 'upcoming';
  percentage: number;
  label: string;
}

interface PhaseTimelineProps {
  phases: Phase[];
  overallProgress: number;
}

export default function PhaseTimeline({ phases, overallProgress }: PhaseTimelineProps) {
  return (
    <div className="bg-gradient-to-r from-gray-800 to-gray-850 rounded-lg border border-gray-700 p-4 mb-6">
      {/* Header with integrated progress */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-4">
          <h2 className="text-base font-semibold text-white">Development Timeline</h2>
          <div className="text-sm text-gray-400">Phase 1 Progress: {overallProgress}%</div>
        </div>
        <div className="text-xl font-bold text-white">{overallProgress}%</div>
      </div>

      {/* Compact Progress Bar */}
      <div className="mb-4">
        <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-500"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Connection Line */}
        <div className="absolute top-3.5 left-0 right-0 h-0.5 bg-gray-700" />

        {/* Phase Nodes */}
        <div className="relative grid grid-cols-10 gap-1">
          {phases.map((phase) => {
            const isComplete = phase.status === 'complete';
            const isInProgress = phase.status === 'in-progress';
            const isUpcoming = phase.status === 'upcoming';

            return (
              <div key={phase.id} className="flex flex-col items-center">
                {/* Node */}
                <div className="relative z-10 mb-2">
                  {isComplete && (
                    <div className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    </div>
                  )}
                  {isInProgress && (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center animate-pulse">
                      <Clock className="w-4 h-4 text-white" />
                    </div>
                  )}
                  {isUpcoming && (
                    <div className="w-7 h-7 rounded-full border-2 border-gray-600 bg-gray-800 flex items-center justify-center">
                      <Circle className="w-3.5 h-3.5 text-gray-500" />
                    </div>
                  )}
                </div>

                {/* Label */}
                <div className="text-center">
                  <div
                    className={`text-[10px] font-medium ${
                      isComplete
                        ? 'text-green-400'
                        : isInProgress
                        ? 'text-blue-400'
                        : 'text-gray-500'
                    }`}
                  >
                    {phase.label}
                  </div>
                  <div
                    className={`text-[9px] leading-tight mt-0.5 ${
                      isComplete
                        ? 'text-gray-400'
                        : isInProgress
                        ? 'text-white font-medium'
                        : 'text-gray-600'
                    }`}
                  >
                    {phase.name}
                  </div>
                  {isInProgress && (
                    <div className="text-[10px] text-purple-400 font-bold mt-0.5">
                      {phase.percentage}%
                    </div>
                  )}
                  {isComplete && (
                    <div className="text-[10px] text-green-500 mt-0.5">✓</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Compact Legend */}
      <div className="mt-3 pt-3 border-t border-gray-700 flex items-center justify-center gap-4 text-[10px]">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3 h-3 text-green-400" />
          <span className="text-gray-400">Complete</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="w-3 h-3 text-blue-400" />
          <span className="text-gray-400">In Progress</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Circle className="w-3 h-3 text-gray-600" />
          <span className="text-gray-400">Upcoming</span>
        </div>
      </div>
    </div>
  );
}
