/*
 * 【ファイル概要】
 * 利用回数確認API
 * 現在のログインユーザーが、あと何回無料で分析できるかを確認します。
 */

// =============================================================================
// 利用回数チェック API
// =============================================================================
//
// ■ エンドポイント: GET /api/usage/check
// ■ 目的: フロントエンドが現在の残り利用回数を取得するため
// ■ レスポンス例:
//   { "remaining": 2, "limit": 3, "authenticated": true }
//   { "authenticated": false }  ← 未ログインの場合
// =============================================================================

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getRemainingUsage, USAGE_MAX_LIMIT } from '@/lib/usage';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({
        authenticated: false,
        remaining: 0,
        limit: USAGE_MAX_LIMIT,
      });
    }

    const remaining = await getRemainingUsage(session.user.id);

    return NextResponse.json({
      authenticated: true,
      remaining,
      limit: USAGE_MAX_LIMIT,
    });
  } catch (error) {
    console.error('[Usage Check API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to check usage' },
      { status: 500 }
    );
  }
}
