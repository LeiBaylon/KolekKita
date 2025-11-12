# Push Notification Implementation Prompt for Mobile App

## Overview
Implement push notifications in the KolekKita mobile app to receive notifications sent from the admin web dashboard. The system uses Firebase Cloud Messaging (FCM) and integrates with an existing Firestore-based notification system.

---

## Requirements

### 1. Firebase Cloud Messaging Integration

**Install FCM package:**
```bash
# For React Native
npm install @react-native-firebase/app @react-native-firebase/messaging

# For Flutter
flutter pub add firebase_messaging
flutter pub add firebase_core
```

**Initialize Firebase:**
- Use the same Firebase project: `kolekkita`
- Project ID: `kolekkita`
- Add your mobile app to Firebase Console

---

### 2. Request Notification Permission

**On app launch or user login:**
- Request notification permission from the user
- Handle permission states: `authorized`, `denied`, `notDetermined`
- Show appropriate UI for permission denial

**Example Flow:**
```
User Login
    ↓
Check Permission Status
    ↓
If not determined → Request Permission
    ↓
If granted → Get FCM Token
    ↓
Save Token to Firestore
```

---

### 3. FCM Token Management

**Get and Save FCM Token:**
```javascript
// Pseudocode - adapt to your framework
async function setupNotifications(userId) {
  // Request permission
  const permission = await requestNotificationPermission();
  
  if (permission === 'granted') {
    // Get FCM token
    const token = await getFCMToken();
    
    // Save to Firestore
    await saveTokenToFirestore(userId, token);
  }
}
```

**Firestore Structure:**
```javascript
// Save token to user document
db.collection('users').doc(userId).update({
  fcmToken: token,
  fcmTokenUpdatedAt: new Date().toISOString(),
  notificationsEnabled: true,
  platform: 'ios' // or 'android'
});
```

**Token Refresh Handling:**
- Listen for token refresh events
- Update Firestore when token changes
- Handle token expiration

---

### 4. Receive Notifications

**Handle three notification states:**

#### **A. Foreground Notifications** (App is open)
```javascript
// Listen for messages when app is in foreground
onMessageReceived((message) => {
  // Show in-app notification or alert
  const { title, body, data } = message;
  
  // Display notification banner
  showInAppNotification(title, body);
  
  // Update notification badge
  updateNotificationBadge();
  
  // Save to local storage or state for notification list
  saveNotificationLocally(message);
});
```

#### **B. Background Notifications** (App is in background)
```javascript
// Background message handler
setBackgroundMessageHandler((message) => {
  // OS will display the notification automatically
  // You can customize the display here
  return message;
});
```

#### **C. Notification Tap** (User taps notification)
```javascript
// Handle notification tap - navigate to appropriate screen
onNotificationTap((message) => {
  const { data } = message;
  
  // Navigate based on notification data
  if (data.type === 'booking') {
    navigateToBooking(data.bookingId);
  } else if (data.type === 'transaction') {
    navigateToTransaction(data.transactionId);
  } else {
    navigateToNotifications();
  }
});
```

---

### 5. Sync with In-App Notifications

**Firestore Listener for In-App Notifications:**
```javascript
// Listen to in-app notifications in Firestore
function listenToNotifications(userId) {
  return db.collection('notifications')
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
    .limit(50)
    .onSnapshot((snapshot) => {
      const notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Update local state/storage
      updateNotificationsList(notifications);
      
      // Update badge count
      const unreadCount = notifications.filter(n => !n.isRead).length;
      updateBadgeCount(unreadCount);
    });
}
```

**Notification Data Structure:**
```javascript
{
  id: "notif_123",
  userId: "user_abc",
  title: "New Booking",
  message: "You have a new booking request",
  type: "booking", // or "system", "announcement", etc.
  isRead: false,
  data: {
    bookingId: "booking_456",
    // Additional custom data
  },
  createdAt: Timestamp,
  sentAt: Timestamp
}
```

---

### 6. Notification Settings Screen

**Create a settings screen with:**
- Toggle to enable/disable push notifications
- Show current permission status
- Button to open system settings if permission denied
- Option to clear notification history

**UI Elements:**
```
┌─────────────────────────────────────┐
│  Push Notifications        [Toggle] │
│  ○ Enabled                          │
│                                     │
│  Notification Types:                │
│  □ Booking Updates         [Toggle] │
│  □ Transaction Updates     [Toggle] │
│  □ System Announcements    [Toggle] │
│  □ Promotions              [Toggle] │
│                                     │
│  [Clear All Notifications]          │
└─────────────────────────────────────┘
```

---

### 7. Handle Notification Lifecycle

**On User Login:**
```javascript
async function onUserLogin(userId) {
  // Setup FCM
  await setupNotifications(userId);
  
  // Start listening to Firestore notifications
  listenToNotifications(userId);
  
  // Sync notification badge
  await syncNotificationBadge(userId);
}
```

