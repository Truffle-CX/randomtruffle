# Infobip Push Notifications Demo App

Una aplicación demo en React Native que demuestra la integración del SDK de Infobip para enviar y recibir Push Notifications en iOS y Android.

## Características

Esta aplicación demo incluye:

- Inicialización del SDK de Infobip Mobile Messaging
- Registro para push notifications
- Gestión de datos de usuario
- Envío de eventos personalizados
- Listeners para notificaciones recibidas y tocadas
- Interfaz de usuario intuitiva para probar todas las funcionalidades
- Soporte para Android e iOS

## Requisitos Previos

### General
- Node.js (v20.16.0 o superior)
- npm o yarn
- Cuenta de Infobip con Application Code

### Para Android
- Android Studio (Ladybug | 2024.2.1 o superior)
- JDK 17 o superior
- Gradle v8.8
- Android SDK (API Level 21-35)
- Archivo `google-services.json` de Firebase

### Para iOS
- macOS con Xcode (16.x o superior)
- CocoaPods (v1.15.2 o superior)
- iOS 13.0 o superior como deployment target
- Certificados APNs configurados

## Instalación

### 1. Clonar el repositorio

```bash
git clone <repository-url>
cd InfobipDemo
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar Infobip

#### Obtener Application Code

1. Accede al [Portal de Infobip](https://portal.infobip.com/)
2. Ve a Mobile App Messaging
3. Crea una nueva aplicación o usa una existente
4. Copia el **Application Code**

#### Actualizar el código

Abre `app/(tabs)/index.tsx` y reemplaza `YOUR_APPLICATION_CODE` con tu Application Code:

```typescript
mobileMessaging.init(
  {
    applicationCode: 'TU_APPLICATION_CODE_AQUI', // Reemplazar aquí
    ios: {
      notificationTypes: ['alert', 'badge', 'sound'],
    },
    android: {
      notificationIcon: 'ic_notification',
    },
  },
  // ...
);
```

### 4. Configurar Android

#### 4.1. Configurar Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Crea un proyecto o usa uno existente
3. Agrega una aplicación Android con el package name: `com.anonymous.InfobipDemo`
4. Descarga el archivo `google-services.json`
5. Copia `google-services.json` a `android/app/`

#### 4.2. Configurar Infobip con Firebase Server Key

1. En Firebase Console, ve a Project Settings > Cloud Messaging
2. Copia el **Server Key**
3. En el Portal de Infobip:
   - Ve a tu aplicación > Settings > Android
   - Pega el Server Key en el campo correspondiente
   - Guarda los cambios

### 5. Configurar iOS

#### 5.1. Instalar Pods

```bash
cd ios
pod install
cd ..
```

#### 5.2. Configurar APNs

1. Genera un certificado APNs en el Apple Developer Portal
2. Exporta el certificado (.p12)
3. En el Portal de Infobip:
   - Ve a tu aplicación > Settings > iOS
   - Sube el certificado .p12
   - Ingresa la contraseña del certificado
   - Selecciona el entorno (Development/Production)
   - Guarda los cambios

#### 5.3. Configurar Capabilities en Xcode

1. Abre `ios/InfobipDemo.xcworkspace` en Xcode
2. Selecciona el proyecto InfobipDemo
3. Ve a Signing & Capabilities
4. Agrega las siguientes capabilities:
   - Push Notifications
   - Background Modes (selecciona "Remote notifications")

#### 5.4. Actualizar AppDelegate (Opcional para Objective-C)

Si deseas una configuración más avanzada con Objective-C, crea un bridging header o convierte AppDelegate a Objective-C:

```objective-c
#import <MobileMessaging/MobileMessagingPluginApplicationDelegate.h>

