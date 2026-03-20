/*
 * 【ファイル概要】
 * 引用分析の裏方ロジック
 * 論文データを受け取り、裏でAIに「文脈の分析」をリクエストして結果を画面に伝える処理です。
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { CitationNetwork, AnalysisProgress, Citation } from '@/types/paper';

interface UseCitationAnalysisOptions {
  onAnalysisComplete?: (updatedNetwork: CitationNetwork) => void;
  autoStart?: boolean; // 自動開始のフラグ（デフォルト: false）
}

interface UseCitationAnalysisReturn {
  currentNetwork: CitationNetwork;
  analysisProgress: AnalysisProgress;
  isAnalyzing: boolean;
  startAnalysis: (requestDelay?: number) => Promise<void>; // 手動で解析を開始する関数
  cancelAnalysis: () => void; // 解析をキャンセルする関数
}

/**
 * 引用文脈の解析を管理するカスタムフック
 */
export function useCitationAnalysis(
  network: CitationNetwork,
  options: UseCitationAnalysisOptions = {}
): UseCitationAnalysisReturn {
  const { autoStart = false } = options;
  const [currentNetwork, setCurrentNetwork] = useState(network);
  const [analysisProgress, setAnalysisProgress] = useState<AnalysisProgress>({
    total: 0,
    analyzed: 0,
    status: 'idle',
  });

  const analysisStarted = useRef<string | null>(null);
  const analysisTimer = useRef<NodeJS.Timeout | null>(null);
  const onAnalysisCompleteRef = useRef(options.onAnalysisComplete);
  const abortControllerRef = useRef<AbortController | null>(null);

  // コールバックの参照を更新
  useEffect(() => {
    onAnalysisCompleteRef.current = options.onAnalysisComplete;
  }, [options.onAnalysisComplete]);

  // networkプロップが変更されたときにcurrentNetworkを更新し、解析フラグをリセット
  useEffect(() => {
    const networkId = network.seedPaper.id;
    const currentNetworkId = currentNetwork.seedPaper.id;
    
    // ネットワークIDが変更された場合、または空文字列（ダミーネットワーク）から変更された場合
    // また、キャンセル用のID（__cancelled_で始まる）が検出された場合も処理
    const isCancelledId = networkId.startsWith('__cancelled_');
    const isCurrentCancelledId = currentNetworkId.startsWith('__cancelled_');
    
    // ネットワークIDが変更された場合
    if (networkId !== currentNetworkId) {
      // キャンセル用のIDが検出された場合（ネットワークがnullになった場合）
      if (isCancelledId && !isCurrentCancelledId) {
        console.log('Network was cancelled, aborting ongoing analysis');
        
        // 進行中の解析をキャンセル
        if (abortControllerRef.current && !abortControllerRef.current.signal.aborted) {
          console.log('Aborting ongoing analysis request (cancelled)');
          abortControllerRef.current.abort();
        }
        abortControllerRef.current = null;
        
        // 既存のタイマーをクリーンアップ
        if (analysisTimer.current) {
          clearTimeout(analysisTimer.current);
          analysisTimer.current = null;
        }
        
        analysisStarted.current = null;
        setAnalysisProgress({
          total: 0,
          analyzed: 0,
          status: 'idle',
        });
        return;
      }
      
      // 通常のネットワーク変更の場合
      if (!isCancelledId && (networkId !== '' || currentNetworkId !== '')) {
        console.log('Network prop changed, resetting analysis state and canceling ongoing requests', {
          from: currentNetworkId,
          to: networkId,
        });
        
        // 進行中の解析をキャンセル
        if (abortControllerRef.current && !abortControllerRef.current.signal.aborted) {
          console.log('Aborting ongoing analysis request (network changed)');
          abortControllerRef.current.abort();
        }
        abortControllerRef.current = null;
        
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
    }
  }, [network.seedPaper.id, currentNetwork.seedPaper.id]);

  // 解析を実行する関数
  const analyzeContexts = useCallback(async (requestDelay: number = 50) => {
      const networkId = network.seedPaper.id;
      const citationsCount = network.citations.length;

      // 引用がない場合はスキップ
      if (citationsCount === 0) {
        console.log('No citations to analyze, skipping');
        return;
      }

      // 既に解析済みのネットワークの場合はスキップ
      if (analysisStarted.current === networkId) {
        console.log('Analysis already completed for this network:', networkId);
        return;
      }

      analysisStarted.current = networkId;
      console.log('analyzeContexts function called for network:', networkId);

      // 既存のAbortControllerがあればキャンセル
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      const analyzeContextsInternal = async () => {
      // キャンセルチェック
      if (abortControllerRef.current?.signal.aborted) {
        console.log('Analysis was cancelled before starting');
        analysisStarted.current = null;
        return;
      }
      
      // APIステータスを確認
      try {
        const statusResponse = await fetch('/api/papers/status', {
          signal: abortControllerRef.current?.signal,
        });
        const status = await statusResponse.json();

        console.log('API status check:', status);

        if (!status.features.llmAnalysis) {
          console.log('LLM analysis not configured, skipping context analysis');
          analysisStarted.current = null;
          return;
        }
      } catch (error) {
        // キャンセルエラーの場合は正常終了
        if (error instanceof Error && error.name === 'AbortError') {
          console.log('Status check was cancelled');
          analysisStarted.current = null;
          return;
        }
        console.warn('Could not check API status:', error);
        analysisStarted.current = null;
        return;
      }
      
      // キャンセルチェック
      if (abortControllerRef.current?.signal.aborted) {
        console.log('Analysis was cancelled after status check');
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

      // キャンセルチェック
      if (abortControllerRef.current?.signal.aborted) {
        console.log('Analysis was cancelled before sending request');
        analysisStarted.current = null;
        return;
      }
      
      try {
        console.log('Sending analyze request to API...');

        // タイムアウト設定（2分）
        const timeoutId = setTimeout(() => {
          console.log('Request timeout - aborting');
          abortControllerRef.current?.abort();
        }, 120000);

        console.log(`Sending analyze request with requestDelay: ${requestDelay}ms`);
        
        const response = await fetch('/api/papers/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            citations: citationsToAnalyze,
            requestDelay: requestDelay,
          }),
          signal: abortControllerRef.current?.signal,
        });

        clearTimeout(timeoutId);
        
        // レスポンス受信後にキャンセルチェック
        if (abortControllerRef.current?.signal.aborted) {
          console.log('Analysis was cancelled after receiving response');
          analysisStarted.current = null;
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

        // SSE ストリーム処理
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('Response body is not readable');
        }

        const decoder = new TextDecoder();
        let buffer = '';
        let analysisResults: Citation[] = [];
        let totalCitations = 0;
        let completionStats: any = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          // キャンセルチェック
          if (abortControllerRef.current?.signal.aborted) {
            reader.cancel();
            console.log('Analysis was cancelled during stream reading');
            throw new Error('AbortError');
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          
          // 最後の行が不完全な場合はバッファに残す
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const eventData = JSON.parse(line.slice(6));
                console.log('SSE Event received:', eventData.type);

                if (eventData.type === 'progress') {
                  // 進捗イベント
                  setAnalysisProgress({
                    total: eventData.total,
                    analyzed: eventData.analyzed,
                    status: 'analyzing',
                    currentPaper: eventData.currentPaper,
                  });
                } else if (eventData.type === 'complete') {
                  // 完了イベント
                  console.log('Analysis complete:', eventData.stats);
                  
                  completionStats = eventData.stats;
                  analysisResults = eventData.results;
                  totalCitations = eventData.stats.total;

                  // 結果を反映
                  const updatedCitations: Citation[] = citations.map((citation) => {
                    const analysisResult = analysisResults.find(
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
                    total: totalCitations,
                    analyzed: completionStats.analyzed,
                    status: 'completed',
                  });

                  if (onAnalysisCompleteRef.current) {
                    onAnalysisCompleteRef.current(updatedNetwork);
                  }
                } else if (eventData.type === 'error') {
                  // エラーイベント
                  console.error('Analysis error:', eventData.error);
                  throw new Error(eventData.error || eventData.message);
                }
              } catch (parseError) {
                if (parseError instanceof SyntaxError) {
                  console.warn('Failed to parse SSE event:', line, parseError);
                } else {
                  throw parseError;
                }
              }
            }
          }
        }

        // ストリーム完読後の最終チェック
        if (buffer.startsWith('data: ')) {
          try {
            const eventData = JSON.parse(buffer.slice(6));
            if (eventData.type === 'complete') {
              console.log('Final analysis complete event processed');
            } else if (eventData.type === 'error') {
              throw new Error(eventData.error || eventData.message);
            }
          } catch (parseError) {
            if (!(parseError instanceof SyntaxError)) {
              throw parseError;
            }
          }
        }
      } catch (error) {
        // AbortErrorの場合は正常なキャンセルとして扱う
        if (error instanceof Error && error.name === 'AbortError') {
          console.log('Analysis was cancelled by user');
          setAnalysisProgress({
            total: 0,
            analyzed: 0,
            status: 'idle',
          });
          analysisStarted.current = null;
          return;
        }
        
        console.error('Context analysis error:', error);
        setAnalysisProgress((prev) => ({
          ...prev,
          status: 'error',
          errorMessage: error instanceof Error ? error.message : 'Analysis failed',
        }));
        analysisStarted.current = null;
      }
    };

    await analyzeContextsInternal();
  }, [network]);

  // 自動開始が有効な場合のみ自動実行
  useEffect(() => {
    if (!autoStart) {
      return;
    }

    const networkId = network.seedPaper.id;
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
      analyzeContexts(50); // デフォルトのレート
      analysisTimer.current = null;
    }, 500);

    return () => {
      if (analysisTimer.current) {
        clearTimeout(analysisTimer.current);
        analysisTimer.current = null;
      }
    };
  }, [autoStart, network.seedPaper.id, analyzeContexts]);

  // 手動で解析を開始する関数
  const startAnalysis = useCallback(async (requestDelay: number = 50) => {
    await analyzeContexts(requestDelay);
  }, [analyzeContexts]);

  // 解析をキャンセルする関数
  const cancelAnalysis = useCallback(() => {
    console.log('cancelAnalysis called, aborting ongoing request');
    
    // 進行中の解析をキャンセル
    if (abortControllerRef.current && !abortControllerRef.current.signal.aborted) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = null;
    
    // タイマーをクリーンアップ
    if (analysisTimer.current) {
      clearTimeout(analysisTimer.current);
      analysisTimer.current = null;
    }
    
    // 状態をリセット
    analysisStarted.current = null;
    setAnalysisProgress({
      total: 0,
      analyzed: 0,
      status: 'idle',
    });
  }, []);

  // コンポーネントがアンマウントされる前に解析をキャンセル
  useEffect(() => {
    return () => {
      console.log('useCitationAnalysis: Component unmounting, canceling analysis');
      
      // 進行中の解析をキャンセル
      if (abortControllerRef.current && !abortControllerRef.current.signal.aborted) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = null;
      
      // タイマーをクリーンアップ
      if (analysisTimer.current) {
        clearTimeout(analysisTimer.current);
        analysisTimer.current = null;
      }
      
      // 状態をリセット
      analysisStarted.current = null;
    };
  }, []);

  return {
    currentNetwork,
    analysisProgress,
    isAnalyzing: analysisProgress.status === 'analyzing',
    startAnalysis,
    cancelAnalysis,
  };
}

