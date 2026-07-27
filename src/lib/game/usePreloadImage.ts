"use client";

import { useEffect, useState } from "react";

/**
 * Preloads one or more images on demand (P1-10: "next clue can be preloaded
 * on demand"). Uses `new Image()` to warm the browser's HTTP cache so a
 * subsequent `<img src=…>` renders instantly from cache.
 *
 * SSR-safe: no-op on the server (guards `typeof window`).
 *
 * Typical usage:
 *   - **Mount-time preload** — warm the cache for an above-fold image that
 *     isn't rendered yet (e.g. the next mode's puzzle image on `/daily`):
 *     `usePreloadImage(nextPuzzleImage)`.
 *   - **On-demand preload** — gate on a condition so preloading only fires
 *     after a user action (e.g. preload the next clue once the current one is
 *     revealed): `usePreloadImage(nextImageUrl, currentClueRevealed)`.
 *
 * @param urls    Single URL, array of URLs, or undefined/null to skip.
 * @param enabled When false, no preloading occurs (default true). Use this to
 *                gate preloading on a condition.
 * @returns `loaded` — true when all requested images have finished loading
 *          (success or error), or when there is nothing to preload.
 */
export function usePreloadImage(
  urls: string | string[] | undefined | null,
  enabled: boolean = true,
): boolean {
  const [loaded, setLoaded] = useState(false);

  // Serialize the urls for the dependency array so an array literal doesn't
  // re-trigger the effect on every render. `JSON.stringify` is stable for
  // string arrays.
  const urlKey = serializeUrls(urls);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      setLoaded(true);
      return;
    }

    const list = parseUrlKey(urlKey);
    if (list.length === 0) {
      setLoaded(true);
      return;
    }

    setLoaded(false);
    let cancelled = false;
    let remaining = list.length;
    const images: HTMLImageElement[] = [];

    function onSettled() {
      remaining -= 1;
      if (remaining <= 0 && !cancelled) {
        setLoaded(true);
      }
    }

    for (const url of list) {
      const img = new Image();
      img.onload = onSettled;
      // Errors count as "done" so the hook never hangs on a broken URL.
      img.onerror = onSettled;
      img.src = url;
      images.push(img);
    }

    return () => {
      cancelled = true;
      // Cancel pending loads by clearing handlers + src. This prevents the
      // `onSettled` callback from firing after unmount (state update on
      // unmounted component).
      for (const img of images) {
        img.onload = null;
        img.onerror = null;
        img.src = "";
      }
    };
  }, [urlKey, enabled]);

  return loaded;
}

/** Stable serialization of the urls input for the effect dependency array. */
function serializeUrls(urls: string | string[] | undefined | null): string {
  if (urls == null) return "";
  if (typeof urls === "string") return urls;
  return urls.join("\u0000"); // null separator — URLs cannot contain it
}

/** Reverses `serializeUrls` back into a URL array. */
function parseUrlKey(key: string): string[] {
  if (key === "") return [];
  return key.split("\u0000").filter(Boolean);
}
