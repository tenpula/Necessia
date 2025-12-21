// Gap提案 API Route
import { NextRequest, NextResponse } from 'next/server';
import { findGapProposals } from '@/lib/gap-finder';
import { CitationNetwork } from '@/types/paper';

interface GapRequest {
  network: CitationNetwork;
  options?: {
    minSimilarity?: number;
    minCoCitations?: number;
    maxProposals?: number;
  };
}

export async function POST(request: NextRequest) {
  try {
    console.log('[Gap API] POST request received');
    const body: GapRequest = await request.json();
    const { network, options } = body;

    if (!network || !network.papers || !network.citations) {
      return NextResponse.json(
        { error: 'Invalid network data' },
        { status: 400 }
      );
    }

    if (network.papers.length < 3) {
      return NextResponse.json(
        { error: 'Network must contain at least 3 papers to find gaps' },
        { status: 400 }
      );
    }

    console.log(
      `[Gap API] Finding gaps in network with ${network.papers.length} papers`
    );

    // Gap提案を検出
    const proposals = await findGapProposals(network, {
      minSimilarity: options?.minSimilarity || 0.5,
      minCoCitations: options?.minCoCitations || 2,
      maxProposals: options?.maxProposals || 10,
      onProgress: (completed, total) => {
        console.log(`[Gap API] Progress: ${completed}/${total}`);
      },
    });

    console.log(`[Gap API] Found ${proposals.length} gap proposals`);

    return NextResponse.json({
      proposals,
      count: proposals.length,
    });
  } catch (error) {
    console.error('[Gap API] Error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to find gap proposals',
      },
      { status: 500 }
    );
  }
}
