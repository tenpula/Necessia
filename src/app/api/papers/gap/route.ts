import { NextRequest, NextResponse } from 'next/server';
import { findGapProposals } from '@/lib/gap-finder';
import { parseGapRequestPayload, toPaperRouteErrorResponse } from '@/lib/paper-api';
import { logRouteError } from '@/app/api/_shared/route-utils';

const DEFAULT_GAP_OPTIONS = {
  minSimilarity: 0.5,
  minCoCitations: 2,
  maxProposals: 10,
} as const;

export async function POST(request: NextRequest) {
  try {
    console.log('[Gap API] POST request received');
    const { network, options } = await parseGapRequestPayload(request);

    console.log(
      `[Gap API] Finding gaps in network with ${network.papers.length} papers`
    );

    // Gap提案を検出
    const proposals = await findGapProposals(network, {
      minSimilarity: options.minSimilarity ?? DEFAULT_GAP_OPTIONS.minSimilarity,
      minCoCitations: options.minCoCitations ?? DEFAULT_GAP_OPTIONS.minCoCitations,
      maxProposals: options.maxProposals ?? DEFAULT_GAP_OPTIONS.maxProposals,
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
    logRouteError('Gap API', error);
    const response = toPaperRouteErrorResponse(error, 'Failed to find gap proposals');
    return NextResponse.json({ error: response.message }, { status: response.status });
  }
}
