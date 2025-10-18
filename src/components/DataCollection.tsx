'use client';

import { useState, useRef } from 'react';
import { useAnalysis, getCurrentProductType, getTotalProducts } from '@/contexts/AnalysisContext';
import { generateId, convertToBase64WithMediaType, validateASIN, validatePrice, validateRating, validateReviewCount } from '@/lib/utils';
import { Product } from '@/lib/types';
import { useToast } from '@/contexts/ToastContext';

export default function DataCollection() {
  const { state, dispatch } = useAnalysis();
  const { addToast } = useToast();
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

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>, type: 'main' | 'additional') => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    Promise.all(files.map(convertToBase64WithMediaType)).then(imageData => {
      if (type === 'main') {
        setCurrentData(prev => ({ 
          ...prev, 
          mainImage: {
            base64: imageData[0].base64,
            mediaType: imageData[0].mediaType
          }
        }));
      } else {
        setCurrentData(prev => ({ 
          ...prev, 
          additionalImages: [
            ...(prev.additionalImages || []), 
            ...imageData.map(img => ({
              base64: img.base64,
              mediaType: img.mediaType
            }))
          ]
        }));
      }
    });
  };

  const validateForm = (): boolean => {
    return !!(
      currentData.asin && validateASIN(currentData.asin) &&
      currentData.name &&
      currentData.price && validatePrice(currentData.price) &&
      (currentData.shippingDays ?? 0) >= 0 &&
      (currentData.reviewCount ?? 0) >= 0 && validateReviewCount(currentData.reviewCount ?? 0) &&
      (currentData.rating ?? 0) >= 0 && validateRating(currentData.rating ?? 0) &&
      currentData.mainImage && (typeof currentData.mainImage === 'string' || (currentData.mainImage && typeof currentData.mainImage === 'object' && currentData.mainImage.base64)) &&
      currentData.features && currentData.features.length >= 100
    );
  };

  const handleSaveAndContinue = () => {
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

    const product: Product = {
      ...currentData,
      isUserProduct: state.analysisType === 'core6' && currentIndex === 0,
    } as Product;

    dispatch({ type: 'ADD_PRODUCT', payload: product });

    // Reset form for next product
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
            </div>

            {/* Additional Images */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Images (up to 8)
              </label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handleImageUpload(e, 'additional')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
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
