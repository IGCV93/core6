/**
 * ScrapeOps Amazon Product Data Scraper
 * Implements exact field parsing as specified in PRD v2.1
 */

import { withRetry, DEFAULT_OCR_RETRY_CONFIG } from './retry';

/**
 * ScrapeOps API Response Structure (exact field names)
 */

/**
 * Parsed Product Data
 */
export interface ScrapedProductData {
  asin: string;
  name: string;
  price: number;
  originalPrice?: number | null;
  shippingDays: number;
  reviewCount: number;
  rating: number;
  imageUrls: string[]; // Raw URLs from API
  features: string;
  rawResponse?: any; // For debugging
}

/**
 * ScrapeOps Data Parser
 * Implements exact parsing logic from PRD v2.1
 */
export class ScrapeOpsDataParser {
  
  /**
   * Parse ScrapeOps API response to ProductData format
   * Follows exact field mapping from PRD v2.1
   */
  parseProductData(apiResponse: any): ScrapedProductData {
    const data = apiResponse.data || apiResponse;
    
    return {
      // ASIN - Check multiple locations
      asin: data.product_information?.ASIN || 
            data.asin || 
            this.extractASINFromURL(apiResponse.url) ||
            'UNKNOWN',
      
      // NAME/TITLE
      name: data.name || data.title || 'Unknown Product',
      
      // PRICE - Parse from "pricing" field (EXACT field name from PRD)
      price: this.parsePrice(data.pricing),
      originalPrice: data.list_price ? this.parsePrice(data.list_price) : null,
      
      // SHIPPING - Calculate days from availability_status (EXACT field name)
      shippingDays: this.parseShippingDays(
        data.availability_status || 
        data.shipping_time || 
        'Standard shipping'
      ),
      
      // REVIEWS - Use total_reviews or total_ratings (EXACT field names)
      reviewCount: data.total_reviews || 
                   data.total_ratings || 
                   data['Customer Reviews']?.ratings_count || 
                   0,
      
      // RATING - Use average_rating (EXACT field name)
      rating: data.average_rating || 
              data['Customer Reviews']?.stars || 
              0,
      
      // IMAGES - Convert thumbnail URLs to full-size URLs and store
      imageUrls: this.processImageUrls(data.images || []),
      
      // FEATURES - Combine bullet points (EXACT formatting from PRD)
      features: this.formatFeatures(data.feature_bullets || []),
      
      // Keep raw response for debugging
      rawResponse: apiResponse
    };
  }
  
  /**
   * Parse price string - Remove $, commas, and text
   * Examples: "$1177.91" → 1177.91, "$49.99" → 49.99
   */
  private parsePrice(priceString: string | undefined | null): number {
    if (!priceString) return 0;
    
    // Remove $, commas, and any non-numeric characters except decimal point
    const cleanPrice = priceString.replace(/[$,]/g, '').trim();
    const price = parseFloat(cleanPrice);
    
    return isNaN(price) ? 0 : price;
  }
  
  /**
   * Parse shipping days from availability/shipping text
   * EXACT patterns from PRD v2.1 Section 5.3.1
   */
  private parseShippingDays(shippingText: string): number {
    if (!shippingText) return 5; // Default
    
    // Define exact patterns from PRD
    const patterns = {
      // "Only X left in stock - order soon" = Standard shipping (3 days)
      inStock: /in stock/i,
      
      // "Arrives: Monday, April 15" = Calculate days
      arrives: /arrives?:?\s*(\w+,?\s*\w+\s*\d+)/i,
      
      // "FREE delivery April 15-18"
      delivery: /delivery\s+(\w+\s+\d+)/i,
      
      // "Ships within 2 days"
      shipsWithin: /ships?\s+within\s+(\d+)\s+days?/i,
      
      // Tomorrow/Today
      tomorrow: /tomorrow/i,
      today: /today/i
    };
    
    // Check immediate delivery
    if (patterns.today.test(shippingText)) return 0;
    if (patterns.tomorrow.test(shippingText)) return 1;
    
    // Check "in stock" (default 3 days per PRD)
    if (patterns.inStock.test(shippingText)) return 3;
    
    // Try to extract specific date
    const arrivesMatch = shippingText.match(patterns.arrives);
    if (arrivesMatch) {
      return this.calculateDaysFromDate(arrivesMatch[1]);
    }
    
    const deliveryMatch = shippingText.match(patterns.delivery);
    if (deliveryMatch) {
      return this.calculateDaysFromDate(deliveryMatch[1]);
    }
    
    // Check "ships within X days"
    const shipsWithinMatch = shippingText.match(patterns.shipsWithin);
    if (shipsWithinMatch) {
      return parseInt(shipsWithinMatch[1]);
    }
    
    // Default standard shipping (5 days per PRD)
    return 5;
  }
  
  /**
   * Calculate days from date string
   * Example: "Monday, April 15" → days from today
   */
  private calculateDaysFromDate(dateString: string): number {
    try {
      const currentYear = new Date().getFullYear();
      const targetDate = new Date(dateString + ', ' + currentYear);
      const today = new Date();
      
      // Reset time to midnight for accurate day calculation
      today.setHours(0, 0, 0, 0);
      targetDate.setHours(0, 0, 0, 0);
      
      // If date is in the past, assume next year
      if (targetDate < today) {
        targetDate.setFullYear(currentYear + 1);
      }
      
      const diffTime = targetDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return Math.max(0, diffDays);
    } catch {
      return 5; // Default if date parsing fails
    }
  }
  
