import { useState, useEffect } from "react";
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc,
  getDocs,
  serverTimestamp,
  writeBatch
} from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * Notification Service - Database operations for notification management
 */
export class NotificationService {
  static COLLECTION_NAME = "notifications";
  static CAMPAIGNS_COLLECTION = "notification_campaigns";

  /**
   * Notification types enum
   */
  static NotificationTypes = {
    ANNOUNCEMENT: "announcement",
    SYSTEM: "system"
  };

  /**
   * Send notification to a specific user
   * @param {string} userId - Target user ID
   * @param {string} title - Notification title
   * @param {string} message - Notification message
   * @param {string} type - Notification type
   * @param {Object} data - Additional data
   * @returns {Promise<string>} - Document ID of created notification
   */
  static async sendNotification(userId, title, message, type = this.NotificationTypes.SYSTEM, data = {}) {
    try {
      const docRef = await addDoc(collection(db, this.COLLECTION_NAME), {
        userId,
        title,
        message,
        type,
        isRead: false,
        data,
        createdAt: serverTimestamp(),
        sentAt: serverTimestamp()
      });
      
      console.log(`Notification sent to user ${userId}:`, docRef.id);
      return docRef.id;
    } catch (error) {
      console.error("Error sending notification:", error);
      throw error;
    }
  }

  /**
   * Send notification to multiple users (batch)
   * @param {Array<string>} userIds - Array of user IDs
   * @param {string} title - Notification title
   * @param {string} message - Notification message
   * @param {string} type - Notification type
   * @param {Object} data - Additional data
   * @returns {Promise<number>} - Number of notifications sent
   */
  static async sendBatchNotifications(userIds, title, message, type = this.NotificationTypes.SYSTEM, data = {}) {
    try {
      console.log(`Starting batch notification to ${userIds.length} users`);
      
      const batch = writeBatch(db);
      const notificationsRef = collection(db, this.COLLECTION_NAME);
      
      let count = 0;
      const batchId = Date.now().toString();
      
      for (const userId of userIds) {
        // Clean data object to remove undefined values
        const cleanedData = {};
        for (const [key, value] of Object.entries(data || {})) {
          if (value !== undefined && value !== null) {
            cleanedData[key] = value;
          }
        }
        
        const notificationRef = doc(notificationsRef);
        batch.set(notificationRef, {
          userId: userId || '',
          title: title || 'Untitled',
          message: message || '',
          type: type || this.NotificationTypes.SYSTEM,
          isRead: false,
          data: {
            ...cleanedData,
            batchId, // Add batch ID to track duplicates
          },
          createdAt: serverTimestamp(),
          sentAt: serverTimestamp()
        });
        count++;
      }
      
      await batch.commit();
      console.log(`Batch notifications committed: ${count} notifications sent`);
      return count;
    } catch (error) {
      console.error("Error sending batch notifications:", error);
      throw error;
    }
  }

  // Static variable to track recent sends and prevent duplicates
  static recentSends = new Map();

