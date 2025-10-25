'use client';

import { useState, useEffect } from 'react';
import { useAnalysis } from '@/contexts/AnalysisContext';
import { PollResult } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { CheckCircle, Play, ChevronLeft, ChevronRight, BarChart3, Image, FileText, Loader2 } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';

const pollTypes = [
  { key: 'main_image', title: 'Main Image Poll', description: 'Evaluate the main product image', icon: Image },
  { key: 'image_stack', title: 'Image Stack Poll', description: 'Evaluate the complete image set', icon: BarChart3 },
  { key: 'features', title: 'Features Poll', description: 'Evaluate features and functionality', icon: FileText },
];

export default function PollingInterface() {
  const { state, dispatch } = useAnalysis();
  const { addToast } = useToast();
  const [currentPoll, setCurrentPoll] = useState<number>(0);
  const [demographic, setDemographic] = useState('');
  const [question, setQuestion] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [pollResult, setPollResult] = useState<PollResult | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const responsesPerPage = 5;

  const pollType = pollTypes[currentPoll].key as 'main_image' | 'image_stack' | 'features';

  // Pre-populate demographics for polls 2 and 3 with poll 1's demographic
  useEffect(() => {
    if (currentPoll > 0 && state.polls.mainImage?.demographic && !demographic.trim()) {
      setDemographic(state.polls.mainImage.demographic);
    }
  }, [currentPoll, state.polls.mainImage?.demographic, demographic]);

  // Add refresh protection
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Are you sure you want to refresh? All your poll data will be lost.';
      return 'Are you sure you want to refresh? All your poll data will be lost.';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const handleRunPoll = async () => {
    if (!demographic.trim() || !question.trim()) {
      addToast({
        title: 'Missing Information',
        description: 'Please provide both demographic and question.',
        variant: 'destructive'
      });
      return;
    }

    setIsRunning(true);
    try {
      // Create product list WITH images for image-based polls (main_image, image_stack)
      // For features poll, we can send lightweight version without images
      const includeImages = pollType === 'main_image' || pollType === 'image_stack';
      
      const productsForPoll = state.products.map(p => {
        const baseProduct = {
          id: p.id,
          asin: p.asin,
          name: p.name,
          price: p.price,
          shippingDays: p.shippingDays,
          reviewCount: p.reviewCount,
          rating: p.rating,
          features: p.features ? p.features.substring(0, 500) : 'No features provided',
          isUserProduct: p.isUserProduct
        };

        // Add images for image-based polls
        if (includeImages && (p.mainImage || p.additionalImages)) {
          return {
            ...baseProduct,
            images: {
              mainImage: p.mainImage,
              additionalImages: p.additionalImages || []
            }
          };
        }

        return baseProduct;
      });


      const response = await fetch('/api/poll', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        body: JSON.stringify({
          products: productsForPoll, // Send lightweight version without images
          demographic,
          question,
          pollType,
        }),
      });


      if (!response.ok) {
        const errorData = await response.json();
        console.error('Poll error response:', errorData);
        throw new Error(errorData.error || 'Poll failed');
      }

      const result = await response.json();
      setPollResult(result);
      
      // Save to state
      dispatch({ 
        type: 'SET_POLL_RESULT', 
        payload: { type: pollType, result } 
      });

    } catch (error: any) {
      console.error('Poll failed:', error);
      addToast({
        title: 'Poll Simulation Failed',
        description: error.message || 'Poll simulation failed. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleNextPoll = () => {
    if (currentPoll < pollTypes.length - 1) {
      setCurrentPoll(currentPoll + 1);
      // Don't clear demographic - let the effect pre-populate it
      setQuestion('');
      setPollResult(null);
      setCurrentPage(1);
    } else {
      // All polls completed, move to calculations step
      dispatch({ type: 'SET_CURRENT_STEP', payload: 4 });
    }
  };

  const handlePreviousPoll = () => {
    if (currentPoll > 0) {
      setCurrentPoll(currentPoll - 1);
      setQuestion('');
      setPollResult(null);
      setCurrentPage(1);
    }
  };

  const handleJumpToPoll = (pollIndex: number) => {
    setCurrentPoll(pollIndex);
    setQuestion('');
    setPollResult(null);
    setCurrentPage(1);
  };

  const renderPollResults = () => {
    if (!pollResult) return null;

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <BarChart3 className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <CardTitle className="text-2xl">Poll Results</CardTitle>
              <CardDescription className="text-lg">
                Analysis complete for {pollResult.rankings.length} products
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
        
          {/* Percentage Bars */}
          <div className="space-y-6">
            {pollResult.rankings.map((ranking, index) => {
              const product = state.products.find(p => p.id === ranking.productId);
              const uniqueKey = ranking.productId && ranking.productId.trim() ? ranking.productId : `ranking-${index}`;
              return (
                <Card key={uniqueKey} className="border-muted">
                  <CardContent className="pt-6">
                    <div className="flex items-center space-x-6">
                      <div className="w-32 text-sm font-medium text-foreground truncate">
                        {product?.name || `Product ${index + 1}`}
                      </div>
                      <div className="flex-1">
                        <Progress value={ranking.percentage} className="h-3" />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="default" className="bg-primary text-primary-foreground">
                          {ranking.percentage}%
                        </Badge>
                        <Badge variant="secondary" className="bg-muted text-muted-foreground">
                          #{ranking.rank}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Sample Responses */}
          <Card>
            <CardHeader className="pb-6">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Sample Responses</CardTitle>
                <div className="text-sm text-muted-foreground">
                  Showing {Math.min((currentPage - 1) * responsesPerPage + 1, pollResult.sampleResponses.length)}-{Math.min(currentPage * responsesPerPage, pollResult.sampleResponses.length)} of {pollResult.sampleResponses.length} responses
                  {pollResult.sampleResponses.length < 50 && (
                    <Badge variant="warning" className="ml-2">Expected 50</Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-4">
                {pollResult.sampleResponses
                  .slice((currentPage - 1) * responsesPerPage, currentPage * responsesPerPage)
                  .map((response, index) => (
                    <Card key={(currentPage - 1) * responsesPerPage + index} className="bg-muted/50 border-muted hover-lift">
                      <CardContent className="pt-6">
                        <p className="text-sm text-foreground italic">
                          &ldquo;{response}&rdquo;
                        </p>
                      </CardContent>
                    </Card>
                  ))}
              </div>

              {/* Pagination Controls */}
              {pollResult.sampleResponses.length > responsesPerPage && (
                <div className="mt-8 flex items-center justify-center space-x-3">
                  <Button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    variant="outline"
                    size="sm"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Previous
                  </Button>
                  
                  <div className="flex space-x-1">
                    {Array.from({ length: Math.ceil(pollResult.sampleResponses.length / responsesPerPage) }, (_, i) => i + 1).map((page) => (
                      <Button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        className="w-8 h-8 p-0"
                      >
                        {page}
                      </Button>
                    ))}
                  </div>
                  
                  <Button
                    onClick={() => setCurrentPage(Math.min(Math.ceil(pollResult.sampleResponses.length / responsesPerPage), currentPage + 1))}
                    disabled={currentPage === Math.ceil(pollResult.sampleResponses.length / responsesPerPage)}
                    variant="outline"
                    size="sm"
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="mt-8 flex justify-between">
            <Button
              onClick={handlePreviousPoll}
              disabled={currentPoll === 0}
              variant="outline"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous Poll
            </Button>
            
            <Button
              onClick={handleNextPoll}
              className="bg-green-600 hover:bg-green-700"
            >
              {currentPoll < pollTypes.length - 1 ? 'Next Poll' : 'Complete Polling'}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const currentPollData = pollTypes[currentPoll];
  const PollIcon = currentPollData.icon;

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <PollIcon className="w-6 h-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">
                Poll {currentPoll + 1} of 3: {currentPollData.title}
              </CardTitle>
              <CardDescription className="text-lg">
                {currentPollData.description}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* Poll Navigation - Compact */}
          <Card className="bg-muted/30 border-muted">
            <CardContent className="py-6">
              <div className="flex flex-wrap gap-2 mb-4">
                {pollTypes.map((poll, index) => {
                  const isCompleted = state.polls[poll.key as keyof typeof state.polls] !== null;
                  const isCurrent = index === currentPoll;
                  const PollIcon = poll.icon;
                  
                  return (
                    <Button
                      key={poll.key}
                      onClick={() => handleJumpToPoll(index)}
                      variant={isCurrent ? "default" : isCompleted ? "secondary" : "outline"}
                      size="sm"
                      className={`transition-all duration-200 ${
                        isCurrent
                          ? 'bg-primary text-primary-foreground'
                          : isCompleted
                          ? 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200'
                          : 'hover:bg-muted'
                      }`}
                    >
                      <div className="flex items-center space-x-1">
                        <PollIcon className="w-3 h-3" />
                        <span>Poll {index + 1}</span>
                        {isCompleted && <CheckCircle className="w-3 h-3" />}
                      </div>
                    </Button>
                  );
                })}
              </div>
              
              {/* Navigation Controls */}
              <div className="flex justify-between items-center">
                <Button
                  onClick={handlePreviousPoll}
                  disabled={currentPoll === 0}
                  variant="outline"
                  size="sm"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous Poll
                </Button>
                
                <div className="text-sm text-muted-foreground flex items-center">
                  Poll {currentPoll + 1} of {pollTypes.length}
                </div>
                
                <Button
                  onClick={handleNextPoll}
                  disabled={currentPoll === pollTypes.length - 1}
                  variant="outline"
                  size="sm"
                >
                  Next Poll
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Poll Configuration - Enhanced */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-6">
              <CardTitle className="text-xl flex items-center space-x-2">
                <FileText className="w-5 h-5 text-primary" />
                <span>Poll Configuration</span>
              </CardTitle>
              <CardDescription className="text-base">
                Configure the demographic and question for this poll simulation
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <label className="text-sm font-semibold text-foreground flex items-center space-x-2">
                    <span>Target Demographic</span>
                    <Badge variant="destructive" className="text-xs">Required</Badge>
                  </label>
                  <Input
                    type="text"
                    value={demographic}
                    onChange={(e) => setDemographic(e.target.value)}
                    placeholder="e.g., Women 25-35, Fitness enthusiasts, Parents with young children"
                    className="h-12 text-base"
                  />
                  {currentPoll > 0 && state.polls.mainImage?.demographic && demographic === state.polls.mainImage.demographic && (
                    <div className="flex items-center space-x-2 text-sm text-primary">
                      <CheckCircle className="w-4 h-4" />
                      <span>Pre-filled from Poll 1. You can modify this if needed.</span>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <label className="text-sm font-semibold text-foreground flex items-center space-x-2">
                    <span>Evaluation Question</span>
                    <Badge variant="destructive" className="text-xs">Required</Badge>
                  </label>
                  <textarea
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-4 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-base resize-none"
                    placeholder="e.g., Which product image is most appealing to you? Which product would you most likely purchase?"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

            {/* Products Preview */}
            <Card>
              <CardHeader className="pb-6">
                <CardTitle className="text-lg">Products to Evaluate</CardTitle>
                <CardDescription className="text-base">
                  {state.products.length} products will be evaluated in this poll
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {state.products.map((product, index) => (
                    <Card key={product.id} className="border-muted">
                      <CardContent className="pt-6">
                        <h4 className="font-medium text-foreground mb-3">
                          Product {index + 1}: {product.name}
                        </h4>
                        <div className="text-sm text-muted-foreground space-y-2">
                          <p>Price: ${product.price.toFixed(2)}</p>
                          <p>Rating: {product.rating} stars ({product.reviewCount?.toLocaleString() || 0} reviews)</p>
                          <p className="truncate">Features: {product.features.substring(0, 100)}...</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Run Poll Button */}
            <div className="flex justify-center pt-4">
              <Button
                onClick={handleRunPoll}
                disabled={isRunning || !demographic.trim() || !question.trim()}
                size="lg"
                className="px-10 py-4 text-lg"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Running Simulation...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Run Poll Simulation
                  </>
                )}
              </Button>
            </div>
            
            {/* Running Status */}
            {isRunning && (
              <Card className="bg-primary/5 border-primary/20 mt-6">
                <CardContent className="pt-8">
                  <div className="flex items-center justify-center space-x-3 mb-4">
                    <Loader2 className="h-6 w-6 text-primary animate-spin" />
                    <div className="text-center">
                      <p className="text-lg font-semibold text-primary">
                        Simulating 50 responses from {demographic}
                      </p>
                      <p className="text-sm text-primary/70 mt-1">
                        This may take up to 60 seconds...
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-primary/60 text-center">
                    Auto-retrying on failures with exponential backoff
                  </p>
                </CardContent>
              </Card>
            )}
        </CardContent>
      </Card>

      {/* Poll Results */}
      {pollResult && renderPollResults()}
    </div>
  );
}
