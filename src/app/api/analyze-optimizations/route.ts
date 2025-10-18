import { NextRequest, NextResponse } from 'next/server';
import { withRetry, DEFAULT_OCR_RETRY_CONFIG } from '@/lib/retry';

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    const analysisResult = await withRetry(
      async () => {
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
                content: prompt
              }
            ]
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Claude API error: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        
        if (!data.content || !data.content[0] || !data.content[0].text) {
          throw new Error('Invalid response format from Claude API');
        }

        return data.content[0].text;
      },
      DEFAULT_OCR_RETRY_CONFIG
    );

    return NextResponse.json({
      analysis: analysisResult
    });

  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Failed to generate optimization analysis',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
