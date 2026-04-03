import { Capacitor } from "@capacitor/core";

const ENV_BASE_URL = import.meta.env.VITE_BASE_URL || import.meta.env.VITE_API_BASE_URL;
const ENV_FALLBACK_BASE_URL =
  import.meta.env.VITE_PRODUCTION_BASE_URL || import.meta.env.VITE_MOBILE_BASE_URL;
const ENV_LOCAL_BASE_URL = import.meta.env.VITE_LOCAL_API_BASE_URL || "http://localhost:3000";

const normalizeBaseUrl = (value: string) => value.trim().replace(/\/+$/, "");

const isLocalHostname = (hostname: string) => {
  const normalized = String(hostname || "").toLowerCase();
  return (
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized === "::1" ||
    normalized === "[::1]"
  );
};

const isBrowserRunningOnLocalhost = () => {
  if (typeof window === "undefined") return false;
  return isLocalHostname(window.location.hostname);
};

export const getApiBaseUrl = () => {
  const configuredBaseUrl = normalizeBaseUrl(String(ENV_BASE_URL || ""));
  const fallbackBaseUrl = normalizeBaseUrl(String(ENV_FALLBACK_BASE_URL || ""));
  const localBaseUrl = normalizeBaseUrl(String(ENV_LOCAL_BASE_URL || ""));
  const isNativePlatform = Capacitor.isNativePlatform();

  // APK/native app should target cloud endpoints.
  if (isNativePlatform) {
    if (fallbackBaseUrl) return fallbackBaseUrl;
    if (configuredBaseUrl) return configuredBaseUrl;
    return localBaseUrl;
  }

  // Browser on localhost should target the local Node backend.
  if (isBrowserRunningOnLocalhost()) {
    return localBaseUrl;
  }

  if (configuredBaseUrl) return configuredBaseUrl;
  if (fallbackBaseUrl) return fallbackBaseUrl;
  return localBaseUrl;
};
