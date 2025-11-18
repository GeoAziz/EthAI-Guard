/**
 * Progress Indicator Components
 * Shows progress for long-running operations
 */

import React, { useEffect, useState } from 'react';

interface ProgressBarProps {
  value: number;
  max?: number;
  className?: string;
  showPercentage?: boolean;
  color?: 'blue' | 'green' | 'yellow' | 'red';
  animated?: boolean;
}

export function ProgressBar({
  value,
  max = 100,
  className = '',
  showPercentage = true,
  color = 'blue',
  animated = true
}: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  
  const colorClasses = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    yellow: 'bg-yellow-600',
    red: 'bg-red-600'
  };

  return (
    <div className={`w-full ${className}`}>
      <div className="relative w-full h-4 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${colorClasses[color]} ${animated ? 'transition-all duration-300 ease-out' : ''}`}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
        />
      </div>
      {showPercentage && (
        <div className="text-sm text-gray-600 mt-1 text-right">
          {percentage.toFixed(0)}%
        </div>
      )}
    </div>
  );
}

interface StepProgressProps {
  steps: string[];
  currentStep: number;
  completedSteps?: number[];
  className?: string;
}

export function StepProgress({
  steps,
  currentStep,
  completedSteps = [],
  className = ''
}: StepProgressProps) {
  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center justify-between">
        {steps.map((step, idx) => {
          const isCompleted = completedSteps.includes(idx) || idx < currentStep;
          const isCurrent = idx === currentStep;
          const isUpcoming = idx > currentStep && !completedSteps.includes(idx);

          return (
            <React.Fragment key={idx}>
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center font-semibold
                    transition-all duration-300
                    ${isCompleted ? 'bg-green-600 text-white' : ''}
                    ${isCurrent ? 'bg-blue-600 text-white ring-4 ring-blue-200' : ''}
                    ${isUpcoming ? 'bg-gray-300 text-gray-600' : ''}
                  `}
                >
                  {isCompleted ? '✓' : idx + 1}
                </div>
                <div
                  className={`
                    text-xs mt-2 text-center
                    ${isCurrent ? 'font-semibold text-blue-600' : ''}
                    ${isCompleted ? 'text-gray-700' : ''}
                    ${isUpcoming ? 'text-gray-400' : ''}
                  `}
                >
                  {step}
                </div>
              </div>
              
              {idx < steps.length - 1 && (
                <div
                  className={`
                    flex-1 h-1 mx-2 transition-all duration-300
                    ${isCompleted ? 'bg-green-600' : 'bg-gray-300'}
                  `}
                  style={{ maxWidth: '100px' }}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: string;
  className?: string;
}

export function Spinner({ size = 'md', color = 'blue-600', className = '' }: SpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
    xl: 'w-16 h-16 border-4'
  };

  return (
    <div
      className={`
        ${sizeClasses[size]}
        border-${color}
        border-t-transparent
        rounded-full
        animate-spin
        ${className}
      `}
      role="status"
      aria-label="Loading"
    />
  );
}

interface AnalysisProgressProps {
  stage: 'uploading' | 'validating' | 'analyzing' | 'generating' | 'complete';
  progress?: number;
  message?: string;
}

export function AnalysisProgress({ stage, progress, message }: AnalysisProgressProps) {
  const stages = [
    { id: 'uploading', label: 'Uploading Data', icon: '📤' },
    { id: 'validating', label: 'Validating', icon: '✓' },
    { id: 'analyzing', label: 'Analyzing', icon: '🔍' },
    { id: 'generating', label: 'Generating Report', icon: '📊' },
    { id: 'complete', label: 'Complete', icon: '✅' }
  ];

  const currentStageIndex = stages.findIndex(s => s.id === stage);
  const completedStages = stages.slice(0, currentStageIndex).map((_, idx) => idx);

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <h3 className="text-xl font-semibold mb-6 text-center">
        Processing Your Analysis
      </h3>
      
      <StepProgress
        steps={stages.map(s => s.label)}
        currentStep={currentStageIndex}
        completedSteps={completedStages}
        className="mb-8"
      />
      
      {progress !== undefined && (
        <ProgressBar
          value={progress}
          max={100}
          className="mb-4"
          color="blue"
        />
      )}
      
      {message && (
        <div className="text-center text-gray-600 mt-4">
          <Spinner className="inline-block mr-2" size="sm" />
          {message}
        </div>
      )}
      
      <div className="text-center text-sm text-gray-500 mt-6">
        This usually takes 10-30 seconds
      </div>
    </div>
  );
}

interface LoadingOverlayProps {
  message?: string;
  progress?: number;
}

export function LoadingOverlay({ message = 'Loading...', progress }: LoadingOverlayProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <Spinner size="xl" className="mx-auto mb-4" />
          <p className="text-lg font-semibold text-gray-800">{message}</p>
        </div>
        
        {progress !== undefined && (
          <ProgressBar value={progress} showPercentage={true} />
        )}
      </div>
    </div>
  );
}

export function PulsingDot({ color = 'blue' }: { color?: string }) {
  return (
    <span className="relative flex h-3 w-3">
      <span
        className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-${color}-400 opacity-75`}
      />
      <span className={`relative inline-flex rounded-full h-3 w-3 bg-${color}-500`} />
    </span>
  );
}
