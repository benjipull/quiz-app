import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Image, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useUser } from '@/src/contexts/UserContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiBaseUrl } from '@/src/utils/baseUrl';
import { ArrowLeft, Star, Lock } from 'lucide-react-native';

interface SagaLevelCategory {
  _id: string;
  name?: string;
  image64?: string;
  disabled?: boolean;
}

interface SagaLevelRow {
  _id: string;
  sagaNumber: number;
  isCompleted?: boolean;
  completionRating?: number;
  category: SagaLevelCategory | null;
}

const BASE_URL = getApiBaseUrl();
const QUIZ_COST = 100;
const DEFAULT_CATEGORY_IMAGE = require('@/assets/images/icon.png');
const { width: screenWidth } = Dimensions.get('window');
const cardWidth = (screenWidth - 48) / 2; // 2 columns with padding

const SagaLevelScreen = () => {
  const { sagaNumber } = useLocalSearchParams<{ sagaNumber: string }>();
  const router = useRouter();
  const { user, updateUserLocally } = useUser();

  const [rows, setRows] = useState<SagaLevelRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categoryImages, setCategoryImages] = useState<Record<string, string>>({});

  const sagaNum = parseInt(sagaNumber || '1', 10);

  const fetchSagaLevel = async (shouldBootstrap = false) => {
    try {
      setError(null);
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        setError('Not authenticated');
        return;
      }

      const endpoint = shouldBootstrap
        ? `${BASE_URL}/api/saga/levels/${sagaNum}/bootstrap`
        : `${BASE_URL}/api/saga/levels/${sagaNum}`;

      console.log(`📡 Fetching saga level ${sagaNum} from ${endpoint}`);

      const response = await fetch(endpoint, {
        method: shouldBootstrap ? 'POST' : 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to load saga level: ${response.status}`);
      }

      const data = await response.json();
      console.log('📊 Saga level data:', data);

      if (data.rows && Array.isArray(data.rows)) {
        setRows(data.rows);

        // Extract category IDs to fetch their details
        const categoryIds = data.rows
          .map((row: SagaLevelRow) => row.category?._id)
          .filter(Boolean);

        if (categoryIds.length > 0) {
          await fetchCategoryDetails(categoryIds, token);
        }
      }
    } catch (err) {
      console.error('Error fetching saga level:', err);
      setError('Failed to load saga level data');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategoryDetails = async (categoryIds: string[], token: string) => {
    try {
      const idsQuery = categoryIds.join(',');
      const response = await fetch(`${BASE_URL}/api/saga/categories?ids=${idsQuery}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📦 Category details:', data);

        if (data.categories && Array.isArray(data.categories)) {
          const imageMap: Record<string, string> = {};
          data.categories.forEach((cat: any) => {
            if (cat._id && cat.image64) {
              imageMap[cat._id] = cat.image64;
            }
            // Update rows with full category data
            setRows(prevRows =>
              prevRows.map(row => {
                if (row.category?._id === cat._id) {
                  return {
                    ...row,
                    category: {
                      ...row.category,
                      name: cat.name,
                      image64: cat.image64,
                      disabled: cat.disabled,
                    },
                  };
                }
                return row;
              })
            );
          });
          setCategoryImages(imageMap);
        }
      }
    } catch (err) {
      console.error('Error fetching category details:', err);
    }
  };

  const handleCategoryPress = async (row: SagaLevelRow) => {
    if (!row.category?._id) return;

    // Check if user has enough coins
    if ((user?.coins || 0) < QUIZ_COST) {
      setError(`You need ${QUIZ_COST} coins to play. You have ${user?.coins || 0} coins.`);
      return;
    }

    // Deduct coins locally (optimistic update)
    if (user) {
      updateUserLocally({ coins: (user.coins || 0) - QUIZ_COST });
    }

    // Navigate to quiz screen with category and saga level info
    router.push({
      pathname: '/quiz',
      params: {
        categoryId: row.category._id,
        categoryName: row.category.name || 'Quiz',
        sagaNumber: sagaNum.toString(),
        sagaLevelId: row._id,
      },
    } as any);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchSagaLevel(false);
    setRefreshing(false);
  };

  useEffect(() => {
    // Try to bootstrap the saga level (creates levels if needed)
    fetchSagaLevel(true);
  }, [sagaNum]);

  if (isLoading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#ad7dff" />
        <Text className="text-gray-400 mt-4">Loading Saga {sagaNum}...</Text>
      </View>
    );
  }

  const completedCount = rows.filter(row => row.isCompleted).length;
  const totalStars = rows.reduce((sum, row) => sum + (row.completionRating || 0), 0);
  const maxStars = rows.length * 3;
  const progress = rows.length > 0 ? (completedCount / rows.length) * 100 : 0;

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ad7dff" />
        }
      >
        {/* Header */}
        <View className="p-6 pt-16">
          <TouchableOpacity
            onPress={() => router.back()}
            className="flex-row items-center mb-4"
          >
            <ArrowLeft color="#ad7dff" size={24} />
            <Text className="text-purple-400 text-lg ml-2 font-semibold">Back to Saga Map</Text>
          </TouchableOpacity>

          <Text className="text-white text-4xl font-black mb-2">Saga {sagaNum}</Text>
          <Text className="text-purple-300 text-lg mb-6">Complete all levels to unlock the next saga!</Text>

          {/* Progress Card */}
          <View className="bg-purple-600/20 rounded-3xl p-6 mb-6 border border-purple-500/40">
            <View className="flex-row justify-between mb-4">
              <View>
                <Text className="text-gray-400 text-sm mb-1">Progress</Text>
                <Text className="text-white text-2xl font-black">{completedCount}/{rows.length}</Text>
              </View>
              <View className="items-end">
                <Text className="text-gray-400 text-sm mb-1">Stars Earned</Text>
                <View className="flex-row items-center">
                  <Star color="#fbbf24" fill="#fbbf24" size={20} />
                  <Text className="text-white text-2xl font-black ml-1">{totalStars}/{maxStars}</Text>
                </View>
              </View>
            </View>

            <View className="h-3 bg-gray-700/50 rounded-full overflow-hidden">
              <View
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                style={{ width: `${progress}%` }}
              />
            </View>

            <View className="flex-row justify-between mt-3">
              <Text className="text-gray-400 text-xs">
                {rows.length - completedCount} levels remaining
              </Text>
              <Text className="text-purple-300 text-xs font-bold">
                {QUIZ_COST} coins per quiz
              </Text>
            </View>
          </View>

          {/* User Coins */}
          <View className="bg-quiz-background rounded-2xl p-4 mb-6 border border-white/10 flex-row items-center justify-between">
            <Text className="text-gray-400 text-base">Your Coins</Text>
            <Text className="text-yellow-400 text-2xl font-black">{user?.coins || 0}</Text>
          </View>

          {/* Error Message */}
          {error && (
            <View className="bg-red-500/20 border border-red-500/50 rounded-2xl p-4 mb-4">
              <Text className="text-red-300 text-center">{error}</Text>
            </View>
          )}

          {/* Category Grid */}
          {rows.length === 0 ? (
            <View className="bg-quiz-background rounded-3xl p-8 border border-white/10">
              <Text className="text-gray-400 text-center text-lg">
                No levels available for this saga yet.
              </Text>
            </View>
          ) : (
            <View className="flex-row flex-wrap justify-between">
              {rows.map((row, index) => {
                const stars = row.completionRating || 0;
                const isCompleted = row.isCompleted || false;
                const hasImage = !!row.category?.image64;

                return (
                  <TouchableOpacity
                    key={row._id}
                    onPress={() => handleCategoryPress(row)}
                    activeOpacity={0.8}
                    className="mb-4"
                    style={{ width: cardWidth }}
                  >
                    <View
                      className={`rounded-3xl overflow-hidden border-2 ${
                        isCompleted
                          ? 'border-green-500/50'
                          : 'border-purple-500/30'
                      }`}
                      style={{
                        shadowColor: isCompleted ? '#22c55e' : '#a855f7',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.3,
                        shadowRadius: 8,
                        elevation: 5,
                      }}
                    >
                      {/* Category Image */}
                      <View className="h-32 bg-quiz-background items-center justify-center relative">
                        {hasImage ? (
                          <Image
                            source={{ uri: row.category.image64 }}
                            className="w-full h-full"
                            resizeMode="cover"
                            onError={(e) => {
                              console.log(`Failed to load image for ${row.category?.name}:`, e.nativeEvent.error);
                            }}
                          />
                        ) : (
                          <Image
                            source={DEFAULT_CATEGORY_IMAGE}
                            className="w-20 h-20"
                            resizeMode="contain"
                          />
                        )}
                        {isCompleted && (
                          <View className="absolute top-2 right-2 bg-green-500 rounded-full p-2">
                            <Text className="text-white text-xs font-bold">✓</Text>
                          </View>
                        )}
                        {/* Level number badge */}
                        <View className="absolute top-2 left-2 bg-purple-600/90 rounded-full px-2 py-1">
                          <Text className="text-white text-xs font-bold">{index + 1}</Text>
                        </View>
                      </View>

                      {/* Category Info */}
                      <View className="bg-quiz-background p-3">
                        <Text
                          className="text-white font-bold text-sm mb-2"
                          numberOfLines={2}
                        >
                          {row.category?.name || `Level ${index + 1}`}
                        </Text>

                        {/* Stars */}
                        <View className="flex-row items-center mb-2">
                          {[1, 2, 3].map(star => (
                            <Star
                              key={star}
                              size={16}
                              color={star <= stars ? '#fbbf24' : '#4b5563'}
                              fill={star <= stars ? '#fbbf24' : 'transparent'}
                              style={{ marginRight: 2 }}
                            />
                          ))}
                        </View>

                        {/* Status */}
                        <View className="flex-row items-center justify-between">
                          {isCompleted ? (
                            <Text className="text-green-400 text-xs font-semibold">
                              Completed
                            </Text>
                          ) : (
                            <Text className="text-purple-300 text-xs font-semibold">
                              {QUIZ_COST} coins
                            </Text>
                          )}
                          <Text className="text-gray-400 text-xs">
                            {isCompleted ? 'Play Again' : 'Start'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

export default SagaLevelScreen;
