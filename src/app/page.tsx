'use client';

import { useState, useEffect, useMemo } from 'react';
import SearchForm from '@/components/SearchForm';
import CitationGraph from '@/components/CitationGraph';
import FeaturesView from '@/components/FeaturesView';
import { CitationNetwork, GapProposal, AnalysisProgress } from '@/types/paper';
import { MainLayout } from '@/components/necessia/MainLayout';
import { calculateContextStats } from '@/lib/graph-layout';

interface SystemStatus {
  features: {
    llmAnalysis: boolean;
    gapFinding?: boolean;
  };
  config: {
    llmModel: string | null;
    embeddingModel?: string | null;
  };
  phase: number;
}

type Tab = 'search' | 'features';

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('search');
  const [network, setNetwork] = useState<CitationNetwork | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>('');
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [selectedGapProposal, setSelectedGapProposal] = useState<GapProposal | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState<AnalysisProgress | undefined>(undefined);
  const [startAnalysisFn, setStartAnalysisFn] = useState<((requestDelay: number) => Promise<void>) | null>(null);
  const [cancelAnalysisFn, setCancelAnalysisFn] = useState<(() => void) | null>(null);

  // システムステータスを取得
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/papers/status');
        if (!res.ok) {
          console.error('Failed to fetch system status:', res.status, res.statusText);
          return;
        }
        const data = await res.json();
        console.log('System status received:', data);
        setSystemStatus(data);
      } catch (err) {
        console.error('Could not fetch system status:', err);
      }
    };
    fetchStatus();
  }, []);

  const handleSearch = async (query: string) => {
    setIsLoading(true);
    setError(null);
    // ネットワークをnullに設定することで、進行中の解析がキャンセルされる
    setNetwork(null);
    setSelectedGapProposal(null);
    setAnalysisProgress(undefined);
    setProgress('論文を検索中...');

    try {
      setProgress('引用ネットワークを構築中...');
      const response = await fetch(
        `/api/papers/network?q=${encodeURIComponent(query)}&limit=30`
      );

      if (!response.ok) {
        const data = await response.json();
        const errorMessage = data.error || `Failed to build network (Status: ${response.status})`;
        throw new Error(errorMessage);
      }

      const data: CitationNetwork = await response.json();
      console.log('Network data received:', {
        papersCount: data.papers.length,
        citationsCount: data.citations.length,
        seedPaper: data.seedPaper.title,
      });
      setProgress('');
      setNetwork(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
      setProgress('');
    }
  };

  const handleAnalysisComplete = (updatedNetwork: CitationNetwork) => {
    setNetwork(updatedNetwork);
    console.log('Citation context analysis completed');
  };

  const handleGapProposalChange = (proposal: GapProposal | null) => {
    setSelectedGapProposal(proposal);
  };

  const handleAnalysisProgressChange = (progress: AnalysisProgress) => {
    setAnalysisProgress(progress);
  };

  const handleStartAnalysisReady = (startAnalysis: (requestDelay: number) => Promise<void>) => {
    setStartAnalysisFn(() => startAnalysis);
  };

  const handleCancelAnalysisReady = (cancelAnalysis: () => void) => {
    setCancelAnalysisFn(() => cancelAnalysis);
  };

  const handleStartAnalysis = (requestDelay: number) => {
    if (startAnalysisFn) {
      startAnalysisFn(requestDelay);
    }
  };

  // ネットワークが変更されたら、selectedGapProposalとanalysisProgressをリセット
  useEffect(() => {
    if (network) {
      setSelectedGapProposal(null);
      setAnalysisProgress(undefined);
    } else {
      // ネットワークがnullになった場合、解析関数もリセット
      if (cancelAnalysisFn) {
        cancelAnalysisFn();
      }
      setStartAnalysisFn(null);
      setCancelAnalysisFn(null);
      setSelectedGapProposal(null);
      setAnalysisProgress(undefined);
    }
  }, [network?.seedPaper.id]);

  const handleResetError = () => {
    setError(null);
    setNetwork(null);
    setActiveTab('search');
  };

  const currentPhase = systemStatus?.phase || 1;

  // 文脈タイプ別の統計を計算
  const contextStats = useMemo(() => {
    if (!network) return {};
    return calculateContextStats(network.citations);
  }, [network]);

  return (
    <MainLayout 
      showSidebars={!!network}
      network={network}
      analysisProgress={network ? analysisProgress : undefined}
      contextStats={contextStats}
      selectedGapProposal={selectedGapProposal}
      onStartAnalysis={handleStartAnalysis}
    >
        {network ? (
          // グラフビュー (タブに関係なく、検索結果があればこちらを表示)
          <div className="flex-1 relative h-full">
            {/* 戻るボタン */}
            <div className="absolute top-4 left-4 z-20">
              <button
                onClick={() => {
                  console.log('New Search button clicked, canceling analysis');
                  // 解析を停止してからネットワークをnullに設定
                  if (cancelAnalysisFn) {
                    cancelAnalysisFn();
                  }
                  setStartAnalysisFn(null);
                  setCancelAnalysisFn(null);
                  setSelectedGapProposal(null);
                  setAnalysisProgress(undefined);
                  setNetwork(null);
                }}
                className="group flex items-center gap-2 px-4 py-2.5 bg-slate-900/90 backdrop-blur-md
                         hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl transition-all
                         border border-slate-700/50 shadow-lg"
              >
                <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                <span className="font-medium">新しい検索</span>
              </button>
            </div>

            {/* Seed論文情報 */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 w-full max-w-xl px-4 pointer-events-none">
              <div className="px-6 py-4 bg-slate-900/90 backdrop-blur-md rounded-2xl
                            border border-cyan-500/30 shadow-xl shadow-cyan-900/20 text-center pointer-events-auto">
                <p className="text-[10px] uppercase tracking-wider text-cyan-400 font-bold mb-1">現在のSeed論文</p>
                <h3 className="text-white font-bold text-sm md:text-base leading-tight line-clamp-2">
                  {network.seedPaper.title}
                </h3>
              </div>
            </div>

            <CitationGraph 
              network={network} 
              onAnalysisComplete={handleAnalysisComplete}
              onGapProposalChange={handleGapProposalChange}
              onAnalysisProgressChange={handleAnalysisProgressChange}
              onStartAnalysisReady={handleStartAnalysisReady}
              onCancelAnalysisReady={handleCancelAnalysisReady}
            />
          </div>
        ) : error ? (
          // エラー画面
          <div className="flex-1 flex items-center justify-center px-6 py-12 relative">
            <div className="relative z-10 w-full max-w-2xl mx-auto text-center">
              <div className="bg-slate-900/90 backdrop-blur-xl border border-red-500/30 rounded-3xl p-12 shadow-2xl shadow-red-900/20 ring-1 ring-red-500/10">
                {/* エラーアイコン */}
                <div className="mb-6 flex justify-center">
                  <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center border-2 border-red-500/30">
                    <svg className="w-10 h-10 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                  </div>
                </div>

                {/* エラータイトル */}
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                  エラーが発生しました
                </h2>

                {/* エラーメッセージ */}
                <div className="mb-8 px-6 py-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <p className="text-red-300 font-medium text-lg leading-relaxed">
                    {error}
                  </p>
                </div>

                {/* 対応形式の説明 */}
                <div className="mb-8 px-6 py-4 bg-slate-800/50 border border-slate-700/50 rounded-xl text-left">
                  <p className="text-slate-400 text-sm mb-3 font-semibold">対応している形式:</p>
                  <ul className="space-y-2 text-slate-300 text-sm">
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      arXiv URL (例: https://arxiv.org/abs/1706.03762)
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      arXiv ID (例: 2010.11929)
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      DOI (例: 10.48550/arXiv.1706.03762)
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      論文タイトル
                    </li>
                  </ul>
                </div>

                {/* 戻るボタン */}
                <button
                  onClick={handleResetError}
                  className="group inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 
                           hover:from-cyan-400 hover:to-blue-400 text-white font-semibold rounded-xl
                           transition-all duration-200 shadow-lg shadow-cyan-500/20 hover:shadow-xl hover:shadow-cyan-500/30
                           transform hover:scale-105"
                >
                  <svg className="w-5 h-5 transition-transform group-hover:-translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                  </svg>
                  <span>最初の画面に戻る</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          // タブコンテンツ
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {activeTab === 'search' ? (
              // Search Tab Content
              <div className="flex flex-col items-center justify-center min-h-full px-6 py-12 relative">
                <div className="relative z-10 w-full max-w-4xl mx-auto text-center">
                  <div className="mb-12 space-y-6">
                    <h2 className="text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400 tracking-tight leading-tight drop-shadow-sm">
                      研究の空白を <br/>
                      <span className="text-cyan-400">論理的に可視化する</span>
                    </h2>
                    <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
                      AIによる引用分析を使用して、情報工学研究におけるミッシングリンクと隠れたつながりを発見します。
                    </p>
                  </div>

                  <div className="mt-10">
                    <SearchForm onSearch={handleSearch} isLoading={isLoading} />
                  </div>

                  {/* プログレス表示 */}
                  {progress && (
                    <div className="mt-8 inline-flex items-center gap-3 px-6 py-3 bg-slate-800/50 rounded-full border border-slate-700/50 text-slate-300 animate-in fade-in slide-in-from-bottom-4">
                      <svg className="animate-spin h-5 w-5 text-cyan-500" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span className="font-medium tracking-wide">{progress}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // Features Tab Content
              <FeaturesView />
            )}
          </div>
        )}
    </MainLayout>
  );
}
