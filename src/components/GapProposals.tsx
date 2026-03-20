/*
 * 【ファイル概要】
 * 研究ギャップ提案リスト
 * 発見された課題（ギャップ）の一覧をカード形式で表示する部品です。
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { GapProposal, CitationNetwork } from '@/types/paper';
import { LoadingSpinner } from './ui';
import { formatPaperTitle } from '@/lib/format';

interface GapProposalsProps {
  network: CitationNetwork;
  onProposalClick?: (proposal: GapProposal) => void;
}

export default function GapProposals({ network, onProposalClick }: GapProposalsProps) {
  const [proposals, setProposals] = useState<GapProposal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  useEffect(() => {
    // ネットワークが変更されたらリセット
    setProposals([]);
    setError(null);
    setIsExpanded(false);
    setIsCollapsed(true);
    setIsPanelOpen(false);
  }, [network.seedPaper.id]);

  const findGaps = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/papers/gap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          network,
          options: {
            minSimilarity: 0.4,
            minCoCitations: 1,
            maxProposals: 15,
          },
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to find gaps');
      }

      const data = await response.json();
      setProposals(data.proposals || []);
      setIsExpanded(true);
      setIsCollapsed(false);
      setIsPanelOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = () => {
    if (!isExpanded && proposals.length === 0 && !isLoading && !error) {
      setIsPanelOpen(true);
      findGaps();
    } else {
      const newPanelState = !isPanelOpen;
      setIsPanelOpen(newPanelState);
      if (newPanelState && proposals.length > 0) {
        setIsCollapsed(false);
      }
    }
  };

  const handleClose = () => {
    setIsPanelOpen(false);
    setIsExpanded(false);
    setError(null);
  };

  const handleRetry = () => {
    setIsPanelOpen(true);
    findGaps();
  };

  const handleCancel = () => {
    setIsLoading(false);
    setIsPanelOpen(false);
  };

  const handleToggleCollapsed = useCallback(() => {
    setIsCollapsed((prev) => !prev);
  }, []);

  return (
    <>
      <ToggleButton isPanelOpen={isPanelOpen} onClick={handleToggle} />
      <SlidePanel
        isPanelOpen={isPanelOpen}
        isLoading={isLoading}
        error={error}
        isExpanded={isExpanded}
        proposals={proposals}
        isCollapsed={isCollapsed}
        onToggleCollapsed={handleToggleCollapsed}
        onClose={handleClose}
        onRetry={handleRetry}
        onCancel={handleCancel}
        onProposalClick={onProposalClick}
      />
    </>
  );
}

// トグルボタン
interface ToggleButtonProps {
  isPanelOpen: boolean;
  onClick: () => void;
}

function ToggleButton({ isPanelOpen, onClick }: ToggleButtonProps) {
  return (
    <div
      style={{
        position: 'fixed',
        right: 0,
        top: '100px',
        zIndex: 40,
        transform: isPanelOpen ? 'translateX(-384px)' : 'translateX(0)',
        transition: 'transform 300ms ease-in-out',
        willChange: 'transform',
      }}
    >
      <button
        onClick={onClick}
        className="h-40 w-14 bg-slate-900/90 backdrop-blur-md hover:bg-slate-800 
                   text-purple-400 rounded-l-3xl shadow-lg border-l border-t border-b border-purple-500/30
                   transition-all duration-500 hover:border-purple-500/50
                   flex items-center justify-center group"
        title="研究ギャップの提案"
      >
        <svg
          className="w-7 h-7"
          style={{
            transform: isPanelOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 500ms ease-in-out',
          }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
      </button>
    </div>
  );
}

// スライドパネル
interface SlidePanelProps {
  isPanelOpen: boolean;
  isLoading: boolean;
  error: string | null;
  isExpanded: boolean;
  proposals: GapProposal[];
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
  onClose: () => void;
  onRetry: () => void;
  onCancel: () => void;
  onProposalClick?: (proposal: GapProposal) => void;
}

function SlidePanel({
  isPanelOpen,
  isLoading,
  error,
  isExpanded,
  proposals,
  isCollapsed,
  onToggleCollapsed,
  onClose,
  onRetry,
  onCancel,
  onProposalClick,
}: SlidePanelProps) {
  const shouldRender = isPanelOpen || isLoading || error || isExpanded;

  if (!shouldRender) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        right: 0,
        top: 0,
        height: '100%',
        zIndex: 30,
        width: '384px',
        maxWidth: '90vw',
        transform: isPanelOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 300ms ease-in-out',
        willChange: 'transform',
      }}
    >
      <div className="h-full bg-slate-900/95 backdrop-blur-md border-l border-purple-700/50 shadow-2xl flex flex-col">
        {isLoading ? (
          <LoadingState onCancel={onCancel} />
        ) : error ? (
          <ErrorState error={error} onRetry={onRetry} onClose={onClose} />
        ) : proposals.length === 0 && isExpanded ? (
          <EmptyState onClose={onClose} />
        ) : (
          <ProposalsList
            proposals={proposals}
            isCollapsed={isCollapsed}
            onToggleCollapsed={onToggleCollapsed}
            onProposalClick={onProposalClick}
          />
        )}
      </div>
    </div>
  );
}

// ローディング状態
interface LoadingStateProps {
  onCancel: () => void;
}

function LoadingState({ onCancel }: LoadingStateProps) {
  return (
    <div className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <LoadingSpinner size="md" className="text-purple-500" />
          <span className="text-slate-300">研究ギャップを分析中...</span>
        </div>
        <CloseIcon onClick={onCancel} />
      </div>
    </div>
  );
}

// エラー状態
interface ErrorStateProps {
  error: string;
  onRetry: () => void;
  onClose: () => void;
}

function ErrorState({ error, onRetry, onClose }: ErrorStateProps) {
  return (
    <div className="p-4">
      <div className="flex items-start gap-3">
        <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clipRule="evenodd"
          />
        </svg>
        <div className="flex-1">
          <p className="text-red-300 font-medium mb-1">エラー</p>
          <p className="text-red-400 text-sm">{error}</p>
          <button onClick={onRetry} className="mt-2 text-red-300 hover:text-red-200 text-sm underline">
            再試行
          </button>
        </div>
        <CloseIcon onClick={onClose} className="text-red-400 hover:text-red-300" />
      </div>
    </div>
  );
}

// 空の状態
interface EmptyStateProps {
  onClose: () => void;
}

function EmptyState({ onClose }: EmptyStateProps) {
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-purple-400 font-semibold">研究ギャップの提案</h3>
        <CloseIcon onClick={onClose} />
      </div>
      <p className="text-slate-400 text-sm">
        重要なギャップは見つかりませんでした。ネットワーク内の論文は十分に接続されているようです。
      </p>
    </div>
  );
}

// 提案リスト
interface ProposalsListProps {
  proposals: GapProposal[];
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
  onProposalClick?: (proposal: GapProposal) => void;
}

function ProposalsList({ proposals, isCollapsed, onToggleCollapsed, onProposalClick }: ProposalsListProps) {
  return (
    <>
      <button
        onClick={onToggleCollapsed}
        className="w-full flex items-center p-4 border-b border-slate-700/50 hover:bg-slate-800/50 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
          <h3 className="text-purple-400 font-semibold">研究ギャップの提案 ({proposals.length})</h3>
        </div>
      </button>

      {!isCollapsed && (
        <div className="overflow-y-auto custom-scrollbar flex-1">
          <div className="p-2 space-y-2">
            {proposals.map((proposal) => (
              <ProposalItem
                key={`${proposal.paperA.id}-${proposal.paperB.id}`}
                proposal={proposal}
                onProposalClick={onProposalClick}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}

// 提案アイテム
interface ProposalItemProps {
  proposal: GapProposal;
  onProposalClick?: (proposal: GapProposal) => void;
}

function ProposalItem({ proposal, onProposalClick }: ProposalItemProps) {
  return (
    <div
      className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/30 
                 hover:border-purple-500/50 transition-all cursor-pointer
                 hover:bg-slate-800/70"
      onClick={() => onProposalClick?.(proposal)}
    >
      <div className="mb-2">
        <div className="flex items-start gap-2 mb-1">
          <span className="text-xs text-purple-400 font-medium">論文A:</span>
          <span className="text-xs text-slate-300 flex-1">
            {formatPaperTitle(proposal.paperA.title, 60)}
          </span>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-xs text-pink-400 font-medium">論文B:</span>
          <span className="text-xs text-slate-300 flex-1">
            {formatPaperTitle(proposal.paperB.title, 60)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-2 text-xs">
        <div className="flex items-center gap-1">
          <span className="text-slate-400">類似度:</span>
          <span className="text-neutral-300 font-medium">{(proposal.similarityScore * 100).toFixed(0)}%</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-slate-400">共引用数:</span>
          <span className="text-purple-400 font-medium">{proposal.coCitationCount}</span>
        </div>
      </div>

      <p className="text-xs text-slate-400 line-clamp-2">{proposal.reasoning}</p>

      {proposal.commonCitations.length > 0 && (
        <div className="mt-2 pt-2 border-t border-slate-700/30">
          <p className="text-xs text-slate-500 mb-1">共通の引用文献:</p>
          <div className="flex flex-wrap gap-1">
            {proposal.commonCitations.slice(0, 3).map((paper) => (
              <span
                key={paper.id}
                className="text-xs px-2 py-0.5 bg-slate-700/50 rounded text-slate-300"
              >
                {formatPaperTitle(paper.title, 30)}
              </span>
            ))}
            {proposal.commonCitations.length > 3 && (
              <span className="text-xs text-slate-500">他 +{proposal.commonCitations.length - 3} 件</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// 閉じるアイコン
interface CloseIconProps {
  onClick: () => void;
  className?: string;
}

function CloseIcon({ onClick, className = 'text-slate-400 hover:text-slate-300' }: CloseIconProps) {
  return (
    <button onClick={onClick} className={className} title="閉じる">
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
          clipRule="evenodd"
        />
      </svg>
    </button>
  );
}
