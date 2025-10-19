import { Product, ScoreCalculation, PollResult } from './types';

/**
 * Calculate price score based on percentage over lowest price
 * Formula: percentage_over_lowest = ((Product_Price / Lowest_Price) - 1) × 100
 * NEW SCORING: 30 points maximum (was 10)
 */
export function calculatePriceScore(products: Product[]): Record<string, number> {
  const prices = products.map(p => p.price);
  const lowestPrice = Math.min(...prices);
  
  const scores: Record<string, number> = {};
  
  products.forEach(product => {
    const percentageOverLowest = ((product.price / lowestPrice) - 1) * 100;
    
    let score = 0;
    if (percentageOverLowest <= 0) score = 30; // Lowest price (was 10)
    else if (percentageOverLowest <= 1) score = 27; // Within 1% (was 9)
    else if (percentageOverLowest <= 3) score = 24; // Within 2-3% (was 8)
    else if (percentageOverLowest <= 5) score = 21; // Within 4-5% (was 7)
    else if (percentageOverLowest <= 8) score = 18; // Within 6-8% (was 6)
    else if (percentageOverLowest <= 15) score = 15; // Within 9-15% (was 5)
    else if (percentageOverLowest <= 20) score = 12; // Within 16-20% (was 4)
    else if (percentageOverLowest <= 25) score = 9; // Within 21-25% (was 3)
    else if (percentageOverLowest <= 30) score = 6; // Within 26-30% (was 2)
    else if (percentageOverLowest <= 35) score = 3; // Within 31-35% (was 1)
    else score = 0; // >35% (unchanged)
    
    scores[product.id] = score;
  });
  
  return scores;
}

/**
 * Calculate shipping score based on absolute days from same-day delivery
 * Formula: score based on absolute shipping days (0=same day, 1=next day, etc.)
 * NEW SCORING: 15 points maximum (was 10), 8-day cutoff (anything beyond 8 days = 0)
 */
export function calculateShippingScore(products: Product[]): Record<string, number> {
  const scores: Record<string, number> = {};
  
  products.forEach(product => {
    const shippingDays = product.shippingDays;
    
    let score = 0;
    if (shippingDays <= 0) score = 15; // Same day or fastest (was 10)
    else if (shippingDays <= 1) score = 13; // Within 1 day (was 9)
    else if (shippingDays <= 2) score = 11; // Within 2 days (was 8)
    else if (shippingDays <= 3) score = 9; // Within 3 days (was 7)
    else if (shippingDays <= 4) score = 7; // Within 4 days (was 6)
    else if (shippingDays <= 5) score = 5; // Within 5 days (unchanged)
    else if (shippingDays <= 6) score = 3; // Within 6 days (was 4 for 6-8 days)
    else if (shippingDays <= 8) score = 1; // Within 7-8 days (was 3 for 8-10 days)
    else score = 0; // Beyond 8 days (NEW: anything over 8 days = 0)
    
    scores[product.id] = score;
  });
  
  return scores;
}

/**
 * Calculate review count score based on thresholds
 * NEW SCORING: 10 points maximum (was 30), simplified from 31 tiers to 11 tiers
 */
export function calculateReviewScore(products: Product[]): Record<string, number> {
  const scores: Record<string, number> = {};
  
  products.forEach(product => {
    const count = product.reviewCount;
    
    let score = 0;
    if (count >= 1000) score = 10; // 1000+ reviews (was 30)
    else if (count >= 750) score = 9; // 750-999 reviews (was 25)
    else if (count >= 500) score = 8; // 500-749 reviews (was 20)
    else if (count >= 300) score = 7; // 300-499 reviews (was 16)
    else if (count >= 200) score = 6; // 200-299 reviews (was 13)
    else if (count >= 100) score = 5; // 100-199 reviews (was 9)
    else if (count >= 50) score = 4; // 50-99 reviews (was 6)
    else if (count >= 25) score = 3; // 25-49 reviews (was 4)
    else if (count >= 10) score = 2; // 10-24 reviews (was 3)
    else if (count >= 5) score = 1; // 5-9 reviews (was 2)
    else score = 0; // <5 reviews (unchanged)
    
    scores[product.id] = score;
  });
  
  return scores;
}

/**
 * Calculate rating score based on star rating
 * NEW SCORING: 15 points maximum (was 30), 3.5 star cutoff (anything ≤3.5 stars = 0)
 */
export function calculateRatingScore(products: Product[]): Record<string, number> {
  const scores: Record<string, number> = {};
  
  products.forEach(product => {
    const rating = product.rating;
    
    let score = 0;
    if (rating >= 5.0) score = 15; // 5.0 stars (was 30)
    else if (rating >= 4.9) score = 14; // 4.9 stars (was 29)
    else if (rating >= 4.8) score = 13; // 4.8 stars (was 28)
    else if (rating >= 4.7) score = 12; // 4.7 stars (was 27)
    else if (rating >= 4.6) score = 11; // 4.6 stars (was 26)
    else if (rating >= 4.5) score = 10; // 4.5 stars (was 25)
    else if (rating >= 4.4) score = 9; // 4.4 stars (was 24)
    else if (rating >= 4.3) score = 8; // 4.3 stars (was 23)
    else if (rating >= 4.2) score = 7; // 4.2 stars (was 22)
    else if (rating >= 4.1) score = 6; // 4.1 stars (was 21)
    else if (rating >= 4.0) score = 5; // 4.0 stars (was 20)
    else if (rating >= 3.9) score = 4; // 3.9 stars (was 19)
    else if (rating >= 3.8) score = 3; // 3.8 stars (was 18)
    else if (rating >= 3.7) score = 2; // 3.7 stars (was 17)
    else if (rating >= 3.6) score = 1; // 3.6 stars (was 16)
    else score = 0; // ≤3.5 stars (NEW: harsh cutoff at 3.5 stars)
    
    scores[product.id] = score;
  });
  
  return scores;
}

