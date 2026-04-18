/*
 * ホーム画面の制御ロジックを集約するフック。
 * 画面描画と状態管理を分離し、`page.tsx` の可読性を保つ。
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { AnalysisProgress, CitationNetwork, GapProposal } from '@/types/paper';
import { calculateContextStats } from '@/lib/graph-layout';

const DEFAULT_USAGE_LIMIT = 3;
const LOGIN_TRANSITION_DELAY_MS = 250;

interface UseHomePageControllerResult {
  authStatus: 'loading' | 'authenticated' | 'unauthenticated';
  network: CitationNetwork | null;
  isLoading: boolean;
  error: string | null;
  progress: string;
  selectedGapProposal: GapProposal | null;
  analysisProgress: AnalysisProgress | undefined;
  contextStats: Record<string, number>;
  remainingUsage: number | undefined;
  usageLimit: number;
  showUsageLimitBanner: boolean;
  isTransitioning: boolean;
  handleSearch: (query: string) => Promise<void>;
  handleAnalysisComplete: (updatedNetwork: CitationNetwork) => void;
  handleGapProposalChange: (proposal: GapProposal | null) => void;
  handleAnalysisProgressChange: (nextProgress: AnalysisProgress) => void;
  handleStartAnalysisReady: (startAnalysis: (requestDelay: number) => Promise<void>) => void;
  handleCancelAnalysisReady: (cancelAnalysis: () => void) => void;
  handleStartAnalysis: (requestDelay: number) => void;
  handleResetError: () => void;
  clearNetworkView: () => void;
  startLoginPopup: () => void;
  closeUsageLimitBanner: () => void;
}

export function useHomePageController(): UseHomePageControllerResult {
  const { status } = useSession();

  const [network, setNetwork] = useState<CitationNetwork | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState('');
  const [selectedGapProposal, setSelectedGapProposal] = useState<GapProposal | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState<AnalysisProgress | undefined>(undefined);
  const [startAnalysisFn, setStartAnalysisFn] = useState<((requestDelay: number) => Promise<void>) | null>(null);
  const [cancelAnalysisFn, setCancelAnalysisFn] = useState<(() => void) | null>(null);

  const [remainingUsage, setRemainingUsage] = useState<number | undefined>(undefined);
  const [usageLimit, setUsageLimit] = useState(DEFAULT_USAGE_LIMIT);
  const [showUsageLimitBanner, setShowUsageLimitBanner] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const resetAnalysisBindings = useCallback(() => {
    setStartAnalysisFn(null);
    setCancelAnalysisFn(null);
    setSelectedGapProposal(null);
    setAnalysisProgress(undefined);
  }, []);

  const fetchUsage = useCallback(async () => {
    if (status !== 'authenticated') {
      setRemainingUsage(undefined);
      setUsageLimit(DEFAULT_USAGE_LIMIT);
      return;
    }

    try {
      const res = await fetch('/api/usage/check');
      if (!res.ok) return;

      const data = await res.json();
      setRemainingUsage(data.remaining);
      setUsageLimit(data.limit);
    } catch (fetchError) {
      console.error('Could not fetch usage:', fetchError);
    }
  }, [status]);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  const clearNetworkView = useCallback(() => {
    cancelAnalysisFn?.();
    resetAnalysisBindings();
    setNetwork(null);
  }, [cancelAnalysisFn, resetAnalysisBindings]);

  const handleSearch = useCallback(
    async (query: string) => {
      setIsLoading(true);
      setError(null);
      clearNetworkView();
      setProgress('論文を検索中...');

      try {
        setProgress('引用ネットワークを構築中...');
        const response = await fetch(`/api/papers/network?q=${encodeURIComponent(query)}&limit=30`);

        if (!response.ok) {
          const data = await response.json();
          const errorMessage = data.error || `Failed to build network (Status: ${response.status})`;
          throw new Error(errorMessage);
        }

        const data: CitationNetwork = await response.json();
        setProgress('');
        setNetwork(data);
      } catch (searchError) {
        const message = searchError instanceof Error ? searchError.message : 'An error occurred';
        setError(message);

        if (message.includes('無料枠')) {
          setShowUsageLimitBanner(true);
        }
      } finally {
        setIsLoading(false);
        setProgress('');
        fetchUsage();
      }
    },
    [clearNetworkView, fetchUsage]
  );

  const handleAnalysisComplete = useCallback((updatedNetwork: CitationNetwork) => {
    setNetwork(updatedNetwork);
  }, []);

  const handleGapProposalChange = useCallback((proposal: GapProposal | null) => {
    setSelectedGapProposal(proposal);
  }, []);

  const handleAnalysisProgressChange = useCallback((nextProgress: AnalysisProgress) => {
    setAnalysisProgress(nextProgress);
    if (nextProgress.status === 'error' && nextProgress.errorMessage?.includes('無料枠')) {
      setShowUsageLimitBanner(true);
    }
  }, []);

  const handleStartAnalysisReady = useCallback((startAnalysis: (requestDelay: number) => Promise<void>) => {
    setStartAnalysisFn(() => startAnalysis);
  }, []);

  const handleCancelAnalysisReady = useCallback((cancelAnalysis: () => void) => {
    setCancelAnalysisFn(() => cancelAnalysis);
  }, []);

  const handleStartAnalysis = useCallback(
    (requestDelay: number) => {
      if (startAnalysisFn) {
        void startAnalysisFn(requestDelay);
      }
    },
    [startAnalysisFn]
  );

  const handleResetError = useCallback(() => {
    setError(null);
    clearNetworkView();
  }, [clearNetworkView]);

  const startLoginPopup = useCallback(() => {
    setIsTransitioning(true);

    setTimeout(async () => {
      await signIn('google', { redirectTo: '/' });
      setIsTransitioning(false);
    }, LOGIN_TRANSITION_DELAY_MS);
  }, []);

  const closeUsageLimitBanner = useCallback(() => {
    setShowUsageLimitBanner(false);
  }, []);

  useEffect(() => {
    if (network) {
      setSelectedGapProposal(null);
      setAnalysisProgress(undefined);
      return;
    }

    resetAnalysisBindings();
  }, [network, resetAnalysisBindings]);

  const contextStats = useMemo(() => {
    if (!network) return {};
    return calculateContextStats(network.citations);
  }, [network]);

  return {
    authStatus: status,
    network,
    isLoading,
    error,
    progress,
    selectedGapProposal,
    analysisProgress,
    contextStats,
    remainingUsage,
    usageLimit,
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
  };
}
