import { messaging, getToken, onMessage } from '@/lib/firebase';
import { db } from '@/lib/firebase';
import { doc, updateDoc, setDoc } from 'firebase/firestore';

/**
 * Push Notification Service
 * Handles FCM token management and push notifications
 */
class PushNotificationService {
  // Your Firebase Cloud Messaging VAPID key (you need to get this from Firebase Console)
  // Go to Firebase Console > Project Settings > Cloud Messaging > Web Push certificates
  static VAPID_KEY = 'YOUR_VAPID_KEY_HERE'; // Replace with actual VAPID key

  /**
   * Request notification permission and get FCM token
   * @param {string} userId - Current user ID
   * @returns {Promise<string|null>} FCM token or null
   */
  static async requestPermissionAndGetToken(userId) {
    if (!messaging) {
      console.warn('Firebase Messaging is not supported in this browser');
      return null;
    }

    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        console.log('Notification permission granted.');
        
        // Register service worker
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
          console.log('Service Worker registered:', registration);
          
          // Get FCM token
          const token = await getToken(messaging, {
            vapidKey: this.VAPID_KEY,
            serviceWorkerRegistration: registration
          });
          
          if (token) {
            console.log('FCM Token:', token);
            
            // Save token to Firestore
            await this.saveFCMToken(userId, token);
            
            return token;
          } else {
            console.log('No registration token available.');
            return null;
          }
        }
      } else if (permission === 'denied') {
        console.warn('Notification permission denied.');
        return null;
      }
    } catch (error) {
      console.error('Error getting notification permission:', error);
      return null;
    }
  }

  /**
   * Save FCM token to Firestore user document
   * @param {string} userId - User ID
   * @param {string} token - FCM token
   */
  static async saveFCMToken(userId, token) {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        fcmToken: token,
        fcmTokenUpdatedAt: new Date().toISOString(),
        notificationsEnabled: true
      });
      console.log('FCM token saved to Firestore');
    } catch (error) {
      // If user doc doesn't exist, create it
      try {
        await setDoc(userRef, {
          fcmToken: token,
          fcmTokenUpdatedAt: new Date().toISOString(),
          notificationsEnabled: true
        }, { merge: true });
      } catch (setError) {
        console.error('Error saving FCM token:', setError);
      }
    }
  }

  /**
   * Remove FCM token from user (on logout or disable)
   * @param {string} userId - User ID
   */
  static async removeFCMToken(userId) {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        fcmToken: null,
        notificationsEnabled: false
      });
      console.log('FCM token removed from Firestore');
    } catch (error) {
      console.error('Error removing FCM token:', error);
    }
  }

  /**
   * Setup foreground message listener
   * This handles messages when the app is in the foreground
   * @param {Function} callback - Callback function to handle messages
   */
  static setupForegroundMessageListener(callback) {
    if (!messaging) {
      console.warn('Firebase Messaging is not supported');
      return () => {};
    }

    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('Message received in foreground:', payload);
      
      // Show notification even when app is in foreground
      if (Notification.permission === 'granted') {
        const notificationTitle = payload.notification?.title || 'New Notification';
        const notificationOptions = {
          body: payload.notification?.body || '',
          icon: '/icon-192x192.png',
          badge: '/badge-72x72.png',
          tag: payload.data?.notificationId || 'default',
          data: payload.data
        };
        
        new Notification(notificationTitle, notificationOptions);
      }
      
      // Call custom callback if provided
      if (callback) {
        callback(payload);
      }
    });

    return unsubscribe;
  }

  /**
   * Check if push notifications are supported
   */
  static isSupported() {
    return 'Notification' in window && 'serviceWorker' in navigator && messaging !== null;
  }

  /**
   * Get current notification permission status
   */
  static getPermissionStatus() {
    if ('Notification' in window) {
      return Notification.permission;
    }
    return 'unsupported';
  }
}

export default PushNotificationService;
