/**
 * 🧮 territoryUtils — Geometría para territorios de paseos
 *
 * Algoritmos puros (sin dependencias externas) para:
 *  - Detectar si un recorrido es circular (inicio ≈ fin)
 *  - Simplificar polilíneas GPS (Douglas-Peucker)
 *  - Calcular área de polígonos (Shoelace + conversión a m²)
 *  - Point-in-polygon (ray casting)
 *  - % de solape entre dos polígonos (Monte Carlo)
 */

import { WalkCoordinate } from "../types";

export interface LatLng {
  latitude: number;
  longitude: number;
}

// ─────────────────────────────────────────────
// Haversine (metros entre dos puntos lat/lng)
// ─────────────────────────────────────────────
function haversine(a: LatLng, b: LatLng): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const aVal =
    sinLat ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * sinLon ** 2;
  return R * 2 * Math.atan2(Math.sqrt(aVal), Math.sqrt(1 - aVal));
}

// ─────────────────────────────────────────────
// Detección de recorrido circular
// ─────────────────────────────────────────────

/**
 * Devuelve true si el inicio y el fin están a menos de `thresholdMeters`.
 * 50 m es suficientemente generoso para el drift del GPS.
 */
export function isCircularWalk(
  coords: WalkCoordinate[],
  thresholdMeters = 50
): boolean {
  if (coords.length < 5) return false;
  const first = coords[0];
  const last = coords[coords.length - 1];
  return haversine(first, last) <= thresholdMeters;
}

// ─────────────────────────────────────────────
// Douglas-Peucker: simplificar polilínea
// ─────────────────────────────────────────────

function perpendicularDistanceMeters(
  point: LatLng,
  lineStart: LatLng,
  lineEnd: LatLng
): number {
  const dx = lineEnd.longitude - lineStart.longitude;
  const dy = lineEnd.latitude - lineStart.latitude;
  const mag = Math.sqrt(dx * dx + dy * dy);
  if (mag === 0) return haversine(point, lineStart);
  const u =
    ((point.longitude - lineStart.longitude) * dx +
      (point.latitude - lineStart.latitude) * dy) /
    (mag * mag);
  const closest: LatLng = {
    longitude: lineStart.longitude + u * dx,
    latitude: lineStart.latitude + u * dy,
  };
  return haversine(point, closest);
}

export function douglasPeucker(
  points: LatLng[],
  epsilonMeters: number
): LatLng[] {
  if (points.length <= 2) return points;

  let maxDist = 0;
  let maxIdx = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularDistanceMeters(
      points[i],
      points[0],
      points[points.length - 1]
    );
    if (d > maxDist) {
      maxDist = d;
      maxIdx = i;
    }
  }

  if (maxDist > epsilonMeters) {
    const left = douglasPeucker(points.slice(0, maxIdx + 1), epsilonMeters);
    const right = douglasPeucker(points.slice(maxIdx), epsilonMeters);
    return [...left.slice(0, -1), ...right];
  }
  return [points[0], points[points.length - 1]];
}

// ─────────────────────────────────────────────
// Área de polígono (Shoelace + conversión a m²)
// ─────────────────────────────────────────────

/**
 * Calcula el área en m² de un polígono en coordenadas lat/lng.
 * Convierte a metros usando la latitud del centroide.
 */
export function polygonAreaM2(polygon: LatLng[]): number {
  const n = polygon.length;
  if (n < 3) return 0;

  const centLat =
    polygon.reduce((s, p) => s + p.latitude, 0) / n;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const latScale = 111_320;
  const lonScale = 111_320 * Math.cos(toRad(centLat));

  let area = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area +=
      polygon[i].longitude * lonScale * (polygon[j].latitude * latScale);
    area -=
      polygon[j].longitude * lonScale * (polygon[i].latitude * latScale);
  }
  return Math.abs(area) / 2;
}

// ─────────────────────────────────────────────
// Point-in-polygon (ray casting)
// ─────────────────────────────────────────────

export function pointInPolygon(point: LatLng, polygon: LatLng[]): boolean {
  const { latitude: py, longitude: px } = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].longitude;
    const yi = polygon[i].latitude;
    const xj = polygon[j].longitude;
    const yj = polygon[j].latitude;
    const intersect =
      yi > py !== yj > py &&
      px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

// ─────────────────────────────────────────────
// Monte Carlo: % de solape entre dos polígonos
// ─────────────────────────────────────────────

/**
 * Estima qué porcentaje del área de `existing` es cubierto por `newPoly`.
 * Precisión: ±3 % con samples=800 (< 1 ms en JS moderno).
 */
export function conquestPercent(
  newPoly: LatLng[],
  existing: LatLng[],
  samples = 800
): number {
  if (existing.length < 3 || newPoly.length < 3) return 0;

  const lats = existing.map((p) => p.latitude);
  const lons = existing.map((p) => p.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);

  let inExisting = 0;
  let inBoth = 0;
  for (let i = 0; i < samples; i++) {
    const pt: LatLng = {
      latitude: minLat + Math.random() * (maxLat - minLat),
      longitude: minLon + Math.random() * (maxLon - minLon),
    };
    if (pointInPolygon(pt, existing)) {
      inExisting++;
      if (pointInPolygon(pt, newPoly)) inBoth++;
    }
  }
  if (inExisting === 0) return 0;
  return Math.round((inBoth / inExisting) * 100);
}

// ─────────────────────────────────────────────
// Helper: simplifica coordenadas de un paseo
// (quita timestamps, aplica Douglas-Peucker)
// ─────────────────────────────────────────────

/**
 * Convierte WalkCoordinate[] → LatLng[] simplificado.
 * epsilonMeters=5: buen balance entre fidelidad y tamaño de almacenamiento.
 */
export function simplifyWalk(
  coords: WalkCoordinate[],
  epsilonMeters = 5
): LatLng[] {
  const pts = coords.map(({ latitude, longitude }) => ({ latitude, longitude }));
  return douglasPeucker(pts, epsilonMeters);
}
