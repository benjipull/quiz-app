// src/utils/analytics.ts
import ReactGA from "react-ga4";

export function initAnalytics() {
  ReactGA.initialize(import.meta.env.VITE_GA_MEASUREMENT_ID);
  ReactGA.send("pageview");
}

export function trackQuizStart(categoryId: string, userId?: string) {
  ReactGA.event("quiz_start", { category_id: categoryId, user_id: userId });
}

export function trackQuestionAnswered(questionId: string, isCorrect: boolean, userId?: string) {
  ReactGA.event("question_answered", {
    question_id: questionId,
    is_correct: isCorrect,
    user_id: userId,
  });
}

export function trackQuizComplete(categoryId: string, score: number, userId?: string) {
  ReactGA.event("quiz_complete", { category_id: categoryId, score, user_id: userId });
}

export function trackFeedback(questionId: string, type: "up" | "down", userId?: string) {
  ReactGA.event("feedback_given", { question_id: questionId, type, user_id: userId });
}

export function trackReport(questionId: string, reason: string, userId?: string) {
  ReactGA.event("question_reported", { question_id: questionId, reason, user_id: userId });
}
