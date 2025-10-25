'use client';

import { useState, useRef, useEffect } from 'react';
import { useAnalysis, getCurrentProductType, getTotalProducts } from '@/contexts/AnalysisContext';
import { generateId, convertToBase64WithMediaType, validateASIN, validatePrice, validateRating, validateReviewCount } from '@/lib/utils';
import { Product, CompleteProductData, ProcessedImages, ValidationResult } from '@/lib/types';
import { useToast } from '@/contexts/ToastContext';
import { ImageProcessor, ImageData } from '@/lib/image-processor';

export default function DataCollection() {
  const { state, dispatch } = useAnalysis();
  const { addToast } = useToast();
  
  // Initialize ImageProcessor for manual entry
  const imageProcessor = useRef<ImageProcessor>(new ImageProcessor());
  
  // Cleanup ImageProcessor on unmount
  useEffect(() => {
    return () => {
      imageProcessor.current.cleanup();
    };
  }, []);
  
  const [currentData, setCurrentData] = useState<Partial<Product>>({
    id: generateId(),
    asin: '',
    name: '',
    price: 0,
    shippingDays: 0,
    reviewCount: 0,
    rating: 0,
    mainImage: '',
    additionalImages: [],
    features: '',
  });
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const [ocrResults, setOcrResults] = useState<{
    price: number;
    shippingDays: number;
    reviews: number;
    rating: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentProductType = getCurrentProductType(state);
  const totalProducts = getTotalProducts(state);
  const currentIndex = state.currentProductIndex;

  const handleASINChange = (value: string) => {
    setCurrentData(prev => ({ ...prev, asin: value.toUpperCase() }));
  };

  const handleScreenshotUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessingOCR(true);
    try {
      const { base64, mediaType } = await convertToBase64WithMediaType(file);
      
      // Call OCR API
      const response = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, mediaType })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'OCR failed');
      }

      const ocrData = await response.json();
      setOcrResults(ocrData);
      
      // Auto-populate form with OCR results
      setCurrentData(prev => ({
        ...prev,
        price: ocrData.price,
        shippingDays: ocrData.shippingDays,
        reviewCount: ocrData.reviews,
        rating: ocrData.rating,
      }));
    } catch (error: any) {
      console.error('OCR failed:', error);
      // Show the specific error message from the API
      const errorMessage = error.message || 'OCR extraction failed. Please enter data manually.';
      addToast({
        title: 'OCR Failed',
        description: `${errorMessage}. You can continue by entering the product information manually.`,
        variant: 'destructive'
      });
    } finally {
      setIsProcessingOCR(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'main' | 'additional') => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    try {
      // Convert files to base64 first (with compression)
      const imageData = await Promise.all(files.map(convertToBase64WithMediaType));
      
      // Create temporary URLs for ImageProcessor (it expects URLs, not base64)
      const tempUrls: string[] = [];
      const tempBlobs: Blob[] = [];
      
      for (const img of imageData) {
        // Convert base64 to Blob
        const byteString = atob(img.base64);
        const arrayBuffer = new ArrayBuffer(byteString.length);
        const uint8Array = new Uint8Array(arrayBuffer);
        for (let i = 0; i < byteString.length; i++) {
          uint8Array[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([arrayBuffer], { type: img.mediaType });
        tempBlobs.push(blob);
        
        // Create object URL
        const objectUrl = URL.createObjectURL(blob);
        tempUrls.push(objectUrl);
      }
      
      // Process images through ImageProcessor for caching and deduplication
      const processedImages = await imageProcessor.current.processProductImages(tempUrls);
      
      // Clean up temporary URLs
      tempUrls.forEach(url => URL.revokeObjectURL(url));
      
      if (type === 'main') {
        if (processedImages.mainImage) {
          try {
            // Convert back to base64 for storage
            const base64 = await imageProcessor.current.blobToBase64(processedImages.mainImage.blob);
            const base64String = base64.split(',')[1]; // Remove data URL prefix
            
            setCurrentData(prev => ({ 
              ...prev, 
              mainImage: {
                base64: base64String,
                mediaType: processedImages.mainImage!.type
              }
            }));
          } catch (error) {
            console.error('[Manual Entry] Failed to process main image:', error);
            addToast({
              title: 'Main Image Error',
              description: 'Failed to process main image. Please try again.',
              variant: 'destructive'
            });
          }
        }
      } else {
        // For additional images, process each uploaded file directly
        const existingCount = currentData.additionalImages?.length || 0;
        const availableSlots = 8 - existingCount;
        const maxNewImages = Math.min(files.length, availableSlots);
        
        // Process each file directly without ImageProcessor's product logic
        const base64Images = await Promise.all(
          imageData.slice(0, maxNewImages).map(async (img, idx) => {
            try {
              return {
                base64: img.base64,
                mediaType: img.mediaType
              };
            } catch (error) {
              console.error(`Failed to process additional image ${idx + 1}:`, error);
              return null;
            }
          })
        );
        
        // Filter out failed images
        const validImages = base64Images.filter(img => img !== null);
        
        setCurrentData(prev => ({
          ...prev,
          additionalImages: [
            ...(prev.additionalImages || []),
            ...validImages
          ]
        }));
      }
      
      // Show success message
      addToast({
        title: `Images processed successfully`,
        description: `Successfully uploaded ${files.length} image${files.length > 1 ? 's' : ''}`,
        variant: 'success'
      });
      
    } catch (error) {
      console.error('Error processing images:', error);
      addToast({ 
        title: 'Failed to process images', 
        variant: 'destructive' 
      });
    }
  };

  const validateForm = (): boolean => {
    const validation = {
      asin: !!(currentData.asin && validateASIN(currentData.asin)),
      name: !!currentData.name,
      price: !!(currentData.price && validatePrice(currentData.price)),
      shipping: (currentData.shippingDays ?? 0) >= 0,
      reviewCount: (currentData.reviewCount ?? 0) >= 0 && validateReviewCount(currentData.reviewCount ?? 0),
      rating: (currentData.rating ?? 0) >= 0 && validateRating(currentData.rating ?? 0),
      mainImage: !!(currentData.mainImage && (typeof currentData.mainImage === 'string' || (currentData.mainImage && typeof currentData.mainImage === 'object' && currentData.mainImage.base64))),
      features: !!(currentData.features && currentData.features.length >= 100)
    };
    
    
    return Object.values(validation).every(v => v === true);
  };

  // Create CompleteProductData for manual entry (same as automatic fetch)
  const createCompleteProductData = async (): Promise<CompleteProductData> => {
    // Create ProcessedImages from current data
    const processedImages: ProcessedImages = {
      mainImage: null,
      additionalImages: []
    };

    // Process main image if exists
    if (currentData.mainImage && typeof currentData.mainImage === 'object' && currentData.mainImage.base64) {
      try {
        // Convert base64 to Blob
        const base64Data = currentData.mainImage.base64;
        const byteString = atob(base64Data);
        const arrayBuffer = new ArrayBuffer(byteString.length);
        const uint8Array = new Uint8Array(arrayBuffer);
        for (let i = 0; i < byteString.length; i++) {
          uint8Array[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([arrayBuffer], { type: currentData.mainImage.mediaType });
        const objectUrl = URL.createObjectURL(blob);
        
        processedImages.mainImage = {
          blob,
          url: objectUrl,
          originalUrl: objectUrl,
          size: blob.size,
          type: currentData.mainImage.mediaType,
          base64: currentData.mainImage.base64
        };
      } catch (error) {
        console.error('Failed to process main image:', error);
      }
    }

    // Process additional images
    if (currentData.additionalImages && currentData.additionalImages.length > 0) {
      for (const img of currentData.additionalImages) {
        if (typeof img === 'object' && img.base64) {
          try {
            const base64Data = img.base64;
            const byteString = atob(base64Data);
            const arrayBuffer = new ArrayBuffer(byteString.length);
            const uint8Array = new Uint8Array(arrayBuffer);
            for (let i = 0; i < byteString.length; i++) {
              uint8Array[i] = byteString.charCodeAt(i);
            }
            const blob = new Blob([arrayBuffer], { type: img.mediaType });
            const objectUrl = URL.createObjectURL(blob);
            
            processedImages.additionalImages.push({
              blob,
              url: objectUrl,
              originalUrl: objectUrl,
              size: blob.size,
              type: img.mediaType,
              base64: img.base64
            });
          } catch (error) {
            console.error('Failed to process additional image:', error);
          }
        }
      }
    }

    // Create validation result (same as automatic fetch)
    const validation: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      data: currentData
    };

    // Create CompleteProductData (same structure as automatic fetch)
    const completeData: CompleteProductData = {
      asin: currentData.asin || '',
      name: currentData.name || '',
      price: currentData.price || 0,
      originalPrice: null,
      shippingDays: currentData.shippingDays || 0,
      reviewCount: currentData.reviewCount || 0,
      rating: currentData.rating || 0,
      images: processedImages,
      features: currentData.features || '',
      validation: validation,
      rawResponse: null
    };

    return completeData;
  };

  // Convert CompleteProductData to Product (same as automatic fetch)
  const convertToProduct = (completeData: CompleteProductData): Product => {
    // Extract base64 from ImageData objects (same as automatic fetch)
    const mainImage = completeData.images?.mainImage?.base64 || '';
    const additionalImages = completeData.images?.additionalImages?.map(img => 
      img.base64 || ''
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
      isUserProduct: state.analysisType === 'core6' && currentIndex === 0
    };
  };

  const handleSaveAndContinue = async () => {
    if (!validateForm()) {
      // Provide specific feedback about what's missing
      const missingFields = [];
      if (!currentData.asin || !validateASIN(currentData.asin)) missingFields.push('Valid ASIN');
      if (!currentData.name) missingFields.push('Product Name');
      if (!currentData.price || !validatePrice(currentData.price)) missingFields.push('Valid Price');
      if ((currentData.shippingDays ?? 0) < 0) missingFields.push('Shipping Days');
      if ((currentData.reviewCount ?? 0) < 0 || !validateReviewCount(currentData.reviewCount ?? 0)) missingFields.push('Valid Review Count');
      if ((currentData.rating ?? 0) < 0 || !validateRating(currentData.rating ?? 0)) missingFields.push('Valid Rating');
      if (!currentData.mainImage || (typeof currentData.mainImage === 'object' && !currentData.mainImage.base64)) missingFields.push('Main Product Image');
      if (!currentData.features || currentData.features.length < 100) missingFields.push('Features (minimum 100 characters)');
      
      addToast({
        title: 'Missing Information',
        description: `Please complete: ${missingFields.join(', ')}`,
        variant: 'destructive'
      });
      return;
    }

    try {
      // Create CompleteProductData (same as automatic fetch)
      const completeData = await createCompleteProductData();
      
      // Convert to Product format (same as automatic fetch)
      const product = convertToProduct(completeData);
      
      // Store in state (same as automatic fetch)
      dispatch({ type: 'ADD_PRODUCT', payload: product });
    } catch (error) {
      console.error('Failed to save product:', error);
      addToast({
        title: 'Save Failed',
        description: 'Failed to save product data. Please try again.',
        variant: 'destructive'
      });
      return;
    }

    // Check if this is the last product (after adding the product)
    const nextIndex = currentIndex + 1;
    const isLastProductAfterAdd = nextIndex >= totalProducts;
    
    if (isLastProductAfterAdd) {
      // All products collected, the main page logic will show the review screen
      // No need to navigate - the page will re-render and show DataCollectionEnhanced
    } else {
      // Reset form for next product (currentProductIndex is already incremented by ADD_PRODUCT)
      setCurrentData({
        id: generateId(),
        asin: '',
        name: '',
        price: 0,
        shippingDays: 0,
        reviewCount: 0,
        rating: 0,
        mainImage: '',
        additionalImages: [],
        features: '',
      });
      setOcrResults(null);
    }
  };

  const isLastProduct = currentIndex >= totalProducts - 1;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Product {currentIndex + 1} of {totalProducts}
          </h2>
          <p className="text-lg text-blue-600 font-medium">
            {currentProductType}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Basic Info */}
          <div className="space-y-6">
            {/* ASIN */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ASIN *
              </label>
              <input
                type="text"
                value={currentData.asin}
                onChange={(e) => handleASINChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="B08N5WRWNW"
                maxLength={10}
              />
            </div>

            {/* Product Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Name *
              </label>
              <input
                type="text"
                value={currentData.name}
                onChange={(e) => setCurrentData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter product name"
              />
            </div>

            {/* Screenshot Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amazon Screenshot *
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleScreenshotUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessingOCR}
                  className={`font-medium ${isProcessingOCR ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600 hover:text-blue-500'}`}
                >
                  {isProcessingOCR ? 'Processing...' : 'Upload Screenshot'}
                </button>
                <p className="text-sm text-gray-500 mt-2">
                  Upload a screenshot of the Amazon product page
                </p>
                
                {/* Processing Status */}
                {isProcessingOCR && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-md">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin h-4 w-4 border-2 border-blue-600 rounded-full border-t-transparent"></div>
                      <span className="text-sm text-blue-700 font-medium">
                        Extracting data from screenshot...
                      </span>
                    </div>
                    <p className="text-xs text-blue-600 mt-2">
                      Auto-retrying on failures with exponential backoff
                    </p>
                  </div>
                )}

                {/* OCR Results */}
                {ocrResults && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm font-medium text-green-800">OCR Success!</span>
                    </div>
                    <p className="text-sm text-green-700">
                      Extracted: Price ${ocrResults.price}, Shipping {ocrResults.shippingDays} days, 
                      {ocrResults.reviews} reviews, {ocrResults.rating} stars
                    </p>
                  </div>
                )}
              </div>
            </div>


            {/* Manual Entry Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price ($) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={currentData.price || ''}
                  onChange={(e) => setCurrentData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Shipping (days) *
                </label>
                <input
                  type="number"
                  value={currentData.shippingDays || ''}
                  onChange={(e) => setCurrentData(prev => ({ ...prev, shippingDays: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Review Count *
                </label>
                <input
                  type="number"
                  value={currentData.reviewCount || ''}
                  onChange={(e) => setCurrentData(prev => ({ ...prev, reviewCount: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rating (0-5) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="5"
                  value={currentData.rating || ''}
                  onChange={(e) => setCurrentData(prev => ({ ...prev, rating: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.0"
                />
              </div>
            </div>
          </div>

          {/* Right Column - Images and Features */}
          <div className="space-y-6">
            {/* Main Image */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Main Product Image *
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload(e, 'main')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              
              {/* Display main image preview */}
              {currentData.mainImage && (
                <div className="mt-2">
                  <div className="relative inline-block group">
                    {(() => {
                      // Get the image source - handle both string and object formats
                      const imageSrc = typeof currentData.mainImage === 'string' 
                        ? currentData.mainImage 
                        : (currentData.mainImage.base64 ? `data:${currentData.mainImage.mediaType};base64,${currentData.mainImage.base64}` : '');
                      
                      return (
                        <img
                          src={imageSrc}
                          alt="Main product"
                          className="w-32 h-32 object-cover rounded border border-gray-300"
                          onError={(e) => {
                            console.error('Failed to load main image:', imageSrc.substring(0, 50));
                          }}
                        />
                      );
                    })()}
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentData(prev => ({ ...prev, mainImage: '' }));
                      }}
                      className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ×
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Additional Images */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Images (up to 8)
                {currentData.additionalImages && currentData.additionalImages.length > 0 && (
                  <span className="ml-2 text-blue-600">
                    ({currentData.additionalImages.length}/8)
                  </span>
                )}
              </label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handleImageUpload(e, 'additional')}
                disabled={currentData.additionalImages && currentData.additionalImages.length >= 8}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              {currentData.additionalImages && currentData.additionalImages.length >= 8 && (
                <p className="text-sm text-gray-500 mt-1">
                  Maximum of 8 images reached
                </p>
              )}
              
              {/* Display uploaded images */}
              {currentData.additionalImages && currentData.additionalImages.length > 0 && (
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {currentData.additionalImages.map((img, idx) => {
                    // Get the image source - handle both string and object formats
                    const imageSrc = typeof img === 'string' 
                      ? img 
                      : (img.base64 ? `data:${img.mediaType};base64,${img.base64}` : '');
                    
                    return (
                      <div key={idx} className="relative group">
                        <img
                          src={imageSrc}
                          alt={`Additional ${idx + 1}`}
                          className="w-full h-20 object-cover rounded border border-gray-300"
                          onError={(e) => {
                            console.error(`Failed to load additional image ${idx + 1}:`, imageSrc.substring(0, 50));
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setCurrentData(prev => ({
                              ...prev,
                              additionalImages: prev.additionalImages?.filter((_, i) => i !== idx) || []
                            }));
                          }}
                          className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Features Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Features & Functionality * (min 100 characters)
              </label>
              <textarea
                value={currentData.features || ''}
                onChange={(e) => setCurrentData(prev => ({ ...prev, features: e.target.value }))}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe the product's key features, benefits, and functionality..."
              />
              <p className="text-sm text-gray-500 mt-1">
                {currentData.features?.length || 0}/100 characters minimum
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex justify-end">
          <button
            onClick={handleSaveAndContinue}
            disabled={!validateForm()}
            className={`px-6 py-3 rounded-lg font-medium ${
              validateForm()
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isLastProduct ? 'Complete Data Collection' : 'Save & Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
