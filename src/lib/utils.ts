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
