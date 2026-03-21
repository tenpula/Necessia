/*
 * ホーム画面の表示コンポーネント。
 * 状態管理は useHomePageController に寄せ、ここは描画責務を中心にする。
 */

'use client';

import { useState } from 'react';
import SearchForm from '@/components/SearchForm';
import CitationGraph from '@/components/CitationGraph';
import FeaturesView from '@/components/FeaturesView';
import UsageLimitBanner from '@/components/UsageLimitBanner';
import { MainLayout } from '@/components/necessia/MainLayout';
import { useHomePageController } from '@/hooks';

type Tab = 'search' | 'features';

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('search');

  const {
    authStatus,
    network,
    isLoading,
    error,
    progress,
    selectedGapProposal,
    analysisProgress,
    contextStats,
    showUsageLimitBanner,
    isTransitioning,
    handleSearch,
    handleAnalysisComplete,
    handleGapProposalChange,
    handleAnalysisProgressChange,
    handleStartAnalysisReady,
    handleCancelAnalysisReady,
    handleStartAnalysis,
    handleResetError,
    clearNetworkView,
    startLoginPopup,
    closeUsageLimitBanner,
  } = useHomePageController();

  const handleResetErrorAndTab = () => {
    setActiveTab('search');
    handleResetError();
  };

  return (
    <MainLayout
      showSidebars={!!network}
      network={network}
      analysisProgress={network ? analysisProgress : undefined}
      contextStats={contextStats}
      selectedGapProposal={selectedGapProposal}
      onStartAnalysis={handleStartAnalysis}
      onGapProposalChange={handleGapProposalChange}
    >
      {showUsageLimitBanner && <UsageLimitBanner onClose={closeUsageLimitBanner} />}

      {network ? (
        <div className="flex-1 relative h-full">
          <div className="absolute top-4 left-4 z-20">
            <button
              onClick={clearNetworkView}
              className="group flex items-center gap-2 px-4 py-2.5 bg-neutral-900/95 backdrop-blur-md
                         hover:bg-neutral-800 text-neutral-300 hover:text-neutral-100 rounded-xl transition-all
                         border border-neutral-700 shadow-lg"
            >
              <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              <span className="font-medium">新しい検索</span>
            </button>
          </div>

          <CitationGraph
            network={network}
            selectedGapProposal={selectedGapProposal}
            onAnalysisComplete={handleAnalysisComplete}
            onGapProposalChange={handleGapProposalChange}
            onAnalysisProgressChange={handleAnalysisProgressChange}
            onStartAnalysisReady={handleStartAnalysisReady}
            onCancelAnalysisReady={handleCancelAnalysisReady}
          />
        </div>
      ) : error ? (
        <div className="flex-1 flex items-center justify-center px-6 py-12 relative">
          <div className="relative z-10 w-full max-w-2xl mx-auto text-center">
            <div className="bg-slate-900/90 backdrop-blur-xl border border-red-500/30 rounded-3xl p-12 shadow-2xl shadow-red-900/20 ring-1 ring-red-500/10">
              <div className="mb-6 flex justify-center">
                <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center border-2 border-red-500/30">
                  <svg className="w-10 h-10 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
              </div>

              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">エラーが発生しました</h2>

              <div className="mb-8 px-6 py-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                <p className="text-red-300 font-medium text-lg leading-relaxed">{error}</p>
              </div>

              <div className="mb-8 px-6 py-4 bg-slate-800/50 border border-slate-700/50 rounded-xl text-left">
                <p className="text-slate-400 text-sm mb-3 font-semibold">対応している形式:</p>
                <ul className="space-y-2 text-slate-300 text-sm">
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-neutral-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    arXiv URL (例: https://arxiv.org/abs/1706.03762)
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-neutral-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    arXiv ID (例: 2010.11929)
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-neutral-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    DOI (例: 10.48550/arXiv.1706.03762)
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-neutral-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    論文タイトル
                  </li>
                </ul>
              </div>

              <button
                onClick={handleResetErrorAndTab}
                className="group inline-flex items-center gap-3 px-8 py-4 bg-slate-800
                           hover:bg-slate-700 border border-slate-600 text-slate-200 hover:text-white font-medium rounded-xl
                           transition-all duration-200 shadow-lg shadow-black/40 hover:shadow-xl hover:shadow-black/50
                           transform hover:-translate-y-0.5"
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
        <div className="flex-1 overflow-y-auto custom-scrollbar relative">
          {activeTab === 'search' ? (
            authStatus === 'loading' ? (
              <div className="flex items-center justify-center min-h-full">
                <div className="animate-pulse w-8 h-8 rounded-full bg-neutral-600"></div>
              </div>
            ) : authStatus === 'unauthenticated' ? (
              <div className={`flex flex-col items-center justify-center min-h-full px-6 py-12 relative z-10 transition-all duration-700 ease-in-out ${isTransitioning ? 'opacity-0 scale-95 blur-[2px]' : 'opacity-100 scale-100 blur-none'}`}>
                <h1 className="averia-gruesa-libre-regular text-6xl md:text-7xl tracking-wide text-white mb-10">
                  Necessia
                </h1>
                <button
                  onClick={startLoginPopup}
                  className="group flex items-center gap-4 px-10 py-4 bg-neutral-900/95 backdrop-blur-md border border-neutral-700 hover:border-neutral-500 hover:bg-neutral-800 text-neutral-300 hover:text-neutral-100 font-medium rounded-full transition-all duration-300 shadow-lg shadow-black/50 transform hover:-translate-y-0.5"
                >
                  <svg className="w-6 h-6 text-neutral-400 group-hover:text-neutral-200 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  <span className="text-xl tracking-wider">Log in</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center min-h-full px-6 py-12 relative animate-in fade-in zoom-in-95 duration-1000">
                <div className="relative z-10 w-full max-w-4xl mx-auto text-center mt-6">
                  <h1 className="averia-gruesa-libre-regular text-6xl md:text-7xl tracking-wide text-white mb-10">
                    Necessia
                  </h1>
                  <div>
                    <SearchForm onSearch={handleSearch} isLoading={isLoading} />
                  </div>
                </div>
              </div>
            )
          ) : (
            <FeaturesView />
          )}
        </div>
      )}
    </MainLayout>
  );
}
