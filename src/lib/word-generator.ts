import { Document, Packer, Paragraph, TextRun, UnderlineType } from 'docx';
import { Analysis, Product, ScoreCalculation, PollResult } from './types';
import { getScoreThreshold, getScoreThresholdDescription } from './utils';

export interface WordReportOptions {
  preparedBy?: string;
  productCategory?: string;
}

/**
 * Generate Word report for Core 6 analysis following the exact template structure
 */
export async function generateWordReport(
  analysis: Analysis, 
  options?: WordReportOptions
): Promise<ArrayBuffer> {

  if (analysis.type !== 'core6') {
    throw new Error('Word reports are only available for Core 6 analysis');
  }
  
  const { products, calculations, pollResults } = analysis;
  const userProduct = products.find(p => p.isUserProduct);
  const competitors = products.filter(p => !p.isUserProduct);
  
  
  if (!userProduct) {
    throw new Error('User product not found in Core 6 analysis');
  }
  
  const preparedBy = options?.preparedBy || '';
  const productCategory = options?.productCategory || userProduct.category || 'General';
  
  // Generate optimization recommendations
  const optimizationRecommendations = await generateOptimizationRecommendations(analysis, pollResults);
  
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          // Header Section
          new Paragraph({
            children: [
              new TextRun({
                text: `Date: ${new Date().toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })}`
              })
            ],
            spacing: { after: 300 }
          }),
          
          new Paragraph({
            children: [
              new TextRun({
                text: `Prepared by: ${preparedBy}`
              })
            ],
            spacing: { after: 300 }
          }),
          
          new Paragraph({
            text: "",
            spacing: { after: 300 }
          }),
          
          // Product Info
          new Paragraph({
            children: [
              new TextRun({
                text: `Product: ${userProduct.name}`
              })
            ],
            spacing: { after: 300 }
          }),
          
          new Paragraph({
            children: [
              new TextRun({
                text: `Asin: ${userProduct.asin}`
              })
            ],
            spacing: { after: 300 }
          }),
          
          new Paragraph({
            children: [
              new TextRun({
                text: `Category: ${productCategory}`
              })
            ],
            spacing: { after: 400 }
          }),
          
          // Your Product Section
          ...generateProductSection(
            "Your Product",
            userProduct,
            calculations.find(c => c.productId === userProduct.id)!,
            pollResults
          ),
          
          // Competitor Sections
          ...competitors.flatMap((competitor, index) => {
            const calculation = calculations.find(c => c.productId === competitor.id)!;
            return generateProductSection(
              `Comp ${index + 1}`,
              competitor,
              calculation,
              pollResults
            );
          }),
          
          // Section 4: Optimization Recommendations
          new Paragraph({
            children: [
              new TextRun({
                text: "Section 4: Optimization Recommendations",
                underline: {
                  type: UnderlineType.SINGLE
                },
                bold: true
              })
            ],
            spacing: { after: 500 }
          }),
          
          // Parse and format the optimization recommendations
          ...formatOptimizationRecommendations(optimizationRecommendations)
        ]
      }
    ]
  });
  
  // Convert to buffer
  const buffer = await Packer.toBuffer(doc);
  const uint8Array = new Uint8Array(buffer);
  const result = uint8Array.buffer.slice(uint8Array.byteOffset, uint8Array.byteOffset + uint8Array.byteLength);
  
  return result;
}

/**
 * Generate a product section with exact template formatting
 */
