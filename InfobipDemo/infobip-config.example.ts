/**
 * Infobip Configuration Example
 *
 * Copia este archivo como 'infobip-config.ts' y reemplaza los valores
 * con tus credenciales reales de Infobip.
 */

export const InfobipConfig = {
  // Tu Application Code de Infobip
  // Obtenlo desde: https://portal.infobip.com/ > Mobile App Messaging > Tu App
  applicationCode: 'YOUR_APPLICATION_CODE',

  // Configuración para iOS
  ios: {
    // Tipos de notificaciones que deseas soportar
    notificationTypes: ['alert', 'badge', 'sound'],

    // Opcional: Configuración de categorías de notificaciones
    // notificationCategories: [],
  },

  // Configuración para Android
  android: {
    // Opcional: Icono personalizado para notificaciones
    // Coloca el icono en android/app/src/main/res/drawable/
    notificationIcon: 'ic_notification',

    // Opcional: Color de acento para notificaciones
    // notificationAccentColor: '#FF6600',

    // Opcional: Habilitar vibración
    // vibrate: true,

    // Opcional: Habilitar sonido
    // sound: true,
  },

  // Opcional: Habilitar logs de debug
  debug: __DEV__, // true en desarrollo, false en producción
};

/**
 * Instrucciones de configuración:
 *
 * 1. Obtén tu Application Code:
 *    - Accede a https://portal.infobip.com/
 *    - Ve a Mobile App Messaging
 *    - Selecciona o crea tu aplicación
 *    - Copia el Application Code
 *
 * 2. Para Android - Configura Firebase:
 *    - Crea un proyecto en https://console.firebase.google.com/
 *    - Agrega una app Android con package: com.anonymous.InfobipDemo
 *    - Descarga google-services.json y cópialo a android/app/
 *    - En Firebase Console, ve a Project Settings > Cloud Messaging
 *    - Copia el Server Key
 *    - En Infobip Portal, ve a tu app > Settings > Android
 *    - Pega el Server Key y guarda
 *
 * 3. Para iOS - Configura APNs:
 *    - Genera un certificado APNs en Apple Developer Portal
 *    - Exporta el certificado como .p12
 *    - En Infobip Portal, ve a tu app > Settings > iOS
 *    - Sube el certificado .p12
 *    - Ingresa la contraseña del certificado
 *    - Selecciona el entorno (Development/Production)
 *    - Guarda los cambios
 *
 * 4. En Xcode (solo iOS):
 *    - Abre ios/InfobipDemo.xcworkspace
 *    - Ve a Signing & Capabilities
 *    - Agrega: Push Notifications
 *    - Agrega: Background Modes > Remote notifications
 */
