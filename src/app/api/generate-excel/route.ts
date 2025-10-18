import { NextRequest, NextResponse } from 'next/server';
import { generateExcelReport } from '@/lib/excel-generator';
import { Analysis } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const analysis: Analysis = await request.json();

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

    if (!analysis.type || !['core5', 'core6'].includes(analysis.type)) {
      return NextResponse.json(
        { error: 'Invalid analysis type' },
        { status: 400 }
      );
    }

    const excelBuffer = await generateExcelReport(analysis);

    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="analysis.xlsx"`,
      },
    });

  } catch (error) {
    console.error('Excel generation API error:', error);
    return NextResponse.json(
      { error: 'Excel generation failed' },
      { status: 500 }
    );
  }
}
