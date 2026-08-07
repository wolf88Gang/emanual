import { lazy, type ComponentType } from "react";

const RELOAD_KEY = "chunk-reload-attempt";

/**
 * Wraps React.lazy so that a failed dynamic import (usually a stale chunk hash
 * after a new deploy) triggers a single hard reload instead of a blank screen.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) {
  return lazy(async () => {
    try {
      const mod = await factory();
      sessionStorage.removeItem(RELOAD_KEY);
      return mod;
    } catch (error) {
      const alreadyReloaded = sessionStorage.getItem(RELOAD_KEY) === "true";
      if (!alreadyReloaded) {
        sessionStorage.setItem(RELOAD_KEY, "true");
        window.location.reload();
        // Never resolves; the page is reloading.
        return new Promise<{ default: T }>(() => {});
      }
      throw error;
    }
  });
}
