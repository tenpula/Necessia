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
  requestDelay?: number; // リクエスト間隔（ミリ秒）
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
    
    // リクエストがキャンセルされたかチェック
    if (request.signal.aborted) {
      console.log('[Analyze API] Request was aborted before processing');
      return NextResponse.json(
        { error: 'Request was cancelled' },
        { status: 499 } // Client Closed Request
      );
    }
    
    const body: AnalyzeRequest = await request.json();
    const { citations, requestDelay = 50 } = body;

    console.log(`[Analyze API] Received requestDelay: ${requestDelay}ms`);

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
      // リクエストレートはクライアントから指定される
      const REQUEST_DELAY = requestDelay; // クライアントから指定されたレート
      console.log(`[Analyze API] Using REQUEST_DELAY: ${REQUEST_DELAY}ms (${Math.round(60000 / REQUEST_DELAY)} RPM)`);
      const MAX_RETRIES = 2;
      
      // 全て解析する
      const MAX_ANALYZE = limitedCitations.length;
      console.log(`[Analyze API] Processing ${MAX_ANALYZE} citations with LLM`);
      
      for (let i = 0; i < limitedCitations.length; i++) {
        // リクエストがキャンセルされたかチェック
        if (request.signal.aborted) {
          console.log(`[Analyze API] Request was aborted at citation ${i + 1}/${MAX_ANALYZE}`);
          // これまでに処理した結果を返す
          break;
        }
        
        const citation = limitedCitations[i];
        
        let retryCount = 0;
        let success = false;
        let classificationTime = 0;
        
        while (!success && retryCount < MAX_RETRIES) {
          // リトライ前にキャンセルチェック
          if (request.signal.aborted) {
            console.log(`[Analyze API] Request was aborted during retry for citation ${i + 1}`);
            break;
          }
          
          try {
            const classificationStartTime = Date.now();
            console.log(`[Analyze API] Classifying citation ${i + 1}/${MAX_ANALYZE} (attempt ${retryCount + 1})`);
            const classification = await classifyCitationContext(
              citation.sourcePaper,
              citation.targetPaper
            );
            classificationTime = Date.now() - classificationStartTime;
            
            console.log(`[Analyze API] Result: ${classification.contextType} (confidence: ${classification.confidence}) - Processing time: ${classificationTime}ms`);

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
              const waitStartTime = Date.now();
              const totalTimeBeforeWait = classificationTime;
              console.log(`[Analyze API] Waiting ${REQUEST_DELAY}ms (${REQUEST_DELAY / 1000}s) for rate limit... (API processing took ${classificationTime}ms)`);
              
              // 待機中もキャンセルをチェック
              if (REQUEST_DELAY <= 50) {
                // 短い待機時間の場合は直接待機
                await new Promise((resolve) => setTimeout(resolve, REQUEST_DELAY));
                if (request.signal.aborted) {
                  console.log('[Analyze API] Request cancelled during wait');
                  break;
                }
              } else {
                // 長い待機時間の場合は定期的にキャンセルをチェック
                const waitWithCancellation = async (ms: number) => {
                  const checkInterval = 50; // 50msごとにチェック
                  const checks = Math.ceil(ms / checkInterval);
                  let remaining = ms;
                  for (let j = 0; j < checks; j++) {
                    if (request.signal.aborted) {
                      throw new Error('Request cancelled during wait');
                    }
                    const waitTime = Math.min(checkInterval, remaining);
                    await new Promise((resolve) => setTimeout(resolve, waitTime));
                    remaining -= waitTime;
                  }
                };
                
                try {
                  await waitWithCancellation(REQUEST_DELAY);
                } catch (error) {
                  if (error instanceof Error && error.message === 'Request cancelled during wait') {
                    console.log('[Analyze API] Request cancelled during wait');
                    break;
                  }
                  throw error;
                }
              }
              
              const waitTime = Date.now() - waitStartTime;
              const totalTimePerRequest = totalTimeBeforeWait + waitTime;
              console.log(`[Analyze API] Wait completed: ${waitTime}ms, Total time per request: ${totalTimePerRequest}ms (API: ${classificationTime}ms + Wait: ${waitTime}ms)`);
            }
          } catch (error: unknown) {
            // キャンセルエラーの場合はループを抜ける
            if (request.signal.aborted) {
              console.log('[Analyze API] Request was aborted');
              break;
            }
            
            const errorObj = error as { status?: number };
            console.error('[Analyze API] LLM analysis error:', error);
            
            // 429エラー（レート制限）の場合はリトライ
            if (errorObj.status === 429) {
              retryCount++;
              const backoffTime = REQUEST_DELAY * Math.pow(2, retryCount); // 指数バックオフ
              console.log(`[Analyze API] Rate limited, waiting ${backoffTime / 1000}s before retry...`);
              
              // バックオフ待機中もキャンセルをチェック
              const waitWithCancellation = async (ms: number) => {
                const checkInterval = Math.min(50, ms); // 50msごとにチェック、または待機時間が短い場合はそのまま
                const checks = Math.ceil(ms / checkInterval);
                let remaining = ms;
                for (let j = 0; j < checks; j++) {
                  if (request.signal.aborted) {
                    throw new Error('Request cancelled during backoff');
                  }
                  const waitTime = Math.min(checkInterval, remaining);
                  await new Promise((resolve) => setTimeout(resolve, waitTime));
                  remaining -= waitTime;
                }
              };
              
              try {
                await waitWithCancellation(backoffTime);
              } catch (error) {
                if (error instanceof Error && error.message === 'Request cancelled during backoff') {
                  console.log('[Analyze API] Request cancelled during backoff');
                  break;
                }
                throw error;
              }
            } else {
              // その他のエラーはスキップ
              break;
            }
          }
        }
        
        // キャンセルされた場合はループを抜ける
        if (request.signal.aborted) {
          break;
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