  /**
   * Send notification to all users
   * @param {string} title - Notification title
   * @param {string} message - Notification message
   * @param {string} type - Notification type
   * @param {Object} data - Additional data
   * @returns {Promise<number>} - Number of notifications sent
   */
  static async sendNotificationToAllUsers(title, message, type = this.NotificationTypes.ANNOUNCEMENT, data = {}) {
    const operationId = `${title}-${type}-${JSON.stringify(data.sendId || '')}`;
    
    // Check if this exact operation was performed recently (within 5 seconds)
    const now = Date.now();
    if (this.recentSends.has(operationId)) {
      const lastSend = this.recentSends.get(operationId);
      if (now - lastSend < 5000) {
        console.warn("🚫 DUPLICATE SEND PREVENTED:", { operationId, timeSinceLastSend: now - lastSend });
        throw new Error("Duplicate notification send prevented");
      }
    }
    
    // Mark this operation as in progress
    this.recentSends.set(operationId, now);
    
    try {
      console.log("🔥 SERVICE: Starting sendNotificationToAllUsers", { 
        title, 
        type, 
        operationId,
        timestamp: new Date().toISOString() 
      });
      
      // Get all users to send notifications
      const usersRef = collection(db, "users");
      const usersSnapshot = await getDocs(usersRef);
      
      // Check if there are any users
      if (usersSnapshot.empty) {
        console.warn("No users found to send notifications to");
        return 0;
      }
      
      const allUsers = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Exclude admins from receiving notifications
      const users = allUsers.filter(u => u.role !== 'admin');
      const userIds = users.map(user => user.id);
      
      // Categorize users by role (admins excluded)
      const usersByRole = {
        admins: [], // Admins are excluded from notifications
        junkShops: users.filter(u => u.role === 'junk_shop_owner' || u.role === 'junkshop'),
        collectors: users.filter(u => u.role === 'collector'),
        residents: users.filter(u => u.role === 'customer' || u.role === 'resident')
      };
      
      console.log("📋 User breakdown:", {
        total: users.length,
        totalAllUsers: allUsers.length,
        adminsExcluded: allUsers.filter(u => u.role === 'admin').length,
        junkShops: usersByRole.junkShops.length,
        collectors: usersByRole.collectors.length,
        residents: usersByRole.residents.length
      });

      // Create campaign record first
      const campaignId = await this.createNotificationCampaign({
        title: title || 'Untitled',
        message: message || '',
        type: type || this.NotificationTypes.SYSTEM,
        sentBy: data.sentBy || 'system',
        sentByName: data.sentByName || 'System',
        userBreakdown: {
          total: users.length || 0,
          admins: usersByRole.admins?.length || 0,
          junkShops: usersByRole.junkShops?.length || 0,
          collectors: usersByRole.collectors?.length || 0,
          residents: usersByRole.residents?.length || 0
        },
        recipients: users.map(u => ({ 
          id: u.id || 'unknown', 
          role: u.role || 'unknown', 
          email: u.email || '', 
          name: u.name || 'Unknown User' 
        })) || [],
        status: 'sending'
      });

      // Send notifications to all users
      const notificationsSent = await this.sendBatchNotifications(
        userIds,
        title,
        message,
        type,
        { ...data, operationId, campaignId }
      );

      // Update campaign status to completed
      await this.updateCampaignStatus(campaignId, 'completed', notificationsSent);

      console.log("🎯 SERVICE: Completed successfully", { notificationsSent, campaignId, operationId });
      
      // Clean up old entries (keep only last 10 minutes)
      const tenMinutesAgo = now - (10 * 60 * 1000);
      for (const [key, timestamp] of this.recentSends.entries()) {
        if (timestamp < tenMinutesAgo) {
          this.recentSends.delete(key);
        }
      }
      
      return {
        success: true,
        sentCount: notificationsSent,
        campaignId: campaignId
      };
    } catch (error) {
      console.error("💥 SERVICE ERROR:", error);
      // Remove from recent sends on error
      this.recentSends.delete(operationId);
      throw error;
    }
  }

