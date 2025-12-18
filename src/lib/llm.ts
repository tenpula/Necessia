// LLM による引用文脈分類
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { CitationContextType, Paper } from '@/types/paper';

// LLMプロバイダーの型
type LLMProvider = 'gemini' | 'openai';

// 分類結果の型
interface ClassificationResult {
  contextType: CitationContextType;
  confidence: number;
  explanation?: string;
}

// 使用するLLMプロバイダーを決定
function getLLMProvider(): LLMProvider {
  if (process.env.GEMINI_API_KEY) {
    return 'gemini';
  }
  if (process.env.OPENAI_API_KEY) {
    return 'openai';
  }
  throw new Error('No LLM API key configured. Please set GEMINI_API_KEY or OPENAI_API_KEY.');
}

// LLMモデル名を取得
export function getLLMModelName(): string {
  const provider = getLLMProvider();
  if (provider === 'gemini') {
    return 'gemini-1.5-flash';
  }
  return 'gpt-4o-mini';
}

// 利用可能なGeminiモデルを一覧表示（デバッグ用）
export async function listAvailableGeminiModels(): Promise<string[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return [];
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );
    
    if (!response.ok) {
      console.error('[LLM] Failed to list models:', response.status, await response.text());
      return [];
    }
    
    const data = await response.json();
    const models = data.models || [];
    const modelNames = models
      .filter((m: { supportedGenerationMethods?: string[] }) => 
        m.supportedGenerationMethods?.includes('generateContent')
      )
      .map((m: { name: string }) => m.name.replace('models/', ''));
    
    console.log('[LLM] Available Gemini models:', modelNames);
    return modelNames;
  } catch (error) {
    console.error('[LLM] Error listing models:', error);
    return [];
  }
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

// Gemini APIで分類（REST API直接呼び出し）
async function classifyWithGemini(
  sourcePaper: Paper,
  targetPaper: Paper
): Promise<ClassificationResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const prompt = CLASSIFICATION_PROMPT
    .replace('{sourceTitle}', sourcePaper.title)
    .replace('{sourceAbstract}', sourcePaper.abstract || 'No abstract available')
    .replace('{targetTitle}', targetPaper.title)
    .replace('{targetAbstract}', targetPaper.abstract || 'No abstract available');

  // 利用可能なモデルを試す
  const models = ['gemini-1.5-flash', 'gemini-pro', 'gemini-1.0-pro'];
  
  for (const modelName of models) {
    try {
      console.log(`[LLM] Trying model: ${modelName}`);
      
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
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
            },
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`[LLM] Model ${modelName} error:`, response.status, errorData);
        
        // 404の場合は次のモデルを試す
        if (response.status === 404) {
          continue;
        }
        
        // 429エラーは再スロー
        if (response.status === 429) {
          const error = new Error('Rate limited') as Error & { status: number };
          error.status = 429;
          throw error;
        }
        
        continue;
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      console.log('[LLM] Gemini response:', text.substring(0, 150));

      // JSONを抽出してパース
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn('[LLM] Could not extract JSON from Gemini response:', text);
        return { contextType: 'background', confidence: 0.5 };
      }

      const parsed = JSON.parse(jsonMatch[0]);
      console.log('[LLM] Parsed result:', parsed.contextType, 'confidence:', parsed.confidence);
      
      return {
        contextType: validateContextType(parsed.contextType),
        confidence: Math.min(Math.max(parsed.confidence || 0.5, 0), 1),
        explanation: parsed.explanation,
      };
    } catch (error: unknown) {
      const errorObj = error as { status?: number; message?: string };
      
      // 429エラーは再スロー
      if (errorObj.status === 429) {
        throw error;
      }
      
      console.error(`[LLM] Model ${modelName} error:`, errorObj.message);
    }
  }
  
  console.error('[LLM] All models failed');
  return { contextType: 'background', confidence: 0.3 };
}

// OpenAI APIで分類
async function classifyWithOpenAI(
  sourcePaper: Paper,
  targetPaper: Paper
): Promise<ClassificationResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const openai = new OpenAI({ apiKey });

  const prompt = CLASSIFICATION_PROMPT
    .replace('{sourceTitle}', sourcePaper.title)
    .replace('{sourceAbstract}', sourcePaper.abstract || 'No abstract available')
    .replace('{targetTitle}', targetPaper.title)
    .replace('{targetAbstract}', targetPaper.abstract || 'No abstract available');

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a citation context classifier. Respond only with valid JSON.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.1,
      max_tokens: 256,
      response_format: { type: 'json_object' },
    });

    const text = completion.choices[0]?.message?.content || '';
    const parsed = JSON.parse(text);

    return {
      contextType: validateContextType(parsed.contextType),
      confidence: Math.min(Math.max(parsed.confidence || 0.5, 0), 1),
      explanation: parsed.explanation,
    };
  } catch (error) {
    console.error('OpenAI classification error:', error);
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

// メイン分類関数
export async function classifyCitationContext(
  sourcePaper: Paper,
  targetPaper: Paper
): Promise<ClassificationResult> {
  const provider = getLLMProvider();

  if (provider === 'gemini') {
    return classifyWithGemini(sourcePaper, targetPaper);
  } else {
    return classifyWithOpenAI(sourcePaper, targetPaper);
  }
}

// LLMが利用可能かチェック
export function isLLMConfigured(): boolean {
  return !!(process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY);
}

// バッチ分類（レート制限考慮）
export async function classifyCitationContextsBatch(
  pairs: { source: Paper; target: Paper }[],
  onProgress?: (completed: number, total: number) => void
): Promise<Map<string, ClassificationResult>> {
  const results = new Map<string, ClassificationResult>();
  const delayBetweenRequests = 200; // 200ms間隔

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

