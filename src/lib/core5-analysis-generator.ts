import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { Analysis, Product, ScoreCalculation, PollResult } from './types';

/**
 * Calculate price gaps between products
 */
function calculatePriceGaps(prices: number[]): Array<{ description: string; gap: number }> {
  const gaps = [];
  const sortedPrices = [...prices].sort((a, b) => a - b);
  
  for (let i = 0; i < sortedPrices.length - 1; i++) {
    const gap = sortedPrices[i + 1] - sortedPrices[i];
    if (gap > 0) {
      gaps.push({
        description: `$${sortedPrices[i].toFixed(2)} to $${sortedPrices[i + 1].toFixed(2)} (+$${gap.toFixed(2)})`,
        gap
      });
    }
  }
  
  return gaps;
}

/**
 * Calculate rating gaps between products
 */
function calculateRatingGaps(ratings: number[]): Array<{ description: string; gap: number }> {
  const gaps = [];
  const sortedRatings = [...ratings].sort((a, b) => a - b);
  
  for (let i = 0; i < sortedRatings.length - 1; i++) {
    const gap = sortedRatings[i + 1] - sortedRatings[i];
    if (gap > 0) {
      gaps.push({
        description: `${sortedRatings[i]}★ to ${sortedRatings[i + 1]}★ (+${gap.toFixed(1)}★)`,
        gap
      });
    }
  }
  
  return gaps;
}

/**
 * Calculate shipping gaps between products
 */
function calculateShippingGaps(shippingDays: number[]): Array<{ description: string; gap: number }> {
  const gaps = [];
  const sortedShipping = [...shippingDays].sort((a, b) => a - b);
  
  for (let i = 0; i < sortedShipping.length - 1; i++) {
    const gap = sortedShipping[i + 1] - sortedShipping[i];
    if (gap > 0) {
      gaps.push({
        description: `${sortedShipping[i]} to ${sortedShipping[i + 1]} days (+${gap} days)`,
        gap
      });
    }
  }
  
  return gaps;
}

/**
 * Identify competitive weaknesses
 */
function identifyCompetitiveWeaknesses(
  calculations: ScoreCalculation[],
  pollResults: { mainImage: PollResult | null; imageStack: PollResult | null; features: PollResult | null }
): Array<{ category: string; description: string; impact: 'Low' | 'Medium' | 'High' | 'Critical' }> {
  const weaknesses = [];
  
  // Find products with low scores
  const lowScoringProducts = calculations.filter(c => c.totalScore < 30);
  
  for (const product of lowScoringProducts) {
    if (product.priceScore < 5) {
      weaknesses.push({
        category: 'Pricing',
        description: `Product ${product.productId} has poor price competitiveness (${product.priceScore}/10)`,
        impact: 'High' as const
      });
    }
    
    if (product.shippingScore < 5) {
      weaknesses.push({
        category: 'Shipping',
        description: `Product ${product.productId} has slow shipping (${product.shippingScore}/10)`,
        impact: 'Medium' as const
      });
    }
    
    if (product.reviewScore + product.ratingScore < 10) {
      weaknesses.push({
        category: 'Reviews',
        description: `Product ${product.productId} has poor review performance (${product.reviewScore + product.ratingScore}/20)`,
        impact: 'High' as const
      });
    }
  }
  
  return weaknesses;
}

/**
 * Identify market opportunities
 */
function identifyMarketOpportunities(
  calculations: ScoreCalculation[],
  priceGaps: Array<{ description: string; gap: number }>,
  ratingGaps: Array<{ description: string; gap: number }>,
  shippingGaps: Array<{ description: string; gap: number }>
): Array<{ type: string; description: string; potential: 'Low' | 'Medium' | 'High' }> {
  const opportunities = [];
  
  // Price opportunities
  if (priceGaps.length > 0) {
    const maxPriceGap = Math.max(...priceGaps.map(g => g.gap));
    if (maxPriceGap > 10) {
      opportunities.push({
        type: 'Pricing',
        description: `Large price gap of $${maxPriceGap.toFixed(2)} indicates opportunity for competitive positioning`,
        potential: 'High' as const
      });
    }
  }
  
  // Rating opportunities
  if (ratingGaps.length > 0) {
    const maxRatingGap = Math.max(...ratingGaps.map(g => g.gap));
    if (maxRatingGap > 0.5) {
      opportunities.push({
        type: 'Quality',
        description: `Rating gap of ${maxRatingGap.toFixed(1)} stars indicates opportunity for quality improvement`,
        potential: 'Medium' as const
      });
    }
  }
  
  // Shipping opportunities
  if (shippingGaps.length > 0) {
    const maxShippingGap = Math.max(...shippingGaps.map(g => g.gap));
    if (maxShippingGap > 2) {
      opportunities.push({
        type: 'Logistics',
        description: `Shipping gap of ${maxShippingGap} days indicates opportunity for faster delivery`,
        potential: 'High' as const
      });
    }
  }
  
  return opportunities;
}

