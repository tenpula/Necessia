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
import {
  buildOpenAlexUrl,
  buildOpenAlexWorkLookupUrl,
  convertToPaper,
  extractArxivId,
  extractDoi,
  normalizeOpenAlexId,
} from '@/lib/openalex-helpers';
import { getExponentialBackoffDelay, sleep } from '@/lib/async-utils';

export { extractArxivId, extractDoi } from '@/lib/openalex-helpers';

function isFormatLookupMiss(error: unknown): boolean {
  return error instanceof Error && error.message === 'OpenAlex format lookup miss';
}

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
    this.requestTimestamps = this.requestTimestamps.filter((ts) => ts > oneSecondAgo);

    if (this.requestTimestamps.length >= this.requestsPerSecond) {
      const oldestRequest = this.requestTimestamps[0];
      const waitTime = oldestRequest + 1000 - now;
      if (waitTime > 0) {
        await sleep(waitTime);
      }
    }
    
    // 最小リクエスト間隔のチェック
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - timeSinceLastRequest;
      await sleep(waitTime);
    }
    
    // リクエストを記録
    this.requestTimestamps.push(Date.now());
    this.lastRequestTime = Date.now();
    this.dailyRequestCount++;
  }

  async makeRequest(url: string, options?: RequestInit): Promise<Response> {
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
            : getExponentialBackoffDelay(retryCount, 1000, 10000);
          
          console.warn(`Rate limit hit. Retrying after ${waitTime}ms (attempt ${retryCount}/${maxRetries})`);
          await sleep(waitTime);
          continue;
        }
        
        return response;
      } catch (error) {
        // ネットワークエラーの場合もリトライ
        if (retryCount < maxRetries - 1) {
          retryCount++;
          const waitTime = getExponentialBackoffDelay(retryCount, 1000, 10000);
          console.warn(`Request failed. Retrying after ${waitTime}ms (attempt ${retryCount}/${maxRetries})`);
          await sleep(waitTime);
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

// arXiv IDで論文を検索
export async function searchByArxivId(arxivId: string): Promise<Paper | null> {
  try {
    const canonicalArxivDoi = `10.48550/arXiv.${arxivId}`;
    const doiMatch = await searchByDoi(canonicalArxivDoi);
    if (doiMatch) {
      return doiMatch;
    }

    // OpenAlex 側の arXiv 取り扱いには揺れがあるため、
    // DOI で引けない場合のみ filter 形式を試す。
    const formats = [
      `ids.arxiv:${arxivId}`,
      `ids.arxiv:arXiv:${arxivId}`,
    ];
    
    for (const format of formats) {
      try {
        const url = format.startsWith('http')
          ? buildOpenAlexWorkLookupUrl(format)
          : buildOpenAlexUrl('/works', [`filter=${format}`]);

        const response = await rateLimiter.makeRequest(url);
        
        if (!response.ok) {
          if (response.status === 400 || response.status === 404) {
            throw new Error('OpenAlex format lookup miss');
          }
          throw new Error(`OpenAlex API error: ${response.status}`);
        }
        
        const data = await response.json() as OpenAlexSearchResponse;
        if (data.results && data.results.length > 0) {
          return convertToPaper(data.results[0]);
        }
      } catch (formatError) {
        if (!isFormatLookupMiss(formatError)) {
          throw formatError;
        }
        console.warn(`Failed to search with format ${format}:`, formatError);
        continue;
      }
    }
    
    return null;
    
  } catch (error) {
    console.error('Error searching by arXiv ID:', error);
    throw error;
  }
}

// DOIで論文を検索
export async function searchByDoi(doi: string): Promise<Paper | null> {
  try {
    const url = buildOpenAlexWorkLookupUrl(`https://doi.org/${doi}`);
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
    const url = buildOpenAlexUrl('/works', [`search=${encodedTitle}`, 'per_page=10']);
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
    const url = buildOpenAlexUrl(`/works/${openAlexId}`);
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
    const url = buildOpenAlexUrl(`/works/${openAlexId}`);
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
      const idsFilter = batch.map(normalizeOpenAlexId).join('|');
      const batchUrl = buildOpenAlexUrl('/works', [
        `filter=ids.openalex:${idsFilter}`,
        `per_page=${batchSize}`,
      ]);
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
    const cleanId = normalizeOpenAlexId(openAlexId);
    const url = buildOpenAlexUrl('/works', [
      `filter=cites:${cleanId}`,
      `per_page=${limit}`,
      'sort=cited_by_count:desc',
    ]);
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

