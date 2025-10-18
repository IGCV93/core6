/**
 * Data Validation for Scraped Product Data
 * Implements exact validation rules from PRD v2.1 Section 5.3.5
 */

import { ScrapedProductData } from './scraper';
import { ProcessedImages } from './image-processor';

/**
 * Validation Result
 */
export interface ValidationResult {
  isValid: boolean; // True if no errors (warnings OK)
  errors: string[]; // Blocking errors - prevent continuation
  warnings: string[]; // Non-blocking warnings - allow continuation
  data: ValidatedProductData; // Data with defaults applied
}

/**
 * Validated Product Data (with defaults applied)
 */
export interface ValidatedProductData extends ScrapedProductData {
  images: ProcessedImages;
}

/**
 * Data Validation Class
 * Implements EXACT rules from PRD v2.1
 */
export class DataValidation {
  
  /**
   * Validate scraped product data
   * EXACT implementation from PRD v2.1 Section 5.3.5
   * 
   * Errors (block continuation):
   * - Missing price or price = 0
   * - Invalid rating (not 0-5)
   * 
   * Warnings (allow continuation with defaults):
   * - Missing review count → default to 0
   * - Unclear shipping → default to 5 days
   * - No features → "Please add product features"
   * - No main image → allow manual upload
   */
  validateScrapedData(
    data: ScrapedProductData, 
    images: ProcessedImages
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const validatedData: ValidatedProductData = {
      ...data,
      images
    };
    
    // ==========================================
    // ERRORS - Block continuation
    // ==========================================
    
    // Price validation - MUST have valid price
    if (!data.price || data.price === 0) {
      errors.push('Price is missing or invalid. Price is required to continue.');
    }
    
    // Rating validation - MUST be between 0 and 5
    if (data.rating < 0 || data.rating > 5) {
      errors.push(`Rating is invalid (${data.rating}). Must be between 0 and 5.`);
    }
    
    // ==========================================
    // WARNINGS - Allow continuation with defaults
    // ==========================================
    
    // Review count validation - Default to 0 if missing
    if (data.reviewCount === undefined || data.reviewCount === null || data.reviewCount < 0) {
      warnings.push('Review count missing or invalid. Defaulting to 0.');
      validatedData.reviewCount = 0;
    }
    
    // Shipping days validation - Default to 5 if unclear
    if (!data.shippingDays || data.shippingDays < 0 || data.shippingDays > 30) {
      warnings.push('Shipping days unclear or invalid. Defaulting to 5 days.');
      validatedData.shippingDays = 5;
    }
    
    // Features validation - Prompt manual entry if missing
    if (!data.features || data.features.trim() === '' || data.features === 'No features specified') {
      warnings.push('No features found. Please add product features manually.');
      validatedData.features = 'Please add product features';
    }
    
    // Main image validation - Allow manual upload if missing
    if (!images.mainImage) {
      warnings.push('No main image found. Please upload a main product image.');
    }
    
    // Additional images check
    if (images.additionalImages.length === 0) {
      warnings.push('No additional images found. Consider uploading more product images.');
    }
    
    // ASIN validation
    if (!data.asin || data.asin === 'UNKNOWN') {
      errors.push('ASIN is missing or invalid.');
    }
    
    // Product name validation
    if (!data.name || data.name === 'Unknown Product') {
      warnings.push('Product name is missing or unclear. Please verify.');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      data: validatedData
    };
  }
  
  /**
   * Validate ASIN format
   * Must be exactly 10 alphanumeric characters
   */
  validateASINFormat(asin: string): boolean {
    const pattern = /^[A-Z0-9]{10}$/;
    return pattern.test(asin);
  }
  
  /**
   * Validate price value
   */
  validatePrice(price: number): boolean {
    return price > 0 && price < 100000; // Reasonable range
  }
  
  /**
   * Validate rating value
   */
  validateRating(rating: number): boolean {
    return rating >= 0 && rating <= 5;
  }
  
  /**
   * Validate review count
   */
  validateReviewCount(count: number): boolean {
    return count >= 0 && Number.isInteger(count);
  }
  
  /**
   * Validate shipping days
   */
  validateShippingDays(days: number): boolean {
    return days >= 0 && days <= 30 && Number.isInteger(days);
  }
  
  /**
   * Get validation summary for display
   */
  getValidationSummary(result: ValidationResult): string {
    const parts: string[] = [];
    
    if (result.errors.length > 0) {
      parts.push(`❌ Errors (${result.errors.length}):`);
      result.errors.forEach(err => parts.push(`  • ${err}`));
    }
    
    if (result.warnings.length > 0) {
      parts.push(`⚠️  Warnings (${result.warnings.length}):`);
      result.warnings.forEach(warn => parts.push(`  • ${warn}`));
    }
    
    if (result.isValid) {
      parts.push('✅ Validation passed - Data can be used');
    } else {
      parts.push('❌ Validation failed - Please fix errors before continuing');
    }
    
    return parts.join('\n');
  }
  
  /**
   * Apply defaults to incomplete data
   * Used when user chooses to proceed with warnings
   */
  applyDefaults(data: Partial<ScrapedProductData>): ScrapedProductData {
    return {
      asin: data.asin || 'UNKNOWN',
      name: data.name || 'Unknown Product',
      price: data.price || 0,
      originalPrice: data.originalPrice || null,
      shippingDays: data.shippingDays ?? 5,
      reviewCount: data.reviewCount ?? 0,
      rating: data.rating ?? 0,
      imageUrls: data.imageUrls || [],
      features: data.features || 'Please add product features',
      rawResponse: data.rawResponse
    };
  }
  
  /**
   * Check if data needs manual review
   * Returns true if there are warnings or critical missing data
   */
  needsManualReview(result: ValidationResult): boolean {
    if (result.errors.length > 0) {
      return true; // Definitely needs review
    }
    
    // Check for critical warnings
    const criticalWarnings = [
      'No main image found',
      'No features found',
      'Product name is missing'
    ];
    
    return result.warnings.some(warning => 
      criticalWarnings.some(critical => warning.includes(critical))
    );
  }
  
  /**
   * Get status badge for UI display
   */
  getStatusBadge(result: ValidationResult): { 
    label: string; 
    color: 'success' | 'warning' | 'error' 
  } {
    if (!result.isValid) {
      return { label: 'Needs Fix', color: 'error' };
    }
    
    if (result.warnings.length > 0) {
      return { label: 'Needs Review', color: 'warning' };
    }
    
    return { label: 'Complete', color: 'success' };
  }
}

/**
 * Singleton instance for global use
 */
export const validator = new DataValidation();

