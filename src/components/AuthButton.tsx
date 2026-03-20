/*
 * 【ファイル概要】
 * 認証ボタン
 * 画面右上の「ログインボタン」や「ユーザーアイコン（残り回数付き）」を表示します。
 */

// =============================================================================
// 認証ボタンコンポーネント
// =============================================================================
//
// ■ 動作:
//   - 未ログイン: 「Googleでログイン」ボタンを表示
//   - ログイン中: ユーザーのアバター画像と名前、残り回数バッジを表示
//   - アバタークリックでログアウトメニューが表示される
//
// ■ useSession() フック:
//   Auth.js が提供するフック。SessionProvider の下にある
//   すべてのコンポーネントから現在のセッション情報にアクセス可能。
//   status: 'loading' | 'authenticated' | 'unauthenticated'
// =============================================================================

'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { useState, useEffect, useRef } from 'react';

interface AuthButtonProps {
  /** 残り利用回数（外部から渡す） */
  remainingUsage?: number;
  /** 1日の最大利用回数 */
  usageLimit?: number;
}

export default function AuthButton({ remainingUsage, usageLimit = 3 }: AuthButtonProps) {
  const { data: session, status } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // メニュー外クリックで閉じる
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ローディング中
  if (status === 'loading') {
    return (
      <div className="size-10 rounded-full bg-slate-700 animate-pulse" />
    );
  }

  // 未ログイン
  if (status === 'unauthenticated') {
    return (
      <button
        onClick={() => signIn('google')}
        className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-100 
                   text-slate-800 font-medium rounded-xl transition-all duration-200 
                   shadow-md hover:shadow-lg border border-slate-200
                   text-sm whitespace-nowrap"
      >
        {/* Google アイコン */}
        <svg className="w-4 h-4" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        ログイン
      </button>
    );
  }

  // ログイン中
  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="flex items-center gap-3 group transition-all"
      >
        {/* 残り回数バッジ */}
        {remainingUsage !== undefined && (
          <div className={`text-xs font-bold px-2.5 py-1 rounded-full border transition-colors
            ${remainingUsage > 0
              ? 'bg-neutral-800 text-neutral-300 border-neutral-700'
              : 'bg-red-500/20 text-red-300 border-red-500/30'
            }`}
          >
            残り {remainingUsage}/{usageLimit}
          </div>
        )}

        {/* アバター */}
        <div className="relative">
          {session?.user?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={session.user.image}
              alt={session.user.name || 'User'}
              className="size-10 rounded-full ring-2 ring-neutral-600 group-hover:ring-neutral-500 transition-all"
            />
          ) : (
            <div className="size-10 rounded-full bg-neutral-700 
                            flex items-center justify-center text-white font-bold text-sm
                            ring-2 ring-neutral-600 group-hover:ring-neutral-500 transition-all">
              {session?.user?.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
          )}
        </div>
      </button>

      {/* ドロップダウンメニュー */}
      {menuOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-slate-900/95 backdrop-blur-xl 
                        border border-slate-700/50 rounded-xl shadow-2xl shadow-black/50 
                        overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* ユーザー情報 */}
          <div className="px-4 py-3 border-b border-slate-700/50">
            <p className="text-sm font-medium text-white truncate">
              {session?.user?.name}
            </p>
            <p className="text-xs text-slate-400 truncate">
              {session?.user?.email}
            </p>
          </div>

          {/* ログアウト */}
          <button
            onClick={() => signOut()}
            className="w-full px-4 py-3 text-sm text-slate-300 hover:text-white 
                       hover:bg-slate-800/50 transition-colors text-left
                       flex items-center gap-2"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            ログアウト
          </button>
        </div>
      )}
    </div>
  );
}
