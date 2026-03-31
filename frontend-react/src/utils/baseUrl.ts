const ENV_BASE_URL = import.meta.env.VITE_BASE_URL || import.meta.env.VITE_API_BASE_URL;

export const getApiBaseUrl = () => {
  const configuredBaseUrl = (ENV_BASE_URL || "").trim();

  if (typeof window !== "undefined") {
    const hostname = window.location.hostname.toLowerCase();
    const isLocalHost =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "[::1]";

    if (isLocalHost) {
      return "http://localhost:3000";
    }
  }

  return configuredBaseUrl;
};
