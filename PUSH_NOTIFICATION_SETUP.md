# Push Notification Setup Guide

This guide explains how to complete the push notification setup for your KolekKita application.

## What Has Been Implemented

✅ Firebase Cloud Messaging (FCM) integration
✅ Service Worker for background notifications
✅ Client-side notification permission handling
✅ Server-side push notification sender
✅ Automatic FCM token management
✅ Push notification API endpoints

## What You Need to Do

### 1. Get Firebase VAPID Key

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: **kolekkita**
3. Go to **Project Settings** (gear icon) → **Cloud Messaging** tab
4. Scroll to **Web Push certificates** section
5. If you don't have a Web Push certificate, click **Generate key pair**
6. Copy the **Key pair** value

**Update the VAPID key in:**
- `client/src/services/pushNotificationService.js` (line 14)
  ```javascript
  static VAPID_KEY = 'YOUR_VAPID_KEY_HERE'; // Replace with actual VAPID key
  ```

### 2. Get Firebase Admin SDK Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: **kolekkita**
3. Go to **Project Settings** → **Service Accounts** tab
4. Click **Generate new private key**
5. Save the downloaded JSON file as `serviceAccountKey.json`
6. Place it in the `server/` directory

**⚠️ IMPORTANT:** Add `serviceAccountKey.json` to your `.gitignore` file to prevent committing sensitive credentials!

### 3. Install Required Dependencies

```bash
# Install Firebase Messaging
npm install firebase@latest

# Install Firebase Admin SDK (for server)
npm install firebase-admin
```

### 4. Update Server Routes

Add the push notification routes to your server. In `server/index.js` or `server/routes.js`, add:

```javascript
import pushNotificationRoutes from './pushNotificationRoutes.js';

// Add this line with your other routes
app.use('/api/push-notifications', pushNotificationRoutes);
```

### 5. Add Notification Icons

Create notification icons for your app:
- `client/public/icon-192x192.png` (192x192 pixels)
- `client/public/badge-72x72.png` (72x72 pixels)

You can use your app logo for these icons.

### 6. Update vite.config.js

Make sure your Vite config copies the service worker file:

```javascript
// vite.config.js
export default defineConfig({
  // ... other config
  publicDir: 'public',
  build: {
    rollupOptions: {
      input: {
        main: './index.html',
        sw: './public/firebase-messaging-sw.js'
      }
    }
  }
});
```

### 7. Test Push Notifications

1. **Start your development server:**
   ```bash
   npm run dev
   ```

2. **Login as a non-admin user** (admins are excluded from notifications)

3. **Grant notification permission** when prompted (this should happen automatically 2 seconds after login)

4. **Send a test notification** from the Admin Notifications page

5. **Verify:**
   - Browser shows push notification when app is in background
   - Notification appears in app when app is open
   - FCM token is saved in Firestore (`users` collection → user document → `fcmToken` field)

## How It Works

### In-App Notifications (Already Working)
- Stored in Firestore `notifications` collection
- Real-time updates via Firestore listeners
- Displayed in app's notification panel
- Only visible when app is open

### Push Notifications (New Feature)
- Uses Firebase Cloud Messaging (FCM)
- Sends notifications even when app is closed
- Shows as browser/OS notifications
- Works in background via Service Worker

### Flow:
1. User logs in → App requests notification permission
2. Permission granted → Get FCM token from Firebase
3. FCM token saved to user's Firestore document
4. Admin sends notification → Both in-app and push notifications sent
5. Push notification delivered via FCM → Service Worker displays it
6. User clicks notification → App opens

## Notification Types

Both notification types work together:

| Feature | In-App | Push |
|---------|--------|------|
| App must be open | ✅ Yes | ❌ No |
| Browser notifications | ❌ No | ✅ Yes |
| Stored in database | ✅ Yes | ❌ No (only delivery) |
| Read/Unread status | ✅ Yes | ❌ No |
| Notification history | ✅ Yes | ❌ No |

## Troubleshooting

### "Firebase Messaging not supported"
- Check if you're using HTTPS (required for notifications)
- Service Workers require HTTPS or localhost

### "Permission denied"
- User must manually enable notifications in browser settings
- Cannot be changed programmatically

### "No FCM token"
- Check browser console for errors
- Verify VAPID key is correct
- Ensure service worker is registered

### "Push notifications not received"
- Check if FCM token exists in user document
- Verify service account key is valid
- Check server logs for errors
- Test with browser DevTools → Application → Service Workers

### "Invalid registration token"
- Token may have expired or been revoked
- App automatically removes invalid tokens
- User needs to login again to get new token

## Security Notes

1. **Never commit `serviceAccountKey.json` to version control**
2. **Keep VAPID key secure** (though less sensitive than service account key)
3. **Validate user permissions** before sending notifications
4. **Rate limit** notification sending to prevent abuse
5. **Monitor FCM usage** in Firebase Console

## Browser Compatibility

Push notifications work on:
- ✅ Chrome 50+
- ✅ Firefox 44+
- ✅ Edge 17+
- ✅ Opera 37+
- ✅ Safari 16+ (macOS Ventura+)
- ❌ iOS Safari (not supported)
- ❌ Internet Explorer (not supported)

## Testing Checklist

- [ ] VAPID key configured
- [ ] Service account key downloaded and placed
- [ ] Dependencies installed
- [ ] Server routes added
- [ ] Icons created
- [ ] Test notification sent successfully
- [ ] Push notification received when app closed
- [ ] Notification click opens app
- [ ] FCM token saved in Firestore
- [ ] Invalid tokens are cleaned up

## Additional Resources

- [Firebase Cloud Messaging Documentation](https://firebase.google.com/docs/cloud-messaging/js/client)
- [Web Push Notifications Guide](https://web.dev/push-notifications-overview/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
