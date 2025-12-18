// Firebase 設定と初期化
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';

// Firebase設定（環境変数から取得）
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Firebaseが設定されているかどうかをチェック
export function isFirebaseConfigured(): boolean {
  // 一時的にFirebaseを無効化してデバッグ
  // TODO: Firebaseを使用する場合は以下のコメントを外す
  console.log('Firebase temporarily disabled for debugging');
  return false;
  
  /*
  // すべての必要な環境変数が設定されているかチェック
  const hasAllConfig = !!(
    firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.apiKey !== 'undefined' &&
    firebaseConfig.projectId !== 'undefined' &&
    // 空文字列やプレースホルダーもチェック
    firebaseConfig.apiKey.length > 10 &&
    firebaseConfig.projectId.length > 3 &&
    !firebaseConfig.apiKey.startsWith('your-') &&
    !firebaseConfig.projectId.startsWith('your-')
  );
  
  if (!hasAllConfig) {
    return false;
  }
  
  // 追加のチェック: authDomainも必要
  if (!firebaseConfig.authDomain || firebaseConfig.authDomain === 'undefined') {
    console.warn('Firebase: authDomain is not configured');
    return false;
  }
  
  return true;
  */
}

// Firebaseアプリの初期化（シングルトン）
let app: FirebaseApp | null = null;
let db: Firestore | null = null;

export function getFirebaseApp(): FirebaseApp | null {
  if (!isFirebaseConfigured()) {
    console.warn('Firebase is not configured. Caching will be disabled.');
    return null;
  }

  if (!app) {
    const apps = getApps();
    if (apps.length > 0) {
      app = apps[0];
    } else {
      app = initializeApp(firebaseConfig);
    }
  }

  return app;
}

export function getFirestoreDb(): Firestore | null {
  if (!isFirebaseConfigured()) {
    return null;
  }

  if (!db) {
    const firebaseApp = getFirebaseApp();
    if (firebaseApp) {
      db = getFirestore(firebaseApp);
    }
  }

  return db;
}

// コレクション名
export const COLLECTIONS = {
  CITATION_CONTEXTS: 'citation_contexts',
  PAPER_CACHE: 'paper_cache',
  ANALYSIS_STATS: 'analysis_stats',
} as const;

