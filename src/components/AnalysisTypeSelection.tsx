'use client';

import { useState } from 'react';
import { useAnalysis } from '@/contexts/AnalysisContext';
import { cn } from '@/lib/cn';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Users, BarChart3, FileText, Zap } from 'lucide-react';

export default function AnalysisTypeSelection() {
  const { dispatch } = useAnalysis();
  const [selectedType, setSelectedType] = useState<'core5' | 'core6' | null>(null);
  const [preparedBy, setPreparedBy] = useState('');
  const [category, setCategory] = useState('');
  const [showFields, setShowFields] = useState(false);

  const handleSelection = (type: 'core5' | 'core6') => {
    setSelectedType(type);
    if (type === 'core6') {
      setShowFields(true);
    } else {
      // For Core 5, proceed immediately
      dispatch({ type: 'SET_ANALYSIS_TYPE', payload: type });
    }
  };

  const handleProceed = () => {
    if (selectedType === 'core6') {
      dispatch({ type: 'SET_PREPARED_BY', payload: preparedBy });
      dispatch({ type: 'SET_PRODUCT_CATEGORY', payload: category });
    }
    dispatch({ type: 'SET_ANALYSIS_TYPE', payload: selectedType! });
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-foreground mb-4">
          Select Analysis Type
        </h2>
        <p className="text-lg text-muted-foreground">
          Choose the type of competitive analysis you want to perform
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Core 5 Option */}
                <Card
                  className={cn(
                    'cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-105 hover-lift',
                    {
                      'ring-2 ring-primary shadow-lg': selectedType === 'core5',
                      'hover:ring-2 hover:ring-primary/50': selectedType !== 'core5',
                    }
                  )}
                  onClick={() => handleSelection('core5')}
                >
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl">Core 5 Analysis</CardTitle>
                          <Badge variant="secondary" className="mt-1">
                            <Zap className="w-3 h-3 mr-1" />
                            Market Gap Analysis
                          </Badge>
                </div>
              </div>
              <div
                className={cn(
                  'w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200',
                  {
                    'border-primary bg-primary': selectedType === 'core5',
                    'border-muted-foreground': selectedType !== 'core5',
                  }
                )}
              >
                {selectedType === 'core5' && (
                  <CheckCircle className="w-4 h-4 text-primary-foreground" />
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-base mb-4">
              Analyze 5 competitor products with market gap analysis and Excel scoring
            </CardDescription>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center">
                        <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                        Compare 5 competitors side by side
                      </div>
                      <div className="flex items-center">
                        <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                        Excel report + Market gap analysis
                      </div>
                      <div className="flex items-center">
                        <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                        Faster analysis process
                      </div>
                    </div>
          </CardContent>
        </Card>

        {/* Core 6 Option */}
                <Card
                  className={cn(
                    'cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-105 hover-lift',
                    {
                      'ring-2 ring-primary shadow-lg': selectedType === 'core6',
                      'hover:ring-2 hover:ring-primary/50': selectedType !== 'core6',
                    }
                  )}
                  onClick={() => handleSelection('core6')}
                >
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <BarChart3 className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-xl">Core 6 Analysis</CardTitle>
                  <Badge variant="success" className="mt-1">
                    <FileText className="w-3 h-3 mr-1" />
                    Comprehensive
                  </Badge>
                </div>
              </div>
              <div
                className={cn(
                  'w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200',
                  {
                    'border-primary bg-primary': selectedType === 'core6',
                    'border-muted-foreground': selectedType !== 'core6',
                  }
                )}
              >
                {selectedType === 'core6' && (
                  <CheckCircle className="w-4 h-4 text-primary-foreground" />
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-base mb-4">
              Analyze your product against 5 competitors for comprehensive comparison
            </CardDescription>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                Include your product + 5 competitors
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                Generate both Excel and Word reports
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                Detailed analysis with your product&apos;s position
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Core 6 Additional Fields */}
      {showFields && selectedType === 'core6' && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-xl">Additional Information for Word Report</CardTitle>
            <CardDescription>
              Provide additional details to personalize your Word report
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Prepared By (Optional)
                </label>
                <Input
                  type="text"
                  value={preparedBy}
                  onChange={(e) => setPreparedBy(e.target.value)}
                  placeholder="Enter your name or leave blank"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Product Category (Optional)
                </label>
                <Input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g., Fitness Equipment, Electronics, etc."
                />
              </div>
            </div>

            <div className="pt-4">
              <Button
                onClick={handleProceed}
                className="w-full"
                size="lg"
              >
                Continue to Data Collection →
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedType === 'core5' && (
        <Card className="mt-8 bg-green-50 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600 mr-3" />
              <span className="text-green-800 font-semibold text-lg">
                Analysis type selected! Proceeding to data collection...
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
