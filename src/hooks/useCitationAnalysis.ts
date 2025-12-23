'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { CitationNetwork, AnalysisProgress, Citation } from '@/types/paper';

interface UseCitationAnalysisOptions {
  onAnalysisComplete?: (updatedNetwork: CitationNetwork) => void;
}

interface UseCitationAnalysisReturn {
  currentNetwork: CitationNetwork;
  analysisProgress: AnalysisProgress;
  isAnalyzing: boolean;
}

/**
 * 引用文脈の解析を管理するカスタムフック
 */
export function useCitationAnalysis(
  network: CitationNetwork,
  options: UseCitationAnalysisOptions = {}
): UseCitationAnalysisReturn {
  const [currentNetwork, setCurrentNetwork] = useState(network);
  const [analysisProgress, setAnalysisProgress] = useState<AnalysisProgress>({
    total: 0,
    analyzed: 0,
    status: 'idle',
  });

  const analysisStarted = useRef<string | null>(null);
  const analysisTimer = useRef<NodeJS.Timeout | null>(null);
  const onAnalysisCompleteRef = useRef(options.onAnalysisComplete);

  // コールバックの参照を更新
  useEffect(() => {
    onAnalysisCompleteRef.current = options.onAnalysisComplete;
  }, [options.onAnalysisComplete]);

  // networkプロップが変更されたときにcurrentNetworkを更新し、解析フラグをリセット
  useEffect(() => {
    const networkId = network.seedPaper.id;
    if (networkId !== currentNetwork.seedPaper.id) {
      console.log('Network prop changed, resetting analysis state');
      // 既存のタイマーをクリーンアップ
      if (analysisTimer.current) {
        clearTimeout(analysisTimer.current);
        analysisTimer.current = null;
      }
      setCurrentNetwork(network);
      analysisStarted.current = null;
      setAnalysisProgress({
        total: 0,
        analyzed: 0,
        status: 'idle',
      });
    }
  }, [network.seedPaper.id, currentNetwork.seedPaper.id]);

  // 引用文脈の解析を実行
  useEffect(() => {
    const networkId = network.seedPaper.id;
    const citationsCount = network.citations.length;

    // 引用がない場合はスキップ
    if (citationsCount === 0) {
      console.log('No citations to analyze, skipping');
      return;
    }

    console.log('useEffect triggered for network:', networkId, 'with', citationsCount, 'citations');

    const analyzeContexts = async () => {
      // 既に解析済みのネットワークの場合はスキップ
      if (analysisStarted.current === networkId) {
        console.log('Analysis already completed for this network:', networkId);
        return;
      }

      analysisStarted.current = networkId;
      console.log('analyzeContexts function called for network:', networkId);

      // APIステータスを確認
      try {
        const statusResponse = await fetch('/api/papers/status');
        const status = await statusResponse.json();

        console.log('API status check:', status);

        if (!status.features.llmAnalysis) {
          console.log('LLM analysis not configured, skipping context analysis');
          analysisStarted.current = null;
          return;
        }
      } catch (error) {
        console.warn('Could not check API status:', error);
        analysisStarted.current = null;
        return;
      }

      const { citations, papers, seedPaper } = network;

      if (citations.length === 0) {
        console.log('No citations to analyze');
        analysisStarted.current = null;
        return;
      }

      console.log('Starting analysis for', citations.length, 'citations');

      setAnalysisProgress({
        total: citations.length,
        analyzed: 0,
        status: 'analyzing',
      });

      // バッチで解析リクエストを送信
      const citationsToAnalyze = citations.map((citation) => {
        const sourcePaper = papers.find((p) => p.id === citation.sourceId);
        const targetPaper = papers.find((p) => p.id === citation.targetId);
        return {
          sourceId: citation.sourceId,
          targetId: citation.targetId,
          sourcePaper: sourcePaper || seedPaper,
          targetPaper: targetPaper || seedPaper,
        };
      });

      try {
        console.log('Sending analyze request to API...');

        // タイムアウト設定（2分）
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          console.log('Request timeout - aborting');
          controller.abort();
        }, 120000);

        const response = await fetch('/api/papers/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ citations: citationsToAnalyze }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        console.log('Response received, status:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('API error response:', errorText);
          throw new Error(`Analysis request failed: ${response.status}`);
        }

        const result = await response.json();
        console.log('Analysis result:', result.stats);

        // 結果を反映
        const updatedCitations: Citation[] = citations.map((citation) => {
          const analysisResult = result.results.find(
            (r: { sourceId: string; targetId: string }) =>
              r.sourceId === citation.sourceId && r.targetId === citation.targetId
          );

          if (analysisResult) {
            return {
              ...citation,
              contextType: analysisResult.contextType,
              confidence: analysisResult.confidence,
              analyzedAt: new Date().toISOString(),
            };
          }
          return citation;
        });

        const updatedNetwork: CitationNetwork = {
          ...network,
          citations: updatedCitations,
        };

        setCurrentNetwork(updatedNetwork);
        setAnalysisProgress({
          total: result.stats.total,
          analyzed: result.stats.analyzed,
          status: 'completed',
        });

        if (onAnalysisCompleteRef.current) {
          onAnalysisCompleteRef.current(updatedNetwork);
        }
      } catch (error) {
        console.error('Context analysis error:', error);
        setAnalysisProgress((prev) => ({
          ...prev,
          status: 'error',
        }));
        analysisStarted.current = null;
      }
    };

    // 少し遅延させてから解析開始
    console.log('Setting up analysis timer for network:', networkId);

    if (analysisTimer.current) {
      console.log('Clearing existing timer before setting new one');
      clearTimeout(analysisTimer.current);
    }

    analysisTimer.current = setTimeout(() => {
      console.log('Analysis timer fired for network:', networkId);
      analyzeContexts();
      analysisTimer.current = null;
    }, 500);

    return () => {
      console.log('useEffect cleanup for network:', networkId);
      if (analysisTimer.current) {
        clearTimeout(analysisTimer.current);
        analysisTimer.current = null;
      }
    };
  }, [network.seedPaper.id, network]);

  return {
    currentNetwork,
    analysisProgress,
    isAnalyzing: analysisProgress.status === 'analyzing',
  };
}

