/*
 * 【ファイル概要】
 * スライドインパネル
 * 詳細情報を表示する際、画面の端からスッと出てくるパネルの枠組みです。
 */

'use client';

import { ReactNode } from 'react';
import CloseButton from './CloseButton';

interface DetailPanelProps {
  children: ReactNode;
  onClose: () => void;
  header?: ReactNode;
  className?: string;
}

export default function DetailPanel({
  children,
  onClose,
  header,
  className = '',
}: DetailPanelProps) {
  return (
    <div
      className={`absolute right-0 top-0 h-full w-96 bg-slate-900/95 backdrop-blur-md
                  border-l border-slate-700/50 shadow-2xl overflow-y-auto z-50 ${className}`}
    >
      {/* ヘッダー */}
      <div className="sticky top-0 bg-slate-900/95 backdrop-blur-md border-b border-slate-700/50 p-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">{header}</div>
          <CloseButton onClick={onClose} />
        </div>
      </div>

      {/* コンテンツ */}
      <div className="p-4 space-y-4">{children}</div>
    </div>
  );
}

