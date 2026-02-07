import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.kosodate.nikki',
  appName: '子育て日記',
  webDir: 'out',
  server: {
    androidScheme: 'https',
  },
  ios: {
    contentInset: 'automatic',
    scheme: 'Kosodate Nikki',
  },
}

export default config
