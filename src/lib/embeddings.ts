/**
 * ベクトル埋め込み（Embedding）と類似度計算モジュール
 * 
 * Gemini Embedding APIを使用して、論文のテキスト（タイトル+アブストラクト）をベクトル化し、
 * 論文間の意味的な類似度（Semantic Similarity）を計算します。
 */
import { Paper } from '@/types/paper';

const GEMINI_EMBEDDING_MODEL = 'models/text-embedding-004';
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000;

/**
 * 論文からベクトル化対象のテキストを抽出します。
 * タイトルとアブストラクトを結合して使用します。
 * 
 * @param paper 対象の論文
 * @returns 結合されたテキスト
 */
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

/**
 * 単一のテキストに対してEmbeddingベクトルを取得します。
 * APIエラー時のリトライやレート制限のハンドリングを含みます。
 * 
 * @param text ベクトル化するテキスト
 * @returns ベクトル（数値の配列）
 */
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

/**
 * 複数の論文のEmbeddingベクトルを一括で取得します。
 * 
 * 効率的な処理のために以下の工夫を行っています：
 * - バッチ処理による並行リクエスト
 * - APIレート制限を考慮した待機時間の挿入
 * - エラー発生時の個別スキップ（全体の処理を止めない）
 * 
 * @param papers 論文の配列
 * @param onProgress 進捗通知コールバック
 * @returns 論文IDをキーとするベクトルのMap
 */
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

/**
 * 2つのベクトル間のコサイン類似度を計算します。
 * 結果は -1.0 から 1.0 の範囲になります（通常は正の値）。
 * 
 * @param vecA ベクトルA
 * @param vecB ベクトルB
 * @returns コサイン類似度
 */
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
