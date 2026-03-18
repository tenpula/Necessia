/*
 * 【ファイル概要】
 * OpenAlex通信ロジック
 * 世界最大級の論文データベース（OpenAlex）から論文のデータを引き出してくる機能です。
 */

/**
 * OpenAlex API クライアント
 * 
 * OpenAlex APIを使用して論文データ、引用情報などを取得するためのモジュールです。
 * レート制限の管理、各種IDの抽出、データ形式の変換などの機能を提供します。
 */

import {
  Paper,
  Citation,
  CitationNetwork,
  OpenAlexWork,
  OpenAlexSearchResponse,
} from '@/types/paper';

const OPENALEX_BASE_URL = 'https://api.openalex.org';

/**
 * レート制限管理クラス
 * 
 * OpenAlex APIの利用制限（1秒あたり10リクエスト、1日あたり10万リクエスト）を遵守し、
 * 必要に応じて待機時間を挿入します。また、429エラー時の自動リトライも行います。
 */
class RateLimiter {
  private requestsPerSecond: number = 10; // 1秒あたりの最大リクエスト数
  private requestsPerDay: number = 100000; // 1日あたりの最大リクエスト数
  private minRequestInterval: number = 100; // 最小リクエスト間隔（ミリ秒）
  
  private requestTimestamps: number[] = []; // 最近のリクエストタイムスタンプ
  private dailyRequestCount: number = 0;
  private lastRequestTime: number = 0;
  private dailyResetTime: number = this.getNextMidnight();

  private getNextMidnight(): number {
    const now = Date.now();
    const tomorrow = new Date(now);
    tomorrow.setHours(24, 0, 0, 0);
    return tomorrow.getTime();
  }

  private resetDailyCountIfNeeded(): void {
    const now = Date.now();
    if (now >= this.dailyResetTime) {
      this.dailyRequestCount = 0;
      this.dailyResetTime = this.getNextMidnight();
    }
  }

  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    
    // 日次リセットチェック
    this.resetDailyCountIfNeeded();
    
    // 日次制限チェック
    if (this.dailyRequestCount >= this.requestsPerDay) {
      const waitTime = this.dailyResetTime - now;
      if (waitTime > 0) {
        throw new Error(`Daily rate limit exceeded. Please wait ${Math.ceil(waitTime / 1000 / 60)} minutes.`);
      }
    }
    
    // 1秒あたりの制限チェック
    const oneSecondAgo = now - 1000;
    this.requestTimestamps = this.requestTimestamps.filter(ts => ts > oneSecondAgo);
    
    if (this.requestTimestamps.length >= this.requestsPerSecond) {
      const oldestRequest = this.requestTimestamps[0];
      const waitTime = oldestRequest + 1000 - now;
      if (waitTime > 0) {
        await this.sleep(waitTime);
      }
    }
    
    // 最小リクエスト間隔のチェック
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - timeSinceLastRequest;
      await this.sleep(waitTime);
    }
    
    // リクエストを記録
    this.requestTimestamps.push(Date.now());
    this.lastRequestTime = Date.now();
    this.dailyRequestCount++;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async makeRequest<T>(url: string, options?: RequestInit): Promise<Response> {
    await this.waitForRateLimit();
    
    const maxRetries = 3;
    let retryCount = 0;
    
    while (retryCount < maxRetries) {
      try {
        const response = await fetch(url, options);
        
        // 429エラー（レート制限超過）の場合、指数バックオフでリトライ
        if (response.status === 429) {
          retryCount++;
          if (retryCount >= maxRetries) {
            throw new Error('Rate limit exceeded. Please try again later.');
          }
          
          // Retry-Afterヘッダーがあればそれを使用、なければ指数バックオフ
          const retryAfter = response.headers.get('Retry-After');
          const waitTime = retryAfter 
            ? parseInt(retryAfter) * 1000 
            : Math.min(1000 * Math.pow(2, retryCount), 10000); // 最大10秒
          
          console.warn(`Rate limit hit. Retrying after ${waitTime}ms (attempt ${retryCount}/${maxRetries})`);
          await this.sleep(waitTime);
          continue;
        }
        
        return response;
      } catch (error) {
        // ネットワークエラーの場合もリトライ
        if (retryCount < maxRetries - 1) {
          retryCount++;
          const waitTime = Math.min(1000 * Math.pow(2, retryCount), 10000);
          console.warn(`Request failed. Retrying after ${waitTime}ms (attempt ${retryCount}/${maxRetries})`);
          await this.sleep(waitTime);
          continue;
        }
        throw error;
      }
    }
    
    throw new Error('Request failed after maximum retries');
  }
}

// シングルトンインスタンス
const rateLimiter = new RateLimiter();

// 環境変数からメールアドレスを取得（なければデフォルト値を使用）
const getMailtoParam = (): string => {
  const email = process.env.OPENALEX_EMAIL || 'your-email@example.com';
  return `mailto=${encodeURIComponent(email)}`;
};

/**
 * arXiv URLやID文字列から正規化されたarXiv IDを抽出します。
 * 様々な形式（URL, pdf URL, "arXiv:"プレフィックス付きなど）に対応しています。
 * 
 * @param input ユーザー入力文字列
 * @returns 正規化されたarXiv ID (例: "1706.03762") または null
 */
