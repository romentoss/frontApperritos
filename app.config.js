// app.config.js — Configuración dinámica de Expo
// Extiende app.json e inyecta las claves sensibles desde variables de entorno.
// Las variables deben estar definidas en frontend/.env (no subir a Git).
// Ver frontend/.env.example como referencia.

const { expo } = require("./app.json");

module.exports = {
  expo: {
    ...expo,
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