  /**
   * Create notification campaign record
   */
  static async createNotificationCampaign(campaignData) {
    try {
      // Validate and clean the campaign data to prevent undefined values
      const cleanedData = {
        title: campaignData.title || 'Untitled',
        message: campaignData.message || '',
        type: campaignData.type || this.NotificationTypes.SYSTEM,
        sentBy: campaignData.sentBy || 'system',
        sentByName: campaignData.sentByName || 'System',
        userBreakdown: {
          total: Number(campaignData.userBreakdown?.total || 0),
          admins: Number(campaignData.userBreakdown?.admins || 0),
          junkShops: Number(campaignData.userBreakdown?.junkShops || 0),
          collectors: Number(campaignData.userBreakdown?.collectors || 0),
          residents: Number(campaignData.userBreakdown?.residents || 0)
        },
        recipients: Array.isArray(campaignData.recipients) ? campaignData.recipients : [],
        status: campaignData.status || 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      console.log("📊 Creating campaign with data:", cleanedData);
      
      const docRef = await addDoc(collection(db, this.CAMPAIGNS_COLLECTION), cleanedData);
      console.log("📊 Campaign created successfully:", docRef.id);
      return docRef.id;
    } catch (error) {
      console.error("💥 Error creating campaign:", error);
      console.error("💥 Campaign data was:", campaignData);
      throw error;
    }
  }

  /**
   * Update campaign status
   */
  static async updateCampaignStatus(campaignId, status, sentCount = null) {
    try {
      const campaignRef = doc(db, this.CAMPAIGNS_COLLECTION, campaignId);
      const updateData = {
        status,
        updatedAt: serverTimestamp()
      };
      
      if (sentCount !== null) {
        updateData.actualSentCount = sentCount;
      }
      
      await updateDoc(campaignRef, updateData);
    } catch (error) {
      console.error("Error updating campaign status:", error);
    }
  }

  /**
   * Send verification approved notification
   * @param {string} userId - User ID who was verified
   * @param {string} verificationId - Verification document ID
   * @param {string} shopName - Shop name (optional)
   * @returns {Promise<string>}
   */
  static async sendVerificationApprovedNotification(userId, verificationId, shopName = null) {
    try {
      const title = "✅ Verification Approved";
      const message = shopName 
        ? `Congratulations! Your junk shop "${shopName}" verification has been approved! You can now access all verified features.`
        : "Congratulations! Your verification has been approved! You can now access all verified features.";

      return await this.sendNotification(
        userId,
        title,
        message,
        this.NotificationTypes.VERIFICATION_APPROVED,
        {
          verificationId,
          shopName,
          timestamp: new Date().toISOString()
        }
      );
    } catch (error) {
      console.error("Error sending verification approved notification:", error);
      throw error;
    }
  }

  /**
   * Send verification denied notification
   * @param {string} userId - User ID whose verification was denied
   * @param {string} verificationId - Verification document ID
   * @param {string} reason - Reason for denial
   * @param {string} shopName - Shop name (optional)
   * @returns {Promise<string>}
   */
  static async sendVerificationDeniedNotification(userId, verificationId, reason, shopName = null) {
    try {
      const title = "❌ Verification Denied";
      const message = shopName
        ? `Your junk shop "${shopName}" verification has been denied.\n\nReason: ${reason}\n\nPlease fix the issues mentioned and reapply.`
        : `Your verification has been denied.\n\nReason: ${reason}\n\nPlease fix the issues mentioned and reapply.`;

      return await this.sendNotification(
        userId,
        title,
        message,
        this.NotificationTypes.VERIFICATION_DENIED,
        {
          verificationId,
          reason,
          shopName,
          timestamp: new Date().toISOString()
        }
      );
    } catch (error) {
      console.error("Error sending verification denied notification:", error);
      throw error;
    }
  }

  /**
   * Get all notifications with optional filtering
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>}
   */
  static async getNotifications(filters = {}) {
    try {
      let q = query(collection(db, this.COLLECTION_NAME));
      
      // Apply filters
      if (filters.userId) {
        q = query(q, where("userId", "==", filters.userId));
      }
      
      if (filters.type) {
        q = query(q, where("type", "==", filters.type));
      }
      
      if (filters.isRead !== undefined) {
        q = query(q, where("isRead", "==", filters.isRead));
      }

      // Order by creation date (newest first)
      q = query(q, orderBy("createdAt", "desc"));
      
      // Apply limit if specified
      if (filters.limit) {
        q = query(q, limit(filters.limit));
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error("Error getting notifications:", error);
      throw error;
    }
  }



  /**
   * Mark notification as read
   * @param {string} notificationId - Notification document ID
   * @returns {Promise<void>}
   */
  static async markAsRead(notificationId) {
    try {
      const notificationRef = doc(db, this.COLLECTION_NAME, notificationId);
      await updateDoc(notificationRef, {
        isRead: true,
        readAt: serverTimestamp()
      });
      console.log(`Notification ${notificationId} marked as read`);
    } catch (error) {
      console.error("Error marking notification as read:", error);
      throw error;
    }
  }

  /**
   * Delete a notification
   * @param {string} notificationId - Notification document ID
   * @returns {Promise<void>}
   */
  static async deleteNotification(notificationId) {
    try {
      await deleteDoc(doc(db, this.COLLECTION_NAME, notificationId));
      console.log(`Notification ${notificationId} deleted`);
    } catch (error) {
      console.error("Error deleting notification:", error);
      throw error;
    }
  }


}

/**
 * React hook to listen to real-time notifications
 * @param {string} userId - User ID to listen for notifications
 * @param {Object} filters - Additional filters
 * @returns {Object} - { notifications, loading, error }
 */
export function useNotifications(userId = null, filters = {}) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      let q = query(collection(db, NotificationService.COLLECTION_NAME));

      if (userId) {
        q = query(q, where("userId", "==", userId));
      }

      if (filters.type) {
        q = query(q, where("type", "==", filters.type));
      }

      if (filters.isRead !== undefined) {
        q = query(q, where("isRead", "==", filters.isRead));
      }

      q = query(q, orderBy("createdAt", "desc"));

      if (filters.limit) {
        q = query(q, limit(filters.limit));
      }

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const notificationsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setNotifications(notificationsData);
          setLoading(false);
        },
        (err) => {
          console.error("Error listening to notifications:", err);
          setError(err);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.error("Error setting up notifications listener:", err);
      setError(err);
      setLoading(false);
    }
  }, [userId, filters.type, filters.isRead, filters.limit]);

  return { notifications, loading, error };
}



/**
 * React hook to listen to notification campaigns
 */
export function useCampaigns(filters = {}) {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      let q = query(collection(db, NotificationService.CAMPAIGNS_COLLECTION));
      
      q = query(q, orderBy("createdAt", "desc"));
      
      if (filters.limit) {
        q = query(q, limit(filters.limit));
      }

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const campaignsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setCampaigns(campaignsData);
          setLoading(false);
        },
        (err) => {
          console.error("Error listening to campaigns:", err);
          setError(err);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.error("Error setting up campaigns listener:", err);
      setError(err);
      setLoading(false);
    }
  }, [filters.limit]);

  return { campaigns, loading, error };
}

export default NotificationService;
