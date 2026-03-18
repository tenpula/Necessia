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
    <div className="bg-slate-900/90 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-cyan-400 font-semibold text-sm">引用文脈を分析中...</h3>
        <span className="text-xs text-slate-400">
          {progress.analyzed}/{progress.total}
        </span>
      </div>

      {/* プログレスバー */}
      <div className="w-full bg-slate-700/50 rounded-full h-2 mb-2">
        <div
          className="h-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* ステータス */}
      <div className="flex items-center justify-between text-xs">
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
          <LoadingSpinner size="sm" className="text-cyan-400" />
          <span className="text-slate-400">
            {currentPaper ? `分析中: ${currentPaper.substring(0, 30)}...` : '処理中...'}
          </span>
        </>
      );
    case 'completed':
      return (
        <>
          <svg className="w-3 h-3 text-green-400" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
          </svg>
          <span className="text-green-400">分析完了</span>
        </>
      );
    case 'error':
      return (
        <>
          <svg className="w-3 h-3 text-red-400" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
          </svg>
          <span className="text-red-400">分析エラー</span>
        </>
      );
    default:
      return null;
  }
}
