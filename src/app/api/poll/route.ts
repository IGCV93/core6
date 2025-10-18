import { NextRequest, NextResponse } from 'next/server';
import { runPollSimulation, validatePollResult } from '@/lib/polling';
import { PollRequest } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const pollRequest: PollRequest = await request.json();


    // Validate request
    if (!pollRequest.products || pollRequest.products.length === 0) {
      console.error('Validation failed: No products provided');
      return NextResponse.json(
        { error: 'No products provided' },
        { status: 400 }
      );
    }

    if (!pollRequest.demographic || !pollRequest.question) {
      console.error('Validation failed: Missing demographic or question', {
        demographic: pollRequest.demographic,
        question: pollRequest.question
      });
      return NextResponse.json(
        { error: 'Demographic and question are required' },
        { status: 400 }
      );
    }

    if (!pollRequest.pollType || !['main_image', 'image_stack', 'features'].includes(pollRequest.pollType)) {
      console.error('Validation failed: Invalid poll type', pollRequest.pollType);
      return NextResponse.json(
        { error: 'Invalid poll type' },
        { status: 400 }
      );
    }

    const pollResult = await runPollSimulation(pollRequest);
    
    
    if (!validatePollResult(pollResult)) {
      console.error('Poll result validation failed:', pollResult);
      return NextResponse.json(
        { error: 'Invalid poll results' },
        { status: 500 }
      );
    }

    return NextResponse.json(pollResult);

  } catch (error: unknown) {
    console.error('Poll API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Poll simulation failed' },
      { status: 500 }
    );
  }
}
