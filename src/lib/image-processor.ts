/**
 * Image Processor for Amazon Product Images
 * Downloads images as Blobs and manages caching
 * Implements exact specifications from PRD v2.1 Section 5.3.2
 */

/**
 * Processed Image Data with Blob
 */
export interface ImageData {
  blob: Blob;
  url: string; // Object URL for display (e.g., blob:http://...)
  originalUrl: string; // Original Amazon image URL
  size: number; // Blob size in bytes
  type: string; // MIME type (e.g., 'image/jpeg')
}

/**
 * Complete set of processed images for a product
 */
export interface ProcessedImages {
  mainImage: ImageData | null;
  additionalImages: ImageData[]; // Max 8 per PRD
}

/**
 * Image Processor Class
 * Handles downloading, converting to Blobs, caching, and cleanup
 */
export class ImageProcessor {
  private imageCache: Map<string, Blob>;
  private objectUrls: Set<string>; // Track created object URLs for cleanup
  
  constructor() {
    this.imageCache = new Map();
    this.objectUrls = new Set();
  }
  
  /**
   * Process product images from URL array
   * Downloads as Blobs and creates object URLs
   * EXACT implementation from PRD v2.1
   */
  async processProductImages(imageUrls: string[]): Promise<ProcessedImages> {
    const processed: ProcessedImages = {
      mainImage: null,
      additionalImages: []
    };
    
    if (!imageUrls || imageUrls.length === 0) {
      return processed;
    }
    
    // Remove duplicate URLs to prevent the same image appearing multiple times
    const uniqueImageUrls = [...new Set(imageUrls)];
    
    // Process all images first to get their content
    const processedImages: ImageData[] = [];
    for (let i = 0; i < uniqueImageUrls.length; i++) {
      try {
        const imageData = await this.downloadAndConvertImage(uniqueImageUrls[i]);
        if (imageData) {
          processedImages.push(imageData);
        }
      } catch (error) {
        console.error(`Failed to process image ${i}:`, error);
        // Continue with next image
      }
    }
    
    // Content-based deduplication: compare blob data to remove identical images
    const uniqueImages: ImageData[] = [];
    const seenBlobs = new Set<string>();
    
    for (const imageData of processedImages) {
      // Convert blob to base64 for comparison
      try {
        const arrayBuffer = await imageData.blob.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Content = buffer.toString('base64');
        
        if (!seenBlobs.has(base64Content)) {
          seenBlobs.add(base64Content);
          uniqueImages.push(imageData);
        } else {
        }
      } catch (error) {
        console.error(`Failed to process image for deduplication:`, error);
        // Add image anyway if we can't process it
        uniqueImages.push(imageData);
      }
    }
    
    
    // Set main image (first unique image)
    if (uniqueImages.length > 0) {
      processed.mainImage = uniqueImages[0];
    }
    
    // Set additional images (remaining unique images, up to 8 per PRD)
    const maxAdditional = Math.min(uniqueImages.length - 1, 8);
    for (let i = 1; i <= maxAdditional; i++) {
      processed.additionalImages.push(uniqueImages[i]);
    }
    
    
    // Log the actual image data to verify no duplication
    if (processed.mainImage && processed.additionalImages.length > 0) {
      try {
        
      } catch (error) {
        console.error(`Failed to compare images for logging:`, error);
      }
    }
    
    return processed;
  }
  
  /**
   * Download image and convert to Blob
   * Creates object URL for display
   * Implements caching
   */
  private async downloadAndConvertImage(url: string): Promise<ImageData | null> {
    try {
      // Check cache first
      if (this.imageCache.has(url)) {
        const cachedBlob = this.imageCache.get(url)!;
        
        // Validate cached image size
        if (cachedBlob.size < 1000) {
          console.warn(`Removing corrupted cached image: ${url} (${cachedBlob.size} bytes)`);
          this.imageCache.delete(url);
          // Continue to download fresh image
        } else {
          const objectUrl = URL.createObjectURL(cachedBlob);
          this.objectUrls.add(objectUrl);
          
          return {
            blob: cachedBlob,
            url: objectUrl,
            originalUrl: url,
            size: cachedBlob.size,
            type: cachedBlob.type
          };
        }
      }
      
      // Download image
      const response = await fetch(url, {
        mode: 'cors', // Handle CORS
        cache: 'default'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }
      
      const blob = await response.blob();
      
      // Validate image type
      if (!blob.type.startsWith('image/')) {
        throw new Error(`Invalid image type: ${blob.type}`);
      }
      
      // Validate minimum image size (prevent corrupted/small images)
      if (blob.size < 1000) { // Less than 1KB usually indicates corrupted image
        throw new Error(`Image too small (${blob.size} bytes), likely corrupted`);
      }
      
      // Cache the blob
      this.imageCache.set(url, blob);
      
      // Create object URL for display
      const objectUrl = URL.createObjectURL(blob);
      this.objectUrls.add(objectUrl);
      
      return {
        blob: blob,
        url: objectUrl,
        originalUrl: url,
        size: blob.size,
        type: blob.type
      };
      
    } catch (error) {
      console.error(`Failed to download image from ${url}:`, error);
      return null;
    }
  }
  
  /**
   * Clean up object URLs when done
   * MUST be called to prevent memory leaks
   */
  cleanup(): void {
    // Revoke all created object URLs
    this.objectUrls.forEach((url) => {
      try {
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error(`Failed to revoke object URL: ${url}`, error);
      }
    });
    
    // Clear tracking sets
    this.objectUrls.clear();
    this.imageCache.clear();
  }
  
  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; urls: number } {
    return {
      size: this.imageCache.size,
      urls: this.objectUrls.size
    };
  }
  
  /**
   * Clear cache manually
   */
  clearCache(): void {
    this.imageCache.clear();
  }
  
  /**
   * Convert Blob to base64 string (for storage if needed)
   */
  async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
  
  /**
   * Convert base64 to Blob (for reconstruction)
   */
  base64ToBlob(base64: string): Blob {
    // Extract data and MIME type
    const [header, data] = base64.split(',');
    const mimeMatch = header.match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    
    // Decode base64
    const byteString = atob(data);
    const arrayBuffer = new ArrayBuffer(byteString.length);
    const uint8Array = new Uint8Array(arrayBuffer);
    
    for (let i = 0; i < byteString.length; i++) {
      uint8Array[i] = byteString.charCodeAt(i);
    }
    
    return new Blob([arrayBuffer], { type: mime });
  }
}

/**
 * Singleton instance for global use
 * Can be imported and used across components
 */
export const globalImageProcessor = new ImageProcessor();

/**
 * React Hook for automatic cleanup
 * Usage in components:
 * 
 * useEffect(() => {
 *   const processor = new ImageProcessor();
 *   // use processor...
 *   return () => processor.cleanup();
 * }, []);
 */
export function useImageProcessor(): ImageProcessor {
  if (typeof window === 'undefined') {
    // Server-side rendering - return dummy
    return new ImageProcessor();
  }
  
  const processor = new ImageProcessor();
  
  // Cleanup on unmount
  if (typeof window !== 'undefined') {
    // Register cleanup for when component unmounts
    const cleanup = () => processor.cleanup();
    
    // Browser only
    if ('addEventListener' in window) {
      window.addEventListener('beforeunload', cleanup);
    }
  }
  
  return processor;
}

