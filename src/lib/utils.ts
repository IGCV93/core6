import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

export function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`;
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export function validateASIN(asin: string): boolean {
  return /^[A-Z0-9]{10}$/.test(asin);
}

export function validatePrice(price: number): boolean {
  return price > 0 && price < 100000;
}

export function validateRating(rating: number): boolean {
  return rating >= 0 && rating <= 5;
}

export function validateReviewCount(count: number): boolean {
  return count >= 0 && Number.isInteger(count);
}

export function downloadFile(buffer: ArrayBuffer, filename: string, mimeType: string): void {
  const blob = new Blob([buffer], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function convertToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix (data:image/jpeg;base64,)
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
}

export function convertToBase64WithMediaType(file: File): Promise<{base64: string, mediaType: string}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const result = reader.result as string;
        // Extract media type from data URL (e.g., "data:image/png;base64," -> "image/png")
        const mediaType = result.split(';')[0].split(':')[1];
        
        console.log(`[Image Upload] Original file size: ${file.size} bytes (${(file.size / 1024).toFixed(2)}KB)`);
        
        // Compress image before storing to avoid localStorage quota issues
        // Maximum compression: max 600px, 60% quality (to handle 6 products × 9 images = 54 images total)
        const compressedBase64 = await compressImage(result, {
          maxWidth: 600,
          maxHeight: 600,
          quality: 0.6,
          outputFormat: mediaType
        });
        
        // Remove the data URL prefix
        const base64 = compressedBase64.split(',')[1];
        const compressedSize = (base64.length * 3) / 4; // Approximate base64 size
        console.log(`[Image Upload] Compressed size: ${compressedSize.toFixed(0)} bytes (${(compressedSize / 1024).toFixed(2)}KB) - ${((compressedSize / file.size) * 100).toFixed(1)}% of original`);
        
        // Update mediaType to match compressed format (JPEG)
        const finalMediaType = compressedBase64.includes('image/png') ? 'image/png' : 'image/jpeg';
        
        resolve({ base64, mediaType: finalMediaType });
      } catch (error) {
        console.error('[Image Upload] Compression failed, using original:', error);
        // Fallback to original if compression fails
        const result = reader.result as string;
        const mediaType = result.split(';')[0].split(':')[1];
        const base64 = result.split(',')[1];
        resolve({ base64, mediaType });
      }
    };
    reader.onerror = error => reject(error);
  });
}

/**
 * Compress image to reduce file size for localStorage
 * Reduces dimensions and quality while maintaining visual quality
 */
function compressImage(dataUrl: string, options: {
  maxWidth: number;
  maxHeight: number;
  quality: number;
  outputFormat: string;
}): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      
      // Calculate new dimensions while maintaining aspect ratio
      if (width > options.maxWidth) {
        height = (height * options.maxWidth) / width;
        width = options.maxWidth;
      }
      if (height > options.maxHeight) {
        width = (width * options.maxHeight) / height;
        height = options.maxHeight;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      
      // Draw image with compression
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convert to compressed base64
      // Always use JPEG for maximum compression unless explicitly PNG
      let outputFormat = 'image/jpeg';
      if (options.outputFormat && options.outputFormat.includes('png')) {
        outputFormat = 'image/png';
      }
      
      const compressedDataUrl = canvas.toDataURL(outputFormat, options.quality);
      resolve(compressedDataUrl);
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
}

/**
 * Scoring threshold system for product competitiveness
 * Pass: 75+ points (75-100)
 * Improve: 40-74 points  
 * Discontinue: <40 points (0-39)
 */
export type ScoreThreshold = 'Pass' | 'Improve' | 'Discontinue';

export function getScoreThreshold(score: number): ScoreThreshold {
  if (score >= 75) return 'Pass';
  if (score >= 40) return 'Improve';
  return 'Discontinue';
}

export function getScoreThresholdColor(threshold: ScoreThreshold): string {
  switch (threshold) {
    case 'Pass':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'Improve':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'Discontinue':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

export function getScoreThresholdIcon(threshold: ScoreThreshold): string {
  switch (threshold) {
    case 'Pass':
      return '✅';
    case 'Improve':
      return '⚠️';
    case 'Discontinue':
      return '❌';
    default:
      return '❓';
  }
}

export function getScoreThresholdDescription(threshold: ScoreThreshold): string {
  switch (threshold) {
    case 'Pass':
      return 'Strong competitive position - maintain current strategy';
    case 'Improve':
      return 'Needs optimization - focus on key improvement areas';
    case 'Discontinue':
      return 'Significant competitive gaps - consider major changes or discontinuation';
    default:
      return 'Unknown threshold';
  }
}
