import { NextRequest, NextResponse } from 'next/server';
import {
  extractArxivId,
  extractDoi,
  searchByArxivId,
  searchByDoi,
  searchByTitle,
  getWorkById,
} from '@/lib/openalex';
import { requireTrimmedQuery, toPaperRouteErrorResponse } from '@/lib/paper-api';
import { logRouteError } from '@/app/api/_shared/route-utils';

async function searchPapers(query: string) {
  const arxivId = extractArxivId(query);
  if (arxivId) {
    const paper = await searchByArxivId(arxivId);
    if (paper) {
      return { papers: [paper], type: 'arxiv' as const };
    }
  }

  const doi = extractDoi(query);
  if (doi) {
    const paper = await searchByDoi(doi);
    if (paper) {
      return { papers: [paper], type: 'doi' as const };
    }
  }

  if (query.includes('openalex.org')) {
    const paper = await getWorkById(query);
    if (paper) {
      return { papers: [paper], type: 'openalex' as const };
    }
  }

  const papers = await searchByTitle(query);
  return { papers, type: 'title' as const };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = requireTrimmedQuery(searchParams.get('q'));
    const response = await searchPapers(query);
    return NextResponse.json(response);
  } catch (error) {
    logRouteError('Search API', error);
    const response = toPaperRouteErrorResponse(error, 'Failed to search papers');
    return NextResponse.json({ error: response.message }, { status: response.status });
  }
}
