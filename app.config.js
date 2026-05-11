// app.config.js — Configuración dinámica de Expo
// Extiende app.json e inyecta las claves sensibles desde variables de entorno.
// Las variables deben estar definidas en frontend/.env (no subir a Git).
// Ver frontend/.env.example como referencia.

const { expo } = require("./app.json");

// IDs de AdMob: usa los reales desde .env, o los de prueba como fallback
const admobAndroidAppId =
  process.env.ADMOB_ANDROID_APP_ID || "ca-app-pub-3940256099942544~3347511713";
const admobIosAppId =
  process.env.ADMOB_IOS_APP_ID || "ca-app-pub-3940256099942544~1458002511";

module.exports = {
  expo: {
    ...expo,
    plugins: [
      ...(expo.plugins || []),
      [
        "react-native-google-mobile-ads",
        {
          androidAppId: admobAndroidAppId,
          iosAppId: admobIosAppId,
        },
      ],
    ],
    ios: {
      ...expo.ios,
      config: {
        googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
      },
    },
    android: {
      ...expo.android,
      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_API_KEY,
        },
      },
    },
  },
};
