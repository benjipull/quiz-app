// /src/utils/gaClient.ts
import ReactGA from "react-ga4";

const GA_ID = "G-Q9EHZF08FX";
const appEnv = String((import.meta.env as Record<string, string | boolean | undefined>).ENV ?? "").toUpperCase();
export const isGAEnabled = appEnv === "PRODUCTION" && Boolean(GA_ID);
let initialized = false;

type GAPayload =
  | {
      type: "event";
      eventName: string;
      params: Record<string, unknown>;
    }
  | {
      type: "pageview";
      page: string;
      title?: string;
    };

const pendingPayloads: GAPayload[] = [];
const MAX_PENDING_PAYLOADS = 200;

const enqueuePayload = (payload: GAPayload) => {
  if (pendingPayloads.length >= MAX_PENDING_PAYLOADS) {
    pendingPayloads.shift();
  }
  pendingPayloads.push(payload);
};

const dispatchEventNow = (
  eventName: string,
  params: Record<string, unknown> = {},
): Promise<boolean> => {
  const gtag = typeof window !== "undefined"
    ? (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag
    : undefined;

  if (typeof gtag === "function") {
    gtag("event", eventName, {
      ...params,
      transport_type: "beacon",
    });
    return Promise.resolve(true);
  }

  ReactGA.event(eventName, params);
  return Promise.resolve(true);
};

const dispatchPageViewNow = (page: string, title?: string): Promise<boolean> => {
  const gtag = typeof window !== "undefined"
    ? (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag
    : undefined;

  if (typeof gtag === "function") {
    gtag("event", "page_view", {
      page_path: page,
      page_title: title || document.title,
      transport_type: "beacon",
    });
    return Promise.resolve(true);
  }

  ReactGA.send({ hitType: "pageview", page, title: title || document.title });
  return Promise.resolve(true);
};

const flushPendingPayloads = () => {
  if (!initialized || pendingPayloads.length === 0) return;

  const queued = pendingPayloads.splice(0, pendingPayloads.length);
  queued.forEach((payload) => {
    if (payload.type === "event") {
      void dispatchEventNow(payload.eventName, payload.params);
      return;
    }

    void dispatchPageViewNow(payload.page, payload.title);
  });
};

export const initGA = (userId?: string) => {
  if (!isGAEnabled) return;
  if (initialized) return;
  ReactGA.initialize(GA_ID);
  if (userId) ReactGA.set({ userId });
  initialized = true;
  void dispatchPageViewNow(window.location.pathname + window.location.search, document.title);
  flushPendingPayloads();
};

export const setGAUser = (userId: string) => {
  if (!isGAEnabled) return;
  if (!initialized) return;
  ReactGA.set({ userId });
};

export const sendGAEvent = (
  eventName: string,
  params: Record<string, unknown> = {},
): Promise<boolean> => {
  if (!isGAEnabled) return Promise.resolve(false);

  if (!initialized) {
    enqueuePayload({
      type: "event",
      eventName,
      params,
    });
    return Promise.resolve(false);
  }

  return dispatchEventNow(eventName, params);
};

export const sendGAPageView = (
  page: string,
  title?: string,
): Promise<boolean> => {
  if (!isGAEnabled) return Promise.resolve(false);

  if (!initialized) {
    enqueuePayload({
      type: "pageview",
      page,
      title,
    });
    return Promise.resolve(false);
  }

  return dispatchPageViewNow(page, title);
};
