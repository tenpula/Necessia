/*
 * 【ファイル概要】
 * 引用分析の裏方ロジック
 * 論文データを受け取り、裏でAIに「文脈の分析」をリクエストして結果を画面に伝える処理です。
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  AnalysisProgress,
  Citation,
  CitationAnalysisResult,
  CitationAnalysisCompleteEvent,
  CitationAnalysisStreamEvent,
  CitationNetwork,
} from '@/types/paper';

interface UseCitationAnalysisOptions {
  onAnalysisComplete?: (updatedNetwork: CitationNetwork) => void;
  autoStart?: boolean; // 自動開始のフラグ（デフォルト: false）
}

interface UseCitationAnalysisReturn {
  currentNetwork: CitationNetwork;
  analysisProgress: AnalysisProgress;
  isAnalyzing: boolean;
  startAnalysis: (requestDelay?: number) => Promise<void>;
  cancelAnalysis: () => void;
}

const DEFAULT_REQUEST_DELAY = 50;
const AUTO_START_DELAY_MS = 500;
const ANALYSIS_TIMEOUT_MS = 120000;

function createIdleProgress(): AnalysisProgress {
  return {
    total: 0,
    analyzed: 0,
    status: 'idle',
  };
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function buildCitationsToAnalyze(network: CitationNetwork) {
  const paperMap = new Map(network.papers.map((paper) => [paper.id, paper]));

  return network.citations.map((citation) => ({
    sourceId: citation.sourceId,
    targetId: citation.targetId,
    sourcePaper: paperMap.get(citation.sourceId) || network.seedPaper,
    targetPaper: paperMap.get(citation.targetId) || network.seedPaper,
  }));
}

function applyCitationAnalysisResults(
  citations: Citation[],
  results: CitationAnalysisResult[]
): Citation[] {
  const analyzedAt = new Date().toISOString();
  const resultByEdge = new Map(
    results.map((result) => [`${result.sourceId}::${result.targetId}`, result] as const)
  );

  return citations.map((citation) => {
    const analysisResult = resultByEdge.get(`${citation.sourceId}::${citation.targetId}`);

    if (!analysisResult) {
      return citation;
    }

    return {
      ...citation,
      contextType: analysisResult.contextType,
      confidence: analysisResult.confidence,
      analyzedAt,
    };
  });
}

export function useCitationAnalysis(
  network: CitationNetwork,
  options: UseCitationAnalysisOptions = {}
): UseCitationAnalysisReturn {
  const { autoStart = false } = options;
  const [currentNetwork, setCurrentNetwork] = useState(network);
  const [analysisProgress, setAnalysisProgress] = useState<AnalysisProgress>(createIdleProgress);

  const analysisStarted = useRef<string | null>(null);
  const analysisTimer = useRef<NodeJS.Timeout | null>(null);
  const onAnalysisCompleteRef = useRef(options.onAnalysisComplete);
  const abortControllerRef = useRef<AbortController | null>(null);
  const networkId = network.seedPaper.id;

  const resetAnalysisState = useCallback(() => {
    analysisStarted.current = null;
    setAnalysisProgress(createIdleProgress());
  }, []);

  const stopOngoingAnalysis = useCallback(() => {
    if (abortControllerRef.current && !abortControllerRef.current.signal.aborted) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = null;

    if (analysisTimer.current) {
      clearTimeout(analysisTimer.current);
      analysisTimer.current = null;
    }
  }, []);

  const checkAnalysisAvailability = useCallback(async (signal: AbortSignal) => {
    const statusResponse = await fetch('/api/papers/status', { signal });
    const status = await statusResponse.json();

    console.log('API status check:', status);
    return status.features.llmAnalysis as boolean;
  }, []);

  // コールバックの参照を更新
  useEffect(() => {
    onAnalysisCompleteRef.current = options.onAnalysisComplete;
  }, [options.onAnalysisComplete]);

  useEffect(() => {
    const currentNetworkId = currentNetwork.seedPaper.id;

    if (networkId === currentNetworkId) {
      return;
    }

    stopOngoingAnalysis();
    resetAnalysisState();
    setCurrentNetwork(network);
  }, [currentNetwork.seedPaper.id, network, networkId, resetAnalysisState, stopOngoingAnalysis]);

  const ensureAnalysisIsAvailable = useCallback(
    async (signal: AbortSignal) => {
      try {
        const llmAnalysisEnabled = await checkAnalysisAvailability(signal);
        if (!llmAnalysisEnabled) {
          console.log('LLM analysis not configured, skipping context analysis');
          resetAnalysisState();
          return false;
        }
        return true;
      } catch (error) {
        if (isAbortError(error)) {
          console.log('Status check was cancelled');
        } else {
          console.warn('Could not check API status:', error);
        }
        resetAnalysisState();
        return false;
      }
    },
    [checkAnalysisAvailability, resetAnalysisState]
  );

  const applyCompletedAnalysis = useCallback(
    (event: CitationAnalysisCompleteEvent, targetNetwork: CitationNetwork) => {
      const updatedNetwork: CitationNetwork = {
        ...targetNetwork,
        citations: applyCitationAnalysisResults(targetNetwork.citations, event.results),
      };

      setCurrentNetwork(updatedNetwork);
      setAnalysisProgress({
        total: event.stats.total,
        analyzed: event.stats.analyzed,
        status: 'completed',
      });

      onAnalysisCompleteRef.current?.(updatedNetwork);
    },
    []
  );

  const processAnalysisStream = useCallback(
    async (response: Response, signal: AbortSignal, targetNetwork: CitationNetwork) => {
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let completionEvent: CitationAnalysisCompleteEvent | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        if (signal.aborted) {
          reader.cancel();
          console.log('Analysis was cancelled during stream reading');
          throw new DOMException('Analysis aborted', 'AbortError');
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) {
            continue;
          }

          try {
            const eventData = JSON.parse(line.slice(6)) as CitationAnalysisStreamEvent;
            console.log('SSE Event received:', eventData.type);

            if (eventData.type === 'progress') {
              setAnalysisProgress({
                total: eventData.total,
                analyzed: eventData.analyzed,
                status: 'analyzing',
                currentPaper: eventData.currentPaper,
              });
              continue;
            }

            if (eventData.type === 'complete') {
              console.log('Analysis complete:', eventData.stats);
              completionEvent = eventData;
              applyCompletedAnalysis(eventData, targetNetwork);
              continue;
            }

            if (eventData.type === 'error') {
              console.error('Analysis error:', eventData.error);
              throw new Error(eventData.error || eventData.message);
            }
          } catch (parseError) {
            if (parseError instanceof SyntaxError) {
              console.warn('Failed to parse SSE event:', line, parseError);
              continue;
            }
            throw parseError;
          }
        }
      }

      if (!buffer.startsWith('data: ')) {
        return;
      }

      try {
        const eventData = JSON.parse(buffer.slice(6)) as CitationAnalysisStreamEvent;
        if (eventData.type === 'complete' && !completionEvent) {
          applyCompletedAnalysis(eventData, targetNetwork);
          return;
        }

        if (eventData.type === 'error') {
          throw new Error(eventData.error || eventData.message);
        }
      } catch (parseError) {
        if (!(parseError instanceof SyntaxError)) {
          throw parseError;
        }
      }
    },
    [applyCompletedAnalysis]
  );

  const analyzeContexts = useCallback(
    async (requestDelay: number = DEFAULT_REQUEST_DELAY) => {
      const citationsCount = network.citations.length;

      if (citationsCount === 0) {
        console.log('No citations to analyze, skipping');
        return;
      }

      if (analysisStarted.current === networkId) {
        console.log('Analysis already completed for this network:', networkId);
        return;
      }

      analysisStarted.current = networkId;
      console.log('analyzeContexts function called for network:', networkId);

      stopOngoingAnalysis();
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      if (signal.aborted) {
        console.log('Analysis was cancelled before starting');
        resetAnalysisState();
        return;
      }

      const canAnalyze = await ensureAnalysisIsAvailable(signal);
      if (!canAnalyze || signal.aborted) {
        if (signal.aborted) {
          console.log('Analysis was cancelled after status check');
        }
        return;
      }

      const { citations } = network;

      if (citations.length === 0) {
        console.log('No citations to analyze');
        resetAnalysisState();
        return;
      }

      console.log('Starting analysis for', citations.length, 'citations');

      setAnalysisProgress({
        total: citations.length,
        analyzed: 0,
        status: 'analyzing',
      });

      const citationsToAnalyze = buildCitationsToAnalyze(network);

      if (signal.aborted) {
        console.log('Analysis was cancelled before sending request');
        resetAnalysisState();
        return;
      }
      
      console.log('Sending analyze request to API...');
      const timeoutId = setTimeout(() => {
        console.log('Request timeout - aborting');
        abortControllerRef.current?.abort();
      }, ANALYSIS_TIMEOUT_MS);

      try {
        console.log('Sending analyze request to API...');

        console.log(`Sending analyze request with requestDelay: ${requestDelay}ms`);
        
        const response = await fetch('/api/papers/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            citations: citationsToAnalyze,
            requestDelay: requestDelay,
          }),
          signal,
        });

        if (signal.aborted) {
          console.log('Analysis was cancelled after receiving response');
          resetAnalysisState();
          return;
        }
        
        console.log('Response received, status:', response.status);

        if (!response.ok) {
          // レスポンスボディからエラーメッセージを取得
          let errorMessage = `Analysis request failed: ${response.status}`;
          try {
            const errorData = await response.json();
            if (errorData.error) {
              errorMessage = errorData.error;
            }
          } catch {
            // JSONパースに失敗した場合はデフォルトメッセージを使用
          }
          console.error('API error response:', errorMessage);
          throw new Error(errorMessage);
        }

        await processAnalysisStream(response, signal, network);
      } catch (error) {
        if (isAbortError(error)) {
          console.log('Analysis was cancelled by user');
          resetAnalysisState();
          return;
        }
        
        console.error('Context analysis error:', error);
        setAnalysisProgress((prev) => ({
          ...prev,
          status: 'error',
          errorMessage: error instanceof Error ? error.message : 'Analysis failed',
        }));
        analysisStarted.current = null;
      } finally {
        clearTimeout(timeoutId);
      }
    },
    [
      ensureAnalysisIsAvailable,
      network,
      networkId,
      processAnalysisStream,
      resetAnalysisState,
      stopOngoingAnalysis,
    ]
  );

  useEffect(() => {
    if (!autoStart) {
      return;
    }

    const citationsCount = network.citations.length;

    // 引用がない場合はスキップ
    if (citationsCount === 0) {
      console.log('No citations to analyze, skipping');
      return;
    }

    console.log('Auto-starting analysis for network:', networkId);

    if (analysisTimer.current) {
      clearTimeout(analysisTimer.current);
    }

    analysisTimer.current = setTimeout(() => {
      void analyzeContexts(DEFAULT_REQUEST_DELAY);
      analysisTimer.current = null;
    }, AUTO_START_DELAY_MS);

    return () => {
      if (analysisTimer.current) {
        clearTimeout(analysisTimer.current);
        analysisTimer.current = null;
      }
    };
  }, [autoStart, analyzeContexts, network.citations.length, networkId]);

  const startAnalysis = useCallback(async (requestDelay: number = DEFAULT_REQUEST_DELAY) => {
    await analyzeContexts(requestDelay);
  }, [analyzeContexts]);

  const cancelAnalysis = useCallback(() => {
    console.log('cancelAnalysis called, aborting ongoing request');
    stopOngoingAnalysis();
    resetAnalysisState();
  }, [resetAnalysisState, stopOngoingAnalysis]);

  useEffect(() => {
    return () => {
      console.log('useCitationAnalysis: Component unmounting, canceling analysis');
      stopOngoingAnalysis();
      analysisStarted.current = null;
    };
  }, [stopOngoingAnalysis]);

  return {
    currentNetwork,
    analysisProgress,
    isAnalyzing: analysisProgress.status === 'analyzing',
    startAnalysis,
    cancelAnalysis,
  };
}
