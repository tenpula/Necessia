/*
 * 【ファイル概要】
 * 閉じるボタン
 * パネルやダイアログの右上にある「×」ボタンの共通部品です。
 */

'use client';

interface CloseButtonProps {
  onClick: () => void;
  className?: string;
  title?: string;
}

export default function CloseButton({
  onClick,
  className = '',
  title = '閉じる',
}: CloseButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`p-1 text-slate-400 hover:bg-slate-700 hover:text-slate-200 rounded-lg transition-colors ${className}`}
      title={title}
      aria-label={title}
    >
      <svg
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
    </button>
  );
}

