import ReactGA from "react-ga4";

export const trackQuizStart = (categoryId: string, userId?: string) =>
  ReactGA.event("quiz_start", { quiz_category_id: categoryId, user_id: userId });

export const trackQuestionAnswered = (questionId: string, isCorrect: boolean, userId?: string) =>
  ReactGA.event("question_answered", {
    question_id: questionId,
    result: isCorrect ? "correct" : "incorrect",
    user_id: userId
  });

export const trackQuizComplete = (categoryId: string, score: number, userId?: string) =>
  ReactGA.event("quiz_complete", {
    quiz_category_id: categoryId,
    score,
    user_id: userId
  });

export const trackLogin = (method: string, userId?: string) => {
  ReactGA.event("login", {
    method,
    user_id: userId,
  });
};

export const trackSignup = (userId?: string) => {
  ReactGA.event("signup", {
    user_id: userId,
  });
};

export const trackHomeScreen = (userId?: string) => {
  ReactGA.event("home_screen", {
    user_id: userId,
  });
};
