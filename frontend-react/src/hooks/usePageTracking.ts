// hooks/usePageTracking.ts
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import ReactGA from 'react-ga4';

export function usePageTracking() {
  const location = useLocation();

  useEffect(() => {
    if (ReactGA.isInitialized) {
      ReactGA.send({
        hitType: 'pageview',
        page: location.pathname + location.search,
        title: document.title,
      });
    }
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[GA] Tracking Page View: ${location.pathname}`);
    }
  }, [location]);
}
