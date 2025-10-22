export interface Product {
  id: string;
  asin: string;
  name: string;
  price: number;
  shippingDays: number;
  reviewCount: number;
  rating: number;
  mainImage: string | { base64: string; mediaType: string };
  additionalImages: (string | { base64: string; mediaType: string })[];
  features: string;
  isUserProduct?: boolean;
  category?: string; // Product category for Word reports
}

export interface PollResult {
  type: 'main_image' | 'image_stack' | 'features';
  demographic: string;
  question: string;
  rankings: {
    productId: string;
    rank: number;
    percentage: number;
  }[];
  sampleResponses: string[];
}

export interface ScoreCalculation {
  productId: string;
  priceScore: number;
  shippingScore: number;
  reviewScore: number;
  ratingScore: number;
  mainImageScore: number;
  imageStackScore: number;
  featuresScore: number;
  totalScore: number;
}

export interface Analysis {
  id: string;
  type: 'core5' | 'core6';
  createdAt: Date;
  products: Product[];
  pollResults: {
    mainImage: PollResult | null;
    imageStack: PollResult | null;
    features: PollResult | null;
  };
  calculations: ScoreCalculation[];
}

export interface AppState {
  analysisType: 'core5' | 'core6' | null;
  currentStep: 1 | 2 | 3 | 4 | 5;
  products: Product[];
  polls: {
    mainImage: PollResult | null;
    imageStack: PollResult | null;
    features: PollResult | null;
  };
  calculations: ScoreCalculation[] | null;
  canProceed: boolean;
  currentProductIndex: number;
  collectionMethod?: DataCollectionMethod; // How to collect data
  preparedBy?: string; // "Prepared by" field for Word reports
  productCategory?: string; // Product category for Word reports
}

export interface OCRExtraction {
  price: number;
  shippingDate: string;
  shippingDays: number;
  reviews: number;
  rating: number;
}

export interface PollRequest {
  products: Product[];
  demographic: string;
  question: string;
  pollType: 'main_image' | 'image_stack' | 'features';
}

// ==========================================
// ScrapeOps & Data Collection Types
// ==========================================

/**
 * Data collection method
 */
export type DataCollectionMethod = 'automatic' | 'manual' | 'hybrid';

/**
 * Fetching status for UI display
 */
export type FetchStatus = 'pending' | 'fetching' | 'success' | 'needs_review' | 'failed';

/**
 * Scraped product data from ScrapeOps API
 * (Note: This is re-exported from scraper.ts for convenience)
 */
export interface ScrapedProductData {
  asin: string;
  name: string;
  price: number;
  originalPrice?: number | null;
  shippingDays: number;
  reviewCount: number;
  rating: number;
  imageUrls: string[];
  features: string;
  rawResponse?: any;
}

/**
 * Image data with Blob
 */
export interface ImageData {
  blob: Blob;
  url: string; // Object URL
  originalUrl: string;
  size: number;
  type: string;
  base64?: string; // Base64 data for manual entry
}

/**
 * Processed images
 */
export interface ProcessedImages {
  mainImage: ImageData | null;
  additionalImages: ImageData[];
}

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  data: any;
}

/**
 * Complete product data after fetching and processing
 */
export interface CompleteProductData {
  asin: string;
  name: string;
  price: number;
  originalPrice?: number | null;
  shippingDays: number;
  reviewCount: number;
  rating: number;
  images: ProcessedImages;
  features: string;
  validation: ValidationResult;
  rawResponse?: any;
}

/**
 * Product fetch result
 */
export interface ProductFetchResult {
  asin: string;
  status: FetchStatus;
  data?: CompleteProductData;
  error?: string;
}

/**
 * Bulk fetch result
 */
export interface BulkFetchResult {
  results: ProductFetchResult[];
  successCount: number;
  failedCount: number;
  needsReviewCount: number;
}
