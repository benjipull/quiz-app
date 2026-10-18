import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Dimensions } from 'react-native';
import { useUser } from '@/src/contexts/UserContext';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import SplashScreen from '@/components/SplashScreen';
import { loadLevelConfig, resolveLevelProgress, type LevelConfigEntry } from '@/src/utils/levelConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiBaseUrl } from '@/src/utils/baseUrl';

interface SagaLevelData {
  sagaNumber: number;
  name: string;
  levels: Array<{
    level: number;
    stars: number;
  }>;
  isUnlocked: boolean;
  totalStars: number;
  maxStars: number;
  completedLevels: number;
  totalLevels: number;
}

const BASE_URL = getApiBaseUrl();
const { width: screenWidth } = Dimensions.get('window');

const SagaMapScreen = () => {
  const { user, loading: userLoading } = useUser();
  const router = useRouter();
  const [dataLoaded, setDataLoaded] = useState(false);
  const [sagaData, setSagaData] = useState<SagaLevelData[]>([]);
  const [levelConfig, setLevelConfig] = useState<LevelConfigEntry[]>([]);
  const [isLoadingSagas, setIsLoadingSagas] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSagaNumber, setCurrentSagaNumber] = useState(1);
  const [completedInCurrent, setCompletedInCurrent] = useState(0);
  const [levelsPerSaga, setLevelsPerSaga] = useState(6);

  const fetchSagaProgress = async () => {
    if (!user?._id) return;

    try {
      setError(null);
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        setError('Not authenticated');
        return;
      }

      const response = await fetch(`${BASE_URL}/api/saga/progression`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to load saga progress: ${response.status}`);
      }

      const data = await response.json();
      console.log('📊 Saga progression data:', JSON.stringify(data, null, 2));

      const currentSaga = data.sagaNumber || 1;
      const completed = data.completedLevelsInCurrentSaga || 0;
      const perSaga = data.levelsPerSaga || 6;

      setCurrentSagaNumber(currentSaga);
      setCompletedInCurrent(completed);
      setLevelsPerSaga(perSaga);

      // Build saga list
      const sagaList: SagaLevelData[] = [];

      // Process existing sagas from API
      if (data.sagas && Array.isArray(data.sagas)) {
        data.sagas.forEach((saga: any) => {
          const completedLevels = saga.sagaLevels?.filter((level: any) => level.isCompleted).length || 0;
          const totalLevels = saga.sagaLevels?.length || 0;
          const maxStars = totalLevels * 3;
          const totalStars = saga.sagaLevels?.reduce((sum: number, level: any) =>
            sum + (level.completionRating || 0), 0) || 0;

          sagaList.push({
            sagaNumber: saga.sagaNumber,
            name: `Saga ${saga.sagaNumber}`,
            levels: saga.sagaLevels?.map((level: any) => ({
              level: level._id,
              stars: level.completionRating || 0,
            })) || [],
            isUnlocked: saga.sagaNumber <= currentSaga,
            totalStars,
            maxStars,
            completedLevels,
            totalLevels,
          });
        });
      }

      // Add current saga if not in list
      if (!sagaList.find(s => s.sagaNumber === currentSaga)) {
        sagaList.push({
          sagaNumber: currentSaga,
          name: `Saga ${currentSaga}`,
          levels: [],
          isUnlocked: true,
          totalStars: 0,
          maxStars: perSaga * 3,
          completedLevels: 0,
          totalLevels: 0,
        });
      }

      // Add upcoming locked sagas
      for (let i = 1; i <= 5; i++) {
        const nextSaga = currentSaga + i;
        if (!sagaList.find(s => s.sagaNumber === nextSaga)) {
          sagaList.push({
            sagaNumber: nextSaga,
            name: `Saga ${nextSaga}`,
            levels: [],
            isUnlocked: false,
            totalStars: 0,
            maxStars: perSaga * 3,
            completedLevels: 0,
            totalLevels: 0,
          });
        }
      }

      sagaList.sort((a, b) => a.sagaNumber - b.sagaNumber);

      console.log('🎮 Transformed saga list:', sagaList);
      setSagaData(sagaList);
    } catch (err) {
      console.error('Error fetching saga progress:', err);
      setError('Failed to load saga data');
    } finally {
      setIsLoadingSagas(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchSagaProgress();
    setRefreshing(false);
  };

  const handleSagaPress = (saga: SagaLevelData) => {
    if (!saga.isUnlocked) {
      return;
    }
    // Navigate to saga level detail screen
    router.push(`/saga-level/${saga.sagaNumber}` as any);
  };

  useEffect(() => {
    if (!userLoading) {
      if (user) {
        Promise.all([
          loadLevelConfig().then(config => setLevelConfig(config)),
          fetchSagaProgress(),
        ]).then(() => {
          setTimeout(() => setDataLoaded(true), 500);
        }).catch(err => {
          console.error('Error loading initial data:', err);
          setDataLoaded(true);
        });
      } else {
        setDataLoaded(true);
        setIsLoadingSagas(false);
      }
    }
  }, [userLoading, user?._id]);

  if (userLoading || !dataLoaded) {
    return <SplashScreen dataLoaded={dataLoaded} />;
  }

  if (!user) {
    return (
      <View className="flex-1 bg-background items-center justify-center p-6">
        <Text className="text-white text-xl">Please log in to view your progress</Text>
      </View>
    );
  }

  const levelProgress = levelConfig.length > 0
    ? resolveLevelProgress(user.knowledgePoints || 0, levelConfig)
    : null;

  const progressToNextSaga = levelsPerSaga > 0
    ? Math.min(100, (completedInCurrent / levelsPerSaga) * 100)
    : 0;

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ad7dff" />
        }
      >
        {/* Header Stats */}
        <View className="p-6 pt-16">
          <Text className="text-white text-3xl font-black mb-2">Saga Map</Text>
          <Text className="text-purple-300 text-lg mb-6">Choose your adventure, {user.alias}!</Text>

          {/* User Stats Card */}
          <View className="bg-gradient-to-br from-purple-900/40 to-blue-900/40 rounded-3xl p-6 mb-6 border border-purple-500/30">
            <View className="flex-row justify-between mb-4">
              <View>
                <Text className="text-purple-300 text-sm mb-1">Knowledge Points</Text>
                <Text className="text-white text-3xl font-black">{user.knowledgePoints || 0}</Text>
              </View>
              {levelProgress && (
                <View className="items-end">
                  <Text className="text-purple-300 text-sm mb-1">Level</Text>
                  <Text className="text-white text-3xl font-black">{levelProgress.currentLevel}</Text>
                </View>
              )}
            </View>

            {levelProgress && !levelProgress.isMaxLevel && (
              <View>
                <View className="flex-row justify-between mb-2">
                  <Text className="text-gray-400 text-xs">Next Level: {levelProgress.nextLevel}</Text>
                  <Text className="text-purple-300 text-xs font-bold">
                    {levelProgress.remainingKpToNextLevel} KP needed
                  </Text>
                </View>
                <View className="h-2 bg-gray-700/50 rounded-full overflow-hidden">
                  <View
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                    style={{
                      width: `${levelProgress.progressToNextLevel > 0
                        ? (levelProgress.progressIntoLevel / levelProgress.progressToNextLevel) * 100
                        : 0}%`
                    }}
                  />
                </View>
              </View>
            )}
          </View>

          {/* Current Saga Progress */}
          <View className="bg-purple-600/20 rounded-2xl p-4 mb-6 border border-purple-500/40">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-white font-bold text-lg">Current: Saga {currentSagaNumber}</Text>
              <Text className="text-purple-300 font-bold">{completedInCurrent}/{levelsPerSaga}</Text>
            </View>
            <View className="h-3 bg-gray-700/50 rounded-full overflow-hidden">
              <View
                className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
                style={{ width: `${progressToNextSaga}%` }}
              />
            </View>
            <Text className="text-gray-400 text-xs mt-1">
              {completedInCurrent >= levelsPerSaga
                ? 'Saga Complete! Next saga unlocked!'
                : `${levelsPerSaga - completedInCurrent} levels to unlock next saga`}
            </Text>
          </View>

          {/* Saga List */}
          {error && (
            <View className="bg-red-500/20 border border-red-500/50 rounded-2xl p-4 mb-4">
              <Text className="text-red-300 text-center">{error}</Text>
            </View>
          )}

          {isLoadingSagas ? (
            <View className="items-center py-12">
              <ActivityIndicator size="large" color="#ad7dff" />
              <Text className="text-gray-400 mt-4">Loading saga map...</Text>
            </View>
          ) : sagaData.length === 0 ? (
            <View className="bg-quiz-background rounded-3xl p-8 border border-white/10">
              <Text className="text-gray-400 text-center text-lg">
                No saga data available. Start your journey!
              </Text>
            </View>
          ) : (
            <View className="space-y-4">
              {sagaData.map((saga, index) => {
                const isActive = saga.sagaNumber === currentSagaNumber;
                const progress = saga.totalLevels > 0
                  ? (saga.completedLevels / saga.totalLevels) * 100
                  : 0;

                return (
                  <TouchableOpacity
                    key={saga.sagaNumber}
                    onPress={() => handleSagaPress(saga)}
                    disabled={!saga.isUnlocked}
                    activeOpacity={0.7}
                  >
                    <View
                      className={`rounded-3xl p-6 border-2 ${
                        saga.isUnlocked
                          ? isActive
                            ? 'bg-purple-600/30 border-purple-400'
                            : 'bg-quiz-background border-purple-500/30'
                          : 'bg-gray-800/20 border-gray-700/30'
                      }`}
                      style={{
                        shadowColor: saga.isUnlocked ? '#a855f7' : '#000',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: saga.isUnlocked ? 0.3 : 0.1,
                        shadowRadius: 8,
                        elevation: saga.isUnlocked ? 8 : 2,
                      }}
                    >
                      {/* Saga Header */}
                      <View className="flex-row items-center justify-between mb-4">
                        <View className="flex-row items-center flex-1">
                          {/* Saga Number Badge */}
                          <View
                            className={`h-16 w-16 rounded-full items-center justify-center mr-4 ${
                              saga.isUnlocked
                                ? isActive
                                  ? 'bg-purple-500'
                                  : 'bg-purple-600'
                                : 'bg-gray-600'
                            }`}
                            style={{
                              shadowColor: saga.isUnlocked ? '#a855f7' : '#000',
                              shadowOffset: { width: 0, height: 2 },
                              shadowOpacity: 0.5,
                              shadowRadius: 4,
                              elevation: 4,
                            }}
                          >
                            <Text className="text-white text-2xl font-black">{saga.sagaNumber}</Text>
                          </View>

                          <View className="flex-1">
                            <Text
                              className={`text-xl font-black mb-1 ${
                                saga.isUnlocked ? 'text-white' : 'text-gray-500'
                              }`}
                            >
                              {saga.name}
                            </Text>
                            {saga.isUnlocked && saga.totalLevels > 0 && (
                              <Text className="text-gray-400 text-sm">
                                {saga.completedLevels}/{saga.totalLevels} completed
                              </Text>
                            )}
                            {!saga.isUnlocked && (
                              <Text className="text-gray-500 text-sm">Locked</Text>
                            )}
                          </View>
                        </View>

                        {/* Stars/Status */}
                        {saga.isUnlocked ? (
                          <View className="items-end">
                            <View className="flex-row items-center mb-1">
                              <Text className="text-yellow-400 text-2xl mr-1">★</Text>
                              <Text className="text-white text-lg font-bold">
                                {saga.totalStars}
                              </Text>
                            </View>
                            {isActive && (
                              <View className="bg-purple-500 px-2 py-1 rounded-full">
                                <Text className="text-white text-xs font-bold">ACTIVE</Text>
                              </View>
                            )}
                          </View>
                        ) : (
                          <View className="bg-gray-700/50 px-3 py-1 rounded-full">
                            <Text className="text-gray-500 text-xs font-bold">🔒 LOCKED</Text>
                          </View>
                        )}
                      </View>

                      {/* Progress Bar */}
                      {saga.isUnlocked && saga.totalLevels > 0 && (
                        <View>
                          <View className="h-2 bg-gray-700/50 rounded-full overflow-hidden mb-2">
                            <View
                              className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                              style={{ width: `${progress}%` }}
                            />
                          </View>
                        </View>
                      )}

                      {/* Call to Action */}
                      {saga.isUnlocked && (
                        <View className="mt-3 pt-3 border-t border-white/10">
                          <Text className="text-purple-300 text-sm font-semibold text-center">
                            {isActive
                              ? '▶ Continue Your Journey'
                              : saga.completedLevels === saga.totalLevels && saga.totalLevels > 0
                              ? '✓ Saga Completed'
                              : '▶ Start This Saga'}
                          </Text>
                        </View>
                      )}

                      {!saga.isUnlocked && (
                        <View className="mt-3 pt-3 border-t border-gray-700/30">
                          <Text className="text-gray-500 text-xs text-center">
                            Complete more levels to unlock
                          </Text>
                        </View>
                      )}
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

export default SagaMapScreen;
