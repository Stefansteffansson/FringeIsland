import { JourneyStep } from '@/lib/types/journey';

interface StepContentProps {
  step: JourneyStep;
  stepNumber: number;
  totalSteps: number;
  isCompleted: boolean;
  isReviewMode: boolean;
  onMarkComplete: () => void;
  savingProgress: boolean;
}

function getStepTypeLabel(type: string): string {
  switch (type) {
    case 'content': return 'Reading';
    case 'activity': return 'Activity';
    case 'assessment': return 'Assessment';
    default: return 'Step';
  }
}

function getStepTypeIcon(type: string): string {
  switch (type) {
    case 'content': return '📖';
    case 'activity': return '✏️';
    case 'assessment': return '✅';
    default: return '📝';
  }
}

function getActionLabel(type: string): string {
  switch (type) {
    case 'content': return 'Mark as Read';
    case 'activity': return 'Complete Activity';
    case 'assessment': return 'Submit Assessment';
    default: return 'Mark Complete';
  }
}

export default function StepContent({
  step,
  stepNumber,
  totalSteps,
  isCompleted,
  isReviewMode,
  onMarkComplete,
  savingProgress,
}: StepContentProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Step header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
          <span>{getStepTypeIcon(step.type)}</span>
          <span className="font-medium text-gray-600">{getStepTypeLabel(step.type)}</span>
          <span>·</span>
          <span>Step {stepNumber} of {totalSteps}</span>
          <span>·</span>
          <span>{step.duration_minutes} min</span>
          {step.required && (
            <>
              <span>·</span>
              <span className="text-orange-600 font-medium">Required</span>
            </>
          )}
          {isCompleted && !isReviewMode && (
            <>
              <span>·</span>
              <span className="text-green-600 font-medium flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Completed
              </span>
            </>
          )}
        </div>
        <h2 className="text-2xl font-bold text-gray-900">{step.title}</h2>
      </div>

      {/* Step body */}
      <div className="flex-1">
        {step.description ? (
          <div className="prose max-w-none mb-6">
            <p className="text-gray-700 leading-relaxed text-base">{step.description}</p>
          </div>
        ) : (
          <div className="mb-6 p-6 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-gray-500 italic text-sm">
              {step.type === 'content' && 'This step contains reading material. Take your time to understand the concepts.'}
              {step.type === 'activity' && 'This is a hands-on activity. Apply what you\'ve learned through practical tasks.'}
              {step.type === 'assessment' && 'Reflect on what you\'ve learned and demonstrate your understanding.'}
            </p>
          </div>
        )}

        {step.instructions && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex gap-3">
              <div className="text-xl">💡</div>
              <div>
                <p className="text-sm font-semibold text-blue-900 mb-1">Instructions</p>
                <p className="text-sm text-blue-800 leading-relaxed">{step.instructions}</p>
              </div>
            </div>
          </div>
        )}

        {/* Placeholder for rich content (Phase 2) */}
        {step.content && Object.keys(step.content).length > 0 && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-dashed border-gray-300">
            <p className="text-xs text-gray-400 text-center">Rich content display coming soon</p>
          </div>
        )}
      </div>

      {/* Action area */}
      {!isReviewMode && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          {isCompleted ? (
            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-green-900">Step completed!</p>
                <p className="text-xs text-green-700">Use the navigation below to continue.</p>
              </div>
            </div>
          ) : (
            <button
              onClick={onMarkComplete}
              disabled={savingProgress}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              {savingProgress ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {getActionLabel(step.type)}
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
