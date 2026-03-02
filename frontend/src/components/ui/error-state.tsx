'use client';
import React from 'react';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  icon?: React.ReactNode;
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'We encountered an error while loading this content.',
  onRetry,
  icon = '⚠️',
}: ErrorStateProps) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 sm:p-6 text-center">
      <div className="text-3xl sm:text-4xl mb-3">{icon}</div>
      <h3 className="font-semibold text-sm sm:text-base text-red-900 mb-2">
        {title}
      </h3>
      <p className="text-xs sm:text-sm text-red-700 mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="btn btn-SM text-xs sm:text-sm px-3 sm:px-4 py-1 sm:py-2 border border-red-300 hover:bg-red-100"
        >
          Try Again
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  title = 'No data found',
  message = 'There is nothing to display here.',
  icon = '📭',
}: Omit<ErrorStateProps, 'onRetry'>) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 sm:p-6 text-center">
      <div className="text-3xl sm:text-4xl mb-3">{icon}</div>
      <h3 className="font-semibold text-sm sm:text-base text-gray-900 mb-1">
        {title}
      </h3>
      <p className="text-xs sm:text-sm text-gray-600">{message}</p>
    </div>
  );
}
