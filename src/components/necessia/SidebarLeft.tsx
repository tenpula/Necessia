/*
 * 【ファイル概要】
 * 左サイドバー
 * 画面の左側に固定され、分析の進捗や見つかったギャップのリスト等を表示します。
 */

import React, { useState, useRef, useEffect } from 'react';
import { CitationNetwork, GapProposal, AnalysisProgress, CONTEXT_TYPE_INFO } from '../../types/paper';
import AnalysisProgressComponent from '../AnalysisProgress';

interface SidebarLeftProps {
  network?: CitationNetwork | null;
  analysisProgress?: AnalysisProgress;
  contextStats?: Record<string, number>;
  selectedGapProposal?: GapProposal | null;
  onStartAnalysis?: (requestDelay: number) => void;
}

export const SidebarLeft: React.FC<SidebarLeftProps> = ({
  network,
  analysisProgress,
  contextStats,
  selectedGapProposal,
  onStartAnalysis,
}) => {
  const hasNetwork = !!network;
  const [requestDelay, setRequestDelay] = useState(50); // デフォルト50ms
  const [sliderValue, setSliderValue] = useState(1); // スライダーの値（0-4のインデックス）
  const [showTooltip, setShowTooltip] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);

  // リクエストレートのプリセット値（ミリ秒）
  const delayPresets = [
    { label: 'Fast', value: 10 },
    { label: 'Normal', value: 50 },
    { label: 'Slow', value: 100 },
    { label: 'Very Slow', value: 200 },
    { label: 'Ultra Slow', value: 500 },
  ];

  // スライダーの値からrequestDelayを計算
  const getDelayFromSlider = (value: number): number => {
    return delayPresets[value].value;
  };

  // requestDelayからスライダーの値を計算
  const getSliderFromDelay = (delay: number): number => {
    const index = delayPresets.findIndex(preset => preset.value === delay);
    return index >= 0 ? index : 1; // デフォルトはNormal
  };

  // 初期化時にrequestDelayからsliderValueを設定
  useEffect(() => {
    const initialSliderValue = getSliderFromDelay(requestDelay);
    if (initialSliderValue !== sliderValue) {
      setSliderValue(initialSliderValue);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // スライダーの値が変更されたときにrequestDelayを更新
  useEffect(() => {
    const delay = getDelayFromSlider(sliderValue);
    setRequestDelay(delay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sliderValue]);

  const handleStartAnalysis = () => {
    if (onStartAnalysis && network && network.citations.length > 0) {
      onStartAnalysis(requestDelay);
    }
  };

  const isAnalysisIdle = !analysisProgress || analysisProgress.status === 'idle';
  const isAnalysisInProgress = analysisProgress?.status === 'analyzing';

  // LLM APIの平均処理時間（ミリ秒）- 実際の値は1-3秒の範囲
  const AVERAGE_API_PROCESSING_TIME_MS = 2000; // 2秒
  
  // 実際のRPM計算: API処理時間 + 待機時間を考慮
  // 実際の処理時間 = API処理時間 + 待機時間
  // 実際のRPM = 60,000 / 実際の処理時間
  const calculateActualRPM = (delayMs: number, apiProcessingTimeMs: number): number => {
    const totalTimePerRequest = apiProcessingTimeMs + delayMs;
    return Math.round(60000 / totalTimePerRequest);
  };

  // 理論上の最大RPM（API処理時間を無視した場合）
  const calculateTheoreticalMaxRPM = (delayMs: number): number => {
    return Math.round(60000 / delayMs);
  };

  const actualRPM = calculateActualRPM(requestDelay, AVERAGE_API_PROCESSING_TIME_MS);
  const theoreticalMaxRPM = calculateTheoreticalMaxRPM(requestDelay);
  const citationsToAnalyze = network?.citations.length || 0;
  
  // 推定所要時間の計算（秒）- API処理時間 + 待機時間を考慮
  const estimatedTimeSeconds = citationsToAnalyze > 0 
    ? Math.round((citationsToAnalyze * (AVERAGE_API_PROCESSING_TIME_MS + requestDelay)) / 1000)
    : 0;
  const estimatedTimeMinutes = Math.floor(estimatedTimeSeconds / 60);
  const estimatedTimeSecondsRemainder = estimatedTimeSeconds % 60;

  return (
    <aside className="w-80 h-full flex flex-col bg-white dark:bg-neutral-900/95 backdrop-blur-xl border-r border-neutral-200 dark:border-neutral-800/50 z-10 transition-all duration-300 absolute md:relative -translate-x-full md:translate-x-0">
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 pt-20 space-y-8" id="left-sidebar">
        {hasNetwork ? (
          <>
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

            {/* AI分類コントロール */}
            {isAnalysisIdle && (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <h2 className="text-neutral-900 dark:text-white text-sm font-medium leading-normal">AI 分類（自動化）</h2>
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-[#9d9db9]">
                    リクエスト間隔を選択し、AIによる引用文脈の分析を開始します
                  </p>
                  <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded text-xs text-amber-800 dark:text-amber-300">
                    <p className="font-semibold mb-1">注意:</p>
                    <p>LLM APIの処理には通常1リクエストあたり1〜3秒かかります。リクエスト間の待機時間はAPI処理時間に比べて短いため、全体的な速度の違いはすぐには実感できない場合があります。</p>
                  </div>
                </div>

                {/* 分類情報の表示 */}
                <div className="bg-neutral-50 dark:bg-[#1c1c27] rounded-lg p-3 border border-neutral-200 dark:border-neutral-800">
                  <div className="flex flex-col gap-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-neutral-500 dark:text-[#9d9db9]">分析対象の引用数:</span>
                      <span className="text-neutral-900 dark:text-white font-medium">{citationsToAnalyze}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-neutral-500 dark:text-[#9d9db9]">リクエスト間隔:</span>
                      <span className="text-neutral-900 dark:text-white font-medium">{requestDelay}ms</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-neutral-500 dark:text-[#9d9db9]">実際のRPM:</span>
                      <span className="text-neutral-300 dark:text-neutral-300 font-bold">{actualRPM.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-neutral-400 dark:text-[#9d9db9]">(理論上の最大値: {theoreticalMaxRPM.toLocaleString()})</span>
                      <span className="text-neutral-400 dark:text-[#9d9db9]">API: ~{AVERAGE_API_PROCESSING_TIME_MS / 1000}s</span>
                    </div>
                    {citationsToAnalyze > 0 && (
                      <div className="flex justify-between items-center pt-2 border-t border-neutral-200 dark:border-neutral-800">
                        <span className="text-neutral-500 dark:text-[#9d9db9]">推定所要時間:</span>
                        <span className="text-neutral-900 dark:text-white font-medium">
                          {estimatedTimeMinutes > 0 && `${estimatedTimeMinutes}m `}
                          {estimatedTimeSecondsRemainder}s
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* リクエストレート選択 - スライダー */}
                <div className="flex flex-col gap-3">
                  <label className="text-xs text-neutral-500 dark:text-[#9d9db9] uppercase tracking-wider font-bold">
                    リクエスト間隔 (Request Rate)
                  </label>
                  <div 
                    ref={sliderRef}
                    className="relative"
                    onMouseEnter={() => setShowTooltip(true)}
                    onMouseLeave={() => setShowTooltip(false)}
                  >
                    {/* スライダー */}
                    <div className="relative h-2 bg-neutral-200 dark:bg-[#3b3b54] rounded-full">
                      {/* マーカー */}
                      <div className="absolute inset-0 flex justify-between items-center px-1">
                        {delayPresets.map((_, index) => (
                          <div
                            key={index}
                            className={`w-1.5 h-1.5 rounded-full transition-colors ${
                              index <= sliderValue
                                ? 'bg-neutral-700'
                                : 'bg-neutral-300 dark:bg-neutral-600'
                            }`}
                          />
                        ))}
                      </div>
                      
                      {/* アクティブな範囲 */}
                      <div
                        className="absolute top-0 left-0 h-2 bg-neutral-700 rounded-full transition-all duration-200"
                        style={{ width: `${(sliderValue / (delayPresets.length - 1)) * 100}%` }}
                      />
                      
                      {/* スライダーハンドル */}
                      <input
                        type="range"
                        min="0"
                        max={delayPresets.length - 1}
                        step="1"
                        value={sliderValue}
                        onChange={(e) => {
                          setSliderValue(Number(e.target.value));
                          setShowTooltip(true);
                        }}
                        className="absolute inset-0 w-full h-2 opacity-0 cursor-pointer z-10"
                      />
                      
                      {/* ハンドルの表示 */}
                      <div
                        className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white dark:bg-neutral-700 border-2 border-neutral-500 rounded-full shadow-lg transition-all duration-200 cursor-pointer z-20"
                        style={{ left: `calc(${(sliderValue / (delayPresets.length - 1)) * 100}% - 8px)` }}
                      />
                    </div>
                    
                    {/* ラベル */}
                    <div className="flex justify-between mt-2 text-xs text-neutral-500 dark:text-[#9d9db9]">
                      {delayPresets.map((preset, index) => (
                        <span
                          key={index}
                          className={`transition-colors ${
                            index === sliderValue
                              ? 'text-neutral-300 font-semibold'
                              : ''
                          }`}
                        >
                          {preset.label}
                        </span>
                      ))}
                    </div>

                    {/* ツールチップ */}
                    {showTooltip && (
                      <div
                        className="absolute z-50 px-3 py-2 bg-neutral-900 dark:bg-neutral-800 text-white text-xs rounded-lg shadow-xl border border-neutral-700 pointer-events-none whitespace-nowrap"
                        style={{
                          left: `${(sliderValue / (delayPresets.length - 1)) * 100}%`,
                          bottom: '100%',
                          transform: 'translateX(-50%)',
                          marginBottom: '8px',
                        }}
                      >
                        <div className="flex flex-col gap-1">
                          <div className="font-semibold text-neutral-300">
                            {delayPresets[sliderValue].label}
                          </div>
                          <div className="text-neutral-300">
                            Rate: {getDelayFromSlider(sliderValue)}ms
                          </div>
                          <div className="text-neutral-300">
                            RPM: ~{calculateActualRPM(getDelayFromSlider(sliderValue), AVERAGE_API_PROCESSING_TIME_MS).toLocaleString()}
                          </div>
                        </div>
                        {/* ツールチップの矢印 */}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900 dark:border-t-slate-800" />
                      </div>
                    )}
                  </div>
                </div>

                {/* 解析開始ボタン */}
                <button
                  onClick={handleStartAnalysis}
                  disabled={!network || network.citations.length === 0 || isAnalysisInProgress}
                  className="w-full px-4 py-3 bg-neutral-800 
                           hover:bg-neutral-700 border border-neutral-600
                           disabled:bg-neutral-800 disabled:border-neutral-700 disabled:text-neutral-500 disabled:cursor-not-allowed
                           text-neutral-200 font-medium rounded-xl
                           transition-all duration-200 shadow-md shadow-black/40
                           flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  <span>AI分類を開始する</span>
                </button>
              </div>
            )}

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

      <div className="p-4 bg-neutral-50 dark:bg-[#1c1c27] border-t border-neutral-200 dark:border-neutral-800">
        <p className="text-xs text-neutral-500 dark:text-[#9d9db9] mb-3 uppercase tracking-wider font-bold">凡例（Legend）</p>
        <div className="flex flex-col gap-2">
          {hasNetwork ? (
            <>
              {/* ノードタイプ */}
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-neutral-400 border-2 border-neutral-300"></div>
                <span className="text-xs text-neutral-700 dark:text-white">シード論文</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-neutral-600 border-2 border-neutral-500"></div>
                <span className="text-xs text-neutral-700 dark:text-white">ジャーナル</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-md bg-neutral-600 border-2 border-neutral-500"></div>
                <span className="text-xs text-neutral-700 dark:text-white">カンファレンス</span>
              </div>

              {/* ノードの色（年代） */}
              <div className="mt-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
                <h4 className="text-xs text-neutral-500 dark:text-[#9d9db9] uppercase tracking-wider mb-2">ノードの色（年代）</h4>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: 'hsl(180, 70%, 25%)', border: '2px solid hsl(180, 80%, 50%)' }}
                    />
                    <span className="text-xs text-neutral-700 dark:text-white">新しい</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: 'hsl(120, 70%, 25%)', border: '2px solid hsl(120, 80%, 50%)' }}
                    />
                    <span className="text-xs text-neutral-700 dark:text-white">古い</span>
                  </div>
                </div>
              </div>

              {/* Gap Proposal ハイライト */}
              {selectedGapProposal && (
                <div className="mt-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
                  <h4 className="text-xs text-neutral-500 dark:text-[#9d9db9] uppercase tracking-wider mb-2">研究の空白（Gap）</h4>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-purple-500/50 border-2 border-purple-400 animate-pulse"></div>
                    <span className="text-xs text-neutral-700 dark:text-white">論文 A</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-4 h-4 rounded-full bg-pink-500/50 border-2 border-pink-400 animate-pulse"></div>
                    <span className="text-xs text-neutral-700 dark:text-white">論文 B</span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <div className="size-3 rounded-full bg-neutral-700"></div>
                <span className="text-xs text-neutral-700 dark:text-white">選択中のノード</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="size-3 rounded-full bg-purple-500"></div>
                <span className="text-xs text-neutral-700 dark:text-white">引用数 &gt; 100</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="size-3 rounded-full bg-neutral-400 dark:bg-neutral-600"></div>
                <span className="text-xs text-neutral-700 dark:text-white">通常のノード</span>
              </div>
            </>
          )}
        </div>
      </div>
    </aside>
  );
};