/**
 * Generate competitive analysis and market opportunities document for Core 5
 */
export async function generateCore5AnalysisReport(
  analysis: Analysis
): Promise<ArrayBuffer> {
  console.log('Core 5 analysis generator called with:', {
    type: analysis.type,
    productsCount: analysis.products?.length,
    calculationsCount: analysis.calculations?.length,
    pollResultsCount: Object.keys(analysis.pollResults || {}).length
  });

  if (analysis.type !== 'core5') {
    throw new Error('Core 5 analysis reports are only available for Core 5 analysis');
  }
  
  const { products, calculations, pollResults } = analysis;
  
  if (products.length === 0) {
    throw new Error('No products found in Core 5 analysis');
  }
  
  if (!calculations || calculations.length === 0) {
    throw new Error('No calculations found in Core 5 analysis');
  }
  
  // Generate market opportunity analysis
  let marketAnalysis;
  try {
    marketAnalysis = await generateMarketOpportunityAnalysis(analysis, pollResults);
  } catch (error) {
    console.error('Market analysis generation failed, using fallback:', error);
    marketAnalysis = "Market opportunity analysis could not be generated at this time. Please try again later.";
  }
  
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          // Header Section
          new Paragraph({
            children: [
              new TextRun({
                text: `Competitive Analysis & Market Opportunities`,
                bold: true,
                size: 32
              })
            ],
            heading: HeadingLevel.TITLE,
            spacing: { after: 400 }
          }),
          
          // Market Analysis Section
          new Paragraph({
            children: [
              new TextRun({
                text: "Market Opportunity Analysis",
                bold: true,
                size: 24
              })
            ],
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 }
          }),
          
          ...formatMarketAnalysis(marketAnalysis)
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
 * Generate market opportunity analysis
 */
export async function generateMarketOpportunityAnalysis(
  analysis: Analysis,
  pollResults: {
    mainImage: PollResult | null;
    imageStack: PollResult | null;
    features: PollResult | null;
  }
): Promise<string> {
  const { products, calculations } = analysis;
  
  // Check if API key is available
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('ANTHROPIC_API_KEY not found, using fallback analysis');
    // Don't throw error, just use fallback
  }

  // Only try API call if key is available
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      // Use direct Anthropic API call instead of internal endpoint
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY!,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-7-sonnet-20250219',
          max_tokens: 4000,
          messages: [
            {
              role: 'user',
              content: `Generate a comprehensive market opportunity analysis for the following competitive data:

PRODUCTS ANALYZED:
${products.map(p => `- ${p.name} (${p.asin}): $${p.price}, ${p.shippingDays} days, ${p.rating}★ (${p.reviewCount} reviews)`).join('\n')}

SCORE BREAKDOWN:
${calculations.map(c => {
  const product = products.find(p => p.id === c.productId);
  return `- ${product?.name || c.productId}: Total ${c.totalScore}/50 (Price: ${c.priceScore}/10, Shipping: ${c.shippingScore}/10, Reviews: ${c.reviewScore + c.ratingScore}/20, Images: ${c.mainImageScore + c.imageStackScore}/20, Features: ${c.featuresScore}/10)`;
}).join('\n')}

POLL RESULTS:
${pollResults.mainImage ? `Main Image Poll: ${pollResults.mainImage.rankings.map(r => `${r.percentage}% prefer product ${r.productId}`).join(', ')}` : 'No main image poll data'}
${pollResults.imageStack ? `Image Stack Poll: ${pollResults.imageStack.rankings.map(r => `${r.percentage}% prefer product ${r.productId}`).join(', ')}` : 'No image stack poll data'}
${pollResults.features ? `Features Poll: ${pollResults.features.rankings.map(r => `${r.percentage}% prefer product ${r.productId}`).join(', ')}` : 'No features poll data'}

Please provide a detailed market opportunity analysis including:
1. Competitive landscape overview
2. Key market gaps and opportunities
3. Strategic recommendations
4. Implementation roadmap

Focus on actionable insights based on the data provided.`
            }
          ]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Anthropic API failed: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      
      if (!result.content || !result.content[0] || !result.content[0].text) {
        throw new Error('Invalid response format from Anthropic API');
      }
      
      return result.content[0].text;
    } catch (error) {
      console.error('Anthropic API call failed:', error);
      // Fall through to fallback
    }
  }
  
  // Fallback analysis when API key is not available or API call fails
  try {
    // Enhanced fallback analysis when API is not available
    const sortedProducts = analysis.calculations.sort((a, b) => b.totalScore - a.totalScore);
    const topProduct = sortedProducts[0];
    const bottomProduct = sortedProducts[sortedProducts.length - 1];
    const topProductData = analysis.products.find(p => p.id === topProduct.productId);
    const bottomProductData = analysis.products.find(p => p.id === bottomProduct.productId);
    
    return `MARKET OPPORTUNITY ANALYSIS

COMPETITIVE LANDSCAPE OVERVIEW:
Based on the analysis of ${analysis.products.length} products, we've identified key market opportunities and competitive gaps.

TOP PERFORMER ANALYSIS:
- Highest scoring product: ${topProductData?.asin || topProduct.productId} (Score: ${topProduct.totalScore}/50)
- Key strengths: Price optimization, shipping efficiency, review management
- Market position: Strong competitive advantage

BOTTOM PERFORMER ANALYSIS:
- Lowest scoring product: ${bottomProductData?.asin || bottomProduct.productId} (Score: ${bottomProduct.totalScore}/50)
- Key weaknesses: Pricing strategy, shipping times, review management
- Improvement opportunities: Significant potential for optimization

STRATEGIC RECOMMENDATIONS:
1. PRICING STRATEGY: Analyze top performer's pricing model and implement competitive pricing
2. SHIPPING OPTIMIZATION: Reduce shipping times to match or beat top performers
3. REVIEW MANAGEMENT: Implement strategies to improve review scores and volume
4. COMPETITIVE POSITIONING: Focus on areas where competitors are weakest

IMPLEMENTATION ROADMAP:
- Phase 1: Immediate pricing adjustments based on top performer analysis
- Phase 2: Shipping optimization and logistics improvements
- Phase 3: Review and rating enhancement strategies
- Phase 4: Continuous monitoring and competitive response

Note: This analysis is based on available data. For more detailed AI-powered insights, please configure your Anthropic API key.`;
  } catch (error) {
    console.error('Fallback analysis generation failed:', error);
    return "Unable to generate market opportunity analysis due to technical issues.";
  }
}

