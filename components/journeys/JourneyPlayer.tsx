'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Journey, PlayerEnrollment, JourneyProgressData } from '@/lib/types/journey';
import StepSidebar from './StepSidebar';
import StepContent from './StepContent';

interface JourneyPlayerProps {
  journey: Journey;
  enrollment: PlayerEnrollment;
  onJourneyComplete: () => void;
}

function getInitialStepIndex(
  steps: Journey['content']['steps'],
  progressData: JourneyProgressData,
): number {
  if (!progressData.current_step_id) return 0;
  const idx = steps.findIndex(s => s.id === progressData.current_step_id);
  if (idx === -1) {
    // Step was removed; go to last completed step or 0
    const completed = progressData.completed_steps || [];
    for (let i = steps.length - 1; i >= 0; i--) {
      if (completed.includes(steps[i].id)) return i;
    }
    return 0;
  }
  return idx;
}

export default function JourneyPlayer({ journey, enrollment, onJourneyComplete }: JourneyPlayerProps) {
  const supabase = createClient();
  const steps = journey.content?.steps || [];

  const [currentStepIndex, setCurrentStepIndex] = useState<number>(() =>
    getInitialStepIndex(steps, enrollment.progress_data)
  );
  const [completedStepIds, setCompletedStepIds] = useState<Set<string>>(
    () => new Set(enrollment.progress_data.completed_steps || [])
  );
  const [savingProgress, setSavingProgress] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showCompletion, setShowCompletion] = useState(
    enrollment.status === 'completed'
  );
  const [requiredGateError, setRequiredGateError] = useState(false);

  const stepStartTime = useRef<Date>(new Date());

  // Update last_accessed_at on mount
  useEffect(() => {
    supabase
      .from('journey_enrollments')
      .update({ last_accessed_at: new Date().toISOString() })
      .eq('id', enrollment.id)
      .then(() => {/* fire-and-forget */});
  }, []);

  const currentStep = steps[currentStepIndex];
  const isReviewMode = enrollment.status === 'completed';
  const isCurrentStepCompleted = currentStep ? completedStepIds.has(currentStep.id) : false;
  const isLastStep = currentStepIndex === steps.length - 1;

  const saveProgress = async (newProgressData: JourneyProgressData) => {
    const { error } = await supabase
      .from('journey_enrollments')
      .update({
        progress_data: newProgressData,
        last_accessed_at: new Date().toISOString(),
      })
      .eq('id', enrollment.id);

    if (error) {
      console.error('Error saving progress:', error);
      setSaveError('Progress not saved. Please check your connection.');
    } else {
      setSaveError(null);
    }
  };

  const handleMarkStepComplete = async () => {
    if (!currentStep || isCurrentStepCompleted) return;

    const now = new Date();
    const timeSpent = Math.round((now.getTime() - stepStartTime.current.getTime()) / 60000);
    const newCompletedStepIds = new Set([...completedStepIds, currentStep.id]);

    const existingProgress = { ...enrollment.progress_data };
    const stepProgress = { ...(existingProgress.step_progress || {}) };
    stepProgress[currentStep.id] = {
      completed_at: now.toISOString(),
      time_spent_minutes: Math.max(timeSpent, 0),
    };

    const newProgressData: JourneyProgressData = {
      ...existingProgress,
      completed_steps: [...newCompletedStepIds],
      step_progress: stepProgress,
      total_time_spent_minutes: (existingProgress.total_time_spent_minutes || 0) + Math.max(timeSpent, 0),
      last_checkpoint: currentStep.id,
      current_step_id: currentStep.id,
      total_steps: steps.length,
    };

    // Optimistic update
    setCompletedStepIds(newCompletedStepIds);
    setSavingProgress(true);

    await saveProgress(newProgressData);
    setSavingProgress(false);

    // Check if all required steps are complete (or all steps if none are required)
    const requiredSteps = steps.filter(s => s.required);
    const stepsToCheck = requiredSteps.length > 0 ? requiredSteps : steps;
    const allDone = stepsToCheck.every(s => newCompletedStepIds.has(s.id));

    if (allDone && enrollment.status !== 'completed') {
      // Mark enrollment as completed
      await supabase
        .from('journey_enrollments')
        .update({
          status: 'completed',
          completed_at: now.toISOString(),
        })
        .eq('id', enrollment.id);

      setShowCompletion(true);
      onJourneyComplete();
    }
  };

  const navigateToStep = async (newIndex: number) => {
    setRequiredGateError(false);
    setCurrentStepIndex(newIndex);
    stepStartTime.current = new Date();

    const newStep = steps[newIndex];
    if (!newStep) return;

    const newProgressData: JourneyProgressData = {
      ...enrollment.progress_data,
      completed_steps: [...completedStepIds],
      current_step_id: newStep.id,
      total_steps: steps.length,
    };

    await saveProgress(newProgressData);
  };

  const handleNext = async () => {
    if (!currentStep) return;

    // Gate: required step must be completed before advancing
    if (currentStep.required && !isCurrentStepCompleted && !isReviewMode) {
      setRequiredGateError(true);
      return;
    }

    if (!isLastStep) {
      await navigateToStep(currentStepIndex + 1);
    }
  };

  const handlePrev = async () => {
    if (currentStepIndex > 0) {
      await navigateToStep(currentStepIndex - 1);
    }
  };

  const handleSidebarStepClick = async (index: number) => {
    await navigateToStep(index);
  };

  if (steps.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 text-center">
        <div>
          <div className="text-5xl mb-4">📭</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Steps Yet</h3>
          <p className="text-gray-600 mb-4">This journey doesn't have any steps yet.</p>
          <Link href={`/journeys/${journey.id}`} className="text-blue-600 hover:underline">
            Back to Journey Details
          </Link>
        </div>
      </div>
    );
  }

  if (showCompletion && !isReviewMode) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <div className="max-w-md text-center">
          <div className="text-6xl mb-6">🎉</div>
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Journey Complete!</h2>
          <p className="text-gray-600 mb-2 text-lg">
            You've successfully completed <strong>{journey.title}</strong>.
          </p>
          <p className="text-gray-500 text-sm mb-8">
            {completedStepIds.size} of {steps.length} steps completed
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/my-journeys"
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
            >
              My Journeys
            </Link>
            <Link
              href="/journeys"
              className="px-6 py-3 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg font-semibold transition-colors"
            >
              Browse More
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isNextDisabled =
    !isReviewMode &&
    currentStep?.required &&
    !isCurrentStepCompleted;

  let nextButtonLabel = 'Next';
  if (isLastStep) {
    nextButtonLabel = isReviewMode ? 'Finish Review' : 'Complete Journey';
  }

  return (
    <div className="flex flex-col lg:flex-row h-full min-h-0">
      {/* Sidebar */}
      <div className="w-full lg:w-72 xl:w-80 flex-shrink-0 bg-white border-b lg:border-b-0 lg:border-r border-gray-200 flex flex-col">
        <StepSidebar
          steps={steps}
          currentStepIndex={currentStepIndex}
          completedStepIds={completedStepIds}
          onStepClick={handleSidebarStepClick}
          isReviewMode={isReviewMode}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Save error banner */}
        {saveError && (
          <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-3 flex items-center justify-between">
            <p className="text-sm text-yellow-800">{saveError}</p>
            <button
              onClick={() => setSaveError(null)}
              className="text-yellow-600 hover:text-yellow-800 text-xs ml-4"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Review mode banner */}
        {isReviewMode && (
          <div className="bg-blue-50 border-b border-blue-200 px-6 py-3">
            <p className="text-sm text-blue-800">
              <strong>Reviewing:</strong> You've already completed this journey. Navigating freely.
            </p>
          </div>
        )}

        {/* Step content area */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-8">
          {currentStep && (
            <StepContent
              step={currentStep}
              stepNumber={currentStepIndex + 1}
              totalSteps={steps.length}
              isCompleted={isCurrentStepCompleted}
              isReviewMode={isReviewMode}
              onMarkComplete={handleMarkStepComplete}
              savingProgress={savingProgress}
            />
          )}
        </div>

        {/* Navigation footer */}
        <div className="flex-shrink-0 border-t border-gray-200 bg-white px-6 py-4">
          {requiredGateError && (
            <p className="text-sm text-red-600 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.07 16.5C2.3 17.333 3.262 19 4.802 19z" />
              </svg>
              Complete this required step before moving on.
            </p>
          )}
          <div className="flex items-center justify-between">
            <button
              onClick={handlePrev}
              disabled={currentStepIndex === 0}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Previous
            </button>

            <span className="text-sm text-gray-500 font-medium">
              {currentStepIndex + 1} / {steps.length}
            </span>

            <button
              onClick={isLastStep && !isReviewMode ? handleMarkStepComplete : handleNext}
              disabled={isLastStep && isNextDisabled}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
            >
              {nextButtonLabel}
              {!isLastStep && (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
