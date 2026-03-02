import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.quizicle.app',
  appName: 'Quizicle',
  webDir: 'dist',
  plugins: {
    StatusBar: {
      overlay: true,
      style: 'DARK',
      backgroundColor: '#000000'
    }
  }
};

export default config;