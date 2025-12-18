// Firestore キャッシュシステム
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { getFirestoreDb, COLLECTIONS, isFirebaseConfigured } from './firebase';
import { CachedCitationContext, CitationContextType } from '@/types/paper';

// キャッシュキーを生成
function generateCacheKey(sourceId: string, targetId: string): string {
  // OpenAlex IDから短縮形を作成
  const shortSourceId = sourceId.replace('https://openalex.org/', '');
  const shortTargetId = targetId.replace('https://openalex.org/', '');
  return `${shortSourceId}->${shortTargetId}`;
}

// 引用文脈をキャッシュから取得
export async function getCachedCitationContext(
  sourceId: string,
  targetId: string
): Promise<CachedCitationContext | null> {
  if (!isFirebaseConfigured()) {
    return null;
  }

  const db = getFirestoreDb();
  if (!db) return null;

  try {
    const cacheKey = generateCacheKey(sourceId, targetId);
    const docRef = doc(db, COLLECTIONS.CITATION_CONTEXTS, cacheKey);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        sourceId: data.sourceId,
        targetId: data.targetId,
        sourcePaperTitle: data.sourcePaperTitle,
        targetPaperTitle: data.targetPaperTitle,
        contextType: data.contextType as CitationContextType,
        contextSnippet: data.contextSnippet,
        confidence: data.confidence,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
        llmModel: data.llmModel,
      };
    }

    return null;
  } catch (error) {
    console.error('Error getting cached citation context:', error);
    return null;
  }
}

// 複数の引用文脈をキャッシュから一括取得
export async function getBatchCachedCitationContexts(
  citationPairs: { sourceId: string; targetId: string }[]
): Promise<Map<string, CachedCitationContext>> {
  if (!isFirebaseConfigured()) {
    return new Map();
  }

  const db = getFirestoreDb();
  if (!db) return new Map();

  const result = new Map<string, CachedCitationContext>();

  try {
    // Firestoreのin句は最大10件までなので、バッチに分割
    const batchSize = 10;
    for (let i = 0; i < citationPairs.length; i += batchSize) {
      const batch = citationPairs.slice(i, i + batchSize);
      const cacheKeys = batch.map((p) => generateCacheKey(p.sourceId, p.targetId));

      const q = query(
        collection(db, COLLECTIONS.CITATION_CONTEXTS),
        where('__name__', 'in', cacheKeys)
      );

      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const cached: CachedCitationContext = {
          id: docSnap.id,
          sourceId: data.sourceId,
          targetId: data.targetId,
          sourcePaperTitle: data.sourcePaperTitle,
          targetPaperTitle: data.targetPaperTitle,
          contextType: data.contextType as CitationContextType,
          contextSnippet: data.contextSnippet,
          confidence: data.confidence,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
          llmModel: data.llmModel,
        };
        result.set(docSnap.id, cached);
      });
    }

    return result;
  } catch (error) {
    console.error('Error getting batch cached citation contexts:', error);
    return new Map();
  }
}

// 引用文脈をキャッシュに保存
export async function saveCitationContextToCache(
  context: Omit<CachedCitationContext, 'id' | 'createdAt' | 'updatedAt'>
): Promise<boolean> {
  if (!isFirebaseConfigured()) {
    return false;
  }

  const db = getFirestoreDb();
  if (!db) return false;

  try {
    const cacheKey = generateCacheKey(context.sourceId, context.targetId);
    const docRef = doc(db, COLLECTIONS.CITATION_CONTEXTS, cacheKey);

    await setDoc(docRef, {
      ...context,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return true;
  } catch (error) {
    console.error('Error saving citation context to cache:', error);
    return false;
  }
}

// 複数の引用文脈をキャッシュに一括保存
export async function saveBatchCitationContextsToCache(
  contexts: Omit<CachedCitationContext, 'id' | 'createdAt' | 'updatedAt'>[]
): Promise<number> {
  if (!isFirebaseConfigured()) {
    return 0;
  }

  const db = getFirestoreDb();
  if (!db) return 0;

  try {
    // Firestoreのバッチ書き込みは最大500件まで
    const batchSize = 500;
    let savedCount = 0;

    for (let i = 0; i < contexts.length; i += batchSize) {
      const batchContexts = contexts.slice(i, i + batchSize);
      const batch = writeBatch(db);

      for (const context of batchContexts) {
        const cacheKey = generateCacheKey(context.sourceId, context.targetId);
        const docRef = doc(db, COLLECTIONS.CITATION_CONTEXTS, cacheKey);
        batch.set(docRef, {
          ...context,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      await batch.commit();
      savedCount += batchContexts.length;
    }

    return savedCount;
  } catch (error) {
    console.error('Error saving batch citation contexts to cache:', error);
    return 0;
  }
}

// キャッシュの統計情報を更新
export async function updateCacheStats(
  totalAnalyzed: number,
  cacheHits: number
): Promise<void> {
  if (!isFirebaseConfigured()) {
    return;
  }

  const db = getFirestoreDb();
  if (!db) return;

  try {
    const statsRef = doc(db, COLLECTIONS.ANALYSIS_STATS, 'global');
    const statsDoc = await getDoc(statsRef);

    if (statsDoc.exists()) {
      const data = statsDoc.data();
      await setDoc(statsRef, {
        totalAnalyzed: (data.totalAnalyzed || 0) + totalAnalyzed,
        totalCacheHits: (data.totalCacheHits || 0) + cacheHits,
        lastUpdated: serverTimestamp(),
      }, { merge: true });
    } else {
      await setDoc(statsRef, {
        totalAnalyzed,
        totalCacheHits: cacheHits,
        lastUpdated: serverTimestamp(),
      });
    }
  } catch (error) {
    console.error('Error updating cache stats:', error);
  }
}

