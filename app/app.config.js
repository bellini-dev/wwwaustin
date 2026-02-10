import 'dotenv/config';

export default {
  expo: {
    name: 'wwwaustin',
    slug: 'wwwaustin',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'wwwaustin',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.bellini.dev.wwwaustin',
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSCalendarsUsageDescription: 'Allow wwwaustin to add events to your calendar.',
        NSRemindersUsageDescription: 'Allow wwwaustin to add reminders (optional).',
        UIBackgroundModes: ['remote-notification'],
      },
      appleTeamId: '29D4TTNP95',
      newArchEnabled: true,
      entitlements: {
        "aps-environment": "development"
      }
    },
    android: {
      adaptiveIcon: {
        backgroundColor: '#0066FF',
        foregroundImage: './assets/images/android-icon-foreground.png',
        backgroundImage: './assets/images/android-icon-background.png',
        monochromeImage: './assets/images/android-icon-monochrome.png',
      },
      config: {
        googleMaps: {
          apiKey: 'AIzaSyCacmsVoI8OtVwSrBgBfvv9PRktJMzcGpQ',
        },
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: 'com.bellini.dev.wwwaustin',
      permissions: ['READ_CALENDAR', 'WRITE_CALENDAR'],
    },
    web: {
      output: 'static',
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      'expo-router',
      'expo-image-picker',
      'expo-calendar',
      './plugins/withGoogleMapsApiKey.js',
      [
        'expo-splash-screen',
        {
          image: './assets/images/splash-icon.png',
          imageWidth: 200,
          resizeMode: 'contain',
          backgroundColor: '#F0F6FF',
          dark: {
            backgroundColor: '#0F172A',
          },
        },
      ],
      ['expo-notifications', {}],
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      apiUrl: process.env.EXPO_PUBLIC_API_URL,
      router: {},
      eas: {
        projectId: '323a8331-938d-42af-941b-81eba06c7ae2',
      },
    },
  },
};
