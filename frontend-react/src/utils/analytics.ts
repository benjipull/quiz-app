import ReactGA from "react-ga4";

function logEventDebug(eventName: string, params: Record<string, any>) {
  const userId = params.user_id || "guest";
  console.log(`[GA] Event: ${eventName}`, { userId, ...params });
}

// === NEW GENERIC TRACKING FUNCTION ===
export const trackEvent = (eventName: string, params: Record<string, any> = {}) => {
  ReactGA.event(eventName, params);
  logEventDebug(eventName, params);
};
// ======================================

export const trackQuizStart = (categoryId: string, userId?: string) => {
  const params = { quiz_category_id: categoryId, user_id: userId };
  ReactGA.event("quiz_start", params);
  logEventDebug("quiz_start", params);
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
  ReactGA.event("home_screen", params);
  logEventDebug("home_screen", params);
};