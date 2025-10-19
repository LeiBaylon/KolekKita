# 🔔 Notification Service API Reference

## Quick Reference Guide for NotificationService

---

## Import

```javascript
import NotificationService, { useNotifications, useAnnouncements } from "@/services/notificationService";
```

---

## Static Methods

### 1. Send Single Notification

```javascript
await NotificationService.sendNotification(
  userId,      // string - Target user ID
  title,       // string - Notification title
  message,     // string - Notification message
  type,        // string - Notification type (optional, default: "system")
  data         // object - Additional data (optional, default: {})
);
```

**Returns:** `Promise<string>` - Document ID of created notification

**Example:**
```javascript
const notificationId = await NotificationService.sendNotification(
  "user123",
  "Welcome!",
  "Thank you for joining KolekKita",
  NotificationService.NotificationTypes.SYSTEM,
  { welcomeBonus: 100 }
);
```

---

### 2. Send Batch Notifications

```javascript
await NotificationService.sendBatchNotifications(
  userIds,     // Array<string> - Array of user IDs
  title,       // string - Notification title
  message,     // string - Notification message
  type,        // string - Notification type (optional)
  data         // object - Additional data (optional)
);
```

**Returns:** `Promise<number>` - Number of notifications sent

**Example:**
```javascript
const count = await NotificationService.sendBatchNotifications(
  ["user1", "user2", "user3"],
  "System Maintenance",
  "System will be down for maintenance tonight",
  NotificationService.NotificationTypes.SYSTEM
);
console.log(`Sent ${count} notifications`);
```

---

### 3. Create Announcement

```javascript
await NotificationService.createAnnouncement(
  title,       // string - Announcement title
  message,     // string - Announcement message
  adminId      // string - Admin user ID who created it
);
```

**Returns:** `Promise<{announcementId: string, notificationsSent: number}>`

**Example:**
```javascript
const result = await NotificationService.createAnnouncement(
  "New Features Available",
  "Check out our new recycling calculator!",
  currentUser.uid
);
console.log(`Announcement ${result.announcementId} sent to ${result.notificationsSent} users`);
```

---

### 4. Send Verification Approved Notification

```javascript
await NotificationService.sendVerificationApprovedNotification(
  userId,          // string - User ID who was verified
  verificationId,  // string - Verification document ID
  shopName         // string|null - Shop name (optional)
);
```

**Returns:** `Promise<string>` - Notification ID

**Example:**
```javascript
await NotificationService.sendVerificationApprovedNotification(
  verification.userId,
  verification.id,
  "ABC Junk Shop"
);
```

---

### 5. Send Verification Denied Notification

```javascript
await NotificationService.sendVerificationDeniedNotification(
  userId,          // string - User ID whose verification was denied
  verificationId,  // string - Verification document ID
  reason,          // string - Reason for denial
  shopName         // string|null - Shop name (optional)
);
```

**Returns:** `Promise<string>` - Notification ID

**Example:**
```javascript
await NotificationService.sendVerificationDeniedNotification(
  verification.userId,
  verification.id,
  "Business license photo is unclear. Please upload a clearer image.",
  "ABC Junk Shop"
);
```

---

### 6. Get Notifications

```javascript
await NotificationService.getNotifications(filters);
```

**Parameters:**
- `filters` (object, optional):
  - `userId` (string) - Filter by user ID
  - `type` (string) - Filter by notification type
  - `isRead` (boolean) - Filter by read status
  - `limit` (number) - Limit number of results

**Returns:** `Promise<Array>` - Array of notification documents

**Example:**
```javascript
// Get unread notifications for a user
const unreadNotifications = await NotificationService.getNotifications({
  userId: "user123",
  isRead: false,
  limit: 10
});

// Get all announcement notifications
const announcements = await NotificationService.getNotifications({
  type: NotificationService.NotificationTypes.ANNOUNCEMENT
});
```

---

### 7. Get Announcements

```javascript
await NotificationService.getAnnouncements(filters);
```

**Parameters:**
- `filters` (object, optional):
  - `isActive` (boolean) - Filter by active status
  - `limit` (number) - Limit number of results

**Returns:** `Promise<Array>` - Array of announcement documents

**Example:**
```javascript
const activeAnnouncements = await NotificationService.getAnnouncements({
  isActive: true,
  limit: 5
});
```

---

### 8. Mark Notification as Read

```javascript
await NotificationService.markAsRead(notificationId);
```

**Parameters:**
- `notificationId` (string) - Notification document ID

**Returns:** `Promise<void>`

**Example:**
```javascript
await NotificationService.markAsRead("notif123");
```

---

### 9. Delete Notification

```javascript
await NotificationService.deleteNotification(notificationId);
```

**Parameters:**
- `notificationId` (string) - Notification document ID

**Returns:** `Promise<void>`

**Example:**
```javascript
await NotificationService.deleteNotification("notif123");
```

---

### 10. Update Announcement Status

```javascript
await NotificationService.updateAnnouncementStatus(announcementId, isActive);
```

**Parameters:**
- `announcementId` (string) - Announcement document ID
- `isActive` (boolean) - New active status

**Returns:** `Promise<void>`

**Example:**
```javascript
// Deactivate an announcement
await NotificationService.updateAnnouncementStatus("announce123", false);
```

---

## React Hooks

### 1. useNotifications Hook

Real-time listener for notifications.

```javascript
const { notifications, loading, error } = useNotifications(userId, filters);
```

**Parameters:**
- `userId` (string|null) - User ID to filter by (optional)
- `filters` (object, optional):
  - `type` (string) - Filter by type
  - `isRead` (boolean) - Filter by read status
  - `limit` (number) - Limit results

