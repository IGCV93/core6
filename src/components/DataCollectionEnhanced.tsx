'use client';

import { useState, useEffect } from 'react';
import { useAnalysis } from '@/contexts/AnalysisContext';
import { CompleteProductData, Product, FetchStatus, DataCollectionMethod } from '@/lib/types';
import { generateId } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Users, Package, TrendingUp } from 'lucide-react';
import DataCollectionMethodSelector from './DataCollectionMethod';
import BulkASINInput from './BulkASINInput';
import FetchingProgress from './FetchingProgress';
import ProductDataDisplay from './ProductDataDisplay';
import DataCollection from './DataCollection';

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

export default function DataCollectionEnhanced() {
  const { state, dispatch } = useAnalysis();
  const [collectionMethod, setCollectionMethod] = useState<DataCollectionMethod>(state.collectionMethod || 'automatic');
  const [fetchStatuses, setFetchStatuses] = useState<ProductFetchStatus[]>([]);
  const [fetchedProducts, setFetchedProducts] = useState<CompleteProductData[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [refreshingProducts, setRefreshingProducts] = useState<Set<number>>(new Set());

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      // Cleanup any blob URLs that were created during image conversion
      if (state.products) {
        state.products.forEach(product => {
          if (product.mainImage && typeof product.mainImage === 'string' && product.mainImage.startsWith('data:')) {
            try {
              const base64Data = product.mainImage.replace(/^data:image\/[a-z]+;base64,/, '');
              const binaryString = atob(base64Data);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              const blob = new Blob([bytes], { type: 'image/jpeg' });
              const blobUrl = URL.createObjectURL(blob);
              URL.revokeObjectURL(blobUrl);
            } catch {
              // Ignore cleanup errors
            }
          }
        });
      }
    };
  }, []);

  // const totalProducts = getTotalProducts(state); // Unused for now

  // Check if we already have products in the state (user navigated back)
  const totalProducts = state.analysisType === 'core6' ? 6 : 5;
  const hasExistingProducts = state.products.length > 0;
  const allProductsCollected = state.products.length >= totalProducts;

  // Handler functions - defined early to avoid reference errors
  const handleProductUpdate = (index: number, updates: Partial<CompleteProductData>) => {
    // For manual entry, update the global state directly
    if (collectionMethod === 'manual' && hasExistingProducts) {
      dispatch({ type: 'UPDATE_PRODUCT', payload: { index, product: { ...state.products[index], ...updates } } });
    } else {
      // For fetched products, update local state
      const updated = [...fetchedProducts];
      updated[index] = { ...updated[index], ...updates };
      setFetchedProducts(updated);
    }
  };

  const handleProductRefresh = async (index: number) => {
    const product = collectionMethod === 'manual' && hasExistingProducts 
      ? state.products[index] 
      : fetchedProducts[index];
    
    if (!product) return;

    setRefreshingProducts(prev => new Set(prev).add(index));
    
    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asin: product.asin })
      });

      if (response.ok) {
        const refreshedData = await response.json();
        
        if (collectionMethod === 'manual' && hasExistingProducts) {
          // For manual entry, update global state
          dispatch({ type: 'UPDATE_PRODUCT', payload: { index, product: refreshedData.product } });
        } else {
          // For fetched products, update local state
          const updated = [...fetchedProducts];
          updated[index] = refreshedData.product;
          setFetchedProducts(updated);
        }
      } else {
        console.error('Failed to refresh product:', product.asin);
      }
    } catch (_error) {
      console.error('Error refreshing product:', _error);
    } finally {
      setRefreshingProducts(prev => {
        const newSet = new Set(prev);
        newSet.delete(index);
        return newSet;
      });
    }
  };

  const handleProductConfirm = () => {
    // Product confirmed - could add to state here if needed
  };

  const handleConfirmAll = () => {
    if (collectionMethod === 'manual' && hasExistingProducts) {
      // For manual entry, products are already in global state, just navigate to next step
      dispatch({ type: 'NAVIGATE_TO_STEP', payload: { step: 3 } });
    } else {
      // For fetched products, convert and add to global state
      const products: Product[] = fetchedProducts.map((completeData, index) => convertToProduct(completeData, index));
      
      // Add products to global state
      dispatch({ type: 'SET_PRODUCTS_BULK', payload: products });
      
      // Move to next step (polls)
      dispatch({ type: 'SET_CURRENT_STEP', payload: 3 });
    }
  };
  
  // If we have existing products, show the data collection interface instead of method selector
        if (hasExistingProducts && collectionMethod === 'automatic') {
          // Convert existing products to the format expected by the component
          const existingProducts = state.products.map((product, idx) => {
      
      return {
        asin: product.asin,
        name: product.name,
        price: product.price,
        shippingDays: product.shippingDays,
        reviewCount: product.reviewCount,
        rating: product.rating,
        images: {
          mainImage: (() => {
            if (!product.mainImage || product.mainImage === '') return null;
            
            let base64String = '';
            let mediaType = 'image/jpeg';
            
            if (typeof product.mainImage === 'string') {
              base64String = product.mainImage;
            } else if (product.mainImage && typeof product.mainImage === 'object' && product.mainImage.base64) {
              base64String = product.mainImage.base64;
              mediaType = product.mainImage.mediaType || 'image/jpeg';
            }
            
            if (!base64String) return null;
            
            // Create proper blob URL from base64
            try {
              const base64Data = base64String.replace(/^data:image\/[a-z]+;base64,/, '');
              const binaryString = atob(base64Data);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              const blob = new Blob([bytes], { type: mediaType });
              const blobUrl = URL.createObjectURL(blob);
              
              
              return { 
                blob, 
                url: blobUrl, 
                originalUrl: base64String, 
                size: blob.size, 
                type: mediaType, 
                base64: base64String 
              };
            } catch (error) {
              console.error('Failed to create blob URL for main image:', error);
              return null;
            }
          })(),
          additionalImages: (product.additionalImages || []).map(img => {
            if (!img || img === '') return null;
            
            let base64String = '';
            let mediaType = 'image/jpeg';
            
            if (typeof img === 'string') {
              base64String = img;
            } else if (img && typeof img === 'object' && img.base64) {
              base64String = img.base64;
              mediaType = img.mediaType || 'image/jpeg';
            }
            
            if (!base64String) return null;
            
            // Create proper blob URL from base64
            try {
              const base64Data = base64String.replace(/^data:image\/[a-z]+;base64,/, '');
              const binaryString = atob(base64Data);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              const blob = new Blob([bytes], { type: mediaType });
              const blobUrl = URL.createObjectURL(blob);
              
              return { 
                blob, 
                url: blobUrl, 
                originalUrl: base64String, 
                size: blob.size, 
                type: mediaType, 
                base64: base64String 
              };
            } catch (error) {
              console.error('Failed to create blob URL for additional image:', error);
              return null;
            }
          }).filter(img => img !== null)
        },
        features: product.features,
        validation: { isValid: true, errors: [], warnings: [], data: product }
      };
    });

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Package className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl">Review Existing Products</CardTitle>
                <CardDescription className="text-lg">
                  {existingProducts.length} products ready for analysis
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              You can edit any field or refresh individual products. Your data has been preserved.
            </p>
            
            {state.analysisType === 'core6' && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="text-green-800 font-medium">
                      Core 6 Analysis Configuration
                    </p>
                    <p className="text-green-700 text-sm mt-1">
                      The first product in the list below will be treated as &quot;Your Product&quot; in the analysis. 
                      The remaining products will be analyzed as competitors.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Product Display Cards */}
        {existingProducts.map((product, idx) => (
          <ProductDataDisplay
            key={product.asin}
            product={product}
            index={idx}
            onUpdate={handleProductUpdate}
            onRefresh={handleProductRefresh}
            onConfirm={handleProductConfirm}
            isRefreshing={refreshingProducts.has(idx)}
            isUserProduct={state.analysisType === 'core6' && idx === 0}
          />
        ))}

        {/* Confirm All Button */}
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-green-900 text-lg">
                    {existingProducts.length} products ready
                  </p>
                  <p className="text-green-700">
                    All products have been confirmed and are ready for the next step.
                  </p>
                </div>
              </div>
              <Button
                onClick={handleConfirmAll}
                size="lg"
                className="bg-green-600 hover:bg-green-700"
              >
                Continue to Polling →
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Handle bulk ASIN fetch - Sequential with real-time progress updates
  const handleBulkFetch = async (asins: string[]) => {
    setIsFetching(true);
    
    // Initialize statuses as pending
    const initialStatuses: ProductFetchStatus[] = asins.map(asin => ({
      asin,
      status: 'pending'
    }));
    setFetchStatuses(initialStatuses);

    const fetchedProductsList: any[] = [];

    // FETCH ONE AT A TIME for real-time progress updates
    for (let i = 0; i < asins.length; i++) {
      const asin = asins[i];
      
      try {
        // Update status to "fetching"
        setFetchStatuses(prev => prev.map((p, idx) => 
          idx === i ? { ...p, status: 'fetching' as FetchStatus } : p
        ));
        
        // Fetch single product
        const response = await fetch('/api/scrape', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ asin })
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch ASIN ${asin}`);
        }

        const data = await response.json();
        const productData = data.product;
        
        // Store product
        fetchedProductsList.push(productData);
        
        // Determine status based on validation
        let status: FetchStatus = 'success';
        if (productData.validation && !productData.validation.isValid) {
          status = 'failed';
        } else if (productData.validation && productData.validation.warnings?.length > 0) {
          status = 'needs_review';
        }
        
        // Update status to "success" with full details
        setFetchStatuses(prev => prev.map((p, idx) => 
          idx === i ? {
            asin: productData.asin,
            status: status,
            name: productData.name,
            price: productData.price,
            shippingDays: productData.shippingDays,
            reviewCount: productData.reviewCount,
            rating: productData.rating,
            imageCount: (productData.images?.mainImage ? 1 : 0) + 
                       (productData.images?.additionalImages?.length || 0),
            featureCount: productData.features?.split('\n\n').filter((f: string) => f.trim()).length || 0
          } : p
        ));
        
      } catch (error: any) {
        console.error(`Failed to fetch ${asin}:`, error);
        
        // Update status to "failed"
        setFetchStatuses(prev => prev.map((p, idx) => 
          idx === i ? { 
            ...p, 
            status: 'failed' as FetchStatus, 
            error: error.message || 'Fetch failed'
          } : p
        ));
      }
      
      // Rate limiting - 200ms delay between requests
      if (i < asins.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    // Store all fetched products
    setFetchedProducts(fetchedProductsList);
    setIsFetching(false);
  };

  // Convert CompleteProductData to Product for analysis
  const convertToProduct = (completeData: any, index: number = 0): Product => {
    // Handle both Blob-based and serialized (base64) images
    const mainImage = completeData.images?.mainImage?.base64 || 
                     completeData.images?.mainImage?.url || 
                     '';
    
    const additionalImages = completeData.images?.additionalImages?.map((img: any) => 
      img.base64 || img.url || ''
    ) || [];
    
    
    return {
      id: generateId(),
      asin: completeData.asin,
      name: completeData.name,
      price: completeData.price,
      shippingDays: completeData.shippingDays,
      reviewCount: completeData.reviewCount,
      rating: completeData.rating,
      mainImage,
      additionalImages,
      features: completeData.features,
      isUserProduct: state.analysisType === 'core6' && index === 0
    };
  };

  // Render based on collection method
  if (collectionMethod === 'manual') {
    // If we have all products collected, show them for review/editing
    if (allProductsCollected) {
      return (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-2xl">Review Manual Data Entry</CardTitle>
                  <CardDescription className="text-lg">
                    {state.products.length} products ready for review
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Review the manually entered data below. You can edit any field or continue to the next step.
              </p>
              
              {state.analysisType === 'core6' && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="text-green-800 font-medium">
                        Core 6 Analysis Configuration
                      </p>
                      <p className="text-green-700 text-sm mt-1">
                        The first product in the list below will be treated as &quot;Your Product&quot; in the analysis. 
                        The remaining products will be analyzed as competitors.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Product Display Cards */}
          {state.products.map((product, idx) => {
            // Convert Product to CompleteProductData format
            const completeProduct: CompleteProductData = {
              asin: product.asin,
              name: product.name,
              price: product.price,
              shippingDays: product.shippingDays,
              reviewCount: product.reviewCount,
              rating: product.rating,
              images: {
                mainImage: (() => {
                  if (!product.mainImage) return null;
                  
                  if (typeof product.mainImage === 'string') {
                    // Convert base64 string to blob URL
                    const base64Data = product.mainImage.replace(/^data:image\/[a-z]+;base64,/, '');
                    const byteCharacters = atob(base64Data);
                    const byteNumbers = new Array(byteCharacters.length);
                    for (let i = 0; i < byteCharacters.length; i++) {
                      byteNumbers[i] = byteCharacters.charCodeAt(i);
                    }
                    const byteArray = new Uint8Array(byteNumbers);
                    const blob = new Blob([byteArray], { type: 'image/jpeg' });
                    const url = URL.createObjectURL(blob);
                    return { blob, url, originalUrl: product.mainImage, size: blob.size, type: 'image/jpeg', base64: product.mainImage };
                  } else {
                    // Convert base64 object to blob URL
                    const base64Data = product.mainImage.base64.replace(/^data:image\/[a-z]+;base64,/, '');
                    const byteCharacters = atob(base64Data);
                    const byteNumbers = new Array(byteCharacters.length);
                    for (let i = 0; i < byteCharacters.length; i++) {
                      byteNumbers[i] = byteCharacters.charCodeAt(i);
                    }
                    const byteArray = new Uint8Array(byteNumbers);
                    const blob = new Blob([byteArray], { type: product.mainImage.mediaType });
                    const url = URL.createObjectURL(blob);
                    return { blob, url, originalUrl: product.mainImage.base64, size: blob.size, type: product.mainImage.mediaType, base64: product.mainImage.base64 };
                  }
                })(),
                additionalImages: (product.additionalImages || []).map(img => {
                  if (typeof img === 'string') {
                    // Convert base64 string to blob URL
                    const base64Data = img.replace(/^data:image\/[a-z]+;base64,/, '');
                    const byteCharacters = atob(base64Data);
                    const byteNumbers = new Array(byteCharacters.length);
                    for (let i = 0; i < byteCharacters.length; i++) {
                      byteNumbers[i] = byteCharacters.charCodeAt(i);
                    }
                    const byteArray = new Uint8Array(byteNumbers);
                    const blob = new Blob([byteArray], { type: 'image/jpeg' });
                    const url = URL.createObjectURL(blob);
                    return { blob, url, originalUrl: img, size: blob.size, type: 'image/jpeg', base64: img };
                  } else {
                    // Convert base64 object to blob URL
                    const base64Data = img.base64.replace(/^data:image\/[a-z]+;base64,/, '');
                    const byteCharacters = atob(base64Data);
                    const byteNumbers = new Array(byteCharacters.length);
                    for (let i = 0; i < byteCharacters.length; i++) {
                      byteNumbers[i] = byteCharacters.charCodeAt(i);
                    }
                    const byteArray = new Uint8Array(byteNumbers);
                    const blob = new Blob([byteArray], { type: img.mediaType });
                    const url = URL.createObjectURL(blob);
                    return { blob, url, originalUrl: img.base64, size: blob.size, type: img.mediaType, base64: img.base64 };
                  }
                })
              },
              features: product.features,
              validation: {
                isValid: true,
                errors: [],
                warnings: [],
                data: {}
              }
            };

            return (
              <ProductDataDisplay
                key={product.asin}
                product={completeProduct}
                index={idx}
                onUpdate={handleProductUpdate}
                onRefresh={handleProductRefresh}
                onConfirm={handleProductConfirm}
                isRefreshing={refreshingProducts.has(idx)}
                isUserProduct={state.analysisType === 'core6' && idx === 0}
              />
            );
          })}

          {/* Confirm All Button */}
          <Card className="bg-green-50 border-green-200">
            <CardContent className="pt-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-green-900 text-lg">
                      {state.products.length} products ready
                    </p>
                    <p className="text-green-700">
                      Review data above and confirm to continue to polls
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleConfirmAll}
                  size="lg"
                  className="bg-green-600 hover:bg-green-700"
                >
                  ✓ Confirm All & Continue to Polls
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }
    
    // Render original DataCollection component for manual entry
    return (
      <div className="space-y-6">
        {/* Method Selector */}
        <DataCollectionMethodSelector
          selectedMethod={collectionMethod}
          onMethodChange={setCollectionMethod}
        />
        
        {/* Manual Data Collection Form */}
        <DataCollection />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Method Selector */}
      <DataCollectionMethodSelector
        selectedMethod={collectionMethod}
        onMethodChange={setCollectionMethod}
      />

      {/* Bulk ASIN Input */}
      {!isFetching && fetchedProducts.length === 0 && (
        <BulkASINInput
          analysisType={state.analysisType!}
          onFetchStart={handleBulkFetch}
        />
      )}

      {/* Fetching Progress */}
      {isFetching && (
        <FetchingProgress products={fetchStatuses} />
      )}

      {/* Review Fetched Products */}
      {!isFetching && fetchedProducts.length > 0 && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-2xl">Review Fetched Products</CardTitle>
                  <CardDescription className="text-lg">
                    {fetchedProducts.length} products ready for review
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
              Review the auto-fetched data below. You can edit any field or refresh individual products.
            </p>
            
            {state.analysisType === 'core6' && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="text-green-800 font-medium">
                        Core 6 Analysis Configuration
                      </p>
                      <p className="text-green-700 text-sm mt-1">
                        The first product in the list below will be treated as &quot;Your Product&quot; in the analysis. 
                  The remaining products will be analyzed as competitors.
                </p>
                    </div>
                  </div>
              </div>
            )}
            </CardContent>
          </Card>

          {/* Product Display Cards */}
          {fetchedProducts.map((product, idx) => (
            <ProductDataDisplay
              key={product.asin}
              product={product}
              index={idx}
              onUpdate={handleProductUpdate}
              onRefresh={handleProductRefresh}
              onConfirm={handleProductConfirm}
              isRefreshing={refreshingProducts.has(idx)}
              isUserProduct={state.analysisType === 'core6' && idx === 0}
            />
          ))}

          {/* Confirm All Button */}
          <Card className="bg-green-50 border-green-200">
            <CardContent className="pt-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
              <div>
                    <p className="font-semibold text-green-900 text-lg">
                  {fetchedProducts.length} products ready
                </p>
                    <p className="text-green-700">
                  Review data above and confirm to continue to polls
                </p>
              </div>
                </div>
                <Button
                onClick={handleConfirmAll}
                  size="lg"
                  className="bg-green-600 hover:bg-green-700"
              >
                ✓ Confirm All & Continue to Polls
                </Button>
            </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