function generateProductSection(
  title: string,
  product: Product,
  calculation: ScoreCalculation,
  pollResults: {
    mainImage: PollResult | null;
    imageStack: PollResult | null;
    features: PollResult | null;
  }
): Paragraph[] {
  // Get rankings from poll results
  const mainImageRank = pollResults.mainImage?.rankings.find(r => r.productId === product.id)?.rank || 6;
  const stackRank = pollResults.imageStack?.rankings.find(r => r.productId === product.id)?.rank || 6;
  const featuresRank = pollResults.features?.rankings.find(r => r.productId === product.id)?.rank || 6;
  
  return [
    // Section Header with Underline
    new Paragraph({
      children: [
        new TextRun({
          text: title,
          underline: {
            type: UnderlineType.SINGLE
          }
        })
      ],
      spacing: { after: 300 }
    }),
    
    // ASIN
    new Paragraph({
      children: [
        new TextRun({
          text: `Asin: ${product.asin}`
        })
      ],
      spacing: { after: 300 }
    }),
    
    // 1. Price
    new Paragraph({
      children: [
        new TextRun({
          text: `1. Price - $${product.price.toFixed(2)}`
        })
      ],
      spacing: { after: 200 }
    }),
    
    // 2. Shipping
    new Paragraph({
      children: [
        new TextRun({
          text: `2. Shipping - ${product.shippingDays} days`
        })
      ],
      spacing: { after: 200 }
    }),
    
    // 3. Reviews
    new Paragraph({
      children: [
        new TextRun({
          text: `3. Reviews - ${product.reviewCount.toLocaleString()}`
        })
      ],
      spacing: { after: 200 }
    }),
    
    // 4. Rating
    new Paragraph({
      children: [
        new TextRun({
          text: `4. Rating - ${product.rating.toFixed(1)} stars`
        })
      ],
      spacing: { after: 200 }
    }),
    
    // 5. Images
    new Paragraph({
      children: [
        new TextRun({
          text: `5. Images - Main ranked #${mainImageRank}, Stack ranked #${stackRank}`
        })
      ],
      spacing: { after: 200 }
    }),
    
    // 6. Features
    new Paragraph({
      children: [
        new TextRun({
          text: `6. Features - Ranked #${featuresRank}`
        })
      ],
      spacing: { after: 300 }
    }),
    
    // Score
    new Paragraph({
      children: [
        new TextRun({
          text: `Score out of 100: ${calculation.totalScore}`,
          bold: true
        })
      ],
      spacing: { after: 300 }
    }),
    
    // Analysis
    new Paragraph({
      children: [
        new TextRun({
          text: `Analysis: ${generateAnalysis(product, calculation, pollResults)}`
        })
      ],
      spacing: { after: 400 }
    })
  ];
}

/**
 * Generate analysis paragraph with poll data, percentages, and sample responses
 */
function generateAnalysis(
  product: Product,
  calculation: ScoreCalculation,
  pollResults: {
    mainImage: PollResult | null;
    imageStack: PollResult | null;
    features: PollResult | null;
  }
): string {
  const parts: string[] = [];
  
  // Main Image Analysis
  if (pollResults.mainImage) {
    const mainImageRanking = pollResults.mainImage.rankings.find(r => r.productId === product.id);
    if (mainImageRanking) {
      if (mainImageRanking.percentage > 25) {
        // Strong performance - use generic positive feedback
        parts.push(
          `This product performed strongly in the main image poll with ${mainImageRanking.percentage}% ` +
          `of respondents preferring its presentation. The main image effectively showcases the product's ` +
          `key features and benefits, creating strong visual appeal.`
        );
      } else {
        // Weaker performance - use generic improvement feedback
        parts.push(
          `The main image ranked #${mainImageRanking.rank} with ${mainImageRanking.percentage}% preference, ` +
          `indicating potential for improvement in visual presentation and product showcasing.`
        );
      }
    }
  }
  
  // Image Stack Analysis
  if (pollResults.imageStack) {
    const stackRanking = pollResults.imageStack.rankings.find(r => r.productId === product.id);
    if (stackRanking) {
      if (stackRanking.rank <= 2) {
        parts.push(
          `The image set quality was strong, ranking #${stackRanking.rank} with ${stackRanking.percentage}% preference.`
        );
      }
    }
  }
  
  // Features Analysis
  if (pollResults.features) {
    const featuresRanking = pollResults.features.rankings.find(r => r.productId === product.id);
    if (featuresRanking) {
      if (featuresRanking.rank <= 2) {
        parts.push(
          `Features were a key strength, ranking #${featuresRanking.rank} with ` +
          `${featuresRanking.percentage}% of respondents highlighting the product's functionality. ` +
          `The product's features effectively address customer needs and provide strong value proposition.`
        );
      } else {
        parts.push(
          `Features ranked #${featuresRanking.rank} with ${featuresRanking.percentage}% preference, ` +
          `indicating room for improvement in functionality compared to competitors.`
        );
      }
    }
  }
  
  // Reviews and Rating
  if (product.reviewCount > 1000) {
    parts.push(
      `The high review count (${product.reviewCount.toLocaleString()}) and ` +
      `${product.rating.toFixed(1)} rating provide strong social proof.`
    );
  } else if (product.reviewCount < 100) {
    parts.push(
      `The limited review count (${product.reviewCount}) suggests this is a newer or less established product.`
    );
  }
  
  // Price Analysis
  if (calculation.priceScore >= 8) {
    parts.push(`Pricing is highly competitive.`);
  } else if (calculation.priceScore < 5) {
    parts.push(`Pricing may be a concern relative to competitors.`);
  }
  
  // Shipping Analysis
  if (calculation.shippingScore >= 8) {
    parts.push(`Fast shipping (${product.shippingDays} days) provides an advantage.`);
  } else if (calculation.shippingScore < 5) {
    parts.push(`Shipping time (${product.shippingDays} days) is slower than competitors.`);
  }
  
  // Overall Score with Threshold Analysis
  const threshold = getScoreThreshold(calculation.totalScore);
  const thresholdDescription = getScoreThresholdDescription(threshold);
  
  parts.push(`Overall competitive score: ${calculation.totalScore}/100 (${threshold}). ${thresholdDescription}`);
  
  return parts.join(' ');
}

