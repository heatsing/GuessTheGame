/**
 * Storage adapter abstraction.
 *
 * Wraps `window.localStorage` behind a small synchronous interface so the
 * rest of the storage module never touches the DOM directly. This makes the
 * read/write path SSR-safe (Next.js App Router build-time rendering must not
 * touch localStorage) and testable (tests inject a memory or fault-injecting
 * adapter via `__setAdapterForTesting`).
 *
 * Two concrete implementations:
 *  - `createLocalStorageAdapter()` — wraps `window.localStorage`; falls back
 *    to "unavailable" on SSR, on any thrown error, and on Safari private mode
 *    (where `setItem` doesn't throw but `getItem` returns null).
 *  - `createMemoryAdapter()` — `Map<string,string>` backed; always available.
 *    Used as the automatic fallback when localStorage is unavailable so the
 *    app remains functional in-memory for the session.
 */

/** Synchronous key/value storage interface mirroring the localStorage shape. */
export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  isAvailable(): boolean;
}

const PROBE_KEY = "__gtg_storage_probe__";
const PROBE_VALUE = "1";

/**
 * Wraps `window.localStorage` with SSR + fault tolerance.
 *
 * `isAvailable()` performs a real round-trip probe (set, read-back, remove,
 * read-back) inside a try/catch. The read-back after `setItem` catches
 * Safari private mode, where `setItem` silently no-ops and `getItem` returns
 * null without throwing.
 *
 * `setItem` propagates `QuotaExceededError` and similar exceptions to the
 * caller — `client.ts:saveState` is responsible for catching and reporting
 * quota failures. On SSR, all mutators are no-ops and reads return null.
 */
export function createLocalStorageAdapter(): StorageAdapter {
  return {
    getItem(key: string): string | null {
      if (typeof window === "undefined") return null;
      try {
        return window.localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    setItem(key: string, value: string): void {
      if (typeof window === "undefined") return;
      // Intentionally not catching: callers (saveState) need to see
      // QuotaExceededError to report { ok: false, error: "quota" }.
      window.localStorage.setItem(key, value);
    },
    removeItem(key: string): void {
      if (typeof window === "undefined") return;
      try {
        window.localStorage.removeItem(key);
      } catch {
        // Swallow: remove is best-effort and must never throw to callers.
      }
    },
    isAvailable(): boolean {
      if (typeof window === "undefined") return false;
      try {
        window.localStorage.setItem(PROBE_KEY, PROBE_VALUE);
        // Safari private mode: setItem didn't throw but getItem returns null.
        if (window.localStorage.getItem(PROBE_KEY) !== PROBE_VALUE) {
          return false;
        }
        window.localStorage.removeItem(PROBE_KEY);
        // Confirm the remove actually took effect.
        if (window.localStorage.getItem(PROBE_KEY) !== null) {
          return false;
        }
        return true;
      } catch {
        return false;
      }
    },
  };
}

/**
 * In-memory `Map`-backed adapter. Always available. Used as the automatic
 * fallback when localStorage is unavailable, and as the default adapter in
 * unit tests.
 */
export function createMemoryAdapter(): StorageAdapter {
  const store = new Map<string, string>();
  return {
    getItem(key: string): string | null {
      return store.get(key) ?? null;
    },
    setItem(key: string, value: string): void {
      store.set(key, value);
    },
    removeItem(key: string): void {
      store.delete(key);
    },
    isAvailable(): boolean {
      return true;
    },
  };
}

// --- Default adapter singleton -------------------------------------------

let cachedAdapter: StorageAdapter | null = null;

/**
 * Returns the default adapter, choosing localStorage when genuinely
 * available and falling back to a memory adapter otherwise. The chosen
 * adapter is cached for the lifetime of the module (singleton).
 *
 * Tests can override the singleton via `__setAdapterForTesting`.
 */
export function getDefaultAdapter(): StorageAdapter {
  if (cachedAdapter) return cachedAdapter;
  const ls = createLocalStorageAdapter();
  cachedAdapter = ls.isAvailable() ? ls : createMemoryAdapter();
  return cachedAdapter;
}

/**
 * Module-level default adapter. Delegates every call to `getDefaultAdapter()`
 * so test overrides via `__setAdapterForTesting` are reflected immediately.
 */
export const defaultAdapter: StorageAdapter = {
  getItem: (key: string) => getDefaultAdapter().getItem(key),
  setItem: (key: string, value: string) => getDefaultAdapter().setItem(key, value),
  removeItem: (key: string) => getDefaultAdapter().removeItem(key),
  isAvailable: () => getDefaultAdapter().isAvailable(),
};

/**
 * Test-only hook: overrides the cached default adapter. Pass `null` to reset
 * to the auto-detected default on the next `getDefaultAdapter()` call.
 *
 * Production code must NOT call this — it is exported only so unit tests can
 * inject fault-injecting or in-memory adapters.
 */
export function __setAdapterForTesting(
  adapter: StorageAdapter | null,
): void {
  cachedAdapter = adapter;
}
