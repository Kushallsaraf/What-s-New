'use client';

import { useEffect } from 'react';

export function RegisterServiceWorker() {
  useEffect(() => {
    const secureContext =
      window.location.protocol === 'https:' || window.location.hostname === 'localhost';
    if ('serviceWorker' in navigator && secureContext) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Offline support is progressive; a registration failure must not block the app.
      });
    }
  }, []);

  return null;
}
