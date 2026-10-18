import React from 'react';
import { View, Text, ScrollView } from 'react-native';

const LeaderboardScreen = () => {
  return (
    <View className="flex-1 bg-background p-6 pt-20">
      <Text className="text-white text-3xl font-bold mb-6">Leaderboard</Text>
      <ScrollView>
        <View className="bg-quiz-background rounded-3xl p-6 border border-white/10">
          <Text className="text-gray-400 text-center text-lg">
            Leaderboard coming soon...
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

export default LeaderboardScreen;