/**
 * Calculate main image score based on poll ranking
 * Main Image: 1st=10, 2nd=8, 3rd=6, 4th=4, 5th=2, 6th=0 (UNCHANGED)
 */
export function calculateMainImageScore(products: Product[], pollResult: PollResult | null): Record<string, number> {
  const scores: Record<string, number> = {};
  
  if (!pollResult) {
    products.forEach(product => {
      scores[product.id] = 0;
    });
    return scores;
  }
  
  products.forEach(product => {
    const ranking = pollResult.rankings.find(r => r.productId === product.id);
    if (!ranking) {
      scores[product.id] = 0;
      return;
    }
    
    let score = 0;
    switch (ranking.rank) {
      case 1: score = 10; break;
      case 2: score = 8; break;
      case 3: score = 6; break;
      case 4: score = 4; break;
      case 5: score = 2; break;
      case 6: 
      default: score = 0; break;
    }
    
    scores[product.id] = score;
  });
  
  return scores;
}

/**
 * Calculate image stack score based on poll ranking
 * NEW SCORING: 5 points maximum (was 10)
 */
export function calculateImageStackScore(products: Product[], pollResult: PollResult | null): Record<string, number> {
  const scores: Record<string, number> = {};
  
  if (!pollResult) {
    products.forEach(product => {
      scores[product.id] = 0;
    });
    return scores;
  }
  
  products.forEach(product => {
    const ranking = pollResult.rankings.find(r => r.productId === product.id);
    if (!ranking) {
      scores[product.id] = 0;
      return;
    }
    
    let score = 0;
    switch (ranking.rank) {
      case 1: score = 5; break; // 1st place (was 10)
      case 2: score = 4; break; // 2nd place (was 8)
      case 3: score = 3; break; // 3rd place (was 6)
      case 4: score = 2; break; // 4th place (was 4)
      case 5: score = 1; break; // 5th place (was 2)
      case 6: 
      default: score = 0; break; // 6th place (unchanged)
    }
    
    scores[product.id] = score;
  });
  
  return scores;
}

/**
 * Calculate features score based on poll ranking
 * NEW SCORING: 15 points maximum (was 30), 0 points for last place (was 5)
 */
export function calculateFeaturesScore(products: Product[], pollResult: PollResult | null): Record<string, number> {
  const scores: Record<string, number> = {};
  
  if (!pollResult) {
    products.forEach(product => {
      scores[product.id] = 0;
    });
    return scores;
  }
  
  products.forEach(product => {
    const ranking = pollResult.rankings.find(r => r.productId === product.id);
    if (!ranking) {
      scores[product.id] = 0;
      return;
    }
    
    let score = 0;
    switch (ranking.rank) {
      case 1: score = 15; break; // 1st place (was 30)
      case 2: score = 12; break; // 2nd place (was 25)
      case 3: score = 9; break; // 3rd place (was 20)
      case 4: score = 6; break; // 4th place (was 15)
      case 5: score = 3; break; // 5th place (was 10)
      case 6: 
      default: score = 0; break; // 6th place (was 5, now 0)
    }
    
    scores[product.id] = score;
  });
  
  return scores;
}

/**
 * Calculate all scores and return complete score calculations
 * NEW TOTAL MAXIMUM: 100 points (was 130 points)
 * Price: 30, Shipping: 15, Reviews: 10, Rating: 15, Main Image: 10, Image Stack: 5, Features: 15
 */
export function calculateAllScores(
  products: Product[],
  mainImagePoll: PollResult | null,
  imageStackPoll: PollResult | null,
  featuresPoll: PollResult | null
): ScoreCalculation[] {
  
  const priceScores = calculatePriceScore(products);
  const shippingScores = calculateShippingScore(products);
  const reviewScores = calculateReviewScore(products);
  const ratingScores = calculateRatingScore(products);
  const mainImageScores = calculateMainImageScore(products, mainImagePoll);
  const imageStackScores = calculateImageStackScore(products, imageStackPoll);
  const featuresScores = calculateFeaturesScore(products, featuresPoll);
  
  const calculations = products.map(product => {
    const totalScore = 
      priceScores[product.id] +
      shippingScores[product.id] +
      reviewScores[product.id] +
      ratingScores[product.id] +
      mainImageScores[product.id] +
      imageStackScores[product.id] +
      featuresScores[product.id];
    
    
    return {
      productId: product.id,
      priceScore: priceScores[product.id],
      shippingScore: shippingScores[product.id],
      reviewScore: reviewScores[product.id],
      ratingScore: ratingScores[product.id],
      mainImageScore: mainImageScores[product.id],
      imageStackScore: imageStackScores[product.id],
      featuresScore: featuresScores[product.id],
      totalScore
    };
  });
  
  return calculations;
}

/**
 * Triple-check calculation accuracy
 */
export function validateCalculations(calculations: ScoreCalculation[]): boolean {
  return calculations.every(calc => {
    const expectedTotal = 
      calc.priceScore + 
      calc.shippingScore + 
      calc.reviewScore + 
      calc.ratingScore + 
      calc.mainImageScore + 
      calc.imageStackScore + 
      calc.featuresScore;
    
    return expectedTotal === calc.totalScore;
  });
}