**On User Logout:**
```javascript
async function onUserLogout(userId) {
  // Remove FCM token from Firestore
  await db.collection('users').doc(userId).update({
    fcmToken: null,
    notificationsEnabled: false
  });
  
  // Clear local notifications
  clearLocalNotifications();
  
  // Reset badge
  setBadgeCount(0);
  
  // Unsubscribe from listeners
  unsubscribeFromNotifications();
}
```

---

### 8. Notification List Screen

**Display all notifications with:**
- List of notifications (newest first)
- Unread indicator (dot or badge)
- Notification icon based on type
- Timestamp (e.g., "2 hours ago")
- Mark as read on tap
- Pull to refresh
- Delete notification option

**Example UI:**
```
┌─────────────────────────────────────┐
│  Notifications              [●●] 2  │
├─────────────────────────────────────┤
│  ● [📦] New Booking                 │
│      You have a new booking...      │
│      2 hours ago                    │
├─────────────────────────────────────┤
│    [💰] Transaction Complete        │
│      Payment received for...        │
│      1 day ago                      │
├─────────────────────────────────────┤
│    [📢] System Announcement         │
│      App will be under...           │
│      3 days ago                     │
└─────────────────────────────────────┘
```

---

### 9. Mark Notification as Read

**Update Firestore when user views notification:**
```javascript
async function markAsRead(notificationId) {
  await db.collection('notifications')
    .doc(notificationId)
    .update({
      isRead: true,
      readAt: new Date().toISOString()
    });
}
```

---

### 10. Notification Types and Icons

**Map notification types to icons and colors:**
```javascript
const notificationConfig = {
  booking: {
    icon: '📦',
    color: '#3B82F6', // blue
    title: 'Booking Update'
  },
  transaction: {
    icon: '💰',
    color: '#10B981', // green
    title: 'Transaction'
  },
  announcement: {
    icon: '📢',
    color: '#F59E0B', // orange
    title: 'Announcement'
  },
  system: {
    icon: '⚙️',
    color: '#6B7280', // gray
    title: 'System'
  },
  alert: {
    icon: '⚠️',
    color: '#EF4444', // red
    title: 'Alert'
  }
};
```

---

### 11. Deep Linking

**Handle notification taps with deep links:**
```javascript
// Parse notification data and navigate
function handleNotificationTap(notification) {
  const { type, data } = notification;
  
  switch(type) {
    case 'booking':
      navigation.navigate('BookingDetails', { 
        bookingId: data.bookingId 
      });
      break;
      
    case 'transaction':
      navigation.navigate('TransactionDetails', { 
        transactionId: data.transactionId 
      });
      break;
      
    case 'announcement':
    case 'system':
      navigation.navigate('NotificationDetails', { 
        notificationId: data.notificationId 
      });
      break;
      
    default:
      navigation.navigate('Notifications');
  }
}
```

---

### 12. Platform-Specific Considerations

#### **iOS:**
- Request permission using `requestPermission()`
- Handle provisional authorization
- Configure notification categories
- Support silent notifications
- Handle background refresh

#### **Android:**
- Create notification channel
- Handle notification icons (small, large)
- Configure notification priority
- Support notification actions
- Handle background restrictions

---

### 13. Error Handling

**Handle common errors:**
```javascript
try {
  const token = await getFCMToken();
  await saveTokenToFirestore(userId, token);
} catch (error) {
  if (error.code === 'messaging/permission-denied') {
    // Show UI to guide user to settings
    showPermissionDeniedDialog();
  } else if (error.code === 'messaging/registration-failed') {
    // Retry token registration
    retryTokenRegistration();
  } else {
    // Log error and show generic message
    console.error('FCM Error:', error);
    showErrorMessage('Unable to setup notifications');
  }
}
```

---

### 14. Testing Checklist

- [ ] User can grant/deny notification permission
- [ ] FCM token is saved to Firestore on login
- [ ] Token is removed from Firestore on logout
- [ ] Foreground notifications display correctly
- [ ] Background notifications appear in notification tray
- [ ] Tapping notification navigates to correct screen
- [ ] Notification badge updates correctly
- [ ] In-app notification list syncs with Firestore
- [ ] Mark as read updates Firestore
- [ ] Settings toggle enables/disables notifications
- [ ] Token refreshes when needed
- [ ] Works on both iOS and Android
- [ ] Deep linking works correctly
- [ ] Notification icons display correctly
- [ ] Timestamp formatting is accurate

---

### 15. Code Examples by Framework

