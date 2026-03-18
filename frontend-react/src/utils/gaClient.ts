// /src/utils/gaClient.ts
import ReactGA from "react-ga4";

const GA_ID = "G-Q9EHZF08FX";
const appEnv = String((import.meta.env as Record<string, string | boolean | undefined>).ENV ?? "").toUpperCase();
export const isGAEnabled = appEnv === "PRODUCTION" && Boolean(GA_ID);
let initialized = false;

export const initGA = (userId?: string) => {
  if (!isGAEnabled) return;
  if (initialized) return;
  ReactGA.initialize(GA_ID);
  if (userId) ReactGA.set({ userId });
  ReactGA.send({ hitType: "pageview", page: window.location.pathname + window.location.search });
  initialized = true;
};

export const setGAUser = (userId: string) => {
  if (!isGAEnabled) return;
  if (!initialized) return;
  ReactGA.set({ userId });
};
