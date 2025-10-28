import Anthropic from '@anthropic-ai/sdk';
import { Product, PollResult, PollRequest } from './types';
import { withRetry, DEFAULT_POLL_RETRY_CONFIG, getUserFriendlyErrorMessage } from './retry';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Run AI polling simulation with Claude
 * Includes automatic retry with exponential backoff for transient errors
 */
export async function runPollSimulation(request: PollRequest): Promise<PollResult> {
  try {
    // Add unique poll identifier to ensure fresh polls
    const pollId = `poll_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    
    console.log('=== POLL SIMULATION START ===');
    console.log('🔍 DEBUG: Polling function is working with latest changes!');
    console.log('Poll type:', request.pollType);
    console.log('Number of products:', request.products.length);
    console.log('Products data:', request.products.map((p, idx) => ({
      product: idx + 1,
      asin: p.asin,
      hasImages: !!(p as any).images,
      hasMainImage: !!(p as any).images?.mainImage,
      mainImageType: (p as any).images?.mainImage ? typeof (p as any).images.mainImage : 'N/A'
    })));
    
    const systemPrompt = generateSystemPrompt(request);
    const userPrompt = generateUserPrompt(request);
    
    
    // Wrap the API call with retry logic
    const response = await withRetry(
      async () => {
        // Check if this is an image-based poll
        const isImagePoll = request.pollType === 'main_image' || request.pollType === 'image_stack';
        
        if (isImagePoll) {
          // For image-based polls, include images in the message
          const messageContent: any[] = [
            {
              type: "text",
              text: `${systemPrompt}\n\n${userPrompt}`
            }
          ];

          // Helper function to validate and clean base64 image data
          const processBase64Image = (data: string): { base64: string; mediaType: string } | null => {
            if (!data || typeof data !== 'string') return null;
            
            // Extract media type from data URL if present
            let mediaType = 'image/jpeg'; // default
            let base64Data = data;
            
            if (data.startsWith('data:')) {
              const match = data.match(/^data:image\/([a-z]+);base64,(.+)$/);
              if (match) {
                mediaType = `image/${match[1]}`;
                base64Data = match[2];
              }
            } else {
              // Raw base64 data, try to detect format from magic bytes
              try {
                const decoded = atob(base64Data.substring(0, 20)); // Check first 20 bytes
                if (decoded.startsWith('\x89PNG')) {
                  mediaType = 'image/png';
                } else if (decoded.startsWith('RIFF') && decoded.includes('WEBP')) {
                  mediaType = 'image/webp';
                } else if (decoded.startsWith('\xFF\xD8\xFF')) {
                  mediaType = 'image/jpeg';
                }
              } catch {
                // Keep default jpeg if detection fails
              }
            }
            
            // Check if it's valid base64
            try {
              atob(base64Data);
              // Check minimum length - very lenient for small images
              const isValid = base64Data.length > 20; // At least 20 characters of base64 data
              
              if (isValid) {
                console.log('Valid base64 image:', {
                  length: base64Data.length,
                  mediaType,
                  preview: base64Data.substring(0, 20) + '...'
                });
                // Return clean base64 data with detected media type
                return { base64: base64Data, mediaType };
              } else {
                console.warn('Base64 data too short:', base64Data.length, 'characters');
                return null;
              }
            } catch (error) {
              console.warn('Invalid base64 data:', error);
              return null;
            }
          };

          // Shuffle product order for image presentation to prevent bias
          const shuffledProductsForImages = [...request.products].map((product, index) => ({
            ...product,
            originalIndex: index
          }));
          
          // Fisher-Yates shuffle for image presentation
          for (let i = shuffledProductsForImages.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledProductsForImages[i], shuffledProductsForImages[j]] = [shuffledProductsForImages[j], shuffledProductsForImages[i]];
          }
          
          // Log the image shuffling for debugging
          console.log('Image order shuffled for poll:', shuffledProductsForImages.map((p, idx) => ({
            shuffledPosition: idx + 1,
            productName: p.name,
            originalIndex: p.originalIndex
          })));
          
          // Add images for each product in shuffled order
          shuffledProductsForImages.forEach((product: any, shuffledIndex) => {
            if (product.images) {
              if (request.pollType === 'main_image' && product.images.mainImage) {
                // Handle both string and object formats for mainImage
                let rawImageData: string;
                if (typeof product.images.mainImage === 'string') {
                  rawImageData = product.images.mainImage;
                } else if (product.images.mainImage.base64) {
                  rawImageData = product.images.mainImage.base64;
                } else {
                  console.warn(`Product ${shuffledIndex + 1}: Invalid mainImage format`, product.images.mainImage);
                  return;
                }
                
                // Debug logging
                console.log(`Product ${shuffledIndex + 1} mainImage:`, {
                  type: typeof product.images.mainImage,
                  hasBase64: typeof product.images.mainImage === 'object' ? !!product.images.mainImage.base64 : 'N/A',
                  dataLength: rawImageData ? rawImageData.length : 0,
                  dataStart: rawImageData ? rawImageData.substring(0, 50) : 'N/A'
                });
                
                const processedImage = processBase64Image(rawImageData);
                if (processedImage) {
                  messageContent.push({
                    type: "text",
                    text: `\nProduct ${shuffledIndex + 1} Main Image:`
                  });
                  messageContent.push({
                    type: "image",
                    source: {
                      type: "base64",
                      media_type: processedImage.mediaType,
                      data: processedImage.base64
                    }
                  });
                } else {
                  // Skip invalid main image
                }
              } else if (request.pollType === 'image_stack' && product.images.additionalImages) {
                messageContent.push({
                  type: "text", 
                  text: `\nProduct ${shuffledIndex + 1} Image Stack:`
                });
                
                // Shuffle additional images within each product to prevent order bias
                const shuffledAdditionalImages = [...product.images.additionalImages].sort(() => Math.random() - 0.5);
                
                // Add ONLY additional images (the "stack") - NOT the main image
                let validAdditionalImages = 0;
                shuffledAdditionalImages.slice(0, 5).forEach((img: any, imgIndex: number) => {
                  // Handle both string and object formats for additional images
                  let rawImgData: string;
                  if (typeof img === 'string') {
                    rawImgData = img;
                  } else if (img.base64) {
                    rawImgData = img.base64;
                  } else {
                    console.warn(`Product ${shuffledIndex + 1} Additional Image ${imgIndex}: Invalid format`, img);
                    return;
                  }
                  const processedImg = processBase64Image(rawImgData);
                  if (processedImg) {
                    messageContent.push({
                      type: "image",
                      source: {
                        type: "base64",
                        media_type: processedImg.mediaType,
                        data: processedImg.base64
                      }
                    });
                    validAdditionalImages++;
                  } else {
                    // Skip invalid additional image
                  }
                });
                
                if (validAdditionalImages === 0) {
                  // No valid additional images found
                }
              }
            }
          });

          // Check if we have any valid images for image-based polls
          if (isImagePoll) {
            const imageCount = messageContent.filter(item => item.type === 'image').length;
            
            console.log(`Image-based poll: Found ${imageCount} valid images out of ${request.products.length} products`);
            
            if (imageCount === 0) {
              // Provide more detailed error information
              const productImageInfo = request.products.map((p: any, idx: number) => ({
                product: idx + 1,
                hasImages: !!p.images,
                hasMainImage: !!p.images?.mainImage,
                mainImageType: p.images?.mainImage ? typeof p.images.mainImage : 'N/A',
                hasAdditionalImages: !!p.images?.additionalImages?.length
              }));
              
              console.error('No valid images found. Product analysis:', productImageInfo);
              throw new Error(`No valid images found for image-based poll. Analyzed ${request.products.length} products. Please ensure all products have valid image data.`);
            }
          }

          return await anthropic.messages.create({
            model: "claude-3-7-sonnet-20250219",
            max_tokens: 4000,
            temperature: 0.7,
            messages: [
              {
                role: "user",
                content: messageContent
              }
            ]
          });
        } else {
          // For text-based polls (features), use text only
          return await anthropic.messages.create({
            model: "claude-3-7-sonnet-20250219",
            max_tokens: 4000,
            temperature: 0.7,
      messages: [
        {
          role: "user",
          content: `${systemPrompt}\n\n${userPrompt}`
        }
      ]
    });
        }
      },
      {
        ...DEFAULT_POLL_RETRY_CONFIG,
        onRetry: () => {
        }
      }
    );

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    const responseText = content.text;
    
    
    // Parse the JSON response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in response:', responseText);
      throw new Error('No JSON found in Claude response');
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Raw response text:', responseText);
      console.error('Matched JSON:', jsonMatch[0]);
      throw new Error('Failed to parse JSON response from Claude');
    }
    
    // Convert to rankings (1st through 6th)
    const rankings = convertToRankings(parsed.rankings, request.products);
    
    // Validate we have responses
    const sampleResponses = parsed.sample_responses || [];
    if (sampleResponses.length === 0) {
      console.warn('No sample responses found in poll result');
    } else if (sampleResponses.length < 50) {
      console.warn(`Only ${sampleResponses.length} responses generated, expected 50`);
    }
    
    return {
      type: request.pollType,
      demographic: request.demographic,
      question: request.question,
      rankings,
      sampleResponses
    };

  } catch (error: any) {
    console.error('Poll simulation failed after retries:', error);
    console.error('Error details:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name
    });
    
    // Check if it's a credit balance issue and show clear error
    if (error?.message?.includes('credit balance is too low') || 
        error?.message?.includes('credit balance') ||
        error?.message?.includes('upgrade or purchase credits')) {
      throw new Error('No Claude credits available. Please contact the administrator to add credits to your Anthropic account.');
    }
    
    const userMessage = getUserFriendlyErrorMessage(error);
    throw new Error(userMessage);
  }
}

/**
 * Generate system prompt for the AI
 */
function generateSystemPrompt(request: PollRequest): string {
  const { demographic, pollType } = request;
  
  // Add randomization factors to ensure unique polls
  const pollId = Math.random().toString(36).substring(2, 15);
  const timestamp = Date.now();
  const randomSeed = Math.floor(Math.random() * 1000);
  
  let contextPrompt = '';
  
  switch (pollType) {
    case 'main_image':
      contextPrompt = 'You are simulating 50 people evaluating the MAIN PRODUCT IMAGES of these products. Focus on visual appeal, quality, and first impressions.';
      break;
    case 'image_stack':
      contextPrompt = 'You are simulating 50 people evaluating the COMPLETE IMAGE SETS of these products. Consider the variety, quality, and helpfulness of all images together.';
      break;
    case 'features':
      contextPrompt = 'You are simulating 50 people evaluating the FEATURES AND FUNCTIONALITY of these products. Focus on practical benefits, innovation, and value.';
      break;
  }
  
  return `You are simulating 50 ${demographic} evaluating products for an Amazon competitive analysis.

${contextPrompt}

POLL CONTEXT:
- Poll ID: ${pollId}
- Timestamp: ${timestamp}
- Random Seed: ${randomSeed}
- This is a FRESH, UNIQUE poll - generate new responses every time

IMPORTANT RULES:
1. Generate exactly 50 responses
2. Responses must total 100% when combined
3. Each product must receive at least some votes (no 0% products)
4. Provide realistic percentage distributions
5. Include exactly 50 sample qualitative responses (one for each simulated person) - keep responses concise but meaningful
6. Base responses on typical consumer behavior for this demographic
7. VARY the responses - do not use the same percentages or sample responses as previous polls
8. Make each poll unique and realistic

Return ONLY a JSON object with this exact format:
{
  "rankings": [
    {"product": "ACTUAL_PRODUCT_NAME_1", "percentage": 35},
    {"product": "ACTUAL_PRODUCT_NAME_2", "percentage": 25},
    {"product": "ACTUAL_PRODUCT_NAME_3", "percentage": 20},
    {"product": "ACTUAL_PRODUCT_NAME_4", "percentage": 12},
    {"product": "ACTUAL_PRODUCT_NAME_5", "percentage": 6},
    {"product": "ACTUAL_PRODUCT_NAME_6", "percentage": 2}
  ],
  "sample_responses": [
    "Sample response 1...",
    "Sample response 2...",
    "Sample response 3...",
    "Sample response 4...",
    "Sample response 5...",
    "Sample response 6...",
    "Sample response 7...",
    "Sample response 8...",
    "Sample response 9...",
    "Sample response 10...",
    "Sample response 11...",
    "Sample response 12...",
    "Sample response 13...",
    "Sample response 14...",
    "Sample response 15...",
    "Sample response 16...",
    "Sample response 17...",
    "Sample response 18...",
    "Sample response 19...",
    "Sample response 20...",
    "Sample response 21...",
    "Sample response 22...",
    "Sample response 23...",
    "Sample response 24...",
    "Sample response 25...",
    "Sample response 26...",
    "Sample response 27...",
    "Sample response 28...",
    "Sample response 29...",
    "Sample response 30...",
    "Sample response 31...",
    "Sample response 32...",
    "Sample response 33...",
    "Sample response 34...",
    "Sample response 35...",
    "Sample response 36...",
    "Sample response 37...",
    "Sample response 38...",
    "Sample response 39...",
    "Sample response 40...",
    "Sample response 41...",
    "Sample response 42...",
    "Sample response 43...",
    "Sample response 44...",
    "Sample response 45...",
    "Sample response 46...",
    "Sample response 47...",
    "Sample response 48...",
    "Sample response 49...",
    "Sample response 50..."
  ]
}

IMPORTANT: Use the EXACT product names as provided in the product list below. Do not use generic names like "Product 1 Name".

Make sure percentages add up to exactly 100% and rankings are realistic for the demographic.`;
}

/**
 * Generate user prompt with product details
 * FIXED: Removes product information bias and shuffles product order
 */
function generateUserPrompt(request: PollRequest): string {
  const { products, question, pollType } = request;
  
  // Shuffle product order to prevent primacy bias while maintaining mapping
  const shuffledProducts = [...products].map((product, index) => ({
    ...product,
    originalIndex: index // Keep track of original position for result mapping
  }));
  
  // Fisher-Yates shuffle algorithm for proper randomization
  for (let i = shuffledProducts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledProducts[i], shuffledProducts[j]] = [shuffledProducts[j], shuffledProducts[i]];
  }
  
  // Log the shuffling for debugging
  console.log('Product order shuffled for poll:', shuffledProducts.map((p, idx) => ({
    shuffledPosition: idx + 1,
    productName: p.name,
    originalIndex: p.originalIndex
  })));
  
  let productList = '';
  shuffledProducts.forEach((product: any, index) => {
    productList += `Product ${index + 1}: ${product.name}\n`;
    
    // Only include relevant information for each poll type to prevent bias
    switch (pollType) {
      case 'main_image':
        // Main image poll: Only show product name and image reference
        productList += `- Main Image: [Image provided below]\n`;
        break;
      case 'image_stack':
        // Image stack poll: Only show product name and image stack reference
        productList += `- Image Stack: [${product.images?.additionalImages?.length || 0} images provided below]\n`;
        break;
      case 'features':
        // Features poll: Only show product name and features
        productList += `- Features: ${product.features}\n`;
        break;
    }
    productList += '\n';
  });
  
  // Add randomization to the question presentation
  const questionVariations = [
    question,
    `${question} (Please provide fresh, unique responses)`,
    `${question} (This is a new poll - generate different results)`,
    `${question} (Vary your responses from previous polls)`
  ];
  const selectedQuestion = questionVariations[Math.floor(Math.random() * questionVariations.length)];
  
  return `Products to evaluate:

${productList}

Question: ${selectedQuestion}

Please simulate how 50 people from the specified demographic would respond to this question when evaluating these products. Generate FRESH, UNIQUE responses that vary from any previous polls.`;
}

/**
 * Convert percentage rankings to numerical rankings (1st, 2nd, etc.)
 * FIXED: Properly handles shuffled product order and ensures correct mapping
 */
function convertToRankings(rankings: { product: string; percentage: number }[], products: Product[]): PollResult['rankings'] {
  
  // Sort by percentage (highest first)
  const sorted = rankings.sort((a, b) => b.percentage - a.percentage);
  
  return sorted.map((item, index) => {
    // Find the product by exact name match first (most reliable)
    let product = products.find(p => p.name === item.product);
    
    // If no exact match, try partial matching (in case of truncation)
    if (!product) {
      product = products.find(p => 
        p.name.toLowerCase().includes(item.product.toLowerCase()) ||
        item.product.toLowerCase().includes(p.name.toLowerCase())
      );
    }
    
    // If still no match, log warning and try to match by position (fallback)
    if (!product) {
      console.warn(`Could not find product for ranking: "${item.product}"`);
      if (index < products.length) {
        product = products[index];
        console.warn(`Using fallback product at position ${index}: ${product?.name}`);
      }
    }
    
    return {
      productId: product?.id || '',
      rank: index + 1, // 1st, 2nd, 3rd, etc.
      percentage: item.percentage
    };
  });
}

/**
 * Validate poll results
 */
export function validatePollResult(result: PollResult): boolean {
  // Check if percentages add up to 100%
  const totalPercentage = result.rankings.reduce((sum, r) => sum + r.percentage, 0);
  
  return (
    Math.abs(totalPercentage - 100) < 0.1 && // Allow small floating point errors
    result.rankings.length > 0 &&
    result.sampleResponses.length > 0 &&
    result.rankings.every(r => r.percentage > 0) // No 0% products
  );
}