/**
 * Create a bullet point paragraph
 */
function createBulletPoint(text: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text: text
      })
    ],
    spacing: { after: 200 },
    bullet: {
      level: 0
    }
  });
}

/**
 * Format optimization recommendations into Word paragraphs
 */
function formatOptimizationRecommendations(recommendations: string): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  
  // Split the recommendations into sections
  const sections = recommendations.split(/\n(?=DEEP DIVE ANALYSIS:|PRIORITIZED RECOMMENDATIONS:|HIGH PRIORITY:|MEDIUM PRIORITY:|LOW PRIORITY:)/);
  
  for (const section of sections) {
    const trimmedSection = section.trim();
    
    if (trimmedSection.startsWith('DEEP DIVE ANALYSIS:')) {
      const content = trimmedSection.replace('DEEP DIVE ANALYSIS:', '').trim();
      if (content) {
        // Split content into paragraphs for better readability
        const contentParagraphs = content.split('\n\n').filter(p => p.trim());
        for (const paragraph of contentParagraphs) {
          paragraphs.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: paragraph.trim()
                })
              ],
              spacing: { after: 400 }
            })
          );
        }
      }
    } else if (trimmedSection.startsWith('PRIORITIZED RECOMMENDATIONS:')) {
      // Skip the header, we'll handle the priority sections separately
      continue;
    } else if (trimmedSection.startsWith('HIGH PRIORITY:')) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "HIGH PRIORITY:",
              bold: true
            })
          ],
          spacing: { after: 300 }
        })
      );
      
      const content = trimmedSection.replace('HIGH PRIORITY:', '').trim();
      const items = content.split('\n').filter(line => line.trim().startsWith('-'));
      
      for (const item of items) {
        // Remove the dash and format as proper bullet point
        const cleanItem = item.trim().replace(/^-\s*/, '');
        paragraphs.push(createBulletPoint(cleanItem));
      }
    } else if (trimmedSection.startsWith('MEDIUM PRIORITY:')) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "MEDIUM PRIORITY:",
              bold: true
            })
          ],
          spacing: { after: 300 }
        })
      );
      
      const content = trimmedSection.replace('MEDIUM PRIORITY:', '').trim();
      const items = content.split('\n').filter(line => line.trim().startsWith('-'));
      
      for (const item of items) {
        // Remove the dash and format as proper bullet point
        const cleanItem = item.trim().replace(/^-\s*/, '');
        paragraphs.push(createBulletPoint(cleanItem));
      }
    } else if (trimmedSection.startsWith('LOW PRIORITY:')) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "LOW PRIORITY:",
              bold: true
            })
          ],
          spacing: { after: 300 }
        })
      );
      
      const content = trimmedSection.replace('LOW PRIORITY:', '').trim();
      const items = content.split('\n').filter(line => line.trim().startsWith('-'));
      
      for (const item of items) {
        // Remove the dash and format as proper bullet point
        const cleanItem = item.trim().replace(/^-\s*/, '');
        paragraphs.push(createBulletPoint(cleanItem));
      }
    }
  }
  
  // If no sections were found, just add the raw text
  if (paragraphs.length === 0) {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: recommendations
          })
        ],
        spacing: { after: 300 }
      })
    );
  }
  
  return paragraphs;
}

