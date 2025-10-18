/**
 * ScrapeOps API Endpoint
 * Handles single and bulk ASIN scraping requests
 */

import { NextRequest, NextResponse } from 'next/server';
import { AmazonProductFetcher, parseBulkASINs, validateBulkASINs } from '@/lib/product-fetcher';

/**
 * POST /api/scrape
 * 
 * Request body:
 * - Single ASIN: { asin: "B08WM3LMJF" }
 * - Bulk ASINs: { asins: ["B08WM3LMJF", "B0731Y59HG", ...] }
 * - Bulk text: { bulkText: "B08WM3LMJF, B0731Y59HG, ..." }
 */
export async function POST(request: NextRequest) {
  let fetcher: AmazonProductFetcher | null = null;
  
  try {
    const body = await request.json();
    const { asin, asins, bulkText } = body;
    
    // Validate input
    if (!asin && !asins && !bulkText) {
      return NextResponse.json(
        { error: 'Missing required field: asin, asins, or bulkText' },
        { status: 400 }
      );
    }
    
    // Initialize fetcher
    fetcher = new AmazonProductFetcher();
    
    // ==========================================
    // Handle Single ASIN Request
    // ==========================================
    if (asin) {
      // Validate ASIN format
      if (!isValidASIN(asin)) {
        return NextResponse.json(
          { error: `Invalid ASIN format: ${asin}. Must be 10 alphanumeric characters.` },
          { status: 400 }
        );
      }
      
      try {
        const product = await fetcher.fetchAndProcessProduct(asin);
        
        // Convert Blobs to base64 for JSON response
        const serialized = await serializeProduct(product);
        
        return NextResponse.json({
          success: true,
          product: serialized,
          validation: product.validation
        });
        
      } catch (error: unknown) {
        console.error('Single ASIN fetch error:', error);
        return NextResponse.json(
          { 
            error: `Failed to fetch ASIN ${asin}`,
            message: error instanceof Error ? error.message : 'Unknown error' 
          },
          { status: 500 }
        );
      }
    }
    
    // ==========================================
    // Handle Bulk ASIN Request
    // ==========================================
    let asinList: string[] = [];
    
    if (bulkText) {
      asinList = parseBulkASINs(bulkText);
    } else if (asins && Array.isArray(asins)) {
      asinList = asins.map(a => a.trim().toUpperCase());
    }
    
    if (asinList.length === 0) {
      return NextResponse.json(
        { error: 'No valid ASINs provided' },
        { status: 400 }
      );
    }
    
    // Validate all ASINs
    const { valid, invalid } = validateBulkASINs(asinList);
    
    if (valid.length === 0) {
      return NextResponse.json(
        { 
          error: 'No valid ASINs found',
          invalidASINs: invalid
        },
        { status: 400 }
      );
    }
    
    if (invalid.length > 0) {
      console.warn(`Found ${invalid.length} invalid ASINs:`, invalid);
    }
    
    // Fetch all products
    try {
      const result = await fetcher.fetchBulkProducts(valid);
      
      // Serialize all products
      const serializedProducts = await Promise.all(
        result.results
          .filter(r => r.data)
          .map(r => serializeProduct(r.data!))
      );
      
      return NextResponse.json({
        success: true,
        totalRequested: asinList.length,
        validCount: valid.length,
        invalidCount: invalid.length,
        successCount: result.successCount,
        failedCount: result.failedCount,
        needsReviewCount: result.needsReviewCount,
        invalidASINs: invalid,
        products: serializedProducts,
        results: result.results.map(r => ({
          asin: r.asin,
          status: r.status,
          error: r.error
        }))
      });
      
    } catch (error: unknown) {
      console.error('Bulk ASIN fetch error:', error);
      return NextResponse.json(
        { 
          error: 'Bulk fetch failed',
          message: error instanceof Error ? error.message : 'Unknown error' 
        },
        { status: 500 }
      );
    }
    
  } catch (error: unknown) {
    console.error('Scrape API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  } finally {
    // Cleanup resources
    if (fetcher) {
      fetcher.cleanup();
    }
  }
}

/**
 * Validate ASIN format
 */
function isValidASIN(asin: string): boolean {
  const pattern = /^[A-Z0-9]{10}$/;
  return pattern.test(asin);
}

/**
 * Serialize product data for JSON response
 * Convert Blobs to base64 strings
 */
async function serializeProduct(product: any) {
  const serialized: any = {
    ...product,
    images: {
      mainImage: null,
      additionalImages: []
    }
  };
  
  // Convert main image Blob to base64
  if (product.images?.mainImage?.blob) {
    serialized.images.mainImage = {
      base64: await blobToBase64(product.images.mainImage.blob),
      originalUrl: product.images.mainImage.originalUrl,
      type: product.images.mainImage.type,
      size: product.images.mainImage.size
    };
  }
  
  // Convert additional image Blobs to base64
  if (product.images?.additionalImages) {
    serialized.images.additionalImages = await Promise.all(
      product.images.additionalImages.map(async (img: any) => {
        const base64 = await blobToBase64(img.blob);
        return {
          base64,
          originalUrl: img.originalUrl,
          type: img.type,
          size: img.size
        };
      })
    );
    
  }
  
  // Remove raw response to reduce payload size
  delete serialized.rawResponse;
  
  return serialized;
}

/**
 * Convert Blob to base64 string (Server-side using Buffer)
 */
async function blobToBase64(blob: Blob): Promise<string> {
  // Server-side: Convert Blob to Buffer then to base64
  const arrayBuffer = await blob.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const base64 = buffer.toString('base64');
  const mimeType = blob.type || 'image/jpeg';
  return `data:${mimeType};base64,${base64}`;
}

