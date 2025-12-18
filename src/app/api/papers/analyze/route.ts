// 引用文脈解析 API Route
import { NextRequest, NextResponse } from 'next/server';
import { classifyCitationContext, isLLMConfigured, getLLMModelName } from '@/lib/llm';
import {
  getCachedCitationContext,
  saveCitationContextToCache,
  getBatchCachedCitationContexts,
  saveBatchCitationContextsToCache,
} from '@/lib/cache';
import { isFirebaseConfigured } from '@/lib/firebase';
import { Paper, CitationContextType, CachedCitationContext } from '@/types/paper';

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
    let cachedCount = 0;
    let analyzedCount = 0;

    // LLMが設定されているかチェック
    const llmConfigured = isLLMConfigured();
    const llmModel = llmConfigured ? getLLMModelName() : null;
    console.log(`[Analyze API] LLM configured: ${llmConfigured}, model: ${llmModel}`);

    // Firestoreが設定されている場合、キャッシュをチェック
    const firebaseConfigured = isFirebaseConfigured();
    console.log(`[Analyze API] Firebase configured: ${firebaseConfigured}`);
    
    if (firebaseConfigured) {
      console.log('[Analyze API] Checking Firebase cache...');
      const cacheKeys = limitedCitations.map((c) => ({
        sourceId: c.sourceId,
        targetId: c.targetId,
      }));

      try {
        const cachedResults = await getBatchCachedCitationContexts(cacheKeys);
        console.log(`[Analyze API] Cache check complete, found ${cachedResults.size} cached items`);

        for (const citation of limitedCitations) {
          const cacheKey = `${citation.sourceId.replace('https://openalex.org/', '')}->${citation.targetId.replace('https://openalex.org/', '')}`;
          const cached = cachedResults.get(cacheKey);

          if (cached) {
            // キャッシュヒット
            results.push({
              sourceId: citation.sourceId,
              targetId: citation.targetId,
              contextType: cached.contextType,
              confidence: cached.confidence,
              cached: true,
            });
            cachedCount++;
          } else if (llmConfigured) {
            // キャッシュミス - LLMで解析
            console.log(`[Analyze API] Analyzing citation ${analyzedCount + 1}/${limitedCitations.length - cachedCount}`);
            try {
              const classification = await classifyCitationContext(
                citation.sourcePaper,
                citation.targetPaper
              );

              results.push({
                sourceId: citation.sourceId,
                targetId: citation.targetId,
                contextType: classification.contextType,
                confidence: classification.confidence,
                cached: false,
              });

              // キャッシュに保存（エラーを無視）
              try {
                await saveCitationContextToCache({
                  sourceId: citation.sourceId,
                  targetId: citation.targetId,
                  sourcePaperTitle: citation.sourcePaper.title,
                  targetPaperTitle: citation.targetPaper.title,
                  contextType: classification.contextType,
                  confidence: classification.confidence,
                  llmModel: llmModel || 'unknown',
                });
              } catch (cacheError) {
                console.warn('[Analyze API] Cache save error:', cacheError);
              }

              analyzedCount++;

              // レート制限のため少し待機
              await new Promise((resolve) => setTimeout(resolve, 100));
            } catch (error) {
              console.error('[Analyze API] LLM analysis error:', error);
              // エラー時はbackgroundとして扱う
              results.push({
                sourceId: citation.sourceId,
                targetId: citation.targetId,
                contextType: 'background',
                confidence: 0.3,
                cached: false,
              });
            }
          } else {
            // LLMが設定されていない場合はbackground
            results.push({
              sourceId: citation.sourceId,
              targetId: citation.targetId,
              contextType: 'background',
              confidence: 0.5,
              cached: false,
            });
          }
        }
      } catch (cacheError) {
        console.error('[Analyze API] Firebase cache error:', cacheError);
        // キャッシュエラー時はLLMのみで処理を続行
        console.log('[Analyze API] Falling back to LLM-only mode');
        for (const citation of limitedCitations) {
          if (llmConfigured) {
            try {
              const classification = await classifyCitationContext(
                citation.sourcePaper,
                citation.targetPaper
              );
              results.push({
                sourceId: citation.sourceId,
                targetId: citation.targetId,
                contextType: classification.contextType,
                confidence: classification.confidence,
                cached: false,
              });
              analyzedCount++;
              await new Promise((resolve) => setTimeout(resolve, 100));
            } catch (llmError) {
              results.push({
                sourceId: citation.sourceId,
                targetId: citation.targetId,
                contextType: 'background',
                confidence: 0.3,
                cached: false,
              });
            }
          } else {
            results.push({
              sourceId: citation.sourceId,
              targetId: citation.targetId,
              contextType: 'background',
              confidence: 0.5,
              cached: false,
            });
          }
        }
      }
    } else if (llmConfigured) {
      // Firestoreなし、LLMあり
      // Gemini API無料枠: 15 RPM（1分あたり15リクエスト）
      // 安全のため、1リクエストあたり10秒待機
      const REQUEST_DELAY = 10000; // 10秒
      const MAX_RETRIES = 2;
      
      // 一度に解析する数を制限（無料枠では時間がかかるため）
      const MAX_ANALYZE = Math.min(limitedCitations.length, 5);
      console.log(`[Analyze API] Processing ${MAX_ANALYZE} of ${limitedCitations.length} citations with LLM (rate limited)`);
      
      for (let i = 0; i < limitedCitations.length; i++) {
        const citation = limitedCitations[i];
        
        // 最初のN件のみLLMで解析、残りはbackgroundとして処理
        if (i >= MAX_ANALYZE) {
          results.push({
            sourceId: citation.sourceId,
            targetId: citation.targetId,
            contextType: 'background',
            confidence: 0.5,
            cached: false,
          });
          continue;
        }
        
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
        skipped: limitedCitations.length - MAX_ANALYZE,
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
        cached: cachedCount,
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

  // キャッシュをチェック
  if (isFirebaseConfigured()) {
    const cached = await getCachedCitationContext(sourceId, targetId);
    if (cached) {
      return NextResponse.json({
        contextType: cached.contextType,
        confidence: cached.confidence,
        contextSnippet: cached.contextSnippet,
        cached: true,
      });
    }
  }

  return NextResponse.json({
    contextType: 'background',
    confidence: 0.5,
    cached: false,
    message: 'Not found in cache. Use POST with paper data to analyze.',
  });
}

