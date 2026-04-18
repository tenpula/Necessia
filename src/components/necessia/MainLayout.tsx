/*
 * ページ全体のレイアウトを構成するコンポーネント。
 * サイドバー、メイン領域、アカウントメニューの配置を担当する。
 */

'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import AuthButton from '@/components/AuthButton';
import { SidebarLeft } from './SidebarLeft';
import StarryBackground from '../StarryBackground';
import { CitationNetwork, GapProposal, AnalysisProgress } from '../../types/paper';

interface MainLayoutProps {
  children: React.ReactNode;
  showSidebars?: boolean;
  network?: CitationNetwork | null;
  analysisProgress?: AnalysisProgress;
  contextStats?: Record<string, number>;
  selectedGapProposal?: GapProposal | null;
  onStartAnalysis?: (requestDelay: number) => void;
  onGapProposalChange?: (proposal: GapProposal | null) => void;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ 
  children, 
  showSidebars = true,
  network,
  analysisProgress,
  contextStats,
  selectedGapProposal,
  onStartAnalysis,
  onGapProposalChange,
}) => {
  const { status } = useSession();

  return (
    <div className="h-full flex flex-col text-slate-900 dark:text-white font-display overflow-hidden relative">
      <StarryBackground />
      
      {status === 'authenticated' && (
        <div className="absolute top-4 left-6 z-[60]">
          <AuthButton variant="avatar" />
        </div>
      )}
      
      <div className="flex flex-1 relative overflow-hidden">
        <main className={`flex-1 relative flex flex-col overflow-hidden ${status === 'authenticated' ? 'pt-16' : ''}`}>
          {children}
        </main>

        {showSidebars && (
          <SidebarLeft
            network={network}
            analysisProgress={analysisProgress}
            contextStats={contextStats}
            selectedGapProposal={selectedGapProposal}
            onStartAnalysis={onStartAnalysis}
            onGapProposalChange={onGapProposalChange}
          />
        )}
      </div>
    </div>
  );
};
