import React from 'react';
import { View, Text, ScrollView } from 'react-native';

const AboutScreen = () => {
  return (
    <View className="flex-1 bg-background p-6 pt-20">
      <Text className="text-white text-3xl font-bold mb-6">About Quizicle</Text>
      <ScrollView>
        <View className="bg-quiz-background rounded-3xl p-6 border border-white/10">
          <Text className="text-white text-lg leading-7">
            Quizicle is a fun and engaging quiz application that helps you test your knowledge across various topics.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

export default AboutScreen;
