'use client';

import { FetchStatus } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
// import { Skeleton } from '@/components/ui/skeleton'; // Unused for now
import { CheckCircle, AlertCircle, RefreshCw, XCircle, Clock, Package, DollarSign, Truck, MessageSquare, Star, Image, FileText } from 'lucide-react';

interface ProductFetchStatus {
  asin: string;
  status: FetchStatus;
  name?: string;
  price?: number;
  shippingDays?: number;
  reviewCount?: number;
  rating?: number;
  imageCount?: number;
  featureCount?: number;
  error?: string;
}

interface FetchingProgressProps {
  products: ProductFetchStatus[];
  onPause?: () => void;
  onSkipFailed?: () => void;
  onManualEntry?: () => void;
}

export default function FetchingProgress({ 
  products, 
  onPause, 
  onSkipFailed,
  onManualEntry 
}: FetchingProgressProps) {
  const totalCount = products.length;
  const completedCount = products.filter(
    p => p.status === 'success' || p.status === 'needs_review' || p.status === 'failed'
  ).length;
  const successCount = products.filter(p => p.status === 'success').length;
  const failedCount = products.filter(p => p.status === 'failed').length;
  const reviewCount = products.filter(p => p.status === 'needs_review').length;
  
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const isFetching = products.some(p => p.status === 'fetching');

  const getStatusIcon = (status: FetchStatus) => {
    switch (status) {
      case 'fetching':
        return <RefreshCw className="w-5 h-5 text-primary animate-spin" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'needs_review':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'pending':
      default:
        return <Clock className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getStatusLabel = (status: FetchStatus) => {
    switch (status) {
      case 'fetching':
        return 'Fetching...';
      case 'success':
        return 'Retrieved';
      case 'needs_review':
        return 'Needs Review';
      case 'failed':
        return 'Failed';
      case 'pending':
      default:
        return 'Pending';
    }
  };

  const getStatusVariant = (status: FetchStatus) => {
    switch (status) {
      case 'success':
        return 'success';
      case 'needs_review':
        return 'warning';
      case 'failed':
        return 'destructive';
      case 'fetching':
        return 'default';
      case 'pending':
      default:
        return 'secondary';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Package className="w-6 h-6 text-primary" />
          </div>
          <div>
            <CardTitle className="text-2xl">Fetching Product Data</CardTitle>
            <CardDescription className="text-lg">
              {isFetching ? 'Retrieving product information...' : `${completedCount} of ${totalCount} products processed`}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Product Status List */}
        <div className="space-y-4 mb-6">
          {products.map((product) => (
            <Card
              key={product.asin}
              className={`transition-all duration-300 ${
                product.status === 'success'
                  ? 'border-green-200 bg-green-50'
                  : product.status === 'needs_review'
                  ? 'border-yellow-200 bg-yellow-50'
                  : product.status === 'failed'
                  ? 'border-red-200 bg-red-50'
                  : product.status === 'fetching'
                  ? 'border-primary bg-primary/5 animate-pulse'
                  : 'border-muted bg-muted/50'
              }`}
            >
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(product.status)}
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="font-mono font-semibold text-foreground">
                          {product.asin}
                        </span>
                        <Badge variant={getStatusVariant(product.status)}>
                          {getStatusLabel(product.status)}
                        </Badge>
                      </div>
                      
                      {/* Product Details (when fetched) */}
                      {product.name && (
                        <div className="mt-3">
                          <p className="font-semibold text-foreground text-sm mb-2">
                            {product.name.length > 60 ? product.name.substring(0, 60) + '...' : product.name}
                          </p>
                          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                            {product.price && (
                              <div className="flex items-center space-x-1">
                                <DollarSign className="w-3 h-3" />
                                <span>${product.price.toFixed(2)}</span>
                              </div>
                            )}
                            {product.shippingDays !== undefined && (
                              <div className="flex items-center space-x-1">
                                <Truck className="w-3 h-3" />
                                <span>{product.shippingDays} days</span>
                              </div>
                            )}
                            {product.reviewCount !== undefined && (
                              <div className="flex items-center space-x-1">
                                <MessageSquare className="w-3 h-3" />
                                <span>{product.reviewCount.toLocaleString()}</span>
                              </div>
                            )}
                            {product.rating !== undefined && (
                              <div className="flex items-center space-x-1">
                                <Star className="w-3 h-3" />
                                <span>{product.rating}</span>
                              </div>
                            )}
                            {product.imageCount !== undefined && (
                              <div className="flex items-center space-x-1">
                                <Image className="w-3 h-3" />
                                <span>{product.imageCount}</span>
                              </div>
                            )}
                            {product.featureCount !== undefined && (
                              <div className="flex items-center space-x-1">
                                <FileText className="w-3 h-3" />
                                <span>{product.featureCount}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Error Message */}
                      {product.error && (
                        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
                          <AlertCircle className="w-4 h-4 inline mr-1" />
                          {product.error}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm font-medium text-foreground mb-3">
            <span>Progress</span>
            <span>{completedCount}/{totalCount} ({progress}%)</span>
          </div>
          <Progress value={progress} className="h-3" />
          
          {/* Status Summary */}
          <div className="flex justify-around mt-4 text-sm">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-green-600 font-medium">Success: {successCount}</span>
            </div>
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-yellow-600" />
              <span className="text-yellow-600 font-medium">Review: {reviewCount}</span>
            </div>
            <div className="flex items-center space-x-2">
              <XCircle className="w-4 h-4 text-red-600" />
              <span className="text-red-600 font-medium">Failed: {failedCount}</span>
            </div>
          </div>
        </div>

        {/* Info Message */}
        <Card className="bg-primary/5 border-primary/20 mb-6">
          <CardContent className="pt-4">
            <div className="flex items-start space-x-3">
              <RefreshCw className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm text-primary font-medium">
                  Auto-retrying on failures with exponential backoff
                </p>
                <p className="text-xs text-primary/70 mt-1">
                  Each product takes ~2-5 seconds to fetch. Rate limited to 200ms between requests.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        {(onPause || onSkipFailed || onManualEntry) && (
          <div className="flex gap-3">
            {onPause && (
              <Button
                onClick={onPause}
                disabled={!isFetching}
                variant="outline"
                size="sm"
              >
                Pause
              </Button>
            )}
            
            {onSkipFailed && failedCount > 0 && (
              <Button
                onClick={onSkipFailed}
                variant="outline"
                size="sm"
                className="border-yellow-300 text-yellow-700 hover:bg-yellow-50"
              >
                Skip Failed & Continue
              </Button>
            )}
            
            {onManualEntry && (
              <Button
                onClick={onManualEntry}
                variant="outline"
                size="sm"
                className="border-primary text-primary hover:bg-primary/10"
              >
                Switch to Manual Entry
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

