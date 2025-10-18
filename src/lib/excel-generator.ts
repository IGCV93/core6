import ExcelJS from 'exceljs';
import { Analysis } from './types';

/**
 * Generate Excel report with exact formatting from the PRD
 */
export async function generateExcelReport(analysis: Analysis): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Analysis');
  
  const { products, calculations } = analysis;
  
  // Set column headers with actual product names
  const headers = ['Category', ...products.map(p => p.name)];
  worksheet.addRow(headers);
  
  // Apply header formatting
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, name: 'Calibri', size: 11 };
  headerRow.alignment = { horizontal: 'left' };
  
  // Set column widths
  worksheet.getColumn(1).width = 25; // Category column
  products.forEach((_, index) => {
    worksheet.getColumn(index + 2).width = 15;
  });
  
  let currentRow = 2;
  
  // SECTION 1: Price Competitiveness
  worksheet.addRow(['Price Competitiveness (10)', ...products.map(p => `$${p.price.toFixed(2)}`)]);
  const priceDataRow = worksheet.getRow(currentRow);
  priceDataRow.eachCell((cell, colNumber) => {
    if (colNumber > 1) { // Skip category column
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF00' } }; // Yellow
    }
  });
  currentRow++;
  
  worksheet.addRow(['Score', ...calculations.map(c => c.priceScore)]);
  const priceScoreRow = worksheet.getRow(currentRow);
  priceScoreRow.eachCell((cell, colNumber) => {
    cell.alignment = { horizontal: 'center' };
    if (colNumber > 1) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF' } }; // White
    }
  });
  currentRow++;
  
  // Black separator row
  worksheet.addRow(new Array(headers.length).fill(''));
  const separatorRow1 = worksheet.getRow(currentRow);
  separatorRow1.height = 3;
  separatorRow1.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '000000' } }; // Black
  });
  currentRow++;
  
  // SECTION 2: Shipping Speed
  worksheet.addRow(['Shipping Speed (10) zip code - 07731', ...products.map(p => `${p.shippingDays} days`)]);
  const shippingDataRow = worksheet.getRow(currentRow);
  shippingDataRow.eachCell((cell, colNumber) => {
    if (colNumber > 1) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF00' } }; // Yellow
    }
  });
  currentRow++;
  
  worksheet.addRow(['Score', ...calculations.map(c => c.shippingScore)]);
  const shippingScoreRow = worksheet.getRow(currentRow);
  shippingScoreRow.eachCell((cell, colNumber) => {
    cell.alignment = { horizontal: 'center' };
    if (colNumber > 1) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF' } }; // White
    }
  });
  currentRow++;
  
  // Black separator row
  worksheet.addRow(new Array(headers.length).fill(''));
  const separatorRow2 = worksheet.getRow(currentRow);
  separatorRow2.height = 3;
  separatorRow2.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '000000' } }; // Black
  });
  currentRow++;
  
  // SECTION 3: Number of Reviews
  worksheet.addRow(['Number of Reviews (30)', ...products.map(p => p.reviewCount.toString())]);
  const reviewDataRow = worksheet.getRow(currentRow);
  reviewDataRow.eachCell((cell, colNumber) => {
    if (colNumber > 1) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF00' } }; // Yellow
    }
  });
  currentRow++;
  
  worksheet.addRow(['Score', ...calculations.map(c => c.reviewScore)]);
  const reviewScoreRow = worksheet.getRow(currentRow);
  reviewScoreRow.eachCell((cell, colNumber) => {
    cell.alignment = { horizontal: 'center' };
    if (colNumber > 1) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF' } }; // White
    }
  });
  currentRow++;
  
  // Black separator row
  worksheet.addRow(new Array(headers.length).fill(''));
  const separatorRow3 = worksheet.getRow(currentRow);
  separatorRow3.height = 3;
  separatorRow3.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '000000' } }; // Black
  });
  currentRow++;
  
  // SECTION 4: Review Quality
  worksheet.addRow(['Review Quality (30)', ...products.map(p => p.rating.toString())]);
  const ratingDataRow = worksheet.getRow(currentRow);
  ratingDataRow.eachCell((cell, colNumber) => {
    if (colNumber > 1) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF00' } }; // Yellow
    }
  });
  currentRow++;
  
  worksheet.addRow(['Score', ...calculations.map(c => c.ratingScore)]);
  const ratingScoreRow = worksheet.getRow(currentRow);
  ratingScoreRow.eachCell((cell, colNumber) => {
    cell.alignment = { horizontal: 'center' };
    if (colNumber > 1) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF' } }; // White
    }
  });
  currentRow++;
  
  // Black separator row
  worksheet.addRow(new Array(headers.length).fill(''));
  const separatorRow4 = worksheet.getRow(currentRow);
  separatorRow4.height = 3;
  separatorRow4.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '000000' } }; // Black
  });
  currentRow++;
  
  // SECTION 5: Images (EXACT ORDER)
  // Get rankings from poll results
  const mainImageRankings = analysis.pollResults.mainImage?.rankings || [];
  const imageStackRankings = analysis.pollResults.imageStack?.rankings || [];
  
  worksheet.addRow(['MAIN IMAGE (10)', ...products.map(p => {
    const ranking = mainImageRankings.find(r => r.productId === p.id);
    return ranking ? `#${ranking.rank}` : '#6';
  })]);
  const mainImageDataRow = worksheet.getRow(currentRow);
  mainImageDataRow.eachCell((cell, colNumber) => {
    if (colNumber > 1) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF00' } }; // Yellow
    }
  });
  currentRow++;
  
  worksheet.addRow(['IMAGES STACK (10)', ...products.map(p => {
    const ranking = imageStackRankings.find(r => r.productId === p.id);
    return ranking ? `#${ranking.rank}` : '#6';
  })]);
  const imageStackDataRow = worksheet.getRow(currentRow);
  imageStackDataRow.eachCell((cell, colNumber) => {
    if (colNumber > 1) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF00' } }; // Yellow
    }
  });
  currentRow++;
  
  worksheet.addRow(['Score Main', ...calculations.map(c => c.mainImageScore)]);
  const mainImageScoreRow = worksheet.getRow(currentRow);
  mainImageScoreRow.eachCell((cell, colNumber) => {
    cell.alignment = { horizontal: 'center' };
    if (colNumber > 1) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF' } }; // White
    }
  });
  currentRow++;
  
  worksheet.addRow(['Score Stack', ...calculations.map(c => c.imageStackScore)]);
  const imageStackScoreRow = worksheet.getRow(currentRow);
  imageStackScoreRow.eachCell((cell, colNumber) => {
    cell.alignment = { horizontal: 'center' };
    if (colNumber > 1) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF' } }; // White
    }
  });
  currentRow++;
  
  worksheet.addRow(['Total Image Score', ...calculations.map(c => c.mainImageScore + c.imageStackScore)]);
  const totalImageScoreRow = worksheet.getRow(currentRow);
  totalImageScoreRow.eachCell((cell, colNumber) => {
    cell.alignment = { horizontal: 'center' };
    if (colNumber > 1) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF' } }; // White
    }
  });
  currentRow++;
  
  // Black separator row
  worksheet.addRow(new Array(headers.length).fill(''));
  const separatorRow5 = worksheet.getRow(currentRow);
  separatorRow5.height = 3;
  separatorRow5.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '000000' } }; // Black
  });
  currentRow++;
  
  // SECTION 6: Features
  const featuresRankings = analysis.pollResults.features?.rankings || [];
  worksheet.addRow(['FEATURES & FUNCTIONALITY (30)', ...products.map(p => {
    const ranking = featuresRankings.find(r => r.productId === p.id);
    return ranking ? `#${ranking.rank}` : '#6';
  })]);
  const featuresDataRow = worksheet.getRow(currentRow);
  featuresDataRow.eachCell((cell, colNumber) => {
    if (colNumber > 1) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF00' } }; // Yellow
    }
  });
  currentRow++;
  
  worksheet.addRow(['Score', ...calculations.map(c => c.featuresScore)]);
  const featuresScoreRow = worksheet.getRow(currentRow);
  featuresScoreRow.eachCell((cell, colNumber) => {
    cell.alignment = { horizontal: 'center' };
    if (colNumber > 1) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF' } }; // White
    }
  });
  currentRow++;
  
  // Black separator row
  worksheet.addRow(new Array(headers.length).fill(''));
  const separatorRow6 = worksheet.getRow(currentRow);
  separatorRow6.height = 3;
  separatorRow6.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '000000' } }; // Black
  });
  currentRow++;
  
  // FINAL ROW: Total Score
  worksheet.addRow(['Total Score (130)', ...calculations.map(c => c.totalScore)]);
  const totalScoreRow = worksheet.getRow(currentRow);
  totalScoreRow.eachCell((cell, colNumber) => {
    cell.font = { bold: true, name: 'Calibri', size: 11 };
    cell.alignment = { horizontal: 'center' };
    if (colNumber > 1) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF' } }; // White
    }
  });
  
  // Generate filename (used in download)
  // const asins = products.map(p => p.asin).join('_');
  // const filename = type === 'core5' 
  //   ? `Core 5 Calculator - ${asins}.xlsx`
  //   : `Core 6 Calculator - ${asins}.xlsx`;
  
  // Convert to buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}

/**
 * Generate filename for Excel report
 */
export function generateExcelFilename(analysis: Analysis): string {
  const asins = analysis.products.map(p => p.asin).join('_');
  return analysis.type === 'core5' 
    ? `Core 5 Calculator - ${asins}.xlsx`
    : `Core 6 Calculator - ${asins}.xlsx`;
}
