/**
 * Amazon Product Fetcher - Main Orchestrator
 * Combines scraper, image processor, and validator
 * Implements exact integration flow from PRD v2.1 Section 5.3.3
 */

import { ScrapeOpsClient, ScrapedProductData } from './scraper';
import { ImageProcessor, ProcessedImages } from './image-processor';
import { DataValidation, ValidationResult } from './data-validation';

/**
 * Complete Product Data with all processing done
 */
export interface CompleteProductData {
  // Core data from scraper
  asin: string;
  name: string;
  price: number;
  originalPrice?: number | null;
  shippingDays: number;
  reviewCount: number;
  rating: number;
  
  // Processed images with Blobs
  images: ProcessedImages;
  
  // Features
  features: string;
  
  // Validation result
  validation: ValidationResult;
  
  // Raw data for debugging
  rawResponse?: any;
}

/**
 * Fetch Status for bulk processing
 */
export type FetchStatus = 'pending' | 'fetching' | 'success' | 'needs_review' | 'failed';

/**
 * Product Fetch Result
 */
export interface ProductFetchResult {
  asin: string;
  status: FetchStatus;
  data?: CompleteProductData;
  error?: string;
}

/**
 * Bulk Fetch Result
 */
export interface BulkFetchResult {
  results: ProductFetchResult[];
  successCount: number;
  failedCount: number;
  needsReviewCount: number;
}

/**
 * Progress Callback Type
 */
export type ProgressCallback = (asin: string, status: FetchStatus, data?: CompleteProductData) => void;

/**
 * Amazon Product Fetcher Class
 * EXACT implementation from PRD v2.1 Section 5.3.3
 */
export class AmazonProductFetcher {
  private scraper: ScrapeOpsClient;
  private imageProcessor: ImageProcessor;
  private validator: DataValidation;
  
  constructor() {
    this.scraper = new ScrapeOpsClient();
    this.imageProcessor = new ImageProcessor();
    this.validator = new DataValidation();
  }
  
  /**
   * Fetch and process a single product
   * EXACT flow from PRD v2.1:
   * 1. Call ScrapeOps API
   * 2. Validate response status
   * 3. Parse core data fields
   * 4. Download and process images
   * 5. Validate data
   * 6. Return complete product data
   */
  async fetchAndProcessProduct(asin: string): Promise<CompleteProductData> {
    try {
      // 1. Call ScrapeOps API
      const scrapedData: ScrapedProductData = await this.scraper.fetchProduct(asin);
      
      // 2. Validation is done in scraper (checks status === 'parse_successful')
      
      // 3. Core data fields already parsed by scraper
      
      // 4. Download and process images
      const images: ProcessedImages = await this.imageProcessor.processProductImages(
        scrapedData.imageUrls
      );
      
      // 5. Validate data
      const validation = this.validator.validateScrapedData(scrapedData, images);
      
      // 6. Combine into complete product data
      const completeData: CompleteProductData = {
        asin: scrapedData.asin,
        name: scrapedData.name,
        price: scrapedData.price,
        originalPrice: scrapedData.originalPrice,
        shippingDays: scrapedData.shippingDays,
        reviewCount: scrapedData.reviewCount,
        rating: scrapedData.rating,
        images: images,
        features: scrapedData.features,
        validation: validation,
        rawResponse: scrapedData.rawResponse
      };
      
      return completeData;
      
    } catch (error) {
      console.error(`[Fetcher] Failed to fetch ASIN ${asin}:`, error);
      throw new ProductFetchError(asin, error instanceof Error ? error.message : 'Unknown error');
    }
  }
  
  /**
   * Fetch multiple products in bulk
   * EXACT flow from PRD v2.1 Section 5.3.6:
   * - Sequential processing with progress callbacks
   * - 200ms delay between requests (rate limiting)
   * - Continue on errors (don't stop entire batch)
   */
  async fetchBulkProducts(
    asins: string[],
    onProgress?: ProgressCallback
  ): Promise<BulkFetchResult> {
    const results: ProductFetchResult[] = [];
    
    
    for (let i = 0; i < asins.length; i++) {
      const asin = asins[i];
      
      try {
        // Update status to "fetching"
        onProgress?.(asin, 'fetching');
        
        // Fetch and process
        const productData = await this.fetchAndProcessProduct(asin);
        
        // Determine final status based on validation
        let status: FetchStatus = 'success';
        if (!productData.validation.isValid) {
          status = 'failed';
        } else if (productData.validation.warnings.length > 0) {
          status = 'needs_review';
        }
        
        results.push({
          asin,
          status,
          data: productData
        });
        
        // Update progress
        onProgress?.(asin, status, productData);
        
      } catch (error) {
        console.error(`[Fetcher] Failed to fetch ${asin}:`, error);
        
        results.push({
          asin,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        // Update progress with failed status
        onProgress?.(asin, 'failed');
      }
      
      // Rate limiting - 200ms delay between requests (per PRD)
      if (i < asins.length - 1) {
        await this.delay(200);
      }
    }
    
    // Calculate summary
    const successCount = results.filter(r => r.status === 'success').length;
    const failedCount = results.filter(r => r.status === 'failed').length;
    const needsReviewCount = results.filter(r => r.status === 'needs_review').length;
    
    
    return {
      results,
      successCount,
      failedCount,
      needsReviewCount
    };
  }
  
  /**
   * Delay utility for rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Clean up image processor resources
   * Should be called when done with all products
   */
  cleanup(): void {
    this.imageProcessor.cleanup();
  }
  
  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.imageProcessor.getCacheStats();
  }
}

/**
 * Custom error for product fetching
 */
export class ProductFetchError extends Error {
  constructor(
    public asin: string,
    message: string
  ) {
    super(`Failed to fetch ASIN ${asin}: ${message}`);
    this.name = 'ProductFetchError';
  }
}

/**
 * Helper function to parse bulk ASINs from text input
 * Handles comma-separated or line-separated input
 */
export function parseBulkASINs(text: string): string[] {
  // Split by commas, newlines, or whitespace
  const asins = text
    .split(/[\n,\s]+/)
    .map(asin => asin.trim().toUpperCase())
    .filter(asin => asin.length > 0);
  
  // Remove duplicates
  return [...new Set(asins)];
}

/**
 * Validate bulk ASINs and return valid/invalid lists
 */
export function validateBulkASINs(asins: string[]): {
  valid: string[];
  invalid: string[];
} {
  const valid: string[] = [];
  const invalid: string[] = [];
  const pattern = /^[A-Z0-9]{10}$/;
  
  for (const asin of asins) {
    if (pattern.test(asin)) {
      valid.push(asin);
    } else {
      invalid.push(asin);
    }
  }
  
  return { valid, invalid };
}

