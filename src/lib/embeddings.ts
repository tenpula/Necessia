// ベクトル類似度計算（Gemini Embedding API使用）
import { Paper } from '@/types/paper';

const GEMINI_EMBEDDING_MODEL = 'models/text-embedding-004';
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000;

// 論文のテキストを取得（タイトル + アブストラクト）
function getPaperText(paper: Paper): string {
  const parts: string[] = [];
  if (paper.title) {
    parts.push(paper.title);
  }
  if (paper.abstract) {
    parts.push(paper.abstract);
  }
  return parts.join('\n\n');
}

// 単一のテキストのembeddingを取得
export async function getEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/${GEMINI_EMBEDDING_MODEL}:embedContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: GEMINI_EMBEDDING_MODEL,
            content: {
              parts: [{ text }],
            },
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // 429 Rate Limited
        if (response.status === 429) {
          if (attempt < MAX_RETRIES) {
            const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt);
            console.warn(`[Embeddings] Rate limited, retrying in ${delay}ms...`);
            await new Promise((r) => setTimeout(r, delay));
            continue;
          }
          throw new Error('Rate limited after max retries');
        }
        
        throw new Error(`Gemini Embedding API error: ${response.status}`);
      }

      const data = await response.json();
      const embedding = data.embedding?.values;
      
      if (!embedding || !Array.isArray(embedding)) {
        throw new Error('Invalid embedding response format');
      }

      return embedding;
    } catch (error) {
      if (attempt === MAX_RETRIES) {
        console.error('[Embeddings] Failed after retries:', error);
        throw error;
      }
      
      const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  
  throw new Error('Failed to get embedding');
}

// 複数の論文のembeddingを一括取得（最適化版）
export async function getPaperEmbeddings(
  papers: Paper[],
  onProgress?: (completed: number, total: number) => void
): Promise<Map<string, number[]>> {
  const embeddings = new Map<string, number[]>();
  
  // レート制限を考慮した並列処理
  // Gemini APIのレート制限: 約10-20リクエスト/秒
  const CONCURRENT_REQUESTS = 5; // 同時リクエスト数
  const delayBetweenBatches = 200; // バッチ間の待機時間（ms）

  // バッチ処理
  for (let i = 0; i < papers.length; i += CONCURRENT_REQUESTS) {
    const batch = papers.slice(i, i + CONCURRENT_REQUESTS);
    
    const batchPromises = batch.map(async (paper) => {
      const text = getPaperText(paper);
      
      if (!text || text.trim().length === 0) {
        console.warn(`[Embeddings] Skipping paper ${paper.id} (no text available)`);
        return null;
      }

      try {
        const embedding = await getEmbedding(text);
        return { id: paper.id, embedding };
      } catch (error) {
        console.error(`[Embeddings] Failed to get embedding for paper ${paper.id}:`, error);
        return null;
      }
    });

    const batchResults = await Promise.all(batchPromises);
    
    for (const result of batchResults) {
      if (result) {
        embeddings.set(result.id, result.embedding);
      }
    }

    // 進捗を報告
    if (onProgress) {
      onProgress(embeddings.size, papers.length);
    }

    // バッチ間の待機（最後のバッチ以外）
    if (i + CONCURRENT_REQUESTS < papers.length) {
      await new Promise((resolve) => setTimeout(resolve, delayBetweenBatches));
    }
  }

  return embeddings;
}

// コサイン類似度を計算
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) {
    return 0;
  }

  return dotProduct / denominator;
}

// 2つの論文の類似度を計算
export async function calculatePaperSimilarity(
  paperA: Paper,
  paperB: Paper
): Promise<number> {
  const textA = getPaperText(paperA);
  const textB = getPaperText(paperB);

  if (!textA || !textB) {
    return 0;
  }

  const [embeddingA, embeddingB] = await Promise.all([
    getEmbedding(textA),
    getEmbedding(textB),
  ]);

  return cosineSimilarity(embeddingA, embeddingB);
}
