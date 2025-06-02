import { useEffect, useState } from 'react';
import LoadingSpinner from './LoadingSpinner';

interface ProgressStep {
  id: string;
  name: string;
  description: string;
}

interface ProgressStatusProps {
  currentStep: number;
  totalSteps: number;
  steps: ProgressStep[];
}

export default function ProgressStatus({ currentStep, totalSteps, steps }: ProgressStatusProps) {
  const percentage = Math.round((currentStep / totalSteps) * 100);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Progress</h3>
        <span className="text-sm text-gray-600">
          Step {currentStep} of {totalSteps}
        </span>
      </div>
      
      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
        <div 
          className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;
          const isPending = stepNumber > currentStep;

          return (
            <div 
              key={step.id}
              className={`flex items-center space-x-3 ${
                isCompleted ? 'text-green-600' : 
                isCurrent ? 'text-blue-600' : 
                'text-gray-400'
              }`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                isCompleted ? 'bg-green-100' : 
                isCurrent ? 'bg-blue-100' : 
                'bg-gray-100'
              }`}>
                {isCompleted ? (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : stepNumber}
              </div>
              <div className="flex-1">
                <div className={`font-medium ${
                  isCompleted ? 'text-green-800' : 
                  isCurrent ? 'text-blue-800' : 
                  'text-gray-600'
                }`}>
                  {step.name}
                </div>
                <div className={`text-sm ${
                  isCompleted ? 'text-green-600' : 
                  isCurrent ? 'text-blue-600' : 
                  'text-gray-500'
                }`}>
                  {step.description}
                </div>
              </div>
              {isCurrent && (
                <div className="animate-spin">
                  <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
} 