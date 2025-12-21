'use client';

import { useState, useEffect } from 'react';
import SearchForm from '@/components/SearchForm';
import CitationGraph from '@/components/CitationGraph';
import FeaturesView from '@/components/FeaturesView';
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

type Tab = 'search' | 'features';

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('search');
  const [network, setNetwork] = useState<CitationNetwork | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>('');
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);

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
    <div className="h-screen bg-slate-950 flex flex-col overflow-hidden font-sans text-slate-200">
      {/* ヘッダー */}
      <header className="relative z-10 px-8 py-5 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600
                            flex items-center justify-center shadow-lg shadow-cyan-500/20 ring-1 ring-white/10">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
            </div>
            <div>
                <h1 className="text-xl font-bold text-white tracking-tight leading-none">
                Research Gap Visualizer
              </h1>
                <p className="text-xs text-slate-400 mt-1 font-medium tracking-wide">COMPUTER SCIENCE EDITION</p>
              </div>
            </div>

            {/* ナビゲーションタブ */}
            {!network && (
              <nav className="hidden md:flex bg-slate-900/50 p-1 rounded-xl border border-slate-800/50">
                <button
                  onClick={() => setActiveTab('search')}
                  className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${
                    activeTab === 'search'
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  Search
                </button>
                <button
                  onClick={() => setActiveTab('features')}
                  className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${
                    activeTab === 'features'
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  Features
                </button>
              </nav>
            )}
          </div>

          <div className="flex items-center gap-3">
            {systemStatus?.features.llmAnalysis && (
              <span className="hidden sm:flex px-3 py-1 text-xs font-semibold bg-green-500/10 text-green-400 rounded-full border border-green-500/20 items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                AI Analysis Active
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
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {network ? (
          // グラフビュー (タブに関係なく、検索結果があればこちらを表示)
          <div className="flex-1 relative h-full">
            {/* 戻るボタン */}
            <div className="absolute top-4 left-4 z-20">
              <button
                onClick={() => setNetwork(null)}
                className="group flex items-center gap-2 px-4 py-2.5 bg-slate-900/90 backdrop-blur-md
                         hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl transition-all
                         border border-slate-700/50 shadow-lg"
              >
                <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                <span className="font-medium">New Search</span>
              </button>
            </div>

            {/* Seed論文情報 */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 w-full max-w-xl px-4 pointer-events-none">
              <div className="px-6 py-4 bg-slate-900/90 backdrop-blur-md rounded-2xl
                            border border-cyan-500/30 shadow-xl shadow-cyan-900/20 text-center pointer-events-auto">
                <p className="text-[10px] uppercase tracking-wider text-cyan-400 font-bold mb-1">Current Seed Paper</p>
                <h3 className="text-white font-bold text-sm md:text-base leading-tight line-clamp-2">
                  {network.seedPaper.title}
                </h3>
              </div>
            </div>

            <CitationGraph 
              network={network} 
              onAnalysisComplete={handleAnalysisComplete}
            />
          </div>
        ) : (
          // タブコンテンツ
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {activeTab === 'search' ? (
              // Search Tab Content
              <div className="flex flex-col items-center justify-center min-h-full px-6 py-12 relative">
                {/* 背景装飾 */}
                <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-20 pointer-events-none"></div>
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[100px] mix-blend-screen animate-pulse-slow" />
                  <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px] mix-blend-screen animate-pulse-slow" style={{ animationDelay: '1s' }} />
                  {currentPhase === 2 && (
                    <div className="absolute top-1/3 left-2/3 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[100px] mix-blend-screen" />
                  )}
                </div>

                <div className="relative z-10 w-full max-w-4xl mx-auto text-center">
                  <div className="mb-12 space-y-6">
                    <h2 className="text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400 tracking-tight leading-tight drop-shadow-sm">
                      Visualize the Gap in <br/>
                      <span className="text-cyan-400">Research Logic</span>
                    </h2>
                    <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
                      Discover missing links and hidden connections in Computer Science research using AI-powered citation analysis.
                    </p>
                  </div>

                  <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 shadow-2xl shadow-black/50 ring-1 ring-white/5 mx-auto max-w-3xl">
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

                  {/* エラー表示 */}
                  {error && (
                    <div className="mt-8 px-6 py-4 bg-red-500/10 border border-red-500/20 rounded-xl max-w-xl mx-auto animate-in shake">
                      <div className="flex items-center gap-3 justify-center">
                        <svg className="w-5 h-5 text-red-400" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                        </svg>
                        <span className="text-red-300 font-medium">{error}</span>
                      </div>
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
      </main>

      {/* フッター */}
      {!network && (
        <footer className="px-8 py-6 border-t border-slate-800/50 bg-slate-950/50 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between text-xs text-slate-500 gap-4">
            <div className="flex items-center gap-4">
               <span>Powered by <span className="text-slate-400 font-medium">OpenAlex API</span></span>
               <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
               <span>LLM: <span className="text-slate-400 font-medium">{systemStatus?.config.llmModel || 'Not Configured'}</span></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-500/50"></span>
              <span>System Status: <span className="text-green-400">Operational</span></span>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