- (BOOL)application:(UIApplication *)application
    didFinishLaunchingWithOptions:(NSDictionary *)launchOptions {
  [MobileMessagingPluginApplicationDelegate install];
  // ... resto del código
}
```

## Ejecutar la Aplicación

### Android

```bash
npm run android
```

O desde Android Studio:
1. Abre la carpeta `android/` en Android Studio
2. Ejecuta la aplicación en un emulador o dispositivo físico

### iOS

```bash
npm run ios
```

O desde Xcode:
1. Abre `ios/InfobipDemo.xcworkspace` en Xcode
2. Selecciona un simulador o dispositivo físico
3. Presiona Run

**Nota:** Las push notifications no funcionan en simuladores de iOS, necesitas un dispositivo físico.

## Uso de la Aplicación

### Pantalla Principal

La aplicación muestra:

1. **Status Card**: Estado actual del SDK
   - SDK Initialized: Indica si el SDK está inicializado
   - Push Registered: Indica si el dispositivo está registrado
   - User ID: ID del usuario actual
   - Installation ID: ID único de la instalación

2. **Actions**: Botones para probar funcionalidades
   - **Register for Push Notifications**: Registra el dispositivo para recibir notificaciones
   - **Set User Data**: Establece datos de usuario (ID, nombre, email)
   - **Send Custom Event**: Envía un evento personalizado a Infobip
   - **Mark All as Read**: Marca todas las notificaciones como leídas
   - **Refresh Installation Data**: Actualiza los datos de instalación

### Enviar una Push Notification de Prueba

1. Accede al Portal de Infobip
2. Ve a Mobile App Messaging > Push Notifications
3. Crea una nueva campaña o envía una notificación de prueba
4. Selecciona tu aplicación
5. Define el contenido de la notificación
6. Envía a todos los dispositivos o usa el Installation ID de la app

### Listeners Implementados

La aplicación escucha los siguientes eventos:

- `messageReceived`: Se ejecuta cuando se recibe una notificación
- `notificationTapped`: Se ejecuta cuando el usuario toca una notificación
- `registrationUpdated`: Se ejecuta cuando se actualiza el registro
- `userUpdated`: Se ejecuta cuando se actualizan los datos del usuario
- `installationUpdated`: Se ejecuta cuando se actualiza la instalación

## Funcionalidades del SDK Implementadas

### Inicialización

```typescript
mobileMessaging.init(config, successCallback, errorCallback);
```

### Registro de Notificaciones

```typescript
mobileMessaging.registerForRemoteNotifications();
```

### Gestión de Usuario

```typescript
mobileMessaging.saveUser(userData, successCallback, errorCallback);
mobileMessaging.getUser(callback);
```

### Eventos Personalizados

```typescript
mobileMessaging.submitEvent(event, successCallback, errorCallback);
```

### Datos de Instalación

```typescript
mobileMessaging.getInstallation(callback);
```

### Marcar Mensajes como Vistos

```typescript
mobileMessaging.markMessagesSeen(messageIds, successCallback, errorCallback);
```

## Estructura del Proyecto

```
InfobipDemo/
├── android/                    # Proyecto Android nativo
│   ├── app/
│   │   └── src/main/
│   │       ├── AndroidManifest.xml
│   │       └── java/com/anonymous/InfobipDemo/
│   │           ├── MainActivity.kt
│   │           └── MainApplication.kt
│   └── build.gradle
├── ios/                        # Proyecto iOS nativo
│   ├── InfobipDemo/
│   │   └── AppDelegate.swift
│   ├── InfobipDemo.xcodeproj
│   └── Podfile
├── app/                        # Código React Native
│   └── (tabs)/
│       └── index.tsx          # Pantalla principal con funcionalidades
├── package.json
└── README_INFOBIP.md          # Este archivo
```

## Solución de Problemas

### Android

**Error: google-services.json no encontrado**
- Asegúrate de haber copiado el archivo a `android/app/`
- Verifica que el package name coincida: `com.anonymous.InfobipDemo`

**Las notificaciones no se reciben**
- Verifica que el Server Key de Firebase esté configurado en Infobip
- Asegúrate de haber aceptado los permisos de notificaciones
- Revisa los logs con `adb logcat`

### iOS

**Error al instalar pods**
- Ejecuta `pod repo update` y luego `pod install`
- Asegúrate de tener CocoaPods actualizado

**Las notificaciones no se reciben**
- Verifica que el certificado APNs esté configurado correctamente en Infobip
- Asegúrate de usar un dispositivo físico (no simulador)
- Verifica que las capabilities estén habilitadas en Xcode
- Revisa los logs en Xcode Console

**Error de firma de código**
- Configura tu equipo de desarrollo en Xcode
- Verifica que el Bundle Identifier sea único

### General

**SDK no se inicializa**
- Verifica que el Application Code sea correcto
- Asegúrate de tener conexión a internet
- Revisa los logs de la consola

**Installation ID no aparece**
- Asegúrate de que el dispositivo esté registrado correctamente
- Verifica la conectividad con los servicios de Infobip
- Intenta refrescar los datos de instalación

## Recursos Adicionales

- [Documentación oficial de Infobip Mobile Messaging](https://www.infobip.com/docs/mobile-app-messaging)
- [GitHub - Infobip React Native Plugin](https://github.com/infobip/mobile-messaging-react-native-plugin)
- [Wiki del Plugin](https://github.com/infobip/mobile-messaging-react-native-plugin/wiki)
- [Portal de Infobip](https://portal.infobip.com/)
- [Guía de React Native](https://reactnative.dev/docs/getting-started)

## Características Avanzadas

Para implementar características adicionales, consulta la documentación oficial:

- **In-App Chat**: Mensajería dentro de la aplicación
- **Geofencing**: Notificaciones basadas en ubicación
- **Rich Notifications**: Notificaciones con imágenes y acciones
- **Delivery Improvements**: Mejoras en la entrega de notificaciones

## Licencia

Este proyecto es una aplicación demo con fines educativos.

## Soporte

Para soporte técnico con Infobip, visita:
- [Centro de Ayuda de Infobip](https://www.infobip.com/docs)
- [Soporte de Infobip](https://www.infobip.com/contact)

## Autor

Demo creado para ilustrar la integración del SDK de Infobip Mobile Messaging en React Native.
