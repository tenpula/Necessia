import { NextRequest, NextResponse } from 'next/server';
import {
  analyzeCitationBatch,
  createSSEMessage,
  parseAnalyzeRequest,
} from '@/lib/citation-analysis';
import { checkAndIncrementUsage } from '@/lib/usage';
import {
  createEventStreamResponse,
  isAbortError,
  jsonError,
  requireAuthenticatedUser,
} from '@/app/api/_shared/route-utils';

const ROUTE_LABEL = 'Analyze API';
const VALIDATION_ERRORS = new Set([
  'Request body is required',
  'Citations array is required',
]);

export async function POST(request: NextRequest) {
  try {
    console.log(`[${ROUTE_LABEL}] POST request received`);

    const authenticatedUser = await requireAuthenticatedUser(ROUTE_LABEL);
    if ('response' in authenticatedUser) {
      return authenticatedUser.response;
    }
    const { userId } = authenticatedUser;

    const usage = await checkAndIncrementUsage(userId, 'analysis');
    if (!usage.allowed) {
      console.log(`[${ROUTE_LABEL}] Usage limit reached for user ${userId}`);
      return jsonError(
        '無料体験枠を使い切りました。継続して利用したい場合は、オープンソース版をご自身の環境で構築してください。',
        429,
        {
          usageLimitReached: true,
          remaining: 0,
        }
      );
    }

    console.log(`[${ROUTE_LABEL}] Usage allowed for user ${userId}, remaining: ${usage.remaining}`);

    if (request.signal.aborted) {
      console.log(`[${ROUTE_LABEL}] Request was aborted before processing`);
      return jsonError('Request was cancelled', 499);
    }

    const { citations, requestDelay } = parseAnalyzeRequest(await request.json());

    console.log(`[${ROUTE_LABEL}] Processing ${citations.length} citations with requestDelay=${requestDelay}ms`);

    const encoder = new TextEncoder();
    let clientClosed = false;

    request.signal.addEventListener('abort', () => {
      clientClosed = true;
    });

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const { results, stats } = await analyzeCitationBatch({
            citations,
            requestDelay,
            signal: request.signal,
            shouldStop: () => clientClosed,
            onProgress: (event) => {
              controller.enqueue(encoder.encode(createSSEMessage(event)));
            },
          });

          if (clientClosed || request.signal.aborted) {
            controller.close();
            return;
          }

          controller.enqueue(
            encoder.encode(
              createSSEMessage({
                type: 'complete',
                results,
                stats,
              })
            )
          );
          controller.close();
        } catch (error) {
          if (isAbortError(error)) {
            controller.close();
            return;
          }

          console.error(`[${ROUTE_LABEL}] Stream error:`, error);
          controller.enqueue(
            encoder.encode(
              createSSEMessage({
                type: 'error',
                error: 'Failed to analyze citations',
                message: error instanceof Error ? error.message : 'Unknown error',
              })
            )
          );
          controller.close();
        }
      },
    });

    return createEventStreamResponse(stream);
  } catch (error) {
    const isValidationError = error instanceof Error && VALIDATION_ERRORS.has(error.message);
    const status = isValidationError ? 400 : 500;

    console.error(`${ROUTE_LABEL} error:`, error);
    return jsonError(
      status === 400 && error instanceof Error ? error.message : 'Failed to analyze citations',
      status
    );
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const sourceId = searchParams.get('sourceId');
  const targetId = searchParams.get('targetId');

  if (!sourceId || !targetId) {
    return NextResponse.json(
      { error: 'sourceId and targetId are required' },
      { status: 400 }
    );
  }

  return NextResponse.json({
    contextType: 'background',
    confidence: 0.5,
    cached: false,
    message: 'Use POST with paper data to analyze.',
  });
}
