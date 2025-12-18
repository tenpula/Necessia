'use client';

import { useState, useEffect } from 'react';
import SearchForm from '@/components/SearchForm';
import CitationGraph from '@/components/CitationGraph';
import { CitationNetwork } from '@/types/paper';

interface SystemStatus {
  features: {
    cache: boolean;
    llmAnalysis: boolean;
  };
  config: {
    llmModel: string | null;
    cacheProvider: string | null;
  };
  phase: number;
}

export default function Home() {
  const [network, setNetwork] = useState<CitationNetwork | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>('');
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);

  // システムステータスを取得
  useEffect(() => {
    fetch('/api/papers/status')
      .then((res) => res.json())
      .then((data) => setSystemStatus(data))
      .catch((err) => console.warn('Could not fetch system status:', err));
  }, []);

  const handleSearch = async (query: string) => {
    setIsLoading(true);
    setError(null);
    setNetwork(null);
    setProgress('Searching for paper...');

    try {
      setProgress('Building citation network...');
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

  const currentPhase = systemStatus?.phase || 1;

  return (
    <div className="h-screen bg-slate-950 flex flex-col overflow-hidden">
      {/* ヘッダー */}
      <header className="relative z-10 px-6 py-4 border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600
                          flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                Research Gap Visualizer
              </h1>
              <p className="text-xs text-slate-400">CS Edition</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {systemStatus?.features.llmAnalysis && (
              <span className="px-2 py-1 text-xs bg-green-500/10 text-green-400 rounded-full border border-green-500/20">
                🧠 AI Analysis
              </span>
            )}
            {systemStatus?.features.cache && (
              <span className="px-2 py-1 text-xs bg-blue-500/10 text-blue-400 rounded-full border border-blue-500/20">
                💾 Cache
              </span>
            )}
            <span className={`px-3 py-1 text-xs font-medium rounded-full border ${
              currentPhase === 2 
                ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' 
                : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
            }`}>
              Phase {currentPhase}
            </span>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 flex flex-col">
        {!network ? (
          // 検索ビュー
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
            {/* 背景装飾 */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
              <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
              {currentPhase === 2 && (
                <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
              )}
            </div>

            <div className="relative z-10 text-center mb-10">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
                Visualize Citation Networks
              </h2>
              <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                Enter an arXiv URL, DOI, or paper title to explore the citation relationships 
                and discover research connections in Computer Science.
              </p>
              {currentPhase === 2 && systemStatus?.features.llmAnalysis && (
                <p className="text-sm text-purple-400 mt-2">
                  ✨ AI-powered citation context analysis enabled
                </p>
              )}
            </div>

            <SearchForm onSearch={handleSearch} isLoading={isLoading} />

            {/* プログレス表示 */}
            {progress && (
              <div className="mt-8 flex items-center gap-3 text-slate-400">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>{progress}</span>
              </div>
            )}

            {/* エラー表示 */}
            {error && (
              <div className="mt-8 px-6 py-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-red-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                  </svg>
                  <span className="text-red-300">{error}</span>
                </div>
              </div>
            )}

            {/* 特徴説明 */}
            <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full">
              <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-6">
                <div className="w-12 h-12 bg-cyan-500/10 rounded-xl flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Smart Search</h3>
                <p className="text-sm text-slate-400">
                  Search by arXiv URL, DOI, or paper title. Automatically detects the input format.
                </p>
              </div>

              <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-6">
                <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Network View</h3>
                <p className="text-sm text-slate-400">
                  Interactive graph visualization showing papers and their citation relationships.
                </p>
              </div>

              <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-6">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                  currentPhase === 2 ? 'bg-purple-500/10' : 'bg-purple-500/10'
                }`}>
                  <svg className={`w-6 h-6 ${currentPhase === 2 ? 'text-purple-400' : 'text-purple-400'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    {currentPhase === 2 ? (
                      // Brain icon for Phase 2
                      <path d="M12 2a9 9 0 019 9c0 3.074-1.676 5.59-3.5 7.614C15.7 20.55 13.777 22 12 22c-1.777 0-3.7-1.45-5.5-3.386C4.676 16.59 3 14.074 3 11a9 9 0 019-9zM9 9h.01M15 9h.01" />
                    ) : (
                      <>
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </>
                    )}
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {currentPhase === 2 ? 'AI Context Analysis' : 'Rich Metadata'}
                </h3>
                <p className="text-sm text-slate-400">
                  {currentPhase === 2 
                    ? 'LLM-powered analysis classifies citations as methodology, critique, comparison, or background.'
                    : 'View publication year, citation count, venue type, and direct links to papers.'}
                </p>
              </div>
            </div>

            {/* Phase 2 特有の機能説明 */}
            {currentPhase === 2 && (
              <div className="mt-8 max-w-2xl w-full">
                <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-2xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <span>🧠</span> Citation Context Analysis
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-green-400">🟢</span>
                      <span className="text-slate-300">Methodology - Uses methods from</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-red-400">🔴</span>
                      <span className="text-slate-300">Critique - Points out limitations</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-purple-400">🟣</span>
                      <span className="text-slate-300">Comparison - Compares results</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">⚪</span>
                      <span className="text-slate-300">Background - General reference</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          // グラフビュー
          <div className="flex-1 relative overflow-hidden" style={{ height: '100%' }}>
            {/* 戻るボタン */}
            <div className="absolute top-4 left-4 z-20">
              <button
                onClick={() => setNetwork(null)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800/80 backdrop-blur-sm
                         hover:bg-slate-700/80 text-slate-300 rounded-xl transition-colors
                         border border-slate-700/50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                New Search
              </button>
            </div>

            {/* Seed論文情報 */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
              <div className="px-6 py-3 bg-slate-900/90 backdrop-blur-sm rounded-xl
                            border border-cyan-500/30 shadow-lg shadow-cyan-500/10 max-w-2xl">
                <p className="text-xs text-cyan-400 font-medium mb-1">Seed Paper</p>
                <h3 className="text-white font-semibold text-sm leading-snug line-clamp-1">
                  {network.seedPaper.title}
                </h3>
              </div>
            </div>

            <CitationGraph 
              network={network} 
              onAnalysisComplete={handleAnalysisComplete}
            />
          </div>
        )}
      </main>

      {/* フッター */}
      {!network && (
        <footer className="px-6 py-4 border-t border-slate-800/50">
          <div className="max-w-7xl mx-auto flex items-center justify-between text-sm text-slate-500">
            <span>Powered by OpenAlex API{systemStatus?.config.llmModel && ` + ${systemStatus.config.llmModel}`}</span>
            <span>Phase {currentPhase}{currentPhase === 2 ? ': Context Analysis' : ': MVP'}</span>
          </div>
        </footer>
      )}
    </div>
  );
}
