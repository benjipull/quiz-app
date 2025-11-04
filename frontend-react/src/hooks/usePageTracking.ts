import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import ReactGA from 'react-ga4';

// ⚠️ REPLACE THIS WITH YOUR ACTUAL GA4 MEASUREMENT ID
const TRACKING_ID = "G-XXXXXXXXXX"; 

if (process.env.NODE_ENV === 'production') {
  ReactGA.initialize(TRACKING_ID);
}

/**
 * Custom hook to track page views on every route change (location update).
 */
export function usePageTracking() {
  const location = useLocation();

  useEffect(() => {
    // Ensure GA is initialized and not tracking in development mode (if check above is used)
    if (ReactGA.isInitialized) {
      ReactGA.send({
        hitType: 'pageview',
        page: location.pathname + location.search,
        title: document.title
      });
    }
    
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[GA] Tracking Page View: ${location.pathname}`);
    }
  }, [location]);
}