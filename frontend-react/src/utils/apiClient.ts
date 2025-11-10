// src/utils/apiClient.ts
import { toast } from "@/hooks/use-toast";

export const apiClient = async (
  url: string,
  options: RequestInit = {}
): Promise<Response | void> => {
  const token = localStorage.getItem("token");

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    const data = await response.json().catch(() => ({} as any));

    if (typeof data?.error === "string" && data.error.toLowerCase().includes("token")) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      // 🔔 Show toast using ShadCN hook
      toast({
        title: "Session expired",
        description: "Please log in again to continue.",
        variant: "destructive",
      });

      // Small delay so user sees toast before redirect
      setTimeout(() => {
        window.location.href = "/auth";
      }, 1000);
      return;
    }
  }

  return response;
};
