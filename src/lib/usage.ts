/*
 * 【ファイル概要】
 * 利用制限の確認・更新
 * 「ユーザーがこれまでに何回分析したか」を数えたり、制限を超えていないか判定する処理です。
 */

// =============================================================================
// 利用回数制限ロジック
// =============================================================================
//
// ■ 仕組み:
//   1. UsageLog テーブルからそのユーザーの全 analysis レコード数をカウント
//   2. 上限回数未満なら許可、上限なら拒否
//   3. 許可時に新しいレコードを挿入（カウント+1）
//
// ■ レースコンディション対策:
//   複数のリクエストが同時に来た場合、両方が「まだ上限未満」と判定して
//   上限を超えてしまう可能性がある。
//   → Prismaのインタラクティブトランザクションで「チェック+挿入」を
//     アトミック（不可分）に実行し、この問題を防止している。
// =============================================================================

import { prisma } from '@/lib/prisma';

/** アカウントごとの最大利用回数 (0なら制限なし) */
const MAX_LIMIT = parseInt(process.env.USAGE_LIMIT || '3', 10);

/**
 * ユーザーの残り利用回数を取得
 * 
 * @param userId - ユーザーID
 * @returns 残り回数（0以上）
 */
export async function getRemainingUsage(userId: string): Promise<number> {
  if (MAX_LIMIT === 0) {
    return 999;
  }

  const count = await prisma.usageLog.count({
    where: {
      userId,
      action: 'analysis',
    },
  });

  return Math.max(0, MAX_LIMIT - count);
}

/**
 * 利用回数をチェックし、許可されている場合はインクリメントする
 * 
 * ■ トランザクションの重要性:
 *   カウント確認とインサートを1つのトランザクションで実行することで、
 *   複数の同時リクエストで制限を超えてしまう問題を防止します。
 * 
 * @param userId - ユーザーID
 * @param action - アクション種別（例: "analysis"）
 * @returns { allowed: boolean, remaining: number }
 */
export async function checkAndIncrementUsage(
  userId: string,
  action: string = 'analysis'
): Promise<{ allowed: boolean; remaining: number }> {
  if (MAX_LIMIT === 0) {
    return {
      allowed: true,
      remaining: 999,
    };
  }

  // インタラクティブトランザクション:
  // 「カウント確認 → インサート」を不可分に実行
  return await prisma.$transaction(async (tx) => {
    const count = await tx.usageLog.count({
      where: {
        userId,
        action,
      },
    });

    if (count >= MAX_LIMIT) {
      return {
        allowed: false,
        remaining: 0,
      };
    }

    // 利用を記録
    await tx.usageLog.create({
      data: {
        userId,
        action,
      },
    });

    return {
      allowed: true,
      remaining: MAX_LIMIT - count - 1,
    };
  });
}

/** アカウント設定による最大回数を公開（フロントエンドの表示用） */
export const USAGE_MAX_LIMIT = MAX_LIMIT;
