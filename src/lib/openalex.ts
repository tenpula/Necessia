// OpenAlex API クライアント

import {
  Paper,
  Citation,
  CitationNetwork,
  OpenAlexWork,
  OpenAlexSearchResponse,
} from '@/types/paper';

const OPENALEX_BASE_URL = 'https://api.openalex.org';

// arXiv URLからarXiv IDを抽出
export function extractArxivId(input: string): string | null {
  // arXiv URL patterns:
  // https://arxiv.org/abs/2301.00234
  // https://arxiv.org/abs/2301.00234v1
  // https://arxiv.org/pdf/2301.00234.pdf
  // arXiv:2301.00234
  // 2301.00234
  
  const patterns = [
    /arxiv\.org\/abs\/(\d{4}\.\d{4,5}(?:v\d+)?)/i,
    /arxiv\.org\/pdf\/(\d{4}\.\d{4,5}(?:v\d+)?)/i,
    /arXiv:(\d{4}\.\d{4,5}(?:v\d+)?)/i,
    /^(\d{4}\.\d{4,5}(?:v\d+)?)$/,
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match) {
      // バージョン番号を削除
      return match[1].replace(/v\d+$/, '');
    }
  }

  return null;
}

// DOIを抽出
export function extractDoi(input: string): string | null {
  // DOI patterns:
  // https://doi.org/10.1234/example
  // doi:10.1234/example
  // 10.1234/example
  
  const patterns = [
    /doi\.org\/(10\.\d{4,}\/[^\s]+)/i,
    /doi:(10\.\d{4,}\/[^\s]+)/i,
    /^(10\.\d{4,}\/[^\s]+)$/,
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

// OpenAlexのWorkデータをPaperに変換
function convertToPaper(work: OpenAlexWork): Paper {
  const venueType = determineVenueType(work);
  
  return {
    id: work.id,
    openAlexId: work.ids.openalex || work.id,
    title: work.display_name || work.title,
    authors: work.authorships.map((a) => ({
      name: a.author.display_name,
      orcid: a.author.orcid,
    })),
    publicationYear: work.publication_year,
    publicationDate: work.publication_date,
    venue: work.primary_location?.source?.display_name || work.host_venue?.display_name,
    venueType,
    citationCount: work.cited_by_count,
    arxivId: work.ids.arxiv?.replace('https://arxiv.org/abs/', ''),
    doi: work.ids.doi?.replace('https://doi.org/', ''),
    abstract: reconstructAbstract(work.abstract_inverted_index),
    openAccessUrl: work.open_access?.oa_url,
  };
}

// Venue Type の判定
function determineVenueType(work: OpenAlexWork): Paper['venueType'] {
  const sourceType = work.primary_location?.source?.type || work.host_venue?.type || work.type;
  
  if (!sourceType) return 'unknown';
  
  const type = sourceType.toLowerCase();
  
  if (type.includes('journal') || type === 'article') {
    return 'journal';
  }
  if (type.includes('conference') || type.includes('proceedings')) {
    return 'conference';
  }
  if (type.includes('preprint') || type.includes('repository')) {
    return 'preprint';
  }
  
  return 'unknown';
}

// 逆インデックスからアブストラクトを再構築
function reconstructAbstract(invertedIndex?: Record<string, number[]>): string | undefined {
  if (!invertedIndex) return undefined;
  
  const words: [string, number][] = [];
  
  for (const [word, positions] of Object.entries(invertedIndex)) {
    for (const pos of positions) {
      words.push([word, pos]);
    }
  }
  
  words.sort((a, b) => a[1] - b[1]);
  return words.map((w) => w[0]).join(' ');
}

// arXiv IDで論文を検索
export async function searchByArxivId(arxivId: string): Promise<Paper | null> {
  try {
    const url = `${OPENALEX_BASE_URL}/works?filter=ids.arxiv:${arxivId}&mailto=your-email@example.com`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`OpenAlex API error: ${response.status}`);
    }
    
    const data: OpenAlexSearchResponse = await response.json();
    
    if (data.results.length === 0) {
      return null;
    }
    
    return convertToPaper(data.results[0]);
  } catch (error) {
    console.error('Error searching by arXiv ID:', error);
    throw error;
  }
}

// DOIで論文を検索
export async function searchByDoi(doi: string): Promise<Paper | null> {
  try {
    const url = `${OPENALEX_BASE_URL}/works/https://doi.org/${doi}?mailto=your-email@example.com`;
    const response = await fetch(url);
    
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`OpenAlex API error: ${response.status}`);
    }
    
    const data: OpenAlexWork = await response.json();
    return convertToPaper(data);
  } catch (error) {
    console.error('Error searching by DOI:', error);
    throw error;
  }
}

// タイトルで論文を検索
export async function searchByTitle(title: string): Promise<Paper[]> {
  try {
    const encodedTitle = encodeURIComponent(title);
    const url = `${OPENALEX_BASE_URL}/works?search=${encodedTitle}&per_page=10&mailto=your-email@example.com`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`OpenAlex API error: ${response.status}`);
    }
    
    const data: OpenAlexSearchResponse = await response.json();
    return data.results.map(convertToPaper);
  } catch (error) {
    console.error('Error searching by title:', error);
    throw error;
  }
}

