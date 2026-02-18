import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.kosodate.nikki',
  appName: '子育て日記',
  webDir: 'out',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
  },
  ios: {
    contentInset: 'automatic',
    scheme: 'Kosodate Nikki',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 2000,
      launchFadeOutDuration: 300,
      backgroundColor: '#F7EBDB',
      showSpinner: false,
      splashImmersive: true,
      splashFullScreen: true,
    },
  },
}

export default config
