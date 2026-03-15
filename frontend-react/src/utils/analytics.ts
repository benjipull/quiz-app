import ReactGA from "react-ga4";

function logEventDebug(eventName: string, params: Record<string, any>) {
  const userId = params.user_id || "guest";
  console.log(`[GA] Event: ${eventName}`, { userId, ...params });
}

const FIRST_INTERACTION_SESSION_KEY = "ga_first_interaction_tracked";

// === NEW GENERIC TRACKING FUNCTION ===
export const trackEvent = (eventName: string, params: Record<string, any> = {}) => {
  ReactGA.event(eventName, params);
  logEventDebug(eventName, params);
};
// ======================================

export const trackFirstSessionInteraction = (params: Record<string, any> = {}) => {
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

  ReactGA.event("first_session_interaction", payload);
  logEventDebug("first_session_interaction", payload);
};

export const trackQuizStart = (categoryId: string, userId?: string) => {
  const params = { quiz_category_id: categoryId, user_id: userId };
  ReactGA.event("quiz_start", params);
  logEventDebug("quiz_start", params);
};

export const trackNextQuiz = (categoryId: string, userId?: string) => {
  const params = { quiz_category_id: categoryId, user_id: userId };
  ReactGA.event("next_quiz", params);
  logEventDebug("next_quiz", params);
};

export const trackQuestionAnswered = (questionId: string, isCorrect: boolean, userId?: string) => {
  const params = {
    question_id: questionId,
    result: isCorrect ? "correct" : "incorrect",
    user_id: userId,
  };
  ReactGA.event("question_answered", params);
  logEventDebug("question_answered", params);
};

export const trackQuizComplete = (categoryId: string, score: number, userId?: string) => {
  const params = { quiz_category_id: categoryId, score, user_id: userId };
  ReactGA.event("quiz_complete", params);
  logEventDebug("quiz_complete", params);
};

export const trackLogin = (method: string, userId?: string) => {
  const params = { method, user_id: userId };
  ReactGA.event("login", params);
  logEventDebug("login", params);
};

export const trackSignup = (userId?: string) => {
  const params = { user_id: userId };
  ReactGA.event("signup", params);
  logEventDebug("signup", params);
};

export const trackHomeScreen = (userId?: string) => {
  const params = { user_id: userId };
  ReactGA.event("home_page", params);
  logEventDebug("home_page", params);
  ReactGA.event("home_screen", params);
  logEventDebug("home_screen", params);
};
