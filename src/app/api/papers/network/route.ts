import { NextRequest, NextResponse } from 'next/server';
import { buildCitationNetwork } from '@/lib/openalex';
import { parseCitationLimit, requireTrimmedQuery, toPaperRouteErrorResponse } from '@/lib/paper-api';
import { logRouteError } from '@/app/api/_shared/route-utils';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = requireTrimmedQuery(searchParams.get('q'));
    const includeReferences = searchParams.get('refs') !== 'false';
    const includeCitations = searchParams.get('cites') !== 'false';
    const citationLimit = parseCitationLimit(searchParams.get('limit'));

    const network = await buildCitationNetwork(query, {
      includeReferences,
      includeCitations,
      citationLimit,
    });

    return NextResponse.json(network);
  } catch (error) {
    logRouteError('Network API', error);
    const response = toPaperRouteErrorResponse(error, 'Failed to build citation network');
    return NextResponse.json({ error: response.message }, { status: response.status });
  }
}