#### **React Native:**
```javascript
import messaging from '@react-native-firebase/messaging';
import firestore from '@react-native-firebase/firestore';

// Request permission
async function requestUserPermission() {
  const authStatus = await messaging().requestPermission();
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;
  return enabled;
}

// Get FCM token
async function getFCMToken() {
  const token = await messaging().getToken();
  return token;
}

// Save to Firestore
async function saveToken(userId, token) {
  await firestore()
    .collection('users')
    .doc(userId)
    .update({
      fcmToken: token,
      fcmTokenUpdatedAt: firestore.FieldValue.serverTimestamp(),
      notificationsEnabled: true,
      platform: Platform.OS
    });
}

// Foreground listener
messaging().onMessage(async remoteMessage => {
  console.log('Foreground message:', remoteMessage);
  // Show in-app notification
});

// Background handler
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('Background message:', remoteMessage);
});

// Notification tap handler
messaging().onNotificationOpenedApp(remoteMessage => {
  console.log('Notification opened:', remoteMessage);
  // Navigate to screen
});
```

#### **Flutter:**
```dart
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

// Request permission
Future<bool> requestPermission() async {
  FirebaseMessaging messaging = FirebaseMessaging.instance;
  NotificationSettings settings = await messaging.requestPermission();
  return settings.authorizationStatus == AuthorizationStatus.authorized;
}

// Get FCM token
Future<String?> getFCMToken() async {
  return await FirebaseMessaging.instance.getToken();
}

// Save to Firestore
Future<void> saveToken(String userId, String token) async {
  await FirebaseFirestore.instance
      .collection('users')
      .doc(userId)
      .update({
    'fcmToken': token,
    'fcmTokenUpdatedAt': FieldValue.serverTimestamp(),
    'notificationsEnabled': true,
    'platform': Platform.isIOS ? 'ios' : 'android',
  });
}

// Foreground listener
FirebaseMessaging.onMessage.listen((RemoteMessage message) {
  print('Foreground message: ${message.notification?.title}');
  // Show in-app notification
});

// Background handler
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  print('Background message: ${message.notification?.title}');
}

void main() {
  FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);
  runApp(MyApp());
}

// Notification tap handler
FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
  print('Notification tapped: ${message.notification?.title}');
  // Navigate to screen
});
```

---

### 16. Firestore Security Rules

**Ensure users can only read their own notifications:**
```javascript
// Add to firestore.rules
match /notifications/{notificationId} {
  allow read: if request.auth != null && 
                 resource.data.userId == request.auth.uid;
  allow write: if false; // Only server can write
}

match /users/{userId} {
  allow read: if request.auth != null && request.auth.uid == userId;
  allow update: if request.auth != null && 
                   request.auth.uid == userId &&
                   request.resource.data.keys().hasOnly(['fcmToken', 'fcmTokenUpdatedAt', 'notificationsEnabled', 'platform']);
}
```

---

### 17. User Roles (Match Web System)

**Exclude admins from receiving notifications:**
```javascript
// Check user role before saving token
async function setupNotifications(userId) {
  const userDoc = await db.collection('users').doc(userId).get();
  const userData = userDoc.data();
  
  // Don't setup notifications for admins
  if (userData.role === 'admin') {
    console.log('Admins do not receive notifications');
    return;
  }
  
  // Setup for regular users (resident, collector, junkshop)
  const permission = await requestPermission();
  if (permission) {
    const token = await getFCMToken();
    await saveToken(userId, token);
  }
}
```

---

### 18. Notification Payload Structure

**Expected payload from server:**
```javascript
{
  notification: {
    title: "New Booking Request",
    body: "You have a new booking from John Doe"
  },
  data: {
    type: "booking",
    bookingId: "booking_123",
    userId: "user_abc",
    notificationId: "notif_456",
    campaignId: "campaign_789",
    timestamp: "2025-11-10T10:30:00Z",
    clickAction: "OPEN_BOOKING"
  }
}
```

---

## Summary

### **Core Implementation Steps:**
1. ✅ Install Firebase Messaging SDK
2. ✅ Request notification permission
3. ✅ Get and save FCM token to Firestore
4. ✅ Listen for foreground messages
5. ✅ Handle background messages
6. ✅ Handle notification taps
7. ✅ Sync with Firestore in-app notifications
8. ✅ Create notification list screen
9. ✅ Implement mark as read
10. ✅ Add notification settings
11. ✅ Handle token refresh
12. ✅ Implement deep linking

### **Integration Points with Admin Web:**
- Same Firebase project (`kolekkita`)
- Same Firestore collections (`users`, `notifications`, `notification_campaigns`)
- FCM token saved to user document
- Receive notifications sent from admin dashboard
- Sync notification read status

### **User Experience:**
- Permission request on login
- Receive notifications even when app is closed
- In-app notification list with history
- Mark notifications as read
- Navigate to relevant screens from notifications
- Toggle notifications in settings

---

This implementation will fully integrate with the admin web dashboard notification system!
