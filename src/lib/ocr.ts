import Anthropic from '@anthropic-ai/sdk';
import { OCRExtraction } from './types';
import { withRetry, DEFAULT_OCR_RETRY_CONFIG, getUserFriendlyErrorMessage } from './retry';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Check if API key is loaded
if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error('API key not configured');
}

/**
 * Extract data from Amazon product page screenshot using Claude Vision
 * Includes automatic retry with exponential backoff for transient errors
 */
export async function extractDataFromScreenshot(imageBase64: string, mediaType: string = 'image/jpeg'): Promise<OCRExtraction> {
  // Validate and normalize media type
  const validMediaTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;
  const normalizedMediaType = validMediaTypes.includes(mediaType as any) ? mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' : 'image/jpeg';
  try {
    // Wrap the API call with retry logic
    const response = await withRetry(
      async () => {
        const result = await anthropic.messages.create({
          model: "claude-3-7-sonnet-20250219",
          max_tokens: 1000,
          temperature: 0,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Extract the following data from this Amazon product page screenshot:

1. Price (look for the main price, ignore crossed-out list prices)
2. Shipping date (find text like "FREE delivery Thursday, October 16" or "Get it by Tuesday")
3. Number of reviews (find the review count number)
4. Star rating (find the star rating like 4.7)

Return ONLY a JSON object with this exact format:
{
  "price": 80.99,
  "shippingDate": "Thursday, October 16",
  "reviews": 1345,
  "rating": 4.7
}

Be precise with the numbers. Do not include dollar signs in the price, just the number.`
                },
                {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: normalizedMediaType,
                    data: imageBase64
                  }
                }
              ]
            }
          ]
        });
        return result;
      },
      {
        ...DEFAULT_OCR_RETRY_CONFIG,
        onRetry: (attempt, error, delay) => {
          // Retry logic handled by withRetry
        }
      }
    );

    const content = response.content[0];
    
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    const extractedText = content.text;
    
    // Parse the JSON response
    const jsonMatch = extractedText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in response. Full text:', extractedText);
      
      // Check if Claude is saying the image is blank/invalid
      if (extractedText.toLowerCase().includes('blank') || 
          extractedText.toLowerCase().includes('white') ||
          extractedText.toLowerCase().includes('cannot extract') ||
          extractedText.toLowerCase().includes('no amazon product')) {
        throw new Error('Invalid or blank image. Please upload a clear screenshot of an Amazon product page.');
      }
      
      throw new Error('No JSON found in Claude response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    // Calculate shipping days from today
    const shippingDays = calculateShippingDays(parsed.shippingDate);
    
    return {
      price: parsed.price,
      shippingDate: parsed.shippingDate,
      shippingDays,
      reviews: parsed.reviews,
      rating: parsed.rating
    };

  } catch (error) {
    const userMessage = getUserFriendlyErrorMessage(error);
    throw new Error(userMessage);
  }
}

/**
 * Calculate shipping days from a date string
 */
function calculateShippingDays(shippingDateStr: string): number {
  try {
    // Handle various Amazon date formats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let targetDate: Date;
    
    // Handle "Thursday, October 16" format
    if (shippingDateStr.includes(',')) {
      const parts = shippingDateStr.split(',');
      if (parts.length === 2) {
        const monthDay = parts[1].trim();
        const currentYear = today.getFullYear();
        targetDate = new Date(`${monthDay}, ${currentYear}`);
      } else {
        targetDate = new Date(shippingDateStr);
      }
    } else {
      targetDate = new Date(shippingDateStr);
    }
    
    // If the date is in the past, assume it's for next year
    if (targetDate < today) {
      targetDate.setFullYear(targetDate.getFullYear() + 1);
    }
    
    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays);
    
  } catch (error) {
    console.error('Error calculating shipping days:', error);
    return 0;
  }
}

/**
 * Validate extracted data
 */
export function validateOCRExtraction(data: OCRExtraction): boolean {
  return (
    data.price > 0 &&
    data.price < 100000 && // Reasonable price limit
    data.shippingDays >= 0 &&
    data.shippingDays <= 30 && // Reasonable shipping limit
    data.reviews >= 0 &&
    data.rating >= 0 &&
    data.rating <= 5
  );
}