  /**
   * Format feature bullets as numbered list
   * EXACT format from PRD v2.1: "1. Feature\n\n2. Feature"
   */
  private formatFeatures(bullets: string[] | undefined): string {
    if (!bullets || bullets.length === 0) {
      return 'No features specified';
    }
    
    // Format as numbered list with double line breaks (EXACT PRD format)
    return bullets
      .map((bullet, index) => `${index + 1}. ${bullet.trim()}`)
      .join('\n\n');
  }
  
  /**
   * Process image URLs to convert thumbnails to full-size images
   * Converts _AC_US40_.jpg thumbnails to full-size URLs
   */
  private processImageUrls(imageUrls: string[]): string[] {
    return imageUrls.map(url => {
      if (!url) return url;
      
      // Convert thumbnail URLs to full-size URLs
      // Replace _AC_US40_ (40px thumbnails) with _AC_SL1500_ (1500px max width)
      // Replace _AC_US60_ (60px thumbnails) with _AC_SL1500_
      // Replace _AC_US100_ (100px thumbnails) with _AC_SL1500_
      let processedUrl = url
        .replace(/_AC_US40_/g, '_AC_SL1500_')
        .replace(/_AC_US60_/g, '_AC_SL1500_')
        .replace(/_AC_US100_/g, '_AC_SL1500_')
        .replace(/_AC_US150_/g, '_AC_SL1500_')
        .replace(/_AC_US200_/g, '_AC_SL1500_')
        .replace(/_AC_US300_/g, '_AC_SL1500_')
        .replace(/_AC_US400_/g, '_AC_SL1500_')
        .replace(/_AC_US500_/g, '_AC_SL1500_');
      
      // If no thumbnail pattern was found, try to add quality parameters
      if (processedUrl === url) {
        // Add high-quality parameters if not present
        if (!processedUrl.includes('_AC_SL')) {
          processedUrl = processedUrl.replace(/\.jpg$/, '_AC_SL1500_.jpg');
        }
      }
      
      return processedUrl;
    });
  }

  /**
   * Extract ASIN from Amazon URL
   * Example: amazon.com/dp/B08WM3LMJF → B08WM3LMJF
   */
  private extractASINFromURL(url: string): string | null {
    if (!url) return null;
    
    const asinPattern = /\/dp\/([A-Z0-9]{10})|\/gp\/product\/([A-Z0-9]{10})|asin=([A-Z0-9]{10})/i;
    const match = url.match(asinPattern);
    
    return match ? (match[1] || match[2] || match[3]) : null;
  }
}

/**
 * ScrapeOps API Client
 * Handles API calls with retry logic
 */
export class ScrapeOpsClient {
  private apiKey: string;
  private parser: ScrapeOpsDataParser;
  
  constructor() {
    this.apiKey = process.env.SCRAPEOPS_API_KEY || '';
    this.parser = new ScrapeOpsDataParser();
    
    if (!this.apiKey) {
      throw new Error('SCRAPEOPS_API_KEY not found in environment variables');
    }
  }
  
  /**
   * Fetch product data from ScrapeOps API
   * Includes automatic retry logic
   */
  async fetchProduct(asin: string): Promise<ScrapedProductData> {
    // Validate ASIN format
    if (!this.validateASIN(asin)) {
      throw new Error(`Invalid ASIN format: ${asin}`);
    }
    
    // Build API request with exact parameters from PRD
    const params = new URLSearchParams({
      api_key: this.apiKey,
      asin: asin,
      country: 'us',
      tld: 'com'
    });
    
    // Call API with retry logic
    const apiResponse = await withRetry(
      async () => {
        const response = await fetch(
          `https://proxy.scrapeops.io/v1/structured-data/amazon/product?${params}`,
          {
            method: 'GET',
            headers: {
              'Accept': 'application/json'
            }
          }
        );
        
        if (!response.ok) {
          throw new Error(`ScrapeOps API request failed: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Handle API returning array vs object
        const responseData = Array.isArray(data) && data.length > 0 ? data[0] : data;
        
        // Validate response status
        if (responseData.status !== 'parse_successful') {
          throw new Error(`API parsing failed for ASIN ${asin}: ${responseData.status}`);
        }
        
        return responseData;
      },
      {
        ...DEFAULT_OCR_RETRY_CONFIG,
        onRetry: () => {
        }
      }
    );
    
    // Parse the response
    return this.parser.parseProductData(apiResponse);
  }
  
  /**
   * Fetch multiple products in bulk
   * Includes rate limiting (200ms delay per PRD)
   */
  async fetchBulkProducts(asins: string[]): Promise<ScrapedProductData[]> {
    const results: ScrapedProductData[] = [];
    
    for (const asin of asins) {
      try {
        const product = await this.fetchProduct(asin);
        results.push(product);
        
        // Rate limiting - 200ms delay between requests (per PRD)
        await this.delay(200);
      } catch (error) {
        console.error(`Failed to fetch ASIN ${asin}:`, error);
        // Continue with next ASIN, don't throw
        results.push({
          asin,
          name: 'Failed to fetch',
          price: 0,
          shippingDays: 5,
          reviewCount: 0,
          rating: 0,
          imageUrls: [],
          features: 'Failed to fetch product data',
          rawResponse: null
        });
      }
    }
    
    return results;
  }
  
  /**
   * Validate ASIN format (10 alphanumeric characters)
   */
  private validateASIN(asin: string): boolean {
    const pattern = /^[A-Z0-9]{10}$/;
    return pattern.test(asin);
  }
  
  /**
   * Delay utility for rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

