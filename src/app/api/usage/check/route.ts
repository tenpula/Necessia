import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getRemainingUsage, USAGE_MAX_LIMIT } from '@/lib/usage';
import { logRouteError } from '@/app/api/_shared/route-utils';

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
    logRouteError('Usage Check API', error);
    return NextResponse.json({ error: 'Failed to check usage' }, { status: 500 });
  }
}
