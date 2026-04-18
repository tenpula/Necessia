import { AnalysisProgress, CitationNetwork } from '@/types/paper';
import {
  AVERAGE_API_PROCESSING_TIME_MS,
  calculateActualRPM,
  calculateTheoreticalMaxRPM,
  DELAY_PRESETS,
  estimateAnalysisTime,
  getDelayFromSlider,
} from './sidebarLeftUtils';

interface SidebarAnalysisControlsProps {
  network: CitationNetwork;
  analysisProgress?: AnalysisProgress;
  requestDelay: number;
  sliderValue: number;
  showTooltip: boolean;
  onSliderChange: (value: number) => void;
  onTooltipChange: (visible: boolean) => void;
  onStartAnalysis?: (requestDelay: number) => void;
}

export function SidebarAnalysisControls({
  network,
  analysisProgress,
  requestDelay,
  sliderValue,
  showTooltip,
  onSliderChange,
  onTooltipChange,
  onStartAnalysis,
}: SidebarAnalysisControlsProps) {
  const citationsToAnalyze = network.citations.length;
  const actualRPM = calculateActualRPM(requestDelay);
  const theoreticalMaxRPM = calculateTheoreticalMaxRPM(requestDelay);
  const { estimatedTimeMinutes, estimatedTimeSecondsRemainder } = estimateAnalysisTime(
    citationsToAnalyze,
    requestDelay
  );
  const isAnalysisInProgress = analysisProgress?.status === 'analyzing';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <h2 className="text-neutral-900 dark:text-white text-sm font-medium leading-normal">
            AI 分類（自動化）
          </h2>
        </div>
        <p className="text-xs text-neutral-500 dark:text-[#9d9db9]">
          リクエスト間隔を選択し、AIによる引用文脈の分析を開始します
        </p>
        <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded text-xs text-amber-800 dark:text-amber-300">
          <p className="font-semibold mb-1">注意:</p>
          <p>
            LLM APIの処理には通常1リクエストあたり1〜3秒かかります。リクエスト間の待機時間はAPI処理時間に比べて短いため、全体的な速度の違いはすぐには実感できない場合があります。
          </p>
        </div>
      </div>

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
            <span className="text-neutral-300 dark:text-neutral-300 font-bold">
              {actualRPM.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-neutral-400 dark:text-[#9d9db9]">
              (理論上の最大値: {theoreticalMaxRPM.toLocaleString()})
            </span>
            <span className="text-neutral-400 dark:text-[#9d9db9]">
              API: ~{AVERAGE_API_PROCESSING_TIME_MS / 1000}s
            </span>
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

      <div className="flex flex-col gap-3">
        <label className="text-xs text-neutral-500 dark:text-[#9d9db9] uppercase tracking-wider font-bold">
          リクエスト間隔 (Request Rate)
        </label>
        <div
          className="relative"
          onMouseEnter={() => onTooltipChange(true)}
          onMouseLeave={() => onTooltipChange(false)}
        >
          <div className="relative h-2 bg-neutral-200 dark:bg-[#3b3b54] rounded-full">
            <div className="absolute inset-0 flex justify-between items-center px-1">
              {DELAY_PRESETS.map((_, index) => (
                <div
                  key={index}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    index <= sliderValue ? 'bg-neutral-700' : 'bg-neutral-300 dark:bg-neutral-600'
                  }`}
                />
              ))}
            </div>

            <div
              className="absolute top-0 left-0 h-2 bg-neutral-700 rounded-full transition-all duration-200"
              style={{ width: `${(sliderValue / (DELAY_PRESETS.length - 1)) * 100}%` }}
            />

            <input
              type="range"
              min="0"
              max={DELAY_PRESETS.length - 1}
              step="1"
              value={sliderValue}
              onChange={(event) => {
                onSliderChange(Number(event.target.value));
                onTooltipChange(true);
              }}
              className="absolute inset-0 w-full h-2 opacity-0 cursor-pointer z-10"
            />

            <div
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white dark:bg-neutral-700 border-2 border-neutral-500 rounded-full shadow-lg transition-all duration-200 cursor-pointer z-20"
              style={{ left: `calc(${(sliderValue / (DELAY_PRESETS.length - 1)) * 100}% - 8px)` }}
            />
          </div>

          <div className="flex justify-between mt-2 text-xs text-neutral-500 dark:text-[#9d9db9]">
            {DELAY_PRESETS.map((preset, index) => (
              <span
                key={index}
                className={`transition-colors ${index === sliderValue ? 'text-neutral-300 font-semibold' : ''}`}
              >
                {preset.label}
              </span>
            ))}
          </div>

          {showTooltip && (
            <div
              className="absolute z-50 px-3 py-2 bg-neutral-900 dark:bg-neutral-800 text-white text-xs rounded-lg shadow-xl border border-neutral-700 pointer-events-none whitespace-nowrap"
              style={{
                left: `${(sliderValue / (DELAY_PRESETS.length - 1)) * 100}%`,
                bottom: '100%',
                transform: 'translateX(-50%)',
                marginBottom: '8px',
              }}
            >
              <div className="flex flex-col gap-1">
                <div className="font-semibold text-neutral-300">{DELAY_PRESETS[sliderValue].label}</div>
                <div className="text-neutral-300">Rate: {getDelayFromSlider(sliderValue)}ms</div>
                <div className="text-neutral-300">
                  RPM: ~{calculateActualRPM(getDelayFromSlider(sliderValue)).toLocaleString()}
                </div>
              </div>
              <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900 dark:border-t-slate-800" />
            </div>
          )}
        </div>
      </div>

      <button
        onClick={() => onStartAnalysis?.(requestDelay)}
        disabled={citationsToAnalyze === 0 || isAnalysisInProgress}
        className="w-full px-4 py-3 bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 disabled:bg-neutral-800 disabled:border-neutral-700 disabled:text-neutral-500 disabled:cursor-not-allowed text-neutral-200 font-medium rounded-xl transition-all duration-200 shadow-md shadow-black/40 flex items-center justify-center gap-2"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
        <span>AI分類を開始する</span>
      </button>
    </div>
  );
}

