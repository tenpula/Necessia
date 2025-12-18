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

    const results: AnalyzeResponse['results'] = [];
    let cachedCount = 0;
    let analyzedCount = 0;

    // LLMが設定されているかチェック
    const llmConfigured = isLLMConfigured();
    const llmModel = llmConfigured ? getLLMModelName() : null;

    // Firestoreが設定されている場合、キャッシュをチェック
    if (isFirebaseConfigured()) {
      const cacheKeys = limitedCitations.map((c) => ({
        sourceId: c.sourceId,
        targetId: c.targetId,
      }));

      const cachedResults = await getBatchCachedCitationContexts(cacheKeys);

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

            // キャッシュに保存
            await saveCitationContextToCache({
              sourceId: citation.sourceId,
              targetId: citation.targetId,
              sourcePaperTitle: citation.sourcePaper.title,
              targetPaperTitle: citation.targetPaper.title,
              contextType: classification.contextType,
              confidence: classification.confidence,
              llmModel: llmModel || 'unknown',
            });

            analyzedCount++;

            // レート制限のため少し待機
            await new Promise((resolve) => setTimeout(resolve, 100));
          } catch (error) {
            console.error('LLM analysis error:', error);
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
    } else if (llmConfigured) {
      // Firestoreなし、LLMあり
      for (const citation of limitedCitations) {
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

          // レート制限のため少し待機
          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (error) {
          console.error('LLM analysis error:', error);
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

