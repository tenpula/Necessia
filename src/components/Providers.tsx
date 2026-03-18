/*
 * 【ファイル概要】
 * 情報提供用プロバイダー
 * 「今誰がログインしているか」などの情報を、アプリ全体に配るための裏方コンポーネントです。
 */

// =============================================================================
// SessionProvider ラッパーコンポーネント
// =============================================================================
//
// ■ なぜこのファイルが必要か？
//   Next.js App Router の layout.tsx は Server Component です。
//   しかし、Auth.js の SessionProvider は Client Component です。
//   Server Component 内に Client Component を直接配置するには、
//   'use client' を付けた別ファイルでラップする必要があります。
//
// ■ SessionProvider の役割:
//   React Context を使って、子コンポーネントすべてに
//   ログインセッション情報を提供します。
//   useSession() フックで任意の場所からセッションにアクセス可能。
// =============================================================================

'use client';

import { SessionProvider } from 'next-auth/react';

export default function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
