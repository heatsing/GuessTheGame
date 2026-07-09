import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  __setAdapterForTesting,
  createLocalStorageAdapter,
  createMemoryAdapter,
  getDefaultAdapter,
  type StorageAdapter,
} from "./adapter";

/**
 * Adapter unit tests.
 *
 * Covers:
 *  - memory adapter basic CRUD + always-available.
 *  - localStorage adapter under jsdom (read/write/remove/isAvailable).
 *  - fault injection: setItem throws → isAvailable false.
 *  - Safari private mode: setItem no-ops, getItem returns null → isAvailable false.
 *  - getDefaultAdapter singleton + __setAdapterForTesting injection.
 */

// --- Memory adapter ------------------------------------------------------

describe("createMemoryAdapter", () => {
  let adapter: StorageAdapter;

  beforeEach(() => {
    adapter = createMemoryAdapter();
  });

  it("getItem returns null for a missing key", () => {
    expect(adapter.getItem("missing")).toBeNull();
  });

  it("setItem + getItem round-trips a value", () => {
    adapter.setItem("k", "v");
    expect(adapter.getItem("k")).toBe("v");
  });

  it("setItem overwrites the previous value", () => {
    adapter.setItem("k", "v1");
    adapter.setItem("k", "v2");
    expect(adapter.getItem("k")).toBe("v2");
  });

  it("removeItem deletes a key", () => {
    adapter.setItem("k", "v");
    adapter.removeItem("k");
    expect(adapter.getItem("k")).toBeNull();
  });

  it("removeItem on a missing key is a no-op", () => {
    expect(() => adapter.removeItem("missing")).not.toThrow();
  });

  it("isAvailable always returns true", () => {
    expect(adapter.isAvailable()).toBe(true);
  });
});

// --- localStorage adapter (jsdom) ---------------------------------------

describe("createLocalStorageAdapter (jsdom)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("reads and writes values", () => {
    const adapter = createLocalStorageAdapter();
    adapter.setItem("gtg:test", "hello");
    expect(adapter.getItem("gtg:test")).toBe("hello");
  });

  it("removes values", () => {
    const adapter = createLocalStorageAdapter();
    adapter.setItem("gtg:test", "hello");
    adapter.removeItem("gtg:test");
    expect(adapter.getItem("gtg:test")).toBeNull();
  });

  it("isAvailable returns true under jsdom", () => {
    const adapter = createLocalStorageAdapter();
    expect(adapter.isAvailable()).toBe(true);
  });

  it("does not leave the probe key behind", () => {
    const adapter = createLocalStorageAdapter();
    adapter.isAvailable();
    expect(adapter.getItem("__gtg_storage_probe__")).toBeNull();
  });
});

// --- Fault injection: setItem throws ------------------------------------

/**
 * Replaces `window.localStorage` with `mock` for the duration of a callback,
 * then restores the original descriptor. `vi.spyOn` does not reliably
 * intercept jsdom's `Storage.prototype` methods, so we swap the whole
 * property descriptor instead.
 */
function withMockLocalStorage<T>(mock: unknown, fn: () => T): T {
  const original = Object.getOwnPropertyDescriptor(window, "localStorage");
  Object.defineProperty(window, "localStorage", {
    value: mock,
    configurable: true,
    writable: true,
  });
  try {
    return fn();
  } finally {
    if (original) {
      Object.defineProperty(window, "localStorage", original);
    }
  }
}

describe("createLocalStorageAdapter — setItem throws", () => {
  it("isAvailable returns false when setItem throws", () => {
    const mockStorage = {
      getItem: () => null,
      setItem: () => {
        throw new DOMException(
          "QuotaExceededError",
          "QuotaExceededError",
        );
      },
      removeItem: () => {
        // no-op
      },
      clear: () => {
        // no-op
      },
    };
    withMockLocalStorage(mockStorage, () => {
      const adapter = createLocalStorageAdapter();
      expect(adapter.isAvailable()).toBe(false);
    });
  });
});

// --- Safari private mode: setItem no-ops, getItem returns null ----------

describe("createLocalStorageAdapter — Safari private mode", () => {
  it("isAvailable returns false when getItem returns null after setItem", () => {
    // Safari private mode: setItem silently no-ops (no throw), getItem
    // always returns null because the write never landed.
    const mockStorage = {
      getItem: () => null,
      setItem: () => {
        /* silently dropped */
      },
      removeItem: () => {
        // no-op
      },
      clear: () => {
        // no-op
      },
    };
    withMockLocalStorage(mockStorage, () => {
      const adapter = createLocalStorageAdapter();
      expect(adapter.isAvailable()).toBe(false);
    });
  });
});

// --- getDefaultAdapter singleton ----------------------------------------

describe("getDefaultAdapter singleton", () => {
  beforeEach(() => {
    __setAdapterForTesting(null);
  });

  afterEach(() => {
    __setAdapterForTesting(null);
  });

  it("returns the same instance on repeated calls", () => {
    const a = getDefaultAdapter();
    const b = getDefaultAdapter();
    expect(a).toBe(b);
  });

  it("returns the injected adapter after __setAdapterForTesting", () => {
    const mem = createMemoryAdapter();
    __setAdapterForTesting(mem);
    expect(getDefaultAdapter()).toBe(mem);
  });

  it("falls back to a fresh adapter after reset to null", () => {
    const mem = createMemoryAdapter();
    __setAdapterForTesting(mem);
    expect(getDefaultAdapter()).toBe(mem);
    __setAdapterForTesting(null);
    const next = getDefaultAdapter();
    expect(next).not.toBe(mem);
  });
});
