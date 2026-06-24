import { JourneyStep } from '@/lib/types/journey';
import ProgressBar from './ProgressBar';

interface StepSidebarProps {
  steps: JourneyStep[];
  currentStepIndex: number;
  completedStepIds: Set<string>;
  onStepClick: (index: number) => void;
  isReviewMode: boolean;
}

function getStepIcon(type: string): string {
  switch (type) {
    case 'content': return '📖';
    case 'activity': return '✏️';
    case 'assessment': return '✅';
    default: return '📝';
  }
}

export default function StepSidebar({
  steps,
  currentStepIndex,
  completedStepIds,
  onStepClick,
  isReviewMode,
}: StepSidebarProps) {
  const completedCount = steps.filter(s => completedStepIds.has(s.id)).length;
  const progressPercent = steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0;

  return (
    <div className="flex flex-col h-full">
      {/* Progress summary */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Progress</span>
          <span className="text-sm font-semibold text-gray-900">{completedCount}/{steps.length}</span>
        </div>
        <ProgressBar
          percent={progressPercent}
          label={progressPercent === 100 ? 'Journey complete!' : `${progressPercent}% complete`}
        />
      </div>

      {/* Step list */}
      <nav className="flex-1 overflow-y-auto p-2">
        {steps.map((step, index) => {
          const isCompleted = completedStepIds.has(step.id);
          const isCurrent = index === currentStepIndex;
          const isClickable = isReviewMode || isCompleted || isCurrent;

          let itemStyle = 'border-transparent text-gray-600 hover:bg-gray-50';
          if (isCurrent) {
            itemStyle = 'border-blue-500 bg-blue-50 text-blue-900';
          } else if (isCompleted) {
            itemStyle = 'border-transparent text-gray-700 hover:bg-gray-50';
          }

          return (
            <button
              key={step.id}
              onClick={() => isClickable && onStepClick(index)}
              disabled={!isClickable}
              className={`w-full flex items-start gap-3 p-3 rounded-lg border-l-2 mb-1 text-left transition-colors ${itemStyle} ${
                !isClickable ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              }`}
            >
              {/* Status indicator */}
              <div className="flex-shrink-0 mt-0.5">
                {isCompleted ? (
                  <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                ) : isCurrent ? (
                  <div className="w-6 h-6 rounded-full border-2 border-blue-500 bg-white flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full border-2 border-gray-300 bg-white flex items-center justify-center">
                    <span className="text-xs text-gray-400 font-medium">{index + 1}</span>
                  </div>
                )}
              </div>

              {/* Step info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-sm">{getStepIcon(step.type)}</span>
                  <span className="text-sm font-medium truncate">{step.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 capitalize">{step.type}</span>
                  <span className="text-xs text-gray-400">·</span>
                  <span className="text-xs text-gray-400">{step.duration_minutes} min</span>
                  {step.required && (
                    <>
                      <span className="text-xs text-gray-400">·</span>
                      <span className="text-xs text-orange-600 font-medium">Required</span>
                    </>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
