import { toast } from "@/hooks/use-toast";

const API_PATH_SEGMENT = "/api/";
const TOAST_THROTTLE_MS = 1500;
const MAX_DESCRIPTION_LENGTH = 180;

let isInstalled = false;
let originalFetch: typeof window.fetch | null = null;
const toastCooldownBySignature = new Map<string, number>();

const truncate = (value: string, maxLength: number) => {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 3)}...`;
};

const sanitizeDescription = (value: string) => {
  return value.replace(/\s+/g, " ").trim();
};

const getRequestUrl = (input: RequestInfo | URL): string => {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  if (typeof Request !== "undefined" && input instanceof Request) return input.url;
  return String(input);
};

const isApiRequest = (url: string) => {
  if (!url) return false;
  return url.includes(API_PATH_SEGMENT);
};

const getFallbackDescription = (statusCode: number, statusText: string) => {
  if (statusCode === 0) return "Network request failed.";
  if (statusText && statusText.trim()) return statusText.trim();
  return "Request failed.";
};

const extractMessageFromJson = (raw: unknown): string | null => {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const candidates = [
    record.message,
    record.error,
    record.description,
    record.details,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }
  return null;
};

const getBriefDescriptionFromResponse = async (response: Response) => {
  const fallback = getFallbackDescription(response.status, response.statusText);

  try {
    const cloned = response.clone();
    const textBody = await cloned.text();
    const normalizedText = sanitizeDescription(textBody || "");
    if (!normalizedText) return fallback;

    try {
      const json = JSON.parse(normalizedText);
      const extracted = extractMessageFromJson(json);
      if (extracted) return sanitizeDescription(extracted);
    } catch {
      // Fall back to raw text if it isn't JSON.
    }

    return normalizedText;
  } catch {
    return fallback;
  }
};

const maybeToastServerError = (statusCode: number, description: string, url: string) => {
  const normalizedDescription = sanitizeDescription(description) || getFallbackDescription(statusCode, "");
  const signature = `${statusCode}|${url}|${normalizedDescription}`;
  const now = Date.now();
  const previousShownAt = toastCooldownBySignature.get(signature) ?? 0;
  if (now - previousShownAt < TOAST_THROTTLE_MS) {
    return;
  }

  toastCooldownBySignature.set(signature, now);
  toast({
    title: "Server Error",
    description: `HTTP ${statusCode}: ${truncate(normalizedDescription, MAX_DESCRIPTION_LENGTH)}`,
    variant: "destructive",
  });
};

export const installGlobalApiErrorToasts = () => {
  if (isInstalled || typeof window === "undefined" || typeof window.fetch !== "function") {
    return;
  }

  originalFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const requestUrl = getRequestUrl(input);
    const isApiCall = isApiRequest(requestUrl);

    try {
      const response = await originalFetch!(input, init);
      if (isApiCall && !response.ok) {
        const description = await getBriefDescriptionFromResponse(response);
        maybeToastServerError(response.status, description, requestUrl);
      }
      return response;
    } catch (error) {
      if (isApiCall) {
        const description =
          error instanceof Error && error.message
            ? sanitizeDescription(error.message)
            : "Network request failed.";
        maybeToastServerError(0, description, requestUrl);
      }
      throw error;
    }
  };

  isInstalled = true;
};

