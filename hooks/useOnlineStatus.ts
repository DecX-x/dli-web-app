'use client';

import { useEffect, useState } from 'react';

/**
 * Hook to detect online/offline status
 * Requirements: 1.1, 4.2
 * 
 * Returns true if the browser is online, false if offline
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Set initial state
    setIsOnline(navigator.onLine);

    // Event handlers
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
