# 📬 Notification System Documentation

## Overview

KolekKita features a **dual notification system** that combines in-app notifications with push notifications for comprehensive user engagement.

## 🎯 Features

### **In-App Notifications**
- ✅ Persistent notification history
- ✅ Read/unread status tracking
- ✅ Real-time updates
- ✅ Notification campaigns
- ✅ User type targeting

### **Push Notifications**
- ✅ Browser/OS alerts
- ✅ Works when app is closed
- ✅ Automatic token management
- ✅ User permission control
- ✅ Background service worker

## 📊 How It Works

```
┌─────────────────────────────────────────────────┐
│         Admin Sends Notification                │
└────────────┬────────────────────────────────────┘
             │
             ├─────────────────┬──────────────────┐
             ↓                 ↓                  ↓
    ┌────────────────┐  ┌─────────────┐  ┌──────────────┐
    │   In-App       │  │    Push     │  │  Campaign    │
    │ (Firestore)    │  │    (FCM)    │  │   Record     │
    └────────────────┘  └─────────────┘  └──────────────┘
             │                 │                  │
             ↓                 ↓                  ↓
    ┌────────────────┐  ┌─────────────┐  ┌──────────────┐
    │ Notification   │  │   Browser   │  │   History    │
    │    Panel       │  │   Alert     │  │   Tracking   │
    └────────────────┘  └─────────────┘  └──────────────┘
```

## 🚀 Quick Setup

See `QUICK_START.md` for 5-minute setup guide.

## 📁 Architecture

### **Client-Side**
```
client/src/
├── services/
│   ├── notificationService.js       # In-app notifications
│   └── pushNotificationService.js   # Push notifications (FCM)
├── components/
│   ├── NotificationSettings.jsx     # User settings UI
│   └── PushNotificationSetupChecklist.jsx
└── contexts/
    └── AuthContext.jsx              # Auto-request permissions
```

### **Server-Side**
```
server/
├── pushNotificationService.js       # FCM sender (Admin SDK)
├── pushNotificationRoutes.js        # API endpoints
└── serviceAccountKey.json          # Firebase credentials (gitignored)
```

## 🔌 API Endpoints

### Send to All Users
```http
POST /api/push-notifications/send-to-all
Content-Type: application/json

{
  "title": "System Update",
  "body": "New features available!",
  "userTypeFilter": "all",
  "data": {}
}
```

### Send to Specific User
```http
POST /api/push-notifications/send-to-user
Content-Type: application/json

{
  "userId": "abc123",
  "title": "Booking Confirmed",
  "body": "Your booking #456 is confirmed",
  "data": { "bookingId": "456" }
}
```

### Send to Multiple Users
```http
POST /api/push-notifications/send-to-multiple
Content-Type: application/json

{
  "userIds": ["user1", "user2", "user3"],
  "title": "Group Message",
  "body": "Message for selected users",
  "data": {}
}
```

## 👥 User Roles

| Role | Receives Notifications | Can Send |
|------|----------------------|----------|
| Admin | ❌ No | ✅ Yes |
| Resident | ✅ Yes | ❌ No |
| Collector | ✅ Yes | ❌ No |
| Junk Shop | ✅ Yes | ❌ No |

## 🎨 User Experience

### **For Regular Users:**
1. Login to app
2. Grant notification permission (prompted automatically)
3. Receive notifications both:
   - In-app (notification panel)
   - Push (browser alerts)
4. Toggle notifications on/off in settings

### **For Admins:**
1. Go to Notifications page
2. Complete setup checklist (first time only)
3. Click "Send Notification"
4. Select user type (all, residents, collectors, junkshops)
5. Write title and message
6. Send → Both in-app and push notifications delivered

## 🔐 Security

- Service account key stored securely (not in git)
- VAPID key for web push authentication
- FCM tokens encrypted in transit
- User permission required before sending
- Invalid tokens automatically cleaned up

## 📱 Browser Support

| Browser | Support |
|---------|---------|
| Chrome 50+ | ✅ Full |
| Firefox 44+ | ✅ Full |
| Edge 17+ | ✅ Full |
| Safari 16+ | ✅ Full (macOS only) |
| Safari iOS | ⚠️ In-app only |

## 🔧 Configuration

### Required Environment
- Firebase project configured
- VAPID key from Firebase Console
- Service account key downloaded
- Notification icons created

### Optional Settings
```javascript
// Customize notification behavior
const notificationOptions = {
  requireInteraction: false,  // Auto-dismiss
  silent: false,              // Play sound
  tag: 'notification-id',     // Group similar
  renotify: false            // Vibrate on renotify
};
```

## 📚 Documentation Files

- `QUICK_START.md` - 5-minute setup guide
- `PUSH_NOTIFICATION_SETUP.md` - Detailed setup instructions
- `IMPLEMENTATION_SUMMARY.md` - Complete implementation details
- `NOTIFICATIONS.md` - This file

## 🐛 Troubleshooting

### Common Issues

**"Permission denied"**
- User must enable in browser settings
- Cannot be programmatically changed

**"Service Worker not registered"**
- Requires HTTPS or localhost
- Check browser console for errors

**"No FCM token"**
- Verify VAPID key is correct
- Check service worker registration
- Ensure permission was granted

**"Push notifications not received"**
- Check FCM token in Firestore
- Verify service account key is valid
- Check server logs for errors

## 📈 Monitoring

Check Firebase Console for:
- FCM delivery statistics
- Token registration counts
- Failed delivery reports
- API usage and quotas

## 🎓 Best Practices

1. **Test thoroughly** before production
2. **Monitor delivery rates** in Firebase Console
3. **Keep messages concise** (limit: ~240 chars for body)
4. **Use meaningful titles** for better engagement
5. **Don't spam users** - respect notification preferences
6. **Handle permission denial gracefully**
7. **Clean up invalid tokens** regularly

## 🔄 Future Enhancements

Potential improvements:
- [ ] Scheduled notifications
- [ ] Rich media notifications (images)
- [ ] Action buttons in notifications
- [ ] Notification categories/preferences
- [ ] Delivery analytics dashboard
- [ ] A/B testing for messages
- [ ] Notification templates

## 📞 Support

For issues or questions:
1. Check documentation files
2. Review browser console errors
3. Check Firebase Console logs
4. Verify setup steps completed

---

**Status:** ✅ Implemented and ready for setup
**Version:** 1.0.0
**Last Updated:** November 2025
