import { NextRequest, NextResponse } from 'next/server';
import { extractDataFromScreenshot, validateOCRExtraction } from '@/lib/ocr';

export async function POST(request: NextRequest) {
  try {
    const { image, mediaType } = await request.json();

    if (!image) {
      return NextResponse.json(
        { error: 'No image provided' },
        { status: 400 }
      );
    }

    const extractedData = await extractDataFromScreenshot(image, mediaType || 'image/jpeg');
    
    if (!validateOCRExtraction(extractedData)) {
      return NextResponse.json(
        { error: 'Invalid OCR extraction results' },
        { status: 400 }
      );
    }

    return NextResponse.json(extractedData);

  } catch (error: unknown) {
    console.error('OCR API error:', error);
    
    // Determine appropriate status code based on error type
    let statusCode = 500;
    if (error instanceof Error && (error.message?.includes('Invalid or blank image') ||
        error.message?.includes('Invalid image provided'))) {
      statusCode = 400; // Client error for invalid images
    } else if (error instanceof Error && error.message?.includes('API authentication failed')) {
      statusCode = 401; // Authentication error
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'OCR extraction failed' },
      { status: statusCode }
    );
  }
}