export function extractArxivId(input: string): string | null {
  // arXiv URL patterns:
  // https://arxiv.org/abs/2301.00234
  // https://arxiv.org/abs/2301.00234v1
  // https://arxiv.org/pdf/2301.00234.pdf
  // arXiv:2301.00234
  // 2301.00234
  // 古い形式: math.GT/0309136 (2007年以前)
  
  const patterns = [
    // 新しい形式（2007年以降）: YYYY.NNNNN
    /arxiv\.org\/abs\/(\d{4}\.\d{4,5}(?:v\d+)?)/i,
    /arxiv\.org\/pdf\/(\d{4}\.\d{4,5}(?:v\d+)?)\.pdf/i,
    /arXiv:(\d{4}\.\d{4,5}(?:v\d+)?)/i,
    /^(\d{4}\.\d{4,5}(?:v\d+)?)$/,
    // 古い形式（2007年以前）: category/YYMM.number
    /arxiv\.org\/abs\/([a-z-]+\/\d{7})/i,
    /arXiv:([a-z-]+\/\d{7})/i,
    /^([a-z-]+\/\d{7})$/i,
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match) {
      let arxivId = match[1];
      // バージョン番号を削除（新しい形式のみ）
      if (arxivId.match(/^\d{4}\./)) {
        arxivId = arxivId.replace(/v\d+$/, '');
      }
      return arxivId;
    }
  }

  return null;
}

/**
 * DOI文字列やURLから正規化されたDOIを抽出します。
 * 
 * @param input ユーザー入力文字列
 * @returns 正規化されたDOI (例: "10.1234/example") または null
 */
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
    // OpenAlex APIでは、arXiv IDは複数の形式で試す必要がある
    // 形式1: ids.arxiv:1706.03762
    // 形式2: ids.arxiv:arXiv:1706.03762
    // 形式3: 直接URLで検索
    
    const formats = [
      `ids.arxiv:${arxivId}`,  // 標準形式
      `ids.arxiv:arXiv:${arxivId}`,  // arXiv:プレフィックス付き
      `https://arxiv.org/abs/${arxivId}`,  // URL形式
    ];
    
    for (const format of formats) {
      try {
        let url: string;
        if (format.startsWith('http')) {
          // URL形式の場合は直接取得
          url = `${OPENALEX_BASE_URL}/works/${format}?${getMailtoParam()}`;
        } else {
          // フィルター形式
          url = `${OPENALEX_BASE_URL}/works?filter=${format}&${getMailtoParam()}`;
        }
        
        const response = await rateLimiter.makeRequest(url);
        
        if (!response.ok) {
          // 404の場合は次の形式を試す
          if (response.status === 404) {
            continue;
          }
          throw new Error(`OpenAlex API error: ${response.status}`);
        }
        
        let data: OpenAlexWork | OpenAlexSearchResponse;
        if (format.startsWith('http')) {
          // URL形式の場合は単一オブジェクト
          data = await response.json() as OpenAlexWork;
          return convertToPaper(data);
        } else {
          // フィルター形式の場合は配列
          data = await response.json() as OpenAlexSearchResponse;
          if (data.results && data.results.length > 0) {
            return convertToPaper(data.results[0]);
          }
        }
      } catch (formatError) {
        // この形式が失敗した場合は次の形式を試す
        console.warn(`Failed to search with format ${format}:`, formatError);
        continue;
      }
    }
    
    // すべての形式が失敗した場合
    return null;
  } catch (error) {
    console.error('Error searching by arXiv ID:', error);
    throw error;
  }
}

// DOIで論文を検索
export async function searchByDoi(doi: string): Promise<Paper | null> {
  try {
    const url = `${OPENALEX_BASE_URL}/works/https://doi.org/${doi}?${getMailtoParam()}`;
    const response = await rateLimiter.makeRequest(url);
    
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
    const url = `${OPENALEX_BASE_URL}/works?search=${encodedTitle}&per_page=10&${getMailtoParam()}`;
    const response = await rateLimiter.makeRequest(url);
    
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
    const url = `${OPENALEX_BASE_URL}/works/${openAlexId}?${getMailtoParam()}`;
    const response = await rateLimiter.makeRequest(url);
    
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
    const url = `${OPENALEX_BASE_URL}/works/${openAlexId}?${getMailtoParam()}`;
    const response = await rateLimiter.makeRequest(url);
    
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
      
      const batchUrl = `${OPENALEX_BASE_URL}/works?filter=ids.openalex:${idsFilter}&per_page=${batchSize}&${getMailtoParam()}`;
      const batchResponse = await rateLimiter.makeRequest(batchUrl);
      
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
    const url = `${OPENALEX_BASE_URL}/works?filter=cites:${cleanId}&per_page=${limit}&sort=cited_by_count:desc&${getMailtoParam()}`;
    const response = await rateLimiter.makeRequest(url);
    
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

/**
 * 引用ネットワークを構築します。
 * 
 * 指定されたSeed論文を中心として、
 * 1. その論文が引用している論文 (References)
 * 2. その論文を引用している論文 (Citations)
 * を取得し、ネットワークデータ構造を作成します。
 * 
 * @param seedPaperIdOrQuery 検索クエリ（ID, URL, タイトルなど）
 * @param options オプション（引用・被引用の取得有無、取得数制限など）
 * @returns 構築された引用ネットワーク
 */
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

