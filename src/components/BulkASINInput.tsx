'use client';

import { useState } from 'react';
import { parseBulkASINs, validateBulkASINs } from '@/lib/product-fetcher';
import { useToast } from '@/contexts/ToastContext';

interface BulkASINInputProps {
  analysisType: 'core5' | 'core6';
  onFetchStart: (asins: string[]) => void;
}

export default function BulkASINInput({ analysisType, onFetchStart }: BulkASINInputProps) {
  const { addToast } = useToast();
  const [bulkText, setBulkText] = useState('');
  const [validationResult, setValidationResult] = useState<{
    valid: string[];
    invalid: string[];
  } | null>(null);

  const expectedCount = analysisType === 'core6' ? 6 : 5;
  
  const handleValidate = () => {
    const parsed = parseBulkASINs(bulkText);
    const result = validateBulkASINs(parsed);
    setValidationResult(result);
  };

  const handleFetch = () => {
    if (!validationResult || validationResult.valid.length === 0) {
      addToast({
        title: 'No ASINs Entered',
        description: 'Please enter and validate ASINs first.',
        variant: 'destructive'
      });
      return;
    }
    
    if (validationResult.valid.length !== expectedCount) {
      addToast({
        title: 'ASIN Count Mismatch',
        description: `Expected ${expectedCount} ASINs but found ${validationResult.valid.length} valid ASINs. Proceeding with available ASINs.`,
        variant: 'destructive'
      });
    }
    
    onFetchStart(validationResult.valid);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">
        Enter ASINs for {analysisType === 'core6' ? 'Your Product + 5 Competitors' : '5 Competitors'}
      </h2>

      {analysisType === 'core6' && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">
            🎯 Important for Core 6 Analysis:
          </h3>
          <p className="text-blue-800 text-sm leading-relaxed">
            <strong>Put YOUR product ASIN as the FIRST one in the list.</strong> This tells the system which product is yours for comparison. 
            The remaining 5 ASINs will be treated as competitors.
          </p>
          <p className="text-blue-700 text-sm mt-2">
            Example: If your product is B08ABC123X, enter it first:
            <br />
            <code className="bg-blue-100 px-2 py-1 rounded text-xs">B08ABC123X</code> (Your Product)
            <br />
            <code className="bg-gray-100 px-2 py-1 rounded text-xs">B08XYZ789Y</code> (Competitor 1)
            <br />
            <code className="bg-gray-100 px-2 py-1 rounded text-xs">B08DEF456Z</code> (Competitor 2)
            <br />
            ... and so on
          </p>
        </div>
      )}

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Enter ASINs (one per line or comma-separated) *
        </label>
        <textarea
          value={bulkText}
          onChange={(e) => {
            setBulkText(e.target.value);
            setValidationResult(null);
          }}
          rows={8}
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
          placeholder={analysisType === 'core6' 
            ? `YOUR_PRODUCT_ASIN (First - Your Product)
B08XYZ789Y (Competitor 1)
B08DEF456Z (Competitor 2)
B08GHI789A (Competitor 3)
B08JKL123B (Competitor 4)
B08MNO456C (Competitor 5)

Expected: ${expectedCount} ASINs`
            : `B08WM3LMJF, B0731Y59HG, B098FKXT8L
Or one per line:
B08WM3LMJF
B0731Y59HG
B098FKXT8L

Expected: ${expectedCount} ASINs`}
        />
        <p className="text-sm text-gray-500 mt-2">
          💡 Tip: Copy ASINs from Amazon Seller Central or product URLs
        </p>
      </div>

      {/* Validation Results */}
      {validationResult && (
        <div className="mb-4">
          {validationResult.valid.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-3">
              <h4 className="font-semibold text-green-800 mb-2">
                ✅ Valid ASINs ({validationResult.valid.length}):
              </h4>
              <div className="flex flex-wrap gap-2">
                {validationResult.valid.map((asin) => (
                  <span
                    key={asin}
                    className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-mono"
                  >
                    {asin}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {validationResult.invalid.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-semibold text-red-800 mb-2">
                ❌ Invalid ASINs ({validationResult.invalid.length}):
              </h4>
              <div className="flex flex-wrap gap-2">
                {validationResult.invalid.map((asin) => (
                  <span
                    key={asin}
                    className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-mono line-through"
                  >
                    {asin}
                  </span>
                ))}
              </div>
              <p className="text-sm text-red-700 mt-2">
                ASINs must be exactly 10 alphanumeric characters (A-Z, 0-9)
              </p>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleValidate}
          disabled={!bulkText.trim()}
          className={`flex-1 px-6 py-3 rounded-lg font-medium ${
            bulkText.trim()
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          Validate ASINs
        </button>
        
        <button
          onClick={handleFetch}
          disabled={!validationResult || validationResult.valid.length === 0}
          className={`flex-1 px-6 py-3 rounded-lg font-medium ${
            validationResult && validationResult.valid.length > 0
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          🚀 Fetch All Data ({validationResult?.valid.length || 0} API calls)
        </button>
      </div>

      {/* Expected Count Warning */}
      {validationResult && validationResult.valid.length !== expectedCount && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            ⚠️ Expected {expectedCount} ASINs for {analysisType.toUpperCase()}, but found {validationResult.valid.length} valid ASINs
          </p>
        </div>
      )}
    </div>
  );
}

