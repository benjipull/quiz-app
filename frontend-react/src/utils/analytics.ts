import { isGAEnabled, sendGAEvent } from "@/utils/gaClient";

function logEventDebug(eventName: string, params: Record<string, unknown>) {
  const rawUserId = params.user_id;
  const userId = typeof rawUserId === "string" && rawUserId.length > 0 ? rawUserId : "guest";
  console.log(`[GA] Event: ${eventName}`, { userId, ...params });
}

const FIRST_INTERACTION_SESSION_KEY = "ga_first_interaction_tracked";
const ENTERED_GAME_SESSION_KEY = "ga_entered_game_tracked";
const QUIZ_SESSION_COUNT_KEY = "ga_quiz_session_count";
let inMemoryQuizSessionCount = 0;

const readSessionQuizCount = () => {
  if (typeof window === "undefined") return inMemoryQuizSessionCount;
  try {
    const raw = sessionStorage.getItem(QUIZ_SESSION_COUNT_KEY);
    const parsed = Number.parseInt(raw ?? "0", 10);
    if (!Number.isFinite(parsed) || parsed < 0) return 0;
    inMemoryQuizSessionCount = parsed;
    return parsed;
  } catch {
    return inMemoryQuizSessionCount;
  }
};

const getCurrentSessionQuizNumber = () => {
  const currentCount = readSessionQuizCount();
  return currentCount > 0 ? currentCount : 1;
};

const getQuizIndexedEventName = (baseEventName: string, quizNumber: number) => {
  const normalizedQuizNumber = Number.isFinite(quizNumber) && quizNumber > 0
    ? Math.floor(quizNumber)
    : 1;
  return `${baseEventName}_${normalizedQuizNumber}`;
};

const incrementSessionQuizCount = () => {
  const nextCount = readSessionQuizCount() + 1;
  inMemoryQuizSessionCount = nextCount;
  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem(QUIZ_SESSION_COUNT_KEY, String(nextCount));
    } catch {
      // Ignore sessionStorage failures and use the in-memory count.
    }
  }
  return nextCount;
};

// === NEW GENERIC TRACKING FUNCTION ===
export const trackEvent = (eventName: string, params: Record<string, unknown> = {}) => {
  if (isGAEnabled) {
    void sendGAEvent(eventName, params);
  }
  logEventDebug(eventName, params);
};
// ======================================

export const trackFirstSessionInteraction = (params: Record<string, unknown> = {}) => {
  if (!isGAEnabled) return;
  if (typeof window === "undefined") return;

  try {
    if (sessionStorage.getItem(FIRST_INTERACTION_SESSION_KEY) === "1") return;
    sessionStorage.setItem(FIRST_INTERACTION_SESSION_KEY, "1");
  } catch {
    // If sessionStorage is unavailable, still emit the event.
  }

  const payload = {
    event_category: "engagement",
    ...params,
  };

  trackEvent("first_session_interaction", payload);
};

export const trackEnteredGame = (userId?: string, identificationMethod: string = "unknown") => {
  if (!userId) return;
  if (typeof window !== "undefined") {
    try {
      if (sessionStorage.getItem(ENTERED_GAME_SESSION_KEY) === "1") return;
      sessionStorage.setItem(ENTERED_GAME_SESSION_KEY, "1");
    } catch {
      // If sessionStorage is unavailable, still emit the event.
    }
  }

  trackEvent("entered_game", {
    user_id: userId,
    identification_method: identificationMethod,
  });
};

export const trackQuizStart = (categoryId: string, userId?: string) => {
  if (!isGAEnabled) return;
  const quizNumber = incrementSessionQuizCount();
  const params = {
    quiz_category_id: categoryId,
    user_id: userId,
    quiz_session_number: quizNumber,
  };
  trackEvent(getQuizIndexedEventName("quiz_start", quizNumber), params);
};

export const trackNextQuiz = (categoryId: string, userId?: string) => {
  trackEvent("next_quiz", { quiz_category_id: categoryId, user_id: userId });
};

export const trackQuestionAnswered = (questionId: string, isCorrect: boolean, userId?: string) => {
  if (!isGAEnabled) return;
  const quizNumber = getCurrentSessionQuizNumber();
  const params = {
    question_id: questionId,
    result: isCorrect ? "correct" : "incorrect",
    user_id: userId,
    quiz_session_number: quizNumber,
  };
  trackEvent(getQuizIndexedEventName("question_answered", quizNumber), params);
};

export const trackQuizComplete = (categoryId: string, score: number, userId?: string) => {
  if (!isGAEnabled) return;
  const quizNumber = getCurrentSessionQuizNumber();
  const params = {
    quiz_category_id: categoryId,
    score,
    user_id: userId,
    quiz_session_number: quizNumber,
  };
  trackEvent(getQuizIndexedEventName("quiz_complete", quizNumber), params);
};

export const trackLogin = (method: string, userId?: string) => {
  trackEvent("login", { method, user_id: userId });
};

export const trackSignup = (userId?: string) => {
  trackEvent("signup", { user_id: userId });
};

export const trackHomeScreen = (userId?: string) => {
  trackEvent("home_page", { user_id: userId });
  trackEvent("home_screen", { user_id: userId });
};

export const trackEnteredSagaMap = (userId?: string) => {
  trackEvent("Entered_SagaMap", { user_id: userId });
};

export const trackEnteredSagaLevelMap = (userId?: string, sagaNumber?: number) => {
  trackEvent("Entered_SagaLevelMap", {
    user_id: userId,
    saga_number: sagaNumber,
  });
};
