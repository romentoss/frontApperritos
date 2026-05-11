/**
 * AdBanner — Banner publicitario de Google AdMob
 *
 * Uso básico (pone el banner de prueba):
 *   <AdBanner />
 *
 * Con unit ID real (producción):
 *   <AdBanner unitId="ca-app-pub-XXXX/YYYY" />
 *
 * ⚠️  Este componente requiere un development build (EAS Build).
 *      No funciona en Expo Go.
 */

import React, { useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import {
  BannerAd,
  BannerAdSize,
  TestIds,
} from "react-native-google-mobile-ads";

// ─── Unit IDs ────────────────────────────────────────────────
// En producción pasa el unitId real como prop o usa una variable
// de entorno expuesta con EXPO_PUBLIC_* (para acceder en runtime).
const TEST_UNIT_ID =
  Platform.OS === "ios" ? TestIds.BANNER : TestIds.BANNER;

// Unit IDs de producción (leer desde env expuesto o hardcodear aquí)
const PROD_UNIT_ID_ANDROID =
  process.env.EXPO_PUBLIC_ADMOB_BANNER_ANDROID ?? TEST_UNIT_ID;
const PROD_UNIT_ID_IOS =
  process.env.EXPO_PUBLIC_ADMOB_BANNER_IOS ?? TEST_UNIT_ID;

const PROD_UNIT_ID =
  Platform.OS === "ios" ? PROD_UNIT_ID_IOS : PROD_UNIT_ID_ANDROID;

// ─── Tipos ───────────────────────────────────────────────────
interface AdBannerProps {
  /** Si no se pasa, usa el ID de producción/prueba según __DEV__ */
  unitId?: string;
  size?: BannerAdSize;
}

// ─── Componente ──────────────────────────────────────────────
export function AdBanner({
  unitId,
  size = BannerAdSize.ANCHORED_ADAPTIVE_BANNER,
}: AdBannerProps) {
  const [visible, setVisible] = useState(false);

  // Selecciona el unit ID: prop > producción > test
  const resolvedUnitId =
    unitId ?? (__DEV__ ? TEST_UNIT_ID : PROD_UNIT_ID);

  return (
    <View style={[styles.container, !visible && styles.hidden]}>
      <BannerAd
        unitId={resolvedUnitId}
        size={size}
        requestOptions={{ requestNonPersonalizedAdsOnly: false }}
        onAdLoaded={() => setVisible(true)}
        onAdFailedToLoad={() => setVisible(false)}
      />
    </View>
  );
}

// ─── Estilos ─────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    width: "100%",
  },
  hidden: {
    height: 0,
    overflow: "hidden",
  },
});
