// 引用ネットワーク構築 API Route
import { NextRequest, NextResponse } from 'next/server';
import { buildCitationNetwork } from '@/lib/openalex';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');
  const includeReferences = searchParams.get('refs') !== 'false';
  const includeCitations = searchParams.get('cites') !== 'false';
  const citationLimit = parseInt(searchParams.get('limit') || '30', 10);

  if (!query) {
    return NextResponse.json(
      { error: 'Query parameter "q" is required' },
      { status: 400 }
    );
  }

  try {
    const network = await buildCitationNetwork(query, {
      includeReferences,
      includeCitations,
      citationLimit: Math.min(citationLimit, 100), // 最大100件
    });

    return NextResponse.json(network);
  } catch (error) {
    console.error('Network build error:', error);
    
    if (error instanceof Error && error.message === 'Paper not found') {
      return NextResponse.json(
        { error: 'Paper not found. Please check your input and try again.' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to build citation network' },
      { status: 500 }
    );
  }
}

