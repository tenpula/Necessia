/*
 * 【ファイル概要】
 * 左サイドバー
 * 画面の左側に固定され、分析の進捗や見つかったギャップのリスト等を表示します。
 */

import React, { useState } from 'react';
import { CitationNetwork, GapProposal, AnalysisProgress, CONTEXT_TYPE_INFO } from '../../types/paper';
import AnalysisProgressComponent from '../AnalysisProgress';
import GapProposals from '../GapProposals';
import { SidebarAnalysisControls } from './SidebarAnalysisControls';
import { SidebarLegend } from './SidebarLegend';
import { getDelayFromSlider, getSliderFromDelay, isAnalysisIdle } from './sidebarLeftUtils';

interface SidebarLeftProps {
  network?: CitationNetwork | null;
  analysisProgress?: AnalysisProgress;
  contextStats?: Record<string, number>;
  selectedGapProposal?: GapProposal | null;
  onStartAnalysis?: (requestDelay: number) => void;
  onGapProposalChange?: (proposal: GapProposal | null) => void;
}

export const SidebarLeft: React.FC<SidebarLeftProps> = ({
  network,
  analysisProgress,
  contextStats,
  selectedGapProposal,
  onStartAnalysis,
  onGapProposalChange,
}) => {
  const hasNetwork = !!network;
  const [sliderValue, setSliderValue] = useState(() => getSliderFromDelay(50));
  const [showTooltip, setShowTooltip] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const requestDelay = getDelayFromSlider(sliderValue);

  return (
    <div className={`relative h-full flex-none overflow-visible transition-[width] duration-300 ${isPanelOpen ? 'w-80' : 'w-0'}`}>
      <aside
        className={`absolute right-0 top-0 h-full w-80 flex flex-col bg-white dark:bg-neutral-900/95 backdrop-blur-xl border-l border-neutral-200 dark:border-neutral-800/50 z-10 transition-transform duration-300 ${isPanelOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 pt-6 space-y-6" id="left-sidebar">
        {hasNetwork ? (
          <>
            {/* 現在のシード論文 */}
            <div className="px-4 py-3 bg-neutral-900/95 rounded-2xl border border-neutral-700 shadow-md shadow-black/30">
              <p className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold mb-1">現在のSeed論文</p>
              <h3 className="text-neutral-100 font-bold text-sm leading-tight line-clamp-2">{network.seedPaper.title}</h3>
            </div>

            {/* Network Statistics */}
            <div className="flex flex-col gap-1">
              <h1 className="text-neutral-900 dark:text-white text-lg font-medium leading-normal">ネットワーク統計</h1>
              <div className="bg-neutral-50 dark:bg-[#1c1c27] rounded-lg p-3 border border-neutral-200 dark:border-neutral-800">
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <span className="text-neutral-500 dark:text-[#9d9db9]">論文数:</span>
                  <span className="text-neutral-900 dark:text-white font-medium">{network.papers.length}</span>
                  <span className="text-neutral-500 dark:text-[#9d9db9]">引用数:</span>
                  <span className="text-neutral-900 dark:text-white font-medium">{network.citations.length}</span>
                </div>

                {/* 文脈タイプ統計 */}
                {analysisProgress?.status === 'completed' && contextStats && (
                  <div className="mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-800">
                    <h4 className="text-xs text-neutral-500 dark:text-[#9d9db9] uppercase tracking-wider mb-2">文脈タイプ</h4>
                    <div className="space-y-1.5">
                      {Object.entries(contextStats).map(([type, count]) => {
                        const info = CONTEXT_TYPE_INFO[type as keyof typeof CONTEXT_TYPE_INFO];
                        return (
                          <div key={type} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-0.5" style={{ backgroundColor: info.color }} />
                              <span className="text-neutral-700 dark:text-white" style={{ color: info.color }}>{info.label}</span>
                            </div>
                            <span className="text-neutral-500 dark:text-[#9d9db9]">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* 解析進捗 */}
              {analysisProgress && analysisProgress.status !== 'idle' && analysisProgress.status !== 'completed' && (
                <div className="mt-2">
                  <AnalysisProgressComponent progress={analysisProgress} />
                </div>
              )}
            </div>

            {isAnalysisIdle(analysisProgress) && network && (
              <SidebarAnalysisControls
                network={network}
                analysisProgress={analysisProgress}
                requestDelay={requestDelay}
                sliderValue={sliderValue}
                showTooltip={showTooltip}
                onSliderChange={setSliderValue}
                onTooltipChange={setShowTooltip}
                onStartAnalysis={onStartAnalysis}
              />
            )}
            {/* 研究ギャップ提案（右サイドバーに統合） */}
            <div className="flex flex-col gap-2">
              <GapProposals
                network={network}
                variant="embedded"
                onProposalClick={(proposal) => onGapProposalChange?.(proposal)}
              />
              {selectedGapProposal && (
                <button
                  onClick={() => onGapProposalChange?.(null)}
                  className="self-end text-xs text-neutral-400 hover:text-neutral-200 transition-colors"
                >
                  提案選択を解除
                </button>
              )}
            </div>

            <div className="h-px bg-neutral-200 dark:bg-[#282839] w-full"></div>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-1">
              <h1 className="text-neutral-900 dark:text-white text-lg font-medium leading-normal">グラフの表示設定</h1>
              <p className="text-neutral-500 dark:text-[#9d9db9] text-sm font-normal leading-normal">可視化のパラメータを設定します</p>
            </div>
            
            <div className="flex flex-col gap-2">
              <button className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-[#282839] text-neutral-700 dark:text-white transition-colors text-left">
                <span className="material-symbols-outlined text-[20px]">filter_list</span>
                <p className="text-sm font-medium leading-normal">フィルター</p>
              </button>
              <button className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-neutral-700 text-white shadow-lg shadow-black/40 text-left">
                <span className="material-symbols-outlined text-[20px] fill-1">bubble_chart</span>
                <p className="text-sm font-medium leading-normal">クラスター</p>
              </button>
              <button className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-[#282839] text-neutral-700 dark:text-white transition-colors text-left">
                <span className="material-symbols-outlined text-[20px]">history</span>
                <p className="text-sm font-medium leading-normal">履歴</p>
              </button>
              <button className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-[#282839] text-neutral-700 dark:text-white transition-colors text-left">
                <span className="material-symbols-outlined text-[20px]">download</span>
                <p className="text-sm font-medium leading-normal">データ出力</p>
              </button>
            </div>

            <div className="h-px bg-neutral-200 dark:bg-[#282839] w-full"></div>

            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <p className="text-neutral-900 dark:text-white text-sm font-medium leading-normal">出版年</p>
                <span className="text-xs text-neutral-300 font-bold">1990 - 2024</span>
              </div>
              <div className="flex h-[38px] w-full pt-1.5 px-1">
                <div className="relative flex h-1 w-full rounded-sm bg-neutral-200 dark:bg-[#3b3b54] items-center">
                  <div className="absolute left-[20%] right-[15%] h-1 bg-neutral-700 rounded-sm"></div>
                  <div className="absolute left-[20%] -ml-1.5 top-1/2 -translate-y-1/2 cursor-pointer hover:scale-110 transition-transform z-10">
                    <div className="size-3 rounded-full bg-white ring-2 ring-neutral-500 shadow-sm"></div>
                  </div>
                  <div className="absolute right-[15%] -mr-1.5 top-1/2 -translate-y-1/2 cursor-pointer hover:scale-110 transition-transform z-10">
                    <div className="size-3 rounded-full bg-white ring-2 ring-neutral-500 shadow-sm"></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <p className="text-neutral-900 dark:text-white text-sm font-medium leading-normal">最小引用数</p>
              <div className="flex h-[20px] w-full pt-1.5 px-1">
                <div className="relative flex h-1 w-full rounded-sm bg-neutral-200 dark:bg-[#3b3b54] items-center">
                  <div className="absolute left-0 w-[40%] h-1 bg-neutral-700 rounded-sm"></div>
                  <div className="absolute left-[40%] -ml-1.5 top-1/2 -translate-y-1/2 cursor-pointer hover:scale-110 transition-transform z-10">
                    <div className="size-3 rounded-full bg-white ring-2 ring-neutral-500 shadow-sm"></div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
        </div>

        <SidebarLegend hasNetwork={hasNetwork} selectedGapProposal={selectedGapProposal} />
      </aside>

      <button
        type="button"
        onClick={() => setIsPanelOpen((prev) => !prev)}
        className="absolute left-[-32px] top-6 z-20 inline-flex items-center justify-center w-8 h-12 rounded-l-xl rounded-r-none bg-neutral-900/95 text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100 transition-colors shadow-[0_10px_24px_rgba(0,0,0,0.35)]"
        aria-label={isPanelOpen ? 'サイドバーを閉じる' : 'サイドバーを開く'}
      >
        <svg
          className={`w-4 h-4 transition-transform ${isPanelOpen ? '' : 'rotate-180'}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M15 6l-6 6 6 6" />
        </svg>
      </button>
    </div>
  );
};