// OpenAlex IDから論文を取得
export async function getWorkById(openAlexId: string): Promise<Paper | null> {
  try {
    const url = `${OPENALEX_BASE_URL}/works/${openAlexId}?mailto=your-email@example.com`;
    const response = await fetch(url);
    
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`OpenAlex API error: ${response.status}`);
    }
    
    const data: OpenAlexWork = await response.json();
    return convertToPaper(data);
  } catch (error) {
    console.error('Error getting work by ID:', error);
    throw error;
  }
}

// 論文の引用リスト（この論文が引用している論文）を取得
export async function getReferences(openAlexId: string): Promise<Paper[]> {
  try {
    // まず対象論文の詳細を取得
    const url = `${OPENALEX_BASE_URL}/works/${openAlexId}?mailto=your-email@example.com`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`OpenAlex API error: ${response.status}`);
    }
    
    const work: OpenAlexWork = await response.json();
    const referencedWorkIds = work.referenced_works || [];
    
    if (referencedWorkIds.length === 0) {
      return [];
    }

    // referenced_worksのIDを使って各論文の情報を取得
    // OpenAlexでは | でORフィルター可能
    const batchSize = 50; // APIの制限に合わせて
    const papers: Paper[] = [];
    
    for (let i = 0; i < referencedWorkIds.length; i += batchSize) {
      const batch = referencedWorkIds.slice(i, i + batchSize);
      const idsFilter = batch.map(id => id.replace('https://openalex.org/', '')).join('|');
      
      const batchUrl = `${OPENALEX_BASE_URL}/works?filter=ids.openalex:${idsFilter}&per_page=${batchSize}&mailto=your-email@example.com`;
      const batchResponse = await fetch(batchUrl);
      
      if (batchResponse.ok) {
        const batchData: OpenAlexSearchResponse = await batchResponse.json();
        papers.push(...batchData.results.map(convertToPaper));
      }
    }
    
    return papers;
  } catch (error) {
    console.error('Error getting references:', error);
    throw error;
  }
}

// 論文の被引用リスト（この論文を引用している論文）を取得
export async function getCitations(openAlexId: string, limit: number = 50): Promise<Paper[]> {
  try {
    const cleanId = openAlexId.replace('https://openalex.org/', '');
    const url = `${OPENALEX_BASE_URL}/works?filter=cites:${cleanId}&per_page=${limit}&sort=cited_by_count:desc&mailto=your-email@example.com`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`OpenAlex API error: ${response.status}`);
    }
    
    const data: OpenAlexSearchResponse = await response.json();
    return data.results.map(convertToPaper);
  } catch (error) {
    console.error('Error getting citations:', error);
    throw error;
  }
}

// 引用ネットワークを構築
export async function buildCitationNetwork(
  seedPaperIdOrQuery: string,
  options: {
    includeReferences?: boolean;
    includeCitations?: boolean;
    citationLimit?: number;
  } = {}
): Promise<CitationNetwork> {
  const {
    includeReferences = true,
    includeCitations = true,
    citationLimit = 30,
  } = options;

  // Seed論文を検索
  let seedPaper: Paper | null = null;
  
  // arXiv IDかチェック
  const arxivId = extractArxivId(seedPaperIdOrQuery);
  if (arxivId) {
    seedPaper = await searchByArxivId(arxivId);
  }
  
  // DOIかチェック
  if (!seedPaper) {
    const doi = extractDoi(seedPaperIdOrQuery);
    if (doi) {
      seedPaper = await searchByDoi(doi);
    }
  }
  
  // OpenAlex IDかチェック
  if (!seedPaper && seedPaperIdOrQuery.includes('openalex.org')) {
    seedPaper = await getWorkById(seedPaperIdOrQuery);
  }
  
  // タイトル検索
  if (!seedPaper) {
    const results = await searchByTitle(seedPaperIdOrQuery);
    if (results.length > 0) {
      seedPaper = results[0];
    }
  }
  
  if (!seedPaper) {
    throw new Error('Paper not found');
  }

  const papers: Map<string, Paper> = new Map();
  const citations: Citation[] = [];
  
  papers.set(seedPaper.id, seedPaper);

  // 引用している論文を取得
  if (includeReferences) {
    const references = await getReferences(seedPaper.id);
    for (const ref of references) {
      papers.set(ref.id, ref);
      citations.push({
        id: `${seedPaper.id}->${ref.id}`,
        sourceId: seedPaper.id,
        targetId: ref.id,
      });
    }
  }

  // 被引用論文を取得
  if (includeCitations) {
    const citingPapers = await getCitations(seedPaper.id, citationLimit);
    for (const citing of citingPapers) {
      papers.set(citing.id, citing);
      citations.push({
        id: `${citing.id}->${seedPaper.id}`,
        sourceId: citing.id,
        targetId: seedPaper.id,
      });
    }
  }

  return {
    seedPaper,
    papers: Array.from(papers.values()),
    citations,
  };
}

