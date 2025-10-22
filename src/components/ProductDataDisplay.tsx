'use client';

import { useState, useEffect } from 'react';
import { CompleteProductData } from '@/lib/types';
import EditableField from './EditableField';

// Helper function to convert base64 to blob URL
const base64ToBlobUrl = (base64: string, mimeType: string = 'image/jpeg'): string => {
  try {
    // Remove data URL prefix if present
    const base64Data = base64.replace(/^data:image\/[a-z]+;base64,/, '');
    
    // Convert base64 to binary
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Create blob and return URL
    const blob = new Blob([bytes], { type: mimeType });
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error('Failed to convert base64 to blob URL:', error);
    return base64; // Fallback to original base64
  }
};

interface ProductDataDisplayProps {
  product: CompleteProductData;
  index: number;
  onUpdate: (index: number, updates: Partial<CompleteProductData>) => void;
  onRefresh: (index: number) => void;
  onConfirm: (index: number) => void;
  isRefreshing?: boolean;
  isUserProduct?: boolean;
}

export default function ProductDataDisplay({
  product,
  index,
  onUpdate,
  onRefresh,
  onConfirm,
  isRefreshing = false,
  isUserProduct = false
}: ProductDataDisplayProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showAllImages, setShowAllImages] = useState(false);
  const [imageRenderKey, setImageRenderKey] = useState(0);

  // Handle removing main image
  const handleRemoveMainImage = () => {
    onUpdate(index, {
      images: {
        ...product.images,
        mainImage: null
      }
    });
  };

  // Handle removing additional image
  const handleRemoveAdditionalImage = (imageIndex: number) => {
    const updatedAdditionalImages = (product.images?.additionalImages || []).filter((_, idx) => idx !== imageIndex);
    onUpdate(index, {
      images: {
        ...product.images,
        additionalImages: updatedAdditionalImages
      }
    });
  };

  // Force re-render of images when product data changes to prevent caching issues
  useEffect(() => {
    setImageRenderKey(prev => prev + 1);
  }, [product.asin, product.images?.mainImage, product.images?.additionalImages]);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      // Cleanup any blob URLs that were created
      if (product.images?.mainImage && typeof (product.images.mainImage as any).base64 === 'string') {
        const mainSrc = (product.images.mainImage as any).base64;
        if (mainSrc.startsWith('data:')) {
          try {
            const blobUrl = base64ToBlobUrl(mainSrc);
            if (blobUrl.startsWith('blob:')) {
              URL.revokeObjectURL(blobUrl);
            }
          } catch {
            // Ignore cleanup errors
          }
        }
      }
      
      if (product.images?.additionalImages) {
        product.images.additionalImages.forEach((img: any) => {
          if (typeof img.base64 === 'string' && img.base64.startsWith('data:')) {
            try {
              const blobUrl = base64ToBlobUrl(img.base64);
              if (blobUrl.startsWith('blob:')) {
                URL.revokeObjectURL(blobUrl);
              }
            } catch {
              // Ignore cleanup errors
            }
          }
        });
      }
    };
  }, [product.images]);


  const hasErrors = product.validation.errors.length > 0;
  const hasWarnings = product.validation.warnings.length > 0;
  const status = hasErrors ? 'error' : hasWarnings ? 'warning' : 'success';

  return (
    <div className={`border-2 rounded-lg p-6 ${
      status === 'error' ? 'border-red-300 bg-red-50' :
      status === 'warning' ? 'border-yellow-300 bg-yellow-50' :
      'border-green-300 bg-green-50'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <h3 className="text-xl font-bold text-gray-900">
              {isUserProduct ? '🎯 Your Product' : `Competitor ${index}`}
            </h3>
            {isUserProduct && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-200 text-blue-800">
                👤 Your Product
              </span>
            )}
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
              status === 'error' ? 'bg-red-200 text-red-800' :
              status === 'warning' ? 'bg-yellow-200 text-yellow-800' :
              'bg-green-200 text-green-800'
            }`}>
              {status === 'error' ? '❌ Needs Fix' : status === 'warning' ? '⚠️ Needs Review' : '✅ Complete'}
            </span>
          </div>
          <p className="text-sm text-gray-600 font-mono">ASIN: {product.asin}</p>
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {isEditing ? 'Done Editing' : 'Edit'}
          </button>
          <button
            onClick={() => onRefresh(index)}
            disabled={isRefreshing}
            className={`px-3 py-1 text-sm rounded transition-colors ${
              isRefreshing 
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                : 'bg-gray-600 text-white hover:bg-gray-700'
            }`}
            title={isRefreshing ? "Refreshing data..." : "Refresh data from Amazon"}
          >
            <svg 
              className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} 
              fill="none" 
              viewBox="0 0 24 24"
            >
              <circle 
                className="opacity-25" 
                cx="12" 
                cy="12" 
                r="10" 
                stroke="currentColor" 
                strokeWidth="4"
              />
              <path 
                className="opacity-75" 
                fill="currentColor" 
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Product Name */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Product Name
        </label>
        {isEditing ? (
          <input
            type="text"
            value={product.name}
            onChange={(e) => onUpdate(index, { name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          />
        ) : (
          <p className="text-gray-900 font-semibold">{product.name}</p>
        )}
      </div>

      {/* Data Fields Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <EditableField
          label="Price"
          value={`$${(product.price || 0).toFixed(2)}`}
          isEditing={isEditing}
          onEdit={(val) => onUpdate(index, { price: parseFloat(val.replace('$', '')) })}
          type="text"
        />
        
        <EditableField
          label="Shipping"
          value={`${product.shippingDays || 0} days`}
          isEditing={isEditing}
          onEdit={(val) => onUpdate(index, { shippingDays: parseInt(val) })}
          type="number"
        />
        
        <EditableField
          label="Reviews"
          value={(product.reviewCount || 0).toLocaleString()}
          isEditing={isEditing}
          onEdit={(val) => onUpdate(index, { reviewCount: parseInt(val.replace(/,/g, '')) })}
          type="number"
        />
        
        <EditableField
          label="Rating"
          value={(product.rating || 0).toFixed(1)}
          isEditing={isEditing}
          onEdit={(val) => onUpdate(index, { rating: parseFloat(val) })}
          type="number"
          step="0.1"
        />
      </div>

      {/* Images Section */}
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Images</h4>
        <div className="flex items-start space-x-4">
          {/* Main Image */}
          <div className="flex-shrink-0">
            <p className="text-xs text-gray-600 mb-1">Main Image</p>
            {product.images?.mainImage ? (() => {
              const uniqueKey = `${product.asin}-main-${imageRenderKey}`;
              const imageData = product.images.mainImage as any;
              
              // Use blob URL if available, otherwise convert base64
              const finalSrc = imageData.url || (imageData.base64 ? 
                (imageData.base64.startsWith('data:') ? 
                  base64ToBlobUrl(imageData.base64, imageData.type || 'image/jpeg') : 
                  imageData.base64) : '');
              
              
              return (
                <div className="relative group">
                  <img
                    key={uniqueKey}
                    src={finalSrc}
                    alt="Main product"
                    className="w-24 h-24 object-cover rounded-lg border-2 border-gray-300"
                    onLoad={() => {
                      // Image loaded successfully
                    }}
                    onError={(e) => {
                      console.error(`[ProductDataDisplay] Main image failed to load for product ${index}:`, e);
                    }}
                  />
                  {/* Remove button overlay */}
                  <button
                    onClick={handleRemoveMainImage}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100 shadow-lg"
                    title="Remove main image"
                  >
                    ×
                  </button>
                </div>
              );
            })() : (
              <div className="w-24 h-24 bg-gray-200 rounded-lg flex items-center justify-center">
                <span className="text-gray-400 text-xs">No Image</span>
              </div>
            )}
          </div>

          {/* Additional Images */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-gray-600">
                Additional Images ({(product.images?.additionalImages || []).length})
              </p>
              {(product.images?.additionalImages || []).length > 4 && (
                <button
                  onClick={() => setShowAllImages(!showAllImages)}
                  className="text-xs text-blue-600 hover:underline"
                >
                  {showAllImages ? 'Show Less' : 'Show All'}
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {(showAllImages 
                ? (product.images?.additionalImages || [])
                : (product.images?.additionalImages || []).slice(0, 4)
              ).map((img: any, idx) => {
                // Create unique key to prevent browser caching issues
                const uniqueKey = `${product.asin}-additional-${idx}-${imageRenderKey}`;
                
                // Use blob URL if available, otherwise convert base64
                const finalSrc = img.url || (img.base64 ? 
                  (img.base64.startsWith('data:') ? 
                    base64ToBlobUrl(img.base64, img.type || 'image/jpeg') : 
                    img.base64) : '');
                
                
                return (
                  <div key={uniqueKey} className="relative group">
                    <img
                      src={finalSrc}
                      alt={`Product ${idx + 1}`}
                      className="w-16 h-16 object-cover rounded border border-gray-300"
                      onLoad={(e) => {
                        const img = e.target as HTMLImageElement;
                        
                        // Check if this image is identical to the main image
                        const mainImg = document.querySelector(`img[alt="Main product"]`) as HTMLImageElement;
                        if (mainImg && mainImg.complete) {
                          const isIdentical = img.naturalWidth === mainImg.naturalWidth && 
                                            img.naturalHeight === mainImg.naturalHeight &&
                                            img.src !== mainImg.src;
                          if (isIdentical) {
                          }
                        }
                      }}
                      onError={(e) => {
                        console.error(`[ProductDataDisplay] Additional image ${idx} failed to load for product ${index}:`, e);
                      }}
                    />
                    {/* Remove button overlay */}
                    <button
                      onClick={() => handleRemoveAdditionalImage(idx)}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100 shadow-md"
                      title="Remove image"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
              {!showAllImages && product.images.additionalImages.length > 4 && (
                <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
                  <span className="text-xs text-gray-600">+{product.images.additionalImages.length - 4}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="mb-4">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Features & Functionality
        </label>
        {isEditing ? (
          <textarea
            value={product.features}
            onChange={(e) => onUpdate(index, { features: e.target.value })}
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 font-mono text-sm"
          />
        ) : (
          <div className="bg-white border border-gray-200 rounded-md p-3">
            <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans">
              {product.features}
            </pre>
          </div>
        )}
      </div>

      {/* Validation Messages */}
      {(hasErrors || hasWarnings) && (
        <div className="mb-4 space-y-2">
          {hasErrors && (
            <div className="bg-red-100 border border-red-300 rounded-lg p-3">
              <h4 className="font-semibold text-red-800 text-sm mb-1">
                ❌ Errors (must fix before continuing):
              </h4>
              <ul className="text-sm text-red-700 list-disc list-inside">
                {product.validation.errors.map((error, idx) => (
                  <li key={idx}>{error}</li>
                ))}
              </ul>
            </div>
          )}
          
          {hasWarnings && (
            <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-3">
              <h4 className="font-semibold text-yellow-800 text-sm mb-1">
                ⚠️ Warnings (can continue with defaults):
              </h4>
              <ul className="text-sm text-yellow-700 list-disc list-inside">
                {product.validation.warnings.map((warning, idx) => (
                  <li key={idx}>{warning}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Confirm Button */}
      <div className="flex justify-end">
        <button
          onClick={() => onConfirm(index)}
          disabled={hasErrors}
          className={`px-6 py-3 rounded-lg font-medium ${
            hasErrors
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          ✓ Confirm Data
        </button>
      </div>
    </div>
  );
}

