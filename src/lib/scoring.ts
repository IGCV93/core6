import { Product, ScoreCalculation, PollResult } from './types';

/**
 * Calculate price score based on percentage over lowest price
 * Formula: percentage_over_lowest = ((Product_Price / Lowest_Price) - 1) × 100
 */
export function calculatePriceScore(products: Product[]): Record<string, number> {
  const prices = products.map(p => p.price);
  const lowestPrice = Math.min(...prices);
  
  const scores: Record<string, number> = {};
  
  products.forEach(product => {
    const percentageOverLowest = ((product.price / lowestPrice) - 1) * 100;
    
    let score = 0;
    if (percentageOverLowest <= 0) score = 10; // Lowest price
    else if (percentageOverLowest <= 1) score = 9;
    else if (percentageOverLowest <= 3) score = 8;
    else if (percentageOverLowest <= 5) score = 7;
    else if (percentageOverLowest <= 8) score = 6;
    else if (percentageOverLowest <= 15) score = 5;
    else if (percentageOverLowest <= 20) score = 4;
    else if (percentageOverLowest <= 25) score = 3;
    else if (percentageOverLowest <= 30) score = 2;
    else if (percentageOverLowest <= 35) score = 1;
    else score = 0; // >35%
    
    scores[product.id] = score;
  });
  
  return scores;
}

/**
 * Calculate shipping score based on absolute days from same-day delivery
 * Formula: score based on absolute shipping days (0=same day, 1=next day, etc.)
 */
export function calculateShippingScore(products: Product[]): Record<string, number> {
  const scores: Record<string, number> = {};
  
  products.forEach(product => {
    const shippingDays = product.shippingDays;
    
    let score = 0;
    if (shippingDays <= 0) score = 10; // Same day or fastest
    else if (shippingDays <= 1) score = 9; // Within 1 day
    else if (shippingDays <= 2) score = 8; // Within 2 days
    else if (shippingDays <= 3) score = 7; // Within 3 days
    else if (shippingDays <= 4) score = 6; // Within 4 days
    else if (shippingDays <= 5) score = 5; // Within 5 days
    else if (shippingDays <= 8) score = 4; // Within 6-8 days
    else if (shippingDays <= 10) score = 3; // Within 8-10 days
    else if (shippingDays <= 12) score = 2; // Within 10-12 days
    else if (shippingDays <= 14) score = 1; // Within 12-14 days
    else score = 0; // 14+ days slower
    
    scores[product.id] = score;
  });
  
  return scores;
}

/**
 * Calculate review count score based on thresholds
 */
export function calculateReviewScore(products: Product[]): Record<string, number> {
  const scores: Record<string, number> = {};
  
  products.forEach(product => {
    const count = product.reviewCount;
    
    let score = 0;
    if (count >= 1000) score = 30;
    else if (count >= 950) score = 29;
    else if (count >= 900) score = 28;
    else if (count >= 850) score = 27;
    else if (count >= 800) score = 26;
    else if (count >= 750) score = 25;
    else if (count >= 700) score = 24;
    else if (count >= 650) score = 23;
    else if (count >= 600) score = 22;
    else if (count >= 550) score = 21;
    else if (count >= 500) score = 20;
    else if (count >= 450) score = 19;
    else if (count >= 400) score = 18;
    else if (count >= 350) score = 17;
    else if (count >= 300) score = 16;
    else if (count >= 250) score = 15;
    else if (count >= 225) score = 14;
    else if (count >= 200) score = 13;
    else if (count >= 175) score = 12;
    else if (count >= 150) score = 11;
    else if (count >= 125) score = 10;
    else if (count >= 100) score = 9;
    else if (count >= 80) score = 8;
    else if (count >= 60) score = 7;
    else if (count >= 40) score = 6;
    else if (count >= 30) score = 5;
    else if (count >= 20) score = 4;
    else if (count >= 10) score = 3;
    else if (count >= 5) score = 2;
    else if (count >= 1) score = 1;
    else score = 0; // 0 reviews
    
    scores[product.id] = score;
  });
  
  return scores;
}

/**
 * Calculate rating score based on star rating
 */
export function calculateRatingScore(products: Product[]): Record<string, number> {
  const scores: Record<string, number> = {};
  
  products.forEach(product => {
    const rating = product.rating;
    
    let score = 0;
    if (rating >= 5.0) score = 30;
    else if (rating >= 4.9) score = 29;
    else if (rating >= 4.8) score = 28;
    else if (rating >= 4.7) score = 27;
    else if (rating >= 4.6) score = 26;
    else if (rating >= 4.5) score = 25;
    else if (rating >= 4.4) score = 24;
    else if (rating >= 4.3) score = 23;
    else if (rating >= 4.2) score = 22;
    else if (rating >= 4.1) score = 21;
    else if (rating >= 4.0) score = 20;
    else if (rating >= 3.9) score = 19;
    else if (rating >= 3.8) score = 18;
    else if (rating >= 3.7) score = 17;
    else if (rating >= 3.6) score = 16;
    else if (rating >= 3.5) score = 15;
    else if (rating >= 3.4) score = 14;
    else if (rating >= 3.3) score = 13;
    else if (rating >= 3.2) score = 12;
    else if (rating >= 3.1) score = 11;
    else if (rating >= 3.0) score = 10;
    else if (rating >= 2.9) score = 9;
    else if (rating >= 2.8) score = 8;
    else if (rating >= 2.7) score = 7;
    else if (rating >= 2.6) score = 6;
    else if (rating >= 2.5) score = 5;
    else if (rating >= 2.4) score = 4;
    else if (rating >= 2.3) score = 3;
    else if (rating >= 2.2) score = 2;
    else if (rating >= 2.1) score = 1;
    else score = 0; // ≤2.0 stars
    
    scores[product.id] = score;
  });
  
  return scores;
}

/**
 * Calculate image score based on poll ranking
 * Main Image: 1st=10, 2nd=8, 3rd=6, 4th=4, 5th=2, 6th=0
 */
export function calculateImageScore(products: Product[], pollResult: PollResult | null): Record<string, number> {
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
 * Calculate features score based on poll ranking
 * Features: 1st=30, 2nd=25, 3rd=20, 4th=15, 5th=10, 6th=5
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
      case 1: score = 30; break;
      case 2: score = 25; break;
      case 3: score = 20; break;
      case 4: score = 15; break;
      case 5: score = 10; break;
      case 6: 
      default: score = 5; break;
    }
    
    scores[product.id] = score;
  });
  
  return scores;
}

/**
 * Calculate all scores and return complete score calculations
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
  const mainImageScores = calculateImageScore(products, mainImagePoll);
  const imageStackScores = calculateImageScore(products, imageStackPoll);
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
