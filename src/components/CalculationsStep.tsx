'use client';

import { useState, useEffect } from 'react';
import { useAnalysis } from '@/contexts/AnalysisContext';
import { calculateAllScores, validateCalculations } from '@/lib/scoring';
import { useToast } from '@/contexts/ToastContext';

export default function CalculationsStep() {
  const { state, dispatch } = useAnalysis();
  const { addToast } = useToast();
  const [isCalculating, setIsCalculating] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const performCalculations = async () => {
      try {
        setProgress(10);
        
        // Check if we have all required poll data
        if (!state.polls.mainImage || !state.polls.imageStack || !state.polls.features) {
          console.error('Missing poll data for calculations:', {
            mainImage: !!state.polls.mainImage,
            imageStack: !!state.polls.imageStack,
            features: !!state.polls.features,
            allPolls: state.polls
          });
          addToast({
            title: 'Missing Poll Data',
            description: 'Please complete all polls first.',
            variant: 'destructive'
          });
          return;
        }


        setProgress(30);

        // Calculate scores
        const calculations = calculateAllScores(
          state.products,
          state.polls.mainImage,
          state.polls.imageStack,
          state.polls.features
        );

        setProgress(70);

        // Validate calculations
        if (!validateCalculations(calculations)) {
          console.error('Calculation validation failed');
          addToast({
            title: 'Calculation Error',
            description: 'Error in score calculations. Please try again.',
            variant: 'destructive'
          });
          setIsCalculating(false);
          return;
        }

        setProgress(90);

        // Store calculations in state
        dispatch({ type: 'SET_CALCULATIONS', payload: calculations });
        
        setProgress(100);
        
        // Wait a moment to show completion, then move to results
        setTimeout(() => {
          dispatch({ type: 'SET_CURRENT_STEP', payload: 5 });
        }, 1000);

      } catch (error) {
        console.error('Calculation error:', error);
        addToast({
          title: 'Calculation Error',
          description: 'Error performing calculations. Please try again.',
          variant: 'destructive'
        });
        setIsCalculating(false);
      }
    };

    performCalculations();
  }, [state.products, state.polls, dispatch]);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Calculating Scores
          </h2>
          
          <div className="mb-6">
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className="bg-blue-600 h-4 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              {progress}% Complete
            </p>
          </div>

          <div className="space-y-2 text-left max-w-md mx-auto">
            <div className={`flex items-center ${progress >= 10 ? 'text-green-600' : 'text-gray-400'}`}>
              <span className="mr-2">{progress >= 10 ? '✓' : '○'}</span>
              Validating poll data
            </div>
            <div className={`flex items-center ${progress >= 30 ? 'text-green-600' : 'text-gray-400'}`}>
              <span className="mr-2">{progress >= 30 ? '✓' : '○'}</span>
              Calculating price scores
            </div>
            <div className={`flex items-center ${progress >= 50 ? 'text-green-600' : 'text-gray-400'}`}>
              <span className="mr-2">{progress >= 50 ? '✓' : '○'}</span>
              Calculating image scores
            </div>
            <div className={`flex items-center ${progress >= 70 ? 'text-green-600' : 'text-gray-400'}`}>
              <span className="mr-2">{progress >= 70 ? '✓' : '○'}</span>
              Calculating feature scores
            </div>
            <div className={`flex items-center ${progress >= 90 ? 'text-green-600' : 'text-gray-400'}`}>
              <span className="mr-2">{progress >= 90 ? '✓' : '○'}</span>
              Validating results
            </div>
            <div className={`flex items-center ${progress >= 100 ? 'text-green-600' : 'text-gray-400'}`}>
              <span className="mr-2">{progress >= 100 ? '✓' : '○'}</span>
              Finalizing analysis
            </div>
          </div>

          {isCalculating && (
            <p className="text-gray-600 mt-6">
              Please wait while we calculate your competitive analysis scores...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
