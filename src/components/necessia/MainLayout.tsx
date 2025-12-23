import React, { useState } from 'react';
import { TopBar } from './TopBar';
import { SidebarLeft } from './SidebarLeft';
import { SidebarRight } from './SidebarRight';
import { Paper } from '../../types/necessia';
import { CitationNetwork, GapProposal, AnalysisProgress } from '../../types/paper';

// Mock data matching the UI screenshot from necessia-page
const MOCK_PAPER: Paper = {
  id: '1',
  title: 'Entanglement Swapping between Independent Sources',
  year: 2024,
  month: 'Oct',
  category: 'Physics',
  subCategory: 'Quantum Mechanics',
  citations: 1248,
  impactFactor: 8.42,
  authors: [
    { initials: 'AE', name: 'A. Einstein' },
    { initials: 'BP', name: 'B. Podolsky' },
    { initials: 'NR', name: 'N. Rosen' }
  ],
  abstract: 'We report on the experimental realization of entanglement swapping over large distances. Two pairs of entangled photons are produced in independent sources and one photon from each pair is sent to a joint measurement station...',
  connectedNodes: [
    { id: '2', title: "Bell's Theorem Validation", year: 1984, authors: 'Aspect et al.' },
    { id: '3', title: 'Quantum Teleportation Logic', year: 1993, authors: 'Bennett et al.' },
    { id: '4', title: 'Superdense Coding Protocol', year: 1992, authors: 'Bennett & Wiesner' }
  ]
};

interface MainLayoutProps {
  children: React.ReactNode;
  showSidebars?: boolean;
  network?: CitationNetwork | null;
  analysisProgress?: AnalysisProgress;
  contextStats?: Record<string, number>;
  selectedGapProposal?: GapProposal | null;
  onStartAnalysis?: (requestDelay: number) => void;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ 
  children, 
  showSidebars = true,
  network,
  analysisProgress,
  contextStats,
  selectedGapProposal,
  onStartAnalysis,
}) => {
  const [selectedPaper] = useState<Paper | null>(showSidebars && !network ? MOCK_PAPER : null); // Conditionally set MOCK_PAPER

  const handleBack = () => {
    // In the context of research-gap-visualizer, this might reset the view
    console.log("Back button clicked");
  };

  return (
    <div className="h-full flex flex-col bg-background-light dark:bg-background-dark text-slate-900 dark:text-white font-display overflow-hidden">
      <TopBar onBack={handleBack} />
      
      <div className="flex flex-1 relative overflow-hidden">
        {showSidebars && (
          <SidebarLeft 
            network={network}
            analysisProgress={analysisProgress}
            contextStats={contextStats}
            selectedGapProposal={selectedGapProposal}
            onStartAnalysis={onStartAnalysis}
          />
        )}
        
        <main className="flex-1 relative flex flex-col overflow-hidden">
          {children}
        </main>
        
        {selectedPaper && showSidebars && !network && <SidebarRight paper={selectedPaper} />}
      </div>
    </div>
  );
};
