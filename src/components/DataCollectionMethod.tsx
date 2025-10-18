'use client';

import { DataCollectionMethod } from '@/lib/types';

interface DataCollectionMethodProps {
  selectedMethod: DataCollectionMethod;
  onMethodChange: (method: DataCollectionMethod) => void;
}

export default function DataCollectionMethodSelector({
  selectedMethod,
  onMethodChange
}: DataCollectionMethodProps) {
  
  const methods: { value: DataCollectionMethod; icon: string; title: string; description: string }[] = [
    {
      value: 'automatic',
      icon: '🚀',
      title: 'Automatic (Recommended)',
      description: 'Enter ASINs and we\'ll fetch all data from Amazon automatically. Fastest method (~10 seconds).'
    },
    {
      value: 'manual',
      icon: '📝',
      title: 'Manual Entry',
      description: 'Upload screenshots and enter data manually. Use when auto-fetch fails or for custom data.'
    },
    {
      value: 'hybrid',
      icon: '🔄',
      title: 'Hybrid Mode',
      description: 'Auto-fetch with manual overrides. Best of both worlds - automatic speed with manual control.'
    }
  ];

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">
        How would you like to collect product data?
      </h2>

      <div className="space-y-3">
        {methods.map((method) => (
          <label
            key={method.value}
            className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${
              selectedMethod === method.value
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <input
              type="radio"
              name="collectionMethod"
              value={method.value}
              checked={selectedMethod === method.value}
              onChange={() => onMethodChange(method.value)}
              className="mt-1 h-5 w-5 text-blue-600 focus:ring-blue-500"
            />
            <div className="ml-4 flex-1">
              <div className="flex items-center space-x-2">
                <span className="text-2xl">{method.icon}</span>
                <p className="font-semibold text-gray-900">{method.title}</p>
              </div>
              <p className="text-sm text-gray-600 mt-1">{method.description}</p>
              
              {/* Recommended Badge */}
              {method.value === 'automatic' && (
                <span className="inline-block mt-2 px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">
                  ⚡ 30x Faster
                </span>
              )}
            </div>
          </label>
        ))}
      </div>

      {/* Info Box */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>💡 Pro Tip:</strong> Use Automatic mode for speed. The system will validate all data and let you review/edit before continuing to polls.
        </p>
      </div>
    </div>
  );
}

