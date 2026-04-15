// hooks/usePageTracking.ts
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { isGAEnabled, sendGAPageView } from '@/utils/gaClient';

export function usePageTracking() {
  const location = useLocation();

  useEffect(() => {
    if (isGAEnabled) {
      void sendGAPageView(location.pathname + location.search, document.title);
    }
    if (!import.meta.env.PROD) {
      console.log(`[GA] Tracking Page View: ${location.pathname}`);
    }
  }, [location]);
}
