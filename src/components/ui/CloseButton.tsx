/*
 * 【ファイル概要】
 * 閉じるボタン
 * パネルやダイアログの右上にある「×」ボタンの共通部品です。
 */

'use client';

interface CloseButtonProps {
  onClick: () => void;
  className?: string;
}

export default function CloseButton({ onClick, className = '' }: CloseButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`p-1 hover:bg-slate-700 rounded-lg transition-colors ${className}`}
    >
      <svg
        className="w-5 h-5 text-slate-400"
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

