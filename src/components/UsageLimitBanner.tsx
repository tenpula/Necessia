/*
 * 【ファイル概要】
 * 利用制限バナー
 * 無料の分析回数を使い切った時に表示される、お知らせのダイアログです。
 */

// =============================================================================
// 利用制限バナーコンポーネント
// =============================================================================
//
// ■ 表示条件:
//   ユーザーが設定された回数の無料分析枠を使い切った場合に表示される。
//
// ■ 表示内容:
//   - 「無料体験枠を使い切りました」メッセージ
//   - オープンソース版の案内とGitHubリポジトリへのリンク
//   - 閉じるボタン
// =============================================================================

'use client';

import { useState } from 'react';

interface UsageLimitBannerProps {
  /** バナーを閉じた時のコールバック */
  onClose?: () => void;
  /** GitHubリポジトリURL */
  githubUrl?: string;
}

export default function UsageLimitBanner({ 
  onClose, 
  githubUrl = 'https://github.com/tenpula/Necessia' 
}: UsageLimitBannerProps) {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  const handleClose = () => {
    setIsVisible(false);
    onClose?.();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm
                    animate-in fade-in duration-300">
      <div className="relative w-full max-w-lg mx-4 bg-slate-900/95 border border-amber-500/30 
                      rounded-2xl shadow-2xl shadow-amber-900/20 overflow-hidden
                      animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        {/* ヘッダー装飾 */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500" />

        {/* 閉じるボタン */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="px-8 py-8">
          {/* アイコン */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center
                            border-2 border-amber-500/30">
              <svg className="w-8 h-8 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
          </div>

          {/* メッセージ */}
          <h3 className="text-xl font-bold text-white text-center mb-3">
            無料体験枠を使い切りました
          </h3>
          <p className="text-slate-400 text-center text-sm leading-relaxed mb-6">
            ご利用ありがとうございます。無料体験分の分析回数をすべて使い切りました。
          </p>

          {/* オープンソース案内 */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 mb-6">
            <p className="text-slate-300 text-sm leading-relaxed">
              💡 <span className="font-semibold text-white">無制限で使いたい方へ：</span><br />
              Necessiaはオープンソースです。ご自身の環境で構築すれば、制限なくご利用いただけます。
            </p>
          </div>

          {/* アクションボタン */}
          <div className="flex flex-col gap-3">
            <a
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-6 py-3 
                         bg-white hover:bg-slate-100 text-slate-900 font-semibold 
                         rounded-xl transition-all duration-200 shadow-lg
                         hover:shadow-xl transform hover:scale-[1.02]"
            >
              {/* GitHub アイコン */}
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              GitHubでソースコードを見る
            </a>
            <button
              onClick={handleClose}
              className="px-6 py-3 text-slate-400 hover:text-white font-medium 
                         rounded-xl transition-colors text-sm"
            >
              閉じる
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
