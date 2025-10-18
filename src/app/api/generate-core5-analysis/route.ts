import { NextRequest, NextResponse } from 'next/server';
import { generateCore5AnalysisReport, generateCore5AnalysisFilename } from '@/lib/core5-analysis-generator';

export async function POST(request: NextRequest) {
  try {
    const { analysis } = await request.json();
    console.log('Core 5 API called with analysis:', {
      type: analysis?.type,
      productsCount: analysis?.products?.length,
      calculationsCount: analysis?.calculations?.length
    });

    if (!analysis) {
      return NextResponse.json(
        { error: 'Analysis data is required' },
        { status: 400 }
      );
    }

    if (analysis.type !== 'core5') {
      return NextResponse.json(
        { error: 'Only Core 5 analysis is supported for this endpoint' },
        { status: 400 }
      );
    }

    const buffer = await generateCore5AnalysisReport(analysis);
    const filename = generateCore5AnalysisFilename(analysis);

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error) {
    console.error('Core 5 API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate Core 5 analysis report',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
