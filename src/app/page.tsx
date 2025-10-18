'use client';

import { useState } from 'react';
import { AnalysisProvider } from '@/contexts/AnalysisContext';
import StepIndicator from '@/components/StepIndicator';
import AnalysisTypeSelection from '@/components/AnalysisTypeSelection';
import DataCollection from '@/components/DataCollection';
import DataCollectionEnhanced from '@/components/DataCollectionEnhanced';
import PollingInterface from '@/components/PollingInterface';
import CalculationsStep from '@/components/CalculationsStep';
import ResultsDashboard from '@/components/ResultsDashboard';
import { useAnalysis } from '@/contexts/AnalysisContext';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { ToastProvider } from '@/contexts/ToastContext';

function MainContent() {
  const { state, dispatch } = useAnalysis();
  const [showResetDialog, setShowResetDialog] = useState(false);

  // Auto-save is handled in the context, no need for refresh protection

  const renderCurrentStep = () => {
    switch (state.currentStep) {
      case 1:
        return <AnalysisTypeSelection />;
      case 2:
        // Use enhanced data collection with automatic scraping
        return state.collectionMethod === 'manual' 
          ? <DataCollection />
          : <DataCollectionEnhanced />;
      case 3:
        return <PollingInterface />;
      case 4:
        return <CalculationsStep />;
      case 5:
        return <ResultsDashboard />;
      default:
        return <AnalysisTypeSelection />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-between items-start mb-6">
            <div className="flex-1"></div>
            <div className="flex-1 text-center">
              <h1 className="text-5xl font-bold text-foreground mb-3 bg-gradient-to-r from-primary to-green-600 bg-clip-text text-transparent">
                Amazon Core 5/6 Competitive Analysis
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Automated competitive analysis with AI-powered polling and precise scoring
              </p>
            </div>
            <div className="flex-1 flex justify-end">
              {state.currentStep > 1 && (
                <button
                  onClick={() => setShowResetDialog(true)}
                  className="px-6 py-3 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-all duration-200 text-sm font-medium shadow-lg hover:shadow-xl"
                >
                  Start New Analysis
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Step Indicator */}
        <StepIndicator />

              {/* Main Content */}
              <div className="mt-8">
                <div className="bg-card rounded-xl shadow-lg border p-8 animate-fade-in-up">
                  {renderCurrentStep()}
                </div>
              </div>

        {/* Footer Info */}
        {state.currentStep > 1 && (
          <div className="mt-8 p-6 bg-green-50 border border-green-200 rounded-xl shadow-sm">
            <div className="flex items-center">
              <svg className="w-6 h-6 text-green-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-green-800 font-semibold text-lg">
                ✓ Your progress is automatically saved. You can navigate between steps and your data will be preserved.
              </span>
            </div>
          </div>
        )}

        {/* Custom Confirmation Dialog */}
        <ConfirmationDialog
          open={showResetDialog}
          onOpenChange={setShowResetDialog}
          title="Start New Analysis?"
          description="Are you sure you want to start a new analysis? All current data will be lost and cannot be recovered."
          confirmText="Start New Analysis"
          cancelText="Cancel"
          variant="destructive"
          onConfirm={() => dispatch({ type: 'RESET_ANALYSIS' })}
        />
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <ToastProvider>
      <AnalysisProvider>
        <MainContent />
      </AnalysisProvider>
    </ToastProvider>
  );
}