/**
 * LLM (Large Language Model) を使用した引用文脈分析モジュール
 * 
 * Google Gemini APIを使用して、論文間の引用関係（Context）を分類します。
 * 単なる「引用」だけでなく、それが「手法の利用」なのか「批判」なのか「比較」なのかを識別します。
 */
import { CitationContextType, Paper } from '@/types/paper';

/**
 * 分類結果の型定義
 */
interface ClassificationResult {
  contextType: CitationContextType; // 分類されたタイプ
  confidence: number;               // 信頼度 (0.0 - 1.0)
  explanation?: string;             // 分類理由の説明
}

// 安定版のモデルIDを指定
const GEMINI_MODEL_NAME = 'gemini-2.5-flash-lite';
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 2000;

// LLMモデル名を取得
export function getLLMModelName(): string {
  return GEMINI_MODEL_NAME;
}

/**
 * 引用文脈分類のためのプロンプトテンプレート
 * 
 * LLMに対して、2つの論文（引用元と引用先）のタイトルとアブストラクトを提示し、
 * その関係性を以下の4つのカテゴリのいずれかに分類するように指示します。
 * 1. methodology: 手法の利用
 * 2. critique: 批判的検討
 * 3. comparison: 比較
 * 4. background: 背景・関連研究
 */
const CLASSIFICATION_PROMPT = `You are a citation context classifier for computer science research papers.

Analyze the relationship between two papers and classify the citation context into one of these categories:

1. **methodology** - The citing paper uses methods, techniques, or approaches from the cited paper.
   Examples: "We use the method proposed by...", "Following the approach of...", "Based on the framework from..."

2. **critique** - The citing paper criticizes, points out limitations, or identifies problems with the cited paper.
   Examples: "However, their approach fails to...", "Unlike [citation] which suffers from...", "The limitation of..."

3. **comparison** - The citing paper compares its results or methods with the cited paper (as a baseline or benchmark).
   Examples: "We compare our results with...", "Outperforms [citation]...", "In contrast to..."

4. **background** - General reference as related work without specific methodological or critical relationship.
   Examples: "Related work includes...", "[Citation] studied...", "Previous research has shown..."

Given:
- **Citing Paper (Source)**: {sourceTitle}
  Abstract: {sourceAbstract}

- **Cited Paper (Target)**: {targetTitle}
  Abstract: {targetAbstract}

Based on the abstracts and titles, determine the most likely citation context type.

Respond in JSON format ONLY:
{
  "contextType": "methodology" | "critique" | "comparison" | "background",
  "confidence": 0.0-1.0,
  "explanation": "brief explanation"
}`;

// デバッグ用：利用可能なモデル一覧を表示
async function logAvailableModels(apiKey: string) {
  try {
    console.log('[LLM] Fetching list of available models...');
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );
    if (!response.ok) {
      console.error('[LLM] Failed to list models:', response.status);
      return;
    }
    const data = await response.json();
    const models = data.models || [];
    interface Model {
      name: string;
      supportedGenerationMethods?: string[];
    }
    const availableModels = models
      .filter((m: Model) => m.supportedGenerationMethods?.includes('generateContent'))
      .map((m: Model) => m.name.replace('models/', ''));
    
    console.log('[LLM] Available models for generateContent:', availableModels);
  } catch (error) {
    console.error('[LLM] Error listing models:', error);
  }
}

/**
 * 2つの論文間の引用文脈を分類します。
 * Gemini APIを呼び出し、結果をパースして返します。
 * リトライロジックやエラーハンドリングも含まれています。
 * 
 * @param sourcePaper 引用元の論文
 * @param targetPaper 引用先の論文
 * @returns 分類結果（タイプ、信頼度、説明）
 */