/**
 * Generate optimization recommendations for Core 6 analysis
 */
export async function generateOptimizationRecommendations(
  analysis: Analysis,
  pollResults: {
    mainImage: PollResult | null;
    imageStack: PollResult | null;
    features: PollResult | null;
  }
): Promise<string> {
  const userProduct = analysis.products.find(p => p.isUserProduct);
  const competitors = analysis.products.filter(p => !p.isUserProduct);
  
  if (!userProduct || competitors.length === 0) {
    return "Unable to generate optimization recommendations - missing product data.";
  }

  const userCalculation = analysis.calculations.find(c => c.productId === userProduct.id);
  if (!userCalculation) {
    return "Unable to generate optimization recommendations - missing calculation data.";
  }

  const userFeatureCopy = (userProduct.features ?? '').trim() || 'No feature copy provided';

  // Calculate specific competitive gaps
  const competitorPrices = competitors.map(c => c.price);
  const minCompPrice = Math.min(...competitorPrices);
  const maxCompPrice = Math.max(...competitorPrices);
  const avgCompPrice = competitorPrices.reduce((sum, price) => sum + price, 0) / competitorPrices.length;
  
  const competitorRatings = competitors.map(c => c.rating);
  const minCompRating = Math.min(...competitorRatings);
  const maxCompRating = Math.max(...competitorRatings);
  
  const competitorShipping = competitors.map(c => c.shippingDays);
  const minCompShipping = Math.min(...competitorShipping);
  const maxCompShipping = Math.max(...competitorShipping);
  
  const competitorScores = competitors.map(c => {
    const calc = analysis.calculations.find(calc => calc.productId === c.id);
    return calc?.totalScore || 0;
  });
  const maxCompScore = Math.max(...competitorScores);
  const minCompScore = Math.min(...competitorScores);
  
  const userRank = analysis.calculations.sort((a, b) => b.totalScore - a.totalScore).findIndex(c => c.productId === userProduct.id) + 1;
  const scoreGapToLeader = maxCompScore - userCalculation.totalScore;
  const priceGapToAvg = userProduct.price - avgCompPrice;
  const ratingGapToMax = maxCompRating - userProduct.rating;
  const shippingGapToMin = userProduct.shippingDays - minCompShipping;

  const describeImageSource = (
    image: Product['mainImage'] | Product['additionalImages'][number] | null | undefined
  ): string => {
    if (!image) {
      return 'Not provided';
    }

    if (typeof image === 'string') {
      if (image.startsWith('data:image/')) {
        const mediaType = image.substring(5, image.indexOf(';')) || 'image';
        return `Inline ${mediaType} base64 (length ${image.length} chars)`;
      }

      if (image.startsWith('http://') || image.startsWith('https://')) {
        return `URL: ${image}`;
      }

      return `Image reference string (length ${image.length} chars)`;
    }

    const mediaType = image.mediaType || 'image';
    const base64Length = image.base64 ? image.base64.length : 0;
    return `Inline ${mediaType} base64 (length ${base64Length} chars)`;
  };

  const formatFeatureSnippet = (copy?: string, limit: number = 400): string => {
    if (!copy) {
      return 'No feature copy provided';
    }

    const normalized = copy.replace(/\s+/g, ' ').trim();
    if (!normalized) {
      return 'No feature copy provided';
    }

    if (normalized.length <= limit) {
      return normalized;
    }

    return `${normalized.slice(0, limit)}...`;
  };

  const productContentSnapshots = analysis.products.map(product => {
    const additionalImages = Array.isArray(product.additionalImages) ? product.additionalImages : [];
    const additionalImagesDetails = additionalImages.length
      ? additionalImages
          .map((img, index) => `     • Image ${index + 1}: ${describeImageSource(img)}`)
          .join('\n')
      : '     • None provided';

    return `${product.isUserProduct ? 'YOUR PRODUCT' : 'Competitor'} - ${product.name} (ASIN: ${product.asin})
   Main Image: ${describeImageSource(product.mainImage)}
   Additional Images (${additionalImages.length}):
${additionalImagesDetails}
   Feature Copy Snapshot: ${formatFeatureSnippet(product.features)}`;
  }).join('\n\n');

  const prompt = `You are an expert Amazon product optimization consultant. Analyze this SPECIFIC competitive data and provide CONCRETE, ACTIONABLE optimization recommendations with exact metrics and targets.

USER PRODUCT ANALYSIS:
- Product: ${userProduct.name} (ASIN: ${userProduct.asin})
- Current Price: $${userProduct.price} (${priceGapToAvg > 0 ? `$${priceGapToAvg.toFixed(2)} ABOVE` : `$${Math.abs(priceGapToAvg).toFixed(2)} BELOW`} competitor average of $${avgCompPrice.toFixed(2)})
- Current Shipping: ${userProduct.shippingDays} days (${shippingGapToMin > 0 ? `${shippingGapToMin} days SLOWER` : 'FASTEST'} than fastest competitor)
- Current Rating: ${userProduct.rating}/5 stars (${ratingGapToMax > 0 ? `${ratingGapToMax.toFixed(1)} stars BELOW` : 'MATCHES'} highest competitor rating)
- Current Reviews: ${userProduct.reviewCount.toLocaleString()} reviews
- Current Score: ${userCalculation.totalScore}/100 (${scoreGapToLeader > 0 ? `${scoreGapToLeader} points BELOW` : 'LEADING'} market leader)
- Current Rank: #${userRank} of ${analysis.products.length} products

COMPETITIVE GAPS IDENTIFIED:
- Score Gap: ${scoreGapToLeader} points behind market leader (${maxCompScore}/100 vs ${userCalculation.totalScore}/100)
- Price Gap: $${priceGapToAvg.toFixed(2)} ${priceGapToAvg > 0 ? 'above' : 'below'} competitor average
- Rating Gap: ${ratingGapToMax.toFixed(1)} stars ${ratingGapToMax > 0 ? 'below' : 'above'} highest competitor
- Shipping Gap: ${shippingGapToMin} days ${shippingGapToMin > 0 ? 'slower' : 'faster'} than fastest competitor

COMPETITOR PERFORMANCE RANKING:
${competitors.map((comp, idx) => {
  const compCalculation = analysis.calculations.find(c => c.productId === comp.id);
  const compRank = compCalculation ? analysis.calculations.sort((a, b) => b.totalScore - a.totalScore).findIndex(c => c.productId === comp.id) + 1 : 0;
  const scoreDiff = (compCalculation?.totalScore || 0) - userCalculation.totalScore;
  return `
${compRank}. ${comp.name} (ASIN: ${comp.asin})
   - Score: ${compCalculation?.totalScore || 0}/100 (${scoreDiff > 0 ? `+${scoreDiff}` : scoreDiff} vs user)
   - Price: $${comp.price} (${comp.price - userProduct.price > 0 ? `+$${(comp.price - userProduct.price).toFixed(2)}` : `$${(comp.price - userProduct.price).toFixed(2)}`} vs user)
   - Rating: ${comp.rating}/5 stars (${comp.rating - userProduct.rating > 0 ? `+${(comp.rating - userProduct.rating).toFixed(1)}` : (comp.rating - userProduct.rating).toFixed(1)} vs user)
   - Shipping: ${comp.shippingDays} days (${comp.shippingDays - userProduct.shippingDays > 0 ? `+${comp.shippingDays - userProduct.shippingDays}` : comp.shippingDays - userProduct.shippingDays} vs user)
`;
}).join('')}

CONSUMER PREFERENCE DATA:
Main Image Performance:
${pollResults.mainImage?.rankings.map(r => {
  const product = analysis.products.find(p => p.id === r.productId);
  const isUserProduct = r.productId === userProduct.id;
  return `- ${product?.name || 'Unknown'}: ${r.percentage}% preference (Rank #${r.rank})${isUserProduct ? ' ← YOUR PRODUCT' : ''}`;
}).join('\n') || 'No main image poll data'}

