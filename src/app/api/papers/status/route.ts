// システムステータス API Route
import { NextResponse } from 'next/server';
import { isFirebaseConfigured } from '@/lib/firebase';
import { isLLMConfigured, getLLMModelName } from '@/lib/llm';

export async function GET() {
  const firebaseConfigured = isFirebaseConfigured();
  const llmConfigured = isLLMConfigured();
  
  return NextResponse.json({
    features: {
      cache: firebaseConfigured,
      llmAnalysis: llmConfigured,
    },
    config: {
      llmModel: llmConfigured ? getLLMModelName() : null,
      cacheProvider: firebaseConfigured ? 'firestore' : null,
    },
    phase: llmConfigured ? 2 : 1,
  });
}