export async function classifyCitationContext(
  sourcePaper: Paper,
  targetPaper: Paper
): Promise<ClassificationResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('[LLM] GEMINI_API_KEY is not configured. Returning default result.');
    return { contextType: 'background', confidence: 0.3 };
  }

  const prompt = CLASSIFICATION_PROMPT
    .replace('{sourceTitle}', sourcePaper.title)
    .replace('{sourceAbstract}', sourcePaper.abstract || 'No abstract available')
    .replace('{targetTitle}', targetPaper.title)
    .replace('{targetAbstract}', targetPaper.abstract || 'No abstract available');

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[LLM] Requesting classification using ${GEMINI_MODEL_NAME} (attempt ${attempt + 1})`);
      
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL_NAME}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: prompt }]
            }],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 256,
              responseMimeType: 'application/json',
            },
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // 404 Not Found: モデル名が間違っている可能性があるため一覧を表示
        if (response.status === 404) {
          console.error(`[LLM] Model ${GEMINI_MODEL_NAME} not found.`);
          if (attempt === 0) await logAvailableModels(apiKey);
          break; // リトライしても無駄なので終了
        }

        // 429 Rate Limited
        if (response.status === 429) {
          const message = errorData.error?.message || '';
          
          // 無料枠上限が0（利用不可）の場合はリトライしない
          if (message.includes('limit: 0')) {
             console.error(`[LLM] Quota limit is 0 for ${GEMINI_MODEL_NAME}. This model is not available for your account/key.`);
             if (attempt === 0) await logAvailableModels(apiKey);
             break;
          }

          console.warn(`[LLM] Rate limited (429) for model ${GEMINI_MODEL_NAME}.`);
          if (attempt < MAX_RETRIES) {
             const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt);
             console.log(`[LLM] Retrying in ${delay}ms...`);
             await new Promise(r => setTimeout(r, delay));
             continue;
          }
          throw new Error('Rate limited after max retries');
        }
        
        console.error(`[LLM] Model ${GEMINI_MODEL_NAME} error:`, response.status, errorData);
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      let parsed: { contextType: string; confidence?: number; explanation?: string } | null = null;
      try {
        parsed = JSON.parse(text);
      } catch {
        // JSON形式でない場合、正規表現で抽出を試みる
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            parsed = JSON.parse(jsonMatch[0]);
          } catch (e) {
            console.error('[LLM] Failed to parse extracted JSON:', e);
          }
        }
      }

      if (!parsed) {
        console.warn('[LLM] Could not extract valid JSON from Gemini response:', text);
        return { contextType: 'background', confidence: 0.5 };
      }

      console.log('[LLM] Parsed result:', parsed.contextType, 'confidence:', parsed.confidence);
      
      return {
        contextType: validateContextType(parsed.contextType),
        confidence: Math.min(Math.max(parsed.confidence || 0.5, 0), 1),
        explanation: parsed.explanation,
      };
    } catch (error) {
      if (attempt === MAX_RETRIES) {
        console.error('[LLM] Classification failed after retries:', error);
        return { contextType: 'background', confidence: 0.3 };
      }
      
      // ネットワークエラーなどはリトライ
      console.warn(`[LLM] Attempt ${attempt + 1} failed with error:`, error);
      const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  
  return { contextType: 'background', confidence: 0.3 };
}

// 文脈タイプのバリデーション
function validateContextType(type: string): CitationContextType {
  const validTypes: CitationContextType[] = ['methodology', 'critique', 'comparison', 'background'];
  if (validTypes.includes(type as CitationContextType)) {
    return type as CitationContextType;
  }
  return 'background';
}

// LLMが利用可能かチェック
export function isLLMConfigured(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

/**
 * 複数の論文ペアに対して一括で引用文脈分類を行います。
 * APIのレート制限（Rate Limit）を考慮して、リクエスト間に待機時間を設けて順次処理します。
 * 
 * @param pairs 分類対象の論文ペアの配列
 * @param onProgress 進捗状況を通知するコールバック関数
 * @returns 分類結果のMap（キーは "sourceId->targetId" 形式）
 */
export async function classifyCitationContextsBatch(
  pairs: { source: Paper; target: Paper }[],
  onProgress?: (completed: number, total: number) => void
): Promise<Map<string, ClassificationResult>> {
  const results = new Map<string, ClassificationResult>();
  const delayBetweenRequests = 50; // 50ms間隔 (20リクエスト/秒程度、RPM 1200)

  for (let i = 0; i < pairs.length; i++) {
    const { source, target } = pairs[i];
    const key = `${source.id}->${target.id}`;

    try {
      const result = await classifyCitationContext(source, target);
      results.set(key, result);
    } catch (error) {
      console.error(`Failed to classify ${key}:`, error);
      results.set(key, { contextType: 'background', confidence: 0.3 });
    }

    // 進捗コールバック
    if (onProgress) {
      onProgress(i + 1, pairs.length);
    }

    // レート制限のため待機
    if (i < pairs.length - 1) {
      console.log(`[LLM] Waiting ${delayBetweenRequests}ms before next request...`);
      await new Promise((resolve) => setTimeout(resolve, delayBetweenRequests));
    }
  }

  return results;
}
