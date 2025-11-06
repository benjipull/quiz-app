import ReactGA from 'react-ga4';

// ⚠️ IMPORTANT: REPLACE 'G-XXXXXXXXXX' WITH YOUR ACTUAL GA4 MEASUREMENT ID
const TRACKING_ID = "G-XXXXXXXXXX"; 

if (process.env.NODE_ENV === 'production') {
  // Initialize GA4 only once in production environment
  ReactGA.initialize(TRACKING_ID);
}

// Helper to check if GA is ready to send events and if we are in production
const isGAInitialized = () => process.env.NODE_ENV === 'production' && ReactGA.isInitialized;

// --- Quiz Tracking Functions ---

/**
 * Tracks the start of a new quiz session (Fixes "no started quizzes" issue).
 * @param categoryId The ID of the quiz category.
 * @param userId The ID of the logged-in user.
 */
export const trackQuizStart = (categoryId: string, userId: string) => {
  if (isGAInitialized()) {
    ReactGA.event({
      category: 'Quiz',
      action: 'Quiz Started',
      label: categoryId,
      value: 1,
      
      // Custom parameters passed directly
      // FIX: Use 'as any' to suppress the 'UaEventOptions' TypeScript error
      quiz_category_id: categoryId,
      user_id_hash: userId ? userId.substring(0, 8) : 'guest', 
    } as any); 
  }
  
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[GA Event] Quiz Started: Category=${categoryId}`);
  }
};

/**
 * Tracks a question being answered.
 * @param questionId The ID of the question.
 * @param isCorrect Whether the answer was correct.
 * @param userId The user ID (optional).
 */
export const trackQuestionAnswered = (questionId: string, isCorrect: boolean, userId: string) => {
  if (isGAInitialized()) {
    ReactGA.event({
      category: 'Question Answered',
      action: isCorrect ? 'Answer Correct' : 'Answer Incorrect',
      label: questionId,
      value: isCorrect ? 1 : 0,
      
      // FIX: Use 'as any'
      question_id: questionId,
      answer_result: isCorrect ? 'correct' : 'incorrect',
      user_id_hash: userId ? userId.substring(0, 8) : 'guest',
    } as any);
  }
  
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[GA Event] Question Answered: Result=${isCorrect ? 'Correct' : 'Incorrect'}, QID=${questionId}`);
  }
};

/**
 * Tracks the completion of a quiz session.
 * @param categoryId The ID of the quiz category.
 * @param score The final score (number of correct answers).
 * @param userId The user ID (optional).
 */
export const trackQuizComplete = (categoryId: string, score: number, userId: string) => {
  if (isGAInitialized()) {
    ReactGA.event({
      category: 'Quiz',
      action: 'Quiz Completed',
      label: categoryId,
      value: score,
      
      // FIX: Use 'as any'
      quiz_category_id: categoryId,
      final_score: score,
      user_id_hash: userId ? userId.substring(0, 8) : 'guest',
    } as any);
  }
  
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[GA Event] Quiz Completed: Category=${categoryId}, Score=${score}`);
  }
};

// --- Feedback and Reporting Functions ---

/**
 * Tracks question feedback (popularity update: Thumbs Up/Down).
 * @param questionId The ID of the question.
 * @param feedbackType 'up' for thumbs up, 'down' for thumbs down.
 * @param userId The user ID (optional).
 */
export const trackFeedback = (questionId: string, feedbackType: 'up' | 'down', userId: string) => {
  if (isGAInitialized()) {
    ReactGA.event({
      category: 'Question Feedback',
      action: feedbackType === 'up' ? 'Thumbs Up' : 'Thumbs Down',
      label: questionId,
      
      // FIX: Use 'as any'
      question_id: questionId,
      feedback_type: feedbackType,
      user_id_hash: userId ? userId.substring(0, 8) : 'guest',
    } as any);
  }
  
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[GA Event] Feedback: Type=${feedbackType}, QID=${questionId}`);
  }
};

/**
 * Tracks a question report submission.
 * @param questionId The ID of the question.
 * @param reason The primary reason for the report.
 * @param userId The user ID (optional).
 */
export const trackReport = (questionId: string, reason: string, userId: string) => {
  if (isGAInitialized()) {
    ReactGA.event({
      category: 'Question Report',
      action: 'Report Submitted', 
      label: reason,
      
      // FIX: Use 'as any'
      question_id: questionId,
      report_reason: reason,
      user_id_hash: userId ? userId.substring(0, 8) : 'guest',
    } as any);
  }
  
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[GA Event] Report Submitted: Reason=${reason}, QID=${questionId}`);
  }
};

// --- Other General Tracking Functions ---

/**
 * Tracks user login event.
 * @param method The login method (e.g., 'email', 'google').
 * @param userId The user ID (optional).
 */
export const trackLogin = (method: string, userId: string) => {
  if (isGAInitialized()) {
    ReactGA.event({
      category: 'User Authentication',
      action: 'Login Successful',
      label: method,
      
      // FIX: Use 'as any'
      login_method: method,
      user_id_hash: userId ? userId.substring(0, 8) : 'guest',
    } as any);
  }
  
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[GA Event] User Logged In: Method=${method}`);
  }
};

/**
 * Tracks user signup/registration event.
 * @param userId The user ID (optional).
 */
export const trackSignup = (userId: string) => {
  if (isGAInitialized()) {
    ReactGA.event({
      category: 'User Authentication',
      action: 'Signup Successful',
      
      // FIX: Use 'as any'
      user_id_hash: userId ? userId.substring(0, 8) : 'guest',
    } as any);
  }
  
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[GA Event] User Signed Up`);
  }
};

/**
 * Tracks a purchase in the store.
 * @param itemName The name of the item purchased.
 * @param price The price (value) of the item.
 * @param currency The currency (e.g., 'USD', 'COINS').
 */
export const trackPurchase = (itemName: string, price: number, currency: string) => {
  if (isGAInitialized()) {
    ReactGA.event({
      category: 'Store',
      action: 'Item Purchased',
      label: itemName,
      value: price,
      
      // FIX: Use 'as any'
      item_name: itemName,
      purchase_currency: currency,
    } as any);
  }
  
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[GA Event] Store Purchase: Item=${itemName}, Price=${price} ${currency}`);
  }
};