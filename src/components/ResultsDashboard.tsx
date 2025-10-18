'use client';

import { useState, useEffect } from 'react';
import { useAnalysis } from '@/contexts/AnalysisContext';
import { calculateAllScores, validateCalculations } from '@/lib/scoring';
import { downloadFile } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
// import { Progress } from '@/components/ui/progress'; // Unused for now
// import { Skeleton } from '@/components/ui/skeleton'; // Unused for now
import { Trophy, Download, FileText, BarChart3, TrendingUp, Star, Package, Truck, MessageSquare, Image, FileCode, Loader2, CheckCircle } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';

export default function ResultsDashboard() {
  const { state, dispatch } = useAnalysis();
  const { addToast } = useToast();
  const [calculations, setCalculations] = useState(state.calculations);
  const [isGeneratingExcel, setIsGeneratingExcel] = useState(false);
  const [isGeneratingWord, setIsGeneratingWord] = useState(false);
  const [isGeneratingCore5Analysis, setIsGeneratingCore5Analysis] = useState(false);

  useEffect(() => {
    // Calculate scores if not already done
    if (!calculations) {
      const newCalculations = calculateAllScores(
        state.products,
        state.polls.mainImage,
        state.polls.imageStack,
        state.polls.features
      );
      
      // Triple-check calculations
      if (validateCalculations(newCalculations)) {
        setCalculations(newCalculations);
        dispatch({ type: 'SET_CALCULATIONS', payload: newCalculations });
      } else {
        console.error('Calculation validation failed');
        addToast({
          title: 'Calculation Error',
          description: 'Error in score calculations. Please try again.',
          variant: 'destructive'
        });
      }
    }
  }, [state.products, state.polls, calculations, dispatch]);

  const handleDownloadExcel = async () => {
    if (!calculations) return;

    setIsGeneratingExcel(true);
    try {
      const analysis = {
        id: 'temp',
        type: state.analysisType!,
        createdAt: new Date(),
        products: state.products,
        pollResults: state.polls,
        calculations,
      };

      const response = await fetch('/api/generate-excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(analysis),
      });

      if (!response.ok) throw new Error('Excel generation failed');

      const buffer = await response.arrayBuffer();
      const asins = state.products.map(p => p.asin).join('_');
      const filename = state.analysisType === 'core5' 
        ? `Core 5 Calculator - ${asins}.xlsx`
        : `Core 6 Calculator - ${asins}.xlsx`;

      downloadFile(buffer, filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    } catch (error) {
      console.error('Excel download failed:', error);
      addToast({
        title: 'Excel Generation Failed',
        description: 'Failed to generate Excel report. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsGeneratingExcel(false);
    }
  };

  const handleDownloadWord = async () => {
    if (!calculations || state.analysisType !== 'core6') return;

    setIsGeneratingWord(true);
    try {
      const analysis = {
        id: 'temp',
        type: state.analysisType,
        createdAt: new Date(),
        products: state.products,
        pollResults: state.polls,
        calculations,
      };

      const response = await fetch('/api/generate-word', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysis,
          preparedBy: state.preparedBy,
          productCategory: state.productCategory
        }),
      });

      if (!response.ok) throw new Error('Word generation failed');

      const buffer = await response.arrayBuffer();
      const asins = state.products.map(p => p.asin).join('_');
      const filename = `Core 6 Analysis - ${asins}.docx`;

      downloadFile(buffer, filename, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    } catch (error) {
      console.error('Word download failed:', error);
      addToast({
        title: 'Word Generation Failed',
        description: 'Failed to generate Word report. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsGeneratingWord(false);
    }
  };

  const handleDownloadCore5Analysis = async () => {
    if (!calculations || state.analysisType !== 'core5') return;

    setIsGeneratingCore5Analysis(true);
    try {
      const analysis = {
        id: 'temp',
        type: state.analysisType,
        createdAt: new Date(),
        products: state.products,
        pollResults: state.polls,
        calculations,
      };

      const response = await fetch('/api/generate-core5-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysis }),
      });

      if (!response.ok) throw new Error('Core 5 analysis generation failed');

      const buffer = await response.arrayBuffer();
      const asins = state.products.map(p => p.asin).join('_');
      const filename = `Core 5 Market Analysis - ${asins}.docx`;

      downloadFile(buffer, filename, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    } catch (error) {
      console.error('Core 5 analysis download failed:', error);
      addToast({
        title: 'Core 5 Analysis Failed',
        description: 'Failed to generate Core 5 analysis report. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsGeneratingCore5Analysis(false);
    }
  };

  const handleNewAnalysis = () => {
    dispatch({ type: 'RESET_ANALYSIS' });
  };

  if (!calculations) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardContent className="pt-8">
            <div className="text-center">
              <div className="flex justify-center mb-6">
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
              </div>
              <h2 className="text-2xl font-semibold text-foreground mb-2">Calculating Scores...</h2>
              <p className="text-muted-foreground">Please wait while we process your analysis.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Find top performer
  const topPerformer = calculations.reduce((prev, current) => 
    current.totalScore > prev.totalScore ? current : prev
  );
  const topProduct = state.products.find(p => p.id === topPerformer.productId);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <CardTitle className="text-3xl">Analysis Complete!</CardTitle>
              <CardDescription className="text-lg">
                {state.analysisType === 'core5' ? 'Core 5' : 'Core 6'} Competitive Analysis Results
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Top Performer */}
          <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-center">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 text-green-800 rounded-full mb-4">
                    <Trophy className="w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-2">
                    Top Performer: {topProduct?.name}
                  </h3>
                  <div className="flex items-center justify-center space-x-2">
                    <Badge variant="success" className="text-lg px-4 py-2">
                      {topPerformer.totalScore}/130 points
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      {/* Score Breakdown */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <BarChart3 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">Score Breakdown</CardTitle>
              <CardDescription className="text-lg">
                Detailed scoring analysis for all products
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-4 px-4 font-semibold text-foreground min-w-[300px]">Product</th>
                  <th className="text-center py-4 px-4 font-semibold text-foreground min-w-[100px]">
                    <div className="flex items-center justify-center space-x-1">
                      <Package className="w-4 h-4" />
                      <span>Price</span>
                    </div>
                  </th>
                  <th className="text-center py-4 px-4 font-semibold text-foreground min-w-[100px]">
                    <div className="flex items-center justify-center space-x-1">
                      <Truck className="w-4 h-4" />
                      <span>Shipping</span>
                    </div>
                  </th>
                  <th className="text-center py-4 px-4 font-semibold text-foreground min-w-[100px]">
                    <div className="flex items-center justify-center space-x-1">
                      <MessageSquare className="w-4 h-4" />
                      <span>Reviews</span>
                    </div>
                  </th>
                  <th className="text-center py-4 px-4 font-semibold text-foreground min-w-[100px]">
                    <div className="flex items-center justify-center space-x-1">
                      <Star className="w-4 h-4" />
                      <span>Rating</span>
                    </div>
                  </th>
                  <th className="text-center py-4 px-4 font-semibold text-foreground min-w-[100px]">
                    <div className="flex items-center justify-center space-x-1">
                      <Image className="w-4 h-4" />
                      <span>Images</span>
                    </div>
                  </th>
                  <th className="text-center py-4 px-4 font-semibold text-foreground min-w-[100px]">
                    <div className="flex items-center justify-center space-x-1">
                      <FileCode className="w-4 h-4" />
                      <span>Features</span>
                    </div>
                  </th>
                  <th className="text-center py-4 px-4 font-semibold text-foreground min-w-[100px]">Total</th>
                </tr>
              </thead>
              <tbody>
                {calculations.map((calc, index) => {
                  const product = state.products.find(p => p.id === calc.productId);
                  const isTopPerformer = calc.productId === topPerformer.productId;
                  
                  return (
                    <tr 
                      key={calc.productId} 
                      className={`border-b border-border ${isTopPerformer ? 'bg-green-50' : 'hover:bg-muted/50'} hover-lift`}
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-3">
                          {isTopPerformer && (
                            <Trophy className="w-5 h-5 text-green-600" />
                          )}
                          <div>
                            <div className="font-medium text-foreground">
                              {product?.isUserProduct ? 'Your Product' : `Competitor ${index + 1}`}
                            </div>
                            <div className="text-sm text-muted-foreground truncate max-w-xs">
                              {product?.name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="text-center py-4 px-4">
                        <Badge variant="outline" className="font-medium">
                          {calc.priceScore}/10
                        </Badge>
                      </td>
                      <td className="text-center py-4 px-4">
                        <Badge variant="outline" className="font-medium">
                          {calc.shippingScore}/10
                        </Badge>
                      </td>
                      <td className="text-center py-4 px-4">
                        <Badge variant="outline" className="font-medium">
                          {calc.reviewScore}/30
                        </Badge>
                      </td>
                      <td className="text-center py-4 px-4">
                        <Badge variant="outline" className="font-medium">
                          {calc.ratingScore}/30
                        </Badge>
                      </td>
                      <td className="text-center py-4 px-4">
                        <Badge variant="outline" className="font-medium">
                          {(calc.mainImageScore + calc.imageStackScore)}/20
                        </Badge>
                      </td>
                      <td className="text-center py-4 px-4">
                        <Badge variant="outline" className="font-medium">
                          {calc.featuresScore}/30
                        </Badge>
                      </td>
                      <td className="text-center py-4 px-4">
                        <Badge 
                          variant={isTopPerformer ? "success" : "default"} 
                          className="font-bold text-lg px-3 py-1"
                        >
                          {calc.totalScore}/130
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Download Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Download className="w-6 h-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">Download Reports</CardTitle>
              <CardDescription className="text-lg">
                Generate and download your analysis reports
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className={`grid gap-6 ${state.analysisType === 'core6' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2'}`}>
            {/* Excel Report */}
            <Card className="border-muted hover-lift">
              <CardContent className="pt-6">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-green-100 text-green-600 rounded-lg flex items-center justify-center mr-4">
                    <BarChart3 className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">Excel Report</h4>
                    <p className="text-sm text-muted-foreground">Detailed score breakdown</p>
                  </div>
                </div>
                <Button
                  onClick={handleDownloadExcel}
                  disabled={isGeneratingExcel}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {isGeneratingExcel ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Download Excel
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Word Report (Core 6 only) */}
            {state.analysisType === 'core6' && (
              <Card className="border-muted hover-lift">
                <CardContent className="pt-6">
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mr-4">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">Word Analysis</h4>
                      <p className="text-sm text-muted-foreground">Detailed written analysis with optimization recommendations</p>
                    </div>
                  </div>
                  <Button
                    onClick={handleDownloadWord}
                    disabled={isGeneratingWord}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    {isGeneratingWord ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <FileText className="w-4 h-4 mr-2" />
                        Download Word
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Core 5 Market Analysis (Core 5 only) */}
            {state.analysisType === 'core5' && (
              <Card className="border-muted hover-lift">
                <CardContent className="pt-6">
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center mr-4">
                      <TrendingUp className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">Market Analysis</h4>
                      <p className="text-sm text-muted-foreground">Competitive analysis & market opportunities</p>
                    </div>
                  </div>
                  <Button
                    onClick={handleDownloadCore5Analysis}
                    disabled={isGeneratingCore5Analysis}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                  >
                    {isGeneratingCore5Analysis ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <TrendingUp className="w-4 h-4 mr-2" />
                        Download Market Analysis
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </CardContent>
      </Card>

      {/* New Analysis Button */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="text-center">
            <Button
              onClick={handleNewAnalysis}
              variant="outline"
              size="lg"
              className="px-8 py-3"
            >
              Start New Analysis
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
