/**
 * 🎨 Paleta de colores de Apperritos
 *
 * Colores cálidos y amigables, pensados para una app de mascotas.
 * Usamos un sistema de semántica clara para que el código sea legible:
 *   Colors.primary → color principal de botones y acentos
 *   Colors.text.primary → texto principal
 *   Colors.error → mensajes de error
 */

export const Colors = {
  /** Naranja cálido — color principal de la app */
  primary: "#FF6B35",

  /** Versión más oscura del primario para estados presionados */
  primaryDark: "#E05020",

  /** Verde azulado — color secundario/acento */
  secondary: "#4ECDC4",

  /** Fondo general de la app */
  background: "#F8F9FA",

  /** Fondo de tarjetas y secciones elevadas */
  surface: "#FFFFFF",

  /** Separadores y bordes de inputs */
  border: "#E0E0E0",

  text: {
    /** Texto principal — títulos y cuerpo */
    primary: "#2D3436",

    /** Texto secundario — subtítulos y descripciones */
    secondary: "#636E72",

    /** Texto deshabilitado — placeholders */
    disabled: "#B2BEC3",

    /** Texto sobre fondos de color (botones, badges) */
    inverse: "#FFFFFF",
  },

  /** Rojo para errores y destructivos */
  error: "#D63031",

  /** Verde para éxito */
  success: "#00B894",

  /** Amarillo para advertencias */
  warning: "#FDCB6E",
};
