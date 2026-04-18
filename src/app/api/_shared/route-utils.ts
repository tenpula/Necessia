import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

const ANALYZE_LOGIN_REQUIRED_MESSAGE =
  'ログインが必要です。右上のボタンからGoogleアカウントでログインしてください。';

const EVENT_STREAM_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  Connection: 'keep-alive',
  'Access-Control-Allow-Origin': '*',
} as const;

export function jsonError(
  message: string,
  status: number,
  extra: Record<string, unknown> = {}
) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

export function createEventStreamResponse(stream: ReadableStream) {
  return new NextResponse(stream, {
    status: 200,
    headers: EVENT_STREAM_HEADERS,
  });
}

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

export function logRouteError(routeLabel: string, error: unknown): void {
  console.error(`[${routeLabel}] Error:`, error);
}

type AuthenticatedUserResult =
  | {
      userId: string;
    }
  | {
      response: NextResponse;
    };

export async function requireAuthenticatedUser(
  routeLabel: string
): Promise<AuthenticatedUserResult> {
  const session = await auth();

  if (!session?.user?.id) {
    console.log(`[${routeLabel}] Unauthenticated request rejected`);
    return { response: jsonError(ANALYZE_LOGIN_REQUIRED_MESSAGE, 401) };
  }

  return { userId: session.user.id };
}
