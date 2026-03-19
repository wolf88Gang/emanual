import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.homeguide.app',
  appName: 'HomeGuide',
  webDir: 'dist',
  server: {
    // Using your official domain
    url: 'https://homeguide.casa',
    cleartext: true
  }
};

export default config;
