import { NextRequest, NextResponse } from 'next/server';
import { generateWordReport, WordReportOptions } from '@/lib/word-generator';
import { Analysis } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const analysis: Analysis = body.analysis || body;
    const options: WordReportOptions = {
      preparedBy: body.preparedBy,
      productCategory: body.productCategory
    };

    if (analysis.type !== 'core6') {
      return NextResponse.json(
        { error: 'Word reports are only available for Core 6 analysis' },
        { status: 400 }
      );
    }

    if (!analysis.products || analysis.products.length === 0) {
      return NextResponse.json(
        { error: 'No products provided' },
        { status: 400 }
      );
    }

    if (!analysis.calculations || analysis.calculations.length === 0) {
      return NextResponse.json(
        { error: 'No calculations provided' },
        { status: 400 }
      );
    }

    const wordBuffer = await generateWordReport(analysis, options);

    return new NextResponse(wordBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="analysis.docx"`,
      },
    });

  } catch (error) {
    console.error('Word generation API error:', error);
    return NextResponse.json(
      { error: 'Word generation failed' },
      { status: 500 }
    );
  }
}
