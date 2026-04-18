'use client';

import UsageLimitBanner from '@/components/UsageLimitBanner';
import { HomeEmptyState } from '@/components/home/HomeEmptyState';
import { HomeErrorState } from '@/components/home/HomeErrorState';
import { NetworkWorkspace } from '@/components/home/NetworkWorkspace';
import { MainLayout } from '@/components/necessia/MainLayout';
import { useHomePageController } from '@/hooks';

export default function Home() {
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

  const pageContent = network ? (
    <NetworkWorkspace
      network={network}
      selectedGapProposal={selectedGapProposal}
      onAnalysisComplete={handleAnalysisComplete}
      onGapProposalChange={handleGapProposalChange}
      onAnalysisProgressChange={handleAnalysisProgressChange}
      onStartAnalysisReady={handleStartAnalysisReady}
      onCancelAnalysisReady={handleCancelAnalysisReady}
      onClear={clearNetworkView}
    />
  ) : error ? (
    <HomeErrorState error={error} onReset={handleResetError} />
  ) : (
    <HomeEmptyState
      authStatus={authStatus}
      isLoading={isLoading}
      isTransitioning={isTransitioning}
      progress={progress}
      onSearch={handleSearch}
      onLogin={startLoginPopup}
    />
  );

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
      {pageContent}
    </MainLayout>
  );
}
