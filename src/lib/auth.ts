/*
 * 【ファイル概要】
 * Auth.js（認証）の設定
 * Googleログインの有効化や、誰がログインしたかの情報をどう扱うかのルールです。
 */

// =============================================================================
// Auth.js (NextAuth.js v5) 設定
// =============================================================================
//
// ■ Auth.js とは？
//   Next.js 向けの認証ライブラリ。OAuth（Google, GitHub等）、メール認証、
//   クレデンシャル認証を簡単に実装できます。v5はApp Routerに対応。
//
// ■ 登場人物:
//   1. Provider（認証プロバイダー）: ログイン方法（今回はGoogle）
//   2. Adapter（データベースアダプター）: ユーザー情報の保存先（今回はPrisma → Neon）
//   3. Session: ログイン状態の管理（JWTベース）
//
// ■ Googleログインの流れ:
//   1. ユーザーが「Googleでログイン」をクリック
//   2. Googleの認証画面にリダイレクト
//   3. 認証成功 → Auth.jsが自動的にUserとAccountテーブルにレコードを作成
//   4. セッションが開始され、以降のリクエストでユーザーを識別可能に
//
// ■ セキュリティ:
//   - AUTH_SECRET: セッショントークンの暗号化キー。必ず環境変数で管理。
//     生成方法: `npx auth secret`
//   - GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET: Google Cloud Consoleで取得。
//     環境変数で管理し、Gitにコミットしないこと。
// =============================================================================

import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  useSecureCookies: process.env.NODE_ENV === 'production',

  // Prismaアダプター: ユーザー情報をNeon DBに自動保存
  adapter: PrismaAdapter(prisma),

  // 認証プロバイダー: Googleログイン
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: 'select_account',
        },
      },
    }),
  ],

  // セッション戦略: JWT（JSON Web Token）
  // DBセッションの代わりにJWTを使用。サーバーレス環境（Vercel等）で効率的。
  session: {
    strategy: 'jwt',
  },

  // コールバック: セッションの挙動をカスタマイズ
  callbacks: {
    // JWTにユーザーIDを含める
    // これにより、サーバーサイドでsession.user.idでユーザーを特定できる
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },

    // セッションオブジェクトにユーザーIDを含める
    // クライアントやAPI Routeで session.user.id が使えるようになる
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },

  // ログインページ等をカスタマイズする場合はここで指定
  // 今回はデフォルトのAuth.jsページを使用
  pages: {
    // signIn: '/auth/signin', // カスタムログインページ（今後の拡張用）
  },
});
