import { classifyCitationContext, getLLMModelName, isLLMConfigured } from '@/lib/llm';
import {
  CitationAnalysisProgressEvent,
  CitationAnalysisResult,
  CitationAnalysisStats,
  CitationContextType,
  Paper,
} from '@/types/paper';
import { getExponentialBackoffDelay, sleep } from '@/lib/async-utils';

export interface AnalyzeCitationJob {
  sourceId: string;
  targetId: string;
  sourcePaper: Paper;
  targetPaper: Paper;
}

export interface AnalyzeRequestPayload {
  citations: AnalyzeCitationJob[];
  requestDelay: number;
}

interface AnalyzeCitationBatchOptions {
  citations: AnalyzeCitationJob[];
  requestDelay: number;
  signal: AbortSignal;
  shouldStop: () => boolean;
  onProgress?: (event: CitationAnalysisProgressEvent) => void;
}

export const DEFAULT_ANALYSIS_REQUEST_DELAY = 50;
export const MAX_ANALYSIS_CITATIONS = 100;

const MAX_RETRIES = 2;
const WAIT_CHUNK_MS = 50;
const DEFAULT_FALLBACK_CONTEXT: Pick<CitationAnalysisResult, 'contextType' | 'confidence' | 'cached'> = {
  contextType: 'background',
  confidence: 0.3,
  cached: false,
};

function createFallbackResult(citation: AnalyzeCitationJob): CitationAnalysisResult {
  return {
    sourceId: citation.sourceId,
    targetId: citation.targetId,
    ...DEFAULT_FALLBACK_CONTEXT,
  };
}

function assertAbortState(signal: AbortSignal, shouldStop: () => boolean): void {
  if (signal.aborted || shouldStop()) {
    throw new DOMException('Analysis aborted', 'AbortError');
  }
}

async function waitFor(ms: number, signal: AbortSignal, shouldStop: () => boolean): Promise<void> {
  const chunks = Math.ceil(ms / WAIT_CHUNK_MS);

  for (let chunkIndex = 0; chunkIndex < chunks; chunkIndex++) {
    assertAbortState(signal, shouldStop);
    const nextChunk = Math.min(WAIT_CHUNK_MS, ms - (chunkIndex * WAIT_CHUNK_MS));
    await sleep(nextChunk);
  }
}

function createProgressEvent(
  analyzed: number,
  total: number,
  paperTitle: string
): CitationAnalysisProgressEvent {
  return {
    type: 'progress',
    analyzed,
    total,
    currentPaper: `${paperTitle.substring(0, 35)}...`,
    percentage: Math.round((analyzed / total) * 100),
  };
}

export function createSSEMessage(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export function parseAnalyzeRequest(body: unknown): AnalyzeRequestPayload {
  if (!body || typeof body !== 'object') {
    throw new Error('Request body is required');
  }

  const maybePayload = body as {
    citations?: AnalyzeCitationJob[];
    requestDelay?: number;
  };

  if (!Array.isArray(maybePayload.citations) || maybePayload.citations.length === 0) {
    throw new Error('Citations array is required');
  }

  const requestDelay =
    typeof maybePayload.requestDelay === 'number' && Number.isFinite(maybePayload.requestDelay)
      ? Math.max(0, Math.trunc(maybePayload.requestDelay))
      : DEFAULT_ANALYSIS_REQUEST_DELAY;

  return {
    citations: maybePayload.citations.slice(0, MAX_ANALYSIS_CITATIONS),
    requestDelay,
  };
}

export async function analyzeCitationBatch({
  citations,
  requestDelay,
  signal,
  shouldStop,
  onProgress,
}: AnalyzeCitationBatchOptions): Promise<{
  results: CitationAnalysisResult[];
  stats: CitationAnalysisStats;
}> {
  const llmConfigured = isLLMConfigured();
  const llmModel = llmConfigured ? getLLMModelName() : null;
  const results: CitationAnalysisResult[] = [];
  let analyzedCount = 0;

  if (!llmConfigured) {
    for (const citation of citations) {
      results.push({
        sourceId: citation.sourceId,
        targetId: citation.targetId,
        contextType: 'background',
        confidence: 0.5,
        cached: false,
      });
    }

    return {
      results,
      stats: {
        total: results.length,
        analyzed: citations.length,
        cached: 0,
        llmModel,
      },
    };
  }

  for (const [index, citation] of citations.entries()) {
    assertAbortState(signal, shouldStop);

    let retryCount = 0;
    let classified = false;

    while (!classified && retryCount < MAX_RETRIES) {
      assertAbortState(signal, shouldStop);

      try {
        const classification = await classifyCitationContext(citation.sourcePaper, citation.targetPaper);
        const result: CitationAnalysisResult = {
          sourceId: citation.sourceId,
          targetId: citation.targetId,
          contextType: classification.contextType as CitationContextType,
          confidence: classification.confidence,
          cached: false,
        };

        results.push(result);
        analyzedCount += 1;
        classified = true;

        onProgress?.(createProgressEvent(analyzedCount, citations.length, citation.targetPaper.title));

        if (index < citations.length - 1 && requestDelay > 0) {
          await waitFor(requestDelay, signal, shouldStop);
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          throw error;
        }

        const statusCode = (error as { status?: number }).status;
        console.error('[Analyze API] LLM analysis error:', error);

        if (statusCode === 429) {
          retryCount += 1;

          if (retryCount >= MAX_RETRIES) {
            break;
          }

          await waitFor(
            getExponentialBackoffDelay(retryCount, requestDelay),
            signal,
            shouldStop
          );
          continue;
        }

        break;
      }
    }

    if (!classified) {
      results.push(createFallbackResult(citation));
    }
  }

  return {
    results,
    stats: {
      total: results.length,
      analyzed: analyzedCount,
      cached: 0,
      llmModel,
    },
  };
}
