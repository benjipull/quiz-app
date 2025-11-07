// /src/utils/gaClient.ts
import ReactGA from "react-ga4";

const GA_ID = "G-Q9EHZF08FX";
let initialized = false;

export const initGA = (userId?: string) => {
  if (initialized) return;
  ReactGA.initialize(GA_ID);
  if (userId) ReactGA.set({ userId });
  ReactGA.send({ hitType: "pageview", page: window.location.pathname + window.location.search });
  initialized = true;
};

export const setGAUser = (userId: string) => {
  if (!initialized) return;
  ReactGA.set({ userId });
};
