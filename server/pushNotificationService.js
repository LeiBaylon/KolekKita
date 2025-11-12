import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Initialize Firebase Admin SDK
// Download your service account key from Firebase Console > Project Settings > Service Accounts
// and save it as 'serviceAccountKey.json' in the server directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let serviceAccount;
try {
  const serviceAccountPath = join(__dirname, 'serviceAccountKey.json');
  serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
} catch (error) {
  console.error('Service account key not found. Push notifications will not work.');
  console.error('Download it from Firebase Console > Project Settings > Service Accounts');
}

if (serviceAccount && !admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

/**
 * Send push notification to specific user
 * @param {string} userId - Target user ID
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Additional data
 */
export async function sendPushNotificationToUser(userId, title, body, data = {}) {
  try {
    // Get user's FCM token from Firestore
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      throw new Error(`User ${userId} not found`);
    }
    
    const userData = userDoc.data();
    const fcmToken = userData.fcmToken;
    
    if (!fcmToken) {
      console.log(`User ${userId} doesn't have FCM token. Skipping push notification.`);
      return { success: false, reason: 'no_token' };
    }
    
    // Send the notification
    const message = {
      notification: {
        title,
        body
      },
      data: {
        ...data,
        clickAction: 'FLUTTER_NOTIFICATION_CLICK',
        timestamp: new Date().toISOString()
      },
      token: fcmToken
    };
    
    const response = await admin.messaging().send(message);
    console.log('Push notification sent successfully:', response);
    
    return { success: true, messageId: response };
  } catch (error) {
    console.error('Error sending push notification:', error);
    
    // If token is invalid, remove it from user document
    if (error.code === 'messaging/invalid-registration-token' || 
        error.code === 'messaging/registration-token-not-registered') {
      await db.collection('users').doc(userId).update({
        fcmToken: admin.firestore.FieldValue.delete(),
        notificationsEnabled: false
      });
    }
    
    throw error;
  }
}

/**
 * Send push notification to multiple users
 * @param {array} userIds - Array of user IDs
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Additional data
 */
export async function sendPushNotificationToMultipleUsers(userIds, title, body, data = {}) {
  try {
    // Get all users' FCM tokens
    const usersSnapshot = await db.collection('users')
      .where(admin.firestore.FieldPath.documentId(), 'in', userIds.slice(0, 10)) // Firestore 'in' limit is 10
      .get();
    
    const tokens = [];
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      if (userData.fcmToken) {
        tokens.push(userData.fcmToken);
      }
    });
    
    if (tokens.length === 0) {
      console.log('No valid FCM tokens found');
      return { success: false, reason: 'no_tokens' };
    }
    
    // Send multicast message
    const message = {
      notification: {
        title,
        body
      },
      data: {
        ...data,
        clickAction: 'FLUTTER_NOTIFICATION_CLICK',
        timestamp: new Date().toISOString()
      },
      tokens
    };
    
    const response = await admin.messaging().sendEachForMulticast(message);
    console.log(`Push notifications sent: ${response.successCount} successful, ${response.failureCount} failed`);
    
    // Handle failed tokens
    if (response.failureCount > 0) {
      const failedTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push(tokens[idx]);
        }
      });
      
      // Remove invalid tokens (optional)
      console.log('Failed tokens:', failedTokens);
    }
    
    return {
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount
    };
  } catch (error) {
    console.error('Error sending batch push notifications:', error);
    throw error;
  }
}

/**
 * Send push notification to all users with specific role
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {string} userTypeFilter - User type filter (all, resident, collector, junkshop)
 * @param {object} data - Additional data
 */
export async function sendPushNotificationToAllUsers(title, body, userTypeFilter = 'all', data = {}) {
  try {
    let usersQuery = db.collection('users').where('notificationsEnabled', '==', true);
    
    // Filter by user type
    if (userTypeFilter !== 'all') {
      if (userTypeFilter === 'resident') {
        usersQuery = usersQuery.where('role', 'in', ['customer', 'resident']);
      } else if (userTypeFilter === 'collector') {
        usersQuery = usersQuery.where('role', '==', 'collector');
      } else if (userTypeFilter === 'junkshop') {
        usersQuery = usersQuery.where('role', 'in', ['junk_shop_owner', 'junkshop']);
      }
    }
    
    // Exclude admins
    const usersSnapshot = await usersQuery.get();
    
    const tokens = [];
    const users = [];
    
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      if (userData.role !== 'admin' && userData.fcmToken) {
        tokens.push(userData.fcmToken);
        users.push({ id: doc.id, ...userData });
      }
    });
    
    if (tokens.length === 0) {
      console.log('No users with FCM tokens found');
      return { success: false, reason: 'no_tokens', sentCount: 0 };
    }
    
    console.log(`Sending push notifications to ${tokens.length} users`);
    
    // Send in batches (FCM limit is 500 tokens per request)
    const batchSize = 500;
    let totalSuccess = 0;
    let totalFailure = 0;
    
    for (let i = 0; i < tokens.length; i += batchSize) {
      const batchTokens = tokens.slice(i, i + batchSize);
      
      const message = {
        notification: {
          title,
          body
        },
        data: {
          ...data,
          clickAction: 'FLUTTER_NOTIFICATION_CLICK',
          timestamp: new Date().toISOString()
        },
        tokens: batchTokens
      };
      
      const response = await admin.messaging().sendEachForMulticast(message);
      totalSuccess += response.successCount;
      totalFailure += response.failureCount;
      
      console.log(`Batch ${Math.floor(i / batchSize) + 1}: ${response.successCount} sent, ${response.failureCount} failed`);
    }
    
    console.log(`Total: ${totalSuccess} successful, ${totalFailure} failed`);
    
    return {
      success: true,
      sentCount: totalSuccess,
      failedCount: totalFailure,
      totalUsers: users.length
    };
  } catch (error) {
    console.error('Error sending push notification to all users:', error);
    throw error;
  }
}

export default {
  sendPushNotificationToUser,
  sendPushNotificationToMultipleUsers,
  sendPushNotificationToAllUsers
};
