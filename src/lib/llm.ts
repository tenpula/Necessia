// LLM による引用文脈分類
import { CitationContextType, Paper } from '@/types/paper';

// 分類結果の型
interface ClassificationResult {
  contextType: CitationContextType;
  confidence: number;
  explanation?: string;
}

const GEMINI_MODEL_NAME = 'gemini-2.0-flash-lite';

// LLMモデル名を取得
export function getLLMModelName(): string {
  return GEMINI_MODEL_NAME;
}

// プロンプトテンプレート
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

// メイン分類関数
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

  try {
    console.log(`[LLM] Requesting classification using ${GEMINI_MODEL_NAME}`);
    
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
      console.error(`[LLM] Model ${GEMINI_MODEL_NAME} error:`, response.status, errorData);
      
      if (response.status === 429) {
        throw new Error('Rate limited');
      }
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
    console.error('[LLM] Classification error:', error);
    return { contextType: 'background', confidence: 0.3 };
  }
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

// バッチ分類（レート制限考慮）
export async function classifyCitationContextsBatch(
  pairs: { source: Paper; target: Paper }[],
  onProgress?: (completed: number, total: number) => void
): Promise<Map<string, ClassificationResult>> {
  const results = new Map<string, ClassificationResult>();
  const delayBetweenRequests = 500; // 安全のため間隔を広げる

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
      await new Promise((resolve) => setTimeout(resolve, delayBetweenRequests));
    }
  }

  return results;
}
