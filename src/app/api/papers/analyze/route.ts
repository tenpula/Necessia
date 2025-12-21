// 引用文脈解析 API Route
import { NextRequest, NextResponse } from 'next/server';
import { classifyCitationContext, isLLMConfigured, getLLMModelName } from '@/lib/llm';
import { Paper, CitationContextType } from '@/types/paper';

interface AnalyzeRequest {
  citations: {
    sourceId: string;
    targetId: string;
    sourcePaper: Paper;
    targetPaper: Paper;
  }[];
}

interface AnalyzeResponse {
  results: {
    sourceId: string;
    targetId: string;
    contextType: CitationContextType;
    confidence: number;
    cached: boolean;
  }[];
  stats: {
    total: number;
    analyzed: number;
    cached: number;
    llmModel: string | null;
  };
}

export async function POST(request: NextRequest) {
  try {
    console.log('[Analyze API] POST request received');
    const body: AnalyzeRequest = await request.json();
    const { citations } = body;

    if (!citations || !Array.isArray(citations) || citations.length === 0) {
      return NextResponse.json(
        { error: 'Citations array is required' },
        { status: 400 }
      );
    }

    // 最大100件まで
    const limitedCitations = citations.slice(0, 100);
    console.log(`[Analyze API] Processing ${limitedCitations.length} citations`);

    const results: AnalyzeResponse['results'] = [];
    let analyzedCount = 0;

    // LLMが設定されているかチェック
    const llmConfigured = isLLMConfigured();
    const llmModel = llmConfigured ? getLLMModelName() : null;
    console.log(`[Analyze API] LLM configured: ${llmConfigured}, model: ${llmModel}`);

    if (llmConfigured) {
      // Firestoreなし、LLMあり
      // Gemini API Tier 1: 2000 RPM
      // 余裕を持って少し待機を入れる
      const REQUEST_DELAY = 50; // 50ms
      const MAX_RETRIES = 2;
      
      // 全て解析する
      const MAX_ANALYZE = limitedCitations.length;
      console.log(`[Analyze API] Processing ${MAX_ANALYZE} citations with LLM`);
      
      for (let i = 0; i < limitedCitations.length; i++) {
        const citation = limitedCitations[i];
        
        let retryCount = 0;
        let success = false;
        
        while (!success && retryCount < MAX_RETRIES) {
          try {
            console.log(`[Analyze API] Classifying citation ${i + 1}/${MAX_ANALYZE} (attempt ${retryCount + 1})`);
            const classification = await classifyCitationContext(
              citation.sourcePaper,
              citation.targetPaper
            );
            
            console.log(`[Analyze API] Result: ${classification.contextType} (confidence: ${classification.confidence})`);

            results.push({
              sourceId: citation.sourceId,
              targetId: citation.targetId,
              contextType: classification.contextType,
              confidence: classification.confidence,
              cached: false,
            });

            analyzedCount++;
            success = true;
            
            // レート制限のため待機（最後のリクエスト以外）
            if (i < MAX_ANALYZE - 1) {
              console.log(`[Analyze API] Waiting ${REQUEST_DELAY / 1000}s for rate limit...`);
              await new Promise((resolve) => setTimeout(resolve, REQUEST_DELAY));
            }
          } catch (error: unknown) {
            const errorObj = error as { status?: number };
            console.error('[Analyze API] LLM analysis error:', error);
            
            // 429エラー（レート制限）の場合はリトライ
            if (errorObj.status === 429) {
              retryCount++;
              const backoffTime = REQUEST_DELAY * Math.pow(2, retryCount); // 指数バックオフ
              console.log(`[Analyze API] Rate limited, waiting ${backoffTime / 1000}s before retry...`);
              await new Promise((resolve) => setTimeout(resolve, backoffTime));
            } else {
              // その他のエラーはスキップ
              break;
            }
          }
        }
        
        if (!success) {
          results.push({
            sourceId: citation.sourceId,
            targetId: citation.targetId,
            contextType: 'background',
            confidence: 0.3,
            cached: false,
          });
        }
      }
      
      // 結果の統計
      const stats = {
        methodology: results.filter(r => r.contextType === 'methodology').length,
        critique: results.filter(r => r.contextType === 'critique').length,
        comparison: results.filter(r => r.contextType === 'comparison').length,
        background: results.filter(r => r.contextType === 'background').length,
        llmAnalyzed: analyzedCount,
        skipped: 0,
      };
      console.log('[Analyze API] Classification stats:', stats);
    } else {
      // どちらも設定されていない場合
      for (const citation of limitedCitations) {
        results.push({
          sourceId: citation.sourceId,
          targetId: citation.targetId,
          contextType: 'background',
          confidence: 0.5,
          cached: false,
        });
      }
    }

    const response: AnalyzeResponse = {
      results,
      stats: {
        total: results.length,
        analyzed: analyzedCount,
        cached: 0,
        llmModel,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Analyze error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze citations' },
      { status: 500 }
    );
  }
}

// 単一の引用文脈を解析
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const sourceId = searchParams.get('sourceId');
  const targetId = searchParams.get('targetId');

  if (!sourceId || !targetId) {
    return NextResponse.json(
      { error: 'sourceId and targetId are required' },
      { status: 400 }
    );
  }

  return NextResponse.json({
    contextType: 'background',
    confidence: 0.5,
    cached: false,
    message: 'Use POST with paper data to analyze.',
  });
}
