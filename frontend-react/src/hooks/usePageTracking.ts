// hooks/usePageTracking.ts
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import ReactGA from 'react-ga4';
import { isGAEnabled } from '@/utils/gaClient';

export function usePageTracking() {
  const location = useLocation();

  useEffect(() => {
    if (isGAEnabled && ReactGA.isInitialized) {
      ReactGA.send({
        hitType: 'pageview',
        page: location.pathname + location.search,
        title: document.title,
      });
    }
    if (!import.meta.env.PROD) {
      console.log(`[GA] Tracking Page View: ${location.pathname}`);
    }
  }, [location]);
}
