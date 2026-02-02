const { withAndroidManifest } = require('expo/config-plugins');

/**
 * Injects com.google.android.geo.API_KEY into AndroidManifest.xml so react-native-maps
 * can use the Google Maps API key. Expo does not add this automatically.
 */
function withGoogleMapsApiKey(config) {
  const apiKey = config.android?.config?.googleMaps?.apiKey;
  if (!apiKey) {
    return config;
  }

  return withAndroidManifest(config, (config) => {
    const application = config.modResults.manifest?.application?.[0];
    if (!application) {
      return config;
    }

    if (!application['meta-data']) {
      application['meta-data'] = [];
    }

    // Remove existing entry if present (e.g. from previous prebuild)
    application['meta-data'] = application['meta-data'].filter(
      (item) => item.$?.['android:name'] !== 'com.google.android.geo.API_KEY'
    );

    application['meta-data'].push({
      $: {
        'android:name': 'com.google.android.geo.API_KEY',
        'android:value': apiKey,
      },
    });

    return config;
  });
}

module.exports = withGoogleMapsApiKey;
