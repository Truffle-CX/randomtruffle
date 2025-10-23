import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import mobileMessaging from 'infobip-mobile-messaging-react-native-plugin';

export default function HomeScreen() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [userId, setUserId] = useState('');
  const [installationId, setInstallationId] = useState('');
  const [isPushRegistered, setIsPushRegistered] = useState(false);

  useEffect(() => {
    initializeMobileMessaging();
    setupListeners();

    return () => {
      // Cleanup listeners
      mobileMessaging.unregister();
    };
  }, []);

  const initializeMobileMessaging = async () => {
    try {
      // Request notification permissions for Android 13+
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          console.log('Notification permission denied');
        }
      }

      // Initialize Mobile Messaging with your Application Code
      // Replace 'YOUR_APPLICATION_CODE' with your actual Infobip Application Code
      mobileMessaging.init(
        {
          applicationCode: 'YOUR_APPLICATION_CODE',
          ios: {
            notificationTypes: ['alert', 'badge', 'sound'],
          },
          android: {
            notificationIcon: 'ic_notification', // optional
          },
        },
        () => {
          console.log('Mobile Messaging initialized successfully');
          setIsInitialized(true);
          getInstallationData();
        },
        (error: any) => {
          console.error('Mobile Messaging initialization error:', error);
          Alert.alert('Error', 'Failed to initialize Mobile Messaging: ' + error);
        }
      );
    } catch (error) {
      console.error('Error during initialization:', error);
    }
  };

  const setupListeners = () => {
    // Listen for messages received
    mobileMessaging.register('messageReceived', (message: any) => {
      console.log('Message received:', message);
      Alert.alert('Push Notification Received', JSON.stringify(message, null, 2));
    });

    // Listen for notification tapped
    mobileMessaging.register('notificationTapped', (message: any) => {
      console.log('Notification tapped:', message);
      Alert.alert('Notification Tapped', JSON.stringify(message, null, 2));
    });

    // Listen for registration
    mobileMessaging.register('registrationUpdated', (registration: any) => {
      console.log('Registration updated:', registration);
      setIsPushRegistered(true);
    });

    // Listen for user updated
    mobileMessaging.register('userUpdated', (user: any) => {
      console.log('User updated:', user);
    });

    // Listen for installation updated
    mobileMessaging.register('installationUpdated', (installation: any) => {
      console.log('Installation updated:', installation);
      getInstallationData();
    });
  };

  const getInstallationData = () => {
    mobileMessaging.getInstallation((installation: any) => {
      console.log('Installation data:', installation);
      setInstallationId(installation.pushRegistrationId || 'Not registered');
    });

    mobileMessaging.getUser((user: any) => {
      console.log('User data:', user);
      setUserId(user.externalUserId || 'Not set');
    });
  };

  const registerForPushNotifications = () => {
    mobileMessaging.registerForRemoteNotifications();
    Alert.alert('Success', 'Registered for push notifications');
  };

  const setUserData = () => {
    const testUserId = `user_${Date.now()}`;
    mobileMessaging.saveUser(
      {
        externalUserId: testUserId,
        firstName: 'Demo',
        lastName: 'User',
        email: 'demo@example.com',
      },
      () => {
        console.log('User data saved successfully');
        setUserId(testUserId);
        Alert.alert('Success', `User ID set to: ${testUserId}`);
      },
      (error: any) => {
        console.error('Error saving user data:', error);
        Alert.alert('Error', 'Failed to save user data: ' + error);
      }
    );
  };

  const sendCustomEvent = () => {
    const event = {
      definitionId: 'test_event',
      properties: {
        action: 'button_pressed',
        timestamp: new Date().toISOString(),
      },
    };

    mobileMessaging.submitEvent(
      event,
      () => {
        console.log('Event submitted successfully');
        Alert.alert('Success', 'Custom event sent');
      },
      (error: any) => {
        console.error('Error submitting event:', error);
        Alert.alert('Error', 'Failed to send event: ' + error);
      }
    );
  };

  const markAllNotificationsAsRead = () => {
    mobileMessaging.markMessagesSeen(
      [],
      () => {
        console.log('Messages marked as seen');
        Alert.alert('Success', 'All notifications marked as read');
      },
      (error: any) => {
        console.error('Error marking messages as seen:', error);
        Alert.alert('Error', 'Failed to mark messages: ' + error);
      }
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Infobip Push Notifications Demo</Text>
        <Text style={styles.subtitle}>React Native SDK Integration</Text>
      </View>

      <View style={styles.statusCard}>
        <Text style={styles.statusTitle}>Status</Text>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>SDK Initialized:</Text>
          <Text style={[styles.statusValue, isInitialized ? styles.success : styles.error]}>
            {isInitialized ? 'Yes' : 'No'}
          </Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Push Registered:</Text>
          <Text style={[styles.statusValue, isPushRegistered ? styles.success : styles.error]}>
            {isPushRegistered ? 'Yes' : 'No'}
          </Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>User ID:</Text>
          <Text style={styles.statusValue}>{userId || 'Not set'}</Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Installation ID:</Text>
          <Text style={styles.statusValueSmall} numberOfLines={1} ellipsizeMode="middle">
            {installationId || 'Not available'}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Actions</Text>

        <TouchableOpacity
          style={styles.button}
          onPress={registerForPushNotifications}
          disabled={!isInitialized}
        >
          <Text style={styles.buttonText}>Register for Push Notifications</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={setUserData}
          disabled={!isInitialized}
        >
          <Text style={styles.buttonText}>Set User Data</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={sendCustomEvent}
          disabled={!isInitialized}
        >
          <Text style={styles.buttonText}>Send Custom Event</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={markAllNotificationsAsRead}
          disabled={!isInitialized}
        >
          <Text style={styles.buttonText}>Mark All as Read</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={getInstallationData}
          disabled={!isInitialized}
        >
          <Text style={styles.buttonText}>Refresh Installation Data</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Setup Instructions:</Text>
        <Text style={styles.infoText}>
          1. Replace 'YOUR_APPLICATION_CODE' in the code with your actual Infobip Application Code
        </Text>
        <Text style={styles.infoText}>
          2. Configure Firebase for Android (google-services.json)
        </Text>
        <Text style={styles.infoText}>
          3. Configure APNs for iOS (certificates/keys)
        </Text>
        <Text style={styles.infoText}>
          4. Test push notifications from Infobip Portal
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#FF6600',
    padding: 20,
    paddingTop: 60,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#fff',
    marginTop: 5,
  },
  statusCard: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  statusLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  statusValueSmall: {
    fontSize: 12,
    color: '#666',
    flex: 1,
    textAlign: 'right',
    marginLeft: 10,
  },
  success: {
    color: '#4CAF50',
  },
  error: {
    color: '#F44336',
  },
  section: {
    margin: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  button: {
    backgroundColor: '#FF6600',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#E3F2FD',
    margin: 15,
    padding: 15,
    borderRadius: 10,
    marginBottom: 30,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#1976D2',
  },
  infoText: {
    fontSize: 14,
    color: '#424242',
    marginBottom: 8,
    lineHeight: 20,
  },
});