/**
 * Format market analysis text into document paragraphs
 */
function formatMarketAnalysis(analysis: string): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  
  // Split the analysis into sections
  const sections = analysis.split(/\n(?=[A-Z][A-Z\s&:]+:)/);
  
  for (const section of sections) {
    const trimmedSection = section.trim();
    if (!trimmedSection) continue;
    
    if (trimmedSection.startsWith('COMPETITIVE LANDSCAPE OVERVIEW:')) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "COMPETITIVE LANDSCAPE OVERVIEW:",
              bold: true
            })
          ],
          spacing: { after: 300 }
        })
      );
      
      const content = trimmedSection.replace('COMPETITIVE LANDSCAPE OVERVIEW:', '').trim();
      if (content) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: content
              })
            ],
            spacing: { after: 300 }
          })
        );
      }
    } else if (trimmedSection.startsWith('TOP PERFORMER ANALYSIS:')) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "TOP PERFORMER ANALYSIS:",
              bold: true
            })
          ],
          spacing: { after: 300 }
        })
      );
      
      const content = trimmedSection.replace('TOP PERFORMER ANALYSIS:', '').trim();
      const items = content.split('\n').filter(line => line.trim().startsWith('-'));
      
      for (const item of items) {
        const cleanItem = item.trim().replace(/^-\s*/, '');
        paragraphs.push(createBulletPoint(cleanItem));
      }
    } else if (trimmedSection.startsWith('BOTTOM PERFORMER ANALYSIS:')) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "BOTTOM PERFORMER ANALYSIS:",
              bold: true
            })
          ],
          spacing: { after: 300 }
        })
      );
      
      const content = trimmedSection.replace('BOTTOM PERFORMER ANALYSIS:', '').trim();
      const items = content.split('\n').filter(line => line.trim().startsWith('-'));
      
      for (const item of items) {
        const cleanItem = item.trim().replace(/^-\s*/, '');
        paragraphs.push(createBulletPoint(cleanItem));
      }
    } else if (trimmedSection.startsWith('STRATEGIC RECOMMENDATIONS:')) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "STRATEGIC RECOMMENDATIONS:",
              bold: true
            })
          ],
          spacing: { after: 300 }
        })
      );
      
      const content = trimmedSection.replace('STRATEGIC RECOMMENDATIONS:', '').trim();
      const items = content.split('\n').filter(line => line.trim().match(/^\d+\./));
      
      for (const item of items) {
        const cleanItem = item.trim();
        paragraphs.push(createBulletPoint(cleanItem));
      }
    } else if (trimmedSection.startsWith('IMPLEMENTATION ROADMAP:')) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "IMPLEMENTATION ROADMAP:",
              bold: true
            })
          ],
          spacing: { after: 300 }
        })
      );
      
      const content = trimmedSection.replace('IMPLEMENTATION ROADMAP:', '').trim();
      const items = content.split('\n').filter(line => line.trim().startsWith('-'));
      
      for (const item of items) {
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
            text: analysis
          })
        ],
        spacing: { after: 300 }
      })
    );
  }
  
  return paragraphs;
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
 * Generate filename for Core 5 analysis report
 */
export function generateCore5AnalysisFilename(analysis: Analysis): string {
  const asins = analysis.products.map(p => p.asin).join('_');
  return `Core 5 Market Analysis - ${asins}.docx`;
}
