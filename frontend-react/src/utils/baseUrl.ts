import { Capacitor } from "@capacitor/core";

const ENV_BASE_URL = import.meta.env.VITE_BASE_URL || import.meta.env.VITE_API_BASE_URL;
const ENV_FALLBACK_BASE_URL =
  import.meta.env.VITE_PRODUCTION_BASE_URL || import.meta.env.VITE_MOBILE_BASE_URL;

const normalizeBaseUrl = (value: string) => value.trim().replace(/\/+$/, "");

const isLocalAddressUrl = (value: string) => {
  if (!value) return false;

  try {
    const parsed = new URL(value);
    const hostname = parsed.hostname.toLowerCase();
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname === "[::1]"
    );
  } catch {
    return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\]|::1)(:\d+)?$/i.test(value);
  }
};

export const getApiBaseUrl = () => {
  const configuredBaseUrl = normalizeBaseUrl(String(ENV_BASE_URL || ""));
  const fallbackBaseUrl = normalizeBaseUrl(String(ENV_FALLBACK_BASE_URL || ""));
  const isNativePlatform = Capacitor.isNativePlatform();
  const isProductionBuild = import.meta.env.PROD;

  if (configuredBaseUrl) {
    const pointsToLocalhost = isLocalAddressUrl(configuredBaseUrl);
    const shouldAvoidLocalhost = pointsToLocalhost && (isNativePlatform || isProductionBuild);
    if (!shouldAvoidLocalhost) {
      return configuredBaseUrl;
    }
  }

  if (fallbackBaseUrl) {
    return fallbackBaseUrl;
  }

  if (import.meta.env.DEV) {
    return "http://localhost:3000";
  }

  return configuredBaseUrl;
};
