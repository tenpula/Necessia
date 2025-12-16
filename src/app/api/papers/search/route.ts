// 論文検索 API Route
import { NextRequest, NextResponse } from 'next/server';
import {
  extractArxivId,
  extractDoi,
  searchByArxivId,
  searchByDoi,
  searchByTitle,
  getWorkById,
} from '@/lib/openalex';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json(
      { error: 'Query parameter "q" is required' },
      { status: 400 }
    );
  }

  try {
    // arXiv IDで検索
    const arxivId = extractArxivId(query);
    if (arxivId) {
      const paper = await searchByArxivId(arxivId);
      if (paper) {
        return NextResponse.json({ papers: [paper], type: 'arxiv' });
      }
    }

    // DOIで検索
    const doi = extractDoi(query);
    if (doi) {
      const paper = await searchByDoi(doi);
      if (paper) {
        return NextResponse.json({ papers: [paper], type: 'doi' });
      }
    }

    // OpenAlex IDで検索
    if (query.includes('openalex.org')) {
      const paper = await getWorkById(query);
      if (paper) {
        return NextResponse.json({ papers: [paper], type: 'openalex' });
      }
    }

    // タイトルで検索
    const papers = await searchByTitle(query);
    return NextResponse.json({ papers, type: 'title' });

  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Failed to search papers' },
      { status: 500 }
    );
  }
}

