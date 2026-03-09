import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.emanual.app',
  appName: 'emanual',
  webDir: 'dist',
  server: {
    url: 'https://899c2177-f3cb-4399-b8c2-e639546f90c4.lovableproject.com?forceHideBadge=true',
    cleartext: true
  }
};

export default config;
