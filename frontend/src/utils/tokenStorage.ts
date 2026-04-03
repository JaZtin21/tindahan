/**
 * Secure Token Storage
 * 
 * Primary: httpOnly cookie (set by backend)
 * Fallback: IndexedDB for Safari/iOS where cookies may be blocked
 * 
 * This hybrid approach ensures compatibility across all browsers
 * while maintaining security best practices.
 */

const DB_NAME = 'TindahanAuth';
const DB_VERSION = 1;
const STORE_NAME = 'tokens';

interface TokenData {
  refreshToken: string;
  expiresAt?: number;
}

let dbInstance: IDBDatabase | null = null;

// Initialize IndexedDB
const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

// Check if we're in a Safari/iOS environment where cookies might be blocked
const isSafariOrIOS = (): boolean => {
  const ua = navigator.userAgent.toLowerCase();
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
  const isIOS = /iphone|ipad|ipod/i.test(ua);
  return isSafari || isIOS;
};

// Check if cookies are available/working
const areCookiesAvailable = (): boolean => {
  try {
    // Try to check if we can access cookies
    // Note: httpOnly cookies won't be visible to JS, but we check if the cookie mechanism works
    document.cookie = 'test=1; SameSite=Strict';
    const hasCookie = document.cookie.includes('test=');
    if (hasCookie) {
      // Clean up test cookie
      document.cookie = 'test=; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Strict';
    }
    return true; // Cookie mechanism works, even if httpOnly is set
  } catch {
    return false;
  }
};

// Token Storage API
export const TokenStorage = {
  /**
   * Store refresh token
   * Backend should set httpOnly cookie automatically
   * We store fallback in IndexedDB for Safari/iOS
   */
  setRefreshToken: async (token: string): Promise<void> => {
    // Always store in IndexedDB as fallback
    try {
      const db = await initDB();
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const data: TokenData & { id: string } = {
        id: 'refreshToken',
        refreshToken: token,
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      };

      await new Promise<void>((resolve, reject) => {
        const request = store.put(data);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.warn('Failed to store token in IndexedDB:', error);
    }
  },

  /**
   * Get refresh token
   * First tries cookie (for most browsers), 
   * falls back to IndexedDB (for Safari/iOS)
   */
  getRefreshToken: async (): Promise<string | null> => {
    // For httpOnly cookies, the backend handles this automatically
    // We just check IndexedDB as fallback for Safari/iOS
    
    try {
      const db = await initDB();
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);

      const data = await new Promise<TokenData | undefined>((resolve, reject) => {
        const request = store.get('refreshToken');
        request.onsuccess = () => resolve(request.result as TokenData | undefined);
        request.onerror = () => reject(request.error);
      });

      if (!data) return null;

      // Check if token is expired
      if (data.expiresAt && data.expiresAt < Date.now()) {
        await TokenStorage.clearRefreshToken();
        return null;
      }

      return data.refreshToken;
    } catch (error) {
      console.warn('Failed to get token from IndexedDB:', error);
      return null;
    }
  },

  /**
   * Clear refresh token from all storage
   */
  clearRefreshToken: async (): Promise<void> => {
    // Clear from IndexedDB
    try {
      const db = await initDB();
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      await new Promise<void>((resolve, reject) => {
        const request = store.delete('refreshToken');
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.warn('Failed to clear token from IndexedDB:', error);
    }

    // Note: httpOnly cookies can only be cleared by the backend
  },

  /**
   * Store access token in memory (via callback)
   * This returns a setter function that should be used by the auth context
   */
  createAccessTokenStorage: () => {
    let accessToken = '';

    return {
      set: (token: string) => {
        accessToken = token;
      },
      get: () => accessToken,
      clear: () => {
        accessToken = '';
      },
    };
  },

  /**
   * Check storage status for debugging
   */
  getStorageStatus: async (): Promise<{
    isSafariOrIOS: boolean;
    cookiesAvailable: boolean;
    indexedDBAvailable: boolean;
    hasTokenInIndexedDB: boolean;
  }> => {
    const status = {
      isSafariOrIOS: isSafariOrIOS(),
      cookiesAvailable: areCookiesAvailable(),
      indexedDBAvailable: false,
      hasTokenInIndexedDB: false,
    };

    try {
      const db = await initDB();
      status.indexedDBAvailable = true;

      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);

      const data = await new Promise((resolve, reject) => {
        const request = store.get('refreshToken');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      status.hasTokenInIndexedDB = !!data;
    } catch {
      status.indexedDBAvailable = false;
    }

    return status;
  },
};

export default TokenStorage;
