// hooks/usePageTracking.ts
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import ReactGA from 'react-ga4';
const analyticsEnabled = import.meta.env.VITE_ANALYTICS_ENABLED === "true";

export function usePageTracking() {
  const location = useLocation();

  useEffect(() => {
    if (!analyticsEnabled) return; 
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
