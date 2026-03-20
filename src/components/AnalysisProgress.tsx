/*
 * 【ファイル概要】
 * プログレスバー機能
 * AIによる分析が全件中どこまで進んでいるかを表示する、進捗バーの部品です。
 * リアルタイムで進捗を表示し、スムーズなアニメーション付きプログレスバーを表示します。
 */

'use client';

import { AnalysisProgress as AnalysisProgressType } from '@/types/paper';
import { LoadingSpinner } from './ui';
import { useEffect, useState } from 'react';

interface AnalysisProgressProps {
  progress: AnalysisProgressType;
}

export default function AnalysisProgress({ progress }: AnalysisProgressProps) {
  const percentage =
    progress.total > 0 ? Math.round((progress.analyzed / progress.total) * 100) : 0;
  
  // アニメーション効果用に前フレームの値を保持
  const [displayPercentage, setDisplayPercentage] = useState(0);
  
  useEffect(() => {
    // 進捗が変わったときにスムーズにアニメーションさせるため、
    // 少し遅延させて displayPercentage を更新
    const timer = setTimeout(() => {
      setDisplayPercentage(percentage);
    }, 16); // ~60fps
    
    return () => clearTimeout(timer);
  }, [percentage]);

  const isCompleting = progress.status === 'completed';
  const isError = progress.status === 'error';

  return (
    <div className={`bg-neutral-900 border rounded-3xl p-5 shadow-lg shadow-black/50 transition-all duration-300 ${
      isError ? 'border-red-500/50' : 'border-neutral-700'
    }`}>
      {/* ヘッダー部分 */}
      <div className="flex items-center justify-between mb-4 px-1">
        <h3 className={`font-medium text-sm transition-colors duration-300 ${
          isError ? 'text-red-400' : 'text-neutral-200'
        }`}>
          分析ネットワークを構築中...
        </h3>
        <span className="text-xs text-neutral-400 font-mono">
          {progress.analyzed} / {progress.total}
        </span>
      </div>

      {/* プログレスバー */}
      <div className="w-full bg-neutral-800 rounded-full h-2 mb-4 overflow-hidden shadow-inner">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${
            isError ? 'bg-red-500' : 'bg-gradient-to-r from-blue-400 to-cyan-400'
          }`}
          style={{ width: `${displayPercentage}%` }}
        />
      </div>

      {/* 詳細情報パネル */}
      <div className="flex items-start justify-between gap-3 px-1 mb-2">
        <div className="flex items-center gap-2 flex-1">
          <StatusIndicator status={progress.status} currentPaper={progress.currentPaper} />
        </div>
        <div className="text-right">
          <div className="text-xs text-neutral-300 font-semibold">
            進捗: {displayPercentage}%
          </div>
          {progress.status === 'analyzing' && progress.total > 0 && (
            <div className="text-xs text-neutral-500 mt-1">
              {progress.total - progress.analyzed} 件残り
            </div>
          )}
        </div>
      </div>

      {/* エラーメッセージ表示 */}
      {isError && progress.errorMessage && (
        <div className="mt-3 p-2 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-xs text-red-400">
            {progress.errorMessage}
          </p>
        </div>
      )}

      {/* 完了メッセージ */}
      {isCompleting && (
        <div className="mt-3 p-2 bg-green-500/10 border border-green-500/30 rounded-lg">
          <p className="text-xs text-green-400 flex items-center gap-2">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
            </svg>
            分析完了しました。結果がネットワークを更新しました。
          </p>
        </div>
      )}
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
        <div className="flex items-center gap-2 min-w-0">
          <LoadingSpinner size="sm" className="text-blue-400 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            {currentPaper ? (
              <p className="text-xs text-neutral-400 line-clamp-1 w-full">
                <span className="text-neutral-500">分析中:</span> {currentPaper}
              </p>
            ) : (
              <span className="text-xs text-neutral-400">処理中...</span>
            )}
          </div>
        </div>
      );
    case 'completed':
      return (
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-green-400 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
          </svg>
          <span className="text-xs text-green-400 font-medium">分析完了</span>
        </div>
      );
    case 'error':
      return (
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-red-500 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
          </svg>
          <span className="text-xs text-red-500 font-medium">分析エラー</span>
        </div>
      );
    default:
      return null;
  }
}
