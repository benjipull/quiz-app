import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, ScrollView, Image, ActivityIndicator, Animated, Dimensions } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Flag, ThumbsUp, ThumbsDown, X, Star, Award } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiBaseUrl } from '@/src/utils/baseUrl';
import { useUser } from '@/src/contexts/UserContext';

const BASE_URL = getApiBaseUrl();
const { width: screenWidth } = Dimensions.get('window');

interface Question {
  _id: string;
  question: string;
  image64?: string;
  answers: string[];
  shuffledAnswers?: string[];
  correct_answer: string;
  explanation: string;
  difficulty?: string;
  timerInSeconds?: number;
}

interface AnswerStat {
  text: string;
  percentage: number;
}

interface AnswerResponse {
  question: string;
  correctAnswer: string;
  explanation: string;
  isCorrect: boolean;
  answerStats: AnswerStat[];
  earnedItems: any[];
  remaining: number;
}

const shuffleArray = <T,>(items: T[]): T[] => {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const QuizScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{
    categoryId: string;
    categoryName?: string;
    sagaNumber?: string;
    sagaLevelId?: string;
  }>();
  const { user, updateUserLocally, refreshUser } = useUser();

  // Quiz state
  const [started, setStarted] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState<Question | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(10);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [incorrectAnswers, setIncorrectAnswers] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Answer state
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [answerResponse, setAnswerResponse] = useState<AnswerResponse | null>(null);
  const [showBars, setShowBars] = useState(false);

  // Timer state
  const [timeLeft, setTimeLeft] = useState(30);
  const [timeUp, setTimeUp] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Feedback state
  const [feedbackGiven, setFeedbackGiven] = useState(false);
  const [feedbackType, setFeedbackType] = useState<'up' | 'down' | null>(null);

  // Results state
  const [results, setResults] = useState<any>(null);

  // Animations
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const categoryId = params.categoryId;
  const categoryName = params.categoryName || 'Quiz';
  const sagaNumber = params.sagaNumber;
  const sagaLevelId = params.sagaLevelId;

  useEffect(() => {
    initQuiz();
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const initQuiz = async () => {
    try {
      await startQuiz();
    } catch (err) {
      console.error('Failed to initialize quiz:', err);
      setError('Failed to start quiz');
      setLoading(false);
    }
  };

  const startQuiz = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }

      console.log(`🎮 Starting quiz for category ${categoryId}`);

      const startResponse = await fetch(`${BASE_URL}/api/startQuiz`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ categoryId, userToken: token }),
      });

      if (!startResponse.ok) {
        throw new Error(`Failed to start quiz: ${startResponse.status}`);
      }

      const startData = await startResponse.json();
      console.log('✅ Quiz started:', startData);

      if (startData.totalQuestions) {
        setTotalQuestions(startData.totalQuestions);
      }

      setStarted(true);
      await fetchNextQuestion();
    } catch (err) {
      console.error('Error starting quiz:', err);
      setError('Failed to start quiz');
      setLoading(false);
    }
  };

  const fetchNextQuestion = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${BASE_URL}/api/getQuestion/${token}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch question: ${response.status}`);
      }

      const data = await response.json();
      console.log('📝 Got question:', data);

      if (data.question) {
        const shuffledAnswers = shuffleArray([...data.question.answers]);
        const questionWithTimer = {
          ...data.question,
          shuffledAnswers,
          timerInSeconds: data.question.timerInSeconds || 30,
        };

        setQuestion(questionWithTimer);
        setTimeLeft(questionWithTimer.timerInSeconds);
        setCurrentQuestionIndex(prev => prev + 1);
        setSelectedAnswer(null);
        setShowExplanation(false);
        setAnswerResponse(null);
        setShowBars(false);
        setFeedbackGiven(false);
        setFeedbackType(null);
        setTimeUp(false);
        setLoading(false);

        // Start timer
        startTimer(questionWithTimer.timerInSeconds);
      } else {
        // No more questions - complete quiz
        await completeQuiz();
      }
    } catch (err) {
      console.error('Error fetching question:', err);
      setError('Failed to load question');
      setLoading(false);
    }
  };

  const startTimer = (seconds: number) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    setTimeLeft(seconds);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleTimeUp = () => {
    setTimeUp(true);
    submitAnswer('');
  };

  const submitAnswer = async (answer: string) => {
    if (!question) return;

    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    setSelectedAnswer(answer);
    const isCorrect = question.correct_answer === answer;

    if (isCorrect) {
      setCorrectAnswers(prev => prev + 1);
    } else {
      setIncorrectAnswers(prev => prev + 1);
    }

    // Build answer stats
    const answerStats: AnswerStat[] = (question.shuffledAnswers || question.answers).map(ans => ({
      text: ans,
      percentage: ans === question.correct_answer ? 100 : 0, // Simplified
    }));

    const response: AnswerResponse = {
      question: question.question,
      correctAnswer: question.correct_answer,
      explanation: question.explanation,
      isCorrect,
      answerStats,
      earnedItems: isCorrect ? ['⭐ Knowledge Point'] : [],
      remaining: totalQuestions - currentQuestionIndex,
    };

    setAnswerResponse(response);
    setShowExplanation(true);

    // Submit to backend
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        await fetch(`${BASE_URL}/api/answerQuestion/${token}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            questionId: question._id,
            selectedAnswer: answer,
          }),
        });
      }
    } catch (err) {
      console.error('Error submitting answer:', err);
    }

    // Show bars after delay
    setTimeout(() => {
      setShowBars(true);
    }, 300);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex >= totalQuestions) {
      completeQuiz();
    } else {
      fetchNextQuestion();
    }
  };

  const completeQuiz = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      console.log('🏁 Completing quiz...');

      const response = await fetch(`${BASE_URL}/api/completeQuiz/${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          categoryId,
          sagaLevelId: sagaLevelId || null,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to complete quiz: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Quiz completed:', data);

      setResults(data);
      setCompleted(true);

      // Refresh user data
      await refreshUser();
    } catch (err) {
      console.error('Error completing quiz:', err);
      setError('Failed to complete quiz');
    }
  };

  const handleAnswerPress = (answer: string) => {
    if (selectedAnswer || timeUp) return;

    // Animate selection
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    submitAnswer(answer);
  };

  const handleFeedback = async (type: 'up' | 'down') => {
    if (feedbackGiven || !question) return;

    setFeedbackType(type);
    setFeedbackGiven(true);

    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        await fetch(`${BASE_URL}/api/feedback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            questionId: question._id,
            feedbackType: type === 'up' ? 'positive' : 'negative',
          }),
        });
      }
    } catch (err) {
      console.error('Error submitting feedback:', err);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#ad7dff" />
        <Text className="text-gray-400 mt-4">Loading quiz...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center p-6">
        <Text className="text-red-400 text-xl mb-4">{error}</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="bg-purple-600 px-6 py-3 rounded-2xl"
        >
          <Text className="text-white font-bold">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (completed && results) {
    const stars = results.stars || 0;
    const knowledgeGained = results.knowledgePointsGained || 0;
    const coinsEarned = results.coinsEarned || 0;

    return (
      <SafeAreaView className="flex-1 bg-background">
        <ScrollView className="flex-1">
          <View className="p-6 items-center">
            {/* Header */}
            <Text className="text-white text-4xl font-black mt-8 mb-2">Quiz Complete!</Text>
            <Text className="text-purple-300 text-lg mb-8">Great job, {user?.alias}!</Text>

            {/* Stars */}
            <View className="flex-row mb-8">
              {[1, 2, 3].map(star => (
                <Star
                  key={star}
                  size={48}
                  color={star <= stars ? '#fbbf24' : '#4b5563'}
                  fill={star <= stars ? '#fbbf24' : 'transparent'}
                  style={{ marginHorizontal: 4 }}
                />
              ))}
            </View>

            {/* Score Card */}
            <View className="bg-quiz-background rounded-3xl p-6 w-full mb-6 border border-purple-500/30">
              <View className="flex-row justify-between mb-4">
                <Text className="text-gray-400">Correct Answers</Text>
                <Text className="text-green-400 text-xl font-bold">{correctAnswers}</Text>
              </View>
              <View className="flex-row justify-between mb-4">
                <Text className="text-gray-400">Incorrect Answers</Text>
                <Text className="text-red-400 text-xl font-bold">{incorrectAnswers}</Text>
              </View>
              <View className="flex-row justify-between mb-4">
                <Text className="text-gray-400">Accuracy</Text>
                <Text className="text-white text-xl font-bold">
                  {Math.round((correctAnswers / (correctAnswers + incorrectAnswers)) * 100)}%
                </Text>
              </View>
            </View>

            {/* Rewards */}
            <View className="bg-purple-600/20 rounded-3xl p-6 w-full mb-6 border border-purple-500/40">
              <Text className="text-white text-xl font-bold mb-4">Rewards Earned</Text>
              <View className="flex-row justify-between mb-3">
                <Text className="text-gray-400">Knowledge Points</Text>
                <Text className="text-purple-300 text-lg font-bold">+{knowledgeGained}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-gray-400">Coins</Text>
                <Text className="text-yellow-400 text-lg font-bold">+{coinsEarned}</Text>
              </View>
            </View>

            {/* Actions */}
            <TouchableOpacity
              onPress={() => {
                if (sagaNumber) {
                  router.push(`/saga-level/${sagaNumber}` as any);
                } else {
                  router.back();
                }
              }}
              className="bg-purple-600 px-8 py-4 rounded-2xl w-full mb-4"
            >
              <Text className="text-white text-center font-bold text-lg">
                {sagaNumber ? 'Back to Saga Level' : 'Continue'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/(tabs)/')}
              className="bg-quiz-background px-8 py-4 rounded-2xl w-full border border-white/10"
            >
              <Text className="text-white text-center font-semibold">Back to Saga Map</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!question) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#ad7dff" />
      </SafeAreaView>
    );
  }

  const answersToShow = question.shuffledAnswers || question.answers;

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="px-6 py-4 flex-row items-center justify-between border-b border-white/10">
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft color="#ad7dff" size={24} />
        </TouchableOpacity>
        <Text className="text-white font-bold text-lg">
          Question {currentQuestionIndex}/{totalQuestions}
        </Text>
        <TouchableOpacity>
          <Flag color="#ffffff" size={24} />
        </TouchableOpacity>
      </View>

      {/* Timer */}
      <View className="px-6 py-3">
        <View className="bg-quiz-background rounded-full p-3 flex-row items-center justify-center">
          <Text className={`text-xl font-black ${timeLeft <= 5 ? 'text-red-400' : 'text-white'}`}>
            {timeLeft}s
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-6">
        {/* Question */}
        <View className="bg-quiz-background p-6 rounded-3xl border border-purple-500/30 mb-6 mt-4">
          <Text className="text-white text-xl font-bold text-center">
            {question.question}
          </Text>
        </View>

        {/* Answers */}
        <View className="mb-6">
          {answersToShow.map((answer, index) => {
            const isSelected = selectedAnswer === answer;
            const isCorrect = question.correct_answer === answer;
            const showResult = showExplanation;

            let bgColor = 'bg-quiz-background';
            let borderColor = 'border-white/10';

            if (showResult) {
              if (isCorrect) {
                bgColor = 'bg-green-600/30';
                borderColor = 'border-green-500';
              } else if (isSelected && !isCorrect) {
                bgColor = 'bg-red-600/30';
                borderColor = 'border-red-500';
              }
            }

            return (
              <TouchableOpacity
                key={index}
                onPress={() => handleAnswerPress(answer)}
                disabled={showExplanation}
                className={`${bgColor} p-5 rounded-2xl border-2 ${borderColor} mb-3`}
                activeOpacity={0.7}
              >
                <Text className="text-white text-lg font-medium">{answer}</Text>
                {showBars && showResult && answerResponse && (
                  <View className="mt-2">
                    <View className="h-2 bg-gray-700/50 rounded-full overflow-hidden">
                      <View
                        className="h-full bg-purple-500"
                        style={{
                          width: `${
                            answerResponse.answerStats.find(s => s.text === answer)?.percentage || 0
                          }%`,
                        }}
                      />
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Explanation */}
        {showExplanation && answerResponse && (
          <View className="bg-purple-600/20 p-6 rounded-3xl border border-purple-500/40 mb-6">
            <View className="flex-row items-center mb-3">
              {answerResponse.isCorrect ? (
                <>
                  <Text className="text-green-400 text-2xl mr-2">✓</Text>
                  <Text className="text-green-400 text-xl font-bold">Correct!</Text>
                </>
              ) : (
                <>
                  <Text className="text-red-400 text-2xl mr-2">✗</Text>
                  <Text className="text-red-400 text-xl font-bold">Incorrect</Text>
                </>
              )}
            </View>
            <Text className="text-gray-400 text-sm mb-2">Correct Answer:</Text>
            <Text className="text-white font-bold text-lg mb-3">{answerResponse.correctAnswer}</Text>
            <Text className="text-gray-400 text-sm mb-2">Explanation:</Text>
            <Text className="text-white">{answerResponse.explanation}</Text>

            {/* Rewards */}
            {answerResponse.isCorrect && answerResponse.earnedItems.length > 0 && (
              <View className="mt-4 bg-green-600/20 p-3 rounded-2xl">
                <Text className="text-green-400 font-bold">
                  {answerResponse.earnedItems.join(', ')}
                </Text>
              </View>
            )}

            {/* Next Button */}
            <TouchableOpacity
              onPress={handleNextQuestion}
              className="mt-4 bg-purple-600 py-4 rounded-2xl"
            >
              <Text className="text-white text-center font-bold text-lg">
                {currentQuestionIndex >= totalQuestions ? 'See Results' : 'Next Question'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Feedback */}
      {showExplanation && (
        <View className="px-6 py-4 flex-row justify-around border-t border-white/10">
          <TouchableOpacity
            onPress={() => handleFeedback('up')}
            disabled={feedbackGiven}
            className="flex-row items-center"
          >
            <ThumbsUp
              color={feedbackType === 'up' ? '#4ade80' : '#9ca3af'}
              size={20}
            />
            <Text className={`ml-2 font-medium ${feedbackType === 'up' ? 'text-green-400' : 'text-gray-400'}`}>
              Like
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleFeedback('down')}
            disabled={feedbackGiven}
            className="flex-row items-center"
          >
            <ThumbsDown
              color={feedbackType === 'down' ? '#f87171' : '#9ca3af'}
              size={20}
            />
            <Text className={`ml-2 font-medium ${feedbackType === 'down' ? 'text-red-400' : 'text-gray-400'}`}>
              Dislike
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

export default QuizScreen;
