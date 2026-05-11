import { useEffect, useState } from "react";

const STORAGE_KEY = "mari_pageguide_seen_v1";

function readSeen(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function writeSeen(set: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch {
    /* ignore */
  }
}

/**
 * Returns { isFirstVisit, markSeen }.
 * On the first call for a given pageKey, isFirstVisit=true and markSeen is a no-op
 * helper to persist that the user has now seen the guide. Subsequent calls (in the
 * same session or later) return isFirstVisit=false.
 */
export function useFirstTimeOnPage(pageKey: string | undefined) {
  const [isFirstVisit, setIsFirstVisit] = useState(false);

  useEffect(() => {
    if (!pageKey) return;
    const seen = readSeen();
    if (!seen.has(pageKey)) {
      setIsFirstVisit(true);
      seen.add(pageKey);
      writeSeen(seen);
    }
  }, [pageKey]);

  return { isFirstVisit };
}

/** Clears the seen set — exposed for a "Ver guias de novo" button. */
export function resetPageGuides() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
