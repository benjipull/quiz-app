import { toast } from "@/hooks/use-toast";

// Automatically load the base URL from .env
const BASE_URL = import.meta.env.VITE_BASE_URL;

// ✅ Optional: Log once which environment you're using (for debugging)
if (import.meta.env.DEV) {
  console.log(`🌍 Using DEV backend: ${BASE_URL}`);
} else {
  console.log(`🚀 Using PRODUCTION backend: ${BASE_URL}`);
}

/**
 * Universal API client with token + toast + auto env URL
 * @param endpoint e.g. "/api/getUserDetails"
 * @param options fetch options
 */
export const apiClient = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<Response | void> => {
  const token = localStorage.getItem("token");

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  // ✅ Automatically prepend BASE_URL if only a relative endpoint is passed
  const fullUrl = endpoint.startsWith("http")
    ? endpoint
    : `${BASE_URL}${endpoint}`;

  const response = await fetch(fullUrl, { ...options, headers });

  if (response.status === 401) {
    const data = await response.json().catch(() => ({} as any));

    if (typeof data?.error === "string" && data.error.toLowerCase().includes("token")) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      toast({
        title: "Session expired",
        description: "Please log in again to continue.",
        variant: "destructive",
      });

      // Delay redirect slightly so toast is visible
      setTimeout(() => {
        window.location.href = "/auth";
      }, 1000);

      return;
    }
  }

  return response;
};
