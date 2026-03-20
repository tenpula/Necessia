/*
 * 【ファイル概要】
 * メイン画面の枠組み
 * 上部のバーや左右のサイドバー、中央の表示エリアなどをどう配置するかを決めています。
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { SidebarLeft } from './SidebarLeft';
import { SidebarRight } from './SidebarRight';
import StarryBackground from '../StarryBackground';
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
  remainingUsage?: number;
  usageLimit?: number;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ 
  children, 
  showSidebars = true,
  network,
  analysisProgress,
  contextStats,
  selectedGapProposal,
  onStartAnalysis,
  remainingUsage,
  usageLimit,
}) => {
  const [selectedPaper] = useState<Paper | null>(showSidebars && !network ? MOCK_PAPER : null); // Conditionally set MOCK_PAPER
  const { data: session, status } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleBack = () => {
    // In the context of research-gap-visualizer, this might reset the view
    console.log("Back button clicked");
  };

  return (
    <div className="h-full flex flex-col text-slate-900 dark:text-white font-display overflow-hidden relative">
      <StarryBackground />
      
      {/* ユーザーアカウントメニュー (Top Left) */}
      {status === 'authenticated' && session?.user && (
        <div className="absolute top-4 left-6 z-[60]" ref={menuRef}>
          <button 
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center justify-center transition-transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-neutral-600 rounded-full"
          >
            {session.user.image ? (
              <img 
                src={session.user.image} 
                alt="User Avatar" 
                className="w-10 h-10 rounded-full border border-neutral-700 shadow-md shadow-black/50 object-cover bg-neutral-800"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-neutral-800 border border-neutral-700 shadow-md shadow-black/50 flex items-center justify-center text-neutral-200 font-bold text-sm">
                {session.user.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
            )}
          </button>
          
          {/* ドロップダウンメニュー */}
          {menuOpen && (
            <div className="absolute left-0 mt-3 w-64 bg-neutral-900 border border-neutral-700 rounded-3xl shadow-xl shadow-black/50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="px-5 py-4 border-b border-neutral-800">
                <p className="text-sm font-medium text-neutral-200 truncate">{session.user.name || 'User'}</p>
                <p className="text-xs text-neutral-500 truncate">{session.user.email || 'No email provided'}</p>
              </div>
              <button
                onClick={() => signOut()}
                className="w-full px-5 py-4 text-sm text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors text-left flex items-center gap-3 font-medium"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                ログアウト
              </button>
            </div>
          )}
        </div>
      )}
      
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
