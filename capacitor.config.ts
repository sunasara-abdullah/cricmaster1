import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.abdullah.cricmaster',
  appName: 'CricMaster Pro',
  webDir: 'dist/client',

  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 2000,
      showSpinner: false,
      backgroundColor: '#07111F'
    }
  }
};

export default config;