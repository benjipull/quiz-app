import AsyncStorage from '@react-native-async-storage/async-storage';

export const apiClient = async (
  url: string,
  options: RequestInit = {}
): Promise<Response | void> => {
  const token = await AsyncStorage.getItem("token");

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    const data = await response.json().catch(() => ({} as any));

    if (typeof data?.error === "string" && data.error.toLowerCase().includes("token")) {
      await AsyncStorage.multiRemove(["token", "user"]);
      
      // In React Native, we typically use navigation to redirect.
      // We might need a global event or a state change to trigger this.
      console.warn("Session expired. Please log in again.");
      return;
    }
  }

  return response;
};
