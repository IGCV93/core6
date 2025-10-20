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
    reader.onload = () => {
      const result = reader.result as string;
      // Extract media type from data URL (e.g., "data:image/png;base64," -> "image/png")
      const mediaType = result.split(';')[0].split(':')[1];
      // Remove the data URL prefix
      const base64 = result.split(',')[1];
      resolve({ base64, mediaType });
    };
    reader.onerror = error => reject(error);
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
