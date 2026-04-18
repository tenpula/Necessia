'use client';

import CitationGraph from '@/components/CitationGraph';
import { AnalysisProgress, CitationNetwork, GapProposal } from '@/types/paper';

interface NetworkWorkspaceProps {
  network: CitationNetwork;
  selectedGapProposal: GapProposal | null;
  onAnalysisComplete: (updatedNetwork: CitationNetwork) => void;
  onGapProposalChange: (proposal: GapProposal | null) => void;
  onAnalysisProgressChange: (nextProgress: AnalysisProgress) => void;
  onStartAnalysisReady: (startAnalysis: (requestDelay: number) => Promise<void>) => void;
  onCancelAnalysisReady: (cancelAnalysis: () => void) => void;
  onClear: () => void;
}

export function NetworkWorkspace({
  network,
  selectedGapProposal,
  onAnalysisComplete,
  onGapProposalChange,
  onAnalysisProgressChange,
  onStartAnalysisReady,
  onCancelAnalysisReady,
  onClear,
}: NetworkWorkspaceProps) {
  return (
    <div className="flex-1 relative h-full">
      <div className="absolute top-4 left-4 z-20">
        <button
          onClick={onClear}
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
        onAnalysisComplete={onAnalysisComplete}
        onGapProposalChange={onGapProposalChange}
        onAnalysisProgressChange={onAnalysisProgressChange}
        onStartAnalysisReady={onStartAnalysisReady}
        onCancelAnalysisReady={onCancelAnalysisReady}
      />
    </div>
  );
}
