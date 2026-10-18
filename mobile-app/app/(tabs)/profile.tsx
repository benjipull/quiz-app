import React from 'react';
import { View, Text, ScrollView, Image } from 'react-native';
import { useUser } from '@/src/contexts/UserContext';

const ProfileScreen = () => {
  const { user } = useUser();

  return (
    <View className="flex-1 bg-background p-6 pt-20">
      <View className="items-center mb-8">
        <View className="h-32 w-32 rounded-full bg-purple-600 items-center justify-center border-4 border-purple-400">
          <Text className="text-white text-4xl font-black">{user?.alias?.[0] || 'U'}</Text>
        </View>
        <Text className="text-white text-2xl font-bold mt-4">{user?.alias || 'Player'}</Text>
        <Text className="text-purple-300 text-lg">Level {user?.level || 1}</Text>
      </View>

      <View className="bg-quiz-background rounded-3xl p-6 border border-white/10">
        <View className="flex-row justify-between mb-4 border-b border-white/5 pb-4">
          <Text className="text-gray-400 text-lg">Knowledge Points</Text>
          <Text className="text-white text-lg font-bold">{user?.knowledgePoints || 0}</Text>
        </View>
        <View className="flex-row justify-between mb-4 border-b border-white/5 pb-4">
          <Text className="text-gray-400 text-lg">Coins</Text>
          <Text className="text-yellow-400 text-lg font-bold">{user?.coins || 0}</Text>
        </View>
        <View className="flex-row justify-between">
          <Text className="text-gray-400 text-lg">User Type</Text>
          <Text className="text-white text-lg font-bold">{user?.userType || 'Guest'}</Text>
        </View>
      </View>
    </View>
  );
};

export default ProfileScreen;