Image Stack Performance:
${pollResults.imageStack?.rankings.map(r => {
  const product = analysis.products.find(p => p.id === r.productId);
  const isUserProduct = r.productId === userProduct.id;
  return `- ${product?.name || 'Unknown'}: ${r.percentage}% preference (Rank #${r.rank})${isUserProduct ? ' ← YOUR PRODUCT' : ''}`;
}).join('\n') || 'No image stack poll data'}

Feature Performance:
${pollResults.features?.rankings.map(r => {
  const product = analysis.products.find(p => p.id === r.productId);
  const isUserProduct = r.productId === userProduct.id;
  return `- ${product?.name || 'Unknown'}: ${r.percentage}% preference (Rank #${r.rank})${isUserProduct ? ' ← YOUR PRODUCT' : ''}`;
}).join('\n') || 'No features poll data'}

FULL IMAGE & CONTENT SNAPSHOT (REFERENCE CURRENT STATE BEFORE RECOMMENDING CHANGES):
${productContentSnapshots}

CURRENT PRODUCT DETAIL PAGE COPY (CONFIRM BEFORE RECOMMENDING CHANGES):
${userFeatureCopy}

OPTIMIZATION REQUIREMENTS:
Provide SPECIFIC, METRIC-DRIVEN recommendations based on the exact data above:

