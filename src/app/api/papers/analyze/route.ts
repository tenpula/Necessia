/*
 * 【ファイル概要】
 * 論文の引用文脈分析API
 * AIを使って「なぜその論文を引用したのか」を分析要求する通信口です。
 * Server-Sent Events (SSE) でリアルタイム進捗を送信します。
 */

// 引用文脈解析 API Route
// =============================================================================
// ■ 認証 & 利用制限の仕組み（このAPIに追加された新機能）:
//   1. セッションチェック: Auth.jsで現在のユーザーを確認
//   2. 利用回数チェック: 本日の分析回数が3回未満か確認
//   3. カウントインクリメント: 分析実行時にUsageLogに記録
//   4. 既存の分析ロジック: 上記チェック後に実行（変更なし）
// ■ SSE対応:
//   - リアルタイムで各引用の解析完了時に進捗を送信
//   - クライアント側で進捗をリアルタイムに受け取り、UIを更新できる
// =============================================================================
import { NextRequest, NextResponse } from 'next/server';
import { classifyCitationContext, isLLMConfigured, getLLMModelName } from '@/lib/llm';
import { Paper, CitationContextType } from '@/types/paper';
import { auth } from '@/lib/auth';
import { checkAndIncrementUsage } from '@/lib/usage';

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

// SSE イベントを送信するヘルパー関数
function createSSEMessage(data: Record<string, unknown>): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function POST(request: NextRequest) {
  try {
    console.log('[Analyze API] POST request received');

    // =========================================================================
    // 認証チェック
    // =========================================================================
    const session = await auth();
    if (!session?.user?.id) {
      console.log('[Analyze API] Unauthenticated request rejected');
      return NextResponse.json(
        { error: 'ログインが必要です。右上のボタンからGoogleアカウントでログインしてください。' },
        { status: 401 }
      );
    }

    // =========================================================================
    // 利用回数チェック & インクリメント
    // =========================================================================
    const usage = await checkAndIncrementUsage(session.user.id, 'analysis');
    if (!usage.allowed) {
      console.log(`[Analyze API] Usage limit reached for user ${session.user.id}`);
      return NextResponse.json(
        { 
          error: '無料体験枠を使い切りました。継続して利用したい場合は、オープンソース版をご自身の環境で構築してください。',
          usageLimitReached: true,
          remaining: 0,
        },
        { status: 429 }
      );
    }

    console.log(`[Analyze API] Usage allowed for user ${session.user.id}, remaining: ${usage.remaining}`);

    // =========================================================================
    // 既存の分析ロジック
    // =========================================================================
    
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

    // SSEストリーム対応
    const encoder = new TextEncoder();
    let clientClosed = false;

    const stream = new ReadableStream({
      async start(controller) {
        try {
          if (llmConfigured) {
            // Firestoreなし、LLMあり
            const REQUEST_DELAY = requestDelay;
            console.log(`[Analyze API] Using REQUEST_DELAY: ${REQUEST_DELAY}ms (${Math.round(60000 / REQUEST_DELAY)} RPM)`);
            const MAX_RETRIES = 2;
            const MAX_ANALYZE = limitedCitations.length;
            console.log(`[Analyze API] Processing ${MAX_ANALYZE} citations with LLM`);
            
            for (let i = 0; i < limitedCitations.length; i++) {
              if (clientClosed) break;
              
              if (request.signal.aborted) {
                console.log(`[Analyze API] Request was aborted at citation ${i + 1}/${MAX_ANALYZE}`);
                break;
              }
              
              const citation = limitedCitations[i];
              let retryCount = 0;
              let success = false;
              let classificationTime = 0;
              
              while (!success && retryCount < MAX_RETRIES) {
                if (request.signal.aborted || clientClosed) break;
                
                try {
                  const classificationStartTime = Date.now();
                  console.log(`[Analyze API] Classifying citation ${i + 1}/${MAX_ANALYZE} (attempt ${retryCount + 1})`);
                  const classification = await classifyCitationContext(
                    citation.sourcePaper,
                    citation.targetPaper
                  );
                  classificationTime = Date.now() - classificationStartTime;
                  
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
                  
                  // 進捗をSSEで送信
                  const progressEvent = createSSEMessage({
                    type: 'progress',
                    analyzed: analyzedCount,
                    total: MAX_ANALYZE,
                    currentPaper: `${citation.targetPaper.title.substring(0, 35)}...`,
                    percentage: Math.round((analyzedCount / MAX_ANALYZE) * 100),
                  });
                  controller.enqueue(encoder.encode(progressEvent));
                  
                  // レート制限のため待機
                  if (i < MAX_ANALYZE - 1) {
                    console.log(`[Analyze API] Waiting ${REQUEST_DELAY}ms for rate limit...`);
                    
                    const waitChunkTime = 50;
                    const chunks = Math.ceil(REQUEST_DELAY / waitChunkTime);
                    
                    for (let j = 0; j < chunks; j++) {
                      if (request.signal.aborted || clientClosed) break;
                      const waitTime = Math.min(waitChunkTime, REQUEST_DELAY - (j * waitChunkTime));
                      await new Promise((resolve) => setTimeout(resolve, waitTime));
                    }
                  }
                } catch (error: unknown) {
                  if (request.signal.aborted || clientClosed) break;
                  
                  const errorObj = error as { status?: number };
                  console.error('[Analyze API] LLM analysis error:', error);
                  
                  if (errorObj.status === 429) {
                    retryCount++;
                    const backoffTime = REQUEST_DELAY * Math.pow(2, retryCount);
                    console.log(`[Analyze API] Rate limited, waiting ${backoffTime / 1000}s before retry...`);
                    
                    const waitChunkTime = 50;
                    const chunks = Math.ceil(backoffTime / waitChunkTime);
                    
                    for (let j = 0; j < chunks; j++) {
                      if (request.signal.aborted || clientClosed) break;
                      const waitTime = Math.min(waitChunkTime, backoffTime - (j * waitChunkTime));
                      await new Promise((resolve) => setTimeout(resolve, waitTime));
                    }
                  } else {
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
          } else {
            // LLMなし
            for (const citation of limitedCitations) {
              results.push({
                sourceId: citation.sourceId,
                targetId: citation.targetId,
                contextType: 'background',
                confidence: 0.5,
                cached: false,
              });
            }
            analyzedCount = limitedCitations.length;
          }
          
          // 完了イベントを送信
          const completeEvent = createSSEMessage({
            type: 'complete',
            results,
            stats: {
              total: results.length,
              analyzed: analyzedCount,
              cached: 0,
              llmModel,
            },
          });
          controller.enqueue(encoder.encode(completeEvent));
          controller.close();
        } catch (error) {
          console.error('[Analyze API] Stream error:', error);
          const errorEvent = createSSEMessage({
            type: 'error',
            error: 'Failed to analyze citations',
            message: error instanceof Error ? error.message : 'Unknown error',
          });
          controller.enqueue(encoder.encode(errorEvent));
          controller.close();
        }
      },
    });

    // SSE レスポンスヘッダーを設定
    const response = new NextResponse(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      },
    });

    // クライアント接続終了時の処理
    request.signal.addEventListener('abort', () => {
      clientClosed = true;
    });

    return response;
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
