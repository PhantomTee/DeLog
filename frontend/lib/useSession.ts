"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "zamance_session_token";

/**
 * Reads a `#token=...` fragment left by the bot backend's OIDC callback redirect (fragments
 * never reach the server, so this only ever happens client-side), persists it to localStorage,
 * and strips it from the URL. Falls back to whatever token is already stored.
 */
export function useSession(): { token: string | null; clear: () => void } {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith("#token=")) {
      const value = hash.slice("#token=".length);
      window.localStorage.setItem(STORAGE_KEY, value);
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
      setToken(value);
      return;
    }
    setToken(window.localStorage.getItem(STORAGE_KEY));
  }, []);

  // Stable across renders - callers (e.g. a dashboard's useEffect(fn, [token, clear])) would
  // otherwise see a new function identity every render and re-run on every render, not just
  // when the session actually changes.
  const clear = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    setToken(null);
  }, []);

  return { token, clear };
}