1. DEEP DIVE ANALYSIS (use exact numbers):
   - Reference the specific ${scoreGapToLeader}-point score gap and how to close it
   - Address the exact $${priceGapToAvg.toFixed(2)} price gap vs competitors
   - Target the specific ${ratingGapToMax.toFixed(1)}-star rating improvement needed
   - Address the ${shippingGapToMin}-day shipping gap

2. PRIORITIZED RECOMMENDATIONS (use specific metrics):
   - HIGH PRIORITY: Target the biggest gaps (score, price, rating, shipping)
   - MEDIUM PRIORITY: Address secondary competitive weaknesses
   - LOW PRIORITY: Fine-tune performance optimizations

3. SPECIFIC ACTIONABLE STEPS:
   - Exact price targets (e.g., "Reduce price by $X to match competitor Y")
   - Specific rating targets (e.g., "Improve rating from X to Y stars")
   - Concrete shipping targets (e.g., "Reduce shipping from X to Y days")
   - Specific score improvements (e.g., "Increase score by X points to reach Y/100")

4. IMAGE COMPLIANCE & ACTIONABILITY RULES (MUST FOLLOW STRICTLY):
   - MAIN IMAGE recommendations MUST comply with Amazon requirements (https://sellercentral.amazon.com/help/hub/reference/external/G1881?locale=en-US): pure white (#FFFFFF) background, product fills 85%+ of frame, only the product and what ships with it. If referencing a model, keep the model within the white background and interacting naturally with the product; never suggest lifestyle backdrops for the main image.
   - SECONDARY/IMAGE STACK suggestions may include lifestyle or contextual scenes, but only leverage actual components the user sells. Label when suggestions belong to secondary images if they require non-white backgrounds or multiple angles.
   - DO NOT recommend altering the product's design, materials, structural features, colors, or adding bundle items/extras that are not actually offered. Instead, focus on merchandising, staging, messaging, or compliance tweaks the seller can implement now.
   - DO NOT recommend adding competitor-only value props. If competitors offer extras the user lacks, note it as a competitive gap but do not present it as an actionable change unless the product already includes it.
   - Before giving a recommendation, confirm it is not already satisfied by the user's current assets or performance data above. If the main image already leads polls or the feature copy already covers the point, explicitly state "No additional change needed" instead of repeating the idea.
   - Keep each main image recommendation focused on one clear improvement. If an idea needs supporting visuals (e.g., close-ups, lifestyle use cases), route it to the secondary image stack instead of overloading the main image.

Format your response as:
DEEP DIVE ANALYSIS:
[2-3 paragraphs of detailed analysis]

PRIORITIZED RECOMMENDATIONS:
HIGH PRIORITY:
- [Specific actionable items]

MEDIUM PRIORITY:
- [Specific actionable items]

LOW PRIORITY:
- [Specific actionable items]`;

  try {
    // Call Claude API directly instead of making HTTP request
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-7-sonnet-20250219',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.content || !data.content[0] || !data.content[0].text) {
      throw new Error('Invalid response format from Claude API');
    }

    return data.content[0].text;
  } catch (error) {
    return "Unable to generate optimization recommendations due to technical issues.";
  }
}

/**
 * Generate filename for Word report
 */
export function generateWordFilename(analysis: Analysis): string {
  const asins = analysis.products.map(p => p.asin).join('_');
  return `Core 6 Analysis - ${asins}.docx`;
}