**Returns:** Object with:
- `notifications` (Array) - Array of notification documents
- `loading` (boolean) - Loading state
- `error` (Error|null) - Error object if any

**Example:**
```javascript
// Listen to user's unread notifications
const { notifications, loading } = useNotifications("user123", {
  isRead: false
});

// Listen to all announcement notifications (admin view)
const { notifications } = useNotifications(null, {
  type: NotificationService.NotificationTypes.ANNOUNCEMENT
});
```

---

### 2. useAnnouncements Hook

Real-time listener for announcements.

```javascript
const { announcements, loading, error } = useAnnouncements(filters);
```

**Parameters:**
- `filters` (object, optional):
  - `isActive` (boolean) - Filter by active status
  - `limit` (number) - Limit results

**Returns:** Object with:
- `announcements` (Array) - Array of announcement documents
- `loading` (boolean) - Loading state
- `error` (Error|null) - Error object if any

**Example:**
```javascript
// Listen to active announcements
const { announcements, loading } = useAnnouncements({
  isActive: true
});

// Listen to all announcements (admin view)
const { announcements } = useAnnouncements();
```

---

## Notification Types Enum

```javascript
NotificationService.NotificationTypes = {
  ANNOUNCEMENT: "announcement",
  VERIFICATION_APPROVED: "verification_approved",
  VERIFICATION_DENIED: "verification_denied",
  SYSTEM: "system",
  BOOKING: "booking",
  CHAT: "chat"
};
```

**Usage:**
```javascript
NotificationService.NotificationTypes.ANNOUNCEMENT
NotificationService.NotificationTypes.VERIFICATION_APPROVED
// etc.
```

---

## Complete Examples

### Example 1: Send Custom Notification

```javascript
import NotificationService from "@/services/notificationService";

const sendWelcomeNotification = async (userId, userName) => {
  try {
    await NotificationService.sendNotification(
      userId,
      "🎉 Welcome to KolekKita!",
      `Hi ${userName}! Welcome to our community. Start by verifying your account.`,
      NotificationService.NotificationTypes.SYSTEM,
      {
        action: "verify_account",
        userId: userId
      }
    );
    console.log("Welcome notification sent!");
  } catch (error) {
    console.error("Failed to send notification:", error);
  }
};
```

---

### Example 2: Create Announcement with Error Handling

```javascript
import NotificationService from "@/services/notificationService";
import { useToast } from "@/hooks/use-toast";

const CreateAnnouncementButton = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const handleCreateAnnouncement = async () => {
    try {
      const result = await NotificationService.createAnnouncement(
        "Holiday Schedule",
        "Our collection services will be unavailable on Dec 25-26.",
        user.uid
      );
      
      toast({
        title: "✅ Success",
        description: `Announcement sent to ${result.notificationsSent} users`
      });
    } catch (error) {
      toast({
        title: "❌ Error",
        description: "Failed to create announcement",
        variant: "destructive"
      });
    }
  };
  
  return <Button onClick={handleCreateAnnouncement}>Post Announcement</Button>;
};
```

---

### Example 3: Real-time Notification Display

```javascript
import { useNotifications } from "@/services/notificationService";
import { Bell } from "lucide-react";

const NotificationBell = ({ userId }) => {
  const { notifications, loading } = useNotifications(userId, {
    isRead: false
  });
  
  if (loading) return <Bell className="animate-pulse" />;
  
  const unreadCount = notifications.length;
  
  return (
    <div className="relative">
      <Bell />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white 
                         rounded-full w-5 h-5 text-xs flex items-center 
                         justify-center">
          {unreadCount}
        </span>
      )}
    </div>
  );
};
```

---

### Example 4: Notification List Component

```javascript
import { useNotifications } from "@/services/notificationService";
import NotificationService from "@/services/notificationService";

const NotificationList = ({ userId }) => {
  const { notifications, loading, error } = useNotifications(userId);
  
  const handleMarkAsRead = async (notificationId) => {
    await NotificationService.markAsRead(notificationId);
  };
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <div>
      {notifications.map(notification => (
        <div 
          key={notification.id}
          className={!notification.isRead ? 'font-bold' : ''}
          onClick={() => handleMarkAsRead(notification.id)}
        >
          <h4>{notification.title}</h4>
          <p>{notification.message}</p>
        </div>
      ))}
    </div>
  );
};
```

---

## Error Handling Best Practices

Always wrap notification operations in try-catch blocks:

```javascript
try {
  await NotificationService.sendNotification(/* ... */);
  // Show success message
} catch (error) {
  console.error("Notification error:", error);
  // Show error message to user
  toast({
    title: "Error",
    description: "Failed to send notification",
    variant: "destructive"
  });
}
```

---

## Performance Tips

1. **Use batch operations** when sending to multiple users
2. **Set limits** on queries to prevent loading too much data
3. **Use real-time hooks** only when needed (they create active listeners)
4. **Clean up listeners** by unmounting components when not needed
5. **Index your Firestore queries** for faster performance

---

## Security Notes

- Only admins should be able to create announcements
- Users can only read their own notifications
- Implement proper Firestore security rules
- Validate user roles on the backend
- Never expose sensitive data in notifications

---

## Support

For issues or questions:
1. Check the main guide: `NOTIFICATION_SYSTEM_GUIDE.md`
2. Review Firebase Console for Firestore data
3. Check browser console for errors
4. Verify Firebase configuration

---

**Last Updated:** October 15, 2025
**Version:** 1.0.0
