# Quick Start - Infobip Push Notifications Demo

Guía rápida para poner en marcha la aplicación demo de Infobip Push Notifications.

## Pasos Rápidos

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar Infobip Application Code

Edita `app/(tabs)/index.tsx` y reemplaza en la línea 46:

```typescript
applicationCode: 'YOUR_APPLICATION_CODE', // <- Reemplaza con tu código real
```

### 3. Android - Configurar Firebase

**a) Crear proyecto Firebase**
- Ve a https://console.firebase.google.com/
- Crea un proyecto nuevo

**b) Agregar app Android**
- Package name: `com.anonymous.InfobipDemo`
- Descarga `google-services.json`
- Copia el archivo a `android/app/google-services.json`

**c) Configurar en Infobip**
- Firebase Console > Project Settings > Cloud Messaging
- Copia el **Server Key**
- Infobip Portal > Tu App > Settings > Android
- Pega el Server Key y guarda

**d) Ejecutar**
```bash
npm run android
```

### 4. iOS - Configurar APNs

**a) Instalar pods**
```bash
cd ios && pod install && cd ..
```

**b) Certificado APNs**
- Genera certificado en Apple Developer Portal
- Exporta como .p12
- Sube a Infobip Portal > Tu App > Settings > iOS

**c) Configurar Xcode**
- Abre `ios/InfobipDemo.xcworkspace`
- Signing & Capabilities > Agrega:
  - Push Notifications
  - Background Modes > Remote notifications

**d) Ejecutar**
```bash
npm run ios
```

## Enviar Notificación de Prueba

1. Abre Infobip Portal
2. Mobile App Messaging > Push Notifications
3. Create Campaign o Send Test
4. Envía a todos los dispositivos
5. ¡Mira tu notificación!

## Problemas Comunes

**Android: "google-services.json not found"**
- Verifica que el archivo esté en `android/app/google-services.json`

**iOS: "Pod install failed"**
- Ejecuta `pod repo update` y vuelve a intentar

**"SDK not initialized"**
- Verifica que tu Application Code sea correcto
- Asegúrate de tener conexión a internet

## Documentación Completa

Para instrucciones detalladas, consulta `README_INFOBIP.md`

## Soporte

- [Documentación Infobip](https://www.infobip.com/docs/mobile-app-messaging)
- [GitHub Plugin](https://github.com/infobip/mobile-messaging-react-native-plugin)
