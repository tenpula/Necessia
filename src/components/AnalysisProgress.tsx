/*
 * 【ファイル概要】
 * プログレスバー機能
 * AIによる分析が全件中どこまで進んでいるかを表示する、進捗バーの部品です。
 */

'use client';

import { AnalysisProgress as AnalysisProgressType } from '@/types/paper';
import { LoadingSpinner } from './ui';

interface AnalysisProgressProps {
  progress: AnalysisProgressType;
}

export default function AnalysisProgress({ progress }: AnalysisProgressProps) {
  const percentage =
    progress.total > 0 ? Math.round((progress.analyzed / progress.total) * 100) : 0;

  return (
    <div className="bg-neutral-900 border border-neutral-700 rounded-3xl p-5 shadow-lg shadow-black/50">
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="text-neutral-200 font-medium text-sm">分析ネットワークを構築中...</h3>
        <span className="text-xs text-neutral-400 font-mono">
          {progress.analyzed} / {progress.total}
        </span>
      </div>

      {/* プログレスバー */}
      <div className="w-full bg-neutral-800 rounded-full h-1.5 mb-3 overflow-hidden">
        <div
          className="h-full rounded-full bg-neutral-300 transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* ステータス */}
      <div className="flex items-center justify-between text-xs px-1">
        <div className="flex items-center gap-2">
          <StatusIndicator status={progress.status} currentPaper={progress.currentPaper} />
        </div>
      </div>
    </div>
  );
}

// ステータスインジケーター
interface StatusIndicatorProps {
  status: AnalysisProgressType['status'];
  currentPaper?: string;
}

function StatusIndicator({ status, currentPaper }: StatusIndicatorProps) {
  switch (status) {
    case 'analyzing':
      return (
        <>
          <LoadingSpinner size="sm" className="text-neutral-400" />
          <span className="text-neutral-400">
            {currentPaper ? `分析中: ${currentPaper.substring(0, 30)}...` : '処理中...'}
          </span>
        </>
      );
    case 'completed':
      return (
        <>
          <svg className="w-3 h-3 text-neutral-400" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
          </svg>
          <span className="text-neutral-300">分析完了</span>
        </>
      );
    case 'error':
      return (
        <>
          <svg className="w-3 h-3 text-red-500" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
          </svg>
          <span className="text-red-500">分析エラー</span>
        </>
      );
    default:
      return null;
  }
}
