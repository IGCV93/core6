'use client';

import { useAnalysis } from '@/contexts/AnalysisContext';
import { cn } from '@/lib/cn';
import { Check, ChevronRight } from 'lucide-react';

const steps = [
  { number: 1, title: 'Analysis Type', description: 'Select Core 5 or Core 6' },
  { number: 2, title: 'Data Collection', description: 'Enter product information' },
  { number: 3, title: 'Polling', description: 'Run AI simulations' },
  { number: 4, title: 'Calculations', description: 'Generate scores' },
  { number: 5, title: 'Results', description: 'Download reports' },
];

export default function StepIndicator() {
  const { state, dispatch } = useAnalysis();

  const handleStepClick = (stepNumber: number) => {
    // Allow navigation to completed steps or current step
    if (stepNumber <= state.currentStep) {
      dispatch({ 
        type: 'NAVIGATE_TO_STEP', 
        payload: { step: stepNumber as 1 | 2 | 3 | 4 | 5 } 
      });
    }
  };

  return (
    <div className="w-full bg-card rounded-lg p-6 shadow-sm border">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isActive = step.number === state.currentStep;
          const isCompleted = step.number < state.currentStep;
          const isUpcoming = step.number > state.currentStep;
          const isClickable = isCompleted;

          return (
            <div 
              key={step.number} 
              className={cn(
                'flex flex-col items-center flex-1 relative group',
                {
                  'cursor-pointer hover:scale-105 transition-all duration-300': isClickable,
                  'cursor-default': !isClickable
                }
              )}
              onClick={() => handleStepClick(step.number)}
            >
              {/* Step Circle */}
                      <div
                        className={cn(
                          'w-14 h-14 rounded-full flex items-center justify-center text-white font-semibold text-sm border-4 transition-all duration-300 shadow-lg hover-lift',
                          {
                            'bg-primary border-primary ring-4 ring-primary/20 animate-pulse': isActive,
                            'bg-green-600 border-green-600 hover:bg-green-700 hover:border-green-700 hover:shadow-xl hover:scale-110': isCompleted,
                            'bg-muted border-muted text-muted-foreground': isUpcoming,
                          }
                        )}
                        title={isClickable ? `Click to go back to ${step.title}` : undefined}
                      >
                {isCompleted ? (
                  <div className="relative">
                    <Check className="w-6 h-6" />
                    {/* Small indicator that this is clickable */}
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-md">
                      <ChevronRight className="w-2 h-2 text-green-600" />
                    </div>
                  </div>
                ) : (
                  step.number
                )}
              </div>

              {/* Step Info */}
              <div className="mt-4 text-center max-w-32">
                <div
                  className={cn('font-semibold text-sm transition-colors duration-300', {
                    'text-primary': isActive,
                    'text-green-600 hover:text-green-700': isCompleted,
                    'text-muted-foreground': isUpcoming,
                  })}
                >
                  {step.title}
                </div>
                <div
                  className={cn('text-xs mt-1 transition-colors duration-300 leading-tight', {
                    'text-primary/70': isActive,
                    'text-green-500 hover:text-green-600': isCompleted,
                    'text-muted-foreground/70': isUpcoming,
                  })}
                >
                  {step.description}
                </div>
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'absolute top-7 left-1/2 w-full h-1 -z-10 transition-all duration-300 rounded-full',
                    {
                      'bg-green-600': isCompleted,
                      'bg-muted': !isCompleted,
                    }
                  )}
                  style={{ transform: 'translateX(50%)' }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
