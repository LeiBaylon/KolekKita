# 🧹 Firebase Database Cleanup Instructions

## Unused Collections Identified

Based on code analysis, these collections are **NOT USED** in your KolekKita app:

### ❌ Safe to Remove:
1. **`announcements`** - Replaced by `notification_campaigns` with type "announcement"
2. **`app_config`** - No configuration system implemented in the code
3. **`chats`** - App uses `chatMessages` collection instead
4. **`messages`** - App uses `chatMessages` collection instead  
5. **`waste_bookings`** - App uses `bookings` collection instead

## Manual Cleanup Steps

### Option A: Firebase Console (Recommended)
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your `kolekkita` project
3. Navigate to **Firestore Database**
4. For each unused collection:
   - Click on the collection name
   - Select all documents (if any)
   - Click **Delete** button
   - Confirm deletion

### Option B: Using the Cleanup Script
```bash
# Check what's in the unused collections (safe)
node cleanup-unused-collections.js check

# Delete unused collections (destructive - make backup first!)
node cleanup-unused-collections.js delete
```

## ✅ Collections to Keep

These collections are actively used by your app:
- `users` - User management
- `bookings` - Booking system  
- `notifications` - Individual notifications
- `notification_campaigns` - Mass notifications & announcements
- `verifications` - Junk shop verification
- `reports` - User reports and moderation
- `chatMessages` - Chat system

## Impact of Cleanup

### ✅ Benefits:
- Cleaner database structure
- Reduced Firebase costs (if collections have data)
- Less confusion during development
- Better database organization

### ⚠️ Considerations:
- **No code changes needed** - these collections aren't referenced
- **Data will be permanently deleted** - ensure you don't need any historical data
- **Empty collections** can remain without cost, but cleaning improves organization

## Verification

After cleanup, verify your app still works correctly:
1. Test user registration/login
2. Test booking creation
3. Test notifications
4. Test chat functionality
5. Test verification system

All functionality should work exactly the same since these collections weren't being used.