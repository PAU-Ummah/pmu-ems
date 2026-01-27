'use client';

import React from 'react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  className?: string;
  variant?: 'indeterminate' | 'determinate';
  value?: number; // For determinate variant (0-100)
}

const sizeClasses = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-2',
  lg: 'h-12 w-12 border-3',
};

export default function Spinner({
  size = 'md',
  color = 'text-brand-500',
  className = '',
  variant = 'indeterminate',
  value = 0,
}: SpinnerProps) {
  const sizeClass = sizeClasses[size];
  const baseClasses = `rounded-full border-t-transparent border-r-transparent animate-spin ${sizeClass} ${color} ${className}`;

  if (variant === 'determinate') {
    // For determinate, we'll use a circular progress approach
    const circumference = 2 * Math.PI * 36; // radius of 36
    const offset = circumference - (value / 100) * circumference;
    
    return (
      <div className="relative inline-flex items-center justify-center">
        <svg className="transform -rotate-90" width="80" height="80">
          <circle
            cx="40"
            cy="40"
            r="36"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
            className="text-gray-200 dark:text-gray-700"
          />
          <circle
            cx="40"
            cy="40"
            r="36"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className={`${color} transition-all duration-300`}
          />
        </svg>
        {value !== undefined && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-semibold text-gray-900 dark:text-white">
              {Math.round(value)}%
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={baseClasses}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}
