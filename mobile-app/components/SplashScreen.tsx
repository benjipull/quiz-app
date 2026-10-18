import React, { useEffect } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence } from 'react-native-reanimated';

interface SplashScreenProps {
  dataLoaded: boolean;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ dataLoaded }) => {
  const scale = useSharedValue(0.95);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500 }),
        withTiming(0.95, { duration: 1500 })
      ),
      -1
    );
    opacity.value = withTiming(1, { duration: 1000 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <View className="flex-1 bg-background justify-center items-center">
      {/* Background Gradients (simplified for native) */}
      <View className="absolute inset-0 opacity-10 bg-purple-500/20" />
      
      <View className="flex flex-col items-center space-y-8 relative z-10">
        <Animated.Image 
          source={require('../assets/images/QuizicleLogo.png')} 
          style={[styles.logo, animatedStyle]} 
        />

        <View className="flex flex-col items-center space-y-6 mt-10">
          <View className="text-center">
            <Text className="text-white text-xl font-bold tracking-wide">
              {dataLoaded ? "Ready to Play!" : "Powering Up..."}
            </Text>
            <Text className="text-gray-400 text-sm font-medium text-center mt-2">
              {dataLoaded ? "Starting your quiz experience" : "Loading your gaming experience"}
            </Text>
          </View>

          <View className="w-64 h-1 bg-gray-700 rounded-full overflow-hidden mt-6">
            <Animated.View 
               className="h-full bg-purple-500"
               style={{ width: dataLoaded ? '100%' : '75%' }}
            />
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  logo: { width: 250, height: 250, resizeMode: 'contain' }
});

export default SplashScreen;
