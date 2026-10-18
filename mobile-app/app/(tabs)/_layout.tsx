import { Tabs } from 'expo-router';
import { User, Info, Home, BarChart3, Grid3X3 } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#ad7dff',
        tabBarInactiveTintColor: '#b4c7f3',
        tabBarStyle: {
          backgroundColor: '#15295a',
          borderTopWidth: 0,
          height: 80,
          paddingBottom: 20,
        },
        headerShown: false,
      }}>
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <User color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="about"
        options={{
          title: 'About',
          tabBarIcon: ({ color }) => <Info color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Home color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: 'Leaders',
          tabBarIcon: ({ color }) => <BarChart3 color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="quizzes"
        options={{
          title: 'Quizzes',
          tabBarIcon: ({ color }) => <Grid3X3 color={color} size={24} />,
        }}
      />
    </Tabs>
  );
}
