// /src/utils/gaClient.ts
import ReactGA from "react-ga4";

const GA_ID = "G-Q9EHZF08FX";
let initialized = false;
const analyticsEnabled = import.meta.env.VITE_ANALYTICS_ENABLED === "true";

export const initGA = (userId?: string) => {
  if (!analyticsEnabled) return; 
  if (initialized) return;
  ReactGA.initialize(GA_ID);
  if (userId) ReactGA.set({ userId });
  ReactGA.send({ hitType: "pageview", page: window.location.pathname + window.location.search });
  initialized = true;
};

export const setGAUser = (userId: string) => {
  if (!analyticsEnabled) return;
  if (!initialized) return;
  ReactGA.set({ userId });
};
