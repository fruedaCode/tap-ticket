"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch((error) => {
        console.error("Service worker registration failed:", error);
      });
      return;
    }

    // A worker left behind by a local `next start` keeps controlling
    // localhost, so it goes on intercepting and caching dev assets on every
    // later `next dev`. Tear it down instead of debugging phantom stale
    // responses.
    navigator.serviceWorker
      .getRegistrations()
      .then((registrations) =>
        Promise.all(registrations.map((r) => r.unregister())),
      )
      .catch(() => {});

    if ("caches" in window) {
      caches
        .keys()
        .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
        .catch(() => {});
    }
  }, []);

  return null;
}
