import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.abdullah.cricmaster',
  appName: 'Playnivo',
  webDir: 'dist/client',

  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 0,
      showSpinner: false,
      backgroundColor: '#07111F'
    }
  }
};

export default config;