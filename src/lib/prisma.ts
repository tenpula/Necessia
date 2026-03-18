/*
 * 【ファイル概要】
 * Prisma（データベース）設定
 * Neonデータベースと通信し、情報を読み書きするための接続準備をするファイルです。
 */

// =============================================================================
// Prisma Client シングルトン
// =============================================================================
// 
// ■ なぜシングルトンが必要か？
//   Next.js の開発モード（next dev）では、ファイルを変更するたびに
//   ホットリロードが発生し、モジュールが再読み込みされます。
//   毎回 new PrismaClient() すると、DB接続が無限に増殖し、
//   接続プール（Neonの場合、デフォルト100接続）を使い果たしてしまいます。
//
// ■ 解決策:
//   globalThis（Node.jsのグローバルオブジェクト）にPrismaインスタンスを
//   保存し、ホットリロード時にも同じインスタンスを再利用します。
//
// ■ セキュリティ注意:
//   このファイルはサーバーサイドでのみ使用されます。
//   DATABASE_URL は .env.local に保存し、Gitにコミットしないこと。
// =============================================================================

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // 開発時のみクエリログを出力（デバッグ用）
    log: process.env.NODE_ENV === 'development' ? ['query'] : [],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
